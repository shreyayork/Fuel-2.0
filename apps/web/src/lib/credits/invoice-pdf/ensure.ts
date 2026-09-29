import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "@/db/client";
import { billingInvoices, type BillingInvoice } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { firstNameFrom } from "@/lib/email/light-layout";
import { renderPaymentReceiptEmail } from "@/lib/email/payment-receipt";
import { captureIntegrationException } from "@/lib/sentry/capture";
import {
  getUploadObjectBytes,
  putBillingInvoicePdfObject,
  UploadsNotConfiguredError,
} from "@/lib/storage/s3";
import { getStripe } from "../stripe";
import {
  mapStripeInvoiceToFuelInvoiceData,
  pickInvoicePaymentIntentId,
  pickStripePaymentMethod,
} from "./map-stripe-invoice";
import { renderFuelInvoicePdf } from "./render-invoice-pdf";

/**
 * Ops (not code): disable Stripe customer emails so Fuel owns branded PDF mail:
 * - Settings → Customer emails → Successful payments = off
 * - Billing → Subscriptions and emails → Email finalized invoices = off
 * Apply in both test + live Stripe dashboards.
 */

/**
 * Card used to pay the invoice. Checkout top-ups and subscription invoices
 * leave both default-payment-method fields empty, so fall back to the
 * settling PaymentIntent. Stripe caps expansion at four levels, so
 * `payment_method` cannot be expanded through `payments` — retrieve the
 * intent instead, and only when the invoice payload has nothing.
 * Returns null (never placeholder card data) when Stripe has no card.
 */
async function paymentMethodFromInvoice(
  invoice: Stripe.Invoice,
): Promise<Stripe.PaymentMethod | null> {
  const fromInvoice = pickStripePaymentMethod(invoice);
  if (fromInvoice) return fromInvoice;

  const paymentIntentId = pickInvoicePaymentIntentId(invoice);
  if (!paymentIntentId) return null;

  try {
    const stripe = await getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    });
    const paymentMethod = intent.payment_method;
    return paymentMethod && typeof paymentMethod !== "string"
      ? paymentMethod
      : null;
  } catch (error) {
    // Card details are presentational — never fail PDF generation for them.
    captureIntegrationException(error, {
      integration: "stripe",
      operation: "resolve_invoice_payment_method",
      context: { stripeInvoiceId: invoice.id, paymentIntentId },
      level: "warning",
    });
    return null;
  }
}

async function retrieveStripeInvoiceForPdf(
  stripeInvoiceId: string,
): Promise<Stripe.Invoice> {
  const stripe = await getStripe();
  return stripe.invoices.retrieve(stripeInvoiceId, {
    expand: [
      "default_payment_method",
      "customer",
      "customer.invoice_settings.default_payment_method",
      "lines.data",
      // Basil+/Dahlia: the settling PaymentIntent lives here, not on the invoice.
      "payments",
    ],
  });
}

function pdfFilename(data: { invoiceNumber: string | null; stripeInvoiceId: string }): string {
  const base = data.invoiceNumber ?? data.stripeInvoiceId;
  return `Fuel-invoice-${base.replace(/[^a-zA-Z0-9._-]+/g, "_")}.pdf`;
}

/**
 * Ensure Fuel-branded PDF exists in S3 and `fuel_pdf_storage_key` is set.
 * Idempotent: existing key → reuse (no regenerate).
 * Never sets generated timestamp before successful S3 upload.
 */
export async function ensureFuelInvoicePdf(
  row: BillingInvoice,
): Promise<BillingInvoice> {
  if (row.fuelPdfStorageKey) return row;

  try {
    const invoice = await retrieveStripeInvoiceForPdf(row.stripeInvoiceId);
    const data = mapStripeInvoiceToFuelInvoiceData(invoice, {
      paymentMethod: await paymentMethodFromInvoice(invoice),
    });
    const pdf = await renderFuelInvoicePdf(data);
    const { storageKey } = await putBillingInvoicePdfObject({
      accountId: row.accountId,
      stripeInvoiceId: row.stripeInvoiceId,
      body: pdf,
      filename: pdfFilename(data),
    });

    const now = new Date();
    const db = await getDb();
    const [updated] = await db
      .update(billingInvoices)
      .set({
        fuelPdfStorageKey: storageKey,
        fuelPdfGeneratedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(billingInvoices.id, row.id),
          // Another worker may have won the race — only set if still empty.
          isNull(billingInvoices.fuelPdfStorageKey),
        ),
      )
      .returning();

    if (updated) return updated;

    // Lost race — reload winner.
    const [fresh] = await db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.id, row.id))
      .limit(1);
    return fresh ?? { ...row, fuelPdfStorageKey: storageKey, fuelPdfGeneratedAt: now };
  } catch (error) {
    captureIntegrationException(error, {
      integration: "stripe",
      operation: "ensure_fuel_invoice_pdf",
      context: {
        billingInvoiceId: row.id,
        stripeInvoiceId: row.stripeInvoiceId,
        uploadsConfigured: !(error instanceof UploadsNotConfiguredError),
      },
    });
    throw error;
  }
}

