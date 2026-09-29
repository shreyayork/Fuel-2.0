"use client";

import {
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  formatBenchmarkTick,
  type BenchmarkDrawerUnit,
} from "@/lib/overview/benchmark-drawer-fields";
import {
  resolveTrackHoverTooltip,
  type TrackHoverCohort,
} from "@/lib/overview/benchmark-track-tooltip";

export type BenchmarkTrackHoverColors = {
  indicator: string;
  tooltipBg: string;
  tooltipBorder: string;
  title: string;
  body: string;
  shadow?: string;
};

type Props = {
  cohort: TrackHoverCohort;
  unit: BenchmarkDrawerUnit;
  lowerIsBetter: boolean;
  colors: BenchmarkTrackHoverColors;
  children: ReactNode;
  /** Override tick formatting (onboarding uses a remapped unit string). */
  formatValue?: (value: number) => string;
  /** Extra style on the relative track wrapper. */
  style?: CSSProperties;
};

function rawPercentFromEvent(e: MouseEvent<HTMLDivElement>): number {
  const rect = e.currentTarget.getBoundingClientRect();
  if (rect.width <= 0) return 0;
  const x = e.clientX - rect.left;
  return Math.min(100, Math.max(0, (x / rect.width) * 100));
}

/**
 * Shared track hover layer: percentile snap tooltip + decorative indicator.
 * Pointer-only. Does not alter bands or dots.
 */
export function BenchmarkTrackHover({
  cohort,
  unit,
  lowerIsBetter,
  colors,
  children,
  formatValue,
  style,
}: Props) {
  const [rawPct, setRawPct] = useState<number | null>(null);
  const format =
    formatValue ?? ((value: number) => formatBenchmarkTick(value, unit));

  const tip =
    rawPct == null
      ? null
      : resolveTrackHoverTooltip({
          rawPct,
          cohort,
          lowerIsBetter,
          formatValue: format,
        });

  return (
    <div style={{ position: "relative", ...style }}>
      {children}
      <div
        aria-hidden="true"
        onMouseMove={(e) => setRawPct(rawPercentFromEvent(e))}
        onMouseLeave={() => setRawPct(null)}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -8,
          bottom: -8,
          zIndex: 3,
          cursor: "default",
        }}
      />
      {tip ? (
        <>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -4,
              bottom: -4,
              left: `${tip.indicatorPct}%`,
              width: 1,
              transform: "translateX(-50%)",
              background: colors.indicator,
              opacity: 0.85,
              zIndex: 4,
              pointerEvents: "none",
            }}
          />
          <div
            role="tooltip"
            style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              left: `${tip.tooltipLeftPct}%`,
              transform: "translateX(-50%)",
              width: 220,
              padding: "8px 10px",
              borderRadius: 8,
              background: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              boxShadow: colors.shadow,
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: colors.title,
                marginBottom: 4,
                lineHeight: 1.3,
              }}
            >
              {tip.title}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: colors.body,
                lineHeight: 1.45,
              }}
            >
              {tip.body}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
