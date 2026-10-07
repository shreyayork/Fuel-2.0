"use client";

import { useMemo, useState } from "react";
import { BREAKPOINTS, TOUCH_TARGET_MIN, useNarrow } from "@/lib/responsive";
import { applyClientSearchPatch, useClientSearchQuery } from "@/lib/use-url-synced-tab";
import { usePathname } from "next/navigation";
import { SectionHead } from "../atoms";
import { FilterGroup, FilterMenu, PageToolbar } from "../ToolbarActions";
import { useTheme } from "../ThemeContext";
import { groupCardHeadStyle, groupCardStyle, groupItemStyle } from "@/lib/theme";

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
  activeCohortKey: initialCohortKey,
  allRows,
  metricDefs,
}: {
  cohorts: CohortSummary[];
  activeCohortKey: string | null;
  allRows: AllRow[];
  metricDefs: MetricDef[];
}) {
  const t = useTheme();
  const pathname = usePathname();
  const search = useClientSearchQuery();
  const phone = useNarrow(BREAKPOINTS.md);

  // Dimension filters (narrow the cohort sidebar).
  const [businessModel, setBusinessModel] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [geo, setGeo] = useState<string | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const cohortKeys = useMemo(() => cohorts.map((c) => c.cohortKey), [cohorts]);
  const activeCohortKey = (() => {
    const fromUrl = search.get("cohort");
    if (fromUrl && cohortKeys.includes(fromUrl)) return fromUrl;
    return initialCohortKey ?? cohortKeys[0] ?? null;
  })();

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
    applyClientSearchPatch(pathname, { cohort: key }, "push");
  };

  // Unique filter options from the full cohort list.
  const models = Array.from(new Set(cohorts.map((c) => c.dimensions.businessModel).filter(Boolean))) as string[];
  const stages = Array.from(new Set(cohorts.map((c) => c.dimensions.stage).filter(Boolean))) as string[];
  const geos = Array.from(new Set(cohorts.map((c) => c.dimensions.geo).filter(Boolean))) as string[];

  const filterActiveCount =
    (businessModel ? 1 : 0) + (stage ? 1 : 0) + (geo ? 1 : 0);

  return (
    <div className="fuel-benchmarks" style={{ fontFamily: t.sans }}>
      <SectionHead
        t={t}
        title="Benchmarks"
        subtitle="Percentile distributions for key metrics across peer cohorts. Pick a cohort to see where your portfolio stands."
        right={
          <PageToolbar
            t={t}
            filter={
              <FilterMenu
                t={t}
                activeCount={filterActiveCount}
                onClear={() => {
                  setBusinessModel(null);
                  setStage(null);
                  setGeo(null);
                }}
              >
                {phone ? (
                  <FilterGroup t={t} title="Peer group">
                    {filteredCohorts.length === 0 ? (
                      <div
                        style={{
                          color: t.muted,
                          fontFamily: t.sans,
                          fontSize: 14,
                        }}
                      >
                        No peer groups match these filters.
                      </div>
                    ) : (
                      <CohortFilter
                        t={t}
                        cohorts={filteredCohorts}
                        activeCohortKey={activeCohortKey}
                        onPick={pickCohort}
                        dense
                      />
                    )}
                  </FilterGroup>
                ) : null}
                <FilterGroup t={t} title="Dimensions">
                  <div className="fuel-benchmarks__filters" style={{ padding: 0 }}>
                    <FilterSelect
                      t={t}
                      label="Model"
                      value={businessModel}
                      options={models}
                      onChange={setBusinessModel}
                    />
                    <FilterSelect
                      t={t}
                      label="Stage"
                      value={stage}
                      options={stages}
                      onChange={setStage}
                    />
                    <FilterSelect
                      t={t}
                      label="Geo"
                      value={geo}
                      options={geos}
                      onChange={setGeo}
                    />
                  </div>
                </FilterGroup>
                {!phone && filteredCohorts.length === 0 ? (
                  <div
                    style={{
                      color: t.muted,
                      fontFamily: t.sans,
                      fontSize: 14,
                    }}
                  >
                    No peer groups match these filters.
                  </div>
                ) : null}
              </FilterMenu>
            }
          />
        }
      />

      <div className="fuel-benchmarks__layout">
        <div
          className="fuel-benchmarks__main fuel-group"
          style={groupCardStyle(t, { minWidth: 0 })}
        >
          <div className="fuel-group__head" style={groupCardHeadStyle(t)}>
            <span className="fuel-group__title" style={{ color: t.ink, fontFamily: t.sans, fontSize: 14 }}>
              {phone && activeCohort
                ? labelForCohort(activeCohort)
                : "Peer group"}
            </span>
            <span className="fuel-group__meta" style={{ color: t.muted, fontFamily: t.sans, fontSize: 12 }}>
              {phone && activeCohort?.sampleSize != null
                ? `n=${activeCohort.sampleSize}`
                : filteredCohorts.length}
            </span>
          </div>

          {phone ? null : filteredCohorts.length === 0 ? (
            <p style={{ color: t.muted, fontFamily: t.sans, fontSize: 13, margin: "0 0 10px" }}>
              No peer groups match these filters.
            </p>
          ) : (
            <CohortFilter
              t={t}
              cohorts={filteredCohorts}
              activeCohortKey={activeCohortKey}
              onPick={pickCohort}
            />
          )}

          {activeCohort || phone ? null : (
            <p style={{ color: t.muted, fontFamily: t.sans, fontSize: 13, margin: "0 0 4px" }}>
              Select a cohort to inspect percentile bands.
            </p>
          )}

          <div className="fuel-benchmarks__metrics fuel-group__body">
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
              color: t.muted,
              fontFamily: t.sans,
              fontSize: 11,
              lineHeight: 1.45,
              marginTop: 12,
            }}
          >
            Synthetic seed data. Real cohort aggregation from our portfolio + Bright Data + paid
            sources lands next.
          </div>
        </div>
      </div>
    </div>
  );
}

