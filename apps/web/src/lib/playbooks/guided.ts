/**
 * Shared types + helpers for guided-mode playbook step schemas (admin
 * upsert validation, seed data) and portfolio-update field ids shared
 * with onboarding benchmark forms.
 *
 * KPI Benchmark numbers now enter via Overview `BenchmarkEditDrawer`
 * (also opened from the playbook detail CTA), not a full-page wizard.
 */

export type GuidedFieldKind =
  | "number"
  | "text"
  | "textarea"
  | "select"
  | "currency"
  | "percent";

export type GuidedFieldUnit = "usd" | "pct" | "x" | "months" | "count";

export interface GuidedField {
  /** Stable id. For KPI fields, matches a `portfolio_updates` column name. */
  id: string;
  label: string;
  kind: GuidedFieldKind;
  unit?: GuidedFieldUnit;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}

export interface GuidedStep {
  /** Unique within the playbook. */
  id: string;
  label: string;
  /** Optional one-line context shown above the form. */
  help?: string;
  fields: GuidedField[];
}

/**
 * Per-field state captured in the wizard. The server action validates
 * that every required field has `confirmation !== "untouched"` before
 * accepting a submit.
 */
export type FieldConfirmation =
  /** AI estimate still showing as a suggestion — user hasn't engaged. */
  | "untouched"
  /** User clicked "looks right" or otherwise indicated acceptance. */
  | "accepted"
  /** User typed a value different from the estimate. */
  | "edited"
  /** Optional field that was deliberately left blank. */
  | "skipped";

export interface GuidedFieldState {
  value: string | number | null;
  /** Original AI estimate so the review step can show what was suggested. */
  estimateValue: string | number | null;
  confirmation: FieldConfirmation;
  /** Short attribution label, e.g. "AI estimate from public funding". */
  estimateSource?: string;
}

/**
 * Snapshot the wizard ships on save / submit. Per-step fields keyed by
 * field id. Order is implied by the playbook's `steps` array.
 */
export interface GuidedWizardState {
  values: Record<string, GuidedFieldState>;
}

/**
 * Safe-parse helper for the `playbooks.steps` column. Returns null when
 * the row isn't a guided playbook or the schema is malformed.
 */
export function parseGuidedSteps(raw: unknown): GuidedStep[] | null {
  if (!Array.isArray(raw)) return null;
  const steps: GuidedStep[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const obj = r as Record<string, unknown>;
    if (typeof obj.id !== "string" || typeof obj.label !== "string") return null;
    if (!Array.isArray(obj.fields)) return null;
    const fields: GuidedField[] = [];
    for (const f of obj.fields) {
      if (!f || typeof f !== "object") return null;
      const fo = f as Record<string, unknown>;
      if (typeof fo.id !== "string" || typeof fo.label !== "string") return null;
      if (typeof fo.kind !== "string") return null;
      fields.push({
        id: fo.id,
        label: fo.label,
        kind: fo.kind as GuidedFieldKind,
        unit: fo.unit as GuidedFieldUnit | undefined,
        options: Array.isArray(fo.options)
          ? (fo.options as Array<{ value: string; label: string }>)
          : undefined,
        placeholder:
          typeof fo.placeholder === "string" ? fo.placeholder : undefined,
        required: fo.required === true,
      });
    }
    steps.push({
      id: obj.id,
      label: obj.label,
      help: typeof obj.help === "string" ? obj.help : undefined,
      fields,
    });
  }
  return steps;
}

/**
 * Crude funding-band → KPI estimate heuristic. Used as the first-pass
 * pre-fill when the founder has never submitted a real benchmark. The
 * point is to give them something visible to react to (correct or
 * accept) rather than a blank form — but every value is tagged
 * "AI estimate" and they have to touch the field to verify it.
 *
 * Numbers are intentionally conservative round figures. They're a
 * starting point, not a forecast.
 */
export function estimateKpiFromFunding(
  totalFundingUsd: number | null,
): Record<string, number> {
  // Band breakpoints mirror the StageJourney heuristic on the dashboard,
  // so the prefill numbers line up with the "Currently at <stage>" guess.
  if (!totalFundingUsd || totalFundingUsd <= 0) {
    return { arrUsd: 0, arrGrowthYoyPct: 0, nrrPct: 100, monthlyBurnUsd: 25_000, cashOnHandUsd: 250_000, grossMarginPct: 70, fteCount: 3, paidCustomerCount: 0 };
  }
  if (totalFundingUsd < 1_500_000) {
    return { arrUsd: 100_000, arrGrowthYoyPct: 200, nrrPct: 100, monthlyBurnUsd: 60_000, cashOnHandUsd: 1_000_000, grossMarginPct: 72, fteCount: 6, paidCustomerCount: 10 };
  }
  if (totalFundingUsd < 8_000_000) {
    return { arrUsd: 1_500_000, arrGrowthYoyPct: 140, nrrPct: 108, monthlyBurnUsd: 250_000, cashOnHandUsd: 3_500_000, grossMarginPct: 74, fteCount: 18, paidCustomerCount: 60 };
  }
  if (totalFundingUsd < 30_000_000) {
    return { arrUsd: 6_000_000, arrGrowthYoyPct: 100, nrrPct: 115, monthlyBurnUsd: 700_000, cashOnHandUsd: 12_000_000, grossMarginPct: 76, fteCount: 50, paidCustomerCount: 200 };
  }
  if (totalFundingUsd < 100_000_000) {
    return { arrUsd: 25_000_000, arrGrowthYoyPct: 80, nrrPct: 120, monthlyBurnUsd: 2_000_000, cashOnHandUsd: 35_000_000, grossMarginPct: 78, fteCount: 150, paidCustomerCount: 800 };
  }
  return { arrUsd: 80_000_000, arrGrowthYoyPct: 60, nrrPct: 122, monthlyBurnUsd: 5_000_000, cashOnHandUsd: 120_000_000, grossMarginPct: 78, fteCount: 400, paidCustomerCount: 3000 };
}

/** Fields whose ids map 1:1 to `portfolio_updates` columns. The submit
 *  server action uses this allow-list to forward values to upsertUpdate. */
export const PORTFOLIO_UPDATE_FIELD_IDS = [
  "fteCount",
  "paidCustomerCount",
  "arrUsd",
  "arrGrowthYoyPct",
  "nrrPct",
  "logoRetentionPct",
  "grossMarginPct",
  "cacPaybackMonths",
  "burnMultiple",
  "ruleOf40Pct",
  "cashOnHandUsd",
  "monthlyBurnUsd",
  "notableCustomers",
  "notableHires",
  "otherUpdates",
  "challenges",
] as const;

export type PortfolioUpdateFieldId = (typeof PORTFOLIO_UPDATE_FIELD_IDS)[number];

export function isPortfolioUpdateFieldId(
  id: string,
): id is PortfolioUpdateFieldId {
  return (PORTFOLIO_UPDATE_FIELD_IDS as readonly string[]).includes(id);
}
