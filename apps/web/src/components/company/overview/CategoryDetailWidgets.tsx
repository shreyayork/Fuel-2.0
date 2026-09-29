"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { OverviewApiResponse } from "@/lib/overview/types";
import type { FormAnswerRow, BenchmarkGapRow } from "@/lib/overview/types";
import type { IntelligenceFeedItem } from "@/lib/intelligence/feed";
import { stripInsightSourceSuffix } from "@/lib/overview/track-insights";
import { overviewScoreTierColor, useOverviewTheme } from "./overview-theme";
import { OVERVIEW_STATUS } from "./overviewTokens";
import { MagicShimmer } from "@/components/ai/MagicShimmer";

export type CategoryDetailFormRow = FormAnswerRow;
export type CategoryDetailBenchmarkGap = BenchmarkGapRow;

export type CategoryDetailPayload = {
  category: OverviewApiResponse["categories"][0] | null;
  intelligence: IntelligenceFeedItem[];
  initiatives: {
    suggested: Array<{
      id: string;
      name: string;
      description: string | null;
      benefit?: string | null;
      isNew?: boolean;
      milestones?: Array<{ id: string; title: string; status: string; dueDate: string | null }>;
    }>;
    active: Array<{
      id: string;
      name: string;
      description: string | null;
      milestones?: Array<{ id: string; title: string; status: string; dueDate: string | null }>;
    }>;
  };
  playbooks: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    reason: string | null;
    content?: string;
  }>;
  formRows: FormAnswerRow[];
  benchmarkGaps: BenchmarkGapRow[];
  benchmarkMeta?: { loggedCount: number; totalCount: number };
};


export function DetailDashboardWidget({
  id,
  title,
  meta,
  span = 6,
  children,
  footer,
  headerAction,
}: {
  id?: string;
  title: string;
  meta?: string;
  span?: 6 | 8 | 12;
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
}) {
  return (
    <section id={id} className={`sc-detail-widget sc-detail-widget--span-${span}`}>
      <div className="sc-detail-widget-head">
        <div className="sc-detail-widget-head-main">
          <strong className="sc-detail-widget-title">{title}</strong>
          {meta ? <span className="sc-detail-widget-meta">{meta}</span> : null}
        </div>
        {headerAction ? <div className="sc-detail-widget-head-action">{headerAction}</div> : null}
      </div>
      <div className="sc-detail-widget-body">{children}</div>
      {footer ? <div className="sc-detail-widget-foot">{footer}</div> : null}
    </section>
  );
}

