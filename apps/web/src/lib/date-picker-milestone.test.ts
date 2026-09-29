import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatYmdLocal, parseYmdLocal } from "./date-range";
import {
  milestoneDueDateToInputValue,
  normalizeMilestoneDueDate,
} from "./initiative-milestone-dates";

describe("DatePicker ↔ milestone due date bridge", () => {
  it("round-trips Calendar YYYY-MM-DD through milestone storage format", () => {
    const picked = "2028-08-15";
    const stored = normalizeMilestoneDueDate(picked);
    assert.equal(stored, "08-15-2028");
    assert.equal(milestoneDueDateToInputValue(stored), picked);
    const date = parseYmdLocal(picked);
    assert.ok(date);
    assert.equal(formatYmdLocal(date), picked);
  });

  it("clears empty picker values", () => {
    assert.equal(normalizeMilestoneDueDate(""), null);
    assert.equal(milestoneDueDateToInputValue(""), "");
  });
});
