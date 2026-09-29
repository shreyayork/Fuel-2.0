import { AccountLayout } from "@/components/views/AccountLayout";
import { AccountUsageTab } from "@/components/views/AccountUsageTab";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership, listMembers } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function AccountUsagePage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";

  const account = await getActiveAccountForUser(email);

  if (!account) {
    return <div style={{ padding: 40 }}>No account yet.</div>;
  }

  const membership = await getMembership({ accountId: account.id, userEmail: email });
  const role = membership?.role ?? "member";
  const members = await listMembers(account.id);
  const memberEmails = members.map((m) => m.userEmail).sort((a, b) => a.localeCompare(b));

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <AccountUsageTab memberEmails={memberEmails} />
    </AccountLayout>
  );
}
