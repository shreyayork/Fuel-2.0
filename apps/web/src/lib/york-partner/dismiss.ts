/**
 * York partner card dismiss — temporary hide / don’t show again.
 * Persisted in `user_preferences` (Cognito email). CTA never writes dismiss.
 */
import {
  DEFAULT_MARKETING_BANNER_DISMISS_DAYS,
  isYorkOfferId,
} from "./constants";
import { marketingBannerDismissHideMs, coerceMarketingBannerDismissDays } from "./banner-settings-shared";

export const LEGACY_DISMISS_STORAGE_KEY = "fuel.york.dismiss.v1";

export type YorkDismissEntry = {
  /** epoch ms; omit or null = permanent for this offer id */
  until?: number | null;
  mode: "hide" | "forever";
};

export type YorkDismissMap = Record<string, YorkDismissEntry>;

export function coerceYorkDismissEntry(value: unknown): YorkDismissEntry | null {
  if (typeof value !== "object" || value == null) return null;
  const obj = value as Record<string, unknown>;
  if (obj.mode === "forever") {
    return { mode: "forever", until: null };
  }
  if (obj.mode !== "hide") return null;
  if (typeof obj.until !== "number" || !Number.isFinite(obj.until)) return null;
  return { mode: "hide", until: Math.floor(obj.until) };
}

