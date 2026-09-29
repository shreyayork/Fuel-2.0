/**
 * Parse suggested-initiative sections out of a research / briefing /
 * playbook_run artifact so Profile + Research can render Review rows
 * instead of flat markdown.
 *
 * Recognized headings (any #–#### level):
 * - Suggested initiatives
 * - Recommended initiatives
 * - Recommended next steps
 *
 * Rich items (Overview parity) use description / benefit / milestone / source
 * field lines under each **Title** bullet. Legacy one-liners still parse.
 */

import type { CompanyInitiativeSummary } from "@/components/views/CompanyPublicView";
import { pillarFromStored } from "@/components/company/initiatives/pillars";
import { isMilestoneDueDate } from "@/lib/initiative-milestone-dates";

export type BriefSuggestionMilestone = {
  title: string;
  dueDate: string | null;
};

export type BriefSuggestionSource = {
  title: string;
  typeLabel?: string | null;
};

export type BriefSuggestion = {
  title: string;
  /** Primary body shown as Description in the Review drawer. */
  description: string;
  /**
   * List-card snippet — same as description (kept for existing call sites).
   * @deprecated Prefer `description`.
   */
  rationale: string;
  kind: "continuous" | "onetime";
  area?: string;
  benefit: string | null;
  milestones: BriefSuggestionMilestone[];
  sources: BriefSuggestionSource[];
};

export type SplitBriefResult = {
  body: string;
  suggestions: BriefSuggestion[];
};

export type BriefSuggestionActionState =
  | "default"
  | "reviewing"
  | "creating"
  | "submitting"
  | "created"
  | "dismissed";

/** Stable key for UI state maps — title alone can collide within one brief. */
export function briefSuggestionKey(
  suggestion: Pick<BriefSuggestion, "title">,
  index: number,
): string {
  return `${index}:${suggestion.title}`;
}

/**
 * Durable identity for a suggestion within an artifact (refresh-safe).
 * Normalized title — index-based keys would break if bullets reorder.
 */
export function briefSuggestionPersistKey(
  suggestion: Pick<BriefSuggestion, "title">,
): string {
  return suggestion.title.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Map a markdown brief suggestion into the shape {@link SuggestedInitiativeReviewDrawer}
 * expects (description, benefit, milestones, sources).
 */
export function briefSuggestionToReviewItem(
  suggestion: BriefSuggestion,
  opts?: { ownerEmail?: string },
): CompanyInitiativeSummary {
  const now = new Date().toISOString();
  const pillar = pillarFromStored({ area: suggestion.area });
  const description = suggestion.description.trim() || suggestion.rationale.trim() || null;
  return {
    id: `brief:${suggestion.title}`,
    kind: suggestion.kind,
    name: suggestion.title,
    area: suggestion.area ?? "other",
    overviewCategoryId: pillar,
    description,
    status: "suggested",
    source: "brief",
    ownerEmail: opts?.ownerEmail?.trim() || "Unassigned",
    assignees: [],
    due: null,
    createdAt: now,
    updatedAt: now,
    advisors: [],
    progress: [],
    milestones: suggestion.milestones.map((m, i) => ({
      id: `brief-mst:${suggestion.title}:${i}`,
      label: m.title,
      status: "todo",
      dueDate: m.dueDate,
      note: null,
      completedAt: null,
    })),
    intelligenceLinks: [],
    sourceDocuments: suggestion.sources.map((s, i) => ({
      id: `brief-src:${suggestion.title}:${i}`,
      documentVersionId: null,
      title: s.title,
      typeLabel: s.typeLabel ?? null,
    })),
    sourceRationale: description,
    benefit: suggestion.benefit?.trim() || null,
    priority: null,
    baselineMetric: null,
    targetMetric: null,
    benchmarkCohort: null,
    yorkHelp: null,
    yorkHelpStatus: "idle",
    yorkHelpDismissed: false,
  };
}

const SUGGESTION_SECTION_HEADING_RE =
  /^#{1,4}\s*(?:suggested\s+initiatives?|recommended\s+initiatives?|recommended\s+next\s+steps)\s*$/im;

const ITEM_START_RE = /^(?:[-*]|\d+[.)])\s+(.*)$/;
const FIELD_RE =
  /^(?:[-*]\s+)?(description|benefit|kind|area|milestone|source|sources?)\s*:\s*(.*)$/i;

