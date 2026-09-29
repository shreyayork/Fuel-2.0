import type { CSSProperties } from "react";
import type { Theme } from "@/lib/theme";

/** Flat title row — matches Initiatives / Intelligence (design `.data-room-head`). */
export function dataRoomHeadStyle(): CSSProperties {
  return {
    alignItems: "flex-start",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
  };
}

/** Design `.data-room-head-actions` — same as `.initiatives-head-actions`. */
export function dataRoomHeadActionsStyle(): CSSProperties {
  return {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  };
}

/** Outlined accent trigger — matches demo `data-room-add-custom-btn` / secondary. */
export function dataRoomSecondaryButtonStyle(
  t: Theme,
  opts?: { disabled?: boolean; isOpen?: boolean; hovered?: boolean },
): CSSProperties {
  const disabled = opts?.disabled ?? false;
  const isOpen = opts?.isOpen ?? false;
  const hovered = opts?.hovered ?? false;
  return {
    alignItems: "center",
    background: isOpen || hovered ? `${t.accent}29` : t.accentTint,
    border: `1px solid ${isOpen || hovered ? `${t.accent}61` : `${t.accent}3D`}`,
    borderRadius: 6,
    color: hovered || isOpen ? t.accent : t.accent,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 700,
    gap: 4,
    opacity: disabled ? 0.55 : 1,
    padding: "8px 12px",
    whiteSpace: "nowrap",
  };
}

/** Filled primary — matches design `initiatives-primary-btn` on Upload document. */
export function dataRoomPrimaryButtonStyle(
  t: Theme,
  opts?: { disabled?: boolean; isOpen?: boolean; hovered?: boolean },
): CSSProperties {
  const disabled = opts?.disabled ?? false;
  const active = (opts?.hovered ?? false) || (opts?.isOpen ?? false);
  return {
    alignItems: "center",
    background: active ? t.inkSoft : t.ink,
    border: `1px solid ${active ? t.inkSoft : t.ink}`,
    borderRadius: 8,
    color: t.bg,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 600,
    gap: 4,
    opacity: disabled ? 0.45 : 1,
    padding: "9px 13px",
    whiteSpace: "nowrap",
  };
}

export function dataRoomTableStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    overflow: "hidden",
  };
}

export function dataRoomRowGridColumns(narrow: boolean): string {
  // Type + Latest file share leftover; Format/Uploaded/Intelligence sized for
  // typical content (e.g. "PowerPoint", "Sep 4, 2026, 4:38 PM") without wrap.
  return narrow
    ? "1fr 1fr"
    : "minmax(120px, 1.1fr) minmax(120px, 1fr) minmax(100px, auto) minmax(168px, auto) minmax(120px, auto) 80px";
}

export function dataRoomRowStyle(
  t: Theme,
  opts?: { isHead?: boolean; isCustom?: boolean; narrow?: boolean },
): CSSProperties {
  const isHead = opts?.isHead ?? false;
  const narrow = opts?.narrow ?? false;
  return {
    alignItems: "center",
    background: opts?.isCustom ? `${t.panelAlt}47` : undefined,
    borderTop: isHead ? undefined : `1px solid ${t.rule}`,
    color: isHead ? t.mutedSoft : t.inkSoft,
    display: isHead && narrow ? "none" : "grid",
    fontFamily: isHead ? t.mono : t.sans,
    fontSize: isHead ? 11 : 13,
    fontWeight: isHead ? 900 : 400,
    gap: 12,
    gridTemplateColumns: dataRoomRowGridColumns(narrow),
    letterSpacing: isHead ? "0.06em" : undefined,
    padding: isHead ? "12px 16px" : "12px 16px",
    textTransform: isHead ? "uppercase" : undefined,
  };
}

/** Design `.data-room-empty` — solid panel like Initiatives empty cards. */
export function dataRoomEmptyStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: 154,
    padding: 24,
    textAlign: "center",
  };
}

