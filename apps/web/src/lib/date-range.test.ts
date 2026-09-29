import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveRangeSelection,
  isoToYmdLocal,
  formatDayRangeTrigger,
  normalizeDayRange,
  parseYmdLocal,
} from "./date-range";

describe("normalizeDayRange", () => {
  it("returns null for incomplete ranges", () => {
    assert.equal(normalizeDayRange(null, "2026-03-01"), null);
    assert.equal(normalizeDayRange("2026-03-01", ""), null);
    assert.equal(normalizeDayRange("2026-03-01", undefined), null);
  });

  it("returns null for invalid calendar days", () => {
    assert.equal(normalizeDayRange("2026-02-30", "2026-03-01"), null);
    assert.equal(normalizeDayRange("2026-13-01", "2026-03-01"), null);
    assert.equal(normalizeDayRange("03-01-2026", "2026-03-02"), null);
  });

  it("keeps ordered ranges", () => {
    assert.deepEqual(normalizeDayRange("2026-01-15", "2026-02-01"), {
      start: "2026-01-15",
      end: "2026-02-01",
    });
  });

  it("swaps reversed ranges", () => {
    assert.deepEqual(normalizeDayRange("2026-02-01", "2026-01-15"), {
      start: "2026-01-15",
      end: "2026-02-01",
    });
  });
});

describe("formatDayRangeTrigger", () => {
  it("formats shadcn-style start/end labels", () => {
    assert.equal(
      formatDayRangeTrigger({ start: "2026-01-20", end: "2026-02-09" }),
      "Jan 20, 2026 – Feb 9, 2026",
    );
  });
});

describe("resolveRangeSelection", () => {
  it("keeps a start-only selection pending", () => {
    assert.deepEqual(resolveRangeSelection(null, { start: "2026-01-15" }), {
      kind: "pending",
      pending: { start: "2026-01-15" },
    });
  });

  it("applies and closes when a pending selection completes", () => {
    assert.deepEqual(
      resolveRangeSelection({ start: "2026-01-15" }, { start: "2026-01-15", end: "2026-02-01" }),
      {
        kind: "applied",
        range: { start: "2026-01-15", end: "2026-02-01" },
        close: true,
      },
    );
  });

  it("extends an applied range past its start without closing", () => {
    assert.deepEqual(
      resolveRangeSelection(
        { start: "2026-01-10", end: "2026-01-20" },
        { start: "2026-01-05", end: "2026-01-20" },
      ),
      {
        kind: "applied",
        range: { start: "2026-01-05", end: "2026-01-20" },
        close: false,
      },
    );
  });

  it("extends an applied range past its end without closing", () => {
    assert.deepEqual(
      resolveRangeSelection(
        { start: "2026-01-10", end: "2026-01-20" },
        { start: "2026-01-10", end: "2026-01-25" },
      ),
      {
        kind: "applied",
        range: { start: "2026-01-10", end: "2026-01-25" },
        close: false,
      },
    );
  });

  it("swaps reversed bounds", () => {
    assert.deepEqual(
      resolveRangeSelection({ start: "2026-02-01" }, { start: "2026-02-01", end: "2026-01-15" }),
      {
        kind: "applied",
        range: { start: "2026-01-15", end: "2026-02-01" },
        close: true,
      },
    );
  });

  it("supports a same-day range", () => {
    const outcome = resolveRangeSelection(
      { start: "2026-01-15" },
      { start: "2026-01-15", end: "2026-01-15" },
    );
    assert.deepEqual(outcome, {
      kind: "applied",
      range: { start: "2026-01-15", end: "2026-01-15" },
      close: true,
    });
  });

  it("reports a cleared selection", () => {
    assert.deepEqual(
      resolveRangeSelection({ start: "2026-01-15", end: "2026-01-15" }, null),
      { kind: "cleared" },
    );
  });
});

describe("isoToYmdLocal", () => {
  it("maps an ISO timestamp to its local calendar day", () => {
    const iso = new Date(2026, 7, 11, 9, 30).toISOString();
    assert.equal(isoToYmdLocal(iso), "2026-08-11");
  });

  it("returns null for missing or unparseable values", () => {
    assert.equal(isoToYmdLocal(null), null);
    assert.equal(isoToYmdLocal("not-a-date"), null);
  });
});

describe("parseYmdLocal", () => {
  it("parses local midnight for valid YMD", () => {
    const date = parseYmdLocal("2026-08-11");
    assert.ok(date);
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 7);
    assert.equal(date.getDate(), 11);
    assert.equal(date.getHours(), 0);
  });
});
