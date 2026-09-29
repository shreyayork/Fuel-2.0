import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  contextItems,
  integrationConnections,
  integrationPipelineConfigs,
  pipelineCompanies,
} from "@/db/schema";
import {
  HubspotClient,
  getCompaniesByIds,
  listDealsInPipeline,
  type HubspotDeal,
} from "./hubspot-client";
import { normalizeDomain } from "./fuel-data";
import { OBJECT_TYPE_NAMES, type HubspotWebhookEvent } from "./integrations/hubspot-webhook";
import { ingestHubspotActivityById } from "./integrations/hubspot-activity-sync";
import { captureIntegrationException } from "@/lib/sentry/capture";

/**
 * Apply a batch of HubSpot webhook events to pipeline_companies. We only
 * touch rows for pipelines that a Fuel account has explicitly enabled —
 * deals from other pipelines are ignored (they're not in scope for that
 * account).
 */
export async function applyWebhookEvents(events: HubspotWebhookEvent[]): Promise<{
  processed: number;
  skipped: number;
}> {
  if (events.length === 0) return { processed: 0, skipped: 0 };

  const portalId = String(events[0].portalId);
  const db = await getDb();

  // Find the matching Fuel account(s) by HubSpot hub_id stored as
  // integration_connections.account_external_id. Usually one, but an account
  // could have multiple members with their own installs — we treat them all.
  const conns = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.provider, "hubspot"),
        eq(integrationConnections.accountExternalId, portalId),
      ),
    );
  if (conns.length === 0) return { processed: 0, skipped: events.length };

  // Per-account: list their enabled pipeline configs, partition events into
  // (deal in an enabled pipeline) vs (skip).
  let processed = 0;
  let skipped = 0;

  for (const conn of conns) {
    const configs = await db
      .select()
      .from(integrationPipelineConfigs)
      .where(
        and(
          eq(integrationPipelineConfigs.accountId, conn.accountId),
          eq(integrationPipelineConfigs.provider, "hubspot"),
          eq(integrationPipelineConfigs.enabled, true),
        ),
      );
    const configByPipelineId = new Map(configs.map((c) => [c.providerPipelineId, c]));

    const client = await HubspotClient.forAccount(conn.accountId);
    if (!client) {
      skipped += events.length;
      continue;
    }

    // Bucket events by kind + object. We only really need the deal IDs; a
    // property change on a deal in an enabled pipeline prompts a re-fetch.
    const dealDeletions = new Set<string>();
    const dealTouches = new Set<string>();
    const noteTouches = new Set<string>();
    const noteDeletions = new Set<string>();
    const emailTouches = new Set<string>();
    const emailDeletions = new Set<string>();
    for (const e of events) {
      const id = String(e.objectId);
      if (e.subscriptionType === "deal.deletion") {
        dealDeletions.add(id);
      } else if (e.subscriptionType.startsWith("deal.")) {
        dealTouches.add(id);
      } else if (e.subscriptionType.startsWith("object.")) {
        // Generic subscription — dispatch by objectTypeId. HubSpot doesn't
        // support note/email in the legacy bucket, so anything activity-
        // related lands here.
        const typeName = e.objectTypeId ? OBJECT_TYPE_NAMES[e.objectTypeId] : undefined;
        if (typeName === "note") {
          if (e.subscriptionType === "object.deletion") noteDeletions.add(id);
          else noteTouches.add(id);
        } else if (typeName === "email") {
          if (e.subscriptionType === "object.deletion") emailDeletions.add(id);
          else emailTouches.add(id);
        }
      }
      // company.* events could also bubble, but we'll re-fetch the deal's
      // associated company on the next deal.propertyChange so skip for now.
    }

    // Activity deletions: remove any context_items we ingested for them.
    // Safe to run even when the account hasn't opted into activity sync —
    // the source lookup just won't match anything.
    for (const [kind, ids] of [
      ["note", noteDeletions] as const,
      ["email", emailDeletions] as const,
    ]) {
      if (ids.size === 0) continue;
      const sources = Array.from(ids).map((id) => `hubspot:${kind}:${id}`);
      await db
        .delete(contextItems)
        .where(
          and(
            eq(contextItems.accountId, conn.accountId),
            inArray(contextItems.source, sources),
          ),
        );
      processed += ids.size;
    }

    // Activity touches: one-shot ingest per activity. `ingestHubspotActivityById`
    // no-ops if the account hasn't enabled the relevant toggle, so it's safe to
    // dispatch unconditionally.
    for (const [kind, ids] of [
      ["note", noteTouches] as const,
      ["email", emailTouches] as const,
    ]) {
      for (const id of ids) {
        try {
          const outcome = await ingestHubspotActivityById({
            accountId: conn.accountId,
            activityId: id,
            kind,
          });
          if (outcome === "inserted" || outcome === "updated") processed += 1;
          else skipped += 1;
        } catch (e) {
          captureIntegrationException(e, {
            integration: "hubspot",
            operation: "webhook_activity",
            level: "warning",
            context: { kind, activityId: id },
          });
          console.warn(
            `[hubspot-webhook] activity ${kind}:${id} failed:`,
            (e as Error).message?.slice(0, 200),
          );
          skipped += 1;
        }
      }
    }

    // Deletions: just remove any matching rows regardless of pipeline.
    if (dealDeletions.size > 0) {
      await db
        .delete(pipelineCompanies)
        .where(
          and(
            eq(pipelineCompanies.accountId, conn.accountId),
            inArray(pipelineCompanies.providerDealId, Array.from(dealDeletions)),
          ),
        );
      processed += dealDeletions.size;
    }

    if (dealTouches.size === 0) continue;
    if (configs.length === 0) {
      // No pipelines enabled — can't route these deals anywhere.
      skipped += dealTouches.size;
      continue;
    }

    // Search doesn't return associations; batch-read does. Go straight to
    // batch/read since we already have the deal IDs.
    const dealIds = Array.from(dealTouches);
    const batch = await client.post<{ results: HubspotDeal[] }>(
      "/crm/v3/objects/deals/batch/read",
      {
        properties: [
          "dealname",
          "amount",
          "dealstage",
          "pipeline",
          "closedate",
          "createdate",
          "hs_lastmodifieddate",
        ],
        associations: ["companies", "contacts"],
        inputs: dealIds.map((id) => ({ id })),
      },
    );

    const fetchedDeals = batch.results;
    const companyIds = new Set<string>();
    for (const d of fetchedDeals) {
      for (const c of d.associations?.companies?.results ?? []) companyIds.add(c.id);
    }
    const companies =
      companyIds.size > 0 ? await getCompaniesByIds(client, Array.from(companyIds)) : [];
    const companyById = new Map(companies.map((c) => [c.id, c]));

    const now = new Date();
    for (const deal of fetchedDeals) {
      const pipelineId = deal.properties.pipeline ?? "";
      const config = configByPipelineId.get(pipelineId);
      if (!config) {
        // Deal moved to a pipeline we don't track — remove any stale row.
        await db
          .delete(pipelineCompanies)
          .where(
            and(
              eq(pipelineCompanies.accountId, conn.accountId),
              eq(pipelineCompanies.providerDealId, deal.id),
            ),
          );
        skipped += 1;
        continue;
      }

      const companyId = deal.associations?.companies?.results?.[0]?.id;
      const hsCo = companyId ? companyById.get(companyId) : undefined;

      // Webhook path doesn't fetch contacts, so candidates are just the
      // company's own domain + website. The full sync expands this with
      // non-free contact email domains.
      const domainCandidates: string[] = [];
      const seenDomain = new Set<string>();
      for (const raw of [hsCo?.properties.domain, hsCo?.properties.website]) {
        const d = normalizeDomain(raw);
        if (d && !seenDomain.has(d)) {
          seenDomain.add(d);
          domainCandidates.push(d);
        }
      }

      const [existing] = await db
        .select()
        .from(pipelineCompanies)
        .where(
          and(
            eq(pipelineCompanies.pipelineConfigId, config.id),
            eq(pipelineCompanies.providerDealId, deal.id),
          ),
        )
        .limit(1);

      const values = {
        accountId: conn.accountId,
        pipelineConfigId: config.id,
        provider: "hubspot" as const,
        providerDealId: deal.id,
        providerCompanyId: companyId ?? null,
        providerPipelineId: pipelineId,
        providerPipelineStageId: deal.properties.dealstage ?? null,
        companyName: hsCo?.properties.name ?? null,
        companyDomain: domainCandidates[0] ?? null,
        companyDomains: domainCandidates.length > 0 ? domainCandidates : null,
        companyIndustry: hsCo?.properties.industry ?? null,
        companyCity: hsCo?.properties.city ?? null,
        companyCountry: hsCo?.properties.country ?? null,
        companyEmployees: hsCo?.properties.numberofemployees ?? null,
        dealName: deal.properties.dealname ?? null,
        dealAmount: deal.properties.amount ? Number(deal.properties.amount) : null,
        dealCloseDate: deal.properties.closedate ? new Date(deal.properties.closedate) : null,
        rawDeal: deal as unknown as Record<string, unknown>,
        rawCompany: (hsCo as unknown as Record<string, unknown>) ?? null,
        lastSeenAt: now,
        updatedAt: now,
      };

      if (existing) {
        await db
          .update(pipelineCompanies)
          .set(values)
          .where(eq(pipelineCompanies.id, existing.id));
      } else {
        await db.insert(pipelineCompanies).values({ id: randomUUID(), ...values });
      }
      processed += 1;
    }

    // Relist unhandled events as skipped (company.* we didn't explicitly handle).
    const unhandled =
      events.length - dealDeletions.size - fetchedDeals.length;
    if (unhandled > 0) skipped += unhandled;
  }

  return { processed, skipped };
}

export async function listDealsForReconcile(
  client: HubspotClient,
  opts: { pipelineId: string },
): Promise<HubspotDeal[]> {
  const all: HubspotDeal[] = [];
  let after: string | undefined;
  for (let i = 0; i < 20; i++) {
    const page = await listDealsInPipeline(client, { pipelineId: opts.pipelineId, after, limit: 100 });
    all.push(...page.results);
    after = page.paging?.next?.after;
    if (!after) break;
  }
  return all;
}
