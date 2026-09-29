import "server-only";
import { companyLogoUrl } from "@/lib/company-logo";
import type { CompanyHit } from "@/lib/fuel-data";

export { companyLogoUrl } from "@/lib/company-logo";

/** Stable public DTO — no OpenSearch field names. */
export type PublicCompanySearchItem = {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  logoUrl: string;
  categories: string[];
  location: {
    city?: string;
    state?: string;
    country?: string;
  };
  employeeCount?: string;
  foundedOn?: string;
  totalFundingUsd?: number;
};

export type PublicCompanySearchResponse = {
  data: PublicCompanySearchItem[];
  meta: {
    q: string;
    limit: number;
    /** Present in offset mode only. */
    offset?: number;
    count: number;
    /**
     * Present in cursor mode when another page may exist.
     * Opaque — pass as `cursor` on the next request. Omitted on the final page.
     */
    nextCursor?: string;
  };
};

export function toPublicCompanySearchItem(hit: CompanyHit): PublicCompanySearchItem {
  return {
    id: hit.uuid,
    name: hit.name,
    domain: hit.domain,
    description: hit.shortDescription,
    logoUrl: companyLogoUrl(hit.uuid, hit.logoUrl),
    categories: hit.categories ?? [],
    location: {
      city: hit.locationCity,
      state: hit.locationState,
      country: hit.locationCountry,
    },
    employeeCount: hit.employeeCount,
    foundedOn: hit.foundedOn,
    totalFundingUsd: hit.totalFundingUsd,
  };
}

export function toPublicCompanySearchResponse(
  hits: CompanyHit[],
  meta: {
    q: string;
    limit: number;
    offset?: number;
    nextCursor?: string;
  },
): PublicCompanySearchResponse {
  const data = hits.map(toPublicCompanySearchItem);
  const out: PublicCompanySearchResponse = {
    data,
    meta: {
      q: meta.q,
      limit: meta.limit,
      count: data.length,
    },
  };
  if (meta.offset !== undefined) {
    out.meta.offset = meta.offset;
  }
  if (meta.nextCursor) {
    out.meta.nextCursor = meta.nextCursor;
  }
  return out;
}
