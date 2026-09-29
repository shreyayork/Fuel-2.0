import { resolveSourceListChipLabel } from "@/lib/intelligence/source-label";
import type { IntelligenceSourceItem } from "./types";

export type IntelligenceStat = { count: number; ids: string[] };

export type IntelligenceSourceVersionInput = {
  id: string;
  filename: string;
  typeLabel: string;
  uploadedAt: Date;
  contextItemId: string | null;
};

/** Lightweight sort key for merging Data Room docs + integration notes. */
export type SourceListKey = {
  id: string;
  kind: "doc" | "note";
  sortAtMs: number;
};

export type ContextNoteSourceInput = {
  id: string;
  title: string | null;
  source: string;
  occurredAt: Date | null;
  createdAt: Date;
};

/** @deprecated Use ContextNoteSourceInput */
export type HubspotSourceInput = ContextNoteSourceInput;

export function mergeIntelligenceStats(
  byVersion: IntelligenceStat | undefined,
  byContext: IntelligenceStat | undefined,
): IntelligenceStat | undefined {
  if (byVersion && byContext) {
    return {
      count: Math.max(byVersion.count, byContext.count),
      ids: [...new Set([...byVersion.ids, ...byContext.ids])],
    };
  }
  return byVersion ?? byContext;
}

/** Stable merge-sort + page slice for Sources pagination (docs ∪ notes). */
export function pageSourceKeys(
  keys: SourceListKey[],
  limit: number,
  offset: number,
): SourceListKey[] {
  return [...keys]
    .sort(
      (a, b) =>
        b.sortAtMs - a.sortAtMs ||
        a.kind.localeCompare(b.kind) ||
        a.id.localeCompare(b.id),
    )
    .slice(offset, offset + limit);
}

/** Map a current vault version row → Sources drawer DTO (pure, testable). */
export function toIntelligenceSourceItem(
  row: IntelligenceSourceVersionInput,
  opts: {
    contextTitle?: string | null;
    stats?: IntelligenceStat;
  } = {},
): IntelligenceSourceItem {
  const count = opts.stats?.count ?? 0;
  const title =
    (opts.contextTitle?.trim() || null) || row.filename || row.typeLabel;
  return {
    id: row.id,
    kind: "doc",
    originLabel: resolveSourceListChipLabel({ kind: "doc" }),
    title,
    addedAtLabel: row.uploadedAt.toLocaleDateString(),
    uploadedAtMs: row.uploadedAt.getTime(),
    contextItemId: row.contextItemId,
    status: count > 0 ? "generated" : "awaiting",
    intelligenceIds: opts.stats?.ids ?? [],
    intelligenceCount: count,
  };
}

function noteFallbackTitle(source: string): string {
  if (source.startsWith("granola:")) return "Granola meeting";
  if (source.includes(":email:")) return "HubSpot email";
  if (source.startsWith("hubspot:")) return "HubSpot note";
  return "Note";
}

/** Map a HubSpot/Granola context_item → Sources drawer note row. */
export function toHubspotIntelligenceSourceItem(
  row: ContextNoteSourceInput,
  stats?: IntelligenceStat,
): IntelligenceSourceItem {
  const count = stats?.count ?? 0;
  const title = row.title?.trim() || noteFallbackTitle(row.source);
  const at = row.occurredAt ?? row.createdAt;
  return {
    id: row.id,
    kind: "note",
    originLabel: resolveSourceListChipLabel({
      kind: "note",
      source: row.source,
    }),
    title,
    addedAtLabel: at.toLocaleDateString(),
    uploadedAtMs: at.getTime(),
    contextItemId: row.id,
    status: count > 0 ? "generated" : "awaiting",
    intelligenceIds: stats?.ids ?? [],
    intelligenceCount: count,
  };
}
