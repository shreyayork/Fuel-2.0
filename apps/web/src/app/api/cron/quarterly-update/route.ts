import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { runQuarterlyUpdateJob } from "@/lib/email/quarterly-update-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function unauthorized(): Response {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: Request): Promise<Response> {
  const expected = process.env.INTERNAL_CRON_TOKEN;
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!expected || !m || m[1].trim() !== expected) return unauthorized();

  try {
    const result = await runQuarterlyUpdateJob();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
