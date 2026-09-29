import type { PortfolioUpdateFieldId } from "@/lib/playbooks/guided";

/** User-entered benchmark numbers during onboarding chat. Maps 1:1 to portfolio_updates columns. */
export interface OnboardBenchmarkInputs {
  arrUsd: number | null;
  arrGrowthYoyPct: number | null;
  nrrPct: number | null;
  logoRetentionPct: number | null;
  monthlyBurnUsd: number | null;
  cashOnHandUsd: number | null;
  grossMarginPct: number | null;
  fteCount: number | null;
  paidCustomerCount: number | null;
  notableCustomers: string | null;
  challenges: string | null;
}

export function emptyBenchmarkInputs(): OnboardBenchmarkInputs {
  return {
    arrUsd: null,
    arrGrowthYoyPct: null,
    nrrPct: null,
    logoRetentionPct: null,
    monthlyBurnUsd: null,
    cashOnHandUsd: null,
    grossMarginPct: null,
    fteCount: null,
    paidCustomerCount: null,
    notableCustomers: null,
    challenges: null,
  };
}

export type BenchmarkFieldKind = "number" | "textarea";

/** Input unit hint shown beside the field label (matches Signals tab private-data form). */
export type BenchmarkFieldUnit = "usd" | "pct" | "count";

export function benchmarkFieldUnitLabel(unit: BenchmarkFieldUnit | undefined): string {
  switch (unit) {
    case "usd":
      return "USD";
    case "pct":
      return "%";
    case "count":
      return "";
    default:
      return "";
  }
}

export interface BenchmarkFormField {
  id: keyof OnboardBenchmarkInputs;
  label: string;
  placeholder: string;
  info: string;
  kind: BenchmarkFieldKind;
  /** Shown muted next to the label — e.g. "%" for retention metrics. */
  unit?: BenchmarkFieldUnit;
}

export interface BenchmarkFormGroup {
  title: string;
  fields: BenchmarkFormField[];
}

export const ONBOARD_BENCHMARK_GROUPS: BenchmarkFormGroup[] = [
  {
    title: "Revenue + Retention",
    fields: [
      {
        id: "arrUsd",
        label: "ARR (annualized)",
        placeholder: "500000",
        info: "Annual recurring revenue in dollars.",
        kind: "number",
        unit: "usd",
      },
      {
        id: "arrGrowthYoyPct",
        label: "ARR growth, YoY",
        placeholder: "200",
        info: "Year-over-year ARR growth percentage. Enter 200 for 200%.",
        kind: "number",
        unit: "pct",
      },
      {
        id: "nrrPct",
        label: "Net revenue retention",
        placeholder: "108",
        info: "Revenue retained and expanded from existing customers. Enter as a percentage.",
        kind: "number",
        unit: "pct",
      },
      {
        id: "logoRetentionPct",
        label: "Logo retention (annual)",
        placeholder: "88",
        info: "Percent of customers retained over the last year.",
        kind: "number",
        unit: "pct",
      },
    ],
  },
  {
    title: "Capital Efficiency",
    fields: [
      {
        id: "monthlyBurnUsd",
        label: "Monthly burn (net)",
        placeholder: "80000",
        info: "Average net cash burn per month in dollars.",
        kind: "number",
        unit: "usd",
      },
      {
        id: "cashOnHandUsd",
        label: "Cash on hand",
        placeholder: "1500000",
        info: "Current cash balance in dollars.",
        kind: "number",
        unit: "usd",
      },
      {
        id: "grossMarginPct",
        label: "Gross margin",
        placeholder: "72",
        info: "Gross margin percentage. Enter 72 for 72%.",
        kind: "number",
        unit: "pct",
      },
    ],
  },
  {
    title: "Team + Customers",
    fields: [
      {
        id: "fteCount",
        label: "Headcount (FTEs)",
        placeholder: "12",
        info: "Total full-time equivalent team members.",
        kind: "number",
      },
      {
        id: "paidCustomerCount",
        label: "Paying customers",
        placeholder: "40",
        info: "Current number of paying customer accounts or logos.",
        kind: "number",
      },
    ],
  },
  {
    title: "Anything worth flagging?",
    fields: [
      {
        id: "notableCustomers",
        label: "Notable customers",
        placeholder: "Customer names or segments",
        info: "Important customers, segments, logos, or customer concentration notes.",
        kind: "textarea",
      },
      {
        id: "challenges",
        label: "Current challenges",
        placeholder: "What should Fuel watch?",
        info: "Known risks, blockers, or operating challenges to include in signal generation.",
        kind: "textarea",
      },
    ],
  },
];

/** portfolio_updates column → benchmark_cohorts.metric */
export const PORTFOLIO_FIELD_TO_COHORT_METRIC: Partial<
  Record<keyof OnboardBenchmarkInputs, string>
