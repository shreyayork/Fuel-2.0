import "server-only";
import { eq } from "drizzle-orm";
import type { Account } from "@/db/schema";
import { couponCampaigns, couponRecipients } from "@/db/schema";
import { getDb } from "@/db/client";
import {
  retrieveStripePromotionCode,
} from "./coupon-admin";
import { isStripeConfigured } from "./stripe";
import {
  type PromoValidationError,
  isRedeemByExpired,
} from "./coupon-validate-shared";

export type {
  PromoValidationError,
} from "./coupon-validate-shared";
export {
  PROMO_NOT_ACTIVE_OR_EXPIRED,
  PROMO_VALIDATION_MESSAGES,
  isRedeemByExpired,
} from "./coupon-validate-shared";

export type PromoValidationOk = {
  ok: true;
  stripePromotionCodeId: string;
  promotionCode: string;
  campaignId: string;
  audience: "targeted" | "global";
};

export type PromoValidationResult =
  | PromoValidationOk
  | { ok: false; error: PromoValidationError };

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function emailsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Fuel-side gate before Checkout. Returns structured errors for the in-app field.
 * Pro subscription prices only — caller passes the selected Checkout price id.
 */
export async function validatePromotionForCheckout(opts: {
  code: string;
  email: string;
  account: Account;
  priceId: string;
}): Promise<PromoValidationResult> {
  const code = normalizeCode(opts.code);
  if (!code) return { ok: false, error: "invalid" };

  const db = await getDb();

  const [recipient] = await db
    .select()
    .from(couponRecipients)
    .where(eq(couponRecipients.promotionCode, code))
    .limit(1);

  let campaign =
    recipient != null
      ? (
          await db
            .select()
            .from(couponCampaigns)
            .where(eq(couponCampaigns.id, recipient.campaignId))
            .limit(1)
        )[0]
      : undefined;

  if (!campaign) {
    const [byGlobal] = await db
      .select()
      .from(couponCampaigns)
      .where(eq(couponCampaigns.globalPromotionCode, code))
      .limit(1);
    campaign = byGlobal;
  }

  if (!campaign) return { ok: false, error: "invalid" };

  if (campaign.status === "inactive" || campaign.status === "archived") {
    return { ok: false, error: "inactive" };
  }

  if (isRedeemByExpired(campaign.redeemBy)) {
    return { ok: false, error: "expired" };
  }

  const applies = campaign.appliesToPriceIds ?? [];
  if (applies.length > 0 && !applies.includes(opts.priceId)) {
    return { ok: false, error: "wrong_plan" };
  }

  if (campaign.audience === "global") {
    const promoId = campaign.globalStripePromotionCodeId;
    const promoCode = campaign.globalPromotionCode;
    if (!promoId || !promoCode) return { ok: false, error: "invalid" };

    if (isStripeConfigured()) {
      try {
        const promo = await retrieveStripePromotionCode(promoId);
        if (!promo.active) return { ok: false, error: "inactive" };
        if (
          promo.expires_at != null &&
          promo.expires_at * 1000 < Date.now()
        ) {
          return { ok: false, error: "expired" };
        }
        if (
          promo.max_redemptions != null &&
          promo.times_redeemed >= promo.max_redemptions
        ) {
          return { ok: false, error: "already_used" };
        }
      } catch {
        return { ok: false, error: "invalid" };
      }
    }

    return {
      ok: true,
      stripePromotionCodeId: promoId,
      promotionCode: promoCode,
      campaignId: campaign.id,
      audience: "global",
    };
  }

  // Targeted
  if (!recipient) return { ok: false, error: "invalid" };
  if (!emailsMatch(recipient.email, opts.email)) {
    return { ok: false, error: "ineligible" };
  }
  if (recipient.redeemedAt) {
    return { ok: false, error: "already_used" };
  }

  if (isStripeConfigured()) {
    try {
      const promo = await retrieveStripePromotionCode(
        recipient.stripePromotionCodeId,
      );
      if (!promo.active) return { ok: false, error: "inactive" };
      if (
        promo.expires_at != null &&
        promo.expires_at * 1000 < Date.now()
      ) {
        return { ok: false, error: "expired" };
      }
      if (
        promo.max_redemptions != null &&
        promo.times_redeemed >= promo.max_redemptions
      ) {
        return { ok: false, error: "already_used" };
      }
      // Stripe customer restriction may exist; Fuel email gate already passed.
      void opts.account;
    } catch {
      return { ok: false, error: "invalid" };
    }
  }

  return {
    ok: true,
    stripePromotionCodeId: recipient.stripePromotionCodeId,
    promotionCode: recipient.promotionCode,
    campaignId: campaign.id,
    audience: "targeted",
  };
}
