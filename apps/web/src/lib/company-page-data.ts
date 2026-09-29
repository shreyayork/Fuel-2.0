import "server-only";
import type { InitiativeMilestone, PortfolioUpdate } from "@/db/schema";
import type { CatalogCompany } from "@/db/schema";
import type { AccountForUser } from "@/lib/accounts";
import { listCompanyAdvisors, listAdvisors } from "@/lib/advisors";
import { countArtifactsForCompany, listArtifactsForCompany } from "@/lib/artifacts";
import {
  getCachedCohortBenchmarks,
  getCachedCohorts,
  getCachedGlobalSignals,
} from "@/lib/cache/reference-data";
import {
  countCompanyInitiatives,
  getCompanyInitiativeWithAdvisors,
  listCompanyInitiativesPage,
  listCreatedBriefSuggestionKeys,
  listInitiativeMilestonesForIds,
  listInitiativeProgressForIds,
  listSuggestedCompanyInitiatives,
  type CompanyInitiativeWithAdvisors,
  type InitiativeProgressRow,
} from "@/lib/company-initiatives";
import {
  initiativeIdsForMilestoneDetails,
  initiativeIdsForProgressDetails,
} from "@/lib/company-initiatives-paging";
import { listContextForCompany } from "@/lib/context";
import type { CompanyDoc } from "@/lib/fuel-data";
import {
  listObservationsForContextItems,
} from "@/lib/observations";
import { getPlaybookBySlug, listPlaybooks } from "@/lib/playbooks";
import {
  currentPeriod,
  getForPeriod,
  listForCompany,
} from "@/lib/portfolio-updates";
import { inferCohortFilterFromCompany, resolveCohort } from "@/lib/benchmarks";
import { listIntelligenceLinkOptionsForCompany } from "@/lib/intelligence/link-options";
import { getCreditBalance } from "@/lib/intelligence/credits";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import {
  countIntelligenceSources,
  listDataRoomSnapshot,
} from "@/lib/data-room/queries";
import type { DataRoomSnapshot } from "@/lib/data-room/types";
import { listWatchlistMembershipsForCompany } from "@/lib/watchlists";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/list-pagination";

import { normalizeCompanyTabParam, COMPANY_TAB_KEYS, type CompanyTabKey } from "@/lib/company-tabs";

export const COMPANY_PAGE_TABS = COMPANY_TAB_KEYS;
export type CompanyPageTab = CompanyTabKey;

type ObservationsByItem = Awaited<ReturnType<typeof listObservationsForContextItems>> extends Map<
  string,
  infer V
>
  ? V
  : never;

export interface CompanyPageData {
  uuid: string;
  email: string;
  account: AccountForUser | null;
  company: CompanyDoc;
  catalogRow: CatalogCompany | null;
  tab: CompanyPageTab;
  period: string;
  isFounderHome: boolean;
  onCompanyPublicTab: boolean;
  cta: "benchmark" | "pitch-deck" | "explore" | null;
  firstSession: boolean;
  founderPlaybook: {
    slug: string;
    title: string;
    content: string;
  } | null;
  resolvedCohort: string | null;
  privateItems: Awaited<ReturnType<typeof listContextForCompany>>;
  artifactCount: number;
  initiativeCount: number;
  artifacts: Awaited<ReturnType<typeof listArtifactsForCompany>>;
  updateHistory: Awaited<ReturnType<typeof listForCompany>>;
  currentUpdate: Awaited<ReturnType<typeof getForPeriod>>;
  cohorts: Awaited<ReturnType<typeof getCachedCohorts>>;
  watchlistMemberships: Awaited<ReturnType<typeof listWatchlistMembershipsForCompany>>;
  companyAdvisors: Awaited<ReturnType<typeof listCompanyAdvisors>>;
  allAdvisors: Awaited<ReturnType<typeof listAdvisors>>;
  companyObservations: Array<{
    id: string;
    signalId: string;
    signalLabel: string;
    signalCategory: string;
    signalKind: "quantitative" | "qualitative" | "boolean";
    signalUnit: string | null;
    period: string;
    valueNumeric: number | null;
    valueText: string | null;
    valueBool: boolean | null;
    confidence: number | null;
    rawSnippet: string | null;
    contextItemId: string | null;
    createdAt: Date;
    signal: {
      id: string;
      label: string;
      kind: "quantitative" | "qualitative" | "boolean";
      unit: string | null;
      category: string;
      invertedGood: boolean;
    };
  }>;
  companyInitiatives: CompanyInitiativeWithAdvisors[];
  /** Research: artifactId → created suggestion persist keys. */
  createdBriefSuggestionKeysByArtifact: Record<string, string[]>;
  initiativeProgressById: Map<string, InitiativeProgressRow[]>;
  initiativeMilestonesById: Map<string, InitiativeMilestone[]>;
  availablePlaybooks: Awaited<ReturnType<typeof listPlaybooks>>;
  signalCatalog: Awaited<ReturnType<typeof getCachedGlobalSignals>>;
  observationsByItem: Map<string, ObservationsByItem>;
  benchmarkRows: Awaited<ReturnType<typeof getCachedCohortBenchmarks>>;
  dataRoom: DataRoomSnapshot;
  companyIntelligence: CompanyIntelligenceRow[];
  creditBalance: number;
}

