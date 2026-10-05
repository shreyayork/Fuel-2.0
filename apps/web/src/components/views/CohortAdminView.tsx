"use client";

import { useMemo, useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import { Chip } from "../atoms";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminStatsStrip } from "./AdminChrome";
import { useTheme } from "../ThemeContext";
import {
  adminBtnStyle,
  adminEmptyStyle,
  adminInputStyle,
  adminModalOverlayStyle,
  adminModalPanelStyle,
  adminModalTitleStyle,
  adminPageStyle,
  adminSectionLabelStyle,
  adminTableFrameStyle,
  adminTableScrollStyle,
  adminTableStyle,
  adminTdActionsStyle,
  adminTdStyle,
  adminThStyle,
} from "./adminStyles";
import {
  deleteCohortAction,
  upsertCohortAction} from "@/app/(super-admin)/super-admin/cohorts/actions";

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




export function CohortAdminView({
  rows,
  metricCatalog}: {
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
    <div className="fuel-admin-page" style={adminPageStyle()}>
      <AdminPageHeader
        t={t}
        title="Cohorts"
        description="Peer distributions used to rank companies against benchmarks."
        actions={
          <button type="button" onClick={openNew} style={adminBtnStyle(t, "primary")}>
            + New benchmark row
          </button>
        }
      />

      <AdminStatsStrip
        t={t}
        items={[
          { label: "Rows", value: rows.length },
          { label: "Cohorts", value: grouped.length },
          {
            label: "Metrics covered",
            value: new Set(rows.map((r) => r.metric)).size,
            footnote: `of ${metricCatalog.length} catalog`,
          },
        ]}
      />

      {grouped.length === 0 ? (
        <div style={adminEmptyStyle(t)}>
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
  onEdit}: {
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
    <div className="fuel-admin-table-frame" style={adminTableFrameStyle(t)}>
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${t.rule}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap"}}
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
      <div className="fuel-admin-table-wrap" style={adminTableScrollStyle()}>
        <table className="fuel-admin-table" style={adminTableStyle()}>
          <thead>
            <tr>
              {(
                [
                  { label: "Metric" },
                  { label: "Period" },
                  { label: "Bot 25%", numeric: true },
                  { label: "Median", numeric: true },
                  { label: "Top 25%", numeric: true },
                  { label: "Top 10%", numeric: true },
                  { label: "n", numeric: true },
                  { label: "Source" },
                  { label: "" },
                ] as const
              ).map((h) => (
                <th
                  key={h.label || "actions"}
                  style={adminThStyle(t, "numeric" in h && h.numeric ? { numeric: true } : undefined)}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={adminTdStyle(t)}>
                  <div style={{ fontWeight: 600, color: t.ink }}>
                    {labelById.get(r.metric) ?? r.metric}
                  </div>
                  <div style={{ fontFamily: t.mono, fontSize: 10.5, color: t.mutedSoft }}>
                    {r.metric}
                    {r.invertedGood ? " · lower=better" : ""}
                  </div>
                </td>
                <td style={adminTdStyle(t)}>{r.period}</td>
                <td style={adminTdStyle(t, { numeric: true })}>{formatValue(r.p25, r.unit)}</td>
                <td style={adminTdStyle(t, { numeric: true })}>{formatValue(r.p50, r.unit)}</td>
                <td style={adminTdStyle(t, { numeric: true })}>{formatValue(r.p75, r.unit)}</td>
                <td style={adminTdStyle(t, { numeric: true })}>{formatValue(r.p90, r.unit)}</td>
                <td style={adminTdStyle(t, { numeric: true })}>{r.sampleSize ?? "—"}</td>
                <td style={adminTdStyle(t)}>{r.source}</td>
                <td style={adminTdActionsStyle(t)}>
                  <button type="button" onClick={() => onEdit(r)} style={adminBtnStyle(t)}>
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
                    <button type="submit" style={adminBtnStyle(t, "danger")}>Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CohortEditModal({
  t,
  row,
  metricCatalog,
  onClose}: {
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
        padding: 24}}
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
          overflowY: "auto"}}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: t.sans, fontSize: 16, fontWeight: 700, color: t.ink }}>
            {row ? "Edit benchmark row" : "New benchmark row"}
          </div>
          <button type="button" onClick={onClose} style={adminBtnStyle(t)}>
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
                style={adminInputStyle(t)}
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
                style={adminInputStyle(t)}
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
              style={adminInputStyle(t)}
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
                style={adminInputStyle(t)}
              />
            </label>
            <label style={labelStyle(t)}>
              Stage
              <input
                name="stage"
                defaultValue={row?.dimensions.stage ?? ""}
                placeholder="seed"
                style={adminInputStyle(t)}
              />
            </label>
            <label style={labelStyle(t)}>
              Vertical
              <input
                name="vertical"
                defaultValue={row?.dimensions.vertical ?? ""}
                placeholder="dev_tools"
                style={adminInputStyle(t)}
              />
            </label>
            <label style={labelStyle(t)}>
              Geo
              <input
                name="geo"
                defaultValue={row?.dimensions.geo ?? ""}
                placeholder="us"
                style={adminInputStyle(t)}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <label style={labelStyle(t)}>
              Bot 25% (p25)
              <input name="p25" type="number" step="any" defaultValue={row?.p25 ?? ""} style={adminInputStyle(t)} />
            </label>
            <label style={labelStyle(t)}>
              Median (p50)
              <input name="p50" type="number" step="any" defaultValue={row?.p50 ?? ""} style={adminInputStyle(t)} />
            </label>
            <label style={labelStyle(t)}>
              Top 25% (p75)
              <input name="p75" type="number" step="any" defaultValue={row?.p75 ?? ""} style={adminInputStyle(t)} />
            </label>
            <label style={labelStyle(t)}>
              Top 10% (p90)
              <input name="p90" type="number" step="any" defaultValue={row?.p90 ?? ""} style={adminInputStyle(t)} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={labelStyle(t)}>
              Sample size
              <input name="sampleSize" type="number" step="1" defaultValue={row?.sampleSize ?? ""} style={adminInputStyle(t)} />
            </label>
            <label style={labelStyle(t)}>
              Unit
              <input name="unit" defaultValue={row?.unit ?? ""} placeholder="usd / pct / months / …" style={adminInputStyle(t)} />
            </label>
            <label style={labelStyle(t)}>
              Source
              <input name="source" defaultValue={row?.source ?? "manual"} style={adminInputStyle(t)} />
            </label>
          </div>

          <label style={{ ...labelStyle(t), flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="invertedGood" defaultChecked={row?.invertedGood ?? false} />
            <span>Inverted good (lower values are better, e.g. burn multiple)</span>
          </label>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
            <button type="button" onClick={onClose} style={adminBtnStyle(t)}>
              Cancel
            </button>
            <button type="submit" style={adminBtnStyle(t, "primary")}>
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
    color: t.muted};
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
