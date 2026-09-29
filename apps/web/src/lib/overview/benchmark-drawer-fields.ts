/** Form field catalog for the Overview Edit Benchmark drawer (Design ScorecardV2 / OnboardingFlow). */

export type BenchmarkDrawerFieldKey =
  | "arr"
  | "arrGrowth"
  | "nrr"
  | "grossMargin"
  | "cacPayback"
  | "burnMultiple"
  | "ruleOf40"
  | "logoRetention"
  | "monthlyBurn"
  | "cashOnHand"
  | "headcount"
  | "payingCustomers";

export type BenchmarkDrawerUnit = "usd" | "pct" | "count" | "months" | "x";

export interface BenchmarkDrawerFieldDef {
  key: BenchmarkDrawerFieldKey;
  /** portfolio_updates column */
  column:
    | "arrUsd"
    | "arrGrowthYoyPct"
    | "nrrPct"
    | "grossMarginPct"
    | "cacPaybackMonths"
    | "burnMultiple"
    | "ruleOf40Pct"
    | "logoRetentionPct"
    | "monthlyBurnUsd"
    | "cashOnHandUsd"
    | "fteCount"
    | "paidCustomerCount";
  /** benchmark_cohorts.metric */
  metric: string;
  label: string;
  placeholder: string;
  unit: BenchmarkDrawerUnit;
  lowerIsBetter?: boolean;
  /** Design fallbacks when cohort rows are missing */
  fallback: { p25: number; p50: number; p75: number; p90: number };
}

export const BENCHMARK_DRAWER_FIELDS: BenchmarkDrawerFieldDef[] = [
  {
    key: "arr",
    column: "arrUsd",
    metric: "arr_usd",
    label: "ARR",
    placeholder: "e.g. $1,200,000",
    unit: "usd",
    fallback: { p25: 150_000, p50: 500_000, p75: 1_200_000, p90: 2_500_000 },
  },
  {
    key: "arrGrowth",
    column: "arrGrowthYoyPct",
    metric: "arr_growth_yoy_pct",
    label: "ARR growth (YoY)",
    placeholder: "e.g. 85%",
    unit: "pct",
    fallback: { p25: 18, p50: 42, p75: 80, p90: 140 },
  },
  {
    key: "nrr",
    column: "nrrPct",
    metric: "nrr_pct",
    label: "Net revenue retention",
    placeholder: "e.g. 108%",
    unit: "pct",
    fallback: { p25: 88, p50: 104, p75: 118, p90: 130 },
  },
  {
    key: "grossMargin",
    column: "grossMarginPct",
    metric: "gross_margin_pct",
    label: "Gross margin",
    placeholder: "e.g. 72%",
    unit: "pct",
    fallback: { p25: 48, p50: 62, p75: 74, p90: 82 },
  },
  {
    key: "cacPayback",
    column: "cacPaybackMonths",
    metric: "cac_payback_months",
    label: "CAC payback",
    placeholder: "e.g. 16 mo",
    unit: "months",
    lowerIsBetter: true,
    fallback: { p25: 10, p50: 16, p75: 26, p90: 42 },
  },
  {
    key: "burnMultiple",
    column: "burnMultiple",
    metric: "burn_multiple",
    label: "Burn multiple",
    placeholder: "e.g. 2.1x",
    unit: "x",
    lowerIsBetter: true,
    fallback: { p25: 1.3, p50: 2.1, p75: 3.4, p90: 5.5 },
  },
  {
    key: "ruleOf40",
    column: "ruleOf40Pct",
    metric: "rule_of_40_pct",
    label: "Rule of 40",
    placeholder: "e.g. 28",
    unit: "pct",
    fallback: { p25: 15, p50: 28, p75: 40, p90: 55 },
  },
  {
    key: "logoRetention",
    column: "logoRetentionPct",
    metric: "logo_retention_pct",
    label: "Logo retention",
    placeholder: "e.g. 92%",
    unit: "pct",
    fallback: { p25: 72, p50: 84, p75: 91, p90: 96 },
  },
  {
    key: "monthlyBurn",
    column: "monthlyBurnUsd",
    metric: "monthly_burn_usd",
    label: "Monthly net burn",
    placeholder: "e.g. $85,000",
    unit: "usd",
    lowerIsBetter: true,
    fallback: { p25: 40_000, p50: 85_000, p75: 160_000, p90: 280_000 },
  },
  {
    key: "cashOnHand",
    column: "cashOnHandUsd",
    metric: "cash_on_hand_usd",
    label: "Cash on hand",
    placeholder: "e.g. $3,200,000",
    unit: "usd",
    fallback: { p25: 800_000, p50: 2_000_000, p75: 4_000_000, p90: 8_000_000 },
  },
  {
    key: "headcount",
    column: "fteCount",
    metric: "fte_count",
    label: "Headcount (FTE)",
    placeholder: "e.g. 18",
    unit: "count",
    fallback: { p25: 8, p50: 15, p75: 28, p90: 50 },
  },
  {
    key: "payingCustomers",
    column: "paidCustomerCount",
    metric: "paid_customer_count",
    label: "Paying customers",
    placeholder: "e.g. 40",
    unit: "count",
    fallback: { p25: 18, p50: 45, p75: 90, p90: 180 },
  },
];

