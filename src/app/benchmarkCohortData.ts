/** York portfolio peer benchmarks — 2026-Q1, by cohort key. */

export type BenchmarkCohortId =
  | "b2b_saas:growth:us"
  | "b2b_saas:seed:us"
  | "b2b_saas:series_a:us"
  | "dev_tools:series_a:us";

export type BenchmarkMetricKey =
  | "arr"
  | "arrGrowth"
  | "nrr"
  | "logoRetention"
  | "grossMargin"
  | "cacPayback"
  | "burnMultiple"
  | "ruleOf40"
  | "monthlyBurn"
  | "cashOnHand"
  | "headcount"
  | "payingCustomers";

export type CohortMetricPeer = {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  lowerIsBetter?: boolean;
};

/** Green band on bars = P25–P90 on the 0–100 percentile track. */
export const BENCHMARK_PEER_BAND = { bandStart: 25, bandEnd: 90 } as const;

export const DEFAULT_BENCHMARK_COHORT_ID: BenchmarkCohortId = "b2b_saas:seed:us";

const STORAGE_KEY = "fuel-benchmark-cohort-id:v1";

export const BENCHMARK_COHORT_OPTIONS: {
  value: BenchmarkCohortId;
  label: string;
  n: number;
}[] = [
  { value: "b2b_saas:growth:us", label: "B2B SaaS · Growth · US", n: 94 },
  { value: "b2b_saas:seed:us", label: "B2B SaaS · Seed · US", n: 147 },
  { value: "b2b_saas:series_a:us", label: "B2B SaaS · Series A · US", n: 203 },
  { value: "dev_tools:series_a:us", label: "Dev Tools · Series A · US", n: 41 },
];

const COHORT_METRICS: Record<BenchmarkCohortId, Partial<Record<BenchmarkMetricKey, CohortMetricPeer>>> = {
  "b2b_saas:growth:us": {
    arrGrowth: { p25: 40, p50: 65, p75: 95, p90: 140 },
    arr: { p25: 15_000_000, p50: 35_000_000, p75: 80_000_000, p90: 150_000_000 },
    cashOnHand: { p25: 30_000_000, p50: 80_000_000, p75: 200_000_000, p90: 500_000_000 },
    headcount: { p25: 150, p50: 300, p75: 600, p90: 1200 },
    grossMargin: { p25: 72, p50: 80, p75: 85, p90: 90 },
    logoRetention: { p25: 88, p50: 93, p75: 97, p90: 99 },
    monthlyBurn: { p25: 800_000, p50: 1_800_000, p75: 4_000_000, p90: 9_000_000, lowerIsBetter: true },
    nrr: { p25: 105, p50: 118, p75: 132, p90: 152 },
    payingCustomers: { p25: 500, p50: 2000, p75: 8000, p90: 30_000 },
    ruleOf40: { p25: 25, p50: 42, p75: 58, p90: 75 },
  },
  "b2b_saas:seed:us": {
    arrGrowth: { p25: 120, p50: 200, p75: 350, p90: 600 },
    arr: { p25: 150_000, p50: 500_000, p75: 1_200_000, p90: 2_500_000 },
    burnMultiple: { p25: 1.3, p50: 2.1, p75: 3.4, p90: 5.5, lowerIsBetter: true },
    cacPayback: { p25: 10, p50: 16, p75: 26, p90: 42, lowerIsBetter: true },
    cashOnHand: { p25: 500_000, p50: 1_500_000, p75: 3_000_000, p90: 6_000_000 },
    headcount: { p25: 6, p50: 12, p75: 22, p90: 40 },
    grossMargin: { p25: 55, p50: 72, p75: 82, p90: 88 },
    logoRetention: { p25: 80, p50: 88, p75: 93, p90: 97 },
    monthlyBurn: { p25: 40_000, p50: 80_000, p75: 180_000, p90: 350_000, lowerIsBetter: true },
    nrr: { p25: 95, p50: 108, p75: 125, p90: 145 },
    payingCustomers: { p25: 10, p50: 40, p75: 150, p90: 500 },
  },
  "b2b_saas:series_a:us": {
    arrGrowth: { p25: 80, p50: 130, p75: 220, p90: 370 },
    arr: { p25: 1_500_000, p50: 3_500_000, p75: 7_000_000, p90: 12_000_000 },
    burnMultiple: { p25: 1, p50: 1.6, p75: 2.5, p90: 4, lowerIsBetter: true },
    cacPayback: { p25: 12, p50: 18, p75: 28, p90: 44, lowerIsBetter: true },
    cashOnHand: { p25: 5_000_000, p50: 12_000_000, p75: 25_000_000, p90: 50_000_000 },
    headcount: { p25: 20, p50: 40, p75: 75, p90: 140 },
    grossMargin: { p25: 65, p50: 76, p75: 83, p90: 88 },
    logoRetention: { p25: 85, p50: 91, p75: 95, p90: 98 },
    monthlyBurn: { p25: 200_000, p50: 450_000, p75: 900_000, p90: 1_800_000, lowerIsBetter: true },
    nrr: { p25: 100, p50: 115, p75: 130, p90: 150 },
    payingCustomers: { p25: 40, p50: 150, p75: 500, p90: 2000 },
  },
  "dev_tools:series_a:us": {
    arrGrowth: { p25: 110, p50: 180, p75: 290, p90: 450 },
    arr: { p25: 1_200_000, p50: 2_800_000, p75: 5_500_000, p90: 10_000_000 },
    headcount: { p25: 18, p50: 35, p75: 65, p90: 120 },
    grossMargin: { p25: 70, p50: 80, p75: 87, p90: 91 },
    logoRetention: { p25: 82, p50: 89, p75: 94, p90: 98 },
    nrr: { p25: 115, p50: 130, p75: 150, p90: 180 },
    payingCustomers: { p25: 100, p50: 400, p75: 1500, p90: 5000 },
  },
};

