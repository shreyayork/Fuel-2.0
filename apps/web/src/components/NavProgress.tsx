"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Lightweight navigation progress bar. Starts animating the moment the user
 * clicks an internal link or the AppShell's programmatic router.push runs,
 * and finishes when pathname/searchParams change (nav complete).
 *
 * Why we need this: pages are `dynamic = "force-dynamic"` and do server-side
 * data fetches (OpenSearch, Postgres, Neptune). That adds 200-800ms between
 * click and first paint — enough to make people wonder if the click landed.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "complete">("idle");
  const timers = useRef<{ start?: number; end?: number }>({});

  // --- Nav-start detection: hook document clicks on internal links.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank"
      ) {
        return;
      }
      // Internal only: same-origin path or relative.
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }
      } catch {
        return;
      }
      setState("loading");
    };
    // Capture phase so we catch before the router handles it.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // --- Nav-start detection: programmatic router.push (AppShell's goToPage).
  // We expose a global event hook so AppShell can signal "I just pushed".
  useEffect(() => {
    const onStart = () => setState("loading");
    window.addEventListener("fuel:nav-start", onStart);
    return () => window.removeEventListener("fuel:nav-start", onStart);
  }, []);

  // --- Nav-complete detection: pathname / searchParams changed.
  useEffect(() => {
    if (state !== "loading") return;
    setState("complete");
    // Hold the completed bar briefly so users see it finish.
    if (timers.current.end) window.clearTimeout(timers.current.end);
    timers.current.end = window.setTimeout(() => setState("idle"), 320);
    return () => {
      if (timers.current.end) window.clearTimeout(timers.current.end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  return (
    <>
      <style jsx>{`
        .fuel-nav-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #00B48A 40%,
            #ECD67F 60%,
            transparent 100%
          );
          transform-origin: 0 0;
          transform: scaleX(0);
          opacity: 0;
          pointer-events: none;
          z-index: 9999;
          transition: transform 0.4s ease-out, opacity 180ms ease;
        }
        .fuel-nav-bar.loading {
          transform: scaleX(0.75);
          opacity: 1;
          transition: transform 8s cubic-bezier(0.1, 0.8, 0.3, 0.99), opacity 120ms ease;
        }
        .fuel-nav-bar.complete {
          transform: scaleX(1);
          opacity: 1;
          transition: transform 180ms ease-out;
        }
      `}</style>
      <div className={`fuel-nav-bar ${state === "idle" ? "" : state}`} aria-hidden />
    </>
  );
}
