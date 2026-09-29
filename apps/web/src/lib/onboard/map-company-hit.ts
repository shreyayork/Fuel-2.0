import { resolveCompanyLogoUrl } from "@/lib/company-logo";
import type { CompanyHit } from "@/lib/fuel-data";
import { normalizeLocationForForm } from "@/lib/geo";
import { normalizeManualCompanyDomain } from "@/lib/onboard/company-domain";
import { normalizeFoundedYearForForm } from "@/lib/onboard/founded-year";

export type CompanyHintSource = "override" | "fuel-data" | "heuristic" | "none";

export interface CompanyHint {
  domain: string;
  name: string | null;
  source: CompanyHintSource;
  fuelDataUuid?: string;
}

/** Fuel-data org row for onboard company picker (matches OnboardingFlow CompanyRecord). */
export interface OnboardCompanyOption {
  id: string;
  name: string;
  domain: string;
  whatTheyDo: string;
  industry: string;
  founded: string;
  city: string;
  stateRegion: string;
  country: string;
  linkedin: string;
  businessModel: string;
  /** OpenSearch `logo_url` when present — omit for letter fallback. */
  logoUrl?: string;
  funding: Array<{
    type: string;
    amount: string;
    date?: string;
    investors?: string;
  }>;
}

export interface CompanyHintBundle {
  hint: CompanyHint;
  candidates: OnboardCompanyOption[];
}

export function companyHitToOnboardOption(
  hit: CompanyHit,
  funding: OnboardCompanyOption["funding"] = [],
): OnboardCompanyOption {
  const domain = hit.domain?.trim() ?? "";
  const industry =
    hit.categories && hit.categories.length > 0
      ? hit.categories.join(" · ")
      : "";
  const location = normalizeLocationForForm({
    country: hit.locationCountry ?? "",
    stateRegion: hit.locationState ?? "",
    city: hit.locationCity ?? "",
  });

  // Persist CDN URL when OpenSearch has no logo_url — claim creates a cat_
  // uuid, so Logo can no longer fall back via the fuel-data id at render time.
  const logoUrl = resolveCompanyLogoUrl(hit.uuid, hit.logoUrl);

  return {
    id: hit.uuid,
    name: hit.name,
    domain,
    whatTheyDo: hit.shortDescription?.trim() ?? "",
    industry,
    founded: normalizeFoundedYearForForm(hit.foundedOn),
    city: location.city,
    stateRegion: location.stateRegion,
    country: location.country,
    linkedin: "",
    businessModel: "Product company",
    ...(logoUrl ? { logoUrl } : {}),
    funding,
  };
}

export function hintToOnboardOption(hint: CompanyHint): OnboardCompanyOption | null {
  if (!hint.name?.trim()) return null;
  return {
    id: hint.fuelDataUuid ?? hint.domain,
    name: hint.name,
    domain: hint.domain,
    whatTheyDo: "",
    industry: "",
    founded: "",
    city: "",
    stateRegion: "",
    country: "",
    linkedin: "",
    businessModel: "Product company",
    funding: [],
  };
}

/** Synthetic picker row from a manually entered domain (not in fuel-data). */
export function onboardOptionFromManualDomain(
  rawDomain: string,
): OnboardCompanyOption | null {
  const host = normalizeManualCompanyDomain(rawDomain);
  if (!host) return null;
  const label = host.split(".")[0] ?? host;
  const name = label ? label.charAt(0).toUpperCase() + label.slice(1) : host;
  return {
    id: "",
    name,
    domain: host,
    whatTheyDo: "",
    industry: "",
    founded: "",
    city: "",
    stateRegion: "",
    country: "",
    linkedin: "",
    businessModel: "Product company",
    funding: [],
  };
}
