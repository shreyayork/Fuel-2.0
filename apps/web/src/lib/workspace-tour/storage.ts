import { TOUR_FIRST_SESSION_KEY } from "./constants";
import {
  coerceWorkspaceTourPrefs,
  EMPTY_TOUR_PREFS,
  LEGACY_TOUR_STORAGE_KEYS,
  type WorkspaceTourPrefs,
} from "./tour-prefs";

/** Mark post-onboarding first workspace visit for this browser tab session. */
export function markFirstWorkspaceSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TOUR_FIRST_SESSION_KEY, "1");
  } catch {
    // Ignore storage failures.
  }
}

export function isFirstWorkspaceSessionMarked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(TOUR_FIRST_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Drop obsolete browser-scoped tour keys (not migrated — unsafe across accounts). */
export function clearLegacyTourLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_TOUR_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures.
  }
}

export async function fetchWorkspaceTourPrefs(): Promise<WorkspaceTourPrefs> {
  try {
    const res = await fetch("/api/workspace-tour", { method: "GET" });
    if (!res.ok) return { ...EMPTY_TOUR_PREFS };
    return coerceWorkspaceTourPrefs(await res.json());
  } catch {
    return { ...EMPTY_TOUR_PREFS };
  }
}

/** Fire-and-forget persist. Returns server prefs on success, null on failure. */
export async function patchWorkspaceTourPrefs(
  patch: Partial<WorkspaceTourPrefs>,
): Promise<WorkspaceTourPrefs | null> {
  try {
    const res = await fetch("/api/workspace-tour", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return null;
    return coerceWorkspaceTourPrefs(await res.json());
  } catch {
    return null;
  }
}
