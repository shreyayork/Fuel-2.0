"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEventHandler,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  brandNavyFill,
  ctaPrimaryStyle,
  onAccentText,
  onBrandNavyText,
  type Theme,
} from "@/lib/theme";
import { BREAKPOINTS, TOUCH_TARGET_MIN, useNarrow } from "@/lib/responsive";
import { G } from "./icons";

const iconBtnBase = (t: Theme): CSSProperties => ({
  alignItems: "center",
  borderRadius: 8,
  boxSizing: "border-box",
  cursor: "pointer",
  display: "inline-flex",
  flexShrink: 0,
  fontFamily: t.sans,
  height: TOUCH_TARGET_MIN,
  justifyContent: "center",
  minWidth: TOUCH_TARGET_MIN,
  padding: 0,
  transition: "background 140ms ease, border-color 140ms ease, color 140ms ease",
  width: TOUCH_TARGET_MIN,
});

/** Compact navy “+” create control for list headers / empty states. */
export function CreateIconButton({
  t,
  label,
  active = false,
  style,
  ...rest
}: {
  t: Theme;
  label: string;
  active?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "style"> & {
  style?: CSSProperties;
}) {
  const navy = brandNavyFill(t);
  const fg = onBrandNavyText(t);
  const phone = useNarrow(BREAKPOINTS.md);
  const showClose = Boolean(active) && !phone;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={showClose || undefined}
      style={{
        ...iconBtnBase(t),
        background: showClose ? "transparent" : navy,
        border: `1px solid ${navy}`,
        color: showClose ? navy : fg,
        ...style,
      }}
      {...rest}
    >
      {showClose ? G.close : G.plus}
    </button>
  );
}

const FILTER_INSET = 12;
const FILTER_GAP = 6;
const FILTER_MAX_W = 300;
const FILTER_MIN_W = 200;
const FILTER_MAX_H = 340;

function placeFilterPanel(
  btn: DOMRect,
  align: "start" | "end",
): { top: number; left: number; width: number; maxHeight: number } {
  const vv = window.visualViewport;
  const vx = vv?.offsetLeft ?? 0;
  const vy = vv?.offsetTop ?? 0;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;
  const insetL = FILTER_INSET + vx;
  const insetR = vx + vw - FILTER_INSET;
  const insetT = FILTER_INSET + vy;
  const insetB = vy + vh - FILTER_INSET;

  const width = Math.min(FILTER_MAX_W, Math.max(0, insetR - insetL));
  let left = align === "end" ? btn.right - width : btn.left;
  left = Math.min(Math.max(left, insetL), Math.max(insetL, insetR - width));

  const belowTop = btn.bottom + FILTER_GAP;
  const spaceBelow = insetB - belowTop;
  const spaceAbove = btn.top - FILTER_GAP - insetT;
  const placeBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
  const maxHeight = Math.min(
    FILTER_MAX_H,
    Math.max(120, placeBelow ? spaceBelow : spaceAbove),
  );
  const top = placeBelow
    ? belowTop
    : Math.max(insetT, btn.top - FILTER_GAP - maxHeight);

  return { top, left, width: Math.max(width, Math.min(FILTER_MIN_W, insetR - insetL)), maxHeight };
}

/** Labeled cluster of filter chips / fields. */
export function FilterGroup({
  t,
  title,
  children,
}: {
  t: Theme;
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <div
        style={{
          color: t.muted,
          fontFamily: t.mono,
          fontSize: 10.5,
          fontWeight: 650,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div className="fuel-filter-group__chips">{children}</div>
    </div>
  );
}

/** Full-width search field for filter menus / sheets. */
export function FilterSearch({
  t,
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  onKeyDown,
  style: styleProp,
}: {
  t: Theme;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label"?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  style?: CSSProperties;
}) {
  const phone = useNarrow(BREAKPOINTS.md);
  const hasValue = value.trim().length > 0;

  return (
    <label
      className="fuel-filter-search"
      style={{
        alignItems: "center",
        background: t.panelAlt,
        border: `1px solid ${t.rule}`,
        borderRadius: 10,
        boxSizing: "border-box",
        display: "flex",
        gap: 8,
        minHeight: phone ? TOUCH_TARGET_MIN : 40,
        minWidth: 0,
        padding: phone ? "0 6px 0 12px" : "0 4px 0 10px",
        width: "100%",
        ...styleProp,
      }}
    >
      <span
        aria-hidden
        style={{
          alignItems: "center",
          color: t.muted,
          display: "inline-flex",
          flexShrink: 0,
        }}
      >
        {G.search}
      </span>
      <input
        className="fuel-filter-search__input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={{
          background: "transparent",
          border: "none",
          boxSizing: "border-box",
          color: t.ink,
          flex: 1,
          fontFamily: t.sans,
          fontSize: phone ? 16 : 13.5,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          margin: 0,
          minHeight: 0,
          minWidth: 0,
          outline: "none",
          padding: phone ? "10px 0" : "8px 0",
          width: "100%",
        }}
      />
      {hasValue ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          style={{
            alignItems: "center",
            background: t.panelAlt,
            border: "none",
            borderRadius: 8,
            color: t.muted,
            cursor: "pointer",
            display: "inline-flex",
            flexShrink: 0,
            height: 28,
            justifyContent: "center",
            padding: 0,
            width: 28,
          }}
        >
          {G.close}
        </button>
      ) : null}
    </label>
  );
}

