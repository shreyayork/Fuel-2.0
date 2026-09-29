/** Shared list pagination contract for Intelligence / Initiatives / Sources. */

export const LIST_PAGE_SIZES = [10, 20, 50] as const;
export type ListPageSize = (typeof LIST_PAGE_SIZES)[number];
export const DEFAULT_LIST_PAGE_SIZE: ListPageSize = 20;

export type PaginatedMeta = {
  total: number;
  limit: number;
  offset: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginatedMeta;
};

export function isListPageSize(value: number): value is ListPageSize {
  return (LIST_PAGE_SIZES as readonly number[]).includes(value);
}

/** Whitelist 10|20|50; default 20. */
export function clampListLimit(limit: number | undefined): ListPageSize {
  if (limit != null && isListPageSize(limit)) return limit;
  return DEFAULT_LIST_PAGE_SIZE;
}

/** Non-negative finite offset; truncates fractions. */
export function clampListOffset(offset: number | undefined): number {
  const n = offset ?? 0;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.trunc(n);
}

export function parseListLimitParam(raw: string | null): ListPageSize {
  if (raw == null || raw === "") return DEFAULT_LIST_PAGE_SIZE;
  const n = Number.parseInt(raw, 10);
  return clampListLimit(Number.isFinite(n) ? n : undefined);
}

export function parseListOffsetParam(raw: string | null): number {
  if (raw == null || raw === "") return 0;
  const n = Number.parseInt(raw, 10);
  return clampListOffset(Number.isFinite(n) ? n : undefined);
}
