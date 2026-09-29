import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isYorkHelpTemporaryDismissMode,
  yorkHelpTemporaryDismissUntil,
} from "./dismiss";

describe("york-help dismiss duration", () => {
  it("treats hide and legacy 14d as temporary modes", () => {
    assert.equal(isYorkHelpTemporaryDismissMode("hide"), true);
    assert.equal(isYorkHelpTemporaryDismissMode("14d"), true);
    assert.equal(isYorkHelpTemporaryDismissMode("forever"), false);
    assert.equal(isYorkHelpTemporaryDismissMode(""), false);
  });

  it("adds configured calendar days for temporary dismiss", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const until = yorkHelpTemporaryDismissUntil(21, now);
    assert.equal(until.toISOString().slice(0, 10), "2026-01-22");
  });

  it("uses 14 days when that is the configured value", () => {
    const now = new Date("2026-03-01T00:00:00.000Z");
    const until = yorkHelpTemporaryDismissUntil(14, now);
    assert.equal(until.toISOString().slice(0, 10), "2026-03-15");
  });
});
