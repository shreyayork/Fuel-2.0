import "server-only";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { runOverviewJob } from "@/lib/overview/run-overview-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const Body = z.object({
  runId: z.string().uuid(),
});

export async function POST(req: Request): Promise<Response> {
  const token = process.env.INTERNAL_CRON_TOKEN;
  const auth = req.headers.get("authorization");
  if (!token || auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { runId } = Body.parse(await req.json());
    // Timing block (DB / Bedrock / persist / Total API Time) is emitted by
    // runOverviewGeneration when OVERVIEW_PERF_LOG is enabled.
    await runOverviewJob(runId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    Sentry.captureException(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
