import { randomUUID } from "node:crypto";
import type {
  InitiativeIntelligenceLink,
  InitiativeSourceDocument,
} from "@/lib/company-initiatives";

/** Product ceiling — 1-3 actionable initiatives per document. */
export const MAX_DOCUMENT_INITIATIVES = 3;

export type DocIntel = {
  id: string;
  type: string;
  headline: string;
  category: string;
  highlight: string | null;
  signalId?: string;
};

export type TaggedIntelligenceInput =
  | string
  | string[]
  | null
  | undefined;

export type TaggedInitiative = {
  tagged_intelligence_types?: string[] | null;
  tagged_intelligence_type?: string | null;
};

function taggedNeedles(tagged: TaggedIntelligenceInput): string[] {
  const raw = Array.isArray(tagged) ? tagged : tagged != null ? [tagged] : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    for (const part of String(item).split(",")) {
      const needle = part.trim().toLowerCase();
      if (!needle || seen.has(needle)) continue;
      seen.add(needle);
      out.push(needle);
    }
  }
  return out;
}

function intelMatchesNeedle(item: DocIntel, needle: string): boolean {
  const type = item.type.toLowerCase();
  const category = item.category.toLowerCase();
  const headline = item.headline.toLowerCase();
  const signalId = item.signalId?.toLowerCase() ?? "";
  return (
    type === needle ||
    category === needle ||
    headline.includes(needle) ||
    (type.length > 0 && needle.includes(type)) ||
    (signalId.length > 0 && (signalId === needle || needle.includes(signalId)))
  );
}

function toBaselineLink(match: DocIntel): InitiativeIntelligenceLink {
  return {
    id: `il_${randomUUID()}`,
    role: "baseline",
    intelligenceId: match.id,
    title: match.headline,
    highlight: match.highlight ?? "",
    type: match.type,
    date: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Idempotency predicate: has any existing document-sourced initiative already
 * cited this document version? Pure over the loaded sourceDocuments arrays.
 */
export function documentVersionAlreadyProcessed(
  existing: Array<Array<InitiativeSourceDocument> | null | undefined>,
  documentVersionId: string,
): boolean {
  return existing.some((docs) =>
    (docs ?? []).some((d) => d.documentVersionId === documentVersionId),
  );
}

/**
 * Idempotency predicate for HubSpot (and other context-item) sources: any
 * initiative whose sourceDocuments entry id matches the context item.
 */
export function contextItemAlreadyProcessed(
  existing: Array<Array<InitiativeSourceDocument> | null | undefined>,
  contextItemId: string,
): boolean {
  return existing.some((docs) =>
    (docs ?? []).some((d) => d.id === contextItemId),
  );
}

/** Unique baseline links for every related intelligence item the AI tagged. */
export function matchIntelligenceLinks(
  tagged: TaggedIntelligenceInput,
  intel: DocIntel[],
): InitiativeIntelligenceLink[] {
  const needles = taggedNeedles(tagged);
  if (needles.length === 0) return [];
  const seenIds = new Set<string>();
  const links: InitiativeIntelligenceLink[] = [];
  for (const needle of needles) {
    for (const match of intel) {
      if (seenIds.has(match.id)) continue;
      if (!intelMatchesNeedle(match, needle)) continue;
      seenIds.add(match.id);
      links.push(toBaselineLink(match));
    }
  }
  return links;
}

/** Single-tag wrapper around `matchIntelligenceLinks` for document/HubSpot callers. */
export function matchIntelligenceLink(
  taggedType: TaggedIntelligenceInput,
  intel: DocIntel[],
): InitiativeIntelligenceLink[] {
  return matchIntelligenceLinks(taggedType, intel);
}

/** Generated intelligence ids that at least one initiative tagged. */
export function taggedGeneratedIntelligenceIds(
  generatedIds: Iterable<string>,
  linksByInitiative: Array<InitiativeIntelligenceLink[]>,
): Set<string> {
  const generated = new Set(generatedIds);
  const tagged = new Set<string>();
  for (const links of linksByInitiative) {
    for (const link of links) {
      if (generated.has(link.intelligenceId)) tagged.add(link.intelligenceId);
    }
  }
  return tagged;
}

/** Prefer the multi-tag array; fall back to the legacy singular field. */
export function taggedTypesFromInitiative(
  init: TaggedInitiative,
): TaggedIntelligenceInput {
  if (init.tagged_intelligence_types && init.tagged_intelligence_types.length > 0) {
    return init.tagged_intelligence_types;
  }
  return init.tagged_intelligence_type;
}

/**
 * Resolve intelligence links for each suggested initiative.
 *
 * Replaces the former singular `taggedLink` / `resolveTaggedIntelligenceLink`
 * lookup: one initiative can tag several intelligence items. Generated
 * intelligence that no initiative tagged is omitted from `persistIds` so it
 * is not saved.
 */
export function resolveTaggedIntelligenceLinks(opts: {
  initiatives: readonly TaggedInitiative[];
  matchPool: DocIntel[];
  generatedIds: Iterable<string>;
}): {
  linksByInitiative: InitiativeIntelligenceLink[][];
  persistIds: Set<string>;
} {
  const linksByInitiative = opts.initiatives.map((init) =>
    matchIntelligenceLinks(taggedTypesFromInitiative(init), opts.matchPool),
  );
  return {
    linksByInitiative,
    persistIds: taggedGeneratedIntelligenceIds(opts.generatedIds, linksByInitiative),
  };
}
