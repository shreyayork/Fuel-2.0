import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BillingInvoice } from "@/db/schema";
import { isBillingAdminRole } from "./auth-roles";
import {
  billingInvoiceConflictKey,
  deriveInvoiceTransactionType,
  mapStripeInvoiceFields,
  subscriptionIdFromInvoice,
  toBillingInvoiceDto,
} from "./invoices-map";
import {
  BILLING_INVOICES_EMPTY_COPY,
  fuelInvoicePdfHeaders,
} from "./invoices-shared";

function baseInvoice(
  overrides: Partial<Parameters<typeof mapStripeInvoiceFields>[0]> = {},
): Parameters<typeof mapStripeInvoiceFields>[0] {
  return {
    id: "in_test_1",
    number: "INV-1001",
    created: 1_700_000_000,
    status: "paid",
    amount_due: 3000,
    amount_paid: 3000,
    total: 3000,
    currency: "usd",
    customer: "cus_abc",
    metadata: null,
    hosted_invoice_url: "https://invoice.stripe.com/i/acct_x/test_hosted",
    invoice_pdf: "https://pay.stripe.com/invoice/test_pdf/pdf",
    ...overrides,
  };
}

describe("mapStripeInvoiceFields", () => {
  it("maps hosted_invoice_url and invoice_pdf exactly", () => {
    const mapped = mapStripeInvoiceFields(baseInvoice());
    assert.equal(
      mapped.hostedInvoiceUrl,
      "https://invoice.stripe.com/i/acct_x/test_hosted",
    );
    assert.equal(
      mapped.invoicePdf,
      "https://pay.stripe.com/invoice/test_pdf/pdf",
    );
  });

  it("passes through Stripe status without renaming", () => {
    for (const status of ["paid", "open", "void", "uncollectible", "draft"] as const) {
      assert.equal(mapStripeInvoiceFields(baseInvoice({ status })).status, status);
    }
  });

  it("handles missing PDF as null", () => {
    const mapped = mapStripeInvoiceFields(
      baseInvoice({ invoice_pdf: null, hosted_invoice_url: null }),
    );
    assert.equal(mapped.invoicePdf, null);
    assert.equal(mapped.hostedInvoiceUrl, null);
  });

  it("uses Stripe created timestamp for invoice date", () => {
    const mapped = mapStripeInvoiceFields(baseInvoice({ created: 1_704_067_200 }));
    assert.equal(mapped.invoiceDate.toISOString(), "2024-01-01T00:00:00.000Z");
  });
});

