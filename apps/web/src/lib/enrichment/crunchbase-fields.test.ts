import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapCrunchbaseFundingFields,
  mapOneCrunchbaseFundingRound,
} from "./crunchbase-fields";

describe("mapOneCrunchbaseFundingRound", () => {
  it("maps inbound funding_rounds rows", () => {
    const mapped = mapOneCrunchbaseFundingRound({
      investment_type: "seed",
      raised_amount_usd: 1_500_000,
      announced_on: "2021-04-01",
      investors: [{ name: "Acme Ventures" }, "Solo Angel"],
    });
    assert.deepEqual(mapped, {
      roundType: "seed",
      amountUsd: 1_500_000,
      announcedOn: "2021-04-01",
      investors: ["Acme Ventures", "Solo Angel"],
    });
  });

  it("rejects outbound funds_raised / investment rows", () => {
    assert.equal(
      mapOneCrunchbaseFundingRound({
        id: "york-ie-invested-in-lexful-seed",
        type: "investment",
        value: "York IE investment in Seed Round - Lexful",
        funding_round: { value: "Seed Round - Lexful" },
        organization: { value: "Lexful" },
      }),
      null,
    );
  });
});

describe("mapCrunchbaseFundingFields", () => {
  it("reads funding_rounds when present", () => {
    const mapped = mapCrunchbaseFundingFields({
      funding_rounds: [
        {
          investment_type: "series_a",
          money_raised_usd: 8_000_000,
          announced_on: "2022-01-15",
          investors: ["Fund X"],
        },
      ],
      total_funding_usd: 9_500_000,
      num_funding_rounds: 2,
      last_funding_type: "series_a",
      last_funding_at: "2022-01-15",
    });
    assert.equal(mapped.fundingRounds?.length, 1);
    assert.equal(mapped.fundingRounds?.[0]?.roundType, "series_a");
    assert.equal(mapped.totalFundingUsd, 9_500_000);
    assert.equal(mapped.numFundingRounds, 2);
    assert.equal(mapped.lastFundingType, "series_a");
  });

  it("falls back to funding_rounds_detailed when funding_rounds missing", () => {
    const mapped = mapCrunchbaseFundingFields({
      funding_rounds: null,
      funding_rounds_detailed: [
        {
          funding_type: "seed",
          raised_amount_usd: 2_000_000,
          announced_at: "2020-06-01",
          investors: ["Operator Fund"],
        },
      ],
      funds_raised: [
        {
          type: "investment",
          value: "Org investment in Seed Round - OtherCo",
          funding_round: { value: "Seed Round - OtherCo" },
        },
      ],
    });
    assert.equal(mapped.fundingRounds?.length, 1);
    assert.equal(mapped.fundingRounds?.[0]?.roundType, "seed");
  });

  it("uses funding_rounds_list when funding_rounds is a summary object", () => {
    const mapped = mapCrunchbaseFundingFields({
      funding_rounds: {
        last_funding_type: "series_j",
        num_funding_rounds: 10,
      },
      funding_rounds_list: [
        {
          investment_type: "series_j",
          raised_amount_usd: 700_000_000,
          announced_on: "2022-01-01",
          investors: ["SoftBank"],
        },
      ],
    });
    assert.equal(mapped.fundingRounds?.length, 1);
    assert.equal(mapped.fundingRounds?.[0]?.roundType, "series_j");
    assert.equal(mapped.fundingRounds?.[0]?.amountUsd, 700_000_000);
  });

  it("does not treat funds_raised as company funding rounds (york.ie shape)", () => {
    const mapped = mapCrunchbaseFundingFields({
      funding_rounds_detailed: null,
      funds_raised: [
        {
          id: "york-ie-invested-in-lexful-seed--6990e88a--bad7da43",
          type: "investment",
          value: "York IE investment in Seed Round - Lexful",
        },
      ],
      investments: [
        {
          type: "investment",
          value: "York IE investment in Seed Round - Lexful",
          funding_round: { value: "Seed Round - Lexful" },
        },
      ],
      num_investments: 64,
    });
    assert.equal(mapped.fundingRounds, null);
    assert.equal(mapped.totalFundingUsd, null);
    assert.equal(mapped.numFundingRounds, null);
  });
});
