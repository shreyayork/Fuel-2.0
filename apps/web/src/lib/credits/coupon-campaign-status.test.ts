import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  campaignBlocksModifications,
  campaignModificationBlockReason,
  isCampaignExpired,
} from "@/lib/credits/coupon-campaign-status";

describe("coupon-campaign-status (F20A-252)", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("blocks archived and expired campaigns", () => {
    assert.equal(
      campaignBlocksModifications({ status: "archived", redeemBy: null }, now),
      true,
    );
    assert.equal(
      campaignBlocksModifications(
        { status: "active", redeemBy: new Date("2026-06-01T00:00:00.000Z") },
        now,
      ),
      true,
    );
    assert.equal(
      campaignBlocksModifications(
        { status: "active", redeemBy: new Date("2026-07-01T00:00:00.000Z") },
        now,
      ),
      false,
    );
  });

  it("reports expired vs archived reasons", () => {
    assert.equal(
      campaignModificationBlockReason({ status: "archived", redeemBy: null }, now),
      "archived",
    );
    assert.equal(
      campaignModificationBlockReason(
        { status: "active", redeemBy: new Date("2026-01-01T00:00:00.000Z") },
        now,
      ),
      "expired",
    );
    assert.equal(isCampaignExpired({ redeemBy: null }, now), false);
  });
});
