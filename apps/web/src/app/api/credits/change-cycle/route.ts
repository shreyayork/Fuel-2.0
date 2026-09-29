import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import { getCreditSnapshot } from "@/lib/credits/queries";
import {
  PROMO_VALIDATION_MESSAGES,
  type PromoValidationError,
} from "@/lib/credits/coupon-validate-shared";
import {
  changeBillingCycleAtPeriodBoundary,
  CouponValidationError,
  isStripeConfigured,
  StripePriceNotConfiguredError,
} from "@/lib/credits/stripe";

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
    const result = await changeBillingCycleAtPeriodBoundary({
      accountId: auth.account.id,
      billingCycle,
      account: auth.account,
      userEmail: auth.email,
      promotionCode,
    });
    if (result.applied === "payment_required") {
      return NextResponse.json({
        ok: true,
        applied: "payment_required",
        url: result.url,
      });
    }
    const snapshot = await getCreditSnapshot(auth.account.id);
    return NextResponse.json({ ok: true, applied: result.applied, snapshot });
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
        { error: "stripe_price_not_configured", reason: error.reason },
        { status: 400 },
      );
    }
    Sentry.setTag("integration", "stripe");
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "cycle_change_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
