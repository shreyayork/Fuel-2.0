"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type CSSProperties } from "react";
import { removeCompanyAction } from "@/app/(app)/portfolio/actions";
import { useBreadcrumbOverride } from "../BreadcrumbContext";
import { Chip, Logo } from "../atoms";
import { useTheme } from "../ThemeContext";
import type { Theme } from "@/lib/theme";
import type { Watchlist, WatchlistCompany } from "@/db/schema";
import { PlaybookPickerButton, type PlaybookPickerEntry } from "./PlaybookPickerButton";
import type { TeamAccessOption } from "./watchlist-access-ui";
import {
  CompanyOverviewTrigger,
  PortfolioCompanyOverviewSheet,
} from "./PortfolioCompanyOverviewSheet";

/**
 * One signal, with its latest observation per company across the portfolio.
 * Fed from signal_observations (unified store after migration 0042) so any
 * quantitative signal in the catalog can drive a distribution strip — not
 * just the 12 portfolio_updates columns the legacy CompanyMetric shape
 * supported.
 */
export interface SignalSeries {
  signalId: string;
  points: Array<{
    companyUuid: string;
    name: string | null;
    value: number;
    period: string;
  }>;
}

/** Compact catalog entry — label, category, unit, invertedGood. Feeds the
 *  picker + the DistributionStrip header. */
export interface PortfolioSignalCatalogEntry {
  id: string;
  label: string;
  category: string;
  unit: string | null;
  invertedGood: boolean;
}

export interface PortfolioBenchmarks {
  cohortKey: string | null;
  rows: Array<{
    metric: string;
    p25: number | null;
    p50: number | null;
    p75: number | null;
    p90: number | null;
    unit: string | null;
    invertedGood: boolean;
  }>;
  allCohorts: Array<{
    cohortKey: string;
    dimensions: {
      businessModel?: string | null;
      stage?: string | null;
      vertical?: string | null;
      geo?: string | null;
    };
    sampleSize: number | null;
  }>;
}

function scopeLabel(scope: "private" | "account" | "team"): string {
  return scope === "private" ? "Private" : scope === "team" ? "Team" : "Workspace";
}

function relativeTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  const time = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  const ms = Date.now() - time;
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function btn(active = false): CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  };
}

