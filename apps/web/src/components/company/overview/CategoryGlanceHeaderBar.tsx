"use client";

import type { OverviewApiResponse } from "@/lib/overview/types";
import { buildGlanceAnswersCta, type GlanceAnswersCta } from "./buildGlanceAnswersCta";

function countLabel(count: number, zeroLabel: string, singular: string, plural: string): string {
  if (count <= 0) return zeroLabel;
  return `${count} ${count === 1 ? singular : plural}`;
}

export function CategoryGlanceHeaderBar({
  category,
  answersCta: answersCtaProp,
  onUpdateDetails,
  onOpenIntelligence,
  onOpenInitiatives,
  onRunPlaybook,
}: {
  category: OverviewApiResponse["categories"][0];
  answersCta?: GlanceAnswersCta;
  onUpdateDetails?: () => void;
  onOpenIntelligence?: () => void;
  onOpenInitiatives?: () => void;
  onRunPlaybook?: () => void;
}) {
  const answersCta =
    answersCtaProp ??
    buildGlanceAnswersCta(
      category.label,
      category.detailAnsweredCount,
      category.detailQuestionCount,
    );
  const answeredMeta =
    category.detailQuestionCount > 0
      ? `${category.detailAnsweredCount} of ${category.detailQuestionCount} answered`
      : answersCta.meta || null;

  return (
    <div className="sc-glance-header-bar" onClick={(e) => e.stopPropagation()}>
      <div className="sc-glance-header-bar-start">
        <div className="sc-glance-meta-badges">
          <button type="button" className="sc-glance-meta-badge" onClick={() => onOpenInitiatives?.()}>
            {countLabel(category.initiativeCount, "Initiatives", "initiative", "initiatives")}{" "}
            <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            className="sc-glance-meta-badge"
            onClick={() => onOpenIntelligence?.()}
          >
            {countLabel(category.intelligenceCount, "Intelligence", "Intelligence", "Intelligence")}{" "}
            <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="sc-glance-meta-badge" onClick={() => onRunPlaybook?.()}>
            {countLabel(category.playbookCount, "Playbooks", "playbook", "playbooks")}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      {onUpdateDetails ? (
        <div className="sc-glance-header-bar-end">
          {answeredMeta ? <p className="sc-glance-header-bar-answered">{answeredMeta}</p> : null}
          <button
            type="button"
            className="sc-glance-details-link"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateDetails();
            }}
          >
            {answersCta.label} <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
