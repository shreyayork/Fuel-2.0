import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  contextItems,
  integrationActivityConfigs,
  integrationCompanyLinks,
  integrationConnections,
  pipelineCompanies,
  type IntegrationActivityConfig,
  type IntegrationConnection,
} from "@/db/schema";
import {
  HubspotClient,
  batchReadAssociations,
  batchReadEmails,
  batchReadNotes,
  findHubspotCompanyByDomain,
  getContactsByIds,
  getOwnersByIds,
  searchEngagementsForCompany,
  type HubspotContact,
  type HubspotEmail,
  type HubspotNote,
  type HubspotOwner,
} from "@/lib/hubspot-client";
import { embedText } from "@/lib/enrichment/embeddings";
import {
  hasCompanyIntelligenceForContextItem,
  processHubspotActivityIntelligence,
  shouldProcessHubspotIntelligenceAfterUpsert,
} from "@/lib/integrations/hubspot-intelligence";
import { contextSourceContentChanged } from "@/lib/integrations/context-intelligence-gate";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { tryChargeIntegrationSync } from "@/lib/credits/integration-sync";
import {
  buildAccountWatchlistIndex,
  type AccountWatchlistIndex,
} from "./watchlist-index";
import {
  resolveHubspotCompany,
  resolveHubspotContact,
} from "./hubspot-company-resolver";

const DEFAULT_BACKFILL_DAYS = 90;
const PAGE_LIMIT = 100;
const MAX_PAGES = 50;

export interface ActivitySyncReport {
  accountId: string;
  connectionId: string;
  companiesScanned: number;
  emails: { seen: number; inserted: number; updated: number; skipped: number };
  notes: { seen: number; inserted: number; updated: number; skipped: number };
  errors: string[];
}

const emptyCounts = () => ({ seen: 0, inserted: 0, updated: 0, skipped: 0 });

/**
 * Sync HubSpot notes + emails for a single account's connection, scoped to
 * the account's watchlisted companies. Activities for any HubSpot company
 * outside that set never leave HubSpot — the scoping happens server-side
 * via the `associations.company` search filter, not client-side.
 *
 * Flow:
 *   1. Resolve each watchlisted Fuel UUID to one (or more) HubSpot company
 *      id. Sources: `integration_company_links` cache → `pipeline_companies`
 *      rows → live lookup by domain. Cache misses write back.
 *   2. For each HubSpot company id, page through `/crm/v3/objects/{notes,
 *      emails}/search` filtered by `associations.company = id` AND
 *      `hs_lastmodifieddate >= cursor`. Sorted ascending so the cursor
 *      advances monotonically.
 *   3. Batch-read full objects, resolve owner emails, upsert into
 *      `context_items` keyed by (source, source_external_id).
 */
