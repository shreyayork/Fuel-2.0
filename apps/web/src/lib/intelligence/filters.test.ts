import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterIntelligenceByDate,
  getIntelligenceDateRange,
} from "./filters";

const now = new Date(2026, 7, 11); // Aug 2026 → Q3

describe("getIntelligenceDateRange", () => {
  it("keeps current-quarter bounds", () => {
    const range = getIntelligenceDateRange("current-quarter", null, now);
    assert.equal(range.label, "Q3 2026");
    assert.equal(range.start.getMonth(), 6);
    assert.equal(range.start.getDate(), 1);
    assert.equal(range.end.getMonth(), 8);
    assert.equal(range.end.getDate(), 30);
  });

  it("uses the picked days verbatim — no month expansion", () => {
    const range = getIntelligenceDateRange(
      "custom",
      { start: "2026-01-15", end: "2026-03-03" },
      now,
    );
    assert.equal(range.label, "Jan 15, 2026 – Mar 3, 2026");
    assert.equal(range.start.getMonth(), 0);
    assert.equal(range.start.getDate(), 15);
    assert.equal(range.start.getHours(), 0);
    assert.equal(range.end.getMonth(), 2);
    assert.equal(range.end.getDate(), 3);
    assert.equal(range.end.getHours(), 23);
  });

  it("supports a single-day custom range", () => {
    const range = getIntelligenceDateRange(
      "custom",
      { start: "2026-08-04", end: "2026-08-04" },
      now,
    );
    assert.equal(range.label, "Aug 4, 2026 – Aug 4, 2026");
    assert.equal(range.start.getDate(), 4);
    assert.equal(range.end.getDate(), 4);
  });

  it("swaps reversed custom bounds", () => {
    const range = getIntelligenceDateRange(
      "custom",
      { start: "2026-06-10", end: "2026-02-02" },
      now,
    );
    assert.equal(range.label, "Feb 2, 2026 – Jun 10, 2026");
    assert.equal(range.start.getMonth(), 1);
    assert.equal(range.end.getMonth(), 5);
  });

  it("falls back to the current quarter until a custom range is picked", () => {
    const range = getIntelligenceDateRange("custom", null, now);
    assert.equal(range.label, "Custom");
    assert.equal(range.start.getMonth(), 6);
    assert.equal(range.end.getMonth(), 8);
  });
});

describe("filterIntelligenceByDate", () => {
  const day = (y: number, m: number, d: number) => new Date(y, m, d, 12).getTime();

  it("includes items whose reporting period overlaps a preset range", () => {
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 2, 31, 23, 59, 59, 999);
    const items = [
      { id: "q1", createdAtMs: 0, period: "2026-q1" },
      { id: "q2", createdAtMs: 0, period: "2026-q2" },
      { id: "old", createdAtMs: day(2025, 0, 15), period: null },
    ];
    const filtered = filterIntelligenceByDate(items, start, end).map((row) => row.id);
    assert.deepEqual(filtered, ["q1"]);
  });

  it("matches the logged day for custom ranges inside one quarter", () => {
    const start = new Date(2026, 7, 3);
    const end = new Date(2026, 7, 5, 23, 59, 59, 999);
    const items = [
      { id: "in", createdAtMs: day(2026, 7, 4), period: "2026-q3" },
      { id: "same-quarter-outside", createdAtMs: day(2026, 6, 20), period: "2026-q3" },
    ];
    const filtered = filterIntelligenceByDate(items, start, end, "logged-day").map(
      (row) => row.id,
    );
    assert.deepEqual(filtered, ["in"]);
  });

  it("includes both boundary days", () => {
    const start = new Date(2026, 7, 3);
    const end = new Date(2026, 7, 5, 23, 59, 59, 999);
    const items = [
      { id: "start", createdAtMs: new Date(2026, 7, 3, 0, 0, 0, 0).getTime(), period: "2026-q3" },
      { id: "end", createdAtMs: new Date(2026, 7, 5, 23, 59, 59, 0).getTime(), period: "2026-q3" },
      { id: "before", createdAtMs: new Date(2026, 7, 2, 23, 59, 59, 999).getTime(), period: "2026-q3" },
      { id: "after", createdAtMs: new Date(2026, 7, 6, 0, 0, 0, 0).getTime(), period: "2026-q3" },
    ];
    const filtered = filterIntelligenceByDate(items, start, end, "logged-day").map(
      (row) => row.id,
    );
    assert.deepEqual(filtered, ["start", "end"]);
  });

  it("works for a single-day range", () => {
    const start = new Date(2026, 7, 4);
    const end = new Date(2026, 7, 4, 23, 59, 59, 999);
    const items = [
      { id: "hit", createdAtMs: day(2026, 7, 4), period: "2026-q3" },
      { id: "miss", createdAtMs: day(2026, 7, 5), period: "2026-q3" },
    ];
    const filtered = filterIntelligenceByDate(items, start, end, "logged-day").map(
      (row) => row.id,
    );
    assert.deepEqual(filtered, ["hit"]);
  });

  it("spans months and quarters", () => {
    const start = new Date(2026, 5, 20);
    const end = new Date(2026, 7, 10, 23, 59, 59, 999);
    const items = [
      { id: "jun", createdAtMs: day(2026, 5, 25), period: "2026-q2" },
      { id: "jul", createdAtMs: day(2026, 6, 15), period: "2026-q3" },
      { id: "sep", createdAtMs: day(2026, 8, 1), period: "2026-q3" },
    ];
    const filtered = filterIntelligenceByDate(items, start, end, "logged-day").map(
      (row) => row.id,
    );
    assert.deepEqual(filtered, ["jun", "jul"]);
  });

  it("falls back to the reporting period when the logged date is missing", () => {
    const start = new Date(2026, 7, 3);
    const end = new Date(2026, 7, 5, 23, 59, 59, 999);
    const items = [{ id: "q3", createdAtMs: 0, period: "2026-q3" }];
    const filtered = filterIntelligenceByDate(items, start, end, "logged-day").map(
      (row) => row.id,
    );
    assert.deepEqual(filtered, ["q3"]);
  });
});
