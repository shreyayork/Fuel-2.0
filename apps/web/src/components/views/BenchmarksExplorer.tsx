"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Chip, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";

export interface CohortSummary {
  cohortKey: string;
  dimensions: {
    businessModel?: string | null;
    stage?: string | null;
    vertical?: string | null;
    geo?: string | null;
  };
  metricCount: number;
  sampleSize: number | null;
}

export interface MetricRow {
  metric: string;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  sampleSize: number | null;
  unit: string | null;
  invertedGood: boolean;
}

export interface AllRow extends MetricRow {
  cohortKey: string;
  period: string;
}

export interface MetricDef {
  id: string;
  label: string;
  unit: string;
  invertedGood?: boolean;
  hint?: string;
}

function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtValue(v: number | null, unit: string | null): string {
  if (v == null) return "—";
  switch (unit) {
    case "usd":
      return fmtUsd(v);
    case "pct":
      return `${v.toFixed(0)}%`;
    case "months":
      return `${v.toFixed(0)}mo`;
    case "x":
      return `${v.toFixed(1)}x`;
    default:
      return v.toLocaleString();
  }
}

function labelForCohort(c: CohortSummary): string {
  const d = c.dimensions;
  const vertical = d.vertical || d.businessModel || "";
  const stage = d.stage ?? "";
  const geo = d.geo?.toUpperCase() ?? "";
  const parts: string[] = [];
  if (vertical) parts.push(prettify(vertical));
  if (stage) parts.push(prettify(stage));
  if (geo) parts.push(geo);
  return parts.join(" · ") || c.cohortKey;
}

function prettify(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/b2b/i, "B2B")
    .replace(/\bseries a\b/i, "Series A")
    .replace(/\bseries b\b/i, "Series B");
}

