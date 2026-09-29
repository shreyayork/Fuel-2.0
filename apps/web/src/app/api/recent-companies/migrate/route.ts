import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { importRecentCompanies } from "@/lib/recent-companies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-shot localStorage → DB migration for recently viewed companies.
 * Idempotent at the client (migrated flag); server merges via UPSERT + GREATEST.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const session = await getSession();
  const email =
    session?.email ??
    (process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie");
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const account = await getActiveAccountForUser(email);
  if (!account) {
    return NextResponse.json({ error: "no_account" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body !== "object" || body == null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { entries } = body as { entries?: unknown };
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "entries_required" }, { status: 400 });
  }

  try {
    const merged = await importRecentCompanies({
      userEmail: email,
      accountId: account.id,
      primaryCompanyUuid: account.primaryCompanyUuid,
      entries,
    });
    return NextResponse.json({ entries: merged });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "migrate_failed" }, { status: 500 });
  }
}
