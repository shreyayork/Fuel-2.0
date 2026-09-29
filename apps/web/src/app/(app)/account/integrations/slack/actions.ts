"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import { getIntegration } from "@/lib/integrations";
import { integrationChannelSubscriptions } from "@/db/schema";

async function ctx() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) throw new Error("no account");
  const m = await getMembership({ accountId: account.id, userEmail: email });
  if (!m || !(m.role === "owner" || m.role === "admin")) {
    throw new Error("insufficient role");
  }
  return { account, email };
}

export async function toggleSlackChannelAction(formData: FormData) {
  const { account } = await ctx();
  const providerChannelId = String(formData.get("channelId") ?? "").trim();
  const providerChannelName = String(formData.get("channelName") ?? "").trim();
  const isPrivate = formData.get("isPrivate") === "true";
  const nextEnabled = formData.get("next") === "on";
  if (!providerChannelId) return;

  const conn = await getIntegration({ accountId: account.id, provider: "slack" });
  if (!conn) return;

  const db = await getDb();
  const [existing] = await db
    .select()
    .from(integrationChannelSubscriptions)
    .where(
      and(
        eq(integrationChannelSubscriptions.connectionId, conn.id),
        eq(integrationChannelSubscriptions.providerChannelId, providerChannelId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(integrationChannelSubscriptions)
      .set({ enabled: nextEnabled, updatedAt: new Date() })
      .where(eq(integrationChannelSubscriptions.id, existing.id));
  } else {
    await db.insert(integrationChannelSubscriptions).values({
      id: `chsub_${randomUUID()}`,
      accountId: account.id,
      connectionId: conn.id,
      provider: "slack",
      providerChannelId,
      providerChannelName,
      isPrivate,
      enabled: nextEnabled,
    });
  }
  revalidatePath("/account/integrations/slack");
}
