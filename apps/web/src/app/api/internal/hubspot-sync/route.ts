import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncAllEnabledHubspotPipelines } from "@/lib/pipelines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function matchesSecret(headerValue: string | null, expected: string | undefined): boolean {
  if (!expected || !headerValue) return false;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!matchesSecret(bearer, process.env.INTERNAL_CRON_TOKEN)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { accountId?: string };
  if (!body.accountId) return NextResponse.json({ error: "missing_accountId" }, { status: 400 });

  console.log(`[hubspot-sync-job] starting for account=${body.accountId}`);
  const results = await syncAllEnabledHubspotPipelines({ accountId: body.accountId });
  console.log(
    `[hubspot-sync-job] done for account=${body.accountId} — ${results.length} configs synced`,
  );
  return NextResponse.json({ ok: true, results });
}
