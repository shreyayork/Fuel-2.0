import { cookies } from "next/headers";
import { AccountLayout } from "@/components/views/AccountLayout";
import { DeveloperTab } from "@/components/views/DeveloperTab";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import { listMcpTokens } from "@/lib/mcp-tokens";

export const dynamic = "force-dynamic";

export default async function AccountDeveloperPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";

  const account = await getActiveAccountForUser(email);

  if (!account) {
    return <div style={{ padding: 40 }}>No account yet.</div>;
  }

  const membership = await getMembership({ accountId: account.id, userEmail: email });
  const role = membership?.role ?? "member";

  const tokens = await listMcpTokens({ accountId: account.id, userEmail: email });
  const jar = await cookies();
  const newToken = jar.get("fuel_new_mcp_token")?.value ?? null;

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <DeveloperTab tokens={tokens} newToken={newToken} userEmail={email} />
    </AccountLayout>
  );
}
