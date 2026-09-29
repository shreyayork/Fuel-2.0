import { formatCategoryLabel, formatPeriodDisplay } from "@/components/intelligence/format";
import type { InitiativeIntelligenceLink } from "@/lib/company-initiatives";
import type { IntelligenceCategory } from "@/lib/intelligence/constants";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";

const PROGRESS_META_SEP = " ◦ ";

/**
 * Progress card title — same shape as Log Intelligence: `Signal: Value`.
 * Keeps an existing `Signal: Value` headline; otherwise appends the linked value.
 */
export function progressLinkTitle(headline: string, value: string): string {
  const title = headline.trim();
  const valueText = value.trim();
  if (!valueText) return title;
  if (!title) return valueText.slice(0, 120);
  const colon = title.indexOf(":");
  if (colon >= 0 && title.slice(colon + 1).trim()) return title;
  if (title.toLowerCase() === valueText.toLowerCase()) return title;
  return `${title}: ${valueText}`.slice(0, 120);
}

/**
 * Progress card highlight/subtitle context — note only (Log Intelligence pattern).
 * Value lives in the title as `Signal: Value`, not here.
 */
export function progressLinkHighlight(note?: string): string {
  return note?.trim() ?? "";
}

function progressLinkValue(
  intel: Pick<CompanyIntelligenceRow, "headline" | "keyDetail">,
): string {
  const detail = intel.keyDetail?.trim();
  if (detail) return detail;
  const colon = intel.headline.split(/:\s+/);
  if (colon.length > 1) return colon.slice(1).join(": ").trim();
  const dot = intel.headline.split(/\s·\s/);
  if (dot.length > 1) return dot[dot.length - 1]!.trim();
  return intel.headline.trim();
}

/** Second line: `Category ◦ Quarter ◦ Commentary` — omits empty segments. */
export function formatProgressLinkMeta(link: {
  type: string;
  date?: string | null;
  highlight?: string | null;
}): string {
  const parts = [
    link.type.trim() ? formatCategoryLabel(link.type) : "",
    link.date?.trim() ? formatPeriodDisplay(link.date) : "",
    link.highlight?.trim() ?? "",
  ].filter(Boolean);
  return parts.join(PROGRESS_META_SEP);
}

/** Select Intelligence option — line 1: `Signal: Value`. */
export function formatIntelligenceLinkOptionTitle(
  row: Pick<CompanyIntelligenceRow, "headline" | "keyDetail" | "rawSnippet" | "summary">,
): string {
  return buildProgressIntelligenceLinkDisplay(row).title;
}

/** Select Intelligence option — line 2: `Category ◦ Quarter ◦ Commentary`. */
export function formatIntelligenceLinkOptionMeta(
  row: Pick<
    CompanyIntelligenceRow,
    "category" | "period" | "headline" | "keyDetail" | "rawSnippet" | "summary"
  >,
): string {
  const display = buildProgressIntelligenceLinkDisplay(row);
  return formatProgressLinkMeta({
    type: row.category,
    date: row.period,
    highlight: display.highlight,
  });
}

/** Build persisted title/highlight for initiative progress intelligence links. */
export function buildProgressIntelligenceLinkDisplay(
  intel: Pick<
    CompanyIntelligenceRow,
    "headline" | "keyDetail" | "rawSnippet" | "summary"
  >,
  note?: string,
): { title: string; highlight: string } {
  const value = progressLinkValue(intel);
  const title = progressLinkTitle(intel.headline, value);
  const highlight =
    note !== undefined
      ? progressLinkHighlight(note)
      : progressLinkHighlight(intel.rawSnippet ?? undefined);
  return { title, highlight };
}

/**
 * Initiative "Log intelligence" attaches progress to the catalog observation row.
 * Headline stays the signal label (Intelligence feed shape) — not `Signal: Value`.
 */
export function progressIntelRowFromLoggedObservation(opts: {
  observationId: string;
  companyUuid: string;
  category: IntelligenceCategory;
  signalLabel: string;
  displayValue: string;
  period: string;
  note?: string | null;
}): CompanyIntelligenceRow {
  const note = opts.note?.trim() || null;
  const now = new Date().toISOString();
  return {
    id: opts.observationId,
    companyUuid: opts.companyUuid,
    category: opts.category,
    headline: opts.signalLabel,
    keyDetail: opts.displayValue,
    summary: note ?? opts.displayValue,
    confidence: 1,
    source: "manual:observation",
    generationPath: null,
    period: opts.period,
    contextItemId: null,
    documentVersionId: null,
    documentLabel: null,
    rawSnippet: note,
    isBenchmark: false,
    authorEmail: null,
    createdAt: now,
  };
}

/**
 * Catalog-signal identity for a progress card. Manual logs use
 * `"<signal label>: <value>"`; extracted intel often uses the label alone.
 */
export function progressSignalKey(title: string): string {
  const trimmed = title.trim();
  const colon = trimmed.indexOf(":");
  const label = colon >= 0 ? trimmed.slice(0, colon).trim() : trimmed;
  return label.toLowerCase();
}

/** Same catalog signal in the same Baseline/Current column replaces; a different signal appends. */
export function upsertProgressIntelligenceLink(
  existing: InitiativeIntelligenceLink[],
  incoming: InitiativeIntelligenceLink,
): InitiativeIntelligenceLink[] {
  const incomingKey = progressSignalKey(incoming.title);
  const idx = existing.findIndex((link) => {
    if (link.role !== incoming.role) return false;
    if (link.intelligenceId === incoming.intelligenceId) return true;
    return progressSignalKey(link.title) === incomingKey;
  });
  if (idx < 0) return [...existing, incoming];
  const next = existing.slice();
  next[idx] = incoming;
  return next;
}

export function parseProgressIntelligenceLinks(
  raw: unknown,
): InitiativeIntelligenceLink[] | null {
  if (!Array.isArray(raw)) return null;
  const links: InitiativeIntelligenceLink[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === "string" ? e.id.trim() : "";
    const intelligenceId =
      typeof e.intelligenceId === "string" ? e.intelligenceId.trim() : "";
    const role = e.role;
    if (!id || !intelligenceId) continue;
    if (role !== "baseline" && role !== "current" && role !== "target") continue;
    links.push({
      id,
      role,
      intelligenceId,
      title: typeof e.title === "string" ? e.title : "",
      highlight: typeof e.highlight === "string" ? e.highlight : "",
      type: typeof e.type === "string" ? e.type : "",
      date: typeof e.date === "string" ? e.date : "",
    });
  }
  return links;
}

/** Reject payloads that would wipe existing links because every entry failed validation. */
export function canPersistProgressIntelligenceLinks(
  parsed: InitiativeIntelligenceLink[] | null,
  rawLength: number,
): parsed is InitiativeIntelligenceLink[] {
  if (parsed == null) return false;
  if (rawLength > 0 && parsed.length === 0) return false;
  return true;
}

export function withUpdatedIntelligenceLinks<
  T extends { id: string; intelligenceLinks: InitiativeIntelligenceLink[] },
>(items: T[], initiativeId: string, intelligenceLinks: InitiativeIntelligenceLink[]): T[] {
  return items.map((item) =>
    item.id === initiativeId ? { ...item, intelligenceLinks } : item,
  );
}
