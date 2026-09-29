import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  ScanCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import {
  accounts,
  accountMembers,
  teams,
  teamMembers,
  userPreferences,
} from "../../../../apps/web/src/db/schema";

const LEGACY_REGION = "us-east-2";
const SUFFIX = process.env.LEGACY_SUFFIX;
if (!SUFFIX) {
  throw new Error("LEGACY_SUFFIX env var must be set (e.g. nefpqb4pzffbdofmn7s54gqfzm-stage).");
}
const ACCT_TABLE = `Account-${SUFFIX}`;
const ACCT_MEMBER_TABLE = `AccountMember-${SUFFIX}`;
const TEAM_TABLE = `Team-${SUFFIX}`;
const TEAM_MEMBER_TABLE = `TeamMember-${SUFFIX}`;
const USER_PREFS_TABLE = `UserPreferences-${SUFFIX}`;
// Mirrors the Fuel 1.0 `PREF_ACTIVE_ACCOUNT` key in src/sdk/Preferences.js.
const PREF_ACTIVE_ACCOUNT = "active_account";

const ddb = new DynamoDBClient({ region: LEGACY_REGION });

type Event = {
  userEmails?: string[];
  accountIds?: string[];
  dryRun?: boolean;
  /** If true, also scan legacy UserPreferences and copy every user's
   *  `active_account` preference into Fuel 2.0's user_preferences table. */
  importActiveAccountPrefs?: boolean;
  /** When true, skip the per-account migration loop entirely (for
   *  prefs-only re-runs that shouldn't churn the existing account_members). */
  prefsOnly?: boolean;
  /** When true, TRUNCATE accounts + user_preferences (and everything that
   *  cascades from accounts: account_members, teams, team_members, plus all
   *  the per-account data — watchlists, integrations, pipeline_companies,
   *  context_items, artifacts, etc.). Use to re-migrate from a different
   *  legacy source. Pass `confirm: "yes-wipe-everything"` to actually run. */
  nuclearWipe?: { confirm: string };
};

const s = (v?: AttributeValue | null): string | undefined => v?.S ?? undefined;
const sl = (v?: AttributeValue | null): string[] =>
  v?.L?.map((x) => x.S).filter((x): x is string => !!x) ?? [];

type AccountStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
type AccountType = "ORGANIZATION" | "PERSONAL";
type AccountRole = "owner" | "admin" | "member";

async function queryAll(
  table: string,
  indexName: string,
  keyName: string,
  keyValue: string,
): Promise<Record<string, AttributeValue>[]> {
  const out: Record<string, AttributeValue>[] = [];
  let ExclusiveStartKey: Record<string, AttributeValue> | undefined;
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: table,
        IndexName: indexName,
        KeyConditionExpression: "#k = :v",
        ExpressionAttributeNames: { "#k": keyName },
        ExpressionAttributeValues: { ":v": { S: keyValue } },
        ExclusiveStartKey,
      }),
    );
    for (const it of res.Items ?? []) out.push(it);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return out;
}

async function resolveDbUrl(): Promise<string> {
  const arn = process.env.DB_SECRET_ARN!;
  const proxy = process.env.DB_PROXY_ENDPOINT!;
  const sm = new SecretsManagerClient({});
  const res = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
  const creds = JSON.parse(res.SecretString!) as {
    username: string;
    password: string;
    dbname?: string;
  };
  return `postgres://${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@${proxy}:5432/${creds.dbname ?? "fuel"}?sslmode=require`;
}

async function findAccountIdsForUsers(emails: string[]): Promise<string[]> {
  const ids = new Set<string>();
  for (const email of emails) {
    const rows = await queryAll(ACCT_MEMBER_TABLE, "byAccountMember", "email", email);
    for (const row of rows) {
      const id = s(row.accountID);
      if (id) ids.add(id);
    }
  }
  return Array.from(ids);
}

/**
 * Import each legacy user's `active_account` preference into
 * user_preferences. Silently skips rows whose value doesn't match an
 * account we actually migrated — that's a no-op rather than a data error.
 */
