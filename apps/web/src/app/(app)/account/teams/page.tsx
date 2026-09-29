import { AccountLayout } from "@/components/views/AccountLayout";
import { AccountTeams } from "@/components/views/AccountTeams";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import {
  getActiveAccountForUser,
  getMembership,
  listMembers,
  listTeamMembersByAccount,
  listTeamsWithCounts,
} from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function AccountTeamsPage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";

  const account = await getActiveAccountForUser(email);

  if (!account) {
    return <div style={{ padding: 40 }}>No account yet.</div>;
  }

  const [teams, membership, members, membersByTeam] = await Promise.all([
    listTeamsWithCounts(account.id),
    getMembership({ accountId: account.id, userEmail: email }),
    listMembers(account.id),
    listTeamMembersByAccount(account.id),
  ]);
  const role = membership?.role ?? "member";
  const canManage = role === "owner" || role === "admin";

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      <AccountTeams
        accountId={account.id}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          description: team.description,
          memberCount: team.memberCount,
          members: membersByTeam.get(team.id) ?? [],
        }))}
        accountMembers={members.map((m) => ({ email: m.userEmail, role: m.role }))}
        canManage={canManage}
        currentUserEmail={email}
      />
    </AccountLayout>
  );
}
