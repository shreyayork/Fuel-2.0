import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type Stripe from "stripe";
import { extractText } from "unpdf";
import { billingInvoicePdfKey } from "./storage-key";
import {
  mapStripeInvoiceToFuelInvoiceData,
  pickInvoicePaymentIntentId,
  pickStripePaymentMethod,
} from "./map-stripe-invoice";
import { renderFuelInvoicePdf } from "./render-invoice-pdf";
import type { FuelInvoiceData } from "./types";

function address(country: string): Stripe.Address {
  return {
    city: null,
    country,
    line1: null,
    line2: null,
    postal_code: null,
    state: null,
  };
}

function baseStripeInvoice(
  overrides: Partial<Stripe.Invoice> = {},
): Stripe.Invoice {
  return {
    id: "in_test_pdf_1",
    object: "invoice",
    number: "LKY775MK-0003",
    created: 1_786_320_000,
    effective_at: 1_786_320_000,
    status: "paid",
    currency: "usd",
    amount_due: 0,
    amount_paid: 500,
    total: 500,
    subtotal: 500,
    account_name: "Fuel sandbox",
    account_country: "US",
    customer_name: "Soumya Mehta",
    customer_email: "soumya.m+234@york.ie",
    customer_address: address("IN"),
    status_transitions: {
      finalized_at: 1_786_320_000,
      marked_uncollectible_at: null,
      paid_at: 1_786_320_000,
      voided_at: null,
    },
    total_discount_amounts: null,
    total_taxes: null,
    lines: {
      object: "list",
      data: [
        {
          id: "il_1",
          object: "line_item",
          amount: 500,
          description: "Fuel top-up · Jalsa Pack",
          quantity: 1,
          pricing: {
            type: "price_details",
            unit_amount_decimal: "500",
            price_details: { price: "price_1", product: "prod_1" },
          },
        } as unknown as Stripe.InvoiceLineItem,
      ],
      has_more: false,
      url: "",
    },
    ...overrides,
  } as Stripe.Invoice;
}

