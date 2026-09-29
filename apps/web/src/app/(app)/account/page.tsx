import { AccountLayout } from "@/components/views/AccountLayout";
import { PlatformStatsView } from "@/components/views/PlatformStatsView";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import { getPlatformStats } from "@/lib/platform-stats";

export const dynamic = "force-dynamic";

export default async function AccountOverviewPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";

  const account = await getActiveAccountForUser(email);
  if (!account) {
    return <div style={{ padding: 40 }}>No account yet.</div>;
  }

  const membership = await getMembership({ accountId: account.id, userEmail: email });
  const role = membership?.role ?? "member";

  const stats = await getPlatformStats();

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <PlatformStatsView stats={stats} />
    </AccountLayout>
  );
}
