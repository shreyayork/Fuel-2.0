"use client";

import type { Theme } from "@/lib/theme";
import type { FuelDataset } from "@/lib/types";
import { PercentileBar, SectionHead } from "../atoms";

export function BenchmarksView({ t, data }: { t: Theme; data: FuelDataset }) {
  const bm = data.benchmarks;

  return (
    <div style={{ fontFamily: t.sans }}>
      <SectionHead
        t={t}
        title="Benchmarking"
        subtitle="Datora vs. 142 Data Infrastructure peers · diamond = you, ticks = p25/p50/p75"
      />

      <div
        className="fuel-benchmarks-table"
        style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 12 }}
      >
        <div
          className="fuel-benchmarks-table__head"
          style={{
            borderBottom: `1px solid ${t.rule}`,
            color: t.muted,
            fontSize: 11,
            fontWeight: 600,
            padding: "10px 16px",
          }}
        >
          <div>Metric</div>
          <div style={{ textAlign: "right" }}>p25</div>
          <div style={{ textAlign: "right" }}>p50</div>
          <div style={{ textAlign: "right" }}>p75</div>
          <div style={{ textAlign: "right" }}>Datora</div>
          <div>Position</div>
        </div>
        {bm.map((v, i) => (
          <div
            key={v.metric}
            className="fuel-benchmarks-table__row"
            style={{
              borderBottom: i === bm.length - 1 ? "none" : `1px solid ${t.ruleSoft}`,
              padding: "16px",
            }}
          >
            <div>
              <div style={{ color: t.ink, fontSize: 14, fontWeight: 650, letterSpacing: "-0.01em" }}>
                {v.metric}
              </div>
              <div style={{ color: t.mutedSoft, fontSize: 11, marginTop: 2 }}>
                {v.invert ? "Lower is better" : "Higher is better"}
              </div>
            </div>
            <div
              style={{
                color: t.muted,
                fontFeatureSettings: '"tnum" 1',
                fontSize: 14,
                textAlign: "right",
              }}
            >
              {v.p25}
            </div>
            <div
              style={{
                color: t.inkSoft,
                fontFeatureSettings: '"tnum" 1',
                fontSize: 14,
                fontWeight: 500,
                textAlign: "right",
              }}
            >
              {v.p50}
            </div>
            <div
              style={{
                color: t.muted,
                fontFeatureSettings: '"tnum" 1',
                fontSize: 14,
                textAlign: "right",
              }}
            >
              {v.p75}
            </div>
            <div
              style={{
                color: t.accent,
                fontFeatureSettings: '"tnum" 1',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                textAlign: "right",
              }}
            >
              {v.you}
            </div>
            <div style={{ minWidth: 0 }}>
              <PercentileBar t={t} bench={v} w={180} />
            </div>
          </div>
        ))}
      </div>

      <div className="fuel-benchmarks-cards">
        {bm.map((v) => (
          <article
            key={v.metric}
            style={{
              background: t.panel,
              border: `1px solid ${t.rule}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div
              style={{
                alignItems: "flex-start",
                display: "flex",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ color: t.ink, fontSize: 14, fontWeight: 700 }}>{v.metric}</div>
                <div style={{ color: t.mutedSoft, fontSize: 11, marginTop: 2 }}>
                  {v.invert ? "Lower is better" : "Higher is better"}
                </div>
              </div>
              <div
                style={{
                  color: t.accent,
                  flexShrink: 0,
                  fontFeatureSettings: '"tnum" 1',
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                {v.you}
              </div>
            </div>
            <div
              className="fuel-benchmarks__pcts"
              style={{ fontFeatureSettings: '"tnum" 1', marginTop: 12 }}
            >
              {(
                [
                  ["p25", v.p25],
                  ["p50", v.p50],
                  ["p75", v.p75],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <div
                    style={{
                      color: t.muted,
                      fontFamily: t.mono,
                      fontSize: 10,
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      color: label === "p50" ? t.ink : t.inkSoft,
                      fontSize: 14,
                      fontWeight: 650,
                      marginTop: 2,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <PercentileBar t={t} bench={v} w={260} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