describe("mapStripeInvoiceToFuelInvoiceData", () => {
  it("maps paid invoice core fields from Stripe", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(baseStripeInvoice(), {
      paymentMethod: {
        id: "pm_1",
        object: "payment_method",
        type: "card",
        card: { brand: "visa", last4: "4242" },
      } as Stripe.PaymentMethod,
    });

    assert.equal(data.invoiceNumber, "LKY775MK-0003");
    assert.equal(data.status, "paid");
    assert.equal(data.currency, "usd");
    assert.equal(data.amountPaid, 500);
    assert.equal(data.amountDue, 0);
    assert.equal(data.business.name, "Fuel sandbox");
    assert.equal(data.business.country, "United States");
    assert.equal(data.customer.name, "Soumya Mehta");
    assert.equal(data.customer.email, "soumya.m+234@york.ie");
    assert.equal(data.customer.country, "India");
    assert.equal(data.lineItems.length, 1);
    assert.equal(data.lineItems[0]?.description, "Fuel top-up · Jalsa Pack");
    assert.equal(data.lineItems[0]?.quantity, 1);
    assert.equal(data.lineItems[0]?.unitAmount, 500);
    assert.equal(data.lineItems[0]?.amount, 500);
    assert.equal(data.lineItems[0]?.detail, "Fuel sandbox");
    assert.deepEqual(data.payment, {
      brand: "Visa",
      last4: "4242",
      paidAt: new Date(1_786_320_000 * 1000),
    });
  });

  it("omits payment when Stripe provides no card details", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(baseStripeInvoice());
    assert.equal(data.payment, null);
  });

  it("maps unpaid/open invoices without inventing paidAt", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(
      baseStripeInvoice({
        status: "open",
        amount_due: 500,
        amount_paid: 0,
        status_transitions: {
          finalized_at: 1_786_320_000,
          marked_uncollectible_at: null,
          paid_at: null,
          voided_at: null,
        },
      }),
    );
    assert.equal(data.status, "open");
    assert.equal(data.paidAt, null);
    assert.equal(data.amountDue, 500);
    assert.equal(data.amountPaid, 0);
  });

  it("includes tax and discount rows only when Stripe amounts > 0", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(
      baseStripeInvoice({
        total_discount_amounts: [{ amount: 100, discount: "di_1" }],
        total_taxes: [
          {
            amount: 50,
            tax_behavior: "exclusive",
            tax_rate_details: { tax_rate: "txr_1" },
            taxability_reason: "standard_rated",
            taxable_amount: 500,
            type: "tax_rate_details",
          },
        ],
      }),
    );
    assert.equal(data.discounts.length, 1);
    assert.equal(data.discounts[0]?.amount, 100);
    assert.equal(data.taxes.length, 1);
    assert.equal(data.taxes[0]?.amount, 50);
  });

  it("leaves optional customer fields null when Stripe omits them", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(
      baseStripeInvoice({
        customer_name: null,
        customer_email: null,
        customer_address: null,
        account_name: null,
        account_country: null,
      }),
    );
    assert.equal(data.customer.name, null);
    assert.equal(data.customer.email, null);
    assert.equal(data.customer.country, null);
    assert.equal(data.business.name, null);
    assert.equal(data.business.country, null);
  });

  it("uses invoice snapshot for top-up invoices (Checkout customer_details)", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(
      baseStripeInvoice({
        customer: "cus_topup",
        customer_name: "Soumya Mehta",
        customer_email: "soumya.m+234@york.ie",
        customer_address: address("IN"),
      }),
    );
    assert.equal(data.customer.name, "Soumya Mehta");
    assert.equal(data.customer.email, "soumya.m+234@york.ie");
    assert.equal(data.customer.country, "India");
  });

  it("falls back to payment method billing_details for plan invoices", () => {
    // Subscription invoices snapshot Customer (email only). Name/country live
    // on the card PaymentMethod until Checkout customer_update has run.
    const data = mapStripeInvoiceToFuelInvoiceData(
      baseStripeInvoice({
        customer: "cus_plan",
        customer_name: null,
        customer_email: "soumya.m+234@york.ie",
        customer_address: null,
      }),
      {
        paymentMethod: {
          id: "pm_plan",
          object: "payment_method",
          type: "card",
          billing_details: {
            name: "Soumya Mehta",
            email: null,
            phone: null,
            address: address("IN"),
          },
          card: { brand: "visa", last4: "4242" },
        } as Stripe.PaymentMethod,
      },
    );
    assert.equal(data.customer.name, "Soumya Mehta");
    assert.equal(data.customer.email, "soumya.m+234@york.ie");
    assert.equal(data.customer.country, "India");
  });

  it("falls back to expanded Customer when snapshot is empty", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(
      baseStripeInvoice({
        customer_name: null,
        customer_email: null,
        customer_address: null,
        customer: {
          id: "cus_expanded",
          object: "customer",
          name: "Expanded Name",
          email: "expanded@york.ie",
          address: address("US"),
          deleted: undefined,
        } as unknown as Stripe.Customer,
      }),
    );
    assert.equal(data.customer.name, "Expanded Name");
    assert.equal(data.customer.email, "expanded@york.ie");
    assert.equal(data.customer.country, "United States");
  });

  it("prefers invoice snapshot over Customer and payment method", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(
      baseStripeInvoice({
        customer_name: "Snapshot Name",
        customer_email: "snapshot@york.ie",
        customer_address: address("IN"),
        customer: {
          id: "cus_expanded",
          object: "customer",
          name: "Customer Name",
          email: "customer@york.ie",
          address: address("US"),
        } as unknown as Stripe.Customer,
      }),
      {
        paymentMethod: {
          id: "pm_1",
          object: "payment_method",
          type: "card",
          billing_details: {
            name: "Card Name",
            email: "card@york.ie",
            phone: null,
            address: address("GB"),
          },
        } as Stripe.PaymentMethod,
      },
    );
    assert.equal(data.customer.name, "Snapshot Name");
    assert.equal(data.customer.email, "snapshot@york.ie");
    assert.equal(data.customer.country, "India");
  });

  it("does not invent name or country when customer is an unexpanded ID", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(
      baseStripeInvoice({
        customer: "cus_only_id",
        customer_name: null,
        customer_email: "only@york.ie",
        customer_address: null,
      }),
    );
    assert.equal(data.customer.name, null);
    assert.equal(data.customer.email, "only@york.ie");
    assert.equal(data.customer.country, null);
  });

  it("maps multiple line items with quantities", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(
      baseStripeInvoice({
        lines: {
          object: "list",
          has_more: false,
          url: "",
          data: [
            {
              id: "il_1",
              object: "line_item",
              amount: 3000,
              description: "Fuel Pro",
              quantity: 1,
              pricing: {
                type: "price_details",
                unit_amount_decimal: "3000",
              },
            } as unknown as Stripe.InvoiceLineItem,
            {
              id: "il_2",
              object: "line_item",
              amount: 1000,
              description: "Top-up credits",
              quantity: 2,
              pricing: {
                type: "price_details",
                unit_amount_decimal: "500",
              },
            } as unknown as Stripe.InvoiceLineItem,
          ],
        },
      }),
    );
    assert.equal(data.lineItems.length, 2);
    assert.equal(data.lineItems[1]?.quantity, 2);
    assert.equal(data.lineItems[1]?.unitAmount, 500);
  });
});