export function splitBriefSuggestions(content: string): SplitBriefResult {
  const match = content.match(SUGGESTION_SECTION_HEADING_RE);
  if (!match) return { body: content, suggestions: [] };
  const headingIdx = match.index ?? 0;
  const body = content.slice(0, headingIdx).trim();
  const sectionStart = headingIdx + match[0].length;
  const rest = content.slice(sectionStart);
  const nextHeadingIdx = rest.search(/\n#{1,4}\s+\S/);
  const sectionRaw = nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx);

  const lines = sectionRaw.split(/\r?\n/);
  const suggestions: BriefSuggestion[] = [];
  let draftLines: string[] | null = null;

  const flush = () => {
    if (!draftLines || draftLines.length === 0) {
      draftLines = null;
      return;
    }
    const parsed = parseSuggestionBlock(draftLines);
    draftLines = null;
    if (parsed) suggestions.push(parsed);
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      // Blank line ends a rich block only when we already have field lines;
      // keep collecting for legacy single-bullet + wrapped sentence.
      if (draftLines && draftLines.some((l) => FIELD_RE.test(l.trim()))) {
        flush();
      }
      continue;
    }
    const itemStart = trimmed.match(ITEM_START_RE);
    if (itemStart) {
      const remainder = itemStart[1] ?? "";
      // Nested field disguised as a list item: "- description: …"
      if (FIELD_RE.test(remainder)) {
        if (!draftLines) draftLines = [];
        draftLines.push(remainder);
        continue;
      }
      // New top-level item (usually **Title** …)
      flush();
      draftLines = [remainder];
      continue;
    }
    if (draftLines) {
      draftLines.push(trimmed);
    }
  }
  flush();

  return { body, suggestions };
}

