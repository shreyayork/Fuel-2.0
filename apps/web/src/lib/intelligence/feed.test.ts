import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildFeedItems } from "./feed";
import type { CompanyIntelligenceRow } from "./types";

function baseIntel(
  overrides: Partial<CompanyIntelligenceRow>,
): CompanyIntelligenceRow {
  return {
    id: "ci_1",
    companyUuid: "co_1",
    category: "growth",
    headline: "ARR",
    keyDetail: "$1M",
    summary: "Growing",
    confidence: 1,
    source: "overview_generation",
    generationPath: "overview",
    period: "2026-Q1",
    contextItemId: null,
    documentVersionId: null,
    documentLabel: null,
    rawSnippet: null,
    isBenchmark: false,
    authorEmail: "a@b.com",
    createdAt: "2026-09-01T00:00:00.000Z",
    overviewCategory: "dev",
    ...overrides,
  };
}

describe("buildFeedItems provenance sources", () => {
  it("keeps linked document source unchanged", () => {
    const items = buildFeedItems({
      observations: [],
      intelligence: [
        baseIntel({
          documentVersionId: "dv_1",
          documentLabel: "Board deck",
          source: "document:data_room",
        }),
      ],
      catalog: [],
    });
    assert.equal(items[0]?.sources[0]?.title, "Board deck");
    assert.equal(items[0]?.sources[0]?.kind, "Document");
  });

  it("synthesizes R&D Form source when overview has no linkage", () => {
    const items = buildFeedItems({
      observations: [],
      intelligence: [baseIntel({})],
      catalog: [],
    });
    assert.equal(items[0]?.sourceCount, 1);
    assert.equal(items[0]?.sources[0]?.title, "R&D Form");
    assert.equal(items[0]?.sources[0]?.kind, "provenance");
  });

  it("re-resolves legacy Overview documentLabel via overviewCategory", () => {
    const items = buildFeedItems({
      observations: [],
      intelligence: [
        baseIntel({
          documentLabel: "Overview",
          overviewCategory: "mkt",
        }),
      ],
      catalog: [],
    });
    assert.equal(items[0]?.sources[0]?.title, "GTM Form");
    assert.equal(items[0]?.sources[0]?.kind, "provenance");
  });

  it("keeps stored Benchmark title without a document link", () => {
    const items = buildFeedItems({
      observations: [],
      intelligence: [
        baseIntel({
          documentLabel: "Benchmark",
          overviewCategory: "rev",
        }),
      ],
      catalog: [],
    });
    assert.equal(items[0]?.sources[0]?.title, "Benchmark");
  });

  it("synthesizes Profile update from evidenceSource", () => {
    const items = buildFeedItems({
      observations: [],
      intelligence: [
        baseIntel({
          documentLabel: null,
          overviewCategory: "dev",
          evidenceSource: "profile",
        }),
      ],
      catalog: [],
    });
    assert.equal(items[0]?.sources[0]?.title, "Profile update");
  });

  it("synthesizes User input for manual intelligence", () => {
    const items = buildFeedItems({
      observations: [],
      intelligence: [
        baseIntel({ source: "manual:ops@york.ie", generationPath: null }),
      ],
      catalog: [],
    });
    assert.equal(items[0]?.sources[0]?.title, "User input");
  });

  it("synthesizes Benchmark for portfolio_update observations", () => {
    const items = buildFeedItems({
      observations: [
        {
          id: "obs_1",
          signalId: "arr",
          signalLabel: "ARR",
          signalCategory: "growth",
          signalKind: "quantitative",
          signalUnit: "usd",
          period: "2026-Q1",
          valueNumeric: 100,
          valueText: null,
          valueBool: null,
          confidence: 1,
          rawSnippet: null,
          source: "portfolio_update:pu_1",
          contextItemId: null,
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      intelligence: [],
      catalog: [],
    });
    assert.equal(items[0]?.sources[0]?.title, "Benchmark");
  });

  it("synthesizes User input for manual observations", () => {
    const items = buildFeedItems({
      observations: [
        {
          id: "obs_2",
          signalId: "arr",
          signalLabel: "ARR",
          signalCategory: "growth",
          signalKind: "quantitative",
          signalUnit: "usd",
          period: "2026-Q1",
          valueNumeric: 50,
          valueText: null,
          valueBool: null,
          confidence: 1,
          rawSnippet: null,
          source: "manual:ops@york.ie",
          contextItemId: null,
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ],
      intelligence: [],
      catalog: [],
    });
    assert.equal(items[0]?.sources[0]?.title, "User input");
  });

  it("labels HubSpot-linked context sources as HubSpot (not context)", () => {
    const items = buildFeedItems({
      observations: [],
      intelligence: [
        baseIntel({
          source: "hubspot",
          contextItemId: "ctx_hs_1",
          documentLabel: "Customer Update – Cedarplus",
          generationPath: "hubspot",
        }),
      ],
      catalog: [],
    });
    assert.equal(items[0]?.sources[0]?.title, "Customer Update – Cedarplus");
    assert.equal(items[0]?.sources[0]?.kind, "HubSpot");
  });
});
