import "server-only";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  watchlists,
  watchlistCompanies,
  watchlistFollowers,
  watchlistShares,
  watchlistTeams,
  type Watchlist,
} from "@/db/schema";
import { listTeamIdsForUser } from "@/lib/accounts";

export type ScopeFilter =
  | "all"
  | "portfolios"
  | "watchlists"
  | "mine"
  | "account"
  | "team"
  | "private"
  | "shared"
  | "starred";
export type Cadence = "off" | "daily" | "weekly" | "monthly";
export type WatchlistKind = "portfolio" | "watchlist";
export type WatchlistScope = "private" | "account" | "team";

export class DuplicateWatchlistNameError extends Error {
  readonly code = "DUPLICATE_WATCHLIST_NAME" as const;
  readonly kind: WatchlistKind;

  constructor(kind: WatchlistKind) {
    const label = kind === "portfolio" ? "portfolio" : "watchlist";
    super(`A ${label} with this name already exists.`);
    this.name = "DuplicateWatchlistNameError";
    this.kind = kind;
  }
}

export function isDuplicateWatchlistNameError(error: unknown): error is DuplicateWatchlistNameError {
  return (
    error instanceof DuplicateWatchlistNameError ||
    (error instanceof Error && error.name === "DuplicateWatchlistNameError")
  );
}

export interface WatchlistListItem extends Watchlist {
  companyCount: number;
  companyPreview: { uuid: string; name: string | null }[];
  follower: { cadence: Cadence; starred: boolean } | null;
  shareCount: number;
  teamIds: string[];
}

/**
 * Watchlist ids the user can see because they belong to a team linked via
 * `watchlist_teams` and the watchlist scope is `team`.
 */
async function teamAccessibleWatchlistIds(
  userEmail: string,
  accountId: string,
): Promise<string[]> {
  const teamIds = await listTeamIdsForUser({ accountId, userEmail });
  if (teamIds.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select({ watchlistId: watchlistTeams.watchlistId })
    .from(watchlistTeams)
    .innerJoin(watchlists, eq(watchlistTeams.watchlistId, watchlists.id))
    .where(
      and(
        eq(watchlists.accountId, accountId),
        eq(watchlists.scope, "team"),
        inArray(watchlistTeams.teamId, teamIds),
      ),
    );
  return [...new Set(rows.map((r) => r.watchlistId))];
}

async function assertUniqueWatchlistName(opts: {
  accountId: string;
  kind: WatchlistKind;
  name: string;
  excludeId?: string;
}): Promise<void> {
  const db = await getDb();
  const normalized = opts.name.trim().toLowerCase();
  const conditions = [
    eq(watchlists.accountId, opts.accountId),
    eq(watchlists.kind, opts.kind),
    sql`lower(${watchlists.name}) = ${normalized}`,
  ];
  if (opts.excludeId) {
    conditions.push(sql`${watchlists.id} <> ${opts.excludeId}`);
  }
  const [existing] = await db
    .select({ id: watchlists.id })
    .from(watchlists)
    .where(and(...conditions))
    .limit(1);
  if (existing) {
    throw new DuplicateWatchlistNameError(opts.kind);
  }
}

async function previewCompaniesFor(
  watchlistIds: string[],
): Promise<Record<string, WatchlistListItem["companyPreview"]>> {
  if (watchlistIds.length === 0) return {};
  const db = await getDb();
  const rows = await db
    .select({
      watchlistId: watchlistCompanies.watchlistId,
      companyUuid: watchlistCompanies.companyUuid,
      name: watchlistCompanies.name,
      addedAt: watchlistCompanies.addedAt,
    })
    .from(watchlistCompanies)
    .where(inArray(watchlistCompanies.watchlistId, watchlistIds));

  const grouped: Record<string, WatchlistListItem["companyPreview"]> = {};
  const perWatchlist = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!perWatchlist.has(r.watchlistId)) perWatchlist.set(r.watchlistId, []);
    perWatchlist.get(r.watchlistId)!.push(r);
  }
  for (const [id, items] of perWatchlist.entries()) {
    const sorted = items
      .slice()
      .sort((a, b) => (b.addedAt?.getTime() ?? 0) - (a.addedAt?.getTime() ?? 0))
      .slice(0, 5)
      .map((r) => ({ uuid: r.companyUuid, name: r.name }));
    grouped[id] = sorted;
  }
  return grouped;
}

