import type Stripe from "stripe";
import type {
  FuelInvoiceData,
  FuelInvoiceLineItem,
  FuelInvoiceMoneyLine,
  FuelInvoicePayment,
} from "./types";

function regionDisplayName(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}

function titleCaseBrand(brand: string): string {
  if (!brand) return brand;
  return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
}

function parseUnitAmountDecimal(value: unknown): number | null {
  if (value == null) return null;
  const n =
    typeof value === "number"
      ? value
      : Number.parseFloat(typeof value === "string" ? value : String(value));
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function lineItemsFromInvoice(
  invoice: Stripe.Invoice,
  lineDetail: string | null,
): FuelInvoiceLineItem[] {
  const lines = invoice.lines?.data ?? [];
  return lines.map((line) => {
    const quantity = line.quantity ?? 1;
    const amount = line.amount ?? 0;
    const unitFromPricing = parseUnitAmountDecimal(
      line.pricing?.unit_amount_decimal ?? null,
    );
    const unitAmount =
      unitFromPricing ??
      (quantity > 0 ? Math.round(amount / quantity) : amount);
    const description = line.description?.trim() || "Line item";
    return {
      description,
      detail: lineDetail,
      quantity,
      unitAmount,
      amount,
    };
  });
}

function discountsFromInvoice(invoice: Stripe.Invoice): FuelInvoiceMoneyLine[] {
  const rows = invoice.total_discount_amounts ?? [];
  return rows
    .filter((row) => row.amount > 0)
    .map((row) => ({
      label: "Discount",
      amount: row.amount,
    }));
}

function taxesFromInvoice(invoice: Stripe.Invoice): FuelInvoiceMoneyLine[] {
  const rows = invoice.total_taxes ?? [];
  return rows
    .filter((row) => row.amount > 0)
    .map((row) => ({
      label: "Tax",
      amount: row.amount,
    }));
}

function paymentFromMethod(
  paymentMethod: Stripe.PaymentMethod | null | undefined,
  paidAt: Date | null,
): FuelInvoicePayment | null {
  const card = paymentMethod?.card;
  if (!card?.brand || !card.last4) return null;
  return {
    brand: titleCaseBrand(card.brand),
    last4: card.last4,
    paidAt,
  };
}

function firstTrimmed(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function expandedLiveCustomer(
  customer: Stripe.Invoice["customer"],
): Stripe.Customer | null {
  if (!customer || typeof customer === "string") return null;
  if ("deleted" in customer && customer.deleted) return null;
  return customer;
}

function expandedPaymentMethod(
  value: string | Stripe.PaymentMethod | null | undefined,
): Stripe.PaymentMethod | null {
  if (!value || typeof value === "string") return null;
  return value;
}

/**
 * Card details from the invoice payload alone (no extra Stripe calls).
 *
 * Fuel never sets `default_payment_method` on the invoice, and creates
 * Customers with email only, so both sources are usually empty — the card
 * that actually paid lives on the invoice's PaymentIntent instead
 * (`pickInvoicePaymentIntentId`).
 */
export function pickStripePaymentMethod(
  invoice: Stripe.Invoice,
): Stripe.PaymentMethod | null {
  return (
    expandedPaymentMethod(invoice.default_payment_method) ??
    expandedPaymentMethod(
      expandedLiveCustomer(invoice.customer)?.invoice_settings
        ?.default_payment_method,
    )
  );
}

/**
 * PaymentIntent that settled the invoice, from `invoice.payments` (Basil+/
 * Dahlia replaced the removed top-level `invoice.payment_intent`).
 * Requires `expand: ["payments"]` on retrieval. Successful payments win so a
 * failed earlier attempt never supplies the card shown on a paid invoice.
 */
export function pickInvoicePaymentIntentId(
  invoice: Stripe.Invoice,
): string | null {
  const payments = invoice.payments?.data ?? [];
  const ordered = [
    ...payments.filter((payment) => payment.status === "paid"),
    ...payments.filter((payment) => payment.status !== "paid"),
  ];
  for (const payment of ordered) {
    const intent = payment.payment?.payment_intent;
    if (!intent) continue;
    return typeof intent === "string" ? intent : intent.id;
  }
  return null;
}

/**
 * BILL TO identity from Stripe only — never invent.
 *
 * Field sources differ by invoice origin:
 * - Top-up (Checkout `mode: payment` + `invoice_creation`): Stripe copies
 *   Checkout `customer_details` onto the invoice snapshot
 *   (`customer_name` / `customer_email` / `customer_address`).
 * - Plan (subscription invoice): snapshot is taken from the Customer at
 *   finalization. Fuel creates that Customer with email only, so name and
 *   country are often empty. Cardholder name + billing country then live on
 *   PaymentMethod `billing_details`.
 *
 * Precedence (first non-empty wins):
 * 1. Invoice snapshot: customer_name / customer_email / customer_address
 * 2. Expanded Customer: name / email / address
 * 3. PaymentMethod.billing_details: name / email / address
 */
export function pickStripeCustomerIdentity(
  invoice: Stripe.Invoice,
  paymentMethod?: Stripe.PaymentMethod | null,
): {
  name: string | null;
  email: string | null;
  country: string | null;
} {
  const customer = expandedLiveCustomer(invoice.customer);
  const billing = paymentMethod?.billing_details ?? null;

  return {
    name: firstTrimmed(
      invoice.customer_name,
      customer?.name,
      billing?.name,
    ),
    email: firstTrimmed(
      invoice.customer_email,
      customer?.email,
      billing?.email,
    ),
    country: regionDisplayName(
      firstTrimmed(
        invoice.customer_address?.country,
        customer?.address?.country,
        billing?.address?.country,
      ),
    ),
  };
}

/**
 * Map a Stripe Invoice into the PDF presentation model.
 * Prefer invoice snapshot fields (`customer_*`, `account_*`) — no invented values.
 */
export function mapStripeInvoiceToFuelInvoiceData(
  invoice: Stripe.Invoice,
  opts?: {
    /** Expanded default payment method when Stripe provides card details. */
    paymentMethod?: Stripe.PaymentMethod | null;
    /** Optional secondary line under each description. Defaults to account_name. */
    lineDetail?: string | null;
  },
): FuelInvoiceData {
  const paidAtUnix = invoice.status_transitions?.paid_at ?? null;
  const paidAt = paidAtUnix ? new Date(paidAtUnix * 1000) : null;
  const businessName = invoice.account_name?.trim() || null;
  const lineDetail =
    opts?.lineDetail === undefined ? businessName : opts.lineDetail;
  const customer = pickStripeCustomerIdentity(invoice, opts?.paymentMethod);

  return {
    stripeInvoiceId: invoice.id,
    invoiceNumber: invoice.number ?? null,
    status: invoice.status ?? "open",
    currency: (invoice.currency ?? "usd").toLowerCase(),
    issuedAt: new Date((invoice.effective_at ?? invoice.created) * 1000),
    paidAt,
    business: {
      name: businessName,
      country: regionDisplayName(invoice.account_country),
    },
    customer,
    lineItems: lineItemsFromInvoice(invoice, lineDetail),
    subtotal: invoice.subtotal ?? 0,
    discounts: discountsFromInvoice(invoice),
    taxes: taxesFromInvoice(invoice),
    total: invoice.total ?? 0,
    amountPaid: invoice.amount_paid ?? 0,
    amountDue: invoice.amount_due ?? 0,
    payment: paymentFromMethod(opts?.paymentMethod, paidAt),
  };
}
