/**
 * Opaque cursor helpers for public company search (`search_after`).
 *
 * OpenSearch `organizations` mapping (verified live):
 * - `uuid` is `text` + `keyword_lowercase` — not sortable; `uuid.keyword` does not exist.
 * - Deterministic crawl sort: `_id` asc (unique, sortable).
 * - Text search sort: `_score` desc + `_id` asc.
 *
 * Live index caveat (ES 7.9.1, no PIT): inserts/deletes/updates between pages can
 * cause skips/dupes on long crawls. Prefer cursor over deep `from`/`offset`.
 */

export const COMPANY_SEARCH_CURSOR_VERSION = 1 as const;

/** Full-corpus / filter-only cursor sort — verified against organizations index. */
export const COMPANY_SEARCH_CURSOR_SORT_ID = [{ _id: "asc" as const }];

/** Text-query cursor sort — score then stable `_id` tiebreak. */
export const COMPANY_SEARCH_CURSOR_SORT_SCORE_ID = [
  { _score: "desc" as const },
  { _id: "asc" as const },
];

export type CompanySearchCursorPayload = {
  v: typeof COMPANY_SEARCH_CURSOR_VERSION;
  sa: unknown[];
};

export class InvalidCompanySearchCursorError extends Error {
  readonly code = "invalid_cursor" as const;
  constructor(message = "invalid_cursor") {
    super(message);
    this.name = "InvalidCompanySearchCursorError";
  }
}

export function companySearchCursorSort(hasTextQuery: boolean): typeof COMPANY_SEARCH_CURSOR_SORT_ID | typeof COMPANY_SEARCH_CURSOR_SORT_SCORE_ID {
  return hasTextQuery ? COMPANY_SEARCH_CURSOR_SORT_SCORE_ID : COMPANY_SEARCH_CURSOR_SORT_ID;
}

export function encodeCompanySearchCursor(searchAfter: unknown[]): string {
  const payload: CompanySearchCursorPayload = {
    v: COMPANY_SEARCH_CURSOR_VERSION,
    sa: searchAfter,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/**
 * Decode opaque cursor → OpenSearch `search_after` values.
 * Empty / whitespace-only string → first page (no search_after).
 */
export function decodeCompanySearchCursor(raw: string): unknown[] | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(trimmed, "base64url").toString("utf8"));
  } catch {
    throw new InvalidCompanySearchCursorError();
  }

  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new InvalidCompanySearchCursorError();
  }
  const obj = json as Record<string, unknown>;
  if (obj.v !== COMPANY_SEARCH_CURSOR_VERSION) {
    throw new InvalidCompanySearchCursorError();
  }
  if (!Array.isArray(obj.sa) || obj.sa.length === 0) {
    throw new InvalidCompanySearchCursorError();
  }
  return obj.sa;
}

export type CompanySearchPagination =
  | { mode: "offset"; offset: number }
  | { mode: "cursor"; searchAfter?: unknown[] }
  | { mode: "error"; error: "offset_cursor_conflict" | "invalid_cursor" };

/**
 * Resolve pagination from raw query params.
 * - `offset` + `cursor` together → error
 * - `cursor` present (including empty) → cursor mode; empty = first page
 * - otherwise → offset mode (default 0)
 */
export function resolveCompanySearchPagination(input: {
  offsetParam: string | null;
  cursorParam: string | null;
  parseOffset: (raw: string | null, fallback: number) => number;
}): CompanySearchPagination {
  const hasOffset = input.offsetParam != null;
  const hasCursor = input.cursorParam != null;
  if (hasOffset && hasCursor) {
    return { mode: "error", error: "offset_cursor_conflict" };
  }
  if (hasCursor) {
    try {
      const searchAfter = decodeCompanySearchCursor(input.cursorParam ?? "");
      return { mode: "cursor", searchAfter };
    } catch {
      return { mode: "error", error: "invalid_cursor" };
    }
  }
  return { mode: "offset", offset: input.parseOffset(input.offsetParam, 0) };
}

/**
 * Build organizations `_search` body for offset or cursor pagination.
 * Cursor mode never sets `from` (avoids max_result_window).
 */
export function buildCompanySearchOsBody(input: {
  limit: number;
  query: Record<string, unknown>;
  sourceFields: string[];
  pagination: { mode: "offset"; offset: number } | { mode: "cursor"; searchAfter?: unknown[]; hasTextQuery: boolean };
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    size: input.limit,
    _source: input.sourceFields,
    query: input.query,
  };

  if (input.pagination.mode === "offset") {
    body.from = input.pagination.offset;
    return body;
  }

  body.sort = companySearchCursorSort(input.pagination.hasTextQuery);
  if (input.pagination.searchAfter && input.pagination.searchAfter.length > 0) {
    body.search_after = input.pagination.searchAfter;
  }
  return body;
}
