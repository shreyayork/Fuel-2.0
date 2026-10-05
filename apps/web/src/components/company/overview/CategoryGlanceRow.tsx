"use client";

import { useId, useState } from "react";
import { overviewTrackSectionId } from "@/lib/overview/constants";
import { mqMax, useMediaQuery } from "@/lib/responsive";
import type { OverviewApiResponse } from "@/lib/overview/types";
import { CategoryGlanceHeaderBar } from "./CategoryGlanceHeaderBar";
import { GlanceFocusText } from "./GlanceFocusText";
import { GlanceScoreRing } from "./GlanceScoreRing";
import { overviewScoreTierColor } from "./overview-theme";
import {
  areTrackInsightsLocked,
  TopImprovementsPreview,
  TrackInsightPanel,
} from "./TrackInsightPanel";
const INSIGHT_PREVIEW_LIMIT = 3;

/** Match stacked track layout in scorecardCss (`max-width: 960px`). */
const TRACK_STACK_MAX = 960;

export function CategoryGlanceRow({
  category,
  companyUuid,
  updatedAt,
  onOpen,
  onOpenDrawer,
  profileUnlocked = true,
  onUnlockProfile,
  expanded = true,
  onToggleExpanded,
}: {
  category: OverviewApiResponse["categories"][0];
  companyUuid: string;
  updatedAt?: string | null;
  onOpen: () => void;
  onOpenDrawer: () => void;
  profileUnlocked?: boolean;
  onUnlockProfile?: () => void;
  /** When accordion mode is active, whether this card's details are shown. */
  expanded?: boolean;
  /** Toggle accordion expansion (phone/tablet stacked layout only). */
  onToggleExpanded?: () => void;
}) {
  const detailsId = useId();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const stackNarrow = useMediaQuery(mqMax(TRACK_STACK_MAX), false);
  const accordion = stackNarrow && Boolean(onToggleExpanded);
  const showDetails = !accordion || expanded;
  const statusColor = overviewScoreTierColor(category.score);

  const strengthItems = category.strengths.slice(0, INSIGHT_PREVIEW_LIMIT);
  const improvementItems = category.weaknesses.slice(0, INSIGHT_PREVIEW_LIMIT);
  const strengthMoreCount = Math.max(0, category.strengths.length - INSIGHT_PREVIEW_LIMIT);
  const improvementMoreCount = Math.max(0, category.weaknesses.length - INSIGHT_PREVIEW_LIMIT);
  const insightsLocked = areTrackInsightsLocked(category.detailAnsweredCount, profileUnlocked);

  return (
    <article
      id={overviewTrackSectionId(category.categoryId)}
      className={`sc-glance-row sc-glance-row--track sc-glance-row--ref is-track-${category.categoryId}${
        accordion ? (showDetails ? " is-expanded" : " is-collapsed") : ""
      }`}
      onClick={accordion ? undefined : onOpen}
      onKeyDown={
        accordion
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
      }
      role={accordion ? undefined : "button"}
      tabIndex={accordion ? undefined : 0}
      aria-label={
        accordion
          ? undefined
          : `${category.fullLabel}, ${category.score} out of 100, ${category.statusLabel}. Open track details.`
      }
    >
      {showDetails ? (
        <CategoryGlanceHeaderBar category={category} onUpdateDetails={onOpenDrawer} />
      ) : null}
      <div className="sc-glance-track-body">
        <div
          className="sc-glance-track-lead"
          onClick={
            accordion && !showDetails
              ? (e) => {
                  e.stopPropagation();
                  onToggleExpanded?.();
                }
              : undefined
          }
        >
          <GlanceScoreRing
            category={category}
            score={category.score}
            isOpen={popoverOpen}
            onToggle={() => setPopoverOpen((v) => !v)}
            companyUuid={companyUuid}
            updatedAt={updatedAt}
            className="sc-glance-ring-wrap--ref"
          />
          <div className="sc-glance-track-lead-copy">
            <div className="sc-glance-track-lead-head">
              <div className="sc-glance-track-lead-text">
                <h3 className="sc-glance-track-title-link">
                  {accordion ? (
                    <button
                      type="button"
                      className="sc-glance-track-title-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!showDetails) {
                          onToggleExpanded?.();
                          return;
                        }
                        onOpen();
                      }}
                    >
                      <span className="sc-glance-track-title-short">{category.label}</span>
                      <span className="sc-glance-track-title-full">
                        {category.label} — {category.fullLabel}
                      </span>
                      {showDetails ? <span aria-hidden="true"> →</span> : null}
                    </button>
                  ) : (
                    <>
                      {category.label} — {category.fullLabel}{" "}
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </h3>
                {accordion && !showDetails ? (
                  <p className="sc-glance-track-status-inline" style={{ color: statusColor }}>
                    {category.statusLabel}
                  </p>
                ) : null}
              </div>
              {accordion ? (
                <button
                  type="button"
                  className="sc-glance-track-expand"
                  aria-expanded={showDetails}
                  aria-controls={detailsId}
                  aria-label={
                    showDetails
                      ? `Collapse ${category.fullLabel} details`
                      : `Expand ${category.fullLabel} details`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpanded?.();
                  }}
                >
                  <span className="sc-glance-track-expand-chev" aria-hidden="true">
                    ▾
                  </span>
                </button>
              ) : null}
            </div>
            {accordion && !showDetails ? (
              <p className="sc-glance-track-collapsed-hint">
                {category.focusNarrative?.trim()
                  ? category.focusNarrative.trim()
                  : "Tap to see strengths, gaps, and what to do next"}
              </p>
            ) : null}
            {showDetails && category.focusNarrative ? (
              <GlanceFocusText text={category.focusNarrative} />
            ) : null}
          </div>
        </div>
        {showDetails ? (
          <div id={detailsId} className="sc-glance-track-details">
            <div className="sc-glance-track-mid">
              <TrackInsightPanel
                tone="strong"
                title="Primary strengths"
                items={strengthItems}
                empty="Complete more track details to surface strengths."
                compact
                moreCount={strengthMoreCount}
              />
            </div>
            <div className="sc-glance-track-improve sc-glance-track-improve-panel">
              <TopImprovementsPreview
                trackLabel={category.label}
                items={improvementItems}
                insightsLocked={insightsLocked}
                onCompleteProfile={onUnlockProfile ?? onOpenDrawer}
                limit={INSIGHT_PREVIEW_LIMIT}
                moreCount={improvementMoreCount}
              />
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
