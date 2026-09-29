import "server-only";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { accounts, creditLedger } from "@/db/schema";

export class InsufficientCreditsError extends Error {
  readonly balance: number;
  readonly required: number;

  constructor(balance: number, required: number) {
    super("insufficient_credits");
    this.name = "InsufficientCreditsError";
    this.balance = balance;
    this.required = required;
  }
}

type Db = Awaited<ReturnType<typeof getDb>>;

export async function getCreditBalance(accountId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ creditBalance: accounts.creditBalance })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  return row?.creditBalance ?? 0;
}

async function deductInTx(
  tx: Db,
  opts: {
    accountId: string;
    amount: number;
    reason: string;
    referenceId?: string;
  },
): Promise<number> {
  const [row] = await tx
    .select({ creditBalance: accounts.creditBalance })
    .from(accounts)
    .where(eq(accounts.id, opts.accountId))
    .limit(1);
  const balance = row?.creditBalance ?? 0;
  if (balance < opts.amount) {
    throw new InsufficientCreditsError(balance, opts.amount);
  }

  const next = balance - opts.amount;
  await tx
    .update(accounts)
    .set({ creditBalance: next, updatedAt: sql`now()` })
    .where(eq(accounts.id, opts.accountId));

  await tx.insert(creditLedger).values({
    id: `crl_${randomUUID()}`,
    accountId: opts.accountId,
    amount: -opts.amount,
    reason: opts.reason,
    referenceId: opts.referenceId ?? null,
  });

  return next;
}

/** Deduct credits inside an existing transaction. */
export async function chargeCreditsInTx(
  tx: Db,
  opts: {
    accountId: string;
    amount: number;
    reason: string;
    referenceId?: string;
  },
): Promise<number> {
  if (opts.amount <= 0) {
    const [row] = await tx
      .select({ creditBalance: accounts.creditBalance })
      .from(accounts)
      .where(eq(accounts.id, opts.accountId))
      .limit(1);
    return row?.creditBalance ?? 0;
  }
  return deductInTx(tx, opts);
}

/** Standalone credit deduction. */
export async function chargeCredits(opts: {
  accountId: string;
  amount: number;
  reason: string;
  referenceId?: string;
}): Promise<number> {
  if (opts.amount <= 0) {
    return getCreditBalance(opts.accountId);
  }
  const db = await getDb();
  return db.transaction((tx) => deductInTx(tx, opts));
}
