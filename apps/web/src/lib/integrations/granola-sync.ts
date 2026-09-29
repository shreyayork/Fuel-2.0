import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  contextItems,
  integrationConnections,
  type ContextItem,
  type IntegrationConnection,
} from "@/db/schema";
import { getCompanyByDomain, normalizeDomain } from "@/lib/fuel-data";
import { embedText } from "@/lib/enrichment/embeddings";
import { buildAccountWatchlistIndex } from "./watchlist-index";
import { isGranolaSessionExpired, markGranolaConnectionError } from "./granola-session";
import {
  getGranolaMeetings,
  listGranolaMeetings,
  type GranolaMeetingSummary,
} from "./granola-client";
import { onContextItemCreated } from "@/lib/context/extract";
import {
  hasCompanyIntelligenceForContextItem,
  processGranolaMeetingIntelligence,
  shouldProcessContextIntelligenceAfterUpsert,
} from "@/lib/integrations/context-intelligence";
import { contextSourceContentChanged } from "@/lib/integrations/context-intelligence-gate";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { tryChargeIntegrationSync } from "@/lib/credits/integration-sync";

export interface GranolaSyncReport {
  accountId: string;
  connectionId: string;
  meetingsScanned: number;
  meetingsMatched: number;
  contextItemsCreated: number;
  errors: string[];
}

const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "fastmail.com",
  "aol.com",
]);

/**
 * Sync recent Granola meetings for a single connection.
 *
 * Granola MCP `list_meetings` / `get_meetings` expose no last-modified field
 * (only id, title, date, attendees, summary). So we cannot filter edits via
 * `lastSyncAt`. Instead we pull the configured `time_range` window every run
 * and let upsert + content-change detection skip unchanged intel.
 *
 * Pass `since: null` (or omit filtering) — `since` is retained for callers but
 * no longer drops older meetings inside the window (F20A-254).
 */
