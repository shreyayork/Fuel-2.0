"use client";

import type { CSSProperties } from "react";
import type { Theme } from "@/lib/theme";

export const LIST_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type ListPageSize = (typeof LIST_PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_LIST_PAGE_SIZE: ListPageSize = 20;

/** Clamp 0-based page so it stays within `[0, maxPage]` for the given total/size. */
export function clampListPage(page: number, total: number, pageSize: number): number {
  const size = Math.max(1, pageSize);
  const maxPage = Math.max(0, Math.ceil(total / size) - 1);
  return Math.min(Math.max(0, page), maxPage);
}

export function listPageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = clampListPage(page, items.length, pageSize);
  const start = safePage * pageSize;
  return items.slice(start, start + pageSize);
}

function navBtnStyle(t: Theme, disabled: boolean): CSSProperties {
  return {
    background: disabled ? "transparent" : t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    color: disabled ? t.mutedSoft : t.inkSoft,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 500,
    minHeight: 36,
    opacity: disabled ? 0.55 : 1,
    padding: "6px 12px",
  };
}

/**
 * Client-list pager — Billing-style “Showing X–Y of Z” + Prev/Next, plus page-size select.
 * Render only when the parent has items (`total > 0`).
 * Single-page lists hide Prev/Next; page-size hides when total fits the smallest option.
 */
export function ListPagination({
  t,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = LIST_PAGE_SIZE_OPTIONS,
  itemLabel = "items",
}: {
  t: Theme;
  /** 0-based page index. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: ListPageSize) => void;
  pageSizeOptions?: readonly number[];
  /** Noun in the summary, e.g. "groups" / "initiatives" / "sources". */
  itemLabel?: string;
}) {
  if (total <= 0) return null;

  const safePage = clampListPage(page, total, pageSize);
  const start = safePage * pageSize + 1;
  const end = Math.min(total, (safePage + 1) * pageSize);
  const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const atStart = safePage <= 0;
  const atEnd = safePage >= maxPage;
  const multiPage = maxPage > 0;
  const smallestSize = Math.min(...pageSizeOptions);
  const showPageSize = total > smallestSize;

  if (!multiPage && !showPageSize) {
    return (
      <p
        style={{
          color: t.muted,
          fontFamily: t.sans,
          fontSize: 12,
          margin: "12px 0 0",
        }}
      >
        {total} {itemLabel}
      </p>
    );
  }

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "space-between",
        marginTop: 14,
      }}
    >
      <span style={{ color: t.muted, fontFamily: t.sans, fontSize: 12 }}>
        {multiPage
          ? `Showing ${start}–${end} of ${total} ${itemLabel}`
          : `${total} ${itemLabel}`}
      </span>
      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
        {showPageSize ? (
          <label
            style={{
              alignItems: "center",
              color: t.muted,
              display: "inline-flex",
              fontFamily: t.sans,
              fontSize: 12,
              gap: 6,
            }}
          >
            Per page
            <select
              aria-label="Items per page"
              value={pageSize}
              onChange={(e) => {
                const next = Number(e.target.value) as ListPageSize;
                onPageSizeChange(next);
              }}
              style={{
                background: t.panel,
                border: `1px solid ${t.rule}`,
                borderRadius: 6,
                color: t.ink,
                cursor: "pointer",
                fontFamily: t.sans,
                fontSize: 12,
                minHeight: 36,
                padding: "5px 8px",
              }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {multiPage ? (
          <>
            <button
              type="button"
              disabled={atStart}
              style={navBtnStyle(t, atStart)}
              onClick={() => onPageChange(safePage - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={atEnd}
              style={navBtnStyle(t, atEnd)}
              onClick={() => onPageChange(safePage + 1)}
            >
              Next
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
