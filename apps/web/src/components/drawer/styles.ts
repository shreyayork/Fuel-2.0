import type { CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
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
