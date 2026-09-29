import "server-only";
import { and, asc, desc, eq, gt, gte, lt, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  accountMembers,
  creditActionCosts,
  creditTransactions,
  topupPacks,
} from "@/db/schema";
import type { CreditCatalogFlow } from "./catalog-flow";
import { catalogFlowForAccount, getCreditSnapshot, getProPlanDto } from "./queries";
import { excludeRefundedUsageDebits } from "./logic";
import type {
  CreditUsageActivityRow,
  CreditUsageReport,
  UsagePeriod,
} from "./types";
import { normalizeUsageUserFilter } from "./usage-user-filter";
import {
  daysInRange,
  formatRangeLabel,
  getPeriodRange,
} from "./usage-range";

export { normalizeUsageUserFilter } from "./usage-user-filter";
export {
  formatRangeLabel,
  getPeriodRange,
  parseUsageCustomRangeParams,
} from "./usage-range";

const USAGE_PERIODS: UsagePeriod[] = ["1d", "7d", "30d", "mtd", "last-month"];

const ACTION_LABEL_FALLBACK: Record<string, string> = {
  docUpload: "Doc upload + signal",
  aiChat: "AI chat message",
  generateSource: "Generate source",
  playbookRun: "Playbook run",
  hubspotSync: "HubSpot sync",
  granolaSync: "Granola sync",
  slackSync: "Slack sync",
};

export function isUsagePeriod(value: string): value is UsagePeriod {
  return (USAGE_PERIODS as string[]).includes(value);
}

function formatActivityDate(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function actionLabel(slug: string | null, catalogLabel: string | null): string {
  if (catalogLabel) return catalogLabel;
  if (slug && ACTION_LABEL_FALLBACK[slug]) return ACTION_LABEL_FALLBACK[slug];
  if (slug) return slug;
  return "Credit use";
}

async function listUsageFilterUsers(accountId: string): Promise<string[]> {
  const db = await getDb();
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [members, txnUsers] = await Promise.all([
    db
      .select({ email: accountMembers.userEmail })
      .from(accountMembers)
      .where(eq(accountMembers.accountId, accountId))
      .orderBy(asc(accountMembers.userEmail)),
    db
      .selectDistinct({ email: creditTransactions.userEmail })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.accountId, accountId),
          lt(creditTransactions.amount, 0),
          gte(creditTransactions.createdAt, since),
          sql`${creditTransactions.userEmail} is not null`,
        ),
      ),
  ]);

  const set = new Set<string>();
  for (const row of members) set.add(row.email);
  for (const row of txnUsers) {
    if (row.email) set.add(row.email);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

async function getTopUpSpendInRange(
  accountId: string,
  start: Date,
  end: Date,
): Promise<number> {
  const db = await getDb();
  const [packs, topUps] = await Promise.all([
    db
      .select({ credits: topupPacks.credits, priceCents: topupPacks.priceCents })
      .from(topupPacks)
      .where(eq(topupPacks.active, true)),
    db
      .select({ amount: creditTransactions.amount })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.accountId, accountId),
          eq(creditTransactions.source, "topup"),
          gte(creditTransactions.amount, 1),
          gte(creditTransactions.createdAt, start),
          lte(creditTransactions.createdAt, end),
        ),
      ),
  ]);

  const priceByCredits = new Map<number, number>();
  for (const pack of packs) {
    if (!priceByCredits.has(pack.credits)) {
      priceByCredits.set(pack.credits, pack.priceCents / 100);
    }
  }

  let spend = 0;
  for (const row of topUps) {
    spend += priceByCredits.get(row.amount) ?? 0;
  }
  return spend;
}

/**
 * Per-action debit rows for the Usage tab (Date · User · Action · Credits).
 * Written at charge time via tryCreditAction / requireCreditAction.
 * Debits whose referenceId already has a refund credit are excluded (F20A-231).
 */