export async function syncGranolaConnection(opts: {
  connection: IntegrationConnection;
  since?: Date | null;
  /**
   * Granola's list_meetings uses a `time_range` enum, not a limit. "backfill"
   * here means pull the full 30-day window; otherwise we pull the same window
   * and re-check each meeting for content changes.
   */
  timeRange?: "this_week" | "last_week" | "last_30_days";
}): Promise<GranolaSyncReport> {
  const { connection } = opts;
  const report: GranolaSyncReport = {
    accountId: connection.accountId,
    connectionId: connection.id,
    meetingsScanned: 0,
    meetingsMatched: 0,
    contextItemsCreated: 0,
    errors: [],
  };

  const gate = await tryChargeIntegrationSync(connection.accountId, "granolaSync", {
    referenceId: `granola:${connection.id}`,
  });
  if (!gate.allowed) {
    report.errors.push("insufficient_credits");
    return report;
  }

  const creds = connection.credentials as { accessToken?: string } | null;
  const accessToken = creds?.accessToken;
  if (!accessToken) {
    report.errors.push("no access token stored");
    return report;
  }

  // Retained for logging / caller API only — not used to drop meetings.
  // Granola has no last-modified signal; date > lastSyncAt missed edits.
  const cursor =
    opts.since === undefined ? connection.lastSyncAt ?? connection.installedAt : opts.since;

  let listed: Awaited<ReturnType<typeof listGranolaMeetings>>;
  try {
    listed = await listGranolaMeetings({ accessToken, timeRange: opts.timeRange ?? "last_30_days" });
    console.log(
      "[granola-sync] list_meetings →",
      JSON.stringify({ count: listed.length, cursor: cursor?.toISOString() ?? null, first: listed[0] }),
    );
  } catch (e) {
    const msg = `list_meetings failed: ${(e as Error).message.slice(0, 500)}`;
    captureIntegrationException(e, {
      integration: "granola",
      operation: "list_meetings",
      level: isGranolaSessionExpired(e) ? "warning" : "error",
      context: { connectionId: connection.id, accountId: connection.accountId },
    });
    console.error("[granola-sync]", msg);
    report.errors.push(msg);
    if (isGranolaSessionExpired(e)) {
      // Trip the connection so the UI shows "Reconnect" and the cron skips
      // this row until the user re-installs.
      await markGranolaConnectionError(connection.id, "session_expired").catch(() => {});
    }
    return report;
  }

  // Process every meeting in the time_range window. Content-change detection
  // on upsert skips Bedrock when the merged body is unchanged.
  const fresh = listed;

  report.meetingsScanned = fresh.length;
  console.log("[granola-sync] meetings in time_range window:", fresh.length);

  // Build the domain → companyUuid map for catalog companies in this account's
  // watchlists/portfolios. Neptune-sourced matches are resolved lazily per
  // attendee domain below.
  const { catalogDomainMap, watchlistUuidSet } = await buildAccountWatchlistIndex(
    connection.accountId,
  );
  // Memoize Neptune domain → uuid lookups across meetings in this run.
  const neptuneResolved = new Map<string, string | null>();

  // Walk each meeting, match attendees, insert context items.
  const db = await getDb();

  // Granola's list_meetings only surfaces the user's internal teammates in
  // the attendee array — external portfolio-company attendees are only in
  // get_meetings details. So we detail-fetch everything and match on the
  // merged attendee list. 10 meetings per batch with a 500ms gap keeps us
  // under the per-connection rate limiter.
  const detailMap = fresh.length
    ? await getGranolaMeetings({ accessToken, meetingIds: fresh.map((r) => r.id) })
    : new Map<string, GranolaMeetingSummary>();
  console.log("[granola-sync] detail-fetched", detailMap.size, "of", fresh.length, "meetings");

  const relevant: Array<{ ref: typeof fresh[number]; matchedUuids: Set<string> }> = [];
  for (const ref of fresh) {
    const detail = detailMap.get(ref.id);
    const mergedAttendees = mergeAttendees(detail?.attendees, ref.attendees);
    const matchedUuids = await matchAttendeesToCompanies({
      attendees: mergedAttendees,
      catalogDomainMap,
      watchlistUuidSet,
      neptuneResolved,
      debugLabel: `${ref.title ?? ref.id}`,
    });
    if (matchedUuids.size > 0) relevant.push({ ref, matchedUuids });
  }
  console.log(
    "[granola-sync] relevant meetings (after detail match):",
    relevant.length,
    "catalogDomains:",
    catalogDomainMap.size,
    "watchlistUuids:",
    watchlistUuidSet.size,
  );

  for (const { ref, matchedUuids } of relevant) {
    const detail = detailMap.get(ref.id) ?? null;

    const occurredAt = parseDateSafe(detail?.date ?? ref.date) ?? new Date();

    console.log(
      "[granola-sync] meeting",
      ref.id,
      "attendees:",
      (ref.attendees ?? []).map((a) => a.email).filter(Boolean).join(","),
      "→ matched:",
      Array.from(matchedUuids).join(","),
      "detail:",
      detail ? "yes" : "no",
    );
    report.meetingsMatched += 1;

    const mergedAttendees = mergeAttendees(detail?.attendees, ref.attendees);
    const title = detail?.title ?? ref.title ?? "Granola meeting";
    const dateStr = detail?.date ?? ref.date ?? null;
    const authorEmail = connection.installedByEmail;
    const summary = detail?.summary ?? null;

    // Stable across every team member who attends the same meeting — used to
    // merge notes from multiple Granola connections into a single context
    // item rather than creating duplicates.
    const meetingKey = computeMeetingKey({
      occurredAt,
      attendees: mergedAttendees,
    });

    for (const companyUuid of matchedUuids) {
      try {
        const { item: merged, inserted, contentChanged } = await upsertMergedMeeting({
          accountId: connection.accountId,
          companyUuid,
          meetingKey,
          meetingId: ref.id,
          title,
          dateStr,
          attendees: mergedAttendees,
          authorEmail,
          summary,
          occurredAt,
        });
        report.contextItemsCreated += 1;
        try {
          await onContextItemCreated(merged);
        } catch (e) {
          captureIntegrationException(e, {
            integration: "granola",
            operation: "context_extract",
            level: "warning",
            context: { contextItemId: merged.id },
          });
          console.warn(
            `[granola-sync] extract failed for ${merged.id}: ${(e as Error).message?.slice(0, 120)}`,
          );
        }

        // Intelligence: insert / self-heal / content-change regen (F20A-254).
        // Failures must not undo signal extraction above.
        const hasExistingIntelligence = inserted
          ? false
          : await hasCompanyIntelligenceForContextItem({
              accountId: connection.accountId,
              contextItemId: merged.id,
            });
        if (
          shouldProcessContextIntelligenceAfterUpsert({
            inserted,
            hasExistingIntelligence,
            contentChanged,
          })
        ) {
          const replaceExisting =
            !inserted && contentChanged && hasExistingIntelligence;
          try {
            await processGranolaMeetingIntelligence(merged, { replaceExisting });
          } catch (e) {
            captureIntegrationException(e, {
              integration: "granola",
              operation: "granola_intelligence_pipeline",
              level: "warning",
              context: {
                contextItemId: merged.id,
                replaceExisting,
                contentChanged,
              },
            });
            console.warn(
              `[granola-sync] intelligence pipeline failed for ${merged.id}: ${(e as Error).message?.slice(0, 120)}`,
            );
          }
        }
      } catch (e) {
        captureIntegrationException(e, {
          integration: "granola",
          operation: "upsert_meeting",
          level: "warning",
          context: { connectionId: connection.id },
        });
        report.errors.push(`insert failed: ${(e as Error).message.slice(0, 120)}`);
      }
    }
  }

  // Stamp wall-clock last sync (not max meeting date) — cursor no longer
  // filters the window; UI only needs "when did we last run".
  await db
    .update(integrationConnections)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(integrationConnections.id, connection.id));

  return report;
}