function CohortFilter({
  t,
  cohorts,
  activeCohortKey,
  onPick,
  dense = false,
}: {
  t: ReturnType<typeof useTheme>;
  cohorts: CohortSummary[];
  activeCohortKey: string | null;
  onPick: (key: string) => void;
  /** Compact styling for the filter sheet. */
  dense?: boolean;
}) {
  return (
    <label
      className="fuel-benchmarks__cohort-filter"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        marginBottom: dense ? 0 : 10,
        minWidth: 0,
        width: "100%",
      }}
    >
      <span style={{ display: "block", position: "relative" }}>
        <select
          aria-label="Peer group"
          value={activeCohortKey ?? ""}
          onChange={(e) => {
            if (e.target.value) onPick(e.target.value);
          }}
          style={{
            WebkitAppearance: "none",
            appearance: "none",
            backgroundColor: dense ? t.panelAlt : t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: dense ? 8 : 10,
            color: t.ink,
            cursor: "pointer",
            fontFamily: t.sans,
            fontSize: 14,
            fontWeight: 650,
            minHeight: TOUCH_TARGET_MIN,
            padding: "0 32px 0 12px",
            width: "100%",
          }}
        >
          {activeCohortKey ? null : <option value="">Select a peer group</option>}
          {cohorts.map((c) => (
            <option key={c.cohortKey} value={c.cohortKey}>
              {labelForCohort(c)}
              {c.sampleSize != null ? ` · n=${c.sampleSize}` : ""}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          style={{
            borderBottom: `1.5px solid ${t.muted}`,
            borderRight: `1.5px solid ${t.muted}`,
            height: 7,
            pointerEvents: "none",
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-65%) rotate(45deg)",
            width: 7,
          }}
        />
      </span>
    </label>
  );
}

