import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMPTY_SNAPSHOT_EARN } from "@/lib/credits/profile-modules";
import type { CreditSnapshot } from "@/lib/credits/types";
import { formatDataRoomUploadError } from "./upload-errors";

function snap(partial: Partial<CreditSnapshot>): CreditSnapshot {
  return {
    plan: "free",
    billingCycle: null,
    cancelAtPeriodEnd: false,
    periodEndsAt: null,
    monthlyUsed: 0,
    monthlyLimit: 250,
    dailyUsed: 0,
    dailyLimit: 75,
    topUpBalance: 0,
    blockUntil: null,
    monthlyResetLabel: "—",
    justUnblocked: false,
    monthlyLowToastShown: false,
    stats: { signals: 0, docs: 0, messages: 0 },
    catalogFlow: "founder",
    ...EMPTY_SNAPSHOT_EARN,
    ...partial,
  };
}

describe("formatDataRoomUploadError — insufficient_credits (F20A-219)", () => {
  it("uses daily-limit copy when snapshot shows daily shortfall", () => {
    const message = formatDataRoomUploadError("insufficient_credits", {
      creditSnapshot: snap({
        monthlyLimit: 251,
        monthlyUsed: 73,
        dailyLimit: 75,
        dailyUsed: 73,
      }),
      required: 11,
    });
    assert.match(message, /Daily limit is not sufficient/);
    assert.match(message, /Total balance: 178 \/ 251/);
  });

  it("falls back to generic copy without a snapshot", () => {
    assert.equal(
      formatDataRoomUploadError("insufficient_credits"),
      "Not enough credits to upload and generate intelligence from this document.",
    );
  });
});
