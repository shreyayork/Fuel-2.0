import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import { getCreditSnapshot } from "@/lib/credits/queries";
import { isStripeConfigured } from "@/lib/credits/stripe";
import { reconcileAccountSubscription } from "@/lib/credits/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  try {
    const updated = await reconcileAccountSubscription(auth.account.id);
    const snapshot = await getCreditSnapshot(auth.account.id);
    return NextResponse.json({ updated, snapshot });
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureException(error);
    return NextResponse.json({ error: "reconcile_failed" }, { status: 500 });
  }
}
