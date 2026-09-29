import { formatSignalObservationValue } from "@/lib/signals/group-catalog";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import {
  INTELLIGENCE_CATEGORIES,
  type IntelligenceCategory,
} from "@/lib/intelligence/constants";
import {
  normalizeIntelligenceCategory,
  signalCategoryToIntelligenceCategory,
} from "@/lib/intelligence/category-map";
import {
  isUnresolvedOverviewSourceTitle,
  resolveFeedSourceKindLabel,
  resolveIntelligenceProvenanceLabel,
  resolveObservationProvenanceLabel,
} from "@/lib/intelligence/source-label";
import { formatCategoryLabel } from "@/components/intelligence/format";

/** Design catalog tab order (Product not R&D). */
export const CATALOG_CATEGORY_ORDER: IntelligenceCategory[] = [
  "growth",
  "retention",
  "efficiency",
  "finance",
  "fundraising",
  "gtm",
  "product",
  "team",
  "strategic",
  "customer_success",
  "board_reporting",
  "vendor_stack",
];

export type FeedItemOrigin = "observation" | "intelligence";

export type IntelligenceFeedItem = {
  id: string;
  categoryKey: string;
  categoryLabel: string;
  signalName: string;
  valueLabel: string;
  period: string | null;
  /** Why it matters — from company_intelligence.summary. */
  summary: string | null;
  /** Manual / observation note, or a distinct document snippet. */
  note: string | null;
  sourceCount: number;
  sources: Array<{
    id: string;
    title: string;
    kind: string;
    date?: string | null;
    description?: string | null;
  }>;
  /** Milliseconds from `createdAt` — list order is newest first. */
  createdAtMs: number;
  origin: FeedItemOrigin;
  dismissible: boolean;
  observationId?: string;
  intelligenceId?: string;
  isBenchmark: boolean;
  /** Persisted provenance tag — used for empty-state copy in the detail drawer. */
  source?: string | null;
  generationPath?: string | null;
};

export type CompanySignalObservationLike = {
  id: string;
  signalId: string;
  signalLabel: string;
  signalCategory: string;
  signalKind: "quantitative" | "qualitative" | "boolean";
  signalUnit: string | null;
  period: string;
  valueNumeric: number | null;
  valueText: string | null;
  valueBool: boolean | null;
  confidence: number | null;
  rawSnippet: string | null;
  /** Persisted provenance tag (manual:…, portfolio_update:…, etc.). */
  source?: string | null;
  contextItemId: string | null;
  createdAt: string;
};

export type SignalCatalogEntryLike = {
  id: string;
  label: string;
  category: string;
};

export type FeedSignalGroup = {
  categoryKey: string;
  categoryLabel: string;
  signalName: string;
  items: IntelligenceFeedItem[];
};

function categoryLabelFor(key: string): string {
  return formatCategoryLabel(key);
}

function isRedundantNote(
  note: string | null | undefined,
  signalName: string,
  valueLabel: string,
): boolean {
  const trimmed = (note ?? "").trim();
  if (!trimmed) return true;
  const normalized = trimmed.toLowerCase();
  if (valueLabel && normalized === valueLabel.toLowerCase()) return true;
  if (
    signalName &&
    valueLabel &&
    normalized === `${signalName}: ${valueLabel}`.toLowerCase()
  ) {
    return true;
  }
  if (signalName && normalized === signalName.toLowerCase()) return true;
  return false;
}

export function noteIfNonRedundant(
  note: string | null | undefined,
  signalName: string,
  valueLabel: string,
): string | null {
  if (isRedundantNote(note, signalName, valueLabel)) return null;
  return (note ?? "").trim() || null;
}

