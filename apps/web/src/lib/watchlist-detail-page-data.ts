import "server-only";

import { notFound } from "next/navigation";
import {
  getActiveAccountForUser,
  listMembers,
  listTeamMembersByAccount,
  listTeamsWithCounts,
} from "@/lib/accounts";
import { getSession } from "@/lib/auth/session";
import {
  getCohortBenchmarks,
  listCohorts,
  resolveCohort,
} from "@/lib/benchmarks";
import { listLatestQuantitativeObservationsForCompanies } from "@/lib/observations";
import { listPlaybooks } from "@/lib/playbooks";
import { listGlobalSignals } from "@/lib/signals";
import {
  getWatchlist,
  getWatchlistCompanies,
  listWatchlistShareEmails,
  listWatchlistTeamIds,
  userCanViewWatchlist,
} from "@/lib/watchlists";
import type { ComponentProps } from "react";
import type { WatchlistDetail } from "@/components/views/WatchlistDetail";

export type WatchlistDetailPageProps = Omit<
  ComponentProps<typeof WatchlistDetail>,
  "routeContext"
>;

export async function loadWatchlistDetailPageData(
  id: string,
  cohortParam?: string,
): Promise<WatchlistDetailPageProps> {
  const session = await getSession();
  const email = session?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);

  const [watchlist, companies] = await Promise.all([
    getWatchlist(id),
    getWatchlistCompanies(id),
  ]);
  if (!watchlist) notFound();
  if (!account) notFound();

  const canView = await userCanViewWatchlist({
    watchlist,
    userEmail: email,
    accountId: account.id,
  });
  if (!canView) notFound();

  const [cohorts, linkedTeamIds, shareEmails, accountTeams, membersByTeam, accountMembers] =
    await Promise.all([
      listCohorts(),
      listWatchlistTeamIds(id),
      listWatchlistShareEmails(id),
      listTeamsWithCounts(account.id),
      listTeamMembersByAccount(account.id),
      listMembers(account.id),
    ]);
  const uuids = companies.map((c) => c.companyUuid);
  const catalog = await listGlobalSignals();
  const quantitativeCatalog = catalog.filter((s) => s.kind === "quantitative");
  const quantSignalIds = quantitativeCatalog.map((s) => s.id);
  const observationsBySignal =
    uuids.length > 0
      ? await listLatestQuantitativeObservationsForCompanies({
          accountId: account.id,
          companyUuids: uuids,
          signalIds: quantSignalIds,
        })
      : new Map();
  const allPlaybooks = await listPlaybooks({ accountId: account.id });
  const portfolioPlaybooks = allPlaybooks
    .filter((p) => p.targetKind === "pipeline" || p.targetKind == null)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      category: p.category,
      subcategory: p.subcategory,
      targetKind: p.targetKind as "company" | "deal" | "pipeline" | null,
      content: p.content,
    }));

  const defaultCohort =
    (await resolveCohort({ businessModel: "b2b_saas", stage: "seed", geo: "us" })) ??
    cohorts[0]?.cohortKey ??
    null;
  const chosen =
    cohortParam && cohorts.some((c) => c.cohortKey === cohortParam)
      ? cohortParam
      : defaultCohort;
  const benchmarkRows = chosen ? await getCohortBenchmarks({ cohortKey: chosen }) : [];

  const signalSeries: Array<{
    signalId: string;
    points: Array<{ companyUuid: string; name: string | null; value: number; period: string }>;
  }> = [];
  for (const signalId of quantSignalIds) {
    const perCompany = observationsBySignal.get(signalId);
    const points: Array<{
      companyUuid: string;
      name: string | null;
      value: number;
      period: string;
    }> = [];
    if (perCompany) {
      for (const c of companies) {
        const o = perCompany.get(c.companyUuid);
        if (o) {
          points.push({
            companyUuid: c.companyUuid,
            name: c.name,
            value: o.valueNumeric,
            period: o.period,
          });
        }
      }
    }
    signalSeries.push({ signalId, points });
  }

  return {
    watchlist,
    companies,
    userEmail: email,
    canEdit: watchlist.ownerEmail === email,
    linkedTeamIds,
    shareEmails,
    availableTeams: accountTeams.map((team) => ({
      id: team.id,
      name: team.name,
      memberCount: team.memberCount,
      members: membersByTeam.get(team.id) ?? [],
    })),
    accountMembers: accountMembers.map((m) => ({ email: m.userEmail, role: m.role })),
    signalSeries,
    signalCatalog: quantitativeCatalog.map((s) => ({
      id: s.id,
      label: s.label,
      category: s.category,
      unit: s.unit,
      invertedGood: s.invertedGood,
    })),
    benchmarks: {
      cohortKey: chosen,
      rows: benchmarkRows.map((b) => ({
        metric: b.metric,
        p25: b.p25,
        p50: b.p50,
        p75: b.p75,
        p90: b.p90,
        unit: b.unit,
        invertedGood: b.invertedGood,
      })),
      allCohorts: cohorts.map((c) => ({
        cohortKey: c.cohortKey,
        dimensions: c.dimensions,
        sampleSize: c.sampleSize,
      })),
    },
    availablePlaybooks: portfolioPlaybooks,
  };
}
