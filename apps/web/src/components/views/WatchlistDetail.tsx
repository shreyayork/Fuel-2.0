"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type CSSProperties } from "react";
import { removeCompanyAction } from "@/app/(app)/portfolio/actions";
import { BREAKPOINTS, TOUCH_TARGET_MIN, useNarrow } from "@/lib/responsive";
import { useBreadcrumbOverride } from "../BreadcrumbContext";
import { BackNav, Chip, Logo } from "../atoms";
import { useTheme } from "../ThemeContext";
import type { Theme } from "@/lib/theme";
import {
  framedPanelPadStyle,
  framedPanelStyle,
  ctaPrimaryStyle,
  ctaTertiaryStyle,
} from "@/lib/theme";
import { FilterGroup, FilterMenu, FilterOption, PageToolbar } from "../ToolbarActions";
import type { Watchlist, WatchlistCompany } from "@/db/schema";
import { PlaybookPickerButton, type PlaybookPickerEntry } from "./PlaybookPickerButton";
import type { TeamAccessOption } from "./watchlist-access-ui";
import {
  CompanyOverviewTrigger,
  PortfolioCompanyOverviewSheet,
} from "./PortfolioCompanyOverviewSheet";
import {
  dataTableFrameStyle,
  dataTableStyle,
  dataTdActionsStyle,
  dataTdStyle,
  dataThStyle,
} from "./adminStyles";

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
  const phone = useNarrow(BREAKPOINTS.md);
  const [, startTransition] = useTransition();
  const [overviewCompany, setOverviewCompany] = useState<{
    uuid: string;
    name: string | null;
  } | null>(null);
  /** Phone: Companies first; Compare is a separate surface. */
  const [phoneSection, setPhoneSection] = useState<"companies" | "compare">(
    "companies",
  );

  const isPortfolioKind = watchlist.kind === "portfolio";
  const listPath = routeContext === "portfolio" ? "/portfolio" : "/watchlists";
  const listLabel = routeContext === "portfolio" ? "portfolios" : "watchlists";
  const listBreadcrumbLabel = routeContext === "portfolio" ? "Portfolios" : "Watchlists";
  const hasCompare =
    isPortfolioKind && benchmarks != null && signalSeries.length > 0;
  const showCompare = !phone || (hasCompare && phoneSection === "compare");
  const showCompanies = !phone || !hasCompare || phoneSection === "companies";

  useBreadcrumbOverride(
    useMemo(
      () => [
        { label: listBreadcrumbLabel, href: listPath },
        { label: watchlist.name },
      ],
      [listBreadcrumbLabel, listPath, watchlist.name],
    ),
  );

  const companyList =
    companies.length === 0 ? (
      <div
        style={{
          padding: phone ? 28 : 48,
          textAlign: "center",
          border: `1px dashed ${t.rule}`,
          borderRadius: phone ? 12 : 0,
          fontFamily: t.sans,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: t.ink }}>No companies yet</div>
        <div
          style={{
            fontSize: 13,
            color: t.muted,
            marginTop: 6,
            lineHeight: 1.5,
            maxWidth: 480,
            margin: "6px auto 0",
          }}
        >
          Use the search bar in the header to find companies, then click &ldquo;Add to list&rdquo; on
          their profile. Or run the Fuel 1.0 migration to import existing lists.
        </div>
      </div>
    ) : phone ? (
      <div
        className="fuel-portfolio-company-cards fuel-card-stack"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--fuel-card-gap, 10px)",
          overflow: "visible",
          padding: 0,
        }}
      >
        {companies.map((c) => (
          <PortfolioCompanyMobileRow
            key={c.companyUuid}
            t={t}
            company={c}
            userEmail={userEmail}
            canEdit={canEdit}
            watchlistId={watchlist.id}
            routeContext={routeContext}
            onOpenOverview={() =>
              setOverviewCompany({ uuid: c.companyUuid, name: c.name })
            }
            onRemove={(fd) => startTransition(() => removeCompanyAction(fd))}
          />
        ))}
      </div>
    ) : null;

  return (
    <>
    <div className="fuel-page fuel-portfolio-detail">
      <BackNav
        t={t}
        href={listPath}
        label={`All ${listLabel}`}
        style={{ marginBottom: phone ? 0 : 16 }}
      />

      <div
        style={{
          padding: phone ? "14px 14px 12px" : "20px 22px",
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: phone ? 12 : 0,
          marginBottom: phone ? 0 : 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: phone ? "stretch" : "flex-start",
            justifyContent: "space-between",
            gap: phone ? 10 : 16,
            flexDirection: phone ? "column" : "row",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: t.sans,
                fontSize: phone ? 22 : 26,
                fontWeight: 700,
                color: t.ink,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              {watchlist.name}
            </h1>
            {phone ? (
              <div
                style={{
                  marginTop: 8,
                  fontFamily: t.sans,
                  fontSize: 13,
                  color: t.muted,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: t.inkSoft, fontWeight: 600 }}>
                  {companies.length}{" "}
                  {companies.length === 1 ? "company" : "companies"}
                </span>
                {watchlist.fundName &&
                !/^AUTO:/i.test(watchlist.fundName) &&
                watchlist.fundName !== watchlist.name ? (
                  <>
                    <span style={{ color: t.rule }}> · </span>
                    <span>{watchlist.fundName}</span>
                  </>
                ) : null}
                <span style={{ color: t.rule }}> · </span>
                <span>Updated {relativeTime(watchlist.updatedAt)}</span>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 10,
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
                    {companies.length}{" "}
                    {companies.length === 1 ? "company" : "companies"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 8,
                    fontFamily: t.sans,
                    fontSize: 12,
                    color: t.muted,
                  }}
                >
                  <span>Updated {relativeTime(watchlist.updatedAt)}</span>
                  <span style={{ color: t.rule }}>·</span>
                  <span>
                    Owner{" "}
                    {watchlist.ownerEmail === userEmail
                      ? "you"
                      : watchlist.ownerEmail}
                  </span>
                  {watchlist.legacyId ? (
                    <Chip t={t} tone="ghost">Migrated</Chip>
                  ) : null}
                </div>
              </>
            )}
          </div>

          {isPortfolioKind && availablePlaybooks.length > 0 ? (
            <div
              className={phone ? "fuel-portfolio-playbooks" : undefined}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                alignSelf: phone ? "flex-start" : undefined,
                width: phone ? "auto" : undefined,
              }}
            >
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
            </div>
          ) : null}
        </div>
      </div>

      {phone && hasCompare ? (
        <div
          className="fuel-portfolio-section-tabs"
          role="tablist"
          aria-label="Portfolio sections"
          style={{
            ["--fuel-page-bg" as string]: t.bg,
            background: t.panelAlt,
            border: `1px solid ${t.rule}`,
          }}
        >
          {(
            [
              { id: "companies" as const, label: "Companies", count: companies.length },
              { id: "compare" as const, label: "Compare", count: null },
            ] as const
          ).map((tab) => {
            const selected = phoneSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setPhoneSection(tab.id)}
                className={
                  selected
                    ? "fuel-portfolio-section-tabs__btn is-active"
                    : "fuel-portfolio-section-tabs__btn"
                }
                style={{
                  background: selected ? t.panel : "transparent",
                  color: selected ? t.ink : t.muted,
                  border: selected ? `1px solid ${t.rule}` : "1px solid transparent",
                  boxShadow: selected ? `0 1px 2px ${t.ink}14` : "none",
                  fontFamily: t.sans,
                }}
              >
                {tab.label}
                {tab.count != null ? (
                  <span
                    style={{
                      color: selected ? t.accent : t.mutedSoft,
                      fontFeatureSettings: '"tnum" 1',
                    }}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {showCompare ? (
        <PortfolioBenchmarksPanel
          t={t}
          watchlistId={watchlist.id}
          selectedMetricIds={watchlist.benchmarkMetricIds ?? null}
          canEdit={canEdit}
          signalSeries={signalSeries}
          signalCatalog={signalCatalog}
          companyCount={companies.length}
          benchmarks={benchmarks!}
          phone={phone}
        />
      ) : null}

      {showCompanies ? (
        companyList
      ) : null}

      {!phone && companies.length > 0 ? (
        <div className="fuel-data-table-frame fuel-table-wrap" style={dataTableFrameStyle(t)}>
          <table className="fuel-data-table" style={dataTableStyle()}>
            <thead>
              <tr>
                <th style={dataThStyle(t)}>Company</th>
                <th style={dataThStyle(t)}>Added</th>
                <th style={dataThStyle(t)}>Added by</th>
                <th style={dataThStyle(t, { align: "right" })}></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.companyUuid}>
                  <td style={dataTdStyle(t, { top: false })}>
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
                  <td style={dataTdStyle(t, { mono: true, top: false })}>
                    {relativeTime(c.addedAt)}
                  </td>
                  <td style={dataTdStyle(t, { top: false })}>
                    {c.addedByEmail === userEmail ? "you" : (c.addedByEmail ?? "—")}
                  </td>
                  <td style={dataTdActionsStyle(t)}>
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
      ) : null}
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

function PortfolioCompanyMobileRow({
  t,
  company: c,
  userEmail,
  canEdit,
  watchlistId,
  routeContext,
  onOpenOverview,
  onRemove,
}: {
  t: Theme;
  company: WatchlistCompany;
  userEmail: string;
  canEdit: boolean;
  watchlistId: string;
  routeContext: "portfolio" | "watchlist";
  onOpenOverview: () => void;
  onRemove: (fd: FormData) => void;
}) {
  const name = c.name ?? c.companyUuid.slice(0, 8);
  const logo = (
    <Logo
      t={t}
      co={{
        logo: (c.name ?? "??").slice(0, 2).toUpperCase(),
        name: c.name ?? undefined,
        uuid: c.companyUuid,
      }}
      size={32}
    />
  );

  const openControl =
    routeContext === "portfolio" ? (
      <CompanyOverviewTrigger
        t={t}
        onOpen={onOpenOverview}
        style={{ flex: 1, minWidth: 0, minHeight: TOUCH_TARGET_MIN }}
      >
        {logo}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 15,
              fontWeight: 650,
              color: t.ink,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </div>
          <div
            style={{
              marginTop: 2,
              fontFamily: t.sans,
              fontSize: 12,
              color: t.muted,
            }}
          >
            Added {relativeTime(c.addedAt) || "—"}
            {c.addedByEmail
              ? ` · ${c.addedByEmail === userEmail ? "you" : c.addedByEmail}`
              : ""}
          </div>
        </div>
        <span
          aria-hidden
          style={{
            color: t.mutedSoft,
            fontSize: 18,
            lineHeight: 1,
            flexShrink: 0,
            paddingInline: 4,
          }}
        >
          ›
        </span>
      </CompanyOverviewTrigger>
    ) : (
      <Link
        href={`/company/${c.companyUuid}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: t.ink,
          textDecoration: "none",
          minWidth: 0,
          flex: 1,
          minHeight: TOUCH_TARGET_MIN,
        }}
      >
        {logo}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 15,
              fontWeight: 650,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </div>
          <div
            style={{
              marginTop: 2,
              fontFamily: t.sans,
              fontSize: 12,
              color: t.muted,
            }}
          >
            Added {relativeTime(c.addedAt) || "—"}
          </div>
        </div>
        <span
          aria-hidden
          style={{ color: t.mutedSoft, fontSize: 18, lineHeight: 1, flexShrink: 0 }}
        >
          ›
        </span>
      </Link>
    );

  return (
    <article
      className="fuel-portfolio-company-card"
      style={{
        ...framedPanelPadStyle(t, { padding: "12px 14px" }),
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {openControl}
      {canEdit ? (
        <form action={onRemove} style={{ display: "inline-flex", flexShrink: 0 }}>
          <input type="hidden" name="watchlistId" value={watchlistId} />
          <input type="hidden" name="companyUuid" value={c.companyUuid} />
          <button
            type="submit"
            aria-label={`Remove ${name}`}
            title="Remove from list"
            style={{
              width: TOUCH_TARGET_MIN,
              height: TOUCH_TARGET_MIN,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 8,
              color: t.mutedSoft,
              cursor: "pointer",
              fontSize: 20,
              lineHeight: 1,
              fontFamily: t.sans,
            }}
          >
            ×
          </button>
        </form>
      ) : null}
    </article>
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
  phone = false,
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
  phone?: boolean;
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
  // Phone: one metric at a time — a full stack of ranked boards is noise.
  const [focusMetricId, setFocusMetricId] = useState<string | null>(null);

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

  const phoneFocusId =
    focusMetricId && activeSpecs.some((s) => s.metricId === focusMetricId)
      ? focusMetricId
      : (activeSpecs[0]?.metricId ?? null);
  const phoneSpecs = phone
    ? activeSpecs.filter((s) => s.metricId === phoneFocusId)
    : activeSpecs;

  const renderStrip = (spec: MetricSpec) => {
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
        phone={phone}
      />
    );
  };

  return (
    <div
      style={{
        marginBottom: phone ? 16 : 24,
        padding: phone ? 16 : 20,
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: phone ? 14 : 0,
      }}
    >
        {phone && configuring ? null : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 6,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {!phone ? (
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
            ) : null}
            <div
              style={{
                fontFamily: t.sans,
                fontSize: phone ? 20 : 18,
                fontWeight: 700,
                color: t.ink,
                marginTop: phone ? 0 : 4,
                letterSpacing: "-0.02em",
              }}
            >
              {phone ? "This fund vs similar companies" : "How the portfolio stacks up"}
            </div>
            <div
              style={{
                fontFamily: t.sans,
                fontSize: phone ? 13 : 12,
                color: t.muted,
                marginTop: 4,
                lineHeight: 1.45,
              }}
            >
              {phone
                ? "Green is ahead of the peer group; amber is behind."
                : "Each company shows how it sits versus the cohort mid-point. Each dot is one company; the band is the cohort range. Hover dots for details."}
              {companyCount > withData.length && signalSeries.length > 0
                ? phone
                  ? " Some companies have no reading."
                  : ` Some companies are missing data on one or more selected signals.`
                : ""}
            </div>
          </div>
          {phone ? null : (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 8,
                alignItems: "center",
              }}
            >
              <PortfolioCohortPicker
                t={t}
                current={benchmarks.cohortKey}
                cohorts={benchmarks.allCohorts}
              />
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
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  {configuring ? "Done" : "Configure metrics"}
                </button>
              ) : null}
            </div>
          )}
        </div>
        )}
        {phone && !configuring ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              marginBottom: 4,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                minWidth: 0,
                flex: 1,
              }}
            >
              {(() => {
                const current = benchmarks.allCohorts.find(
                  (c) => c.cohortKey === benchmarks.cohortKey,
                );
                return current ? (
                  <Chip t={t} tone="ghost">
                    {formatCohortLabel(current)}
                  </Chip>
                ) : null;
              })()}
              {phoneFocusId ? (
                <Chip t={t} tone="accent">
                  {activeSpecs.find((s) => s.metricId === phoneFocusId)?.label ?? "Metric"}
                </Chip>
              ) : null}
            </div>
            <PageToolbar
              t={t}
              filter={
                <FilterMenu
                  t={t}
                  label="Compare"
                  activeCount={
                    phoneFocusId && phoneFocusId !== activeSpecs[0]?.metricId ? 1 : 0
                  }
                  onClear={() => {
                    const first = activeSpecs[0]?.metricId ?? null;
                    if (first) setFocusMetricId(first);
                  }}
                >
                  {benchmarks.allCohorts.length > 0 ? (
                    <FilterGroup t={t} title="Peer group">
                        {benchmarks.allCohorts.map((c) => (
                          <FilterOption
                            key={c.cohortKey}
                            t={t}
                            selected={c.cohortKey === (benchmarks.cohortKey ?? c.cohortKey)}
                            onSelect={() => {
                              const url = new URL(window.location.href);
                              url.searchParams.set("cohort", c.cohortKey);
                              window.location.href = url.toString();
                            }}
                            trailing={c.sampleSize ?? undefined}
                          >
                            {formatCohortLabel(c)}
                          </FilterOption>
                        ))}
                    </FilterGroup>
                  ) : null}
                  {activeSpecs.length > 0 ? (
                    <FilterGroup t={t} title="Metric">
                        {activeSpecs.map((spec) => (
                          <FilterOption
                            key={spec.metricId}
                            t={t}
                            selected={spec.metricId === phoneFocusId}
                            onSelect={() => setFocusMetricId(spec.metricId)}
                            trailing={seriesBySignal.get(spec.metricId)?.points.length ?? 0}
                          >
                            {spec.label}
                          </FilterOption>
                        ))}
                    </FilterGroup>
                  ) : null}
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setConfiguring((v) => !v)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: t.accent,
                        cursor: "pointer",
                        fontFamily: t.sans,
                        fontSize: 14,
                        fontWeight: 650,
                        minHeight: TOUCH_TARGET_MIN,
                        padding: "4px 0",
                        textAlign: "left",
                      }}
                    >
                      {configuring ? "Done editing metrics" : "Choose which metrics appear"}
                    </button>
                  ) : null}
                </FilterMenu>
              }
            />
          </div>
        ) : null}

      {configuring && canEdit ? (
        <BenchmarkMetricPicker
          t={t}
          watchlistId={watchlistId}
          selectedMetricIds={selectedMetricIds}
          signalCatalog={signalCatalog}
          phone={phone}
          onClose={() => setConfiguring(false)}
        />
      ) : null}

      {phone && configuring ? null : activeSpecs.length === 0 ? (
        <div style={{ marginTop: 14, fontFamily: t.sans, fontSize: 12.5, color: t.muted }}>
          No metrics selected for this portfolio.
          {canEdit
            ? phone
              ? " Open the filter to choose metrics."
              : " Click “Configure metrics” above to pick a set."
            : ""}
        </div>
      ) : (
        <>
          <PortfolioScorecard t={t} summary={summary} phone={phone} />


          <div
            style={{
              marginTop: phone ? 14 : 16,
              display: "grid",
              gridTemplateColumns: phone
                ? "minmax(0, 1fr)"
                : "repeat(auto-fill, minmax(min(100%, 360px), 1fr))",
              gap: phone ? 0 : 18,
            }}
          >
            {(phone ? phoneSpecs : activeSpecs).map(renderStrip)}
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

function prettySignalCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Choose which metrics appear on Compare. Phone uses a short list of
 * tap-rows; desktop keeps grouped chips. Selection is posted to the
 * watchlist on Save.
 */
function BenchmarkMetricPicker({
  t,
  watchlistId,
  selectedMetricIds,
  signalCatalog,
  phone = false,
  onClose,
}: {
  t: Theme;
  watchlistId: string;
  selectedMetricIds: string[] | null;
  signalCatalog: PortfolioSignalCatalogEntry[];
  phone?: boolean;
  onClose?: () => void;
}) {
  const defaultIds = PORTFOLIO_METRICS.map((m) => m.metricId);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => {
    const ids = selectedMetricIds ?? defaultIds;
    return new Set(ids);
  });
  const q = query.trim().toLowerCase();

  const groupedCatalog = useMemo(() => {
    const byGroup = new Map<string, PortfolioSignalCatalogEntry[]>();
    for (const s of signalCatalog) {
      if (q && !s.label.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) {
        continue;
      }
      const arr = byGroup.get(s.category) ?? [];
      arr.push(s);
      byGroup.set(s.category, arr);
    }
    return Array.from(byGroup.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [signalCatalog, q]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveMetrics = async (fd: FormData) => {
    const mod = await import("@/app/(app)/portfolio/actions");
    await mod.setBenchmarkMetricsAction(fd);
    onClose?.();
  };

  return (
    <div
      style={
        phone
          ? framedPanelPadStyle(t, { marginTop: 12, padding: 14 })
          : {
              marginTop: 12,
              padding: 12,
              background: t.panelAlt,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
            }
      }
    >
      <form
        action={saveMetrics}
        style={{ display: "flex", flexDirection: "column", gap: phone ? 12 : 10 }}
      >
        <input type="hidden" name="id" value={watchlistId} />
        {Array.from(selected).map((id) => (
          <input key={id} type="hidden" name="metricId" value={id} />
        ))}

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: t.sans,
              fontSize: phone ? 16 : 13,
              fontWeight: 700,
              color: t.ink,
            }}
          >
            Metrics to compare
          </div>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 12,
              color: t.muted,
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {selected.size} selected
          </div>
        </div>

        {phone ? (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search metrics"
            aria-label="Search metrics"
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: TOUCH_TARGET_MIN,
              padding: "10px 12px",
              border: `1px solid ${t.rule}`,
              borderRadius: 10,
              background: t.bg,
              color: t.ink,
              fontFamily: t.sans,
              fontSize: 16,
            }}
          />
        ) : (
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
            Choose which metrics appear on this fund.
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: phone ? 14 : 8,
            maxHeight: phone ? 420 : 360,
            overflowY: "auto",
            paddingRight: 4,
            marginInline: phone ? -4 : 0,
          }}
        >
          {groupedCatalog.length === 0 ? (
            <div
              style={{
                padding: "20px 8px",
                textAlign: "center",
                fontFamily: t.sans,
                fontSize: 13,
                color: t.mutedSoft,
              }}
            >
              No metrics match
            </div>
          ) : (
            groupedCatalog.map(([category, sigs]) => {
              const sortedSigs = [...sigs].sort((a, b) => {
                const aOn = selected.has(a.id);
                const bOn = selected.has(b.id);
                if (aOn !== bOn) return aOn ? -1 : 1;
                const aDefault = PORTFOLIO_METRICS.some((m) => m.metricId === a.id);
                const bDefault = PORTFOLIO_METRICS.some((m) => m.metricId === b.id);
                if (aDefault !== bDefault) return aDefault ? -1 : 1;
                return a.label.localeCompare(b.label);
              });
              return (
                <div key={category}>
                  <div
                    style={{
                      fontFamily: t.sans,
                      fontSize: 11,
                      fontWeight: 650,
                      color: t.muted,
                      marginBottom: 6,
                      paddingLeft: phone ? 4 : 0,
                    }}
                  >
                    {prettySignalCategory(category)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: phone ? "column" : "row",
                      flexWrap: phone ? "nowrap" : "wrap",
                      gap: phone ? 6 : 6,
                    }}
                  >
                    {sortedSigs.map((sig) => {
                      const active = selected.has(sig.id);
                      return phone ? (
                        <button
                          key={sig.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggle(sig.id)}
                          style={{
                            alignItems: "center",
                            background: active ? t.accentTint : t.bg,
                            border: `1px solid ${active ? `${t.accent}66` : t.rule}`,
                            borderRadius: 10,
                            boxSizing: "border-box",
                            color: t.ink,
                            cursor: "pointer",
                            display: "flex",
                            fontFamily: t.sans,
                            fontSize: 14,
                            fontWeight: active ? 650 : 500,
                            gap: 10,
                            justifyContent: "space-between",
                            minHeight: TOUCH_TARGET_MIN,
                            padding: "8px 12px",
                            textAlign: "left",
                            width: "100%",
                          }}
                        >
                          <span style={{ minWidth: 0 }}>{sig.label}</span>
                          <span
                            aria-hidden
                            style={{
                              flexShrink: 0,
                              width: 18,
                              height: 18,
                              borderRadius: 999,
                              border: `1.5px solid ${active ? t.accent : t.rule}`,
                              background: active ? t.accent : "transparent",
                              boxSizing: "border-box",
                            }}
                          />
                        </button>
                      ) : (
                        <button
                          key={sig.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggle(sig.id)}
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
                            color: t.ink,
                            cursor: "pointer",
                          }}
                        >
                          {sig.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="submit"
            style={{
              ...ctaPrimaryStyle(t),
              padding: phone ? "12px 16px" : "6px 14px",
              minHeight: phone ? TOUCH_TARGET_MIN : undefined,
              flex: phone ? 1 : undefined,
              borderRadius: phone ? 10 : 6,
              fontFamily: t.sans,
              fontSize: phone ? 15 : 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>
          <button
            type="submit"
            formAction={async (fd) => {
              const mod = await import("@/app/(app)/portfolio/actions");
              fd.delete("metricId");
              await mod.setBenchmarkMetricsAction(fd);
              onClose?.();
            }}
            style={{
              ...ctaTertiaryStyle(t),
              padding: phone ? "12px 16px" : "6px 14px",
              minHeight: phone ? TOUCH_TARGET_MIN : undefined,
              borderRadius: phone ? 10 : 6,
              fontFamily: t.sans,
              fontSize: phone ? 15 : 12,
              cursor: "pointer",
            }}
          >
            Use defaults
          </button>
          {phone ? (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: t.muted,
                cursor: "pointer",
                fontFamily: t.sans,
                fontSize: 14,
                minHeight: TOUCH_TARGET_MIN,
                padding: "4px 0",
                width: "100%",
              }}
            >
              Cancel
            </button>
          ) : null}
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

function PortfolioScorecard({
  t,
  summary,
  phone = false,
}: {
  t: Theme;
  summary: PortfolioSummary;
  phone?: boolean;
}) {
  if (phone) {
    const cells: Array<{ label: string; value: string }> = [
      {
        label: "Beating peers",
        value: `${summary.metricsAboveCohortP50}/${summary.totalMetrics}`,
      },
      {
        label: "Strongest",
        value: summary.topPerformer?.name ?? "—",
      },
      {
        label: "Watch",
        value: String(summary.watchlist.count),
      },
    ];
    return (
      <div
        style={framedPanelStyle(t, {
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        })}
      >
        {cells.map((cell, i) => (
          <div
            key={cell.label}
            style={{
              padding: "12px 10px",
              borderLeft: i === 0 ? "none" : `1px solid ${t.ruleSoft}`,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontFamily: t.sans,
                fontSize: 11,
                fontWeight: 600,
                color: t.muted,
              }}
            >
              {cell.label}
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: t.sans,
                fontSize: 15,
                fontWeight: 700,
                color: t.ink,
                letterSpacing: "-0.02em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {cell.value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const cardStyle = (accentColor: string): CSSProperties => ({
    flex: 1,
    minWidth: 200,
    padding: "12px 14px",
    background: t.panelAlt,
    border: `1px solid ${t.rule}`,
    borderLeft: `2px solid ${accentColor}`,
    borderRadius: 8,
    boxSizing: "border-box",
  });
  return (
    <div
      style={{
        marginTop: 18,
        display: "flex",
        gap: 10,
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >
      <div className="fuel-accent-rail-card" style={cardStyle(t.accent)}>
        <div
          style={{
            fontFamily: t.mono,
            fontSize: 10,
            color: t.mutedSoft,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Above cohort p50
        </div>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 22,
            fontWeight: 700,
            color: t.ink,
            marginTop: 2,
          }}
        >
          {summary.metricsAboveCohortP50}/{summary.totalMetrics}
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
          metrics where the portfolio median beats the cohort
        </div>
      </div>
      <div className="fuel-accent-rail-card" style={cardStyle(t.warn)}>
        <div
          style={{
            fontFamily: t.mono,
            fontSize: 10,
            color: t.mutedSoft,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Top performer
        </div>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 18,
            fontWeight: 600,
            color: t.ink,
            marginTop: 2,
          }}
        >
          {summary.topPerformer ? summary.topPerformer.name : "—"}
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
          {summary.topPerformer
            ? `Leads on ${summary.topPerformer.metricCount} of ${summary.totalMetrics} metrics`
            : "No clear leader yet"}
        </div>
      </div>
      <div
        className="fuel-accent-rail-card"
        style={cardStyle(summary.watchlist.count > 0 ? t.warn : t.rule)}
      >
        <div
          style={{
            fontFamily: t.mono,
            fontSize: 10,
            color: t.mutedSoft,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          On watchlist
        </div>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 22,
            fontWeight: 700,
            color: t.ink,
            marginTop: 2,
          }}
        >
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

function formatCohortLabel(c: PortfolioBenchmarks["allCohorts"][number]): string {
  const d = c.dimensions;
  const parts: string[] = [];
  const pretty = (raw: string) =>
    raw
      .replace(/_/g, " ")
      .replace(/\bsaas\b/gi, "SaaS")
      .replace(/\bb2b\b/gi, "B2B")
      .replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
  const top = d.vertical || d.businessModel;
  if (top) parts.push(pretty(top));
  if (d.stage) parts.push(pretty(d.stage));
  if (d.geo) parts.push(d.geo.toUpperCase());
  return parts.join(" · ") || c.cohortKey;
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
  return (
    <label
      style={{
        display: "inline-flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        fontFamily: t.sans,
        fontSize: 11,
        color: t.muted,
        minWidth: 0,
      }}
    >
      Cohort
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
          borderRadius: 8,
          border: `1px solid ${t.rule}`,
          background: t.panelAlt,
          color: t.ink,
          fontFamily: t.sans,
          fontSize: 11,
          cursor: "pointer",
          maxWidth: 300,
          boxSizing: "border-box",
        }}
      >
        {cohorts.map((c) => (
          <option key={c.cohortKey} value={c.cohortKey}>
            {formatCohortLabel(c)}
            {c.sampleSize ? ` · ${c.sampleSize}` : ""}
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

/** Short, plain status for phone — no percentile jargon. */
const QUARTILE_PLAIN: Record<Quartile, string> = {
  leader: "Leading",
  above: "Strong",
  in: "On pace",
  below: "Behind",
  lagging: "Lagging",
  unknown: "No baseline",
};

function quartileTone(t: Theme, q: Quartile): string {
  switch (q) {
    case "leader":
    case "above":
      return t.accent;
    case "in":
      return t.muted;
    case "below":
      return t.warn;
    case "lagging":
      return t.warn;
    default:
      return t.mutedSoft;
  }
}

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

/**
 * Phone-first metric board: one clear hero (yours vs cohort) + a flat
 * ranked list. Replaces the desktop hover-dot strip on narrow viewports.
 */
function MobileMetricRanking({
  t,
  spec,
  bench,
  dots,
  flaggedCount,
  portfolioP50,
  widthPct,
}: {
  t: Theme;
  spec: MetricSpec;
  bench: PortfolioBenchmarks["rows"][number] | null;
  dots: Array<{
    companyUuid: string;
    name: string | null;
    value: number;
    quartile: Quartile;
  }>;
  flaggedCount: number;
  portfolioP50: number | null;
  widthPct: (v: number) => number;
}) {
  const inverted = bench?.invertedGood === true;
  const ranked = [...dots].sort((a, b) =>
    inverted ? a.value - b.value : b.value - a.value,
  );

  let vsCohort: string | null = null;
  let vsAhead = false;
  if (portfolioP50 != null && bench?.p50 != null && bench.p50 !== 0) {
    vsAhead = inverted
      ? portfolioP50 < bench.p50
      : portfolioP50 > bench.p50;
    const ratio = Math.abs(portfolioP50 / bench.p50);
    const pct = Math.abs((portfolioP50 - bench.p50) / bench.p50) * 100;
    if (pct < 2) {
      vsCohort = "About even with similar companies";
    } else if (ratio >= 1.5) {
      vsCohort = vsAhead
        ? `${ratio.toFixed(1)}× better than similar companies`
        : `${ratio.toFixed(1)}× behind similar companies`;
    } else {
      vsCohort = vsAhead
        ? `${pct.toFixed(0)}% better than similar companies`
        : `${pct.toFixed(0)}% behind similar companies`;
    }
  }

  const cohortMark =
    bench?.p50 != null ? Math.max(0, Math.min(100, widthPct(bench.p50))) : null;
  const yoursMark =
    portfolioP50 != null
      ? Math.max(0, Math.min(100, widthPct(portfolioP50)))
      : null;
  const bandStart =
    bench?.p25 != null ? Math.max(0, Math.min(100, widthPct(bench.p25))) : null;
  const bandEnd =
    bench?.p75 != null ? Math.max(0, Math.min(100, widthPct(bench.p75))) : null;
  const fundTone = vsCohort ? (vsAhead ? t.accent : t.warn) : t.ink;

  return (
    <div className="fuel-portfolio-metric-mobile" style={{ minWidth: 0 }}>
      {bench?.p50 != null && portfolioP50 != null ? (
        <div style={framedPanelPadStyle(t, { marginTop: 14 })}>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 15,
              fontWeight: 700,
              color: t.ink,
              letterSpacing: "-0.015em",
              marginBottom: 12,
            }}
          >
            {spec.label}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: t.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  color: fundTone,
                }}
              >
                This fund
              </div>
              <div
                style={{
                  fontFamily: t.mono,
                  fontSize: 22,
                  fontWeight: 700,
                  color: t.ink,
                  letterSpacing: "-0.03em",
                  fontFeatureSettings: '"tnum" 1',
                  lineHeight: 1.15,
                  marginTop: 4,
                }}
              >
                {fmtValue(portfolioP50, spec.unit)}
              </div>
            </div>
            <div style={{ minWidth: 0, textAlign: "right" }}>
              <div
                style={{
                  fontFamily: t.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  color: t.muted,
                }}
              >
                Peer median
              </div>
              <div
                style={{
                  fontFamily: t.mono,
                  fontSize: 22,
                  fontWeight: 700,
                  color: t.ink,
                  letterSpacing: "-0.03em",
                  fontFeatureSettings: '"tnum" 1',
                  lineHeight: 1.15,
                  marginTop: 4,
                }}
              >
                {fmtValue(bench.p50, spec.unit)}
              </div>
            </div>
          </div>

          <div
            style={{
              position: "relative",
              marginTop: 18,
              height: 28,
            }}
            aria-hidden
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 11,
                height: 6,
                borderRadius: 999,
                background: t.panelAlt,
                border: `1px solid ${t.ruleSoft}`,
              }}
            />
            {bandStart != null && bandEnd != null && bandEnd > bandStart ? (
              <div
                style={{
                  position: "absolute",
                  left: `${bandStart}%`,
                  width: `${bandEnd - bandStart}%`,
                  top: 11,
                  height: 6,
                  borderRadius: 999,
                  background: `${t.accent}33`,
                }}
              />
            ) : null}
            {ranked.map((row) => (
              <div
                key={row.companyUuid}
                title={row.name ?? undefined}
                style={{
                  position: "absolute",
                  left: `calc(${Math.max(0, Math.min(100, widthPct(row.value)))}% - 4px)`,
                  top: 10,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: quartileTone(t, row.quartile),
                  opacity: 0.55,
                  boxSizing: "border-box",
                }}
              />
            ))}
            {cohortMark != null ? (
              <div
                style={{
                  position: "absolute",
                  left: `calc(${cohortMark}% - 1px)`,
                  top: 4,
                  height: 20,
                  width: 2,
                  borderRadius: 1,
                  background: t.ink,
                  opacity: 0.45,
                }}
              />
            ) : null}
            {yoursMark != null ? (
              <div
                style={{
                  position: "absolute",
                  left: `calc(${yoursMark}% - 7px)`,
                  top: 6,
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: fundTone,
                  border: `2px solid ${t.panel}`,
                  boxSizing: "border-box",
                  zIndex: 1,
                }}
              />
            ) : null}
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: "6px 12px",
              fontFamily: t.sans,
              fontSize: 11,
              color: t.mutedSoft,
            }}
          >
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: fundTone,
                  marginRight: 5,
                  verticalAlign: "middle",
                }}
              />
              This fund
            </span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 6,
                  borderRadius: 2,
                  background: `${t.accent}55`,
                  marginRight: 5,
                  verticalAlign: "middle",
                }}
              />
              Typical peer range
            </span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 10,
                  background: t.ink,
                  opacity: 0.45,
                  marginRight: 5,
                  verticalAlign: "middle",
                }}
              />
              Peer median
            </span>
          </div>

          {vsCohort ? (
            <div
              style={{
                marginTop: 12,
                fontFamily: t.sans,
                fontSize: 14,
                fontWeight: 600,
                color: vsAhead ? t.accent : t.warn,
                letterSpacing: "-0.01em",
              }}
            >
              {vsCohort}
            </div>
          ) : null}
          {inverted ? (
            <div
              style={{
                marginTop: 4,
                fontFamily: t.sans,
                fontSize: 12,
                color: t.muted,
              }}
            >
              Lower is better for this metric
            </div>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 18,
            fontWeight: 700,
            color: t.ink,
            letterSpacing: "-0.02em",
          }}
        >
          {spec.label}
          {inverted ? (
            <span
              style={{
                display: "block",
                marginTop: 4,
                fontSize: 12,
                fontWeight: 500,
                color: t.muted,
              }}
            >
              Lower is better
            </span>
          ) : null}
        </div>
      )}

      <div
        style={{
          marginTop: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 13,
            fontWeight: 700,
            color: t.ink,
          }}
        >
          Companies
        </div>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            color: t.muted,
          }}
        >
          {ranked.length}
          {flaggedCount > 0 ? ` · ${flaggedCount} skipped` : ""}
        </div>
      </div>

      {ranked.length === 0 ? (
        <div
          style={{
            marginTop: 14,
            padding: "20px 8px",
            textAlign: "center",
            fontFamily: t.sans,
            fontSize: 13,
            color: t.mutedSoft,
          }}
        >
          No readings for this metric yet
        </div>
      ) : (
        <ol
          style={{
            listStyle: "none",
            margin: "10px 0 0",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {ranked.map((row, i) => {
            const tone = quartileTone(t, row.quartile);
            const status = QUARTILE_PLAIN[row.quartile];
            return (
              <li key={row.companyUuid}>
                <Link
                  href={`/company/${row.companyUuid}`}
                  style={{
                    ...framedPanelPadStyle(t, { padding: "12px 14px" }),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    textDecoration: "none",
                    color: "inherit",
                    minHeight: TOUCH_TARGET_MIN,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: t.mono,
                      fontSize: 12,
                      fontWeight: 700,
                      color: i === 0 ? t.bg : t.muted,
                      background: i === 0 ? t.accent : t.panelAlt,
                      fontFeatureSettings: '"tnum" 1',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontFamily: t.sans,
                        fontSize: 15,
                        fontWeight: 650,
                        color: t.ink,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.name ?? row.companyUuid.slice(0, 8)}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontFamily: t.sans,
                        fontSize: 12,
                        fontWeight: 600,
                        color: tone,
                      }}
                    >
                      {status}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: t.mono,
                      fontSize: 15,
                      fontWeight: 700,
                      color: t.ink,
                      flexShrink: 0,
                      fontFeatureSettings: '"tnum" 1',
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {fmtValue(row.value, spec.unit)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

    </div>
  );
}

function DistributionStrip({
  t,
  spec,
  bench,
  points,
  flaggedCount,
  phone = false,
}: {
  t: Theme;
  spec: MetricSpec;
  bench: PortfolioBenchmarks["rows"][number] | null;
  points: Array<{ companyUuid: string; name: string | null; value: number }>;
  flaggedCount: number;
  phone?: boolean;
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

  if (phone) {
    return (
      <MobileMetricRanking
        t={t}
        spec={spec}
        bench={bench}
        dots={dots}
        flaggedCount={flaggedCount}
        portfolioP50={portfolioP50}
        widthPct={width}
      />
    );
  }

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
