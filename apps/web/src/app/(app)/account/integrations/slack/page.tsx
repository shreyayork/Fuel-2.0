import { AccountLayout } from "@/components/views/AccountLayout";
import { SlackConfigView } from "@/components/views/SlackConfigView";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import { getIntegration } from "@/lib/integrations";
import { SlackClient, listConversations } from "@/lib/integrations/slack-client";
import { getDb } from "@/db/client";
import { integrationChannelSubscriptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function SlackConfigPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) {
    return <div style={{ padding: 40 }}>No account yet.</div>;
  }

  const membership = await getMembership({ accountId: account.id, userEmail: email });
  const role = membership?.role ?? "member";

  const conn = await getIntegration({ accountId: account.id, provider: "slack" });

  let conversations: Awaited<ReturnType<typeof listConversations>> = [];
  let fetchError: string | null = null;
  if (conn) {
    try {
      const client = await SlackClient.forAccount(account.id);
      if (client) conversations = await listConversations(client);
    } catch (e) {
      fetchError = (e as Error).message?.slice(0, 200) ?? "unknown";
    }
  }

  const subs = conn
    ? await (await getDb())
        .select()
        .from(integrationChannelSubscriptions)
        .where(
          and(
            eq(integrationChannelSubscriptions.accountId, account.id),
            eq(integrationChannelSubscriptions.connectionId, conn.id),
          ),
        )
    : [];
  const subByChannelId = new Map(subs.map((s) => [s.providerChannelId, s]));

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <SlackConfigView
        connection={
          conn
            ? {
                id: conn.id,
                installedByEmail: conn.installedByEmail,
                installedAt: conn.installedAt.toISOString(),
                status: conn.status,
                team: (conn.metadata as { teamName?: string } | null)?.teamName ?? null,
              }
            : null
        }
        channels={conversations.map((c) => ({
          id: c.id,
          name: c.name,
          isPrivate: c.is_private,
          isMember: c.is_member,
          numMembers: c.num_members,
          enabled: subByChannelId.get(c.id)?.enabled ?? false,
          lastEventAt:
            subByChannelId.get(c.id)?.lastEventAt?.toISOString() ?? null,
        }))}
        fetchError={fetchError}
        canManage={role === "owner" || role === "admin"}
      />
    </AccountLayout>
  );
}
