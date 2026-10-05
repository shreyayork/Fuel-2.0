import "server-only";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin, superAdminDevEmail } from "@/lib/auth/superadmin";
import { parseSuperAdminUsersQuery } from "@/lib/super-admin/user-lifecycle";
import { listSuperAdminUsers } from "@/lib/super-admin/users";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(req: Request): Promise<Response> {
  const session = await getSession();
  if (!isSuperAdmin(session, superAdminDevEmail())) return notFound();

  const url = new URL(req.url);
  const parsed = parseSuperAdminUsersQuery(url.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid_cursor" }, { status: 400 });
  }

  try {
    const result = await listSuperAdminUsers(parsed);
    if (!result.ok) {
      if (result.reason === "rate_limited") {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    captureIntegrationException(error, {
      integration: "cognito",
      operation: "superAdminListUsers",
    });
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
