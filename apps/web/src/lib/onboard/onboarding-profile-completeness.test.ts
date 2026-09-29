import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterFoundedYearInput,
  isValidFoundedYear,
  maxFoundedYear,
  MIN_FOUNDED_YEAR,
  normalizeFoundedYearForForm,
} from "./founded-year";
import {
  computeOnboardingProfileCompleteness,
  isStateRegionRequired,
  validateOnboardingReviewProfile,
} from "./onboarding-profile-completeness";

const baseForm = {
  company: "Acme",
  whatTheyDo: "Widgets",
  businessModel: "Product company",
  industry: "SaaS",
  founded: "2021",
  city: "Boston",
  stateRegion: "Massachusetts",
  country: "United States",
  website: "https://acme.example",
  linkedin: "",
};

describe("founded-year", () => {
  it("normalizes ISO dates to a 4-digit year", () => {
    assert.equal(normalizeFoundedYearForForm("2019-03-12"), "2019");
    assert.equal(normalizeFoundedYearForForm("2021"), "2021");
  });

  it("filters non-digits and caps at 4 characters", () => {
    assert.equal(filterFoundedYearInput("20a2b1"), "2021");
    assert.equal(filterFoundedYearInput("20215"), "2021");
    assert.equal(filterFoundedYearInput("-2019"), "2019");
  });

  it("validates exact years in range", () => {
    const now = new Date("2026-06-01");
    assert.equal(isValidFoundedYear("2021", now), true);
    assert.equal(isValidFoundedYear("1800", now), true);
    assert.equal(isValidFoundedYear(String(maxFoundedYear(now)), now), true);
    assert.equal(isValidFoundedYear("1799", now), false);
    assert.equal(isValidFoundedYear("2027", now), false);
    assert.equal(isValidFoundedYear("2019-03-12", now), false);
    assert.equal(isValidFoundedYear("abc", now), false);
    assert.equal(isValidFoundedYear("20.1", now), false);
    assert.equal(MIN_FOUNDED_YEAR, 1800);
  });
});

describe("validateOnboardingReviewProfile", () => {
  it("requires a valid founded year", () => {
    const errors = validateOnboardingReviewProfile({
      ...baseForm,
      founded: "not-a-year",
    });
    assert.equal(errors.founded, "Enter a valid year (1800–present)");
  });

  it("requires state when country has subdivisions", () => {
    assert.equal(isStateRegionRequired("United States"), true);
    const errors = validateOnboardingReviewProfile({
      ...baseForm,
      stateRegion: "",
    });
    assert.equal(errors.stateRegion, "This field is required");
  });

  it("does not require state when country has no subdivisions", () => {
    assert.equal(isStateRegionRequired("Vatican City State (Holy See)"), false);
    const errors = validateOnboardingReviewProfile({
      ...baseForm,
      country: "Vatican City State (Holy See)",
      stateRegion: "",
      city: "Vatican City",
    });
    assert.equal(errors.stateRegion, undefined);
    assert.deepEqual(errors, {});
  });

  it("accepts a complete US profile", () => {
    assert.deepEqual(validateOnboardingReviewProfile(baseForm), {});
  });
});

describe("computeOnboardingProfileCompleteness", () => {
  it("treats missing optional state as filled for no-subdivision countries", () => {
    const score = computeOnboardingProfileCompleteness(
      {
        ...baseForm,
        country: "Vatican City State (Holy See)",
        stateRegion: "",
        city: "Vatican City",
        linkedin: "https://linkedin.com/company/x",
      },
      [{ type: "Seed", amount: "1000000" }],
    );
    assert.equal(score, 100);
  });
});