/** Instant-apply chip — tap updates the list immediately. */
export function FilterOption({
  t,
  selected,
  onSelect,
  children,
  trailing,
}: {
  t: Theme;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={{
        alignItems: "center",
        background: selected ? t.accentTint : t.bg,
        border: `1px solid ${selected ? `${t.accent}66` : t.rule}`,
        borderRadius: 999,
        boxSizing: "border-box",
        color: t.ink,
        cursor: "pointer",
        display: "inline-flex",
        flex: "0 1 auto",
        fontFamily: t.sans,
        fontSize: 13,
        fontWeight: selected ? 650 : 500,
        gap: 6,
        maxWidth: "100%",
        minHeight: 36,
        padding: "6px 12px",
        textAlign: "left",
      }}
    >
      {selected ? (
        <span
          aria-hidden
          style={{
            alignItems: "center",
            color: t.accent,
            display: "inline-flex",
            flexShrink: 0,
          }}
        >
          {G.check}
        </span>
      ) : null}
      <span style={{ minWidth: 0 }}>{children}</span>
      {trailing != null ? (
        <span
          style={{
            color: selected ? t.accent : t.muted,
            flexShrink: 0,
            fontFamily: t.mono,
            fontSize: 10.5,
            fontWeight: 650,
          }}
        >
          {trailing}
        </span>
      ) : null}
    </button>
  );
}

