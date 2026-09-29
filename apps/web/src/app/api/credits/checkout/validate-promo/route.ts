import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthResponse, requireCreditsAuth } from "@/lib/credits/auth";
import {
  PROMO_VALIDATION_MESSAGES,
  validatePromotionForCheckout,
} from "@/lib/credits/coupon-validate";
import { catalogFlowForAccount, getCreditPlan } from "@/lib/credits/queries";
import { isStripeConfigured } from "@/lib/credits/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function envPrice(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export async function POST(req: Request): Promise<Response> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let body: { code?: string; billingCycle?: string };
  try {
    body = (await req.json()) as { code?: string; billingCycle?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (!code.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid",
        message: PROMO_VALIDATION_MESSAGES.invalid,
      },
      { status: 400 },
    );
  }

  const billingCycle = body.billingCycle === "monthly" ? "monthly" : "annual";
  const flow = await catalogFlowForAccount(auth.account.id);
  const plan = await getCreditPlan("pro", flow);
  const priceId =
    billingCycle === "annual"
      ? plan.stripeAnnualPriceId?.trim() ||
        (flow === "founder" ? envPrice("STRIPE_PRO_ANNUAL_PRICE_ID") : undefined)
      : plan.stripeMonthlyPriceId?.trim() ||
        (flow === "founder" ? envPrice("STRIPE_PRO_MONTHLY_PRICE_ID") : undefined);

  if (!priceId?.startsWith("price_")) {
    return NextResponse.json(
      { error: "stripe_price_not_configured" },
      { status: 400 },
    );
  }

  try {
    const result = await validatePromotionForCheckout({
      code,
      email: auth.email,
      account: auth.account,
      priceId,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          message: PROMO_VALIDATION_MESSAGES[result.error],
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      promotionCode: result.promotionCode,
      audience: result.audience,
    });
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureException(error);
    return NextResponse.json({ error: "validate_failed" }, { status: 500 });
  }
}
