import { TOUR_TAKEN_COOLDOWN_MS } from "./constants";

/** Persisted in `user_preferences` under `PREF_WORKSPACE_TOUR`. */
export type WorkspaceTourPrefs = {
  /** Epoch ms when tour was last completed; 0 = never. */
  takenAt: number;
  /** Epoch ms until which the entry banner stays hidden; 0 = not snoozed. */
  snoozedUntil: number;
};

export const EMPTY_TOUR_PREFS: WorkspaceTourPrefs = {
  takenAt: 0,
  snoozedUntil: 0,
};

/** Legacy browser keys — cleared on load; never migrated (cross-account unsafe). */
export const LEGACY_TOUR_STORAGE_KEYS = [
  "fuelWorkspaceTourTakenAt",
  "fuelWorkspaceTourTaken",
  "fuelTourPromptSnoozedUntil",
] as const;

export function coerceWorkspaceTourPrefs(value: unknown): WorkspaceTourPrefs {
  if (typeof value !== "object" || value == null) return { ...EMPTY_TOUR_PREFS };
  const obj = value as Record<string, unknown>;
  return {
    takenAt: toNonNegInt(obj.takenAt),
    snoozedUntil: toNonNegInt(obj.snoozedUntil),
  };
}

export function parseWorkspaceTourPrefs(raw: string | null | undefined): WorkspaceTourPrefs {
  if (!raw) return { ...EMPTY_TOUR_PREFS };
  try {
    return coerceWorkspaceTourPrefs(JSON.parse(raw) as unknown);
  } catch {
    return { ...EMPTY_TOUR_PREFS };
  }
}

export function serializeWorkspaceTourPrefs(prefs: WorkspaceTourPrefs): string {
  return JSON.stringify({
    takenAt: prefs.takenAt > 0 ? prefs.takenAt : 0,
    snoozedUntil: prefs.snoozedUntil > 0 ? prefs.snoozedUntil : 0,
  });
}

export function mergeWorkspaceTourPrefs(
  current: WorkspaceTourPrefs,
  patch: Partial<WorkspaceTourPrefs>,
): WorkspaceTourPrefs {
  return {
    takenAt: patch.takenAt !== undefined ? Math.max(0, patch.takenAt) : current.takenAt,
    snoozedUntil:
      patch.snoozedUntil !== undefined ? Math.max(0, patch.snoozedUntil) : current.snoozedUntil,
  };
}

export function isTourPromptSnoozed(
  prefs: WorkspaceTourPrefs,
  now: number = Date.now(),
): boolean {
  return prefs.snoozedUntil > 0 && now < prefs.snoozedUntil;
}

/** Banner stays hidden after Maybe Later (snooze window) or any prior completion. */
export function shouldHideTourPrompt(
  prefs: WorkspaceTourPrefs,
  now: number = Date.now(),
): boolean {
  return prefs.takenAt > 0 || isTourPromptSnoozed(prefs, now);
}

export function wasTourTakenRecently(
  prefs: WorkspaceTourPrefs,
  now: number = Date.now(),
): boolean {
  return prefs.takenAt > 0 && now - prefs.takenAt < TOUR_TAKEN_COOLDOWN_MS;
}

export function completedTourPrefs(now: number = Date.now()): Partial<WorkspaceTourPrefs> {
  return { takenAt: now };
}

export function clearedCompletionPrefs(): Partial<WorkspaceTourPrefs> {
  return { takenAt: 0 };
}

export function snoozedTourPrefs(now: number = Date.now()): Partial<WorkspaceTourPrefs> {
  return { snoozedUntil: now + TOUR_TAKEN_COOLDOWN_MS };
}

function toNonNegInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}
