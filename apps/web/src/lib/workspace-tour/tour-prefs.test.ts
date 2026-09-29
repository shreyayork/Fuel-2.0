import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOUR_TAKEN_COOLDOWN_MS } from "./constants";
import {
  clearedCompletionPrefs,
  completedTourPrefs,
  EMPTY_TOUR_PREFS,
  isTourPromptSnoozed,
  mergeWorkspaceTourPrefs,
  parseWorkspaceTourPrefs,
  serializeWorkspaceTourPrefs,
  shouldHideTourPrompt,
  snoozedTourPrefs,
  wasTourTakenRecently,
} from "./tour-prefs";

describe("parseWorkspaceTourPrefs", () => {
  it("defaults empty / invalid input", () => {
    assert.deepEqual(parseWorkspaceTourPrefs(null), EMPTY_TOUR_PREFS);
    assert.deepEqual(parseWorkspaceTourPrefs(""), EMPTY_TOUR_PREFS);
    assert.deepEqual(parseWorkspaceTourPrefs("not-json"), EMPTY_TOUR_PREFS);
    assert.deepEqual(parseWorkspaceTourPrefs("[]"), EMPTY_TOUR_PREFS);
  });

  it("parses valid JSON", () => {
    assert.deepEqual(
      parseWorkspaceTourPrefs(JSON.stringify({ takenAt: 100, snoozedUntil: 200 })),
      { takenAt: 100, snoozedUntil: 200 },
    );
  });

  it("round-trips serialize", () => {
    const prefs = { takenAt: 1_700_000_000_000, snoozedUntil: 0 };
    assert.deepEqual(parseWorkspaceTourPrefs(serializeWorkspaceTourPrefs(prefs)), prefs);
  });
});

describe("tour prefs helpers", () => {
  it("merges patches without clobbering unset fields", () => {
    const next = mergeWorkspaceTourPrefs(
      { takenAt: 10, snoozedUntil: 20 },
      { takenAt: 99 },
    );
    assert.deepEqual(next, { takenAt: 99, snoozedUntil: 20 });
  });

  it("detects snooze and recent completion", () => {
    const now = 1_000_000;
    assert.equal(
      isTourPromptSnoozed({ takenAt: 0, snoozedUntil: now + 1 }, now),
      true,
    );
    assert.equal(
      isTourPromptSnoozed({ takenAt: 0, snoozedUntil: now }, now),
      false,
    );
    assert.equal(
      shouldHideTourPrompt({ takenAt: 50, snoozedUntil: 0 }, now),
      true,
    );
    assert.equal(
      shouldHideTourPrompt({ takenAt: 0, snoozedUntil: 0 }, now),
      false,
    );
    assert.equal(
      wasTourTakenRecently({ takenAt: now - 1, snoozedUntil: 0 }, now),
      true,
    );
    assert.equal(
      wasTourTakenRecently(
        { takenAt: now - TOUR_TAKEN_COOLDOWN_MS - 1, snoozedUntil: 0 },
        now,
      ),
      false,
    );
  });

  it("builds action patches", () => {
    const now = 5_000;
    assert.deepEqual(completedTourPrefs(now), { takenAt: now });
    assert.deepEqual(clearedCompletionPrefs(), { takenAt: 0 });
    assert.deepEqual(snoozedTourPrefs(now), {
      snoozedUntil: now + TOUR_TAKEN_COOLDOWN_MS,
    });
  });
});
