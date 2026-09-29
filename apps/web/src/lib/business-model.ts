/**
 * Business-model taxonomy + helpers. Drives which KPI fields show in the
 * guided wizard, how `estimateCompanyKpis` is prompted, and (eventually)
 * how cohort comparisons get scoped.
 *
 * Pure module — safe to import from server *and* client code.
 */

export const BUSINESS_MODELS = [
  "saas",
  "operating_services",
  "investment_firm",
  "operating_and_investment",
  "other",
] as const;

export type BusinessModel = (typeof BUSINESS_MODELS)[number];

export function isBusinessModel(v: unknown): v is BusinessModel {
  return typeof v === "string" && (BUSINESS_MODELS as readonly string[]).includes(v);
}

export function normalizeBusinessModel(v: unknown): BusinessModel | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase().replace(/[-\s]/g, "_");
  if (isBusinessModel(s)) return s;
  // Friendly synonyms — only used when reading from LLM output or legacy data.
  if (s === "venture" || s === "vc" || s === "investment" || s === "investment_firm") return "investment_firm";
  if (s === "services" || s === "consultancy" || s === "agency" || s === "services_or_agency") return "operating_services";
  if (s === "hybrid" || s === "operating_+_investment" || s === "operating_+_investment_firm") return "investment_firm";
  if (s === "product" || s === "product_company") return "saas";
  if (s === "b2b_saas" || s === "software") return "saas";
  return null;
}

export const BUSINESS_MODEL_LABELS: Record<BusinessModel, string> = {
  saas: "SaaS / Software product",
  operating_services: "Services / Consultancy",
  investment_firm: "Investment firm",
  operating_and_investment: "Operating + investment firm",
  other: "Other",
};

export const BUSINESS_MODEL_DESCRIPTIONS: Record<BusinessModel, string> = {
  saas: "Recurring software revenue with ARR, NRR, customer logos.",
  operating_services: "Hands-on services, agencies, consultancies — revenue per engagement.",
  investment_firm: "Fund or holding company — AUM, portfolio companies, returns.",
  operating_and_investment:
    "Both operating revenue (product + services) and a portfolio / investments.",
  other: "Doesn't fit the above — we'll just collect what you track.",
};

/**
 * The fields in the KPI Benchmark playbook that only make sense for B2B
 * SaaS companies. For non-SaaS models we hide / soft-disable these and
 * show a note instead.
 */
export const SAAS_ONLY_FIELDS = new Set<string>([
  "arrUsd",
  "arrGrowthYoyPct",
  "nrrPct",
  "logoRetentionPct",
  "paidCustomerCount",
]);

/**
 * Returns whether a given `portfolio_updates` field id should render as
 * an active form field for the given business model. Non-SaaS models
 * have SaaS-specific fields filtered out — they can still see them on
 * the review screen (skipped), but not collect inputs for them.
 *
 * Null `model` falls back to SaaS — the historical default, preserves
 * behavior for catalog rows that predate this column.
 */
export function isFieldApplicable(
  fieldId: string,
  model: BusinessModel | null,
): boolean {
  if (model == null || model === "saas") return true;
  if (model === "operating_and_investment") {
    // Hybrid firms — the operating side *might* have ARR / retention,
    // but plenty don't. Keep the fields visible so the user can fill
    // them in if they apply; downgrade their `required` flag via
    // `isFieldRequired` so the wizard doesn't block submission.
    return true;
  }
  return !SAAS_ONLY_FIELDS.has(fieldId);
}

/**
 * Returns the effective `required` flag for a field given the user's
 * business model. The playbook seed marks SaaS-specific fields as
 * required (because SaaS is the default), but for hybrid firms
 * (`operating_and_investment`) these should be optional — the user can
 * skip them without being blocked on the Next button. Non-SaaS-specific
 * required fields (headcount, burn, cash) stay required.
 */
export function isFieldRequired(
  fieldId: string,
  defaultRequired: boolean,
  model: BusinessModel | null,
): boolean {
  if (!defaultRequired) return false;
  if (model == null || model === "saas") return defaultRequired;
  if (SAAS_ONLY_FIELDS.has(fieldId)) return false;
  return defaultRequired;
}
