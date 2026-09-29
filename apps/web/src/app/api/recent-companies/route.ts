import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import {
  listRecentCompanies,
  recordRecentCompanyVisit,
  removeRecentCompanyVisit,
} from "@/lib/recent-companies-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveAuth(): Promise<
  | { email: string; accountId: string; primaryCompanyUuid: string | null }
  | NextResponse
> {
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
  return {
    email,
    accountId: account.id,
    primaryCompanyUuid: account.primaryCompanyUuid,
  };
}

export async function GET(): Promise<Response> {
  const auth = await resolveAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const entries = await listRecentCompanies({
      userEmail: auth.email,
      accountId: auth.accountId,
      primaryCompanyUuid: auth.primaryCompanyUuid,
    });
    return NextResponse.json({ entries });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const auth = await resolveAuth();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body !== "object" || body == null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { uuid, name, domain, logoUrl } = body as Record<string, unknown>;
  if (typeof uuid !== "string" || !uuid.trim()) {
    return NextResponse.json({ error: "uuid_required" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  try {
    const entries = await recordRecentCompanyVisit({
      userEmail: auth.email,
      accountId: auth.accountId,
      primaryCompanyUuid: auth.primaryCompanyUuid,
      entry: {
        uuid,
        name,
        domain: typeof domain === "string" ? domain : undefined,
        logoUrl: typeof logoUrl === "string" ? logoUrl : undefined,
      },
    });
    return NextResponse.json({ entries });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "record_failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  const auth = await resolveAuth();
  if (auth instanceof NextResponse) return auth;

  const uuid = req.nextUrl.searchParams.get("uuid")?.trim();
  if (!uuid) {
    return NextResponse.json({ error: "uuid_required" }, { status: 400 });
  }

  try {
    const entries = await removeRecentCompanyVisit({
      userEmail: auth.email,
      companyUuid: uuid,
      accountId: auth.accountId,
      primaryCompanyUuid: auth.primaryCompanyUuid,
    });
    return NextResponse.json({ entries });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
