import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import {
  CouponValidationError,
  createSubscriptionCheckout,
  isStripeConfigured,
  StripePriceNotConfiguredError,
} from "@/lib/credits/stripe";
import {
  PROMO_VALIDATION_MESSAGES,
  type PromoValidationError,
} from "@/lib/credits/coupon-validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let body: { billingCycle?: string; promotionCode?: string };
  try {
    body = (await req.json()) as { billingCycle?: string; promotionCode?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const billingCycle = body.billingCycle === "monthly" ? "monthly" : "annual";
  const promotionCode =
    typeof body.promotionCode === "string" ? body.promotionCode : undefined;

  try {
    const url = await createSubscriptionCheckout({
      account: auth.account,
      billingCycle,
      userEmail: auth.email,
      promotionCode,
    });
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof CouponValidationError) {
      const code = error.code as PromoValidationError;
      return NextResponse.json(
        {
          error: "coupon_invalid",
          code,
          message: PROMO_VALIDATION_MESSAGES[code],
        },
        { status: 400 },
      );
    }
    if (error instanceof StripePriceNotConfiguredError) {
      return NextResponse.json(
        {
          error: "stripe_price_not_configured",
          reason: error.reason,
          message:
            "Set STRIPE_PRO_MONTHLY_PRICE_ID / STRIPE_PRO_ANNUAL_PRICE_ID to a Stripe Price id (price_…).",
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
