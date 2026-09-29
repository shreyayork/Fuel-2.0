import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampListLimit,
  clampListOffset,
  DEFAULT_LIST_PAGE_SIZE,
  parseListLimitParam,
  parseListOffsetParam,
} from "@/lib/list-pagination";
import {
  mergeIntelligenceStats,
  pageSourceKeys,
  toHubspotIntelligenceSourceItem,
  toIntelligenceSourceItem,
} from "./sources-map";

describe("list pagination helpers", () => {
  it("defaults limit to 20 and whitelists 10|20|50", () => {
    assert.equal(clampListLimit(undefined), DEFAULT_LIST_PAGE_SIZE);
    assert.equal(clampListLimit(10), 10);
    assert.equal(clampListLimit(20), 20);
    assert.equal(clampListLimit(50), 50);
    assert.equal(clampListLimit(15), DEFAULT_LIST_PAGE_SIZE);
    assert.equal(clampListLimit(0), DEFAULT_LIST_PAGE_SIZE);
    assert.equal(clampListLimit(100), DEFAULT_LIST_PAGE_SIZE);
  });

  it("clamps offset to non-negative integers", () => {
    assert.equal(clampListOffset(undefined), 0);
    assert.equal(clampListOffset(-1), 0);
    assert.equal(clampListOffset(Number.NaN), 0);
    assert.equal(clampListOffset(20.9), 20);
    assert.equal(clampListOffset(40), 40);
  });

  it("parses query params for limit/offset", () => {
    assert.equal(parseListLimitParam(null), 20);
    assert.equal(parseListLimitParam("10"), 10);
    assert.equal(parseListLimitParam("bogus"), 20);
    assert.equal(parseListOffsetParam(null), 0);
    assert.equal(parseListOffsetParam("40"), 40);
    assert.equal(parseListOffsetParam("-3"), 0);
  });
});

describe("mergeIntelligenceStats", () => {
  it("unions ids and takes max count when both keys hit", () => {
    const merged = mergeIntelligenceStats(
      { count: 1, ids: ["ci_a"] },
      { count: 3, ids: ["ci_a", "ci_b", "ci_c"] },
    );
    assert.deepEqual(merged, {
      count: 3,
      ids: ["ci_a", "ci_b", "ci_c"],
    });
  });

  it("returns whichever side is present", () => {
    assert.deepEqual(mergeIntelligenceStats({ count: 1, ids: ["x"] }, undefined), {
      count: 1,
      ids: ["x"],
    });
    assert.deepEqual(mergeIntelligenceStats(undefined, { count: 2, ids: ["y"] }), {
      count: 2,
      ids: ["y"],
    });
    assert.equal(mergeIntelligenceStats(undefined, undefined), undefined);
  });
});

describe("toIntelligenceSourceItem", () => {
  const uploadedAt = new Date("2024-06-15T15:30:00.000Z");

  it("maps awaiting docs with empty intelligence", () => {
    const item = toIntelligenceSourceItem({
      id: "drv_1",
      filename: "pitch.pdf",
      typeLabel: "Pitch deck",
      uploadedAt,
      contextItemId: "ctx_1",
    });
    assert.equal(item.kind, "doc");
    assert.equal(item.originLabel, "Doc");
    assert.equal(item.title, "pitch.pdf");
    assert.equal(item.status, "awaiting");
    assert.equal(item.intelligenceCount, 0);
    assert.deepEqual(item.intelligenceIds, []);
    assert.equal(item.uploadedAtMs, uploadedAt.getTime());
    assert.equal(item.addedAtLabel, uploadedAt.toLocaleDateString());
  });

  it("prefers context title and marks generated when stats present", () => {
    const item = toIntelligenceSourceItem(
      {
        id: "drv_2",
        filename: "deck.pdf",
        typeLabel: "Pitch deck",
        uploadedAt,
        contextItemId: "ctx_2",
      },
      {
        contextTitle: " Q2 Board Deck ",
        stats: { count: 2, ids: ["ci_a", "ci_b"] },
      },
    );
    assert.equal(item.title, "Q2 Board Deck");
    assert.equal(item.status, "generated");
    assert.equal(item.intelligenceCount, 2);
    assert.deepEqual(item.intelligenceIds, ["ci_a", "ci_b"]);
  });

  it("falls back to typeLabel when filename and title are empty", () => {
    const item = toIntelligenceSourceItem({
      id: "drv_3",
      filename: "",
      typeLabel: "Financial model",
      uploadedAt,
      contextItemId: null,
    });
    assert.equal(item.title, "Financial model");
    assert.equal(item.contextItemId, null);
  });
});

describe("toHubspotIntelligenceSourceItem", () => {
  const createdAt = new Date("2024-07-01T12:00:00.000Z");

  it("maps HubSpot notes as kind note with awaiting status", () => {
    const item = toHubspotIntelligenceSourceItem({
      id: "ctx_hs_1",
      title: "Board prep call",
      source: "hubspot:note:99",
      occurredAt: createdAt,
      createdAt,
    });
    assert.equal(item.kind, "note");
    assert.equal(item.originLabel, "HubSpot");
    assert.equal(item.title, "Board prep call");
    assert.equal(item.contextItemId, "ctx_hs_1");
    assert.equal(item.status, "awaiting");
    assert.equal(item.intelligenceCount, 0);
  });

  it("labels emails and marks generated when stats present", () => {
    const item = toHubspotIntelligenceSourceItem(
      {
        id: "ctx_hs_2",
        title: null,
        source: "hubspot:email:42",
        occurredAt: null,
        createdAt,
      },
      { count: 1, ids: ["ci_1"] },
    );
    assert.equal(item.title, "HubSpot email");
    assert.equal(item.status, "generated");
    assert.deepEqual(item.intelligenceIds, ["ci_1"]);
    assert.equal(item.uploadedAtMs, createdAt.getTime());
  });

  it("maps Granola meetings with Granola chip and fallback title", () => {
    const item = toHubspotIntelligenceSourceItem(
      {
        id: "ctx_granola_1",
        title: null,
        source: "granola:21d96cc8-1394-45f6-9b9b-0fe2b50c1555",
        occurredAt: createdAt,
        createdAt,
      },
      { count: 2, ids: ["ci_g1", "ci_g2"] },
    );
    assert.equal(item.kind, "note");
    assert.equal(item.originLabel, "Granola");
    assert.equal(item.title, "Granola meeting");
    assert.equal(item.status, "generated");
    assert.equal(item.intelligenceCount, 2);
  });
});

describe("pageSourceKeys", () => {
  it("merges docs and notes by recency then slices the page", () => {
    const page = pageSourceKeys(
      [
        { id: "d1", kind: "doc", sortAtMs: 100 },
        { id: "n1", kind: "note", sortAtMs: 300 },
        { id: "d2", kind: "doc", sortAtMs: 200 },
        { id: "n2", kind: "note", sortAtMs: 50 },
      ],
      2,
      0,
    );
    assert.deepEqual(
      page.map((k) => k.id),
      ["n1", "d2"],
    );
    const page2 = pageSourceKeys(
      [
        { id: "d1", kind: "doc", sortAtMs: 100 },
        { id: "n1", kind: "note", sortAtMs: 300 },
        { id: "d2", kind: "doc", sortAtMs: 200 },
      ],
      2,
      2,
    );
    assert.deepEqual(
      page2.map((k) => k.id),
      ["d1"],
    );
  });
});
