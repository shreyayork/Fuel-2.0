import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { isSentryEnabled } from "@/lib/sentry/options";

function isDebugRouteEnabled(): boolean {
  if (process.env.STAGE === "prod") return false;
  return isSentryEnabled(process.env.SENTRY_DSN);
}

export async function GET() {
  if (!isDebugRouteEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  Sentry.captureMessage("Sentry test event", "info");

  return NextResponse.json({
    ok: true,
    message: "Test message sent to Sentry",
  });
}

export async function POST() {
  if (!isDebugRouteEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const error = new Error("Sentry server test exception");
  Sentry.captureException(error);
  throw error;
}
