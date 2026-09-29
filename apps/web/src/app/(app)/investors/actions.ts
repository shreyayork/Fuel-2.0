"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { bookmarkInvestor, unbookmarkInvestor } from "@/lib/investors";

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

async function requireAccount(email: string): Promise<string> {
  const account = await getActiveAccountForUser(email);
  if (!account) redirect("/sign-in");
  return account.id;
}

export async function bookmarkInvestorAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const investorId = String(formData.get("investorId") ?? "").trim();
  const investorName = String(formData.get("investorName") ?? "").trim();
  if (!investorId || !investorName) return;
  await bookmarkInvestor({ accountId, investorId, investorName, addedByEmail: email });
  revalidatePath("/investors");
  revalidatePath(`/investors/${investorId}`);
}

export async function unbookmarkInvestorAction(formData: FormData) {
  const email = await requireEmail();
  const accountId = await requireAccount(email);
  const investorId = String(formData.get("investorId") ?? "").trim();
  if (!investorId) return;
  await unbookmarkInvestor({ accountId, investorId });
  revalidatePath("/investors");
  revalidatePath(`/investors/${investorId}`);
}
