import "server-only";
import * as Sentry from "@sentry/nextjs";
import Stripe from "stripe";
import type { Account } from "@/db/schema";
import type { SubscribedBilling } from "./types";
import { parseCreditCatalogFlow } from "./catalog-flow";
import {
  catalogFlowForAccount,
  getCreditPlan,
  getLedgerByAccountId,
  getTopUpPackBySlug,
  resetProBillingPeriod,
  setCancelAtPeriodEnd,
  setStripeCustomerId,
} from "./queries";
import { periodBounds } from "./subscription-period";

let stripeClient: Stripe | null = null;
let cachedSecrets: { secretKey: string; webhookSecret: string } | null = null;

const TOPUP_ENV_KEYS: Record<string, string> = {
  sprint: "STRIPE_TOPUP_SPRINT_PRICE_ID",
  builder: "STRIPE_TOPUP_BUILDER_PRICE_ID",
  growth: "STRIPE_TOPUP_GROWTH_PRICE_ID",
  scale: "STRIPE_TOPUP_SCALE_PRICE_ID",
};

/**
 * Resolve Stripe credentials: local `.env` first, then Secrets Manager via
 * `STRIPE_SECRET_ARN` (CDK injects `fuel2-<stage>-stripe-api`).
 */
async function loadStripeSecrets(): Promise<{
  secretKey: string;
  webhookSecret: string;
}> {
  if (cachedSecrets) return cachedSecrets;

  if (process.env.STRIPE_SECRET_KEY) {
    cachedSecrets = {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    };
    return cachedSecrets;
  }

  const arn = process.env.STRIPE_SECRET_ARN;
  if (!arn) throw new Error("stripe_not_configured");

  const { SecretsManagerClient, GetSecretValueCommand } = await import(
    "@aws-sdk/client-secrets-manager"
  );
  const sm = new SecretsManagerClient({});
  const res = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!res.SecretString) throw new Error("Stripe secret has no value");

  const parsed = JSON.parse(res.SecretString) as {
    secretKey?: string;
    webhookSecret?: string;
  };
  if (!parsed.secretKey || parsed.secretKey === "PLACEHOLDER") {
    throw new Error("Stripe secret key not populated in Secrets Manager");
  }

  cachedSecrets = {
    secretKey: parsed.secretKey,
    webhookSecret: parsed.webhookSecret ?? "",
  };
  return cachedSecrets;
}

export async function getStripe(): Promise<Stripe> {
  if (stripeClient) return stripeClient;
  const { secretKey } = await loadStripeSecrets();
  stripeClient = new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
  return stripeClient;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    return process.env.STRIPE_WEBHOOK_SECRET;
  }
  if (!process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_ARN) {
    return null;
  }
  try {
    const { webhookSecret } = await loadStripeSecrets();
    return webhookSecret || null;
  } catch {
    return null;
  }
}

/** Cheap gate — does not call Secrets Manager. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_ARN);
}

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function envPrice(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Checkout requires a Price id (`price_…`). DB catalog wins; env is bootstrap fallback. */
function requirePriceId(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    if (value.startsWith("price_")) return value;
    throw new StripePriceNotConfiguredError("invalid_format");
  }
  throw new StripePriceNotConfiguredError("missing");
}

async function ensureStripeCustomer(account: Account): Promise<string> {
  if (account.stripeCustomerId) return account.stripeCustomerId;
  const stripe = await getStripe();
  const customer = await stripe.customers.create({
    email: account.creatorEmail,
    metadata: { accountId: account.id },
  });
  await setStripeCustomerId(account.id, customer.id);
  return customer.id;
}

