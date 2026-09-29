import {
  DynamoDBClient,
  ScanCommand,
  QueryCommand,
  type AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  watchlists,
  watchlistCompanies,
  watchlistShares,
  watchlistTeams,
  watchlistFollowers,
  userPreferences,
} from "../../../../apps/web/src/db/schema";
import { LEGACY_TABLES } from "../../lib/legacy-watchlist-tables";

const LEGACY_REGION = "us-east-2";
const LEGACY_ACCOUNT_TABLE = LEGACY_TABLES.account;
const LEGACY_WATCHLIST_TABLE = LEGACY_TABLES.watchlist;
const LEGACY_SETTING_TABLE = LEGACY_TABLES.watchlistSetting;
const LEGACY_USER_TABLE = LEGACY_TABLES.watchlistUser;
const LEGACY_TEAM_TABLE = LEGACY_TABLES.watchlistTeam;

/** user_preferences key for onboarding / per-user watchlist migration gate. */
const PREF_LEGACY_WATCHLISTS_MIGRATION = "legacy_watchlists_migration";
const PENDING_TTL_MS = 30 * 60 * 1000;

const ddb = new DynamoDBClient({ region: LEGACY_REGION });

type Event = {
  /** Bulk / owner path: migrate watchlists where owner ∈ list (or all if unset). */
  ownerEmails?: string[];
  /**
   * Onboarding path: find Account rows where creator = this email, then
   * migrate all Watchlists for those accountIDs into targetAccountId.
   */
  creatorEmail?: string;
  /** Forced Fuel 2.0 account id (claim-provisioned). Required with creatorEmail. */
  targetAccountId?: string;
  /** When true, ignore done/pending gate and re-run (manual test sync). */
  force?: boolean;
  limit?: number;
  dryRun?: boolean;
};

type MigrationGateStatus = "pending" | "done" | "failed";

type MigrationGateValue = {
  status: MigrationGateStatus;
  updatedAt: string;
};

/** Postgres bind-param ceiling is 65535; keep company inserts well under it. */
const COMPANY_INSERT_CHUNK = 500;

function s(v?: AttributeValue | null): string | undefined {
  return v?.S ?? undefined;
}
function sl(v?: AttributeValue | null): string[] {
  return v?.L?.map((x) => x.S).filter((x): x is string => !!x) ?? [];
}

type LegacyCompany = { uuid: string; name?: string };

function companyFromMap(m?: Record<string, AttributeValue>): LegacyCompany | null {
  if (!m) return null;
  const nested = m.company?.M;
  const src = nested ?? m;
  const uuid = s(src.uuid) ?? s(src.id);
  if (!uuid) return null;
  return { uuid, name: s(src.name) };
}

function companiesFromList(av?: AttributeValue | null): LegacyCompany[] {
  if (!av) return [];
  if (av.SS) {
    return av.SS.filter(Boolean).map((uuid) => ({ uuid }));
  }
  if (!av.L) return [];
  const out: LegacyCompany[] = [];
  for (const entry of av.L) {
    if (entry.S) {
      out.push({ uuid: entry.S });
      continue;
    }
    const parsed = companyFromMap(entry.M);
    if (parsed) out.push(parsed);
  }
  return out;
}

function mapPreview(meta?: AttributeValue): LegacyCompany[] {
  return companiesFromList(meta?.M?.preview);
}

/**
 * Fuel 1 stores the full membership on Watchlist.items; metadata.preview is a
 * truncated UI subset (same idea as Fuel 2 list cards). Union both so large
 * lists migrate completely, and preview can still supply display names.
 */
function mapWatchlistCompanies(legacy: Record<string, AttributeValue>): LegacyCompany[] {
  const byUuid = new Map<string, LegacyCompany>();
  const add = (c: LegacyCompany) => {
    const existing = byUuid.get(c.uuid);
    if (!existing) {
      byUuid.set(c.uuid, c);
      return;
    }
    if (!existing.name && c.name) byUuid.set(c.uuid, { uuid: c.uuid, name: c.name });
  };
  for (const c of companiesFromList(legacy.items)) add(c);
  for (const c of mapPreview(legacy.metadata)) add(c);
  return Array.from(byUuid.values());
}

