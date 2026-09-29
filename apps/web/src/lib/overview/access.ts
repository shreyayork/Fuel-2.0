import "server-only";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getCatalogCompany, isCatalogUuid } from "@/lib/catalog";
import { NextResponse } from "next/server";

export interface OverviewAccessContext {
  email: string;
  accountId: string;
}

export async function requireOverviewAccess(
  companyUuid: string,
): Promise<
  | { ok: true; ctx: OverviewAccessContext }
  | { ok: false; response: Response }
> {
  const session = await getSession();
  const email =
    session?.email ??
    (process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie");
  if (!email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "no_session" }, { status: 401 }),
    };
  }

  const account = await getActiveAccountForUser(email);
  if (!account) {
    return {
      ok: false,
      response: NextResponse.json({ error: "no_account" }, { status: 403 }),
    };
  }

  if (isCatalogUuid(companyUuid)) {
    const catalog = await getCatalogCompany(companyUuid);
    if (!catalog || catalog.accountId !== account.id) {
      return {
        ok: false,
        response: NextResponse.json({ error: "not_found" }, { status: 404 }),
      };
    }
  }

  return { ok: true, ctx: { email, accountId: account.id } };
}
