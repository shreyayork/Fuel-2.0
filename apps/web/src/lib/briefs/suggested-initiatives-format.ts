/**
 * Shared markdown shape for Research / Generate Brief / playbook suggested
 * initiatives — mirrors Overview / Data Room fields (description, benefit,
 * milestones, sources) in a parseable bullet block.
 *
 * Consumed by {@link splitBriefSuggestions} and playbook run prompts.
 */

export const SUGGESTED_INITIATIVES_MARKDOWN_FORMAT = `## Suggested initiatives

Emit 3–5 concrete initiatives. Each item MUST use this exact field layout (Overview / Data Room parity):

1. **Specific actionable title**
   description: 1–3 sentences on what to do and why (tied to evidence).
   benefit: Value of completing this initiative — 2–4 short bullets, one per benefit: line.
   kind: continuous|onetime
   area: gtm|product|finance|people|ops|other
   milestone: Short actionable step | MM-DD-YYYY
   milestone: Another step | MM-DD-YYYY
   source: Concrete provenance (signal name + period, cohort benchmark, document title, or playbook finding). Never invent citations.

Rules:
- Include 2–4 milestone: lines per initiative. due dates as MM-DD-YYYY on or after today; stagger forward.
- Include 1–3 source: lines when evidence exists. If evidence is thin, omit source: rather than fabricating.
- benefit: lines are founder-facing value (not AI/process meta).
- Do not put candidates only under "Recommended next steps" — Research Review needs this section.`;

/** Append shared format block (playbook runs). */
export function withSuggestedInitiativesFormat(prompt: string): string {
  return `${prompt.trim()}\n\n---\n## Suggested initiatives formatting (CRITICAL when recommending initiatives)\nWhen this playbook asks you to recommend initiatives or next-step actions that could become company_initiatives, end the artifact with:\n\n${SUGGESTED_INITIATIVES_MARKDOWN_FORMAT}`;
}
