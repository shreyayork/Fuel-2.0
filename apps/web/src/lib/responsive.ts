"use client";

import { useEffect, useState } from "react";

/**
 * Shared layout breakpoints (mobile-first).
 * Keep in sync with CSS custom properties on `:root` in `globals.css`.
 */
export const BREAKPOINTS = {
  /** Small phones (iPhone SE) */
  xs: 360,
  /** Large phones */
  sm: 480,
  /** Phablets / small tablets portrait */
  md: 768,
  /**
   * App shell: below this, sidebar becomes an overlay drawer + hamburger.
   * At/above: persistent sidebar (iPad landscape, desktop).
   */
  nav: 1024,
  /** Wide content / multi-column denser layouts */
  lg: 1200,
  /** Large tablets / small laptops */
  xl: 1366,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

/** Minimum comfortable tap target (Apple HIG / WCAG). */
export const TOUCH_TARGET_MIN = 44;

export function mqMax(px: number): string {
  return `(max-width: ${px}px)`;
}

export function mqMin(px: number): string {
  return `(min-width: ${px}px)`;
}

/**
 * Subscribe to a CSS media query. SSR-safe: returns `defaultMatches` until mount.
 */
export function useMediaQuery(
  query: string,
  defaultMatches = false,
): boolean {
  const [matches, setMatches] = useState(defaultMatches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    // Some embeds change the viewport without firing MQL "change" (devtools
    // device mode, certain webviews). Resize keeps React state aligned with CSS.
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, [query]);

  return matches;
}

/** True when the app shell should use overlay nav (phones + most tablet portrait). */
export function useMobileNav(): boolean {
  return useMediaQuery(mqMax(BREAKPOINTS.nav - 1));
}

/** True below tablet landscape / desktop content density. */
export function useNarrow(breakpoint: number = BREAKPOINTS.md): boolean {
  return useMediaQuery(mqMax(breakpoint - 1));
}

/** True in landscape orientation (phone or tablet rotated). */
export function useLandscape(): boolean {
  return useMediaQuery("(orientation: landscape)");
}

/** Phone rotated / any very short viewport (skill landscape-short). */
export function useLandscapeShort(): boolean {
  return useMediaQuery("(orientation: landscape) and (max-height: 500px)");
}

/**
 * Combined viewport hint for adaptive marketing/auth layouts.
 * Prefer CSS for layout; use this only for behavior (e.g. stacked vs side-by-side data fetch UI).
 */
export function useAdaptiveLayout() {
  const phone = useMediaQuery(mqMax(BREAKPOINTS.md - 1));
  const tablet = useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.nav - 1}px)`,
  );
  const landscape = useLandscape();
  const shortLandscape = useLandscapeShort();
  return {
    phone,
    tablet,
    landscape,
    shortLandscape,
    /** Compact chrome: phone portrait, or short landscape viewport. */
    compact: phone || shortLandscape,
  };
}

/** CSS Grid track list that never forces page overflow on narrow screens. */
export function fluidAutoFill(minPx: number): string {
  return `repeat(auto-fill, minmax(min(100%, ${minPx}px), 1fr))`;
}

/** Same as fluidAutoFill but uses auto-fit (collapses empty tracks). */
export function fluidAutoFit(minPx: number): string {
  return `repeat(auto-fit, minmax(min(100%, ${minPx}px), 1fr))`;
}
