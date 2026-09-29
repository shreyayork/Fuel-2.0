import {
  CATEGORY_META,
  type OverviewCategoryId,
} from "@/lib/overview/constants";
import {
  DETAIL_QUESTION_LABEL,
  TRACK_DETAIL_SECTIONS,
  formatDetailAnswerDisplay,
  getVisibleQuestions,
  parseMultiSelectAnswer,
  type DetailAnswers,
} from "@/lib/overview/detail-question-catalog";
import { isUnknownAnswer } from "@/lib/onboard/unknown-answer";

export type TrackFormQaStatus = "answered" | "unknown" | "unanswered";

export type TrackFormQaQuestion = {
  id: string;
  question: string;
  label: string;
  options?: string[];
  multi: boolean;
  answer: string | null;
  selected: string[];
  status: TrackFormQaStatus;
};

export type TrackFormQaForm = {
  form: string;
  category_id: OverviewCategoryId;
  questions: TrackFormQaQuestion[];
};

export type TrackFormQaPayload = {
  forms: TrackFormQaForm[];
};

const PROMPT_PREAMBLE = `FOUNDER OVERVIEW FORMS (R&D / GTM / G&A):
Founder-supplied questionnaire. Each item includes the question, allowed options, and the selected answer. Treat status "unanswered" and "unknown" as gaps — do not invent values.`;

function questionStatus(raw: string | null | undefined): TrackFormQaStatus {
  const value = raw?.trim();
  if (!value) return "unanswered";
  if (isUnknownAnswer(value)) return "unknown";
  return "answered";
}

function serializeQuestion(
  id: string,
  prompt: string,
  options: readonly string[] | undefined,
  multi: boolean,
  raw: string | null | undefined,
): TrackFormQaQuestion {
  const status = questionStatus(raw);
  const entry: TrackFormQaQuestion = {
    id,
    question: prompt,
    label: DETAIL_QUESTION_LABEL[id] ?? prompt,
    multi,
    answer: status === "unanswered" ? null : formatDetailAnswerDisplay(raw),
    selected: status === "answered" ? parseMultiSelectAnswer(raw ?? undefined) : [],
    status,
  };
  if (options && options.length > 0) entry.options = [...options];
  return entry;
}

function hasFilledTrackAnswers(payload: TrackFormQaPayload): boolean {
  return payload.forms.some((form) =>
    form.questions.some((q) => q.status === "answered" || q.status === "unknown"),
  );
}

/** Join visible R&D / GTM / G&A questions with options and founder answers. */
export function buildTrackFormQaPayload(
  answers: DetailAnswers,
): TrackFormQaPayload | null {
  const forms: TrackFormQaForm[] = TRACK_DETAIL_SECTIONS.map((section) => {
    const categoryId = section.id;
    return {
      form: CATEGORY_META[categoryId].label,
      category_id: categoryId,
      questions: getVisibleQuestions(section, answers).map((q) =>
        serializeQuestion(q.id, q.prompt, q.options, q.multi === true, answers[q.id]),
      ),
    };
  }).filter((form) => form.questions.length > 0);

  const payload: TrackFormQaPayload = { forms };
  if (!hasFilledTrackAnswers(payload)) return null;
  return payload;
}

export function formatTrackFormQaPromptBlock(payload: TrackFormQaPayload): string {
  return `${PROMPT_PREAMBLE}\n\n${JSON.stringify(payload, null, 2)}`;
}

/**
 * Load merged overview answers and format the playbook prompt appendix.
 * Returns null when nothing is filled (no empty 45-question dump).
 */
export async function loadTrackFormQaPromptBlock(opts: {
  accountId: string;
  companyUuid: string;
}): Promise<string | null> {
  const { loadMergedAnswers } = await import("@/lib/overview/map-input");
  const answers = await loadMergedAnswers(opts);
  const payload = buildTrackFormQaPayload(answers);
  if (!payload) return null;
  return formatTrackFormQaPromptBlock(payload);
}
