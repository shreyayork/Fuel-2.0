import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ThemedWatchlistsView } from "@/components/views/ThemedWatchlistsView";
import { getSession } from "@/lib/auth/session";
import {
  getActiveAccountForUser,
  listTeamMembersByAccount,
  listTeamsWithCounts,
} from "@/lib/accounts";
import { listWatchlists } from "@/lib/watchlists";

export const dynamic = "force-dynamic";

const VALID_SCOPES = ["all", "mine", "shared", "starred"] as const;
type ScopeKey = (typeof VALID_SCOPES)[number];

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account?.portfolioManagerEnabled) notFound();

  const { scope: scopeParam } = await searchParams;
  const scope: ScopeKey = (VALID_SCOPES as readonly string[]).includes(scopeParam ?? "")
    ? (scopeParam as ScopeKey)
    : "all";

  const [items, teams, membersByTeam] = await Promise.all([
    listWatchlists({
      userEmail: email,
      accountId: account.id,
      scope: "all",
      kind: "portfolio",
    }),
    listTeamsWithCounts(account.id),
    listTeamMembersByAccount(account.id),
  ]);

  return (
    <Suspense fallback={null}>
      <ThemedWatchlistsView
        watchlists={items}
        userEmail={email}
        scope={scope}
        kind="portfolio"
        firmName={account.name}
        accountId={account.id}
        availableTeams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          memberCount: team.memberCount,
          members: membersByTeam.get(team.id) ?? [],
        }))}
      />
    </Suspense>
  );
}
