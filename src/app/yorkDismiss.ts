/**
 * York suggested-card dismiss — LinkedIn-like hide controls.
 *
 * LinkedIn docs: “I don’t want to see this” on a feed post says you won’t see
 * *that post* again. For ads, hide / “not interested” only reduces frequency;
 * LinkedIn does not publish a fixed “shows again in N days” rule, and cached
 * ads can still appear briefly.
 *
 * Fuel is explicit instead:
 * - Hide for now → suppress this offer id for 14 days
 * - Don’t show again → suppress this offer id until cleared (local only for now)
 */

const STORAGE_KEY = "fuel.york.dismiss.v1";
export const YORK_HIDE_FOR_MS = 14 * 24 * 60 * 60 * 1000;

type DismissEntry = {
  /** epoch ms; omit or null = permanent for this offer id */
  until?: number | null;
  mode: "hide" | "forever";
};

type DismissMap = Record<string, DismissEntry>;

function readMap(): DismissMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DismissMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: DismissMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

export function isYorkOfferDismissed(offerId: string, now = Date.now()): boolean {
  const entry = readMap()[offerId];
  if (!entry) return false;
  if (entry.mode === "forever" || entry.until == null) return true;
  if (entry.until > now) return true;
  // Expired hide — clean up
  const next = { ...readMap() };
  delete next[offerId];
  writeMap(next);
  return false;
}

export function dismissYorkOffer(offerId: string, mode: "hide" | "forever", now = Date.now()) {
  const map = readMap();
  map[offerId] = mode === "forever"
    ? { mode: "forever", until: null }
    : { mode: "hide", until: now + YORK_HIDE_FOR_MS };
  writeMap(map);
}

export function clearYorkOfferDismiss(offerId: string) {
  const map = readMap();
  delete map[offerId];
  writeMap(map);
}

/** Filter offers the user has hidden (for carousels / ranked lists). */
export function filterDismissedYorkOffers<T extends { id: string }>(offers: T[], now = Date.now()): T[] {
  return offers.filter(offer => !isYorkOfferDismissed(offer.id, now));
}
