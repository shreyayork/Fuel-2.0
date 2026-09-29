import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { desc, eq, and, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import {
  contextItems,
  integrationActivityConfigs,
  integrationCompanyLinks,
  integrationConnections,
  integrationPipelineConfigs,
  pipelineCompanies,
} from "@/db/schema";
import {
  HubspotClient,
  listDealsInPipeline,
  listDealPipelines,
  searchEmailsSince,
  searchNotesSince,
} from "@/lib/hubspot-client";
import { getIntegration } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diag endpoint — dumps the state of HubSpot pipeline sync so we can figure
 * out why rows aren't showing up. Returns:
 *   - connection status
 *   - configs (enabled/disabled, lastSyncAt, syncState)
 *   - pipeline_companies counts per config
 *   - a dry-run of listDealsInPipeline for each enabled config to see if
 *     the HubSpot side has deals at all
 */
export async function GET() {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session) redirect("/sign-in");
  }
  const email = (await getSession())?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) return NextResponse.json({ error: "no_account" }, { status: 400 });

  const db = await getDb();
  const conn = await getIntegration({ accountId: account.id, provider: "hubspot" });
  const configs = await db
    .select()
    .from(integrationPipelineConfigs)
    .where(
      and(
        eq(integrationPipelineConfigs.accountId, account.id),
        eq(integrationPipelineConfigs.provider, "hubspot"),
      ),
    )
    .orderBy(desc(integrationPipelineConfigs.updatedAt));

  const totalPipelineCompanies = await db
    .select({ n: sql<string>`count(*)::text` })
    .from(pipelineCompanies)
    .where(eq(pipelineCompanies.accountId, account.id));

  const perConfig: Array<Record<string, unknown>> = [];
  for (const c of configs) {
    const [{ n }] = await db
      .select({ n: sql<string>`count(*)::text` })
      .from(pipelineCompanies)
      .where(
        and(
          eq(pipelineCompanies.accountId, account.id),
          eq(pipelineCompanies.pipelineConfigId, c.id),
        ),
      );
    perConfig.push({
      id: c.id,
      providerPipelineId: c.providerPipelineId,
      providerPipelineName: c.providerPipelineName,
      enabled: c.enabled,
      lastSyncAt: c.lastSyncAt,
      syncState: c.syncState,
      cachedCompanies: Number(n),
    });
  }

  // Try a live probe: can we reach HubSpot and list deals for each enabled config?
  let probe: Record<string, unknown> = { attempted: false };
  try {
    const client = await HubspotClient.forAccount(account.id);
    if (!client) {
      probe = { attempted: true, ok: false, reason: "HubspotClient.forAccount returned null" };
    } else {
      const pipelines = await listDealPipelines(client);
      const enabled = configs.filter((c) => c.enabled);
      const perEnabled: Record<string, unknown>[] = [];
      for (const c of enabled) {
        try {
          const page = await listDealsInPipeline(client, {
            pipelineId: c.providerPipelineId,
            limit: 5,
          });
          perEnabled.push({
            pipelineId: c.providerPipelineId,
            pipelineName: c.providerPipelineName,
            dealsReturned: page.results.length,
            sampleDealIds: page.results.slice(0, 5).map((d) => d.id),
            paging: page.paging ?? null,
            // Raw shape of first deal — critical for debugging whether
            // `associations` are coming back from HubSpot's search API.
            sampleDealRaw: page.results[0] ?? null,
            sampleDealHasCompanies:
              (page.results[0]?.associations?.companies?.results ?? []).length,
            sampleDealHasContacts:
              (page.results[0]?.associations?.contacts?.results ?? []).length,
          });
        } catch (e) {
          perEnabled.push({
            pipelineId: c.providerPipelineId,
            pipelineName: c.providerPipelineName,
            error: (e as Error).message?.slice(0, 400),
          });
        }
      }
      probe = {
        attempted: true,
        ok: true,
        knownPipelines: pipelines.map((p) => ({
          id: p.id,
          label: p.label,
          stages: p.stages.length,
        })),
        enabledProbe: perEnabled,
      };
    }
  } catch (e) {
    probe = { attempted: true, ok: false, reason: (e as Error).message?.slice(0, 400) };
  }

  // --- Activity sync block ---------------------------------------------------
  const activityConfig = conn
    ? (
        await db
          .select()
          .from(integrationActivityConfigs)
          .where(
            and(
              eq(integrationActivityConfigs.accountId, account.id),
              eq(integrationActivityConfigs.connectionId, conn.id),
              eq(integrationActivityConfigs.provider, "hubspot"),
            ),
          )
          .limit(1)
      )[0] ?? null
    : null;

  const [{ nActivity }] = await db
    .select({ nActivity: sql<string>`count(*)::text` })
    .from(contextItems)
    .where(
      and(
        eq(contextItems.accountId, account.id),
        eq(contextItems.kind, "hubspot_activity"),
      ),
    );

  const [{ nLinks }] = conn
    ? await db
        .select({ nLinks: sql<string>`count(*)::text` })
        .from(integrationCompanyLinks)
        .where(
          and(
            eq(integrationCompanyLinks.accountId, account.id),
            eq(integrationCompanyLinks.connectionId, conn.id),
          ),
        )
    : [{ nLinks: "0" }];

  let activityProbe: Record<string, unknown> = { attempted: false };
  if (conn && activityConfig && (activityConfig.syncEmails || activityConfig.syncNotes)) {
    try {
      const client = await HubspotClient.forAccount(account.id);
      if (!client) {
        activityProbe = { attempted: true, ok: false, reason: "HubspotClient.forAccount returned null" };
      } else {
        const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
        const probeResults: Record<string, unknown> = { attempted: true, ok: true };
        if (activityConfig.syncEmails) {
          try {
            const r = await searchEmailsSince(client, { modifiedSinceMs: sinceMs, limit: 5 });
            probeResults.emails = { ids: r.ids, hasMore: !!r.nextAfter };
          } catch (e) {
            probeResults.emails = { error: (e as Error).message?.slice(0, 200) };
          }
        }
        if (activityConfig.syncNotes) {
          try {
            const r = await searchNotesSince(client, { modifiedSinceMs: sinceMs, limit: 5 });
            probeResults.notes = { ids: r.ids, hasMore: !!r.nextAfter };
          } catch (e) {
            probeResults.notes = { error: (e as Error).message?.slice(0, 200) };
          }
        }
        activityProbe = probeResults;
      }
    } catch (e) {
      activityProbe = { attempted: true, ok: false, reason: (e as Error).message?.slice(0, 400) };
    }
  }

  return NextResponse.json({
    account: { id: account.id, name: account.name },
    connection: conn
      ? {
          id: conn.id,
          status: conn.status,
          installedByEmail: conn.installedByEmail,
          accountExternalId: conn.accountExternalId,
          installedAt: conn.installedAt,
          hasAccessToken:
            typeof (conn.credentials as { accessToken?: string })?.accessToken === "string",
          expiresAt: (conn.credentials as { expiresAt?: number })?.expiresAt
            ? new Date((conn.credentials as { expiresAt: number }).expiresAt).toISOString()
            : null,
          scopes:
            (conn.metadata as { scopes?: string[] } | null | undefined)?.scopes ?? null,
        }
      : null,
    configs: perConfig,
    totalPipelineCompanies: Number(totalPipelineCompanies[0]?.n ?? 0),
    probe,
    activity: {
      config: activityConfig
        ? {
            syncEmails: activityConfig.syncEmails,
            syncNotes: activityConfig.syncNotes,
            associationScope: activityConfig.associationScope,
            backfillSince: activityConfig.backfillSince,
            lastEmailSyncAt: activityConfig.lastEmailSyncAt,
            lastNoteSyncAt: activityConfig.lastNoteSyncAt,
            syncState: activityConfig.syncState,
          }
        : null,
      totalContextItems: Number(nActivity ?? 0),
      companyLinks: Number(nLinks ?? 0),
      probe: activityProbe,
    },
  });
}
