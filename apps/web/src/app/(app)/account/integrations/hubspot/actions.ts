"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import {
  getIntegration,
  removePipelineConfig,
  upsertActivityConfig,
  upsertPipelineConfig,
} from "@/lib/integrations";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { integrationPipelineConfigs } from "@/db/schema";
import { syncAllEnabledHubspotPipelines, syncHubspotConfig } from "@/lib/pipelines";
import { syncHubspotActivitiesForAccount } from "@/lib/integrations/hubspot-activity-sync";
import { captureIntegrationException, captureIntegrationMessage } from "@/lib/sentry/capture";

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

async function requireManager(accountId: string, email: string) {
  const m = await getMembership({ accountId, userEmail: email });
  if (!m || (m.role !== "owner" && m.role !== "admin")) {
    throw new Error("not authorized");
  }
}

export async function togglePipelineAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;
  await requireManager(account.id, email);

  const providerPipelineId = String(formData.get("providerPipelineId") ?? "");
  const providerPipelineName = String(formData.get("providerPipelineName") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!providerPipelineId || !providerPipelineName) return;

  const conn = await getIntegration({ accountId: account.id, provider: "hubspot" });
  if (!conn) return;

  const config = await upsertPipelineConfig({
    accountId: account.id,
    connectionId: conn.id,
    provider: "hubspot",
    providerPipelineId,
    providerPipelineName,
    enabled,
  });
  // When a pipeline is enabled, immediately backfill so the Pipeline view has
  // data the moment the user flips it on. Fire-and-catch so the UI never
  // blocks on a slow HubSpot account — any error is surfaced via the config's
  // lastSyncAt / syncState on the next page load.
  if (enabled) {
    try {
      await syncHubspotConfig({ accountId: account.id, config });
    } catch (e) {
      captureIntegrationException(e, {
        integration: "hubspot",
        operation: "pipeline_backfill",
        level: "warning",
        context: { configId: config.id },
      });
      // Non-fatal; user can retry via "Sync now".
    }
  }
  revalidatePath("/account/integrations/hubspot");
  revalidatePath("/pipeline");
}

export async function removePipelineConfigAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;
  await requireManager(account.id, email);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await removePipelineConfig({ accountId: account.id, id });
  revalidatePath("/account/integrations/hubspot");
}

export type SyncHubspotPipelinesResult =
  | {
      ok: true;
      queuedAt: string;
      enabledCount: number;
      mode: "inline" | "async";
    }
  | {
      ok: false;
      error: "no_account" | "no_enabled_pipelines";
      enabledCount: 0;
    };

/**
 * Queue a HubSpot sync in the background so the UI doesn't block for ~20s.
 * We stamp a `queuedAt` marker on every enabled config (the UI polls this
 * against `lastSyncAt` to know when the job finishes) and fire an async
 * Lambda self-invocation of the internal sync endpoint. Falls back to an
 * inline run if self-invoke isn't configured (local dev).
 *
 * Returns a structured result so the UI can stop immediately when there is
 * nothing to sync (no enabled pipelines) instead of polling forever.
 */
