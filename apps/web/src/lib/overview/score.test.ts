import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeCategoryScore } from "./score";

const benchmarkRows = [
  {
    metric: "fte_count",
    p25: 5,
    p50: 10,
    p75: 20,
    p90: 40,
    invertedGood: false,
  },
  {
    metric: "gross_margin_pct",
    p25: 50,
    p50: 65,
    p75: 75,
    p90: 85,
    invertedGood: false,
  },
];

describe("computeCategoryScore", () => {
  it("returns a bounded score with contributors for dev category", () => {
    const result = computeCategoryScore({
      categoryId: "dev",
      answers: { dev_product_type: "B2B SaaS" },
      profileCompletionPct: 80,
      benchmarkValues: { fte_count: 15, gross_margin_pct: 70 },
      benchmarkRows,
    });

    assert.ok(result.score >= 0 && result.score <= 100);
    assert.ok(result.contributors.length > 0);
    assert.equal(typeof result.statusLabel, "string");
  });

  it("penalizes missing benchmark values", () => {
    const result = computeCategoryScore({
      categoryId: "dev",
      answers: {},
      profileCompletionPct: 50,
      benchmarkValues: {},
      benchmarkRows,
    });

    const missing = result.contributors.filter((c) => c.display === "Not logged");
    assert.ok(missing.length >= 1);
  });
});
