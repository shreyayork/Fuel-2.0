import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PROMO_NOT_ACTIVE_OR_EXPIRED,
  PROMO_VALIDATION_MESSAGES,
  isRedeemByExpired,
} from "@/lib/credits/coupon-validate-shared";

describe("coupon-validate helpers (F20A-252)", () => {
  it("uses shared not-active-or-expired copy for expired and inactive", () => {
    assert.equal(PROMO_VALIDATION_MESSAGES.expired, PROMO_NOT_ACTIVE_OR_EXPIRED);
    assert.equal(PROMO_VALIDATION_MESSAGES.inactive, PROMO_NOT_ACTIVE_OR_EXPIRED);
    assert.equal(
      PROMO_NOT_ACTIVE_OR_EXPIRED,
      "This coupon is not active or has expired.",
    );
  });

  it("isRedeemByExpired respects end time only", () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    assert.equal(isRedeemByExpired(null, now), false);
    assert.equal(isRedeemByExpired(undefined, now), false);
    assert.equal(
      isRedeemByExpired(new Date("2026-06-15T11:59:59.000Z"), now),
      true,
    );
    assert.equal(
      isRedeemByExpired(new Date("2026-06-15T12:00:01.000Z"), now),
      false,
    );
  });
});