export async function syncHubspotActivitiesForConnection(opts: {
  connection: IntegrationConnection;
  config: IntegrationActivityConfig;
  index?: AccountWatchlistIndex;
  /**
   * When true (default), intelligence pipeline is fire-and-forget after upsert.
   * Cron keeps this true for throughput. Interactive Save must pass false so
   * Bedrock finishes before the Server Action / Lambda freezes.
   */
  skipExtraction?: boolean;
}): Promise<ActivitySyncReport> {
  const skipExtraction = opts.skipExtraction ?? true;
  const report: ActivitySyncReport = {
    accountId: opts.connection.accountId,
    connectionId: opts.connection.id,
    companiesScanned: 0,
    emails: emptyCounts(),
    notes: emptyCounts(),
    errors: [],
  };

  if (!opts.config.syncEmails && !opts.config.syncNotes) return report;

  const client = await HubspotClient.forAccount(opts.connection.accountId);
  if (!client) {
    report.errors.push("hubspot_client_unavailable");
    return report;
  }

  const index =
    opts.index ?? (await buildAccountWatchlistIndex(opts.connection.accountId));
  // Don't short-circuit on empty watchlists — pipeline deals now bring
  // their own scope in resolveWatchlistToHubspotCompanies. The empty-
  // scope check happens after resolution instead.

  const companyMap = await resolveWatchlistToHubspotCompanies({
    client,
    accountId: opts.connection.accountId,
    connectionId: opts.connection.id,
    index,
  });
  report.companiesScanned = companyMap.size;
  if (companyMap.size === 0) return report;

  const db = await getDb();
  const defaultBackfill = new Date(
    Date.now() - DEFAULT_BACKFILL_DAYS * 24 * 60 * 60 * 1000,
  );

  // Emails and notes run in parallel — they share the HubspotClient's
  // rate limiter, so the API budget is unchanged, but notes no longer wait
  // for the email backfill to finish before getting any Lambda time of
  // their own. Each kind advances its own per-company cursor map
  // independently, so no coordination needed.
  const emailJob = opts.config.syncEmails
    ? (async () => {
        try {
          const cursor =
            opts.config.lastEmailSyncAt ??
            opts.config.backfillSince ??
            defaultBackfill;
          const result = await syncKindAcrossCompanies({
            client,
            connection: opts.connection,
            config: opts.config,
            kind: "email",
            companyMap,
            cursor,
            skipExtraction,
          });
          report.emails = result.counts;
          if (result.cursor) {
            await db
              .update(integrationActivityConfigs)
              .set({
                lastEmailSyncAt: result.cursor,
                updatedAt: new Date(),
                syncState: {
                  ...((opts.config.syncState ?? {}) as Record<string, unknown>),
                  lastEmailResult: {
                    ...result.counts,
                    companiesScanned: report.companiesScanned,
                    at: new Date().toISOString(),
                  },
                },
              })
              .where(eq(integrationActivityConfigs.id, opts.config.id));
          }
        } catch (e) {
          const msg = `email_sync_failed: ${(e as Error).message.slice(0, 200)}`;
          captureIntegrationException(e, {
            integration: "hubspot",
            operation: "email_sync",
            context: { configId: opts.config.id, accountId: opts.config.accountId },
          });
          console.error("[hubspot-activity]", msg);
          report.errors.push(msg);
        }
      })()
    : Promise.resolve();

  const noteJob = opts.config.syncNotes
    ? (async () => {
        try {
          const cursor =
            opts.config.lastNoteSyncAt ??
            opts.config.backfillSince ??
            defaultBackfill;
          const result = await syncKindAcrossCompanies({
            client,
            connection: opts.connection,
            config: opts.config,
            kind: "note",
            companyMap,
            cursor,
            skipExtraction,
          });
          report.notes = result.counts;
          if (result.cursor) {
            await db
              .update(integrationActivityConfigs)
              .set({
                lastNoteSyncAt: result.cursor,
                updatedAt: new Date(),
                syncState: {
                  ...((opts.config.syncState ?? {}) as Record<string, unknown>),
                  lastNoteResult: {
                    ...result.counts,
                    companiesScanned: report.companiesScanned,
                    at: new Date().toISOString(),
                  },
                },
              })
              .where(eq(integrationActivityConfigs.id, opts.config.id));
          }
        } catch (e) {
          const msg = `note_sync_failed: ${(e as Error).message.slice(0, 200)}`;
          captureIntegrationException(e, {
            integration: "hubspot",
            operation: "note_sync",
            context: { configId: opts.config.id, accountId: opts.config.accountId },
          });
          console.error("[hubspot-activity]", msg);
          report.errors.push(msg);
        }
      })()
    : Promise.resolve();

  await Promise.all([emailJob, noteJob]);

  return report;
}

interface KindSyncResult {
  counts: ActivitySyncReport["emails"];
  cursor: Date | null;
}

async function syncKindAcrossCompanies(opts: {
  client: HubspotClient;
  connection: IntegrationConnection;
  config: IntegrationActivityConfig;
  kind: "note" | "email";
  companyMap: Map<string, string>; // hubspotCompanyId → fuelDataUuid
  cursor: Date;
  skipExtraction: boolean;
}): Promise<KindSyncResult> {
  const counts = emptyCounts();

  // Per-company cursors live in sync_state.{emailCompanyCursors,noteCompanyCursors}.
  // First-time companies fall back to the account-level cursor (backfillSince
  // or the 90d default). Each successful company batch writes back its own
  // cursor immediately, so a Lambda timeout mid-run doesn't erase progress
  // — the next tick picks up where the last one stopped, per-company.
  const stateKey =
    opts.kind === "email" ? "emailCompanyCursors" : "noteCompanyCursors";
  const syncState = (opts.config.syncState ?? {}) as Record<string, unknown>;
  const companyCursors: Record<string, number> = {
    ...((syncState[stateKey] as Record<string, number> | undefined) ?? {}),
  };
  const defaultMs = opts.cursor.getTime();

  for (const [hubspotCompanyId, fuelDataUuid] of opts.companyMap) {
    const companyCursorMs = companyCursors[hubspotCompanyId] ?? defaultMs;
    try {
      const ids = await collectActivityIdsForCompany({
        client: opts.client,
        kind: opts.kind,
        hubspotCompanyId,
        cursorMs: companyCursorMs,
      });
      if (ids.length === 0) {
        // Stamp the cursor anyway so next tick treats this company as
        // caught-up instead of re-searching from the default backfill.
        if (!companyCursors[hubspotCompanyId]) {
          companyCursors[hubspotCompanyId] = Date.now();
          await persistCompanyCursor({
            configId: opts.config.id,
            stateKey,
            hubspotCompanyId,
            cursorMs: companyCursors[hubspotCompanyId],
          });
        }
        continue;
      }

      counts.seen += ids.length;
      const outcome = await ingestCollectedActivities({
        client: opts.client,
        connection: opts.connection,
        kind: opts.kind,
        ids,
        primaryCompanyUuid: fuelDataUuid,
        primaryHubspotCompanyId: hubspotCompanyId,
        // Push cursor advancement down into the batch-read loop so partial
        // company progress survives Lambda timeouts. Big portfolios have
        // companies with thousands of emails — one cursor write per 100
        // activities (vs one per company) means a mid-company timeout
        // still banks >99% of the work we already did.
        cursorSink: {
          configId: opts.config.id,
          stateKey,
          currentCursorMs: companyCursorMs,
        },
        // Cron: fire-and-forget intel (skipExtraction true). Interactive Save
        // passes false so the Server Action awaits Bedrock before returning.
        skipExtraction: opts.skipExtraction,
      });
      counts.inserted += outcome.inserted;
      counts.updated += outcome.updated;
      counts.skipped += outcome.skipped;

      // If no chunk advanced the cursor (all activities had no modifiedAt,
      // unlikely), still mark this company caught-up to "now" so we don't
      // re-search it next tick.
      if (outcome.latestModified) {
        companyCursors[hubspotCompanyId] = outcome.latestModified.getTime();
      } else if (!companyCursors[hubspotCompanyId]) {
        companyCursors[hubspotCompanyId] = Date.now();
        await persistCompanyCursor({
          configId: opts.config.id,
          stateKey,
          hubspotCompanyId,
          cursorMs: companyCursors[hubspotCompanyId],
        });
      }
    } catch (e) {
      captureIntegrationException(e, {
        integration: "hubspot",
        operation: "company_activity_sync",
        level: "warning",
        context: { kind: opts.kind, hubspotCompanyId },
      });
      console.warn(
        `[hubspot-activity] ${opts.kind} sync for company ${hubspotCompanyId} failed:`,
        (e as Error).message?.slice(0, 200),
      );
    }
  }

  const values = Object.values(companyCursors);
  const latest = values.length > 0 ? new Date(Math.max(...values)) : null;
  return { counts, cursor: latest };
}

