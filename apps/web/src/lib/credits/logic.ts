import type { CreditCatalogFlow } from "./catalog-flow";
import type {
  CreditActionType,
  CreditSnapshot,
  MonthlyUsageStats,
  PopoverState,
  UpgradeReason,
} from "./types";

/** Billing-period pool left (included monthly + top-ups). Informational — not today's spend cap. */
export function totalRemaining(snapshot: CreditSnapshot): number {
  return Math.max(0, snapshot.monthlyLimit + snapshot.topUpBalance - snapshot.monthlyUsed);
}

/** Included plan credits left in the billing period (excludes top-ups). */
export function monthlyIncludedRemaining(snapshot: CreditSnapshot): number {
  return Math.max(0, snapshot.monthlyLimit - snapshot.monthlyUsed);
}

export function monthlyRemainingRatio(snapshot: CreditSnapshot): number {
  const cap = snapshot.monthlyLimit + snapshot.topUpBalance;
  if (cap <= 0) return 0;
  return totalRemaining(snapshot) / cap;
}

/**
 * Included (plan) credits still spendable today.
 * Capped by both the daily allowance counter and remaining monthly included credits.
 * Top-ups are never counted here.
 */
export function dailyRemaining(snapshot: CreditSnapshot): number {
  const dailyRoom = Math.max(0, snapshot.dailyLimit - snapshot.dailyUsed);
  return Math.min(dailyRoom, monthlyIncludedRemaining(snapshot));
}

/**
 * Credits spendable right now: today's included daily room + remaining top-ups.
 * Never uses the full monthly remaining balance as a same-day spendable pool.
 */
export function availableToday(snapshot: CreditSnapshot): number {
  return dailyRemaining(snapshot) + Math.max(0, snapshot.topUpBalance);
}

/**
 * Daily pause: included daily room is gone, top-ups are gone, but monthly
 * included credits still remain for later days. `blockUntil` drives countdown UI.
 */
export function isDailyBlocked(snapshot: CreditSnapshot, _now = Date.now()): boolean {
  if (availableToday(snapshot) > 0) return false;
  return monthlyIncludedRemaining(snapshot) > 0;
}

export function isMonthlyEmpty(snapshot: CreditSnapshot): boolean {
  return totalRemaining(snapshot) <= 0;
}

export function isGenerationBlocked(snapshot: CreditSnapshot, _now = Date.now()): boolean {
  return availableToday(snapshot) <= 0;
}

export function getBarTone(snapshot: CreditSnapshot, now = Date.now()): "teal" | "amber" | "red" {
  if (isGenerationBlocked(snapshot, now)) return "red";
  const ratio = monthlyRemainingRatio(snapshot);
  if (ratio <= 0.1) return "red";
  if (ratio <= 0.3) return "amber";
  return "teal";
}

export function getPopoverState(snapshot: CreditSnapshot, now = Date.now()): PopoverState {
  if (snapshot.justUnblocked) return "justUnblocked";
  if (isDailyBlocked(snapshot, now)) return "dailyBlocked";
  if (isMonthlyEmpty(snapshot)) return "monthlyEmpty";
  const ratio = monthlyRemainingRatio(snapshot);
  if (ratio <= 0.3) return "runningLow";
  return "healthy";
}

export function getUpgradeReason(snapshot: CreditSnapshot, now = Date.now()): UpgradeReason {
  if (isMonthlyEmpty(snapshot)) return "monthlyEmpty";
  if (isDailyBlocked(snapshot, now)) return "dailyBlocked";
  if (monthlyRemainingRatio(snapshot) <= 0.3) return "runningLow";
  return "healthy";
}

export function blockRemainingMs(snapshot: CreditSnapshot, now = Date.now()): number {
  if (!snapshot.blockUntil) return 0;
  return Math.max(0, snapshot.blockUntil - now);
}