export async function listWatchlists(opts: {
  userEmail: string;
  accountId: string;
  scope: ScopeFilter;
  kind?: "portfolio" | "watchlist";
}): Promise<WatchlistListItem[]> {
  const db = await getDb();
  const { userEmail, accountId, scope } = opts;

  // Which watchlists can this user see *on this account*? Visibility rules
  // (own / shared / follower / account-scoped / team-scoped) are AND-gated by
  // accountId so switching accounts changes what you see.
  const sharedIdRows = await db
    .select({ id: watchlistShares.watchlistId })
    .from(watchlistShares)
    .where(eq(watchlistShares.userEmail, userEmail));
  const followerIdRows = await db
    .select({ id: watchlistFollowers.watchlistId })
    .from(watchlistFollowers)
    .where(eq(watchlistFollowers.userEmail, userEmail));
  const teamAccessible = await teamAccessibleWatchlistIds(userEmail, accountId);
  const accessibleIds = new Set([
    ...sharedIdRows.map((r) => r.id),
    ...followerIdRows.map((r) => r.id),
    ...teamAccessible,
  ]);

  const base = await db
    .select()
    .from(watchlists)
    .where(
      and(
        eq(watchlists.accountId, accountId),
        or(
          eq(watchlists.ownerEmail, userEmail),
          accessibleIds.size > 0 ? inArray(watchlists.id, Array.from(accessibleIds)) : sql`false`,
          eq(watchlists.scope, "account"),
        ),
      ),
    )
    .orderBy(desc(watchlists.updatedAt));

  const ids = base.map((w) => w.id);
  const [previews, counts, followersByMe, sharesAll, teamLinks] = await Promise.all([
    previewCompaniesFor(ids),
    ids.length > 0
      ? db
          .select({
            watchlistId: watchlistCompanies.watchlistId,
            n: sql<string>`count(*)::text`,
          })
          .from(watchlistCompanies)
          .where(inArray(watchlistCompanies.watchlistId, ids))
          .groupBy(watchlistCompanies.watchlistId)
      : Promise.resolve([] as Array<{ watchlistId: string; n: string }>),
    db
      .select()
      .from(watchlistFollowers)
      .where(eq(watchlistFollowers.userEmail, userEmail)),
    ids.length > 0
      ? db
          .select({ watchlistId: watchlistShares.watchlistId, n: sql<string>`count(*)::text` })
          .from(watchlistShares)
          .where(inArray(watchlistShares.watchlistId, ids))
          .groupBy(watchlistShares.watchlistId)
      : Promise.resolve([] as Array<{ watchlistId: string; n: string }>),
    ids.length > 0
      ? db
          .select({
            watchlistId: watchlistTeams.watchlistId,
            teamId: watchlistTeams.teamId,
          })
          .from(watchlistTeams)
          .where(inArray(watchlistTeams.watchlistId, ids))
      : Promise.resolve([] as Array<{ watchlistId: string; teamId: string }>),
  ]);

  const countsById = new Map(counts.map((c) => [c.watchlistId, Number(c.n)]));
  const shareById = new Map(sharesAll.map((c) => [c.watchlistId, Number(c.n)]));
  const followerById = new Map(followersByMe.map((f) => [f.watchlistId, f]));
  const teamsById = new Map<string, string[]>();
  for (const link of teamLinks) {
    const list = teamsById.get(link.watchlistId) ?? [];
    list.push(link.teamId);
    teamsById.set(link.watchlistId, list);
  }

  const items: WatchlistListItem[] = base.map((w) => {
    const f = followerById.get(w.id);
    return {
      ...w,
      companyCount: countsById.get(w.id) ?? 0,
      companyPreview: previews[w.id] ?? [],
      follower: f ? { cadence: f.cadence, starred: f.starred } : null,
      shareCount: shareById.get(w.id) ?? 0,
      teamIds: teamsById.get(w.id) ?? [],
    };
  });

  const filtered = items.filter((w) => {
    if (opts.kind && w.kind !== opts.kind) return false;
    switch (scope) {
      case "all":
        return true;
      case "portfolios":
        return w.kind === "portfolio";
      case "watchlists":
        return w.kind === "watchlist";
      case "mine":
        return w.ownerEmail === userEmail;
      case "account":
        return w.scope === "account";
      case "team":
        return w.scope === "team";
      case "private":
        return w.scope === "private" && w.ownerEmail === userEmail;
      case "shared":
        return w.ownerEmail !== userEmail;
      case "starred":
        return w.follower?.starred === true;
      default:
        return true;
    }
  });

  return filtered;
}