> = {
  arrUsd: "arr_usd",
  arrGrowthYoyPct: "arr_growth_yoy_pct",
  nrrPct: "nrr_pct",
  logoRetentionPct: "logo_retention_pct",
  monthlyBurnUsd: "monthly_burn_usd",
  cashOnHandUsd: "cash_on_hand_usd",
  grossMarginPct: "gross_margin_pct",
  fteCount: "fte_count",
  paidCustomerCount: "paid_customer_count",
};

export type KpiArea = "gtm" | "rd" | "ga";

export const KPI_METRIC_AREAS: Record<
  string,
  { area: KpiArea; label: string; sub: string }
> = {
  arr_usd: { area: "gtm", label: "ARR", sub: "Revenue + retention" },
  arr_growth_yoy_pct: { area: "gtm", label: "ARR growth, YoY", sub: "Revenue + retention" },
  nrr_pct: { area: "gtm", label: "Net revenue retention", sub: "Revenue + retention" },
  logo_retention_pct: { area: "gtm", label: "Logo retention", sub: "Revenue + retention" },
  paid_customer_count: { area: "gtm", label: "Paying customers", sub: "Revenue + retention" },
  cac_payback_months: { area: "gtm", label: "CAC payback", sub: "Revenue + retention" },
  fte_count: { area: "rd", label: "Headcount", sub: "Engineering + product" },
  cash_on_hand_usd: { area: "ga", label: "Cash on hand", sub: "Capital + efficiency" },
  monthly_burn_usd: { area: "ga", label: "Monthly burn", sub: "Capital + efficiency" },
  gross_margin_pct: { area: "ga", label: "Gross margin", sub: "Capital + efficiency" },
  burn_multiple: { area: "ga", label: "Burn multiple", sub: "Capital + efficiency" },
};

export const KPI_AREA_LABELS: Record<KpiArea, string> = {
  gtm: "GTM",
  rd: "R&D",
  ga: "G&A",
};

export type JourneyStageId =
  | "idea"
  | "pre_product"
  | "pre_revenue"
  | "early_revenue"
  | "pmf"
  | "scaling"
  | "market_leader";

export const JOURNEY_STAGES: Array<{
  id: JourneyStageId;
  stage: string;
  title: string;
  detail: string;
  minFunding: number | null;
}> = [
  { id: "idea", stage: "Stage 1", title: "Idea", detail: "Problem identified", minFunding: 0 },
  { id: "pre_product", stage: "Stage 2", title: "Pre-Product", detail: "Building MVP", minFunding: 0 },
  { id: "pre_revenue", stage: "Stage 3", title: "Pre-Revenue", detail: "MVP live · first users", minFunding: 250_000 },
  { id: "early_revenue", stage: "Stage 4", title: "Early Revenue", detail: "Paying customers", minFunding: 1_500_000 },
  { id: "pmf", stage: "Stage 5", title: "Product-Market Fit", detail: "Repeatable growth", minFunding: 8_000_000 },
  { id: "scaling", stage: "Stage 6", title: "Scaling", detail: "Rapid expansion", minFunding: 30_000_000 },
  { id: "market_leader", stage: "Stage 7", title: "Market Leader", detail: "Category dominance", minFunding: 100_000_000 },
];

export function inferJourneyStage(totalFundingUsd: number | null): JourneyStageId {
  const funding = totalFundingUsd ?? 0;
  let best: JourneyStageId = "idea";
  for (const s of JOURNEY_STAGES) {
    if (funding >= (s.minFunding ?? 0)) best = s.id;
  }
  return best;
}

type FormStringState = Record<keyof OnboardBenchmarkInputs, string>;

/** Parse "500", "500+", or "1,200" into a plain integer string for count inputs. */
export function normalizeCountFormString(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const t = raw.trim().replace(/,/g, "");
  const m = /^(\d+(?:\.\d+)?)\+?$/.exec(t);
  if (!m) return "";
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0) return "";
  return String(Math.round(n));
}

/** Parse "$2.4M", "$240K", or "240000" into a plain integer string for number inputs. */
export function normalizeUsdFormString(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const t = raw.trim();
  const plain = t.replace(/,/g, "");
  if (/^\d+(\.\d+)?$/.test(plain)) {
    const n = Number(plain);
    if (Number.isFinite(n) && n >= 0) return String(Math.round(n));
  }
  const clean = plain.replace(/[$\s]/g, "").toUpperCase();
  const m = /^([\d.]+)([KMB])?$/.exec(clean);
  if (!m) return "";
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return "";
  const mult =
    m[2] === "K"
      ? 1_000
      : m[2] === "M"
        ? 1_000_000
        : m[2] === "B"
          ? 1_000_000_000
          : 1;
  return String(Math.round(n * mult));
}

const USD_BENCHMARK_FIELDS = new Set<keyof OnboardBenchmarkInputs>([
  "arrUsd",
  "monthlyBurnUsd",
  "cashOnHandUsd",
]);

export function benchmarkInputsToFormStrings(
  inputs: OnboardBenchmarkInputs | null,
): FormStringState {
  const base = emptyBenchmarkInputs();
  const merged = inputs ?? base;
  const out = {} as FormStringState;
  for (const key of Object.keys(base) as Array<keyof OnboardBenchmarkInputs>) {
    const v = merged[key];
    if (v == null) out[key] = "";
    else out[key] = String(v);
  }
  return out;
}

