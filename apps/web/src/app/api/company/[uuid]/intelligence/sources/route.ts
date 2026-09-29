import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { assertCompanyDataRoomAccess, DataRoomAccessError } from "@/lib/data-room/access";
import { listIntelligenceSourcesPage } from "@/lib/data-room/queries";
import {
  parseListLimitParam,
  parseListOffsetParam,
} from "@/lib/list-pagination";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function accessErrorResponse(error: DataRoomAccessError) {
  return NextResponse.json(
    { error: error.code },
    { status: error.code === "not_found" ? 404 : 403 },
  );
}

/**
 * GET /api/company/[uuid]/intelligence/sources?limit=20&offset=0
 * Paginated current Data Room documents for the Sources sidebar.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  const { uuid } = await ctx.params;

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

  const url = new URL(req.url);
  const limit = parseListLimitParam(url.searchParams.get("limit"));
  const offset = parseListOffsetParam(url.searchParams.get("offset"));

  try {
    const page = await listIntelligenceSourcesPage({
      accountId: account.id,
      companyUuid: uuid,
      limit,
      offset,
    });
    return NextResponse.json(page);
  } catch (e) {
    captureIntegrationException(e, {
      integration: "database",
      operation: "intelligence_sources_list",
      context: { companyUuid: uuid, limit, offset },
    });
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
}
