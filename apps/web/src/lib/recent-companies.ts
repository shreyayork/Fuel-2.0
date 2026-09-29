"use client";

/**
 * Client helpers for recently viewed companies. Persistence lives on the
 * server; this module talks to /api/recent-companies and notifies the shell
 * via `fuel:recents-updated`.
 */

import {
  isValidRecentEntry,
  type RecentCompany,
  type RecentCompanyInput,
} from "@/lib/recent-companies-shared";

export {
  MAX_RECENT_COMPANIES,
  excludeClaimedCompany,
  isAccountOwnedCompany,
  isValidRecentEntry,
  recentCompaniesForAccount,
  type RecentCompany,
  type RecentCompanyInput,
} from "@/lib/recent-companies-shared";

const LEGACY_KEY = "fuel:recent-companies";
const MIGRATED_KEY = "fuel:recent-companies:migrated";

function notifyRecentsUpdated(entries?: RecentCompany[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("fuel:recents-updated", {
      detail: entries ? { entries } : undefined,
    }),
  );
}

export function readLegacyLocalRecentCompanies(): RecentCompany[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRecentEntry);
  } catch {
    return [];
  }
}

export function clearLegacyLocalRecentCompanies(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_KEY);
    window.localStorage.setItem(MIGRATED_KEY, "1");
  } catch {
    // Quota / private mode — not fatal.
  }
}

export function hasMigratedLegacyRecents(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(MIGRATED_KEY) === "1";
  } catch {
    return false;
  }
}

export async function fetchRecentCompanies(): Promise<RecentCompany[]> {
  const res = await fetch("/api/recent-companies", { method: "GET" });
  if (!res.ok) return [];
  const json = (await res.json()) as { entries?: unknown };
  if (!Array.isArray(json.entries)) return [];
  return json.entries.filter(isValidRecentEntry);
}

export async function recordRecentCompany(
  entry: Omit<RecentCompanyInput, "accountId"> & { accountId: string },
): Promise<RecentCompany[]> {
  try {
    const res = await fetch("/api/recent-companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uuid: entry.uuid,
        name: entry.name,
        domain: entry.domain,
        logoUrl: entry.logoUrl,
      }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { entries?: unknown };
    const entries = Array.isArray(json.entries)
      ? json.entries.filter(isValidRecentEntry)
      : [];
    notifyRecentsUpdated(entries);
    return entries;
  } catch {
    return [];
  }
}

export async function removeRecentCompany(
  uuid: string,
): Promise<RecentCompany[]> {
  try {
    const res = await fetch(
      `/api/recent-companies?uuid=${encodeURIComponent(uuid.trim())}`,
      { method: "DELETE" },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { entries?: unknown };
    const entries = Array.isArray(json.entries)
      ? json.entries.filter(isValidRecentEntry)
      : [];
    notifyRecentsUpdated(entries);
    return entries;
  } catch {
    return [];
  }
}

/** One-shot localStorage → DB. Idempotent via migrated flag. */
export async function migrateLegacyRecentCompanies(): Promise<
  RecentCompany[] | null
> {
  if (typeof window === "undefined") return null;
  if (hasMigratedLegacyRecents()) return null;
  const legacy = readLegacyLocalRecentCompanies();
  if (legacy.length === 0) {
    clearLegacyLocalRecentCompanies();
    return null;
  }
  try {
    const res = await fetch("/api/recent-companies/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: legacy }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { entries?: unknown };
    const entries = Array.isArray(json.entries)
      ? json.entries.filter(isValidRecentEntry)
      : [];
    clearLegacyLocalRecentCompanies();
    notifyRecentsUpdated(entries);
    return entries;
  } catch {
    return null;
  }
}
