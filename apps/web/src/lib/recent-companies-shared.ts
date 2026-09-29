/**
 * Shared types + pure helpers for recently viewed companies.
 * Client and server both import from here — no I/O.
 */

export const MAX_RECENT_COMPANIES = 12;
export const CATALOG_UUID_PREFIX = "cat_";

export interface RecentCompany {
  uuid: string;
  name: string;
  /** Required for account-owned catalog companies; ignored for global companies. */
  accountId?: string;
  domain?: string;
  logoUrl?: string;
  viewedAt: number;
}

export type RecentCompanyInput = Omit<RecentCompany, "viewedAt" | "accountId"> & {
  accountId?: string;
};

export function isAccountOwnedCompany(uuid: string): boolean {
  return uuid.startsWith(CATALOG_UUID_PREFIX);
}

export function isValidRecentEntry(x: unknown): x is RecentCompany {
  if (typeof x !== "object" || x == null) return false;
  const e = x as Partial<RecentCompany>;
  if (typeof e.uuid !== "string" || !e.uuid.trim()) return false;
  if (typeof e.name !== "string" || !e.name.trim()) return false;
  if (typeof e.viewedAt !== "number" || !Number.isFinite(e.viewedAt)) return false;
  // Legacy global entries remain valid. Legacy catalog entries lack safe
  // account ownership and must be dropped.
  if (
    isAccountOwnedCompany(e.uuid) &&
    (typeof e.accountId !== "string" || !e.accountId.trim())
  ) {
    return false;
  }
  return true;
}

/** Global companies plus catalog companies owned by the active account. */
export function recentCompaniesForAccount(
  entries: RecentCompany[],
  accountId: string | null | undefined,
): RecentCompany[] {
  return entries.filter(
    (r) =>
      !isAccountOwnedCompany(r.uuid) ||
      (!!accountId && r.accountId === accountId),
  );
}

/** Drop the account's claimed/primary company from a list. */
export function excludeClaimedCompany(
  entries: RecentCompany[],
  primaryCompanyUuid: string | null | undefined,
): RecentCompany[] {
  if (!primaryCompanyUuid) return entries;
  return entries.filter((e) => e.uuid !== primaryCompanyUuid);
}
