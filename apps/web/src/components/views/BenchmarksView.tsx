"use client";

import type { Theme } from "@/lib/theme";
import type { FuelDataset } from "@/lib/types";
import { PercentileBar, SectionHead } from "../atoms";

export function BenchmarksView({ t, data }: { t: Theme; data: FuelDataset }) {
  const bm = data.benchmarks;

  return (
    <div>
      <SectionHead
        t={t}
        title="Benchmarking"
        subtitle="Datora vs. 142 Data Infrastructure peers · diamond = you, ticks = p25/p50/p75"
      />
      <div style={{ background: t.panel, border: `1px solid ${t.rule}` }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1.4fr 2fr",
            padding: "10px 20px",
            borderBottom: `1px solid ${t.rule}`,
            fontFamily: t.sans,
            fontSize: 11,
            color: t.muted,
            fontWeight: 500,
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
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1.4fr 2fr",
              padding: "18px 20px",
              borderBottom: i === bm.length - 1 ? "none" : `1px solid ${t.ruleSoft}`,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: t.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {v.metric}
              </div>
              <div style={{ fontFamily: t.sans, fontSize: 11, color: t.mutedSoft, marginTop: 2 }}>
                {v.invert ? "Lower is better" : "Higher is better"}
              </div>
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: t.sans,
                fontSize: 14,
                color: t.muted,
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {v.p25}
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: t.sans,
                fontSize: 14,
                color: t.inkSoft,
                fontFeatureSettings: '"tnum" 1',
                fontWeight: 500,
              }}
            >
              {v.p50}
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: t.sans,
                fontSize: 14,
                color: t.muted,
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {v.p75}
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: t.sans,
                fontSize: 22,
                color: t.accent,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {v.you}
            </div>
            <div>
              <PercentileBar t={t} bench={v} w={220} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
