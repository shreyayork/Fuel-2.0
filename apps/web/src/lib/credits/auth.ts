import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import type { Account } from "@/db/schema";

export { isBillingAdminRole } from "./auth-roles";

export type CreditsAuthContext = {
  email: string;
  account: Account;
};

export type BillingAdminAuthContext = CreditsAuthContext & {
  role: "owner" | "admin";
};

export async function requireCreditsAuth(): Promise<
  CreditsAuthContext | NextResponse
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

  return { email, account };
}

/** Owner/admin only — invoice history and billing PDF URLs. */
export async function requireBillingAdminAuth(): Promise<
  BillingAdminAuthContext | NextResponse
> {
  const auth = await requireCreditsAuth();
  if (isAuthResponse(auth)) return auth;

  const membership = await getMembership({
    accountId: auth.account.id,
    userEmail: auth.email,
  });
  const role = membership?.role;
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return { ...auth, role };
}

export function isAuthResponse(
  value: CreditsAuthContext | BillingAdminAuthContext | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
