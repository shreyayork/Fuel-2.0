import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeHoldings } from "./merge-holdings";

describe("mergeHoldings", () => {
  it("dedupes by domain across sources", () => {
    const merged = mergeHoldings([
      {
        companyUuid: "u1",
        name: "Acme Inc",
        domain: "acme.com",
        onFuel: true,
        latestRound: "Seed",
        source: "fuel",
      },
      {
        companyUuid: "u1b",
        name: "Acme",
        domain: "www.acme.com",
        onFuel: false,
        latestRound: "Series A",
        source: "crunchbase",
      },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].domain, "acme.com");
    assert.equal(merged[0].onFuel, true);
    assert.deepEqual(merged[0].sources.sort(), ["crunchbase", "fuel"]);
    // Without announcement dates, first usable type in merge order wins
    assert.ok(
      merged[0].latestRound === "Seed" || merged[0].latestRound === "Series A",
    );
  });

  it("dedupes by name when domain missing", () => {
    const merged = mergeHoldings([
      {
        companyUuid: "",
        name: "Beta Co",
        latestRound: null,
        source: "fuel",
      },
      {
        companyUuid: "u2",
        name: "  beta  co ",
        latestRound: "Growth",
        source: "crunchbase",
      },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].companyUuid, "u2");
    assert.equal(merged[0].latestRound, "Growth");
  });

  it("keeps distinct companies", () => {
    const merged = mergeHoldings([
      {
        companyUuid: "a",
        name: "A",
        domain: "a.com",
        latestRound: "Seed",
        source: "fuel",
      },
      {
        companyUuid: "b",
        name: "B",
        domain: "b.com",
        latestRound: "Series B",
        source: "fuel",
      },
    ]);
    assert.equal(merged.length, 2);
  });
});