/**
 * Write one company's cursor into the config's sync_state jsonb. Atomic
 * jsonb_set: the enclosing UPDATE replaces only the single addressed key,
 * so concurrent writes to other keys don't collide. Creates missing
 * intermediate map keys on first write via the COALESCE wrapper.
 */
async function persistCompanyCursor(opts: {
  configId: string;
  stateKey: "emailCompanyCursors" | "noteCompanyCursors";
  hubspotCompanyId: string;
  cursorMs: number;
}): Promise<void> {
  const db = await getDb();
  await db.execute(sql`
    UPDATE "integration_activity_configs"
    SET
      "sync_state" = jsonb_set(
        jsonb_set(
          COALESCE("sync_state", '{}'::jsonb),
          ARRAY[${opts.stateKey}],
          COALESCE("sync_state"->${opts.stateKey}, '{}'::jsonb)
        ),
        ARRAY[${opts.stateKey}, ${opts.hubspotCompanyId}],
        to_jsonb(${opts.cursorMs}::bigint)
      ),
      "updated_at" = NOW()
    WHERE "id" = ${opts.configId}
  `);
}

async function collectActivityIdsForCompany(opts: {
  client: HubspotClient;
  kind: "note" | "email";
  hubspotCompanyId: string;
  cursorMs: number;
}): Promise<string[]> {
  const objectType = opts.kind === "note" ? "notes" : "emails";
  const out: string[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await searchEngagementsForCompany(opts.client, {
      objectType,
      hubspotCompanyId: opts.hubspotCompanyId,
      modifiedSinceMs: opts.cursorMs,
      limit: PAGE_LIMIT,
      after,
    });
    out.push(...batch.ids);
    if (!batch.nextAfter) break;
    after = batch.nextAfter;
  }
  return out;
}

