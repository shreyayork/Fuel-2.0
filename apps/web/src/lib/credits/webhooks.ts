import "server-only";
import Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { accounts } from "@/db/schema";
import {
  activateProPlan,
  applyTopUp,
  getAccountByStripeCustomerId,
  getLedgerByAccountId,
  getLedgerBySubscriptionId,
  resetProBillingPeriod,
  revertToFreePlan,
  setCancelAtPeriodEnd,
} from "./queries";
import { getStripe, getStripeWebhookSecret } from "./stripe";
import { upsertBillingInvoiceFromStripe, reconcileAccountInvoices } from "./invoices";
import { periodBounds } from "./subscription-period";

export { periodBounds } from "./subscription-period";
export { reconcileAccountInvoices } from "./invoices";

function subscriptionIdFrom(
  value: string | Stripe.Subscription | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function isTerminalSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return (
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired"
  );
}

async function retrieveSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = await getStripe();
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data"],
  });
}

async function syncProLedgerFromSubscription(
  accountId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  await setCancelAtPeriodEnd(accountId, Boolean(subscription.cancel_at_period_end));
  const bounds = periodBounds(subscription);
  if (!bounds) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureMessage("stripe_subscription_period_bounds_missing", "warning");
    return;
  }

  const ledger = await getLedgerByAccountId(accountId);
  const periodStartChanged =
    !ledger.currentPeriodStart ||
    ledger.currentPeriodStart.getTime() !== bounds.start.getTime();

  await resetProBillingPeriod({
    accountId,
    periodStart: bounds.start,
    periodEnd: bounds.end,
    // Cancel-date / period-end edits must not wipe in-period credit usage.
    resetUsage: periodStartChanged,
  });
}

async function activateFromSubscription(
  accountId: string,
  subscriptionId: string,
): Promise<void> {
  const subscription = await retrieveSubscription(subscriptionId);
  const bounds = periodBounds(subscription);
  if (!bounds) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureMessage("stripe_subscription_period_bounds_missing", "warning");
    throw new Error("stripe_subscription_period_bounds_missing");
  }
  await activateProPlan({
    accountId,
    stripeSubscriptionId: subscription.id,
    periodStart: bounds.start,
    periodEnd: bounds.end,
  });
}

/** Audit-only: surface Checkout discount for ops visibility. Never gates activation. */
async function captureCheckoutDiscountAudit(
  session: Stripe.Checkout.Session,
  accountId: string,
): Promise<void> {
  const amountDiscount = session.total_details?.amount_discount ?? 0;
  const discountRefs = (session.discounts ?? []).map((d) => {
    const promo =
      typeof d.promotion_code === "string"
        ? d.promotion_code
        : d.promotion_code?.id ?? null;
    const coupon =
      typeof d.coupon === "string" ? d.coupon : d.coupon?.id ?? null;
    const promoCode =
      typeof d.promotion_code === "string"
        ? null
        : d.promotion_code && typeof d.promotion_code !== "string"
          ? d.promotion_code.code
          : null;
    return { couponId: coupon, promotionCodeId: promo, promotionCode: promoCode };
  });
  const hasDiscountRef = discountRefs.some(
    (row) => row.couponId || row.promotionCodeId,
  );

  if (amountDiscount <= 0 && !hasDiscountRef) return;

  Sentry.setTag("integration", "stripe");
  Sentry.setContext("checkout_discount", {
    accountId,
    sessionId: session.id,
    checkoutType: session.metadata?.type ?? null,
    amountDiscount,
    currency: session.currency ?? null,
    discounts: discountRefs,
  });
  Sentry.captureMessage("stripe_checkout_discount_applied", "info");

  try {
    const { markPromotionCodeRedeemed } = await import("./coupon-campaigns");
    for (const ref of discountRefs) {
      if (!ref.promotionCodeId && !ref.promotionCode) continue;
      await markPromotionCodeRedeemed({
        stripePromotionCodeId: ref.promotionCodeId,
        promotionCode: ref.promotionCode,
        accountId,
        checkoutSessionId: session.id,
        amountDiscountCents: amountDiscount,
        stripeInvoiceId:
          typeof session.invoice === "string"
            ? session.invoice
            : session.invoice?.id ?? null,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        redeemerEmail:
          session.customer_details?.email ??
          session.customer_email ??
          null,
      });
    }
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.setContext("operation", { name: "markPromotionCodeRedeemed" });
    Sentry.captureException(error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const accountId = session.metadata?.accountId;
  if (!accountId) {
    Sentry.captureMessage("stripe_checkout_missing_account_id", "warning");
    return;
  }

  await captureCheckoutDiscountAudit(session, accountId);

  const type = session.metadata?.type;
  if (type === "topup") {
    const credits = Number(session.metadata?.credits ?? 0);
    if (credits > 0) {
      await applyTopUp({
        accountId,
        credits,
        referenceId: session.id,
      });
    }
    return;
  }

  if (type === "billing_cycle_upgrade") {
    const subscriptionId = session.metadata?.stripeSubscriptionId?.trim();
    const subscriptionItemId = session.metadata?.subscriptionItemId?.trim();
    const priceId = session.metadata?.priceId?.trim();
    if (!subscriptionId || !subscriptionItemId || !priceId) {
      Sentry.captureMessage("stripe_cycle_upgrade_missing_metadata", "warning");
      return;
    }
    const stripe = await getStripe();
    await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: subscriptionItemId, price: priceId }],
      // Payment already collected via Checkout — do not re-prorate.
      proration_behavior: "none",
      billing_cycle_anchor: "now",
      cancel_at_period_end: false,
    });
    await setCancelAtPeriodEnd(accountId, false);
    const subscription = await retrieveSubscription(subscriptionId);
    await syncProLedgerFromSubscription(accountId, subscription);
    return;
  }

  if (type === "subscription") {
    const subscriptionId = subscriptionIdFrom(session.subscription);
    if (!subscriptionId) {
      Sentry.captureMessage("stripe_checkout_missing_subscription", "warning");
      return;
    }
    await activateFromSubscription(accountId, subscriptionId);
  }
}

