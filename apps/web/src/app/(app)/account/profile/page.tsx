import { AccountLayout } from "@/components/views/AccountLayout";
import { ProfileView } from "@/components/views/ProfileView";
import { getSession } from "@/lib/auth/session";
import { canChangePassword } from "@/lib/auth/federated-auth";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { getActiveAccountForUser, getMembership } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/current-user";
import { getUserUsage } from "@/lib/usage";
import { listWatchlists } from "@/lib/watchlists";

export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const passwordChangeAllowed = canChangePassword(session);

  const account = await getActiveAccountForUser(email);
  const [currentUser, lists, membership] = await Promise.all([
    getCurrentUser(),
    account
      ? listWatchlists({ userEmail: email, accountId: account.id, scope: "mine" })
      : Promise.resolve([]),
    account
      ? getMembership({ accountId: account.id, userEmail: email })
      : Promise.resolve(null),
  ]);

  const portfolios = lists.filter((l) => l.kind === "portfolio");
  const watchlists = lists.filter((l) => l.kind === "watchlist");

  const usage = account
    ? await getUserUsage({ accountId: account.id, userEmail: email })
    : null;

  const profile = (
    <ProfileView
      embedded
      user={currentUser ?? { email, initials: "??" }}
      role={membership?.role ?? account?.role ?? "member"}
      organizationName={account?.name ?? null}
      portfolioManagerEnabled={account?.portfolioManagerEnabled ?? false}
      portfolios={portfolios.map((p) => ({
        id: p.id,
        name: p.name,
        companyCount: p.companyCount,
        fundName: p.fundName,
      }))}
      watchlists={watchlists.map((w) => ({
        id: w.id,
        name: w.name,
        companyCount: w.companyCount,
      }))}
      usage={usage}
      canChangePassword={passwordChangeAllowed}
    />
  );

  if (!account) {
    return profile;
  }

  const role = membership?.role ?? "member";

  return (
    <AccountLayout account={account} role={role} isSuperAdmin={isSuperAdmin(session)}>
      {profile}
    </AccountLayout>
  );
}
