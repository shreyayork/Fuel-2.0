export const CREDIT_CATALOG_FLOWS = ["founder", "investor"] as const;

export type CreditCatalogFlow = (typeof CREDIT_CATALOG_FLOWS)[number];

export function isCreditCatalogFlow(value: string): value is CreditCatalogFlow {
  return (CREDIT_CATALOG_FLOWS as readonly string[]).includes(value);
}

/** Unknown or legacy values stay on the Founder catalog. */
export function parseCreditCatalogFlow(value: string | null | undefined): CreditCatalogFlow {
  if (value && isCreditCatalogFlow(value)) return value;
  return "founder";
}
