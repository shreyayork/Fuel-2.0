import "server-only";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  billingInvoices,
  type BillingInvoice,
} from "@/db/schema";
import {
  getAccountByStripeCustomerId,
  getLedgerBySubscriptionId,
} from "./queries";
import { getStripe } from "./stripe";
import { BILLING_INVOICE_PAGE_SIZE } from "./invoices-shared";
import {
  mapStripeInvoiceFields,
  subscriptionIdFromInvoice,
  toBillingInvoiceDto,
  type StripeInvoiceLike,
} from "./invoices-map";

export { BILLING_INVOICE_PAGE_SIZE } from "./invoices-shared";
export {
  billingInvoiceConflictKey,
  deriveInvoiceTransactionType,
  mapStripeInvoiceFields,
  subscriptionIdFromInvoice,
  toBillingInvoiceDto,
} from "./invoices-map";

async function resolveAccountIdForInvoice(
  invoice: StripeInvoiceLike,
  mappedCustomerId: string | null,
): Promise<string | null> {
  const fromMeta = invoice.metadata?.accountId?.trim();
  if (fromMeta) return fromMeta;

  if (mappedCustomerId) {
    const account = await getAccountByStripeCustomerId(mappedCustomerId);
    if (account) return account.id;
  }

  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (subscriptionId) {
    const ledger = await getLedgerBySubscriptionId(subscriptionId);
    if (ledger) return ledger.accountId;
  }

  return null;
}

/**
 * Idempotent upsert by stripe_invoice_id.
 * Returns null when account cannot be resolved (invoice ignored with warning).
 */
export async function upsertBillingInvoiceFromStripe(
  invoice: Stripe.Invoice | StripeInvoiceLike,
): Promise<BillingInvoice | null> {
  const mapped = mapStripeInvoiceFields(invoice as StripeInvoiceLike);
  if (!mapped.stripeCustomerId) {
    Sentry.setTag("integration", "stripe");
    Sentry.captureMessage("billing_invoice_missing_customer", "warning");
    return null;
  }

  const accountId = await resolveAccountIdForInvoice(
    invoice as StripeInvoiceLike,
    mapped.stripeCustomerId,
  );
  if (!accountId) {
    Sentry.setTag("integration", "stripe");
    Sentry.setContext("billing_invoice", {
      stripeInvoiceId: mapped.stripeInvoiceId,
    });
    Sentry.captureMessage("billing_invoice_unresolved_account", "warning");
    return null;
  }

  const db = await getDb();
  const now = new Date();
  const id = `binv_${randomUUID()}`;

  const [row] = await db
    .insert(billingInvoices)
    .values({
      id,
      accountId,
      stripeCustomerId: mapped.stripeCustomerId,
      stripeInvoiceId: mapped.stripeInvoiceId,
      stripeInvoiceNumber: mapped.stripeInvoiceNumber,
      invoiceDate: mapped.invoiceDate,
      status: mapped.status,
      amountDue: mapped.amountDue,
      amountPaid: mapped.amountPaid,
      total: mapped.total,
      currency: mapped.currency,
      transactionType: mapped.transactionType,
      hostedInvoiceUrl: mapped.hostedInvoiceUrl,
      invoicePdf: mapped.invoicePdf,
      stripePaymentIntentId: mapped.stripePaymentIntentId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: billingInvoices.stripeInvoiceId,
      set: {
        stripeCustomerId: mapped.stripeCustomerId,
        stripeInvoiceNumber: mapped.stripeInvoiceNumber,
        invoiceDate: mapped.invoiceDate,
        status: mapped.status,
        amountDue: mapped.amountDue,
        amountPaid: mapped.amountPaid,
        total: mapped.total,
        currency: mapped.currency,
        transactionType: mapped.transactionType,
        hostedInvoiceUrl: mapped.hostedInvoiceUrl,
        invoicePdf: mapped.invoicePdf,
        stripePaymentIntentId: mapped.stripePaymentIntentId,
        updatedAt: now,
      },
    })
    .returning();

  return row ?? null;
}

export async function listBillingInvoicesForAccount(opts: {
  accountId: string;
  limit?: number;
  offset?: number;
}): Promise<{
  invoices: ReturnType<typeof toBillingInvoiceDto>[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}> {
  const limit = Math.min(
    Math.max(opts.limit ?? BILLING_INVOICE_PAGE_SIZE, 1),
    100,
  );
  const offset = Math.max(opts.offset ?? 0, 0);
  const db = await getDb();

  const where = and(
    eq(billingInvoices.accountId, opts.accountId),
    ne(billingInvoices.status, "draft"),
  );

  const [totalRow] = await db
    .select({ value: count() })
    .from(billingInvoices)
    .where(where);

  const rows = await db
    .select()
    .from(billingInvoices)
    .where(where)
    .orderBy(desc(billingInvoices.invoiceDate), desc(billingInvoices.displayNumber))
    .limit(limit)
    .offset(offset);

  const total = totalRow?.value ?? 0;
  return {
    invoices: rows.map(toBillingInvoiceDto),
    total,
    limit,
    offset,
    hasMore: offset + rows.length < total,
  };
}

/**
 * Load a billing invoice by Fuel display number, scoped to account.
 * Never authorize by Stripe invoice id alone.
 */
export async function getBillingInvoiceForAccount(opts: {
  accountId: string;
  displayNumber: number;
}): Promise<BillingInvoice | null> {
  if (!Number.isFinite(opts.displayNumber) || opts.displayNumber < 1) {
    return null;
  }
  const db = await getDb();
  const [row] = await db
    .select()
    .from(billingInvoices)
    .where(
      and(
        eq(billingInvoices.accountId, opts.accountId),
        eq(billingInvoices.displayNumber, opts.displayNumber),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Pull Stripe invoices for the account customer and upsert into DB.
 * Safe to retry — unique on stripe_invoice_id.
 */
export async function reconcileAccountInvoices(
  accountId: string,
  stripeCustomerId: string | null | undefined,
): Promise<number> {
  if (!stripeCustomerId) return 0;

  const stripe = await getStripe();
  let upserted = 0;
  let startingAfter: string | undefined;

  for (let page = 0; page < 20; page++) {
    const list = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const invoice of list.data) {
      const row = await upsertBillingInvoiceFromStripe(invoice);
      // Only count rows that belong to this account (customer → account resolve).
      if (row && row.accountId === accountId) upserted += 1;
    }

    if (!list.has_more || list.data.length === 0) break;
    startingAfter = list.data[list.data.length - 1]?.id;
    if (!startingAfter) break;
  }

  try {
    const { backfillMissingFuelInvoiceArtifacts } = await import("./invoice-pdf/ensure");
    await backfillMissingFuelInvoiceArtifacts(accountId);
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.setContext("operation", { name: "backfillMissingFuelInvoiceArtifacts" });
    Sentry.captureException(error);
  }

  return upserted;
}
