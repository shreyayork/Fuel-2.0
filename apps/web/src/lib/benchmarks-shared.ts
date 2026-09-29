/**
 * Client-safe benchmark metadata and cohort filter types.
 * Server DB access lives in `@/lib/benchmarks`.
 */

export interface MetricInfo {
  id: string;
  label: string;
  unit: "usd" | "pct" | "x" | "months" | "count";
  /** When true, lower is better. */
  invertedGood?: boolean;
  /** Short description for the explorer. */
  hint?: string;
  /** Functional group — used for grouping in the explorer + update form. */
  group: "scale" | "growth" | "efficiency" | "retention" | "capital";
}

/**
 * Canonical metrics we benchmark. Mirrors York IE's quarterly collection
 * (ARR, NRR, logo retention, cash, burn, growth, FTE, paid customers) plus
 * a few derived ratios (gross margin, CAC payback, burn multiple, rule of
 * 40) that are the durable heuristics for B2B SaaS fit.
 */
export const METRICS: MetricInfo[] = [
  // Scale
  { id: "arr_usd", label: "ARR", unit: "usd", group: "scale", hint: "Annual recurring revenue (USD)." },
  { id: "fte_count", label: "Headcount (FTE)", unit: "count", group: "scale", hint: "Total full-time employees." },
  { id: "paid_customer_count", label: "Paid customers", unit: "count", group: "scale", hint: "Number of paying customer accounts." },
  // Growth
  { id: "arr_growth_yoy_pct", label: "ARR growth (YoY)", unit: "pct", group: "growth", hint: "Year-over-year ARR growth." },
  // Efficiency
  { id: "gross_margin_pct", label: "Gross margin", unit: "pct", group: "efficiency", hint: "Revenue – cost of goods sold, as a percent of revenue." },
  { id: "cac_payback_months", label: "CAC payback", unit: "months", invertedGood: true, group: "efficiency", hint: "Months to recoup customer acquisition cost. Lower is better." },
  { id: "burn_multiple", label: "Burn multiple", unit: "x", invertedGood: true, group: "efficiency", hint: "Net burn ÷ net new ARR. Under 1x is world-class." },
  { id: "rule_of_40_pct", label: "Rule of 40", unit: "pct", group: "efficiency", hint: "ARR growth % + FCF margin %. 40%+ is healthy at scale." },
  // Retention
  { id: "nrr_pct", label: "Net revenue retention", unit: "pct", group: "retention", hint: "ARR from existing cohort 12 months later ÷ prior ARR." },
  { id: "logo_retention_pct", label: "Logo retention", unit: "pct", group: "retention", hint: "Share of customer logos retained over the trailing 12 months." },
  // Capital
  { id: "cash_on_hand_usd", label: "Cash on hand", unit: "usd", group: "capital", hint: "Cash + cash equivalents as of period end." },
  { id: "monthly_burn_usd", label: "Monthly burn", unit: "usd", invertedGood: true, group: "capital", hint: "Net cash burn per month. Compare within stage." },
];

export function getMetricInfo(id: string): MetricInfo | null {
  return METRICS.find((m) => m.id === id) ?? null;
}

/** Map a user value to a 0–100 bar position against cohort p25–p90. Client-safe. */
export function percentilePosition(
  value: number,
  bench: {
    p25: number | null;
    p50: number | null;
    p75: number | null;
    p90: number | null;
    invertedGood?: boolean | null;
  },
): number | null {
  const { p25, p50, p75, p90, invertedGood } = bench;
  if (p25 == null || p50 == null || p75 == null || p90 == null) return null;
  const lo = Math.min(p25, p90);
  const hi = Math.max(p25, p90);
  if (hi === lo) return 50;
  const clamped = Math.max(lo, Math.min(hi, value));
  const linear = ((clamped - lo) / (hi - lo)) * 100;
  return invertedGood ? 100 - linear : linear;
}

/**
 * Onboarding KPI bar marker — extrapolates beyond p25/p90 (like the design
 * prototype) then clamps to 4–96% so outliers remain visible on the bar.
 */
export function onboardMarkerPosition(
  value: number,
  bench: {
    p25: number | null;
    p50: number | null;
    p75: number | null;
    p90: number | null;
    invertedGood?: boolean | null;
  },
): number | null {
  const { p25, p90, invertedGood } = bench;
  if (p25 == null || p90 == null) return null;
  const lo = Math.min(p25, p90);
  const hi = Math.max(p25, p90);
  if (hi === lo) return 50;
  const linear = ((value - lo) / (hi - lo)) * 100;
  const pos = invertedGood ? 100 - linear : linear;
  return Math.max(4, Math.min(96, pos));
}