export interface WatchlistMembership {
  id: string;
  name: string;
  kind: "portfolio" | "watchlist";
  scope: WatchlistScope;
  ownerEmail: string;
  contains: boolean;
}

/**
 * Watchlists the user can see AND add to, flagged with whether this
 * company is already a member. Powers the "Add to watchlist" menu on
 * the company page.
 */
export async function listWatchlistMembershipsForCompany(opts: {
  userEmail: string;
  accountId: string;
  companyUuid: string;
  kind?: "portfolio" | "watchlist";
}): Promise<WatchlistMembership[]> {
  const db = await getDb();
  const { userEmail, accountId, companyUuid } = opts;

  const sharedIdRows = await db
    .select({ id: watchlistShares.watchlistId })
    .from(watchlistShares)
    .where(eq(watchlistShares.userEmail, userEmail));
  const teamAccessible = await teamAccessibleWatchlistIds(userEmail, accountId);
  const accessibleIds = new Set([
    ...sharedIdRows.map((r) => r.id),
    ...teamAccessible,
  ]);

  const accessible = await db
    .select()
    .from(watchlists)
    .where(
      and(
        eq(watchlists.accountId, accountId),
        or(
          eq(watchlists.ownerEmail, userEmail),
          accessibleIds.size > 0 ? inArray(watchlists.id, Array.from(accessibleIds)) : sql`false`,
          eq(watchlists.scope, "account"),
        ),
      ),
    )
    .orderBy(desc(watchlists.updatedAt));

  const filtered = opts.kind ? accessible.filter((w) => w.kind === opts.kind) : accessible;
  if (filtered.length === 0) return [];

  const memberRows = await db
    .select({ watchlistId: watchlistCompanies.watchlistId })
    .from(watchlistCompanies)
    .where(
      and(
        eq(watchlistCompanies.companyUuid, companyUuid),
        inArray(
          watchlistCompanies.watchlistId,
          filtered.map((w) => w.id),
        ),
      ),
    );
  const memberSet = new Set(memberRows.map((r) => r.watchlistId));

  return filtered.map((w) => ({
    id: w.id,
    name: w.name,
    kind: w.kind,
    scope: w.scope,
    ownerEmail: w.ownerEmail,
    contains: memberSet.has(w.id),
  }));
}

/**
 * Whether `userEmail` may view this watchlist under `accountId`. Enforces
 * owner / share / follower / account scope / team membership. Returns false
 * when the watchlist belongs to another account.
 */
export async function userCanViewWatchlist(opts: {
  watchlist: Watchlist;
  userEmail: string;
  accountId: string;
}): Promise<boolean> {
  const { watchlist: wl, userEmail, accountId } = opts;
  if (!wl.accountId || wl.accountId !== accountId) return false;
  if (wl.ownerEmail === userEmail) return true;
  if (wl.scope === "account") return true;

  const db = await getDb();
  const [share] = await db
    .select({ watchlistId: watchlistShares.watchlistId })
    .from(watchlistShares)
    .where(
      and(
        eq(watchlistShares.watchlistId, wl.id),
        eq(watchlistShares.userEmail, userEmail),
      ),
    )
    .limit(1);
  if (share) return true;

  const [follower] = await db
    .select({ watchlistId: watchlistFollowers.watchlistId })
    .from(watchlistFollowers)
    .where(
      and(
        eq(watchlistFollowers.watchlistId, wl.id),
        eq(watchlistFollowers.userEmail, userEmail),
      ),
    )
    .limit(1);
  if (follower) return true;

  if (wl.scope === "team") {
    const teamAccessible = await teamAccessibleWatchlistIds(userEmail, accountId);
    if (teamAccessible.includes(wl.id)) return true;
  }

  return false;
}