export function WatchlistDetail({
  watchlist,
  companies,
  userEmail,
  canEdit,
  signalSeries = [],
  signalCatalog = [],
  benchmarks,
  availablePlaybooks = [],
  routeContext,
}: {
  watchlist: Watchlist;
  companies: WatchlistCompany[];
  userEmail: string;
  canEdit: boolean;
  /** @deprecated Access managed on the list page; retained for page-loader compat. */
  linkedTeamIds?: string[];
  shareEmails?: string[];
  availableTeams?: TeamAccessOption[];
  accountMembers?: Array<{ email: string; role?: string }>;
  signalSeries?: SignalSeries[];
  signalCatalog?: PortfolioSignalCatalogEntry[];
  benchmarks?: PortfolioBenchmarks;
  availablePlaybooks?: PlaybookPickerEntry[];
  /** Which module route rendered this page — drives back link. */
  routeContext: "portfolio" | "watchlist";
}) {
  const t = useTheme();
  const [, startTransition] = useTransition();
  const [overviewCompany, setOverviewCompany] = useState<{
    uuid: string;
    name: string | null;
  } | null>(null);

  const isPortfolioKind = watchlist.kind === "portfolio";
  const listPath = routeContext === "portfolio" ? "/portfolio" : "/watchlists";
  const listLabel = routeContext === "portfolio" ? "portfolios" : "watchlists";
  const listBreadcrumbLabel = routeContext === "portfolio" ? "Portfolios" : "Watchlists";

  useBreadcrumbOverride(
    useMemo(
      () => [
        { label: listBreadcrumbLabel, href: listPath },
        { label: watchlist.name },
      ],
      [listBreadcrumbLabel, listPath, watchlist.name],
    ),
  );

  return (
    <>
    <div>
      <Link
        href={listPath}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: t.sans,
          fontSize: 13,
          color: t.muted,
          textDecoration: "none",
          marginBottom: 16,
        }}
      >
        ← All {listLabel}
      </Link>

      <div
        style={{
          padding: "20px 22px",
          background: t.panel,
          border: `1px solid ${t.rule}`,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: t.sans,
                fontSize: 26,
                fontWeight: 700,
                color: t.ink,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {watchlist.name}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
                fontFamily: t.sans,
                fontSize: 12,
                color: t.muted,
              }}
            >
              <Chip t={t} tone={isPortfolioKind ? "accent" : "ghost"}>
                {isPortfolioKind
                  ? `Portfolio${watchlist.fundName ? ` · ${watchlist.fundName}` : ""}`
                  : "Watchlist"}
              </Chip>
              <Chip t={t} tone={watchlist.scope === "team" ? "accent" : "ghost"}>
                {scopeLabel(watchlist.scope)}
              </Chip>
              <span>
                {companies.length} {companies.length === 1 ? "company" : "companies"}
              </span>
              <span style={{ color: t.rule }}>·</span>
              <span>Updated {relativeTime(watchlist.updatedAt)}</span>
              <span style={{ color: t.rule }}>·</span>
              <span>Owner {watchlist.ownerEmail === userEmail ? "you" : watchlist.ownerEmail}</span>
              {watchlist.legacyId ? <Chip t={t} tone="ghost">Migrated</Chip> : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {isPortfolioKind && availablePlaybooks.length > 0 ? (
              <PlaybookPickerButton
                subject={{
                  kind: "portfolio",
                  watchlistId: watchlist.id,
                  name: watchlist.name,
                  fundName: watchlist.fundName ?? null,
                  companies: companies.map((c) => ({
                    uuid: c.companyUuid,
                    name: c.name ?? null,
                  })),
                }}
                playbooks={availablePlaybooks}
              />
            ) : null}
          </div>
        </div>
      </div>

      {isPortfolioKind && benchmarks && signalSeries.length > 0 ? (
        <PortfolioBenchmarksPanel
          t={t}
          watchlistId={watchlist.id}
          selectedMetricIds={watchlist.benchmarkMetricIds ?? null}
          canEdit={canEdit}
          signalSeries={signalSeries}
          signalCatalog={signalCatalog}
          companyCount={companies.length}
          benchmarks={benchmarks}
        />
      ) : null}

      {companies.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            border: `1px dashed ${t.rule}`,
            fontFamily: t.sans,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: t.ink }}>No companies yet</div>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 6, lineHeight: 1.5, maxWidth: 480, margin: "6px auto 0" }}>
            Use the search bar in the header to find companies, then click &ldquo;Add to list&rdquo; on
            their profile. Or run the Fuel 1.0 migration to import existing lists.
          </div>
        </div>
      ) : (
        <div style={{ background: t.panel, border: `1px solid ${t.rule}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Company", "Added", "Added by", ""].map((h, i) => (
                  <th
                    key={h || i}
                    style={{
                      textAlign: i === 3 ? "right" : "left",
                      padding: "10px 14px",
                      fontFamily: t.sans,
                      fontSize: 11,
                      fontWeight: 500,
                      color: t.muted,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      borderBottom: `1px solid ${t.rule}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.companyUuid}>
                  <td style={{ padding: "12px 14px", borderBottom: `1px solid ${t.ruleSoft}` }}>
                    {routeContext === "portfolio" ? (
                      <CompanyOverviewTrigger
                        t={t}
                        onOpen={() =>
                          setOverviewCompany({
                            uuid: c.companyUuid,
                            name: c.name,
                          })
                        }
                      >
                        <Logo
                          t={t}
                          co={{
                            logo: (c.name ?? "??").slice(0, 2).toUpperCase(),
                            name: c.name ?? undefined,
                            uuid: c.companyUuid,
                          }}
                          size={28}
                        />
                        <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600 }}>
                          {c.name ?? c.companyUuid.slice(0, 8)}
                        </div>
                      </CompanyOverviewTrigger>
                    ) : (
                      <Link
                        href={`/company/${c.companyUuid}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          color: t.ink,
                          textDecoration: "none",
                        }}
                      >
                        <Logo
                          t={t}
                          co={{
                            logo: (c.name ?? "??").slice(0, 2).toUpperCase(),
                            name: c.name ?? undefined,
                            uuid: c.companyUuid,
                          }}
                          size={28}
                        />
                        <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600 }}>
                          {c.name ?? c.companyUuid.slice(0, 8)}
                        </div>
                      </Link>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      borderBottom: `1px solid ${t.ruleSoft}`,
                      fontFamily: t.mono,
                      fontSize: 11,
                      color: t.muted,
                    }}
                  >
                    {relativeTime(c.addedAt)}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      borderBottom: `1px solid ${t.ruleSoft}`,
                      fontFamily: t.sans,
                      fontSize: 12,
                      color: t.muted,
                    }}
                  >
                    {c.addedByEmail === userEmail ? "you" : (c.addedByEmail ?? "—")}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      borderBottom: `1px solid ${t.ruleSoft}`,
                      textAlign: "right",
                    }}
                  >
                    {canEdit ? (
                      <form
                        action={(fd) => startTransition(() => removeCompanyAction(fd))}
                        style={{ display: "inline" }}
                      >
                        <input type="hidden" name="watchlistId" value={watchlist.id} />
                        <input type="hidden" name="companyUuid" value={c.companyUuid} />
                        <button
                          type="submit"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: t.muted,
                            cursor: "pointer",
                            fontSize: 16,
                            lineHeight: 1,
                          }}
                          title="Remove from watchlist"
                        >
                          ×
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    <PortfolioCompanyOverviewSheet
      t={t}
      open={overviewCompany != null}
      onClose={() => setOverviewCompany(null)}
      companyUuid={overviewCompany?.uuid ?? null}
      companyName={overviewCompany?.name ?? null}
    />
    </>
  );
}

// ---- Portfolio benchmarks distribution ----

interface MetricSpec {
  metricId: string;
  label: string;
  unit: "usd" | "pct" | "count" | "x" | "months";
  /** "scale" | "growth" | "efficiency" | "retention" | "capital" — grouped
   *  in the picker so 12+ metrics stay scannable. */
  group: "scale" | "growth" | "efficiency" | "retention" | "capital";
}

/**
 * Full set of quantitative metrics captured on portfolio_updates rows. The
 * picker surfaces all of them; funds check the subset they care about and
 * the distribution grid renders in that order. Non-numeric quarterly fields
 * (vendor categoricals, qualitative notes, intro opt-in) can't be
 * benchmarked — they live on the individual company profile.
 */
const PORTFOLIO_METRICS: MetricSpec[] = [
  // Scale
  { metricId: "arr_usd", label: "ARR", unit: "usd", group: "scale" },
  { metricId: "paid_customer_count", label: "Paid customers", unit: "count", group: "scale" },
  { metricId: "fte_count", label: "Headcount (FTE)", unit: "count", group: "scale" },
  // Growth
  { metricId: "arr_growth_yoy_pct", label: "ARR growth YoY", unit: "pct", group: "growth" },
  // Retention
  { metricId: "nrr_pct", label: "Net revenue retention", unit: "pct", group: "retention" },
  { metricId: "logo_retention_pct", label: "Logo retention", unit: "pct", group: "retention" },
  // Efficiency
  { metricId: "gross_margin_pct", label: "Gross margin", unit: "pct", group: "efficiency" },
  { metricId: "cac_payback_months", label: "CAC payback", unit: "months", group: "efficiency" },
  { metricId: "burn_multiple", label: "Burn multiple", unit: "x", group: "efficiency" },
  { metricId: "rule_of_40_pct", label: "Rule of 40", unit: "pct", group: "efficiency" },
  // Capital
  { metricId: "monthly_burn_usd", label: "Monthly burn", unit: "usd", group: "capital" },
  { metricId: "cash_on_hand_usd", label: "Cash on hand", unit: "usd", group: "capital" },
];

const METRIC_GROUP_LABELS: Record<MetricSpec["group"], string> = {
  scale: "Scale",
  growth: "Growth",
  retention: "Retention",
  efficiency: "Efficiency",
  capital: "Capital",
};

function fmtValue(n: number | null, unit: MetricSpec["unit"]): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (unit === "usd") {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}k`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  if (unit === "pct") return `${n.toFixed(0)}%`;
  if (unit === "count") return n.toLocaleString();
  if (unit === "x") return `${n.toFixed(2)}×`;
  if (unit === "months") return `${n.toFixed(1)}mo`;
  return String(n);
}

function PortfolioBenchmarksPanel({
  t,
  watchlistId,
  selectedMetricIds,
  canEdit,
  signalSeries,
  signalCatalog,
  companyCount,
  benchmarks,
}: {
  t: Theme;
  watchlistId: string;
  /** Subset this portfolio is configured to surface. Null → show the default
   *  set (the 12 that map 1:1 to portfolio_updates columns). */
  selectedMetricIds: string[] | null;
  canEdit: boolean;
  signalSeries: SignalSeries[];
  signalCatalog: PortfolioSignalCatalogEntry[];
  companyCount: number;
  benchmarks: PortfolioBenchmarks;
}) {
  const benchByMetric = useMemo(
    () => new Map(benchmarks.rows.map((r) => [r.metric, r])),
    [benchmarks.rows],
  );
  const seriesBySignal = useMemo(
    () => new Map(signalSeries.map((s) => [s.signalId, s])),
    [signalSeries],
  );
  const catalogById = useMemo(
    () => new Map(signalCatalog.map((s) => [s.id, s])),
    [signalCatalog],
  );
  // Default surface = the 12 quarterly-survey metrics. Once an operator
  // picks their own set (including signals outside the survey columns),
  // those override the default.
  const defaultMetricIds = PORTFOLIO_METRICS.map((m) => m.metricId);
  const activeIds = selectedMetricIds && selectedMetricIds.length > 0
    ? selectedMetricIds
    : defaultMetricIds;
  const [configuring, setConfiguring] = useState(false);

  // One MetricSpec per active id. For signals on the hardcoded
  // PORTFOLIO_METRICS list, reuse their spec (preserves grouping + the
  // unit hints the picker needs). For anything else, synthesise a spec
  // from the signal catalog so the grid renders with a sensible header.
  const activeSpecs = useMemo<MetricSpec[]>(
    () =>
      activeIds
        .map((id) => {
          const hardcoded = PORTFOLIO_METRICS.find((m) => m.metricId === id);
          if (hardcoded) return hardcoded;
          const cat = catalogById.get(id);
          if (!cat) return null;
          const unit = specUnitFromCatalog(cat.unit);
          return {
            metricId: id,
            label: cat.label,
            unit,
            group: groupFromCategory(cat.category),
          } satisfies MetricSpec;
        })
        .filter((s): s is MetricSpec => s !== null),
    [activeIds, catalogById],
  );

  const withData = signalSeries.filter((s) => s.points.length > 0);

  const summary = useMemo(
    () =>
      buildPortfolioSummaryFromSeries(
        signalSeries,
        catalogById,
        benchByMetric,
        activeSpecs,
      ),
    [signalSeries, catalogById, benchByMetric, activeSpecs],
  );

  return (
    <div
      style={{
        marginBottom: 24,
        padding: 20,
        background: t.panel,
        border: `1px solid ${t.rule}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 6,
        }}
      >
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
            Benchmark distribution
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 18, fontWeight: 700, color: t.ink, marginTop: 4 }}>
            How the portfolio stacks up
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginTop: 4, lineHeight: 1.5 }}>
            Each dot is one company&apos;s latest reading on the signal. The band shows the cohort&apos;s
            bottom 25% → top 10%. Hover dots for details.
            {companyCount > withData.length && signalSeries.length > 0
              ? ` Some companies are missing data on one or more selected signals.`
              : ""}
          </div>
        </div>
        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <PortfolioCohortPicker t={t} current={benchmarks.cohortKey} cohorts={benchmarks.allCohorts} />
          {canEdit ? (
            <button
              type="button"
              onClick={() => setConfiguring((v) => !v)}
              title="Pick which metrics this portfolio surfaces"
              style={{
                padding: "5px 10px",
                fontFamily: t.sans,
                fontSize: 11,
                fontWeight: 500,
                background: configuring ? t.panelAlt : "transparent",
                color: t.inkSoft,
                border: `1px solid ${t.rule}`,
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {configuring ? "Done" : "Configure metrics"}
            </button>
          ) : null}
        </div>
      </div>

      {configuring && canEdit ? (
        <BenchmarkMetricPicker
          t={t}
          watchlistId={watchlistId}
          selectedMetricIds={selectedMetricIds}
          signalCatalog={signalCatalog}
        />
      ) : null}

      {activeSpecs.length === 0 ? (
        <div style={{ marginTop: 14, fontFamily: t.sans, fontSize: 12.5, color: t.muted }}>
          No metrics selected for this portfolio.
          {canEdit ? " Click “Configure metrics” above to pick a set." : ""}
        </div>
      ) : (
        <>
          <PortfolioScorecard t={t} summary={summary} />
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))",
              gap: 18,
            }}
          >
            {activeSpecs.map((spec) => {
              const bench = benchByMetric.get(spec.metricId);
              const series = seriesBySignal.get(spec.metricId);
              const allPoints = series ? series.points : [];
              // Count metrics can't be negative — strip flagged values from
              // the strip and surface them in the data-quality footer.
              const nonNegativeOnly = spec.unit === "count";
              const points = nonNegativeOnly
                ? allPoints.filter((p) => p.value >= 0)
                : allPoints;
              const flagged = nonNegativeOnly ? allPoints.length - points.length : 0;
              return (
                <DistributionStrip
                  key={spec.metricId}
                  t={t}
                  spec={spec}
                  bench={bench ?? null}
                  points={points}
                  flaggedCount={flagged}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// --- Helpers for the signal-catalog-driven panel ---------------------------

function specUnitFromCatalog(unit: string | null): MetricSpec["unit"] {
  switch (unit) {
    case "usd":
    case "pct":
    case "count":
    case "months":
      return unit;
    case "ratio":
      return "x";
    default:
      return "count";
  }
}

/**
 * Coarse mapping from the signal catalog's category strings (growth,
 * retention, efficiency, finance, team, fundraising, …) to the five
 * functional buckets the picker lays out. Anything unmatched lands in
 * `scale` as a sensible default so the pill doesn't disappear.
 */
function groupFromCategory(category: string): MetricSpec["group"] {
  if (category === "growth") return "growth";
  if (category === "retention") return "retention";
  if (category === "efficiency") return "efficiency";
  if (category === "finance" || category === "capital") return "capital";
  return "scale";
}

/**
 * Picker — checkboxes for the seven default portfolio metrics, plus Save /
 * Reset to default. Kept stateless (controlled by a defaultChecked set that
 * re-reads from props on every render) because selection is saved server-
 * side; a post-submit revalidate gives us the fresh state for free.
 */
function BenchmarkMetricPicker({
  t,
  watchlistId,
  selectedMetricIds,
  signalCatalog,
}: {
  t: Theme;
  watchlistId: string;
  selectedMetricIds: string[] | null;
  signalCatalog: PortfolioSignalCatalogEntry[];
}) {
  const effective = selectedMetricIds ?? PORTFOLIO_METRICS.map((m) => m.metricId);
  // Group the full catalog by category so 50+ pills stay scannable.
  const groupedCatalog = useMemo(() => {
    const byGroup = new Map<string, PortfolioSignalCatalogEntry[]>();
    for (const s of signalCatalog) {
      const arr = byGroup.get(s.category) ?? [];
      arr.push(s);
      byGroup.set(s.category, arr);
    }
    return Array.from(byGroup.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [signalCatalog]);

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        background: t.panelAlt,
        border: `1px solid ${t.rule}`,
        borderRadius: 6,
      }}
    >
      <form
        action={async (fd) => {
          const mod = await import("@/app/(app)/portfolio/actions");
          await mod.setBenchmarkMetricsAction(fd);
        }}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <input type="hidden" name="id" value={watchlistId} />
        <div style={{ fontFamily: t.sans, fontSize: 11.5, color: t.muted, lineHeight: 1.45 }}>
          Which signals should this portfolio surface? Applies to the distribution grid + the
          scorecard aggregate. Pick any quantitative signal from the catalog — the 12 on the
          quarterly survey are the default, but you can pin any signal observed from emails,
          notes, or manual entry (e.g. AI readiness, GTM efficiency).
        </div>
        {/* Full catalog grouped by category — 50+ signals laid out as rows
         *  with category labels. The default 12 are sorted to the top of
         *  their groups so the common case stays obvious. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
          {groupedCatalog.map(([category, sigs]) => {
            const sortedSigs = [...sigs].sort((a, b) => {
              const aDefault = PORTFOLIO_METRICS.some((m) => m.metricId === a.id);
              const bDefault = PORTFOLIO_METRICS.some((m) => m.metricId === b.id);
              if (aDefault !== bDefault) return aDefault ? -1 : 1;
              return a.label.localeCompare(b.label);
            });
            return (
              <div key={category} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span
                  style={{
                    fontFamily: t.mono,
                    fontSize: 10,
                    color: t.mutedSoft,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    width: 96,
                    flexShrink: 0,
                    paddingTop: 6,
                  }}
                >
                  {category.replace(/_/g, " ")}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {sortedSigs.map((sig) => {
                    const active = effective.includes(sig.id);
                    const isDefault = PORTFOLIO_METRICS.some((m) => m.metricId === sig.id);
                    return (
                      <label
                        key={sig.id}
                        title={isDefault ? "Part of the default quarterly-survey set" : "Aggregated from signal_observations"}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 10px",
                          borderRadius: 999,
                          border: `1px solid ${active ? t.accent : t.rule}`,
                          background: active ? `${t.accent}22` : "transparent",
                          fontFamily: t.sans,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          name="metricId"
                          value={sig.id}
                          defaultChecked={active}
                        />
                        {sig.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            style={{
              padding: "6px 14px",
              background: t.ink,
              color: t.bg,
              border: `1px solid ${t.ink}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>
          <button
            type="submit"
            formAction={async (fd) => {
              // Clearing the override (empty submission) reverts to the
              // default set. We pass no metricId entries so the server
              // action writes null.
              const mod = await import("@/app/(app)/portfolio/actions");
              fd.delete("metricId");
              await mod.setBenchmarkMetricsAction(fd);
            }}
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: t.inkSoft,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Reset to default
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Portfolio summary (scorecard) ----------

interface PortfolioSummary {
  totalMetrics: number;
  metricsAboveCohortP50: number;
  topPerformer: { name: string; metricCount: number } | null;
  watchlist: { count: number; sample: Array<{ name: string; metric: string }> };
}

function buildPortfolioSummaryFromSeries(
  series: SignalSeries[],
  catalog: Map<string, PortfolioSignalCatalogEntry>,
  benchByMetric: Map<string, PortfolioBenchmarks["rows"][number]>,
  activeSpecs: MetricSpec[],
): PortfolioSummary {
  let metricsAboveCohortP50 = 0;
  let totalEvaluable = 0;
  const leaderTally = new Map<string, { name: string; n: number }>();
  const concernTally = new Map<string, { name: string; metric: string }[]>();
  const seriesById = new Map(series.map((s) => [s.signalId, s]));

  for (const spec of activeSpecs) {
    const bench = benchByMetric.get(spec.metricId);
    if (!bench || bench.p50 == null) continue;
    const series = seriesById.get(spec.metricId);
    if (!series || series.points.length === 0) continue;
    totalEvaluable += 1;
    // Per-metric portfolio median (excludes nulls + impossible negatives).
    const pts = series.points
      .map((p) => p.value)
      .filter((v) => Number.isFinite(v) && (spec.unit !== "count" || v >= 0));
    if (pts.length === 0) continue;
    const sorted = [...pts].sort((a, b) => a - b);
    const portfolioP50 = sorted[Math.floor(sorted.length / 2)];
    const better = bench.invertedGood
      ? portfolioP50 < bench.p50
      : portfolioP50 > bench.p50;
    if (better) metricsAboveCohortP50 += 1;

    // Per-company rank vs cohort
    if (bench.p75 != null && bench.p25 != null) {
      for (const point of series.points) {
        const v = point.value;
        if (!Number.isFinite(v)) continue;
        if (spec.unit === "count" && v < 0) continue;
        const isLeader = bench.invertedGood ? v <= bench.p25 : v >= bench.p75;
        const isConcern = bench.invertedGood ? v >= bench.p75 : v <= bench.p25;
        const name = point.name ?? point.companyUuid.slice(0, 8);
        if (isLeader) {
          const cur = leaderTally.get(point.companyUuid) ?? { name, n: 0 };
          cur.n += 1;
          leaderTally.set(point.companyUuid, cur);
        }
        if (isConcern) {
          const cur = concernTally.get(point.companyUuid) ?? [];
          cur.push({ name, metric: spec.label });
          concernTally.set(point.companyUuid, cur);
        }
      }
    }
  }
  // catalog arg reserved for future "show cohort-less signals differently"
  // logic — referenced here so the unused-param lint doesn't bark.
  void catalog;

  const topPerformer = Array.from(leaderTally.values()).sort((a, b) => b.n - a.n)[0];
  const watchlistEntries: Array<{ name: string; metric: string }> = [];
  for (const arr of concernTally.values()) {
    if (arr.length >= 2) watchlistEntries.push(arr[0]);
  }
  return {
    totalMetrics: totalEvaluable,
    metricsAboveCohortP50,
    topPerformer: topPerformer ? { name: topPerformer.name, metricCount: topPerformer.n } : null,
    watchlist: { count: watchlistEntries.length, sample: watchlistEntries.slice(0, 3) },
  };
}

function PortfolioScorecard({ t, summary }: { t: Theme; summary: PortfolioSummary }) {
  const cardStyle = (accentColor: string): CSSProperties => ({
    flex: 1,
    minWidth: 200,
    padding: "12px 14px",
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderLeft: `3px solid ${accentColor}`,
    borderRadius: 6,
  });
  return (
    <div
      style={{
        marginTop: 18,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={cardStyle(t.accent)}>
        <div style={{ fontFamily: t.mono, fontSize: 10, color: t.mutedSoft, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Above cohort p50
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 22, fontWeight: 700, color: t.ink, marginTop: 2 }}>
          {summary.metricsAboveCohortP50}/{summary.totalMetrics}
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
          metrics where the portfolio median beats the cohort
        </div>
      </div>
      <div style={cardStyle("#FFE66A")}>
        <div style={{ fontFamily: t.mono, fontSize: 10, color: t.mutedSoft, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Top performer
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 18, fontWeight: 600, color: t.ink, marginTop: 2 }}>
          {summary.topPerformer ? summary.topPerformer.name : "—"}
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
          {summary.topPerformer
            ? `Leads on ${summary.topPerformer.metricCount} of ${summary.totalMetrics} metrics`
            : "No clear leader yet"}
        </div>
      </div>
      <div style={cardStyle(summary.watchlist.count > 0 ? "#FF7A59" : t.rule)}>
        <div style={{ fontFamily: t.mono, fontSize: 10, color: t.mutedSoft, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          On watchlist
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 22, fontWeight: 700, color: t.ink, marginTop: 2 }}>
          {summary.watchlist.count}
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
          {summary.watchlist.sample.length > 0
            ? `e.g. ${summary.watchlist.sample.map((s) => s.name).join(", ")}`
            : "no companies are below cohort p25 on ≥2 metrics"}
        </div>
      </div>
    </div>
  );
}

function PortfolioCohortPicker({
  t,
  current,
  cohorts,
}: {
  t: Theme;
  current: string | null;
  cohorts: PortfolioBenchmarks["allCohorts"];
}) {
  if (cohorts.length === 0) return null;
  const label = (c: PortfolioBenchmarks["allCohorts"][number]) => {
    const d = c.dimensions;
    const parts: string[] = [];
    const top = d.vertical || d.businessModel;
    if (top) parts.push(top.replace(/_/g, " "));
    if (d.stage) parts.push(d.stage.replace(/_/g, " "));
    if (d.geo) parts.push(d.geo.toUpperCase());
    return (parts.join(" · ") || c.cohortKey).replace(/\bb2b\b/i, "B2B").replace(/\b\w/g, (x) => x.toUpperCase());
  };
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: t.sans,
        fontSize: 11,
        color: t.muted,
      }}
    >
      cohort
      <select
        defaultValue={current ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          const url = new URL(window.location.href);
          if (v) url.searchParams.set("cohort", v);
          else url.searchParams.delete("cohort");
          window.location.href = url.toString();
        }}
        style={{
          padding: "4px 6px",
          borderRadius: 6,
          border: `1px solid ${t.rule}`,
          background: t.panelAlt,
          color: t.ink,
          fontFamily: t.sans,
          fontSize: 11,
          cursor: "pointer",
          maxWidth: 300,
        }}
      >
        {cohorts.map((c) => (
          <option key={c.cohortKey} value={c.cohortKey}>
            {label(c)}
            {c.sampleSize ? ` · n=${c.sampleSize}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Quartile classification for a company's value relative to cohort
 * percentiles. "Inverted" metrics (burn, CAC payback) flip the polarity:
 * lower is better, so leaders are below p25 not above p75.
 */
type Quartile = "leader" | "above" | "in" | "below" | "lagging" | "unknown";

function classifyQuartile(
  value: number,
  bench: PortfolioBenchmarks["rows"][number] | null,
): Quartile {
  if (!bench) return "unknown";
  const { p25, p50, p75, p90, invertedGood } = bench;
  // Use whichever percentiles we have. Fall back to p50 if 25/75 missing.
  if (p25 == null && p75 == null && p50 == null) return "unknown";
  // Helper: directional comparator that respects invertedGood.
  const better = (v: number, threshold: number) =>
    invertedGood ? v <= threshold : v >= threshold;
  const worse = (v: number, threshold: number) =>
    invertedGood ? v >= threshold : v <= threshold;
  if (p90 != null && better(value, p90)) return "leader";
  if (p75 != null && better(value, p75)) return "above";
  if (p25 != null && worse(value, p25)) return "lagging";
  if (p50 != null && worse(value, p50)) return "below";
  return "in";
}

const QUARTILE_COLOR: Record<Quartile, string> = {
  leader: "#00B48A", // teal — strongly above cohort
  above: "#7BD7AF", // light teal
  in: "#9AA4B2", // gray — in mid quartiles
  below: "#FFC07A", // soft amber
  lagging: "#FF7A59", // strong amber/red
  unknown: "#65748B",
};

const QUARTILE_LABEL: Record<Quartile, string> = {
  leader: "≥ cohort p90",
  above: "≥ cohort p75",
  in: "in cohort p25–p75",
  below: "≤ cohort p50",
  lagging: "≤ cohort p25",
  unknown: "no cohort baseline",
};

/** Compute the median of a numeric array. */
function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/**
 * Group dots whose pixel positions overlap (within 12px) so a stack of 5
 * cos at the same value renders as one badge with a "+4" — no more "looks
 * like one dot" silent data loss.
 */
type DotGroup = {
  leftPct: number;
  members: Array<{ companyUuid: string; name: string | null; value: number; quartile: Quartile }>;
};
function groupDots(
  dots: Array<{ companyUuid: string; name: string | null; value: number; quartile: Quartile }>,
  width: (v: number) => number,
  thresholdPct: number,
): DotGroup[] {
  const sorted = [...dots].sort((a, b) => a.value - b.value);
  const out: DotGroup[] = [];
  for (const d of sorted) {
    const pct = width(d.value);
    const last = out[out.length - 1];
    if (last && pct - last.leftPct <= thresholdPct) {
      last.members.push(d);
    } else {
      out.push({ leftPct: pct, members: [d] });
    }
  }
  return out;
}

function DistributionStrip({
  t,
  spec,
  bench,
  points,
  flaggedCount,
}: {
  t: Theme;
  spec: MetricSpec;
  bench: PortfolioBenchmarks["rows"][number] | null;
  points: Array<{ companyUuid: string; name: string | null; value: number }>;
  flaggedCount: number;
}) {
  // Axis domain: include cohort percentiles + actual values so outliers
  // stay visible. For non-negative units (FTE count) clamp the floor at 0.
  const valueBoundaries: number[] = [];
  if (bench?.p25 != null) valueBoundaries.push(bench.p25);
  if (bench?.p50 != null) valueBoundaries.push(bench.p50);
  if (bench?.p75 != null) valueBoundaries.push(bench.p75);
  if (bench?.p90 != null) valueBoundaries.push(bench.p90);
  for (const p of points) valueBoundaries.push(p.value);
  if (valueBoundaries.length === 0) {
    return null;
  }
  const minRaw = Math.min(...valueBoundaries);
  const maxRaw = Math.max(...valueBoundaries);
  const pad = Math.max((maxRaw - minRaw) * 0.08, Math.abs(maxRaw) * 0.02, 1);
  const nonNegative = spec.unit === "count";
  const min = nonNegative ? Math.max(0, minRaw - pad) : minRaw - pad;
  const max = maxRaw + pad;
  const width = (v: number) => {
    if (max <= min) return 0;
    return ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100;
  };

  // Quartile-classify each dot once.
  const dots = points.map((p) => ({ ...p, quartile: classifyQuartile(p.value, bench) }));
  // Portfolio median (for the secondary p50 line vs cohort).
  const portfolioP50 = median(points.map((p) => p.value));

  const isInverted = bench?.invertedGood === true;
  const sorted = [...points].sort((a, b) => a.value - b.value);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const headline = points.length > 0 && best && worst && best !== worst
    ? {
        hi: isInverted ? worst : best,
        lo: isInverted ? best : worst,
      }
    : null;

  // Outlier multiple vs cohort p50 — gives "8.2× cohort" context to the
  // header callout without the user having to mental-arithmetic it.
  const multipleVsP50 = (v: number): string | null => {
    if (!bench?.p50 || bench.p50 === 0) return null;
    const ratio = Math.abs(v / bench.p50);
    if (ratio < 1.5 || !Number.isFinite(ratio)) return null;
    return `${ratio.toFixed(1)}× cohort p50`;
  };

  // Group overlapping dots so multiple cos at the same value render as a
  // stack with a count badge.
  const groups = groupDots(dots, width, 1.6);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}>
          {spec.label}
          <span style={{ color: t.mutedSoft, fontWeight: 400, fontSize: 11, marginLeft: 6 }}>
            n={points.length}
            {bench?.invertedGood ? " · lower is better" : ""}
            {flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ""}
          </span>
        </div>
        {bench ? (
          <div style={{ fontFamily: t.mono, fontSize: 10, color: t.muted, textAlign: "right" }}>
            <div>cohort p50 · {fmtValue(bench.p50, spec.unit)}</div>
            {portfolioP50 != null ? (
              <div style={{ color: t.accent }}>portfolio · {fmtValue(portfolioP50, spec.unit)}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Header outlier callout — moved up from the bottom so the "hero"
          insight lands before the eye scans the strip. */}
      {headline ? (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            fontFamily: t.sans,
            fontSize: 11,
          }}
        >
          <Link
            href={`/company/${headline.lo.companyUuid}`}
            style={{ color: t.mutedSoft, textDecoration: "none" }}
          >
            ↓ {headline.lo.name ?? "—"} · {fmtValue(headline.lo.value, spec.unit)}
            {(() => {
              const m = multipleVsP50(headline.lo.value);
              return m ? <span style={{ color: t.mutedSoft, marginLeft: 4 }}>({m})</span> : null;
            })()}
          </Link>
          <Link
            href={`/company/${headline.hi.companyUuid}`}
            style={{ color: t.accent, textDecoration: "none" }}
          >
            ↑ {headline.hi.name ?? "—"} · {fmtValue(headline.hi.value, spec.unit)}
            {(() => {
              const m = multipleVsP50(headline.hi.value);
              return m ? <span style={{ color: t.accent, marginLeft: 4 }}>({m})</span> : null;
            })()}
          </Link>
        </div>
      ) : null}

      <div style={{ position: "relative", height: 48, marginTop: 12 }}>
        {/* Outer track (full axis) */}
        <div
          style={{
            position: "absolute",
            top: 22,
            left: 0,
            right: 0,
            height: 6,
            background: t.panelAlt,
            borderRadius: 3,
          }}
        />
        {/* Cohort percentile zones — three distinct shades so the band is
            actually visible behind the dots: outer p10-p25 + p75-p90 are
            light, inner p25-p75 is darker. */}
        {bench?.p25 != null && bench?.p75 != null ? (
          <div
            style={{
              position: "absolute",
              top: 22,
              left: `${width(bench.p25)}%`,
              width: `${width(bench.p75) - width(bench.p25)}%`,
              height: 6,
              background: `${t.accent}55`,
              borderRadius: 0,
            }}
            title={`cohort p25–p75 · ${fmtValue(bench.p25, spec.unit)} → ${fmtValue(bench.p75, spec.unit)}`}
          />
        ) : null}
        {bench?.p75 != null && bench?.p90 != null ? (
          <div
            style={{
              position: "absolute",
              top: 22,
              left: `${width(bench.p75)}%`,
              width: `${width(bench.p90) - width(bench.p75)}%`,
              height: 6,
              background: `${t.accent}28`,
            }}
            title={`cohort p75–p90`}
          />
        ) : null}
        {/* Cohort p50 — thin gray line */}
        {bench?.p50 != null ? (
          <div
            style={{
              position: "absolute",
              left: `calc(${width(bench.p50)}% - 0.5px)`,
              top: 18,
              width: 1,
              height: 14,
              background: t.muted,
              opacity: 0.7,
            }}
            title={`cohort p50 · ${fmtValue(bench.p50, spec.unit)}`}
          />
        ) : null}
        {/* Portfolio p50 — thicker accent line; prominent so the user can
            read "where does my portfolio sit vs the cohort" at a glance. */}
        {portfolioP50 != null ? (
          <div
            style={{
              position: "absolute",
              left: `calc(${width(portfolioP50)}% - 1.5px)`,
              top: 14,
              width: 3,
              height: 22,
              background: t.accent,
              borderRadius: 1,
            }}
            title={`portfolio p50 · ${fmtValue(portfolioP50, spec.unit)}`}
          />
        ) : null}
        {/* Dot groups (stacked when overlapping) */}
        {groups.map((g, gi) => (
          <DotStack key={gi} t={t} group={g} spec={spec} />
        ))}
        {/* Value range labels */}
        <div
          style={{
            position: "absolute",
            top: 34,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: t.mono,
            fontSize: 9.5,
            color: t.mutedSoft,
            pointerEvents: "none",
          }}
        >
          <span>{fmtValue(min, spec.unit)}</span>
          <span>{fmtValue(max, spec.unit)}</span>
        </div>
      </div>
    </div>
  );
}

function DotStack({
  t,
  group,
  spec,
}: {
  t: Theme;
  group: DotGroup;
  spec: MetricSpec;
}) {
  const lead = group.members[0];
  const extra = group.members.length - 1;
  const tooltip =
    group.members.length === 1
      ? `${lead.name ?? lead.companyUuid} · ${fmtValue(lead.value, spec.unit)} · ${QUARTILE_LABEL[lead.quartile]}`
      : `${group.members.length} companies near ${fmtValue(lead.value, spec.unit)}: ${group.members
          .map((m) => `${m.name ?? "?"} ${fmtValue(m.value, spec.unit)}`)
          .join(", ")}`;
  // For grouped stacks, color by the most-extreme quartile so the badge
  // signals the same as the worst dot inside.
  const orderRank: Record<Quartile, number> = {
    leader: 5,
    above: 4,
    in: 3,
    below: 2,
    lagging: 1,
    unknown: 0,
  };
  const dominant = group.members.reduce((cur, m) => (orderRank[m.quartile] > orderRank[cur.quartile] ? m : cur)).quartile;
  const color = QUARTILE_COLOR[dominant];
  return (
    <Link
      href={`/company/${lead.companyUuid}`}
      title={tooltip}
      style={{
        position: "absolute",
        left: `calc(${group.leftPct}% - 6px)`,
        top: 17,
        width: extra > 0 ? "auto" : 12,
        minWidth: 12,
        height: 16,
        padding: extra > 0 ? "0 5px" : 0,
        borderRadius: 999,
        background: color,
        border: `1.5px solid ${t.bg}`,
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
        transition: "transform 120ms ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: t.mono,
        fontSize: 10,
        fontWeight: 700,
        color: t.bg,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1.25)";
        (e.currentTarget as HTMLElement).style.zIndex = "5";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLElement).style.zIndex = "0";
      }}
    >
      {extra > 0 ? `+${extra}` : null}
    </Link>
  );
}
