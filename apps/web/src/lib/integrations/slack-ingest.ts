import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  contextItems,
  integrationChannelSubscriptions,
  integrationConnections,
  type IntegrationConnection,
  type IntegrationChannelSubscription,
} from "@/db/schema";
import { addContextItem } from "@/lib/context";
import { getCompanyByDomain, normalizeDomain } from "@/lib/fuel-data";
import { getCatalogByDomain } from "@/lib/catalog";
import { tryChargeIntegrationSync } from "@/lib/credits/integration-sync";
import type { SlackMessageEvent } from "./slack-webhook";

/**
 * Resolve a Slack team_id to the Fuel account(s) that have the bot installed.
 * Usually one; webhook routes all matching accounts (multi-install across
 * Fuel accounts is rare but supported for parity with the HubSpot pattern).
 */
export async function findAccountsByTeamId(teamId: string): Promise<IntegrationConnection[]> {
  const db = await getDb();
  return db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.provider, "slack"),
        eq(integrationConnections.accountExternalId, teamId),
      ),
    );
}

export async function findSubscription(opts: {
  accountId: string;
  connectionId: string;
  providerChannelId: string;
}): Promise<IntegrationChannelSubscription | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(integrationChannelSubscriptions)
    .where(
      and(
        eq(integrationChannelSubscriptions.accountId, opts.accountId),
        eq(integrationChannelSubscriptions.connectionId, opts.connectionId),
        eq(integrationChannelSubscriptions.providerChannelId, opts.providerChannelId),
      ),
    )
    .limit(1);
  return row ?? null;
}

const URL_RE = /https?:\/\/[^\s<>]+/g;

/**
 * Best-effort subject resolver for a Slack message. Walks URLs in the text,
 * normalizes their domains, and tries the account's catalog first then
 * fuel-data for an exact domain match. First hit wins. If the message is a
 * thread reply, falls back to the parent context_item's companyUuid.
 *
 * Returns null when no signal resolves — callers drop the message silently
 * per the configured policy.
 */
export async function resolveSubjectCompany(opts: {
  accountId: string;
  event: SlackMessageEvent;
}): Promise<string | null> {
  // Thread inheritance: if this is a reply, look up the parent we already
  // stored (keyed on team:channel:thread_ts).
  if (opts.event.thread_ts && opts.event.thread_ts !== opts.event.ts) {
    const db = await getDb();
    const parentTs = opts.event.thread_ts;
    const [parent] = await db
      .select()
      .from(contextItems)
      .where(
        and(
          eq(contextItems.accountId, opts.accountId),
          eq(contextItems.kind, "slack_message"),
          eq(contextItems.sourceExternalId, parentTs),
        ),
      )
      .orderBy(desc(contextItems.occurredAt))
      .limit(1);
    if (parent?.companyUuid) return parent.companyUuid;
  }

  const text = opts.event.text ?? "";
  const matches = text.match(URL_RE) ?? [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[).,!?]+$/, "");
    const d = normalizeDomain(cleaned);
    if (!d) continue;
    const hit = await getCatalogByDomain({ accountId: opts.accountId, domain: d });
    if (hit) return hit.id;
    try {
      const fd = await getCompanyByDomain(d);
      if (fd) return fd.uuid;
    } catch {
      // fuel-data unreachable from local dev is fine; move on.
    }
  }
  return null;
}

/**
 * Ingest one Slack message event for one (account, connection) pair. No-ops
 * if the channel isn't subscribed, the message is a bot echo, or no company
 * resolves (logged + dropped). Returns the created context_item id on
 * success, null otherwise.
 */
export async function ingestSlackMessage(opts: {
  accountId: string;
  connection: IntegrationConnection;
  event: SlackMessageEvent;
}): Promise<string | null> {
  // Skip bot messages (including our own) and edit/delete subtypes we don't
  // yet handle in this ingest path.
  if (opts.event.bot_id || opts.event.subtype === "bot_message") return null;
  if (opts.event.subtype && opts.event.subtype !== "file_share") return null;
  if (!opts.event.text && !(opts.event.files?.length ?? 0)) return null;

  const sub = await findSubscription({
    accountId: opts.accountId,
    connectionId: opts.connection.id,
    providerChannelId: opts.event.channel,
  });
  if (!sub?.enabled) return null;

  const companyUuid = await resolveSubjectCompany({
    accountId: opts.accountId,
    event: opts.event,
  });
  if (!companyUuid) {
    console.log(
      `[slack-ingest] unresolved message team=${opts.connection.accountExternalId} ch=${opts.event.channel} ts=${opts.event.ts}`,
    );
    return null;
  }

  const occurredAt = new Date(Math.floor(Number(opts.event.ts) * 1000));
  const teamId = opts.connection.accountExternalId ?? "unknown";

  // Duplicate guard: Slack occasionally re-delivers events. source+
  // source_external_id is a natural idempotency key.
  const db = await getDb();
  const [existing] = await db
    .select({ id: contextItems.id })
    .from(contextItems)
    .where(
      and(
        eq(contextItems.accountId, opts.accountId),
        eq(contextItems.source, `slack:${teamId}:${opts.event.channel}`),
        eq(contextItems.sourceExternalId, opts.event.ts),
      ),
    )
    .limit(1);
  if (existing) return existing.id;

  const gate = await tryChargeIntegrationSync(opts.accountId, "slackSync", {
    referenceId: `slack:${teamId}:${opts.event.channel}:${opts.event.ts}`,
  });
  if (!gate.allowed) return null;

  const row = await addContextItem({
    accountId: opts.accountId,
    companyUuid,
    kind: "slack_message",
    title: sub.providerChannelName ? `#${sub.providerChannelName}` : undefined,
    content: opts.event.text ?? "(attachments only)",
    authorEmail: undefined,
    source: `slack:${teamId}:${opts.event.channel}`,
    sourceExternalId: opts.event.ts,
    occurredAt,
    metadata: {
      channelId: opts.event.channel,
      channelName: sub.providerChannelName,
      threadTs: opts.event.thread_ts ?? null,
      slackUserId: opts.event.user ?? null,
      fileCount: opts.event.files?.length ?? 0,
    },
  });

  await db
    .update(integrationChannelSubscriptions)
    .set({ lastEventAt: new Date(), updatedAt: new Date() })
    .where(eq(integrationChannelSubscriptions.id, sub.id));

  return row.id;
}