/** Caps freeform metric fields (covers `$1,000,000,000` / `999.99%` / `2.4M`). */
export const BENCHMARK_NUMERIC_INPUT_MAX_LENGTH = 20;

/**
 * Filter keystrokes/paste for benchmark metric fields.
 * Allows drafts that `parseVal` / USD-KMB helpers understand (`$`, `1,`, `2.4M`, `85%`).
 * Returns null when the change should be rejected.
 */
export function sanitizeBenchmarkNumericInput(raw: string): string | null {
  if (raw === "") return "";
  const clipped =
    raw.length > BENCHMARK_NUMERIC_INPUT_MAX_LENGTH
      ? raw.slice(0, BENCHMARK_NUMERIC_INPUT_MAX_LENGTH)
      : raw;
  if (/^-/.test(clipped.trim()) || /[eE]/.test(clipped)) return null;
  // Currency prefix, digits, commas, one decimal, optional K/M/B/% suffix.
  if (!/^\$?\s*[\d,]*(?:\.\d*)?\s*[KkMmBb%]?$/.test(clipped)) return null;
  const forNumber = clipped
    .trim()
    .replace(/^\$/, "")
    .replace(/[,%\s]/g, "")
    .replace(/[KkMmBb]$/, "");
  if (forNumber !== "" && forNumber !== ".") {
    const n = Number(forNumber);
    if (!Number.isFinite(n) || n < 0) return null;
  }
  return clipped;
}

const COUNT_BENCHMARK_FIELDS = new Set<keyof OnboardBenchmarkInputs>([
  "fteCount",
  "paidCustomerCount",
]);

export function parseBenchmarkForm(values: FormStringState): OnboardBenchmarkInputs {
  const parseNum = (
    raw: string,
    field?: keyof OnboardBenchmarkInputs,
  ): number | null => {
    const t = raw.trim();
    if (!t) return null;
    let normalized = t;
    if (field && USD_BENCHMARK_FIELDS.has(field)) {
      normalized = normalizeUsdFormString(t);
    } else if (field && COUNT_BENCHMARK_FIELDS.has(field)) {
      normalized = normalizeCountFormString(t);
    }
    if (!normalized) return null;
    const n = Number(normalized);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };
  const parseText = (raw: string): string | null => {
    const t = raw.trim();
    return t || null;
  };
  return {
    arrUsd: parseNum(values.arrUsd, "arrUsd"),
    arrGrowthYoyPct: parseNum(values.arrGrowthYoyPct),
    nrrPct: parseNum(values.nrrPct),
    logoRetentionPct: parseNum(values.logoRetentionPct),
    monthlyBurnUsd: parseNum(values.monthlyBurnUsd, "monthlyBurnUsd"),
    cashOnHandUsd: parseNum(values.cashOnHandUsd, "cashOnHandUsd"),
    grossMarginPct: parseNum(values.grossMarginPct),
    fteCount: parseNum(values.fteCount),
    paidCustomerCount: parseNum(values.paidCustomerCount),
    notableCustomers: parseText(values.notableCustomers),
    challenges: parseText(values.challenges),
  };
}

export function hasAnyBenchmarkInput(
  inputs: OnboardBenchmarkInputs | Record<string, unknown> | null | undefined,
): boolean {
  if (!inputs) return false;
  return Object.values(inputs).some((v) => v != null && v !== "");
}

/**
 * Keep only benchmark fields the user actually edited in the onboarding form.
 * AI hint pre-fills are shown in the UI but must not count as a submission
 * unless the founder touched that field.
 */
export function extractUserEnteredBenchmarkInputs(
  formValues: Record<keyof OnboardBenchmarkInputs, string>,
  userTouchedFields: ReadonlySet<keyof OnboardBenchmarkInputs>,
): OnboardBenchmarkInputs | null {
  const parsed = parseBenchmarkForm(formValues);
  const out = emptyBenchmarkInputs();
  let any = false;

  for (const key of Object.keys(out) as Array<keyof OnboardBenchmarkInputs>) {
    if (!userTouchedFields.has(key)) continue;
    const v = parsed[key];
    if (v != null && v !== "") any = true;
    if (key === "notableCustomers" || key === "challenges") {
      out[key] = v as string | null;
    } else {
      out[key] = v as number | null;
    }
  }

  return any ? out : null;
}

/** Keys that map to portfolio_updates numeric columns (for claim API). */
export const ONBOARD_METRIC_FIELD_IDS = [
  "arrUsd",
  "arrGrowthYoyPct",
  "nrrPct",
  "logoRetentionPct",
  "monthlyBurnUsd",
  "cashOnHandUsd",
  "grossMarginPct",
  "fteCount",
  "paidCustomerCount",
  "notableCustomers",
  "challenges",
] as const satisfies ReadonlyArray<PortfolioUpdateFieldId>;
