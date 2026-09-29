"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/** Shared drawer motion — matches Data Room / Signal detail sidebars. */
export const DRAWER_TRANSITION_MS = 260;
export const DRAWER_EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

export function drawerDurationMs(reducedMotion: boolean): number {
  return reducedMotion ? 0 : DRAWER_TRANSITION_MS;
}

/**
 * Keep a controlled drawer mounted through the exit transition.
 * Parent may flip `open` to false immediately; this hook delays unmount.
 */
export function useDrawerPresence(open: boolean): {
  mounted: boolean;
  visible: boolean;
  durationMs: number;
} {
  const reduced = usePrefersReducedMotion();
  const durationMs = drawerDurationMs(reduced);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    let timeout = 0;

    if (open) {
      setMounted(true);
      frame = requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      timeout = window.setTimeout(() => setMounted(false), durationMs);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [open, durationMs]);

  return { mounted, visible, durationMs };
}

/**
 * Mount-enter / animated-close for drawers that unmount when `onClose` clears parent state.
 */
export function useAnimatedDrawerClose(onClose: () => void): {
  visible: boolean;
  durationMs: number;
  requestClose: () => void;
} {
  const reduced = usePrefersReducedMotion();
  const durationMs = drawerDurationMs(reduced);
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(frame);
      if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const requestClose = useCallback(() => {
    setVisible(false);
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      onClose();
    }, durationMs);
  }, [onClose, durationMs]);

  return { visible, durationMs, requestClose };
}

export function drawerScrimMotionStyle(
  visible: boolean,
  durationMs: number,
): CSSProperties {
  return {
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: `opacity ${durationMs}ms ${DRAWER_EASE}`,
  };
}

export function drawerPanelMotionStyle(
  visible: boolean,
  durationMs: number,
  opts?: { from?: "right" | "left" },
): CSSProperties {
  const hidden =
    (opts?.from ?? "right") === "right" ? "translateX(100%)" : "translateX(-100%)";
  return {
    transform: visible ? "translateX(0)" : hidden,
    opacity: visible ? 1 : 0,
    transition: `transform ${durationMs}ms ${DRAWER_EASE}, opacity ${durationMs}ms ${DRAWER_EASE}`,
    willChange: durationMs > 0 ? "transform, opacity" : undefined,
  };
}
