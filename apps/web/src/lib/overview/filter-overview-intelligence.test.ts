import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterOverviewIntelligence,
  isPlaceholderIntelligenceHighlight,
} from "./filter-overview-intelligence";

describe("isPlaceholderIntelligenceHighlight", () => {
  it("flags Unknown / NA style highlights", () => {
    assert.equal(isPlaceholderIntelligenceHighlight("Unknown"), true);
    assert.equal(isPlaceholderIntelligenceHighlight("N/A"), true);
    assert.equal(isPlaceholderIntelligenceHighlight("I don't know / NA"), true);
    assert.equal(isPlaceholderIntelligenceHighlight("__unknown__"), true);
  });

  it("allows real highlights and empty (text-only) highlights", () => {
    assert.equal(isPlaceholderIntelligenceHighlight("$1.2M"), false);
    assert.equal(isPlaceholderIntelligenceHighlight("72%"), false);
    assert.equal(isPlaceholderIntelligenceHighlight(""), false);
    assert.equal(isPlaceholderIntelligenceHighlight(null), false);
  });
});

describe("filterOverviewIntelligence", () => {
  const sample = [
    {
      signal_id: "arr_usd",
      title: "ARR",
      text: "ARR logged",
      highlight: "$500K",
    },
    {
      signal_id: "gross_margin_pct",
      title: "Gross margin",
      text: "No margin yet",
      highlight: "Unknown",
    },
    {
      signal_id: "fte_count",
      title: "FTE headcount",
      text: "Invented headcount",
      highlight: "12",
    },
    {
      signal_id: "pricing_model",
      title: "Pricing model",
      text: "Should drop",
      highlight: "Unknown",
    },
    {
      signal_id: "go_to_market_motion",
      title: "Primary GTM motion",
      text: "Sales-led GTM from profile",
      highlight: "Sales-led",
    },
  ];

  it("keeps only logged benchmark metrics and non-placeholder qualitative items", () => {
    const kept = filterOverviewIntelligence(sample, {
      benchmarkValues: { arr_usd: 500_000, gross_margin_pct: null, fte_count: null },
    });
    assert.deepEqual(
      kept.map((i) => i.signal_id),
      ["arr_usd", "go_to_market_motion"],
    );
  });

  it("drops all benchmark-metric intelligence when no metrics are logged", () => {
    const kept = filterOverviewIntelligence(sample, {
      benchmarkValues: {},
    });
    assert.deepEqual(
      kept.map((i) => i.signal_id),
      ["go_to_market_motion"],
    );
  });

  it("returns empty when every item is a placeholder or unlogged metric", () => {
    const kept = filterOverviewIntelligence(
      [
        { signal_id: "arr_usd", text: "x", highlight: "Unknown" },
        { signal_id: "pricing_model", text: "x", highlight: "N/A" },
      ],
      { benchmarkValues: {} },
    );
    assert.equal(kept.length, 0);
  });
});
