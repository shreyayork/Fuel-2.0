import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldClearIntelligenceFocusOnTopNav } from "./tab-nav-focus";

describe("shouldClearIntelligenceFocusOnTopNav", () => {
  it("clears when opening the main Intelligence tab", () => {
    assert.equal(shouldClearIntelligenceFocusOnTopNav("intelligence"), true);
  });

  it("keeps focus when switching to other company tabs", () => {
    assert.equal(shouldClearIntelligenceFocusOnTopNav("overview"), false);
    assert.equal(shouldClearIntelligenceFocusOnTopNav("initiatives"), false);
    assert.equal(shouldClearIntelligenceFocusOnTopNav("dataroom"), false);
    assert.equal(shouldClearIntelligenceFocusOnTopNav("research"), false);
  });
});
