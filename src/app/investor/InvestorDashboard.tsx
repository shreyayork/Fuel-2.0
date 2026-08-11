import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../a11y/useDialogA11y";
import { drawerPanelPointerProps, useScrimPointerClose } from "../drawerScrim";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  INVESTOR_PIPELINE,
  INVESTOR_PORTFOLIO,
  INVESTOR_PORTFOLIO_LISTS,
  buildInitialPortfolioLists,
  normalizePortfolioListRow,
  INVESTOR_WATCHLISTS,
  PIPELINE_BOARDS,
  PIPELINE_STAGES,
  SUGGESTED_FOUNDERS,
  buildDemographicAllocation,
  buildInvestorFundSummary,
  buildCompanyLogoAssetUrl,
  companyLogoSlug,
  resolveCompanyLogoUrl,
  buildBenchmarkDotsForCompanies,
  buildPortfolioBenchmarkSummary,
  type BenchmarkCohortScale,
  buildPortfolioCompanyView,
  buildSectorAllocation,
  companiesForPortfolioList,
  dealsForBoard,
  formatGrowthRate,
  formatMoic,
  formatSuggestionScore,
  formatUsdCompact,
  stageDealTotal,
  summarizePipeline,
  type DemographicAllocationSlice,
  type InvestorCompanyRef,
  type PipelineBoardId,
  type PipelineDeal,
  type PipelineStage,
  type PortfolioBenchmarkDot,
  type PortfolioBenchmarkMetric,
  type PortfolioBenchmarkSummary,
  type PortfolioCompanyView,
  type PortfolioListDigest,
  type PortfolioListRow,
  type PortfolioListScope,
  PORTFOLIO_COHORT_STAGES,
  PORTFOLIO_LIST_LOGO_VISIBLE,
  buildPortfolioMeta,
  portfolioMetaDisplayTags,
  portfolioCompanyToChip,
  type PortfolioCohortStage,
  type QoqMovement,
  type SectorAllocationSlice,
  type SuggestedFounder,
  type WatchlistCompanyChip,
  type WatchlistRow,
  type WatchlistScope,
  type WatchlistEditDraft,
  WATCHLIST_TEAM_OPTIONS,
  WATCHLIST_VISIBILITY_OPTIONS,
  applyWatchlistEdit,
  buildWatchlistEditDraft,
  isWatchlistEditValid,
  watchlistAccessInitials,
  watchlistAccessName,
  watchlistEntryCount,
  watchlistOwnerDisplay,
  watchlistOwnerKindForScope,
  watchlistPreviewChips,
  watchlistTeamLabels,
  watchlistVisibilityCopy,
} from "./investorData.ts";
import "./investor.css";

export type InvestorDashboardSection = "home" | "portfolios" | "pipeline" | "watchlists";

const HUBSPOT_STORAGE_KEY = "fuel-investor-hubspot-connected";