/** Funnel control — popover on desktop, bottom sheet on phone. */
export function FilterMenu({
  t,
  label = "Filters",
  activeCount = 0,
  children,
  align = "end",
  onClear,
}: {
  t: Theme;
  label?: string;
  /** Non-zero shows a badge and active border. */
  activeCount?: number;
  children: ReactNode;
  align?: "start" | "end";
  onClear?: () => void;
}) {
  const phone = useNarrow(BREAKPOINTS.md);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const active = activeCount > 0;
  const close = useCallback(() => setOpen(false), []);

  const updatePlace = useCallback(() => {
    if (phone) return;
    const btn = btnRef.current;
    if (!btn) return;
    setBox(placeFilterPanel(btn.getBoundingClientRect(), align));
  }, [align, phone]);

  useLayoutEffect(() => {
    if (!open || phone) {
      if (!open) setBox(null);
      return;
    }
    updatePlace();
  }, [open, phone, updatePlace]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (phone) return;
      const n = e.target as Node;
      if (rootRef.current?.contains(n) || panelRef.current?.contains(n)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", updatePlace);
    window.addEventListener("scroll", updatePlace, true);
    window.visualViewport?.addEventListener("resize", updatePlace);
    window.visualViewport?.addEventListener("scroll", updatePlace);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updatePlace);
      window.removeEventListener("scroll", updatePlace, true);
      window.visualViewport?.removeEventListener("resize", updatePlace);
      window.visualViewport?.removeEventListener("scroll", updatePlace);
    };
  }, [open, phone, close, updatePlace]);

  useEffect(() => {
    if (!open || !phone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, phone]);

  const footer =
    phone && open ? (
      <button
        type="button"
        onClick={close}
        style={{
          ...ctaPrimaryStyle(t),
          borderRadius: 10,
          cursor: "pointer",
          flexShrink: 0,
          fontFamily: t.sans,
          fontSize: 14,
          fontWeight: 650,
          minHeight: TOUCH_TARGET_MIN,
          width: "100%",
        }}
      >
        Done
      </button>
    ) : null;

  const panelBody = (
    <>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexShrink: 0,
          gap: 8,
          justifyContent: "space-between",
          minHeight: phone ? 36 : 28,
        }}
      >
        <span
          style={{
            color: t.ink,
            fontFamily: t.sans,
            fontSize: phone ? 16 : 13,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {label}
        </span>
        {phone ? (
          onClear && active ? (
            <button
              type="button"
              onClick={onClear}
              style={{
                background: "none",
                border: "none",
                color: t.accent,
                cursor: "pointer",
                fontFamily: t.sans,
                fontSize: 12,
                fontWeight: 650,
                letterSpacing: 0,
                minHeight: TOUCH_TARGET_MIN,
                padding: "0 4px",
                textTransform: "none",
              }}
            >
              Clear
            </button>
          ) : (
            <span />
          )
        ) : (
          <button
            type="button"
            aria-label="Close filters"
            onClick={close}
            style={{
              alignItems: "center",
              background: "transparent",
              border: "none",
              color: t.muted,
              cursor: "pointer",
              display: "inline-flex",
              height: 28,
              justifyContent: "center",
              padding: 0,
              width: 28,
            }}
          >
            {G.close}
          </button>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flex: "0 1 auto",
          flexDirection: "column",
          gap: 16,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {children}
      </div>
      {footer}
    </>
  );

  const panel =
    open && (phone || box) ? (
      <div
        id={panelId}
        ref={panelRef}
        role="dialog"
        aria-modal={phone || undefined}
        aria-label={label}
        className={phone ? "fuel-filter-sheet" : "fuel-filter-menu__panel"}
        style={
          phone
            ? {
                background: t.panel,
                borderRadius: "16px 16px 0 0",
                borderTop: `1px solid ${t.rule}`,
                bottom: 0,
                boxShadow: `0 -12px 40px ${t.overlay}`,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                left: 0,
                maxHeight: "min(72dvh, 520px)",
                overflow: "hidden",
                padding: "8px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
                position: "fixed",
                right: 0,
                zIndex: 92,
              }
            : {
                background: t.panel,
                border: `1px solid ${t.rule}`,
                borderRadius: 10,
                boxShadow: `0 8px 24px ${t.borderSubtle}`,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                left: box?.left,
                maxHeight: box?.maxHeight,
                maxWidth: `calc(100vw - ${FILTER_INSET * 2}px)`,
                minWidth: 0,
                overflow: "hidden",
                padding: 10,
                position: "fixed",
                top: box?.top,
                width: box?.width,
                zIndex: 80,
              }
        }
      >
        {phone ? (
          <div
            aria-hidden
            style={{
              alignSelf: "center",
              background: t.mutedSoft,
              borderRadius: 99,
              flexShrink: 0,
              height: 4,
              width: 40,
            }}
          />
        ) : null}
        {panelBody}
      </div>
    ) : null;

  const scrim =
    phone && open ? (
      <button
        type="button"
        aria-label="Close filters"
        onClick={close}
        style={{
          background: t.overlay,
          border: "none",
          bottom: 0,
          cursor: "pointer",
          left: 0,
          position: "fixed",
          right: 0,
          top: 0,
          zIndex: 91,
        }}
      />
    ) : null;

  return (
    <div
      ref={rootRef}
      className="fuel-filter-menu"
      style={{ position: "relative", display: "inline-flex" }}
    >
      <button
        ref={btnRef}
        type="button"
        className="fuel-filter-menu__trigger"
        aria-label={active ? `${label} (${activeCount} active)` : label}
        aria-expanded={open}
        aria-controls={panelId}
        title={label}
        onClick={() => setOpen((v) => !v)}
        style={{
          ...iconBtnBase(t),
          background: open || active ? t.accentTint : "transparent",
          border: `1px solid ${open || active ? `${t.accent}55` : t.rule}`,
          color: open || active ? t.accent : t.muted,
          position: "relative",
        }}
      >
        {G.filter}
        {active ? (
          <span
            aria-hidden
            style={{
              background: t.accent,
              borderRadius: 99,
              color: onAccentText(t),
              fontFamily: t.mono,
              fontSize: 8,
              fontWeight: 700,
              height: 14,
              lineHeight: "14px",
              minWidth: 14,
              padding: "0 3px",
              position: "absolute",
              right: 2,
              textAlign: "center",
              top: 2,
            }}
          >
            {activeCount > 9 ? "9+" : activeCount}
          </span>
        ) : null}
      </button>
      {typeof document !== "undefined" && (scrim || panel)
        ? createPortal(
            <>
              {scrim}
              {panel}
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

/** Compact header cluster for filter + create. */
export function PageToolbar({
  t,
  filter,
  create,
  extra,
}: {
  t: Theme;
  filter?: ReactNode;
  create?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div
      className="fuel-page-toolbar"
      style={{
        alignItems: "center",
        display: "inline-flex",
        flexShrink: 0,
        gap: 8,
        justifyContent: "flex-end",
      }}
    >
      {extra}
      {filter}
      {create}
    </div>
  );
}
