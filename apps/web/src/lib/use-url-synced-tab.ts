"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

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

/**
 * Tab state synced to a URL search param. Keeps tabs back-button-friendly
 * and shareable — pasting a link to /company/xyz?tab=signals lands the
 * reader on the Signals tab instead of whatever the default is.
 *
 * Behavior:
 *   - Reads the initial value from `?<paramName>=…`; falls back to
 *     `defaultValue` when the param is missing or isn't in `validKeys`.
 *   - setActive(next) pushes a new history entry (scroll preserved) so
 *     browser Back navigates through tab selections. If `next === default`,
 *     the param is stripped from the URL so canonical URLs stay clean.
 *   - Only the targeted param is touched; other search params (filters,
 *     search queries, ?connected=, …) pass through untouched.
 */
export function useUrlSyncedTab<T extends string>(opts: {
  paramName: string;
  validKeys: readonly T[];
  defaultValue: T;
  /** When false, the default tab keeps `?<param>=default` in the URL.
   *  Needed on founder company pages so the server stays on CompanyPublicView. */
  stripDefaultFromUrl?: boolean;
}): [T, (next: T) => void] {
  const { paramName, validKeys, defaultValue, stripDefaultFromUrl = true } = opts;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentRaw = searchParams.get(paramName);
  const active: T =
    currentRaw && (validKeys as readonly string[]).includes(currentRaw)
      ? (currentRaw as T)
      : defaultValue;

  const setActive = useCallback(
    (next: T) => {
      const current: T =
        currentRaw && (validKeys as readonly string[]).includes(currentRaw)
          ? (currentRaw as T)
          : defaultValue;
      if (next === current) return;

      const params = new URLSearchParams(searchParams.toString());
      if (next === defaultValue && stripDefaultFromUrl) {
        params.delete(paramName);
      } else {
        params.set(paramName, next);
      }
      const qs = params.toString();
      // Tab buttons are not <a> links — signal NavProgress the same way AppShell does.
      window.dispatchEvent(new Event("fuel:nav-start"));
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [
      currentRaw,
      pathname,
      searchParams,
      router,
      paramName,
      defaultValue,
      stripDefaultFromUrl,
      validKeys,
    ],
  );

  return [active, setActive];
}