export async function getWatchlist(id: string): Promise<Watchlist | null> {
  const db = await getDb();
  const [row] = await db.select().from(watchlists).where(eq(watchlists.id, id));
  return row ?? null;
}

/**
 * All watchlists on an account (no visibility filter). Used by Account → Teams
 * so admins can grant team-level access to any list in the workspace.
 */
export async function listAllWatchlistsForAccount(accountId: string): Promise<
  Array<Pick<Watchlist, "id" | "name" | "kind" | "scope" | "ownerEmail">>
> {
  const db = await getDb();
  return db
    .select({
      id: watchlists.id,
      name: watchlists.name,
      kind: watchlists.kind,
      scope: watchlists.scope,
      ownerEmail: watchlists.ownerEmail,
    })
    .from(watchlists)
    .where(eq(watchlists.accountId, accountId))
    .orderBy(watchlists.name);
}

export async function getWatchlistCompanies(id: string) {
  const db = await getDb();
  return db
    .select()
    .from(watchlistCompanies)
    .where(eq(watchlistCompanies.watchlistId, id))
    .orderBy(desc(watchlistCompanies.addedAt));
}

export async function createWatchlist(opts: {
  name: string;
  ownerEmail: string;
  accountId: string;
  scope?: WatchlistScope;
  description?: string;
  kind?: WatchlistKind;
  fundName?: string;
  teamIds?: string[];
}): Promise<Watchlist> {
  const kind = opts.kind ?? "watchlist";
  const name = opts.name.trim();
  await assertUniqueWatchlistName({ accountId: opts.accountId, kind, name });
  const db = await getDb();
  const id = randomUUID();
  const scope = opts.scope ?? "private";
  const [row] = await db
    .insert(watchlists)
    .values({
      id,
      name,
      description: opts.description,
      kind,
      fundName: opts.fundName ?? null,
      scope,
      ownerEmail: opts.ownerEmail,
      accountId: opts.accountId,
    })
    .returning();
  if (scope === "team" && opts.teamIds && opts.teamIds.length > 0) {
    await setWatchlistTeams(id, opts.teamIds);
  }
  return row;
}

export async function addCompanyToWatchlist(opts: {
  watchlistId: string;
  companyUuid: string;
  name?: string | null;
  addedByEmail?: string;
}) {
  const db = await getDb();
  await db
    .insert(watchlistCompanies)
    .values({
      watchlistId: opts.watchlistId,
      companyUuid: opts.companyUuid,
      name: opts.name ?? null,
      addedByEmail: opts.addedByEmail,
    })
    .onConflictDoNothing();
  await db.update(watchlists).set({ updatedAt: new Date() }).where(eq(watchlists.id, opts.watchlistId));
}

export async function removeCompanyFromWatchlist(watchlistId: string, companyUuid: string) {
  const db = await getDb();
  await db
    .delete(watchlistCompanies)
    .where(
      and(eq(watchlistCompanies.watchlistId, watchlistId), eq(watchlistCompanies.companyUuid, companyUuid)),
    );
  await db.update(watchlists).set({ updatedAt: new Date() }).where(eq(watchlists.id, watchlistId));
}