async function ingestCollectedActivities(opts: {
  client: HubspotClient;
  connection: IntegrationConnection;
  kind: "note" | "email";
  ids: string[];
  primaryCompanyUuid: string;
  primaryHubspotCompanyId: string;
  /**
   * Optional hook to persist the per-company cursor after every batch of
   * 100 activities. Set by the cron path; the webhook path (single-item
   * ingest) leaves it undefined and lets the caller write the cursor once
   * at the end.
   */
  cursorSink?: {
    configId: string;
    stateKey: "emailCompanyCursors" | "noteCompanyCursors";
    currentCursorMs: number;
  };
  /** Cron-path backfill passes true — retroExtract handles signals later. */
  skipExtraction?: boolean;
}): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  latestModified: Date | null;
}> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };
  let latestModified: Date | null = null;
  let persistedCursorMs = opts.cursorSink?.currentCursorMs ?? 0;

  const CHUNK = 100;
  for (let i = 0; i < opts.ids.length; i += CHUNK) {
    const slice = opts.ids.slice(i, i + CHUNK);
    const full =
      opts.kind === "email"
        ? await batchReadEmails(opts.client, slice)
        : await batchReadNotes(opts.client, slice);
    const perActivityPromises: Array<Promise<"inserted" | "updated">> = [];

    // Also pull contact associations — we include them in metadata for
    // provenance but don't use them to gate ingestion (we already know
    // this activity is on a watchlisted company).
    const contactAssoc = await batchReadAssociations(opts.client, {
      fromType: opts.kind === "email" ? "emails" : "notes",
      toType: "contacts",
      ids: slice,
    });

    const ownerIds = Array.from(
      new Set(
        full
          .map((a) => (a as HubspotEmail | HubspotNote).properties.hubspot_owner_id)
          .filter(Boolean) as string[],
      ),
    );
    const ownersById =
      ownerIds.length > 0
        ? await getOwnersByIds(opts.client, ownerIds)
        : new Map<string, HubspotOwner>();

    for (const activity of full) {
      const modified = parseDate(
        (activity as HubspotEmail | HubspotNote).properties.hs_lastmodifieddate ??
          (activity as HubspotEmail | HubspotNote).properties.hs_timestamp,
      );
      if (modified && (!latestModified || modified > latestModified)) {
        latestModified = modified;
      }

      const baseMetadata: Record<string, unknown> = {
        hubspotOwnerId:
          (activity as HubspotEmail | HubspotNote).properties.hubspot_owner_id ?? null,
        associatedCompanyIds: [opts.primaryHubspotCompanyId],
        associatedContactIds: contactAssoc.get(activity.id) ?? [],
        hubId: opts.connection.accountExternalId ?? null,
      };

      const occurredAt =
        parseDate((activity as HubspotEmail | HubspotNote).properties.hs_timestamp) ??
        parseDate((activity as HubspotEmail | HubspotNote).properties.hs_createdate) ??
        new Date();

      // Defer to the chunk-level Promise.all below instead of awaiting
      // serially here — a Claude Haiku extraction call per activity at
      // 500-1500ms was pinning throughput to ~1/sec on a cold cache.
      perActivityPromises.push(
        (async (): Promise<"inserted" | "updated"> => {
          if (opts.kind === "email") {
            const email = activity as HubspotEmail;
            return upsertActivityContextItem({
              accountId: opts.connection.accountId,
              companyUuid: opts.primaryCompanyUuid,
              kind: "email",
              activityId: email.id,
              title: buildEmailTitle(email),
              content: buildEmailContent(email),
              authorEmail: authorEmailForEmail({ email, owners: ownersById }),
              occurredAt,
              metadata: {
                ...baseMetadata,
                direction: email.properties.hs_email_direction ?? null,
                fromEmail: email.properties.hs_email_from_email ?? null,
                toEmail: email.properties.hs_email_to_email ?? null,
                ccEmail: email.properties.hs_email_cc_email ?? null,
              },
              skipExtraction: opts.skipExtraction,
            });
          }
          const note = activity as HubspotNote;
          return upsertActivityContextItem({
            accountId: opts.connection.accountId,
            companyUuid: opts.primaryCompanyUuid,
            kind: "note",
            activityId: note.id,
            title: buildNoteTitle(note),
            content: buildNoteContent(note),
            authorEmail: authorEmailForNote({ note, owners: ownersById }),
            occurredAt,
            metadata: baseMetadata,
            skipExtraction: opts.skipExtraction,
          });
        })(),
      );
    }
    const outcomes = await Promise.all(perActivityPromises);
    for (const outcome of outcomes) counts[outcome] += 1;

    // Flush per-company cursor at the end of each chunk. Banks durable
    // progress mid-company so a Lambda timeout can't undo the last N
    // minutes of API calls + embeddings + inserts.
    if (
      opts.cursorSink &&
      latestModified &&
      latestModified.getTime() > persistedCursorMs
    ) {
      persistedCursorMs = latestModified.getTime();
      await persistCompanyCursor({
        configId: opts.cursorSink.configId,
        stateKey: opts.cursorSink.stateKey,
        hubspotCompanyId: opts.primaryHubspotCompanyId,
        cursorMs: persistedCursorMs,
      });
    }
  }

  return { ...counts, latestModified };
}

/**
 * Resolve the set of HubSpot company ids whose activities should sync
 * into this account's Fuel context. "In scope" = any company that is:
 *   (a) a member of one of the account's watchlists / portfolios, OR
 *   (b) associated with a deal in one of the account's enabled pipeline
 *       configs — regardless of watchlist membership.
 *
 * The pipeline-side inclusion matters: if an operator has a Seed Fund
 * pipeline with 1,800 deals, they care about every one of those deals'
 * emails, not just the ~100 they happen to have formally watchlisted.
 *
 * Sources walked in order of cost:
 *   1. `integration_company_links` — cached resolutions
 *   2. `pipeline_companies` — deals we've synced already carry the
 *      provider_company_id + fuel_data_uuid mapping for free
 *   3. Live HubSpot search by domain — one API call per unresolved
 *      watchlist UUID, results cached back to integration_company_links
 */
