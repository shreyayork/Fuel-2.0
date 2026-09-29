export const MILESTONE_DUE_DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/;

/** Strictly validate a canonical milestone date (`MM-DD-YYYY`). */
export function isMilestoneDueDate(value: string): boolean {
  if (!MILESTONE_DUE_DATE_PATTERN.test(value)) return false;
  const [monthRaw, dayRaw, yearRaw] = value.split("-");
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const year = Number(yearRaw);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/**
 * Normalize canonical or native date-input values to `MM-DD-YYYY`.
 * Returns null for malformed or impossible dates.
 */
export function normalizeMilestoneDueDate(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (isMilestoneDueDate(trimmed)) return trimmed;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!iso) return null;
  const canonical = `${iso[2]}-${iso[3]}-${iso[1]}`;
  return isMilestoneDueDate(canonical) ? canonical : null;
}

/** Convert canonical storage format to the value required by `<input type="date">`. */
export function milestoneDueDateToInputValue(
  value: string | null | undefined,
): string {
  const canonical = normalizeMilestoneDueDate(value);
  if (!canonical) return "";
  const [month, day, year] = canonical.split("-");
  return `${year}-${month}-${day}`;
}

/** Format a Date as canonical milestone due date (`MM-DD-YYYY`, UTC calendar day). */
export function formatMilestoneDueDate(date: Date = new Date()): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}-${day}-${date.getUTCFullYear()}`;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function parseMilestoneDueDateUtc(canonical: string): Date | null {
  if (!isMilestoneDueDate(canonical)) return null;
  const [monthRaw, dayRaw, yearRaw] = canonical.split("-");
  return new Date(
    Date.UTC(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw)),
  );
}

/** True when canonical `MM-DD-YYYY` is today or later (UTC day). */
export function isMilestoneDueDateOnOrAfter(
  value: string,
  baseDate: Date = new Date(),
): boolean {
  const parsed = parseMilestoneDueDateUtc(value);
  if (!parsed) return false;
  return parsed.getTime() >= startOfUtcDay(baseDate).getTime();
}

/** Calculate a valid due date while clamping short target months. */
export function milestoneDueDateAfterMonths(
  months: number,
  baseDate: Date = new Date(),
): string {
  const targetMonthStart = new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(
      targetMonthStart.getUTCFullYear(),
      targetMonthStart.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  const day = Math.min(baseDate.getUTCDate(), lastDay);
  const month = String(targetMonthStart.getUTCMonth() + 1).padStart(2, "0");
  return `${month}-${String(day).padStart(2, "0")}-${targetMonthStart.getUTCFullYear()}`;
}

/** Calculate progressive starter dates, one month apart. */
export function defaultMilestoneDueDates(
  baseDate: Date = new Date(),
): [string, string, string] {
  return [1, 2, 3].map((months) =>
    milestoneDueDateAfterMonths(months, baseDate),
  ) as [string, string, string];
}

/**
 * Keep on/after-today due dates; replace past or missing ones with
 * progressive future dates (+1 / +2 / +3 … months from baseDate).
 */
export function ensureFutureMilestoneDueDates<
  T extends { due_date?: string | null },
>(milestones: T[], baseDate: Date = new Date()): T[] {
  return milestones.map((milestone, index) => {
    const existing = normalizeMilestoneDueDate(milestone.due_date);
    if (existing && isMilestoneDueDateOnOrAfter(existing, baseDate)) {
      return { ...milestone, due_date: existing };
    }
    return {
      ...milestone,
      due_date: milestoneDueDateAfterMonths(index + 1, baseDate),
    };
  });
}

export function defaultInitiativeMilestoneTitles(opts: {
  initiativeName: string;
  categoryId?: string | null;
}): [string, string, string] {
  const track =
    opts.categoryId === "dev" ? "R&D" : opts.categoryId === "rev" ? "G&A" : "GTM";
  const initiativeName = opts.initiativeName.trim() || "this initiative";
  return [
    `Define scope for ${initiativeName}`,
    `Execute first ${track} workstream`,
    "Review progress vs target intelligence",
  ];
}
