import {
  countryHasSubdivisions,
  resolveCountry,
} from "@/lib/geo";
import { isValidFoundedYear } from "@/lib/onboard/founded-year";

/** Profile fields shown on the onboard review step. */
export type OnboardingReviewProfileFields = {
  company: string;
  whatTheyDo: string;
  businessModel: string;
  industry: string;
  founded: string;
  city: string;
  stateRegion: string;
  country: string;
  website: string;
  linkedin: string;
};

const REVIEW_FIELD_KEYS: (keyof OnboardingReviewProfileFields)[] = [
  "company",
  "whatTheyDo",
  "businessModel",
  "industry",
  "founded",
  "city",
  "stateRegion",
  "country",
  "website",
  "linkedin",
];

/**
 * Asterisk-marked fields on the profile review form — required before Continue.
 * `stateRegion` is conditionally required when the selected country has subdivisions.
 */
export const REQUIRED_REVIEW_FIELD_KEYS = [
  "company",
  "whatTheyDo",
  "businessModel",
  "industry",
  "founded",
  "city",
  "stateRegion",
  "country",
  "website",
] as const satisfies ReadonlyArray<keyof OnboardingReviewProfileFields>;

export type RequiredReviewFieldKey = (typeof REQUIRED_REVIEW_FIELD_KEYS)[number];

export type OnboardingProfileFieldErrors = Partial<
  Record<RequiredReviewFieldKey, string>
>;

const REQUIRED_FIELD_MESSAGE = "This field is required";
const INVALID_YEAR_MESSAGE = "Enter a valid year (1800–present)";

const ALWAYS_REQUIRED_KEYS = [
  "company",
  "whatTheyDo",
  "businessModel",
  "industry",
  "founded",
  "city",
  "country",
  "website",
] as const satisfies ReadonlyArray<RequiredReviewFieldKey>;

/** Whether State / Region is required for this country value. */
export function isStateRegionRequired(country: string): boolean {
  const resolved = resolveCountry(country);
  return countryHasSubdivisions(resolved.code);
}

/** Returns errors for invalid / empty required review fields; empty object when valid. */
export function validateOnboardingReviewProfile(
  form: OnboardingReviewProfileFields,
): OnboardingProfileFieldErrors {
  const errors: OnboardingProfileFieldErrors = {};
  for (const key of ALWAYS_REQUIRED_KEYS) {
    if (key === "founded") {
      if (!form.founded?.trim()) {
        errors.founded = REQUIRED_FIELD_MESSAGE;
      } else if (!isValidFoundedYear(form.founded)) {
        errors.founded = INVALID_YEAR_MESSAGE;
      }
      continue;
    }
    if (!form[key]?.trim()) {
      errors[key] = REQUIRED_FIELD_MESSAGE;
    }
  }
  if (isStateRegionRequired(form.country) && !form.stateRegion?.trim()) {
    errors.stateRegion = REQUIRED_FIELD_MESSAGE;
  }
  return errors;
}

/** 0–100 completeness for the onboard profile review panel. */
export function computeOnboardingProfileCompleteness(
  form: OnboardingReviewProfileFields,
  fundingRounds: Array<{ type?: string; amount?: string }> = [],
): number {
  const filled = REVIEW_FIELD_KEYS.filter((k) => {
    if (k === "stateRegion" && !isStateRegionRequired(form.country)) {
      return true;
    }
    if (k === "founded") {
      return isValidFoundedYear(form.founded);
    }
    return !!form[k]?.trim();
  }).length;
  const hasFunding = fundingRounds.some(
    (r) => r.type?.trim() || r.amount?.trim(),
  );
  const total = REVIEW_FIELD_KEYS.length + 1;
  return Math.min(100, Math.round(((filled + (hasFunding ? 1 : 0)) / total) * 100));
}
