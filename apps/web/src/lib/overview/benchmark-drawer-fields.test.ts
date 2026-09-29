import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BENCHMARK_DRAWER_FIELDS,
  benchmarkMetricValuesFromColumns,
  countLoggedBenchmarkMetrics,
  parseBenchmarkDrawerValue,
} from "./benchmark-drawer-fields";

describe("benchmark form metric count", () => {
  it("counts every form field, including efficiency metrics outside the scorecard", () => {
    assert.equal(BENCHMARK_DRAWER_FIELDS.length, 12);
    assert.equal(countLoggedBenchmarkMetrics({ arr_usd: 1_200_000 }), 1);
    assert.equal(
      countLoggedBenchmarkMetrics({
        arr_usd: 1_200_000,
        cac_payback_months: 16,
        burn_multiple: 2.1,
        rule_of_40_pct: 28,
      }),
      4,
    );
  });

  it("maps portfolio columns for all 12 form fields", () => {
    const values = benchmarkMetricValuesFromColumns({
      arrUsd: 500_000,
      cacPaybackMonths: 14,
      burnMultiple: 1.8,
      ruleOf40Pct: 42,
    });
    assert.equal(Object.keys(values).length, 12);
    assert.equal(values.arr_usd, 500_000);
    assert.equal(values.cac_payback_months, 14);
    assert.equal(values.burn_multiple, 1.8);
    assert.equal(values.rule_of_40_pct, 42);
    assert.equal(values.nrr_pct, null);
  });
});

describe("parseBenchmarkDrawerValue", () => {
  it("parses k/K and m/M shorthand", () => {
    assert.equal(parseBenchmarkDrawerValue("1245k"), 1_245_000);
    assert.equal(parseBenchmarkDrawerValue("1245K"), 1_245_000);
    assert.equal(parseBenchmarkDrawerValue("1.2m"), 1_200_000);
    assert.equal(parseBenchmarkDrawerValue("$2.4M"), 2_400_000);
  });

  it("parses b/B billion shorthand (F20A-157)", () => {
    assert.equal(parseBenchmarkDrawerValue("1.2b"), 1_200_000_000);
    assert.equal(parseBenchmarkDrawerValue("1.2B"), 1_200_000_000);
    assert.equal(parseBenchmarkDrawerValue("1245b"), 1_245_000_000_000);
    assert.equal(parseBenchmarkDrawerValue("$1.2B"), 1_200_000_000);
  });

  it("returns null for empty or invalid input", () => {
    assert.equal(parseBenchmarkDrawerValue(""), null);
    assert.equal(parseBenchmarkDrawerValue("   "), null);
    assert.equal(parseBenchmarkDrawerValue("abc"), null);
  });
});
