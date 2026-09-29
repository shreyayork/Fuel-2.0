import {
  CATEGORY_IDS,
  CATEGORY_META,
  type OverviewCategoryId,
  tierFromPercentile,
} from "./constants";
import {
  BENCHMARK_DRAWER_FIELDS,
  formatBenchmarkTick,
  parseBenchmarkDrawerValue,
  type BenchmarkDrawerUnit,
} from "./benchmark-drawer-fields";
import {
  DETAIL_QUESTION_LABEL,
  TRACK_DETAIL_SECTIONS,
  formatDetailAnswerDisplay,
  getVisibleQuestions,
  type DetailAnswers,
} from "./detail-question-catalog";
import type { OverviewBenchmarkDrawerPayload } from "./types";
import type {
  FullSummaryInitiative,
  FullSummaryOperatingGroup,
  FullSummaryProfileMeta,
  FullSummaryReference,
  FullSummarySnapshotRow,
  SnapshotTier,
} from "./full-summary-types";

export const SNAPSHOT_BAND_LABELS: Record<SnapshotTier, string> = {
  top: "Top decile",
  upper: "Above median",
  mid: "Around median",
  lower: "Below median",
  bottom: "Below cohort",
};

export const PILLAR_DEFINITIONS: Record<OverviewCategoryId, string> = {
  dev: "Your product and technical foundation — stage, team, ship cadence, and build quality.",
  mkt: "How you sell and grow — motion, pipeline, ideal customer, pricing, and demand.",
  rev: "How you run the business day to day — cash, runway, finance, and capital plans.",
};

const TIER_COLOUR: Record<SnapshotTier, string> = {
  top: "var(--status-good)",
  upper: "var(--status-good)",
  mid: "var(--text-2)",
  lower: "var(--status-watch)",
  bottom: "var(--status-bad)",
};

