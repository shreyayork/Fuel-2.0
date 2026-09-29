import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  clearExpiredDailyBlocks,
  resetFreeMonthlyLedgers,
  revertExpiredCanceledSubscriptions,
} from "@/lib/credits/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(): Response {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: Request): Promise<Response> {
  const expected = process.env.INTERNAL_CRON_TOKEN;
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!expected || !m || m[1].trim() !== expected) return unauthorized();

  const url = new URL(req.url);
  const job = url.searchParams.get("job") ?? "daily";

  try {
    if (job === "monthly") {
      const reset = await resetFreeMonthlyLedgers();
      return NextResponse.json({ ok: true, job, reset });
    }

    const [unblocked, downgraded] = await Promise.all([
      clearExpiredDailyBlocks(),
      revertExpiredCanceledSubscriptions(),
    ]);
    return NextResponse.json({ ok: true, job: "daily", unblocked, downgraded });
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