export async function createSubscriptionCheckout(opts: {
  account: Account;
  billingCycle: "monthly" | "annual";
  /** Session user email — required when applying a Fuel-validated promo. */
  userEmail?: string;
  /** Optional in-app coupon; validated Fuel-side before Checkout. */
  promotionCode?: string | null;
}): Promise<string> {
  const stripe = await getStripe();
  const flow = await catalogFlowForAccount(opts.account.id);
  const plan = await getCreditPlan("pro", flow);
  const priceId =
    opts.billingCycle === "annual"
      ? requirePriceId(
          plan.stripeAnnualPriceId,
          flow === "founder" ? envPrice("STRIPE_PRO_ANNUAL_PRICE_ID") : undefined,
        )
      : requirePriceId(
          plan.stripeMonthlyPriceId,
          flow === "founder" ? envPrice("STRIPE_PRO_MONTHLY_PRICE_ID") : undefined,
        );

  const customerId = await ensureStripeCustomer(opts.account);

  const trimmedCode = opts.promotionCode?.trim() || "";
  let discounts:
    | Array<{ promotion_code: string }>
    | undefined;
  if (trimmedCode) {
    const { validatePromotionForCheckout } = await import("./coupon-validate");
    const email = opts.userEmail?.trim();
    if (!email) throw new CouponValidationError("ineligible");
    const validated = await validatePromotionForCheckout({
      code: trimmedCode,
      email,
      account: opts.account,
      priceId,
    });
    if (!validated.ok) {
      throw new CouponValidationError(validated.error);
    }
    discounts = [{ promotion_code: validated.stripePromotionCodeId }];
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/account/billing?checkout=success`,
    cancel_url: `${appUrl()}/account/billing?checkout=cancelled`,
    metadata: { accountId: opts.account.id, type: "subscription" },
    // Stripe forbids allow_promotion_codes + discounts together. When Fuel
    // field supplies a code, lock it via discounts; otherwise keep Hosted
    // Checkout promo box for codes entered on Stripe.
    ...(discounts
      ? { discounts }
      : { allow_promotion_codes: true as const }),
    // Copy Checkout-collected name/address onto the Customer so later
    // subscription invoices snapshot customer_name / customer_address.
    customer_update: { name: "auto", address: "auto" },
    subscription_data: {
      metadata: { accountId: opts.account.id },
    },
  });
  if (!session.url) throw new Error("stripe_checkout_url_missing");
  return session.url;
}

export async function createTopUpCheckout(opts: {
  account: Account;
  packSlug: string;
}): Promise<string> {
  const ledger = await getLedgerByAccountId(opts.account.id);
  if (ledger.planSlug !== "pro") {
    throw new TopUpRequiresProError();
  }

  const flow = parseCreditCatalogFlow(ledger.flow);
  const pack = await getTopUpPackBySlug(opts.packSlug, flow);
  if (!pack) throw new StripePriceNotConfiguredError("pack_missing");

  const envKey = TOPUP_ENV_KEYS[pack.slug];
  const priceId = requirePriceId(
    pack.stripePriceId,
    flow === "founder" && envKey ? envPrice(envKey) : undefined,
  );

  const stripe = await getStripe();
  const customerId = await ensureStripeCustomer(opts.account);
  const topUpMeta = {
    accountId: opts.account.id,
    type: "topup",
    packSlug: pack.slug,
    credits: String(pack.credits),
  };
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/account/billing?checkout=topup_success`,
    cancel_url: `${appUrl()}/account/billing?checkout=cancelled`,
    metadata: topUpMeta,
    customer_update: { name: "auto", address: "auto" },
    // One-time Checkout does not create Invoices unless enabled (F20A-164).
    invoice_creation: {
      enabled: true,
      invoice_data: {
        metadata: topUpMeta,
      },
    },
  });
  if (!session.url) throw new Error("stripe_checkout_url_missing");
  return session.url;
}

export async function createBillingPortalSession(account: Account): Promise<string> {
  if (!account.stripeCustomerId) throw new Error("stripe_customer_missing");
  const stripe = await getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripeCustomerId,
    return_url: `${appUrl()}/account/billing`,
  });
  return session.url;
}

