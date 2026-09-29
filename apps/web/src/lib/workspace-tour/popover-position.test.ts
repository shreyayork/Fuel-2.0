import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  measureTourPopoverPosition,
  TOUR_POPOVER_GAP,
  TOUR_POPOVER_PAGE_MARGIN,
} from "./popover-position";

describe("measureTourPopoverPosition", () => {
  it("prefers right when there is room beside a compact target", () => {
    const hole = { left: 100, top: 120, right: 280, bottom: 200 };
    const pos = measureTourPopoverPosition(hole, 306, 180, 1200, 800);
    assert.equal(pos.placement, "right");
    assert.equal(pos.left, hole.right + TOUR_POPOVER_GAP);
  });

  it("places above a large advisor-sized hole instead of overlapping it", () => {
    // Mirrors Step 2: full-width advisor card with little side/bottom room.
    const hole = { left: 240, top: 200, right: 1180, bottom: 760 };
    const popW = 306;
    const popH = 180;
    const vw = 1280;
    const vh = 800;
    const pos = measureTourPopoverPosition(hole, popW, popH, vw, vh);

    assert.equal(pos.placement, "top");
    assert.ok(pos.top + popH <= hole.top, "popover must sit above the hole");
    assert.ok(pos.top >= 0);
    assert.ok(pos.left >= TOUR_POPOVER_PAGE_MARGIN);
    assert.ok(pos.left + popW <= vw - TOUR_POPOVER_PAGE_MARGIN);
  });

  it("uses bottom when sides are tight but room remains below", () => {
    const hole = { left: 80, top: 80, right: 920, bottom: 160 };
    const pos = measureTourPopoverPosition(hole, 306, 180, 1000, 900);
    assert.equal(pos.placement, "bottom");
    assert.equal(pos.top, hole.bottom + TOUR_POPOVER_GAP);
  });
});
