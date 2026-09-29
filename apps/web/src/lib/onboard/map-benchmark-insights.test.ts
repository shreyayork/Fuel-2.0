import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOnboardBenchmarkValue, onboardBenchmarkMetricBandsFromDrawer } from "./map-benchmark-insights";

describe("parseOnboardBenchmarkValue", () => {
  it("parses k/K and m/M shorthand", () => {
    assert.equal(parseOnboardBenchmarkValue("1245k"), 1_245_000);
    assert.equal(parseOnboardBenchmarkValue("1.2m"), 1_200_000);
    assert.equal(parseOnboardBenchmarkValue("$2.4M"), 2_400_000);
  });

  it("parses b/B billion shorthand (F20A-157)", () => {
    assert.equal(parseOnboardBenchmarkValue("1.2b"), 1_200_000_000);
    assert.equal(parseOnboardBenchmarkValue("1.2B"), 1_200_000_000);
    assert.equal(parseOnboardBenchmarkValue("1245b"), 1_245_000_000_000);
    assert.equal(parseOnboardBenchmarkValue("$1.2B"), 1_200_000_000);
  });

  it("parses plain numbers and percents", () => {
    assert.equal(parseOnboardBenchmarkValue("85"), 85);
    assert.equal(parseOnboardBenchmarkValue("85%"), 85);
  });

  it("parses months and multiples", () => {
    assert.equal(parseOnboardBenchmarkValue("16 mo"), 16);
    assert.equal(parseOnboardBenchmarkValue("2.1x"), 2.1);
  });
});

describe("onboardBenchmarkMetricBandsFromDrawer", () => {
  it("exposes all 12 Overview drawer fields with burn lowerIsBetter", () => {
    const bands = onboardBenchmarkMetricBandsFromDrawer();
    assert.equal(bands.length, 12);
    assert.deepEqual(
      bands.map((b) => b.key),
      [
        "arr",
        "arrGrowth",
        "nrr",
        "grossMargin",
        "cacPayback",
        "burnMultiple",
        "ruleOf40",
        "logoRetention",
        "monthlyBurn",
        "cashOnHand",
        "headcount",
        "payingCustomers",
      ],
    );
    assert.equal(bands.find((b) => b.key === "monthlyBurn")?.lowerIsBetter, true);
    assert.equal(bands.find((b) => b.key === "burnMultiple")?.lowerIsBetter, true);
    assert.equal(bands.find((b) => b.key === "cacPayback")?.lowerIsBetter, true);
    assert.equal(bands.find((b) => b.key === "arrGrowth")?.lowerIsBetter, false);
  });
});
