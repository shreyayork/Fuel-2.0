import "server-only";
import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "./stripe";

export type CouponBenefitInput =
  | { type: "percent_off"; percentOff: number }
  | { type: "amount_off"; amountOffCents: number; currency?: string };

export type CouponDurationInput =
  | { duration: "once" | "forever" }
  | { duration: "repeating"; durationInMonths: number };

export type CreateStripeCouponInput = {
  name: string;
  benefit: CouponBenefitInput;
  duration: CouponDurationInput;
  /** Unix seconds; omit for no coupon-level redeem-by. */
  redeemBy?: number | null;
  /** Stripe Price ids — resolved to Product ids for applies_to. */
  appliesToPriceIds?: string[];
  metadata?: Record<string, string>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolve Price ids → unique Product ids for Coupon `applies_to`. */
async function productIdsForPrices(priceIds: string[]): Promise<string[]> {
  if (priceIds.length === 0) return [];
  const stripe = await getStripe();
  const products = new Set<string>();
  for (const priceId of priceIds) {
    const trimmed = priceId.trim();
    if (!trimmed.startsWith("price_")) {
      throw new Error(`invalid_price_id:${trimmed}`);
    }
    const price = await stripe.prices.retrieve(trimmed);
    const product =
      typeof price.product === "string" ? price.product : price.product.id;
    products.add(product);
  }
  return [...products];
}

export async function createStripeCoupon(
  input: CreateStripeCouponInput,
): Promise<Stripe.Coupon> {
  if (!isStripeConfigured()) throw new Error("stripe_not_configured");

  const params: Stripe.CouponCreateParams = {
    name: input.name,
    metadata: input.metadata,
  };

  if (input.benefit.type === "percent_off") {
    const pct = input.benefit.percentOff;
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      throw new Error("invalid_percent_off");
    }
    params.percent_off = pct;
  } else {
    const cents = input.benefit.amountOffCents;
    if (!Number.isInteger(cents) || cents < 1) {
      throw new Error("invalid_amount_off");
    }
    params.amount_off = cents;
    params.currency = (input.benefit.currency ?? "usd").toLowerCase();
  }

  if (input.duration.duration === "repeating") {
    const months = input.duration.durationInMonths;
    if (!Number.isInteger(months) || months < 1) {
      throw new Error("invalid_duration_in_months");
    }
    params.duration = "repeating";
    params.duration_in_months = months;
  } else {
    params.duration = input.duration.duration;
  }

  if (input.redeemBy != null) {
    params.redeem_by = input.redeemBy;
  }

  const productIds = await productIdsForPrices(input.appliesToPriceIds ?? []);
  if (productIds.length > 0) {
    params.applies_to = { products: productIds };
  }

  // Coupon-level max left unlimited; per-code max_redemptions set on Promotion Codes.
  const stripe = await getStripe();
  return stripe.coupons.create(params);
}

export function generatePromotionCodeValue(prefix: string): string {
  const safe = prefix.replace(/[^A-Za-z0-9-]/g, "").toUpperCase() || "FUEL1";
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `${safe}-${suffix}`;
}

export async function createStripePromotionCode(opts: {
  couponId: string;
  code: string;
  expiresAt?: number | null;
  /** 1 for targeted; omit/null for unlimited global. */
  maxRedemptions?: number | null;
  /** Restrict to existing Stripe Customer when known (targeted). */
  customer?: string | null;
  metadata?: Record<string, string>;
}): Promise<Stripe.PromotionCode> {
  if (!isStripeConfigured()) throw new Error("stripe_not_configured");
  const stripe = await getStripe();
  const params: Stripe.PromotionCodeCreateParams = {
    promotion: { type: "coupon", coupon: opts.couponId },
    code: opts.code,
    expires_at: opts.expiresAt ?? undefined,
    metadata: opts.metadata,
  };
  if (opts.maxRedemptions != null && opts.maxRedemptions > 0) {
    params.max_redemptions = opts.maxRedemptions;
  }
  if (opts.customer) {
    params.customer = opts.customer;
  }
  return stripe.promotionCodes.create(params);
}

export async function setStripePromotionCodeActive(
  promotionCodeId: string,
  active: boolean,
): Promise<void> {
  if (!isStripeConfigured()) throw new Error("stripe_not_configured");
  const stripe = await getStripe();
  await stripe.promotionCodes.update(promotionCodeId, { active });
}

export async function retrieveStripePromotionCode(
  promotionCodeId: string,
): Promise<Stripe.PromotionCode> {
  if (!isStripeConfigured()) throw new Error("stripe_not_configured");
  const stripe = await getStripe();
  return stripe.promotionCodes.retrieve(promotionCodeId);
}

/**
 * Create Promotion Codes with small delays to stay under Stripe rate limits.
 * Caller supplies unique codes; retries once on code collision.
 */
export async function createPromotionCodesBatched(
  items: Array<{
    couponId: string;
    code: string;
    email: string;
    expiresAt?: number | null;
    customer?: string | null;
    maxRedemptions?: number | null;
  }>,
  opts?: { delayMs?: number },
): Promise<
  Array<
    | { ok: true; email: string; code: string; promotionCodeId: string }
    | { ok: false; email: string; code: string; error: string }
  >
> {
  const delayMs = opts?.delayMs ?? 80;
  const results: Array<
    | { ok: true; email: string; code: string; promotionCodeId: string }
    | { ok: false; email: string; code: string; error: string }
  > = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    try {
      let code = item.code;
      let promo: Stripe.PromotionCode;
      try {
        promo = await createStripePromotionCode({
          couponId: item.couponId,
          code,
          expiresAt: item.expiresAt,
          maxRedemptions: item.maxRedemptions ?? 1,
          customer: item.customer,
          metadata: { email: item.email },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/already.?exists|resource_already_exists/i.test(msg)) {
          code = generatePromotionCodeValue(code.split("-")[0] ?? "FUEL1");
          promo = await createStripePromotionCode({
            couponId: item.couponId,
            code,
            expiresAt: item.expiresAt,
            maxRedemptions: item.maxRedemptions ?? 1,
            customer: item.customer,
            metadata: { email: item.email },
          });
        } else {
          throw err;
        }
      }
      results.push({
        ok: true,
        email: item.email,
        code: promo.code,
        promotionCodeId: promo.id,
      });
    } catch (err) {
      results.push({
        ok: false,
        email: item.email,
        code: item.code,
        error: err instanceof Error ? err.message : "promo_create_failed",
      });
    }
    if (i < items.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  return results;
}