export function dataRoomMenuStyle(
  t: Theme,
  position: { top: number; left: number; minWidth: number },
): CSSProperties {
  return {
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 10,
    boxShadow: `0 16px 40px ${t.overlay}`,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    left: position.left,
    maxHeight: 320,
    minWidth: position.minWidth,
    overflowY: "auto",
    padding: 6,
    position: "fixed",
    top: position.top,
    zIndex: 80,
  };
}

export function dataRoomMenuOptionStyle(
  t: Theme,
  opts?: { onFile?: boolean; hovered?: boolean },
): CSSProperties {
  const onFile = opts?.onFile ?? false;
  const hovered = opts?.hovered ?? false;
  const accentBg = onFile ? `${t.accent}0F` : "transparent";
  return {
    alignItems: "center",
    background: hovered ? (onFile ? `${t.accent}1F` : `${t.accent}14`) : accentBg,
    border: "none",
    borderRadius: 6,
    boxSizing: "border-box",
    color: hovered ? t.ink : t.inkSoft,
    cursor: "pointer",
    display: "flex",
    fontFamily: t.sans,
    fontSize: 12,
    gap: 10,
    justifyContent: "space-between",
    minWidth: 0,
    padding: "8px 10px",
    textAlign: "left",
    width: "100%",
  };
}

export function dataRoomUploadBtnStyle(
  t: Theme,
  opts?: { processing?: boolean; disabled?: boolean; hovered?: boolean },
): CSSProperties {
  const disabled = opts?.disabled ?? false;
  const hovered = opts?.hovered ?? false;
  return {
    alignItems: "center",
    background: hovered ? `${t.accent}2E` : `${t.accent}1A`,
    border: `1px solid ${hovered ? `${t.accent}61` : `${t.accent}3D`}`,
    borderRadius: 6,
    boxSizing: "border-box",
    color: hovered ? t.ink : t.accent,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 800,
    height: 28,
    justifyContent: "center",
    lineHeight: 1,
    opacity: disabled ? 0.45 : opts?.processing ? 0.7 : 1,
    width: 28,
  };
}

export function dataRoomHistoryBtnStyle(t: Theme, hovered = false): CSSProperties {
  return {
    alignItems: "center",
    background: hovered ? t.borderSubtle : t.borderFaint,
    border: `1px solid ${hovered ? t.borderSubtle : t.borderFaint}`,
    borderRadius: 6,
    boxSizing: "border-box",
    color: hovered ? t.ink : t.muted,
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 400,
    height: 28,
    justifyContent: "center",
    lineHeight: 1,
    padding: 0,
    width: 28,
  };
}

export function dataRoomIntelligenceLinkStyle(t: Theme): CSSProperties {
  return {
    background: "transparent",
    border: "none",
    color: t.accent,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 700,
    padding: 0,
  };
}

export function documentNoticeBannerStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    background: `${t.accent}1A`,
    border: `1px solid ${t.accent}47`,
    borderRadius: 8,
    color: t.inkSoft,
    display: "flex",
    fontFamily: t.sans,
    fontSize: 12.5,
    gap: 12,
    justifyContent: "space-between",
    padding: "10px 14px",
  };
}

export function documentNoticeActionStyle(t: Theme): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${t.accent}59`,
    borderRadius: 6,
    color: t.accent,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    whiteSpace: "nowrap",
  };
}

export function documentHistorySidebarStyle(t: Theme): CSSProperties {
  return {
    background: t.panel,
    borderLeft: `1px solid ${t.rule}`,
    bottom: 0,
    boxShadow: `-24px 0 60px ${t.overlay}`,
    display: "flex",
    flexDirection: "column",
    maxWidth: 420,
    overflow: "hidden",
    position: "fixed",
    right: 0,
    top: 0,
    width: "min(100vw, 420px)",
    zIndex: 60,
  };
}

export function documentHistoryScrimStyle(t: Theme): CSSProperties {
  return {
    background: t.overlay,
    border: "none",
    bottom: 0,
    cursor: "pointer",
    left: 0,
    position: "fixed",
    right: 0,
    top: 0,
    zIndex: 55,
  };
}