function FilterSelect({
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
    <label
      className="fuel-benchmarks__filter-field"
      style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}
    >
      <span
        style={{
          color: t.mutedSoft,
          fontFamily: t.mono,
          fontSize: 10,
          fontWeight: 650,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ display: "block", position: "relative" }}>
        <select
          aria-label={`Filter by ${label}`}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? e.target.value : null)}
          style={{
            WebkitAppearance: "none",
            appearance: "none",
            backgroundColor: t.panelAlt,
            border: `1px solid ${value ? `${t.accent}66` : t.rule}`,
            borderRadius: 8,
            boxShadow: value ? `inset 0 0 0 1px ${t.accent}22` : undefined,
            color: t.ink,
            cursor: "pointer",
            fontFamily: t.sans,
            fontSize: 14,
            fontWeight: value ? 650 : 500,
            minHeight: TOUCH_TARGET_MIN,
            padding: "0 32px 0 12px",
            width: "100%",
          }}
        >
          <option value="">Any</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {prettify(o)}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          style={{
            borderBottom: `1.5px solid ${t.muted}`,
            borderRight: `1.5px solid ${t.muted}`,
            height: 7,
            pointerEvents: "none",
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-65%) rotate(45deg)",
            width: 7,
          }}
        />
      </span>
    </label>
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
      className="fuel-benchmarks__drill fuel-group__item"
      style={groupItemStyle(t, {
        marginTop: 12,
        padding: 16,
      })}
    >
      <div className="fuel-benchmarks__drill-head">
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: t.accent,
              fontFamily: t.sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Metric drill-down
          </div>
          <div
            style={{
              color: t.ink,
              fontFamily: t.sans,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              marginTop: 2,
            }}
          >
            {metricDef?.label ?? metricId} across {entries.length} cohorts
          </div>
          {metricDef?.hint ? (
            <div style={{ color: t.muted, fontFamily: t.sans, fontSize: 12, marginTop: 4 }}>
              {metricDef.hint}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close drill-down"
          title="Close"
          style={{
            alignItems: "center",
            background: t.mode === "editorial" ? t.bg : t.panelAlt,
            border: `1px solid ${t.rule}`,
            borderRadius: 10,
            color: t.inkSoft,
            cursor: "pointer",
            display: "inline-flex",
            flexShrink: 0,
            fontSize: 18,
            height: TOUCH_TARGET_MIN,
            justifyContent: "center",
            width: TOUCH_TARGET_MIN,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {entries
          .sort((a, b) => (b.row.p50 ?? 0) - (a.row.p50 ?? 0))
          .map(({ cohortKey, label, row }) => {
            const active = cohortKey === activeCohortKey;
            return (
              <button
                key={cohortKey}
                type="button"
                onClick={() => onPick(cohortKey)}
                style={{
                  background: active ? `${t.accent}14` : "transparent",
                  border: `1px solid ${active ? `${t.accent}66` : t.rule}`,
                  borderRadius: 10,
                  color: t.ink,
                  cursor: "pointer",
                  fontFamily: t.sans,
                  padding: "10px 12px",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    fontSize: 12.5,
                    fontWeight: 600,
                    gap: 8,
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ minWidth: 0 }}>{label}</span>
                  <span style={{ color: t.muted, fontFamily: t.mono, fontSize: 11 }}>
                    p50 {fmtValue(row.p50, row.unit)}
                  </span>
                </div>
                <div style={{ height: 10, marginTop: 8, position: "relative" }}>
                  <div
                    style={{
                      background: t.panelAlt,
                      height: 2,
                      left: 0,
                      position: "absolute",
                      right: 0,
                      top: 4,
                    }}
                  />
                  {row.p25 != null && row.p90 != null ? (
                    <div
                      style={{
                        background: `linear-gradient(90deg, ${t.accent}33 0%, ${t.accent}88 50%, ${t.accent} 100%)`,
                        borderRadius: 3,
                        height: 6,
                        left: `${pos(row.p25)}%`,
                        position: "absolute",
                        top: 2,
                        width: `${Math.max(pos(row.p90) - pos(row.p25), 0)}%`,
                      }}
                    />
                  ) : null}
                  {row.p50 != null ? (
                    <div
                      style={{
                        background: t.ink,
                        height: 10,
                        left: `calc(${pos(row.p50)}% - 1px)`,
                        position: "absolute",
                        top: 0,
                        width: 2,
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
    <button
      type="button"
      className={`fuel-benchmarks__metric fuel-group__item${expanded ? " is-expanded" : ""}`}
      onClick={onToggle}
      aria-expanded={expanded}
      disabled={!onToggle}
      style={groupItemStyle(t, {
        cursor: onToggle ? "pointer" : "default",
        display: "block",
        fontFamily: t.sans,
        padding: 14,
        textAlign: "left",
        transition: "border-color 120ms ease",
        width: "100%",
        ...(expanded ? { borderColor: `${t.accent}66` } : {}),
      })}
    >
      <div
        style={{
          alignItems: "baseline",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span style={{ color: t.ink, fontSize: 13.5, fontWeight: 700 }}>{def.label}</span>
        {inverted ? (
          <span style={{ color: t.muted, fontSize: 10, fontWeight: 600 }}>lower is better</span>
        ) : null}
      </div>
      {def.hint ? (
        <div style={{ color: t.muted, fontSize: 12, lineHeight: 1.4, marginBottom: 10 }}>{def.hint}</div>
      ) : (
        <div style={{ marginBottom: 10 }} />
      )}
      {row ? (
        <div>
          <div className="fuel-benchmarks__pcts" style={{ fontFeatureSettings: '"tnum" 1' }}>
            {(["p25", "p50", "p75", "p90"] as const).map((p) => (
              <div key={p}>
                <div
                  style={{
                    color: t.muted,
                    fontFamily: t.mono,
                    fontSize: 10,
                    textTransform: "uppercase",
                  }}
                >
                  {p}
                </div>
                <div
                  style={{
                    color: p === "p50" ? t.ink : t.inkSoft,
                    fontSize: 15,
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  {fmtValue(row[p], row.unit)}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              background: t.panelAlt,
              borderRadius: 3,
              height: 5,
              marginTop: 12,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                background: `linear-gradient(90deg, ${t.accent}66 0%, ${t.accent} 50%, ${t.accent}66 100%)`,
                bottom: 0,
                left: "25%",
                position: "absolute",
                right: "25%",
                top: 0,
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ color: t.mutedSoft, fontSize: 12, padding: "12px 0" }}>Not in this cohort</div>
      )}
    </button>
  );
}
