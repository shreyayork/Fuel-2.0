import type { DetailAnswers } from "./trackQuestions.ts";

export function loadDetailAnswers(companyKey: string): DetailAnswers {
  try {
    const raw = window.localStorage.getItem(`fuel-details-${companyKey}`);
    return raw ? (JSON.parse(raw) as DetailAnswers) : {};
  } catch {
    return {};
  }
}

export function saveDetailAnswers(companyKey: string, answers: DetailAnswers) {
  try {
    window.localStorage.setItem(`fuel-details-${companyKey}`, JSON.stringify(answers));
  } catch {
    /* ignore quota errors in preview */
  }
}
