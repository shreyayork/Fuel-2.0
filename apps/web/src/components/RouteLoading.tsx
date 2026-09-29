"use client";

import { useTheme } from "@/components/ThemeContext";

export function RouteLoading({ label = "Loading…" }: { label?: string }) {
  const t = useTheme();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: "calc(100dvh - 180px)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `2.5px solid ${t.accent}4D`,
            borderTopColor: t.accent,
            animation: "fuel-spin 700ms linear infinite",
          }}
        />
        <span
          style={{
            color: t.muted,
            fontFamily: t.sans,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.01em",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
