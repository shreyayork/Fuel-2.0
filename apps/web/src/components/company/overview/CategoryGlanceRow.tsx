"use client";

import { useState } from "react";
import { overviewTrackSectionId } from "@/lib/overview/constants";
import type { OverviewApiResponse } from "@/lib/overview/types";
import { CategoryGlanceHeaderBar } from "./CategoryGlanceHeaderBar";
import { GlanceFocusText } from "./GlanceFocusText";
import { GlanceScoreRing } from "./GlanceScoreRing";
import {
  areTrackInsightsLocked,
  TopImprovementsPreview,
  TrackInsightPanel,
} from "./TrackInsightPanel";
import type { CategoryDetailScrollTarget } from "./CategoryDetailView";

const INSIGHT_PREVIEW_LIMIT = 3;

export function CategoryGlanceRow({
  category,
  companyUuid,
  updatedAt,
  onOpen,
  onOpenDrawer,
  onOpenSection,
  profileUnlocked = true,
  onUnlockProfile,
}: {
  category: OverviewApiResponse["categories"][0];
  companyUuid: string;
  updatedAt?: string | null;
  onOpen: () => void;
  onOpenDrawer: () => void;
  /** Open this track's detail page and scroll to Initiatives / Intelligence / Playbooks. */
  onOpenSection: (section: CategoryDetailScrollTarget) => void;
  profileUnlocked?: boolean;
  onUnlockProfile?: () => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const strengthItems = category.strengths.slice(0, INSIGHT_PREVIEW_LIMIT);
  const improvementItems = category.weaknesses.slice(0, INSIGHT_PREVIEW_LIMIT);
  const strengthMoreCount = Math.max(0, category.strengths.length - INSIGHT_PREVIEW_LIMIT);
  const improvementMoreCount = Math.max(0, category.weaknesses.length - INSIGHT_PREVIEW_LIMIT);
  const insightsLocked = areTrackInsightsLocked(category.detailAnsweredCount, profileUnlocked);

  return (
    <article
      id={overviewTrackSectionId(category.categoryId)}
      className="sc-glance-row sc-glance-row--track sc-glance-row--ref"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${category.fullLabel}, ${category.score} out of 100, ${category.statusLabel}. Open track details.`}
    >
      <CategoryGlanceHeaderBar
        category={category}
        onUpdateDetails={onOpenDrawer}
        onOpenIntelligence={() => onOpenSection("intelligence")}
        onOpenInitiatives={() => onOpenSection("initiatives")}
        onRunPlaybook={() => onOpenSection("playbooks")}
      />
      <div className="sc-glance-track-body">
        <div className="sc-glance-track-lead">
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
            <h3 className="sc-glance-track-title-link">
              {category.label} — {category.fullLabel} <span aria-hidden="true">→</span>
            </h3>
            {category.focusNarrative ? <GlanceFocusText text={category.focusNarrative} /> : null}
          </div>
        </div>
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
    </article>
  );
}