export function buildFeedItems(opts: {
  observations: CompanySignalObservationLike[];
  intelligence: CompanyIntelligenceRow[];
  catalog: SignalCatalogEntryLike[];
}): IntelligenceFeedItem[] {
  const items: IntelligenceFeedItem[] = [];

  for (const obs of opts.observations) {
    const catKey = signalCategoryToIntelligenceCategory(obs.signalCategory);
    const valueLabel = formatSignalObservationValue({
      kind: obs.signalKind,
      unit: obs.signalUnit,
      valueNumeric: obs.valueNumeric,
      valueText: obs.valueText,
      valueBool: obs.valueBool,
    });
    const sources = obs.contextItemId
      ? [
          {
            id: obs.contextItemId,
            title: "Linked source",
            kind: resolveFeedSourceKindLabel({
              kind: "context",
              provenanceSource: obs.source,
            }),
            date: obs.createdAt,
            description: null,
          },
        ]
      : (() => {
          const title = resolveObservationProvenanceLabel(obs.source);
          if (!title) return [];
          return [
            {
              id: `src:${obs.id}`,
              title,
              kind: "provenance",
              date: obs.createdAt,
              description: null,
            },
          ];
        })();
    items.push({
      id: `obs:${obs.id}`,
      categoryKey: catKey,
      categoryLabel: categoryLabelFor(catKey),
      signalName: obs.signalLabel,
      valueLabel,
      period: obs.period,
      summary: null,
      note: noteIfNonRedundant(obs.rawSnippet, obs.signalLabel, valueLabel),
      sourceCount: sources.length,
      sources,
      createdAtMs: new Date(obs.createdAt).getTime() || 0,
      origin: "observation",
      dismissible: true,
      observationId: obs.id,
      isBenchmark: false,
      source: obs.source ?? null,
      generationPath: null,
    });
  }

  for (const row of opts.intelligence) {
    const catKey = normalizeIntelligenceCategory(row.category);
    const signalName = row.headline;
    const valueLabel = row.keyDetail?.trim() || row.summary?.trim() || "—";
    const summary = noteIfNonRedundant(row.summary, signalName, valueLabel);
    const rawSnippet = row.rawSnippet?.trim() || null;
    const note =
      rawSnippet &&
      rawSnippet.toLowerCase() !== (row.summary ?? "").trim().toLowerCase()
        ? noteIfNonRedundant(rawSnippet, signalName, valueLabel)
        : null;
    const sources: IntelligenceFeedItem["sources"] = [];
    if (row.documentVersionId) {
      sources.push({
        id: row.documentVersionId,
        title: row.documentLabel ?? "Document",
        kind: resolveFeedSourceKindLabel({ kind: "document" }),
        date: row.createdAt,
        description: null,
      });
    } else if (row.contextItemId) {
      sources.push({
        id: row.contextItemId,
        title: row.documentLabel ?? "Linked source",
        kind: resolveFeedSourceKindLabel({
          kind: "context",
          provenanceSource: row.source,
        }),
        date: row.createdAt,
        description: null,
      });
    } else {
      const storedTitle = isUnresolvedOverviewSourceTitle(row.documentLabel)
        ? null
        : row.documentLabel?.trim() || null;
      const title =
        storedTitle ??
        resolveIntelligenceProvenanceLabel({
          source: row.source,
          generationPath: row.generationPath,
          preferBenchmark: row.isBenchmark,
          overviewCategory: row.overviewCategory,
          evidenceSource: row.evidenceSource,
        });
      if (title) {
        sources.push({
          id: `src:${row.id}`,
          title,
          kind: "provenance",
          date: row.createdAt,
          description: null,
        });
      }
    }
    items.push({
      id: `intel:${row.id}`,
      categoryKey: catKey,
      categoryLabel: categoryLabelFor(catKey),
      signalName,
      valueLabel,
      period: row.period,
      summary,
      note,
      sourceCount: sources.length,
      sources,
      createdAtMs: new Date(row.createdAt).getTime() || 0,
      origin: "intelligence",
      dismissible: !row.isBenchmark,
      intelligenceId: row.id,
      isBenchmark: row.isBenchmark,
      source: row.source,
      generationPath: row.generationPath,
    });
  }

  return items.sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function catalogCategoryTabKeys(
  catalog: SignalCatalogEntryLike[],
): string[] {
  const present = new Set(
    catalog.map((s) => signalCategoryToIntelligenceCategory(s.category)),
  );
  const ordered = CATALOG_CATEGORY_ORDER.filter((key) => present.has(key));
  for (const key of INTELLIGENCE_CATEGORIES) {
    if (present.has(key) && !ordered.includes(key)) ordered.push(key);
  }
  for (const s of catalog) {
    const key = signalCategoryToIntelligenceCategory(s.category);
    if (!ordered.includes(key as IntelligenceCategory) && !ordered.includes(key)) {
      ordered.push(key as IntelligenceCategory);
    }
  }
  return ordered;
}

function itemMatchesPin(item: IntelligenceFeedItem, pinSet: Set<string>): boolean {
  if (pinSet.has(item.id)) return true;
  if (item.intelligenceId && pinSet.has(item.intelligenceId)) return true;
  if (item.intelligenceId && pinSet.has(`intel:${item.intelligenceId}`)) return true;
  if (item.observationId && pinSet.has(item.observationId)) return true;
  if (item.observationId && pinSet.has(`obs:${item.observationId}`)) return true;
  return false;
}

/**
 * Group by category + signal, then order groups by latest `createdAt` (newest first).
 * History within a signal is also newest → oldest by `createdAt`.
 * Optional `pinIds` (feed ids, intelligence ids, or observation ids) float matching
 * groups to the top — used right after generate/log so new rows are visible first.
 */
export function groupFeedBySignalCreatedAt(
  items: IntelligenceFeedItem[],
  pinIds: string[] = [],
): FeedSignalGroup[] {
  const pinSet = new Set(pinIds.filter(Boolean));
  const bySignal = new Map<string, IntelligenceFeedItem[]>();
  for (const item of items) {
    const key = `${item.categoryKey}::${item.signalName}`;
    const list = bySignal.get(key) ?? [];
    list.push(item);
    bySignal.set(key, list);
  }

  return [...bySignal.values()]
    .map((signalItems) => {
      const sorted = [...signalItems].sort((a, b) => b.createdAtMs - a.createdAtMs);
      const latest = sorted[0];
      return {
        categoryKey: latest.categoryKey,
        categoryLabel: latest.categoryLabel,
        signalName: latest.signalName,
        items: sorted,
      };
    })
    .sort((a, b) => {
      if (pinSet.size > 0) {
        const aPinned = a.items.some((item) => itemMatchesPin(item, pinSet));
        const bPinned = b.items.some((item) => itemMatchesPin(item, pinSet));
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
      }
      return (b.items[0]?.createdAtMs ?? 0) - (a.items[0]?.createdAtMs ?? 0);
    });
}

/** @deprecated Prefer {@link groupFeedBySignalCreatedAt} — kept for callers that expect category nesting. */
export function groupFeedByCategoryThenSignal(
  items: IntelligenceFeedItem[],
  pinIds: string[] = [],
): Array<{
  categoryKey: string;
  categoryLabel: string;
  groups: Array<{ signalName: string; items: IntelligenceFeedItem[] }>;
}> {
  const flat = groupFeedBySignalCreatedAt(items, pinIds);
  const byCategory = new Map<string, FeedSignalGroup[]>();
  for (const group of flat) {
    const list = byCategory.get(group.categoryKey) ?? [];
    list.push(group);
    byCategory.set(group.categoryKey, list);
  }
  return [...byCategory.entries()].map(([categoryKey, groups]) => ({
    categoryKey,
    categoryLabel: categoryLabelFor(categoryKey),
    groups: groups.map(({ signalName, items: signalItems }) => ({
      signalName,
      items: signalItems,
    })),
  }));
}
