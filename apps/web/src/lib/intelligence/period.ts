/** Period helpers aligned with Design SignalsPage / IntelligenceLogForm. */

const INTELLIGENCE_QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export type IntelligenceQuarter = (typeof INTELLIGENCE_QUARTERS)[number];

export { INTELLIGENCE_QUARTERS };

export function currentIntelligencePeriod(now = new Date()): string {
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-q${quarter}`;
}

export function parseIntelligencePeriod(period?: string | null): {
  quarter: string;
  year: string;
} {
  if (!period) return { quarter: "", year: "" };
  const normalized = period.trim().toUpperCase().replace(/\s+/g, "");
  const yearFirst = normalized.match(/^(20\d{2})-?Q([1-4])$/);
  if (yearFirst) return { quarter: `Q${yearFirst[2]}`, year: yearFirst[1] };
  const quarterFirst = normalized.match(/^Q([1-4])-?(20\d{2})$/);
  if (quarterFirst) return { quarter: `Q${quarterFirst[1]}`, year: quarterFirst[2] };
  return { quarter: "", year: "" };
}

/** Persist as `YYYY-qn` (existing observation / metrics convention). */
export function formatIntelligencePeriod(quarter: string, year: string): string {
  const q = quarter.trim().toUpperCase().replace(/^Q/, "");
  return `${year}-q${q}`.toLowerCase();
}

export function normalizeIntelligencePeriod(period?: string | null): string {
  const parsed = parseIntelligencePeriod(period);
  if (parsed.quarter && parsed.year) {
    return formatIntelligencePeriod(parsed.quarter, parsed.year);
  }
  return currentIntelligencePeriod();
}

/** Display as `Q{n} {year}` (e.g. Q2 2026). */
export function formatPeriodDisplay(period?: string | null): string {
  const parsed = parseIntelligencePeriod(period);
  if (parsed.quarter && parsed.year) {
    return `${parsed.quarter} ${parsed.year}`;
  }
  if (!period) return "—";
  const match = period.trim().match(/^(\d{4})-Q([1-4])$/i);
  if (match) return `Q${match[2]} ${match[1]}`;
  return period;
}

/** Calendar bounds for a reporting period (`2026-q2`, `Q2 2026`, …). */
export function intelligencePeriodBounds(
  period?: string | null,
): { start: Date; end: Date } | null {
  const parsed = parseIntelligencePeriod(period);
  if (!parsed.quarter || !parsed.year) return null;
  const quarter = Number(parsed.quarter.replace(/^Q/i, ""));
  const year = Number(parsed.year);
  if (!Number.isFinite(quarter) || quarter < 1 || quarter > 4 || !Number.isFinite(year)) {
    return null;
  }
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, startMonth + 3, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function intelligencePeriodYearOptions(
  preferredYear?: string,
  now = new Date(),
): number[] {
  const current = now.getFullYear();
  const years = [current - 2, current - 1, current, current + 1];
  const preferred = preferredYear ? Number(preferredYear) : NaN;
  if (Number.isFinite(preferred) && !years.includes(preferred)) {
    years.push(preferred);
    years.sort((a, b) => a - b);
  }
  return years;
}
