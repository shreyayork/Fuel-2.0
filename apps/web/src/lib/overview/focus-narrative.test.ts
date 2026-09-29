import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCategoryFocusNarrative } from "./focus-narrative";
import type { ScoreContributor } from "./types";

function missingBench(id: string, label: string): ScoreContributor {
  return {
    id,
    label,
    source: "benchmark",
    display: "Not logged",
    score: 40,
    weight: 0.2,
    contribution: 8,
    impact: `${label} is not logged`,
  };
}

describe("buildCategoryFocusNarrative", () => {
  it("matches design copy when track metrics are missing", () => {
    const rd = buildCategoryFocusNarrative("dev", 39, [
      missingBench("fte_count", "FTE headcount"),
      missingBench("gross_margin_pct", "Gross margin"),
    ]);
    assert.equal(
      rd,
      "Product & engineering needs attention (39/100) — peers are pulling ahead. Log fte headcount and gross margin so Fuel can score this track properly.",
    );

    const gtm = buildCategoryFocusNarrative("mkt", 39, [
      missingBench("arr_usd", "ARR"),
      missingBench("logo_retention_pct", "Logo retention"),
    ]);
    assert.equal(
      gtm,
      "Go to Market needs attention (39/100) — peers are pulling ahead. Log arr and logo retention so Fuel can score this track properly.",
    );

    const ga = buildCategoryFocusNarrative("rev", 41, [
      missingBench("cash_on_hand_usd", "Cash on hand"),
      missingBench("monthly_burn_usd", "Monthly net burn"),
    ]);
    assert.equal(
      ga,
      "Ops & finance needs attention (41/100) — peers are pulling ahead. Log cash on hand and monthly net burn so Fuel can score this track properly.",
    );
  });

  it("uses a strong opener for high scores", () => {
    const text = buildCategoryFocusNarrative("dev", 88, [
      {
        id: "fte_count",
        label: "FTE headcount",
        source: "benchmark",
        display: "18",
        score: 72,
        weight: 0.2,
        contribution: 14,
        impact: "ok",
      },
    ]);
    assert.match(text, /^Strong Product & engineering \(88\/100\)/);
  });
});