/** Parse one suggestion from accumulated lines (title line + optional fields). */
export function parseSuggestionBlock(lines: string[]): BriefSuggestion | null {
  if (lines.length === 0) return null;
  const titleLine = lines[0]!.trim();
  const fieldLines = lines.slice(1);

  const hasStructuredFields = fieldLines.some((l) => FIELD_RE.test(l.trim()));
  if (!hasStructuredFields) {
    return parseSuggestionLine(lines.join(" "));
  }

  const boldMatch = titleLine.match(/\*\*(.+?)\*\*/);
  let title = boldMatch ? boldMatch[1].trim() : "";
  if (!title) {
    const firstSentence = titleLine.split(/[.!?—–-]/)[0]?.trim();
    if (!firstSentence) return null;
    title = firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}…` : firstSentence;
  }

  const descriptions: string[] = [];
  const benefits: string[] = [];
  const milestones: BriefSuggestionMilestone[] = [];
  const sources: BriefSuggestionSource[] = [];
  let kind: "continuous" | "onetime" = "continuous";
  let area: string | undefined;

  // Trailing prose on the title line after **Title** (legacy hybrid).
  const afterTitle = titleLine
    .replace(/\*\*(.+?)\*\*/, "")
    .replace(/^\s*[—–-]\s*/, "")
    .trim();
  if (afterTitle && !FIELD_RE.test(afterTitle)) {
    descriptions.push(afterTitle);
  }

  for (const raw of fieldLines) {
    const m = raw.trim().match(FIELD_RE);
    if (!m) {
      if (descriptions.length > 0) {
        descriptions[descriptions.length - 1] += ` ${raw.trim()}`;
      }
      continue;
    }
    const field = m[1]!.toLowerCase();
    const value = (m[2] ?? "").trim();
    if (!value) continue;

    if (field === "description") {
      descriptions.push(value);
    } else if (field === "benefit") {
      benefits.push(value);
    } else if (field === "kind") {
      kind = value.toLowerCase().startsWith("one") ? "onetime" : "continuous";
    } else if (field === "area") {
      const areaMatch = value.match(/\b(gtm|product|finance|people|ops|other)\b/i);
      if (areaMatch) area = areaMatch[1]!.toLowerCase();
    } else if (field === "milestone") {
      const parsed = parseMilestoneValue(value);
      if (parsed) milestones.push(parsed);
    } else if (field === "source" || field === "sources") {
      const src = parseSourceValue(value);
      if (src) sources.push(src);
    }
  }

  let description = descriptions.join(" ").replace(/\s{2,}/g, " ").trim();
  if (description.length > 800) description = description.slice(0, 797) + "…";
  const benefit = benefits.length > 0 ? benefits.join("\n") : null;

  return {
    title,
    description,
    rationale: description,
    kind,
    area,
    benefit,
    milestones,
    sources,
  };
}

function parseMilestoneValue(raw: string): BriefSuggestionMilestone | null {
  const pipe = raw.match(/^(.+?)\s*\|\s*(\d{2}-\d{2}-\d{4})\s*$/);
  if (pipe) {
    const title = pipe[1]!.trim();
    const due = pipe[2]!;
    if (!title) return null;
    return { title, dueDate: isMilestoneDueDate(due) ? due : null };
  }
  const dueMatch = raw.match(/^(.+?)\s*[—–-]\s*(?:due:?\s*)?(\d{2}-\d{2}-\d{4})\s*$/i);
  if (dueMatch) {
    const title = dueMatch[1]!.trim();
    const due = dueMatch[2]!;
    if (!title) return null;
    return { title, dueDate: isMilestoneDueDate(due) ? due : null };
  }
  const title = raw.trim();
  if (!title) return null;
  return { title, dueDate: null };
}

function parseSourceValue(raw: string): BriefSuggestionSource | null {
  const title = raw.trim();
  if (!title) return null;
  const typed = title.match(/^(signal|document|benchmark|cohort|observation)\s*[:·-]\s*(.+)$/i);
  if (typed) {
    return {
      title: typed[2]!.trim(),
      typeLabel: typed[1]!.charAt(0).toUpperCase() + typed[1]!.slice(1).toLowerCase(),
    };
  }
  return { title, typeLabel: null };
}

/** Legacy one-line: **Title** — why. kind: … area: … */
export function parseSuggestionLine(raw: string): BriefSuggestion | null {
  const boldMatch = raw.match(/\*\*(.+?)\*\*/);
  let title = boldMatch ? boldMatch[1].trim() : "";
  if (!title) {
    const firstSentence = raw.split(/[.!?—–-]/)[0]?.trim();
    if (!firstSentence) return null;
    title = firstSentence.length > 80 ? `${firstSentence.slice(0, 77)}…` : firstSentence;
  }
  const kindMatch = raw.match(/\bkind:\s*(continuous|one[-\s]?time|onetime)\b/i);
  const kind: "continuous" | "onetime" = kindMatch
    ? kindMatch[1].toLowerCase().startsWith("one")
      ? "onetime"
      : "continuous"
    : "continuous";
  const areaMatch = raw.match(/\barea:\s*(gtm|product|finance|people|ops|other)\b/i);
  const area = areaMatch ? areaMatch[1].toLowerCase() : undefined;
  let rationale = raw
    .replace(/\*\*(.+?)\*\*/, "")
    .replace(/\bkind:\s*[^,\n]+,?/i, "")
    .replace(/\barea:\s*[^,\n]+,?/i, "")
    .replace(/\b(?:estimated\s+)?duration:\s*[^,\n]+,?/i, "")
    .replace(/^\s*[—–-]\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (rationale.length > 400) rationale = rationale.slice(0, 397) + "…";
  return {
    title,
    description: rationale,
    rationale,
    kind,
    area,
    benefit: null,
    milestones: [],
    sources: [],
  };
}

/**
 * Pure state transitions for brief suggested-initiative rows.
 * Keeps Profile Preview + Research consistent without duplicating UI logic.
 */
export function reduceBriefSuggestionState(
  current: BriefSuggestionActionState,
  action:
    | { type: "review" }
    | { type: "create" }
    | { type: "cancel" }
    | { type: "submit" }
    | { type: "created" }
    | { type: "createFailed" }
    | { type: "dismiss" },
): BriefSuggestionActionState {
  if (current === "created" || current === "dismissed") return current;
  if (current === "submitting") {
    if (action.type === "created") return "created";
    if (action.type === "createFailed") return "creating";
    if (action.type === "cancel") return "default";
    return current;
  }
  switch (action.type) {
    case "review":
      return "reviewing";
    case "create":
      return "creating";
    case "cancel":
      return "default";
    case "submit":
      return current === "creating" || current === "reviewing" || current === "default"
        ? "submitting"
        : current;
    case "created":
      return "created";
    case "createFailed":
      return current === "creating" ? "creating" : "default";
    case "dismiss":
      return "dismissed";
    default:
      return current;
  }
}