async function resolveWatchlistToHubspotCompanies(opts: {
  client: HubspotClient;
  accountId: string;
  connectionId: string;
  index: AccountWatchlistIndex;
}): Promise<Map<string, string>> {
  const result = new Map<string, string>(); // hubspotCompanyId → fuelDataUuid
  const resolvedFuelUuids = new Set<string>();
  const db = await getDb();

  // 1. Cached links. Include BOTH watchlisted and unwatchlisted fuel
  //    UUIDs — pipeline scope covers the rest. We used to filter by
  //    watchlist membership here, which dropped every pipeline-only
  //    deal's activity ingest.
  const cached = await db
    .select()
    .from(integrationCompanyLinks)
    .where(
      and(
        eq(integrationCompanyLinks.accountId, opts.accountId),
        eq(integrationCompanyLinks.connectionId, opts.connectionId),
        eq(integrationCompanyLinks.providerObjectType, "company"),
      ),
    );
  for (const link of cached) {
    if (!link.fuelDataUuid) continue;
    result.set(link.providerObjectId, link.fuelDataUuid);
    resolvedFuelUuids.add(link.fuelDataUuid);
  }

  // 2. Pipeline companies — every deal with a resolved fuel-data UUID,
  //    regardless of watchlist membership. This is the fix for "Guidepad
  //    is in my pipeline but I never added it to a watchlist, why aren't
  //    its emails syncing?"
  const deals = await db
    .select({
      providerCompanyId: pipelineCompanies.providerCompanyId,
      fuelDataUuid: pipelineCompanies.fuelDataUuid,
      companyDomain: pipelineCompanies.companyDomain,
    })
    .from(pipelineCompanies)
    .where(
      and(
        eq(pipelineCompanies.accountId, opts.accountId),
        isNotNull(pipelineCompanies.providerCompanyId),
        isNotNull(pipelineCompanies.fuelDataUuid),
      ),
    );
  for (const deal of deals) {
    const companyId = deal.providerCompanyId;
    const fuelUuid = deal.fuelDataUuid;
    if (!companyId || !fuelUuid) continue;
    if (result.has(companyId)) continue;
    result.set(companyId, fuelUuid);
    resolvedFuelUuids.add(fuelUuid);
    await cacheCompanyLink({
      accountId: opts.accountId,
      connectionId: opts.connectionId,
      hubspotCompanyId: companyId,
      fuelDataUuid: fuelUuid,
      providerDomain: deal.companyDomain,
      resolutionSource: "pipeline",
    });
  }

  // 3. Domain-based lookup — only for watchlist UUIDs that still
  //    haven't been resolved. Pipeline companies without a
  //    fuel_data_uuid aren't worth a HubSpot-side domain search; they'd
  //    fall back anyway.
  const domainByUuid = new Map<string, string>();
  for (const [domain, uuid] of opts.index.catalogDomainMap) {
    if (!domainByUuid.has(uuid)) domainByUuid.set(uuid, domain);
  }

  for (const uuid of opts.index.watchlistUuidSet) {
    if (resolvedFuelUuids.has(uuid)) continue;
    const domain = domainByUuid.get(uuid);
    if (!domain) continue;
    try {
      const company = await findHubspotCompanyByDomain(opts.client, domain);
      if (company) {
        result.set(company.id, uuid);
        resolvedFuelUuids.add(uuid);
        await cacheCompanyLink({
          accountId: opts.accountId,
          connectionId: opts.connectionId,
          hubspotCompanyId: company.id,
          fuelDataUuid: uuid,
          providerDomain: domain,
          resolutionSource: uuid.startsWith("cat_") ? "catalog" : "fuel-data",
        });
      }
    } catch (e) {
      captureIntegrationException(e, {
        integration: "hubspot",
        operation: "company_resolve",
        level: "warning",
        context: { domain },
      });
      console.warn(
        `[hubspot-activity] findHubspotCompanyByDomain(${domain}) failed:`,
        (e as Error).message?.slice(0, 200),
      );
    }
  }

  return result;
}

/**
 * Mutate the AccountWatchlistIndex in place to add pipeline-deal fuel
 * UUIDs into its watchlistUuidSet. HubSpot-specific broadening — the
 * resolver's membership check then sees pipeline companies as in-scope
 * without us having to plumb a second "scope" concept through the
 * resolveHubspotCompany signature.
 */
async function augmentIndexWithPipelineUuids(
  accountId: string,
  index: AccountWatchlistIndex,
): Promise<void> {
  const db = await getDb();
  const deals = await db
    .select({ fuelDataUuid: pipelineCompanies.fuelDataUuid })
    .from(pipelineCompanies)
    .where(
      and(
        eq(pipelineCompanies.accountId, accountId),
        isNotNull(pipelineCompanies.fuelDataUuid),
      ),
    );
  for (const d of deals) {
    if (d.fuelDataUuid) index.watchlistUuidSet.add(d.fuelDataUuid);
  }
}

