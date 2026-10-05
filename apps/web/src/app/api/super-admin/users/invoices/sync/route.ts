import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, superAdminDevEmail } from "@/lib/auth/superadmin";
import {
  listInvoicesForUserEmail,
  reconcileInvoicesForUserEmail,
} from "@/lib/super-admin/user-invoices";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { isStripeConfigured } from "@/lib/credits/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** Sync Stripe → billing_invoices for all accounts linked to this email. */
export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!isSuperAdmin(session, superAdminDevEmail())) return notFound();

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  try {
    const sync = await reconcileInvoicesForUserEmail(email);
    const invoices = await listInvoicesForUserEmail(email);
    return NextResponse.json({
      ok: true,
      accounts: sync.accounts,
      upserted: sync.upserted,
      invoices,
    });
  } catch (error) {
    captureIntegrationException(error, {
      integration: "stripe",
      operation: "superAdminReconcileUserInvoices",
    });
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