export function parseYorkDismissMap(raw: string | null | undefined): YorkDismissMap {
  if (!raw) return {};
  try {
    return coerceYorkDismissMap(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function coerceYorkDismissMap(value: unknown): YorkDismissMap {
  if (typeof value !== "object" || value == null || Array.isArray(value)) {
    return {};
  }
  const next: YorkDismissMap = {};
  for (const [offerId, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!isYorkOfferId(offerId)) continue;
    const coerced = coerceYorkDismissEntry(entry);
    if (coerced) next[offerId] = coerced;
  }
  return next;
}

export function serializeYorkDismissMap(map: YorkDismissMap): string {
  return JSON.stringify(pruneExpiredYorkDismissMap(map));
}

export function isYorkDismissEntryActive(
  entry: YorkDismissEntry | undefined,
  now = Date.now(),
): boolean {
  if (!entry) return false;
  if (entry.mode === "forever" || entry.until == null) return true;
  return entry.until > now;
}

export function pruneExpiredYorkDismissMap(
  map: YorkDismissMap,
  now = Date.now(),
): YorkDismissMap {
  const next: YorkDismissMap = {};
  for (const [offerId, entry] of Object.entries(map)) {
    if (isYorkDismissEntryActive(entry, now)) next[offerId] = entry;
  }
  return next;
}

export function isYorkOfferDismissed(
  offerId: string,
  map: YorkDismissMap,
  now = Date.now(),
): boolean {
  return isYorkDismissEntryActive(map[offerId], now);
}

export function yorkDismissEntryForMode(
  mode: "hide" | "forever",
  now = Date.now(),
  hideDays = DEFAULT_MARKETING_BANNER_DISMISS_DAYS,
): YorkDismissEntry {
  return mode === "forever"
    ? { mode: "forever", until: null }
    : { mode: "hide", until: now + marketingBannerDismissHideMs(hideDays) };
}

export function applyYorkOfferDismiss(
  map: YorkDismissMap,
  offerId: string,
  mode: "hide" | "forever",
  now = Date.now(),
  hideDays = DEFAULT_MARKETING_BANNER_DISMISS_DAYS,
): YorkDismissMap {
  if (!isYorkOfferId(offerId)) return pruneExpiredYorkDismissMap(map, now);
  const next = pruneExpiredYorkDismissMap(map, now);
  next[offerId] = yorkDismissEntryForMode(mode, now, hideDays);
  return next;
}

/** Fill offer ids that are not already active on the server. */
export function mergeLegacyYorkDismissMap(
  server: YorkDismissMap,
  legacy: YorkDismissMap,
  now = Date.now(),
): YorkDismissMap {
  const next = pruneExpiredYorkDismissMap(server, now);
  for (const [offerId, entry] of Object.entries(pruneExpiredYorkDismissMap(legacy, now))) {
    if (!isYorkOfferId(offerId)) continue;
    if (isYorkDismissEntryActive(next[offerId], now)) continue;
    next[offerId] = entry;
  }
  return next;
}

export function yorkDismissMapsEqual(a: YorkDismissMap, b: YorkDismissMap): boolean {
  return serializeYorkDismissMap(a) === serializeYorkDismissMap(b);
}

export function readLegacyYorkDismissMap(): YorkDismissMap {
  if (typeof window === "undefined") return {};
  try {
    return parseYorkDismissMap(window.localStorage.getItem(LEGACY_DISMISS_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function clearLegacyYorkDismissStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_DISMISS_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

let memoryMap: YorkDismissMap = {};
let dismissHideDays = DEFAULT_MARKETING_BANNER_DISMISS_DAYS;
let hydrated = false;
let loadPromise: Promise<YorkDismissMap> | null = null;
const listeners = new Set<() => void>();

function notifyYorkDismissListeners() {
  for (const listener of listeners) listener();
}

export function isYorkPartnerDismissHydrated(): boolean {
  return hydrated;
}

export function getYorkPartnerDismissMap(): YorkDismissMap {
  return memoryMap;
}

export function getMarketingBannerDismissDaysClient(): number {
  return dismissHideDays;
}

export function subscribeYorkPartnerDismiss(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setMemoryMap(map: YorkDismissMap, now = Date.now()) {
  memoryMap = pruneExpiredYorkDismissMap(map, now);
  hydrated = true;
  notifyYorkDismissListeners();
}

async function patchYorkPartnerDismiss(body: unknown): Promise<YorkDismissMap | null> {
  try {
    const res = await fetch("/api/york-partner/dismiss", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return coerceYorkDismissMap(await res.json());
  } catch {
    return null;
  }
}

async function loadMarketingBannerDismissDaysFromNetwork(): Promise<number> {
  try {
    const res = await fetch("/api/york-partner/banner-settings", { method: "GET" });
    if (!res.ok) return DEFAULT_MARKETING_BANNER_DISMISS_DAYS;
    const body = (await res.json()) as { dismissHideDays?: unknown };
    return coerceMarketingBannerDismissDays(body.dismissHideDays);
  } catch {
    return DEFAULT_MARKETING_BANNER_DISMISS_DAYS;
  }
}

async function loadYorkPartnerDismissMapFromNetwork(): Promise<YorkDismissMap> {
  const now = Date.now();
  const [hideDays, mapResult] = await Promise.all([
    loadMarketingBannerDismissDaysFromNetwork(),
    (async () => {
      try {
        const res = await fetch("/api/york-partner/dismiss", { method: "GET" });
        if (!res.ok) return pruneExpiredYorkDismissMap(readLegacyYorkDismissMap(), now);
        const server = coerceYorkDismissMap(await res.json());
        const legacy = readLegacyYorkDismissMap();
        const merged = mergeLegacyYorkDismissMap(server, legacy, now);
        if (!yorkDismissMapsEqual(server, merged)) {
          const patched = await patchYorkPartnerDismiss({ merge: legacy });
          if (patched) {
            clearLegacyYorkDismissStorage();
            return pruneExpiredYorkDismissMap(patched, now);
          }
          return merged;
        }
        clearLegacyYorkDismissStorage();
        return pruneExpiredYorkDismissMap(server, now);
      } catch {
        return pruneExpiredYorkDismissMap(readLegacyYorkDismissMap(), now);
      }
    })(),
  ]);
  dismissHideDays = hideDays;
  return mapResult;
}

export async function loadYorkPartnerDismissMap(): Promise<YorkDismissMap> {
  if (hydrated) return memoryMap;
  if (!loadPromise) {
    loadPromise = loadYorkPartnerDismissMapFromNetwork()
      .then((map) => {
        setMemoryMap(map);
        return memoryMap;
      })
      .finally(() => {
        loadPromise = null;
      });
  }
  return loadPromise;
}

export function dismissYorkOffer(offerId: string, mode: "hide" | "forever"): void {
  const now = Date.now();
  setMemoryMap(
    applyYorkOfferDismiss(memoryMap, offerId, mode, now, dismissHideDays),
    now,
  );
  void patchYorkPartnerDismiss({ offerId, mode });
}
