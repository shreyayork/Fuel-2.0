"use client";

import type { SignalTag } from "@/lib/overview/build-signal-tags";
import { CATEGORY_IDS, type OverviewCategoryId } from "@/lib/overview/constants";
import type { OverviewApiResponse } from "@/lib/overview/types";
import { overviewScoreTier } from "./overview-theme";

function focusTrackMeta(
  category: OverviewApiResponse["categories"][0],
  tag: SignalTag | undefined,
): string {
  if (tag) {
    if (tag.urgency === "urgent" && tag.risk_count > 0) {
      return `${tag.label} · ${tag.risk_count} new risk${tag.risk_count === 1 ? "" : "s"} detected`;
    }
    return `${tag.label} · ${tag.suffix}`;
  }
  return `${category.label} · ${category.statusLabel}`;
}

function FocusTrackBar({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  return (
    <>
      <span className="sc-adv-focus-bar-track" aria-hidden="true">
        <span className="sc-adv-focus-bar-fill" style={{ width: `${clamped}%` }} />
      </span>
      <strong className="sc-adv-focus-bar-pct">{clamped}%</strong>
    </>
  );
}

function RecCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7.2 5.4 10.2 11.5 3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RecTypeIcon({ type }: { type: "benchmark" | "sources" | "details" }) {
  if (type === "benchmark") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2.5 11.5V7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M7 11.5V3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M11.5 11.5V6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "sources") {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <rect x="3" y="2.5" width="8" height="9" rx="1.4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 5.5h4M5 8h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 4h8M3 7h8M3 10h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function OverviewAdvisorPanel({
  companyName,
  advisor,
  categories,
  open,
  onToggle,
  onEditBenchmark,
  onAddSources,
  onViewDetails,
  onOpenTrack,
  onOpenFullSummary,
  tourHighlight = false,
  tourHighlightRecommended = false,
  detailsDisabled = false,
}: {
  companyName: string;
  advisor: NonNullable<OverviewApiResponse["advisor"]>;
  categories: OverviewApiResponse["categories"];
  open: boolean;
  onToggle: () => void;
  onEditBenchmark?: () => void;
  onAddSources?: () => void;
  onViewDetails?: () => void;
  onOpenTrack?: (categoryId: OverviewCategoryId) => void;
  onOpenFullSummary?: (highlightRefId?: number) => void;
  tourHighlight?: boolean;
  tourHighlightRecommended?: boolean;
  detailsDisabled?: boolean;
}) {
  const actions = advisor.recommendedActions ?? [];
  const openCount = actions.filter((action) => !action.done).length;
  const nextType = actions.find((action) => !action.done)?.action_type;
  const tagsById = new Map((advisor.signalTags ?? []).map((tag) => [tag.category_id, tag]));

  const handlerForAction = (actionType: string) => {
    if (actionType === "benchmark") return onEditBenchmark;
    if (actionType === "sources") return onAddSources;
    if (detailsDisabled) return undefined;
    return onViewDetails;
  };

  const ctaDisabled = (actionType: string) =>
    detailsDisabled && actionType !== "benchmark" && actionType !== "sources";

  const sourceCount = categories.reduce((sum, cat) => sum + cat.intelligenceCount, 0);
  const orderedCategories = CATEGORY_IDS.flatMap((id) => {
    const cat = categories.find((c) => c.categoryId === id);
    return cat ? [cat] : [];
  });

  return (
    <div
      className={`sc-adv-featured-wrap sc-overview-advisor-wrap${open ? "" : " is-collapsed"}${tourHighlight ? " fuel-tour-highlight" : ""}`}
      data-tour-target="ai-advisor"
    >
      <div className="sc-adv-featured-border" aria-hidden="true" />
      <div
        className="sc-adv-featured-toggle sc-overview-advisor-toggle"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={open}
      >
        <span className="sc-adv-featured-toggle-label">✦ Fuel AI · Advisor</span>
        <span className="sc-adv-featured-toggle-meta">{companyName}</span>
        <span className="sc-adv-featured-chev" aria-hidden="true">
          ▾
        </span>
        {!open ? (
          <p className="sc-adv-featured-collapsed-hint">
            Tap to open summary and recommended actions
          </p>
        ) : null}
      </div>
      {open ? (
        <div className="sc-adv-featured sc-adv-featured-split">
          <div className="sc-adv-featured-brief-col">
            {orderedCategories.length > 0 ? (
              <section className="sc-adv-focus" aria-label="Prominent focus tracks">
                <div className="sc-adv-rec-title">Prominent focus tracks</div>
                <div className="sc-adv-focus-grid">
                  {orderedCategories.map((category) => {
                    const tag = tagsById.get(category.categoryId);
                    const tier = overviewScoreTier(category.score);
                    const meta = focusTrackMeta(category, tag);
                    return (
                      <button
                        key={category.categoryId}
                        type="button"
                        className={`sc-adv-focus-card is-${tier}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTrack?.(category.categoryId);
                        }}
                        aria-label={`${category.fullLabel}, ${category.score} percent, ${meta}. Scroll to track.`}
                      >
                        <span className="sc-adv-focus-card-copy">
                          <strong className="sc-adv-focus-card-title">
                            <span className="sc-adv-focus-card-title-full">
                              {category.fullLabel}
                            </span>
                            <span className="sc-adv-focus-card-title-short">
                              {category.label}
                            </span>
                          </strong>
                          <span className="sc-adv-focus-card-meta">{meta}</span>
                        </span>
                        <FocusTrackBar score={category.score} />
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
            <div className="sc-adv">
              <div className="sc-adv-rec-title-row">
                <div className="sc-adv-rec-title">Summary</div>
                <span className="sc-wiki-source-count">
                  {sourceCount} source{sourceCount === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  className="ask-ai-btn sc-wiki-expand-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFullSummary?.();
                  }}
                  aria-label="Open company brief"
                >
                  ✦ Open brief
                </button>
              </div>
              <p className="sc-adv-summary sc-wiki-summary-compact">{advisor.summary}</p>
            </div>
          </div>
          <div className="sc-adv-featured-rec-col">
            <div
              className={`sc-adv-rec-spotlight${tourHighlightRecommended ? " fuel-tour-highlight" : ""}`}
              data-tour-target="recommended-actions"
            >
              <div className="sc-adv-rec-title-row">
                <div className="sc-adv-rec-title">Recommended Actions</div>
                {actions.length > 0 ? (
                  <span className="sc-adv-rec-count">
                    {openCount === 0 ? "All current" : `${openCount} open`}
                  </span>
                ) : null}
              </div>
              {actions.length === 0 ? (
                <p className="sc-adv-rec-empty">No recommended actions right now.</p>
              ) : (
                <ul className="sc-adv-rec-list">
                  {actions.map((action, i) => {
                    const disabled = ctaDisabled(action.action_type);
                    const isNext = !action.done && action.action_type === nextType;
                    const filled = action.progressFilled;
                    const total = action.progressTotal;
                    const showMeter =
                      typeof filled === "number" &&
                      typeof total === "number" &&
                      total > 0 &&
                      filled < total;
                    const pct = showMeter
                      ? Math.min(100, Math.round((filled / total) * 100))
                      : 0;
                    return (
                      <li key={`${action.action_type}-${i}`}>
                        <button
                          type="button"
                          className={`sc-adv-rec-item${isNext ? " is-next" : ""}${action.done ? " is-done" : ""}${disabled ? " is-disabled" : ""}`}
                          disabled={disabled}
                          aria-label={`${action.title}. ${action.cta}`}
                          onClick={() => handlerForAction(action.action_type)?.()}
                        >
                          <span className="sc-adv-rec-mark" aria-hidden="true">
                            {action.done ? <RecCheckIcon /> : <RecTypeIcon type={action.action_type} />}
                          </span>
                          <span className="sc-adv-rec-body">
                            <strong className="sc-adv-rec-name">{action.title}</strong>
                            <span className="sc-adv-rec-sub">{action.sub}</span>
                            {showMeter ? (
                              <span className="sc-adv-rec-meter-row">
                                <span
                                  className="sc-adv-rec-meter"
                                  role="meter"
                                  aria-label={`${filled} of ${total}`}
                                  aria-valuemin={0}
                                  aria-valuemax={total}
                                  aria-valuenow={filled}
                                >
                                  <span
                                    className="sc-adv-rec-meter-fill"
                                    style={{ width: `${pct}%` }}
                                  />
                                </span>
                                <span className="sc-adv-rec-meter-count">
                                  {filled}/{total}
                                </span>
                              </span>
                            ) : null}
                            <span className="sc-adv-rec-cta">{action.cta}</span>
                          </span>
                          <span className="sc-adv-rec-chev" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