async function persistInvoiceSnapshot(invoice: Stripe.Invoice): Promise<void> {
  await upsertBillingInvoiceFromStripe(invoice);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const row = await upsertBillingInvoiceFromStripe(invoice);

  const inv = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
    parent?: {
      subscription_details?: {
        subscription?: string | Stripe.Subscription | null;
      } | null;
    } | null;
  };
  const subscriptionId =
    subscriptionIdFrom(inv.subscription) ??
    subscriptionIdFrom(inv.parent?.subscription_details?.subscription);
  if (subscriptionId) {
    const ledger = await getLedgerBySubscriptionId(subscriptionId);
    if (ledger) {
      const subscription = await retrieveSubscription(subscriptionId);
      await syncProLedgerFromSubscription(ledger.accountId, subscription);
    }
  }

  if (row) {
    try {
      const { processPaidInvoiceArtifacts } = await import("./invoice-pdf/ensure");
      await processPaidInvoiceArtifacts(row);
    } catch {
      // Captured inside ensure*. Do not fail webhook after ledger sync —
      // Stripe retry of invoice.paid is unsafe once credits are applied.
      // Missing PDF/email recovered by reconcile backfill.
    }
  }
}

async function handleSubscriptionUpdated(eventSub: Stripe.Subscription) {
  const ledger = await getLedgerBySubscriptionId(eventSub.id);
  if (!ledger) return;

  // Re-fetch with expand so item-level current_period_* (Basil+/Dahlia) and
  // cancel_at from Dashboard edits are authoritative — webhook payloads alone
  // can omit or lag those fields depending on endpoint API version.
  const subscription = await retrieveSubscription(eventSub.id);

  if (isTerminalSubscriptionStatus(subscription.status)) {
    await revertToFreePlan(ledger.accountId);
    return;
  }

  await syncProLedgerFromSubscription(ledger.accountId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const ledger = await getLedgerBySubscriptionId(subscription.id);
  if (!ledger) {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const account = await getAccountByStripeCustomerId(customerId);
    if (account) {
      await revertToFreePlan(account.id);
    }
    return;
  }
  await revertToFreePlan(ledger.accountId);
}

async function stripeCustomerIdForAccount(accountId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ stripeCustomerId: accounts.stripeCustomerId })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  return row?.stripeCustomerId ?? null;
}

/**
 * Reconcile Stripe → ledger.
 * - Free / missing sub: activate first active Stripe subscription if present.
 * - Already Pro: refresh cancel flag + billing period (covers missed webhooks
 *   after Dashboard period / cancel-date edits).
 */
export async function reconcileAccountSubscription(accountId: string): Promise<boolean> {
  const ledger = await getLedgerByAccountId(accountId);
  const customerId = await stripeCustomerIdForAccount(accountId);

  // Invoice history fallback (missed webhooks) — independent of subscription state.
  try {
    await reconcileAccountInvoices(accountId, customerId);
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.setContext("operation", { name: "reconcileAccountInvoices" });
    Sentry.captureException(error);
  }

  if (ledger.planSlug === "pro" && ledger.stripeSubscriptionId) {
    const subscription = await retrieveSubscription(ledger.stripeSubscriptionId);
    if (isTerminalSubscriptionStatus(subscription.status)) {
      await revertToFreePlan(accountId);
      return true;
    }
    await syncProLedgerFromSubscription(accountId, subscription);
    return true;
  }

  if (!customerId) return false;

  const stripe = await getStripe();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 5,
    expand: ["data.items.data"],
  });
  const active = subscriptions.data[0];
  if (!active) return false;

  const bounds = periodBounds(active);
  if (!bounds) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureMessage("stripe_subscription_period_bounds_missing", "warning");
    return false;
  }

  await activateProPlan({
    accountId,
    stripeSubscriptionId: active.id,
    periodStart: bounds.start,
    periodEnd: bounds.end,
  });
  return true;
}

export async function handleStripeWebhook(
  body: string,
  signature: string | null,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const secret = await getStripeWebhookSecret();
  if (!secret) return { ok: false, status: 500, error: "webhook_not_configured" };
  if (!signature) return { ok: false, status: 400, error: "missing_signature" };

  const stripe = await getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    Sentry.captureException(error);
    return { ok: false, status: 400, error: "invalid_signature" };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.finalized":
      case "invoice.updated":
      case "invoice.voided":
      case "invoice.marked_uncollectible":
        await persistInvoiceSnapshot(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureException(error);
    throw error;
  }

  return { ok: true };
}
