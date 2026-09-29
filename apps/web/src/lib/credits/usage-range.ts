/** Pure usage period / custom-range helpers (safe for unit tests — no server-only). */

import type { UsagePeriod } from "./types";
import { normalizeDayRange, parseYmdLocal, type DayRange } from "@/lib/date-range";

export type { DayRange };

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function getPeriodRange(
  period: UsagePeriod,
  now = new Date(),
): { start: Date; end: Date } {
  const end = endOfDay(now);
  const start = startOfDay(now);

  if (period === "7d") {
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  if (period === "30d") {
    start.setDate(start.getDate() - 29);
    return { start, end };
  }
  if (period === "mtd") {
    start.setDate(1);
    return { start, end };
  }
  if (period === "last-month") {
    start.setMonth(start.getMonth() - 1, 1);
    const lastEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    return { start, end: lastEnd };
  }
  return { start, end };
}

export function formatRangeLabel(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  const fmt = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (sameDay) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

export function daysInRange(start: Date, end: Date): number {
  const ms = endOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
}

export type ParseCustomRangeResult =
  | { ok: true; start: Date; end: Date; range: DayRange }
  | { ok: false; error: "missing" | "invalid" };

/**
 * Parse optional Usage API `from`/`to` query params.
 * Both required when either is present; invalid calendar → invalid; reversed → swap.
 */
export function parseUsageCustomRangeParams(
  from: string | null | undefined,
  to: string | null | undefined,
): ParseCustomRangeResult {
  const hasFrom = Boolean(from?.trim());
  const hasTo = Boolean(to?.trim());
  if (!hasFrom && !hasTo) return { ok: false, error: "missing" };
  if (!hasFrom || !hasTo) return { ok: false, error: "invalid" };

  const normalized = normalizeDayRange(from, to);
  if (!normalized) return { ok: false, error: "invalid" };

  const start = parseYmdLocal(normalized.start);
  const endDate = parseYmdLocal(normalized.end);
  if (!start || !endDate) return { ok: false, error: "invalid" };

  return {
    ok: true,
    start: startOfDay(start),
    end: endOfDay(endDate),
    range: normalized,
  };
}
