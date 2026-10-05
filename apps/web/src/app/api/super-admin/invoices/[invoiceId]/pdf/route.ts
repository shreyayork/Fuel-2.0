import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, superAdminDevEmail } from "@/lib/auth/superadmin";
import { ensureFuelInvoicePdf } from "@/lib/credits/invoice-pdf/ensure";
import { fuelInvoicePdfHeaders } from "@/lib/credits/invoices-shared";
import { getBillingInvoiceByDisplayNumber } from "@/lib/super-admin/user-invoices";
import {
  getSignedUploadObjectUrl,
  getUploadObjectBytes,
  UploadsNotConfiguredError,
} from "@/lib/storage/s3";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/**
 * Super-admin PDF for any account invoice by Fuel display number.
 * Reuses ensureFuelInvoicePdf — no new PDF generation path.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ invoiceId: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!isSuperAdmin(session, superAdminDevEmail())) return notFound();

  const { invoiceId: rawId } = await ctx.params;
  const displayNumber = Number.parseInt(rawId, 10);
  if (!Number.isFinite(displayNumber) || displayNumber < 1) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = await getBillingInvoiceByDisplayNumber(displayNumber);
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

    const filename = `Fuel-invoice-${withPdf.stripeInvoiceNumber ?? withPdf.stripeInvoiceId}.pdf`;
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
      return NextResponse.json({ url, filename });
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
      operation: "superAdminInvoicePdf",
    });
    Sentry.captureException(error);
    return NextResponse.json({ error: "pdf_failed" }, { status: 500 });
  }
}
