"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import { disconnectIntegration } from "@/lib/integrations";
import type { IntegrationConnection } from "@/db/schema";

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

export async function disconnectIntegrationAction(formData: FormData) {
  const email = await requireEmail();
  const provider = String(formData.get("provider") ?? "") as IntegrationConnection["provider"];
  if (!provider) return;
  const account = await getActiveAccountForUser(email);
  if (!account) return;
  const m = await getMembership({ accountId: account.id, userEmail: email });
  if (!m || (m.role !== "owner" && m.role !== "admin")) {
    throw new Error("not authorized");
  }
  await disconnectIntegration({ accountId: account.id, provider });
  revalidatePath("/account/integrations");
}
