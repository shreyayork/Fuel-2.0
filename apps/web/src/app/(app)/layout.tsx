import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { MarkerIo } from "@/components/MarkerIo";
import { SentryUserContext } from "@/components/SentryUserContext";
import { getDb } from "@/db/client";
import type { FuelDataset } from "@/db/queries";
import { getSession } from "@/lib/auth/session";
import { resolveAuthenticatedHomePath } from "@/lib/auth/home-path";
import { getCurrentUser } from "@/lib/current-user";
import { listAccountsForUser, getActiveAccountForUser } from "@/lib/accounts";
import { countAdvisors } from "@/lib/advisors";
import { listRecentCompanies } from "@/lib/recent-companies-server";
import { countServiceProviders } from "@/lib/service-providers";
import { sessionGroups } from "@/lib/auth/superadmin";
import {
  catalogFlowForAccount,
  getActionCosts,
  getCreditSnapshot,
  getProPlanDto,
  getTopUpPacks,
} from "@/lib/credits/queries";
import { getSubscribedBilling } from "@/lib/credits/stripe";

export const dynamic = "force-dynamic";

// Empty dataset shape — the layout no longer reads the fixture (it's empty
// post-migration anyway, and the Shell uses values only for fallback avatars
// + nav badges that are computed elsewhere now). Saves 6 DB round-trips on
// every navigation.
const EMPTY_DATA: FuelDataset = {
  companies: [],
  people: [],
  initiatives: [],
  signalsByCompany: {},
  benchmarks: [],
};

/**
 * Sidebar counts for investor + founder nav badges.
 * Advisors: instance-level ∪ account-owned. Investors: bookmarks.
 * Providers: visibility helper. Pipeline: deals on the account.
 */
async function getSidebarCounts(accountId: string) {
  const db = await getDb();
  const [advisors, investorRows, providers, pipelineRows] = await Promise.all([
    countAdvisors(accountId),
    db.execute(sql`
      SELECT count(*)::int AS investors
      FROM investor_bookmarks
      WHERE account_id = ${accountId}
    `),
    countServiceProviders(accountId),
    db.execute(sql`
      SELECT count(*)::int AS pipeline
      FROM pipeline_companies
      WHERE account_id = ${accountId}
    `),
  ]);
  const investorRow = investorRows.rows[0] as { investors?: number } | undefined;
  const pipelineRow = pipelineRows.rows[0] as { pipeline?: number } | undefined;
  return {
    advisors,
    investors: investorRow?.investors ?? 0,
    serviceProviders: providers,
    pipeline: pipelineRow?.pipeline ?? 0,
  };
}

/**
 * Shared layout for every authenticated route. Because this is above the
 * individual page.tsx files, React keeps the AppShell (sidebar, header,
 * theme, agent drawer) mounted across route changes — no more flash or
 * sidebar re-render when navigating between companies / pipeline / account.
 *
 * Per-page `eyebrow` + `activeNavKey` are rendered by each page inside its
 * own content, or inferred by AppShell from the pathname via ActiveNavKey.
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const requireAuth = process.env.COGNITO_USER_POOL_ID != null;
  let email = "mike@york.ie";
  const session = requireAuth ? await getSession() : null;
  if (requireAuth) {
    if (!session) redirect("/sign-in");
    email = session.email;
  }
  // listAccountsForUser + getActiveAccountForUser are React-cached per request,
  // so parallel fetches here dedupe with the page's own account lookups.
  const [currentUser, accountList, account] = await Promise.all([
    getCurrentUser(),
    listAccountsForUser(email),
    getActiveAccountForUser(email),
  ]);
  // A signed-in user with zero account memberships came through the founder
  // signup flow and hasn't claimed a company yet. Send them to /onboard so
  // they can pick up where they left off — `/onboard` is intentionally
  // outside this group so the redirect doesn't loop.
  if (requireAuth && !account) {
    redirect("/onboard");
  }
  const emptyCounts = {
    advisors: 0,
    investors: 0,
    serviceProviders: 0,
    pipeline: 0,
  };
  // Resolve counts before paint so investor nav badges (Pipeline / Network)
  // aren't stuck at 0 while the streamed promise settles — needed for mobile QA.
  const [sidebarCounts, initialRecentCompanies, initialCredits] = account
    ? await Promise.all([
        getSidebarCounts(account.id),
        listRecentCompanies({
          userEmail: email,
          accountId: account.id,
          primaryCompanyUuid: account.primaryCompanyUuid,
        }),
        catalogFlowForAccount(account.id).then((flow) =>
          Promise.all([
          getCreditSnapshot(account.id),
          getActionCosts(flow),
          getTopUpPacks(flow),
          getProPlanDto(flow),
          getSubscribedBilling(account.id),
        ]),
        ).then(([snapshot, actionCosts, topUpPacks, proPlan, subscribedBilling]) => ({
          snapshot,
          actionCosts,
          topUpPacks,
          proPlan,
          subscribedBilling,
        })),
      ])
    : [emptyCounts, [], null];
  return (
    <AppShell
      data={EMPTY_DATA}
      currentUser={currentUser}
      counts={sidebarCounts}
      initialCredits={initialCredits}
      initialRecentCompanies={initialRecentCompanies}
      groups={sessionGroups(session)}
      accountList={accountList.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        memberCount: a.memberCount,
      }))}
      activeAccountId={account?.id ?? null}
      activeAccountName={account?.name ?? null}
      homePath={resolveAuthenticatedHomePath(account)}
      portfolioManagerEnabled={account?.portfolioManagerEnabled ?? false}
    >
      {session ? <SentryUserContext userId={session.sub} email={session.email} /> : null}
      <MarkerIo
        projectId={process.env.MARKER_IO_PROJECT_ID ?? ""}
        email={currentUser?.email ?? session?.email}
        fullName={currentUser?.name}
      />
      {children}
    </AppShell>
  );
}