export function resolveCompanyPageTab(tabParam: string | undefined): CompanyPageTab {
  return normalizeCompanyTabParam(tabParam);
}

export async function loadCompanyPageData(opts: {
  uuid: string;
  email: string;
  account: AccountForUser | null;
  company: CompanyDoc;
  catalogRow: CatalogCompany | null;
  tab: CompanyPageTab;
  cohortParam?: string | null;
  ctaParam?: string | null;
  firstParam?: string | null;
  focusInitiativeId?: string | null;
  isFounderHome: boolean;
  onCompanyPublicTab: boolean;
}): Promise<CompanyPageData> {
  const {
    uuid,
    email,
    account,
    company,
    catalogRow,
    tab,
    cohortParam,
    ctaParam,
    firstParam,
    focusInitiativeId,
    isFounderHome,
    onCompanyPublicTab,
  } = opts;

  const period = currentPeriod();
  const accountId = account?.id;

  const needsOverview = tab === "overview" || isFounderHome;
  // Intelligence feed pages via /intelligence/feed — do not hydrate full
  // observation/intelligence lists into the company page payload.
  const needsIntelligence = tab === "intelligence";
  const needsSignalCatalog = needsIntelligence || tab === "initiatives";
  // Initiatives detail linker still needs a capped intelligence catalog.
  const needsCompanyIntelligence = tab === "initiatives";
  // Context Feed tab removed — sources live under Intelligence.
  const needsContext = false;
  const needsInitiatives = tab === "initiatives" || isFounderHome;
  const needsInitiativeDetails =
    tab === "initiatives" || (isFounderHome && tab === "overview");
  const needsResearch = tab === "research";
  // Data Room snapshot still powers Add Source on Intelligence; Sources
  // drawer itself pages via /intelligence/sources.
  const needsDataroom = tab === "dataroom" || tab === "intelligence";
  const needsArtifacts = needsResearch || needsDataroom || isFounderHome || tab === "profile";
  // Header AI Actions menu needs the catalog on every company tab.
  const needsPlaybooks = true;
  const needsMetrics = needsOverview || needsIntelligence || tab === "profile";

  const emptyProgress = new Map<string, InitiativeProgressRow[]>();
  const emptyMilestones = new Map<string, InitiativeMilestone[]>();
  const emptyObsByItem = new Map<string, ObservationsByItem>();

  if (!accountId) {
    return {
      uuid,
      email,
      account,
      company,
      catalogRow,
      tab,
      period,
      isFounderHome,
      onCompanyPublicTab,
      cta: null,
      firstSession: false,
      founderPlaybook: null,
      resolvedCohort: null,
      privateItems: [],
      artifactCount: 0,
      initiativeCount: 0,
      artifacts: [],
      updateHistory: [],
      currentUpdate: null,
      cohorts: [],
      watchlistMemberships: [],
      companyAdvisors: [],
      allAdvisors: [],
      companyObservations: [],
      companyInitiatives: [],
      createdBriefSuggestionKeysByArtifact: {},
      initiativeProgressById: emptyProgress,
      initiativeMilestonesById: emptyMilestones,
      availablePlaybooks: [],
      signalCatalog: [],
      observationsByItem: emptyObsByItem,
      benchmarkRows: [],
      dataRoom: { slots: [], activeCount: 0, sourcesTotal: 0, feedAttachments: [] },
      companyIntelligence: [],
      creditBalance: 0,
    };
  }

  const [
    watchlistMemberships,
    companyAdvisors,
    allAdvisors,
    cohorts,
    privateItems,
    artifacts,
    updateHistory,
    currentUpdate,
    companyObservations,
    companyInitiatives,
    availablePlaybooks,
    signalCatalog,
    ,
    ,
    dataRoom,
    companyIntelligence,
    creditBalance,
    artifactCount,
    initiativeCount,
  ] = await Promise.all([
    listWatchlistMembershipsForCompany({
      userEmail: email,
      accountId,
      companyUuid: uuid,
      // Align with Shell nav: no portfolio lists when PM flag is off.
      kind: account?.portfolioManagerEnabled ? undefined : "watchlist",
    }),
    listCompanyAdvisors({ accountId, companyUuid: uuid }),
    listAdvisors({ accountId, status: "active" }),
    needsMetrics || needsOverview ? getCachedCohorts() : Promise.resolve([]),
    needsContext
      ? listContextForCompany({ accountId, companyUuid: uuid, limit: 100 })
      : Promise.resolve([]),
    needsArtifacts
      ? listArtifactsForCompany({ accountId, companyUuid: uuid, limit: 50 })
      : Promise.resolve([]),
    needsMetrics
      ? listForCompany({ accountId, companyUuid: uuid, limit: 8 })
      : Promise.resolve([]),
    needsMetrics
      ? getForPeriod({ accountId, companyUuid: uuid, period })
      : Promise.resolve(null),
    // Feed is server-paginated client-side; keep SSR payload slim.
    Promise.resolve([]),
    needsInitiatives
      ? (async () => {
          if (isFounderHome && tab !== "initiatives") {
            // Overview glance only needs a light active page for counts/context.
            const page = await listCompanyInitiativesPage({
              accountId,
              companyUuid: uuid,
              status: "active",
              limit: DEFAULT_LIST_PAGE_SIZE,
              offset: 0,
            });
            const items = [...page.items];
            const focusId = focusInitiativeId?.trim();
            if (focusId && !items.some((item) => item.id === focusId)) {
              const focused = await getCompanyInitiativeWithAdvisors({
                accountId,
                companyUuid: uuid,
                id: focusId,
              });
              if (focused) items.unshift(focused);
            }
            return items;
          }
          const [activePage, suggested] = await Promise.all([
            listCompanyInitiativesPage({
              accountId,
              companyUuid: uuid,
              status: "active",
              limit: DEFAULT_LIST_PAGE_SIZE,
              offset: 0,
            }),
            listSuggestedCompanyInitiatives({ accountId, companyUuid: uuid }),
          ]);
          const items = [...activePage.items, ...suggested];
          const focusId = focusInitiativeId?.trim();
          if (focusId && !items.some((item) => item.id === focusId)) {
            const focused = await getCompanyInitiativeWithAdvisors({
              accountId,
              companyUuid: uuid,
              id: focusId,
            });
            if (focused) items.unshift(focused);
          }
          return items;
        })()
      : Promise.resolve([]),
    needsPlaybooks ? listPlaybooks({ accountId }) : Promise.resolve([]),
    needsSignalCatalog ? getCachedGlobalSignals() : Promise.resolve([]),
    Promise.resolve(null),
    Promise.resolve(null),
    needsDataroom
      ? listDataRoomSnapshot({ accountId, companyUuid: uuid })
      : accountId
        ? countIntelligenceSources({ accountId, companyUuid: uuid }).then(
            (sourcesTotal) => ({
              slots: [],
              activeCount: 0,
              sourcesTotal,
              feedAttachments: [],
            }),
          )
        : Promise.resolve({
            slots: [],
            activeCount: 0,
            sourcesTotal: 0,
            feedAttachments: [],
          }),
    needsCompanyIntelligence
      ? listIntelligenceLinkOptionsForCompany({ accountId, companyUuid: uuid, limit: 500 })
      : Promise.resolve([]),
    accountId ? getCreditBalance(accountId) : Promise.resolve(0),
    countArtifactsForCompany({ accountId, companyUuid: uuid }),
    countCompanyInitiatives({ accountId, companyUuid: uuid }),
  ]);

  const [initiativeProgressById, initiativeMilestonesById] = needsInitiativeDetails
    ? await Promise.all([
        listInitiativeProgressForIds({
          accountId,
          companyUuid: uuid,
          initiativeIds: initiativeIdsForProgressDetails(companyInitiatives),
        }),
        listInitiativeMilestonesForIds({
          accountId,
          companyUuid: uuid,
          initiativeIds: initiativeIdsForMilestoneDetails(companyInitiatives),
        }),
      ])
    : [emptyProgress, emptyMilestones];

  const createdBriefSuggestionKeysByArtifact =
    needsResearch && artifacts.length > 0
      ? Object.fromEntries(
          await listCreatedBriefSuggestionKeys({
            accountId,
            companyUuid: uuid,
            artifactIds: artifacts.map((a) => a.id),
          }),
        )
      : {};

  const observationsByItem = needsContext
    ? await listObservationsForContextItems({
        accountId,
        contextItemIds: privateItems.map((i) => i.id),
      })
    : emptyObsByItem;

  const inferred = inferCohortFilterFromCompany({
    categories: company.categories,
    locationCountry: company.locationCountry,
  });
  const overrideCohort =
    cohortParam && cohorts.some((c) => c.cohortKey === cohortParam) ? cohortParam : null;
  const resolvedCohort =
    needsMetrics || needsOverview ? (overrideCohort ?? (await resolveCohort(inferred))) : null;
  const benchmarkRows =
    resolvedCohort && (needsMetrics || needsOverview)
      ? await getCachedCohortBenchmarks(resolvedCohort, period)
      : [];

  const cta: "benchmark" | "pitch-deck" | "explore" | null =
    ctaParam === "benchmark" || ctaParam === "pitch-deck" || ctaParam === "explore"
      ? ctaParam
      : null;
  const firstSession = firstParam === "1";
  const founderPlaybook =
    cta && account
      ? await getPlaybookBySlug({
          accountId: account.id,
          slug: cta === "pitch-deck" ? "pitch-deck-evaluation" : "kpi-benchmark",
        })
      : null;

  return {
    uuid,
    email,
    account,
    company,
    catalogRow,
    tab,
    period,
    isFounderHome,
    onCompanyPublicTab,
    cta,
    firstSession,
    founderPlaybook: founderPlaybook
      ? {
          slug: founderPlaybook.slug,
          title: founderPlaybook.title,
          content: founderPlaybook.content,
        }
      : null,
    resolvedCohort,
    privateItems,
    artifactCount,
    initiativeCount,
    artifacts,
    updateHistory,
    currentUpdate,
    cohorts,
    watchlistMemberships,
    companyAdvisors,
    allAdvisors,
    companyObservations,
    companyInitiatives,
    createdBriefSuggestionKeysByArtifact,
    initiativeProgressById,
    initiativeMilestonesById,
    availablePlaybooks,
    signalCatalog,
    observationsByItem,
    benchmarkRows,
    dataRoom,
    companyIntelligence,
    creditBalance,
  };
}

