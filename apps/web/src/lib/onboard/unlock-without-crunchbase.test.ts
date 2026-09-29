import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import {
  isOnboardUnlockWithoutCrunchbaseEnabled,
  isReviewUnlockReady,
  reviewFieldsFromEnrichment,
} from "./unlock-without-crunchbase";
import type { EnrichmentPayload } from "@/lib/catalog-enrich";

function emptyPayload(over: Partial<EnrichmentPayload> = {}): EnrichmentPayload {
  return {
    domain: "acme.com",
    websiteUrl: "https://acme.com",
    name: null,
    shortDescription: null,
    longDescription: null,
    industry: null,
    locationCity: null,
    locationState: null,
    locationCountry: null,
    foundedOn: null,
    employeeCount: null,
    totalFundingUsd: null,
    numFundingRounds: null,
    lastFundingType: null,
    lastFundingAt: null,
    fundingRounds: null,
    crunchbaseUrl: null,
    linkedinUrl: null,
    twitterUrl: null,
    sources: {},
    providers: {
      website: false,
      techStack: false,
      crunchbase: false,
      linkedin: false,
      fuelData: false,
    },
    timing: {
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      requests: [],
      unavailable: [],
    },
    ...over,
  };
}

describe("isOnboardUnlockWithoutCrunchbaseEnabled", () => {
  const prev = process.env.ONBOARD_UNLOCK_WITHOUT_CRUNCHBASE;
  afterEach(() => {
    if (prev === undefined) delete process.env.ONBOARD_UNLOCK_WITHOUT_CRUNCHBASE;
    else process.env.ONBOARD_UNLOCK_WITHOUT_CRUNCHBASE = prev;
  });

  it("defaults on", () => {
    delete process.env.ONBOARD_UNLOCK_WITHOUT_CRUNCHBASE;
    assert.equal(isOnboardUnlockWithoutCrunchbaseEnabled(), true);
  });

  it("supports emergency rollback with 0/false/off", () => {
    process.env.ONBOARD_UNLOCK_WITHOUT_CRUNCHBASE = "0";
    assert.equal(isOnboardUnlockWithoutCrunchbaseEnabled(), false);
    process.env.ONBOARD_UNLOCK_WITHOUT_CRUNCHBASE = "false";
    assert.equal(isOnboardUnlockWithoutCrunchbaseEnabled(), false);
  });
});

describe("isReviewUnlockReady", () => {
  it("false when required fields missing", () => {
    assert.equal(
      isReviewUnlockReady({ enrichment: emptyPayload() }),
      false,
    );
  });

  it("true when Fuel-data-shaped payload fills required fields", () => {
    const enrichment = emptyPayload({
      name: "Acme",
      shortDescription: "Widgets",
      industry: "SaaS",
      foundedOn: "2019",
      locationCity: "Austin",
      locationState: "TX",
      locationCountry: "United States",
      providers: {
        website: false,
        techStack: false,
        crunchbase: false,
        linkedin: false,
        fuelData: true,
      },
    });
    assert.equal(
      isReviewUnlockReady({
        enrichment,
        businessModel: "Product company",
      }),
      true,
    );
  });

  it("true with LLM extract filling gaps (website insufficient alone)", () => {
    const enrichment = emptyPayload({
      name: "Acme Inc",
      shortDescription: null,
      industry: null,
      foundedOn: null,
      locationCity: null,
      locationCountry: null,
    });
    assert.equal(isReviewUnlockReady({ enrichment }), false);
    assert.equal(
      isReviewUnlockReady({
        enrichment,
        extracted: {
          domain: "acme.com",
          websiteUrl: "https://acme.com",
          name: "Acme Inc",
          shortDescription: "Makes widgets",
          industry: "Manufacturing",
          foundedOn: "2018",
          locationCity: "Boston",
          locationState: "MA",
          locationCountry: "United States",
          linkedinUrl: null,
          twitterUrl: null,
          businessModel: "saas",
          sources: {},
          cached: { website: false, techStack: false },
        },
      }),
      true,
    );
  });

  it("funding / linkedin / crunchbase not required for unlock", () => {
    const fields = reviewFieldsFromEnrichment({
      enrichment: emptyPayload({
        name: "York IE",
        shortDescription: "Operators",
        industry: "Venture",
        foundedOn: "2014",
        locationCity: "Manchester",
        locationState: "NH",
        locationCountry: "United States",
        fundingRounds: null,
        linkedinUrl: null,
        crunchbaseUrl: null,
      }),
      businessModel: "Product company",
    });
    assert.equal(fields.linkedin, "");
    assert.equal(
      isReviewUnlockReady({
        enrichment: emptyPayload({
          name: "York IE",
          shortDescription: "Operators",
          industry: "Venture",
          foundedOn: "2014",
          locationCity: "Manchester",
          locationState: "NH",
          locationCountry: "United States",
        }),
        businessModel: "Product company",
      }),
      true,
    );
  });
});
