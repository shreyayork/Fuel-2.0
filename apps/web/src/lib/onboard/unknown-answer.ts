/** Machine-readable value persisted when the user selects {@link ONBOARD_UNKNOWN_LABEL}. */
export const ONBOARD_UNKNOWN_ANSWER = "__unknown__";

/** User-facing label for unknown answers in the onboarding UI. */
export const ONBOARD_UNKNOWN_LABEL = "I don't know / NA";

/** Summary label for right-panel motion cards — same copy as {@link ONBOARD_UNKNOWN_LABEL}. */
export const ONBOARD_UNKNOWN_DISPLAY = ONBOARD_UNKNOWN_LABEL;

/** Input placeholder when a field is marked unknown. */
export const ONBOARD_UNKNOWN_PLACEHOLDER = `Marked as ${ONBOARD_UNKNOWN_LABEL}`;

export const ONBOARD_UNKNOWN_MEANING =
  "Fuel will refine this as you use the platform.";

export function isUnknownAnswer(value: string | undefined | null): boolean {
  return value === ONBOARD_UNKNOWN_ANSWER;
}

/** True when the user has selected an option or explicitly marked unknown. */
export function isAnswered(value: string | undefined | null): boolean {
  if (!value) return false;
  return true;
}

/** True when value is a real answer (not empty, not unknown). */
export function isKnownAnswer(value: string | undefined | null): boolean {
  return !!value && !isUnknownAnswer(value);
}

/**
 * Split persisted answers for model prompts: known values only, plus ids the
 * founder explicitly marked {@link ONBOARD_UNKNOWN_ANSWER}. Empty/null omitted.
 * Does not mutate storage — Bedrock/LLM input only.
 */
export function partitionAnswersForModel(
  answers: Record<string, string | null | undefined>,
): {
  known: Record<string, string>;
  unknownIds: string[];
} {
  const known: Record<string, string> = {};
  const unknownIds: string[] = [];
  for (const [id, raw] of Object.entries(answers)) {
    const value = raw?.trim();
    if (!value) continue;
    if (isUnknownAnswer(value)) {
      unknownIds.push(id);
      continue;
    }
    known[id] = value;
  }
  unknownIds.sort();
  return { known, unknownIds };
}

/** Map stored answer to human-readable card copy. */
export function formatOnboardAnswerDisplay(
  value: string | undefined | null,
): string | null {
  if (!value) return null;
  if (isUnknownAnswer(value)) return ONBOARD_UNKNOWN_DISPLAY;
  return value;
}

/** Unknown tile spans full grid row only when it would sit alone (odd total count). */
export function unknownOptionSpansFullWidth(
  optionCount: number,
  columns = 2,
): boolean {
  if (columns <= 1) return false;
  return (optionCount + 1) % columns !== 0;
}
