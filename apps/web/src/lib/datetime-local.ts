/**
 * Helpers for `<input type="datetime-local">` values (`YYYY-MM-DDTHH:mm`),
 * which have no timezone. Always convert with an explicit UTC offset so
 * Server Actions (often UTC) do not reinterpret the admin's wall clock.
 */

const DATETIME_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

/** Minutes east of UTC in the current environment (IST = 330, EST = -300). */
export function localOffsetMinutesEast(now: Date = new Date()): number {
  return -now.getTimezoneOffset();
}

/**
 * Parse a datetime-local string as wall-clock time in `offsetMinutesEast`,
 * returning the UTC instant. ISO strings with `Z` / numeric offset parse via
 * `Date` and ignore `offsetMinutesEast`.
 */
export function parseDatetimeLocalWallClock(
  value: string,
  offsetMinutesEast: number,
): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = DATETIME_LOCAL_RE.exec(trimmed);
  if (!match) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);
  if (
    [year, month, day, hour, minute, second].some((n) => Number.isNaN(n)) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  // Interpret components as wall clock in the given offset, not server local.
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute, second) -
    offsetMinutesEast * 60_000;
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Browser/admin helper: datetime-local → ISO UTC for FormData / API payloads. */
export function datetimeLocalToIsoUtc(
  value: string,
  offsetMinutesEast: number = localOffsetMinutesEast(),
): string | null {
  const date = parseDatetimeLocalWallClock(value, offsetMinutesEast);
  return date ? date.toISOString() : null;
}

/**
 * Format a UTC instant for `<input type="datetime-local">` (or display) in
 * the given offset. Defaults to the environment's local offset.
 */
export function toDatetimeLocalValue(
  value: Date | string | null | undefined,
  offsetMinutesEast: number = localOffsetMinutesEast(),
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const wallMs = date.getTime() + offsetMinutesEast * 60_000;
  const wall = new Date(wallMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`;
}
