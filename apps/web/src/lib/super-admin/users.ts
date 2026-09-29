import "server-only";

import * as Sentry from "@sentry/nextjs";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  accountMembers,
  accounts,
  catalogCompanies,
  workspaceCreditLedger,
} from "@/db/schema";
import { listCognitoUsers } from "@/lib/auth/cognito-client";
import { captureIntegrationException } from "@/lib/sentry/capture";
import type { ListPageSize } from "@/lib/list-pagination";
import {
  assembleSuperAdminUserRows,
  buildCognitoListStreams,
  buildOffsetUsersCursor,
  encodeUsersCursor,
  escapeIlikePattern,
  mapCognitoListUser,
  sortBySignedUpAt,
  type CognitoAdminUser,
  type CognitoListStreamId,
  type SuperAdminMembershipRow,
  type SuperAdminUsersCursor,
  type SuperAdminUsersResponse,
  type SuperAdminUsersSortDir,
} from "./user-lifecycle";

/** Cap Cognito ListUsers round-trips for an unfiltered signed-up sort scan. */
const MAX_POOL_SCAN_CALLS = 40;
/** Cap stream fan-out while searching (email + given + family + name). */
const MAX_SEARCH_LIST_CALLS = 8;

type StreamState = {
  id: CognitoListStreamId;
  filter?: string;
  token?: string;
  done: boolean;
};

function isRateLimited(
  result: Awaited<ReturnType<typeof listCognitoUsers>>,
): boolean {
  return !result.ok && result.reason === "rate_limited";
}

function pageSlice<T>(rows: T[], offset: number, limit: number): {
  page: T[];
  nextOffset: number | null;
} {
  const page = rows.slice(offset, offset + limit);
  const nextOffset = offset + limit < rows.length ? offset + limit : null;
  return { page, nextOffset };
}

async function collectCognitoPool(opts: {
  sort: SuperAdminUsersSortDir;
}): Promise<
  | { ok: true; users: CognitoAdminUser[] }
  | { ok: false; reason: "rate_limited" | "unknown" }
> {
  const byEmail = new Map<string, CognitoAdminUser>();
  let token: string | undefined;
  let calls = 0;
  let sawSuccess = false;

  while (calls < MAX_POOL_SCAN_CALLS) {
    calls += 1;
    const result = await listCognitoUsers({
      limit: 60,
      paginationToken: token,
    });
    if (!result.ok) {
      if (isRateLimited(result)) {
        return { ok: false, reason: "rate_limited" };
      }
      if (!sawSuccess) return { ok: false, reason: "unknown" };
      break;
    }
    sawSuccess = true;
    for (const raw of result.users) {
      const mapped = mapCognitoListUser(raw);
      if (!mapped) continue;
      if (!byEmail.has(mapped.email)) byEmail.set(mapped.email, mapped);
    }
    if (result.paginationToken) {
      token = result.paginationToken;
    } else {
      break;
    }
    if (result.users.length === 0) break;
  }

  return {
    ok: true,
    users: sortBySignedUpAt([...byEmail.values()], opts.sort),
  };
}

/**
 * Fan out Cognito prefix streams from the start (no resume). Caller pages via
 * offset after merge + signed-up sort so results stay stable across pages.
 */
async function collectCognitoSearchUsers(opts: {
  q: string;
}): Promise<
  | { ok: true; users: CognitoAdminUser[] }
  | { ok: false; reason: "rate_limited" | "unknown" }
