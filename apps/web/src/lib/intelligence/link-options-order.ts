import { progressSignalKey } from "@/lib/initiatives/progress-intelligence-links";
import type { CompanyIntelligenceRow } from "./types";

export type OrderedIntelligenceLinkOption = CompanyIntelligenceRow & {
  /** True only when this signal has multiple entries and this row is the newest. */
  isLatest: boolean;
};

/** Prefer catalog signal id; fall back to normalized headline label. */
export function intelligenceLinkSignalGroupKey(
  row: Pick<CompanyIntelligenceRow, "headline" | "signalId">,
): string {
  const signalId = row.signalId?.trim();
  if (signalId) return `sid:${signalId}`;
  return `lbl:${progressSignalKey(row.headline)}`;
}

function compareRecency(
  a: Pick<CompanyIntelligenceRow, "id" | "createdAt">,
  b: Pick<CompanyIntelligenceRow, "id" | "createdAt">,
): number {
  const ta = new Date(a.createdAt).getTime();
  const tb = new Date(b.createdAt).getTime();
  if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
  return b.id.localeCompare(a.id);
}

/**
 * Group by signal, sort each group latest→oldest (`createdAt`, then `id`),
 * order groups by their newest entry, and mark `isLatest` only when a group
 * has more than one entry.
 */
export function orderIntelligenceLinkOptions(
  items: CompanyIntelligenceRow[],
): OrderedIntelligenceLinkOption[] {
  if (items.length === 0) return [];

  const groups = new Map<string, CompanyIntelligenceRow[]>();
  for (const item of items) {
    const key = intelligenceLinkSignalGroupKey(item);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const sortedGroups = [...groups.values()].map((group) =>
    [...group].sort(compareRecency),
  );
  sortedGroups.sort((a, b) => compareRecency(a[0]!, b[0]!));

  const out: OrderedIntelligenceLinkOption[] = [];
  for (const group of sortedGroups) {
    const multi = group.length > 1;
    for (let i = 0; i < group.length; i++) {
      out.push({ ...group[i]!, isLatest: multi && i === 0 });
    }
  }
  return out;
}
