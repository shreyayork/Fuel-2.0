import { AccountLayout } from "@/components/views/AccountLayout";
import { AccountUsers } from "@/components/views/AccountUsers";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership, listMembers } from "@/lib/accounts";
import { listPendingInvites } from "@/lib/invites";

export const dynamic = "force-dynamic";

export default async function AccountUsersPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";

  const account = await getActiveAccountForUser(email);

  if (!account) {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <h2 style={{ margin: 0, marginBottom: 8, fontWeight: 600 }}>No account yet</h2>
        <p style={{ margin: 0, color: "#7A8A97", lineHeight: 1.55 }}>
          {"Your email isn't a member of any Fuel account yet. Ask an existing admin to send you an invite — you'll receive a magic link at this email address."}
        </p>
      </div>
    );
  }

  const [members, membership, pendingInvites] = await Promise.all([
    listMembers(account.id),
    getMembership({ accountId: account.id, userEmail: email }),
    listPendingInvites(account.id),
  ]);
  const role = membership?.role ?? "member";
  const canManage = role === "owner" || role === "admin";

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <AccountUsers
        accountId={account.id}
        members={members}
        pendingInvites={pendingInvites.map((p) => ({
          tokenHash: p.tokenHash,
          email: p.email,
          role: p.role,
          invitedByEmail: p.invitedByEmail,
          expiresAt: p.expiresAt.toISOString(),
          createdAt: p.createdAt.toISOString(),
        }))}
        canManage={canManage}
        currentEmail={email}
      />
    </AccountLayout>
  );
}