export async function setFollower(opts: {
  watchlistId: string;
  userEmail: string;
  cadence?: Cadence;
  starred?: boolean;
}) {
  const db = await getDb();
  const existing = await db
    .select()
    .from(watchlistFollowers)
    .where(
      and(
        eq(watchlistFollowers.watchlistId, opts.watchlistId),
        eq(watchlistFollowers.userEmail, opts.userEmail),
      ),
    );
  if (opts.cadence === "off" && existing[0] && opts.starred !== true) {
    // Unfollowing entirely.
    await db
      .delete(watchlistFollowers)
      .where(
        and(
          eq(watchlistFollowers.watchlistId, opts.watchlistId),
          eq(watchlistFollowers.userEmail, opts.userEmail),
        ),
      );
    return;
  }
  await db
    .insert(watchlistFollowers)
    .values({
      watchlistId: opts.watchlistId,
      userEmail: opts.userEmail,
      cadence: opts.cadence ?? existing[0]?.cadence ?? "weekly",
      starred: opts.starred ?? existing[0]?.starred ?? false,
    })
    .onConflictDoUpdate({
      target: [watchlistFollowers.watchlistId, watchlistFollowers.userEmail],
      set: {
        cadence: opts.cadence ?? existing[0]?.cadence ?? "weekly",
        starred: opts.starred ?? existing[0]?.starred ?? false,
      },
    });
}

export async function renameWatchlist(id: string, name: string) {
  const db = await getDb();
  const trimmed = name.trim();
  const [existing] = await db
    .select({
      id: watchlists.id,
      accountId: watchlists.accountId,
      kind: watchlists.kind,
    })
    .from(watchlists)
    .where(eq(watchlists.id, id))
    .limit(1);
  if (!existing?.accountId) {
    await db.update(watchlists).set({ name: trimmed, updatedAt: new Date() }).where(eq(watchlists.id, id));
    return;
  }
  await assertUniqueWatchlistName({
    accountId: existing.accountId,
    kind: existing.kind,
    name: trimmed,
    excludeId: id,
  });
  await db.update(watchlists).set({ name: trimmed, updatedAt: new Date() }).where(eq(watchlists.id, id));
}

export async function deleteWatchlist(id: string) {
  const db = await getDb();
  await db.delete(watchlists).where(eq(watchlists.id, id));
}

export async function setScope(
  id: string,
  scope: WatchlistScope,
  teamIds?: string[],
) {
  const db = await getDb();
  await db.update(watchlists).set({ scope, updatedAt: new Date() }).where(eq(watchlists.id, id));
  if (scope === "team") {
    if (teamIds !== undefined) {
      await setWatchlistTeams(id, teamIds);
    }
  } else {
    await db.delete(watchlistTeams).where(eq(watchlistTeams.watchlistId, id));
  }
}

/**
 * Override which benchmark metrics a portfolio surfaces. Passing an empty
 * array clears the override (the portfolio goes back to the default set);
 * passing null wipes it explicitly — same result, different intent.
 */
export async function setBenchmarkMetricIds(
  id: string,
  metricIds: string[] | null,
): Promise<void> {
  const db = await getDb();
  const next = metricIds && metricIds.length > 0 ? metricIds : null;
  await db
    .update(watchlists)
    .set({ benchmarkMetricIds: next, updatedAt: new Date() })
    .where(eq(watchlists.id, id));
}

export async function listWatchlistTeamIds(watchlistId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(watchlistTeams)
    .where(eq(watchlistTeams.watchlistId, watchlistId));
  return rows.map((r) => r.teamId);
}

/** @deprecated Prefer listWatchlistTeamIds. */
export async function listTeams(watchlistId: string): Promise<string[]> {
  return listWatchlistTeamIds(watchlistId);
}

/**
 * Replace the set of teams that may access a team-scoped watchlist.
 * Empty `teamIds` clears all links (owner-only until teams are reassigned).
 */
export async function setWatchlistTeams(
  watchlistId: string,
  teamIds: string[],
): Promise<void> {
  const db = await getDb();
  const unique = [...new Set(teamIds.map((id) => id.trim()).filter(Boolean))];
  await db.delete(watchlistTeams).where(eq(watchlistTeams.watchlistId, watchlistId));
  if (unique.length === 0) return;
  await db.insert(watchlistTeams).values(
    unique.map((teamId) => ({ watchlistId, teamId })),
  );
  await db
    .update(watchlists)
    .set({ updatedAt: new Date() })
    .where(eq(watchlists.id, watchlistId));
}