function parseGateValue(raw: string | null | undefined): MigrationGateValue | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MigrationGateValue>;
    if (
      parsed.status !== "pending" &&
      parsed.status !== "done" &&
      parsed.status !== "failed"
    ) {
      return null;
    }
    if (typeof parsed.updatedAt !== "string") return null;
    return { status: parsed.status, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

function gatePayload(status: MigrationGateStatus): string {
  return JSON.stringify({ status, updatedAt: new Date().toISOString() } satisfies MigrationGateValue);
}

async function getMigrationGate(
  db: NodePgDatabase,
  userEmail: string,
): Promise<MigrationGateValue | null> {
  const res = await db.execute(sql`
    SELECT value FROM user_preferences
    WHERE user_email = ${userEmail} AND key = ${PREF_LEGACY_WATCHLISTS_MIGRATION}
    LIMIT 1
  `);
  const row = res.rows[0] as { value?: string } | undefined;
  return parseGateValue(row?.value);
}

async function setMigrationGate(
  db: NodePgDatabase,
  userEmail: string,
  status: MigrationGateStatus,
): Promise<void> {
  const value = gatePayload(status);
  await db
    .insert(userPreferences)
    .values({ userEmail, key: PREF_LEGACY_WATCHLISTS_MIGRATION, value })
    .onConflictDoUpdate({
      target: [userPreferences.userEmail, userPreferences.key],
      set: { value, updatedAt: new Date() },
    });
}

/**
 * Returns true if this invocation should run migration work.
 * Skips when done, or pending within TTL. Expired pending → treat as failed and proceed.
 * When force=true, always re-acquire pending and proceed.
 */
async function tryAcquireMigrationGate(
  db: NodePgDatabase,
  userEmail: string,
  dryRun: boolean,
  force = false,
): Promise<{ proceed: boolean; reason?: string }> {
  if (force) {
    if (!dryRun) await setMigrationGate(db, userEmail, "pending");
    return { proceed: true };
  }
  const existing = await getMigrationGate(db, userEmail);
  if (!existing) {
    if (!dryRun) await setMigrationGate(db, userEmail, "pending");
    return { proceed: true };
  }
  if (existing.status === "done") {
    return { proceed: false, reason: "already_done" };
  }
  if (existing.status === "pending") {
    const age = Date.now() - Date.parse(existing.updatedAt);
    if (Number.isFinite(age) && age < PENDING_TTL_MS) {
      return { proceed: false, reason: "already_pending" };
    }
    // Stale pending — allow retry.
  }
  // failed or expired pending
  if (!dryRun) await setMigrationGate(db, userEmail, "pending");
  return { proceed: true };
}

async function scanAllByOwner(ownerEmail: string): Promise<Record<string, AttributeValue>[]> {
  const items: Record<string, AttributeValue>[] = [];
  let ExclusiveStartKey: Record<string, AttributeValue> | undefined;
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: LEGACY_WATCHLIST_TABLE,
        IndexName: "byOwner",
        KeyConditionExpression: "#o = :o",
        ExpressionAttributeNames: { "#o": "owner" },
        ExpressionAttributeValues: { ":o": { S: ownerEmail } },
        ExclusiveStartKey,
      }),
    );
    for (const it of res.Items ?? []) items.push(it);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function scanAllWatchlists(limit?: number): Promise<Record<string, AttributeValue>[]> {
  const items: Record<string, AttributeValue>[] = [];
  let ExclusiveStartKey: Record<string, AttributeValue> | undefined;
  let scanned = 0;
  do {
    const res = await ddb.send(
      new ScanCommand({
        TableName: LEGACY_WATCHLIST_TABLE,
        ExclusiveStartKey,
        Limit: 500,
      }),
    );
    for (const it of res.Items ?? []) {
      items.push(it);
    }
    scanned++;
    if (limit && scanned >= limit) return items;
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/**
 * Account.id values where creator matches email (case-insensitive).
 * Scans Account with a projection and filters in-process — onboarding is rare
 * and Account tables are modest vs Watchlist.
 */
async function findAccountIdsByCreator(creatorEmail: string): Promise<string[]> {
  const needle = creatorEmail.trim().toLowerCase();
  const ids: string[] = [];
  let ExclusiveStartKey: Record<string, AttributeValue> | undefined;
  do {
    const res = await ddb.send(
      new ScanCommand({
        TableName: LEGACY_ACCOUNT_TABLE,
        ProjectionExpression: "id, creator",
        ExclusiveStartKey,
      }),
    );
    for (const it of res.Items ?? []) {
      const creator = s(it.creator)?.trim().toLowerCase();
      const id = s(it.id);
      if (id && creator === needle) ids.push(id);
    }
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return ids;
}

/** All watchlists for a Fuel 1.0 accountID (scan + filter; no assumed GSI). */
async function findWatchlistsByAccountId(
  accountId: string,
): Promise<Record<string, AttributeValue>[]> {
  const items: Record<string, AttributeValue>[] = [];
  let ExclusiveStartKey: Record<string, AttributeValue> | undefined;
  do {
    const res = await ddb.send(
      new ScanCommand({
        TableName: LEGACY_WATCHLIST_TABLE,
        FilterExpression: "accountID = :a",
        ExpressionAttributeValues: { ":a": { S: accountId } },
        ExclusiveStartKey,
      }),
    );
    for (const it of res.Items ?? []) items.push(it);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function queryByGSI(
  table: string,
  indexName: string,
  keyName: string,
  keyValue: string,
): Promise<Record<string, AttributeValue>[]> {
  const items: Record<string, AttributeValue>[] = [];
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
    for (const it of res.Items ?? []) items.push(it);
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function resolveDbUrl(): Promise<string> {
  const arn = process.env.DB_SECRET_ARN;
  const proxy = process.env.DB_PROXY_ENDPOINT;
  if (!arn || !proxy) throw new Error("DB_SECRET_ARN or DB_PROXY_ENDPOINT not set");
  const sm = new SecretsManagerClient({});
  const res = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!res.SecretString) throw new Error("secret has no SecretString");
  const creds = JSON.parse(res.SecretString) as {
    username: string;
    password: string;
    dbname?: string;
  };
  return `postgres://${encodeURIComponent(creds.username)}:${encodeURIComponent(creds.password)}@${proxy}:5432/${creds.dbname ?? "fuel"}?sslmode=require`;
}

async function fuel2AccountExists(db: NodePgDatabase, accountId: string): Promise<boolean> {
  if (!accountId) return false;
  const res = await db.execute(sql`
    SELECT 1 FROM accounts WHERE id = ${accountId} LIMIT 1
  `);
  return res.rows.length > 0;
}

async function resolveFuel2AccountForEmail(
  db: NodePgDatabase,
  ownerEmail: string,
): Promise<string | null> {
  if (!ownerEmail) return null;
  const prefRes = await db.execute(sql`
    SELECT up.value AS account_id
    FROM user_preferences up
    WHERE up.user_email = ${ownerEmail} AND up.key = 'active_account'
      AND EXISTS (
        SELECT 1 FROM account_members am
        WHERE am.user_email = ${ownerEmail} AND am.account_id = up.value
      )
    LIMIT 1
  `);
  const prefRow = prefRes.rows[0] as { account_id?: string } | undefined;
  if (prefRow?.account_id) return prefRow.account_id;

  const res = await db.execute(sql`
    SELECT am.account_id
    FROM account_members am
    WHERE am.user_email = ${ownerEmail}
    ORDER BY (am.role = 'owner') DESC,
      (SELECT count(*) FROM account_members am2 WHERE am2.account_id = am.account_id) DESC,
      am.account_id ASC
    LIMIT 1
  `);
  const row = res.rows[0] as { account_id?: string } | undefined;
  return row?.account_id ?? null;
}

async function migrateOne(
  db: NodePgDatabase,
  legacy: Record<string, AttributeValue>,
  dryRun: boolean,
  opts?: { forcedAccountId?: string },
): Promise<
  | { id: string; companies: number; shares: number; teams: number; settings: number }
  | { id: string; skipped: "no_fuel2_account" | "no_owner" }
> {
  const legacyId = s(legacy.id) ?? "";
  const name = s(legacy.name) ?? "(unnamed)";
  const ownerEmail = s(legacy.owner) ?? "";
  if (!ownerEmail) {
    console.warn(`[watchlist-migration] skip ${legacyId}: no owner`);
    return { id: legacyId, skipped: "no_owner" };
  }

  let accountId: string | null = opts?.forcedAccountId ?? null;
  if (!accountId) {
    const legacyAccountId = s(legacy.accountID);
    if (legacyAccountId && (await fuel2AccountExists(db, legacyAccountId))) {
      accountId = legacyAccountId;
    } else {
      accountId = await resolveFuel2AccountForEmail(db, ownerEmail);
      if (accountId) {
        console.log(
          `[watchlist-migration] ${legacyId}: legacy accountID ${legacyAccountId ?? "(missing)"} → owner-fallback ${accountId}`,
        );
      }
    }
  }
  if (!accountId) {
    console.warn(
      `[watchlist-migration] skip ${legacyId}: no Fuel 2.0 account for ${ownerEmail}`,
    );
    return { id: legacyId, skipped: "no_fuel2_account" };
  }
  const privacy = s(legacy.account_privacy);
  const createdAt = s(legacy.createdAt) ? new Date(s(legacy.createdAt)!) : new Date();
  const updatedAt = s(legacy.updatedAt) ? new Date(s(legacy.updatedAt)!) : createdAt;
  const admins = sl(legacy.admins);
  const viewers = sl(legacy.viewers);
  const companies = mapWatchlistCompanies(legacy);
  console.log(
    `[watchlist-migration] ${legacyId}: ${companies.length} companies (items + preview, deduped)`,
  );

  const scope: "private" | "account" = privacy === "PRIVATE" ? "private" : "account";

  const shares = await queryByGSI(LEGACY_USER_TABLE, "gsi-WatchlistShares", "watchlistUserListId", legacyId);
  const teams = await queryByGSI(LEGACY_TEAM_TABLE, "byWatchlist", "watchlistID", legacyId);
  const settings = await queryByGSI(
    LEGACY_SETTING_TABLE,
    "gsi-WatchlistSettings",
    "watchlistSettingWatchlistId",
    legacyId,
  );

  if (dryRun) {
    return {
      id: legacyId,
      companies: companies.length,
      shares: admins.length + viewers.length + shares.length,
      teams: teams.length,
      settings: settings.length,
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(watchlists)
      .values({
        id: legacyId,
        name,
        scope,
        cadence: "weekly",
        ownerEmail,
        accountId,
        createdAt,
        updatedAt,
        legacyId,
      })
      .onConflictDoUpdate({
        target: watchlists.id,
        set: { name, scope, ownerEmail, accountId, updatedAt },
      });

    await tx.execute(sql`DELETE FROM watchlist_companies WHERE watchlist_id = ${legacyId}`);
    for (let i = 0; i < companies.length; i += COMPANY_INSERT_CHUNK) {
      const chunk = companies.slice(i, i + COMPANY_INSERT_CHUNK);
      await tx.insert(watchlistCompanies).values(
        chunk.map((c) => ({
          watchlistId: legacyId,
          companyUuid: c.uuid,
          name: c.name ?? null,
          addedByEmail: ownerEmail,
        })),
      );
    }

    await tx.execute(sql`DELETE FROM watchlist_shares WHERE watchlist_id = ${legacyId}`);
    const shareRows: Array<{ watchlistId: string; userEmail: string; role: string }> = [];
    for (const a of admins) shareRows.push({ watchlistId: legacyId, userEmail: a, role: "admin" });
    for (const v of viewers) shareRows.push({ watchlistId: legacyId, userEmail: v, role: "viewer" });
    for (const row of shares) {
      const email = s(row.owner);
      if (!email) continue;
      const existing = shareRows.find((r) => r.userEmail === email);
      if (!existing) shareRows.push({ watchlistId: legacyId, userEmail: email, role: "viewer" });
    }
    if (shareRows.length > 0) await tx.insert(watchlistShares).values(shareRows).onConflictDoNothing();

    await tx.execute(sql`DELETE FROM watchlist_teams WHERE watchlist_id = ${legacyId}`);
    const candidateTeamIds = teams
      .map((row) => s(row.teamID))
      .filter((id): id is string => !!id);
    let teamRows: Array<{ watchlistId: string; teamId: string }> = [];
    if (candidateTeamIds.length > 0) {
      const existing = await tx.execute(sql`
        SELECT id FROM teams WHERE id IN (${sql.join(
          candidateTeamIds.map((id) => sql`${id}`),
          sql`, `,
        )})
      `);
      const ok = new Set((existing.rows as Array<{ id: string }>).map((r) => r.id));
      teamRows = candidateTeamIds
        .filter((id) => ok.has(id))
        .map((teamId) => ({ watchlistId: legacyId, teamId }));
    }
    if (teamRows.length > 0) await tx.insert(watchlistTeams).values(teamRows).onConflictDoNothing();

    await tx.execute(sql`DELETE FROM watchlist_followers WHERE watchlist_id = ${legacyId}`);
    const followerRows: Array<{
      watchlistId: string;
      userEmail: string;
      cadence: "off" | "daily" | "weekly" | "monthly";
      starred: boolean;
    }> = [];
    for (const settingRow of settings) {
      const email = s(settingRow.owner);
      if (!email) continue;
      const follow = settingRow.follow?.BOOL === true;
      const starred = settingRow.starred?.BOOL === true;
      if (!follow && !starred) continue;
      followerRows.push({
        watchlistId: legacyId,
        userEmail: email,
        cadence: follow ? "weekly" : "off",
        starred,
      });
    }
    if (followerRows.length > 0) {
      await tx.insert(watchlistFollowers).values(followerRows).onConflictDoNothing();
    }
  });

  return {
    id: legacyId,
    companies: companies.length,
    shares: admins.length + viewers.length + shares.length,
    teams: teams.length,
    settings: settings.length,
  };
}

async function collectSourcesForCreator(
  creatorEmail: string,
): Promise<Record<string, AttributeValue>[]> {
  const accountIds = await findAccountIdsByCreator(creatorEmail);
  const byId = new Map<string, Record<string, AttributeValue>>();
  for (const accountId of accountIds) {
    const rows = await findWatchlistsByAccountId(accountId);
    for (const row of rows) {
      const id = s(row.id);
      if (id) byId.set(id, row);
    }
  }
  return Array.from(byId.values());
}

export const handler = async (event: Event = {}) => {
  const dryRun = event.dryRun === true;
  const pool = new Pool({
    connectionString: await resolveDbUrl(),
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool);

  try {
    const creatorEmail = event.creatorEmail?.trim().toLowerCase();
    const targetAccountId = event.targetAccountId?.trim();

    if (creatorEmail) {
      if (!targetAccountId && !dryRun) {
        return {
          ok: false,
          error: "targetAccountId required when creatorEmail is set",
        };
      }

      const gate = await tryAcquireMigrationGate(
        db,
        creatorEmail,
        dryRun,
        event.force === true,
      );
      if (!gate.proceed) {
        return {
          ok: true,
          dryRun,
          skippedGate: gate.reason,
          scanned: 0,
          migrated: 0,
        };
      }

      let sources: Record<string, AttributeValue>[] = [];
      try {
        sources = await collectSourcesForCreator(creatorEmail);

        let totalCompanies = 0;
        let totalShares = 0;
        let totalTeams = 0;
        let totalSettings = 0;
        const migrated: string[] = [];
        const skipped: Array<{ id: string; reason: string }> = [];
        const errors: Array<{ id: string; error: string }> = [];

        for (const row of sources) {
          try {
            const result = await migrateOne(db, row, dryRun, {
              forcedAccountId: targetAccountId,
            });
            if ("skipped" in result) {
              skipped.push({ id: result.id, reason: result.skipped });
              continue;
            }
            migrated.push(result.id);
            totalCompanies += result.companies;
            totalShares += result.shares;
            totalTeams += result.teams;
            totalSettings += result.settings;
          } catch (e) {
            errors.push({ id: s(row.id) ?? "?", error: (e as Error).message });
          }
        }

        if (!dryRun) {
          await setMigrationGate(
            db,
            creatorEmail,
            errors.length > 0 && migrated.length === 0 ? "failed" : "done",
          );
        }

        return {
          ok: true,
          dryRun,
          mode: "creator",
          scanned: sources.length,
          migrated: migrated.length,
          skippedCount: skipped.length,
          skipped: skipped.slice(0, 20),
          companies: totalCompanies,
          shares: totalShares,
          teams: totalTeams,
          settings: totalSettings,
          errorCount: errors.length,
          errors: errors.slice(0, 20),
        };
      } catch (e) {
        if (!dryRun) {
          try {
            await setMigrationGate(db, creatorEmail, "failed");
          } catch {
            /* ignore gate write failure */
          }
        }
        throw e;
      }
    }

    // Collect source watchlists (bulk / ownerEmails path)
    let sources: Record<string, AttributeValue>[] = [];
    if (event.ownerEmails && event.ownerEmails.length > 0) {
      for (const owner of event.ownerEmails) {
        sources.push(...(await scanAllByOwner(owner)));
      }
    } else {
      sources = await scanAllWatchlists(event.limit);
    }

    let totalCompanies = 0;
    let totalShares = 0;
    let totalTeams = 0;
    let totalSettings = 0;
    const migrated: string[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const row of sources) {
      try {
        const result = await migrateOne(db, row, dryRun);
        if ("skipped" in result) {
          skipped.push({ id: result.id, reason: result.skipped });
          continue;
        }
        migrated.push(result.id);
        totalCompanies += result.companies;
        totalShares += result.shares;
        totalTeams += result.teams;
        totalSettings += result.settings;
      } catch (e) {
        errors.push({ id: s(row.id) ?? "?", error: (e as Error).message });
      }
    }

    return {
      ok: true,
      dryRun,
      scanned: sources.length,
      migrated: migrated.length,
      skippedCount: skipped.length,
      skipped: skipped.slice(0, 20),
      companies: totalCompanies,
      shares: totalShares,
      teams: totalTeams,
      settings: totalSettings,
      errorCount: errors.length,
      errors: errors.slice(0, 20),
    };
  } finally {
    await pool.end();
  }
};
