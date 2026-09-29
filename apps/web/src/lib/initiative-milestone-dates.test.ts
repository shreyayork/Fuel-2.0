import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultInitiativeMilestoneTitles,
  defaultMilestoneDueDates,
  ensureFutureMilestoneDueDates,
  formatMilestoneDueDate,
  isMilestoneDueDate,
  isMilestoneDueDateOnOrAfter,
  milestoneDueDateToInputValue,
  normalizeMilestoneDueDate,
} from "./initiative-milestone-dates";

describe("milestone due dates", () => {
  it("validates real calendar dates in MM-DD-YYYY format", () => {
    assert.equal(isMilestoneDueDate("02-29-2028"), true);
    assert.equal(isMilestoneDueDate("02-29-2027"), false);
    assert.equal(isMilestoneDueDate("2028-02-29"), false);
    assert.equal(isMilestoneDueDate("13-01-2028"), false);
  });

  it("normalizes native date-input values and rejects invalid dates", () => {
    assert.equal(normalizeMilestoneDueDate("2028-08-15"), "08-15-2028");
    assert.equal(normalizeMilestoneDueDate("08-15-2028"), "08-15-2028");
    assert.equal(normalizeMilestoneDueDate("2028-02-30"), null);
    assert.equal(milestoneDueDateToInputValue("08-15-2028"), "2028-08-15");
  });

  it("creates three progressive dates and clamps short months", () => {
    assert.deepEqual(
      defaultMilestoneDueDates(new Date("2027-01-31T00:00:00.000Z")),
      ["02-28-2027", "03-31-2027", "04-30-2027"],
    );
  });

  it("formats UTC calendar days as MM-DD-YYYY", () => {
    assert.equal(
      formatMilestoneDueDate(new Date("2026-07-30T15:00:00.000Z")),
      "07-30-2026",
    );
  });

  it("detects past vs on-or-after milestone dates", () => {
    const today = new Date("2026-07-30T12:00:00.000Z");
    assert.equal(isMilestoneDueDateOnOrAfter("01-15-2025", today), false);
    assert.equal(isMilestoneDueDateOnOrAfter("07-30-2026", today), true);
    assert.equal(isMilestoneDueDateOnOrAfter("08-01-2026", today), true);
  });

  it("replaces past or missing due dates with progressive future dates", () => {
    const today = new Date("2026-07-30T12:00:00.000Z");
    assert.deepEqual(
      ensureFutureMilestoneDueDates(
        [
          { title: "a", due_date: "01-15-2025" },
          { title: "b", due_date: "08-15-2026" },
          { title: "c" },
        ],
        today,
      ),
      [
        { title: "a", due_date: "08-30-2026" },
        { title: "b", due_date: "08-15-2026" },
        { title: "c", due_date: "10-30-2026" },
      ],
    );
  });

  it("builds the same starter milestone labels used by creation", () => {
    assert.deepEqual(
      defaultInitiativeMilestoneTitles({
        initiativeName: "Launch beta",
        categoryId: "dev",
      }),
      [
        "Define scope for Launch beta",
        "Execute first R&D workstream",
        "Review progress vs target intelligence",
      ],
    );
  });
});
