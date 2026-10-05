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
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  brandNavyFill,
  onBrandNavyText,
  type Theme,
} from "@/lib/theme";
import { TOUCH_TARGET_MIN } from "@/lib/responsive";
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
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      style={{
        ...iconBtnBase(t),
        background: active ? "transparent" : navy,
        border: `1px solid ${navy}`,
        color: active ? navy : fg,
        ...style,
      }}
      {...rest}
    >
      {active ? G.close : G.plus}
    </button>
  );
}

const FILTER_INSET = 12;
const FILTER_GAP = 8;
const FILTER_MAX_W = 360;
const FILTER_MIN_W = 280;
const FILTER_MAX_H = 420;

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

/** Funnel control that reveals filter content in a compact popover. */
export function FilterMenu({
  t,
  label = "Filters",
  activeCount = 0,
  children,
  align = "end",
}: {
  t: Theme;
  label?: string;
  /** Non-zero shows a badge and active border. */
  activeCount?: number;
  children: ReactNode;
  align?: "start" | "end";
}) {
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

  const updatePlace = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    setBox(placeFilterPanel(btn.getBoundingClientRect(), align));
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    updatePlace();
  }, [open, updatePlace]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const n = e.target as Node;
      if (rootRef.current?.contains(n) || panelRef.current?.contains(n)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
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
  }, [open, updatePlace]);

  const panel =
    open && box ? (
      <div
        id={panelId}
        ref={panelRef}
        role="dialog"
        aria-label={label}
        className="fuel-filter-menu__panel"
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 12,
          boxShadow: `0 12px 40px ${t.borderSubtle}`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          left: box.left,
          maxHeight: box.maxHeight,
          maxWidth: `calc(100vw - ${FILTER_INSET * 2}px)`,
          minWidth: 0,
          overflow: "auto",
          padding: 14,
          position: "fixed",
          top: box.top,
          width: box.width,
          zIndex: 80,
        }}
      >
        <div
          style={{
            alignItems: "center",
            color: t.muted,
            display: "flex",
            fontFamily: t.sans,
            fontSize: 11,
            fontWeight: 700,
            justifyContent: "space-between",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <span>{label}</span>
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
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
        </div>
        {children}
      </div>
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
        aria-label={active ? `${label} (${activeCount} active)` : label}
        aria-expanded={open}
        aria-controls={panelId}
        title={label}
        onClick={() => setOpen((v) => !v)}
        style={{
          ...iconBtnBase(t),
          background: open || active ? t.accentTint : t.panel,
          border: `1px solid ${open || active ? `${t.accent}66` : t.rule}`,
          color: open || active ? t.accent : t.inkSoft,
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
              color: onBrandNavyText(t),
              fontFamily: t.mono,
              fontSize: 9,
              fontWeight: 700,
              height: 16,
              lineHeight: "16px",
              minWidth: 16,
              padding: "0 4px",
              position: "absolute",
              right: -4,
              textAlign: "center",
              top: -4,
            }}
          >
            {activeCount > 9 ? "9+" : activeCount}
          </span>
        ) : null}
      </button>
      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
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
