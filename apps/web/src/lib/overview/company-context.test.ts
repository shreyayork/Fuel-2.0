import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogOnboardingSnapshot } from "@/lib/onboard/claim-profile";
import { serializeProfileFundingRounds } from "./detail-question-catalog";
import {
  buildOverviewCompanyContext,
  buildOverviewFounderNarrative,
} from "./company-context";

describe("buildOverviewCompanyContext", () => {
  it("builds identity from catalog columns when answers and onboarding are empty", () => {
    const company = buildOverviewCompanyContext({
      catalog: {
        name: "Acme",
        domain: "acme.test",
        website: "https://acme.test",
        linkedinUrl: "https://www.linkedin.com/company/acme",
        industry: "SaaS",
        businessModel: "saas",
        shortDescription: "Ops software",
        longDescription: "Longer ops software description",
        foundedOn: "2019-03-12",
        employeeCount: "24",
        locationCity: "Austin",
        locationState: "TX",
        locationCountry: "United States",
      },
    });
    assert.equal(company?.name, "Acme");
    assert.equal(company?.domain, "acme.test");
    assert.equal(company?.industry, "SaaS");
    assert.equal(company?.businessModel, "saas");
    assert.equal(company?.founded, "2019");
    assert.equal(company?.employees, "24");
    assert.equal(company?.headquarters, "Austin, TX, United States");
    assert.equal(company?.productDescription, "Ops software");
    assert.equal(company?.website, "https://acme.test");
  });

  it("uses onboarding profileForm and additionalContext", () => {
    const company = buildOverviewCompanyContext({
      onboarding: {
        stage: "Seed",
        notes: "Board wants runway clarity",
        businessModelLabel: "B2B SaaS",
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
      } as CatalogOnboardingSnapshot,
    });
    assert.equal(company?.name, "PatriotPay");
    assert.equal(company?.industry, "FinTech");
    assert.equal(company?.stage, "Seed");
    assert.equal(company?.additionalContext, "Enterprise clinics");
    assert.equal(company?.notes, "Board wants runway clarity");
    assert.equal(company?.employees, "18");
    assert.equal(company?.founded, "2021");
    assert.deepEqual(company?.fundingRounds, [
      { type: "Seed", amount: "$1.2M", date: "2022-04-01", investors: "York" },
    ]);
  });

  it("lets stored profile_* answers override catalog and onboarding", () => {
    const company = buildOverviewCompanyContext({
      catalog: {
        name: "Catalog Name",
        industry: "Catalog Industry",
        shortDescription: "Catalog product",
        locationCity: "Austin",
      },
      onboarding: {
        profileForm: {
          company: "Onboarding Name",
          whatTheyDo: "Onboarding product",
          businessModel: "saas",
          industry: "Onboarding Industry",
          founded: "2020",
          city: "Boston",
          stateRegion: "MA",
          country: "United States",
          website: "https://onboarding.test",
          linkedin: "",
          additionalContext: "Onboarding context",
        },
      } as CatalogOnboardingSnapshot,
      answers: {
        profile_company: "Edited Co",
        profile_industry: "Climate",
        profile_product_description: "Edited product",
        profile_city: "Denver",
        profile_additional_context: "Edited context",
        profile_top_priorities: "Extend runway",
        profile_biggest_risk: "Pipeline coverage",
        profile_public_data_wrong: "We are not a marketplace",
        profile_funding_rounds: serializeProfileFundingRounds([
          { id: "fr-2", type: "Series A", amount: "$8M", date: "2024-01-01", investors: "A16Z" },
        ]),
      },
    });
    assert.equal(company?.name, "Edited Co");
    assert.equal(company?.industry, "Climate");
    assert.equal(company?.productDescription, "Edited product");
    assert.equal(company?.headquarters, "Denver, MA, United States");
    assert.equal(company?.additionalContext, "Edited context");
    assert.equal(company?.topPriorities, "Extend runway");
    assert.equal(company?.biggestRisk, "Pipeline coverage");
    assert.equal(company?.publicDataCorrections, "We are not a marketplace");
    assert.deepEqual(company?.fundingRounds, [
      { type: "Series A", amount: "$8M", date: "2024-01-01", investors: "A16Z" },
    ]);
  });

  it("omits empty fields", () => {
    const company = buildOverviewCompanyContext({
      catalog: { name: "Solo" },
      answers: { profile_industry: "  " },
    });
    assert.deepEqual(company, { name: "Solo" });
  });

  it("returns undefined when nothing is present", () => {
    assert.equal(buildOverviewCompanyContext({}), undefined);
  });
});

describe("buildOverviewFounderNarrative", () => {
  it("compacts qualitative portfolio-update fields", () => {
    const narrative = buildOverviewFounderNarrative({
      notableCustomers: "Acme Health",
      notableHires: "  ",
      challenges: "Hiring senior GTM",
      otherUpdates: null,
    });
    assert.deepEqual(narrative, {
      notableCustomers: "Acme Health",
      biggestChallenges: "Hiring senior GTM",
    });
  });

  it("returns undefined when the update has no narrative", () => {
    assert.equal(buildOverviewFounderNarrative(null), undefined);
    assert.equal(buildOverviewFounderNarrative({ notableCustomers: "" }), undefined);
  });
});
