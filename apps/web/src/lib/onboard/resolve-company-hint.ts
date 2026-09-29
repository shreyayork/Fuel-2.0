import "server-only";
import { isGenericProvider, parseEmailDomain } from "@/lib/auth/email-domains";
import { getCompanyByDomain, type CompanyHit } from "@/lib/fuel-data";
import type { CompanyHint } from "@/lib/onboard/company-hint-types";
import { KNOWN_DOMAIN_COMPANY_NAMES } from "@/lib/onboard/york-domains";

function titleCaseCompany(value: string): string {
  return value
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function heuristicCompanyName(domain: string): string {
  const root = domain.split(".")[0] ?? "";
  return titleCaseCompany(root);
}

/** Resolve hint + optional exact fuel-data hit in a single domain lookup. */
export async function resolveCompanyHintWithHit(email: string): Promise<{
  hint: CompanyHint;
  exactHit: CompanyHit | null;
}> {
  const domain = parseEmailDomain(email);
  if (!domain || isGenericProvider(email)) {
    return { hint: { domain: domain ?? "", name: null, source: "none" }, exactHit: null };
  }

  const overrideName = KNOWN_DOMAIN_COMPANY_NAMES[domain];
  if (overrideName) {
    return {
      hint: { domain, name: overrideName, source: "override" },
      exactHit: null,
    };
  }

  let exactHit: CompanyHit | null = null;
  try {
    exactHit = await getCompanyByDomain(domain);
    if (exactHit?.name) {
      return {
        hint: {
          domain,
          name: exactHit.name,
          source: "fuel-data",
          fuelDataUuid: exactHit.uuid,
        },
        exactHit,
      };
    }
  } catch {
    // OpenSearch unavailable in dev — fall through to heuristic.
  }

  const heuristic = heuristicCompanyName(domain);
  return {
    hint: {
      domain,
      name: heuristic || null,
      source: heuristic ? "heuristic" : "none",
    },
    exactHit,
  };
}

/** Resolve a display company name from a verified business email domain. */
export async function resolveCompanyHint(email: string): Promise<CompanyHint> {
  const { hint } = await resolveCompanyHintWithHit(email);
  return hint;
}
