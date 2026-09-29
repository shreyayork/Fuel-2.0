import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { accounts, agentRuns } from "@/db/schema";

/** First of the current UTC month, as a Date. Used for month-to-date rollups. */
export function monthStart(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export interface AccountUsageSummary {
  accountId: string;
  periodStart: string;
  costTokens: number;
  inputTokens: number;
  outputTokens: number;
  runs: number;
  limit: number | null;
  remaining: number | null;
  /** True when we've exceeded the monthly_token_limit (only if a limit is set). */
  overLimit: boolean;
}

export async function getAccountUsage(opts: {
  accountId: string;
  /** Period start; defaults to current UTC month. */
  since?: Date;
}): Promise<AccountUsageSummary> {
  const db = await getDb();
  const since = opts.since ?? monthStart();

  const [account] = await db
    .select({ monthlyTokenLimit: accounts.monthlyTokenLimit })
    .from(accounts)
    .where(eq(accounts.id, opts.accountId))
    .limit(1);

  const [row] = await db
    .select({
      costTokens: sql<string>`coalesce(sum(${agentRuns.costTokens}), 0)::text`,
      inputTokens: sql<string>`coalesce(sum(${agentRuns.inputTokens}), 0)::text`,
      outputTokens: sql<string>`coalesce(sum(${agentRuns.outputTokens}), 0)::text`,
      runs: sql<string>`count(*)::text`,
    })
    .from(agentRuns)
    .where(
      and(eq(agentRuns.accountId, opts.accountId), gte(agentRuns.startedAt, since)),
    );

  const used = Number(row?.costTokens ?? 0);
  const limit = account?.monthlyTokenLimit ?? null;
  const remaining = limit != null ? Math.max(0, limit - used) : null;
  return {
    accountId: opts.accountId,
    periodStart: since.toISOString(),
    costTokens: used,
    inputTokens: Number(row?.inputTokens ?? 0),
    outputTokens: Number(row?.outputTokens ?? 0),
    runs: Number(row?.runs ?? 0),
    limit,
    remaining,
    overLimit: limit != null && used >= limit,
  };
}

export interface UserUsageSummary {
  userEmail: string;
  periodStart: string;
  costTokens: number;
  runs: number;
}

export async function getUserUsage(opts: {
  accountId: string;
  userEmail: string;
  since?: Date;
}): Promise<UserUsageSummary> {
  const db = await getDb();
  const since = opts.since ?? monthStart();
  const [row] = await db
    .select({
      costTokens: sql<string>`coalesce(sum(${agentRuns.costTokens}), 0)::text`,
      runs: sql<string>`count(*)::text`,
    })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.accountId, opts.accountId),
        eq(agentRuns.userEmail, opts.userEmail),
        gte(agentRuns.startedAt, since),
      ),
    );
  return {
    userEmail: opts.userEmail,
    periodStart: since.toISOString(),
    costTokens: Number(row?.costTokens ?? 0),
    runs: Number(row?.runs ?? 0),
  };
}

export interface UserBreakdownRow {
  userEmail: string;
  costTokens: number;
  runs: number;
}

/** Per-user breakdown for an account for the current month. */
export async function getAccountUsageByUser(opts: {
  accountId: string;
  since?: Date;
}): Promise<UserBreakdownRow[]> {
  const db = await getDb();
  const since = opts.since ?? monthStart();
  const rows = await db
    .select({
      userEmail: agentRuns.userEmail,
      costTokens: sql<string>`coalesce(sum(${agentRuns.costTokens}), 0)::text`,
      runs: sql<string>`count(*)::text`,
    })
    .from(agentRuns)
    .where(
      and(eq(agentRuns.accountId, opts.accountId), gte(agentRuns.startedAt, since)),
    )
    .groupBy(agentRuns.userEmail);
  return rows.map((r) => ({
    userEmail: r.userEmail,
    costTokens: Number(r.costTokens),
    runs: Number(r.runs),
  }));
}

export interface RunAllowedResult {
  allowed: boolean;
  reason?: "over_limit";
  used: number;
  limit: number | null;
  remaining: number | null;
}

/**
 * Soft-limit check — returns whether a new run should be allowed. Call this
 * before starting an agent run; today we log when `allowed === false` but
 * don't block. Flip a switch later to enforce hard limits per tier.
 */
export async function checkRunAllowed(opts: {
  accountId: string;
}): Promise<RunAllowedResult> {
  const usage = await getAccountUsage({ accountId: opts.accountId });
  return {
    allowed: !usage.overLimit,
    reason: usage.overLimit ? "over_limit" : undefined,
    used: usage.costTokens,
    limit: usage.limit,
    remaining: usage.remaining,
  };
}
