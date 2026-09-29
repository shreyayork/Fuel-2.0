import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { assertCompanyDataRoomAccess, DataRoomAccessError } from "@/lib/data-room/access";
import { listIntelligenceLinkOptionsForCompany } from "@/lib/intelligence/link-options";
import { listIntelligenceForCompany } from "@/lib/intelligence/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function accessErrorResponse(error: DataRoomAccessError) {
  return NextResponse.json(
    { error: error.code },
    { status: error.code === "not_found" ? 404 : 403 },
  );
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  const { uuid } = await ctx.params;
  const includeHistory = new URL(req.url).searchParams.get("includeHistory") === "true";

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

  const items = includeHistory
    ? await listIntelligenceLinkOptionsForCompany({
        accountId: account.id,
        companyUuid: uuid,
      })
    : await listIntelligenceForCompany({
        accountId: account.id,
        companyUuid: uuid,
      });
  return NextResponse.json({ items });
}
