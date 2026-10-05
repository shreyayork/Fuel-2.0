import { CATEGORY_META, type OverviewCategoryId } from "@/lib/overview/constants";

export type InitiativePillar = OverviewCategoryId;
export type InitiativeListStatus = "Active" | "Completed";
export type InitiativeUiStatus = "Suggested" | "Active" | "Completed";

export const PILLAR_OPTIONS: Array<{ value: InitiativePillar; label: string }> = [
  { value: "mkt", label: "GTM" },
  { value: "dev", label: "R&D" },
  { value: "rev", label: "G&A" },
];

const AREA_TO_PILLAR: Record<string, InitiativePillar> = {
  gtm: "mkt",
  product: "dev",
  finance: "rev",
  mkt: "mkt",
  dev: "dev",
  rev: "rev",
};

export function pillarFromStored(opts: {
  overviewCategoryId?: string | null;
  area?: string | null;
}): InitiativePillar {
  if (opts.overviewCategoryId === "mkt" || opts.overviewCategoryId === "dev" || opts.overviewCategoryId === "rev") {
    return opts.overviewCategoryId;
  }
  return AREA_TO_PILLAR[opts.area ?? ""] ?? "mkt";
}

export function areaFromPillar(pillar: InitiativePillar): string {
  return CATEGORY_META[pillar].initiativeArea;
}

export function pillarLabel(pillar: InitiativePillar): string {
  return CATEGORY_META[pillar].label;
}

export function kindLabel(kind: "continuous" | "onetime" | "one-time"): string {
  return kind === "continuous" ? "Continuous" : "One-time";
}

export function normalizeUiStatus(status: string): InitiativeUiStatus {
  const s = status.trim().toLowerCase();
  if (s === "draft" || s === "suggested") return "Suggested";
  if (s === "completed" || s === "complete") return "Completed";
  return "Active";
}

export function normalizeListStatus(status: string): InitiativeListStatus {
  return normalizeUiStatus(status) === "Completed" ? "Completed" : "Active";
}

export function displayDue(due: string | null | undefined): string {
  if (!due?.trim()) return "—";
  const m = due.trim().match(/^(\d{4})[-.]?[qQ]([1-4])$/);
  if (m) return `Q${m[2]} ${m[1]}`;
  const m2 = due.trim().match(/^(\d{4})-Q([1-4])$/i);
  if (m2) return `Q${m2[2]} ${m2[1]}`;
  return due.trim();
}

/** Header / card meta — omit empty due so we never render a lone "· —". */
export function initiativeHeaderMeta(
  kind: "continuous" | "onetime" | "one-time",
  pillar: InitiativePillar,
  due?: string | null,
): string {
  const parts = [kindLabel(kind), pillarLabel(pillar)];
  if (due?.trim()) parts.push(displayDue(due));
  return parts.join(" · ");
}

/** Canonical store form: YYYY-QN */
export function formatDueQuarter(year: number, quarter: number): string {
  return `${year}-Q${quarter}`;
}

export function parseDueQuarter(due: string | null | undefined): {
  year: number;
  quarter: number;
} | null {
  if (!due?.trim()) return null;
  const m = due.trim().match(/^(\d{4})[-.]?[qQ]([1-4])$/);
  if (!m) return null;
  return { year: Number(m[1]), quarter: Number(m[2]) };
}

export function defaultMilestoneSeeds(title: string, pillar: InitiativePillar): Array<{ title: string }> {
  const track = pillarLabel(pillar);
  return [
    { title: `Define scope for ${title}` },
    { title: `Execute first ${track} workstream` },
    { title: "Review progress vs target intelligence" },
  ];
}

export function dueYearOptions(fromYear = new Date().getFullYear()): number[] {
  return [0, 1, 2, 3].map((offset) => fromYear + offset);
}