/**
 * Ensure `teamId` is linked to the watchlist and scope is `team`. Used from
 * the Account → Teams screen when granting team-level access.
 */
export async function linkWatchlistToTeam(opts: {
  watchlistId: string;
  teamId: string;
}): Promise<void> {
  const db = await getDb();
  const existing = await listWatchlistTeamIds(opts.watchlistId);
  if (!existing.includes(opts.teamId)) {
    await db
      .insert(watchlistTeams)
      .values({ watchlistId: opts.watchlistId, teamId: opts.teamId })
      .onConflictDoNothing();
  }
  await db
    .update(watchlists)
    .set({ scope: "team", updatedAt: new Date() })
    .where(eq(watchlists.id, opts.watchlistId));
}

export async function unlinkWatchlistFromTeam(opts: {
  watchlistId: string;
  teamId: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .delete(watchlistTeams)
    .where(
      and(
        eq(watchlistTeams.watchlistId, opts.watchlistId),
        eq(watchlistTeams.teamId, opts.teamId),
      ),
    );
  await db
    .update(watchlists)
    .set({ updatedAt: new Date() })
    .where(eq(watchlists.id, opts.watchlistId));
}

export async function listWatchlistShareEmails(watchlistId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ userEmail: watchlistShares.userEmail })
    .from(watchlistShares)
    .where(eq(watchlistShares.watchlistId, watchlistId))
    .orderBy(watchlistShares.userEmail);
  return rows.map((r) => r.userEmail);
}

export async function listWatchlistSharesByAccount(
  accountId: string,
): Promise<Map<string, string[]>> {
  const db = await getDb();
  const rows = await db
    .select({
      watchlistId: watchlistShares.watchlistId,
      userEmail: watchlistShares.userEmail,
    })
    .from(watchlistShares)
    .innerJoin(watchlists, eq(watchlistShares.watchlistId, watchlists.id))
    .where(eq(watchlists.accountId, accountId))
    .orderBy(watchlistShares.userEmail);
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.watchlistId) ?? [];
    list.push(row.userEmail);
    map.set(row.watchlistId, list);
  }
  return map;
}

export async function listWatchlistTeamLinksByAccount(
  accountId: string,
): Promise<Map<string, string[]>> {
  const db = await getDb();
  const rows = await db
    .select({
      watchlistId: watchlistTeams.watchlistId,
      teamId: watchlistTeams.teamId,
    })
    .from(watchlistTeams)
    .innerJoin(watchlists, eq(watchlistTeams.watchlistId, watchlists.id))
    .where(eq(watchlists.accountId, accountId));
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.watchlistId) ?? [];
    list.push(row.teamId);
    map.set(row.watchlistId, list);
  }
  return map;
}

export async function addWatchlistShare(opts: {
  watchlistId: string;
  userEmail: string;
  role?: string;
}): Promise<void> {
  const email = opts.userEmail.trim().toLowerCase();
  if (!email) return;
  const db = await getDb();
  await db
    .insert(watchlistShares)
    .values({
      watchlistId: opts.watchlistId,
      userEmail: email,
      role: opts.role ?? "viewer",
    })
    .onConflictDoNothing();
  await db
    .update(watchlists)
    .set({ updatedAt: new Date() })
    .where(eq(watchlists.id, opts.watchlistId));
}

export async function removeWatchlistShare(opts: {
  watchlistId: string;
  userEmail: string;
}): Promise<void> {
  const email = opts.userEmail.trim().toLowerCase();
  const db = await getDb();
  await db
    .delete(watchlistShares)
    .where(
      and(
        eq(watchlistShares.watchlistId, opts.watchlistId),
        eq(watchlistShares.userEmail, email),
      ),
    );
  await db
    .update(watchlists)
    .set({ updatedAt: new Date() })
    .where(eq(watchlists.id, opts.watchlistId));
}
