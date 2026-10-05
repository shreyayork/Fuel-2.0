"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
import type { Company, FuelDataset } from "@/lib/types";
import { TOUCH_TARGET_MIN, useNarrow } from "@/lib/responsive";
import {
  Chip,
  Dot,
  KPI,
  Logo,
  SectionHead,
  Sparkline,
} from "../atoms";
import { G } from "../icons";
import {
  dataTableFrameStyle,
  dataTableStyle,
  dataTdStyle,
  dataThStyle,
} from "./adminStyles";

function btn(t: Theme, active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: active ? t.ink : t.panel,
    color: active ? (t.mode === "editorial" ? t.panel : t.bg) : t.inkSoft,
    border: `1px solid ${active ? t.ink : t.rule}`,
    padding: "0 12px",
    borderRadius: 8,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    minHeight: TOUCH_TARGET_MIN,
  };
}

export function PortfolioView({
  t,
  data,
  onOpenCo,
}: {
  t: Theme;
  data: FuelDataset;
  onOpenCo: (co: Company) => void;
}) {
  const cos = data.companies.filter((c) => c.list === "portfolio");
  const phone = useNarrow();
  const [view, setView] = useState<"table" | "grid">("table");
  const [viewTouched, setViewTouched] = useState(false);

  useEffect(() => {
    if (viewTouched) return;
    setView(phone ? "grid" : "table");
  }, [phone, viewTouched]);

  const totalArr = cos.reduce((s, c) => s + c.arr, 0);
  const avgGrowth = Math.round(cos.reduce((s, c) => s + c.arrGrowth, 0) / cos.length);
  const totalBurn = cos.reduce((s, c) => s + (c.burn ?? 0), 0);
  const avgNrr = Math.round(cos.reduce((s, c) => s + c.nrr, 0) / cos.length);
  const atRisk = cos.filter((c) => (c.runway ?? 999) < 12).length;

  return (
    <div className="fuel-page">
      <SectionHead
        t={t}
        title="Portfolio"
        subtitle={`${cos.length} active holdings · live performance`}
        right={
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => {
                setViewTouched(true);
                setView("table");
              }}
              style={btn(t, view === "table")}
            >
              {G.list} Table
            </button>
            <button
              type="button"
              onClick={() => {
                setViewTouched(true);
                setView("grid");
              }}
              style={btn(t, view === "grid")}
            >
              {G.grid} Grid
            </button>
          </div>
        }
      />

      <div
        className="fuel-scroll-x"
        style={{
          display: "flex",
          border: `1px solid ${t.rule}`,
          background: t.panel,
          marginBottom: 28,
        }}
      >
        <KPI
          t={t}
          idx={0}
          label="Combined ARR"
          value={"$" + (totalArr / 1e6).toFixed(1) + "M"}
          delta={58}
          spark={[4.1, 4.8, 5.5, 6.2, 7.0, 8.0, 8.9, 9.6]}
          sparkColor={t.accent}
          footnote={`Across ${cos.length} holdings`}
        />
        <KPI
          t={t}
          idx={1}
          label="Avg Growth"
          value={avgGrowth + "%"}
          delta={12}
          spark={[38, 42, 49, 53, 58, 62, 68, 70]}
          sparkColor={t.positive}
        />
        <KPI
          t={t}
          idx={2}
          label="Avg NRR"
          value={avgNrr + "%"}
          delta={4}
          spark={[108, 110, 112, 114, 113, 115, 116, 114]}
          sparkColor={t.positive}
        />
        <KPI
          t={t}
          idx={3}
          label="Monthly Burn"
          value={"$" + (totalBurn / 1e6).toFixed(1) + "M"}
          delta={-6}
          spark={[3.1, 2.9, 2.8, 2.7, 2.7, 2.6, 2.6, 2.7]}
          sparkColor={t.negative}
          footnote="vs. Q1 peak"
        />
        <KPI
          t={t}
          idx={4}
          label="<12mo Runway"
          value={atRisk}
          footnote={atRisk ? "Attention required" : "All healthy"}
        />
      </div>

      {view === "table" ? (
        <PortfolioTable t={t} cos={cos} onOpenCo={onOpenCo} />
      ) : (
        <PortfolioGrid t={t} cos={cos} onOpenCo={onOpenCo} />
      )}
    </div>
  );
}

