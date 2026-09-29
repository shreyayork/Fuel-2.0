import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import {
  cancelSubscriptionAtPeriodEnd,
  isStripeConfigured,
  resumeSubscription,
} from "@/lib/credits/stripe";
import { getCreditSnapshot } from "@/lib/credits/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let action: "cancel" | "resume" = "cancel";
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    if (body.action === "resume") action = "resume";
  } catch {
    action = "cancel";
  }

  try {
    if (action === "resume") {
      await resumeSubscription(auth.account.id);
    } else {
      await cancelSubscriptionAtPeriodEnd(auth.account.id);
    }
    const snapshot = await getCreditSnapshot(auth.account.id);
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "cancel_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
