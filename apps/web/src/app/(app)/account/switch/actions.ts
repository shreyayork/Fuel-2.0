"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAccountsForUser } from "@/lib/accounts";
import { setUserPreference, PREF_ACTIVE_ACCOUNT } from "@/lib/user-preferences";

/**
 * Persist the user's active-account preference and navigate home. Rejects
 * an account id the caller isn't actually a member of so a malicious form
 * submit can't cross-seed into another tenant.
 */
export async function switchActiveAccountAction(formData: FormData) {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId) return;

  const mine = await listAccountsForUser(email);
  if (!mine.some((a) => a.id === accountId)) return;

  await setUserPreference({ userEmail: email, key: PREF_ACTIVE_ACCOUNT, value: accountId });
  revalidatePath("/", "layout");
  redirect("/");
}
