"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db/client";
import { integrationConnections } from "@/db/schema";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getSession } from "@/lib/auth/session";
import { listGranolaTools } from "@/lib/integrations/granola-client";
import { syncGranolaConnection } from "@/lib/integrations/granola-sync";
import {
  isGranolaSessionExpired,
  markGranolaConnectionError,
} from "@/lib/integrations/granola-session";

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

export async function backfillGranolaAction() {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) throw new Error("no account");
  const db = await getDb();
  const [conn] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.accountId, account.id),
        eq(integrationConnections.provider, "granola"),
        eq(integrationConnections.installedByEmail, email),
      ),
    )
    .limit(1);
  if (!conn) throw new Error("no granola connection");

  // `since: null` = backfill every meeting the MCP returns (up to the free-plan
  // 30-day cap or paid-plan history ceiling).
  try {
    await syncGranolaConnection({ connection: conn, since: null });
  } catch (e) {
    if (isGranolaSessionExpired(e)) {
      await markGranolaConnectionError(conn.id, "session_expired");
      throw new Error("Granola session expired — reconnect to continue.");
    }
    throw e;
  }
  revalidatePath("/account/integrations/granola");
}

export async function inspectGranolaToolsAction(): Promise<string> {
  const email = await requireEmail();
  const account = await getActiveAccountForUser(email);
  if (!account) throw new Error("no account");
  const db = await getDb();
  const [conn] = await db
    .select()
    .from(integrationConnections)
    .where(
      and(
        eq(integrationConnections.accountId, account.id),
        eq(integrationConnections.provider, "granola"),
        eq(integrationConnections.installedByEmail, email),
      ),
    )
    .limit(1);
  if (!conn) throw new Error("no granola connection");
  const creds = conn.credentials as { accessToken?: string } | null;
  if (!creds?.accessToken) throw new Error("no access token");
  try {
    const tools = await listGranolaTools(creds.accessToken);
    return JSON.stringify(tools, null, 2);
  } catch (e) {
    if (isGranolaSessionExpired(e)) {
      await markGranolaConnectionError(conn.id, "session_expired");
      throw new Error("Granola session expired — reconnect to continue.");
    }
    throw e;
  }
}
