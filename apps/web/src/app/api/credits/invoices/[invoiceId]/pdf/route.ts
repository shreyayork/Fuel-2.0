import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthResponse, requireBillingAdminAuth } from "@/lib/credits/auth";
import {
  getBillingInvoiceForAccount,
} from "@/lib/credits/invoices";
import { ensureFuelInvoicePdf } from "@/lib/credits/invoice-pdf/ensure";
import { fuelInvoicePdfHeaders } from "@/lib/credits/invoices-shared";
import {
  getUploadObjectBytes,
  getSignedUploadObjectUrl,
  UploadsNotConfiguredError,
} from "@/lib/storage/s3";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/credits/invoices/[invoiceId]/pdf
 * Owner/admin only. `invoiceId` is Fuel display number, scoped to active account.
 * `?disposition=inline` proxies the private PDF for browser viewing.
 * JSON requests retain the existing signed-URL download flow.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ invoiceId: string }> },
): Promise<Response> {
  const auth = await requireBillingAdminAuth();
  if (isAuthResponse(auth)) return auth;

  const { invoiceId: rawId } = await ctx.params;
  const displayNumber = Number.parseInt(rawId, 10);
  if (!Number.isFinite(displayNumber) || displayNumber < 1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = await getBillingInvoiceForAccount({
    accountId: auth.account.id,
    displayNumber,
  });
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const withPdf =
      row.fuelPdfStorageKey || row.status === "paid"
        ? await ensureFuelInvoicePdf(row)
        : row;

    if (!withPdf.fuelPdfStorageKey) {
      return NextResponse.json({ error: "pdf_unavailable" }, { status: 404 });
    }

    const filename =
      `Fuel-invoice-${withPdf.stripeInvoiceNumber ?? withPdf.stripeInvoiceId}.pdf`;
    const disposition = new URL(req.url).searchParams.get("disposition");
    if (disposition === "inline") {
      const pdf = await getUploadObjectBytes(withPdf.fuelPdfStorageKey);
      return new Response(new Uint8Array(pdf), {
        status: 200,
        headers: fuelInvoicePdfHeaders(filename, "inline"),
      });
    }

    const url = await getSignedUploadObjectUrl(withPdf.fuelPdfStorageKey);
    if (req.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({
        url,
        filename,
      });
    }
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof UploadsNotConfiguredError) {
      return NextResponse.json(
        { error: "uploads_not_configured" },
        { status: 503 },
      );
    }
    captureIntegrationException(error, {
      integration: "s3",
      operation: "billing_invoice_pdf_download",
      context: {
        accountId: auth.account.id,
        displayNumber,
      },
    });
    Sentry.setTag("integration", "stripe");
    return NextResponse.json({ error: "download_failed" }, { status: 500 });
  }
}
