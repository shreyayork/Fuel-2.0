"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { isTabTourTarget } from "@/lib/workspace-tour/constants";
import {
  measureTourPopoverPosition,
  TOUR_POPOVER_ARROW_SIZE,
  TOUR_POPOVER_PAGE_MARGIN,
  type TourHoleRect,
  type TourPopoverPlacement,
} from "@/lib/workspace-tour/popover-position";
import { useTheme } from "../ThemeContext";
import { accentGradient, onAccentText, type Theme } from "@/lib/theme";

const POPOVER_WIDTH = 306;
const PAGE_MARGIN = TOUR_POPOVER_PAGE_MARGIN;
const ARROW_SIZE = TOUR_POPOVER_ARROW_SIZE;
const MAX_POSITION_ATTEMPTS = 90;
const RECT_STABILITY_EPSILON = 0.5;
const POPOVER_HEIGHT_ESTIMATE = 200;
/** Match tour ring (~3px + ~8px glow) so the cutout doesn’t clip the border. */
const HOLE_PAD = 12;

type HoleRect = TourHoleRect;
type Placement = TourPopoverPlacement;

function measureHole(rect: DOMRect): HoleRect {
  return {
    left: Math.max(0, rect.left - HOLE_PAD),
    top: Math.max(0, rect.top - HOLE_PAD),
    right: Math.min(window.innerWidth, rect.right + HOLE_PAD),
    bottom: Math.min(window.innerHeight, rect.bottom + HOLE_PAD),
  };
}

/** Full-viewport dim with rectangular cutout — parents' overflow never clips the veil. */
function holeClipPath(hole: HoleRect | null): string | undefined {
  if (!hole) return undefined;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return `polygon(evenodd, 0px 0px, ${vw}px 0px, ${vw}px ${vh}px, 0px ${vh}px, 0px 0px, ${hole.left}px ${hole.top}px, ${hole.left}px ${hole.bottom}px, ${hole.right}px ${hole.bottom}px, ${hole.right}px ${hole.top}px, ${hole.left}px ${hole.top}px)`;
}

function findTourAnchor(target?: string | null): Element | null {
  if (target) {
    const highlighted = document.querySelector(
      `.fuel-tour-highlight[data-tour-target="${target}"]`,
    );
    if (highlighted) return highlighted;

    const byTarget = document.querySelector(`[data-tour-target="${target}"]`);
    if (byTarget) return byTarget;
  }
  return document.querySelector(".fuel-tour-highlight");
}

function resolveTourAnchor(
  target: string | null | undefined,
  tabAnchorEl: HTMLButtonElement | null | undefined,
): Element | null {
  if (isTabTourTarget(target)) {
    if (!tabAnchorEl || tabAnchorEl.dataset.tourTarget !== target) {
      return null;
    }
    return tabAnchorEl;
  }
  return findTourAnchor(target);
}

function isMeasurableAnchorRect(rect: DOMRect): boolean {
  return rect.width > 0 && rect.height > 0;
}

type RectSample = { left: number; top: number; width: number; height: number };