async function cacheCompanyLink(opts: {
  accountId: string;
  connectionId: string;
  hubspotCompanyId: string;
  fuelDataUuid: string;
  providerDomain: string | null;
  resolutionSource: string;
}): Promise<void> {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(integrationCompanyLinks)
    .where(
      and(
        eq(integrationCompanyLinks.accountId, opts.accountId),
        eq(integrationCompanyLinks.connectionId, opts.connectionId),
        eq(integrationCompanyLinks.providerObjectType, "company"),
        eq(integrationCompanyLinks.providerObjectId, opts.hubspotCompanyId),
      ),
    )
    .limit(1);
  const now = new Date();
  if (existing) {
    await db
      .update(integrationCompanyLinks)
      .set({
        fuelDataUuid: opts.fuelDataUuid,
        providerDomain: opts.providerDomain,
        resolutionSource: opts.resolutionSource,
        lastResolvedAt: now,
        updatedAt: now,
      })
      .where(eq(integrationCompanyLinks.id, existing.id));
    return;
  }
  await db.insert(integrationCompanyLinks).values({
    id: randomUUID(),
    accountId: opts.accountId,
    connectionId: opts.connectionId,
    provider: "hubspot",
    providerObjectType: "company",
    providerObjectId: opts.hubspotCompanyId,
    providerDomain: opts.providerDomain,
    fuelDataUuid: opts.fuelDataUuid,
    resolutionSource: opts.resolutionSource,
    lastResolvedAt: now,
  });
}

/**
 * Insert or update a context_items row for a HubSpot activity in a single
 * round-trip. The unique index on (account_id, source, source_external_id)
 * gates the ON CONFLICT target, so two concurrent writers (e.g. the cron
 * and the webhook) can't both insert a separate row for the same activity.
 * `xmax = 0` in the RETURNING clause tells us whether the row was newly
 * inserted. Intelligence runs on insert, on update when no
 * company_intelligence exists yet (self-heal), or when title/content changed
 * (F20A-254 regen).
 *
 * `skipExtraction` lets the cron backfill defer synchronous AI (intel +
 * initiatives). Cron fires the pipeline async so Lambda throughput stays
 * intact; webhook awaits for near-real-time Sources → Intelligence.
 */
export async function upsertActivityContextItem(opts: {
  accountId: string;
  companyUuid: string;
  kind: "note" | "email";
  activityId: string;
  title: string | undefined;
  content: string;
  authorEmail: string | null;
  occurredAt: Date;
  metadata: Record<string, unknown>;
  skipExtraction?: boolean;
}): Promise<"inserted" | "updated"> {
  const db = await getDb();
  const source = `hubspot:${opts.kind}:${opts.activityId}`;
  const embedInput = [opts.title, opts.content].filter(Boolean).join("\n\n");
  const embedding = await embedText(embedInput);

  const [prior] = await db
    .select({
      id: contextItems.id,
      title: contextItems.title,
      content: contextItems.content,
    })
    .from(contextItems)
    .where(
      and(
        eq(contextItems.accountId, opts.accountId),
        eq(contextItems.source, source),
        eq(contextItems.sourceExternalId, opts.activityId),
      ),
    )
    .limit(1);

  const contentChanged = prior
    ? contextSourceContentChanged(
        { title: prior.title, content: prior.content },
        { title: opts.title, content: opts.content },
      )
    : false;

  const result = await db
    .insert(contextItems)
    .values({
      id: randomUUID(),
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      kind: "hubspot_activity",
      title: opts.title,
      content: opts.content,
      authorEmail: opts.authorEmail ?? undefined,
      source,
      sourceExternalId: opts.activityId,
      occurredAt: opts.occurredAt,
      metadata: opts.metadata,
      embedding: embedding ?? undefined,
    })
    .onConflictDoUpdate({
      target: [
        contextItems.accountId,
        contextItems.source,
        contextItems.sourceExternalId,
      ],
      set: {
        title: opts.title,
        content: opts.content,
        occurredAt: opts.occurredAt,
        metadata: opts.metadata,
        companyUuid: opts.companyUuid,
        embedding: embedding ?? undefined,
      },
    })
    .returning({
      id: contextItems.id,
      // `xmax = 0` is Postgres's signal that the returned row was just
      // inserted (not an updated existing row). True → fresh insert;
      // false → conflict update of an existing row.
      inserted: sql<boolean>`xmax = 0`,
    });

  const row = result[0];
  if (!row) return "updated";

  const inserted = Boolean(row.inserted);
  const hasExistingIntelligence = inserted
    ? false
    : await hasCompanyIntelligenceForContextItem({
        accountId: opts.accountId,
        contextItemId: row.id,
      });

  if (
    shouldProcessHubspotIntelligenceAfterUpsert({
      inserted,
      hasExistingIntelligence,
      contentChanged,
    })
  ) {
    const [full] = await db
      .select()
      .from(contextItems)
      .where(eq(contextItems.id, row.id))
      .limit(1);
    if (full) {
      const replaceExisting =
        !inserted && contentChanged && hasExistingIntelligence;
      const runPipeline = async () => {
        try {
          await processHubspotActivityIntelligence(full, { replaceExisting });
        } catch (e) {
          captureIntegrationException(e, {
            integration: "hubspot",
            operation: "hubspot_intelligence_pipeline",
            level: "warning",
            context: {
              contextItemId: row.id,
              replaceExisting,
              contentChanged,
            },
          });
          console.warn(
            `[hubspot-activity] intelligence pipeline failed for ${row.id}: ${(e as Error).message?.slice(0, 120)}`,
          );
        }
      };
      // Cron bulk sync: fire-and-forget. Webhook + interactive Save: await.
      if (opts.skipExtraction) {
        void runPipeline();
      } else {
        await runPipeline();
      }
    }
  }

  return inserted ? "inserted" : "updated";
}