describe("payment method resolution sources", () => {
  function cardPaymentMethod(id: string): Stripe.PaymentMethod {
    return {
      id,
      object: "payment_method",
      type: "card",
      card: { brand: "visa", last4: "4242" },
    } as Stripe.PaymentMethod;
  }

  function invoicePayment(
    overrides: Partial<Stripe.InvoicePayment> = {},
  ): Stripe.InvoicePayment {
    return {
      id: "inpay_1",
      object: "invoice_payment",
      status: "paid",
      is_default: true,
      payment: { type: "payment_intent", payment_intent: "pi_paid" },
      ...overrides,
    } as Stripe.InvoicePayment;
  }

  function withPayments(
    payments: Stripe.InvoicePayment[],
    overrides: Partial<Stripe.Invoice> = {},
  ): Stripe.Invoice {
    return baseStripeInvoice({
      payments: {
        object: "list",
        data: payments,
        has_more: false,
        url: "",
      },
      ...overrides,
    } as Partial<Stripe.Invoice>);
  }

  it("uses the invoice default payment method when Stripe expands one", () => {
    const pm = cardPaymentMethod("pm_invoice_default");
    const picked = pickStripePaymentMethod(
      baseStripeInvoice({ default_payment_method: pm }),
    );
    assert.equal(picked?.id, "pm_invoice_default");
  });

  it("falls back to the customer's default payment method", () => {
    const picked = pickStripePaymentMethod(
      baseStripeInvoice({
        default_payment_method: null,
        customer: {
          id: "cus_1",
          object: "customer",
          invoice_settings: {
            default_payment_method: cardPaymentMethod("pm_customer_default"),
          },
        } as unknown as Stripe.Customer,
      }),
    );
    assert.equal(picked?.id, "pm_customer_default");
  });

  it("returns null when neither default payment method is expanded", () => {
    // Real Fuel shape: Checkout top-ups and plan invoices leave both empty,
    // and unexpanded ids must never be treated as card data.
    assert.equal(
      pickStripePaymentMethod(
        baseStripeInvoice({
          default_payment_method: "pm_unexpanded",
          customer: "cus_unexpanded",
        }),
      ),
      null,
    );
  });

  it("reads the settling PaymentIntent id from invoice.payments", () => {
    assert.equal(
      pickInvoicePaymentIntentId(withPayments([invoicePayment()])),
      "pi_paid",
    );
  });

  it("prefers the paid payment over earlier failed attempts", () => {
    const id = pickInvoicePaymentIntentId(
      withPayments([
        invoicePayment({
          id: "inpay_failed",
          status: "open",
          payment: { type: "payment_intent", payment_intent: "pi_failed" },
        } as Partial<Stripe.InvoicePayment>),
        invoicePayment({
          id: "inpay_paid",
          status: "paid",
          payment: { type: "payment_intent", payment_intent: "pi_success" },
        } as Partial<Stripe.InvoicePayment>),
      ]),
    );
    assert.equal(id, "pi_success");
  });

  it("reads the id from an expanded PaymentIntent", () => {
    const id = pickInvoicePaymentIntentId(
      withPayments([
        invoicePayment({
          payment: {
            type: "payment_intent",
            payment_intent: { id: "pi_expanded" } as Stripe.PaymentIntent,
          },
        } as Partial<Stripe.InvoicePayment>),
      ]),
    );
    assert.equal(id, "pi_expanded");
  });

  it("returns null when the invoice has no usable payment", () => {
    assert.equal(pickInvoicePaymentIntentId(baseStripeInvoice()), null);
    assert.equal(pickInvoicePaymentIntentId(withPayments([])), null);
    assert.equal(
      pickInvoicePaymentIntentId(
        withPayments([
          invoicePayment({
            payment: { type: "payment_record", payment_record: "pr_1" },
          } as Partial<Stripe.InvoicePayment>),
        ]),
      ),
      null,
    );
  });

  it("maps a resolved PaymentIntent card onto the PDF payment block", () => {
    // Mirrors ensure.ts after PaymentIntent resolution: the invoice itself
    // carries no default payment method, but the card is known.
    const data = mapStripeInvoiceToFuelInvoiceData(
      withPayments([invoicePayment()], { default_payment_method: null }),
      { paymentMethod: cardPaymentMethod("pm_from_intent") },
    );
    assert.deepEqual(data.payment, {
      brand: "Visa",
      last4: "4242",
      paidAt: new Date(1_786_320_000 * 1000),
    });
  });

  it("omits the payment block for non-card payment methods", () => {
    const data = mapStripeInvoiceToFuelInvoiceData(
      withPayments([invoicePayment()]),
      {
        paymentMethod: {
          id: "pm_bank",
          object: "payment_method",
          type: "us_bank_account",
          us_bank_account: { last4: "6789" },
        } as Stripe.PaymentMethod,
      },
    );
    assert.equal(data.payment, null);
  });
});