type Attendee = { name?: string | null; email?: string | null };

interface MeetingMetadata {
  [key: string]: unknown;
  attendees: Attendee[];
  meetingTitle: string;
  /** Map of author email → their markdown summary. Rebuilt on each merge. */
  noteSections?: Record<string, string>;
  /** Granola meeting IDs seen for this merged item — each contributor's
   *  Granola account may hand back a different id for the same calendar
   *  event, so we keep them all for debugging. */
  granolaMeetingIds?: string[];
  /** Legacy single-summary storage for items created before multi-user
   *  merging shipped. Rendered verbatim on first merge then migrated into
   *  noteSections keyed by the original author. */
  legacySummary?: string | null;
}

/**
 * Hash of the meeting's start-minute + sorted attendee emails. Same value
 * for every team member who syncs notes on the same calendar event, even
 * when Granola hands them different per-user meeting ids.
 */
function computeMeetingKey(opts: {
  occurredAt: Date;
  attendees: Attendee[];
}): string {
  const minute = Math.floor(opts.occurredAt.getTime() / 60_000);
  const emails = opts.attendees
    .map((a) => (a.email ?? "").trim().toLowerCase())
    .filter(Boolean);
  emails.sort();
  const input = `${minute}|${emails.join(",")}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

/**
 * Insert or merge a meeting context item. If another team member already
 * synced notes for the same meetingKey on this company, this call folds the
 * new author's summary into their existing row under a "Notes from X" section
 * instead of creating a duplicate. Returns the canonical row so the caller
 * can re-run extraction against it, whether the row was newly inserted, and
 * whether title/content meaningfully changed (for the intelligence gate).
 */
async function upsertMergedMeeting(opts: {
  accountId: string;
  companyUuid: string;
  meetingKey: string;
  meetingId: string;
  title: string;
  dateStr: string | null;
  attendees: Attendee[];
  authorEmail: string;
  summary: string | null;
  occurredAt: Date;
}): Promise<{ item: ContextItem; inserted: boolean; contentChanged: boolean }> {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(contextItems)
    .where(
      and(
        eq(contextItems.accountId, opts.accountId),
        eq(contextItems.companyUuid, opts.companyUuid),
        eq(contextItems.meetingKey, opts.meetingKey),
      ),
    )
    .limit(1);

  if (existing) {
    const meta = (existing.metadata as MeetingMetadata | null) ?? {
      attendees: [],
      meetingTitle: opts.title,
    };
    const noteSections = { ...(meta.noteSections ?? {}) };
    // Bootstrap: rows created before multi-user merging shipped have their
    // summary baked into the content field. Promote that into noteSections
    // under the original author so we don't lose their contribution.
    if (
      Object.keys(noteSections).length === 0 &&
      existing.authorEmail &&
      !noteSections[existing.authorEmail]
    ) {
      const legacy = meta.legacySummary ?? inferLegacySummary(existing.content);
      if (legacy) noteSections[existing.authorEmail] = legacy;
    }
    if (opts.summary) {
      noteSections[opts.authorEmail] = opts.summary;
    }

    const mergedAttendees = mergeAttendees(meta.attendees, opts.attendees);
    const contributorsSet = new Set([
      ...(existing.contributors ?? []),
      existing.authorEmail ?? undefined,
      opts.authorEmail,
    ]);
    const contributors = Array.from(contributorsSet).filter((s): s is string => !!s);
    const granolaMeetingIds = Array.from(
      new Set([...(meta.granolaMeetingIds ?? []), opts.meetingId]),
    );
    const nextContent = buildMergedContent({
      title: opts.title,
      date: opts.dateStr,
      attendees: mergedAttendees,
      noteSections,
    });
    const contentChanged = contextSourceContentChanged(
      { title: existing.title, content: existing.content },
      { title: opts.title, content: nextContent },
    );
    const newMetadata: MeetingMetadata = {
      attendees: mergedAttendees,
      meetingTitle: opts.title,
      noteSections,
      granolaMeetingIds,
    };

    const embedding = await embedText([opts.title, nextContent].filter(Boolean).join("\n\n"));
    const [updated] = await db
      .update(contextItems)
      .set({
        title: opts.title,
        content: nextContent,
        occurredAt: opts.occurredAt,
        metadata: newMetadata,
        contributors,
        embedding: embedding ?? undefined,
      })
      .where(eq(contextItems.id, existing.id))
      .returning();
    return { item: updated, inserted: false, contentChanged };
  }

  // First contributor for this meetingKey — insert fresh.
  const noteSections: Record<string, string> = {};
  if (opts.summary) noteSections[opts.authorEmail] = opts.summary;
  const content = buildMergedContent({
    title: opts.title,
    date: opts.dateStr,
    attendees: opts.attendees,
    noteSections,
  });
  const metadata: MeetingMetadata = {
    attendees: opts.attendees,
    meetingTitle: opts.title,
    noteSections,
    granolaMeetingIds: [opts.meetingId],
  };
  const id = `ctx_granola_${opts.meetingKey}_${randomUUID().slice(0, 8)}`;
  const embedding = await embedText([opts.title, content].filter(Boolean).join("\n\n"));
  const [inserted] = await db
    .insert(contextItems)
    .values({
      id,
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      kind: "meeting_transcript",
      title: opts.title,
      content,
      authorEmail: opts.authorEmail,
      source: `granola:${opts.meetingId}`,
      sourceExternalId: opts.meetingId,
      occurredAt: opts.occurredAt,
      metadata,
      meetingKey: opts.meetingKey,
      contributors: [opts.authorEmail],
      embedding: embedding ?? undefined,
    })
    .returning();
  return { item: inserted, inserted: true, contentChanged: false };
}

function buildMergedContent(m: {
  title: string;
  date: string | null;
  attendees: Attendee[];
  noteSections: Record<string, string>;
}): string {
  const parts: string[] = [];
  if (m.title) parts.push(`# ${m.title}`);
  if (m.date) parts.push(`_${new Date(m.date).toLocaleString()}_`);
  if (m.attendees.length) {
    const names = m.attendees
      .map((a) => (a.name && a.email ? `${a.name} <${a.email}>` : a.name ?? a.email))
      .filter(Boolean)
      .join(", ");
    if (names) parts.push(`**Attendees**: ${names}`);
  }
  const contributors = Object.keys(m.noteSections).sort();
  if (contributors.length === 1) {
    // Single contributor — skip the section header to keep the content clean.
    parts.push(m.noteSections[contributors[0]]);
  } else {
    for (const email of contributors) {
      parts.push(`## Notes from ${email}`);
      parts.push(m.noteSections[email]);
    }
  }
  return parts.join("\n\n");
}

