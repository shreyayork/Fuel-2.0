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
import { dropdownScrollProps, type Theme } from "@/lib/theme";
import {
  formatSignalOptionLabel,
  groupSignalCatalogByCategory,
  type SignalCatalogItem,
} from "@/lib/signals/group-catalog";
import { formatCategoryLabel } from "./format";
import { inputStyle, DRAWER_FORM_CONTROL_MIN_HEIGHT_PX } from "./styles";

const LIST_MAX_HEIGHT_PX = 360;
/** Gap between trigger and menu — matches prior marginTop. */
const MENU_GAP_PX = 6;
/** Search header + padding estimate before first layout measure. */
const FALLBACK_MENU_HEIGHT_PX = LIST_MAX_HEIGHT_PX + 56;

function signalMatchesQuery(signal: SignalCatalogItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    signal.label.toLowerCase().includes(needle) ||
    signal.category.toLowerCase().includes(needle) ||
    formatCategoryLabel(signal.category).toLowerCase().includes(needle) ||
    (signal.unit ?? "").toLowerCase().includes(needle)
  );
}

export function SignalCatalogPicker({
  t,
  value,
  onChange,
  signals,
  triggerStyle,
}: {
  t: Theme;
  value: string;
  onChange: (signalId: string) => void;
  signals: SignalCatalogItem[];
  /** Optional override for the closed trigger (e.g. initiative form controls). */
  triggerStyle?: CSSProperties;
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

  const selected = useMemo(
    () => signals.find((signal) => signal.id === value),
    [signals, value],
  );

  const filtered = useMemo(
    () => signals.filter((signal) => signalMatchesQuery(signal, query)),
    [signals, query],
  );
  const grouped = useMemo(
    () => groupSignalCatalogByCategory(filtered),
    [filtered],
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
    if (!open) {
      setPlacement("below");
      return;
    }
    updatePlacement();
    const raf = window.requestAnimationFrame(updatePlacement);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open, updatePlacement, filtered.length, query]);

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

  const selectSignal = (signalId: string) => {
    onChange(signalId);
    // Swallow only the ghost click that can follow option mousedown→unmount.
    // Always clear on next macrotask so a missed ghost click cannot poison reopen.
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
        onClick={() => {
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
          cursor: "pointer",
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          minHeight: DRAWER_FORM_CONTROL_MIN_HEIGHT_PX,
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
          {selected ? formatSignalOptionLabel(selected) : "Select a signal…"}
        </span>
        <span style={{ color: t.mutedSoft, flexShrink: 0 }}>▾</span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label="Signal catalog"
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
              placeholder={`Search ${signals.length} signal${signals.length === 1 ? "" : "s"}…`}
              aria-label="Search signals"
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
                  padding: "12px 10px",
                }}
              >
                {query.trim()
                  ? `No signals match "${query.trim()}".`
                  : "No signals available."}
              </div>
            ) : (
              grouped.map(([category, categorySignals]) => (
                <div key={category}>
                  <div
                    style={{
                      color: t.mutedSoft,
                      fontFamily: t.mono,
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      padding: "10px 10px 4px",
                      textTransform: "uppercase",
                    }}
                  >
                    {formatCategoryLabel(category)}
                  </div>
                  {categorySignals.map((signal) => {
                    const active = signal.id === value;
                    return (
                      <button
                        key={signal.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseDown={(e) => {
                          // Prefer mousedown so Safari does not reopen via click-through.
                          e.preventDefault();
                          selectSignal(signal.id);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          selectSignal(signal.id);
                        }}
                        style={{
                          background: active ? t.panelAlt : "transparent",
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
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = t.panelAlt;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = active
                            ? t.panelAlt
                            : "transparent";
                        }}
                      >
                        {formatSignalOptionLabel(signal)}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
