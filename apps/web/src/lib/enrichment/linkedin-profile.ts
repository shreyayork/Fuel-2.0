import "server-only";
import { brightDataScrape } from "./brightdata";
import { cachedFetch } from "./cache";
import { normalizeLinkedInProfileUrl, normalizeLinkedInCompanyUrl } from "./urls";

export interface LinkedInProfileResult {
  url: string;
  cached: boolean;
  data: Record<string, unknown> | null;
  error?: string;
}

/**
 * Fetch a LinkedIn personal profile via Bright Data (dataset: linkedin_profile).
 * Used for advisor/people enrichment — NOT for company pages.
 */
export async function fetchLinkedInProfile(linkedinUrl: string): Promise<LinkedInProfileResult> {
  const url = normalizeLinkedInProfileUrl(linkedinUrl);
  const result = await cachedFetch({
    source: "brightdata:linkedin_profile",
    subjectKey: url,
    ttlSeconds: 7 * 24 * 3600,
    costTokens: 5_000,
    fetcher: () => brightDataScrape({ kind: "linkedin_profile", url }),
  });
  return {
    url,
    cached: result.cached,
    data: (result.data as Record<string, unknown>) ?? null,
    error: result.error,
  };
}

export interface LinkedInCompanyResult {
  url: string;
  cached: boolean;
  data: Record<string, unknown> | null;
  error?: string;
}

/**
 * Fetch a LinkedIn company page via Bright Data (dataset: linkedin_company).
 * Used in the enrichment pipeline to fill industry, description, employee count,
 * headquarters, founded year, and company overview from LinkedIn.
 * Cached for 7 days so repeat onboardings / catalog runs are free.
 */
export async function fetchLinkedInCompany(
  linkedinUrl: string,
  opts?: { captureFailure?: boolean },
): Promise<LinkedInCompanyResult> {
  const url = normalizeLinkedInCompanyUrl(linkedinUrl);
  const result = await cachedFetch({
    source: "brightdata:linkedin_company",
    subjectKey: url,
    ttlSeconds: 7 * 24 * 3600,
    costTokens: 5_000,
    captureFailure: opts?.captureFailure,
    fetcher: () => brightDataScrape({ kind: "linkedin_company", url }),
  });
  return {
    url,
    cached: result.cached,
    data: (result.data as Record<string, unknown>) ?? null,
    error: result.error,
  };
}
