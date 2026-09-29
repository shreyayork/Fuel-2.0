import {
  clampListLimit,
  clampListOffset,
  type ListPageSize,
} from "@/lib/list-pagination";
import {
  getIntelligenceDateRange,
  type IntelligenceCustomRange,
  type IntelligenceDatePreset,
} from "@/lib/intelligence/filters";
import { normalizeIntelligenceCategory } from "@/lib/intelligence/category-map";

export const INTELLIGENCE_FEED_DATE_PRESETS = [
  "current-quarter",
  "last-quarter",
  "current-year",
  "last-year",
  "custom",
] as const satisfies readonly IntelligenceDatePreset[];

export type IntelligenceFeedPageQuery = {
  limit: ListPageSize;
  offset: number;
  category: string | null;
  q: string;
  datePreset: IntelligenceDatePreset;
  customRange: IntelligenceCustomRange | null;
  focusIds: string[];
  /** When true, date preset/custom range are ignored (source-focus mode). */
  skipDateFilter: boolean;
  dateMatch: "period" | "logged-day";
  rangeStart: Date;
  rangeEnd: Date;
};

function isDatePreset(value: string): value is IntelligenceDatePreset {
  return (INTELLIGENCE_FEED_DATE_PRESETS as readonly string[]).includes(value);
}

function parseYmd(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

/** Normalize focus tokens (feed ids, raw ids, source/context/document ids). */
export function parseFocusIdsParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  const out = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id) continue;
    out.add(id);
    if (id.startsWith("intel:") || id.startsWith("obs:")) {
      out.add(id.slice(id.indexOf(":") + 1));
    }
  }
  return [...out];
}

export function parseIntelligenceFeedPageParams(
  searchParams: URLSearchParams,
  now = new Date(),
): { ok: true; query: IntelligenceFeedPageQuery } | { ok: false; error: string } {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limitNum =
    limitRaw == null || limitRaw === "" ? undefined : Number.parseInt(limitRaw, 10);
  const offsetNum =
    offsetRaw == null || offsetRaw === "" ? undefined : Number.parseInt(offsetRaw, 10);

  if (limitRaw != null && limitRaw !== "" && !Number.isFinite(limitNum)) {
    return { ok: false, error: "invalid_limit" };
  }
  if (offsetRaw != null && offsetRaw !== "" && !Number.isFinite(offsetNum)) {
    return { ok: false, error: "invalid_offset" };
  }
  if (
    limitNum != null &&
    Number.isFinite(limitNum) &&
    !(limitNum === 10 || limitNum === 20 || limitNum === 50)
  ) {
    return { ok: false, error: "invalid_limit" };
  }

  const limit = clampListLimit(limitNum);
  const offset = clampListOffset(offsetNum);

  const categoryRaw = searchParams.get("category");
  const category =
    !categoryRaw || categoryRaw === "All"
      ? null
      : normalizeIntelligenceCategory(categoryRaw);

  const q = (searchParams.get("q") ?? "").trim();

  const presetRaw = searchParams.get("datePreset") ?? "current-quarter";
  if (!isDatePreset(presetRaw)) {
    return { ok: false, error: "invalid_date_preset" };
  }
  const datePreset = presetRaw;

  const customStart = parseYmd(searchParams.get("customStart"));
  const customEnd = parseYmd(searchParams.get("customEnd"));
  const customRange: IntelligenceCustomRange | null =
    customStart && customEnd ? { start: customStart, end: customEnd } : null;

  const focusIds = parseFocusIdsParam(searchParams.get("focusIds"));
  const skipDateFilter = focusIds.length > 0;
  const dateMatch: "period" | "logged-day" =
    datePreset === "custom" && customRange ? "logged-day" : "period";

  const range = getIntelligenceDateRange(datePreset, customRange, now);

  return {
    ok: true,
    query: {
      limit,
      offset,
      category,
      q,
      datePreset,
      customRange,
      focusIds,
      skipDateFilter,
      dateMatch,
      rangeStart: range.start,
      rangeEnd: range.end,
    },
  };
}
