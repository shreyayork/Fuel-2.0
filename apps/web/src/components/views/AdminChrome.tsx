"use client";

import type { ReactElement } from "react";
import type { Theme } from "@/lib/theme";
import { KPI } from "@/components/atoms";
import { adminPanelStyle } from "@/components/views/adminStyles";

export function AdminNavIcon({
  path,
  size = 16,
}: {
  path: string;
  size?: number;
}): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d={path} />
    </svg>
  );
}

export function AdminStatsStrip({
  t,
  items,
}: {
  t: Theme;
  items: Array<{ label: string; value: string | number; footnote?: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className="fuel-admin-stats-strip"
      style={{
        ...adminPanelStyle(t),
        display: "flex",
        flexWrap: "wrap",
        overflow: "hidden",
      }}
    >
      {items.map((item, idx) => (
        <KPI
          key={item.label}
          t={t}
          label={item.label}
          value={item.value}
          footnote={item.footnote}
          idx={idx}
        />
      ))}
    </div>
  );
}
