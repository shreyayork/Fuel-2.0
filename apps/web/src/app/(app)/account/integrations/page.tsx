import { headers } from "next/headers";
import { AccountLayout } from "@/components/views/AccountLayout";
import { IntegrationsTab, type ProviderSummary } from "@/components/views/IntegrationsTab";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import { listIntegrations } from "@/lib/integrations";
import { listProviders } from "@/lib/integrations/registry";
import { isConfigured } from "@/lib/integrations/oauth";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";

  const account = await getActiveAccountForUser(email);

  if (!account) {
    return <div style={{ padding: 40 }}>No account yet.</div>;
  }

  const membership = await getMembership({ accountId: account.id, userEmail: email });
  const role = membership?.role ?? "member";
  const canManage = role === "owner" || role === "admin";

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const origin = `${proto}://${host}`;

  const [connections, sp] = await Promise.all([
    listIntegrations({ accountId: account.id }),
    searchParams,
  ]);

  const providerDefs = listProviders();
  const providers: ProviderSummary[] = await Promise.all(
    providerDefs.map(async (p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      available: p.available,
      configured: p.auth.kind === "oauth2" ? await isConfigured(p, origin) : false,
      configurePath: p.configurePath,
    })),
  );

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <IntegrationsTab
        providers={providers}
        connections={connections}
        canManage={canManage}
        flash={{ error: sp.error, connected: sp.connected }}
      />
    </AccountLayout>
  );
}