function rectSample(rect: DOMRect): RectSample {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function rectsAreStable(a: RectSample, b: RectSample): boolean {
  return (
    Math.abs(a.left - b.left) <= RECT_STABILITY_EPSILON &&
    Math.abs(a.top - b.top) <= RECT_STABILITY_EPSILON &&
    Math.abs(a.width - b.width) <= RECT_STABILITY_EPSILON &&
    Math.abs(a.height - b.height) <= RECT_STABILITY_EPSILON
  );
}

function measurePopoverPosition(
  hole: HoleRect,
  popW: number,
  popH: number,
): { style: CSSProperties; placement: Placement; arrowOffset: number } {
  const measured = measureTourPopoverPosition(
    hole,
    popW,
    popH,
    window.innerWidth,
    window.innerHeight,
  );
  return {
    placement: measured.placement,
    arrowOffset: measured.arrowOffset,
    style: {
      left: measured.left,
      top: measured.top,
      right: "auto",
      visibility: "visible",
    },
  };
}

function fallbackPopoverPosition(): {
  style: CSSProperties;
  placement: Placement;
  arrowOffset: number;
} {
  return {
    placement: "bottom",
    arrowOffset: POPOVER_WIDTH / 2 - ARROW_SIZE / 2,
    style: {
      left: Math.max(PAGE_MARGIN, (window.innerWidth - POPOVER_WIDTH) / 2),
      top: Math.max(PAGE_MARGIN, Math.round(window.innerHeight * 0.28)),
      right: "auto",
      visibility: "visible",
    },
  };
}

function arrowStyle(placement: Placement, arrowOffset: number, t: Theme): CSSProperties {
  const border = `${t.accent}55`;
  const bg = t.panel;
  const half = ARROW_SIZE / 2;
  const base: CSSProperties = {
    position: "absolute",
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    background: bg,
    transform: "rotate(45deg)",
  };

  switch (placement) {
    case "bottom":
      return {
        ...base,
        top: -half,
        left: arrowOffset,
        borderLeft: `1px solid ${border}`,
        borderTop: `1px solid ${border}`,
      };
    case "top":
      return {
        ...base,
        bottom: -half,
        left: arrowOffset,
        borderRight: `1px solid ${border}`,
        borderBottom: `1px solid ${border}`,
      };
    case "right":
      return {
        ...base,
        left: -half,
        top: arrowOffset,
        borderLeft: `1px solid ${border}`,
        borderBottom: `1px solid ${border}`,
      };
    case "left":
      return {
        ...base,
        right: -half,
        top: arrowOffset,
        borderTop: `1px solid ${border}`,
        borderRight: `1px solid ${border}`,
      };
  }
}

export function GuidedTourOverlay({
  step,
  total,
  title,
  description,
  target,
  tabAnchorEl,
  onNext,
  onPrevious,
  onSkip,
}: {
  step: number;
  total: number;
  title: string;
  description: string;
  target?: string | null;
  tabAnchorEl?: HTMLButtonElement | null;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}) {
  const t = useTheme();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({
    visibility: "hidden",
  });
  const [backdropStyle, setBackdropStyle] = useState<CSSProperties>({});
  const [placement, setPlacement] = useState<Placement>("bottom");
  const [arrowOffset, setArrowOffset] = useState(POPOVER_WIDTH / 2 - ARROW_SIZE / 2);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--fuel-tour-accent", t.accent);
    return () => {
      root.style.removeProperty("--fuel-tour-accent");
    };
  }, [t.accent]);

  useLayoutEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let attempts = 0;
    let stableSample: RectSample | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let observedAnchor: Element | null = null;
    let didScrollIntoView = false;

    function applyBackdrop(anchor: Element | null) {
      if (cancelled) return;
      if (!anchor) {
        setBackdropStyle({ clipPath: undefined });
        return;
      }
      const rect = anchor.getBoundingClientRect();
      if (!isMeasurableAnchorRect(rect)) {
        setBackdropStyle({ clipPath: undefined });
        return;
      }
      setBackdropStyle({ clipPath: holeClipPath(measureHole(rect)) });
    }

    function applyPosition(anchor: Element | null) {
      if (cancelled) return;
      const el = popoverRef.current;
      const popW = el?.offsetWidth || POPOVER_WIDTH;
      const popH = el?.offsetHeight || POPOVER_HEIGHT_ESTIMATE;

      applyBackdrop(anchor);

      if (!anchor) {
        const fallback = fallbackPopoverPosition();
        setPlacement(fallback.placement);
        setArrowOffset(fallback.arrowOffset);
        setPopoverStyle(fallback.style);
        return;
      }

      const measured = measurePopoverPosition(
        measureHole(anchor.getBoundingClientRect()),
        popW,
        popH,
      );
      setPlacement(measured.placement);
      setArrowOffset(measured.arrowOffset);
      setPopoverStyle(measured.style);
    }

    function positionPopover() {
      if (cancelled) return;

      const anchor = resolveTourAnchor(target, tabAnchorEl);
      if (!anchor) {
        stableSample = null;
        if (attempts < MAX_POSITION_ATTEMPTS) {
          attempts += 1;
          rafId = requestAnimationFrame(positionPopover);
        } else {
          applyPosition(null);
        }
        return;
      }

      if (!didScrollIntoView) {
        didScrollIntoView = true;
        anchor.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }

      const rect = anchor.getBoundingClientRect();
      if (!isMeasurableAnchorRect(rect)) {
        stableSample = null;
        if (attempts < MAX_POSITION_ATTEMPTS) {
          attempts += 1;
          rafId = requestAnimationFrame(positionPopover);
        } else {
          applyPosition(null);
        }
        return;
      }

      const sample = rectSample(rect);
      if (!stableSample || !rectsAreStable(stableSample, sample)) {
        stableSample = sample;
        // Keep hole tracking while rect settles so highlight moves with scroll/layout.
        applyBackdrop(anchor);
        if (attempts < MAX_POSITION_ATTEMPTS) {
          attempts += 1;
          rafId = requestAnimationFrame(positionPopover);
        } else {
          applyPosition(anchor);
        }
        return;
      }

      attempts = 0;
      applyPosition(anchor);

      if (observedAnchor !== anchor) {
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(() => {
          stableSample = null;
          positionPopover();
        });
        resizeObserver.observe(anchor);
        if (popoverRef.current) resizeObserver.observe(popoverRef.current);
        observedAnchor = anchor;
      }
    }

    positionPopover();
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, [step, tabAnchorEl, target, title, description]);

  const primaryLabel = step === total - 1 ? "Finish" : "Next";

  if (typeof document === "undefined") return null;

  const overlay = (
    <div
      className="fuel-guided-tour-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // Children opt into hits; hole passes through to the target.
        pointerEvents: "none",
        zIndex: 140,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Workspace tour step ${step + 1} of ${total}`}
    >
      <div
        className="fuel-guided-tour-backdrop"
        aria-hidden
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        style={{
          background: t.overlay,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          // Dimmed area blocks page; clip-path hole does not receive events.
          pointerEvents: "auto",
          transition: "clip-path 0.15s ease",
          ...backdropStyle,
        }}
      />
      <div
        ref={popoverRef}
        style={{
          background: t.panel,
          border: `1px solid ${t.accent}55`,
          borderRadius: 14,
          boxShadow: "0 26px 70px rgba(0, 0, 0, 0.48)",
          color: t.ink,
          maxWidth: POPOVER_WIDTH,
          padding: "13px 14px",
          pointerEvents: "auto",
          position: "absolute",
          transition: "left 0.15s ease, top 0.15s ease",
          width: POPOVER_WIDTH,
          zIndex: 1,
          ...popoverStyle,
        }}
      >
        <span aria-hidden style={arrowStyle(placement, arrowOffset, t)} />
        <div
          style={{
            color: t.accent,
            fontFamily: t.sans,
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: "0.08em",
            marginBottom: 5,
            textTransform: "uppercase",
          }}
        >
          Step {step + 1} of {total}
        </div>
        <h3
          style={{
            fontFamily: t.sans,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            color: t.muted,
            fontFamily: t.sans,
            fontSize: 11.5,
            lineHeight: 1.45,
            margin: "6px 0 0",
          }}
        >
          {description}
        </p>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <button type="button" onClick={onSkip} style={secondaryBtn(t)}>
            Skip
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onPrevious}
              disabled={step === 0}
              style={{
                ...secondaryBtn(t),
                opacity: step === 0 ? 0.45 : 1,
                cursor: step === 0 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={onNext}
              style={{
                background: accentGradient(t),
                border: "none",
                borderRadius: 8,
                color: onAccentText(t),
                cursor: "pointer",
                fontFamily: t.sans,
                fontSize: 11,
                fontWeight: 800,
                padding: "7px 12px",
              }}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function secondaryBtn(t: Theme) {
  return {
    background: "transparent",
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    color: t.inkSoft,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 700,
    padding: "7px 12px",
  } as const;
}
