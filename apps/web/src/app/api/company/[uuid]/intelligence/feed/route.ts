import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { assertCompanyDataRoomAccess, DataRoomAccessError } from "@/lib/data-room/access";
import { listIntelligenceFeedPage } from "@/lib/intelligence/feed-page";
import { parseIntelligenceFeedPageParams } from "@/lib/intelligence/feed-page-params";
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
 * GET /api/company/[uuid]/intelligence/feed
 * Paginated FeedSignalGroup list with server-side filters.
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
    captureIntegrationException(e, {
      integration: "database",
      operation: "intelligence_feed_access",
      context: { companyUuid: uuid },
    });
    return NextResponse.json({ error: "access_failed" }, { status: 500 });
  }

  const parsed = parseIntelligenceFeedPageParams(new URL(req.url).searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const page = await listIntelligenceFeedPage({
      accountId: account.id,
      companyUuid: uuid,
      query: parsed.query,
    });
    return NextResponse.json(page);
  } catch (e) {
    captureIntegrationException(e, {
      integration: "database",
      operation: "intelligence_feed_page",
      context: { companyUuid: uuid },
    });
    return NextResponse.json({ error: "feed_failed" }, { status: 500 });
  }
}
