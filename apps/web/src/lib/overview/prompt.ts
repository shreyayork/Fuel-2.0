import "server-only";
import { formatMilestoneDueDate } from "@/lib/initiative-milestone-dates";
import {
  DEFAULT_OVERVIEW_GENERATION_PROMPT,
  INTELLIGENCE_VALUE_TYPE_RULES,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { OVERVIEW_GENERATION_SLUG } from "@/lib/system-playbooks/slugs";
import {
  stripYorkHelpPromptAppendix,
  yorkHelpPromptAppendix,
  type YorkHelpServiceCatalog,
} from "@/lib/york-help/catalog-data";

export async function loadOverviewPromptTemplate(): Promise<{
  playbookId: string | null;
  template: string;
}> {
  return loadSystemPlaybookTemplate(
    OVERVIEW_GENERATION_SLUG,
    DEFAULT_OVERVIEW_GENERATION_PROMPT,
  );
}

export function hydratePrompt(
  template: string,
  input: Record<string, unknown>,
  now: Date = new Date(),
  yorkHelpCatalog?: YorkHelpServiceCatalog,
): string {
  const asOfDate = formatMilestoneDueDate(now);
  const asOfIso = now.toISOString().slice(0, 10);
  const inputWithAsOf: Record<string, unknown> = {
    ...input,
    as_of_date: asOfDate,
    as_of_iso: asOfIso,
  };
  const catalog = Array.isArray(inputWithAsOf.playbook_catalog)
    ? inputWithAsOf.playbook_catalog
    : [];
  const signalCatalog = Array.isArray(inputWithAsOf.signal_catalog)
    ? inputWithAsOf.signal_catalog
    : [];
  const detailQuestionCatalog = Array.isArray(inputWithAsOf.detail_question_catalog)
    ? inputWithAsOf.detail_question_catalog
    : [];
  const playbookRules =
    catalog.length > 0
      ? `

PLAYBOOK RULES:
- You MUST return suggested_playbooks with 3-6 items.
- Each item needs playbook_slug, reason, and category_id (exactly one of: dev, mkt, rev).
- playbook_slug MUST be copied exactly from INPUT.playbook_catalog[].slug — never invent slugs.
- Prefer 1-2 playbooks per category_id.`
      : "";

  const intelligenceRules =
    signalCatalog.length > 0
      ? `

INTELLIGENCE RULES:
- Return intelligence only when evidence supports it (0 items is fine when INPUT.benchmark is empty or sparse — fewer high-quality items beat inventing placeholders).
- Every item MUST include signal_id copied exactly from INPUT.signal_catalog[].id — never invent signal ids.
- Each item also needs category_id (dev|mkt|rev) and text (why it matters). Fill the typed value field from INPUT.signal_catalog[].value_field (value_numeric | value_text | value_bool) — do not put the typed value in a freeform highlight string.
- Set evidence_source from the INPUT that actually supports the item: INPUT.company / profile_* answers → profile; track detail answers → form; INPUT.active_documents → document. Omit evidence_source when the item is a logged INPUT.benchmark metric (server labels it Benchmark).
- At most one intelligence item per signal_id. Prefer catalog signals that match concrete evidence in INPUT.
- Never invent placeholder values like "Unknown", "N/A", or "I don't know". If a metric is null/missing in INPUT.benchmark, omit that signal entirely.
- For quantitative catalog signals that map to INPUT.benchmark keys, only include the signal when that value is non-null — copy the number into value_numeric.
- If no catalog signal fits a candidate, omit it.

${INTELLIGENCE_VALUE_TYPE_RULES}`
      : "";

  const detailQuestionRules =
    detailQuestionCatalog.length > 0
      ? `

DETAIL QUESTION RULES:
- INPUT.detail_question_catalog maps every answer key to its prompt, label, options, multi flag, and category_id.
- When interpreting INPUT.answers, look up the question by id in that catalog — do not guess meaning from the id string alone.
- For multi: true answers, values may be delimiter-joined selections; treat each selected option as evidence.
- Prefer options/prompts from the catalog when referencing founder answers in narratives and recommendations.`
      : "";

  const unknownIds = Array.isArray(inputWithAsOf.unknown_question_ids)
    ? inputWithAsOf.unknown_question_ids
    : [];
  const unknownRules =
    unknownIds.length > 0
      ? `

UNKNOWN ANSWER RULES:
- INPUT.unknown_question_ids (${unknownIds.length} ids) were marked "I don't know / NA" by the founder.
- Do not invent values, metrics, or conclusions for those fields.
- You may recommend filling those gaps when it improves the overview.`
      : "";

  const company = inputWithAsOf.company;
  const companyRules =
    company && typeof company === "object"
      ? `

COMPANY PROFILE RULES:
- INPUT.company is the source of truth for identity: name, productDescription, industry, headquarters, stage, businessModel, additionalContext.
- Ground advisor.summary, category insights, and initiatives in INPUT.company. Name the real product and sector.
- Do not invent a different company type (e.g. do not call an investment or operating firm a B2B SaaS platform).
- INPUT.cohortKey is the peer set for metric comparison only — it must not override INPUT.company.industry or productDescription.
- Use INPUT.company.additionalContext and INPUT.founderNarrative as founder-provided operating context, not as license to invent facts.`
      : "";

  const initiativeRules = `

INITIATIVE RULES:
- You MUST return suggested_initiatives with 2-3 items per category (dev, mkt, rev) — prioritise the highest-leverage 1–3 overall when evidence is thin.
- Each item MUST include: title (specific, actionable, never the word "Initiative" alone), description, benefit, category_id (dev|mkt|rev), cadence (one-time|recurring), milestones, york_help.
- milestones MUST be an array of 2-4 objects with shape { "title": string, "due_date": "MM-DD-YYYY", "checked": false }. Never return "milestones": [].
- Today is INPUT.as_of_date (${asOfDate}, ISO ${asOfIso}). Every milestone due_date MUST be on or after that date — never invent prior-year or past dates (e.g. do not use 2025 when today is 2026).
- Stagger due_dates forward across milestones (roughly +1 to +3 months apart) so the sequence is actionable from today.
- Milestone titles are concrete execution steps (e.g. "Map ICP disqualify criteria", "Pilot new outbound sequence on 25 accounts"), not the initiative title itself.
- Titles should read like work the operating team can run (e.g. "Tighten ICP qualification", "Cut burn via cloud rightsizing").
- Ground suggestions in INPUT.active_intelligence, INPUT.active_documents, benchmark gaps, and profile completeness. Prefer gap areas and important document-only findings before strengths.
- Tag every related intelligence item: set tagged_intelligence_types to all matching types or signal ids from INPUT.active_intelligence[].type / generated intelligence. Multiple tags are expected when several insights motivate the same initiative.
- If no intelligence is related, set tagged_intelligence_types to [] (or tagged_intelligence_type to null). Untagged generated intelligence will not be saved.
- When an uploaded document contains an important initiative but no matching intelligence type exists, still suggest the initiative, leave tagged_intelligence_types empty, and include source_documents with title (and id from INPUT.active_documents when possible).
- Include benefit as 2–4 short bullets (one per line) stating the value of completing this initiative — why it helps the company. Do not mention AI, prompts, or Fuel internals. Prefer priority "high" for the top leverage items.

${yorkHelpPromptAppendix(undefined, yorkHelpCatalog)}`;

  return `${stripYorkHelpPromptAppendix(template)}\n\nINPUT:\n${JSON.stringify(inputWithAsOf, null, 2)}${companyRules}${playbookRules}${intelligenceRules}${detailQuestionRules}${unknownRules}${initiativeRules}`;
}
