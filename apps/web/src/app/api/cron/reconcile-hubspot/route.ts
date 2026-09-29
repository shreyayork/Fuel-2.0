import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { reconcileAllAccounts } from "@/lib/pipelines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function matchesSecret(headerValue: string | null, expected: string | undefined): boolean {
  if (!expected || !headerValue) return false;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * HubSpot deal/pipeline reconcile only.
 * Note/email activity sync (+ Intelligence) lives at /api/cron/sync-hubspot-activities.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!matchesSecret(bearer, process.env.INTERNAL_CRON_TOKEN)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await reconcileAllAccounts();

  return NextResponse.json({
    ok: true,
    accounts: results.length,
    results,
  });
}