function PortfolioTable({
  t,
  cos,
  onOpenCo,
}: {
  t: Theme;
  cos: Company[];
  onOpenCo: (co: Company) => void;
}) {
  const cols: { k: string; label: string; w: string; right?: boolean }[] = [
    { k: "co", label: "Company", w: "22%" },
    { k: "stage", label: "Stage / Market", w: "18%" },
    { k: "arr", label: "ARR", w: "12%", right: true },
    { k: "grow", label: "Growth", w: "10%", right: true },
    { k: "nrr", label: "NRR", w: "9%", right: true },
    { k: "burn", label: "Burn", w: "10%", right: true },
    { k: "runway", label: "Runway", w: "9%", right: true },
    { k: "signal", label: "Signal", w: "10%" },
  ];

  return (
    <div className="fuel-data-table-frame fuel-table-wrap" style={dataTableFrameStyle(t)}>
      <table className="fuel-data-table" style={{ ...dataTableStyle(), minWidth: 720 }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c.k}
                style={{
                  ...dataThStyle(t, c.right ? { numeric: true } : undefined),
                  width: c.w,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cos.map((c) => {
            const runway = c.runway ?? 999;
            const runwayTone = runway < 12 ? t.negative : runway < 18 ? t.warn : t.positive;
            return (
              <tr
                key={c.id}
                onClick={() => onOpenCo(c)}
                style={{ cursor: "pointer" }}
              >
                <td style={dataTdStyle(t, { top: false })}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Logo t={t} co={c} size={32} />
                    <div>
                      <div
                        style={{
                          fontFamily: t.sans,
                          fontWeight: 600,
                          fontSize: 14,
                          color: t.ink,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {c.name}
                      </div>
                      <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
                        {c.hq} · {c.employees} FTE
                      </div>
                    </div>
                  </div>
                </td>
                <td style={dataTdStyle(t, { top: false })}>
                  <div style={{ fontSize: 13, color: t.ink, fontWeight: 500 }}>{c.stage}</div>
                  <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{c.industry}</div>
                </td>
                <td style={dataTdStyle(t, { numeric: true, top: false })}>
                  <div
                    style={{
                      fontFamily: t.sans,
                      fontSize: 16,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      fontFeatureSettings: '"tnum" 1',
                    }}
                  >
                    {"$" + (c.arr / 1e6).toFixed(1) + "M"}
                  </div>
                </td>
                <td style={dataTdStyle(t, { numeric: true, top: false })}>
                  <span style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 500, color: t.positive }}>
                    {"+" + c.arrGrowth + "%"}
                  </span>
                </td>
                <td style={dataTdStyle(t, { numeric: true, top: false })}>
                  {c.nrr + "%"}
                </td>
                <td style={dataTdStyle(t, { numeric: true, top: false })}>
                  {"$" + ((c.burn ?? 0) / 1000).toFixed(0) + "K"}
                </td>
                <td style={dataTdStyle(t, { numeric: true, top: false })}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Dot color={runwayTone} size={6} />
                    <span style={{ fontFamily: t.sans, fontSize: 13, color: runwayTone, fontWeight: 500 }}>
                      {runway + "mo"}
                    </span>
                  </div>
                </td>
                <td style={dataTdStyle(t, { top: false })}>
                  <Sparkline
                    data={[
                      c.arrGrowth * 0.6,
                      c.arrGrowth * 0.7,
                      c.arrGrowth * 0.8,
                      c.arrGrowth * 0.85,
                      c.arrGrowth * 0.9,
                      c.arrGrowth * 0.95,
                      c.arrGrowth,
                      c.arrGrowth * 1.05,
                    ]}
                    w={70}
                    h={20}
                    color={t.accent}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PortfolioGrid({
  t,
  cos,
  onOpenCo,
}: {
  t: Theme;
  cos: Company[];
  onOpenCo: (co: Company) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: 12 }}>
      {cos.map((c) => {
        const runway = c.runway ?? 999;
        return (
          <button
            type="button"
            key={c.id}
            onClick={() => onOpenCo(c)}
            style={{
              background: t.panel,
              border: `1px solid ${t.rule}`,
              borderRadius: 12,
              cursor: "pointer",
              display: "block",
              fontFamily: t.sans,
              padding: 16,
              textAlign: "left",
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <Logo t={t} co={c} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: t.ink, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {c.name}
                  </div>
                  <div style={{ color: t.muted, fontSize: 12, marginTop: 2 }}>
                    {c.stage} · {c.industry}
                  </div>
                </div>
              </div>
              <Chip t={t} tone={runway < 12 ? "warn" : "positive"}>
                {runway + "mo"}
              </Chip>
            </div>
            <div className="fuel-grid-kpi" style={{ marginTop: 8 }}>
              <Metric t={t} label="ARR" value={"$" + (c.arr / 1e6).toFixed(1) + "M"} sub={"+" + c.arrGrowth + "%"} />
              <Metric
                t={t}
                label="NRR"
                value={c.nrr + "%"}
                sub={c.nrr > 110 ? "above p75" : "at p50"}
              />
              <Metric t={t} label="Fit" value={c.fitScore} valColor={t.accent} />
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.ruleSoft}` }}>
              <Sparkline
                data={[4.2, 4.8, 5.4, 6.0, 6.6, 7.2, 7.8, c.arr / 1e6]}
                w={260}
                h={32}
                color={t.accent}
                thick={1.4}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Metric({
  t,
  label,
  value,
  sub,
  valColor,
}: {
  t: Theme;
  label: string;
  value: string | number;
  sub?: string | null;
  valColor?: string;
}) {
  return (
    <div>
      <div style={{ fontFamily: t.sans, fontSize: 11, fontWeight: 500, color: t.muted }}>{label}</div>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 20,
          fontWeight: 500,
          color: valColor ?? t.ink,
          marginTop: 4,
          letterSpacing: "-0.02em",
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
      {sub ? (
        <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginTop: 2 }}>{sub}</div>
      ) : null}
    </div>
  );
}
