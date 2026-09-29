import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildClaimProfile,
  logoUrlFromEnrichmentSources,
  safeUrl,
  type BuildClaimProfileInput,
} from "./claim-profile";
import { ClaimBody } from "./claim-body-schema";

function enrichmentWithLogo(
  logoUrl: string,
): NonNullable<BuildClaimProfileInput["rawEnrichment"]> {
  return {
    domain: "ramp.com",
    websiteUrl: "https://ramp.com",
    name: "Ramp",
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
    sources: { logoUrl },
    providers: {
      website: false,
      techStack: false,
      crunchbase: false,
      linkedin: false,
      fuelData: true,
    },
    timing: {
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:01.000Z",
      durationMs: 1000,
      requests: [],
      unavailable: [],
    },
  };
}

describe("queued enrichment claim", () => {
  it("accepts a UUID run id", () => {
    const parsed = ClaimBody.safeParse({
      profile: { name: "Acme" },
      enrichmentRunId: "4d4db74a-1052-45bb-9b60-a4d28f3018bd",
    });
    assert.equal(parsed.success, true);
  });
});

describe("ClaimBody fundingRounds", () => {
  function round(i: number) {
    return {
      id: `r${i}`,
      type: "Series A",
      amount: "$1M",
      date: "2020-01-01",
      investors: "Acme Ventures",
    };
  }

  it("accepts more than 20 funding rounds", () => {
    const parsed = ClaimBody.safeParse({
      profile: { name: "Acme" },
      fundingRounds: Array.from({ length: 25 }, (_, i) => round(i)),
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.fundingRounds?.length, 25);
    }
  });

  it("rejects more than 100 funding rounds", () => {
    const parsed = ClaimBody.safeParse({
      profile: { name: "Acme" },
      fundingRounds: Array.from({ length: 101 }, (_, i) => round(i)),
    });
    assert.equal(parsed.success, false);
  });
});

describe("safeUrl", () => {
  it("accepts http(s) absolute URLs", () => {
    assert.equal(
      safeUrl("https://cdn.example.com/logo.png"),
      "https://cdn.example.com/logo.png",
    );
    assert.equal(
      safeUrl("http://cdn.example.com/logo.png"),
      "http://cdn.example.com/logo.png",
    );
  });

  it("rejects blank and non-http values", () => {
    assert.equal(safeUrl(""), null);
    assert.equal(safeUrl("   "), null);
    assert.equal(safeUrl("not-a-url"), null);
    assert.equal(safeUrl("ftp://cdn.example.com/logo.png"), null);
  });
});

describe("logoUrlFromEnrichmentSources", () => {
  it("reads sources.logoUrl when valid", () => {
    assert.equal(
      logoUrlFromEnrichmentSources({
        logoUrl: "https://cdn.example.com/os-logo.png",
      }),
      "https://cdn.example.com/os-logo.png",
    );
  });

  it("returns null when missing or invalid", () => {
    assert.equal(logoUrlFromEnrichmentSources(undefined), null);
    assert.equal(logoUrlFromEnrichmentSources({}), null);
    assert.equal(logoUrlFromEnrichmentSources({ logoUrl: 1 }), null);
    assert.equal(logoUrlFromEnrichmentSources({ logoUrl: "bad" }), null);
  });
});

describe("buildClaimProfile logoUrl", () => {
  it("prefers confirmedProfile.logoUrl over enrichment sources", () => {
    const profile = buildClaimProfile("ramp.com", {
      companyName: "Ramp",
      confirmedProfile: {
        companyName: "Ramp",
        description: "Finance",
        businessModel: "product",
        industry: "Fintech",
        founded: "2019",
        city: "NYC",
        region: "NY",
        country: "United States",
        website: "https://ramp.com",
        linkedin: "",
        crunchbase: "",
        twitter: "",
        fundingRounds: [],
        notes: "",
        logoUrl: "https://cdn.example.com/selected.png",
      },
      rawEnrichment: enrichmentWithLogo("https://cdn.example.com/enrichment.png"),
      benchmark: null,
    });
    assert.equal(profile.logoUrl, "https://cdn.example.com/selected.png");
  });

  it("falls back to enrichment sources.logoUrl", () => {
    const profile = buildClaimProfile("ramp.com", {
      companyName: "Ramp",
      confirmedProfile: null,
      rawEnrichment: enrichmentWithLogo("https://cdn.example.com/os.png"),
      benchmark: null,
    });
    assert.equal(profile.logoUrl, "https://cdn.example.com/os.png");
  });

  it("returns null logoUrl when unavailable", () => {
    const profile = buildClaimProfile("acme.com", {
      companyName: "Acme",
      confirmedProfile: null,
      rawEnrichment: null,
      benchmark: null,
    });
    assert.equal(profile.logoUrl, null);
  });
});