/**
 * Best-effort extraction of the summary body from a legacy
 * buildContextContent string — used exactly once when upgrading a pre-merge
 * row into the multi-contributor format.
 */
function inferLegacySummary(content: string): string | null {
  const lines = content.split("\n\n");
  // Skip title / date / attendees blocks at the start; the rest is summary.
  const body = lines.filter(
    (block) =>
      !block.startsWith("# ") &&
      !block.startsWith("_") &&
      !block.startsWith("**Attendees**"),
  );
  const joined = body.join("\n\n").trim();
  return joined.length > 0 ? joined : null;
}

function mergeAttendees(
  a: Array<{ name?: string | null; email?: string | null }> | undefined | null,
  b: Array<{ name?: string | null; email?: string | null }> | undefined | null,
): Array<{ name?: string | null; email?: string | null }> {
  const byEmail = new Map<string, { name?: string | null; email?: string | null }>();
  const noEmail: Array<{ name?: string | null; email?: string | null }> = [];
  for (const p of [...(a ?? []), ...(b ?? [])]) {
    if (!p) continue;
    const key = (p.email ?? "").toLowerCase();
    if (key) {
      const existing = byEmail.get(key);
      if (!existing) byEmail.set(key, p);
      else if (!existing.name && p.name) byEmail.set(key, p);
    } else if (p.name) {
      noEmail.push(p);
    }
  }
  return [...byEmail.values(), ...noEmail];
}

