import type { CreditActionType, ProPlanDto, UpgradeReason } from "./types";

export const PRO_TAGLINE =
  "An AI advisor that doesn't take percentage points of your company.";

/** Fallback when Pro plan DTO is not loaded yet. */
export const DEFAULT_PRO_PLAN: ProPlanDto = {
  monthlyPrice: 30,
  annualPrice: 300,
  monthlyLimit: 2000,
  dailyLimit: 200,
};

export function formatUsd(amount: number): string {
  if (Number.isInteger(amount)) return `$${amount}`;
  return `$${amount.toFixed(2)}`;
}

/** Effective monthly rate when billed annually. */
export function annualPerMonth(annualPrice: number): number {
  return Math.round((annualPrice / 12) * 100) / 100;
}

/**
 * Months of monthly billing saved by the annual price:
 * (monthly × 12 − annual) ÷ monthly.
 * Whole number when exact; one decimal for partial months.
 * Null when monthly ≤ 0 or savings ≤ 0.
 */
export function formatAnnualSavingsLabel(
  monthlyPrice: number,
  annualPrice: number,
): string | null {
  if (!(monthlyPrice > 0)) return null;
  const months = (monthlyPrice * 12 - annualPrice) / monthlyPrice;
  if (!Number.isFinite(months) || months <= 0) return null;
  const rounded = Math.round(months * 10) / 10;
  if (!(rounded > 0)) return null;
  const isWhole = Number.isInteger(rounded);
  const amount = isWhole ? String(rounded) : rounded.toFixed(1);
  const unit = rounded === 1 ? "month" : "months";
  return `${amount} ${unit} free`;
}

export function proPriceFrame(plan: ProPlanDto = DEFAULT_PRO_PLAN): string {
  return `From ${formatUsd(annualPerMonth(plan.annualPrice))}/mo — a fraction of advisory retainers, zero equity dilution.`;
}

export function proFromPriceLabel(plan: ProPlanDto = DEFAULT_PRO_PLAN): string {
  return `from ${formatUsd(annualPerMonth(plan.annualPrice))}/mo`;
}

export const PRO_UPGRADE_HEADERS: Record<UpgradeReason, string> = {
  monthlyEmpty: "Your advisor ran out of room this month.",
  dailyBlocked: "Free tier paused your advisor for today.",
  runningLow: "You're running low on advisor time.",
  healthy: "Replace equity-diluting advisors with Fuel Pro.",
};

export const PRO_INCLUDES = [
  "Always-on operating advisor across benchmarks, intelligence, and playbooks",
  "2,000 credits/month — research, documents, and AI guidance on demand",
  "No equity, no retainer — cancel anytime",
  "Daily limits reset in 6 hours, not 24",
  "Top-up packs for fundraising sprints or diligence pushes",
];

/** Upgrade modal bullets. Founder copy stays fixed; Investor follows its Pro pool. */
export function proIncludes(
  plan: Pick<ProPlanDto, "flow" | "monthlyLimit"> = DEFAULT_PRO_PLAN,
): readonly string[] {
  if (plan.flow !== "investor") return PRO_INCLUDES;
  const credits = plan.monthlyLimit.toLocaleString("en-US");
  return [
    "Always-on advisor across portfolio, diligence, and value creation",
    `${credits} credits/month — research, documents, and AI guidance across the portfolio`,
    "No equity, no retainer — cancel anytime",
    "Daily limits reset in 6 hours, not 24",
    "Top-up packs for fundraising sprints or diligence pushes",
  ];
}

export const TOP_UP_FOOTNOTE =
  "Credits added instantly · never expire · monthly credits used first · unblocks your day immediately";

/** Shown on cancel / downgrade flows — matches product policy (no prorated refund). */
export const BILLING_POLICY = {
  cancelNoRefund:
    "Cancel anytime. You keep Pro through the end of the current term — no prorated refund for unused time.",
  annualCancel:
    "On annual billing, cancel means access through the remaining months of your year. No credit for unused months.",
  yearlyToMonthly:
    "Switching yearly → monthly is a downgrade: it starts after your annual term ends. No mid-term charge and no partial credit.",
  monthlyToYearly:
    "Switching monthly → yearly opens Stripe Checkout to confirm payment. Your plan updates to annual only after payment completes.",
  billingError:
    "Charged in error? Contact support — that is a billing correction, not a cancellation refund.",
  grandfatherKeepRate:
    "You keep your current rate until you change plan. Switching to another cycle applies the new catalog pricing.",
} as const;

export const CREDIT_ACTION_TYPES: CreditActionType[] = [
  "docUpload",
  "aiChat",
  "generateSource",
  "playbookRun",
  "hubspotSync",
  "granolaSync",
  "slackSync",
];

/** Integration sync/reconcile actions — Super Admin "Integration Sync Credits" group. */
export const INTEGRATION_SYNC_ACTIONS: ReadonlyArray<{
  action: Extract<CreditActionType, "hubspotSync" | "granolaSync" | "slackSync">;
  label: string;
}> = [
  { action: "hubspotSync", label: "HubSpot sync" },
  { action: "granolaSync", label: "Granola sync" },
  { action: "slackSync", label: "Slack sync" },
];

export const INTEGRATION_SYNC_ACTION_SLUGS: ReadonlySet<string> = new Set(
  INTEGRATION_SYNC_ACTIONS.map((row) => row.action),
);

export function isCreditActionType(value: string): value is CreditActionType {
  return (CREDIT_ACTION_TYPES as string[]).includes(value);
}

/** Per-activity credit dialog: hide free (0-cost) actions. */
export function billableActionCosts<T extends { cost: number }>(rows: T[]): T[] {
  return rows.filter((row) => row.cost > 0);
}
