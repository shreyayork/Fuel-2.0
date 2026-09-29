// Pure constants + label helpers for service-provider categories/visibility.
// This file intentionally has no `server-only` guard so client components
// (ServiceProviderDirectory, ServiceProviderAdminView) can import it.

export const SERVICE_PROVIDER_CATEGORIES = [
  "legal",
  "accounting",
  "banking",
  "debt",
  "cap_table",
  "payroll",
  "benefits",
  "cloud",
  "data_infra",
  "ai_platform",
  "crm",
  "marketing",
  "recruiting",
  "insurance",
  "other",
] as const;

export const SERVICE_PROVIDER_VISIBILITIES = ["global", "internal"] as const;

export type ServiceProviderCategory = (typeof SERVICE_PROVIDER_CATEGORIES)[number];
export type ServiceProviderVisibility = (typeof SERVICE_PROVIDER_VISIBILITIES)[number];

const CATEGORY_LABELS: Record<ServiceProviderCategory, string> = {
  legal: "Legal",
  accounting: "Accounting",
  banking: "Banking",
  debt: "Debt",
  cap_table: "Cap table",
  payroll: "Payroll",
  benefits: "Benefits",
  cloud: "Cloud",
  data_infra: "Data infra",
  ai_platform: "AI platform",
  crm: "CRM",
  marketing: "Marketing",
  recruiting: "Recruiting",
  insurance: "Insurance",
  other: "Other",
};

/** Stable, readable label for a category enum value. */
export function categoryLabel(cat: ServiceProviderCategory): string {
  return CATEGORY_LABELS[cat];
}
