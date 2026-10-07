"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAgentDrawer } from "@/components/AgentDrawer";
import { useWorkspaceTour } from "@/components/workspace-tour/WorkspaceTourContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/toast/ToastProvider";
import { runPlaybookAgainstSubject } from "@/components/views/PlaybookPickerButton";
import type { DetailDrawerStep } from "@/lib/overview/detail-question-catalog";
import type { OverviewApiResponse } from "@/lib/overview/types";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import type {
  CompanyAdvisorSummary,
  CompanyInitiativeSummary,
  CompanySignalObservation,
  SignalCatalogEntry,
} from "@/components/views/CompanyPublicView";
import {
  CATEGORY_IDS,
  OVERVIEW_GENERATION_STALE_MS,
  OVERVIEW_POLL_INTERVAL_MS,
  isOverviewCategoryId,
  isOverviewGenerationStale,
  overviewTrackSectionId,
  type OverviewCategoryId,
} from "@/lib/overview/constants";
import { applyClientSearchPatch } from "@/lib/use-url-synced-tab";
import {
  approveOverviewInitiative,
  fetchOverview,
  invalidateOverviewClientCache,
  OVERVIEW_DATA_CHANGED_EVENT,
  postOverviewGenerate,
  seedOverviewFormCaches,
  type OverviewMutationResult,
} from "@/lib/overview/client";
import { isOverviewLandingTourTarget } from "@/lib/workspace-tour/constants";
import { OverviewAdvisorPanel } from "./OverviewPanels";
import { OverviewFullSummaryPage } from "./OverviewFullSummaryPage";
import { CategoryGlanceRow } from "./CategoryGlanceRow";
import {
  CategoryDetailView,
  type CategoryDetailScrollTarget,
} from "./CategoryDetailView";
import { DetailAnswersDrawer } from "./DetailAnswersDrawer";
import { OverviewModulesPanel } from "./OverviewModulesPanel";
import { ProfileCompletionPrompt } from "./ProfileCompletionPrompt";
import { useCreditsOptional } from "@/components/credits/CreditProvider";
import {
  DETAIL_SECTIONS,
  getVisibleQuestions,
} from "@/lib/overview/detail-question-catalog";
import { BENCHMARK_DRAWER_FIELDS } from "@/lib/overview/benchmark-drawer-fields";
import { AddSourceDrawer } from "@/components/intelligence/AddSourceDrawer";
import { OverviewGeneratingState } from "./OverviewGeneratingState";
import { OverviewStyleSheet } from "./OverviewStyleSheet";
import { useOverviewTheme } from "./overview-theme";
import { overviewPageLinkStyle, overviewPageStyle, overviewTracksStyle } from "./styles";
import { OverviewYorkPartnerStrip } from "@/components/york-partner/OverviewYorkPartner";

type ActiveView = "overview" | OverviewCategoryId;

const COMPANY_TAB = {
  intelligence: "intelligence",
  initiatives: "initiatives",
  research: "research",
} as const;

function hasOverviewContent(data: OverviewApiResponse | null): boolean {
  return Boolean(data?.advisor && data.categories.length > 0);
}

function profilePromptOpenKey(companyUuid: string): string {
  return `fuel-profile-prompt-open-${companyUuid}`;
}

function profilePromptDismissedKey(companyUuid: string): string {
  return `fuel-profile-prompt-dismissed-${companyUuid}`;
}

function readSessionFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeSessionFlag(key: string, on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.sessionStorage.setItem(key, "1");
    else window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function CompanyOverviewPage({
  companyUuid,
  companyName,
  onNavigateTab,
  initiatives = [],
  advisorPool = [],
  availableIntelligence = [],
  signalCatalog = [],
  recentObservations = [],
  allowAdvisorLinking = true,
  initialOverview = null,
}: {
  companyUuid: string;
  companyName: string;
  onNavigateTab?: (tab: string) => void;
  initiatives?: CompanyInitiativeSummary[];
  advisorPool?: CompanyAdvisorSummary[];
  availableIntelligence?: CompanyIntelligenceRow[];
  signalCatalog?: SignalCatalogEntry[];
  recentObservations?: CompanySignalObservation[];
  allowAdvisorLinking?: boolean;
  /** Server-prefetched overview — avoids the build/loading shell on first paint. */
  initialOverview?: OverviewApiResponse | null;
}) {
  const t = useOverviewTheme();
  const credits = useCreditsOptional();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const tour = useWorkspaceTour();
  const agentDrawer = useAgentDrawer();
  const { open: agentOpen, openDrawer: openAgentDrawer, run } = agentDrawer;
  const hadInitialBuildRef = useRef(false);
  const agentWasOpenRef = useRef(false);
  const benchmarkQueryHandledRef = useRef(false);
  const [data, setData] = useState<OverviewApiResponse | null>(initialOverview);
  const [loading, setLoading] = useState(!initialOverview);
  const [error, setError] = useState<string | null>(null);
  const [generationTimedOut, setGenerationTimedOut] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const view = searchParams.get("view");
    return isOverviewCategoryId(view) ? view : "overview";
  });
  const [detailScrollTarget, setDetailScrollTarget] =
    useState<CategoryDetailScrollTarget | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(true);
  /** Track rows stay expanded on load; each can still be collapsed. */
  const [expandedTracks, setExpandedTracks] = useState<OverviewCategoryId[]>(
    () => [...CATEGORY_IDS],
  );
  const [fullSummaryOpen, setFullSummaryOpen] = useState(false);
  const [fullSummaryHighlightRefId, setFullSummaryHighlightRefId] = useState<
    number | null
  >(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState<DetailDrawerStep>("profile");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(
    () => searchParams.get("profilePrompt") === "1",
  );
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [openInitiativeId, setOpenInitiativeId] = useState<string | null>(
    () => searchParams.get("initiativeId"),
  );

  const replaceQuery = useCallback(
    (patch: Record<string, string | null>) => {
      applyClientSearchPatch(pathname, patch, "replace");
    },
    [pathname],
  );

  const openDrawer = useCallback((step: DetailDrawerStep = "profile") => {
    setDrawerStep(step);
    setDrawerOpen(true);
  }, []);

  const openBenchmark = useCallback(() => {
    agentWasOpenRef.current = agentOpen;
    openDrawer("benchmark");
  }, [agentOpen, openDrawer]);

  useEffect(() => {
    if (benchmarkQueryHandledRef.current) return;
    if (searchParams.get("benchmark") !== "1") return;
    benchmarkQueryHandledRef.current = true;
    openBenchmark();
    // Drop deep-link param so remount / StrictMode / later searchParams churn
    // cannot re-open the drawer.
    replaceQuery({ benchmark: null });
  }, [searchParams, openBenchmark, replaceQuery]);

  const refreshOverview = useCallback(async () => {
    invalidateOverviewClientCache(companyUuid);
    const json = await fetchOverview(companyUuid);
    setData(json);
    setError(null);
    return json;
  }, [companyUuid]);

  useEffect(() => {
    let cancelled = false;
    if (initialOverview) {
      setData(initialOverview);
      setLoading(false);
      setError(null);
      seedOverviewFormCaches(companyUuid, initialOverview);
    } else {
      setLoading(true);
      setError(null);
      setData(null);
      invalidateOverviewClientCache(companyUuid, { includeForms: true });
    }
    void refreshOverview()
      .catch(() => {
        if (!cancelled && !initialOverview) setError("Could not load overview.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyUuid, initialOverview, refreshOverview]);

  // Fuel AI can save benchmark numbers while this page stays mounted; refetch
  // so the drawers open with what was just written.
  useEffect(() => {
    const onDataChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ companyUuid?: string }>).detail;
      if (detail?.companyUuid && detail.companyUuid !== companyUuid) return;
      void refreshOverview().catch(() => undefined);
    };
    window.addEventListener(OVERVIEW_DATA_CHANGED_EVENT, onDataChanged);
    return () => window.removeEventListener(OVERVIEW_DATA_CHANGED_EVENT, onDataChanged);
  }, [companyUuid, refreshOverview]);

  useEffect(() => {
    const status = data?.generation.status;
    if (status !== "pending" && status !== "running") {
      setGenerationTimedOut(false);
      return;
    }

    const startedAt = data?.generation.startedAt ?? null;
    if (isOverviewGenerationStale(startedAt)) {
      void refreshOverview().catch(() => setGenerationTimedOut(true));
    } else {
      setGenerationTimedOut(false);
    }

    const startedMs = startedAt ? Date.parse(startedAt) : Date.now();
    const remaining = Number.isFinite(startedMs)
      ? Math.max(0, OVERVIEW_GENERATION_STALE_MS - (Date.now() - startedMs))
      : OVERVIEW_GENERATION_STALE_MS;

    const failId = window.setTimeout(() => {
      void refreshOverview()
        .then((json) => {
          const next = json.generation.status;
          if (next === "pending" || next === "running") {
            setGenerationTimedOut(true);
          }
        })
        .catch(() => setGenerationTimedOut(true));
    }, remaining + 2_000);

    const id = window.setInterval(() => {
      void refreshOverview().catch(() => undefined);
    }, OVERVIEW_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(failId);
    };
  }, [data?.generation.status, data?.generation.startedAt, refreshOverview]);

  const prevGenStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const status = data?.generation.status ?? "none";
    const prev = prevGenStatusRef.current;
    prevGenStatusRef.current = status;
    if (
      (prev === "pending" || prev === "running") &&
      (status === "complete" || status === "failed")
    ) {
      router.refresh();
    }
  }, [data?.generation.status, router]);

  const genStatus = data?.generation.status ?? "none";
  const contentReady = hasOverviewContent(data);
  const isGenerating =
    !generationTimedOut && (genStatus === "pending" || genStatus === "running");
  const isBuilding = (loading && !data) || (isGenerating && !contentReady);

  const {
    setOverviewBuildActive,
    notifyOverviewReady,
    activeTarget,
    tourOpen,
  } = tour;

  const returnToOverviewLanding = useCallback(() => {
    setActiveView("overview");
    setDetailScrollTarget(null);
    setFullSummaryOpen(false);
    setFullSummaryHighlightRefId(null);
    setOpenInitiativeId(null);
    replaceQuery({ view: null, initiativeId: null });
  }, [replaceQuery]);

  useEffect(() => {
    if (isBuilding) hadInitialBuildRef.current = true;
    setOverviewBuildActive(isBuilding);
    if (!isBuilding && contentReady && hadInitialBuildRef.current) {
      notifyOverviewReady();
    }
  }, [contentReady, isBuilding, notifyOverviewReady, setOverviewBuildActive]);

  // Tour setTab("overview") is a no-op when already on the Overview tab — nested
  // category / full-summary views stay mounted and landing anchors are missing.
  useEffect(() => {
    if (!tourOpen) return;
    returnToOverviewLanding();
  }, [returnToOverviewLanding, tourOpen]);

  useEffect(() => {
    if (!isOverviewLandingTourTarget(activeTarget)) return;
    returnToOverviewLanding();
    setAdvisorOpen(true);
  }, [activeTarget, returnToOverviewLanding]);

  useEffect(() => {
    setExpandedTracks([...CATEGORY_IDS]);
    setAdvisorOpen(true);
  }, [companyUuid]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams.toString());
    let changed = false;
    if (next.has("profileReward")) {
      next.delete("profileReward");
      changed = true;
    }

    const dismissed =
      credits?.snapshot?.profilePromptDismissed ||
      readSessionFlag(profilePromptDismissedKey(companyUuid));
    if (dismissed) {
      writeSessionFlag(profilePromptOpenKey(companyUuid), false);
      setPromptOpen(false);
      if (next.has("profilePrompt")) {
        next.delete("profilePrompt");
        changed = true;
      }
    } else {
      const fromUrl = next.get("profilePrompt") === "1";
      const pending = readSessionFlag(profilePromptOpenKey(companyUuid));
      // `profilePrompt=1` is explicit claim/design intent — open even before
      // the credits snapshot hydrates or setupIncomplete is patched.
      const incomplete = credits?.snapshot?.setupIncomplete === true;
      if (fromUrl || pending || incomplete) {
        writeSessionFlag(profilePromptOpenKey(companyUuid), true);
        setPromptOpen(true);
        if (fromUrl) {
          next.delete("profilePrompt");
          changed = true;
        }
      }
    }

    if (!changed) return;
    const query = next.toString();
    const url = `/company/${companyUuid}${query ? `?${query}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [companyUuid, credits?.snapshot, searchParams]);

  const dismissProfilePrompt = useCallback(() => {
    setPromptOpen(false);
    writeSessionFlag(profilePromptOpenKey(companyUuid), false);
    writeSessionFlag(profilePromptDismissedKey(companyUuid), true);
    void fetch("/api/credits/profile-prompt", { method: "POST" });
    void credits?.refreshSnapshot();
  }, [companyUuid, credits]);

  useEffect(() => {
    if (activeView !== "overview" && fullSummaryOpen) {
      setFullSummaryOpen(false);
      setFullSummaryHighlightRefId(null);
    }
  }, [activeView, fullSummaryOpen]);

  const openFullSummary = useCallback((highlightRefId?: number) => {
    setFullSummaryHighlightRefId(highlightRefId ?? null);
    setFullSummaryOpen(true);
  }, []);

  const closeFullSummary = useCallback(() => {
    setFullSummaryOpen(false);
    setFullSummaryHighlightRefId(null);
  }, []);

  /** Apply mutation payload; regen jobs show OverviewGeneratingState via generation.status. */
  const handleMutationSaved = useCallback(
    async (result?: OverviewMutationResult) => {
      try {
        if (result?.overview) {
          invalidateOverviewClientCache(companyUuid);
          seedOverviewFormCaches(companyUuid, result.overview);
          setData(result.overview);
          setError(null);
        } else {
          await refreshOverview();
        }
        setDetailRefreshKey((k) => k + 1);
        void credits?.refreshSnapshot();
      } catch {
        setError("Could not refresh overview.");
      }
    },
    [companyUuid, refreshOverview, credits],
  );

  const regenerate = async () => {
    try {
      setGenerationTimedOut(false);
      await postOverviewGenerate(companyUuid, "regenerate").catch(() => undefined);
      await refreshOverview();
    } catch {
      setError("Could not start overview generation.");
    }
  };

  const runPlaybook = (slug: string, title: string, content: string) => {
    void runPlaybookAgainstSubject(
      agentDrawer,
      { kind: "company", uuid: companyUuid, name: companyName },
      {
        id: slug,
        slug,
        title,
        description: "",
        category: "",
        subcategory: null,
        targetKind: "company",
        content,
      },
    );
  };

  const navigateTab = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
      return;
    }
    applyClientSearchPatch(`/company/${companyUuid}`, { tab }, "push");
  };

  const openCategory = useCallback(
    (categoryId: OverviewCategoryId, section?: CategoryDetailScrollTarget) => {
      setDetailScrollTarget(section ?? null);
      setActiveView(categoryId);
      replaceQuery({ view: categoryId });
    },
    [replaceQuery],
  );

  const scrollToTrack = useCallback((categoryId: OverviewCategoryId) => {
    document.getElementById(overviewTrackSectionId(categoryId))?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const closeCategory = useCallback(() => {
    setActiveView("overview");
    setDetailScrollTarget(null);
    setOpenInitiativeId(null);
    replaceQuery({ view: null, initiativeId: null });
  }, [replaceQuery]);

  const setTrackedOpenInitiativeId = useCallback(
    (id: string | null) => {
      setOpenInitiativeId(id);
      replaceQuery({
        view: activeView === "overview" ? null : activeView,
        initiativeId: id,
      });
    },
    [activeView, replaceQuery],
  );

  const drawer = (
    <>
      <DetailAnswersDrawer
        open={drawerOpen}
        companyUuid={companyUuid}
        companyName={companyName}
        initialStep={drawerStep}
        initialAnswers={data?.detailAnswers ?? null}
        initialBenchmark={data?.benchmarkDrawer ?? null}
        onClose={() => {
          setDrawerOpen(false);
          if (agentWasOpenRef.current) {
            agentWasOpenRef.current = false;
            openAgentDrawer();
          }
        }}
        onSaved={handleMutationSaved}
      />
      <AddSourceDrawer
        t={t}
        open={sourcesOpen}
        companyUuid={companyUuid}
        onClose={() => setSourcesOpen(false)}
        onSaved={() => handleMutationSaved()}
      />
    </>
  );

  // Drawer lives in pageShell so it survives loading → ready branch switches
  // (avoids remount / double enter anim on ?benchmark=1 deep links).
  const pageShell = (children: ReactNode) => (
    <div
      className="fuel-overview scorecard-v2"
      data-theme={t.mode === "editorial" ? "light" : "dark"}
      style={overviewPageStyle(t)}
    >
      <OverviewStyleSheet />
      {children}
      {drawer}
      <ProfileCompletionPrompt
        open={promptOpen}
        onCompleteProfile={() => {
          dismissProfilePrompt();
          openDrawer("profile");
        }}
        onContinue={dismissProfilePrompt}
      />
    </div>
  );

  if (error && !data) {
    return pageShell(
      <>
        <p style={{ color: t.negative, margin: 0 }}>{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void refreshOverview()
              .catch(() => setError("Could not load overview."))
              .finally(() => setLoading(false));
          }}
          style={overviewPageLinkStyle(t)}
        >
          Retry
        </button>
      </>,
    );
  }

  // First paint + first calculation — Design build panel + skeletons (no old OverviewPageSkeleton).
  if ((loading && !data) || (isGenerating && !contentReady)) {
    return pageShell(
      <>
        <OverviewGeneratingState
          key={`initial-${companyUuid}`}
          status={isGenerating ? genStatus : "pending"}
          companyName={companyName}
          mode="initial"
        />
      </>,
    );
  }

  const refreshBanner =
    isGenerating && contentReady ? (
      <OverviewGeneratingState
        key={data?.generation.runId ?? genStatus}
        status={genStatus}
        companyName={companyName}
        mode="refresh"
      />
    ) : null;

  if ((genStatus === "failed" || generationTimedOut) && !contentReady) {
    const rawError = data?.generation.errorMessage;
    const failedCopy =
      generationTimedOut ||
      rawError === "bedrock_timeout" ||
      rawError === "no_tool_output"
        ? "Overview generation timed out. Retry to try again."
        : rawError
          ? `Overview generation failed: ${rawError}`
          : "Overview generation failed.";
    return pageShell(
      <>
        <p style={{ color: t.negative, margin: 0 }}>{failedCopy}</p>
        <button type="button" onClick={() => void regenerate()} style={overviewPageLinkStyle(t)}>
          Retry generation
        </button>
      </>,
    );
  }

  if (!contentReady) {
    return pageShell(
      <>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, color: t.ink }}>Generate your overview</h2>
        <p style={{ margin: "0 0 16px", color: t.muted, fontSize: 14 }}>
          Generate your AI operating dashboard from available company context and benchmark data.
        </p>
        <button type="button" onClick={() => void regenerate()} style={overviewPageLinkStyle(t)}>
          Generate overview
        </button>
      </>,
    );
  }

  if (activeView !== "overview") {
    const category = data!.categories.find((c) => c.categoryId === activeView);
    return pageShell(
      <>
        {refreshBanner}
        <CategoryDetailView
          key={`${activeView}-${detailRefreshKey}`}
          companyUuid={companyUuid}
          categoryId={activeView}
          category={category ?? null}
          updatedAt={data?.generation.completedAt}
          scrollToSection={detailScrollTarget}
          onBack={closeCategory}
          openInitiativeId={openInitiativeId}
          onOpenInitiative={setTrackedOpenInitiativeId}
          onApproveInitiative={async (id) => {
            await approveOverviewInitiative(companyUuid, id);
            await handleMutationSaved();
            showToast({
              message: "Initiative created",
              variant: "success",
            });
          }}
          onOpenDrawer={() => openDrawer(activeView)}
          onEditBenchmark={openBenchmark}
          onOpenIntelligence={() => navigateTab(COMPANY_TAB.intelligence)}
          onOpenInitiatives={() => navigateTab(COMPANY_TAB.initiatives)}
          initiatives={initiatives}
          advisorPool={advisorPool}
          availableIntelligence={availableIntelligence}
          signalCatalog={signalCatalog}
          recentObservations={recentObservations}
          allowAdvisorLinking={allowAdvisorLinking}
        />
      </>,
    );
  }

  if (fullSummaryOpen) {
    return pageShell(
      <>
        {refreshBanner}
        <OverviewFullSummaryPage
          companyUuid={companyUuid}
          companyName={companyName}
          highlightRefId={fullSummaryHighlightRefId}
          onClose={closeFullSummary}
        />
      </>,
    );
  }

  return pageShell(
    <>
      {refreshBanner}
      <OverviewModulesPanel
        answeredByModule={(() => {
          const answers = data!.detailAnswers ?? {};
          const profile = DETAIL_SECTIONS.filter((s) => s.id === "profile" || s.id === "context");
          const profileQs = profile.flatMap((s) => getVisibleQuestions(s, answers));
          const track = (id: "dev" | "mkt" | "rev") => {
            const s = DETAIL_SECTIONS.find((sec) => sec.id === id);
            const qs = s ? getVisibleQuestions(s, answers) : [];
            return {
              answered: qs.filter((q) => answers[q.id]?.trim()).length,
              total: qs.length,
            };
          };
          const bench = data!.benchmarkDrawer?.values ?? {};
          const benchAnswered = BENCHMARK_DRAWER_FIELDS.filter((f) =>
            Boolean(bench[f.key]?.trim()),
          ).length;
          return {
            profile: {
              answered: profileQs.filter((q) => answers[q.id]?.trim()).length,
              total: profileQs.length,
            },
            dev: track("dev"),
            mkt: track("mkt"),
            rev: track("rev"),
            benchmark: { answered: benchAnswered, total: BENCHMARK_DRAWER_FIELDS.length },
          };
        })()}
        onSelect={openDrawer}
      />
      <OverviewAdvisorPanel
        companyName={companyName}
        advisor={data!.advisor!}
        categories={data!.categories}
        open={advisorOpen}
        onToggle={() => setAdvisorOpen((v) => !v)}
        onEditBenchmark={openBenchmark}
        onAddSources={() => setSourcesOpen(true)}
        onViewDetails={() => openDrawer("profile")}
        onOpenTrack={scrollToTrack}
        onOpenFullSummary={openFullSummary}
        tourHighlight={activeTarget === "ai-advisor"}
        tourHighlightRecommended={activeTarget === "recommended-actions"}
        detailsDisabled={isGenerating}
      />
      <div className="sc-overview-tracks sc-overview-tracks-glance" style={overviewTracksStyle()}>
        {CATEGORY_IDS.map((id) => {
          const cat = data!.categories.find((c) => c.categoryId === id);
          if (!cat) return null;
          return (
            <CategoryGlanceRow
              key={id}
              category={cat}
              companyUuid={companyUuid}
              updatedAt={data?.generation.completedAt}
              profileUnlocked={Boolean(credits?.snapshot?.profileModules.includes("company"))}
              onUnlockProfile={() => openDrawer("profile")}
              onOpen={() => openCategory(id)}
              onOpenDrawer={() => openDrawer(id)}
              expanded={expandedTracks.includes(id)}
              onToggleExpanded={() =>
                setExpandedTracks((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                )
              }
            />
          );
        })}
        <OverviewYorkPartnerStrip categories={data!.categories} />
      </div>
    </>,
  );
}
