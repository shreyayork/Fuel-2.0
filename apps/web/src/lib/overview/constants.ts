export const OVERVIEW_GENERATION_KIND = "overview_generation" as const;
export { OVERVIEW_GENERATION_SLUG as OVERVIEW_PLAYBOOK_SLUG } from "@/lib/system-playbooks/slugs";
/** Client poll interval while overview generation is pending/running. */
export const OVERVIEW_POLL_INTERVAL_MS = 3000;
/** Bedrock Converse wall-clock budget for overview generation. */
export const OVERVIEW_BEDROCK_TIMEOUT_MS = 90_000;
/**
 * In-flight jobs older than this are treated as failed so the Overview tab
 * cannot spin forever if Bedrock hangs or the worker is killed.
 */
export const OVERVIEW_GENERATION_STALE_MS = 150_000;

export function isOverviewGenerationStale(
  startedAt: Date | string | null | undefined,
  now: Date = new Date(),
  staleMs: number = OVERVIEW_GENERATION_STALE_MS,
): boolean {
  if (!startedAt) return false;
  const t = startedAt instanceof Date ? startedAt.getTime() : Date.parse(String(startedAt));
  if (!Number.isFinite(t)) return false;
  return now.getTime() - t >= staleMs;
}

export const CATEGORY_IDS = ["dev", "mkt", "rev"] as const;
export type OverviewCategoryId = (typeof CATEGORY_IDS)[number];

export function isOverviewCategoryId(
  value: string | null | undefined,
): value is OverviewCategoryId {
  return typeof value === "string" && (CATEGORY_IDS as readonly string[]).includes(value);
}

export function overviewTrackSectionId(categoryId: OverviewCategoryId): string {
  return `overview-track-${categoryId}`;
}

export const CATEGORY_META: Record<
  OverviewCategoryId,
  { label: string; fullLabel: string; initiativeArea: string }
> = {
  dev: { label: "R&D", fullLabel: "Research and Development", initiativeArea: "product" },
  mkt: { label: "GTM", fullLabel: "Go to Market", initiativeArea: "gtm" },
  rev: { label: "G&A", fullLabel: "General and Administrative", initiativeArea: "finance" },
};

export const BENCHMARK_WEIGHT = 45;
export const PROFILE_WEIGHT = 15;
export const DETAIL_WEIGHT = 40;

export const CATEGORY_METRIC_KEYS: Record<OverviewCategoryId, string[]> = {
  dev: ["fte_count", "gross_margin_pct"],
  mkt: [
    "arr_usd",
    "logo_retention_pct",
    "paid_customer_count",
    "nrr_pct",
    "arr_growth_yoy_pct",
  ],
  rev: ["cash_on_hand_usd", "monthly_burn_usd"],
};

/** All cohort metrics surfaced on the overview scorecard (9 total). */
export const OVERVIEW_BENCHMARK_METRIC_KEYS = Array.from(
  new Set(Object.values(CATEGORY_METRIC_KEYS).flat()),
);

export const METRIC_LABELS: Record<string, string> = {
  arr_usd: "ARR",
  arr_growth_yoy_pct: "ARR growth YoY",
  nrr_pct: "Net revenue retention",
  logo_retention_pct: "Logo retention",
  gross_margin_pct: "Gross margin",
  monthly_burn_usd: "Monthly net burn",
  cash_on_hand_usd: "Cash on hand",
  fte_count: "FTE headcount",
  paid_customer_count: "Paying customers",
};

export const INVERTED_METRICS = new Set(["monthly_burn_usd"]);

export function scoreToStatus(score: number): {
  label: string;
  tone: string;
  colorKey: "strong" | "above" | "around" | "below" | "weak";
} {
  if (score >= 80) return { label: "Leading Cohort", tone: "strong", colorKey: "strong" };
  if (score >= 65) return { label: "Above Average", tone: "above", colorKey: "above" };
  if (score >= 50) return { label: "Around Median", tone: "around", colorKey: "around" };
  if (score >= 35) return { label: "Needs Attention", tone: "below", colorKey: "below" };
  return { label: "Critical", tone: "weak", colorKey: "weak" };
}

export function tierFromPercentile(
  value: number,
  p25: number,
  p50: number,
  p75: number,
  p90: number,
  inverted: boolean,
): "top" | "upper" | "mid" | "lower" | "bottom" {
  const v = inverted ? -value : value;
  const t25 = inverted ? -p25 : p25;
  const t50 = inverted ? -p50 : p50;
  const t75 = inverted ? -p75 : p75;
  const t90 = inverted ? -p90 : p90;
  if (v >= t90) return "top";
  if (v >= t75) return "upper";
  if (v >= t50) return "mid";
  if (v >= t25) return "lower";
  return "bottom";
}

export const TIER_SCORES: Record<string, number> = {
  top: 90,
  upper: 72,
  mid: 52,
  lower: 32,
  bottom: 12,
};

export function currentQuarterLabel(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `Q${q} ${now.getFullYear()}`;
}
