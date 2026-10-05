/**
 * Shared Super Admin Operate vocabulary — buttons, fields, tables, panels, modals.
 * Prefer these over per-view one-offs so every /super-admin surface feels one product.
 */
import type { CSSProperties } from "react";
import { framedPanelStyle, onAccentText, type Theme } from "@/lib/theme";
import { TOUCH_TARGET_MIN } from "@/lib/responsive";

export type AdminBtnVariant = "primary" | "ghost" | "danger";

export function adminPageStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    maxWidth: "none",
    minWidth: 0,
    width: "100%",
  };
}

export function adminBtnStyle(
  t: Theme,
  variant: AdminBtnVariant = "ghost",
  opts?: { disabled?: boolean },
): CSSProperties {
  const map = {
    primary: {
      bg: t.accent,
      color: onAccentText(t),
      border: t.accent,
    },
    ghost: { bg: "transparent", color: t.inkSoft, border: t.rule },
    danger: { bg: `${t.negative}14`, color: t.negative, border: `${t.negative}59` },
  } as const;
  const v = map[variant];
  return {
    alignItems: "center",
    background: v.bg,
    border: `1px solid ${v.border}`,
    borderRadius: 8,
    boxSizing: "border-box",
    color: v.color,
    cursor: opts?.disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: variant === "primary" ? 650 : 550,
    gap: 6,
    justifyContent: "center",
    minHeight: TOUCH_TARGET_MIN,
    opacity: opts?.disabled ? 0.55 : 1,
    padding: "0 14px",
    whiteSpace: "nowrap",
  };
}

export function adminInputStyle(
  t: Theme,
  opts?: { multiline?: boolean; mono?: boolean },
): CSSProperties {
  return {
    background: t.panelAlt,
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    boxSizing: "border-box",
    color: t.ink,
    fontFamily: opts?.mono ? t.mono : t.sans,
    fontSize: 14,
    minHeight: opts?.multiline ? 88 : TOUCH_TARGET_MIN,
    padding: opts?.multiline ? "10px 12px" : "0 12px",
    resize: opts?.multiline ? "vertical" : undefined,
    width: "100%",
  };
}

/** Theme tokens as CSS vars for `.fuel-admin-table` hover / sticky header / scrollbars. */
export function adminTableCssVars(t: Theme): CSSProperties {
  return {
    ["--admin-panel" as string]: t.panel,
    ["--admin-panel-alt" as string]: t.panelAlt,
    ["--admin-rule" as string]: t.rule,
    ["--admin-rule-soft" as string]: t.ruleSoft,
    ["--admin-ink" as string]: t.ink,
    ["--admin-ink-soft" as string]: t.inkSoft,
    ["--admin-muted" as string]: t.muted,
    ["--admin-accent" as string]: t.accent,
    ["--admin-accent-tint" as string]: t.accentTint,
    ["--admin-border-faint" as string]: t.borderFaint,
    ["--admin-border-subtle" as string]: t.borderSubtle,
    ["--admin-overlay" as string]: t.overlay,
  };
}

/** Outer panel that frames a data table (radius + border + CSS vars). */
export function adminTableFrameStyle(t: Theme): CSSProperties {
  return {
    ...adminPanelStyle(t),
    ...adminTableCssVars(t),
  };
}

export function adminTableScrollStyle(): CSSProperties {
  return {
    maxWidth: "100%",
    minWidth: 0,
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    overscrollBehaviorX: "contain",
  };
}

export function adminTableStyle(): CSSProperties {
  return {
    borderCollapse: "collapse",
    borderSpacing: 0,
    fontVariantNumeric: "tabular-nums",
    width: "100%",
  };
}

export function adminThStyle(
  t: Theme,
  opts?: { align?: "left" | "right" | "center"; numeric?: boolean },
): CSSProperties {
  const align = opts?.numeric ? "right" : (opts?.align ?? "left");
  return {
    background: t.panelAlt,
    borderBottom: `1px solid ${t.rule}`,
    boxShadow: `inset 0 -1px 0 ${t.borderFaint}`,
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    padding: "11px 16px",
    textAlign: align,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

export function adminTdStyle(
  t: Theme,
  opts?: {
    top?: boolean;
    align?: "left" | "right" | "center";
    numeric?: boolean;
    mono?: boolean;
    primary?: boolean;
    nowrap?: boolean;
  },
): CSSProperties {
  const align = opts?.numeric ? "right" : (opts?.align ?? "left");
  return {
    borderBottom: `1px solid ${t.ruleSoft}`,
    color: opts?.primary ? t.ink : t.inkSoft,
    fontFamily: opts?.mono ? t.mono : t.sans,
    fontSize: opts?.mono ? 12 : 13,
    fontWeight: opts?.primary ? 600 : 450,
    letterSpacing: opts?.primary ? "-0.01em" : undefined,
    lineHeight: 1.45,
    padding: "13px 16px",
    textAlign: align,
    verticalAlign: opts?.top === false ? "middle" : "top",
    whiteSpace: opts?.nowrap || opts?.numeric ? "nowrap" : undefined,
  };
}

export function adminTdActionsStyle(t: Theme): CSSProperties {
  return {
    ...adminTdStyle(t, { align: "right", nowrap: true, top: false }),
  };
}

/** App-wide aliases — same chrome as Super Admin tables. */
export const dataTableCssVars = adminTableCssVars;
export const dataTableFrameStyle = adminTableFrameStyle;
export const dataTableScrollStyle = adminTableScrollStyle;
export const dataTableStyle = adminTableStyle;
export const dataThStyle = adminThStyle;
export const dataTdStyle = adminTdStyle;
export const dataTdActionsStyle = adminTdActionsStyle;

export function adminPanelStyle(t: Theme): CSSProperties {
  return framedPanelStyle(t);
}

export function adminEmptyStyle(t: Theme): CSSProperties {
  return {
    ...adminPanelStyle(t),
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 13,
    lineHeight: 1.5,
    padding: "40px 24px",
    textAlign: "center",
  };
}

export function adminSectionLabelStyle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontFamily: t.mono,
    fontSize: 10.5,
    fontWeight: 650,
    letterSpacing: "0.12em",
    marginBottom: 8,
    textTransform: "uppercase",
  };
}

export function adminFormRowStyle(): CSSProperties {
  return {
    alignItems: "start",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(0, 160px) minmax(0, 1fr)",
  };
}

export function adminFormLabelStyle(t: Theme): CSSProperties {
  return {
    color: t.muted,
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    paddingTop: 12,
    textTransform: "uppercase",
  };
}

export function adminModalOverlayStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    background: t.overlay,
    display: "flex",
    inset: 0,
    justifyContent: "center",
    padding: "max(16px, var(--fuel-safe-top, 0px)) 16px max(16px, var(--fuel-safe-bottom, 0px))",
    position: "fixed",
    zIndex: 200,
  };
}

export function adminModalPanelStyle(t: Theme, width = 640): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 14,
    boxShadow: `0 16px 48px ${t.borderSubtle}`,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    maxHeight: "min(90vh, 900px)",
    overflow: "auto",
    padding: 22,
    width: `min(${width}px, 100%)`,
  };
}

export function adminModalTitleStyle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-0.015em",
    margin: 0,
  };
}

export function adminTileStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 12,
    color: "inherit",
    display: "block",
    padding: 18,
    textDecoration: "none",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
  };
}