/**
 * Top-level entry: run activity sync for every HubSpot connection that has
 * an enabled config.
 */
export async function syncHubspotActivitiesForAccount(opts: {
  accountId: string;
  /**
   * Defaults true (cron). Pass false from Save Activity Sync so intelligence
   * generation is awaited before the request ends.
   */
  skipExtraction?: boolean;
  /** When false, skip credit charge (cron already charged via pipeline sync). Default true. */
  chargeCredits?: boolean;
}): Promise<ActivitySyncReport[]> {
  if (opts.chargeCredits !== false) {
    const gate = await tryChargeIntegrationSync(opts.accountId, "hubspotSync", {
      referenceId: `hubspot-activity:${opts.accountId}`,
    });
    if (!gate.allowed) return [];
  }
  const skipExtraction = opts.skipExtraction ?? true;
  const db = await getDb();
  const rows = await db
    .select({
      config: integrationActivityConfigs,
      connection: integrationConnections,
    })
    .from(integrationActivityConfigs)
    .innerJoin(
      integrationConnections,
      eq(integrationActivityConfigs.connectionId, integrationConnections.id),
    )
    .where(
      and(
        eq(integrationActivityConfigs.accountId, opts.accountId),
        eq(integrationActivityConfigs.provider, "hubspot"),
        eq(integrationConnections.status, "connected"),
      ),
    );

  if (rows.length === 0) return [];

  const index = await buildAccountWatchlistIndex(opts.accountId);
  const reports: ActivitySyncReport[] = [];
  for (const r of rows) {
    if (!r.config.syncEmails && !r.config.syncNotes) continue;
    const report = await syncHubspotActivitiesForConnection({
      connection: r.connection,
      config: r.config,
      index,
      skipExtraction,
    });
    reports.push(report);
  }
  return reports;
}

/**
 * Webhook path: ingest a single activity by id. Walks its associations,
 * gates on watchlist membership, and upserts. This stays in place because
 * the webhook delivers the id directly — we never search portal-wide.
 */