/**
 * Send Fuel branded invoice email with PDF attachment once.
 * Idempotent via `fuel_invoice_email_sent_at`. Requires PDF already stored.
 * Recipient = Stripe customer email only.
 */
export async function ensureFuelInvoiceEmail(
  row: BillingInvoice,
): Promise<BillingInvoice> {
  if (row.fuelInvoiceEmailSentAt) return row;
  if (!row.fuelPdfStorageKey) {
    throw new Error("fuel_invoice_pdf_missing");
  }

  try {
    const invoice = await retrieveStripeInvoiceForPdf(row.stripeInvoiceId);
    const data = mapStripeInvoiceToFuelInvoiceData(invoice, {
      paymentMethod: await paymentMethodFromInvoice(invoice),
    });
    const to = data.customer.email?.trim();
    if (!to) {
      captureIntegrationException(new Error("fuel_invoice_email_missing_recipient"), {
        integration: "stripe",
        operation: "ensure_fuel_invoice_email",
        context: { billingInvoiceId: row.id, stripeInvoiceId: row.stripeInvoiceId },
        level: "warning",
      });
      return row;
    }

    const pdfBytes = await getUploadObjectBytes(row.fuelPdfStorageKey);
    const numberLabel = data.invoiceNumber ?? data.stripeInvoiceId;
    const kind =
      row.transactionType === "subscription"
        ? "subscription"
        : row.transactionType === "topup"
          ? "topup"
          : "other";
    const amountCents =
      typeof data.amountPaid === "number" && data.amountPaid > 0
        ? data.amountPaid
        : data.total;
    const amountLabel =
      typeof amountCents === "number"
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: (data.currency ?? "usd").toUpperCase(),
          }).format(amountCents / 100)
        : null;
    const paidAt = data.paidAt ?? data.issuedAt;
    const paidAtLabel = paidAt
      ? new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(paidAt)
      : null;
    const planLabel = data.lineItems[0]?.description?.trim() || null;
    const rendered = renderPaymentReceiptEmail({
      kind,
      firstName: firstNameFrom({
        fullName: data.customer.name,
        email: to,
      }),
      invoiceNumber: numberLabel,
      amountLabel,
      planLabel,
      paidAtLabel,
      creditsAdded: null,
    });
    const subject = `Payment confirmed · invoice ${numberLabel}`;
    const { messageId } = await sendEmail({
      to,
      subject,
      html: rendered.html,
      text: rendered.text,
      attachments: [
        {
          filename: pdfFilename(data),
          contentType: "application/pdf",
          content: pdfBytes,
        },
      ],
    });

    const now = new Date();
    const db = await getDb();
    const [updated] = await db
      .update(billingInvoices)
      .set({
        fuelInvoiceEmailSentAt: now,
        fuelInvoiceEmailMessageId: messageId || null,
        updatedAt: now,
      })
      .where(
        and(
          eq(billingInvoices.id, row.id),
          isNull(billingInvoices.fuelInvoiceEmailSentAt),
        ),
      )
      .returning();

    if (updated) return updated;

    const [fresh] = await db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.id, row.id))
      .limit(1);
    return fresh ?? row;
  } catch (error) {
    captureIntegrationException(error, {
      integration: "ses",
      operation: "ensure_fuel_invoice_email",
      context: {
        billingInvoiceId: row.id,
        stripeInvoiceId: row.stripeInvoiceId,
      },
    });
    throw error;
  }
}

/**
 * After `invoice.paid`: generate PDF (if missing) then email (if missing).
 * Failures are captured; PDF failure skips email.
 */
export async function processPaidInvoiceArtifacts(
  row: BillingInvoice,
): Promise<void> {
  const withPdf = await ensureFuelInvoicePdf(row);
  if (!withPdf.fuelPdfStorageKey) return;
  await ensureFuelInvoiceEmail(withPdf);
}

/**
 * Reconcile helper: backfill missing Fuel PDFs and invoice emails for paid
 * invoices. Recovers DEV/SES failures that were swallowed after ledger sync
 * so Stripe would not retry `invoice.paid`. Idempotent via storage key +
 * `fuel_invoice_email_sent_at` (never marks sent on SES failure).
 */
export async function backfillMissingFuelInvoiceArtifacts(
  accountId: string,
  limit = 25,
): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(billingInvoices)
    .where(
      and(
        eq(billingInvoices.accountId, accountId),
        eq(billingInvoices.status, "paid"),
        isNull(billingInvoices.fuelInvoiceEmailSentAt),
      ),
    )
    .limit(limit);

  let processed = 0;
  for (const row of rows) {
    try {
      await processPaidInvoiceArtifacts(row);
      processed += 1;
    } catch {
      // Captured inside ensure* — continue other invoices.
    }
  }
  return processed;
}