export function isBenchmarkCohortId(value: string): value is BenchmarkCohortId {
  return value in COHORT_METRICS;
}

export function loadBenchmarkCohortId(): BenchmarkCohortId {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && isBenchmarkCohortId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_BENCHMARK_COHORT_ID;
}

export function saveBenchmarkCohortId(id: BenchmarkCohortId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

const METRIC_KEY_ALIASES: Record<string, BenchmarkMetricKey> = {
  paidCustomers: "payingCustomers",
};

export function resolveBenchmarkMetricKey(key: string): BenchmarkMetricKey | null {
  const normalized = (METRIC_KEY_ALIASES[key] ?? key) as BenchmarkMetricKey;
  for (const bucket of Object.values(COHORT_METRICS)) {
    if (bucket[normalized]) return normalized;
  }
  return null;
}

export function getCohortMetricPeer(
  cohortId: BenchmarkCohortId,
  key: string,
): CohortMetricPeer | undefined {
  const metricKey = resolveBenchmarkMetricKey(key);
  if (!metricKey) return undefined;
  return COHORT_METRICS[cohortId]?.[metricKey];
}

/** Apply Super Admin cohort percentiles + standard P25–P90 green band to a wizard field template. */
export function applyCohortPeersToField<T extends {
  key: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  bandStart: number;
  bandEnd: number;
  lowerIsBetter?: boolean;
}>(field: T, cohortId: BenchmarkCohortId): T | null {
  const peer = getCohortMetricPeer(cohortId, field.key);
  if (!peer) return null;
  return {
    ...field,
    p25: peer.p25,
    p50: peer.p50,
    p75: peer.p75,
    p90: peer.p90,
    bandStart: BENCHMARK_PEER_BAND.bandStart,
    bandEnd: BENCHMARK_PEER_BAND.bandEnd,
    lowerIsBetter: peer.lowerIsBetter ?? field.lowerIsBetter,
  };
}

export function getCohortMetricKeys(cohortId: BenchmarkCohortId): BenchmarkMetricKey[] {
  const bucket = COHORT_METRICS[cohortId];
  if (!bucket) return [];
  return Object.keys(bucket) as BenchmarkMetricKey[];
}

export function cohortOptionLabel(cohortId: BenchmarkCohortId): string {
  return BENCHMARK_COHORT_OPTIONS.find(o => o.value === cohortId)?.label ?? cohortId;
}
