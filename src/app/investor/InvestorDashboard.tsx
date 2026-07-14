import React, { useMemo, useState } from "react";
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
  INVESTOR_WATCHLISTS,
  PIPELINE_BOARDS,
  PIPELINE_STAGES,
  SUGGESTED_FOUNDERS,
  buildDemographicAllocation,
  buildInvestorFundSummary,
  buildPortfolioBenchmarkSummary,
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
  type PortfolioBenchmarkMetric,
  type PortfolioBenchmarkSummary,
  type PortfolioCompanyView,
  type PortfolioListDigest,
  type PortfolioListRow,
  type PortfolioListScope,
  type QoqMovement,
  type SectorAllocationSlice,
  type SuggestedFounder,
  type WatchlistRow,
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
  onOpenAccount,
  onNavigateSection,
}: {
  fundName?: string;
  section?: InvestorDashboardSection;
  hubspotConnected?: boolean;
  onOpenCompany: (company: InvestorCompanyRef) => void;
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
        <PortfoliosPage onOpenCompany={onOpenCompany} />
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
  onOpenAccount,
  onNavigateSection,
}: {
  fundName: string;
  summary: ReturnType<typeof buildInvestorFundSummary>;
  hubspotConnected: boolean;
  hubspotConnecting: boolean;
  onConnectHubSpot: () => void;
  onOpenCompany: (company: InvestorCompanyRef) => void;
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
      <header className="investor-home-head">
        <div>
          <span className="investor-dashboard-eyebrow">Investor workspace</span>
          <h1>{greetingForHour()}, {fundName}</h1>
          <p>Pulse of your fund — open any module for the full workspace.</p>
        </div>
        <button type="button" className="investor-dashboard-account-btn" onClick={onOpenAccount}>
          Account settings
        </button>
      </header>

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

      <article className="overview-panel investor-home-widget investor-home-widget-wide">
        <div className="overview-panel-head investor-home-widget-head">
          <span>Portfolio</span>
          <SectionViewMore label="View all" onClick={() => onNavigateSection?.("portfolios")} />
        </div>
        <PortfolioCompaniesTable
          companies={ranked.slice(0, 3)}
          onOpenCompany={onOpenCompany}
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
            stroke="rgba(38, 57, 71, 0.95)"
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
      fill="rgb(244, 246, 248)"
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
      fill="rgb(244, 246, 248)"
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
            <CartesianGrid horizontal={false} stroke="rgb(38, 57, 71)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatUsdCompact(value)}
              tick={{ fill: "rgb(138, 153, 166)", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="region"
              width={118}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgb(244, 246, 248)", fontSize: 13, fontWeight: 700 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
              content={<DemographicTooltip />}
            />
            <Bar dataKey="amount" radius={[0, 8, 8, 0]} maxBarSize={28} background={{ fill: "rgba(38, 57, 71, 0.45)", radius: [0, 8, 8, 0] }}>
              {data.map((slice, index) => (
                <Cell
                  key={slice.region}
                  fill={index === 0 ? "var(--fuel-accent, #00B48A)" : slice.color}
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

function PortfolioBenchmarkChart({ metric }: { metric: PortfolioBenchmarkMetric }) {
  const trendGlyph = metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→";
  const bandWidth = Math.max(4, metric.bandEnd - metric.bandStart);

  return (
    <article className="investor-bench-card">
      <div className="investor-bench-card-head">
        <div>
          <strong>
            {metric.label}{" "}
            <em className="investor-bench-n">n={metric.sampleSize}</em>
          </strong>
          {metric.hint ? <em>{metric.hint}</em> : null}
        </div>
        <div className="investor-bench-card-stats">
          <span>
            <em>cohort p50</em>
            <b>{metric.cohortP50Label}</b>
          </span>
          <span>
            <em>portfolio</em>
            <b>
              {metric.portfolioLabel} <i aria-hidden="true">{trendGlyph}</i>
            </b>
          </span>
        </div>
      </div>

      <div
        className="investor-bench-track"
        role="img"
        aria-label={`${metric.label}: portfolio ${metric.portfolioLabel} vs cohort ${metric.cohortP50Label}`}
      >
        <div
          className="investor-bench-track-band"
          title="P25–P90 — where most of your peer cohort falls"
          style={{ left: `${metric.bandStart}%`, width: `${bandWidth}%` }}
        />
        <div
          className="investor-bench-track-median"
          style={{ left: `${metric.portfolioPosition}%` }}
          title={`Portfolio median ${metric.portfolioLabel}`}
        />
        {metric.dots.map(dot => (
          <span
            key={dot.id}
            className="investor-bench-track-dot"
            style={{ left: `${dot.position}%`, background: dot.color }}
            title={`${dot.name}`}
          />
        ))}
      </div>
    </article>
  );
}

function PortfolioBenchmarkSection({ summary }: { summary: PortfolioBenchmarkSummary }) {
  return (
    <section className="investor-bench-section" aria-label="Benchmark distribution">
      <div className="investor-bench-section-head">
        <div>
          <span>Benchmark distribution</span>
          <h2>How the portfolio stacks up</h2>
          <p>
            Each dot represents a company&apos;s latest reading on this signal. Dash and arrows show
            current values vs the prior period. Hover dots for details.
          </p>
        </div>
        <label className="investor-bench-filter">
          <span className="sr-only">Cohort filter</span>
          <select defaultValue={summary.filterLabel} aria-label="Filter cohort">
            <option>{summary.filterLabel}</option>
            <option>B2B SaaS · Seed · US · Year 1</option>
            <option>B2B SaaS · Series A · US · Year 2</option>
          </select>
        </label>
      </div>

      <div className="investor-bench-tiles">
        <article className="overview-metric-card investor-bench-tile">
          <span>Total leaders (P75+)</span>
          <strong>
            {summary.leadersCount}/{summary.leadersDenom}
          </strong>
          <em>Metrics where the portfolio median is over the cohort.</em>
        </article>
        <article className="overview-metric-card investor-bench-tile">
          <span>Top performer</span>
          <strong>{summary.topPerformer}</strong>
          <em>Leader in {summary.topPerformerBenchmarks} benchmarks.</em>
        </article>
        <article className="overview-metric-card investor-bench-tile">
          <span>Total quartiles</span>
          <strong>{summary.totalQuartiles}</strong>
          <em>Top, upper, lower, bottom.</em>
        </article>
      </div>

      <div className="investor-bench-grid">
        {summary.metrics.map(metric => (
          <PortfolioBenchmarkChart key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}

function PortfoliosPage({
  onOpenCompany,
}: {
  onOpenCompany: (company: InvestorCompanyRef) => void;
}) {
  const [lists, setLists] = useState<PortfolioListRow[]>(() => [...INVESTOR_PORTFOLIO_LISTS]);
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
  const [draftScope, setDraftScope] = useState<PortfolioListScope>("Account");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingCompanies, setAddingCompanies] = useState(false);

  const activeList = lists.find(row => row.id === activeId) ?? null;

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

  const availableToAdd = useMemo(() => {
    if (!activeList) return [];
    const taken = new Set(activeList.companyIds);
    return INVESTOR_PORTFOLIO.filter(company => !taken.has(company.id));
  }, [activeList]);

  function createPortfolio() {
    const name = draftName.trim();
    if (!name) return;
    const id = `pf-${Date.now()}`;
    const next: PortfolioListRow = {
      id,
      name,
      meta: "portfolio",
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
        { logo: company.logo, logoBg: company.logoBg, name: company.displayName },
      ].slice(0, 4);
      return {
        ...row,
        companyIds,
        companies,
        companyCount: companyIds.length,
        updatedAt: "Just now",
      };
    }));
  }

  if (activeList) {
    const benchmarks = buildPortfolioBenchmarkSummary(activeList);
    return (
      <section className="investor-watchlists-page investor-portfolios-page">
        <header className="investor-watchlists-page-head">
          <div>
            <button type="button" className="investor-portfolio-back" onClick={() => {
              setActiveId(null);
              setAddingCompanies(false);
            }}>
              ← All portfolios
            </button>
            <h1>{activeList.name}</h1>
            <p>{activeList.meta} · {activeList.companyCount} compan{activeList.companyCount === 1 ? "y" : "ies"}</p>
          </div>
          <button
            type="button"
            className="investor-suggested-primary investor-watchlists-new-btn"
            onClick={() => setAddingCompanies(true)}
          >
            + Add companies
          </button>
        </header>

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
          <PortfolioBenchmarkSection summary={benchmarks} />
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
          <article className="overview-panel">
            <div className="overview-panel-head">
              <span>Companies</span>
              <em>Ranked by MOIC</em>
            </div>
            <PortfolioCompaniesTable companies={detailCompanies} onOpenCompany={onOpenCompany} />
          </article>
        )}
      </section>
    );
  }

  return (
    <section className="investor-watchlists-page investor-portfolios-page">
      <header className="investor-watchlists-page-head">
        <div>
          <h1>Portfolios</h1>
          <p>Companies in your funds, tracked per-fund with signal digests</p>
        </div>
        <button
          type="button"
          className="investor-suggested-primary investor-watchlists-new-btn"
          onClick={() => setCreating(true)}
        >
          + New portfolio
        </button>
      </header>

      {creating ? (
        <article className="overview-panel investor-portfolio-create">
          <div className="overview-panel-head">
            <span>New portfolio</span>
            <button type="button" className="investor-section-view-more" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
          <p>Create the category first. You can add companies right after.</p>
          <div className="investor-portfolio-create-fields">
            <label>
              <em>Name</em>
              <input
                value={draftName}
                onChange={event => setDraftName(event.target.value)}
                placeholder="e.g. Seed Fund"
                autoFocus
              />
            </label>
            <label>
              <em>Scope</em>
              <select
                value={draftScope}
                onChange={event => setDraftScope(event.target.value as PortfolioListScope)}
              >
                <option value="Account">Account</option>
                <option value="Personal">Personal</option>
              </select>
            </label>
          </div>
          <button
            type="button"
            className="investor-suggested-primary"
            disabled={!draftName.trim()}
            onClick={createPortfolio}
          >
            Create portfolio →
          </button>
        </article>
      ) : null}

      <div className="investor-watchlists-toolbar">
        <div className="investor-watchlists-tabs" role="tablist" aria-label="Portfolio filters">
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
              {label} <em>({count})</em>
            </button>
          ))}
        </div>
        <label className="investor-watchlists-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Filter by name or owner"
          />
        </label>
      </div>

      <div className="investor-watchlists-table" role="table" aria-label="Portfolios">
        <div className="investor-watchlists-table-head" role="row">
          <span role="columnheader">Name</span>
          <span role="columnheader">Companies</span>
          <span role="columnheader">Owner</span>
          <span role="columnheader">Scope</span>
          <span role="columnheader">Updated</span>
          <span role="columnheader">Digest</span>
          <span role="columnheader" className="investor-watchlists-star-col"> </span>
        </div>
        <div className="investor-watchlists-table-body" role="rowgroup">
          {filteredLists.length === 0 ? (
            <p className="investor-watchlists-empty">No portfolios in this view.</p>
          ) : (
            filteredLists.map(row => (
              <div key={row.id} className="investor-watchlists-row" role="row">
                <span role="cell">
                  <button
                    type="button"
                    className="investor-portfolio-list-name"
                    onClick={() => setActiveId(row.id)}
                  >
                    <strong className="investor-watchlists-name">{row.name}</strong>
                    <em>· {row.meta}</em>
                  </button>
                </span>
                <span role="cell" className="investor-watchlists-companies">
                  <em>{row.companyCount}</em>
                  {row.companies.length > 0 ? (
                    <span className="investor-watchlists-logo-stack" aria-hidden="true">
                      {row.companies.slice(0, 4).map(chip => (
                        <span
                          key={`${row.id}-${chip.name}`}
                          className="investor-company-logo investor-company-logo--xs"
                          style={{ background: chip.logoBg }}
                          title={chip.name}
                        >
                          {chip.logo}
                        </span>
                      ))}
                      {row.companyCount > row.companies.length ? (
                        <span className="investor-portfolio-more-chip">+{row.companyCount - row.companies.length}</span>
                      ) : null}
                    </span>
                  ) : null}
                </span>
                <span role="cell" className="investor-watchlists-owner">
                  <strong>{row.ownerName}</strong>
                  {row.ownerEmail ? <em>{row.ownerEmail}</em> : null}
                </span>
                <span role="cell">
                  <span className="investor-watchlists-scope">{row.scope}</span>
                </span>
                <span role="cell" className="investor-watchlists-updated">{row.updatedAt}</span>
                <span role="cell">
                  <label className="investor-watchlists-digest">
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
                <span role="cell" className="investor-watchlists-star-col">
                  <button
                    type="button"
                    className={`investor-watchlists-star${starredIds.includes(row.id) ? " is-on" : ""}`}
                    aria-label={starredIds.includes(row.id) ? `Unstar ${row.name}` : `Star ${row.name}`}
                    onClick={() => {
                      setStarredIds(previous => (
                        previous.includes(row.id)
                          ? previous.filter(id => id !== row.id)
                          : [...previous, row.id]
                      ));
                    }}
                  >
                    {starredIds.includes(row.id) ? "★" : "☆"}
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function PortfolioCompaniesTable({
  companies,
  onOpenCompany,
  embedded = false,
  compact = false,
}: {
  companies: PortfolioCompanyView[];
  onOpenCompany: (company: InvestorCompanyRef) => void;
  embedded?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`investor-portfolio-table${embedded ? " investor-portfolio-table--embedded" : ""}${compact ? " investor-portfolio-table--compact" : ""}`}
      role="table"
      aria-label="Portfolio companies ranked by MOIC"
    >
      <div className="investor-portfolio-table-head" role="row">
        <span role="columnheader">Company</span>
        <span role="columnheader">Stage</span>
        {compact ? (
          <>
            <span role="columnheader">MOIC</span>
            <span role="columnheader">ARR</span>
            <span role="columnheader">ARR QoQ</span>
          </>
        ) : (
          <>
            <span role="columnheader">Invested</span>
            <span role="columnheader">Return</span>
            <span role="columnheader">MOIC</span>
            <span role="columnheader">ARR</span>
            <span role="columnheader">Runway</span>
            <span role="columnheader">Date</span>
            <span role="columnheader">ARR QoQ</span>
          </>
        )}
      </div>
      <div className="investor-portfolio-table-body" role="rowgroup">
        {companies.map(company => (
          <PortfolioCompanyRow
            key={company.id}
            company={company}
            compact={compact}
            onOpen={() => onOpenCompany(company)}
          />
        ))}
      </div>
    </div>
  );
}

function WatchlistsPage({
  onOpenCompany,
}: {
  onOpenCompany: (company: InvestorCompanyRef) => void;
}) {
  const [tab, setTab] = useState<"all" | "mine" | "shared" | "starred" | "suggested">("all");
  const [query, setQuery] = useState("");
  const [starredIds, setStarredIds] = useState<string[]>(() =>
    INVESTOR_WATCHLISTS.filter(row => row.starred).map(row => row.id),
  );
  const [digestById, setDigestById] = useState<Record<string, WatchlistRow["digest"]>>(() =>
    Object.fromEntries(INVESTOR_WATCHLISTS.map(row => [row.id, row.digest])),
  );
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);

  const filteredLists = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INVESTOR_WATCHLISTS.filter(row => {
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
  }, [query, starredIds, tab]);

  const counts = useMemo(() => ({
    all: INVESTOR_WATCHLISTS.length,
    mine: INVESTOR_WATCHLISTS.filter(row => row.ownerKind === "mine").length,
    shared: INVESTOR_WATCHLISTS.filter(row => row.ownerKind === "shared").length,
    starred: starredIds.length,
    suggested: SUGGESTED_FOUNDERS.filter(company => !hiddenIds.includes(company.id)).length,
  }), [hiddenIds, starredIds]);

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

  return (
    <section className="investor-watchlists-page">
      <header className="investor-watchlists-page-head">
        <div>
          <h1>Watchlists</h1>
          <p>Curated company lists for markets, competitors, and deal flow</p>
        </div>
        <button type="button" className="investor-suggested-primary investor-watchlists-new-btn">
          + New watchlist
        </button>
      </header>

      <div className="investor-watchlists-toolbar">
        <div className="investor-watchlists-tabs" role="tablist" aria-label="Watchlist filters">
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
              {label} <em>({count})</em>
            </button>
          ))}
        </div>
        <label className="investor-watchlists-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={tab === "suggested" ? "Filter by company, sector, or reason" : "Filter by name or owner"}
          />
        </label>
      </div>

      {tab === "suggested" ? (
        <div className="investor-watchlists-table investor-suggested-table" role="table" aria-label="Suggested thesis matches">
          <div className="investor-suggested-table-head" role="row">
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
                <div key={company.id} className="investor-suggested-table-row" role="row">
                  <span role="cell" className="investor-suggested-table-company">
                    <button type="button" className="investor-suggested-table-identity" onClick={() => onOpenCompany(company)}>
                      <span className="investor-company-logo investor-company-logo--sm" style={{ background: company.logoBg }}>
                        {company.logo}
                      </span>
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
        <div className="investor-watchlists-table" role="table" aria-label="Watchlists">
          <div className="investor-watchlists-table-head" role="row">
            <span role="columnheader">Name</span>
            <span role="columnheader">Companies</span>
            <span role="columnheader">Owner</span>
            <span role="columnheader">Scope</span>
            <span role="columnheader">Updated</span>
            <span role="columnheader">Digest</span>
            <span role="columnheader" className="investor-watchlists-star-col"> </span>
          </div>
          <div className="investor-watchlists-table-body" role="rowgroup">
            {filteredLists.length === 0 ? (
              <p className="investor-watchlists-empty">No watchlists in this view.</p>
            ) : (
              filteredLists.map(row => (
                <div key={row.id} className="investor-watchlists-row" role="row">
                  <span role="cell">
                    <strong className="investor-watchlists-name">{row.name}</strong>
                  </span>
                  <span role="cell" className="investor-watchlists-companies">
                    <em>{row.companyCount}</em>
                    {row.companies.length > 0 ? (
                      <span className="investor-watchlists-logo-stack" aria-hidden="true">
                        {row.companies.slice(0, 4).map(chip => (
                          <span
                            key={`${row.id}-${chip.name}`}
                            className="investor-company-logo investor-company-logo--xs"
                            style={{ background: chip.logoBg }}
                            title={chip.name}
                          >
                            {chip.logo}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                  <span role="cell" className="investor-watchlists-owner">
                    <strong>{row.ownerName}</strong>
                    <em>{row.ownerEmail}</em>
                  </span>
                  <span role="cell">
                    <span className="investor-watchlists-scope">{row.scope}</span>
                  </span>
                  <span role="cell" className="investor-watchlists-updated">{row.updatedAt}</span>
                  <span role="cell">
                    <label className="investor-watchlists-digest">
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
                  <span role="cell" className="investor-watchlists-star-col">
                    <button
                      type="button"
                      className={`investor-watchlists-star${starredIds.includes(row.id) ? " is-on" : ""}`}
                      aria-label={starredIds.includes(row.id) ? `Unstar ${row.name}` : `Star ${row.name}`}
                      onClick={() => {
                        setStarredIds(previous => (
                          previous.includes(row.id)
                            ? previous.filter(id => id !== row.id)
                            : [...previous, row.id]
                        ));
                      }}
                    >
                      {starredIds.includes(row.id) ? "★" : "☆"}
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
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
            <span className="investor-company-logo investor-company-logo--sm" style={{ background: deal.logoBg }}>
              {deal.logo}
            </span>
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
  onOpen,
  compact = false,
}: {
  company: PortfolioCompanyView;
  onOpen: () => void;
  compact?: boolean;
}) {
  const growthLabel = formatGrowthRate(company.arrGrowthQoQ);
  const returnLabel = formatUsdCompact(company.estimatedValue);

  return (
    <button
      type="button"
      className={`investor-portfolio-table-row${company.urgentFlag ? " is-flagged" : ""}`}
      role="row"
      onClick={onOpen}
    >
      <span className="investor-portfolio-cell investor-portfolio-cell-company" role="cell">
        <span className="investor-rank-identity">
          <span className="investor-rank-name-row">
            <strong>{company.displayName}</strong>
            {company.urgentFlag ? (
              <span className="investor-urgent-dot" title={company.urgentFlag.label} aria-label={company.urgentFlag.label} />
            ) : null}
          </span>
          <em>{company.ownership} ownership</em>
        </span>
      </span>

      <span className="investor-portfolio-cell" role="cell">
        <strong>{company.stage}</strong>
      </span>

      {compact ? (
        <>
          <span className="investor-portfolio-cell" role="cell">
            <strong>{formatMoic(company.moic)}</strong>
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
            <strong>{formatMoic(company.moic)}</strong>
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
    </button>
  );
}