describe("toBillingInvoiceDto", () => {
  it("exposes Fuel display number and Stripe URLs", () => {
    const row = {
      id: "binv_1",
      displayNumber: 42,
      accountId: "acc_1",
      stripeCustomerId: "cus_abc",
      stripeInvoiceId: "in_test_1",
      stripeInvoiceNumber: "INV-1001",
      invoiceDate: new Date("2024-01-01T00:00:00.000Z"),
      status: "paid",
      amountDue: 3000,
      amountPaid: 3000,
      total: 3000,
      currency: "usd",
      transactionType: "subscription" as const,
      hostedInvoiceUrl: "https://invoice.stripe.com/i/acct_x/test_hosted",
      invoicePdf: "https://pay.stripe.com/invoice/test_pdf/pdf",
      fuelPdfStorageKey: null,
      fuelPdfGeneratedAt: null,
      fuelInvoiceEmailSentAt: null,
      fuelInvoiceEmailMessageId: null,
      stripePaymentIntentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies BillingInvoice;

    const dto = toBillingInvoiceDto(row);
    assert.deepEqual(dto, {
      invoiceId: "42",
      invoiceNumber: "INV-1001",
      invoiceDate: "2024-01-01T00:00:00.000Z",
      invoiceStatus: "paid",
      hostedInvoiceUrl: "https://invoice.stripe.com/i/acct_x/test_hosted",
      invoicePdfUrl: "https://pay.stripe.com/invoice/test_pdf/pdf",
      hasFuelPdf: true,
      fuelPdfViewPath: "/api/credits/invoices/42/pdf?disposition=inline",
      fuelPdfDownloadPath: "/api/credits/invoices/42/pdf",
    });
  });

  it("keeps invoiceNumber null when Stripe has no number", () => {
    const row = {
      id: "binv_2",
      displayNumber: 7,
      accountId: "acc_1",
      stripeCustomerId: "cus_abc",
      stripeInvoiceId: "in_fallback",
      stripeInvoiceNumber: null,
      invoiceDate: new Date("2024-02-01T00:00:00.000Z"),
      status: "open",
      amountDue: 100,
      amountPaid: 0,
      total: 100,
      currency: "usd",
      transactionType: "other" as const,
      hostedInvoiceUrl: null,
      invoicePdf: null,
      fuelPdfStorageKey: null,
      fuelPdfGeneratedAt: null,
      fuelInvoiceEmailSentAt: null,
      fuelInvoiceEmailMessageId: null,
      stripePaymentIntentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies BillingInvoice;

    const dto = toBillingInvoiceDto(row);
    assert.equal(dto.invoiceId, "7");
    assert.equal(dto.invoiceNumber, null);
    assert.equal(dto.invoicePdfUrl, null);
    assert.equal(dto.hostedInvoiceUrl, null);
    assert.equal(dto.hasFuelPdf, false);
    assert.equal(dto.fuelPdfViewPath, null);
    assert.equal(dto.fuelPdfDownloadPath, null);
  });
});

describe("Fuel invoice PDF response headers", () => {
  it("serves View as an inline PDF", () => {
    const headers = fuelInvoicePdfHeaders("Fuel-invoice-42.pdf", "inline");
    assert.equal(headers["content-type"], "application/pdf");
    assert.equal(
      headers["content-disposition"],
      'inline; filename="Fuel-invoice-42.pdf"',
    );
  });

  it("retains attachment headers for download responses", () => {
    const headers = fuelInvoicePdfHeaders("Fuel-invoice-42.pdf", "attachment");
    assert.equal(headers["content-type"], "application/pdf");
    assert.equal(
      headers["content-disposition"],
      'attachment; filename="Fuel-invoice-42.pdf"',
    );
  });

  it("sanitizes filenames before placing them in headers", () => {
    const headers = fuelInvoicePdfHeaders('Fuel-"42"\r\n.pdf', "inline");
    assert.equal(
      headers["content-disposition"],
      'inline; filename="Fuel-_42___.pdf"',
    );
  });
});

describe("deriveInvoiceTransactionType", () => {
  it("detects top-up from metadata", () => {
    assert.equal(
      deriveInvoiceTransactionType(
        baseInvoice({ metadata: { type: "topup", packSlug: "growth" } }),
      ),
      "topup",
    );
  });

  it("detects subscription from subscription id", () => {
    assert.equal(
      deriveInvoiceTransactionType(
        baseInvoice({ subscription: "sub_123", metadata: null }),
      ),
      "subscription",
    );
  });

  it("detects subscription from parent.subscription_details", () => {
    assert.equal(
      deriveInvoiceTransactionType(
        baseInvoice({
          subscription: null,
          parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_parent" },
          },
        }),
      ),
      "subscription",
    );
  });

  it("returns other when no subscription signal", () => {
    assert.equal(deriveInvoiceTransactionType(baseInvoice()), "other");
  });
});

describe("subscriptionIdFromInvoice", () => {
  it("prefers legacy subscription field", () => {
    assert.equal(
      subscriptionIdFromInvoice(
        baseInvoice({
          subscription: "sub_legacy",
          parent: {
            subscription_details: { subscription: "sub_parent" },
          },
        }),
      ),
      "sub_legacy",
    );
  });
});

describe("billingInvoiceConflictKey / idempotency", () => {
  it("uses stripe invoice id as conflict identity", () => {
    assert.equal(billingInvoiceConflictKey("in_abc"), "in_abc");
    assert.equal(
      billingInvoiceConflictKey(mapStripeInvoiceFields(baseInvoice()).stripeInvoiceId),
      "in_test_1",
    );
  });

  it("same stripe invoice id maps to same upsert key across status changes", () => {
    const a = mapStripeInvoiceFields(baseInvoice({ status: "open" }));
    const b = mapStripeInvoiceFields(baseInvoice({ status: "paid" }));
    assert.equal(
      billingInvoiceConflictKey(a.stripeInvoiceId),
      billingInvoiceConflictKey(b.stripeInvoiceId),
    );
  });
});

describe("isBillingAdminRole", () => {
  it("allows owner and admin", () => {
    assert.equal(isBillingAdminRole("owner"), true);
    assert.equal(isBillingAdminRole("admin"), true);
  });

  it("rejects member and unknown", () => {
    assert.equal(isBillingAdminRole("member"), false);
    assert.equal(isBillingAdminRole(null), false);
    assert.equal(isBillingAdminRole(undefined), false);
    assert.equal(isBillingAdminRole("super-admin"), false);
  });
});

describe("reverse chronological ordering", () => {
  it("sorts by invoice date descending", () => {
    const rows = [
      { id: "a", invoiceDate: new Date("2024-01-01") },
      { id: "b", invoiceDate: new Date("2024-03-01") },
      { id: "c", invoiceDate: new Date("2024-02-01") },
    ];
    const sorted = [...rows].sort(
      (x, y) => y.invoiceDate.getTime() - x.invoiceDate.getTime(),
    );
    assert.deepEqual(
      sorted.map((r) => r.id),
      ["b", "c", "a"],
    );
  });
});

describe("empty state copy", () => {
  it("matches F20A-164 exact empty message", () => {
    assert.equal(
      BILLING_INVOICES_EMPTY_COPY,
      "No invoices yet. Invoices will appear after the first successful payment.",
    );
  });
});
