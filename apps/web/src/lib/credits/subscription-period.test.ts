import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type Stripe from "stripe";
import { periodBounds } from "./subscription-period";

function sub(partial: Record<string, unknown>): Stripe.Subscription {
  return partial as unknown as Stripe.Subscription;
}

describe("periodBounds", () => {
  it("prefers cancel_at over item period end (manual Stripe end-date edit)", () => {
    const cancelAt = 1_725_000_000;
    const bounds = periodBounds(
      sub({
        cancel_at: cancelAt,
        items: {
          data: [
            {
              current_period_start: 1_700_000_000,
              current_period_end: 1_700_086_400,
            },
          ],
        },
      }),
    );
    assert.ok(bounds);
    assert.equal(bounds.end.getTime(), cancelAt * 1000);
    assert.equal(bounds.start.getTime(), 1_700_000_000 * 1000);
  });

  it("falls back to legacy top-level period fields", () => {
    const bounds = periodBounds(
      sub({
        cancel_at: null,
        current_period_start: 1_700_000_000,
        current_period_end: 1_700_172_800,
        items: { data: [] },
      }),
    );
    assert.ok(bounds);
    assert.equal(bounds.end.getTime(), 1_700_172_800 * 1000);
  });

  it("reads period from subscription items (Basil+ / Dahlia)", () => {
    const bounds = periodBounds(
      sub({
        cancel_at: null,
        items: {
          data: [
            {
              current_period_start: 1_700_000_000,
              current_period_end: 1_700_086_400,
            },
          ],
        },
      }),
    );
    assert.ok(bounds);
    assert.equal(bounds.start.getTime(), 1_700_000_000 * 1000);
    assert.equal(bounds.end.getTime(), 1_700_086_400 * 1000);
  });

  it("returns null when period cannot be resolved (no invented dates)", () => {
    assert.equal(
      periodBounds(
        sub({
          cancel_at: null,
          items: { data: [{ id: "si_x" }] },
        }),
      ),
      null,
    );
  });
});
