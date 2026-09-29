import { AccountLayout } from "@/components/views/AccountLayout";
import { HubspotConfigView } from "@/components/views/HubspotConfigView";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import {
  getActivityConfig,
  getIntegration,
  listPipelineConfigs,
} from "@/lib/integrations";
import {
  HubspotClient,
  listDealPipelines,
  type HubspotPipeline,
} from "@/lib/hubspot-client";
import { HUBSPOT_ACTIVITY_SCOPES } from "@/lib/integrations/registry";

export const dynamic = "force-dynamic";

export default async function HubspotConfigPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";

  const account = await getActiveAccountForUser(email);

  if (!account) {
    return <div style={{ padding: 40 }}>No account yet.</div>;
  }

  const membership = await getMembership({ accountId: account.id, userEmail: email });
  const role = membership?.role ?? "member";
  const canManage = role === "owner" || role === "admin";

  const conn = await getIntegration({ accountId: account.id, provider: "hubspot" });

  let pipelines: HubspotPipeline[] = [];
  let fetchError: string | null = null;
  if (conn) {
    try {
      const client = await HubspotClient.forAccount(account.id);
      if (client) pipelines = await listDealPipelines(client);
    } catch (e) {
      fetchError = (e as Error).message;
    }
  }

  const configs = await listPipelineConfigs({ accountId: account.id, provider: "hubspot" });
  const configByPipelineId = new Map(configs.map((c) => [c.providerPipelineId, c]));
  // If any pipeline has been synced, bubble up the most recent sync time.
  const lastSyncAt = configs
    .map((c) => c.lastSyncAt?.getTime() ?? 0)
    .reduce((a, b) => Math.max(a, b), 0);

  const activityConfig = conn
    ? await getActivityConfig({
        accountId: account.id,
        connectionId: conn.id,
        provider: "hubspot",
      })
    : null;

  // Determine which scopes are missing on the stored install. If the user
  // installed HubSpot before we added activity sync, they need to re-auth to
  // grant sales-email-read + owners before toggles become useful.
  const grantedScopes = new Set(
    Array.isArray((conn?.metadata as Record<string, unknown> | null | undefined)?.scopes)
      ? ((conn!.metadata as { scopes?: string[] }).scopes ?? [])
      : [],
  );
  const missingActivityScopes = HUBSPOT_ACTIVITY_SCOPES.filter(
    (s) => !grantedScopes.has(s),
  );

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <HubspotConfigView
        connection={conn}
        pipelines={pipelines.map((p) => ({
          id: p.id,
          label: p.label,
          stageCount: p.stages.length,
          config: configByPipelineId.get(p.id)
            ? {
                id: configByPipelineId.get(p.id)!.id,
                enabled: configByPipelineId.get(p.id)!.enabled,
                label: configByPipelineId.get(p.id)!.label,
              }
            : null,
        }))}
        fetchError={fetchError}
        canManage={canManage}
        lastSyncAt={lastSyncAt > 0 ? new Date(lastSyncAt).toISOString() : null}
        activityConfig={
          activityConfig
            ? {
                syncEmails: activityConfig.syncEmails,
                syncNotes: activityConfig.syncNotes,
                associationScope: activityConfig.associationScope,
                backfillSince: activityConfig.backfillSince?.toISOString() ?? null,
                lastEmailSyncAt: activityConfig.lastEmailSyncAt?.toISOString() ?? null,
                lastNoteSyncAt: activityConfig.lastNoteSyncAt?.toISOString() ?? null,
                syncState: (activityConfig.syncState ?? null) as Record<
                  string,
                  unknown
                > | null,
              }
            : null
        }
        missingActivityScopes={missingActivityScopes}
      />
    </AccountLayout>
  );
}
