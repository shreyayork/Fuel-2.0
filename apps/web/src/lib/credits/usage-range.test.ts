import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatRangeLabel,
  getPeriodRange,
  parseUsageCustomRangeParams,
} from "./usage-range";

describe("getPeriodRange", () => {
  const now = new Date(2026, 7, 11, 15, 30, 0); // Aug 11, 2026 local

  it("keeps 1d as today", () => {
    const { start, end } = getPeriodRange("1d", now);
    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 7);
    assert.equal(start.getDate(), 11);
    assert.equal(end.getDate(), 11);
    assert.equal(start.getHours(), 0);
    assert.equal(end.getHours(), 23);
  });

  it("spans 7 inclusive days for 7d", () => {
    const { start, end } = getPeriodRange("7d", now);
    assert.equal(start.getDate(), 5);
    assert.equal(end.getDate(), 11);
  });

  it("spans 30 inclusive days for 30d", () => {
    const { start } = getPeriodRange("30d", now);
    assert.equal(start.getMonth(), 6);
    assert.equal(start.getDate(), 13);
  });

  it("starts on the first of the month for mtd", () => {
    const { start, end } = getPeriodRange("mtd", now);
    assert.equal(start.getDate(), 1);
    assert.equal(start.getMonth(), 7);
    assert.equal(end.getDate(), 11);
  });

  it("covers the previous calendar month for last-month", () => {
    const { start, end } = getPeriodRange("last-month", now);
    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 6);
    assert.equal(start.getDate(), 1);
    assert.equal(end.getMonth(), 6);
    assert.equal(end.getDate(), 31);
  });
});

describe("parseUsageCustomRangeParams", () => {
  it("reports missing when neither bound is present", () => {
    assert.deepEqual(parseUsageCustomRangeParams(null, null), {
      ok: false,
      error: "missing",
    });
  });

  it("rejects a single bound", () => {
    assert.deepEqual(parseUsageCustomRangeParams("2026-01-01", null), {
      ok: false,
      error: "invalid",
    });
    assert.deepEqual(parseUsageCustomRangeParams(null, "2026-01-01"), {
      ok: false,
      error: "invalid",
    });
  });

  it("rejects invalid calendar values", () => {
    assert.deepEqual(parseUsageCustomRangeParams("2026-02-30", "2026-03-01"), {
      ok: false,
      error: "invalid",
    });
  });

  it("parses and normalizes a valid range", () => {
    const parsed = parseUsageCustomRangeParams("2026-01-15", "2026-02-01");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.range.start, "2026-01-15");
    assert.equal(parsed.range.end, "2026-02-01");
    assert.equal(parsed.start.getHours(), 0);
    assert.equal(parsed.end.getHours(), 23);
  });

  it("swaps reversed bounds", () => {
    const parsed = parseUsageCustomRangeParams("2026-02-01", "2026-01-15");
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.range.start, "2026-01-15");
    assert.equal(parsed.range.end, "2026-02-01");
  });
});

describe("formatRangeLabel", () => {
  it("formats single-day and multi-day ranges", () => {
    const day = new Date(2026, 7, 11);
    assert.equal(formatRangeLabel(day, day), "Aug 11");
    assert.equal(
      formatRangeLabel(new Date(2026, 7, 1), new Date(2026, 7, 11)),
      "Aug 1 – Aug 11",
    );
  });
});