/** Design DetailInsightChipStrip — hover tip with why copy. */
export function DetailInsightChipStrip({
  tone,
  label,
  items,
  empty,
}: {
  tone: "strong" | "weak";
  label: string;
  items: Array<{ id: string; label: string; detail: string }>;
  empty: string;
}) {
  return (
    <div className={`sc-detail-insights-strip is-${tone}`}>
      <span className="sc-detail-insights-section-label">{label}</span>
      {items.length > 0 ? (
        <div className="sc-detail-strength-chips" role="list">
          {items.map((item) => {
            const why = stripInsightSourceSuffix(item.detail) || item.label;
            return (
              <span
                key={item.id}
                className={`sc-detail-insight-chip is-${tone}`}
                role="listitem"
                tabIndex={0}
                aria-label={`${item.label}. ${why}`}
              >
                <span className="sc-detail-insight-chip-label">{item.label}</span>
                <span className="sc-detail-insight-tip" role="tooltip">
                  <strong>
                    {tone === "strong" ? "Why it's working" : "Why it needs work"}
                  </strong>
                  <em>{why}</em>
                </span>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="sc-cat-sw-empty">{empty}</p>
      )}
    </div>
  );
}

/** Clickable intelligence rows — opens the same SignalDetailDrawer as the Intelligence tab. */
export function CategoryDetailIntelligenceList({
  items,
  onSelect,
  selectedId,
}: {
  items: IntelligenceFeedItem[];
  onSelect: (item: IntelligenceFeedItem) => void;
  selectedId?: string | null;
}) {
  return (
    <div className="scorecard-drill-intel">
      {items.map((item) => {
        const line = [item.signalName, item.valueLabel].filter(Boolean).join(" — ");
        return (
          <button
            key={item.id}
            type="button"
            className={`scorecard-drill-intel-row sc-detail-intel-btn${
              selectedId === item.id ? " is-selected" : ""
            }`}
            onClick={() => onSelect(item)}
            aria-pressed={selectedId === item.id}
          >
            <span className="scorecard-drill-intel-cat">{item.categoryLabel}</span>
            <span className="scorecard-drill-intel-text">{line}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CategoryDetailFormWidget({ rows }: { rows: FormAnswerRow[] }) {
  const flaggedRows = rows.filter((r) => r.tone !== "ok");
  const okRows = rows.filter((r) => r.tone === "ok");

  if (rows.length === 0) {
    return <p className="sc-cat-sw-empty">No detail questions for this track yet.</p>;
  }

  return (
    <div className="sc-detail-form-widget">
      {flaggedRows.length > 0 ? (
        <div className="sc-detail-form-flagged">
          <span className="sc-detail-form-section-label">Needs review</span>
          <div className="sc-detail-form-flagged-list">
            {flaggedRows.map((row) => (
              <div key={row.questionId} className={`sc-detail-form-row is-${row.tone}`}>
                <div className="sc-detail-form-row-head">
                  <span className="sc-detail-form-label">{row.label}</span>
                  {row.tone === "missing" ? (
                    <span className="sc-detail-form-flag is-missing">Missing</span>
                  ) : row.tone === "concern" ? (
                    <span className="sc-detail-form-flag is-concern">Needs attention</span>
                  ) : row.tone === "watch" ? (
                    <span className="sc-detail-form-flag is-watch">Watch</span>
                  ) : null}
                </div>
                <div className="sc-detail-form-value">{row.answer ?? "Not answered"}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {okRows.length > 0 ? (
        <div className="sc-detail-form-ok-block">
          <span className="sc-detail-form-section-label">On track</span>
          <div className="sc-detail-form-ok-grid">
            {okRows.map((row) => (
              <div key={row.questionId} className="sc-detail-form-ok-row">
                <span className="sc-detail-form-ok-label">{row.label}</span>
                <span className="sc-detail-form-ok-value">{row.answer ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function gapPillStyle(tier: string): CSSProperties | undefined {
  if (tier === "missing") return undefined;
  if (tier === "bottom") {
    return {
      color: OVERVIEW_STATUS.bad,
      background: "rgba(224, 92, 92, 0.12)",
      borderColor: "rgba(224, 92, 92, 0.35)",
    };
  }
  return {
    color: OVERVIEW_STATUS.watch,
    background: "rgba(245, 166, 35, 0.12)",
    borderColor: "rgba(245, 166, 35, 0.35)",
  };
}

export function CategoryDetailContextPanel({
  categoryLabel,
  answered,
  total,
  formRows,
  benchmarkGaps,
  loggedCount,
  metricTotal,
  onEditDetails,
  onEditBenchmark,
}: {
  categoryLabel: string;
  answered: number;
  total: number;
  formRows: FormAnswerRow[];
  benchmarkGaps: BenchmarkGapRow[];
  loggedCount: number;
  metricTotal: number;
  onEditDetails?: () => void;
  onEditBenchmark?: () => void;
}) {
  return (
    <section className="sc-detail-context-panel">
      <div className="sc-detail-context-head">
        <div>
          <h3 className="sc-detail-context-title">Your inputs</h3>
          <p className="sc-detail-context-sub">
            {categoryLabel} answers and benchmark gaps — edit either side to sharpen this track.
          </p>
        </div>
      </div>

      <div className="sc-detail-context-split">
        <div className="sc-detail-context-form-block">
          <div className="sc-detail-context-col-head">
            <div className="sc-detail-context-col-head-main">
              <span className="sc-detail-context-col-label">{categoryLabel} details</span>
              <span className="sc-detail-context-col-meta">
                {answered} of {total} answered
              </span>
            </div>
            {onEditDetails ? (
              <button
                type="button"
                className="sc-cat-header-btn sc-detail-context-col-btn"
                onClick={onEditDetails}
              >
                Edit answers <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>
          <CategoryDetailFormWidget rows={formRows} />
        </div>

        <div className="sc-detail-context-bench-block">
          <div className="sc-detail-context-col-head">
            <div className="sc-detail-context-col-head-main">
              <span className="sc-detail-context-col-label">Benchmark gaps</span>
              <span className="sc-detail-context-col-meta">
                {benchmarkGaps.length} to review · {loggedCount} of {metricTotal} logged
              </span>
            </div>
            {onEditBenchmark ? (
              <button
                type="button"
                className="sc-cat-header-btn sc-detail-context-col-btn"
                onClick={onEditBenchmark}
              >
                Edit benchmark <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>
          {benchmarkGaps.length > 0 ? (
            <div className="sc-detail-bench-gap-list">
              {benchmarkGaps.map((gap) => {
                const missing = gap.value == null || gap.tier === "missing";
                return (
                  <div
                    key={gap.metric}
                    className={`sc-detail-bench-row is-gap${missing ? " is-empty" : ""}`}
                  >
                    <div className="sc-detail-bench-row-head">
                      <span className="sc-detail-bench-label">{gap.label}</span>
                      <div className="sc-detail-bench-meta">
                        <strong
                          className="sc-detail-bench-val"
                          style={
                            missing
                              ? undefined
                              : { color: overviewScoreTierColor(gap.tier === "bottom" ? 20 : 40) }
                          }
                        >
                          {gap.value ?? "Not logged"}
                        </strong>
                        {/* Design BenchmarkCompactRow: pill only when metric is logged */}
                        {!missing ? (
                          <span
                            className="sc-detail-bench-pill"
                            style={gapPillStyle(gap.tier)}
                          >
                            {gap.position}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="sc-detail-bench-ok">
              No benchmark gaps flagged — logged metrics are on pace vs cohort.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

type CategoryInitiativeItem = {
  id: string;
  name: string;
  description: string | null;
  benefit?: string | null;
  isNew?: boolean;
  milestones?: Array<{ id: string; title: string; status: string; dueDate: string | null }>;
};

/** Mirrors active/suggested initiative rows while category detail payload loads. */
function CategoryDetailInitiativesSkeleton({ accent }: { accent: string }) {
  const t = useOverviewTheme();
  return (
    <div
      className="sc-detail-init-stack"
      role="status"
      aria-busy="true"
      aria-label="Loading initiatives"
    >
      <div className="sc-detail-init-group">
        <span className="sc-detail-init-group-label">
          <MagicShimmer theme={t} width={52} height={10} rounded={4} />
        </span>
        <div className="scorecard-drill-init-list sc-detail-init-list">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="scorecard-drill-init-row"
              style={{ "--init-col": accent } as CSSProperties}
              aria-hidden
            >
              <div className="scorecard-drill-init-body">
                <div className="scorecard-drill-init-title">
                  <MagicShimmer
                    theme={t}
                    width={i % 2 ? "58%" : "72%"}
                    height={13}
                    rounded={4}
                  />
                </div>
                <div className="scorecard-drill-init-desc">
                  <MagicShimmer
                    theme={t}
                    width={i % 3 ? "88%" : "76%"}
                    height={11}
                    rounded={4}
                  />
                </div>
              </div>
              <div className="scorecard-drill-init-action">
                <MagicShimmer theme={t} width={64} height={28} rounded={8} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CategoryDetailInitiativesWidget({
  suggested,
  active,
  weaknesses,
  accent,
  onReviewSuggested,
  acceptedIds,
  approvingId,
  onOpenInitiatives,
  onOpenInitiative,
  loading = false,
}: {
  suggested: CategoryInitiativeItem[];
  active: CategoryInitiativeItem[];
  weaknesses: Array<{ id: string; label: string; detail?: string }>;
  accent: string;
  onReviewSuggested: (id: string) => void;
  acceptedIds: Set<string>;
  approvingId: string | null;
  onOpenInitiatives?: () => void;
  /** Open one active initiative in the shared detail sidebar. */
  onOpenInitiative?: (id: string) => void;
  loading?: boolean;
}) {
  const hasActive = active.length > 0;
  const [view, setView] = useState<"active" | "suggested">("suggested");
  const showView = hasActive ? view : "suggested";

  useEffect(() => {
    if (hasActive) setView("active");
  }, [hasActive]);

  const sortedSuggested = useMemo(() => {
    return [...suggested].sort((a, b) => {
      const newDelta = Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
      if (newDelta !== 0) return newDelta;
      const aHit = weaknesses.some(
        (w) =>
          a.description?.toLowerCase().includes(w.label.toLowerCase()) ||
          a.name.toLowerCase().includes(w.label.toLowerCase()),
      );
      const bHit = weaknesses.some(
        (w) =>
          b.description?.toLowerCase().includes(w.label.toLowerCase()) ||
          b.name.toLowerCase().includes(w.label.toLowerCase()),
      );
      return Number(bHit) - Number(aHit);
    });
  }, [suggested, weaknesses]);

  const reasonFor = (init: { name: string; description: string | null }) => {
    const gap = weaknesses.find(
      (w) =>
        init.description?.toLowerCase().includes(w.label.toLowerCase()) ||
        init.name.toLowerCase().includes(w.label.toLowerCase()),
    );
    return gap?.detail ?? gap?.label ?? null;
  };

  if (loading) {
    return <CategoryDetailInitiativesSkeleton accent={accent} />;
  }

  const suggestedList =
    sortedSuggested.length > 0 ? (
      <div className="scorecard-drill-init-list sc-detail-init-list">
        {sortedSuggested.map((init) => {
          const why = reasonFor(init);
          return (
            <div
              key={init.id}
              className="scorecard-drill-init-row sc-detail-init-row-preview"
              style={{ "--init-col": accent } as CSSProperties}
            >
              <button
                type="button"
                className="scorecard-drill-init-body sc-detail-init-preview-btn"
                onClick={() => {
                  if (approvingId) return;
                  onReviewSuggested(init.id);
                }}
                aria-label={`Review suggested initiative: ${init.name}`}
              >
                <div className="scorecard-drill-init-title">
                  {init.name}
                  {init.isNew ? <span className="sc-detail-init-new-label">New</span> : null}
                </div>
                <div className="scorecard-drill-init-desc">
                  {why ? (
                    <>
                      <span className="sc-detail-init-reason-label">Why: </span>
                      {why}
                    </>
                  ) : (
                    init.description
                  )}
                </div>
              </button>
              <div className="scorecard-drill-init-action">
                {acceptedIds.has(init.id) ? (
                  <button type="button" className="scorecard-drill-init-btn" disabled>
                    ✓ Added to Initiatives
                  </button>
                ) : (
                  <button
                    type="button"
                    className="scorecard-drill-init-btn"
                    disabled={approvingId !== null}
                    onClick={() => {
                      if (approvingId) return;
                      onReviewSuggested(init.id);
                    }}
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p className="sc-detail-init-empty">No suggested initiatives for this track yet.</p>
    );

  return (
    <div className="sc-detail-init-stack">
      {hasActive ? (
        <div className="sc-detail-init-seg" role="tablist" aria-label="Initiative view">
          <button
            type="button"
            role="tab"
            aria-selected={showView === "active"}
            className={`sc-detail-init-seg-btn${showView === "active" ? " is-active" : ""}`}
            onClick={() => setView("active")}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={showView === "suggested"}
            className={`sc-detail-init-seg-btn${showView === "suggested" ? " is-active" : ""}${suggested.length > 0 ? " has-recs" : ""}`}
            onClick={() => setView("suggested")}
          >
            Suggested{suggested.length > 0 ? ` · ${suggested.length}` : ""}
          </button>
        </div>
      ) : null}

      {showView === "active" && hasActive ? (
        <div className="sc-detail-init-group">
          <span className="sc-detail-init-group-label">Active</span>
          {active.map((init) => (
            <div
              key={init.id}
              className="scorecard-drill-init-row"
              style={{ "--init-col": accent } as CSSProperties}
            >
              <div className="scorecard-drill-init-body">
                <div className="scorecard-drill-init-title">{init.name}</div>
                {init.description ? (
                  <div className="scorecard-drill-init-desc">{init.description}</div>
                ) : null}
              </div>
              {onOpenInitiative ? (
                <div className="scorecard-drill-init-action">
                  <button
                    type="button"
                    className="scorecard-drill-init-btn"
                    aria-label={`Open initiative: ${init.name}`}
                    onClick={() => onOpenInitiative(init.id)}
                  >
                    Open
                  </button>
                </div>
              ) : onOpenInitiatives ? (
                <div className="scorecard-drill-init-action">
                  <button
                    type="button"
                    className="scorecard-drill-init-btn"
                    onClick={onOpenInitiatives}
                  >
                    Open <span aria-hidden="true">→</span>
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="sc-detail-init-group">
          {!hasActive ? <span className="sc-detail-init-group-label">Suggested</span> : null}
          {suggestedList}
        </div>
      )}
    </div>
  );
}

