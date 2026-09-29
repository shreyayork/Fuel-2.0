export type FuelInvoiceMoneyLine = {
  label: string;
  /** Stripe minor units (e.g. cents). */
  amount: number;
};

export type FuelInvoiceLineItem = {
  description: string;
  detail: string | null;
  quantity: number;
  /** Stripe minor units. */
  unitAmount: number;
  /** Stripe minor units. */
  amount: number;
};

export type FuelInvoicePayment = {
  brand: string;
  last4: string;
  paidAt: Date | null;
};

/**
 * Presentation model for the Fuel-branded invoice PDF.
 * All monetary / status / identity fields originate from Stripe — Fuel only shapes them for layout.
 */
export type FuelInvoiceData = {
  stripeInvoiceId: string;
  invoiceNumber: string | null;
  status: string;
  currency: string;
  issuedAt: Date;
  paidAt: Date | null;
  business: {
    name: string | null;
    country: string | null;
  };
  customer: {
    name: string | null;
    email: string | null;
    country: string | null;
  };
  lineItems: FuelInvoiceLineItem[];
  subtotal: number;
  discounts: FuelInvoiceMoneyLine[];
  taxes: FuelInvoiceMoneyLine[];
  total: number;
  amountPaid: number;
  amountDue: number;
  payment: FuelInvoicePayment | null;
};
