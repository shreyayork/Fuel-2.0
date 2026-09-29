/** Matches design-library GuidedTourOverlay (`pageMargin` / `gap`). */
export const TOUR_POPOVER_PAGE_MARGIN = 24;
export const TOUR_POPOVER_GAP = 16;
export const TOUR_POPOVER_ARROW_SIZE = 10;
export const TOUR_POPOVER_ARROW_EDGE_PAD = 14;

export type TourHoleRect = { left: number; top: number; right: number; bottom: number };
export type TourPopoverPlacement = "top" | "bottom" | "left" | "right";

export type TourPopoverPosition = {
  left: number;
  top: number;
  placement: TourPopoverPlacement;
  arrowOffset: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function overlapArea(
  left: number,
  top: number,
  popW: number,
  popH: number,
  hole: TourHoleRect,
): number {
  const overlapW = Math.max(
    0,
    Math.min(left + popW, hole.right) - Math.max(left, hole.left),
  );
  const overlapH = Math.max(
    0,
    Math.min(top + popH, hole.bottom) - Math.max(top, hole.top),
  );
  return overlapW * overlapH;
}

/**
 * Place outside the hole on `placement`. Clamp only against the viewport edge
 * opposite the hole — never pull the popover back into the highlight.
 */
function placeOutsideHole(
  placement: TourPopoverPlacement,
  hole: TourHoleRect,
  popW: number,
  popH: number,
  vw: number,
  vh: number,
): { left: number; top: number } {
  const margin = TOUR_POPOVER_PAGE_MARGIN;
  const gap = TOUR_POPOVER_GAP;
  const maxLeft = Math.max(0, vw - popW - margin);
  const maxTop = Math.max(0, vh - popH - margin);

  switch (placement) {
    case "right": {
      const left = hole.right + gap;
      // Only clamp if overflowing the right edge; do not pull left into the hole.
      return {
        left: left + popW <= vw - margin ? left : clamp(left, margin, maxLeft),
        top: clamp(hole.top, margin, maxTop),
      };
    }
    case "left": {
      const left = hole.left - popW - gap;
      return {
        left: left >= margin ? left : clamp(left, 0, maxLeft),
        top: clamp(hole.top, margin, maxTop),
      };
    }
    case "bottom": {
      const top = hole.bottom + gap;
      return {
        left: clamp(hole.left, margin, maxLeft),
        top: top + popH <= vh - margin ? top : clamp(top, margin, maxTop),
      };
    }
    case "top": {
      const top = hole.top - popH - gap;
      // Keep above the hole when possible, even if under PAGE_MARGIN.
      return {
        left: clamp(hole.left, margin, maxLeft),
        top: top >= 0 ? top : clamp(top, 0, maxTop),
      };
    }
  }
}

function fitsCleanly(
  left: number,
  top: number,
  popW: number,
  popH: number,
  vw: number,
  vh: number,
  hole: TourHoleRect,
): boolean {
  const margin = TOUR_POPOVER_PAGE_MARGIN;
  if (left < margin - 0.5 || top < 0) return false;
  if (left + popW > vw - margin + 0.5) return false;
  if (top + popH > vh - margin + 0.5) return false;
  return overlapArea(left, top, popW, popH, hole) === 0;
}

/**
 * Prefer beside target (right, then left), else below/above — never under the hole.
 * When the hole is too large for a clean fit, pick the side with least overlap.
 */
export function measureTourPopoverPosition(
  hole: TourHoleRect,
  popW: number,
  popH: number,
  vw: number,
  vh: number,
): TourPopoverPosition {
  const visible: TourHoleRect = {
    left: clamp(hole.left, 0, vw),
    top: clamp(hole.top, 0, vh),
    right: clamp(hole.right, 0, vw),
    bottom: clamp(hole.bottom, 0, vh),
  };

  const order: TourPopoverPlacement[] = ["right", "left", "bottom", "top"];

  type Candidate = TourPopoverPosition & { score: number };
  const candidates: Candidate[] = [];

  for (let i = 0; i < order.length; i += 1) {
    const placement = order[i]!;
    const { left, top } = placeOutsideHole(placement, visible, popW, popH, vw, vh);
    const overlap = overlapArea(left, top, popW, popH, visible);
    const clean = fitsCleanly(left, top, popW, popH, vw, vh, visible);
    const score = clean ? i : 1_000_000 + overlap * 100 + i;
    candidates.push({ placement, left, top, arrowOffset: 0, score });
  }

  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0]!;

  const holeCx = (visible.left + visible.right) / 2;
  const holeCy = (visible.top + visible.bottom) / 2;
  const arrowPad = TOUR_POPOVER_ARROW_EDGE_PAD;
  const arrowSize = TOUR_POPOVER_ARROW_SIZE;
  const arrowOffset =
    best.placement === "top" || best.placement === "bottom"
      ? clamp(holeCx - best.left - arrowSize / 2, arrowPad, popW - arrowPad - arrowSize)
      : clamp(holeCy - best.top - arrowSize / 2, arrowPad, popH - arrowPad - arrowSize);

  return {
    placement: best.placement,
    left: best.left,
    top: best.top,
    arrowOffset,
  };
}
