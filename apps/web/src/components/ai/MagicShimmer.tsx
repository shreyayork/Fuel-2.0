/**
 * Loading placeholder that shimmers like an LLM thinking. Drop it where a
 * skeleton would normally go — single line or full block.
 */
import type { Theme } from "@/lib/theme";
import { SIGNAL } from "@/lib/theme";

export function shimmerBarStyle(t: Theme = SIGNAL): {
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backgroundRepeat: "no-repeat";
  animation: string;
  border: string;
} {
  const base =
    t.mode === "signal" ? "rgba(255,255,255,0.06)" : t.panelInner || t.panelAlt;
  const mid =
    t.mode === "signal" ? `${t.accent}52` : t.accentSoft;
  return {
    // Longhand only — mixing `background` + `backgroundSize` warns on re-render.
    backgroundImage: `linear-gradient(90deg, ${base} 0%, ${mid} 45%, ${base} 90%)`,
    backgroundSize: "220% 100%",
    backgroundPosition: "220% 0",
    backgroundRepeat: "no-repeat",
    animation: "fuel-shimmer 1.35s ease-in-out infinite",
    border: `1px solid ${t.mode === "signal" ? "rgba(255,255,255,0.1)" : t.rule}`,
  };
}

export function MagicShimmer({
  width = "100%",
  height = 14,
  rounded = 6,
  theme,
}: {
  width?: string | number;
  height?: number;
  rounded?: number;
  theme?: Theme;
}) {
  const t = theme ?? SIGNAL;
  const shimmer = shimmerBarStyle(t);

  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width,
        height,
        borderRadius: rounded,
        ...shimmer,
      }}
    >
      <style>{`@keyframes fuel-shimmer { 0% { background-position: 220% 0; } 100% { background-position: -220% 0; } }`}</style>
    </span>
  );
}