function formatDrawerValue(value: number, unit: BenchmarkDrawerUnit): string {
  if (unit === "usd") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${Math.round(value)}`;
  }
  return formatBenchmarkTick(value, unit);
}

export function buildSnapshotRows(
  drawer: OverviewBenchmarkDrawerPayload | null,
): FullSummarySnapshotRow[] {
  if (!drawer) return [];
  const rows: FullSummarySnapshotRow[] = [];

  for (const field of BENCHMARK_DRAWER_FIELDS) {
    const raw = drawer.values[field.key]?.trim() ?? "";
    const value = parseBenchmarkDrawerValue(raw);
    if (value == null) continue;

    const meta = drawer.fields.find((f) => f.key === field.key);
    const p25 = meta?.p25 ?? field.fallback.p25;
    const p50 = meta?.p50 ?? field.fallback.p50;
    const p75 = meta?.p75 ?? field.fallback.p75;
    const p90 = meta?.p90 ?? field.fallback.p90;
    const lowerIsBetter = meta?.lowerIsBetter ?? Boolean(field.lowerIsBetter);
    const tier = tierFromPercentile(value, p25, p50, p75, p90, lowerIsBetter);

    rows.push({
      id: field.key,
      label: field.label,
      you: formatDrawerValue(value, field.unit),
      colour: TIER_COLOUR[tier],
      p25: formatDrawerValue(p25, field.unit),
      p50: formatDrawerValue(p50, field.unit),
      p75: formatDrawerValue(p75, field.unit),
      p90: formatDrawerValue(p90, field.unit),
      band: SNAPSHOT_BAND_LABELS[tier],
      tier,
      isStrong: tier === "top" || tier === "upper",
    });
  }

  return rows;
}

export function estimateRunwayMonths(
  cashDisplay: string | null | undefined,
  burnDisplay: string | null | undefined,
): number | null {
  const cash = cashDisplay ? parseBenchmarkDrawerValue(cashDisplay) : null;
  const burn = burnDisplay ? parseBenchmarkDrawerValue(burnDisplay) : null;
  if (cash == null || burn == null || burn <= 0) return null;
  return cash / burn;
}

export function buildOperatingGroups(
  answers: DetailAnswers,
): FullSummaryOperatingGroup[] {
  const groups: FullSummaryOperatingGroup[] = [];
  for (const section of TRACK_DETAIL_SECTIONS) {
    const id = section.id as OverviewCategoryId;
    const rows = getVisibleQuestions(section, answers)
      .map((q) => {
        const value = formatDetailAnswerDisplay(answers[q.id]);
        if (!value) return null;
        return {
          id: q.id,
          label: DETAIL_QUESTION_LABEL[q.id] ?? q.prompt,
          value,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
    if (rows.length === 0) continue;
    groups.push({
      id,
      label: CATEGORY_META[id].label,
      rows,
    });
  }
  return groups;
}

export function buildHeadquarters(meta: {
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
}): string | null {
  const parts = [meta.locationCity, meta.locationState, meta.locationCountry]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  return parts.length ? parts.join(", ") : null;
}

export function parseInitiativeDueSortKey(due?: string | null): number {
  const raw = due?.trim();
  if (!raw) return Number.POSITIVE_INFINITY;
  const quarter = raw.match(/^(\d{4})\s*[-/]?\s*q([1-4])$/i);
  if (quarter) {
    const year = Number(quarter[1]);
    const q = Number(quarter[2]);
    return Date.UTC(year, (q - 1) * 3, 1);
  }
  const iso = Date.parse(raw);
  if (!Number.isNaN(iso)) return iso;
  return Number.POSITIVE_INFINITY;
}

export function formatInitiativeDueLabel(due?: string | null): string {
  const raw = due?.trim();
  if (!raw) return "No target date";
  const quarter = raw.match(/^(\d{4})\s*[-/]?\s*q([1-4])$/i);
  if (quarter) return `Q${quarter[2]} ${quarter[1]}`;
  return raw;
}

export function initiativeDueMeta(
  due?: string | null,
  now = new Date(),
): { period: string; context: string } {
  const period = formatInitiativeDueLabel(due);
  const key = parseInitiativeDueSortKey(due);
  if (!Number.isFinite(key)) return { period: "No target date", context: "" };
  const currentQStart = Date.UTC(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1,
  );
  const nextQStart = Date.UTC(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3 + 3,
    1,
  );
  if (key >= currentQStart && key < nextQStart) {
    return { period, context: "In progress now" };
  }
  if (key < currentQStart) return { period, context: "Previous quarter" };
  return { period, context: "Upcoming" };
}

export function pillarCoverageMeta(
  count: number,
): { label: string; tone: "blind" | "thin" | "healthy" } {
  if (count <= 0) return { label: "Blind spot", tone: "blind" };
  if (count === 1) return { label: "Thin coverage", tone: "thin" };
  return { label: "Healthy", tone: "healthy" };
}

export function initiativeStatusMeta(
  status?: string | null,
): { label: string; tone: "active" | "done" | "paused" | "suggested" } {
  const normalized = (status ?? "active").trim().toLowerCase();
  if (normalized === "done" || normalized === "completed") {
    return { label: "Completed", tone: "done" };
  }
  if (normalized === "suggested" || normalized === "draft") {
    return { label: "Suggested", tone: "suggested" };
  }
  if (normalized === "paused" || normalized === "archived") {
    return { label: "Paused", tone: "paused" };
  }
  return { label: "Active", tone: "active" };
}

export function sortInitiativesForPillar(
  items: FullSummaryInitiative[],
): FullSummaryInitiative[] {
  return items.slice().sort((a, b) => {
    const dueDiff = parseInitiativeDueSortKey(a.due) - parseInitiativeDueSortKey(b.due);
    if (dueDiff !== 0) return dueDiff;
    return a.title.localeCompare(b.title);
  });
}

export function buildWikiReferences(opts: {
  profileMeta: FullSummaryProfileMeta;
  productDescription: string | null;
  snapshotRows: FullSummarySnapshotRow[];
  intelligence: Array<{ headline: string; summary: string }>;
  documents: Array<{ typeLabel: string; name: string }>;
  detailSnippets: Array<{ label: string; value: string }>;
  challenges?: string | null;
}): FullSummaryReference[] {
  const refs: FullSummaryReference[] = [];
  let id = 1;

  if (opts.profileMeta.sector || opts.productDescription) {
    refs.push({
      id: id++,
      label: "Company profile",
      detail:
        opts.productDescription?.slice(0, 160) ||
        opts.profileMeta.sector ||
        "Profile context on file",
      kind: "profile",
    });
  }

  const arr = opts.snapshotRows.find((r) => r.id === "arr");
  if (arr) {
    refs.push({
      id: id++,
      label: "ARR benchmark",
      detail: `${arr.you} vs cohort p50 ${arr.p50}`,
      kind: "benchmark",
    });
  }

  const nrr = opts.snapshotRows.find((r) => r.id === "nrr");
  if (nrr) {
    refs.push({
      id: id++,
      label: "NRR benchmark",
      detail: `${nrr.you} vs cohort p50 ${nrr.p50}`,
      kind: "benchmark",
    });
  }

  if (!arr && !nrr && opts.snapshotRows[0]) {
    const row = opts.snapshotRows[0];
    refs.push({
      id: id++,
      label: `${row.label} benchmark`,
      detail: `${row.you} · ${row.band}`,
      kind: "benchmark",
    });
  }

  for (const item of opts.intelligence.slice(0, 4)) {
    refs.push({
      id: id++,
      label: item.headline.slice(0, 80) || "Intelligence signal",
      detail: item.summary.slice(0, 180),
      kind: "intelligence",
    });
  }

  for (const doc of opts.documents.slice(0, 3)) {
    refs.push({
      id: id++,
      label: doc.typeLabel,
      detail: doc.name,
      kind: "document",
    });
  }

  for (const snippet of opts.detailSnippets.slice(0, 2)) {
    refs.push({
      id: id++,
      label: snippet.label,
      detail: snippet.value.slice(0, 160),
      kind: "detail",
    });
  }

  if (opts.challenges?.trim()) {
    refs.push({
      id: id++,
      label: "Founder challenges",
      detail: opts.challenges.trim().slice(0, 180),
      kind: "detail",
    });
  }

  return refs;
}

export function cohortLabelFromKey(cohortKey: string | null): string {
  if (!cohortKey?.trim()) return "Peer cohort";
  return cohortKey
    .split(/[|_/]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
}

export function reportDateLabel(now = new Date()): string {
  return now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function categoryPillars() {
  return CATEGORY_IDS.map((categoryId) => ({
    categoryId,
    label: CATEGORY_META[categoryId].label,
    fullLabel: CATEGORY_META[categoryId].fullLabel,
    definition: PILLAR_DEFINITIONS[categoryId],
  }));
}

export function sampleDetailAnswers(
  answers: DetailAnswers,
  limit = 6,
): Array<{ track: string; label: string; value: string }> {
  const out: Array<{ track: string; label: string; value: string }> = [];
  for (const section of TRACK_DETAIL_SECTIONS) {
    for (const q of getVisibleQuestions(section, answers)) {
      const value = formatDetailAnswerDisplay(answers[q.id]);
      if (!value) continue;
      out.push({
        track: CATEGORY_META[section.id as OverviewCategoryId].label,
        label: DETAIL_QUESTION_LABEL[q.id] ?? q.prompt,
        value,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function trackCompletionPct(
  answers: DetailAnswers,
  categoryId: OverviewCategoryId,
): number {
  const section = TRACK_DETAIL_SECTIONS.find((s) => s.id === categoryId);
  if (!section) return 0;
  const visible = getVisibleQuestions(section, answers);
  if (visible.length === 0) return 0;
  const answered = visible.filter((q) => answers[q.id]?.trim()).length;
  return Math.round((answered / visible.length) * 100);
}

export function snapshotFingerprint(rows: FullSummarySnapshotRow[]): string {
  const parts = rows
    .map((r) => `${r.id}:${r.you}:${r.tier}`)
    .sort()
    .join("|");
  let hash = 0;
  for (let i = 0; i < parts.length; i += 1) {
    hash = (hash * 31 + parts.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}
