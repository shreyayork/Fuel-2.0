export type IntelligenceDatePreset =
  | "current-quarter"
  | "last-quarter"
  | "current-year"
  | "last-year"
  | "custom";

export type IntelligenceGroupMode = "none" | "intelligence" | "source";

export type IntelligenceCustomRange = {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
};

export type IntelligenceGroupBlock = {
  key: string;
  label: string;
  meta?: string;
  items: IntelligenceItemLike[];
};

type IntelligenceItemLike = {
  id: string;
  type: string;
  text: string;
  highlight: string;
  title: string;
  sources: { title: string; system: string; sourceType: string }[];
  updatedAtMs?: number;
};

export const INTELLIGENCE_DATE_PRESETS: { id: IntelligenceDatePreset; label: string }[] = [
  { id: "current-quarter", label: "Current quarter" },
  { id: "last-quarter", label: "Last quarter" },
  { id: "current-year", label: "Current year" },
  { id: "last-year", label: "Last year" },
  { id: "custom", label: "Custom" },
];

export const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

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

function monthYearBounds(month: number, year: number): { start: Date; end: Date } {
  const start = startOfDay(new Date(year, month, 1));
  const end = endOfDay(new Date(year, month + 1, 0));
  return { start, end };
}

export function getIntelligenceDateRange(
  preset: IntelligenceDatePreset,
  custom: IntelligenceCustomRange,
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

  const start = monthYearBounds(custom.startMonth, custom.startYear).start;
  const end = monthYearBounds(custom.endMonth, custom.endYear).end;
  const startLabel = `${MONTH_OPTIONS[custom.startMonth].slice(0, 3)} ${custom.startYear}`;
  const endLabel = `${MONTH_OPTIONS[custom.endMonth].slice(0, 3)} ${custom.endYear}`;
  return {
    start: start.getTime() <= end.getTime() ? start : end,
    end: start.getTime() <= end.getTime() ? end : start,
    label: `${startLabel} – ${endLabel}`,
  };
}

export function matchesIntelligenceSearch<T extends IntelligenceItemLike>(item: T, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    item.text,
    item.highlight,
    item.title,
    item.type,
    ...item.sources.flatMap(source => [source.title, source.system, source.sourceType]),
  ].some(value => value.toLowerCase().includes(q));
}

export function filterIntelligenceByDate<T extends IntelligenceItemLike>(
  items: T[],
  start: Date,
  end: Date,
  resolveUpdatedAtMs: (item: T) => number,
): T[] {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return items.filter(item => {
    const ms = resolveUpdatedAtMs(item);
    if (!ms) return true;
    return ms >= startMs && ms <= endMs;
  });
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceGroupLabel<T extends IntelligenceItemLike>(item: T): { key: string; label: string; meta?: string } {
  const primary = item.sources[0];
  if (!primary) {
    return { key: "manual", label: "Manual & inferred", meta: "Logged or generated without a linked source" };
  }
  const key = primary.system || primary.sourceType || primary.title;
  return {
    key,
    label: titleCase(primary.system || primary.title),
    meta: primary.title,
  };
}

export function groupIntelligenceItems<T extends IntelligenceItemLike>(
  items: T[],
  mode: IntelligenceGroupMode,
  resolveUpdatedAtMs: (item: T) => number,
): IntelligenceGroupBlock[] {
  if (mode === "none") return [];

  const buckets = new Map<string, IntelligenceGroupBlock>();

  items.forEach(item => {
    const group = mode === "intelligence"
      ? { key: item.type, label: titleCase(item.type), meta: "Intelligence type" }
      : sourceGroupLabel(item);
    const existing = buckets.get(group.key);
    if (existing) {
      existing.items.push(item);
      return;
    }
    buckets.set(group.key, { ...group, items: [item] });
  });

  return [...buckets.values()]
    .map(block => ({
      ...block,
      items: [...block.items].sort((left, right) => resolveUpdatedAtMs(right) - resolveUpdatedAtMs(left)),
    }))
    .sort((left, right) => right.items.length - left.items.length || left.label.localeCompare(right.label));
}

export function buildYearOptions(now = new Date(), span = 6): number[] {
  const current = now.getFullYear();
  return Array.from({ length: span }, (_, index) => current - index);
}