export function BenchmarksExplorer({
  cohorts,
  activeCohortKey,
  allRows,
  metricDefs,
}: {
  cohorts: CohortSummary[];
  activeCohortKey: string | null;
  allRows: AllRow[];
  metricDefs: MetricDef[];
}) {
  const t = useTheme();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Dimension filters (narrow the cohort sidebar).
  const [businessModel, setBusinessModel] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [geo, setGeo] = useState<string | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const filteredCohorts = useMemo(() => {
    return cohorts.filter((c) => {
      if (businessModel && (c.dimensions.vertical ?? c.dimensions.businessModel) !== businessModel) {
        // Allow vertical OR businessModel to satisfy the pill; since verticals
        // (e.g. fintech) imply businessModel=b2b_saas under the hood.
        if (c.dimensions.businessModel !== businessModel) return false;
      }
      if (stage && c.dimensions.stage !== stage) return false;
      if (geo && c.dimensions.geo !== geo) return false;
      return true;
    });
  }, [cohorts, businessModel, stage, geo]);

  const activeCohort = filteredCohorts.find((c) => c.cohortKey === activeCohortKey)
    ?? cohorts.find((c) => c.cohortKey === activeCohortKey)
    ?? null;
  // Active cohort's latest period (rows for this cohort, any period) — pick newest.
  const activeRows = useMemo(() => {
    if (!activeCohortKey) return [] as AllRow[];
    const rows = allRows.filter((r) => r.cohortKey === activeCohortKey);
    if (rows.length === 0) return rows;
    const latest = rows.reduce((acc, r) => (r.period > acc ? r.period : acc), "");
    return rows.filter((r) => r.period === latest);
  }, [allRows, activeCohortKey]);
  const metricByKey = new Map(activeRows.map((m) => [m.metric, m]));

  const pickCohort = (key: string) => {
    startTransition(() => {
      router.push(`/benchmarks?cohort=${encodeURIComponent(key)}`);
    });
  };

  // Unique filter options from the full cohort list.
  const models = Array.from(new Set(cohorts.map((c) => c.dimensions.businessModel).filter(Boolean))) as string[];
  const stages = Array.from(new Set(cohorts.map((c) => c.dimensions.stage).filter(Boolean))) as string[];
  const geos = Array.from(new Set(cohorts.map((c) => c.dimensions.geo).filter(Boolean))) as string[];

  return (
    <div>
      <SectionHead
        t={t}
        title="Benchmarks"
        subtitle="Percentile distributions for key metrics across peer cohorts. Pick a cohort to see where your portfolio stands."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Cohort picker */}
        <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 8, padding: 12 }}>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              color: t.muted,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "4px 8px 10px",
            }}
          >
            Filter
          </div>
          <FilterRow t={t} label="Model" value={businessModel} options={models} onChange={setBusinessModel} />
          <FilterRow t={t} label="Stage" value={stage} options={stages} onChange={setStage} />
          <FilterRow t={t} label="Geo" value={geo} options={geos} onChange={setGeo} />
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              color: t.muted,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "14px 8px 10px",
              borderTop: `1px solid ${t.ruleSoft}`,
              marginTop: 10,
            }}
          >
            Cohorts ({filteredCohorts.length})
          </div>
          {filteredCohorts.length === 0 ? (
            <div style={{ padding: 12, fontFamily: t.sans, fontSize: 13, color: t.muted }}>
              No cohorts match these filters.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {filteredCohorts.map((c) => {
                const active = c.cohortKey === activeCohortKey;
                return (
                  <button
                    key={c.cohortKey}
                    onClick={() => pickCohort(c.cohortKey)}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      background: active ? t.panelAlt : "transparent",
                      border: `1px solid ${active ? t.rule : "transparent"}`,
                      borderRadius: 6,
                      fontFamily: t.sans,
                      fontSize: 12.5,
                      color: active ? t.ink : t.inkSoft,
                      fontWeight: active ? 600 : 500,
                      cursor: "pointer",
                    }}
                  >
                    <div>{labelForCohort(c)}</div>
                    <div style={{ fontSize: 10.5, color: t.muted, marginTop: 2, fontFamily: t.mono }}>
                      n={c.sampleSize ?? "?"} · {c.metricCount} metrics
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Metric cards */}
        <div>
          {activeCohort ? (
            <div style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: t.sans, fontSize: 17, fontWeight: 600, color: t.ink }}>
                {labelForCohort(activeCohort)}
              </span>
              <Chip t={t} tone="ghost">n={activeCohort.sampleSize ?? "?"}</Chip>
              {activeCohort.dimensions.geo ? (
                <Chip t={t} tone="ghost">{activeCohort.dimensions.geo.toUpperCase()}</Chip>
              ) : null}
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
              gap: 10,
            }}
          >
            {metricDefs.map((def) => {
              const row = metricByKey.get(def.id) ?? null;
              return (
                <MetricCard
                  key={def.id}
                  t={t}
                  def={def}
                  row={row}
                  expanded={expandedMetric === def.id}
                  onToggle={() => setExpandedMetric((v) => (v === def.id ? null : def.id))}
                />
              );
            })}
          </div>

          {expandedMetric ? (
            <MetricAcrossCohortsPanel
              t={t}
              metricId={expandedMetric}
              metricDef={metricDefs.find((d) => d.id === expandedMetric) ?? null}
              allRows={allRows}
              cohorts={cohorts}
              activeCohortKey={activeCohortKey}
              onPick={(k) => pickCohort(k)}
              onClose={() => setExpandedMetric(null)}
            />
          ) : null}

          <div
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              color: t.muted,
              marginTop: 14,
            }}
          >
            Synthetic seed data. Real cohort aggregation from our portfolio + Bright Data
            + paid sources lands next.
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  t,
  label,
  value,
  options,
  onChange,
}: {
  t: ReturnType<typeof useTheme>;
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div style={{ padding: "2px 6px 8px" }}>
      <div
        style={{
          fontFamily: t.mono,
          fontSize: 10,
          color: t.mutedSoft,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        <button
          onClick={() => onChange(null)}
          style={{
            padding: "3px 8px",
            borderRadius: 999,
            fontFamily: t.sans,
            fontSize: 11,
            background: value == null ? t.accent : "transparent",
            color: value == null ? "#0B1116" : t.inkSoft,
            border: `1px solid ${value == null ? t.accent : t.rule}`,
            cursor: "pointer",
            fontWeight: value == null ? 600 : 500,
          }}
        >
          any
        </button>
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              onClick={() => onChange(active ? null : o)}
              style={{
                padding: "3px 8px",
                borderRadius: 999,
                fontFamily: t.sans,
                fontSize: 11,
                background: active ? t.accent : "transparent",
                color: active ? "#0B1116" : t.inkSoft,
                border: `1px solid ${active ? t.accent : t.rule}`,
                cursor: "pointer",
                fontWeight: active ? 600 : 500,
              }}
            >
              {prettify(o)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MetricAcrossCohortsPanel({
  t,
  metricId,
  metricDef,
  allRows,
  cohorts,
  activeCohortKey,
  onPick,
  onClose,
}: {
  t: ReturnType<typeof useTheme>;
  metricId: string;
  metricDef: MetricDef | null;
  allRows: AllRow[];
  cohorts: CohortSummary[];
  activeCohortKey: string | null;
  onPick: (cohortKey: string) => void;
  onClose: () => void;
}) {
  // For each cohort, pick the latest period's row for this metric.
  const rows = allRows.filter((r) => r.metric === metricId);
  const byCohort = new Map<string, AllRow>();
  for (const r of rows) {
    const existing = byCohort.get(r.cohortKey);
    if (!existing || r.period > existing.period) byCohort.set(r.cohortKey, r);
  }
  const entries = Array.from(byCohort.entries()).map(([cohortKey, row]) => {
    const c = cohorts.find((x) => x.cohortKey === cohortKey);
    return {
      cohortKey,
      label: c ? labelForCohort(c) : cohortKey,
      row,
    };
  });
  // Shared axis bounds — include all p25 and p90 values.
  const values: number[] = [];
  for (const e of entries) {
    if (e.row.p25 != null) values.push(e.row.p25);
    if (e.row.p90 != null) values.push(e.row.p90);
  }
  if (values.length === 0) return null;
  const minRaw = Math.min(...values);
  const maxRaw = Math.max(...values);
  const pad = (maxRaw - minRaw) * 0.06 || Math.max(minRaw * 0.05, 1);
  const min = minRaw - pad;
  const max = maxRaw + pad;
  const pos = (v: number) => (max <= min ? 0 : ((v - min) / (max - min)) * 100);

  return (
    <div
      style={{
        marginTop: 18,
        padding: 18,
        background: t.panel,
        border: `1px solid ${t.accent}33`,
        borderLeft: `3px solid ${t.accent}`,
        borderRadius: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              fontWeight: 600,
              color: t.accent,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Metric drill-down
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 16, fontWeight: 700, color: t.ink, marginTop: 2 }}>
            {metricDef?.label ?? metricId} across {entries.length} cohorts
          </div>
          {metricDef?.hint ? (
            <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginTop: 2 }}>
              {metricDef.hint}
            </div>
          ) : null}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: t.muted,
            fontSize: 16,
            cursor: "pointer",
          }}
          title="Close"
        >
          ×
        </button>
      </div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {entries
          .sort((a, b) => (b.row.p50 ?? 0) - (a.row.p50 ?? 0))
          .map(({ cohortKey, label, row }) => {
            const active = cohortKey === activeCohortKey;
            return (
              <button
                key={cohortKey}
                onClick={() => onPick(cohortKey)}
                style={{
                  textAlign: "left",
                  background: active ? t.panelAlt : "transparent",
                  border: `1px solid ${active ? t.accent : "transparent"}`,
                  borderRadius: 6,
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontFamily: t.sans,
                  color: t.ink,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 500 }}>
                  <span>{label}</span>
                  <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                    p50 {fmtValue(row.p50, row.unit)}
                  </span>
                </div>
                <div style={{ position: "relative", height: 10, marginTop: 6 }}>
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: t.panelAlt,
                    }}
                  />
                  {row.p25 != null && row.p90 != null ? (
                    <div
                      style={{
                        position: "absolute",
                        top: 2,
                        left: `${pos(row.p25)}%`,
                        width: `${pos(row.p90) - pos(row.p25)}%`,
                        height: 6,
                        background: `linear-gradient(90deg, ${t.accent}33 0%, ${t.accent}88 50%, ${t.accent} 100%)`,
                        borderRadius: 3,
                      }}
                    />
                  ) : null}
                  {row.p50 != null ? (
                    <div
                      style={{
                        position: "absolute",
                        left: `calc(${pos(row.p50)}% - 1px)`,
                        top: 0,
                        width: 2,
                        height: 10,
                        background: t.ink,
                      }}
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}

function MetricCard({
  t,
  def,
  row,
  expanded,
  onToggle,
}: {
  t: ReturnType<typeof useTheme>;
  def: MetricDef;
  row: MetricRow | null;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const inverted = row?.invertedGood ?? def.invertedGood ?? false;
  return (
    <div
      onClick={onToggle}
      style={{
        background: t.panel,
        border: `1px solid ${expanded ? t.accent : t.rule}`,
        borderRadius: 8,
        padding: 14,
        cursor: onToggle ? "pointer" : "default",
        transition: "border-color 120ms ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}>
          {def.label}
        </span>
        {inverted ? (
          <span style={{ fontFamily: t.sans, fontSize: 10, color: t.muted }}>
            lower is better
          </span>
        ) : null}
      </div>
      <div style={{ fontFamily: t.sans, fontSize: 11.5, color: t.muted, marginBottom: 10 }}>
        {def.hint ?? ""}
      </div>
      {row ? (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {(["p25", "p50", "p75", "p90"] as const).map((p) => (
              <div key={p}>
                <div style={{ fontFamily: t.mono, fontSize: 10, color: t.muted, textTransform: "uppercase" }}>
                  {p}
                </div>
                <div
                  style={{
                    fontFamily: t.sans,
                    fontSize: 15,
                    fontWeight: 600,
                    color: p === "p50" ? t.ink : t.inkSoft,
                    marginTop: 2,
                  }}
                >
                  {fmtValue(row[p], row.unit)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, height: 5, background: t.panelAlt, borderRadius: 3, position: "relative", overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                left: "25%",
                right: "25%",
                top: 0,
                bottom: 0,
                background: `linear-gradient(90deg, ${t.accent}66 0%, ${t.accent} 50%, ${t.accent}66 100%)`,
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: t.sans, fontSize: 12, color: t.mutedSoft, padding: "12px 0" }}>
          Not in this cohort
        </div>
      )}
    </div>
  );
}
