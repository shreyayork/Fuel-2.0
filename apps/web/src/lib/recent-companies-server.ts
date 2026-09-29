import "server-only";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { recentlyViewedCompanies } from "@/db/schema";
import {
  MAX_RECENT_COMPANIES,
  excludeClaimedCompany,
  isAccountOwnedCompany,
  isValidRecentEntry,
  recentCompaniesForAccount,
  type RecentCompany,
  type RecentCompanyInput,
} from "@/lib/recent-companies-shared";

function toRecentCompany(row: {
  companyUuid: string;
  name: string;
  accountId: string | null;
  domain: string | null;
  logoUrl: string | null;
  viewedAt: Date;
}): RecentCompany {
  return {
    uuid: row.companyUuid,
    name: row.name,
    accountId: row.accountId ?? undefined,
    domain: row.domain ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
    viewedAt: row.viewedAt.getTime(),
  };
}

async function trimToMax(userEmail: string): Promise<void> {
  const db = await getDb();
  const rows = await db
    .select({ id: recentlyViewedCompanies.id })
    .from(recentlyViewedCompanies)
    .where(eq(recentlyViewedCompanies.userEmail, userEmail))
    .orderBy(desc(recentlyViewedCompanies.viewedAt));
  if (rows.length <= MAX_RECENT_COMPANIES) return;
  const excess = rows.slice(MAX_RECENT_COMPANIES).map((r) => r.id);
  await db
    .delete(recentlyViewedCompanies)
    .where(inArray(recentlyViewedCompanies.id, excess));
}

/** List recents for sidebar: account-scoped + exclude claimed/primary. */
export async function listRecentCompanies(opts: {
  userEmail: string;
  accountId: string | null | undefined;
  primaryCompanyUuid: string | null | undefined;
}): Promise<RecentCompany[]> {
  const db = await getDb();
  const rows = await db
    .select({
      companyUuid: recentlyViewedCompanies.companyUuid,
      name: recentlyViewedCompanies.name,
      accountId: recentlyViewedCompanies.accountId,
      domain: recentlyViewedCompanies.domain,
      logoUrl: recentlyViewedCompanies.logoUrl,
      viewedAt: recentlyViewedCompanies.viewedAt,
    })
    .from(recentlyViewedCompanies)
    .where(
      and(
        eq(recentlyViewedCompanies.userEmail, opts.userEmail),
        opts.primaryCompanyUuid
          ? ne(recentlyViewedCompanies.companyUuid, opts.primaryCompanyUuid)
          : undefined,
      ),
    )
    .orderBy(desc(recentlyViewedCompanies.viewedAt))
    .limit(MAX_RECENT_COMPANIES * 2);

  const mapped = rows.map(toRecentCompany);
  return recentCompaniesForAccount(mapped, opts.accountId).slice(
    0,
    MAX_RECENT_COMPANIES,
  );
}

/**
 * Record a company visit. No-op when uuid is the account's claimed/primary
 * company. UPSERT by (user_email, company_uuid); then trim to max.
 */
export async function recordRecentCompanyVisit(opts: {
  userEmail: string;
  accountId: string;
  primaryCompanyUuid: string | null | undefined;
  entry: RecentCompanyInput;
}): Promise<RecentCompany[]> {
  const uuid = opts.entry.uuid.trim();
  const accountId = opts.accountId.trim();
  if (!uuid || !accountId) {
    return listRecentCompanies({
      userEmail: opts.userEmail,
      accountId,
      primaryCompanyUuid: opts.primaryCompanyUuid,
    });
  }
  if (opts.primaryCompanyUuid && uuid === opts.primaryCompanyUuid) {
    return listRecentCompanies({
      userEmail: opts.userEmail,
      accountId,
      primaryCompanyUuid: opts.primaryCompanyUuid,
    });
  }

  const accountOwned = isAccountOwnedCompany(uuid);
  const now = new Date();
  const db = await getDb();
  await db
    .insert(recentlyViewedCompanies)
    .values({
      id: crypto.randomUUID(),
      userEmail: opts.userEmail,
      companyUuid: uuid,
      accountId: accountOwned ? accountId : null,
      name: opts.entry.name.trim(),
      domain: opts.entry.domain?.trim() || null,
      logoUrl: opts.entry.logoUrl?.trim() || null,
      viewedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        recentlyViewedCompanies.userEmail,
        recentlyViewedCompanies.companyUuid,
      ],
      set: {
        name: opts.entry.name.trim(),
        domain: opts.entry.domain?.trim() || null,
        logoUrl: opts.entry.logoUrl?.trim() || null,
        accountId: accountOwned ? accountId : null,
        viewedAt: now,
      },
    });

  await trimToMax(opts.userEmail);
  return listRecentCompanies({
    userEmail: opts.userEmail,
    accountId,
    primaryCompanyUuid: opts.primaryCompanyUuid,
  });
}

export async function removeRecentCompanyVisit(opts: {
  userEmail: string;
  companyUuid: string;
  accountId: string | null | undefined;
  primaryCompanyUuid: string | null | undefined;
}): Promise<RecentCompany[]> {
  const uuid = opts.companyUuid.trim();
  if (uuid) {
    const db = await getDb();
    await db
      .delete(recentlyViewedCompanies)
      .where(
        and(
          eq(recentlyViewedCompanies.userEmail, opts.userEmail),
          eq(recentlyViewedCompanies.companyUuid, uuid),
        ),
      );
  }
  return listRecentCompanies({
    userEmail: opts.userEmail,
    accountId: opts.accountId,
    primaryCompanyUuid: opts.primaryCompanyUuid,
  });
}

/**
 * One-shot localStorage → DB merge. Preserves client viewedAt via GREATEST;
 * skips claimed company; then trims to max.
 */
export async function importRecentCompanies(opts: {
  userEmail: string;
  accountId: string;
  primaryCompanyUuid: string | null | undefined;
  entries: unknown[];
}): Promise<RecentCompany[]> {
  const db = await getDb();
  const primary = opts.primaryCompanyUuid ?? null;
  const cleaned = excludeClaimedCompany(
    opts.entries.filter(isValidRecentEntry),
    primary,
  );

  for (const entry of cleaned) {
    const uuid = entry.uuid.trim();
    const accountOwned = isAccountOwnedCompany(uuid);
    const accountId = accountOwned
      ? (entry.accountId ?? opts.accountId).trim()
      : null;
    const viewedAt = new Date(entry.viewedAt);
    if (Number.isNaN(viewedAt.getTime())) continue;

    await db
      .insert(recentlyViewedCompanies)
      .values({
        id: crypto.randomUUID(),
        userEmail: opts.userEmail,
        companyUuid: uuid,
        accountId,
        name: entry.name.trim(),
        domain: entry.domain?.trim() || null,
        logoUrl: entry.logoUrl?.trim() || null,
        viewedAt,
      })
      .onConflictDoUpdate({
        target: [
          recentlyViewedCompanies.userEmail,
          recentlyViewedCompanies.companyUuid,
        ],
        set: {
          name: entry.name.trim(),
          domain: entry.domain?.trim() || null,
          logoUrl: entry.logoUrl?.trim() || null,
          accountId,
          viewedAt: sql`GREATEST(${recentlyViewedCompanies.viewedAt}, ${viewedAt.toISOString()}::timestamp)`,
        },
      });
  }

  await trimToMax(opts.userEmail);
  return listRecentCompanies({
    userEmail: opts.userEmail,
    accountId: opts.accountId,
    primaryCompanyUuid: primary,
  });
}