async function getUsageActivity(
  accountId: string,
  start: Date,
  end: Date,
  userFilter: string,
  /** Account catalog flow — join must include flow or dual catalogs fan-out rows (F20A-261). */
  flow: CreditCatalogFlow,
): Promise<CreditUsageActivityRow[]> {
  const db = await getDb();
  const filters = [
    eq(creditTransactions.accountId, accountId),
    lt(creditTransactions.amount, 0),
    gte(creditTransactions.createdAt, start),
    lte(creditTransactions.createdAt, end),
  ];
  if (userFilter !== "all") {
    // Case-insensitive: Cognito / ledger emails may differ in casing from the
    // membership list. Filter value is already lowercased by normalizeUsageUserFilter.
    filters.push(sql`lower(${creditTransactions.userEmail}) = ${userFilter}`);
  }

  const [rows, refundRows] = await Promise.all([
    db
      .select({
        id: creditTransactions.id,
        createdAt: creditTransactions.createdAt,
        userEmail: creditTransactions.userEmail,
        actionSlug: creditTransactions.actionSlug,
        amount: creditTransactions.amount,
        referenceId: creditTransactions.referenceId,
        actionLabel: creditActionCosts.label,
      })
      .from(creditTransactions)
      // Flow-scoped join — keep aligned with usageActivityActionCostMatches (F20A-261).
      .leftJoin(
        creditActionCosts,
        and(
          eq(creditTransactions.actionSlug, creditActionCosts.actionSlug),
          eq(creditActionCosts.flow, flow),
        ),
      )
      .where(and(...filters))
      .orderBy(desc(creditTransactions.createdAt)),
    db
      .select({ referenceId: creditTransactions.referenceId })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.accountId, accountId),
          eq(creditTransactions.source, "refund"),
          gt(creditTransactions.amount, 0),
          sql`${creditTransactions.referenceId} is not null`,
        ),
      ),
  ]);

  const refundedReferenceIds = new Set(
    refundRows
      .map((row) => row.referenceId)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  return excludeRefundedUsageDebits(rows, refundedReferenceIds).map((row) => {
    const credits = Math.abs(row.amount);
    const createdAt = row.createdAt;
    const dateKey = createdAt.toISOString().slice(0, 10);
    return {
      id: row.id,
      date: formatActivityDate(createdAt),
      dateKey,
      email: row.userEmail ?? "workspace",
      action: actionLabel(row.actionSlug, row.actionLabel),
      actionSlug: row.actionSlug,
      credits,
    };
  });
}

/**
 * Usage report for the Account Usage tab (period + optional user filter).
 * Balance snapshot is read separately by the client via CreditProvider.
 */
export async function getCreditUsageReport(opts: {
  accountId: string;
  period: UsagePeriod;
  userFilter?: string;
  /** When set, overrides preset period bounds (Usage custom date range). */
  customRange?: { start: Date; end: Date };
}): Promise<CreditUsageReport> {
  const userFilter = normalizeUsageUserFilter(opts.userFilter);
  const { start, end } = opts.customRange ?? getPeriodRange(opts.period);
  const label = formatRangeLabel(start, end);
  const days = daysInRange(start, end);

  const flow = await catalogFlowForAccount(opts.accountId);
  const [activity, users, snapshot, proPlan, topUpSpend] = await Promise.all([
    getUsageActivity(opts.accountId, start, end, userFilter, flow),
    listUsageFilterUsers(opts.accountId),
    getCreditSnapshot(opts.accountId),
    getProPlanDto(flow),
    getTopUpSpendInRange(opts.accountId, start, end),
  ]);

  const totalCredits = activity.reduce((n, row) => n + row.credits, 0);
  const totalRuns = activity.length;

  const monthlyPlanRate =
    snapshot.plan === "pro"
      ? snapshot.billingCycle === "annual"
        ? proPlan.annualPrice / 12
        : proPlan.monthlyPrice
      : 0;
  const planSpend = monthlyPlanRate * (days / 30);
  const amountSpent = planSpend + topUpSpend;

  return {
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
      label,
    },
    summary: {
      totalCredits,
      totalRuns,
      amountSpent,
      planSpend,
      topUpSpend,
    },
    activity,
    users,
  };
}
