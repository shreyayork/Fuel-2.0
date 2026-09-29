"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Chip } from "@/components/atoms";
import { dropdownScrollProps, type Theme } from "@/lib/theme";
import {
  orderIntelligenceLinkOptions,
  type OrderedIntelligenceLinkOption,
} from "@/lib/intelligence/link-options-order";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import {
  formatIntelligenceLinkOptionMeta,
  formatIntelligenceLinkOptionTitle,
} from "@/lib/initiatives/progress-intelligence-links";
import { formatCategoryLabel } from "./format";
import { inputStyle } from "./styles";

const LIST_MAX_HEIGHT_PX = 360;
const MENU_GAP_PX = 6;
const FALLBACK_MENU_HEIGHT_PX = LIST_MAX_HEIGHT_PX + 56;

/** Trigger label: `headline · keyDetail` when detail is distinct. */
export function formatIntelligencePickerLabel(row: CompanyIntelligenceRow): string {
  const detail = row.keyDetail?.trim();
  if (detail && !row.headline.toLowerCase().includes(detail.toLowerCase())) {
    return `${row.headline} · ${detail}`;
  }
  return row.headline;
}

/** Value column preview for Link intelligence (prefer keyDetail). */
export function intelligenceValuePreview(row: CompanyIntelligenceRow): string {
  const detail = row.keyDetail?.trim();
  if (detail) return detail;
  const colon = row.headline.split(/:\s+/);
  if (colon.length > 1) return colon.slice(1).join(": ").trim();
  const dot = row.headline.split(/\s·\s/);
  if (dot.length > 1) return dot[dot.length - 1]!.trim();
  return row.headline;
}

function matchesQuery(row: CompanyIntelligenceRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    row.headline.toLowerCase().includes(needle) ||
    (row.keyDetail ?? "").toLowerCase().includes(needle) ||
    row.category.toLowerCase().includes(needle) ||
    formatCategoryLabel(row.category).toLowerCase().includes(needle) ||
    (row.period ?? "").toLowerCase().includes(needle) ||
    (row.summary ?? "").toLowerCase().includes(needle)
  );
}

function optionTitle(row: OrderedIntelligenceLinkOption): string {
  const base = formatIntelligenceLinkOptionTitle(row);
  return row.isLatest ? `${base} (latest)` : base;
}

export function IntelligenceItemPicker({
  t,
  value,
  onChange,
  items,
  loading = false,
  emptyMessage = "No intelligence available.",
  triggerStyle,
  placeholder = "Select intelligence…",
}: {
  t: Theme;
  value: string;
  onChange: (intelligenceId: string) => void;
  items: CompanyIntelligenceRow[];
  loading?: boolean;
  emptyMessage?: string;
  triggerStyle?: CSSProperties;
  placeholder?: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState<"below" | "above">("below");
  /** Safari: option mousedown unmounts menu → click falls through to trigger and reopens. */
  const ignoreTriggerClickRef = useRef(false);

  const ordered = useMemo(
    () => orderIntelligenceLinkOptions(items),
    [items],
  );

  const selected = useMemo(
    () => ordered.find((row) => row.id === value) ?? null,
    [ordered, value],
  );

  const filtered = useMemo(
    () => ordered.filter((row) => matchesQuery(row, query)),
    [ordered, query],
  );

  const updatePlacement = useCallback(() => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const measuredHeight = menuRef.current?.offsetHeight ?? 0;
    const menuHeight =
      measuredHeight > 0 ? measuredHeight : FALLBACK_MENU_HEIGHT_PX;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const fitsBelow = spaceBelow >= menuHeight + MENU_GAP_PX;
    const fitsAbove = spaceAbove >= menuHeight + MENU_GAP_PX;
    setPlacement(!fitsBelow && fitsAbove ? "above" : "below");
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePlacement();
  }, [open, updatePlacement, filtered.length, query]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePlacement();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePlacement]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const selectItem = (id: string) => {
    onChange(id);
    ignoreTriggerClickRef.current = true;
    close();
    window.setTimeout(() => {
      ignoreTriggerClickRef.current = false;
    }, 0);
  };

  const openAbove = placement === "above";

  return (
    <div ref={rootRef} style={{ minWidth: 0, position: "relative", width: "100%" }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={loading}
        onClick={() => {
          if (loading) return;
          if (ignoreTriggerClickRef.current) {
            return;
          }
          if (open) {
            close();
            return;
          }
          setOpen(true);
        }}
        style={{
          ...inputStyle(t),
          alignItems: "center",
          boxSizing: "border-box",
          color: selected ? t.ink : t.muted,
          cursor: loading ? "wait" : "pointer",
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          minHeight: 40,
          opacity: loading ? 0.7 : 1,
          textAlign: "left",
          ...triggerStyle,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {loading
            ? "Loading intelligence…"
            : selected
              ? optionTitle(selected)
              : placeholder}
        </span>
        <span style={{ color: t.mutedSoft, flexShrink: 0 }}>▾</span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label="Company intelligence"
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            bottom: openAbove ? "100%" : "auto",
            boxShadow: `0 8px 24px ${t.overlay}`,
            display: "flex",
            flexDirection: "column",
            left: 0,
            marginBottom: openAbove ? MENU_GAP_PX : 0,
            marginTop: openAbove ? 0 : MENU_GAP_PX,
            maxHeight: FALLBACK_MENU_HEIGHT_PX,
            minWidth: "100%",
            overflow: "hidden",
            position: "absolute",
            right: 0,
            top: openAbove ? "auto" : "100%",
            width: "max(100%, 280px)",
            zIndex: 40,
          }}
        >
          <div style={{ borderBottom: `1px solid ${t.rule}`, flexShrink: 0, padding: 8 }}>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                }
              }}
              placeholder={`Search ${items.length} item${items.length === 1 ? "" : "s"}…`}
              aria-label="Search intelligence"
              style={{
                ...inputStyle(t),
                background: t.panelAlt,
              }}
            />
          </div>

          <div
            {...dropdownScrollProps(t, {
              flex: 1,
              minHeight: 0,
              padding: "4px 6px 6px",
            })}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  color: t.muted,
                  fontFamily: t.sans,
                  fontSize: 12,
                  padding: "12px 8px",
                }}
              >
                {items.length === 0
                  ? emptyMessage
                  : "No matching intelligence."}
              </div>
            ) : (
              filtered.map((row) => {
                const active = row.id === value;
                const title = formatIntelligenceLinkOptionTitle(row);
                const meta =
                  formatIntelligenceLinkOptionMeta(row) ||
                  formatCategoryLabel(row.category);
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    aria-label={
                      row.isLatest ? `${title}, latest. ${meta}` : `${title}. ${meta}`
                    }
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectItem(row.id);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      selectItem(row.id);
                    }}
                    style={{
                      background: active ? `${t.accent}18` : "transparent",
                      border: "none",
                      borderRadius: 6,
                      color: t.ink,
                      cursor: "pointer",
                      display: "block",
                      fontFamily: t.sans,
                      fontSize: 12.5,
                      padding: "8px 10px",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          fontWeight: 600,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {title}
                      </span>
                      {row.isLatest ? (
                        <Chip
                          t={t}
                          tone="accent"
                          style={{ flexShrink: 0, fontSize: 10, padding: "1px 6px" }}
                        >
                          latest
                        </Chip>
                      ) : null}
                    </div>
                    <div
                      style={{
                        color: t.muted,
                        fontSize: 11,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {meta}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
