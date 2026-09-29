import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  integrationActivityConfigs,
  integrationConnections,
} from "@/db/schema";
import { syncHubspotActivitiesForAccount } from "@/lib/integrations/hubspot-activity-sync";
import {
  captureIntegrationException,
  captureIntegrationMessage,
} from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Cap chained follow-ups for daily backlog catch-up. Each hop is its own
// Lambda with a fresh 5-min budget.
const MAX_CHAIN_DEPTH = 3;
const CHAIN_IF_SEEN_EXCEEDS = 100;

function matchesSecret(
  headerValue: string | null,
  expected: string | undefined,
): boolean {
  if (!expected || !headerValue) return false;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * HubSpot note/email activity sync → context_items → Intelligence/Initiatives.
 * Scheduled daily (separate from hourly pipeline reconcile).
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!matchesSecret(bearer, process.env.INTERNAL_CRON_TOKEN)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const chainDepth = Number(url.searchParams.get("chainDepth") ?? "0") || 0;

  const db = await getDb();
  const rows = await db
    .select({ accountId: integrationActivityConfigs.accountId })
    .from(integrationActivityConfigs)
    .innerJoin(
      integrationConnections,
      eq(integrationActivityConfigs.connectionId, integrationConnections.id),
    )
    .where(
      and(
        eq(integrationActivityConfigs.provider, "hubspot"),
        eq(integrationConnections.status, "connected"),
      ),
    );

  const accountIds = Array.from(new Set(rows.map((r) => r.accountId)));

  const activities: Array<{
    accountId: string;
    reports: Awaited<ReturnType<typeof syncHubspotActivitiesForAccount>>;
    error?: string;
  }> = [];

  for (const accountId of accountIds) {
    try {
      const reports = await syncHubspotActivitiesForAccount({
        accountId,
        // Dedicated activity cron — charge hubspotSync credits here.
        chargeCredits: true,
      });
      activities.push({ accountId, reports });
    } catch (e) {
      captureIntegrationException(e, {
        integration: "hubspot",
        operation: "cron_activity_sync",
        context: { accountId },
      });
      activities.push({
        accountId,
        reports: [],
        error: (e as Error).message?.slice(0, 200),
      });
    }
  }

  const totalSeen = activities.reduce(
    (sum, a) =>
      sum +
      a.reports.reduce(
        (s, r) => s + (r.emails.seen ?? 0) + (r.notes.seen ?? 0),
        0,
      ),
    0,
  );

  let chained = false;
  if (
    chainDepth < MAX_CHAIN_DEPTH &&
    totalSeen >= CHAIN_IF_SEEN_EXCEEDS &&
    process.env.HUBSPOT_ACTIVITY_SYNC_CRON_FN_NAME
  ) {
    try {
      const { LambdaClient, InvokeCommand } = await import(
        "@aws-sdk/client-lambda"
      );
      const client = new LambdaClient({});
      await client.send(
        new InvokeCommand({
          FunctionName: process.env.HUBSPOT_ACTIVITY_SYNC_CRON_FN_NAME,
          InvocationType: "Event",
          Payload: new TextEncoder().encode(
            JSON.stringify({ chainDepth: chainDepth + 1 }),
          ),
        }),
      );
      chained = true;
      console.log(
        `[hubspot-activity-cron] chained next run (depth ${chainDepth + 1}/${MAX_CHAIN_DEPTH}) — ${totalSeen} activities seen`,
      );
    } catch (e) {
      captureIntegrationMessage("HubSpot activity sync chain dispatch failed", {
        integration: "hubspot",
        operation: "activity_sync_chain",
        context: { chainDepth },
      });
      console.warn(
        "[hubspot-activity-cron] chain dispatch failed:",
        (e as Error).message?.slice(0, 200),
      );
    }
  }

  return NextResponse.json({
    ok: true,
    accounts: accountIds.length,
    activities,
    chainDepth,
    totalActivitiesSeen: totalSeen,
    chained,
  });
}
