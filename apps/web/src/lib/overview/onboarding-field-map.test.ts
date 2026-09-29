import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogOnboardingSnapshot } from "@/lib/onboard/claim-profile";
import {
  mapCatalogCompanyToProfileAnswers,
  mapOnboardingToAnswers,
  overlayMissingAnswers,
} from "./onboarding-field-map";

describe("mapOnboardingToAnswers", () => {
  it("maps the full profile form, not only company/industry/description", () => {
    const mapped = mapOnboardingToAnswers({
      profileForm: {
        company: "PatriotPay",
        whatTheyDo: "Billing automation",
        businessModel: "saas",
        industry: "FinTech",
        founded: "2021-06-01",
        city: "Boston",
        stateRegion: "MA",
        country: "United States",
        website: "https://patriotpay.com",
        linkedin: "https://www.linkedin.com/company/patriotpay",
        additionalContext: "Enterprise clinics",
      },
      fundingRounds: [
        { id: "fr-1", type: "Seed", amount: "$1.2M", date: "2022-04-01", investors: "York" },
      ],
      benchmark: { headcount: "18" },
    } as CatalogOnboardingSnapshot);

    const byId = Object.fromEntries(mapped.map((row) => [row.questionId, row.answer]));
    assert.equal(byId.profile_company, "PatriotPay");
    assert.equal(byId.profile_product_description, "Billing automation");
    assert.equal(byId.profile_industry, "FinTech");
    assert.equal(byId.profile_founded, "2021");
    assert.equal(byId.profile_city, "Boston");
    assert.equal(byId.profile_state, "MA");
    assert.equal(byId.profile_country, "United States");
    assert.equal(byId.profile_website, "https://patriotpay.com");
    assert.equal(byId.profile_linkedin, "https://www.linkedin.com/company/patriotpay");
    assert.equal(byId.profile_additional_context, "Enterprise clinics");
    assert.equal(byId.profile_headcount, "18");
    assert.ok(byId.profile_funding_rounds?.includes("Seed"));
  });
});

describe("mapCatalogCompanyToProfileAnswers", () => {
  it("falls back to catalog columns when the form has no stored answers", () => {
    const mapped = mapCatalogCompanyToProfileAnswers({
      name: "Acme",
      shortDescription: "Ops software",
      industry: "SaaS",
      foundedOn: "2019-03-12",
      locationCity: "Austin",
      locationState: "TX",
      locationCountry: "United States",
      website: "https://acme.test",
      linkedinUrl: "https://www.linkedin.com/company/acme",
      employeeCount: "24",
    });
    assert.equal(mapped.profile_company, "Acme");
    assert.equal(mapped.profile_founded, "2019");
    assert.equal(mapped.profile_city, "Austin");
    assert.equal(mapped.profile_website, "https://acme.test");
    assert.equal(mapped.profile_headcount, "24");
  });
});

describe("overlayMissingAnswers", () => {
  it("keeps stored answers and fills only empty keys", () => {
    const merged = overlayMissingAnswers(
      { profile_company: "Edited", profile_city: "" },
      { profile_company: "Onboarding", profile_city: "Boston", profile_website: "https://a.test" },
      { profile_website: "https://catalog.test", profile_industry: "FinTech" },
    );
    assert.equal(merged.profile_company, "Edited");
    assert.equal(merged.profile_city, "Boston");
    assert.equal(merged.profile_website, "https://a.test");
    assert.equal(merged.profile_industry, "FinTech");
  });
});