export async function syncHubspotPipelinesAction(): Promise<SyncHubspotPipelinesResult> {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return { ok: false, error: "no_account", enabledCount: 0 };
  await requireManager(account.id, email);

  // Mark every enabled config as "queued" so the UI shows a spinner until
  // the background job actually completes and bumps `lastSyncAt`.
  const db = await getDb();
  const queuedAt = new Date().toISOString();
  const configs = await db
    .select()
    .from(integrationPipelineConfigs)
    .where(
      and(
        eq(integrationPipelineConfigs.accountId, account.id),
        eq(integrationPipelineConfigs.provider, "hubspot"),
        eq(integrationPipelineConfigs.enabled, true),
      ),
    );

  if (configs.length === 0) {
    return { ok: false, error: "no_enabled_pipelines", enabledCount: 0 };
  }

  for (const c of configs) {
    const state = (c.syncState ?? {}) as Record<string, unknown>;
    await db
      .update(integrationPipelineConfigs)
      .set({ syncState: { ...state, queuedAt }, updatedAt: new Date() })
      .where(eq(integrationPipelineConfigs.id, c.id));
  }

  const lambdaName = process.env.AWS_LAMBDA_FUNCTION_NAME;
  const appUrl = process.env.APP_URL;
  const cronToken = process.env.INTERNAL_CRON_TOKEN;
  let mode: "inline" | "async" = "inline";

  if (lambdaName && appUrl && cronToken) {
    // Background path: invoke this same Lambda asynchronously with a
    // synthetic Function URL event targeting /api/internal/hubspot-sync.
    // InvocationType=Event returns immediately; the target run is its own
    // new Lambda invocation (own 5-min timeout).
    const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
    const client = new LambdaClient({});
    const event = {
      version: "2.0",
      routeKey: "$default",
      rawPath: "/api/internal/hubspot-sync",
      rawQueryString: "",
      headers: {
        authorization: `Bearer ${cronToken}`,
        "content-type": "application/json",
        host: new URL(appUrl).host,
      },
      requestContext: {
        http: {
          method: "POST",
          path: "/api/internal/hubspot-sync",
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: "internal-dispatch",
        },
        requestId: "internal-" + queuedAt,
        stage: "$default",
        time: queuedAt,
        timeEpoch: Date.now(),
        routeKey: "$default",
        accountId: "self",
      },
      body: JSON.stringify({ accountId: account.id }),
      isBase64Encoded: false,
    };
    try {
      await client.send(
        new InvokeCommand({
          FunctionName: lambdaName,
          InvocationType: "Event",
          Payload: new TextEncoder().encode(JSON.stringify(event)),
        }),
      );
      mode = "async";
    } catch (e) {
      captureIntegrationMessage("HubSpot async sync dispatch failed, falling back inline", {
        integration: "hubspot",
        operation: "async_dispatch",
        context: { accountId: account.id },
      });
      console.warn("[sync] async dispatch failed, falling back inline:", (e as Error).message);
      await syncAllEnabledHubspotPipelines({ accountId: account.id });
      mode = "inline";
    }
  } else {
    // Local/dev fallback — just run inline.
    await syncAllEnabledHubspotPipelines({ accountId: account.id });
    mode = "inline";
  }

  revalidatePath("/account/integrations/hubspot");
  revalidatePath("/pipeline");
  return { ok: true, queuedAt, enabledCount: configs.length, mode };
}

export async function saveActivityConfigAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;
  await requireManager(account.id, email);

  const conn = await getIntegration({ accountId: account.id, provider: "hubspot" });
  if (!conn) return;

  const syncEmails = formData.get("syncEmails") === "true";
  const syncNotes = formData.get("syncNotes") === "true";
  const scopeRaw = String(formData.get("associationScope") ?? "both");
  const associationScope =
    scopeRaw === "company" || scopeRaw === "contact" ? scopeRaw : "both";
  const backfillRaw = String(formData.get("backfillSince") ?? "").trim();
  const backfillSince = backfillRaw ? new Date(backfillRaw) : null;

  await upsertActivityConfig({
    accountId: account.id,
    connectionId: conn.id,
    provider: "hubspot",
    syncEmails,
    syncNotes,
    associationScope,
    backfillSince:
      backfillSince && Number.isFinite(backfillSince.getTime())
        ? backfillSince
        : null,
  });

  // Kick an immediate sync so the user sees activity appear without waiting
  // for the next cron cycle. Await intelligence (skipExtraction: false) —
  // fire-and-forget dies when the Server Action / Lambda freezes on return.
  if (syncEmails || syncNotes) {
    try {
      await syncHubspotActivitiesForAccount({
        accountId: account.id,
        skipExtraction: false,
      });
    } catch (e) {
      captureIntegrationException(e, {
        integration: "hubspot",
        operation: "activity_sync",
        level: "warning",
        context: { accountId: account.id },
      });
      /* surfaced on next page load via syncState */
    }
  }
  revalidatePath("/account/integrations/hubspot");
}

export async function renamePipelineConfigAction(formData: FormData) {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) return;
  await requireManager(account.id, email);
  const providerPipelineId = String(formData.get("providerPipelineId") ?? "");
  const providerPipelineName = String(formData.get("providerPipelineName") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const conn = await getIntegration({ accountId: account.id, provider: "hubspot" });
  if (!conn || !providerPipelineId) return;
  await upsertPipelineConfig({
    accountId: account.id,
    connectionId: conn.id,
    provider: "hubspot",
    providerPipelineId,
    providerPipelineName,
    enabled: true,
    label: label || null,
  });
  revalidatePath("/account/integrations/hubspot");
}
