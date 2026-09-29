/** Shared day-range helpers for the Intelligence and Usage date pickers. */

export type DayRange = {
  start: string; // YYYY-MM-DD
  end: string;
};

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a local calendar day from `YYYY-MM-DD`. Rejects impossible dates. */
export function parseYmdLocal(value: string): Date | null {
  const match = YMD.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatYmdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Normalize a complete day range. Returns null when either side is missing/invalid.
 * Swaps bounds when start is after end.
 */
export function normalizeDayRange(
  start: string | null | undefined,
  end: string | null | undefined,
): DayRange | null {
  if (!start?.trim() || !end?.trim()) return null;
  const startDate = parseYmdLocal(start);
  const endDate = parseYmdLocal(end);
  if (!startDate || !endDate) return null;
  if (startDate.getTime() <= endDate.getTime()) {
    return { start: formatYmdLocal(startDate), end: formatYmdLocal(endDate) };
  }
  return { start: formatYmdLocal(endDate), end: formatYmdLocal(startDate) };
}

/** In-progress selection: `end` is absent until the user picks the second day. */
export type PendingDayRange = { start: string; end?: string };

export type RangeSelectionOutcome =
  | { kind: "cleared" }
  | { kind: "pending"; pending: PendingDayRange }
  | { kind: "applied"; range: DayRange; close: boolean };

/**
 * Maps the calendar's next range (DayPicker computes extend / shrink / clear)
 * onto what the picker should do. A range completed from a start-only
 * selection closes the popover; adjusting an already-applied range keeps it
 * open so the user can keep refining or clear it.
 */
export function resolveRangeSelection(
  previous: PendingDayRange | null,
  next: PendingDayRange | null,
): RangeSelectionOutcome {
  if (!next?.start) return { kind: "cleared" };
  if (!next.end) return { kind: "pending", pending: { start: next.start } };

  const range = normalizeDayRange(next.start, next.end);
  if (!range) return { kind: "pending", pending: { start: next.start } };
  return { kind: "applied", range, close: Boolean(previous?.start && !previous.end) };
}

/** Local calendar day for an ISO timestamp (Usage report range bounds). */
export function isoToYmdLocal(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatYmdLocal(date);
}

export type PickerDateRange = { from: Date | undefined; to?: Date };

export function pendingRangeToPicker(
  pending: PendingDayRange | null | undefined,
): PickerDateRange | undefined {
  if (!pending) return undefined;
  const from = parseYmdLocal(pending.start);
  if (!from) return undefined;
  const to = pending.end ? (parseYmdLocal(pending.end) ?? undefined) : undefined;
  return { from, to };
}

export function formatDayRangeTrigger(range: DayRange): string {
  const start = parseYmdLocal(range.start);
  const end = parseYmdLocal(range.end);
  if (!start || !end) return "";
  const fmt = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}
