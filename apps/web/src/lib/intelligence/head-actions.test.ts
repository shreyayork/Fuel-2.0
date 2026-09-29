import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INTELLIGENCE_HEAD_ACTION_LABELS,
  shouldShowIntelligenceHeadActions,
} from "./head-actions";

describe("intelligence head actions", () => {
  it("exposes Add source, Log intelligence, and Update benchmark", () => {
    assert.deepEqual([...INTELLIGENCE_HEAD_ACTION_LABELS], [
      "Add source",
      "Log intelligence",
      "Update benchmark",
    ]);
  });

  it("shows head CTAs when benchmark numbers are missing", () => {
    assert.equal(shouldShowIntelligenceHeadActions(false), true);
  });

  it("shows head CTAs when benchmark numbers exist", () => {
    assert.equal(shouldShowIntelligenceHeadActions(true), true);
  });
});