export type BenchmarkDrawerValues = Record<BenchmarkDrawerFieldKey, string>;

export function emptyBenchmarkDrawerValues(): BenchmarkDrawerValues {
  return {
    arr: "",
    arrGrowth: "",
    nrr: "",
    grossMargin: "",
    cacPayback: "",
    burnMultiple: "",
    ruleOf40: "",
    logoRetention: "",
    monthlyBurn: "",
    cashOnHand: "",
    headcount: "",
    payingCustomers: "",
  };
}

export function countFilledBenchmarkDrawerValues(
  values?: Partial<Record<string, string>> | null,
): number {
  if (!values) return 0;
  return BENCHMARK_DRAWER_FIELDS.filter((field) => Boolean(values[field.key]?.trim())).length;
}

/** Logged numeric metrics across every benchmark form field (12). */
export function countLoggedBenchmarkMetrics(
  values?: Record<string, number | null | undefined> | null,
): number {
  if (!values) return 0;
  return BENCHMARK_DRAWER_FIELDS.filter((field) => {
    const value = values[field.metric];
    return value != null && Number.isFinite(value);
  }).length;
}

/** portfolio_updates columns → benchmark metric ids for every form field. */
export function benchmarkMetricValuesFromColumns(
  row?: Partial<Record<BenchmarkDrawerFieldDef["column"], number | null>> | null,
): Record<string, number | null> {
  const values: Record<string, number | null> = {};
  for (const field of BENCHMARK_DRAWER_FIELDS) {
    const raw = row?.[field.column];
    values[field.metric] = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  }
  return values;
}

export function isAllBenchmarkDrawerValuesFilled(values: BenchmarkDrawerValues): boolean {
  return countFilledBenchmarkDrawerValues(values) === BENCHMARK_DRAWER_FIELDS.length;
}

/** Parse user-typed currency / percent / count / months / multiple strings. */
export function parseBenchmarkDrawerValue(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/[$,%\s]/gi, "")
    .replace(/mo(nths?)?$/i, "")
    .replace(/x$/i, "");
  if (!cleaned) return null;
  const b = cleaned.match(/^([\d.]+)B$/i);
  if (b) return Number(b[1]) * 1_000_000_000;
  const m = cleaned.match(/^([\d.]+)M$/i);
  if (m) return Number(m[1]) * 1_000_000;
  const k = cleaned.match(/^([\d.]+)K$/i);
  if (k) return Number(k[1]) * 1_000;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function formatBenchmarkTick(value: number, unit: BenchmarkDrawerUnit): string {
  if (unit === "pct") return `${Math.round(value)}%`;
  if (unit === "count") return String(Math.round(value));
  if (unit === "months") return `${Math.round(value)} mo`;
  if (unit === "x") {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded}x`;
  }
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatBenchmarkInputValue(
  value: number | null | undefined,
  unit: BenchmarkDrawerUnit,
): string {
  if (value == null || !Number.isFinite(value)) return "";
  if (unit === "pct" || unit === "months" || unit === "x") return String(value);
  if (unit === "count") return String(Math.round(value));
  return String(value);
}

/** Matches Design/src/app/OnboardingFlow.tsx `dotColor`. */
export function cohortDotColor(
  value: number,
  p25: number,
  p50: number,
  p75: number,
  lowerIsBetter: boolean,
): string {
  if (lowerIsBetter) {
    if (value > p75) return "#E56B6B";
    if (value > p50) return "#D4924A";
    return "#3DD68C";
  }
  if (value < p25) return "#E56B6B";
  if (value < p50) return "#D4924A";
  return "#3DD68C";
}

/** Matches Design/src/app/OnboardingFlow.tsx `dotGlow`. */
export function cohortDotGlow(
  value: number,
  p25: number,
  p50: number,
  p75: number,
  lowerIsBetter: boolean,
): string {
  if (lowerIsBetter) {
    if (value > p75) return "0 0 10px rgba(229,107,107,0.7)";
    if (value > p50) return "0 0 10px rgba(212,146,74,0.6)";
    if (value <= p25) return "0 0 14px rgba(61,214,140,0.8)";
    return "0 0 10px rgba(61,214,140,0.55)";
  }
  if (value < p25) return "0 0 10px rgba(229,107,107,0.7)";
  if (value < p50) return "0 0 10px rgba(212,146,74,0.6)";
  if (value >= p75) return "0 0 14px rgba(61,214,140,0.8)";
  return "0 0 10px rgba(61,214,140,0.55)";
}