function readHubspotConnected(initial?: boolean): boolean {
  if (initial) return true;
  try {
    return window.localStorage.getItem(HUBSPOT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeHubspotConnected(connected: boolean) {
  try {
    window.localStorage.setItem(HUBSPOT_STORAGE_KEY, connected ? "true" : "false");
  } catch { /* ignore */ }
}

function QoqArrow({ movement }: { movement: QoqMovement }) {
  const label = movement === "up" ? "Up" : movement === "down" ? "Down" : "Flat";
  const glyph = movement === "up" ? "↑" : movement === "down" ? "↓" : "→";
  return (
    <span
      className={`investor-qoq investor-qoq--${movement}`}
      title={`ARR growth QoQ: ${label}`}
      aria-label={`ARR growth QoQ: ${label}`}
    >
      <span aria-hidden="true">{glyph}</span>
      <em>{label}</em>
    </span>
  );
}

function greetingForHour(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function InvestorDashboard({
  fundName = "Your fund",
  section = "home",
  hubspotConnected: hubspotConnectedInitial = false,
  onOpenCompany,
  onOpenCompanyProfile,
  onOpenAccount,
  onNavigateSection,
}: {
  fundName?: string;
  section?: InvestorDashboardSection;
  hubspotConnected?: boolean;
  onOpenCompany: (company: InvestorCompanyRef) => void;
  onOpenCompanyProfile: (company: PortfolioCompanyView) => void;
  onOpenAccount?: () => void;
  onNavigateSection?: (section: Exclude<InvestorDashboardSection, "home">) => void;
}) {
  const [activeBoardId, setActiveBoardId] = useState<PipelineBoardId>("growth_fund");
  const [hubspotConnected, setHubspotConnected] = useState(() => readHubspotConnected(hubspotConnectedInitial));
  const [hubspotConnecting, setHubspotConnecting] = useState(false);
  const summary = useMemo(() => buildInvestorFundSummary(INVESTOR_PORTFOLIO), []);

  function connectHubSpot() {
    if (hubspotConnected || hubspotConnecting) return;
    setHubspotConnecting(true);
    window.setTimeout(() => {
      writeHubspotConnected(true);
      setHubspotConnected(true);
      setHubspotConnecting(false);
    }, 1400);
  }

  if (section === "home") {
    return (
      <HomeDashboard
        fundName={fundName}
        summary={summary}
        hubspotConnected={hubspotConnected}
        hubspotConnecting={hubspotConnecting}
        onConnectHubSpot={connectHubSpot}
        onOpenCompany={onOpenCompany}
        onOpenCompanyProfile={onOpenCompanyProfile}
        onOpenAccount={onOpenAccount}
        onNavigateSection={onNavigateSection}
      />
    );
  }

  const pageTitle = section === "portfolios"
    ? "Portfolios"
    : section === "pipeline"
      ? "Pipeline"
      : "Watchlists";
  const pageLede = section === "portfolios"
    ? "Companies in your funds, tracked per-fund with signal digests"
    : section === "pipeline"
      ? hubspotConnected
        ? "Live deal stages synced from HubSpot."
        : "Connect HubSpot to sync deal stages and track your pipeline."
      : "Curated company lists for markets, competitors, and deal flow";
  const hideShellHeader = section === "portfolios"
    || section === "watchlists"
    || (section === "pipeline" && hubspotConnected);

  return (
    <section className="investor-dashboard overview-tour-page">
      {!hideShellHeader ? (
        <header className="investor-dashboard-head">
          <div>
            <span className="investor-dashboard-eyebrow">Investor workspace</span>
            <h1>{pageTitle}</h1>
            <p>{pageLede}</p>
          </div>
          <button type="button" className="investor-dashboard-account-btn" onClick={onOpenAccount}>
            Account settings
          </button>
        </header>
      ) : null}

      {section === "portfolios" ? (
        <PortfoliosPage
          onOpenCompany={onOpenCompany}
          onOpenCompanyProfile={onOpenCompanyProfile}
        />
      ) : null}

      {section === "watchlists" ? (
        <WatchlistsPage onOpenCompany={onOpenCompany} />
      ) : null}

      {section === "pipeline" ? (
        hubspotConnected ? (
          <DealPipelineSection
            activeBoardId={activeBoardId}
            setActiveBoardId={setActiveBoardId}
            onOpenCompany={onOpenCompany}
          />
        ) : (
          <article className="overview-panel investor-home-widget investor-home-widget-wide">
            <HubSpotConnectPrompt
              connecting={hubspotConnecting}
              onConnect={connectHubSpot}
            />
          </article>
        )
      ) : null}
    </section>
  );
}

function HomeDashboard({
  fundName,
  summary,
  hubspotConnected,
  hubspotConnecting,
  onConnectHubSpot,
  onOpenCompany,
  onOpenCompanyProfile,
  onOpenAccount,
  onNavigateSection,
}: {
  fundName: string;
  summary: ReturnType<typeof buildInvestorFundSummary>;
  hubspotConnected: boolean;
  hubspotConnecting: boolean;
  onConnectHubSpot: () => void;
  onOpenCompany: (company: InvestorCompanyRef) => void;
  onOpenCompanyProfile: (company: PortfolioCompanyView) => void;
  onOpenAccount?: () => void;
  onNavigateSection?: (section: Exclude<InvestorDashboardSection, "home">) => void;
}) {
  const { totals, ranked, flagged } = summary;
  const [homeWatchlistIds, setHomeWatchlistIds] = useState<string[]>([]);
  const [homeHiddenIds, setHomeHiddenIds] = useState<string[]>([]);
  const topSuggestions = useMemo(
    () => [...SUGGESTED_FOUNDERS]
      .filter(company => !homeHiddenIds.includes(company.id))
      .sort((left, right) => right.matchScore - left.matchScore)
      .slice(0, 2),
    [homeHiddenIds],
  );
  const sectorAllocation = useMemo(() => buildSectorAllocation(INVESTOR_PORTFOLIO), []);
  const demographicAllocation = useMemo(() => buildDemographicAllocation(INVESTOR_PORTFOLIO), []);
  const homePipelineDeals = useMemo(() => dealsForBoard("growth_fund"), []);

  return (
    <section className="investor-dashboard investor-home overview-fund-page">
      <header className="investor-home-head investor-home-head--enhanced">
        <div>
          <span className="investor-dashboard-eyebrow">Investor workspace</span>
          <h1>{greetingForHour()}, {fundName}</h1>
          <p>Pulse of your fund — portfolio health, pipeline, and thesis matches in one view.</p>
        </div>
        <button type="button" className="investor-dashboard-account-btn" onClick={onOpenAccount}>
          Account settings
        </button>
      </header>

      <div className="investor-home-pulse" role="group" aria-label="Fund pulse">
        <div className="investor-home-pulse-stat">
          <span>Portfolio MOIC</span>
          <strong>{formatMoic(totals.blendedMoic)}</strong>
        </div>
        <div className="investor-home-pulse-stat">
          <span>Active companies</span>
          <strong>{totals.activeCompanies}</strong>
        </div>
        <div className="investor-home-pulse-stat">
          <span>Needs attention</span>
          <strong className={totals.redFlagCompanies > 0 ? "is-flagged" : undefined}>
            {totals.redFlagCompanies}
          </strong>
        </div>
        <div className="investor-home-pulse-stat">
          <span>Estimated value</span>
          <strong>{formatUsdCompact(totals.estimatedValue)}</strong>
        </div>
      </div>

      <div className="investor-home-kpis overview-metric-grid" role="group" aria-label="Fund snapshot">
        <button type="button" className="investor-home-kpi overview-metric-card" onClick={() => onNavigateSection?.("portfolios")}>
          <span>Total invested</span>
          <strong>{formatUsdCompact(totals.totalInvested)}</strong>
        </button>
        <button type="button" className="investor-home-kpi overview-metric-card" onClick={() => onNavigateSection?.("portfolios")}>
          <span>Estimated value</span>
          <strong>{formatUsdCompact(totals.estimatedValue)}</strong>
        </button>
        <button type="button" className="investor-home-kpi overview-metric-card" onClick={() => onNavigateSection?.("portfolios")}>
          <span>Blended MOIC</span>
          <strong>{formatMoic(totals.blendedMoic)}</strong>
        </button>
        <button
          type="button"
          className={`investor-home-kpi overview-metric-card${totals.redFlagCompanies > 0 ? " is-flagged" : ""}`}
          onClick={() => onNavigateSection?.("portfolios")}
        >
          <span>Red flags</span>
          <strong>{totals.redFlagCompanies}</strong>
          <em>{totals.activeCompanies} active companies</em>
        </button>
      </div>

      <article className="overview-panel investor-home-widget investor-home-widget-wide investor-portfolio-panel">
        <div className="overview-panel-head investor-home-widget-head investor-portfolio-panel-head">
          <div>
            <span>Portfolio</span>
            <em>{ranked.length} companies · ranked by MOIC</em>
          </div>
          <SectionViewMore label="View all" onClick={() => onNavigateSection?.("portfolios")} />
        </div>
        <PortfolioCompaniesTable
          companies={ranked.slice(0, 5)}
          onOpenCompanyProfile={onOpenCompanyProfile}
          embedded
          compact
        />
      </article>

      <article className="overview-panel investor-home-widget investor-home-widget-wide">
        <div className="overview-panel-head investor-home-widget-head">
          <span>Thesis matches</span>
          <SectionViewMore label="View all" onClick={() => onNavigateSection?.("watchlists")} />
        </div>
        {topSuggestions.length === 0 ? (
          <p className="investor-home-empty">No thesis matches in this view.</p>
        ) : (
          <div className="investor-home-thesis-list">
            {topSuggestions.map(company => (
              <HomeThesisMatchRow
                key={company.id}
                company={company}
                onWatchlist={homeWatchlistIds.includes(company.id)}
                onOpen={() => onOpenCompany(company)}
                onAddToWatchlist={() => {
                  setHomeWatchlistIds(previous => (
                    previous.includes(company.id) ? previous : [...previous, company.id]
                  ));
                }}
                onNotInterested={() => {
                  setHomeHiddenIds(previous => (
                    previous.includes(company.id) ? previous : [...previous, company.id]
                  ));
                }}
              />
            ))}
          </div>
        )}
      </article>

      <div className="investor-home-grid">
        <article className="overview-panel investor-home-widget">
          <div className="overview-panel-head investor-home-widget-head">
            <span>Needs attention</span>
            <SectionViewMore label="View all" onClick={() => onNavigateSection?.("portfolios")} />
          </div>
          {flagged.length === 0 ? (
            <p className="investor-home-empty">No red flags right now.</p>
          ) : (
            <ul className="investor-home-attention-list">
              {flagged.slice(0, 3).map(company => {
                const email = company.founderEmail ?? `founders@${company.domain}`;
                const subject = encodeURIComponent(`${company.displayName} — checking in on ${company.urgentFlag?.label ?? "portfolio risk"}`);
                return (
                  <li key={company.id}>
                    <div className="investor-home-attention-row">
                      <button
                        type="button"
                        className="investor-home-attention-main"
                        onClick={() => onOpenCompany(company)}
                      >
                        <span className="investor-urgent-dot" aria-hidden="true" />
                        <span>
                          <strong>{company.displayName}</strong>
                          <em>{company.urgentFlag?.label}</em>
                        </span>
                      </button>
                      <a
                        className="investor-home-attention-mail"
                        href={`mailto:${email}?subject=${subject}`}
                        title={`Email founder at ${email}`}
                        aria-label={`Email ${company.displayName} founder`}
                        onClick={event => event.stopPropagation()}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path
                            d="M2.5 4.25h11A1.25 1.25 0 0 1 14.75 5.5v6A1.25 1.25 0 0 1 13.5 12.75h-11A1.25 1.25 0 0 1 1.25 11.5v-6A1.25 1.25 0 0 1 2.5 4.25Z"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                          <path
                            d="m2 5.25 5.35 3.75a1.1 1.1 0 0 0 1.3 0L14 5.25"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="overview-panel investor-home-widget">
          <div className="overview-panel-head investor-home-widget-head">
            <span>Pipeline</span>
            {hubspotConnected ? (
              <SectionViewMore label="View all" onClick={() => onNavigateSection?.("pipeline")} />
            ) : null}
          </div>
          {hubspotConnected ? (
            <HomePipelinePulse
              deals={homePipelineDeals}
              onOpenCompany={onOpenCompany}
              onViewAll={() => onNavigateSection?.("pipeline")}
            />
          ) : (
            <HubSpotConnectPrompt connecting={hubspotConnecting} onConnect={onConnectHubSpot} compact />
          )}
        </article>
      </div>

      <div className="investor-home-grid">
        <article className="overview-panel investor-home-widget">
          <div className="overview-panel-head investor-home-widget-head">
            <span>Investment by sector</span>
            <SectionViewMore label="View all" onClick={() => onNavigateSection?.("portfolios")} />
          </div>
          <SectorAllocationChart slices={sectorAllocation} />
        </article>

        <article className="overview-panel investor-home-widget">
          <div className="overview-panel-head investor-home-widget-head">
            <span>Investment demographics</span>
            <SectionViewMore label="View all" onClick={() => onNavigateSection?.("portfolios")} />
          </div>
          <DemographicAllocationChart slices={demographicAllocation} />
        </article>
      </div>
    </section>
  );
}

function HomeThesisMatchRow({
  company,
  onWatchlist,
  onOpen,
  onAddToWatchlist,
  onNotInterested,
}: {
  company: SuggestedFounder;
  onWatchlist: boolean;
  onOpen: () => void;
  onAddToWatchlist: () => void;
  onNotInterested: () => void;
}) {
  return (
    <article className="investor-home-thesis-card">
      <button type="button" className="investor-home-thesis-identity" onClick={onOpen}>
        <span className="investor-company-logo" style={{ background: company.logoBg }}>
          {company.logo}
        </span>
        <span className="investor-home-thesis-identity-copy">
          <span className="investor-home-thesis-name-row">
            <strong>{company.displayName}</strong>
            <b>{formatSuggestionScore(company.matchScore)}</b>
          </span>
          <em>{company.stage} · {company.sector} · {company.geography}</em>
        </span>
      </button>

      <div className="investor-home-thesis-body">
        <p className="investor-home-thesis-why">
          <span>Why:</span> {company.matchReason}
        </p>
        <p className="investor-home-thesis-meta">{company.timing}</p>
      </div>

      <div className="investor-home-thesis-actions">
        <button
          type="button"
          className={`investor-suggested-primary${onWatchlist ? " is-done" : ""}`}
          onClick={onAddToWatchlist}
          disabled={onWatchlist}
        >
          {onWatchlist ? "On watchlist" : "Add to watchlist"}
        </button>
        <button type="button" className="investor-suggested-ghost" onClick={onNotInterested}>
          Not interested
        </button>
      </div>
    </article>
  );
}

function HomePipelinePulse({
  deals,
  onOpenCompany,
  onViewAll,
}: {
  deals: PipelineDeal[];
  onOpenCompany: (company: InvestorCompanyRef) => void;
  onViewAll: () => void;
}) {
  const stageStats = useMemo(
    () => PIPELINE_STAGES.map(stage => {
      const stageDeals = deals.filter(deal => deal.stage === stage.id);
      return {
        ...stage,
        deals: stageDeals,
        count: stageDeals.length,
        total: stageDealTotal(stageDeals),
      };
    }),
    [deals],
  );
  const firstWithDeals = stageStats.find(stage => stage.count > 0)?.id ?? PIPELINE_STAGES[0].id;
  const [selectedStage, setSelectedStage] = useState<PipelineStage>(firstWithDeals);
  const selected = stageStats.find(stage => stage.id === selectedStage) ?? stageStats[0];

  return (
    <div className="investor-home-pipeline-pulse">
      <label className="investor-home-pipeline-select">
        <span className="sr-only">Pipeline stage</span>
        <select
          value={selectedStage}
          onChange={event => setSelectedStage(event.target.value as PipelineStage)}
        >
          {stageStats.map(stage => (
            <option key={stage.id} value={stage.id}>
              {stage.label} ({stage.count}{stage.total ? ` · ${stage.total}` : ""})
            </option>
          ))}
        </select>
      </label>

      {selected.deals.length === 0 ? (
        <p className="investor-home-empty">No deals in this stage.</p>
      ) : (
        <div className="investor-home-pipeline-deals">
          {selected.deals.slice(0, 3).map(deal => (
            <button
              key={deal.id}
              type="button"
              className="investor-home-deal-row"
              onClick={() => openPipelineDeal(deal, onOpenCompany)}
            >
              <span>
                <strong>{deal.company}</strong>
                <em>{deal.amount}{deal.closeDate ? ` · Close ${deal.closeDate}` : ""}</em>
              </span>
              <b aria-hidden="true">→</b>
            </button>
          ))}
          {selected.deals.length > 3 ? (
            <button type="button" className="investor-section-view-more" onClick={onViewAll}>
              Open board <span aria-hidden="true">→</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function HubSpotConnectPrompt({
  connecting,
  onConnect,
  compact = false,
}: {
  connecting: boolean;
  onConnect: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`investor-hubspot-prompt${compact ? " is-compact" : ""}`}>
      <div className="investor-hubspot-prompt-mark" aria-hidden="true">HS</div>
      <div className="investor-hubspot-prompt-copy">
        <strong>Connect HubSpot to track your deals</strong>
        <p>
          Pull live stages — lead through close — into Fuel so your pipeline stays in sync with the CRM you already run.
        </p>
      </div>
      <button
        type="button"
        className="investor-suggested-primary investor-hubspot-connect-btn"
        onClick={onConnect}
        disabled={connecting}
      >
        {connecting ? "Connecting…" : "Connect HubSpot →"}
      </button>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function donutSlicePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0.01) return "";
  const large = sweep > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function SectorAllocationChart({ slices }: { slices: SectorAllocationSlice[] }) {
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.investedAmount, 0);
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 70;
  const innerR = 46;
  const gapDeg = slices.length > 1 ? 3.5 : 0;
  const available = 360 - gapDeg * slices.length;

  let cursor = 0;
  const arcs = slices.map(slice => {
    const sweep = slice.share * available;
    const start = cursor + gapDeg / 2;
    const end = start + sweep;
    cursor += sweep + gapDeg;
    return { ...slice, start, end, path: donutSlicePath(cx, cy, innerR, outerR, start, end) };
  });

  const active = arcs.find(slice => slice.sector === activeSector) ?? arcs[0] ?? null;
  const centerValue = active ? formatUsdCompact(active.investedAmount) : formatUsdCompact(total);
  const centerLabel = active ? active.sector : "Deployed";

  return (
    <div className="investor-sector-chart">
      <div
        className="investor-sector-donut-wrap"
        role="img"
        aria-label={
          slices.length
            ? `Investment by sector: ${slices.map(s => `${s.sector} ${Math.round(s.share * 100)}%`).join(", ")}`
            : "No sector allocation yet"
        }
        onMouseLeave={() => setActiveSector(null)}
      >
        <svg className="investor-sector-donut" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          <circle
            className="investor-sector-track"
            cx={cx}
            cy={cy}
            r={(outerR + innerR) / 2}
            fill="none"
            stroke="var(--panel-border)"
            strokeWidth={outerR - innerR + 4}
          />
          {arcs.map(slice => {
            const isActive = !activeSector || activeSector === slice.sector;
            return (
              <path
                key={slice.sector}
                className={`investor-sector-arc${activeSector === slice.sector ? " is-active" : ""}`}
                d={slice.path}
                fill={slice.color}
                opacity={isActive ? 1 : 0.28}
                onMouseEnter={() => setActiveSector(slice.sector)}
              >
                <title>{`${slice.sector}: ${formatUsdCompact(slice.investedAmount)} (${Math.round(slice.share * 100)}%)`}</title>
              </path>
            );
          })}
        </svg>
        <div className="investor-sector-donut-center" aria-hidden="true">
          <strong>{centerValue}</strong>
          <em>{centerLabel}</em>
          {!activeSector ? <span>{slices.length} sectors</span> : <span>{Math.round((active?.share ?? 0) * 100)}% of fund</span>}
        </div>
      </div>

      <ul className="investor-sector-legend">
        {arcs.map(slice => {
          const pct = Math.round(slice.share * 100);
          return (
            <li key={slice.sector}>
              <button
                type="button"
                className={`investor-sector-legend-row${activeSector === slice.sector ? " is-active" : ""}`}
                onMouseEnter={() => setActiveSector(slice.sector)}
                onFocus={() => setActiveSector(slice.sector)}
                onMouseLeave={() => setActiveSector(null)}
                onBlur={() => setActiveSector(null)}
              >
                <span className="investor-sector-swatch" style={{ background: slice.color }} aria-hidden="true" />
                <span className="investor-sector-legend-copy">
                  <span className="investor-sector-legend-top">
                    <strong>{slice.sector}</strong>
                    <b>{pct}%</b>
                  </span>
                  <em>{formatUsdCompact(slice.investedAmount)} invested</em>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DemographicAmountLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}) {
  const { x = 0, y = 0, height = 0, value } = props;
  if (value == null || value <= 0) return null;
  return (
    <text
      x={x + 10}
      y={y + height / 2}
      fill="var(--panel-strong)"
      fontSize={11}
      fontWeight={800}
      dominantBaseline="middle"
    >
      {formatUsdCompact(value)}
    </text>
  );
}

function DemographicPercentLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, value } = props;
  if (value == null) return null;
  return (
    <text
      x={x + width + 10}
      y={y + height / 2}
      fill="var(--panel-strong)"
      fontSize={13}
      fontWeight={800}
      dominantBaseline="middle"
    >
      {`${Math.round(value * 100)}%`}
    </text>
  );
}

function DemographicTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DemographicAllocationSlice & { amount: number; pct: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  return (
    <div className="investor-demo-tooltip">
      <strong>{slice.region}</strong>
      <em>{formatUsdCompact(slice.investedAmount)} invested · {Math.round(slice.share * 100)}%</em>
      <span>
        {slice.companyCount} compan{slice.companyCount === 1 ? "y" : "ies"}
      </span>
    </div>
  );
}

function DemographicAllocationChart({ slices }: { slices: DemographicAllocationSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.investedAmount, 0);
  const data = slices.map(slice => ({
    ...slice,
    amount: slice.investedAmount,
    pct: slice.share,
  }));
  const chartHeight = Math.max(200, slices.length * 56 + 48);

  return (
    <div
      className="investor-demo-chart"
      role="img"
      aria-label={
        slices.length
          ? `Investment by geography: ${slices.map(s => `${s.region} ${Math.round(s.share * 100)}%`).join(", ")}`
          : "No geographic allocation yet"
      }
    >
      <div className="investor-demo-summary">
        <strong>{formatUsdCompact(total)}</strong>
        <em>deployed across {slices.length} state{slices.length === 1 ? "" : "s"}</em>
      </div>

      <div className="investor-demo-col-labels" aria-hidden="true">
        <span>State / country</span>
        <span>Invested</span>
        <span>% of portfolio</span>
      </div>

      <div className="investor-demo-recharts" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 8, right: 56, left: 4, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid horizontal={false} stroke="var(--panel-border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatUsdCompact(value)}
              tick={{ fill: "var(--panel-muted)", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="region"
              width={118}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--panel-strong)", fontSize: 13, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
              content={<DemographicTooltip />}
            />
            <Bar dataKey="amount" radius={[0, 8, 8, 0]} maxBarSize={28} background={{ fill: "var(--panel-inset)", radius: [0, 8, 8, 0] }}>
              {data.map((slice, index) => (
                <Cell
                  key={slice.region}
                  fill={index === 0 ? "var(--status-good)" : slice.color}
                />
              ))}
              <LabelList dataKey="amount" content={<DemographicAmountLabel />} />
              <LabelList dataKey="pct" content={<DemographicPercentLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SectionViewMore({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="investor-section-view-more" onClick={onClick}>
      {label} <span aria-hidden="true">→</span>
    </button>
  );
}

function companyBenchmarkInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function benchmarkScoreTier(score: number): "strong" | "watch" | "concern" {
  if (score >= 55) return "strong";
  if (score >= 35) return "watch";
  return "concern";
}

type BenchmarkTier = "strong" | "watch" | "concern";

type BenchPositionRange = { start: number; end: number };

type BenchDrawerState = {
  metric: PortfolioBenchmarkMetric;
  tier?: BenchmarkTier;
  positionRange?: BenchPositionRange;
  highlightCompanyId?: string;
} | null;

function buildTierCounts(dots: PortfolioBenchmarkDot[]) {
  const counts = { strong: 0, watch: 0, concern: 0 };
  for (const dot of dots) {
    counts[benchmarkScoreTier(dot.score)] += 1;
  }
  return counts;
}

const BENCH_TRACK_INSET = 5;
const BENCH_LOGO_MIN_GAP = 2.35;
const BENCH_LOGO_MAX_LANES = 3;

/** Above this many companies the axis switches from per-logo plotting to a density histogram. */
const BENCH_LOGO_MODE_MAX = 80;
/** Between logo and density modes — tier-colored dots, no logos. */
const BENCH_DOT_MODE_MAX = 500;
const BENCH_DENSITY_BINS_MIN = 40;
const BENCH_DENSITY_BINS_MAX = 64;
/** Cap drawer rows so a 10k-company cohort still opens instantly. */
const BENCH_DRAWER_MAX_ROWS = 200;

type BenchmarkRenderMode = "logos" | "dots" | "density";

function benchmarkRenderMode(count: number): BenchmarkRenderMode {
  if (count <= BENCH_LOGO_MODE_MAX) return "logos";
  if (count <= BENCH_DOT_MODE_MAX) return "dots";
  return "density";
}

function benchmarkDensityBinCount(count: number): number {
  return Math.min(
    BENCH_DENSITY_BINS_MAX,
    Math.max(BENCH_DENSITY_BINS_MIN, Math.round(Math.sqrt(count))),
  );
}


function layoutBenchmarkLogoPositions(dots: PortfolioBenchmarkDot[]) {
  if (dots.length === 0) return { laneCount: 1, positions: [] };

  const trackSpan = 100 - BENCH_TRACK_INSET * 2;
  const maxLeft = 100 - BENCH_TRACK_INSET;
  const sorted = [...dots].sort((left, right) => left.position - right.position);
  const laneEnds = Array.from({ length: BENCH_LOGO_MAX_LANES }, () => BENCH_TRACK_INSET - BENCH_LOGO_MIN_GAP);

  const positions = sorted.map(dot => {
    const idealLeft = BENCH_TRACK_INSET + (dot.position / 100) * trackSpan;

    let bestLane = 0;
    let bestLeft = idealLeft;
    let bestCost = Number.POSITIVE_INFINITY;

    for (let lane = 0; lane < BENCH_LOGO_MAX_LANES; lane += 1) {
      const left = Math.max(idealLeft, laneEnds[lane] + BENCH_LOGO_MIN_GAP);
      const cost = Math.abs(left - idealLeft) + lane * 0.15;
      if (cost < bestCost) {
        bestCost = cost;
        bestLane = lane;
        bestLeft = left;
      }
    }

    laneEnds[bestLane] = Math.min(bestLeft, maxLeft);

    return {
      dot,
      tier: benchmarkScoreTier(dot.score),
      left: Math.min(bestLeft, maxLeft),
      lane: bestLane as 0 | 1 | 2,
    };
  });

  if (positions.length > 0 && positions[positions.length - 1].left > maxLeft) {
    positions[positions.length - 1].left = maxLeft;
    for (let index = positions.length - 2; index >= 0; index -= 1) {
      const next = positions[index + 1];
      const current = positions[index];
      if (next.left - current.left < BENCH_LOGO_MIN_GAP) {
        current.left = Math.max(BENCH_TRACK_INSET, next.left - BENCH_LOGO_MIN_GAP);
      }
    }
  }

  const laneCount = positions.reduce((max, item) => Math.max(max, item.lane + 1), 1);

  return {
    laneCount,
    positions: positions.map(({ dot, tier, left, lane }) => ({ dot, tier, left, lane })),
  };
}

type BenchmarkDensityBin = {
  index: number;
  start: number;
  end: number;
  count: number;
  strong: number;
  watch: number;
  concern: number;
  tier: BenchmarkTier;
};

function buildBenchmarkDensityBins(
  dots: PortfolioBenchmarkDot[],
  binCount = BENCH_DENSITY_BINS_MIN,
): { bins: BenchmarkDensityBin[]; peak: number; binCount: number } {
  const bins: BenchmarkDensityBin[] = Array.from({ length: binCount }, (_, index) => ({
    index,
    start: (index / binCount) * 100,
    end: ((index + 1) / binCount) * 100,
    count: 0,
    strong: 0,
    watch: 0,
    concern: 0,
    tier: "strong" as BenchmarkTier,
  }));

  for (const dot of dots) {
    const slot = Math.min(binCount - 1, Math.max(0, Math.floor((dot.position / 100) * binCount)));
    const bin = bins[slot]!;
    bin.count += 1;
    bin[benchmarkScoreTier(dot.score)] += 1;
  }

  let peak = 0;
  for (const bin of bins) {
    if (bin.count > peak) peak = bin.count;
    bin.tier = bin.strong >= bin.watch && bin.strong >= bin.concern
      ? "strong"
      : bin.watch >= bin.concern
        ? "watch"
        : "concern";
  }

  return { bins, peak: Math.max(1, peak), binCount };
}

function formatBenchmarkCount(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(value);
}

/**
 * Compact dot mode — 81–500 companies. Tier-colored dots without logos.
 */
type BenchmarkPercentileBucket = "p25" | "p50" | "p75" | "p100";

const BENCHMARK_PERCENTILE_BUCKETS: Array<{
  id: BenchmarkPercentileBucket;
  label: string;
  subtitle: string;
  start: number;
  end: number;
}> = [
  { id: "p25", label: "P25", subtitle: "Top quartile", start: 0, end: 25 },
  { id: "p50", label: "P50", subtitle: "Above median", start: 25, end: 50 },
  { id: "p75", label: "P75", subtitle: "Below median", start: 50, end: 75 },
  { id: "p100", label: "P100", subtitle: "Bottom quartile", start: 75, end: 100 },
];

function buildPercentileBucketCounts(dots: PortfolioBenchmarkDot[]): Record<BenchmarkPercentileBucket, number> {
  const counts: Record<BenchmarkPercentileBucket, number> = { p25: 0, p50: 0, p75: 0, p100: 0 };
  for (const dot of dots) {
    const position = dot.position;
    if (position < 25) counts.p25 += 1;
    else if (position < 50) counts.p50 += 1;
    else if (position < 75) counts.p75 += 1;
    else counts.p100 += 1;
  }
  return counts;
}

type PercentileCellSelection = {
  metricId: string;
  bucket: BenchmarkPercentileBucket;
};

function filterDotsForPercentileBucket(
  dots: PortfolioBenchmarkDot[],
  bucket: BenchmarkPercentileBucket,
): PortfolioBenchmarkDot[] {
  const range = BENCHMARK_PERCENTILE_BUCKETS.find(item => item.id === bucket);
  if (!range) return dots;
  return dots
    .filter(dot => dot.position >= range.start && dot.position < range.end)
    .sort((left, right) => left.position - right.position);
}

function BenchmarkPercentileBucketDetail({
  metric,
  bucket,
  listDots,
  companiesById,
  onClose,
  onOpenCompanyProfile,
}: {
  metric: PortfolioBenchmarkMetric;
  bucket: BenchmarkPercentileBucket;
  listDots: PortfolioBenchmarkDot[];
  companiesById: Map<string, PortfolioCompanyView>;
  onClose: () => void;
  onOpenCompanyProfile?: (company: PortfolioCompanyView) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const bucketMeta = BENCHMARK_PERCENTILE_BUCKETS.find(item => item.id === bucket)!;

  const bucketDots = useMemo(
    () => filterDotsForPercentileBucket(listDots, bucket),
    [listDots, bucket],
  );

  const filteredDots = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bucketDots;
    return bucketDots.filter(dot => {
      const company = companiesById.get(dot.id);
      const tier = benchmarkScoreTier(dot.score);
      const haystack = [
        dot.name,
        company?.displayName,
        company?.stage,
        company?.sector,
        company?.ownership,
        company?.arr,
        company?.runway,
        tier,
        company ? `${company.moic.toFixed(1)}x` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bucketDots, companiesById, query]);

  useEffect(() => {
    setQuery("");
  }, [metric.id, bucket]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (query.trim()) {
        setQuery("");
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, query]);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    searchRef.current?.focus({ preventScroll: true });
  }, [metric.id, bucket]);

  const hasActiveFilter = query.trim().length > 0;

  return (
    <div
      ref={panelRef}
      className={`investor-bench-percentile-detail is-${bucket}`}
      role="region"
      aria-label={`${metric.label} ${bucketMeta.label} portfolio companies`}
    >
      <header className="investor-bench-percentile-detail-head">
        <div className="investor-bench-percentile-detail-title">
          <span className={`investor-bench-percentile-dot is-${bucket}`} aria-hidden="true" />
          <div>
            <strong>{metric.label}</strong>
            <p>
              {bucketMeta.label} · {bucketMeta.subtitle}
              {" · "}
              {hasActiveFilter
                ? `${formatBenchmarkCount(filteredDots.length)} of ${formatBenchmarkCount(bucketDots.length)} companies`
                : `${formatBenchmarkCount(bucketDots.length)} portfolio ${bucketDots.length === 1 ? "company" : "companies"}`}
            </p>
          </div>
        </div>
        <div className="investor-bench-percentile-detail-actions">
          {bucketDots.length > 0 ? (
            <label className="investor-bench-percentile-detail-search">
              <span className="sr-only">Filter companies in {metric.label}</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    if (query.trim()) {
                      event.preventDefault();
                      setQuery("");
                    }
                  }
                }}
                placeholder="Filter by name, stage, tier…"
                aria-controls={`investor-bench-percentile-detail-table-${metric.id}-${bucket}`}
              />
              {hasActiveFilter ? (
                <button
                  type="button"
                  className="investor-bench-percentile-detail-search-clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear filter"
                >
                  ✕
                </button>
              ) : null}
            </label>
          ) : null}
          <button
            type="button"
            className="investor-bench-percentile-detail-close"
            onClick={onClose}
            aria-label={`Close ${metric.label} ${bucketMeta.label} list`}
          >
            ✕
          </button>
        </div>
      </header>

      <div className="investor-bench-percentile-detail-table-wrap">
        {bucketDots.length === 0 ? (
          <p className="investor-bench-percentile-detail-empty">No portfolio companies in this bucket.</p>
        ) : filteredDots.length === 0 ? (
          <p className="investor-bench-percentile-detail-empty">
            No companies match “{query.trim()}”.{" "}
            <button
              type="button"
              className="investor-bench-percentile-detail-empty-clear"
              onClick={() => setQuery("")}
            >
              Clear filter
            </button>
          </p>
        ) : (
          <table
            id={`investor-bench-percentile-detail-table-${metric.id}-${bucket}`}
            className="investor-bench-percentile-detail-table"
          >
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Company</th>
                <th scope="col">Stage</th>
                <th scope="col">MOIC</th>
                <th scope="col">ARR</th>
                <th scope="col">Runway</th>
                <th scope="col">Tier</th>
              </tr>
            </thead>
            <tbody>
              {filteredDots.map((dot, index) => {
                const tier = benchmarkScoreTier(dot.score);
                const company = companiesById.get(dot.id);
                return (
                  <tr key={dot.id} className={`investor-bench-percentile-detail-row is-${tier}`}>
                    <td className="investor-bench-percentile-detail-rank">{index + 1}</td>
                    <td className="investor-bench-percentile-detail-company">
                      {company && onOpenCompanyProfile ? (
                        <button
                          type="button"
                          className="investor-bench-percentile-detail-company-btn"
                          onClick={() => onOpenCompanyProfile(company)}
                          aria-label={`Open profile for ${dot.name}`}
                        >
                          {company ? (
                            <PortfolioCompanyLogo company={company} size="sm" />
                          ) : null}
                          <span>
                            <strong>{dot.name}</strong>
                            {company ? <em>{company.ownership} · {company.sector}</em> : null}
                          </span>
                        </button>
                      ) : (
                        <span className="investor-bench-percentile-detail-company-static">
                          <PortfolioCompanyLogo
                            company={company ?? {
                              displayName: dot.name,
                              logo: companyBenchmarkInitials(dot.name),
                              logoBg: dot.color,
                              domain: `${companyLogoSlug(dot.name).replace(/-/g, "")}.com`,
                              logoUrl: buildCompanyLogoAssetUrl(dot.name),
                            }}
                            size="sm"
                          />
                          <span>
                            <strong>{dot.name}</strong>
                            {company ? <em>{company.ownership} · {company.sector}</em> : null}
                          </span>
                        </span>
                      )}
                    </td>
                    <td>{company?.stage ?? "—"}</td>
                    <td>{company ? `${company.moic.toFixed(1)}x` : "—"}</td>
                    <td>{company?.arr ?? "—"}</td>
                    <td>{company?.runway ?? "—"}</td>
                    <td>
                      <span className={`investor-bench-percentile-detail-tier is-${tier}`}>{tier}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function BenchmarkPercentileDistribution({
  summary,
  portfolioDotsByMetricId,
  companiesById,
  onOpenCompanyProfile,
}: {
  summary: PortfolioBenchmarkSummary;
  portfolioDotsByMetricId: Map<string, PortfolioBenchmarkDot[]>;
  companiesById: Map<string, PortfolioCompanyView>;
  onOpenCompanyProfile?: (company: PortfolioCompanyView) => void;
}) {
  const [selectedCell, setSelectedCell] = useState<PercentileCellSelection | null>(null);
  const sampleSize = summary.metrics[0]?.sampleSize ?? 0;
  const metricCount = summary.metrics.length;

  const rows = useMemo(() => summary.metrics.map(metric => {
    const counts = buildPercentileBucketCounts(metric.dots);
    const peak = Math.max(1, ...Object.values(counts));
    return { metric, counts, peak };
  }), [summary.metrics]);

  const handleBucketToggle = useCallback((metric: PortfolioBenchmarkMetric, bucket: BenchmarkPercentileBucket) => {
    const count = buildPercentileBucketCounts(metric.dots)[bucket];
    if (count === 0) return;
    setSelectedCell(current => (
      current?.metricId === metric.id && current.bucket === bucket
        ? null
        : { metricId: metric.id, bucket }
    ));
  }, []);

  return (
    <article className="investor-bench-percentile-panel">
      <header className="investor-bench-percentile-head">
        <h3>Company distribution by percentile</h3>
        <p>
          {metricCount} key SaaS metrics · {formatBenchmarkCount(sampleSize)} companies · Grouped by percentile bucket
        </p>
      </header>

      <div className="investor-bench-percentile-table" role="table" aria-label="Company distribution by percentile">
        <div className="investor-bench-percentile-row investor-bench-percentile-row--head" role="row">
          <span role="columnheader" className="investor-bench-percentile-metric-col">Metric</span>
          {BENCHMARK_PERCENTILE_BUCKETS.map(bucket => (
            <span
              key={bucket.id}
              role="columnheader"
              className={`investor-bench-percentile-col investor-bench-percentile-col--${bucket.id}`}
            >
              <span className={`investor-bench-percentile-dot is-${bucket.id}`} aria-hidden="true" />
              <span className="investor-bench-percentile-col-label">
                <strong>{bucket.label}</strong>
                <em>{bucket.subtitle}</em>
              </span>
            </span>
          ))}
        </div>

        <div className="investor-bench-percentile-body" role="rowgroup">
          {rows.map(({ metric, counts, peak }) => {
            const isExpanded = selectedCell?.metricId === metric.id;
            const selectedBucket = isExpanded ? selectedCell?.bucket : null;
            const listDots = portfolioDotsByMetricId.get(metric.id) ?? [];

            return (
              <div
                key={metric.id}
                className={`investor-bench-percentile-metric-block${isExpanded ? " is-expanded" : ""}`}
              >
                <div className="investor-bench-percentile-row" role="row">
                  <span role="rowheader" className="investor-bench-percentile-metric-col">
                    <strong>{metric.label}</strong>
                    {metric.hint ? <em>{metric.hint}</em> : null}
                  </span>
                  {BENCHMARK_PERCENTILE_BUCKETS.map(bucket => {
                    const count = counts[bucket.id];
                    const pct = sampleSize > 0 ? Math.round((count / sampleSize) * 100) : 0;
                    const widthPct = count === 0 ? 0 : Math.max(22, Math.round((count / peak) * 100));
                    const isSelected = selectedBucket === bucket.id;
                    return (
                      <button
                        key={bucket.id}
                        type="button"
                        role="cell"
                        className={`investor-bench-percentile-bar is-${bucket.id}${count === 0 ? " is-empty" : ""}${isSelected ? " is-selected" : ""}`}
                        onClick={() => handleBucketToggle(metric, bucket.id)}
                        title={`${bucket.label} · ${count} companies (${pct}% of cohort)`}
                        aria-label={`${metric.label} ${bucket.label}: ${count} companies, ${pct} percent of cohort`}
                        aria-expanded={isSelected}
                      >
                        <span className="investor-bench-percentile-bar-track" aria-hidden="true">
                          {count > 0 ? (
                            <span
                              className="investor-bench-percentile-bar-fill"
                              style={{ width: `${widthPct}%` }}
                            >
                              <span className="investor-bench-percentile-bar-count">{count}</span>
                            </span>
                          ) : (
                            <span className="investor-bench-percentile-bar-zero" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {isExpanded && selectedBucket ? (
                  <BenchmarkPercentileBucketDetail
                    metric={metric}
                    bucket={selectedBucket}
                    listDots={listDots}
                    companiesById={companiesById}
                    onClose={() => setSelectedCell(null)}
                    onOpenCompanyProfile={onOpenCompanyProfile}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <footer className="investor-bench-percentile-legend" aria-label="Percentile legend">
        {BENCHMARK_PERCENTILE_BUCKETS.map(bucket => (
          <span key={bucket.id} className={`investor-bench-percentile-legend-item is-${bucket.id}`}>
            <span className={`investor-bench-percentile-dot is-${bucket.id}`} aria-hidden="true" />
            {bucket.label} · {bucket.subtitle}
          </span>
        ))}
      </footer>
    </article>
  );
}

function BenchmarkDotStrip({
  metric,
  onTierClick,
}: {
  metric: PortfolioBenchmarkMetric;
  onTierClick?: (tier: BenchmarkTier) => void;
}) {
  const positions = useMemo(() => {
    const trackSpan = 100 - BENCH_TRACK_INSET * 2;
    return metric.dots.map(dot => ({
      dot,
      tier: benchmarkScoreTier(dot.score),
      left: BENCH_TRACK_INSET + (dot.position / 100) * trackSpan,
    }));
  }, [metric.dots]);

  return (
    <div className="investor-bench-dot-strip">
      <div
        className="investor-bench-dot-strip-canvas"
        role="group"
        aria-label={`${metric.sampleSize} companies plotted as compact dots`}
      >
        {positions.map(({ dot, tier, left }) => (
          <button
            key={dot.id}
            type="button"
            className={`investor-bench-dot is-${tier}`}
            style={{ left: `${left}%` }}
            onClick={() => onTierClick?.(tier)}
            aria-label={`${dot.name} — ${benchmarkTierLabel(tier)}`}
            title={dot.name}
          />
        ))}
      </div>
      <p className="investor-bench-density-note">
        Compact view · {formatBenchmarkCount(metric.sampleSize)} dots · click a dot group via tier pills below.
      </p>
    </div>
  );
}

/** Bins for the large-cohort range area chart */
const BENCH_RANGE_BIN_COUNT = 24;

/**
 * Unified range chart for 10k / 100k — smooth area curve on a numeric axis with
 * compact tier summary (replaces the separate axis + bubble row).
 */
function BenchmarkRangeChart({
  metric,
  cohortBandLeft,
  cohortBandWidth,
  portfolioMarkerLeft,
  onBinClick,
  onTierClick,
}: {
  metric: PortfolioBenchmarkMetric;
  cohortBandLeft: number;
  cohortBandWidth: number;
  portfolioMarkerLeft: number;
  onBinClick?: (range: BenchPositionRange) => void;
  onTierClick?: (tier: BenchmarkTier) => void;
}) {
  const { bins, peak } = useMemo(
    () => buildBenchmarkDensityBins(metric.dots, BENCH_RANGE_BIN_COUNT),
    [metric.dots],
  );
  const tierCounts = useMemo(() => buildTierCounts(metric.dots), [metric.dots]);
  const tierSegments = useMemo(() => ([
    { tier: "strong" as BenchmarkTier, count: tierCounts.strong, label: "Strong" },
    { tier: "watch" as BenchmarkTier, count: tierCounts.watch, label: "Watch" },
    { tier: "concern" as BenchmarkTier, count: tierCounts.concern, label: "Concern" },
  ]).filter(segment => segment.count > 0), [tierCounts]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeBin = activeIndex === null ? null : bins[activeIndex] ?? null;
  const gradientId = `bench-range-fill-${metric.id}`;

  const mapX = useCallback(
    (position: number) => BENCH_TRACK_INSET + (position / 100) * (100 - BENCH_TRACK_INSET * 2),
    [],
  );

  const chartGeometry = useMemo(() => {
    const chartHeight = 44;
    const baseline = chartHeight;
    const points = bins.map(bin => {
      const x = mapX((bin.start + bin.end) / 2);
      const normalized = bin.count === 0 ? 0 : Math.sqrt(bin.count / peak);
      const y = bin.count === 0
        ? baseline
        : baseline - Math.max(4, normalized * (chartHeight - 8));
      return { x, y, bin };
    });

    if (points.length === 0) {
      return { chartHeight, baseline, points, linePath: "", areaPath: "" };
    }

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
    const areaPath = `${linePath} L ${mapX(100).toFixed(2)} ${baseline} L ${mapX(0).toFixed(2)} ${baseline} Z`;

    return { chartHeight, baseline, points, linePath, areaPath };
  }, [bins, mapX, peak]);

  return (
    <div className="investor-bench-range-chart">
      <div className="investor-bench-range-chart-limitations" aria-hidden="true">
        <span className="investor-bench-range-chart-limitations-label">Benchmark range</span>
        <div className="investor-bench-range-chart-limitations-track">
          <span
            className="investor-bench-range-chart-limitations-band"
            style={{ left: `${cohortBandLeft}%`, width: `${cohortBandWidth}%` }}
          />
        </div>
      </div>

      <div
        className="investor-bench-range-chart-canvas"
        onMouseLeave={() => setActiveIndex(null)}
      >
        <svg
          className="investor-bench-range-chart-svg"
          viewBox={`0 0 100 ${chartGeometry.chartHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--status-bad, #e05c5c)" stopOpacity="0.38" />
              <stop offset="48%" stopColor="var(--status-watch, #f5a623)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--status-good, #12b886)" stopOpacity="0.42" />
            </linearGradient>
          </defs>

          {chartGeometry.areaPath ? (
            <path className="investor-bench-range-chart-area" d={chartGeometry.areaPath} fill={`url(#${gradientId})`} />
          ) : null}
          {chartGeometry.linePath ? (
            <path className="investor-bench-range-chart-line" d={chartGeometry.linePath} />
          ) : null}

          <rect
            className="investor-bench-range-chart-band"
            x={cohortBandLeft}
            y={0}
            width={Math.max(1.5, cohortBandWidth)}
            height={chartGeometry.chartHeight}
            rx={1}
          />

          <line
            className="investor-bench-range-chart-portfolio-line"
            x1={portfolioMarkerLeft}
            x2={portfolioMarkerLeft}
            y1={0}
            y2={chartGeometry.chartHeight}
          />

          {activeBin ? (
            <line
              className="investor-bench-range-chart-hover-line"
              x1={mapX((activeBin.start + activeBin.end) / 2)}
              x2={mapX((activeBin.start + activeBin.end) / 2)}
              y1={0}
              y2={chartGeometry.chartHeight}
            />
          ) : null}
        </svg>

        <div className="investor-bench-range-chart-hitlayer" role="presentation">
          {bins.map((bin, index) => (
            <button
              key={bin.index}
              type="button"
              className={`investor-bench-range-chart-hit${activeIndex === index ? " is-active" : ""}`}
              style={{
                left: `${mapX(bin.start)}%`,
                width: `${Math.max(0.5, mapX(bin.end) - mapX(bin.start))}%`,
              }}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
              onClick={() => onBinClick?.({ start: bin.start, end: bin.end })}
              aria-label={`${formatBenchmarkCount(bin.count)} companies in this range`}
            />
          ))}
        </div>

        {activeBin ? (
          <div
            className={`investor-bench-range-chart-tip is-${activeBin.tier}`}
            style={{ left: `${mapX((activeBin.start + activeBin.end) / 2)}%` }}
            aria-hidden="true"
          >
            <strong>{formatBenchmarkCount(activeBin.count)}</strong>
            <span>companies</span>
          </div>
        ) : null}
      </div>

      <div className="investor-bench-range-chart-scale">
        <span style={{ left: `${BENCH_TRACK_INSET}%` }}>{metric.axisMinLabel}</span>
        <span style={{ left: "50%" }}>
          <em>P50</em>
          {metric.cohortP50Label}
        </span>
        <span className="is-portfolio" style={{ left: `${portfolioMarkerLeft}%` }}>
          <em>You</em>
          {metric.portfolioLabel}
        </span>
        <span style={{ left: `${100 - BENCH_TRACK_INSET}%` }}>{metric.axisMaxLabel}</span>
      </div>

      {tierSegments.length > 0 ? (
        <div className="investor-bench-range-tier-row" role="group" aria-label="Companies by tier">
          {tierSegments.map(segment => (
            <button
              key={segment.tier}
              type="button"
              className={`investor-bench-range-tier-chip is-${segment.tier}`}
              onClick={() => onTierClick?.(segment.tier)}
            >
              <span className="investor-bench-range-tier-chip-dot" aria-hidden="true" />
              {segment.label}
              <strong>{formatBenchmarkCount(segment.count)}</strong>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BenchmarkMetricCompaniesDrawer({
  metric,
  listDots,
  tierFilter,
  positionRange,
  highlightCompanyId,
  companiesById,
  onClose,
  onOpenCompanyProfile,
}: {
  metric: PortfolioBenchmarkMetric | null;
  listDots: PortfolioBenchmarkDot[];
  tierFilter?: BenchmarkTier;
  positionRange?: BenchPositionRange;
  highlightCompanyId?: string;
  companiesById: Map<string, PortfolioCompanyView>;
  onClose: () => void;
  onOpenCompanyProfile?: (company: PortfolioCompanyView) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const open = Boolean(metric);
  useDialogA11y(open, dialogRef, onClose);
  const handleScrimPointerDown = useScrimPointerClose(onClose, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open, tierFilter, positionRange, highlightCompanyId]);

  useEffect(() => {
    if (!open || !highlightCompanyId || !listRef.current) return;
    const row = listRef.current.querySelector(`[data-company-id="${highlightCompanyId}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, highlightCompanyId, listDots]);

  const sortedDots = useMemo(
    () => [...listDots].sort((left, right) => left.position - right.position),
    [listDots],
  );

  const tierFilteredDots = useMemo(() => {
    if (!tierFilter) return sortedDots;
    return sortedDots.filter(dot => benchmarkScoreTier(dot.score) === tierFilter);
  }, [sortedDots, tierFilter]);

  const rangeFilteredDots = useMemo(() => {
    if (!positionRange) return tierFilteredDots;
    return tierFilteredDots.filter(dot => (
      dot.position >= positionRange.start && dot.position < positionRange.end
    ));
  }, [tierFilteredDots, positionRange]);

  const filteredDots = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rangeFilteredDots;
    return rangeFilteredDots.filter(dot => dot.name.toLowerCase().includes(q));
  }, [query, rangeFilteredDots]);

  const visibleDots = useMemo(
    () => filteredDots.slice(0, BENCH_DRAWER_MAX_ROWS),
    [filteredDots],
  );
  const hiddenDotCount = filteredDots.length - visibleDots.length;

  if (!metric || !open) return null;

  const tierTitle = tierFilter
    ? `${tierFilter.charAt(0).toUpperCase()}${tierFilter.slice(1)}`
    : null;
  const rangeTitle = positionRange
    ? `${Math.round(positionRange.start)}–${Math.round(positionRange.end)}% of axis`
    : null;

  return createPortal(
    <div
      className="investor-bench-drawer-scrim profile-complete-drawer-scrim"
      onPointerDown={handleScrimPointerDown}
      role="presentation"
    >
      <aside
        ref={dialogRef}
        className="investor-bench-drawer profile-complete-drawer"
        {...drawerPanelPointerProps()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="investor-bench-drawer-title"
      >
        <header className="investor-bench-drawer-head">
          <div>
            <span className="investor-bench-drawer-eyebrow">Portfolio companies</span>
            <strong id="investor-bench-drawer-title">{metric.label}</strong>
            <p>
              {formatBenchmarkCount(filteredDots.length)} in this view
              {tierTitle ? ` · ${tierTitle}` : ""}
              {rangeTitle ? ` · ${rangeTitle}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="investor-company-drawer-close profile-complete-drawer-x"
            onClick={onClose}
            aria-label="Close company list"
            data-autofocus
          >
            ✕
          </button>
        </header>

        <label className="investor-bench-drawer-search">
          <span className="sr-only">Filter companies in {metric.label}</span>
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Filter companies…"
          />
        </label>

        <div className="investor-bench-drawer-list-wrap">
          <div className="investor-bench-drawer-list-head">
            <strong>
              {formatBenchmarkCount(filteredDots.length)} {filteredDots.length === 1 ? "company" : "companies"}
            </strong>
            {tierTitle ? (
              <span className={`investor-bench-drawer-tier-pill is-${tierFilter}`}>
                {tierTitle}
              </span>
            ) : null}
            {rangeTitle ? (
              <span className="investor-bench-drawer-range-pill">{rangeTitle}</span>
            ) : null}
          </div>

          <div ref={listRef} className="investor-bench-drawer-list" role="list">
            {filteredDots.length === 0 ? (
              <p className="investor-bench-drawer-empty">No companies match your filter.</p>
            ) : (
              visibleDots.map((dot, index) => {
                const tier = benchmarkScoreTier(dot.score);
                const company = companiesById.get(dot.id);
                const rowContent = (
                  <>
                    <span className="investor-bench-drawer-rank">{index + 1}</span>
                    {company ? (
                      <PortfolioCompanyLogo company={company} size="md" />
                    ) : (
                      <PortfolioCompanyLogo
                        company={{
                          displayName: dot.name,
                          logo: companyBenchmarkInitials(dot.name),
                          logoBg: dot.color,
                          domain: `${companyLogoSlug(dot.name).replace(/-/g, "")}.com`,
                          logoUrl: buildCompanyLogoAssetUrl(dot.name),
                        }}
                        size="md"
                      />
                    )}
                    <div className="investor-bench-drawer-copy">
                      <strong>{dot.name}</strong>
                      {company ? (
                        <em>{company.stage} · {company.ownership}</em>
                      ) : (
                        <em className={`investor-bench-drawer-tier is-${tier}`}>{tier}</em>
                      )}
                    </div>
                    <span className={`investor-bench-drawer-tier-pill is-${tier}`}>{tier}</span>
                    <span className="investor-bench-drawer-chevron" aria-hidden="true">→</span>
                  </>
                );

                if (company && onOpenCompanyProfile) {
                  return (
                    <button
                      key={dot.id}
                      type="button"
                      data-company-id={dot.id}
                      className={`investor-bench-drawer-row is-${tier}${highlightCompanyId === dot.id ? " is-highlighted" : ""}`}
                      role="listitem"
                      onClick={() => {
                        onOpenCompanyProfile(company);
                        onClose();
                      }}
                      aria-label={`Open ${dot.name}, ${tier}`}
                    >
                      {rowContent}
                    </button>
                  );
                }

                return (
                  <div
                    key={dot.id}
                    data-company-id={dot.id}
                    className={`investor-bench-drawer-row is-${tier}${highlightCompanyId === dot.id ? " is-highlighted" : ""}`}
                    role="listitem"
                  >
                    {rowContent}
                  </div>
                );
              })
            )}

            {hiddenDotCount > 0 ? (
              <p className="investor-bench-drawer-more">
                Showing first {BENCH_DRAWER_MAX_ROWS} of {formatBenchmarkCount(filteredDots.length)} —
                {" "}search to narrow the list.
              </p>
            ) : null}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

type BenchmarkHoverTipState = {
  company: PortfolioCompanyView;
  dot: PortfolioBenchmarkDot;
  tier: BenchmarkTier;
  anchor: DOMRect;
};

function benchmarkTierLabel(tier: BenchmarkTier): string {
  if (tier === "strong") return "Strong";
  if (tier === "watch") return "Watch";
  return "Concern";
}

function BenchmarkTierHoverTip({
  tip,
  metric,
  onDismiss,
  onKeepOpen,
  onOpenProfile,
}: {
  tip: BenchmarkHoverTipState;
  metric: PortfolioBenchmarkMetric;
  onDismiss: () => void;
  onKeepOpen: () => void;
  onOpenProfile?: (company: PortfolioCompanyView) => void;
}) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "above" | "below" }>(() => ({
    top: tip.anchor.top - 10,
    left: tip.anchor.left + tip.anchor.width / 2,
    placement: "above",
  }));

  useEffect(() => {
    const el = tipRef.current;
    if (!el) return;

    const pad = 10;
    const rect = el.getBoundingClientRect();
    const centerX = tip.anchor.left + tip.anchor.width / 2;
    let left = centerX - rect.width / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - rect.width - pad));

    let top = tip.anchor.top - rect.height - 10;
    let placement: "above" | "below" = "above";
    if (top < pad) {
      top = tip.anchor.bottom + 10;
      placement = "below";
    }

    setCoords({ top, left, placement });
  }, [tip]);

  useEffect(() => {
    const hide = () => onDismiss();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [onDismiss]);

  const growthLabel = formatGrowthRate(tip.company.arrGrowthQoQ);
  const growthClass = tip.company.qoqMovement === "up"
    ? "is-up"
    : tip.company.qoqMovement === "down"
      ? "is-down"
      : "is-flat";

  return createPortal(
    <div
      ref={tipRef}
      className={`investor-bench-tier-tip${coords.placement === "below" ? " is-below" : ""}`}
      style={{ top: coords.top, left: coords.left }}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onDismiss}
      role="tooltip"
    >
      <header className="investor-bench-tier-tip-head">
        <PortfolioCompanyLogo company={tip.company} size="md" />
        <div>
          <strong>{tip.company.displayName}</strong>
          <p>{tip.company.stage} · {tip.company.sector}</p>
        </div>
        <span className={`investor-bench-tier-tip-tier is-${tip.tier}`}>
          {benchmarkTierLabel(tip.tier)}
        </span>
      </header>

      <p className="investor-bench-tier-tip-metric">
        <em>{metric.label}</em>
        <span>{Math.round(tip.dot.position)}% vs cohort on this metric</span>
      </p>

      <div className="investor-bench-tier-tip-stats">
        <article>
          <span>ARR</span>
          <strong>{tip.company.arr}</strong>
        </article>
        <article>
          <span>Growth</span>
          <strong className={growthClass}>{growthLabel}</strong>
        </article>
        <article>
          <span>MOIC</span>
          <strong className={`investor-portfolio-moic-badge is-${moicTier(tip.company.moic)}`}>
            {formatMoic(tip.company.moic)}
          </strong>
        </article>
        <article>
          <span>Health</span>
          <strong className={`is-health-${tip.company.health}`}>{healthLabel(tip.company.health)}</strong>
        </article>
      </div>

      {onOpenProfile ? (
        <button
          type="button"
          className="investor-bench-tier-tip-action"
          onClick={() => onOpenProfile(tip.company)}
        >
          View Profile
        </button>
      ) : null}
    </div>,
    document.body,
  );
}

function PortfolioBenchmarkChart({
  metric,
  companiesById,
  onOpenCompanyProfile,
  onOpenCompanyList,
}: {
  metric: PortfolioBenchmarkMetric;
  companiesById: Map<string, PortfolioCompanyView>;
  onOpenCompanyProfile?: (company: PortfolioCompanyView) => void;
  onOpenCompanyList?: (opts: {
    tier?: BenchmarkTier;
    positionRange?: BenchPositionRange;
    companyId?: string;
  }) => void;
}) {
  const trendGlyph = metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→";
  const tierCounts = useMemo(() => buildTierCounts(metric.dots), [metric.dots]);
  const axisLowLabel = metric.lowerIsBetter ? "better" : "lower";
  const axisHighLabel = metric.lowerIsBetter ? "worse" : "higher";

  const tierSegments = useMemo(() => ([
    { tier: "strong" as BenchmarkTier, count: tierCounts.strong, label: "strong" },
    { tier: "watch" as BenchmarkTier, count: tierCounts.watch, label: "watch" },
    { tier: "concern" as BenchmarkTier, count: tierCounts.concern, label: "concern" },
  ]).filter(segment => segment.count > 0), [tierCounts]);

  const renderMode = benchmarkRenderMode(metric.dots.length);

  const tierLogoLayout = useMemo(
    () => (renderMode === "logos"
      ? layoutBenchmarkLogoPositions(metric.dots)
      : { laneCount: 1, positions: [] as ReturnType<typeof layoutBenchmarkLogoPositions>["positions"] }),
    [renderMode, metric.dots],
  );
  const tierLogoPositions = tierLogoLayout.positions;
  const logoLaneCount = tierLogoLayout.laneCount;

  const portfolioMarkerLeft = BENCH_TRACK_INSET + (metric.portfolioPosition / 100) * (100 - BENCH_TRACK_INSET * 2);
  const cohortBandLeft = BENCH_TRACK_INSET + (metric.bandStart / 100) * (100 - BENCH_TRACK_INSET * 2);
  const cohortBandWidth = ((metric.bandEnd - metric.bandStart) / 100) * (100 - BENCH_TRACK_INSET * 2);

  const [hoverTip, setHoverTip] = useState<BenchmarkHoverTipState | null>(null);
  const hideTipTimerRef = useRef<number | null>(null);

  const clearHideTipTimer = useCallback(() => {
    if (hideTipTimerRef.current !== null) {
      window.clearTimeout(hideTipTimerRef.current);
      hideTipTimerRef.current = null;
    }
  }, []);

  const showHoverTip = useCallback((
    company: PortfolioCompanyView,
    dot: PortfolioBenchmarkDot,
    tier: BenchmarkTier,
    target: HTMLElement,
  ) => {
    clearHideTipTimer();
    setHoverTip({ company, dot, tier, anchor: target.getBoundingClientRect() });
  }, [clearHideTipTimer]);

  const scheduleHideHoverTip = useCallback(() => {
    clearHideTipTimer();
    hideTipTimerRef.current = window.setTimeout(() => setHoverTip(null), 120);
  }, [clearHideTipTimer]);

  const dismissHoverTip = useCallback(() => {
    clearHideTipTimer();
    setHoverTip(null);
  }, [clearHideTipTimer]);

  useEffect(() => () => clearHideTipTimer(), [clearHideTipTimer]);

  return (
    <article className="investor-bench-card investor-bench-card--wide investor-bench-card--compact">
      <header className="investor-bench-card-top">
        <div className="investor-bench-card-title">
          <strong>
            {metric.label}{" "}
            <em className="investor-bench-n">n={metric.sampleSize}</em>
          </strong>
          {metric.hint ? <em className="investor-bench-hint">{metric.hint}</em> : null}
        </div>

        <div className="investor-bench-card-kpis">
          <article className="investor-bench-kpi">
            <span>cohort p50</span>
            <strong>{metric.cohortP50Label}</strong>
          </article>
          <article className="investor-bench-kpi investor-bench-kpi--portfolio">
            <span>portfolio</span>
            <strong>
              {metric.portfolioLabel}
              <i aria-hidden="true">{trendGlyph}</i>
            </strong>
          </article>
        </div>
      </header>

      <div className="investor-bench-card-body investor-bench-card-body--compact">
        <div className={`investor-bench-tier-wrap${renderMode === "density" ? " investor-bench-tier-wrap--range" : ""}`}>
          {renderMode !== "density" ? (
            <div className="investor-bench-scale-labels">
              <span>{axisLowLabel}</span>
              <span>{axisHighLabel}</span>
            </div>
          ) : null}
          <div className={`investor-bench-tier-track${renderMode === "density" ? " investor-bench-tier-track--range" : ""}`}>
            {renderMode === "density" ? (
              <BenchmarkRangeChart
                metric={metric}
                cohortBandLeft={cohortBandLeft}
                cohortBandWidth={Math.max(4, cohortBandWidth)}
                portfolioMarkerLeft={portfolioMarkerLeft}
                onBinClick={positionRange => onOpenCompanyList?.({ positionRange })}
                onTierClick={tier => onOpenCompanyList?.({ tier })}
              />
            ) : (
            <>
            <div className="investor-bench-range-chart-limitations" aria-hidden="true">
              <span className="investor-bench-range-chart-limitations-label">Benchmark range</span>
              <div className="investor-bench-range-chart-limitations-track">
                <span
                  className="investor-bench-range-chart-limitations-band"
                  style={{ left: `${cohortBandLeft}%`, width: `${Math.max(4, cohortBandWidth)}%` }}
                />
              </div>
            </div>

            <div
              className="investor-bench-tier-plot"
              role="img"
              aria-label={`Performance axis from ${axisLowLabel} to ${axisHighLabel}. Portfolio median at ${metric.portfolioLabel}.`}
            >
              <span
                className="investor-bench-tier-portfolio-mark investor-bench-tier-portfolio-mark--plot"
                style={{ left: `${portfolioMarkerLeft}%` }}
                title={`Portfolio median · ${metric.portfolioLabel}`}
                aria-hidden="true"
              />

            {renderMode === "dots" ? (
              <BenchmarkDotStrip
                metric={metric}
                onTierClick={tier => onOpenCompanyList?.({ tier })}
              />
            ) : (
              <div
                className="investor-bench-tier-logos"
                style={{ "--bench-logo-lanes": logoLaneCount } as React.CSSProperties}
                role="group"
                aria-label="Companies by performance tier"
              >
                {tierLogoPositions.map(({ dot, left, tier, lane }) => {
                  const company = companiesById.get(dot.id);
                  const label = company?.displayName ?? dot.name;
                  return (
                    <button
                      key={dot.id}
                      type="button"
                      className={`investor-bench-tier-logo is-${tier}`}
                      style={{ left: `${left}%`, "--lane": lane } as React.CSSProperties}
                      onMouseEnter={event => {
                        if (company) showHoverTip(company, dot, tier, event.currentTarget);
                      }}
                      onMouseLeave={scheduleHideHoverTip}
                      onFocus={event => {
                        if (company) showHoverTip(company, dot, tier, event.currentTarget);
                      }}
                      onBlur={scheduleHideHoverTip}
                      onClick={() => {
                        dismissHoverTip();
                        onOpenCompanyList?.({ companyId: dot.id });
                      }}
                      aria-label={`${label} — ${benchmarkTierLabel(tier)} on ${metric.label}`}
                    >
                      {company ? (
                        <PortfolioCompanyLogo company={company} size="xs" />
                      ) : (
                        <PortfolioCompanyLogo
                          company={{
                            displayName: dot.name,
                            logo: companyBenchmarkInitials(dot.name),
                            logoBg: dot.color,
                            domain: `${companyLogoSlug(dot.name).replace(/-/g, "")}.com`,
                            logoUrl: buildCompanyLogoAssetUrl(dot.name),
                          }}
                          size="xs"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            </div>

            {tierSegments.length > 0 ? (
              <div className="investor-bench-tier-pills investor-bench-tier-pills--track">
                {tierSegments.map(segment => (
                  <button
                    key={segment.tier}
                    type="button"
                    className={`is-${segment.tier}`}
                    onClick={() => onOpenCompanyList?.({ tier: segment.tier })}
                  >
                    {segment.label} · {segment.count}
                  </button>
                ))}
              </div>
            ) : null}
            </>
            )}
          </div>
        </div>
      </div>

      {hoverTip ? (
        <BenchmarkTierHoverTip
          tip={hoverTip}
          metric={metric}
          onDismiss={dismissHoverTip}
          onKeepOpen={clearHideTipTimer}
          onOpenProfile={onOpenCompanyProfile}
        />
      ) : null}
    </article>
  );
}

function BenchmarkSummaryTiles({
  summary,
  companies,
}: {
  summary: PortfolioBenchmarkSummary;
  companies: PortfolioCompanyView[];
}) {
  const metricTotal = summary.metrics.length;

  const aboveCohortP50Count = useMemo(
    () => summary.metrics.filter(metric => (
      metric.lowerIsBetter
        ? metric.portfolioPosition < 50
        : metric.portfolioPosition > 50
    )).length,
    [summary.metrics],
  );

  const topPerformerStats = useMemo(() => {
    const wins = new Map<string, number>();
    for (const metric of summary.metrics) {
      if (metric.dots.length === 0) continue;
      const leader = metric.dots.reduce((best, dot) => (
        dot.score > best.score ? dot : best
      ));
      wins.set(leader.id, (wins.get(leader.id) ?? 0) + 1);
    }

    let topId = "";
    let topWins = 0;
    for (const [id, count] of wins) {
      if (count > topWins) {
        topWins = count;
        topId = id;
      }
    }

    const topCompany = companies.find(company => company.id === topId);
    const fallbackDot = summary.metrics
      .flatMap(metric => metric.dots)
      .find(dot => dot.id === topId);
    const displayName = topCompany?.displayName ?? fallbackDot?.name ?? summary.topPerformer;
    const companyForLogo = topCompany ?? (fallbackDot ? {
      displayName,
      logo: displayName.slice(0, 1),
      logoBg: fallbackDot.color,
      domain: `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`,
      logoUrl: buildCompanyLogoAssetUrl(displayName),
    } : null);

    return {
      name: displayName,
      company: companyForLogo,
      wins: topWins,
      total: metricTotal,
    };
  }, [companies, summary.metrics, summary.topPerformer, metricTotal]);

  const watchlistStats = useMemo(() => {
    const scoresByCompany = new Map<string, number[]>();
    for (const metric of summary.metrics) {
      for (const dot of metric.dots) {
        const scores = scoresByCompany.get(dot.id) ?? [];
        scores.push(dot.score);
        scoresByCompany.set(dot.id, scores);
      }
    }

    const flagged = companies.filter(company => {
      if (company.health === "watch" || company.health === "struggling" || company.redFlags.length > 0) {
        return true;
      }
      const scores = scoresByCompany.get(company.id);
      if (!scores || scores.length === 0) return false;
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return benchmarkScoreTier(average) !== "strong";
    });

    const exampleCompanies = flagged.slice(0, 3);

    return {
      count: flagged.length,
      exampleCompanies,
    };
  }, [companies, summary.metrics]);

  return (
    <div className="investor-bench-tiles">
      <article className="investor-bench-kpi-card investor-bench-kpi-card--cohort">
        <span className="investor-bench-kpi-label">Above cohort P50</span>
        <strong className="investor-bench-kpi-value">
          {aboveCohortP50Count}
          <span className="investor-bench-kpi-denom">/{metricTotal}</span>
        </strong>
        <p>metrics where the portfolio median beats the cohort</p>
      </article>

      <article className="investor-bench-kpi-card investor-bench-kpi-card--performer">
        <span className="investor-bench-kpi-label">Top performer</span>
        <div className="investor-bench-kpi-performer">
          {topPerformerStats.company ? (
            <PortfolioCompanyLogo company={topPerformerStats.company} size="md" />
          ) : (
            <span className="investor-bench-kpi-performer-fallback" aria-hidden="true">
              {topPerformerStats.name.slice(0, 1)}
            </span>
          )}
          <strong className="investor-bench-kpi-value is-name">{topPerformerStats.name}</strong>
        </div>
        <p>
          Leads on {topPerformerStats.wins} of {topPerformerStats.total} metric
          {topPerformerStats.total === 1 ? "" : "s"}
        </p>
      </article>

      <article className="investor-bench-kpi-card investor-bench-kpi-card--watchlist">
        <span className="investor-bench-kpi-label">
          On <em>watchlist</em>
        </span>
        <strong className="investor-bench-kpi-value">{watchlistStats.count}</strong>
        {watchlistStats.exampleCompanies.length > 0 ? (
          <div className="investor-bench-kpi-examples">
            <span className="investor-bench-kpi-examples-label">e.g.</span>
            <span
              className="investor-watchlists-logo-stack investor-bench-kpi-logo-stack"
              aria-label={watchlistStats.exampleCompanies.map(company => company.displayName).join(", ")}
            >
              {watchlistStats.exampleCompanies.map(company => (
                <PortfolioCompanyLogo key={company.id} company={company} size="xs" />
              ))}
            </span>
          </div>
        ) : (
          <p>No companies flagged for follow-up</p>
        )}
      </article>
    </div>
  );
}

function PortfolioBenchmarkSection({
  summary,
  companies = [],
  cohortScale,
  onCohortScaleChange,
  onOpenCompanyProfile,
}: {
  summary: PortfolioBenchmarkSummary;
  companies?: PortfolioCompanyView[];
  cohortScale: BenchmarkCohortScale;
  onCohortScaleChange: (scale: BenchmarkCohortScale) => void;
  onOpenCompanyProfile?: (company: PortfolioCompanyView) => void;
}) {
  const [drawerState, setDrawerState] = useState<BenchDrawerState>(null);
  const companiesById = useMemo(
    () => new Map(companies.map(company => [company.id, company])),
    [companies],
  );
  const portfolioDotsByMetricId = useMemo(() => {
    const map = new Map<string, PortfolioBenchmarkDot[]>();
    for (const metric of summary.metrics) {
      const dots = cohortScale === "portfolio"
        ? metric.dots
        : buildBenchmarkDotsForCompanies(
          metric.id,
          companies,
          metric.lowerIsBetter,
          metric.bandStart,
          metric.bandEnd,
        );
      map.set(metric.id, dots);
    }
    return map;
  }, [cohortScale, companies, summary.metrics]);
  const sampleSize = summary.metrics[0]?.sampleSize ?? companies.length;
  const renderMode = benchmarkRenderMode(sampleSize);
  const sectionCopy = cohortScale === "percentile"
    ? "All metrics in one table — companies grouped into P25–P100 buckets. Click a bar to expand portfolio companies inline."
    : renderMode === "logos"
    ? "Each logo is one company on that metric — positioned left to right from better to worse. Click a logo to open the company list, or use tier pills to filter."
    : renderMode === "dots"
      ? "At this cohort size, companies appear as compact tier-colored dots. Click tier pills to open your portfolio company list."
      : cohortScale === "xlarge"
        ? "At 100k scale, only aggregated distribution buckets are shown. Click a bar or tier pill to see your portfolio companies in that slice."
        : "At 10k scale, the chart shows cohort density. Click a bar or tier pill to see your portfolio companies in that slice.";

  return (
    <section className="investor-bench-section" aria-label="Benchmark distribution">
      <div className="investor-bench-section-panel">
        <div className="investor-bench-section-head">
          <div className="investor-bench-section-head-copy">
            <span>Benchmark distribution</span>
            <h2>How the portfolio stacks up</h2>
            <p>{sectionCopy}</p>
          </div>
          <div className="investor-bench-section-filters">
            <label className="investor-bench-filter">
              <span className="investor-bench-filter-label">view</span>
              <select
                value={cohortScale}
                onChange={event => onCohortScaleChange(event.target.value as BenchmarkCohortScale)}
                aria-label="Benchmark cohort view"
              >
                <option value="portfolio">Portfolio companies</option>
                <option value="full">Full cohort (10k)</option>
                <option value="xlarge">Full cohort (100k)</option>
                <option value="percentile">Percentile distribution</option>
              </select>
            </label>
            <label className="investor-bench-filter">
              <span className="investor-bench-filter-label">cohort</span>
              <select defaultValue={summary.filterLabel} aria-label="Filter cohort">
                <option>{summary.filterLabel}</option>
                <option>B2B SaaS · Seed · US · Year 1</option>
                <option>B2B SaaS · Series A · US · Year 2</option>
              </select>
            </label>
          </div>
        </div>

        {cohortScale !== "percentile" ? (
          <BenchmarkSummaryTiles summary={summary} companies={companies} />
        ) : null}

        {cohortScale === "percentile" ? (
          <BenchmarkPercentileDistribution
            summary={summary}
            portfolioDotsByMetricId={portfolioDotsByMetricId}
            companiesById={companiesById}
            onOpenCompanyProfile={onOpenCompanyProfile}
          />
        ) : (
        <div className="investor-bench-grid">
          {summary.metrics.map(metric => (
            <PortfolioBenchmarkChart
              key={metric.id}
              metric={metric}
              companiesById={companiesById}
              onOpenCompanyProfile={onOpenCompanyProfile}
              onOpenCompanyList={opts => setDrawerState({
                metric,
                tier: opts.tier,
                positionRange: opts.positionRange,
                highlightCompanyId: opts.companyId,
              })}
            />
          ))}
        </div>
        )}
      </div>

      <BenchmarkMetricCompaniesDrawer
        metric={drawerState?.metric ?? null}
        listDots={drawerState ? portfolioDotsByMetricId.get(drawerState.metric.id) ?? [] : []}
        tierFilter={drawerState?.tier}
        positionRange={drawerState?.positionRange}
        highlightCompanyId={drawerState?.highlightCompanyId}
        companiesById={companiesById}
        onClose={() => setDrawerState(null)}
        onOpenCompanyProfile={onOpenCompanyProfile}
      />
    </section>
  );
}

function PortfolioCompanyChipLogo({ chip }: { chip: WatchlistCompanyChip }) {
  const [useFallback, setUseFallback] = useState(false);

  if (chip.logoUrl && !useFallback) {
    return (
      <span
        className="investor-company-logo investor-company-logo--xs investor-company-logo--photo"
        title={chip.name}
      >
        <img
          src={chip.logoUrl}
          alt=""
          loading="lazy"
          onError={() => setUseFallback(true)}
        />
      </span>
    );
  }

  return (
    <span
      className="investor-company-logo investor-company-logo--xs"
      style={{ background: chip.logoBg }}
      title={chip.name}
    >
      {chip.logo}
    </span>
  );
}

function PortfoliosPage({
  onOpenCompany,
  onOpenCompanyProfile,
}: {
  onOpenCompany: (company: InvestorCompanyRef) => void;
  onOpenCompanyProfile: (company: PortfolioCompanyView) => void;
}) {
  const [lists, setLists] = useState<PortfolioListRow[]>(() =>
    buildInitialPortfolioLists().map(normalizePortfolioListRow),
  );
  const [tab, setTab] = useState<"all" | "mine" | "shared" | "starred">("all");
  const [query, setQuery] = useState("");
  const [starredIds, setStarredIds] = useState<string[]>(() =>
    INVESTOR_PORTFOLIO_LISTS.filter(row => row.starred).map(row => row.id),
  );
  const [digestById, setDigestById] = useState<Record<string, PortfolioListDigest>>(() =>
    Object.fromEntries(INVESTOR_PORTFOLIO_LISTS.map(row => [row.id, row.digest])),
  );
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftFundLabel, setDraftFundLabel] = useState("");
  const [draftCohort, setDraftCohort] = useState("");
  const [draftScope, setDraftScope] = useState<PortfolioListScope>("Account");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cohortScale, setCohortScale] = useState<BenchmarkCohortScale>("portfolio");
  const [addingCompanies, setAddingCompanies] = useState(false);
  const [companyQuery, setCompanyQuery] = useState("");

  const activeList = lists.find(row => row.id === activeId) ?? null;

  const activeBenchmarks = useMemo(() => {
    if (!activeList) return null;
    return buildPortfolioBenchmarkSummary(activeList, INVESTOR_PORTFOLIO, { cohortScale });
  }, [activeList, cohortScale]);

  const filteredLists = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lists.filter(row => {
      if (tab === "mine" && row.ownerKind !== "mine") return false;
      if (tab === "shared" && row.ownerKind !== "shared") return false;
      if (tab === "starred" && !starredIds.includes(row.id)) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q)
        || row.meta.toLowerCase().includes(q)
        || row.cohort.toLowerCase().includes(q)
        || row.ownerName.toLowerCase().includes(q)
        || row.ownerEmail.toLowerCase().includes(q)
      );
    });
  }, [lists, query, starredIds, tab]);

  const counts = useMemo(() => ({
    all: lists.length,
    mine: lists.filter(row => row.ownerKind === "mine").length,
    shared: lists.filter(row => row.ownerKind === "shared").length,
    starred: starredIds.length,
  }), [lists, starredIds]);

  const detailCompanies = useMemo(() => {
    if (!activeList) return [];
    return companiesForPortfolioList(activeList).map(buildPortfolioCompanyView)
      .sort((left, right) => right.moic - left.moic);
  }, [activeList]);

  const filteredDetailCompanies = useMemo(() => {
    const q = companyQuery.trim().toLowerCase();
    if (!q) return detailCompanies;
    return detailCompanies.filter(company =>
      company.displayName.toLowerCase().includes(q)
      || company.stage.toLowerCase().includes(q)
      || company.sector.toLowerCase().includes(q),
    );
  }, [companyQuery, detailCompanies]);

  const availableToAdd = useMemo(() => {
    if (!activeList) return [];
    const taken = new Set(activeList.companyIds);
    return INVESTOR_PORTFOLIO.filter(company => !taken.has(company.id));
  }, [activeList]);

  function closeCreatePortfolio() {
    setCreating(false);
    setDraftName("");
    setDraftFundLabel("");
    setDraftCohort("");
    setDraftScope("Account");
  }

  function createPortfolio() {
    const name = draftName.trim();
    if (!name || !draftCohort) return;
    const id = `pf-${Date.now()}`;
    const next: PortfolioListRow = {
      id,
      name,
      meta: buildPortfolioMeta(draftFundLabel),
      cohort: draftCohort as PortfolioCohortStage,
      companyCount: 0,
      companies: [],
      companyIds: [],
      ownerName: "You",
      ownerEmail: "",
      ownerKind: "mine",
      scope: draftScope,
      updatedAt: "Just now",
      digest: "Off",
      starred: false,
    };
    setLists(previous => [next, ...previous]);
    setDigestById(previous => ({ ...previous, [id]: "Off" }));
    setDraftName("");
    setDraftFundLabel("");
    setDraftCohort("");
    setDraftScope("Account");
    setCreating(false);
    setActiveId(id);
    setAddingCompanies(true);
  }

  function addCompanyToActive(companyId: string) {
    if (!activeList) return;
    const company = INVESTOR_PORTFOLIO.find(item => item.id === companyId);
    if (!company) return;
    setLists(previous => previous.map(row => {
      if (row.id !== activeList.id || row.companyIds.includes(companyId)) return row;
      const companyIds = [...row.companyIds, companyId];
      const companies = [
        ...row.companies,
        portfolioCompanyToChip(company),
      ].slice(0, PORTFOLIO_LIST_LOGO_VISIBLE);
      return {
        ...row,
        companyIds,
        companies,
        companyCount: companyIds.length,
        updatedAt: "Just now",
      };
    }));
  }

  if (activeList && activeBenchmarks) {
    const benchmarks = activeBenchmarks;
    const displayCompanyCount = detailCompanies.length || activeList.companyCount;
    const ownerLabel = activeList.ownerEmail || activeList.ownerName;
    const metaTags = portfolioMetaDisplayTags(activeList.meta);

    return (
      <section className="investor-portfolios-page">
        <div className="investor-portfolio-detail-head">
          <button
            type="button"
            className="investor-portfolio-back"
            onClick={() => {
              setActiveId(null);
              setCohortScale("portfolio");
              setAddingCompanies(false);
              setCompanyQuery("");
            }}
          >
            ← All portfolios
          </button>

          <header className="investor-portfolio-detail-card">
            <div className="investor-portfolio-detail-top">
              <div className="investor-portfolio-detail-identity">
                <div className="investor-portfolio-detail-title-row">
                  <h1>{activeList.name}</h1>
                  <div className="investor-portfolio-detail-meta">
                    <span className="investor-portfolio-detail-pill is-accent">
                      Portfolio · {activeList.name}
                    </span>
                    <span className="investor-portfolio-detail-pill">{activeList.scope}</span>
                    <span className="investor-portfolio-detail-pill">
                      {displayCompanyCount} compan{displayCompanyCount === 1 ? "y" : "ies"}
                    </span>
                    {metaTags.map(part => (
                      <span key={part} className="investor-portfolio-detail-pill is-accent">
                        {part}
                      </span>
                    ))}
                    <span className="investor-portfolio-detail-updated">
                      Updated {activeList.updatedAt}
                    </span>
                  </div>
                </div>
                <p className="investor-portfolio-detail-owner">Owner: {ownerLabel}</p>
              </div>

              <div className="investor-portfolio-detail-actions">
                <button type="button" className="investor-portfolio-detail-menu-btn">
                  Playbooks
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="investor-suggested-primary investor-portfolio-detail-add-btn"
                  onClick={() => setAddingCompanies(true)}
                >
                  + Add companies
                </button>
              </div>
            </div>
          </header>
        </div>

        {addingCompanies ? (
          <article className="overview-panel investor-portfolio-add-panel">
            <div className="overview-panel-head">
              <span>Add companies</span>
              <button type="button" className="investor-section-view-more" onClick={() => setAddingCompanies(false)}>
                Done
              </button>
            </div>
            {availableToAdd.length === 0 ? (
              <p className="investor-home-empty">Every tracked company is already in this portfolio.</p>
            ) : (
              <ul className="investor-portfolio-add-list">
                {availableToAdd.map(company => (
                  <li key={company.id}>
                    <button type="button" onClick={() => addCompanyToActive(company.id)}>
                      <span>
                        <strong>{company.displayName}</strong>
                        <em>{company.stage} · {company.sector}</em>
                      </span>
                      <b>Add</b>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ) : null}

        {detailCompanies.length > 0 ? (
          <PortfolioBenchmarkSection
            summary={benchmarks}
            companies={detailCompanies}
            cohortScale={cohortScale}
            onCohortScaleChange={setCohortScale}
            onOpenCompanyProfile={onOpenCompanyProfile}
          />
        ) : null}

        {detailCompanies.length === 0 ? (
          <article className="overview-panel investor-portfolio-empty">
            <span>No companies yet</span>
            <p>Create the portfolio category first, then add companies you want to track here.</p>
            <button
              type="button"
              className="investor-suggested-primary"
              onClick={() => setAddingCompanies(true)}
            >
              + Add companies
            </button>
          </article>
        ) : (
          <article className="overview-panel investor-portfolio-panel">
            <div className="overview-panel-head investor-portfolio-panel-head">
              <div>
                <span>Companies</span>
                <em>Ranked by MOIC · {detailCompanies.length} total</em>
              </div>
              {detailCompanies.length > 8 ? (
                <label className="investor-portfolio-table-search">
                  <span className="sr-only">Filter companies</span>
                  <input
                    type="search"
                    value={companyQuery}
                    onChange={event => setCompanyQuery(event.target.value)}
                    placeholder="Filter by name, stage, sector…"
                  />
                </label>
              ) : null}
            </div>
            <PortfolioCompaniesTable
              companies={filteredDetailCompanies}
              onOpenCompanyProfile={onOpenCompanyProfile}
              emptyLabel={companyQuery.trim() ? "No companies match your filter." : undefined}
            />
          </article>
        )}
      </section>
    );
  }

  return (
    <section className="investor-portfolios-page">
      <header className="investor-portfolios-page-head-card">
        <div className="investor-portfolios-page-head-copy">
          <h1>Portfolios</h1>
          <p>Companies in your funds, tracked per-fund with signal digests</p>
        </div>
        {!creating ? (
          <button
            type="button"
            className="investor-portfolios-header-btn is-new"
            aria-expanded={creating}
            aria-controls="portfolio-create-bar"
            onClick={() => setCreating(true)}
          >
            + New portfolio
          </button>
        ) : null}
      </header>

      <div className="investor-portfolios-list-panel">
        {creating ? (
          <div id="portfolio-create-bar" className="investor-portfolios-create-bar">
            <input
              className="investor-portfolios-create-name"
              value={draftName}
              onChange={event => setDraftName(event.target.value)}
              placeholder="Portfolio name (e.g. Fund 2)"
              autoFocus
              aria-label="Portfolio name"
            />
            <input
              className="investor-portfolios-create-fund-label"
              value={draftFundLabel}
              onChange={event => setDraftFundLabel(event.target.value)}
              placeholder="Fund label (optional)"
              aria-label="Fund label (optional)"
            />
            <select
              className="investor-portfolios-create-cohort"
              value={draftCohort}
              onChange={event => setDraftCohort(event.target.value)}
              aria-label="Cohort selection"
            >
              <option value="" disabled>
                Select COHORT
              </option>
              {PORTFOLIO_COHORT_STAGES.map(stage => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <select
              className="investor-portfolios-create-scope"
              value={draftScope}
              onChange={event => setDraftScope(event.target.value as PortfolioListScope)}
              aria-label="Portfolio scope"
            >
              <option value="Account">Account</option>
              <option value="Personal">Personal</option>
            </select>
            <div className="investor-portfolios-create-actions">
              <button
                type="button"
                className="investor-portfolios-primary-btn investor-portfolios-create-submit"
                disabled={!draftName.trim() || !draftCohort}
                onClick={createPortfolio}
              >
                Create
              </button>
              <button
                type="button"
                className="investor-portfolios-create-close"
                aria-label="Close create portfolio"
                onClick={closeCreatePortfolio}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.75"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        <div className="investor-watchlists-toolbar investor-portfolios-toolbar">
          <div className="investor-watchlists-tabs investor-portfolios-tabs" role="tablist" aria-label="Portfolio filters">
            {([
              ["all", "All", counts.all],
              ["mine", "Mine", counts.mine],
              ["shared", "Shared", counts.shared],
              ["starred", "Starred", counts.starred],
            ] as const).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? "is-active" : ""}
                onClick={() => setTab(id)}
              >
                {label}
                <span className="investor-portfolios-tab-count">{count}</span>
              </button>
            ))}
          </div>
          <label className="investor-watchlists-search investor-portfolios-search">
            <svg className="investor-portfolios-search-icon" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M8.5 3a5.5 5.5 0 0 1 4.33 8.84l3.38 3.38a.75.75 0 1 1-1.06 1.06l-3.38-3.38A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                fill="currentColor"
              />
            </svg>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Filter by name or owner"
            />
          </label>
        </div>

        <div className="investor-watchlists-table investor-portfolios-table" role="table" aria-label="Portfolios">
        <div className="investor-watchlists-table-head investor-portfolios-table-head" role="row">
          <span role="columnheader">Name</span>
          <span role="columnheader">Companies</span>
          <span role="columnheader">Owner</span>
          <span role="columnheader">Scope</span>
          <span role="columnheader">Cohort</span>
          <span role="columnheader">Updated</span>
          <span role="columnheader">Digest</span>
          <span role="columnheader" className="investor-watchlists-star-col investor-portfolios-star-col" aria-label="Starred">
            <span className="sr-only">Starred</span>
          </span>
        </div>
        <div className="investor-watchlists-table-body investor-portfolios-table-body" role="rowgroup">
          {filteredLists.length === 0 ? (
            <p className="investor-watchlists-empty">No portfolios in this view.</p>
          ) : (
            filteredLists.map(row => (
              <div key={row.id} className="investor-watchlists-row investor-portfolios-row" role="row">
                <span role="cell" className="investor-portfolios-name-cell">
                  <button
                    type="button"
                    className="investor-portfolio-list-name investor-portfolios-list-name"
                    onClick={() => {
                      setActiveId(row.id);
                      if (row.id === "pf-seed-fund") {
                        setLists(previous => previous.map(item => (
                          item.id === "pf-seed-fund" ? normalizePortfolioListRow(item) : item
                        )));
                      }
                    }}
                  >
                    <strong className="investor-watchlists-name">{row.name}</strong>
                    {portfolioMetaDisplayTags(row.meta).map(part => (
                      <span key={`${row.id}-${part}`} className="investor-portfolios-tag">
                        · {part.toUpperCase()}
                      </span>
                    ))}
                  </button>
                </span>
                <span role="cell" className="investor-watchlists-companies investor-portfolios-companies">
                  {row.companies.length > 0 ? (
                    <span className="investor-watchlists-logo-stack investor-portfolios-logo-stack" aria-hidden="true">
                      {row.companies.slice(0, PORTFOLIO_LIST_LOGO_VISIBLE).map(chip => (
                        <PortfolioCompanyChipLogo
                          key={`${row.id}-${chip.name}`}
                          chip={chip}
                        />
                      ))}
                      {row.companyCount > PORTFOLIO_LIST_LOGO_VISIBLE ? (
                        <span className="investor-portfolio-more-chip">
                          +{row.companyCount - PORTFOLIO_LIST_LOGO_VISIBLE}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  {row.companyCount > 0 ? (
                    <span
                      className="investor-portfolios-company-count"
                      aria-label={`${row.companyCount} compan${row.companyCount === 1 ? "y" : "ies"}`}
                    >
                      <strong>{row.companyCount}</strong>
                      <span>{row.companyCount === 1 ? "company" : "companies"}</span>
                    </span>
                  ) : (
                    <span className="investor-portfolios-company-count is-empty">—</span>
                  )}
                </span>
                <span role="cell" className="investor-watchlists-owner investor-portfolios-owner">
                  <strong>{row.ownerName}</strong>
                  {row.ownerEmail ? <em>{row.ownerEmail}</em> : null}
                </span>
                <span role="cell">
                  <span className="investor-portfolio-detail-pill investor-portfolios-scope-pill">{row.scope}</span>
                </span>
                <span role="cell">
                  <label className="investor-watchlists-digest investor-portfolios-cohort">
                    <span className="sr-only">Cohort for {row.name}</span>
                    <select
                      value={row.cohort}
                      aria-label={`Cohort for ${row.name}`}
                      onChange={event => {
                        const value = event.target.value as PortfolioCohortStage;
                        setLists(previous => previous.map(item => (
                          item.id === row.id ? { ...item, cohort: value } : item
                        )));
                      }}
                    >
                      {PORTFOLIO_COHORT_STAGES.map(stage => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </label>
                </span>
                <span role="cell" className="investor-watchlists-updated investor-portfolios-updated">{row.updatedAt}</span>
                <span role="cell">
                  <label className="investor-watchlists-digest investor-portfolios-digest">
                    <span className="sr-only">Digest for {row.name}</span>
                    <select
                      value={digestById[row.id] ?? row.digest}
                      onChange={event => {
                        const value = event.target.value as PortfolioListDigest;
                        setDigestById(previous => ({ ...previous, [row.id]: value }));
                      }}
                    >
                      <option value="Off">Off</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Daily">Daily</option>
                    </select>
                  </label>
                </span>
                <span role="cell" className="investor-watchlists-star-col investor-portfolios-star-col">
                  <button
                    type="button"
                    className={`investor-watchlists-star investor-portfolios-star${starredIds.includes(row.id) ? " is-on" : ""}`}
                    aria-label={starredIds.includes(row.id) ? `Unstar ${row.name}` : `Star ${row.name}`}
                    onClick={() => {
                      setStarredIds(previous => (
                        previous.includes(row.id)
                          ? previous.filter(id => id !== row.id)
                          : [...previous, row.id]
                      ));
                    }}
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path
                        d="M10 3.2 11.9 7.4 16.4 7.9 13.2 11 14.1 15.5 10 13.2 5.9 15.5 6.8 11 3.6 7.9 8.1 7.4 10 3.2Z"
                        fill={starredIds.includes(row.id) ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </section>
  );
}

function moicTier(moic: number): "strong" | "watch" | "concern" {
  if (moic >= 2) return "strong";
  if (moic >= 1) return "watch";
  return "concern";
}

function healthLabel(health: PortfolioCompanyView["health"]): string {
  if (health === "strong") return "Strong";
  if (health === "watch") return "Watch";
  return "Struggling";
}

function PortfolioCompanyLogo({
  company,
  size = "sm",
}: {
  company: Pick<PortfolioCompanyView, "displayName" | "logo" | "logoBg" | "domain" | "logoUrl">;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const [useFallback, setUseFallback] = useState(false);
  const logoUrl = resolveCompanyLogoUrl(company);
  const sizeClass = size === "lg"
    ? " investor-company-logo--lg"
    : size === "md"
      ? " investor-company-logo--md"
      : size === "xs"
        ? " investor-company-logo--xs"
        : " investor-company-logo--sm";

  if (logoUrl && !useFallback) {
    return (
      <span
        className={`investor-company-logo investor-company-logo--photo${sizeClass}`}
        title={company.displayName}
      >
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          onError={() => setUseFallback(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`investor-company-logo${sizeClass}`}
      style={{ background: company.logoBg }}
      title={company.displayName}
    >
      {company.logo}
    </span>
  );
}

function buildFounderProfile(company: PortfolioCompanyView) {
  const email = company.founderEmail ?? `founders@${company.domain}`;
  const localPart = email.split("@")[0] ?? "founder";
  const name = localPart === "founders" || localPart === "founder" || localPart === "team"
    ? "Founding team"
    : localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ");

  return {
    name,
    email,
    title: "Co-founder & CEO",
    linkedin: company.linkedin,
  };
}

function InvestorCompanyProfileDrawer({
  company,
  onClose,
  onOpenWorkspace,
}: {
  company: PortfolioCompanyView | null;
  onClose: () => void;
  onOpenWorkspace: (company: InvestorCompanyRef) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<"portfolio" | "about">("portfolio");
  const open = Boolean(company);
  useDialogA11y(open, dialogRef, onClose);
  const handleScrimPointerDown = useScrimPointerClose(onClose, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) setActiveTab("portfolio");
  }, [company?.id, open]);

  if (!company || !open) return null;

  const returnLabel = formatUsdCompact(company.estimatedValue);
  const growthLabel = formatGrowthRate(company.arrGrowthQoQ);
  const founder = buildFounderProfile(company);
  const mailSubject = encodeURIComponent(`${company.displayName} — portfolio check-in`);
  const founderPanelId = "investor-company-drawer-founder-panel";
  const portfolioPanelId = "investor-company-drawer-portfolio-panel";
  const aboutPanelId = "investor-company-drawer-about-panel";

  const showFounderTab = () => {
    setActiveTab("about");
    window.requestAnimationFrame(() => {
      document.getElementById(founderPanelId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  return createPortal(
    <div
      className="investor-company-drawer-scrim profile-complete-drawer-scrim"
      onPointerDown={handleScrimPointerDown}
      role="presentation"
    >
      <aside
        ref={dialogRef}
        className="investor-company-drawer profile-complete-drawer"
        {...drawerPanelPointerProps()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="investor-company-drawer-title"
      >
        <header className="investor-company-drawer-head">
          <div className="investor-company-drawer-identity">
            <PortfolioCompanyLogo company={company} size="lg" />
            <div>
              <span className="investor-company-drawer-eyebrow">Portfolio company</span>
              <strong id="investor-company-drawer-title">{company.displayName}</strong>
              <p>{company.meta}</p>
            </div>
          </div>
          <button
            type="button"
            className="investor-company-drawer-close profile-complete-drawer-x"
            onClick={onClose}
            aria-label="Close company profile"
            data-autofocus
          >
            ✕
          </button>
        </header>

        <div className="investor-company-drawer-tags">
          <span className="investor-company-drawer-tag">{company.stage}</span>
          <span className="investor-company-drawer-tag">{company.sector}</span>
          <span className={`investor-company-drawer-tag is-health-${company.health}`}>
            {healthLabel(company.health)}
          </span>
          {company.onFuel ? (
            <span className="investor-company-drawer-tag is-fuel">On Fuel</span>
          ) : null}
        </div>

        <div className="investor-company-drawer-tabs" role="tablist" aria-label="Company profile views">
          <button
            type="button"
            role="tab"
            id="investor-company-drawer-tab-portfolio"
            className={activeTab === "portfolio" ? "is-active" : undefined}
            aria-selected={activeTab === "portfolio"}
            aria-controls={portfolioPanelId}
            onClick={() => setActiveTab("portfolio")}
          >
            Portfolio
          </button>
          <button
            type="button"
            role="tab"
            id="investor-company-drawer-tab-about"
            className={activeTab === "about" ? "is-active" : undefined}
            aria-selected={activeTab === "about"}
            aria-controls={aboutPanelId}
            onClick={() => setActiveTab("about")}
          >
            About
          </button>
        </div>

        <div className="investor-company-drawer-body">
          {activeTab === "portfolio" ? (
            <div
              id={portfolioPanelId}
              role="tabpanel"
              aria-labelledby="investor-company-drawer-tab-portfolio"
            >
              <section className="investor-company-drawer-section">
                <span className="investor-company-drawer-section-label">Investment</span>
                <div className="investor-company-drawer-metrics">
                  <article>
                    <em>Invested</em>
                    <strong>{company.invested}</strong>
                  </article>
                  <article>
                    <em>Est. value</em>
                    <strong>{returnLabel}</strong>
                  </article>
                  <article>
                    <em>MOIC</em>
                    <strong className={`investor-portfolio-moic-badge is-${moicTier(company.moic)}`}>
                      {formatMoic(company.moic)}
                    </strong>
                  </article>
                  <article>
                    <em>Ownership</em>
                    <strong>{company.ownership}</strong>
                  </article>
                </div>
              </section>

              <section className="investor-company-drawer-section">
                <span className="investor-company-drawer-section-label">Performance</span>
                <div className="investor-company-drawer-metrics">
                  <article>
                    <em>ARR</em>
                    <strong>
                      {company.arr}{" "}
                      <span className={`investor-growth investor-growth--${company.qoqMovement}`}>{growthLabel}</span>
                    </strong>
                  </article>
                  <article>
                    <em>Runway</em>
                    <strong className={company.runwayMonths < 6 ? "is-flagged" : undefined}>{company.runway}</strong>
                  </article>
                  <article>
                    <em>NRR</em>
                    <strong>{company.nrr}%</strong>
                  </article>
                  <article>
                    <em>Invested</em>
                    <strong>{company.investedAt}</strong>
                  </article>
                </div>
              </section>

              {company.redFlags.length > 0 ? (
                <section className="investor-company-drawer-section">
                  <span className="investor-company-drawer-section-label">Signals</span>
                  <ul className="investor-company-drawer-flags">
                    {company.redFlags.map(flag => (
                      <li key={flag.kind}>{flag.label}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {company.strugglingAreas.length > 0 ? (
                <section className="investor-company-drawer-section">
                  <span className="investor-company-drawer-section-label">Focus areas</span>
                  <div className="investor-company-drawer-chips">
                    {company.strugglingAreas.map(area => (
                      <span key={area} className="investor-company-drawer-chip">{area}</span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div
              id={aboutPanelId}
              role="tabpanel"
              aria-labelledby="investor-company-drawer-tab-about"
            >
              <section className="investor-company-drawer-section">
                <span className="investor-company-drawer-section-label">Company</span>
                <div className="investor-company-drawer-facts">
                  <div>
                    <em>Website</em>
                    <strong>{company.domain}</strong>
                  </div>
                  <div>
                    <em>Headquarters</em>
                    <strong>{company.headquarters}</strong>
                  </div>
                  <div>
                    <em>Team size</em>
                    <strong>{company.employees}</strong>
                  </div>
                  <div>
                    <em>Last update</em>
                    <strong>{company.lastUpdate}</strong>
                  </div>
                  <div>
                    <em>Benchmark</em>
                    <strong>{company.daysSinceBenchmark}d ago</strong>
                  </div>
                  <div>
                    <em>On Fuel</em>
                    <strong>{company.onFuel ? "Yes" : "No"}</strong>
                  </div>
                </div>
              </section>

              <section
                id={founderPanelId}
                className="investor-company-drawer-section investor-company-drawer-founder"
              >
                <span className="investor-company-drawer-section-label">Founder</span>
                <article className="investor-company-drawer-founder-card">
                  <div className="investor-company-drawer-founder-main">
                    <span className="investor-company-drawer-founder-avatar" aria-hidden="true">
                      {founder.name.slice(0, 1)}
                    </span>
                    <div className="investor-company-drawer-founder-copy">
                      <strong>{founder.name}</strong>
                      <p>{founder.title}</p>
                      <a href={`mailto:${founder.email}?subject=${mailSubject}`}>
                        {founder.email}
                      </a>
                    </div>
                    <a
                      className="investor-company-drawer-founder-cta"
                      href={`mailto:${founder.email}?subject=${mailSubject}`}
                    >
                      Email founder
                    </a>
                  </div>
                  {founder.linkedin ? (
                    <a
                      className="investor-company-drawer-founder-link"
                      href={founder.linkedin.startsWith("http") ? founder.linkedin : `https://${founder.linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View LinkedIn profile
                    </a>
                  ) : null}
                </article>
              </section>
            </div>
          )}
        </div>

        <footer className="investor-company-drawer-foot">
          <button
            type="button"
            className="investor-suggested-primary"
            onClick={() => onOpenWorkspace(company)}
          >
            View full company profile
          </button>
          <button
            type="button"
            className="investor-suggested-ghost"
            onClick={showFounderTab}
          >
            Contact founder
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

function PortfolioCompaniesTable({
  companies,
  onOpenCompanyProfile,
  embedded = false,
  compact = false,
  emptyLabel,
}: {
  companies: PortfolioCompanyView[];
  onOpenCompanyProfile: (company: PortfolioCompanyView) => void;
  embedded?: boolean;
  compact?: boolean;
  emptyLabel?: string;
}) {
  if (companies.length === 0) {
    return (
      <p className="investor-portfolio-table-empty">{emptyLabel ?? "No companies in this view."}</p>
    );
  }

  return (
    <div
      className={`investor-portfolio-table-shell${embedded ? " investor-portfolio-table-shell--embedded" : ""}`}
    >
      <div
        className={`investor-portfolio-table${embedded ? " investor-portfolio-table--embedded" : ""}${compact ? " investor-portfolio-table--compact" : ""}`}
        role="table"
        aria-label="Portfolio companies ranked by MOIC"
      >
        <div className="investor-portfolio-table-head" role="row">
          {!compact ? <span role="columnheader" className="investor-portfolio-col-rank">#</span> : null}
          <span role="columnheader">Company</span>
          <span role="columnheader">Stage</span>
          {compact ? (
            <>
              <span role="columnheader">MOIC</span>
              <span role="columnheader">ARR</span>
              <span role="columnheader">Trend</span>
            </>
          ) : (
            <>
              <span role="columnheader">Invested</span>
              <span role="columnheader">Return</span>
              <span role="columnheader">MOIC</span>
              <span role="columnheader">ARR</span>
              <span role="columnheader">Runway</span>
              <span role="columnheader">Date</span>
              <span role="columnheader">Trend</span>
            </>
          )}
        </div>
        <div className="investor-portfolio-table-body" role="rowgroup">
          {companies.map((company, index) => (
            <PortfolioCompanyRow
              key={company.id}
              company={company}
              rank={index + 1}
              compact={compact}
              onOpenProfile={() => onOpenCompanyProfile(company)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WatchlistEditIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M12.2 3.8a1.4 1.4 0 0 1 2 2L7.4 12.6 4.8 13l.4-2.6 7-6.6Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M11 5 15 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function WatchlistDeleteIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5.5 6.2h9M8.2 6.2V5a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1v1.2m1.8 0-.5 9.2a1 1 0 0 1-1 .9H7.4a1 1 0 0 1-1-.9L5.9 6.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function WatchlistEditForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saveLabel = "Save",
  formId,
}: {
  draft: WatchlistEditDraft;
  onChange: (draft: WatchlistEditDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  formId?: string;
}) {
  const availableTeams = WATCHLIST_TEAM_OPTIONS.filter(team => !draft.teams.includes(team));
  const valid = isWatchlistEditValid(draft);

  function setScope(scope: WatchlistScope) {
    onChange({
      ...draft,
      scope,
      teams: scope === "Team" ? draft.teams : [],
    });
  }

  function addTeam(team: string) {
    if (!team || draft.teams.includes(team)) return;
    onChange({ ...draft, teams: [...draft.teams, team] });
  }

  function removeTeam(team: string) {
    onChange({ ...draft, teams: draft.teams.filter(item => item !== team) });
  }

  return (
    <div id={formId} className="investor-watchlist-edit-form">
      <input
        type="text"
        className="investor-watchlist-edit-name"
        value={draft.name}
        onChange={event => onChange({ ...draft, name: event.target.value })}
        placeholder="Watchlist title"
        aria-label="Watchlist title"
      />
      <select
        className="investor-watchlist-edit-scope"
        value={draft.scope}
        onChange={event => setScope(event.target.value as WatchlistScope)}
        aria-label="Visibility"
      >
        {WATCHLIST_VISIBILITY_OPTIONS.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {draft.scope === "Team" ? (
        <div className="investor-watchlist-team-picker">
          <div className="investor-watchlist-team-chips" aria-label="Selected teams">
            {draft.teams.length === 0 ? (
              <span className="investor-watchlist-team-placeholder">Select teams</span>
            ) : (
              draft.teams.map(team => (
                <button
                  key={team}
                  type="button"
                  className="investor-watchlist-team-chip"
                  onClick={() => removeTeam(team)}
                  aria-label={`Remove ${team}`}
                >
                  {team}
                  <span aria-hidden="true">✕</span>
                </button>
              ))
            )}
          </div>
          {availableTeams.length > 0 ? (
            <select
              className="investor-watchlist-team-add"
              value=""
              onChange={event => {
                addTeam(event.target.value);
                event.currentTarget.value = "";
              }}
              aria-label="Add team"
            >
              <option value="">Add team</option>
              {availableTeams.map(team => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
      <div className="investor-portfolios-create-actions investor-watchlist-edit-actions">
        <button
          type="button"
          className="investor-portfolios-primary-btn investor-portfolios-create-submit"
          disabled={!valid}
          onClick={onSave}
        >
          {saveLabel}
        </button>
        <button
          type="button"
          className="investor-portfolios-create-close"
          aria-label="Cancel edit"
          onClick={onCancel}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function WatchlistEditModal({
  open,
  watchlistName,
  draft,
  onChange,
  onSave,
  onClose,
}: {
  open: boolean;
  watchlistName: string;
  draft: WatchlistEditDraft;
  onChange: (draft: WatchlistEditDraft) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(open, dialogRef, onClose);
  const handleScrimPointerDown = useScrimPointerClose(onClose, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="investor-watchlist-modal-scrim"
      onPointerDown={handleScrimPointerDown}
    >
      <div
        ref={dialogRef}
        className="investor-watchlist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="watchlist-edit-modal-title"
        {...drawerPanelPointerProps()}
      >
        <header className="investor-watchlist-modal-head">
          <div>
            <span className="investor-watchlist-modal-eyebrow">Edit watchlist</span>
            <h2 id="watchlist-edit-modal-title">{watchlistName}</h2>
          </div>
          <button
            type="button"
            className="investor-portfolios-create-close"
            aria-label="Close edit watchlist"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        <WatchlistEditForm
          draft={draft}
          onChange={onChange}
          onSave={onSave}
          onCancel={onClose}
          saveLabel="Save changes"
        />
      </div>
    </div>,
    document.body,
  );
}

function WatchlistDetailPage({
  watchlist,
  onBack,
  onSaveEdit,
  onDelete,
  onRemoveEntry,
  initialEditing = false,
}: {
  watchlist: WatchlistRow;
  onBack: () => void;
  onSaveEdit: (draft: WatchlistEditDraft) => void;
  onDelete: () => void;
  onRemoveEntry: (entryId: string) => void;
  initialEditing?: boolean;
}) {
  const [editing, setEditing] = useState(initialEditing);
  const [editDraft, setEditDraft] = useState<WatchlistEditDraft>(() => buildWatchlistEditDraft(watchlist));
  const companyCount = watchlistEntryCount(watchlist);
  const ownerLabel = watchlistOwnerDisplay(watchlist);
  const teamLabels = watchlistTeamLabels(watchlist);

  useEffect(() => {
    setEditDraft(buildWatchlistEditDraft(watchlist));
  }, [watchlist]);

  function handleSaveEdit() {
    if (!isWatchlistEditValid(editDraft)) return;
    onSaveEdit(editDraft);
    setEditing(false);
  }

  function handleCancelEdit() {
    setEditDraft(buildWatchlistEditDraft(watchlist));
    setEditing(false);
  }

  function handleDelete() {
    if (window.confirm(`Delete "${watchlist.name}"? This cannot be undone.`)) {
      onDelete();
    }
  }

  return (
    <section className="investor-watchlists-page investor-watchlists-detail-page">
      <div className="investor-portfolio-detail-head">
        <button type="button" className="investor-portfolio-back" onClick={onBack}>
          ← All watchlists
        </button>

        <header className="investor-portfolio-detail-card investor-watchlist-detail-card">
          {editing ? (
            <WatchlistEditForm
              formId="watchlist-detail-edit-form"
              draft={editDraft}
              onChange={setEditDraft}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          ) : (
            <>
              <div className="investor-portfolio-detail-top">
                <div className="investor-portfolio-detail-identity">
                  <div className="investor-portfolio-detail-title-row">
                    <h1>{watchlist.name}</h1>
                    <div className="investor-portfolio-detail-meta">
                      <span className="investor-portfolio-detail-pill">Watchlist</span>
                      <span className="investor-portfolio-detail-pill">
                        {companyCount} compan{companyCount === 1 ? "y" : "ies"}
                      </span>
                      <span className="investor-portfolio-detail-updated">
                        Updated {watchlist.updatedAt}
                      </span>
                      <span className="investor-portfolio-detail-updated">
                        Owner {ownerLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="investor-portfolio-detail-actions investor-watchlist-detail-actions">
                  <button
                    type="button"
                    className="investor-portfolio-detail-menu-btn investor-watchlist-rename-btn"
                    onClick={() => {
                      setEditDraft(buildWatchlistEditDraft(watchlist));
                      setEditing(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="investor-watchlist-delete-btn"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="investor-watchlist-access-row">
                <div className="investor-watchlist-access-identity">
                  <span className="investor-watchlist-access-avatar" aria-hidden="true">
                    {watchlistAccessInitials(watchlist)}
                  </span>
                  <div className="investor-watchlist-access-copy">
                    <strong>
                      {watchlist.scope === "Team" && teamLabels.length > 0 ? (
                        teamLabels.map(team => (
                          <span key={team} className="investor-watchlist-access-team-chip">{team}</span>
                        ))
                      ) : (
                        watchlistAccessName(watchlist)
                      )}
                      {" "}
                      <span className="investor-portfolio-detail-pill is-accent">{watchlist.scope}</span>
                    </strong>
                    <p>{watchlistVisibilityCopy(watchlist)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="investor-portfolio-detail-menu-btn"
                  onClick={() => {
                    setEditDraft(buildWatchlistEditDraft(watchlist));
                    setEditing(true);
                  }}
                >
                  Manage access
                </button>
              </div>
            </>
          )}
        </header>
      </div>

      <div className="investor-portfolios-list-panel investor-watchlist-companies-panel">
        <div className="investor-watchlist-companies-table" role="table" aria-label={`Companies in ${watchlist.name}`}>
          <div className="investor-watchlist-companies-head" role="row">
            <span role="columnheader">Company</span>
            <span role="columnheader">Added</span>
            <span role="columnheader">Added by</span>
            <span role="columnheader" className="sr-only">Remove</span>
          </div>
          <div className="investor-watchlist-companies-body" role="rowgroup">
            {watchlist.entries?.length === 0 ? (
              <p className="investor-watchlists-empty">No companies on this watchlist yet.</p>
            ) : (
              (watchlist.entries ?? []).map(entry => (
                <div key={entry.id} className="investor-watchlist-companies-row" role="row">
                  <span role="cell" className="investor-watchlist-companies-company">
                    <PortfolioCompanyChipLogo chip={entry} />
                    <strong>{entry.name}</strong>
                  </span>
                  <span role="cell" className="investor-watchlist-companies-added">{entry.addedAt}</span>
                  <span role="cell" className="investor-watchlist-companies-added-by">{entry.addedBy}</span>
                  <span role="cell" className="investor-watchlist-companies-remove">
                    <button
                      type="button"
                      className="investor-watchlist-remove-btn"
                      aria-label={`Remove ${entry.name} from watchlist`}
                      onClick={() => onRemoveEntry(entry.id)}
                    >
                      ✕
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function WatchlistsPage({
  onOpenCompany,
}: {
  onOpenCompany: (company: InvestorCompanyRef) => void;
}) {
  const [tab, setTab] = useState<"all" | "mine" | "shared" | "starred" | "suggested">("all");
  const [query, setQuery] = useState("");
  const [watchlists, setWatchlists] = useState<WatchlistRow[]>(() => [...INVESTOR_WATCHLISTS]);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftVisibility, setDraftVisibility] = useState<WatchlistScope | "">("");
  const [starredIds, setStarredIds] = useState<string[]>(() =>
    INVESTOR_WATCHLISTS.filter(row => row.starred).map(row => row.id),
  );
  const [digestById, setDigestById] = useState<Record<string, WatchlistRow["digest"]>>(() =>
    Object.fromEntries(INVESTOR_WATCHLISTS.map(row => [row.id, row.digest])),
  );
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<WatchlistEditDraft | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const [draftTeams, setDraftTeams] = useState<string[]>([]);

  const activeWatchlist = watchlists.find(row => row.id === activeId) ?? null;

  const closeEditWatchlist = useCallback(() => {
    setEditingId(null);
    setEditDraft(null);
  }, []);

  const saveWatchlistEdit = useCallback((id: string, draft: WatchlistEditDraft) => {
    if (!isWatchlistEditValid(draft)) return;
    setWatchlists(previous => previous.map(row => (
      row.id === id ? applyWatchlistEdit(row, draft) : row
    )));
    closeEditWatchlist();
  }, [closeEditWatchlist]);

  const deleteWatchlist = useCallback((id: string) => {
    setWatchlists(previous => previous.filter(row => row.id !== id));
    setStarredIds(previous => previous.filter(starredId => starredId !== id));
    if (activeId === id) setActiveId(null);
    if (editingId === id) closeEditWatchlist();
  }, [activeId, closeEditWatchlist, editingId]);

  const closeCreateWatchlist = useCallback(() => {
    setCreating(false);
    setDraftName("");
    setDraftVisibility("");
    setDraftTeams([]);
  }, []);

  const createWatchlist = useCallback(() => {
    const name = draftName.trim();
    if (!name || !draftVisibility) return;
    if (draftVisibility === "Team" && draftTeams.length === 0) return;

    const id = `wl-${Date.now()}`;
    const ownerKind = watchlistOwnerKindForScope(draftVisibility);
    const row: WatchlistRow = {
      id,
      name,
      entries: [],
      ownerName: ownerKind === "mine" ? "you" : "Shared workspace",
      ownerEmail: ownerKind === "mine" ? "" : "team@example.com",
      ownerKind,
      scope: draftVisibility,
      teams: draftVisibility === "Team" ? draftTeams : [],
      updatedAt: "Just now",
      digest: "Off",
      starred: false,
    };

    setWatchlists(previous => [row, ...previous]);
    setDigestById(previous => ({ ...previous, [id]: row.digest }));
    closeCreateWatchlist();
    setActiveId(id);
  }, [closeCreateWatchlist, draftName, draftTeams, draftVisibility]);

  const filteredLists = useMemo(() => {
    const q = query.trim().toLowerCase();
    return watchlists.filter(row => {
      if (tab === "mine" && row.ownerKind !== "mine") return false;
      if (tab === "shared" && row.ownerKind !== "shared") return false;
      if (tab === "starred" && !starredIds.includes(row.id)) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q)
        || row.ownerName.toLowerCase().includes(q)
        || row.ownerEmail.toLowerCase().includes(q)
      );
    });
  }, [query, starredIds, tab, watchlists]);

  const counts = useMemo(() => ({
    all: watchlists.length,
    mine: watchlists.filter(row => row.ownerKind === "mine").length,
    shared: watchlists.filter(row => row.ownerKind === "shared").length,
    starred: starredIds.length,
    suggested: SUGGESTED_FOUNDERS.filter(company => !hiddenIds.includes(company.id)).length,
  }), [hiddenIds, starredIds, watchlists]);

  const visibleSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SUGGESTED_FOUNDERS
      .filter(company => !hiddenIds.includes(company.id))
      .filter(company => {
        if (!q) return true;
        return (
          company.displayName.toLowerCase().includes(q)
          || company.sector.toLowerCase().includes(q)
          || company.geography.toLowerCase().includes(q)
          || company.stage.toLowerCase().includes(q)
          || company.matchReason.toLowerCase().includes(q)
        );
      })
      .sort((left, right) => right.matchScore - left.matchScore);
  }, [hiddenIds, query]);

  if (activeWatchlist) {
    return (
      <WatchlistDetailPage
        watchlist={activeWatchlist}
        initialEditing={detailEditing}
        onBack={() => {
          setActiveId(null);
          setDetailEditing(false);
        }}
        onSaveEdit={draft => {
          saveWatchlistEdit(activeWatchlist.id, draft);
          setDetailEditing(false);
        }}
        onDelete={() => deleteWatchlist(activeWatchlist.id)}
        onRemoveEntry={entryId => {
          setWatchlists(previous => previous.map(row => {
            if (row.id !== activeWatchlist.id) return row;
            return {
              ...row,
              entries: row.entries.filter(entry => entry.id !== entryId),
              updatedAt: "Just now",
            };
          }));
        }}
      />
    );
  }

  return (
    <section className="investor-watchlists-page investor-portfolios-page">
      <header className="investor-portfolios-page-head-card">
        <div className="investor-portfolios-page-head-copy">
          <h1>Watchlists</h1>
          <p>Curated company lists for markets, competitors, and deal flow</p>
        </div>
        {!creating ? (
          <button
            type="button"
            className="investor-portfolios-header-btn is-new"
            onClick={() => setCreating(true)}
          >
            + New watchlist
          </button>
        ) : null}
      </header>

      <div className="investor-portfolios-list-panel">
        {creating ? (
          <div id="watchlist-create-bar" className="investor-portfolios-create-bar investor-watchlists-create-bar investor-watchlist-edit-bar">
            <input
              type="text"
              className="investor-portfolios-create-name investor-watchlists-create-name"
              placeholder="Watchlist title"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              autoFocus
              aria-label="Watchlist title"
            />
            <select
              className={`investor-portfolios-create-scope investor-watchlists-create-visibility${draftVisibility ? "" : " is-placeholder"}`}
              value={draftVisibility}
              onChange={e => {
                const value = e.target.value as WatchlistScope | "";
                setDraftVisibility(value);
                if (value !== "Team") setDraftTeams([]);
              }}
              aria-label="Visibility"
            >
              <option value="">Select visibility</option>
              {WATCHLIST_VISIBILITY_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {draftVisibility === "Team" ? (
              <div className="investor-watchlist-team-picker investor-watchlist-team-picker--inline">
                <div className="investor-watchlist-team-chips" aria-label="Selected teams">
                  {draftTeams.length === 0 ? (
                    <span className="investor-watchlist-team-placeholder">Select teams</span>
                  ) : (
                    draftTeams.map(team => (
                      <button
                        key={team}
                        type="button"
                        className="investor-watchlist-team-chip"
                        onClick={() => setDraftTeams(previous => previous.filter(item => item !== team))}
                        aria-label={`Remove ${team}`}
                      >
                        {team}
                        <span aria-hidden="true">✕</span>
                      </button>
                    ))
                  )}
                </div>
                <select
                  className="investor-watchlist-team-add"
                  value=""
                  onChange={event => {
                    const team = event.target.value;
                    if (team && !draftTeams.includes(team)) {
                      setDraftTeams(previous => [...previous, team]);
                    }
                    event.currentTarget.value = "";
                  }}
                  aria-label="Add team"
                >
                  <option value="">Add team</option>
                  {WATCHLIST_TEAM_OPTIONS.filter(team => !draftTeams.includes(team)).map(team => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="investor-portfolios-create-actions">
              <button
                type="button"
                className="investor-portfolios-primary-btn investor-portfolios-create-submit"
                disabled={
                  !draftName.trim()
                  || !draftVisibility
                  || (draftVisibility === "Team" && draftTeams.length === 0)
                }
                onClick={createWatchlist}
              >
                Create
              </button>
              <button
                type="button"
                className="investor-portfolios-create-close"
                aria-label="Cancel create watchlist"
                onClick={closeCreateWatchlist}
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}
        <div className="investor-watchlists-toolbar investor-portfolios-toolbar">
          <div className="investor-watchlists-tabs investor-portfolios-tabs" role="tablist" aria-label="Watchlist filters">
            {([
              ["all", "All", counts.all],
              ["mine", "Mine", counts.mine],
              ["shared", "Shared", counts.shared],
              ["starred", "Starred", counts.starred],
              ["suggested", "Suggested", counts.suggested],
            ] as const).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? "is-active" : ""}
                onClick={() => {
                  setTab(id);
                  setQuery("");
                }}
              >
                {label}
                <span className="investor-portfolios-tab-count">{count}</span>
              </button>
            ))}
          </div>
          <label className="investor-watchlists-search investor-portfolios-search">
            <svg className="investor-portfolios-search-icon" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M8.5 3a5.5 5.5 0 0 1 4.33 8.84l3.38 3.38a.75.75 0 1 1-1.06 1.06l-3.38-3.38A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                fill="currentColor"
              />
            </svg>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={tab === "suggested" ? "Filter by company, sector, or reason" : "Filter by name or owner"}
            />
          </label>
        </div>

        {tab === "suggested" ? (
          <div className="investor-watchlists-table investor-portfolios-table investor-suggested-table" role="table" aria-label="Suggested thesis matches">
            <div className="investor-suggested-table-head investor-portfolios-table-head" role="row">
              <span role="columnheader">Company</span>
              <span role="columnheader">Score</span>
              <span role="columnheader">Why</span>
              <span role="columnheader">Timing</span>
              <span role="columnheader">Actions</span>
            </div>
            <div className="investor-watchlists-table-body" role="rowgroup">
              {visibleSuggestions.length === 0 ? (
                <p className="investor-watchlists-empty">No suggestions in this view.</p>
              ) : (
                visibleSuggestions.map(company => (
                  <div key={company.id} className="investor-suggested-table-row investor-portfolios-row" role="row">
                    <span role="cell" className="investor-suggested-table-company">
                      <button type="button" className="investor-suggested-table-identity" onClick={() => onOpenCompany(company)}>
                        <PortfolioCompanyLogo company={company} size="sm" />
                        <span>
                          <strong>{company.displayName}</strong>
                          <em>{company.stage} · {company.sector} · {company.geography}</em>
                        </span>
                      </button>
                    </span>
                    <span role="cell" className="investor-suggested-table-score">
                      <b>{formatSuggestionScore(company.matchScore)}</b>
                    </span>
                    <span role="cell" className="investor-suggested-table-why">{company.matchReason}</span>
                    <span role="cell" className="investor-suggested-table-timing">{company.timing}</span>
                    <span role="cell" className="investor-suggested-table-actions">
                      <button
                        type="button"
                        className={`investor-suggested-primary${watchlistIds.includes(company.id) ? " is-done" : ""}`}
                        disabled={watchlistIds.includes(company.id)}
                        onClick={() => {
                          setWatchlistIds(previous => (
                            previous.includes(company.id) ? previous : [...previous, company.id]
                          ));
                        }}
                      >
                        {watchlistIds.includes(company.id) ? "On watchlist" : "Add to watchlist"}
                      </button>
                      <button
                        type="button"
                        className="investor-suggested-ghost"
                        onClick={() => {
                          setHiddenIds(previous => (
                            previous.includes(company.id) ? previous : [...previous, company.id]
                          ));
                        }}
                      >
                        Not interested
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="investor-watchlists-table investor-portfolios-table" role="table" aria-label="Watchlists">
            <div className="investor-watchlists-table-head investor-portfolios-table-head" role="row">
              <span role="columnheader">Name</span>
              <span role="columnheader">Companies</span>
              <span role="columnheader">Owner</span>
              <span role="columnheader">Scope</span>
              <span role="columnheader">Updated</span>
              <span role="columnheader">Digest</span>
              <span role="columnheader" className="investor-watchlists-actions-col">Actions</span>
              <span role="columnheader" className="investor-watchlists-star-col investor-portfolios-star-col" aria-label="Starred">
                <span className="sr-only">Starred</span>
              </span>
            </div>
            <div className="investor-watchlists-table-body" role="rowgroup">
              {filteredLists.length === 0 ? (
                <p className="investor-watchlists-empty">No watchlists in this view.</p>
              ) : (
                filteredLists.map(row => {
                  const previewChips = watchlistPreviewChips(row);
                  const entryCount = watchlistEntryCount(row);
                  return (
                  <div key={row.id} className="investor-watchlists-row investor-portfolios-row" role="row">
                    <span role="cell" className="investor-portfolios-name-cell">
                      <button
                        type="button"
                        className="investor-portfolio-list-name investor-portfolios-list-name"
                        onClick={() => setActiveId(row.id)}
                      >
                        <strong className="investor-watchlists-name">{row.name}</strong>
                      </button>
                    </span>
                    <span role="cell" className="investor-watchlists-companies investor-portfolios-companies">
                      {previewChips.length > 0 ? (
                        <span className="investor-watchlists-logo-stack investor-portfolios-logo-stack" aria-hidden="true">
                          {previewChips.map(chip => (
                            <PortfolioCompanyChipLogo
                              key={`${row.id}-${chip.name}`}
                              chip={chip}
                            />
                          ))}
                        </span>
                      ) : null}
                      {entryCount > 0 ? (
                        <span
                          className="investor-portfolios-company-count"
                          aria-label={`${entryCount} compan${entryCount === 1 ? "y" : "ies"}`}
                        >
                          <strong>{entryCount}</strong>
                          <span>{entryCount === 1 ? "company" : "companies"}</span>
                        </span>
                      ) : (
                        <span className="investor-portfolios-company-count is-empty">—</span>
                      )}
                    </span>
                    <span role="cell" className="investor-watchlists-owner investor-portfolios-owner">
                      <strong>{row.ownerName}</strong>
                      {row.ownerEmail ? <em>{row.ownerEmail}</em> : null}
                    </span>
                    <span role="cell">
                      <span className="investor-portfolio-detail-pill investor-portfolios-scope-pill">{row.scope}</span>
                    </span>
                    <span role="cell" className="investor-watchlists-updated investor-portfolios-updated">{row.updatedAt}</span>
                    <span role="cell">
                      <label className="investor-watchlists-digest investor-portfolios-digest">
                        <span className="sr-only">Digest for {row.name}</span>
                        <select
                          value={digestById[row.id] ?? row.digest}
                          onChange={event => {
                            const value = event.target.value as WatchlistRow["digest"];
                            setDigestById(previous => ({ ...previous, [row.id]: value }));
                          }}
                        >
                          <option value="Off">Off</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Daily">Daily</option>
                        </select>
                      </label>
                    </span>
                    <span role="cell" className="investor-watchlists-actions-col">
                      <div className="investor-watchlist-row-actions">
                        <button
                          type="button"
                          className="investor-watchlist-row-action"
                          aria-label={`Edit ${row.name}`}
                          onClick={() => {
                            setCreating(false);
                            setEditingId(row.id);
                            setEditDraft(buildWatchlistEditDraft(row));
                          }}
                        >
                          <WatchlistEditIcon />
                        </button>
                        <button
                          type="button"
                          className="investor-watchlist-row-action is-delete"
                          aria-label={`Delete ${row.name}`}
                          onClick={() => {
                            if (window.confirm(`Delete "${row.name}"? This cannot be undone.`)) {
                              deleteWatchlist(row.id);
                            }
                          }}
                        >
                          <WatchlistDeleteIcon />
                        </button>
                      </div>
                    </span>
                    <span role="cell" className="investor-watchlists-star-col investor-portfolios-star-col">
                      <button
                        type="button"
                        className={`investor-watchlists-star investor-portfolios-star${starredIds.includes(row.id) ? " is-on" : ""}`}
                        aria-label={starredIds.includes(row.id) ? `Unstar ${row.name}` : `Star ${row.name}`}
                        onClick={() => {
                          setStarredIds(previous => (
                            previous.includes(row.id)
                              ? previous.filter(id => id !== row.id)
                              : [...previous, row.id]
                          ));
                        }}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path
                            d="M10 3.2 11.9 7.4 16.4 7.9 13.2 11 14.1 15.5 10 13.2 5.9 15.5 6.8 11 3.6 7.9 8.1 7.4 10 3.2Z"
                            fill={starredIds.includes(row.id) ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </span>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {editingId && editDraft ? (
        <WatchlistEditModal
          open
          watchlistName={watchlists.find(row => row.id === editingId)?.name ?? "Watchlist"}
          draft={editDraft}
          onChange={setEditDraft}
          onSave={() => saveWatchlistEdit(editingId, editDraft)}
          onClose={closeEditWatchlist}
        />
      ) : null}
    </section>
  );
}

function resolvePipelineCompany(deal: PipelineDeal): InvestorCompanyRef {
  const known = INVESTOR_PORTFOLIO.find(item => item.id === deal.companyId)
    ?? SUGGESTED_FOUNDERS.find(item => item.id === deal.companyId);
  if (known) return known;
  return {
    id: deal.companyId,
    name: deal.companyId,
    displayName: deal.company,
    domain: deal.domain ?? `${deal.companyId}.com`,
    logo: deal.logo,
    logoBg: deal.logoBg,
    logoUrl: buildCompanyLogoAssetUrl(deal.company),
    meta: deal.category ?? "Pipeline deal",
    headquarters: "—",
    employees: "—",
    linkedin: "",
    onFuel: deal.onFuel,
  };
}

function openPipelineDeal(
  deal: PipelineDeal,
  onOpenCompany: (company: InvestorCompanyRef) => void,
) {
  onOpenCompany(resolvePipelineCompany(deal));
}

function PipelineDealCard({
  deal,
  onOpen,
}: {
  deal: PipelineDeal;
  onOpen: () => void;
}) {
  const secondary = deal.domain
    ? deal.domain
    : deal.category
      ? deal.category
      : "MISSING DOMAIN";
  const secondaryTone = deal.domain ? "domain" : "warn";
  const showLogo = Boolean(deal.domain) || deal.onFuel;

  return (
    <button
      type="button"
      className={`investor-pipeline-card${deal.onFuel ? " is-on-fuel" : ""}`}
      onClick={onOpen}
    >
      <span className="investor-pipeline-card-top">
        <span className="investor-pipeline-card-identity">
          {showLogo ? (
            <PortfolioCompanyLogo
              company={resolvePipelineCompany(deal)}
              size="sm"
            />
          ) : null}
          <strong>{deal.company}</strong>
        </span>
        <span className="investor-pipeline-card-meta">
          {deal.amount ? <b>{deal.amount}</b> : null}
          {deal.redFlag ? (
            <span className="investor-pipeline-flag" title="Needs attention" aria-label="Needs attention">❋</span>
          ) : null}
        </span>
      </span>
      <span className={`investor-pipeline-card-secondary investor-pipeline-card-secondary--${secondaryTone}`}>
        {secondary}
      </span>
      <span className="investor-pipeline-card-close">close · {deal.closeDate}</span>
    </button>
  );
}

function DealPipelineSection({
  activeBoardId,
  setActiveBoardId,
  onOpenCompany,
}: {
  activeBoardId: PipelineBoardId;
  setActiveBoardId: (id: PipelineBoardId) => void;
  onOpenCompany: (company: InvestorCompanyRef) => void;
}) {
  const deals = useMemo(() => dealsForBoard(activeBoardId), [activeBoardId]);
  const board = PIPELINE_BOARDS.find(item => item.id === activeBoardId) ?? PIPELINE_BOARDS[0];
  const summary = useMemo(() => summarizePipeline(deals), [deals]);

  return (
    <section className="investor-pipeline-page">
      <div className="investor-pipeline-tabs" role="tablist" aria-label="Pipelines">
        {PIPELINE_BOARDS.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === activeBoardId}
            className={item.id === activeBoardId ? "is-active" : ""}
            onClick={() => setActiveBoardId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <header className="investor-pipeline-page-head">
        <div>
          <h1>{board.label}</h1>
          <p>
            {summary.dealCount} deals · {summary.totalLabel} total · {summary.syncedLabel}
          </p>
        </div>
        <div className="investor-pipeline-page-actions">
          <button type="button" className="investor-section-view-more">
            Manage pipelines <span aria-hidden="true">→</span>
          </button>
          <span className="investor-hubspot-badge">hubspot</span>
        </div>
      </header>

      <div className="investor-pipeline-board-scroll">
        <div className="investor-pipeline-board">
          {PIPELINE_STAGES.map(stage => {
            const stageDeals = deals.filter(deal => deal.stage === stage.id);
            const total = stageDealTotal(stageDeals);
            return (
              <div className="investor-pipeline-col" key={stage.id}>
                <div className="investor-pipeline-col-head">
                  <div className="investor-pipeline-col-title">
                    <strong>{stage.label}</strong>
                    <em>{stageDeals.length}</em>
                  </div>
                  {total ? <span className="investor-pipeline-col-total">{total}</span> : null}
                </div>
                <div className="investor-pipeline-col-cards">
                  {stageDeals.length === 0 ? (
                    <p className="investor-pipeline-empty">No deals</p>
                  ) : (
                    stageDeals.map(deal => (
                      <PipelineDealCard
                        key={deal.id}
                        deal={deal}
                        onOpen={() => onOpenCompany(resolvePipelineCompany(deal))}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PortfolioCompanyRow({
  company,
  rank,
  onOpenProfile,
  compact = false,
}: {
  company: PortfolioCompanyView;
  rank: number;
  onOpenProfile: () => void;
  compact?: boolean;
}) {
  const growthLabel = formatGrowthRate(company.arrGrowthQoQ);
  const returnLabel = formatUsdCompact(company.estimatedValue);
  const moicClass = moicTier(company.moic);

  return (
    <div
      className={`investor-portfolio-table-row${company.urgentFlag ? " is-flagged" : ""}`}
      role="row"
    >
      {!compact ? (
        <span className="investor-portfolio-cell investor-portfolio-col-rank" role="cell">
          <span className="investor-portfolio-rank">{rank}</span>
        </span>
      ) : null}

      <span className="investor-portfolio-cell investor-portfolio-cell-company" role="cell">
        <button
          type="button"
          className="investor-portfolio-company-btn"
          onClick={onOpenProfile}
          aria-label={`Open profile for ${company.displayName}`}
        >
          <PortfolioCompanyLogo company={company} size="sm" />
          <span className="investor-rank-identity">
            <span className="investor-rank-name-row">
              <strong>{company.displayName}</strong>
              {company.urgentFlag ? (
                <span className="investor-urgent-dot" title={company.urgentFlag.label} aria-label={company.urgentFlag.label} />
              ) : null}
            </span>
            <em>{company.ownership} ownership · {company.sector}</em>
          </span>
        </button>
      </span>

      <span className="investor-portfolio-cell" role="cell">
        <span className="investor-portfolio-stage-pill">{company.stage}</span>
      </span>

      {compact ? (
        <>
          <span className="investor-portfolio-cell" role="cell">
            <span className={`investor-portfolio-moic-badge is-${moicClass}`}>{formatMoic(company.moic)}</span>
          </span>
          <span className="investor-portfolio-cell" role="cell">
            <strong>
              {company.arr}{" "}
              <span className={`investor-growth investor-growth--${company.qoqMovement}`}>{growthLabel}</span>
            </strong>
          </span>
          <span className="investor-portfolio-cell investor-portfolio-cell-qoq" role="cell">
            <QoqArrow movement={company.qoqMovement} />
          </span>
        </>
      ) : (
        <>
          <span className="investor-portfolio-cell" role="cell">
            <strong>{company.invested}</strong>
          </span>
          <span className="investor-portfolio-cell" role="cell">
            <strong>{returnLabel}</strong>
          </span>
          <span className="investor-portfolio-cell" role="cell">
            <span className={`investor-portfolio-moic-badge is-${moicClass}`}>{formatMoic(company.moic)}</span>
          </span>
          <span className="investor-portfolio-cell" role="cell">
            <strong>
              {company.arr}{" "}
              <span className={`investor-growth investor-growth--${company.qoqMovement}`}>{growthLabel}</span>
            </strong>
          </span>
          <span className="investor-portfolio-cell" role="cell">
            <strong className={company.runwayMonths < 6 ? "is-flagged" : undefined}>{company.runway}</strong>
          </span>
          <span className="investor-portfolio-cell" role="cell">
            <strong>{company.investedAt}</strong>
          </span>
          <span className="investor-portfolio-cell investor-portfolio-cell-qoq" role="cell">
            <QoqArrow movement={company.qoqMovement} />
          </span>
        </>
      )}
    </div>
  );
}
