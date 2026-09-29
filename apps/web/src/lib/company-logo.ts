/** York static CDN for fuel-data company marks. */
export const COMPANY_LOGO_CDN = "https://static.york.ie/images/companies";

/** Catalog rows use `cat_` ids — they are not on the fuel-data CDN. */
export function isCatalogCompanyUuid(uuid: string): boolean {
  return uuid.startsWith("cat_");
}

/**
 * Prefer an explicit logo URL. Otherwise use the fuel-data CDN path for
 * OpenSearch company ids. Catalog (`cat_`) ids never get a CDN fallback —
 * that host returns a blank/gray plate for unknown keys.
 */
export function resolveCompanyLogoUrl(
  uuid: string | null | undefined,
  logoUrl?: string | null,
): string | undefined {
  const trimmed = logoUrl?.trim();
  if (trimmed) return trimmed;
  const id = uuid?.trim();
  if (!id || isCatalogCompanyUuid(id)) return undefined;
  return `${COMPANY_LOGO_CDN}/${id}/logo`;
}

/** Public-search helper — always returns a URL (CDN fallback for fuel-data ids). */
export function companyLogoUrl(id: string, logoUrl?: string | null): string {
  return resolveCompanyLogoUrl(id, logoUrl) ?? `${COMPANY_LOGO_CDN}/${id}/logo`;
}