> {
  const specs = buildCognitoListStreams(opts.q);
  const streams: StreamState[] = specs.map((spec) => ({
    id: spec.id,
    filter: spec.filter,
    done: false,
  }));

  const byEmail = new Map<string, CognitoAdminUser>();
  let calls = 0;
  let sawSuccess = false;
  const target = 180;

  while (byEmail.size < target && streams.some((s) => !s.done) && calls < MAX_SEARCH_LIST_CALLS) {
    for (const stream of streams) {
      if (byEmail.size >= target) break;
      if (stream.done) continue;
      calls += 1;
      const remaining = target - byEmail.size;
      const result = await listCognitoUsers({
        filter: stream.filter,
        limit: Math.min(60, Math.max(remaining, 1)),
        paginationToken: stream.token,
      });
      if (!result.ok) {
        if (isRateLimited(result)) {
          return { ok: false, reason: "rate_limited" };
        }
        stream.done = true;
        continue;
      }
      sawSuccess = true;
      for (const raw of result.users) {
        const mapped = mapCognitoListUser(raw);
        if (!mapped) continue;
        if (!byEmail.has(mapped.email)) byEmail.set(mapped.email, mapped);
      }
      if (result.paginationToken) {
        stream.token = result.paginationToken;
      } else {
        stream.done = true;
        stream.token = undefined;
      }
      if (result.users.length === 0) {
        stream.done = true;
      }
    }
  }

  if (!sawSuccess && byEmail.size === 0 && calls > 0) {
    return { ok: false, reason: "unknown" };
  }

  return { ok: true, users: [...byEmail.values()] };
}

async function loadMembershipsByEmails(
  emails: string[],
): Promise<SuperAdminMembershipRow[] | "unavailable"> {
  if (emails.length === 0) return [];
  try {
    const db = await getDb();
    const emailList = sql.join(
      emails.map((email) => sql`${email}`),
      sql`, `,
    );
    const rows = await db
      .select({
        email: accountMembers.userEmail,
        accountId: accounts.id,
        accountName: accounts.name,
        accountType: accounts.type,
        role: accountMembers.role,
        creatorEmail: accounts.creatorEmail,
        companyName: catalogCompanies.name,
        planSlug: workspaceCreditLedger.planSlug,
        cancelAtPeriodEnd: workspaceCreditLedger.cancelAtPeriodEnd,
        periodEndsAt: workspaceCreditLedger.currentPeriodEnd,
        topUpBalance: workspaceCreditLedger.topUpBalance,
        memberCreatedAt: accountMembers.createdAt,
      })
      .from(accountMembers)
      .innerJoin(accounts, eq(accountMembers.accountId, accounts.id))
      .leftJoin(
        workspaceCreditLedger,
        eq(workspaceCreditLedger.accountId, accounts.id),
      )
      .leftJoin(
        catalogCompanies,
        eq(catalogCompanies.id, accounts.primaryCompanyUuid),
      )
      .where(sql`lower(${accountMembers.userEmail}) in (${emailList})`);

    return rows.map((row) => ({
      email: row.email.trim().toLowerCase(),
      accountId: row.accountId,
      accountName: row.accountName,
      accountType: row.accountType,
      role: row.role,
      isCreator: row.creatorEmail.trim().toLowerCase() === row.email.trim().toLowerCase(),
      companyName: row.companyName,
      planSlug: row.planSlug,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd ?? false,
      periodEndsAt: row.periodEndsAt ? row.periodEndsAt.getTime() : null,
      topUpBalance: row.topUpBalance,
      memberCreatedAt: row.memberCreatedAt ? row.memberCreatedAt.toISOString() : null,
    }));
  } catch (error) {
    captureIntegrationException(error, {
      integration: "postgres",
      operation: "superAdminListUsersMemberships",
    });
    return "unavailable";
  }
}

async function listLocalUsersPage(opts: {
  q: string;
  limit: number;
  offset: number;
  sort: SuperAdminUsersSortDir;
}): Promise<
  | { ok: true; emails: string[]; nextOffset: number | null }
  | { ok: false }
