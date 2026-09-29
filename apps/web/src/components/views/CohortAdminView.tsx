"use client";

import { useMemo, useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import { Chip, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";
import {
  deleteCohortAction,
  upsertCohortAction,
} from "@/app/(super-admin)/super-admin/cohorts/actions";

// These match the union Drizzle exposes for benchmark_cohorts.dimensions.
type CohortDimensions = {
  businessModel?: string | null;
  stage?: string | null;
  vertical?: string | null;
  geo?: string | null;
};

export interface CohortAdminRow {
  id: string;
  metric: string;
  cohortKey: string;
  dimensions: CohortDimensions;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  sampleSize: number | null;
  period: string;
  source: string;
  invertedGood: boolean;
  unit: string | null;
  updatedAt: string;
}

export interface CohortMetricCatalogEntry {
  id: string;
  label: string;
  unit: "usd" | "pct" | "x" | "months" | "count";
  invertedGood: boolean;
  group: string;
}

function button(t: Theme, variant: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties {
  const map = {
    primary: { bg: t.ink, color: t.bg, border: t.ink },
    ghost: { bg: "transparent", color: t.inkSoft, border: t.rule },
    danger: { bg: "transparent", color: t.warn, border: t.warn },
  } as const;
  const v = map[variant];
  return {
    padding: "6px 12px",
    background: v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  };
}

function input(t: Theme): React.CSSProperties {
  return {
    padding: "8px 10px",
    background: t.panelAlt,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 13,
    width: "100%",
  };
}

function cellBase(t: Theme): React.CSSProperties {
  return {
    padding: "8px 10px",
    fontFamily: t.sans,
    fontSize: 12.5,
    color: t.inkSoft,
    borderBottom: `1px solid ${t.ruleSoft}`,
    verticalAlign: "top",
  };
}

export function CohortAdminView({
  rows,
  metricCatalog,
}: {
  rows: CohortAdminRow[];
  metricCatalog: CohortMetricCatalogEntry[];
}) {
  const t = useTheme();
  const [editing, setEditing] = useState<CohortAdminRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Group rows by cohortKey so the admin can see "b2b_saas:seed:us"
  // coherently with all its metric rows in one block.
  const grouped = useMemo(() => {
    const byKey = new Map<string, CohortAdminRow[]>();
    for (const r of rows) {
      const arr = byKey.get(r.cohortKey) ?? [];
      arr.push(r);
      byKey.set(r.cohortKey, arr);
    }
    return Array.from(byKey.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (row: CohortAdminRow) => {
    setEditing(row);
    setModalOpen(true);
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <SectionHead
          t={t}
          title="Benchmark cohorts"
          subtitle="Curated distributions used to rank companies against peers. Admin-only."
        />
        <button type="button" onClick={openNew} style={button(t, "primary")}>
          + New benchmark row
        </button>
      </div>

      {grouped.length === 0 ? (
        <div
          style={{
            padding: 24,
            border: `1px dashed ${t.rule}`,
            borderRadius: 8,
            fontFamily: t.sans,
            fontSize: 13,
            color: t.muted,
            textAlign: "center",
          }}
        >
          No cohort rows yet. Add one to seed the first distribution.
        </div>
      ) : (
        grouped.map(([cohortKey, cohortRows]) => (
          <CohortGroupCard
            key={cohortKey}
            t={t}
            cohortKey={cohortKey}
            rows={cohortRows}
            metricCatalog={metricCatalog}
            onEdit={openEdit}
          />
        ))
      )}

      {modalOpen ? (
        <CohortEditModal
          t={t}
          row={editing}
          metricCatalog={metricCatalog}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  );
}

function CohortGroupCard({
  t,
  cohortKey,
  rows,
  metricCatalog,
  onEdit,
}: {
  t: Theme;
  cohortKey: string;
  rows: CohortAdminRow[];
  metricCatalog: CohortMetricCatalogEntry[];
  onEdit: (row: CohortAdminRow) => void;
}) {
  const [_, startTransition] = useTransition();
  // Dimensions are the same across all rows for a single cohortKey by
  // convention — just read the first row.
  const head = rows[0];
  const labelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of metricCatalog) m.set(c.id, c.label);
    return m;
  }, [metricCatalog]);
  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${t.rule}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 600, color: t.ink }}>
          {cohortKey}
        </div>
        {head.dimensions.businessModel ? (
          <Chip t={t} tone="ghost">{head.dimensions.businessModel}</Chip>
        ) : null}
        {head.dimensions.stage ? <Chip t={t} tone="ghost">{head.dimensions.stage}</Chip> : null}
        {head.dimensions.vertical ? <Chip t={t} tone="ghost">{head.dimensions.vertical}</Chip> : null}
        {head.dimensions.geo ? <Chip t={t} tone="ghost">{head.dimensions.geo}</Chip> : null}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: t.mono, fontSize: 10.5, color: t.mutedSoft }}>
          {rows.length} metric{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Metric", "Period", "Bot 25%", "Median", "Top 25%", "Top 10%", "n", "Source", ""].map((h) => (
              <th
                key={h}
                style={{
                  ...cellBase(t),
                  color: t.mutedSoft,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  textAlign: "left",
                  background: t.panelAlt,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={cellBase(t)}>
                <div style={{ fontWeight: 600, color: t.ink }}>
                  {labelById.get(r.metric) ?? r.metric}
                </div>
                <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.mutedSoft }}>
                  {r.metric}
                  {r.invertedGood ? " · lower=better" : ""}
                </div>
              </td>
              <td style={cellBase(t)}>{r.period}</td>
              <td style={cellBase(t)}>{formatValue(r.p25, r.unit)}</td>
              <td style={cellBase(t)}>{formatValue(r.p50, r.unit)}</td>
              <td style={cellBase(t)}>{formatValue(r.p75, r.unit)}</td>
              <td style={cellBase(t)}>{formatValue(r.p90, r.unit)}</td>
              <td style={cellBase(t)}>{r.sampleSize ?? "—"}</td>
              <td style={cellBase(t)}>{r.source}</td>
              <td style={{ ...cellBase(t), textAlign: "right", whiteSpace: "nowrap" }}>
                <button type="button" onClick={() => onEdit(r)} style={button(t)}>
                  Edit
                </button>
                <form
                  action={(fd) => {
                    if (!confirm(`Delete ${r.metric} for ${r.cohortKey} ${r.period}?`)) return;
                    startTransition(async () => {
                      await deleteCohortAction(fd);
                    });
                  }}
                  style={{ display: "inline", marginLeft: 6 }}
                >
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" style={button(t, "danger")}>Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CohortEditModal({
  t,
  row,
  metricCatalog,
  onClose,
}: {
  t: Theme;
  row: CohortAdminRow | null;
  metricCatalog: CohortMetricCatalogEntry[];
  onClose: () => void;
}) {
  const [_, startTransition] = useTransition();
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.bg,
          border: `1px solid ${t.rule}`,
          borderRadius: 10,
          padding: 20,
          width: "min(680px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: t.sans, fontSize: 16, fontWeight: 700, color: t.ink }}>
            {row ? "Edit benchmark row" : "New benchmark row"}
          </div>
          <button type="button" onClick={onClose} style={button(t)}>
            Close
          </button>
        </div>
        <form
          action={(fd) => {
            startTransition(async () => {
              await upsertCohortAction(fd);
              onClose();
            });
          }}
          style={{ display: "grid", gap: 10 }}
        >
          {row ? <input type="hidden" name="id" value={row.id} /> : null}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={labelStyle(t)}>
              Metric
              <select
                name="metric"
                required
                defaultValue={row?.metric ?? ""}
                style={input(t)}
              >
                <option value="" disabled>
                  Pick a metric…
                </option>
                {metricCatalog.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle(t)}>
              Period
              <input
                name="period"
                required
                defaultValue={row?.period ?? ""}
                placeholder="2026-q1"
                style={input(t)}
              />
            </label>
          </div>

          <label style={labelStyle(t)}>
            Cohort key
            <input
              name="cohortKey"
              required
              defaultValue={row?.cohortKey ?? ""}
              placeholder="b2b_saas:seed:us"
              style={input(t)}
            />
            <span style={{ fontSize: 10.5, color: t.mutedSoft, fontFamily: t.mono, marginTop: 2 }}>
              Convention: {"{vertical|businessModel}:{stage}:{geo}"} with &quot;any&quot; for wildcards.
            </span>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <label style={labelStyle(t)}>
              Business model
              <input
                name="businessModel"
                defaultValue={row?.dimensions.businessModel ?? ""}
                placeholder="b2b_saas"
                style={input(t)}
              />
            </label>
            <label style={labelStyle(t)}>
              Stage
              <input
                name="stage"
                defaultValue={row?.dimensions.stage ?? ""}
                placeholder="seed"
                style={input(t)}
              />
            </label>
            <label style={labelStyle(t)}>
              Vertical
              <input
                name="vertical"
                defaultValue={row?.dimensions.vertical ?? ""}
                placeholder="dev_tools"
                style={input(t)}
              />
            </label>
            <label style={labelStyle(t)}>
              Geo
              <input
                name="geo"
                defaultValue={row?.dimensions.geo ?? ""}
                placeholder="us"
                style={input(t)}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <label style={labelStyle(t)}>
              Bot 25% (p25)
              <input name="p25" type="number" step="any" defaultValue={row?.p25 ?? ""} style={input(t)} />
            </label>
            <label style={labelStyle(t)}>
              Median (p50)
              <input name="p50" type="number" step="any" defaultValue={row?.p50 ?? ""} style={input(t)} />
            </label>
            <label style={labelStyle(t)}>
              Top 25% (p75)
              <input name="p75" type="number" step="any" defaultValue={row?.p75 ?? ""} style={input(t)} />
            </label>
            <label style={labelStyle(t)}>
              Top 10% (p90)
              <input name="p90" type="number" step="any" defaultValue={row?.p90 ?? ""} style={input(t)} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={labelStyle(t)}>
              Sample size
              <input name="sampleSize" type="number" step="1" defaultValue={row?.sampleSize ?? ""} style={input(t)} />
            </label>
            <label style={labelStyle(t)}>
              Unit
              <input name="unit" defaultValue={row?.unit ?? ""} placeholder="usd / pct / months / …" style={input(t)} />
            </label>
            <label style={labelStyle(t)}>
              Source
              <input name="source" defaultValue={row?.source ?? "manual"} style={input(t)} />
            </label>
          </div>

          <label style={{ ...labelStyle(t), flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="invertedGood" defaultChecked={row?.invertedGood ?? false} />
            <span>Inverted good (lower values are better, e.g. burn multiple)</span>
          </label>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
            <button type="button" onClick={onClose} style={button(t)}>
              Cancel
            </button>
            <button type="submit" style={button(t, "primary")}>
              {row ? "Save changes" : "Create row"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function labelStyle(t: Theme): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontFamily: t.sans,
    fontSize: 11.5,
    color: t.muted,
  };
}

function formatValue(v: number | null, unit: string | null): string {
  if (v == null) return "—";
  switch (unit) {
    case "usd":
      if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
      return `$${v.toLocaleString()}`;
    case "pct":
      return `${v}%`;
    case "months":
      return `${v}mo`;
    case "x":
    case "ratio":
      return `${v}x`;
    default:
      return v.toLocaleString();
  }
}
