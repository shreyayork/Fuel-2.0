import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, superAdminDevEmail } from "@/lib/auth/superadmin";
import { listInvoicesForUserEmail } from "@/lib/super-admin/user-invoices";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(req: Request): Promise<Response> {
  const session = await getSession();
  if (!isSuperAdmin(session, superAdminDevEmail())) return notFound();

  const email = new URL(req.url).searchParams.get("email")?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  try {
    const invoices = await listInvoicesForUserEmail(email);
    return NextResponse.json({ invoices });
  } catch (error) {
    captureIntegrationException(error, {
      integration: "postgres",
      operation: "superAdminUserInvoices",
    });
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
