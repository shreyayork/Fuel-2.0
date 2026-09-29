import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseFocusIdsParam,
  parseIntelligenceFeedPageParams,
} from "./feed-page-params";

describe("parseFocusIdsParam", () => {
  it("splits ids and expands intel:/obs: prefixes", () => {
    assert.deepEqual(parseFocusIdsParam("intel:a,obs:b,c"), ["intel:a", "a", "obs:b", "b", "c"]);
  });

  it("returns empty for blank input", () => {
    assert.deepEqual(parseFocusIdsParam(null), []);
    assert.deepEqual(parseFocusIdsParam("  "), []);
  });
});

describe("parseIntelligenceFeedPageParams", () => {
  it("defaults to page size 20 / offset 0 / current-quarter", () => {
    const parsed = parseIntelligenceFeedPageParams(new URLSearchParams());
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.query.limit, 20);
    assert.equal(parsed.query.offset, 0);
    assert.equal(parsed.query.datePreset, "current-quarter");
    assert.equal(parsed.query.category, null);
    assert.equal(parsed.query.skipDateFilter, false);
  });

  it("rejects unsupported page sizes", () => {
    const parsed = parseIntelligenceFeedPageParams(
      new URLSearchParams({ limit: "25" }),
    );
    assert.equal(parsed.ok, false);
  });

  it("skips date filter when focus ids are present", () => {
    const parsed = parseIntelligenceFeedPageParams(
      new URLSearchParams({ focusIds: "intel:x", limit: "10", offset: "10" }),
    );
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.query.limit, 10);
    assert.equal(parsed.query.offset, 10);
    assert.equal(parsed.query.skipDateFilter, true);
    assert.ok(parsed.query.focusIds.includes("x"));
  });
});
