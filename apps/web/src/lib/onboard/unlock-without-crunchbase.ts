/**
 * Feature flag + review unlock readiness for onboard enrichment.
 *
 * Review unlocks without Crunchbase by default. Set
 * ONBOARD_UNLOCK_WITHOUT_CRUNCHBASE=0|false|off only for emergency rollback.
 */

import type { ExtractCompanyProfileResult } from "@/lib/agent/skills/extractCompanyProfile";
import type { EnrichmentPayload } from "@/lib/catalog-enrich";
import { normalizeFoundedYearForForm } from "@/lib/onboard/founded-year";
import {
  validateOnboardingReviewProfile,
  type OnboardingReviewProfileFields,
} from "@/lib/onboard/onboarding-profile-completeness";

export function isOnboardUnlockWithoutCrunchbaseEnabled(): boolean {
  const raw = process.env.ONBOARD_UNLOCK_WITHOUT_CRUNCHBASE?.trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

/** Map enrichment (+ optional extract) → review form fields for unlock checks. */
export function reviewFieldsFromEnrichment(opts: {
  enrichment: EnrichmentPayload;
  extracted?: ExtractCompanyProfileResult | null;
  /** Default business model when none extracted (picker default). */
  businessModel?: string;
}): OnboardingReviewProfileFields {
  const { enrichment, extracted } = opts;
  const name =
    enrichment.name?.trim() ||
    extracted?.name?.trim() ||
    "";
  const whatTheyDo =
    enrichment.shortDescription?.trim() ||
    extracted?.shortDescription?.trim() ||
    "";
  const industry =
    enrichment.industry?.trim() ||
    extracted?.industry?.trim() ||
    "";
  const founded = normalizeFoundedYearForForm(
    enrichment.foundedOn ?? extracted?.foundedOn ?? "",
  );
  const city =
    enrichment.locationCity?.trim() ||
    extracted?.locationCity?.trim() ||
    "";
  const stateRegion =
    enrichment.locationState?.trim() ||
    extracted?.locationState?.trim() ||
    "";
  const country =
    enrichment.locationCountry?.trim() ||
    extracted?.locationCountry?.trim() ||
    "";
  const website = enrichment.websiteUrl?.trim() || "";
  const linkedin =
    enrichment.linkedinUrl?.trim() ||
    extracted?.linkedinUrl?.trim() ||
    "";
  const businessModel =
    extracted?.businessModel?.trim() ||
    opts.businessModel?.trim() ||
    "Product company";

  return {
    company: name,
    whatTheyDo,
    businessModel,
    industry,
    founded,
    city,
    stateRegion,
    country,
    website,
    linkedin,
  };
}

/** True when required review fields validate (source of truth for unlock). */
export function isReviewUnlockReady(opts: {
  enrichment: EnrichmentPayload;
  extracted?: ExtractCompanyProfileResult | null;
  businessModel?: string;
}): boolean {
  const fields = reviewFieldsFromEnrichment(opts);
  const errors = validateOnboardingReviewProfile(fields);
  return Object.keys(errors).length === 0;
}