export async function cancelSubscriptionAtPeriodEnd(accountId: string): Promise<{
  periodEnd: Date | null;
}> {
  const ledger = await getLedgerByAccountId(accountId);
  if (!ledger.stripeSubscriptionId) throw new Error("subscription_missing");
  const stripe = await getStripe();
  const subscription = await stripe.subscriptions.update(ledger.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
  await setCancelAtPeriodEnd(accountId, true);
  const bounds = periodBounds(subscription);
  return { periodEnd: bounds?.end ?? null };
}

export async function resumeSubscription(accountId: string): Promise<void> {
  const ledger = await getLedgerByAccountId(accountId);
  if (!ledger.stripeSubscriptionId) throw new Error("subscription_missing");
  const stripe = await getStripe();
  await stripe.subscriptions.update(ledger.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
  await setCancelAtPeriodEnd(accountId, false);
}

export type BillingCycleChangeResult =
  | { applied: "immediate" | "at_period_end" }
  | { applied: "payment_required"; url: string };

/**
 * Change Pro billing cycle.
 * - Monthly → yearly (upgrade): open Stripe Checkout to collect payment first
 *   (F20A-252). Subscription is updated only after Checkout succeeds (webhook).
 * - Yearly → monthly (downgrade): keep annual access until term end; monthly
 *   price billed at next renewal (`proration_behavior: none`).
 */
export async function changeBillingCycleAtPeriodBoundary(opts: {
  accountId: string;
  billingCycle: "monthly" | "annual";
  /** Required for monthly→annual Checkout customer binding. */
  account: Account;
  /** Session user email — required when applying a Fuel-validated promo. */
  userEmail?: string | null;
  promotionCode?: string | null;
}): Promise<BillingCycleChangeResult> {
  const ledger = await getLedgerByAccountId(opts.accountId);
  if (!ledger.stripeSubscriptionId) throw new Error("subscription_missing");

  const currentCycle = inferCycleFromLedger(ledger);
  const upgradingToAnnual =
    opts.billingCycle === "annual" && currentCycle !== "annual";
  const downgradingToMonthly =
    opts.billingCycle === "monthly" && currentCycle === "annual";

  const flow = parseCreditCatalogFlow(ledger.flow);
  const plan = await getCreditPlan("pro", flow);
  const priceId =
    opts.billingCycle === "annual"
      ? requirePriceId(
          plan.stripeAnnualPriceId,
          flow === "founder" ? envPrice("STRIPE_PRO_ANNUAL_PRICE_ID") : undefined,
        )
      : requirePriceId(
          plan.stripeMonthlyPriceId,
          flow === "founder" ? envPrice("STRIPE_PRO_MONTHLY_PRICE_ID") : undefined,
        );

  const stripe = await getStripe();
  const subscription = await stripe.subscriptions.retrieve(ledger.stripeSubscriptionId, {
    expand: ["items.data"],
  });
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) throw new Error("subscription_item_missing");

  if (upgradingToAnnual) {
    const customerId = await ensureStripeCustomer(opts.account);

    // Preview prorated amount — do NOT update the subscription yet. Updating
    // with a default payment method auto-pays and skips Checkout (BUG-09).
    const preview = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: ledger.stripeSubscriptionId,
      subscription_details: {
        items: [{ id: itemId, price: priceId }],
        billing_cycle_anchor: "now",
        proration_behavior: "create_prorations",
      },
    });

    const amountDue = preview.amount_due ?? 0;
    if (amountDue <= 0) {
      const updated = await stripe.subscriptions.update(ledger.stripeSubscriptionId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "always_invoice",
        billing_cycle_anchor: "now",
        cancel_at_period_end: false,
        payment_behavior: "error_if_incomplete",
      });
      await setCancelAtPeriodEnd(opts.accountId, false);
      const bounds = periodBounds(updated);
      if (bounds) {
        await resetProBillingPeriod({
          accountId: opts.accountId,
          periodStart: bounds.start,
          periodEnd: bounds.end,
        });
      }
      return { applied: "immediate" };
    }

    const trimmedCode = opts.promotionCode?.trim() || "";
    let discounts: Array<{ promotion_code: string }> | undefined;
    if (trimmedCode) {
      const { validatePromotionForCheckout } = await import("./coupon-validate");
      const email = opts.userEmail?.trim();
      if (!email) throw new CouponValidationError("ineligible");
      const validated = await validatePromotionForCheckout({
        code: trimmedCode,
        email,
        account: opts.account,
        priceId,
      });
      if (!validated.ok) {
        throw new CouponValidationError(validated.error);
      }
      discounts = [{ promotion_code: validated.stripePromotionCodeId }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: preview.currency || "usd",
            product_data: {
              name: "Upgrade to Fuel Pro Annual",
              description: "Prorated switch from monthly to annual billing",
            },
            unit_amount: amountDue,
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl()}/account/billing?checkout=success&cycle=annual`,
      cancel_url: `${appUrl()}/account/billing?checkout=cancelled`,
      metadata: {
        accountId: opts.accountId,
        type: "billing_cycle_upgrade",
        billingCycle: "annual",
        stripeSubscriptionId: ledger.stripeSubscriptionId,
        subscriptionItemId: itemId,
        priceId,
      },
      // Same promo rules as subscription Checkout: Fuel field → discounts;
      // otherwise Stripe Hosted Checkout promo box.
      ...(discounts
        ? { discounts }
        : { allow_promotion_codes: true as const }),
      payment_intent_data: {
        setup_future_usage: "off_session",
      },
      invoice_creation: { enabled: true },
    });
    if (!session.url) throw new Error("stripe_checkout_url_missing");
    return { applied: "payment_required", url: session.url };
  }

  // Downgrade yearly → monthly (or unknown → monthly): schedule at period end.
  await stripe.subscriptions.update(ledger.stripeSubscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: "none",
    cancel_at_period_end: false,
  });
  await setCancelAtPeriodEnd(opts.accountId, false);
  void downgradingToMonthly;
  return { applied: "at_period_end" };
}

function inferCycleFromLedger(ledger: {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}): "monthly" | "annual" | null {
  if (!ledger.currentPeriodStart || !ledger.currentPeriodEnd) return null;
  const days =
    (ledger.currentPeriodEnd.getTime() - ledger.currentPeriodStart.getTime()) /
    86_400_000;
  if (days >= 300) return "annual";
  if (days >= 20) return "monthly";
  return null;
}

/** Create a recurring Price for Pro subscription (new amount → new Price). */
export async function createRecurringStripePrice(opts: {
  productName: string;
  amountCents: number;
  interval: "month" | "year";
  metadata?: Record<string, string>;
}): Promise<string> {
  const stripe = await getStripe();
  const product = await stripe.products.create({
    name: opts.productName,
    metadata: opts.metadata,
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: opts.amountCents,
    currency: "usd",
    recurring: { interval: opts.interval },
    metadata: opts.metadata,
  });
  return price.id;
}

/** Create a one-time Price for a top-up pack. */
export async function createOneTimeStripePrice(opts: {
  productName: string;
  amountCents: number;
  metadata?: Record<string, string>;
}): Promise<string> {
  const stripe = await getStripe();
  const product = await stripe.products.create({
    name: opts.productName,
    metadata: opts.metadata,
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: opts.amountCents,
    currency: "usd",
    metadata: opts.metadata,
  });
  return price.id;
}

/** Archive an old Price after amount change (Prices are immutable). */
export async function archiveStripePrice(priceId: string): Promise<void> {
  const trimmed = priceId.trim();
  if (!trimmed.startsWith("price_")) return;
  const stripe = await getStripe();
  try {
    await stripe.prices.update(trimmed, { active: false });
  } catch {
    // Best-effort: price may already be inactive or from another Stripe account.
  }
}

/** Read the Price this account is currently billed on (grandfather-aware). */
export async function getSubscribedBilling(
  accountId: string,
): Promise<SubscribedBilling | null> {
  if (!isStripeConfigured()) return null;

  const ledger = await getLedgerByAccountId(accountId);
  if (!ledger?.stripeSubscriptionId || ledger.planSlug !== "pro") return null;

  try {
    const stripe = await getStripe();
    const subscription = await stripe.subscriptions.retrieve(
      ledger.stripeSubscriptionId,
      { expand: ["items.data.price"] },
    );
    const price = subscription.items.data[0]?.price;
    if (!price || typeof price === "string") return null;

    const amountCents = price.unit_amount;
    const interval = price.recurring?.interval;
    if (
      amountCents == null ||
      amountCents < 0 ||
      (interval !== "month" && interval !== "year")
    ) {
      return null;
    }

    return {
      amountCents,
      interval,
      priceId: price.id,
    };
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.setContext("operation", { name: "getSubscribedBilling" });
    Sentry.captureException(error);
    return null;
  }
}

export class TopUpRequiresProError extends Error {
  constructor() {
    super("topups_require_pro");
    this.name = "TopUpRequiresProError";
  }
}

export class CouponValidationError extends Error {
  readonly code: import("./coupon-validate").PromoValidationError;
  constructor(code: import("./coupon-validate").PromoValidationError) {
    super(code);
    this.name = "CouponValidationError";
    this.code = code;
  }
}

export class StripePriceNotConfiguredError extends Error {
  readonly reason: string;

  constructor(reason = "missing") {
    super(`stripe_price_not_configured:${reason}`);
    this.name = "StripePriceNotConfiguredError";
    this.reason = reason;
  }
}