> {
  try {
    const db = await getDb();
    const pattern = opts.q ? `%${escapeIlikePattern(opts.q.toLowerCase())}%` : null;
    const orderSql =
      opts.sort === "asc"
        ? sql`min(${accountMembers.createdAt}) asc nulls last, ${accountMembers.userEmail} asc`
        : sql`max(${accountMembers.createdAt}) desc nulls last, ${accountMembers.userEmail} asc`;
    const rows = await db
      .select({ email: accountMembers.userEmail })
      .from(accountMembers)
      .innerJoin(accounts, eq(accountMembers.accountId, accounts.id))
      .where(
        pattern
          ? sql`(
              lower(${accountMembers.userEmail}) like ${pattern}
              or lower(${accounts.name}) like ${pattern}
            )`
          : undefined,
      )
      .groupBy(accountMembers.userEmail)
      .orderBy(orderSql)
      .limit(opts.limit + 1)
      .offset(opts.offset);

    const emails = rows.map((row) => row.email.trim().toLowerCase());
    const hasMore = emails.length > opts.limit;
    const page = hasMore ? emails.slice(0, opts.limit) : emails;
    return {
      ok: true,
      emails: page,
      nextOffset: hasMore ? opts.offset + opts.limit : null,
    };
  } catch (error) {
    captureIntegrationException(error, {
      integration: "postgres",
      operation: "superAdminListUsersLocal",
    });
    return { ok: false };
  }
}

function localPlaceholderUser(
  email: string,
  createdAt: string | null = null,
): CognitoAdminUser {
  return {
    username: email,
    email,
    name: null,
    emailVerified: null,
    status: null,
    enabled: null,
    createdAt,
  };
}

function earliestMemberCreatedAt(
  memberships: SuperAdminMembershipRow[],
): Map<string, string | null> {
  const createdByEmail = new Map<string, string | null>();
  for (const row of memberships) {
    const prev = createdByEmail.get(row.email);
    if (!row.memberCreatedAt) continue;
    if (!prev || row.memberCreatedAt < prev) {
      createdByEmail.set(row.email, row.memberCreatedAt);
    }
  }
  return createdByEmail;
}

export async function listSuperAdminUsers(opts: {
  q: string;
  limit: ListPageSize;
  sort: SuperAdminUsersSortDir;
  cursor: SuperAdminUsersCursor | null;
}): Promise<
  | { ok: true; data: SuperAdminUsersResponse }
  | { ok: false; reason: "rate_limited" | "unavailable" }
> {
  return Sentry.startSpan({ name: "super-admin.list-users", op: "function" }, async () => {
    const poolConfigured = Boolean(process.env.COGNITO_USER_POOL_ID);

    if (!poolConfigured) {
      return listDbBackedUsersPage({
        q: opts.q,
        limit: opts.limit,
        sort: opts.sort,
        offset: opts.cursor?.o ?? 0,
      });
    }

    if (!opts.q) {
      return listCognitoPoolSortedPage(opts);
    }

    return listCognitoSearchPage(opts);
  });
}

async function listCognitoPoolSortedPage(opts: {
  limit: ListPageSize;
  sort: SuperAdminUsersSortDir;
  cursor: SuperAdminUsersCursor | null;
}): Promise<
  | { ok: true; data: SuperAdminUsersResponse }
  | { ok: false; reason: "rate_limited" | "unavailable" }
> {
  const collected = await collectCognitoPool({ sort: opts.sort });
  if (!collected.ok) {
    if (collected.reason === "rate_limited") {
      return { ok: false, reason: "rate_limited" };
    }
    return listDbBackedUsersPage({
      q: "",
      limit: opts.limit,
      sort: opts.sort,
      offset: opts.cursor?.o ?? 0,
      warning: "cognito_unavailable",
    });
  }

  const offset = opts.cursor?.o ?? 0;
  const { page, nextOffset } = pageSlice(collected.users, offset, opts.limit);
  const memberships = await loadMembershipsByEmails(page.map((user) => user.email));
  const warning = memberships === "unavailable" ? "memberships_unavailable" : undefined;
  const rows = assembleSuperAdminUserRows(
    page,
    memberships === "unavailable" ? [] : memberships,
  );

  return {
    ok: true,
    data: {
      users: rows,
      nextCursor:
        nextOffset == null
          ? null
          : encodeUsersCursor(
              buildOffsetUsersCursor({ q: "", sort: opts.sort, nextOffset }),
            ),
      warning,
    },
  };
}

