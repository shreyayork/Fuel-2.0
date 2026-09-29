import { and, desc, eq } from "drizzle-orm";
import { AccountLayout } from "@/components/views/AccountLayout";
import { GranolaConfigView } from "@/components/views/GranolaConfigView";
import { getDb } from "@/db/client";
import { contextItems, integrationConnections } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function GranolaConfigPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) return <div style={{ padding: 40 }}>No account yet.</div>;

  const membership = await getMembership({ accountId: account.id, userEmail: email });
  const role = membership?.role ?? "member";

  // Granola is per-user — a teammate's connection isn't yours. Always scope
  // to the signed-in user's email so we don't show / sync someone else's
  // tokens (and so a re-install doesn't clobber theirs).
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

  // Pull the 10 most recent Granola-sourced context items so the user can see
  // what's actually flowing through.
  const recent = conn
    ? await db
        .select({
          id: contextItems.id,
          companyUuid: contextItems.companyUuid,
          title: contextItems.title,
          source: contextItems.source,
          occurredAt: contextItems.occurredAt,
        })
        .from(contextItems)
        .where(
          and(
            eq(contextItems.accountId, account.id),
            eq(contextItems.kind, "meeting_transcript"),
          ),
        )
        .orderBy(desc(contextItems.occurredAt))
        .limit(10)
    : [];

  const granolaItems = recent.filter((r) => r.source.startsWith("granola:"));

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <GranolaConfigView
        connected={!!conn}
        status={conn?.status ?? null}
        lastErrorReason={
          (conn?.metadata as { lastErrorReason?: string } | null)?.lastErrorReason ?? null
        }
        installedByEmail={conn?.installedByEmail ?? null}
        installedAt={conn?.installedAt ? conn.installedAt.toISOString() : null}
        lastSyncAt={conn?.lastSyncAt ? conn.lastSyncAt.toISOString() : null}
        recentItems={granolaItems.map((r) => ({
          id: r.id,
          companyUuid: r.companyUuid,
          title: r.title,
          occurredAt: r.occurredAt.toISOString(),
        }))}
      />
    </AccountLayout>
  );
}