function parseDateSafe(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

async function matchAttendeesToCompanies(opts: {
  attendees: Array<{ email?: string | null }>;
  catalogDomainMap: Map<string, string>;
  watchlistUuidSet: Set<string>;
  neptuneResolved: Map<string, string | null>;
  debugLabel?: string;
}): Promise<Set<string>> {
  const { attendees, catalogDomainMap, watchlistUuidSet, neptuneResolved } = opts;
  const out = new Set<string>();
  const debug: string[] = [];
  for (const a of attendees) {
    if (!a.email) continue;
    const at = a.email.indexOf("@");
    if (at < 0) continue;
    const domain = normalizeDomain(a.email.slice(at + 1));
    if (!domain) {
      debug.push(`${a.email}→no-domain`);
      continue;
    }
    if (PERSONAL_DOMAINS.has(domain)) {
      debug.push(`${a.email}→personal`);
      continue;
    }
    // 1. Catalog company with this domain?
    const catalogHit = catalogDomainMap.get(domain);
    if (catalogHit) {
      out.add(catalogHit);
      debug.push(`${a.email}→catalog:${catalogHit}`);
      continue;
    }
    // 2. Neptune company resolvable by domain, and that UUID is a member of
    //    one of the account's watchlists/portfolios?
    if (!neptuneResolved.has(domain)) {
      try {
        const hit = await getCompanyByDomain(domain);
        neptuneResolved.set(domain, hit?.uuid ?? null);
      } catch {
        neptuneResolved.set(domain, null);
      }
    }
    const uuid = neptuneResolved.get(domain) ?? null;
    if (uuid && watchlistUuidSet.has(uuid)) {
      out.add(uuid);
      debug.push(`${a.email}→neptune:${uuid}(watchlisted)`);
    } else if (uuid) {
      debug.push(`${a.email}→neptune:${uuid}(not-watchlisted)`);
    } else {
      debug.push(`${a.email}→unresolved`);
    }
  }
  if (opts.debugLabel && debug.length > 0) {
    console.log(`[granola-match] ${opts.debugLabel}:`, debug.join(" | "));
  }
  return out;
}

/** Exported for ad-hoc testing. */
export async function resolveDomainToWatchlistedCompany(opts: {
  accountId: string;
  domain: string;
}): Promise<string | null> {
  const { catalogDomainMap, watchlistUuidSet } = await buildAccountWatchlistIndex(
    opts.accountId,
  );
  const norm = normalizeDomain(opts.domain);
  if (!norm) return null;
  if (catalogDomainMap.has(norm)) return catalogDomainMap.get(norm) ?? null;
  const hit = await getCompanyByDomain(norm);
  if (hit && watchlistUuidSet.has(hit.uuid)) return hit.uuid;
  return null;
}
