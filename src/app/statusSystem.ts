/**
 * Fuel status indicator system — exactly three semantic colors app-wide.
 * Tokens: src/styles/fuel-tokens.css · Utilities: src/styles/status-indicators.css
 */
import { fuel } from "./fuelTokens";

/** Canonical status kinds — never add a fourth status color. */
export type FuelStatusKind = "good" | "watch" | "bad";

export const FUEL_STATUS_HEX = {
  good: "#12b886",
  watch: "#f5a623",
  bad: "#e05c5c",
} as const;

export const FUEL_STATUS = {
  good: {
    kind: "good" as const,
    name: "Good",
    aliases: ["success", "stable", "strong", "healthy", "complete", "confirmed", "ready"],
    hex: FUEL_STATUS_HEX.good,
    css: fuel.statusGood,
    dim: fuel.statusGoodDim,
    line: fuel.statusGoodLine,
    /** WCAG contrast vs white: ~3.2:1 (large/bold UI only). Pair with text labels. */
    a11yNote: "Use with text label; do not rely on color alone.",
  },
  watch: {
    kind: "watch" as const,
    name: "Watch",
    aliases: ["warning", "attention", "waiting", "building", "needed", "median"],
    hex: FUEL_STATUS_HEX.watch,
    css: fuel.statusWatch,
    dim: fuel.statusWatchDim,
    line: fuel.statusWatchLine,
    a11yNote: "Use with text label; do not rely on color alone.",
  },
  bad: {
    kind: "bad" as const,
    name: "Critical",
    aliases: ["error", "risk", "urgent", "blocked", "weak", "critical"],
    hex: FUEL_STATUS_HEX.bad,
    css: fuel.statusBad,
    dim: fuel.statusBadDim,
    line: fuel.statusBadLine,
    a11yNote: "Use with text label; do not rely on color alone.",
  },
} as const;

export const FUEL_STATUS_LIST: readonly (typeof FUEL_STATUS)[FuelStatusKind][] = [
  FUEL_STATUS.good,
  FUEL_STATUS.watch,
  FUEL_STATUS.bad,
];

/** Scorecard tier → status kind (strong/above → good, around/below → watch, weak → bad). */
export type ScorecardStatusTone = "strong" | "above" | "watch" | "weak";

export function scorecardToneToStatus(tone: ScorecardStatusTone | "around" | "below"): FuelStatusKind {
  if (tone === "strong" || tone === "above") return "good";
  if (tone === "around" || tone === "below" || tone === "watch") return "watch";
  return "bad";
}

export function statusCss(kind: FuelStatusKind): string {
  return FUEL_STATUS[kind].css;
}

export function statusLineCss(kind: FuelStatusKind): string {
  return FUEL_STATUS[kind].line;
}

/** Benchmark / composite score → one of three status colors (no intermediate shades). */
export function benchmarkScoreToStatus(score: number): FuelStatusKind {
  if (score >= 55) return "good";
  if (score >= 35) return "watch";
  return "bad";
}

export function benchmarkScoreToColor(score: number): string {
  return statusCss(benchmarkScoreToStatus(score));
}

/** Brief flag → status (neutral is not a status color). */
export function briefFlagToStatus(flag: "good" | "warn" | "crit"): FuelStatusKind {
  if (flag === "good") return "good";
  if (flag === "warn") return "watch";
  return "bad";
}

export function briefFlagToColor(flag: "good" | "warn" | "crit" | "neutral"): string {
  if (flag === "neutral") return fuel.textMuted;
  return statusCss(briefFlagToStatus(flag));
}

/** Signal urgency from scorecard categories. */
export function signalUrgencyToStatus(urgency: "ok" | "watch" | "urgent"): FuelStatusKind {
  if (urgency === "ok") return "good";
  if (urgency === "urgent") return "bad";
  return "watch";
}

/** Inline styles for charts / canvas where CSS vars are unavailable. */
export function statusStyle(kind: FuelStatusKind): {
  color: string;
  background: string;
  borderColor: string;
} {
  const s = FUEL_STATUS[kind];
  return { color: s.css, background: s.dim, borderColor: s.line };
}

/** CSS class helpers for badges, dots, and surfaces. */
export function statusBadgeClass(kind: FuelStatusKind): string {
  return `fuel-status-badge fuel-status-badge--${kind}`;
}

export function statusDotClass(kind: FuelStatusKind): string {
  return `fuel-status-dot fuel-status-dot--${kind}`;
}

export function statusSurfaceClass(kind: FuelStatusKind): string {
  return `fuel-status-surface fuel-status-surface--${kind}`;
}

export function statusToneClass(kind: FuelStatusKind): string {
  return `fuel-status-tone fuel-status-tone--${kind}`;
}
