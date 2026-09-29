import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userPreferences } from "@/db/schema";
import {
  mergeWorkspaceTourPrefs,
  parseWorkspaceTourPrefs,
  serializeWorkspaceTourPrefs,
  type WorkspaceTourPrefs,
} from "@/lib/workspace-tour/tour-prefs";
import { getMarketingBannerDismissDays } from "@/lib/york-partner/banner-settings";
import {
  applyYorkOfferDismiss,
  coerceYorkDismissMap,
  mergeLegacyYorkDismissMap,
  parseYorkDismissMap,
  pruneExpiredYorkDismissMap,
  serializeYorkDismissMap,
  type YorkDismissMap,
} from "@/lib/york-partner/dismiss";

export const PREF_ACTIVE_ACCOUNT = "active_account";
/** JSON `{ takenAt, snoozedUntil }` — workspace org tour, per Cognito email. */
export const PREF_WORKSPACE_TOUR = "workspace_tour";
/**
 * JSON `{ status: pending|done|failed, updatedAt }` — Fuel 1.0 watchlist
 * migration gate (written by watchlist-migration Lambda on onboard claim).
 */
export const PREF_LEGACY_WATCHLISTS_MIGRATION = "legacy_watchlists_migration";
/** JSON map of York partner offer ids → `{ mode, until }` — per Cognito email. */
export const PREF_YORK_PARTNER_DISMISS = "york_partner_dismiss";

export async function getUserPreference(opts: {
  userEmail: string;
  key: string;
}): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ value: userPreferences.value })
    .from(userPreferences)
    .where(
      and(
        eq(userPreferences.userEmail, opts.userEmail),
        eq(userPreferences.key, opts.key),
      ),
    )
    .limit(1);
  return row?.value ?? null;
}

export async function setUserPreference(opts: {
  userEmail: string;
  key: string;
  value: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .insert(userPreferences)
    .values({
      userEmail: opts.userEmail,
      key: opts.key,
      value: opts.value,
    })
    .onConflictDoUpdate({
      target: [userPreferences.userEmail, userPreferences.key],
      set: { value: opts.value, updatedAt: new Date() },
    });
}

export async function getWorkspaceTourPrefs(userEmail: string): Promise<WorkspaceTourPrefs> {
  const raw = await getUserPreference({ userEmail, key: PREF_WORKSPACE_TOUR });
  return parseWorkspaceTourPrefs(raw);
}

/** Idempotent upsert; merges patch onto current prefs. */
export async function updateWorkspaceTourPrefs(
  userEmail: string,
  patch: Partial<WorkspaceTourPrefs>,
): Promise<WorkspaceTourPrefs> {
  const current = await getWorkspaceTourPrefs(userEmail);
  const next = mergeWorkspaceTourPrefs(current, patch);
  await setUserPreference({
    userEmail,
    key: PREF_WORKSPACE_TOUR,
    value: serializeWorkspaceTourPrefs(next),
  });
  return next;
}

export async function getYorkPartnerDismissMap(
  userEmail: string,
): Promise<YorkDismissMap> {
  const raw = await getUserPreference({
    userEmail,
    key: PREF_YORK_PARTNER_DISMISS,
  });
  return pruneExpiredYorkDismissMap(parseYorkDismissMap(raw));
}

async function saveYorkPartnerDismissMap(
  userEmail: string,
  map: YorkDismissMap,
): Promise<YorkDismissMap> {
  await setUserPreference({
    userEmail,
    key: PREF_YORK_PARTNER_DISMISS,
    value: serializeYorkDismissMap(map),
  });
  return parseYorkDismissMap(serializeYorkDismissMap(map));
}

export async function dismissYorkPartnerOffer(opts: {
  userEmail: string;
  offerId: string;
  mode: "hide" | "forever";
}): Promise<YorkDismissMap> {
  const hideDays = await getMarketingBannerDismissDays();
  const current = await getYorkPartnerDismissMap(opts.userEmail);
  const next = applyYorkOfferDismiss(
    current,
    opts.offerId,
    opts.mode,
    Date.now(),
    hideDays,
  );
  return saveYorkPartnerDismissMap(opts.userEmail, next);
}

export async function mergeYorkPartnerDismissMap(
  userEmail: string,
  incoming: unknown,
): Promise<YorkDismissMap> {
  const current = await getYorkPartnerDismissMap(userEmail);
  const next = mergeLegacyYorkDismissMap(
    current,
    coerceYorkDismissMap(incoming),
  );
  return saveYorkPartnerDismissMap(userEmail, next);
}
