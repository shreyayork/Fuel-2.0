"use client";

import { useThemeOrSignal } from "@/components/ThemeContext";
import { accentChipBg, accentChipBorder, accentChipFg } from "@/lib/theme";

/**
 * Tiny attribution pill. Use it next to any AI-extracted field or below
 * a generated paragraph to credit the underlying source.
 *
 * Example:
 *   <MagicSourceChip source="LinkedIn" />
 *   <MagicSourceChip source="Crunchbase" tone="muted" />
 */
export function MagicSourceChip({
  source,
  tone = "accent",
  maxChars = 36,
}: {
  source: string;
  tone?: "accent" | "muted";
  /** Cap visible text so a chatty LLM source line can't blow out a grid
   *  column. Full text remains in the native tooltip on hover. */
  maxChars?: number;
}) {
  const t = useThemeOrSignal();
  const accent = tone === "accent";
  const truncated = source.length > maxChars;
  const display = truncated ? `${source.slice(0, maxChars - 1).trimEnd()}…` : source;
  return (
    <span
      title={truncated ? source : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 999,
        fontFamily: t.mono,
        fontSize: 10.5,
        letterSpacing: 0.3,
        background: accent ? accentChipBg(t) : t.chip,
        border: `1px solid ${accent ? accentChipBorder(t) : t.borderSubtle}`,
        color: accent ? accentChipFg(t) : t.muted,
        whiteSpace: "nowrap",
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        flexShrink: 1,
        minWidth: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 4,
          height: 4,
          borderRadius: 999,
          background: accent ? t.accent : t.muted,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {display}
      </span>
    </span>
  );
}
