import "server-only";
import { unstable_cache } from "next/cache";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { parseEmailDomain } from "@/lib/auth/email-domains";
import type { CompanyHit } from "@/lib/fuel-data";
import { getCompanyFunding, normalizeDomain, searchCompanies } from "@/lib/fuel-data";
import type { CompanyHintBundle } from "@/lib/onboard/map-company-hit";
import {
  companyHitToOnboardOption,
  hintToOnboardOption,
} from "@/lib/onboard/map-company-hit";
import { neptuneRoundsToPickerFunding } from "@/lib/onboard/funding-rounds";
import { resolveCompanyHintWithHit } from "@/lib/onboard/resolve-company-hint";

const HINT_CACHE_SECONDS = 300;

function dedupeCandidates(
  items: ReturnType<typeof companyHitToOnboardOption>[],
): ReturnType<typeof companyHitToOnboardOption>[] {
  const seen = new Set<string>();
  const out: ReturnType<typeof companyHitToOnboardOption>[] = [];
  for (const c of items) {
    const key = c.id || `${c.name}:${c.domain}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function domainMatchesHint(hintDomain: string, hitDomain?: string): boolean {
  if (!hitDomain) return true;
  const a = normalizeDomain(hintDomain);
  const b = normalizeDomain(hitDomain);
  if (!a || !b) return true;
  return a === b;
}

function collectHits(
  hits: CompanyHit[],
  hintDomain: string,
  collected: ReturnType<typeof companyHitToOnboardOption>[],
) {
  for (const hit of hits) {
    if (!domainMatchesHint(hintDomain, hit.domain)) continue;
    collected.push(companyHitToOnboardOption(hit));
  }
}

async function optionFromHitWithFunding(hit: CompanyHit) {
  try {
    const rounds = await getCompanyFunding(hit.uuid, 50);
    return companyHitToOnboardOption(hit, neptuneRoundsToPickerFunding(rounds));
  } catch (e) {
    captureIntegrationException(e, {
      integration: "fuel-data",
      operation: "company_hint_funding",
      level: "warning",
    });
    return companyHitToOnboardOption(hit);
  }
}

/** Domain-scoped company options for onboard picker — hint + fuel-data search. */
export async function resolveCompanyHintBundle(email: string): Promise<CompanyHintBundle> {
  const { hint, exactHit } = await resolveCompanyHintWithHit(email);
  const collected: ReturnType<typeof companyHitToOnboardOption>[] = [];

  if (exactHit) {
    collected.push(await optionFromHitWithFunding(exactHit));
  }

  let candidates = dedupeCandidates(collected);
  const hasExactDomainMatch =
    Boolean(exactHit) &&
    candidates.some(
      (c) =>
        hint.domain &&
        normalizeDomain(c.domain) === normalizeDomain(hint.domain),
    );

  if (!hasExactDomainMatch || candidates.length === 0) {
    const searchTerms = new Set<string>();
    if (hint.name?.trim()) searchTerms.add(hint.name.trim());
    if (hint.domain) {
      searchTerms.add(hint.domain);
      const root = hint.domain.split(".")[0];
      if (root && root.length > 1) searchTerms.add(root);
    }

    const searchResults = await Promise.all(
      [...searchTerms].map(async (term) => {
        try {
          return await searchCompanies(term, 8);
        } catch (e) {
          captureIntegrationException(e, {
            integration: "fuel-data",
            operation: "company_hint_bundle_search",
          });
          return [] as CompanyHit[];
        }
      }),
    );

    for (const hits of searchResults) {
      collectHits(hits, hint.domain, collected);
    }
    candidates = dedupeCandidates(collected);
  }

  if (candidates.length === 0) {
    const fallback = hintToOnboardOption(hint);
    if (fallback) candidates = [fallback];
  }

  return { hint, candidates };
}

/** Cached company-hint bundle keyed by verified email domain. */
export function getCachedCompanyHintBundle(email: string): Promise<CompanyHintBundle> {
  const domain = parseEmailDomain(email) ?? email.trim().toLowerCase();
  return unstable_cache(
    async () => resolveCompanyHintBundle(email),
    ["company-hint-bundle", domain],
    {
      revalidate: HINT_CACHE_SECONDS,
      tags: [`company-hint:${domain}`],
    },
  )();
}

/** Typeahead search for onboard company picker — same OpenSearch index as fuel-data search. */
export async function searchOnboardCompanies(
  query: string,
  verifiedDomain: string | null,
  limit = 8,
) {
  try {
    const hits = await searchCompanies(query, limit);
    const options = hits.map((hit) => companyHitToOnboardOption(hit));
    const normDomain = verifiedDomain ? normalizeDomain(verifiedDomain) : null;
    if (!normDomain) return options;

    // Surface the user's email-domain match first when present; do not hide other hits.
    return options.sort((a, b) => {
      const aMatch = normalizeDomain(a.domain) === normDomain;
      const bMatch = normalizeDomain(b.domain) === normDomain;
      if (aMatch === bMatch) return 0;
      return aMatch ? -1 : 1;
    });
  } catch (e) {
    captureIntegrationException(e, {
      integration: "fuel-data",
      operation: "onboard_company_search",
    });
    return [];
  }
}
