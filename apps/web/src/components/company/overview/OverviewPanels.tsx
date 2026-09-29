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

function FocusTrackRing({ score }: { score: number }) {
  const size = 44;
  const stroke = 4.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="sc-adv-focus-ring" aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="sc-adv-focus-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="sc-adv-focus-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <strong className="sc-adv-focus-ring-label">{clamped}%</strong>
    </div>
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
                          <strong className="sc-adv-focus-card-title">{category.fullLabel}</strong>
                          <span className="sc-adv-focus-card-meta">{meta}</span>
                        </span>
                        <FocusTrackRing score={category.score} />
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
              <div className="sc-adv-rec-title">Recommended Actions</div>
              <ol className="sc-adv-rec-list">
                {actions.map((action, i) => (
                  <li key={`${action.action_type}-${i}`} className="sc-adv-rec-item">
                    <span className={`sc-adv-rec-num${action.done ? " is-done" : ""}`}>{i + 1}</span>
                    <div className="sc-adv-rec-body">
                      <strong className="sc-adv-rec-name">{action.title}</strong>
                      <p className="sc-adv-rec-sub">{action.sub}</p>
                    </div>
                    <button
                      type="button"
                      className={`sc-adv-rec-cta${ctaDisabled(action.action_type) ? " is-disabled" : ""}`}
                      disabled={ctaDisabled(action.action_type)}
                      aria-disabled={ctaDisabled(action.action_type)}
                      onClick={() => handlerForAction(action.action_type)?.()}
                    >
                      {action.cta} <span aria-hidden="true">→</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
