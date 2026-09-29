import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import {
  createTopUpCheckout,
  isStripeConfigured,
  StripePriceNotConfiguredError,
  TopUpRequiresProError,
} from "@/lib/credits/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let body: { packSlug?: string };
  try {
    body = (await req.json()) as { packSlug?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const packSlug = body.packSlug?.trim();
  if (!packSlug) {
    return NextResponse.json({ error: "pack_slug_required" }, { status: 400 });
  }

  try {
    const url = await createTopUpCheckout({
      account: auth.account,
      packSlug,
    });
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof TopUpRequiresProError) {
      return NextResponse.json(
        { error: "topups_require_pro", message: "Top-ups require Pro plan" },
        { status: 403 },
      );
    }
    if (error instanceof StripePriceNotConfiguredError) {
      return NextResponse.json(
        {
          error: "stripe_price_not_configured",
          reason: error.reason,
          message:
            "Set the matching STRIPE_TOPUP_*_PRICE_ID to a Stripe Price id (price_…).",
        },
        { status: 400 },
      );
    }
    Sentry.setTag("integration", "stripe");
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "checkout_failed";
    return NextResponse.json({ error: "checkout_failed", message }, { status: 500 });
  }
}
