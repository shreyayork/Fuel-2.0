import { AccountLayout } from "@/components/views/AccountLayout";
import { BillingPlaceholder } from "@/components/views/BillingPlaceholder";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import { isBillingAdminRole } from "@/lib/credits/auth-roles";

export const dynamic = "force-dynamic";

export default async function AccountBillingPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";

  const account = await getActiveAccountForUser(email);

  if (!account) {
    return <div style={{ padding: 40 }}>No account yet.</div>;
  }

  const membership = await getMembership({ accountId: account.id, userEmail: email });
  const role = membership?.role ?? "member";
  const canViewInvoices = isBillingAdminRole(role);

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <BillingPlaceholder account={account} canViewInvoices={canViewInvoices} />
    </AccountLayout>
  );
}
