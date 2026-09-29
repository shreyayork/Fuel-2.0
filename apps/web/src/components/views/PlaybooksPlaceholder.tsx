"use client";

import { SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";

export function PlaybooksPlaceholder() {
  const t = useTheme();
  return (
    <div>
      <SectionHead t={t} title="Playbooks" subtitle="Reusable initiative templates · coming soon" />
      <div
        style={{
          padding: 48,
          border: `1px dashed ${t.rule}`,
          textAlign: "center",
          fontFamily: t.sans,
          fontSize: 13,
          color: t.muted,
        }}
      >
        Playbooks library will live here.
      </div>
    </div>
  );
}
