/** Date / search helpers ported from Design `intelligenceFilters.ts`. */

import { intelligencePeriodBounds } from "@/lib/intelligence/period";
import {
  formatDayRangeTrigger,
  normalizeDayRange,
  parseYmdLocal,
  type DayRange,
} from "@/lib/date-range";

export type IntelligenceDatePreset =
  | "current-quarter"
  | "last-quarter"
  | "current-year"
  | "last-year"
  | "custom";

/** Day-precise bounds picked on the calendar (`YYYY-MM-DD`, both inclusive). */
export type IntelligenceCustomRange = DayRange;

export const INTELLIGENCE_DATE_PRESETS: { id: IntelligenceDatePreset; label: string }[] = [
  { id: "current-quarter", label: "Current quarter" },
  { id: "last-quarter", label: "Last quarter" },
  { id: "current-year", label: "Current year" },
  { id: "last-year", label: "Last year" },
  { id: "custom", label: "Custom" },
];

type SearchableIntelligence = {
  signalName: string;
  valueLabel: string;
  summary?: string | null;
  note: string | null;
  categoryKey: string;
  categoryLabel: string;
  sources?: Array<{ title: string; description?: string | null }>;
};

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function quarterBounds(year: number, quarter: number): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3;
  const start = startOfDay(new Date(year, startMonth, 1));
  const end = endOfDay(new Date(year, startMonth + 3, 0));
  return { start, end };
}

function currentQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

export function getIntelligenceDateRange(
  preset: IntelligenceDatePreset,
  custom: IntelligenceCustomRange | null,
  now = new Date(),
): { start: Date; end: Date; label: string } {
  const year = now.getFullYear();
  const quarter = currentQuarter(now);

  if (preset === "current-quarter") {
    const bounds = quarterBounds(year, quarter);
    return { ...bounds, label: `Q${quarter} ${year}` };
  }
  if (preset === "last-quarter") {
    const lastQuarter = quarter === 1 ? 4 : quarter - 1;
    const lastYear = quarter === 1 ? year - 1 : year;
    const bounds = quarterBounds(lastYear, lastQuarter);
    return { ...bounds, label: `Q${lastQuarter} ${lastYear}` };
  }
  if (preset === "current-year") {
    return {
      start: startOfDay(new Date(year, 0, 1)),
      end: endOfDay(new Date(year, 11, 31)),
      label: `${year}`,
    };
  }
  if (preset === "last-year") {
    return {
      start: startOfDay(new Date(year - 1, 0, 1)),
      end: endOfDay(new Date(year - 1, 11, 31)),
      label: `${year - 1}`,
    };
  }

  const ordered = custom ? normalizeDayRange(custom.start, custom.end) : null;
  const customStart = ordered ? parseYmdLocal(ordered.start) : null;
  const customEnd = ordered ? parseYmdLocal(ordered.end) : null;
  if (!ordered || !customStart || !customEnd) {
    // No range picked yet — stay on the current quarter until the user chooses.
    return { ...quarterBounds(year, quarter), label: "Custom" };
  }
  return {
    start: startOfDay(customStart),
    end: endOfDay(customEnd),
    label: formatDayRangeTrigger(ordered),
  };
}

export function matchesIntelligenceSearch<T extends SearchableIntelligence>(
  item: T,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const sourceText = (item.sources ?? []).flatMap((source) => [
    source.title,
    source.description ?? "",
  ]);
  return [
    item.signalName,
    item.valueLabel,
    item.summary ?? "",
    item.note ?? "",
    item.categoryKey,
    item.categoryLabel,
    ...sourceText,
  ].some((value) => value.toLowerCase().includes(q));
}

/**
 * `period` — the quarter/year presets match the reporting period shown on each
 * row (Q2 2026, etc.), so a quarter preset keeps every row of that quarter.
 * `logged-day` — a custom calendar range matches the day the row was logged,
 * because reporting periods are quarter-granular and cannot answer a day-level
 * question. Both modes fall back to the other field when theirs is missing.
 */
export type IntelligenceDateMatch = "period" | "logged-day";

export function filterIntelligenceByDate<
  T extends { createdAtMs: number; period?: string | null },
>(items: T[], start: Date, end: Date, match: IntelligenceDateMatch = "period"): T[] {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return items.filter((item) => {
    const periodBounds = intelligencePeriodBounds(item.period);
    const withinLoggedDay = item.createdAtMs >= startMs && item.createdAtMs <= endMs;
    if (match === "logged-day" && item.createdAtMs) return withinLoggedDay;
    if (periodBounds) {
      // Include when the reporting period overlaps the selected range.
      return (
        periodBounds.start.getTime() <= endMs && periodBounds.end.getTime() >= startMs
      );
    }
    if (!item.createdAtMs) return true;
    return withinLoggedDay;
  });
}