export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}m`;
  return "0m";
}

/** True when a daily-pause UI should show a live reset countdown (not a stale `0m`). */
export function hasActiveBlockCountdown(ms: number): boolean {
  return Number.isFinite(ms) && ms > 0;
}

export function actionsRemaining(
  snapshot: CreditSnapshot,
  action: CreditActionType,
  cost: number,
): number {
  if (cost <= 0) return 0;
  return Math.floor(availableToday(snapshot) / cost);
}

export function daysUntilMonthlyEmpty(snapshot: CreditSnapshot): number | null {
  const remaining = totalRemaining(snapshot);
  if (remaining <= 0) return 0;
  const daysInMonth = 30;
  const used = snapshot.monthlyUsed;
  if (used <= 0) return null;
  const dailyAvg = used / Math.max(1, daysInMonth - 15);
  if (dailyAvg <= 0) return null;
  const daysLeft = Math.ceil(remaining / dailyAvg);
  if (daysLeft >= daysInMonth) return null;
  return daysLeft;
}

export function willRunOutBeforeReset(snapshot: CreditSnapshot): boolean {
  const days = daysUntilMonthlyEmpty(snapshot);
  return days != null && days < 30;
}

export function canAfford(
  snapshot: CreditSnapshot,
  cost: number,
  now = Date.now(),
): boolean {
  if (isGenerationBlocked(snapshot, now)) return false;
  return availableToday(snapshot) >= cost;
}

export function bumpStats(
  stats: MonthlyUsageStats,
  action: CreditActionType,
): MonthlyUsageStats {
  const next = { ...stats };
  if (action === "docUpload") {
    next.docs += 1;
    next.signals += 1;
  }
  if (action === "aiChat") next.messages += 1;
  if (action === "generateSource") next.signals += 1;
  return next;
}

/**
 * Label for when included monthly credits renew.
 * - Free (no Stripe period): first day of next UTC month.
 * - Pro: Stripe `current_period_end` itself (do not add a month — that date
 *   is already the period boundary used by Billing, Usage, and the banner).
 */
export function monthlyResetLabelFromDate(date: Date | null): string {
  if (!date) {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return next.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Start of the UTC calendar day containing `date`. */
export function utcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Start of the UTC calendar month containing `date`. */
export function utcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * The `daily_used` counter is scoped to one UTC day. Without this rollover the
 * counter accumulates across days and trips `daily_limit` on a day the user
 * spent far less than the allowance (F20A-184).
 *
 * A null anchor means the ledger predates the anchor column — treat as stale so
 * the counter starts a clean day.
 */
export function shouldRollDailyWindow(anchor: Date | null, now: Date): boolean {
  if (!anchor) return true;
  return anchor.getTime() < utcDayStart(now).getTime();
}

/**
 * Free workspaces renew included credits on the UTC month boundary. Pro renews
 * on Stripe's period bounds, so its monthly counter is rolled by the webhook
 * (`resetProBillingPeriod`) and must not be reset here.
 */
export function shouldRollFreeMonthlyWindow(
  planSlug: string,
  anchor: Date | null,
  now: Date,
): boolean {
  if (planSlug !== "free") return false;
  if (!anchor) return true;
  return anchor.getTime() < utcMonthStart(now).getTime();
}

/**
 * True when a canceled Pro subscription's paid term has ended and the
 * workspace should be on Free (even if Stripe's deleted webhook is late/missed).
 */
export function shouldRevertCanceledPro(opts: {
  plan: string;
  cancelAtPeriodEnd: boolean;
  periodEndsAt: number | null;
  now?: number;
}): boolean {
  if (opts.plan !== "pro" || !opts.cancelAtPeriodEnd) return false;
  if (opts.periodEndsAt == null) return false;
  return opts.periodEndsAt <= (opts.now ?? Date.now());
}

/** Whole days remaining until `periodEndsAt` (ceil). 0 when elapsed. */
export function daysUntilPeriodEnd(periodEndsAt: number | null, now = Date.now()): number | null {
  if (periodEndsAt == null) return null;
  const diff = periodEndsAt - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

export function formatPeriodEndLabel(periodEndsAt: number | null): string {
  if (periodEndsAt == null) return "period end";
  return new Date(periodEndsAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDaysRemaining(days: number | null): string {
  if (days == null) return "the end of your term";
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

/**
 * Why an action cannot run: daily spend room (incl. top-ups via `availableToday`)
 * is short while the billing-period total can still cover the cost, vs total empty.
 */
export type InsufficientCreditsKind = "daily_limit" | "total_balance";

export function classifyInsufficientCredits(
  snapshot: CreditSnapshot,
  required: number,
): InsufficientCreditsKind {
  if (availableToday(snapshot) < required && totalRemaining(snapshot) >= required) {
    return "daily_limit";
  }
  return "total_balance";
}

/** Absolute reset label from `blockUntil` only — null when unknown or already elapsed. */
export function formatBlockUntilResetLabel(
  blockUntil: number | null,
  now = Date.now(),
): string | null {
  if (blockUntil == null || blockUntil <= now) return null;
  return new Date(blockUntil).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Legacy total-balance copy (F20A-191). Prefer
 * {@link formatActionInsufficientCreditsMessage} when a snapshot is available.
 */
export function formatInsufficientCreditsMessage(
  required: number,
  remaining: number,
): string {
  return `Insufficient credits. This action requires ${required} credits, but you have only ${remaining} credits remaining.`;
}

/**
 * User-facing copy for a denied credit action. Distinguishes daily-limit vs
 * total-balance shortfalls (F20A-219). Reset time appended only when
 * `blockUntil` is set and still in the future.
 */
export function formatActionInsufficientCreditsMessage(
  snapshot: CreditSnapshot,
  required: number,
  now = Date.now(),
): string {
  const today = availableToday(snapshot);
  const total = totalRemaining(snapshot);
  const cap = snapshot.monthlyLimit + snapshot.topUpBalance;

  if (classifyInsufficientCredits(snapshot, required) === "daily_limit") {
    let message =
      `Daily limit is not sufficient to run this AI task. This action needs ${required} credits. ` +
      `You have ${today} credits left today. Total balance: ${total} / ${cap}.`;
    const reset = formatBlockUntilResetLabel(snapshot.blockUntil, now);
    if (reset) {
      message += ` Daily limit resets at ${reset}.`;
    }
    return message;
  }

  return formatInsufficientCreditsMessage(required, total);
}

/** Counters mutated when reversing a prior `tryCreditAction` debit (F20A-231). */
export type CreditLedgerCounters = {
  monthlyUsed: number;
  dailyUsed: number;
  topUpBalance: number;
  blockUntil: Date | null;
};

/**
 * Reverse one debit onto ledger counters using the same single `source` the
 * charge recorded. Mixed monthly+topup charges that stored `source: "monthly"`
 * only restore the included pool — known limitation, no schema expand.
 */
export function reverseCreditDebitCounters(
  ledger: CreditLedgerCounters,
  opts: { amount: number; source: string },
): CreditLedgerCounters {
  const cost = Math.abs(opts.amount);
  if (cost <= 0) {
    return { ...ledger };
  }

  if (opts.source === "topup") {
    return {
      ...ledger,
      topUpBalance: ledger.topUpBalance + cost,
      blockUntil: null,
    };
  }

  // Default / "monthly": restore included daily + monthly room.
  return {
    ...ledger,
    monthlyUsed: Math.max(0, ledger.monthlyUsed - cost),
    dailyUsed: Math.max(0, ledger.dailyUsed - cost),
    blockUntil: null,
  };
}

export type RefundDecision =
  | { kind: "refund"; debitId: string; amount: number; source: string }
  | { kind: "skip"; reason: "already_refunded" | "no_debit" };

/**
 * Pure refund target resolution — idempotent on `referenceId`.
 * Second call with an existing refund row → `already_refunded` (no second credit).
 */
export function resolveCreditRefund(opts: {
  referenceId: string;
  action: string;
  debits: Array<{
    id: string;
    referenceId: string | null;
    actionSlug: string | null;
    amount: number;
    source: string;
  }>;
  refunds: Array<{ referenceId: string | null; amount: number; source: string }>;
}): RefundDecision {
  const already = opts.refunds.some(
    (row) =>
      row.referenceId === opts.referenceId &&
      row.source === "refund" &&
      row.amount > 0,
  );
  if (already) return { kind: "skip", reason: "already_refunded" };

  const debit = opts.debits.find(
    (row) =>
      row.referenceId === opts.referenceId &&
      row.actionSlug === opts.action &&
      row.amount < 0,
  );
  if (!debit) return { kind: "skip", reason: "no_debit" };

  return {
    kind: "refund",
    debitId: debit.id,
    amount: Math.abs(debit.amount),
    source: debit.source,
  };
}

/** Drop Usage-tab debits whose `referenceId` already has a refund credit. */
export function excludeRefundedUsageDebits<T extends { referenceId: string | null }>(
  debits: T[],
  refundedReferenceIds: ReadonlySet<string>,
): T[] {
  if (refundedReferenceIds.size === 0) return debits;
  return debits.filter(
    (row) => row.referenceId == null || !refundedReferenceIds.has(row.referenceId),
  );
}

/**
 * Join predicate for Usage Activity labels (`credit_transactions` ⟕ `credit_action_costs`).
 * Must match slug **and** account catalog flow — slug-only matches both founder and investor
 * rows after migration 0084, duplicating activity lines and inflating TOTAL THIS PERIOD (F20A-261).
 */
export function usageActivityActionCostMatches(opts: {
  transactionActionSlug: string;
  costActionSlug: string;
  costFlow: string;
  accountFlow: CreditCatalogFlow;
}): boolean {
  return (
    opts.transactionActionSlug === opts.costActionSlug &&
    opts.costFlow === opts.accountFlow
  );
}
