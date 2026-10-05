"use client";

import type { OverviewApiResponse } from "@/lib/overview/types";
import { buildGlanceAnswersCta, type GlanceAnswersCta } from "./buildGlanceAnswersCta";

export function CategoryGlanceHeaderBar({
  category,
  answersCta: answersCtaProp,
  onUpdateDetails,
}: {
  category: OverviewApiResponse["categories"][0];
  answersCta?: GlanceAnswersCta;
  onUpdateDetails?: () => void;
}) {
  if (!onUpdateDetails) return null;

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
    </div>
  );
}
