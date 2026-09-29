import type Stripe from "stripe";

export type SubscriptionPeriodBounds = {
  start: Date;
  end: Date;
};

/**
 * Billing period for a subscription under Stripe API Basil+ / Dahlia
 * (`2025-03-31` onward): `current_period_*` lives on SubscriptionItem, not
 * Subscription. Prefer the first item; fall back to legacy top-level fields
 * for older webhook endpoint API versions.
 *
 * When Stripe has set `cancel_at`, that timestamp is the access end (manual
 * Dashboard cancel-date edits land here) and wins over item period end.
 *
 * Returns null when bounds cannot be resolved — callers must not invent dates.
 */
export function periodBounds(
  subscription: Stripe.Subscription,
): SubscriptionPeriodBounds | null {
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number;
        current_period_end?: number;
      })
    | undefined;
  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };

  const startSec = item?.current_period_start ?? legacy.current_period_start;
  const itemEndSec = item?.current_period_end ?? legacy.current_period_end;
  const cancelAtSec =
    typeof subscription.cancel_at === "number" ? subscription.cancel_at : null;
  const endSec = cancelAtSec ?? itemEndSec;

  if (typeof startSec !== "number" || typeof endSec !== "number") {
    return null;
  }

  return {
    start: new Date(startSec * 1000),
    end: new Date(endSec * 1000),
  };
}
