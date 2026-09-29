import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { isAuthResponse, requireBillingAdminAuth } from "@/lib/credits/auth";
import { listBillingInvoicesForAccount } from "@/lib/credits/invoices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseNonNegInt(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/**
 * GET /api/credits/invoices — owner/admin only.
 * DB-first invoice history (Stripe synced via webhooks + reconcile).
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await requireBillingAdminAuth();
  if (isAuthResponse(auth)) return auth;

  const url = new URL(req.url);
  const limit = parseNonNegInt(url.searchParams.get("limit"), 20);
  const offset = parseNonNegInt(url.searchParams.get("offset"), 0);

  try {
    const result = await listBillingInvoicesForAccount({
      accountId: auth.account.id,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (error) {
    Sentry.setTag("integration", "stripe");
    Sentry.setContext("operation", { name: "listBillingInvoices" });
    Sentry.captureException(error);
    return NextResponse.json({ error: "invoices_fetch_failed" }, { status: 500 });
  }
}
