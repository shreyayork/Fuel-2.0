import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { integrationConnections } from "@/db/schema";
import { syncGranolaConnection } from "@/lib/integrations/granola-sync";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(): Response {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: Request): Promise<Response> {
  // Shared-secret gate — matches the HubSpot reconcile pattern.
  const expected = process.env.INTERNAL_CRON_TOKEN;
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!expected || !m || m[1].trim() !== expected) return unauthorized();

  // Allow `?backfill=1` or JSON body `{ backfill: true }` to ignore the cursor
  // — used by the "Sync history" button in the integration settings.
  const url = new URL(req.url);
  const qsBackfill = url.searchParams.get("backfill") === "1";
  let bodyBackfill = false;
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = (await req.json()) as { backfill?: boolean };
      bodyBackfill = body.backfill === true;
    }
  } catch {
    // no body, ignore
  }
  const backfill = qsBackfill || bodyBackfill;

  const db = await getDb();
  const connections = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.provider, "granola"));

  const reports = [];
  for (const c of connections) {
    if (c.status !== "connected") continue;
    try {
      const r = await syncGranolaConnection({
        connection: c,
        since: backfill ? null : undefined,
      });
      reports.push(r);
    } catch (e) {
      captureIntegrationException(e, {
        integration: "granola",
        operation: "cron_sync",
        context: { accountId: c.accountId, connectionId: c.id },
      });
      reports.push({
        accountId: c.accountId,
        connectionId: c.id,
        error: (e as Error).message.slice(0, 200),
      });
    }
  }

  return NextResponse.json({ ok: true, count: reports.length, backfill, reports });
}
