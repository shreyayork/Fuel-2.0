import type { OnboardBenchmarkRow } from "@/lib/onboard/profile-types";
import type { OnboardBenchmarkMetricInput } from "@/lib/onboard/benchmark-insights-types";
import { BENCHMARK_DRAWER_FIELDS } from "@/lib/overview/benchmark-drawer-fields";

/** OnboardingFlow Answers keys → benchmark_cohorts.metric ids. */
export const ONBOARD_ANSWER_TO_COHORT_METRIC: Record<string, string> = {
  arr: "arr_usd",
  arrGrowth: "arr_growth_yoy_pct",
  nrr: "nrr_pct",
  grossMargin: "gross_margin_pct",
  cacPayback: "cac_payback_months",
  burnMultiple: "burn_multiple",
  ruleOf40: "rule_of_40_pct",
  logoRetention: "logo_retention_pct",
  monthlyBurn: "monthly_burn_usd",
  cashOnHand: "cash_on_hand_usd",
  headcount: "fte_count",
  payingCustomers: "paid_customer_count",
};

export const ONBOARD_METRIC_LABELS: Record<string, string> = {
  arr: "ARR",
  arrGrowth: "ARR growth",
  nrr: "NRR",
  grossMargin: "Gross margin",
  cacPayback: "CAC payback",
  burnMultiple: "Burn multiple",
  ruleOf40: "Rule of 40",
  logoRetention: "Logo retention",
  monthlyBurn: "Monthly burn",
  cashOnHand: "Cash on hand",
  headcount: "Headcount",
  payingCustomers: "Paying customers",
};

export const ONBOARD_METRIC_UNITS: Record<string, string> = {
  arr: "usd",
  arrGrowth: "%",
  nrr: "%",
  grossMargin: "%",
  cacPayback: "months",
  burnMultiple: "x",
  ruleOf40: "%",
  logoRetention: "%",
  monthlyBurn: "usd",
  cashOnHand: "usd",
  headcount: "",
  payingCustomers: "",
};

export type BenchmarkMetricBands = {
  key: string;
  label: string;
  ph: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  unit: string;
  /** When true, higher values are worse (burn, CAC payback). */
  lowerIsBetter?: boolean;
};

/** Onboarding form metric list — same 12 fields as Overview benchmark drawer. */
export function onboardBenchmarkMetricBandsFromDrawer(): BenchmarkMetricBands[] {
  return BENCHMARK_DRAWER_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    ph: field.placeholder,
    p25: field.fallback.p25,
    p50: field.fallback.p50,
    p75: field.fallback.p75,
    p90: field.fallback.p90,
    unit:
      field.unit === "pct" ? "%" : field.unit === "count" ? "" : field.unit,
    lowerIsBetter: Boolean(field.lowerIsBetter),
  }));
}

export function parseOnboardBenchmarkValue(raw: string): number | null {
  if (!raw.trim()) return null;
  const c = raw
    .replace(/[$,%\s]/gi, "")
    .replace(/mo(nths?)?$/i, "")
    .replace(/x$/i, "");
  if (!c) return null;
  const b = c.match(/^([\d.]+)B$/i);
  if (b) return parseFloat(b[1]) * 1_000_000_000;
  const m = c.match(/^([\d.]+)M$/i);
  if (m) return parseFloat(m[1]) * 1_000_000;
  const k = c.match(/^([\d.]+)K$/i);
  if (k) return parseFloat(k[1]) * 1_000;
  const value = Number(c);
  return Number.isFinite(value) ? value : null;
}

export function formatOnboardMetricDisplay(value: number, unit: string): string {
  if (unit === "%" || unit === "pct") return `${value}%`;
  if (unit === "months") return `${Math.round(value)} mo`;
  if (unit === "x") {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded}x`;
  }
  if (unit === "usd") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${Math.round(value).toLocaleString("en-US")}`;
  }
  if (unit === "") return `${value}`;
  return String(value);
}

export type PerfTier = OnboardBenchmarkMetricInput["tier"];

export function perfTierForValue(
  value: number,
  p25: number,
  p50: number,
  p75: number,
  p90: number,
  invertedGood = false,
): PerfTier {
  if (invertedGood) {
    if (value <= p25) return "top10";
    if (value <= p50) return "top25";
    if (value <= p75) return "above";
    if (value <= p90) return "below";
    return "weak";
  }
  if (value >= p90) return "top10";
  if (value >= p75) return "top25";
  if (value >= p50) return "above";
  if (value >= p25) return "below";
  return "weak";
}

export function mergeCohortBandsIntoMetrics(
  staticMetrics: BenchmarkMetricBands[],
  cohortRows: OnboardBenchmarkRow[],
): BenchmarkMetricBands[] {
  const byMetric = new Map(cohortRows.map((r) => [r.metric, r]));
  return staticMetrics.map((m) => {
    const metricId = ONBOARD_ANSWER_TO_COHORT_METRIC[m.key];
    const row = metricId ? byMetric.get(metricId) : undefined;
    if (
      !row ||
      row.p25 == null ||
      row.p50 == null ||
      row.p75 == null ||
      row.p90 == null
    ) {
      return m;
    }
    return {
      ...m,
      p25: row.p25,
      p50: row.p50,
      p75: row.p75,
      p90: row.p90,
    };
  });
}

export function buildMetricInputsFromAnswers(
  answers: Record<string, string>,
  staticMetrics: BenchmarkMetricBands[],
  cohortRows: OnboardBenchmarkRow[],
): OnboardBenchmarkMetricInput[] {
  const metrics = mergeCohortBandsIntoMetrics(staticMetrics, cohortRows);
  const byMetric = new Map(cohortRows.map((r) => [r.metric, r]));
  const out: OnboardBenchmarkMetricInput[] = [];

  for (const m of metrics) {
    const raw = answers[m.key] ?? "";
    const userValue = parseOnboardBenchmarkValue(raw);
    if (userValue === null) continue;
    const metricId = ONBOARD_ANSWER_TO_COHORT_METRIC[m.key] ?? m.key;
    const row = byMetric.get(metricId);
    const invertedGood =
      row?.invertedGood ??
      m.lowerIsBetter ??
      (m.key === "monthlyBurn" ||
        m.key === "burnMultiple" ||
        m.key === "cacPayback");
    const tier = perfTierForValue(
      userValue,
      m.p25,
      m.p50,
      m.p75,
      m.p90,
      invertedGood,
    );
    out.push({
      answerKey: m.key,
      metricId,
      label: m.label,
      userValue,
      displayVal: formatOnboardMetricDisplay(userValue, m.unit),
      tier,
      p25: m.p25,
      p50: m.p50,
      p75: m.p75,
      p90: m.p90,
      invertedGood,
      unit: m.unit,
    });
  }

  return out;
}
