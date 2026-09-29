"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { sessionGroups } from "@/lib/auth/superadmin";
import { createMcpToken, revokeMcpToken } from "@/lib/mcp-tokens";

const NEW_TOKEN_COOKIE = "fuel_new_mcp_token";

async function requireEmail(): Promise<string> {
  if (!process.env.COGNITO_USER_POOL_ID) return "mike@york.ie";
  const session = await getSession();
  if (!session?.email) redirect("/sign-in");
  return session.email;
}

export async function createMcpTokenAction(formData: FormData) {
  const email = await requireEmail();
  const session = await getSession();
  const groups = sessionGroups(session);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const account = await getActiveAccountForUser(email);
  if (!account) return;
  const rawExpiry = String(formData.get("expiresInDays") ?? "").trim();
  const parsed = rawExpiry ? Number(rawExpiry) : NaN;
  const expiresInDays = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  const created = await createMcpToken({
    accountId: account.id,
    userEmail: email,
    name,
    expiresInDays,
    groups,
  });
  // Stash the raw token in a short-lived cookie so the page can render it
  // exactly once after the redirect. This avoids ever storing it in the URL.
  const jar = await cookies();
  jar.set(NEW_TOKEN_COOKIE, created.rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/account/developer",
    maxAge: 120,
  });
  revalidatePath("/account/developer");
}

export async function revokeMcpTokenAction(formData: FormData) {
  const email = await requireEmail();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await revokeMcpToken({ id, userEmail: email });
  revalidatePath("/account/developer");
}

export async function dismissNewTokenAction() {
  const jar = await cookies();
  jar.delete(NEW_TOKEN_COOKIE);
  revalidatePath("/account/developer");
}
