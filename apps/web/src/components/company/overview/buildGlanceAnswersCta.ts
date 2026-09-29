export type GlanceAnswersCtaTone = "empty" | "partial" | "almost" | "complete";

export interface GlanceAnswersCta {
  label: string;
  meta: string;
  tone: GlanceAnswersCtaTone;
}

/** Matches Design/src/app/ScorecardV2.tsx buildGlanceAnswersCta */
export function buildGlanceAnswersCta(
  trackLabel: string,
  answered: number,
  total: number,
): GlanceAnswersCta {
  const remaining = Math.max(0, total - answered);

  if (total === 0) {
    return { label: `Update ${trackLabel} details`, meta: "", tone: "empty" };
  }

  if (answered === 0) {
    return {
      label: `Complete ${trackLabel} details`,
      meta: `${total} questions · unlocks a sharper score`,
      tone: "empty",
    };
  }

  if (remaining === 0) {
    return {
      label: `Review ${trackLabel} details`,
      meta: "update anytime",
      tone: "complete",
    };
  }

  if (remaining === 1) {
    return {
      label: `Finish ${trackLabel} details`,
      meta: "1 question left · biggest score lift now",
      tone: "almost",
    };
  }

  if (remaining <= 2) {
    return {
      label: `Finish ${trackLabel} details`,
      meta: `${remaining} questions left`,
      tone: "almost",
    };
  }

  if (answered >= Math.ceil(total / 2)) {
    return {
      label: `Finish ${trackLabel} details`,
      meta: `${answered} of ${total} answered · ${remaining} to go`,
      tone: "partial",
    };
  }

  return {
    label: `Complete ${trackLabel} details`,
    meta: `${answered} of ${total} answered · ${remaining} remaining`,
    tone: "partial",
  };
}
