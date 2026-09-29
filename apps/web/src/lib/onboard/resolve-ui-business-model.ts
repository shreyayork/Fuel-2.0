import type { BusinessModel } from "@/lib/business-model";

/** Visible org-type cards on the onboarding profile step. */
export const ONBOARD_UI_BUSINESS_MODEL_LABELS = [
  "Product",
  "Investment",
] as const;

export type OnboardUiBusinessModelLabel =
  (typeof ONBOARD_UI_BUSINESS_MODEL_LABELS)[number];

/** Org-type labels that take the short investor onboarding path. */
export const INVESTOR_PATH_MODELS: readonly OnboardUiBusinessModelLabel[] = [
  "Investment",
];

export type OnboardPathKind = "operating" | "short";

/**
 * Legacy catalog / saved labels → visible Product | Investment cards.
 * Former Services variants remap to Product (no Services card in onboarding).
 */
const LEGACY_BUSINESS_MODELS: Record<string, OnboardUiBusinessModelLabel> = {
  "Software / SaaS": "Product",
  "SaaS / Software product": "Product",
  "Product company": "Product",
  Product: "Product",
  "Venture / PE fund": "Investment",
  "Investment firm": "Investment",
  "Operating + investment firm": "Investment",
  Investment: "Investment",
  Agency: "Product",
  Consultancy: "Product",
  "Services or agency": "Product",
  "Services or Agency": "Product",
  "Services / Consultancy": "Product",
  "Services / Agency": "Product",
  "Advisory / Consultancy": "Product",
  Other: "Product",
};

const SERVICES_PREFILL_MODELS = new Set<BusinessModel>(["operating_services"]);

const INVESTOR_PREFILL_MODELS = new Set<BusinessModel>([
  "investment_firm",
  "operating_and_investment",
]);

export function isOnboardUiBusinessModelLabel(
  label: string,
): label is OnboardUiBusinessModelLabel {
  return (ONBOARD_UI_BUSINESS_MODEL_LABELS as readonly string[]).includes(
    label,
  );
}

export function isInvestorUiBusinessModel(label: string): boolean {
  return (INVESTOR_PATH_MODELS as readonly string[]).includes(label);
}

export function onboardPathKind(businessModel: string): OnboardPathKind {
  return isInvestorUiBusinessModel(businessModel) ? "short" : "operating";
}

/**
 * Defensive clamp: empty stays empty (no preselection). Any unknown /
 * unmapped non-empty value becomes Product so a visible card is selected.
 */
export function ensureVisibleUiBusinessModel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "";
  if (isOnboardUiBusinessModelLabel(trimmed)) return trimmed;
  const mapped = LEGACY_BUSINESS_MODELS[trimmed];
  if (mapped) return mapped;
  return "Product";
}

/** Map a catalog / saved UI label onto Product or Investment. */
export function normalizeUiBusinessModel(label: string): string {
  return ensureVisibleUiBusinessModel(label);
}

/**
 * Map extract taxonomy → onboarding UI label.
 * `operating_services` defaults to Product — no separate investor signal is
 * available on the prefill model enum alone (see resolveUiBusinessModel for
 * the catalog Investment override).
 */
export function prefillModelToUiLabel(model: BusinessModel): string {
  if (INVESTOR_PREFILL_MODELS.has(model)) return "Investment";
  return "Product";
}

/**
 * Earliest common remap for scrape / catalog / saved-profile into onboarding
 * state. Never returns Services. Empty inputs stay empty (no preselection).
 *
 * Investor signal when remapping Services: catalog/record label already
 * resolves to Investment, or extract model is investment_firm /
 * operating_and_investment. Lone `operating_services` → Product.
 */
export function resolveUiBusinessModel(opts: {
  prefillModel?: BusinessModel | null;
  recordLabel?: string;
}): string {
  const recordMapped = opts.recordLabel?.trim()
    ? normalizeUiBusinessModel(opts.recordLabel)
    : "";
  const recordIsInvestor = recordMapped === "Investment";

  if (opts.prefillModel) {
    if (SERVICES_PREFILL_MODELS.has(opts.prefillModel)) {
      return recordIsInvestor ? "Investment" : "Product";
    }
    return prefillModelToUiLabel(opts.prefillModel);
  }

  if (recordMapped) return recordMapped;
  return "";
}
