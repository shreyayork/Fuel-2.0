import type { CSSProperties } from "react";
import { ctaPrimaryStyle, type Theme } from "@/lib/theme";
import { TOUCH_TARGET_MIN } from "@/lib/responsive";

/**
 * Square icon close for drawer headers with title + subtitle.
 * Fixed size + flexShrink so flex stretch never elongates the control.
 */
export function drawerCloseBtnStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    alignSelf: "flex-start",
    background: "transparent",
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    boxSizing: "border-box",
    color: t.inkSoft,
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    height: TOUCH_TARGET_MIN,
    justifyContent: "center",
    padding: 0,
    width: TOUCH_TARGET_MIN,
  };
}

/** Phone “new screen” for add/create flows — replaces a bottom sheet. */
export function mobileAddScreenStyle(t: Theme, extra?: CSSProperties): CSSProperties {
  return {
    background: t.bg,
    borderRadius: 0,
    borderWidth: 0,
    bottom: 0,
    boxShadow: "none",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    left: 0,
    maxHeight: "none",
    maxWidth: "none",
    overflow: "hidden",
    paddingBottom: "var(--fuel-safe-bottom, 0px)",
    paddingLeft: "var(--fuel-safe-left, 0px)",
    paddingRight: "var(--fuel-safe-right, 0px)",
    paddingTop: "var(--fuel-safe-top, 0px)",
    position: "fixed",
    right: 0,
    top: 0,
    width: "100%",
    ...extra,
  };
}

/** Sticky create CTA on phone add screens. */
export function addScreenPrimaryBtnStyle(
  t: Theme,
  extra?: CSSProperties,
): CSSProperties {
  return {
    ...ctaPrimaryStyle(t),
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: t.sans,
    fontSize: 14,
    fontWeight: 650,
    minHeight: TOUCH_TARGET_MIN,
    width: "100%",
    ...extra,
  };
}
