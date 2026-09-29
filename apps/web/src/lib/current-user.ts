import "server-only";
import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import type { SidebarUser } from "@/components/Shell";

function initialsFrom(email: string, fullName?: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    const joined = (first + last).toUpperCase();
    if (joined) return joined;
  }
  const [local] = email.split("@");
  if (!local) return "??";
  const chunks = local.split(/[._-]/).filter(Boolean);
  if (chunks.length >= 2) return (chunks[0][0] + chunks[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export const getCurrentUser = cache(_getCurrentUser);

async function _getCurrentUser(): Promise<SidebarUser | null> {
  if (!process.env.COGNITO_USER_POOL_ID) {
    return { email: "mike@york.ie", name: "Mike Veilleux", initials: "MV" };
  }
  const session = await getSession();
  if (!session?.email) return null;
  const given = session.raw["given_name"] as string | undefined;
  const family = session.raw["family_name"] as string | undefined;
  const name = session.raw["name"] as string | undefined;
  const fullName = name ?? ([given, family].filter(Boolean).join(" ").trim() || undefined);
  return {
    email: session.email,
    name: fullName,
    initials: initialsFrom(session.email, fullName),
  };
}
