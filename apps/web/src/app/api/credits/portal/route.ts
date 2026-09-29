import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import {
  createBillingPortalSession,
  isStripeConfigured,
} from "@/lib/credits/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  try {
    const url = await createBillingPortalSession(auth.account);
    return NextResponse.json({ url });
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureException(error);
    throw error;
  }
}
