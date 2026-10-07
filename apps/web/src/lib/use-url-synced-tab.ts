"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** Merge `patch` into the current query. `null` deletes a key. */
export function patchSearchParams(
  current: URLSearchParams,
  patch: Record<string, string | null>,
): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
  }
  return params.toString();
}

/** Patch so `current` becomes `next` (keys only in current are deleted). */
export function searchPatchToMatch(
  current: URLSearchParams,
  next: URLSearchParams,
): Record<string, string | null> {
  const patch: Record<string, string | null> = {};
  const keys = new Set([...current.keys(), ...next.keys()]);
  for (const key of keys) {
    const n = next.get(key);
    const c = current.get(key);
    if (n === c) continue;
    patch[key] = n;
  }
  return patch;
}

/**
 * Update the query string without an App Router navigation.
 * `router.push` / `replace` on `?tab=` refetches the whole force-dynamic
 * company page (seconds of wait). History writes keep the URL shareable.
 */
export function applyClientSearchPatch(
  pathname: string,
  patch: Record<string, string | null>,
  mode: "push" | "replace" = "replace",
  hash: string = window.location.hash,
): string {
  const qs = patchSearchParams(
    new URLSearchParams(window.location.search),
    patch,
  );
  const url = `${pathname}${qs ? `?${qs}` : ""}${hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (url === current) return url;
  if (mode === "push") {
    window.history.pushState(window.history.state, "", url);
  } else {
    window.history.replaceState(window.history.state, "", url);
  }
  window.dispatchEvent(new Event("fuel:client-search"));
  return url;
}

function readWindowSearch(): string {
  return window.location.search.replace(/^\?/, "");
}

/**
 * Same-path in-app links (`?tab=intelligence`, `/company/x?tab=research`) must
 * not go through App Router — that refetch stalls, and tab state would miss
 * the query change. Capture-phase so we win over Next `<Link>`.
 */
function interceptSamePathQueryClick(e: MouseEvent): void {
  if (e.defaultPrevented) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const target = e.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest("a");
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
    return;
  }
  const href = anchor.getAttribute("href");
  if (
    !href ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  ) {
    return;
  }
  let next: URL;
  try {
    next = new URL(href, window.location.href);
  } catch {
    return;
  }
  if (next.origin !== window.location.origin) return;
  if (next.pathname !== window.location.pathname) return;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const dest = `${next.pathname}${next.search}${next.hash}`;
  if (dest === current) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  applyClientSearchPatch(
    next.pathname,
    searchPatchToMatch(
      new URLSearchParams(window.location.search),
      next.searchParams,
    ),
    "push",
    next.hash,
  );
  if (next.hash.length > 1) {
    const id = decodeURIComponent(next.hash.slice(1));
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }
}

/** Live query string that follows {@link applyClientSearchPatch} + Back/Forward. */
export function useClientSearchQuery(): URLSearchParams {
  const pathname = usePathname();
  const nextSearch = useSearchParams();
  const [qs, setQs] = useState(() => nextSearch.toString());

  useEffect(() => {
    setQs(readWindowSearch());
  }, [pathname, nextSearch]);

  useEffect(() => {
    const sync = () => setQs(readWindowSearch());
    window.addEventListener("popstate", sync);
    window.addEventListener("fuel:client-search", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("fuel:client-search", sync);
    };
  }, []);

  return new URLSearchParams(qs);
}

/**
 * Tab state synced to a URL search param. Keeps tabs back-button-friendly
 * and shareable — pasting a link to /company/xyz?tab=signals lands the
 * reader on the Signals tab instead of whatever the default is.
 *
 * Behavior:
 *   - Reads the initial value from `?<paramName>=…`; falls back to
 *     `defaultValue` when the param is missing or isn't in `validKeys`.
 *   - setActive(next) updates React state immediately and pushStates the
 *     query (no RSC round-trip). Browser Back restores the previous tab.
 *   - Same-path `?tab=` links are intercepted so they switch screens instantly.
 */
export function useUrlSyncedTab<T extends string>(opts: {
  paramName: string;
  validKeys: readonly T[];
  defaultValue: T;
  /** When false, the default tab keeps `?<param>=default` in the URL.
   *  Needed on founder company pages so the server stays on CompanyPublicView. */
  stripDefaultFromUrl?: boolean;
  /** Map legacy / alias query values onto a valid key before parsing. */
  mapRaw?: (raw: string) => string;
}): [T, (next: T) => void] {
  const {
    paramName,
    validKeys,
    defaultValue,
    stripDefaultFromUrl = true,
    mapRaw,
  } = opts;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parse = useCallback(
    (raw: string | null): T => {
      if (!raw) return defaultValue;
      const mapped = mapRaw ? mapRaw(raw) : raw;
      return (validKeys as readonly string[]).includes(mapped)
        ? (mapped as T)
        : defaultValue;
    },
    [validKeys, defaultValue, mapRaw],
  );

  const [active, setActiveState] = useState(() =>
    parse(searchParams.get(paramName)),
  );

  const syncFromWindow = useCallback(() => {
    setActiveState(
      parse(new URLSearchParams(window.location.search).get(paramName)),
    );
  }, [parse, paramName]);

  // Pathname / Next search changes (other company, hard Link). Always read
  // window.location so a stale Next snapshot cannot snap the tab backwards
  // after applyClientSearchPatch.
  useEffect(() => {
    syncFromWindow();
  }, [pathname, searchParams, syncFromWindow]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => interceptSamePathQueryClick(e);
    window.addEventListener("popstate", syncFromWindow);
    window.addEventListener("fuel:client-search", syncFromWindow);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("popstate", syncFromWindow);
      window.removeEventListener("fuel:client-search", syncFromWindow);
      document.removeEventListener("click", onClick, true);
    };
  }, [syncFromWindow]);

  const setActive = useCallback(
    (next: T) => {
      setActiveState((prev) => {
        if (next === prev) return prev;
        applyClientSearchPatch(
          pathname,
          {
            [paramName]:
              next === defaultValue && stripDefaultFromUrl ? null : next,
          },
          "push",
        );
        return next;
      });
    },
    [pathname, paramName, defaultValue, stripDefaultFromUrl],
  );

  return [active, setActive];
}
