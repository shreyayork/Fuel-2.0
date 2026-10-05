"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import type { OverviewApiResponse } from "@/lib/overview/types";
import type { OverviewCategoryId } from "@/lib/overview/constants";
import { CATEGORY_META } from "@/lib/overview/constants";
import {
  fetchCategoryDetail,
  notifyOverviewDataChanged,
} from "@/lib/overview/client";
import { isCategoryDetailPayloadLoading } from "@/lib/overview/category-detail-load";
import type { IntelligenceFeedItem } from "@/lib/intelligence/feed";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import { SignalDetailDrawer } from "@/components/intelligence/SignalDetailDrawer";
import { SuggestedInitiativeReviewDrawer } from "@/components/company/initiatives/SuggestedInitiativeReviewDrawer";
import type {
  CompanyAdvisorSummary,
  CompanyInitiativeSummary,
  CompanySignalObservation,
  SignalCatalogEntry,
} from "@/components/views/CompanyPublicView";
import { useOverviewTheme } from "./overview-theme";
import { CategoryGlanceHeaderBar } from "./CategoryGlanceHeaderBar";
import { GlanceScoreRing } from "./GlanceScoreRing";
import { CategoryDetailSkeleton } from "./OverviewSkeletons";
import { OverviewInitiativeSidebar } from "./OverviewInitiativeSidebar";
import { ScorecardBreadcrumb } from "./ScorecardBreadcrumb";
import {
  CategoryDetailContextPanel,
  CategoryDetailInitiativesWidget,
  CategoryDetailIntelligenceList,
  DetailDashboardWidget,
  DetailInsightChipStrip,
  type CategoryDetailPayload,
} from "./CategoryDetailWidgets";
import { DetailYorkPartnerNudge } from "@/components/york-partner/OverviewYorkPartner";

export type CategoryDetailScrollTarget = "initiatives" | "intelligence" | "playbooks";

const DETAIL_SECTION: Record<CategoryDetailScrollTarget, string> = {
  initiatives: "sc-detail-section-initiatives",
  intelligence: "sc-detail-section-intelligence",
  playbooks: "sc-detail-section-playbooks",
};

function scrollToDetailSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CategoryDetailView({
  companyUuid,
  categoryId,
  category,
  updatedAt,
  scrollToSection = null,
  onBack,
  onApproveInitiative,
  openInitiativeId: openInitiativeIdProp = null,
  onOpenInitiative,
  onOpenDrawer,
  onEditBenchmark,
  onOpenIntelligence,
  onOpenInitiatives,
  initiatives = [],
  advisorPool = [],
  availableIntelligence = [],
  signalCatalog = [],
  recentObservations = [],
  allowAdvisorLinking = true,
}: {
  companyUuid: string;
  categoryId: OverviewCategoryId;
  category: OverviewApiResponse["categories"][0] | null;
  updatedAt?: string | null;
  /** When set, scroll to this section after the detail payload paints. */
  scrollToSection?: CategoryDetailScrollTarget | null;
  onBack: () => void;
  onApproveInitiative: (id: string) => Promise<void>;
  openInitiativeId?: string | null;
  onOpenInitiative?: (id: string | null) => void;
  onOpenDrawer: () => void;
  onEditBenchmark?: () => void;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  initiatives?: CompanyInitiativeSummary[];
  advisorPool?: CompanyAdvisorSummary[];
  availableIntelligence?: CompanyIntelligenceRow[];
  signalCatalog?: SignalCatalogEntry[];
  recentObservations?: CompanySignalObservation[];
  allowAdvisorLinking?: boolean;
}) {
  const t = useOverviewTheme();
  const [detail, setDetail] = useState<CategoryDetailPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [reviewBusyKind, setReviewBusyKind] = useState<"accept" | "dismiss" | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(() => new Set());
  const [reviewSuggestedId, setReviewSuggestedId] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<CompanyInitiativeSummary | null>(null);
  const [reviewLoadError, setReviewLoadError] = useState<string | null>(null);
  const [selectedIntelId, setSelectedIntelId] = useState<string | null>(null);
  const [openInitiativeIdLocal, setOpenInitiativeIdLocal] = useState<string | null>(null);
  const openInitiativeId = onOpenInitiative ? openInitiativeIdProp : openInitiativeIdLocal;
  const setOpenInitiativeId = onOpenInitiative ?? setOpenInitiativeIdLocal;

  // Initiatives + Playbooks side accents match R&D green on every track (incl. G&A).
  const accent = t.accent;
  const trackLabel = CATEGORY_META[categoryId].label;
  const detailLoading = isCategoryDetailPayloadLoading({ detail, loadError });

  useEffect(() => {
    setLoadError(null);
    setDetail(null);
    setSelectedIntelId(null);
    setReviewSuggestedId(null);
    setReviewItem(null);
    setReviewLoadError(null);
    setAcceptedIds(new Set());
    setReviewBusyKind(null);
    if (!onOpenInitiative) setOpenInitiativeId(null);
    void fetchCategoryDetail(companyUuid, categoryId)
      .then((j) => setDetail(j as CategoryDetailPayload))
      .catch(() => setLoadError("Could not load this track."));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keep parent-controlled drawer open across refetch
  }, [companyUuid, categoryId]);

  useEffect(() => {
    if (!reviewSuggestedId) {
      setReviewItem(null);
      setReviewLoadError(null);
      return;
    }
    const seed = initiatives.find((row) => row.id === reviewSuggestedId) ?? null;
    if (seed) {
      setReviewItem(seed);
      setReviewLoadError(null);
    } else {
      setReviewItem(null);
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(
          `/api/company/${companyUuid}/initiatives?id=${encodeURIComponent(reviewSuggestedId)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!res.ok) throw new Error(`initiative_fetch_${res.status}`);
        const payload = (await res.json()) as { data: CompanyInitiativeSummary[] };
        const found = payload.data.find((row) => row.id === reviewSuggestedId) ?? null;
        if (found) {
          setReviewItem(found);
          setReviewLoadError(null);
          return;
        }
        if (!seed) setReviewLoadError("Could not load this initiative.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        Sentry.captureException(error);
        if (!seed) setReviewLoadError("Could not load this initiative.");
      }
    })();
    return () => controller.abort();
  }, [reviewSuggestedId, companyUuid, initiatives]);

  useEffect(() => {
    if (!scrollToSection || !detail) return;
    const sectionId = DETAIL_SECTION[scrollToSection];
    const timer = window.setTimeout(() => {
      scrollToDetailSection(sectionId);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [scrollToSection, detail]);

  const cat = detail?.category ?? category;
  const catIntel = useMemo(() => detail?.intelligence ?? [], [detail]);
  const playbooks = detail?.playbooks ?? [];
  const suggestedInitiatives = detail?.initiatives?.suggested ?? [];
  const activeInitiatives = detail?.initiatives?.active ?? [];
  const formRows = detail?.formRows ?? [];
  const benchmarkGaps = detail?.benchmarkGaps ?? [];

  const selectedItem = useMemo(
    () => catIntel.find((item) => item.id === selectedIntelId) ?? null,
    [catIntel, selectedIntelId],
  );
  const siblings = useMemo(() => {
    if (!selectedItem) return [];
    return catIntel
      .filter(
        (item) =>
          item.categoryKey === selectedItem.categoryKey &&
          item.signalName === selectedItem.signalName,
      )
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [catIntel, selectedItem]);

  const openIntelItem = useCallback((item: IntelligenceFeedItem) => {
    setSelectedIntelId(item.id);
  }, []);

  const closeIntelDrawer = useCallback(() => {
    setSelectedIntelId(null);
  }, []);

  const refreshDetail = useCallback(() => {
    void fetchCategoryDetail(companyUuid, categoryId)
      .then((j) => setDetail(j as CategoryDetailPayload))
      .catch(() => undefined);
  }, [companyUuid, categoryId]);

  const closeReview = useCallback(() => {
    if (reviewBusyKind) return;
    setReviewSuggestedId(null);
    setReviewItem(null);
    setReviewLoadError(null);
  }, [reviewBusyKind]);

  const acceptReview = useCallback(async () => {
    if (!reviewSuggestedId || acceptedIds.has(reviewSuggestedId) || reviewBusyKind) return;
    const id = reviewSuggestedId;
    setApprovingId(id);
    setReviewBusyKind("accept");
    try {
      await onApproveInitiative(id);
      setAcceptedIds((prev) => new Set(prev).add(id));
      setReviewSuggestedId(null);
      setReviewItem(null);
      setReviewLoadError(null);
      setOpenInitiativeId(id);
      refreshDetail();
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      setApprovingId(null);
      setReviewBusyKind(null);
    }
  }, [reviewSuggestedId, acceptedIds, reviewBusyKind, onApproveInitiative, refreshDetail, setOpenInitiativeId]);

  const dismissReview = useCallback(async () => {
    if (!reviewSuggestedId || reviewBusyKind) return;
    const id = reviewSuggestedId;
    setApprovingId(id);
    setReviewBusyKind("dismiss");
    try {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("companyUuid", companyUuid);
      const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
      await mod.dismissSuggestedInitiativeAction(fd);
      setReviewSuggestedId(null);
      setReviewItem(null);
      setReviewLoadError(null);
      notifyOverviewDataChanged(companyUuid);
      refreshDetail();
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      setApprovingId(null);
      setReviewBusyKind(null);
    }
  }, [reviewSuggestedId, reviewBusyKind, companyUuid, refreshDetail]);

  const openIntelligenceFromReview = useCallback(
    (ids: string[]) => {
      const focusId = ids[0];
      if (focusId && catIntel.some((item) => item.id === focusId)) {
        setSelectedIntelId(focusId);
        return;
      }
      onOpenIntelligence?.();
    },
    [catIntel, onOpenIntelligence],
  );

  if (loadError && !cat) {
    return (
      <div className="sc-category-detail">
        <ScorecardBreadcrumb
          onOverview={onBack}
          current={`${CATEGORY_META[categoryId].label} · ${CATEGORY_META[categoryId].fullLabel}`}
        />
        <p className="sc-cat-sw-empty">{loadError}</p>
      </div>
    );
  }

  if (!cat) {
    return <CategoryDetailSkeleton categoryId={categoryId} onBack={onBack} />;
  }

  const score = Math.max(0, Math.min(100, cat.score));
  const pbStyle = { "--cat-col": accent } as CSSProperties;
  const answered = cat.detailAnsweredCount ?? formRows.filter((r) => r.answer?.trim()).length;
  const total = cat.detailQuestionCount ?? formRows.length;
  const loggedBenchCount = detail?.benchmarkMeta?.loggedCount ?? 0;
  const metricTotal = detail?.benchmarkMeta?.totalCount ?? benchmarkGaps.length;

  return (
    <div className="sc-category-detail sc-detail-dashboard">
      <ScorecardBreadcrumb
        onOverview={onBack}
        current={`${cat.label} · ${cat.fullLabel}`}
      />

      <article className="sc-glance-row sc-glance-row-detail sc-detail-hero-widget">
        <CategoryGlanceHeaderBar category={cat} onUpdateDetails={onOpenDrawer} />
        <div className="sc-detail-hero">
          <div className="sc-detail-hero-main">
            <GlanceScoreRing
              category={cat}
              score={score}
              isOpen={popoverOpen}
              onToggle={() => setPopoverOpen((v) => !v)}
              companyUuid={companyUuid}
              updatedAt={updatedAt}
            />
            <div className="sc-glance-copy">
              <h3 className="sc-glance-name sc-glance-name-static">
                <span>{cat.label}</span>
                <span className="sc-glance-name-sep" aria-hidden>
                  ·
                </span>
                <span>{cat.fullLabel}</span>
              </h3>
              {cat.focusNarrative ? <p className="sc-glance-focus">{cat.focusNarrative}</p> : null}
              {cat.insight ? <p className="sc-detail-context">{cat.insight}</p> : null}
            </div>
          </div>
        </div>
      </article>

      <div className="sc-detail-widgets-grid">
        <DetailDashboardWidget title="Track insights" span={6}>
          {cat.strengths.length === 0 && cat.weaknesses.length === 0 ? (
            <p className="sc-cat-sw-empty sc-detail-insights-empty">
              No track insights yet — add profile answers, benchmarks, or sources.
            </p>
          ) : (
            <div className="sc-detail-insights-action">
              <DetailInsightChipStrip
                tone="strong"
                label="What's working"
                items={cat.strengths}
                empty="No strengths flagged yet."
              />
              <DetailInsightChipStrip
                tone="weak"
                label="Needs improvement"
                items={cat.weaknesses}
                empty="No gaps flagged yet."
              />
            </div>
          )}
          <DetailYorkPartnerNudge
            categoryId={categoryId}
            weaknesses={cat.weaknesses ?? []}
          />
        </DetailDashboardWidget>

        <DetailDashboardWidget
          id={DETAIL_SECTION.initiatives}
          title="Initiatives"
          meta={
            suggestedInitiatives.length > 0
              ? `${suggestedInitiatives.length} suggested`
              : undefined
          }
          span={6}
          headerAction={
            onOpenInitiatives ? (
              <button type="button" className="sc-detail-widget-head-link" onClick={onOpenInitiatives}>
                Open initiatives <span aria-hidden="true">→</span>
              </button>
            ) : null
          }
        >
          <CategoryDetailInitiativesWidget
            suggested={suggestedInitiatives}
            active={activeInitiatives}
            weaknesses={cat.weaknesses ?? []}
            accent={accent}
            acceptedIds={acceptedIds}
            approvingId={approvingId}
            loading={detailLoading}
            onOpenInitiatives={onOpenInitiatives}
            onOpenInitiative={(id) => {
              setReviewSuggestedId(null);
              setReviewItem(null);
              setReviewLoadError(null);
              setOpenInitiativeId(id);
            }}
            onReviewSuggested={(id) => {
              setOpenInitiativeId(null);
              setReviewSuggestedId(id);
            }}
          />
        </DetailDashboardWidget>

        <DetailDashboardWidget
          id={DETAIL_SECTION.intelligence}
          title="Intelligence"
          meta={catIntel.length ? `${catIntel.length} signal${catIntel.length === 1 ? "" : "s"}` : undefined}
          span={6}
          footer={
            onOpenIntelligence ? (
              <button type="button" className="sc-category-detail-tab-link" onClick={onOpenIntelligence}>
                Open in Intelligence <span aria-hidden="true">→</span>
              </button>
            ) : null
          }
        >
          {catIntel.length > 0 ? (
            <CategoryDetailIntelligenceList
              items={catIntel}
              selectedId={selectedIntelId}
              onSelect={openIntelItem}
            />
          ) : (
            <p className="sc-cat-sw-empty">No intelligence tagged to this track yet.</p>
          )}
        </DetailDashboardWidget>

        <DetailDashboardWidget
          id={DETAIL_SECTION.playbooks}
          title="Playbooks"
          meta={playbooks.length > 0 ? `${playbooks.length} available` : undefined}
          span={6}
        >
          {playbooks.length > 0 ? (
            <div className="sc-detail-playbook-stack">
              {playbooks.map((pb) => (
                <Link
                  key={pb.id}
                  href={`/playbooks/${pb.slug}`}
                  className="scorecard-drill-pb-card"
                  style={pbStyle}
                >
                  <div className="scorecard-drill-pb-track-strip" style={{ background: accent }} />
                  <div className="scorecard-drill-pb-content">
                    <div className="scorecard-drill-pb-title">{pb.title}</div>
                    <div className="scorecard-drill-pb-desc">{pb.reason ?? pb.description}</div>
                    <div className="scorecard-drill-pb-cta" style={{ color: accent }}>
                      View playbook →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="sc-cat-sw-empty">No playbooks suggested for this track yet.</p>
          )}
        </DetailDashboardWidget>
      </div>

      <CategoryDetailContextPanel
        categoryLabel={trackLabel}
        answered={answered}
        total={total}
        formRows={formRows}
        benchmarkGaps={benchmarkGaps}
        loggedCount={loggedBenchCount}
        metricTotal={metricTotal}
        onEditDetails={onOpenDrawer}
        onEditBenchmark={onEditBenchmark}
      />

      {selectedItem ? (
        <SignalDetailDrawer
          t={t}
          item={selectedItem}
          siblings={siblings}
          onClose={closeIntelDrawer}
        />
      ) : null}

      <SuggestedInitiativeReviewDrawer
        t={t}
        open={Boolean(reviewSuggestedId)}
        item={reviewItem}
        fallbackName={
          suggestedInitiatives.find((row) => row.id === reviewSuggestedId)?.name
        }
        loadError={reviewLoadError}
        busy={Boolean(reviewBusyKind)}
        accepted={Boolean(reviewSuggestedId && acceptedIds.has(reviewSuggestedId))}
        adding={reviewBusyKind === "accept"}
        onClose={closeReview}
        onDismiss={() => void dismissReview()}
        onAccept={() => void acceptReview()}
        onOpenIntelligence={openIntelligenceFromReview}
      />

      {openInitiativeId ? (
        <OverviewInitiativeSidebar
          companyUuid={companyUuid}
          initiativeId={openInitiativeId}
          seedInitiatives={initiatives}
          advisorPool={advisorPool}
          availableIntelligence={availableIntelligence}
          signalCatalog={signalCatalog}
          recentObservations={recentObservations}
          allowAdvisorLinking={allowAdvisorLinking}
          onClose={() => setOpenInitiativeId(null)}
        />
      ) : null}
    </div>
  );
}