export interface CohortFilter {
  businessModel?: string | null;
  stage?: string | null;
  vertical?: string | null;
  geo?: string | null;
}

const CONTINENT_NAMES = new Set([
  "north america",
  "south america",
  "europe",
  "asia",
  "africa",
  "oceania",
  "antarctica",
]);

/** Strip Crunchbase-style continent suffixes from a country string. */
export function stripContinentFromCountry(raw: string): string {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const filtered = parts.filter((p) => !CONTINENT_NAMES.has(p.toLowerCase()));
  return (filtered.length ? filtered.join(", ") : raw).trim();
}

/** Map a display country name to the geo segment used in cohort keys. */
export function countryToCohortGeo(country: string | null | undefined): string {
  const normalized = stripContinentFromCountry((country ?? "").trim()).toLowerCase();
  if (!normalized) return "us";
  if (
    normalized === "united states" ||
    normalized === "united states of america" ||
    normalized === "usa" ||
    normalized === "us"
  ) {
    return "us";
  }
  if (normalized === "united kingdom" || normalized === "uk" || normalized === "great britain") {
    return "uk";
  }
  if (normalized === "canada") return "ca";
  if (normalized === "india") return "in";
  if (normalized === "ireland") return "ie";
  return "us";
}

function prettifyCohortSegment(s: string): string {
  if (s === "b2b_saas") return "B2B SaaS";
  if (s === "b2c") return "B2C";
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bB2b\b/g, "B2B")
    .replace(/\bSeries A\b/i, "Series A")
    .replace(/\bSeries B\b/i, "Series B");
}

const COHORT_VERTICALS = new Set(["dev_tools", "fintech", "health"]);

/** Parse a stored cohort key into filter dimensions. */
export function cohortKeyToFilter(cohortKey: string): CohortFilter {
  const [first, stage, geo] = cohortKey.split(":");
  const filter: CohortFilter = {
    stage: stage && stage !== "any" ? stage : null,
    geo: geo && geo !== "any" ? geo : null,
  };
  if (first && first !== "any") {
    if (COHORT_VERTICALS.has(first)) filter.vertical = first;
    else filter.businessModel = first;
  }
  return filter;
}

/** Human label from cohort dimensions — matches the signals page picker. */
export function cohortDimensionsLabel(filter: CohortFilter): string {
  const parts: string[] = [];
  const top = filter.vertical || filter.businessModel;
  if (top) parts.push(prettifyCohortSegment(top));
  if (filter.stage) parts.push(prettifyCohortSegment(filter.stage));
  if (filter.geo) parts.push(filter.geo.toUpperCase());
  return parts.join(" · ");
}

/** Compose the same cohort key format the seeder uses. */
export function cohortKeyFor(f: CohortFilter): string {
  const parts = [
    f.vertical ?? f.businessModel ?? "any",
    f.stage ?? "any",
    f.geo ?? "any",
  ];
  return parts.join(":");
}

/**
 * Heuristic: infer a cohort filter from a CompanyDoc-like object. We don't
 * have real "business model" or "stage" on Neptune companies yet, so we key
 * off category keywords and last-round type when present. Falls back to
 * b2b_saas / seed so the overlay always has *something* to compare against.
 */
export function inferCohortFilterFromCompany(input: {
  categories?: Array<{ name: string }> | string[];
  lastFundingType?: string | null;
  locationCountry?: string | null;
}): CohortFilter {
  const cats: string[] = Array.isArray(input.categories)
    ? (input.categories as Array<{ name?: string } | string>)
        .map((c) => (typeof c === "string" ? c : c?.name ?? ""))
        .filter(Boolean)
    : [];
  const lc = cats.join(" ").toLowerCase();
  let vertical: string | null = null;
  let businessModel = "b2b_saas";
  if (/developer tools|devops|api|infrastructure/.test(lc)) vertical = "dev_tools";
  if (/fintech|finance/.test(lc)) vertical = "fintech";
  if (/health/.test(lc)) vertical = "health";
  if (/consumer|e-?commerce/.test(lc)) businessModel = "b2c";

  let stage: string | null = "seed";
  const t = (input.lastFundingType ?? "").toLowerCase();
  if (/pre.?seed/.test(t)) stage = "pre_seed";
  else if (/seed/.test(t)) stage = "seed";
  else if (/series.?a/.test(t)) stage = "series_a";
  else if (/series.?b|series.?c|growth|private.?equity/.test(t)) stage = "growth";

  const geo = countryToCohortGeo(input.locationCountry);
  return { businessModel, stage, vertical, geo };
}
