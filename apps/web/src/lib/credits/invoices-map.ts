import type { BillingInvoice } from "@/db/schema";
import type { BillingInvoiceDto, BillingInvoiceTransactionType } from "./types";

export type StripeInvoiceLike = {
  id: string;
  number?: string | null;
  created: number;
  status: "draft" | "open" | "paid" | "uncollectible" | "void" | null;
  amount_due?: number;
  amount_paid?: number;
  total?: number;
  currency?: string;
  customer?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  subscription?: string | { id: string } | null;
  payment_intent?: string | { id: string } | null;
  parent?: {
    type?: string | null;
    subscription_details?: {
      subscription?: string | { id: string } | null;
      metadata?: Record<string, string> | null;
    } | null;
  } | null;
};

function customerIdFrom(
  customer: StripeInvoiceLike["customer"],
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

function idFrom(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** Extract subscription id from Invoice (legacy + Basil+/Dahlia parent shape). */
export function subscriptionIdFromInvoice(
  invoice: StripeInvoiceLike,
): string | null {
  return (
    idFrom(invoice.subscription) ??
    idFrom(invoice.parent?.subscription_details?.subscription)
  );
}

export function deriveInvoiceTransactionType(
  invoice: StripeInvoiceLike,
): BillingInvoiceTransactionType {
  const metaType = invoice.metadata?.type?.toLowerCase();
  if (metaType === "topup") return "topup";
  if (metaType === "subscription") return "subscription";

  const parentMetaType =
    invoice.parent?.subscription_details?.metadata?.type?.toLowerCase();
  if (parentMetaType === "topup") return "topup";
  if (parentMetaType === "subscription") return "subscription";

  if (subscriptionIdFromInvoice(invoice)) return "subscription";
  return "other";
}

export function mapStripeInvoiceFields(invoice: StripeInvoiceLike): {
  stripeInvoiceId: string;
  stripeInvoiceNumber: string | null;
  invoiceDate: Date;
  status: string;
  amountDue: number;
  amountPaid: number;
  total: number;
  currency: string;
  transactionType: BillingInvoiceTransactionType;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  stripeCustomerId: string | null;
  stripePaymentIntentId: string | null;
} {
  return {
    stripeInvoiceId: invoice.id,
    stripeInvoiceNumber: invoice.number ?? null,
    invoiceDate: new Date(invoice.created * 1000),
    status: invoice.status ?? "open",
    amountDue: invoice.amount_due ?? 0,
    amountPaid: invoice.amount_paid ?? 0,
    total: invoice.total ?? 0,
    currency: (invoice.currency ?? "usd").toLowerCase(),
    transactionType: deriveInvoiceTransactionType(invoice),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdf: invoice.invoice_pdf ?? null,
    stripeCustomerId: customerIdFrom(invoice.customer),
    stripePaymentIntentId: idFrom(invoice.payment_intent),
  };
}

export function toBillingInvoiceDto(row: BillingInvoice): BillingInvoiceDto {
  const invoiceId = String(row.displayNumber);
  const hasFuelPdf = Boolean(row.fuelPdfStorageKey) || row.status === "paid";
  const fuelPdfPath = hasFuelPdf
    ? `/api/credits/invoices/${encodeURIComponent(invoiceId)}/pdf`
    : null;
  return {
    invoiceId,
    // Stripe `number` only — never derive from Fuel display id or Stripe id.
    invoiceNumber: row.stripeInvoiceNumber,
    invoiceDate: row.invoiceDate.toISOString(),
    invoiceStatus: row.status,
    hostedInvoiceUrl: row.hostedInvoiceUrl,
    invoicePdfUrl: row.invoicePdf,
    hasFuelPdf,
    // View + Download share one account-scoped Fuel PDF endpoint.
    fuelPdfViewPath: fuelPdfPath
      ? `${fuelPdfPath}?disposition=inline`
      : null,
    fuelPdfDownloadPath: fuelPdfPath,
  };
}

/** Conflict identity for idempotent upsert (stripe invoice id). */
export function billingInvoiceConflictKey(stripeInvoiceId: string): string {
  return stripeInvoiceId;
}