export function serializePortfolioUpdate(u: PortfolioUpdate) {
  return {
    id: u.id,
    period: u.period,
    status: u.status,
    submittedByEmail: u.submittedByEmail,
    submittedAt: u.submittedAt ? u.submittedAt.toISOString() : null,
    updatedAt: u.updatedAt.toISOString(),
    asOf: u.asOf,
    fteCount: u.fteCount,
    paidCustomerCount: u.paidCustomerCount,
    arrUsd: u.arrUsd,
    arrGrowthYoyPct: u.arrGrowthYoyPct,
    nrrPct: u.nrrPct,
    logoRetentionPct: u.logoRetentionPct,
    grossMarginPct: u.grossMarginPct,
    cacPaybackMonths: u.cacPaybackMonths,
    burnMultiple: u.burnMultiple,
    ruleOf40Pct: u.ruleOf40Pct,
    cashOnHandUsd: u.cashOnHandUsd,
    monthlyBurnUsd: u.monthlyBurnUsd,
    notableCustomers: u.notableCustomers,
    notableHires: u.notableHires,
    otherUpdates: u.otherUpdates,
    challenges: u.challenges,
    bankingPartner: u.bankingPartner,
    legalCounsel: u.legalCounsel,
    cloudProvider: u.cloudProvider,
    capTablePlatform: u.capTablePlatform,
    doInsuranceProvider: u.doInsuranceProvider,
    crmPlatform: u.crmPlatform,
    openToInvestorIntros: u.openToInvestorIntros,
  };
}