async function listCognitoSearchPage(opts: {
  q: string;
  limit: ListPageSize;
  sort: SuperAdminUsersSortDir;
  cursor: SuperAdminUsersCursor | null;
}): Promise<
  | { ok: true; data: SuperAdminUsersResponse }
  | { ok: false; reason: "rate_limited" | "unavailable" }
> {
  const collected = await collectCognitoSearchUsers({ q: opts.q });
  if (!collected.ok) {
    if (collected.reason === "rate_limited") {
      return { ok: false, reason: "rate_limited" };
    }
    return listDbBackedUsersPage({
      q: opts.q,
      limit: opts.limit,
      sort: opts.sort,
      offset: opts.cursor?.o ?? 0,
      warning: "cognito_unavailable",
    });
  }

  const byEmail = new Map(collected.users.map((user) => [user.email, user]));

  // Contains-match via memberships fills Cognito prefix-only gaps.
  const local = await listLocalUsersPage({
    q: opts.q,
    limit: Math.max(opts.limit * 2, 40),
    offset: 0,
    sort: opts.sort,
  });
  if (local.ok) {
    for (const email of local.emails) {
      if (!byEmail.has(email)) {
        byEmail.set(email, localPlaceholderUser(email));
      }
    }
  }

  const merged = [...byEmail.values()];
  const membershipsForDates = await loadMembershipsByEmails(merged.map((u) => u.email));
  if (membershipsForDates !== "unavailable") {
    const createdByEmail = earliestMemberCreatedAt(membershipsForDates);
    for (const user of merged) {
      if (!user.createdAt) {
        user.createdAt = createdByEmail.get(user.email) ?? null;
      }
    }
  }

  const sorted = sortBySignedUpAt(merged, opts.sort);
  const offset = opts.cursor?.o ?? 0;
  const { page, nextOffset } = pageSlice(sorted, offset, opts.limit);
  const pageEmails = new Set(page.map((user) => user.email));
  const warning =
    membershipsForDates === "unavailable" ? "memberships_unavailable" : undefined;
  const pageMemberships =
    membershipsForDates === "unavailable"
      ? []
      : membershipsForDates.filter((row) => pageEmails.has(row.email));
  const rows = sortBySignedUpAt(
    assembleSuperAdminUserRows(page, pageMemberships),
    opts.sort,
  );

  return {
    ok: true,
    data: {
      users: rows,
      nextCursor:
        nextOffset == null
          ? null
          : encodeUsersCursor(
              buildOffsetUsersCursor({
                q: opts.q,
                sort: opts.sort,
                nextOffset,
              }),
            ),
      warning,
    },
  };
}

async function listDbBackedUsersPage(opts: {
  q: string;
  limit: ListPageSize;
  sort: SuperAdminUsersSortDir;
  offset: number;
  warning?: SuperAdminUsersResponse["warning"];
}): Promise<
  | { ok: true; data: SuperAdminUsersResponse }
  | { ok: false; reason: "unavailable" }
> {
  const local = await listLocalUsersPage({
    q: opts.q,
    limit: opts.limit,
    offset: opts.offset,
    sort: opts.sort,
  });
  if (!local.ok) return { ok: false, reason: "unavailable" };
  const memberships = await loadMembershipsByEmails(local.emails);
  if (memberships === "unavailable") {
    return { ok: false, reason: "unavailable" };
  }
  const createdByEmail = earliestMemberCreatedAt(memberships);
  const users = assembleSuperAdminUserRows(
    local.emails.map((email) =>
      localPlaceholderUser(email, createdByEmail.get(email) ?? null),
    ),
    memberships,
  );
  const sorted = sortBySignedUpAt(users, opts.sort);
  const nextCursor =
    local.nextOffset == null
      ? null
      : encodeUsersCursor(
          buildOffsetUsersCursor({
            q: opts.q,
            sort: opts.sort,
            nextOffset: local.nextOffset,
          }),
        );
  return {
    ok: true,
    data: { users: sorted, nextCursor, warning: opts.warning },
  };
}
