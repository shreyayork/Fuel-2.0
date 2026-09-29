/** Shared promo validation copy + pure time helpers (safe for unit tests). */

export type PromoValidationError =
  | "invalid"
  | "expired"
  | "inactive"
  | "already_used"
  | "wrong_plan"
  | "ineligible";

/** Shared copy for expired / inactive — ticket F20A-252 BUG-04. */
export const PROMO_NOT_ACTIVE_OR_EXPIRED =
  "This coupon is not active or has expired.";

export const PROMO_VALIDATION_MESSAGES: Record<PromoValidationError, string> = {
  invalid: "That coupon code is not valid.",
  expired: PROMO_NOT_ACTIVE_OR_EXPIRED,
  inactive: PROMO_NOT_ACTIVE_OR_EXPIRED,
  already_used: "This coupon has already been used.",
  wrong_plan:
    "This coupon does not apply to the selected Pro plan (monthly vs annual).",
  ineligible: "This coupon is not available for your account.",
};

/** Pure expiry gate — campaign `redeem_by` end time only. */
export function isRedeemByExpired(
  redeemBy: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return Boolean(redeemBy && redeemBy.getTime() < now.getTime());
}
