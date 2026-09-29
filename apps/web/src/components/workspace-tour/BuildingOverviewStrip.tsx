"use client";

import { useTheme } from "../ThemeContext";

export function BuildingOverviewStrip() {
  const t = useTheme();

  return (
    <div
      style={{
        alignItems: "center",
        background: t.panelAlt,
        border: `1px solid ${t.rule}`,
        borderRadius: 8,
        display: "flex",
        gap: 10,
        marginTop: 12,
        padding: "10px 14px",
      }}
      role="status"
      aria-live="polite"
    >
      <i
        aria-hidden
        style={{
          background: t.accent,
          borderRadius: "50%",
          display: "inline-block",
          flexShrink: 0,
          height: 8,
          width: 8,
        }}
      />
      <div>
        <strong
          style={{
            color: t.ink,
            display: "block",
            fontFamily: t.sans,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          Building Overview
        </strong>
        <span
          style={{
            color: t.muted,
            fontFamily: t.sans,
            fontSize: 11.5,
          }}
        >
          Fuel is still generating scores and advisor content — other tabs stay usable.
        </span>
      </div>
    </div>
  );
}
