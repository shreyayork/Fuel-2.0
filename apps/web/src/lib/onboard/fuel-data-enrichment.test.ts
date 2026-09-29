import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapNeptuneFundingRounds,
  mergeFuelHitIntoPayload,
  neptuneRoundsToPickerFunding,
} from "./funding-rounds";
import { mergeUntouchedProfileFields } from "./build-profile-prefill";
import { classifyProviderFailure } from "../enrichment/enrichment-timing";

describe("mergeUntouchedProfileFields", () => {
  it("preserves edited fields while applying later enrichment", () => {
    const current = { company: "Founder edit", industry: "", city: "Boston" };
    const incoming = { company: "Provider name", industry: "SaaS", city: "NYC" };

    assert.deepEqual(
      mergeUntouchedProfileFields(
        current,
        incoming,
        new Set<keyof typeof current>(["company", "city"]),
      ),
      { company: "Founder edit", industry: "SaaS", city: "Boston" },
    );
  });
});

describe("classifyProviderFailure", () => {
  it("distinguishes empty, timeout, and provider failures", () => {
    assert.equal(classifyProviderFailure("empty response"), "empty");
    assert.equal(classifyProviderFailure("request timed out after 5000ms"), "timeout");
    assert.equal(classifyProviderFailure("upstream 503"), "failed");
  });
});

describe("mapNeptuneFundingRounds", () => {
  it("maps amounts, dates, investors", () => {
    const mapped = mapNeptuneFundingRounds([
      {
        announcedOn: "2022-01-15",
        investmentType: "series_a",
        raisedAmountUsd: 8_000_000,
        investorNames: ["Fund X", "Angel Y"],
      },
    ]);
    assert.equal(mapped.length, 1);
    assert.equal(mapped[0]?.roundType, "Series A");
    assert.equal(mapped[0]?.amountUsd, 8_000_000);
    assert.equal(mapped[0]?.announcedOn, "2022-01-15");
    assert.deepEqual(mapped[0]?.investors, ["Fund X", "Angel Y"]);
  });
});

describe("neptuneRoundsToPickerFunding", () => {
  it("formats picker rows", () => {
    const rows = neptuneRoundsToPickerFunding([
      {
        investmentType: "seed",
        raisedAmountUsd: 1_500_000,
        announcedOn: "2020-06-01",
        investorNames: ["Operator Fund"],
      },
    ]);
    assert.equal(rows[0]?.type, "Seed");
    assert.ok(rows[0]?.amount.includes("1.5") || rows[0]?.amount.includes("1"));
    assert.equal(rows[0]?.date, "2020-06-01");
    assert.equal(rows[0]?.investors, "Operator Fund");
  });
});

describe("mergeFuelHitIntoPayload", () => {
  it("fills empty payload fields from hit + funding", () => {
    const payload = {
      name: null as string | null,
      shortDescription: null as string | null,
      industry: null as string | null,
      locationCity: null as string | null,
      locationState: null as string | null,
      locationCountry: null as string | null,
      foundedOn: null as string | null,
      employeeCount: null as string | null,
      totalFundingUsd: null as number | null,
      numFundingRounds: null as number | null,
      lastFundingType: null as string | null,
      lastFundingAt: null as string | null,
      fundingRounds: null as ReturnType<typeof mapNeptuneFundingRounds> | null,
    };
    mergeFuelHitIntoPayload(
      payload,
      {
        name: "Swiggy",
        shortDescription: "Food delivery",
        categories: ["Delivery", "Apps"],
        employeeCount: "5001-10000",
        totalFundingUsd: 3_600_000_000,
        foundedOn: "2014",
        locationCity: "Bangalore",
        locationState: "KA",
        locationCountry: "IN",
      },
      [
        {
          roundType: "Series J",
          amountUsd: 700_000_000,
          announcedOn: "2022-01-01",
          investors: ["Prosus"],
        },
      ],
    );
    assert.equal(payload.name, "Swiggy");
    assert.equal(payload.industry, "Delivery, Apps");
    assert.equal(payload.foundedOn, "2014");
    assert.equal(payload.fundingRounds?.length, 1);
    assert.equal(payload.lastFundingType, "Series J");
    assert.equal(payload.totalFundingUsd, 3_600_000_000);
  });

  it("does not overwrite existing non-null fields", () => {
    const payload = {
      name: "Keep Me",
      shortDescription: "Keep desc",
      industry: null as string | null,
      locationCity: null as string | null,
      locationState: null as string | null,
      locationCountry: null as string | null,
      foundedOn: "2019",
      employeeCount: null as string | null,
      totalFundingUsd: null as number | null,
      numFundingRounds: null as number | null,
      lastFundingType: null as string | null,
      lastFundingAt: null as string | null,
      fundingRounds: null as ReturnType<typeof mapNeptuneFundingRounds> | null,
    };
    mergeFuelHitIntoPayload(
      payload,
      {
        name: "Other",
        shortDescription: "Other desc",
        foundedOn: "2000",
      },
      [],
    );
    assert.equal(payload.name, "Keep Me");
    assert.equal(payload.foundedOn, "2019");
  });
});