async function importActiveAccountPreferences(
  db: NodePgDatabase,
  dryRun: boolean,
): Promise<{ scanned: number; written: number; skippedMissingAccount: number }> {
  let scanned = 0;
  let written = 0;
  let skipped = 0;
  let ExclusiveStartKey: Record<string, AttributeValue> | undefined;

  // Collect the valid account ids up front so we can skip preferences that
  // point at accounts we didn't import.
  const validAccountsRes = await db.execute(sql`SELECT id FROM accounts`);
  const validIds = new Set<string>(
    (validAccountsRes.rows as Array<{ id: string }>).map((r) => r.id),
  );

  do {
    const res = await ddb.send(
      new ScanCommand({
        TableName: USER_PREFS_TABLE,
        ExclusiveStartKey,
        FilterExpression: "#k = :k",
        ExpressionAttributeNames: { "#k": "key" },
        ExpressionAttributeValues: { ":k": { S: PREF_ACTIVE_ACCOUNT } },
      }),
    );
    for (const it of res.Items ?? []) {
      scanned += 1;
      const email = s(it.owner)?.toLowerCase();
      const accountId = s(it.value);
      if (!email || !accountId) continue;
      if (!validIds.has(accountId)) {
        skipped += 1;
        continue;
      }
      if (dryRun) {
        written += 1;
        continue;
      }
      await db
        .insert(userPreferences)
        .values({ userEmail: email, key: PREF_ACTIVE_ACCOUNT, value: accountId })
        .onConflictDoUpdate({
          target: [userPreferences.userEmail, userPreferences.key],
          set: { value: accountId, updatedAt: new Date() },
        });
      written += 1;
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return { scanned, written, skippedMissingAccount: skipped };
}

async function scanAllAccounts(): Promise<string[]> {
  const ids: string[] = [];
  let ExclusiveStartKey: Record<string, AttributeValue> | undefined;
  do {
    const res = await ddb.send(new ScanCommand({ TableName: ACCT_TABLE, ExclusiveStartKey }));
    for (const it of res.Items ?? []) {
      const id = s(it.id);
      if (id) ids.push(id);
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return ids;
}

async function migrateAccount(
  db: NodePgDatabase,
  legacyId: string,
  dryRun: boolean,
): Promise<{ id: string; members: number; teams: number; teamMembers: number } | null> {
  const acct = await ddb.send(
    new GetItemCommand({ TableName: ACCT_TABLE, Key: { id: { S: legacyId } } }),
  );
  if (!acct.Item) return null;
  const row = acct.Item;

  const name = s(row.name) ?? "(unnamed)";
  const type = (s(row.accountType) as AccountType | undefined) ?? "ORGANIZATION";
  const rawStatus = s(row.accountStatus);
  const status: AccountStatus =
    rawStatus === "TRIAL" || rawStatus === "ACTIVE" || rawStatus === "PAST_DUE" || rawStatus === "CANCELED"
      ? rawStatus
      : "ACTIVE";
  const planId = s(row.planID);
  const stripeCustomerId = s(row.stripeCustomerID);
  const creator = s(row.creator) ?? "";
  const trialStart = s(row.trialStart);
  const trialEnd = s(row.trialEnd);
  const ownerEmails = sl(row.owners);
  const createdAt = s(row.createdAt) ? new Date(s(row.createdAt)!) : new Date();
  const updatedAt = s(row.updatedAt) ? new Date(s(row.updatedAt)!) : createdAt;

  const memberRows = await queryAll(ACCT_MEMBER_TABLE, "byAccount", "accountID", legacyId);
  const teamRows = await queryAll(TEAM_TABLE, "teamsByAccount", "accountID", legacyId);

  let teamMemberTotal = 0;
  const teamMemberRowsByTeam = new Map<string, Record<string, AttributeValue>[]>();
  for (const trow of teamRows) {
    const tid = s(trow.id);
    if (!tid) continue;
    const tmRows = await queryAll(TEAM_MEMBER_TABLE, "byTeam", "teamID", tid);
    teamMemberRowsByTeam.set(tid, tmRows);
    teamMemberTotal += tmRows.length;
  }

  if (dryRun) {
    return {
      id: legacyId,
      members: memberRows.length + ownerEmails.length,
      teams: teamRows.length,
      teamMembers: teamMemberTotal,
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(accounts)
      .values({
        id: legacyId,
        name,
        type,
        status,
        planId,
        stripeCustomerId,
        creatorEmail: creator,
        trialStart,
        trialEnd,
        createdAt,
        updatedAt,
        legacyId,
      })
      .onConflictDoUpdate({
        target: accounts.id,
        set: { name, type, status, planId, stripeCustomerId, creatorEmail: creator, trialStart, trialEnd, updatedAt },
      });

    await tx.execute(sql`DELETE FROM account_members WHERE account_id = ${legacyId}`);
    const memberMap = new Map<string, AccountRole>();
    for (const email of ownerEmails) memberMap.set(email, "owner");
    for (const mr of memberRows) {
      const email = s(mr.email);
      if (!email) continue;
      if (!memberMap.has(email)) memberMap.set(email, "member");
    }
    if (!memberMap.has(creator) && creator) memberMap.set(creator, "owner");
    if (memberMap.size > 0) {
      await tx.insert(accountMembers).values(
        Array.from(memberMap.entries()).map(([email, role]) => ({
          accountId: legacyId,
          userEmail: email,
          role,
          acceptedAt: createdAt,
        })),
      );
    }

    await tx.execute(sql`DELETE FROM team_members WHERE team_id IN (SELECT id FROM teams WHERE account_id = ${legacyId})`);
    await tx.execute(sql`DELETE FROM teams WHERE account_id = ${legacyId}`);
    for (const trow of teamRows) {
      const tid = s(trow.id);
      if (!tid) continue;
      const tname = s(trow.name) ?? "(team)";
      const tdesc = s(trow.description) ?? null;
      const tcreated = s(trow.createdAt) ? new Date(s(trow.createdAt)!) : new Date();
      await tx.insert(teams).values({
        id: tid,
        accountId: legacyId,
        name: tname,
        description: tdesc,
        createdAt: tcreated,
        legacyId: tid,
      });
      const tmRows = teamMemberRowsByTeam.get(tid) ?? [];
      const tmInserts = tmRows
        .map((r) => s(r.email))
        .filter((e): e is string => !!e)
        .map((email) => ({ teamId: tid, userEmail: email }));
      if (tmInserts.length > 0) {
        await tx.insert(teamMembers).values(tmInserts).onConflictDoNothing();
      }
    }
  });

  return {
    id: legacyId,
    members: new Set([...ownerEmails, ...memberRows.map((m) => s(m.email)).filter(Boolean)]).size,
    teams: teamRows.length,
    teamMembers: teamMemberTotal,
  };
}

export const handler = async (event: Event = {}) => {
  const dryRun = event.dryRun === true;
  const pool = new Pool({
    connectionString: await resolveDbUrl(),
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  try {
    if (event.nuclearWipe?.confirm === "yes-wipe-everything") {
      // Order: child tables first (no FKs back), then accounts. user_preferences
      // is independent so we drop it explicitly.
      await db.execute(sql`DELETE FROM user_preferences`);
      await db.execute(sql`DELETE FROM accounts`); // cascades to account_members, teams, watchlists, integrations, etc.
      return { ok: true, wiped: true };
    }

    let accountIds: string[] = [];
    if (event.prefsOnly) {
      accountIds = [];
    } else if (event.accountIds && event.accountIds.length > 0) {
      accountIds = event.accountIds;
    } else if (event.userEmails && event.userEmails.length > 0) {
      accountIds = await findAccountIdsForUsers(event.userEmails);
    } else {
      accountIds = await scanAllAccounts();
    }

    let totalMembers = 0;
    let totalTeams = 0;
    let totalTeamMembers = 0;
    const migrated: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of accountIds) {
      try {
        const result = await migrateAccount(db, id, dryRun);
        if (result) {
          migrated.push(result.id);
          totalMembers += result.members;
          totalTeams += result.teams;
          totalTeamMembers += result.teamMembers;
        }
      } catch (e) {
        errors.push({ id, error: (e as Error).message });
      }
    }

    let prefsReport: Awaited<ReturnType<typeof importActiveAccountPreferences>> | null = null;
    if (event.importActiveAccountPrefs) {
      prefsReport = await importActiveAccountPreferences(db, dryRun);
    }

    return {
      ok: true,
      dryRun,
      scanned: accountIds.length,
      migrated: migrated.length,
      members: totalMembers,
      teams: totalTeams,
      teamMembers: totalTeamMembers,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
      prefsReport,
    };
  } finally {
    await pool.end();
  }
};
