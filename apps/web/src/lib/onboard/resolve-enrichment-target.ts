import "server-only";
import { isGenericProvider, parseEmailDomain } from "@/lib/auth/email-domains";
import { getCompany, getCompanyByDomain, normalizeDomain } from "@/lib/fuel-data";

export type OnboardEnrichmentTargetSource =
  | "selected_company"
  | "manual_domain"
  | "email_domain";

export type OnboardEnrichmentTarget = {
  domain: string;
  companyId: string | null;
  companyName: string | null;
  source: OnboardEnrichmentTargetSource;
};

export type ResolveOnboardEnrichmentTargetInput = {
  companyId?: string | null;
  companyDomain?: string | null;
};

/**
 * Resolve which domain to enrich during onboarding.
 *
 * Precedence: explicit company selection (fuel-data id/domain) > email domain.
 * A normalized `companyDomain` that is not in fuel-data is allowed as
 * `manual_domain` so founders can continue when search has no hit.
 */
export async function resolveOnboardEnrichmentTarget(
  email: string,
  opts?: ResolveOnboardEnrichmentTargetInput,
): Promise<OnboardEnrichmentTarget | null> {
  const selected = await resolveSelectedCompanyTarget(opts);
  if (selected) return selected;

  const emailDomain = parseEmailDomain(email);
  if (!emailDomain || isGenericProvider(email)) return null;

  return {
    domain: normalizeDomain(emailDomain) || emailDomain,
    companyId: null,
    companyName: null,
    source: "email_domain",
  };
}

function manualDomainTarget(domain: string): OnboardEnrichmentTarget {
  return {
    domain,
    companyId: null,
    companyName: null,
    source: "manual_domain",
  };
}

async function resolveSelectedCompanyTarget(
  opts?: ResolveOnboardEnrichmentTargetInput,
): Promise<OnboardEnrichmentTarget | null> {
  const companyId = opts?.companyId?.trim();
  if (companyId) {
    try {
      const company = await getCompany(companyId);
      const domain = company?.domain ? normalizeDomain(company.domain) : null;
      if (domain) {
        return {
          domain,
          companyId,
          companyName: company?.name ?? null,
          source: "selected_company",
        };
      }
    } catch {
      // OpenSearch unavailable — fall through to domain lookup.
    }
  }

  const rawDomain = opts?.companyDomain?.trim();
  if (!rawDomain) return null;

  const domain = normalizeDomain(rawDomain);
  if (!domain) return null;

  try {
    const hit = await getCompanyByDomain(domain);
    if (hit) {
      return {
        domain,
        companyId: hit.uuid,
        companyName: hit.name,
        source: "selected_company",
      };
    }
  } catch {
    // OpenSearch unavailable — still allow manual domain enrichment.
    return manualDomainTarget(domain);
  }

  // Domain typed by founder but not in fuel-data catalog.
  return manualDomainTarget(domain);
}