describe("billingInvoicePdfKey", () => {
  it("uses deterministic account/invoice path", () => {
    assert.equal(
      billingInvoicePdfKey("acc_1", "in_abc"),
      "accounts/acc_1/invoices/in_abc.pdf",
    );
  });
});

describe("renderFuelInvoicePdf", () => {
  function sampleData(overrides: Partial<FuelInvoiceData> = {}): FuelInvoiceData {
    return {
      stripeInvoiceId: "in_test_pdf_1",
      invoiceNumber: "LKY775MK-0003",
      status: "paid",
      currency: "usd",
      issuedAt: new Date("2026-08-10T00:00:00.000Z"),
      paidAt: new Date("2026-08-10T00:00:00.000Z"),
      business: { name: "Fuel sandbox", country: "United States" },
      customer: {
        name: "Soumya Mehta",
        email: "soumya.m+234@york.ie",
        country: "India",
      },
      lineItems: [
        {
          description: "Fuel top-up · Jalsa Pack",
          detail: "Fuel sandbox",
          quantity: 1,
          unitAmount: 500,
          amount: 500,
        },
      ],
      subtotal: 500,
      discounts: [],
      taxes: [],
      total: 500,
      amountPaid: 500,
      amountDue: 0,
      payment: {
        brand: "Visa",
        last4: "4242",
        paidAt: new Date("2026-08-10T00:00:00.000Z"),
      },
      ...overrides,
    };
  }

  it("produces a valid PDF with required paid-invoice content", async () => {
    const pdf = await renderFuelInvoicePdf(sampleData({ amountDue: 500 }));
    assert.ok(pdf.length > 1000);
    assert.equal(pdf.subarray(0, 4).toString("utf8"), "%PDF");
    // Title metadata carries the invoice number (body text is font-encoded).
    assert.match(pdf.toString("latin1"), /LKY775MK-0003/);
    assert.match(pdf.toString("latin1"), /SpaceGrotesk|Inter/);

    const result = await extractText(new Uint8Array(pdf), { mergePages: true });
    const text = Array.isArray(result.text)
      ? result.text.join("\n")
      : result.text;
    assert.match(text, /Amount paid\s+\$5\.00/);
    assert.match(text, /Amount due\s+\$0\.00/);
    assert.doesNotMatch(text, /USD \$5\.00/);
    assert.match(text, /Payment\s+Visa ending in 4242 — Aug 10, 2026/);
  });

  it("renders multiple line items and long names without throwing", async () => {
    const pdf = await renderFuelInvoicePdf(
      sampleData({
        customer: {
          name: "A".repeat(80),
          email: "very.long.email.address+alias@example.company.co.uk",
          country: "United States",
        },
        lineItems: [
          {
            description: "Very long product name that should truncate safely in the table",
            detail: "Account label that is also quite long for layout stress",
            quantity: 3,
            unitAmount: 1000,
            amount: 3000,
          },
          {
            description: "Second line",
            detail: null,
            quantity: 1,
            unitAmount: 200,
            amount: 200,
          },
        ],
        subtotal: 3200,
        total: 3200,
        amountPaid: 3200,
      }),
    );
    assert.equal(pdf.subarray(0, 4).toString("utf8"), "%PDF");
    assert.ok(pdf.length > 1000);
  });

  it("renders BILL TO with email only when name and country are missing", async () => {
    const pdf = await renderFuelInvoicePdf(
      sampleData({
        customer: {
          name: null,
          email: "only@york.ie",
          country: null,
        },
      }),
    );
    assert.equal(pdf.subarray(0, 4).toString("utf8"), "%PDF");
    assert.ok(pdf.length > 1000);
  });

  it("renders unpaid layout with tax/discount without throwing", async () => {
    const pdf = await renderFuelInvoicePdf(
      sampleData({
        status: "open",
        paidAt: null,
        amountPaid: 0,
        amountDue: 550,
        discounts: [{ label: "Discount", amount: 50 }],
        taxes: [{ label: "Tax", amount: 100 }],
        payment: null,
      }),
    );
    assert.equal(pdf.subarray(0, 4).toString("utf8"), "%PDF");
    assert.ok(pdf.length > 1000);
    const result = await extractText(new Uint8Array(pdf), { mergePages: true });
    const text = Array.isArray(result.text)
      ? result.text.join("\n")
      : result.text;
    assert.match(text, /Amount due\s+\$5\.50/);
    assert.doesNotMatch(text, /Payment/);
  });
});
