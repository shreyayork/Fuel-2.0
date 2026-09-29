import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { assertCompanyDataRoomAccess, DataRoomAccessError } from "@/lib/data-room/access";
import { dismissIntelligence } from "@/lib/intelligence/queries";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function accessErrorResponse(error: DataRoomAccessError) {
  return NextResponse.json(
    { error: error.code },
    { status: error.code === "not_found" ? 404 : 403 },
  );
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ uuid: string; id: string }> },
): Promise<Response> {
  const { uuid, id } = await ctx.params;

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

  try {
    await assertCompanyDataRoomAccess(account, uuid);
  } catch (e) {
    if (e instanceof DataRoomAccessError) return accessErrorResponse(e);
    throw e;
  }

  try {
    const ok = await dismissIntelligence({
      accountId: account.id,
      companyUuid: uuid,
      id,
    });
    if (!ok) {
      return NextResponse.json({ error: "not_dismissible" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    captureIntegrationException(e, {
      integration: "database",
      operation: "intelligence_dismiss",
      context: { companyUuid: uuid, intelligenceId: id },
    });
    return NextResponse.json({ error: "dismiss_failed" }, { status: 500 });
  }
}