export async function ingestHubspotActivityById(opts: {
  accountId: string;
  activityId: string;
  kind: "note" | "email";
}): Promise<"inserted" | "updated" | "no_config" | "unmatched"> {
  const db = await getDb();
  const [row] = await db
    .select({
      config: integrationActivityConfigs,
      connection: integrationConnections,
    })
    .from(integrationActivityConfigs)
    .innerJoin(
      integrationConnections,
      eq(integrationActivityConfigs.connectionId, integrationConnections.id),
    )
    .where(
      and(
        eq(integrationActivityConfigs.accountId, opts.accountId),
        eq(integrationActivityConfigs.provider, "hubspot"),
      ),
    )
    .limit(1);
  if (!row) return "no_config";
  if (opts.kind === "email" && !row.config.syncEmails) return "no_config";
  if (opts.kind === "note" && !row.config.syncNotes) return "no_config";

  const client = await HubspotClient.forAccount(opts.accountId);
  if (!client) return "no_config";
  const index = await buildAccountWatchlistIndex(opts.accountId);
  // Augment the watchlist scope with pipeline-deal fuel UUIDs so webhook-
  // delivered activities on pipeline-only companies (e.g. Guidepad is in
  // the Seed Fund pipeline but not an explicit watchlist) still ingest.
  // Scope concept: "companies the account cares about" = watchlist ∪ pipeline.
  await augmentIndexWithPipelineUuids(opts.accountId, index);
  if (index.watchlistUuidSet.size === 0) return "unmatched";

  const [companyAssoc, contactAssoc] = await Promise.all([
    batchReadAssociations(client, {
      fromType: opts.kind === "email" ? "emails" : "notes",
      toType: "companies",
      ids: [opts.activityId],
    }),
    batchReadAssociations(client, {
      fromType: opts.kind === "email" ? "emails" : "notes",
      toType: "contacts",
      ids: [opts.activityId],
    }),
  ]);
  const companyIds = companyAssoc.get(opts.activityId) ?? [];
  const contactIds = contactAssoc.get(opts.activityId) ?? [];

  const contactsById = new Map<string, HubspotContact>();
  if (contactIds.length > 0) {
    try {
      const contacts = await getContactsByIds(client, contactIds);
      for (const c of contacts) contactsById.set(c.id, c);
    } catch {
      /* non-fatal */
    }
  }

  // Gate on watchlist membership — companies first, then contact fallback
  // if configured.
  const scope = row.config.associationScope;
  const tryCompanies = scope === "company" || scope === "both";
  const tryContacts = scope === "contact" || scope === "both";

  let companyUuid: string | null = null;
  if (tryCompanies) {
    for (const id of companyIds) {
      const r = await resolveHubspotCompany({
        client,
        accountId: opts.accountId,
        connectionId: row.connection.id,
        hubspotCompanyId: id,
        index,
        requireWatchlistMembership: true,
      });
      if (r.fuelDataUuid) {
        companyUuid = r.fuelDataUuid;
        break;
      }
    }
  }
  if (!companyUuid && tryContacts) {
    for (const id of contactIds) {
      const r = await resolveHubspotContact({
        client,
        accountId: opts.accountId,
        connectionId: row.connection.id,
        hubspotContactId: id,
        hsContact: contactsById.get(id),
        index,
        requireWatchlistMembership: true,
      });
      if (r.fuelDataUuid) {
        companyUuid = r.fuelDataUuid;
        break;
      }
    }
  }
  if (!companyUuid) return "unmatched";

  if (opts.kind === "email") {
    const [email] = await batchReadEmails(client, [opts.activityId]);
    if (!email) return "unmatched";
    const ownerId = email.properties.hubspot_owner_id;
    const owners = ownerId
      ? await getOwnersByIds(client, [ownerId])
      : new Map<string, HubspotOwner>();
    return upsertActivityContextItem({
      accountId: opts.accountId,
      companyUuid,
      kind: "email",
      activityId: email.id,
      title: buildEmailTitle(email),
      content: buildEmailContent(email),
      authorEmail: authorEmailForEmail({ email, owners }),
      occurredAt:
        parseDate(email.properties.hs_timestamp) ??
        parseDate(email.properties.hs_createdate) ??
        new Date(),
      metadata: {
        direction: email.properties.hs_email_direction ?? null,
        hubspotOwnerId: email.properties.hubspot_owner_id ?? null,
        fromEmail: email.properties.hs_email_from_email ?? null,
        toEmail: email.properties.hs_email_to_email ?? null,
        ccEmail: email.properties.hs_email_cc_email ?? null,
        associatedCompanyIds: companyIds,
        associatedContactIds: contactIds,
        hubId: row.connection.accountExternalId ?? null,
      },
    });
  }

  const [note] = await batchReadNotes(client, [opts.activityId]);
  if (!note) return "unmatched";
  const ownerId = note.properties.hubspot_owner_id;
  const owners = ownerId
    ? await getOwnersByIds(client, [ownerId])
    : new Map<string, HubspotOwner>();
  return upsertActivityContextItem({
    accountId: opts.accountId,
    companyUuid,
    kind: "note",
    activityId: note.id,
    title: buildNoteTitle(note),
    content: buildNoteContent(note),
    authorEmail: authorEmailForNote({ note, owners }),
    occurredAt:
      parseDate(note.properties.hs_timestamp) ??
      parseDate(note.properties.hs_createdate) ??
      new Date(),
    metadata: {
      hubspotOwnerId: note.properties.hubspot_owner_id ?? null,
      associatedCompanyIds: companyIds,
      associatedContactIds: contactIds,
      hubId: row.connection.accountExternalId ?? null,
    },
  });
}

// --- Field derivation -------------------------------------------------------

function stripHtml(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function buildEmailTitle(email: HubspotEmail): string | undefined {
  return email.properties.hs_email_subject?.trim() || undefined;
}

function buildEmailContent(email: HubspotEmail): string {
  const body = stripHtml(email.properties.hs_email_text);
  const from = email.properties.hs_email_from_email;
  const to = email.properties.hs_email_to_email;
  const parts: string[] = [];
  if (from) parts.push(`**From**: ${from}`);
  if (to) parts.push(`**To**: ${to}`);
  if (body) parts.push(body);
  return parts.join("\n\n") || "(empty email body)";
}

function buildNoteTitle(note: HubspotNote): string | undefined {
  const body = stripHtml(note.properties.hs_note_body);
  if (!body) return undefined;
  const firstLine = body.split(/[.!?\n]/)[0]?.trim();
  if (!firstLine) return undefined;
  return firstLine.length > 80 ? firstLine.slice(0, 77) + "…" : firstLine;
}

function buildNoteContent(note: HubspotNote): string {
  return stripHtml(note.properties.hs_note_body) || "(empty note)";
}

function authorEmailForEmail(opts: {
  email: HubspotEmail;
  owners: Map<string, HubspotOwner>;
}): string | null {
  const ownerId = opts.email.properties.hubspot_owner_id;
  const ownerEmail = ownerId ? opts.owners.get(ownerId)?.email : undefined;
  const direction = opts.email.properties.hs_email_direction ?? "";
  if (direction === "INCOMING_EMAIL") {
    return opts.email.properties.hs_email_from_email ?? ownerEmail ?? null;
  }
  return ownerEmail ?? opts.email.properties.hs_email_from_email ?? null;
}

function authorEmailForNote(opts: {
  note: HubspotNote;
  owners: Map<string, HubspotOwner>;
}): string | null {
  const ownerId = opts.note.properties.hubspot_owner_id;
  if (!ownerId) return null;
  return opts.owners.get(ownerId)?.email ?? null;
}

function parseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) ? new Date(n) : null;
  }
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}
