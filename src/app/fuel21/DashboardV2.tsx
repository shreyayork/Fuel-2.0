import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  Clock,
  Code2,
  Compass,
  FolderLock,
  Gauge,
  Layers,
  MessageSquareShare,
  Radio,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Target,
} from "lucide-react";
import {
  ConnectorBrandIcon,
  RealDocIcon,
  RealPdfIcon,
  RealXlsIcon,
} from "./BrandIcons.tsx";
import {
  DASHBOARD_MODULES,
  EXECUTIVE_BENCHMARK_METRICS,
  FUEL_BRIEF,
  LATEST_INTELLIGENCE,
  SCORE_CARDS,
  type ExecutiveBenchmarkMetric,
} from "./demoData.ts";
import { OnboardingBenchmarkBar } from "../OnboardingFlow.tsx";
import {
  BENCHMARK_WIZARD_FIELDS,
  formatBenchmarkDisplay,
  getBenchmarkTier,
  getBenchmarkTierStyle,
  valueToMarkerPercent,
} from "../FuelOnboardingChat.tsx";
import { applyCohortPeersToField } from "../benchmarkCohortData.ts";
import {
  type Fuel21DrawerSection,
} from "./Fuel21DetailsDrawer.tsx";
import "./dashboard-v2.css";
import "./dashboard-list-panels.css";

const MODULE_DRAWER_SECTION: Partial<Record<string, Fuel21DrawerSection>> = {
  profile: "profile",
  rd: "dev",
  gtm: "mkt",
  ga: "rev",
  benchmark: "benchmark",
};

const MODULE_ICONS = {
  profile: UserCheck,
  rd: Code2,
  gtm: TrendingUp,
  ga: Building2,
  benchmark: Gauge,
} as const;

const SCORE_ICONS = {
  rd: Code2,
  gtm: TrendingUp,
  ga: Building2,
} as const;

const TRACK_FULL_NAMES: Record<string, string> = {
  rd: "Research & Development",
  gtm: "Go-To-Market",
  ga: "General & Administrative",
};

const BRIEF_POINT_ICONS = [
  CircleDollarSign,
  ShieldCheck,
  Clock,
  Compass,
];

/** Match ScorecardV2 overview track score semantics (green ≥65, amber mid, red critical). */
function scoreToneFromScore(score: number): "good" | "watch" | "bad" {
  if (score >= 65) return "good";
  if (score >= 35) return "watch";
  return "bad";
}

function ExecutiveBenchmarkRow({ metric }: { metric: ExecutiveBenchmarkMetric }) {
  const template = BENCHMARK_WIZARD_FIELDS.find(field => field.key === metric.fieldKey);
  const field = template ? applyCohortPeersToField(template, metric.cohortId) : null;
  if (!field) return null;

  const value = metric.numericValue;
  const marker = valueToMarkerPercent(value, field);
  const display = formatBenchmarkDisplay(value, field.unit);
  const tierStyle = getBenchmarkTierStyle(getBenchmarkTier(value, field));

  return (
    <div className="f21-telemetry-benchmark-row">
      <div className="f21-telemetry-benchmark-row-head">
        <span className="f21-telemetry-label">{field.label}</span>
        <span className="f21-telemetry-val is-inline">{display}</span>
      </div>
      <div className="f21-telemetry-benchmark-track">
        <OnboardingBenchmarkBar
          field={field}
          dotPct={marker}
          dotColorValue={tierStyle.marker}
          glow="none"
          dotHalfPx={5}
        />
        <div className="ob-bench-bar-labels ob-bench-bar-labels--equal f21-telemetry-benchmark-scale">
          {([
            { l: "P25", v: field.p25 },
            { l: "P50", v: field.p50 },
            { l: "P75", v: field.p75 },
            { l: "P90", v: field.p90 },
          ] as const).map(p => (
            <span key={p.l}>
              {p.l} {formatBenchmarkDisplay(p.v, field.unit)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const TRACK_DIAGNOSTICS: Record<
  string,
  {
    score: number;
    statusLabel: string;
    brief: string;
    benefit: string;
  }
> = {
  rd: {
    score: 60,
    statusLabel: "Median",
    brief:
      'Investors and customers read this score as "can they ship?" Raise it before your growth story outruns delivery.',
    benefit: "Ship cadence & backlog prioritization",
  },
  gtm: {
    score: 50,
    statusLabel: "Median",
    brief:
      "This is where runway meets reality. Fix conversion and pipeline quality before you spend more at the top of the funnel.",
    benefit: "Paying customers & defined pipeline",
  },
  ga: {
    score: 75,
    statusLabel: "Above avg",
    brief:
      "Strong finance and operations let you choose between sales and engineering without guessing. Protect this track as you scale.",
    benefit: "Healthy cash in bank & disciplined burn",
  },
};

const INITIATIVES_DATA = [
  {
    track: "R&D",
    trackKey: "rd" as const,
    title: "Build a safer release cadence",
    detail: "Close critical checkout test gaps before the next ship window.",
  },
  {
    track: "GTM",
    trackKey: "gtm" as const,
    title: "Improve the paid growth mix",
    detail: "Rebalance spend toward channels with clearer payback.",
  },
  {
    track: "G&A",
    trackKey: "ga" as const,
    title: "Build a 13-week cash forecast",
    detail: "Give the board a living view of runway and hiring headroom.",
  },
];

const CONNECTORS_DATA = [
  {
    id: "slack" as const,
    name: "Slack",
    status: "Connected",
    activity: "32 channels active · Synced 4m ago",
    metric: "32 active channels",
    syncTime: "Synced 4m ago",
  },
  {
    id: "granola" as const,
    name: "Granola",
    status: "Connected",
    activity: "14 executive meetings · Synced 12m ago",
    metric: "14 exec meetings",
    syncTime: "Synced 12m ago",
  },
  {
    id: "hubspot" as const,
    name: "HubSpot",
    status: "Connected",
    activity: "124 pipeline deals & contacts · Synced 1h ago",
    metric: "124 pipeline deals",
    syncTime: "Synced 1h ago",
  },
];

const DATA_ROOM_DATA = [
  {
    name: "Pitch deck",
    type: "PDF",
    size: "2.4 MB",
    updated: "2d ago",
    badge: "Verified",
    subtitle: "Seed Series Deck · 18p",
  },
  {
    name: "Investor notes",
    type: "DOC",
    size: "1.8 MB",
    updated: "5d ago",
    badge: "Verified",
    subtitle: "Board Memo · Q3 Living",
  },
  {
    name: "Cap table",
    type: "XLS",
    size: "840 KB",
    updated: "1w ago",
    badge: "Verified",
    subtitle: "Financial Model · 13w",
  },
];

const PLAYBOOKS_DATA = [
  {
    title: "Ship with confidence",
    meta: "R&D · Release readiness",
    desc: "Release QA checklists & checkout regression benchmarks for engineering.",
  },
  {
    title: "Tune your acquisition mix",
    meta: "GTM · Channel efficiency",
    desc: "CAC payback rebalancing across outbound pipeline & paid acquisition.",
  },
  {
    title: "Plan your cash runway",
    meta: "G&A · Financial planning",
    desc: "13-week rolling cash model & burn scenario planner for executive runway.",
  },
];

function dataroomFileSlug(name: string, type: string): string {
  const base = name.trim().toLowerCase().replace(/\s+/g, "_");
  const ext = type.toUpperCase() === "DOC" ? "docx" : type.toLowerCase();
  return `${base}.${ext}`;
}

function DashListPanelHead({ title }: { title: string }) {
  return (
    <div className="f21-dash-list-panel-head">
      <h2 className="f21-dash-list-panel-title">{title}</h2>
    </div>
  );
}

function DashListPanelFoot({ label, onAction }: { label: string; onAction: () => void }) {
  return (
    <div className="f21-dash-list-panel-foot f21-v2-track-cta-row">
      <button type="button" className="f21-dash-list-panel-foot-hit" onClick={onAction}>
        <span className="f21-v2-track-cta-btn">
          <span>{label}</span>
          <ArrowRight size={12} strokeWidth={2.0} className="f21-track-cta-arrow" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}

function FileTypeIcon({ type }: { type: string }) {
  if (type === "XLS") return <RealXlsIcon size={22} />;
  if (type === "DOC") return <RealDocIcon size={22} />;
  return <RealPdfIcon size={22} />;
}

function TrackScoreRing({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = compact ? 28 : 30;
  const stroke = compact ? 3.75 : 4.5;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (clamped / 100) * circ;

  return (
    <div
      className={`f21-v2-score-ring${compact ? " f21-v2-score-ring--header" : ""}`}
      aria-hidden="true"
    >
      <svg className="f21-v2-score-ring-svg" viewBox="0 0 72 72" aria-hidden="true">
        <circle className="f21-v2-score-ring-bg" cx="36" cy="36" r={radius} strokeWidth={stroke} fill="none" />
        <circle
          className="f21-v2-score-ring-meter"
          cx="36"
          cy="36"
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="f21-v2-score-ring-core">
        <strong className="f21-v2-score-ring-num">{clamped}</strong>
        <span className="f21-v2-score-ring-denom">/100</span>
      </div>
    </div>
  );
}

function MobileSnap({
  className,
  label,
  fitActive = false,
  children,
}: {
  className: string;
  label: string;
  /** Size the row to the visible slide so a short card does not inherit a taller neighbor. */
  fitActive?: boolean;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const count = Children.count(children);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !fitActive) return;
    const slide = el.children[index] as HTMLElement | undefined;
    if (!slide) return;
    const apply = () => {
      if (!window.matchMedia("(max-width: 820px)").matches) {
        el.style.height = "";
        return;
      }
      const next = `${slide.offsetHeight}px`;
      if (el.style.height !== next) el.style.height = next;
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(slide);
    window.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
      el.style.height = "";
    };
  }, [fitActive, index, count]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const slide = el.firstElementChild as HTMLElement | null;
      if (!slide) return;
      const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
      const step = slide.offsetWidth + gap;
      if (step <= 0) return;
      const next = Math.round(el.scrollLeft / step);
      setIndex(current => {
        const clamped = Math.max(0, Math.min(count - 1, next));
        return current === clamped ? current : clamped;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [count]);

  const goTo = (next: number) => {
    const el = scrollerRef.current;
    const slide = el?.children[next] as HTMLElement | undefined;
    if (!el || !slide) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = slide.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
    setIndex(next);
    el.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="f21-mobile-snap">
      <div ref={scrollerRef} className={`${className}${fitActive ? " f21-snap-fit" : ""}`} aria-label={label}>
        {children}
      </div>
      {count > 1 ? (
        <div className="f21-snap-dots" role="tablist" aria-label={`${label} slides`}>
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${label}, slide ${i + 1} of ${count}`}
              className={i === index ? "is-active" : ""}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type DashboardTrackId = "rd" | "gtm" | "ga";

export type DashboardV2Actions = {
  /** Track card → that track's detail page. */
  onOpenTrack: (track: DashboardTrackId) => void;
  /** Complete-your-profile tiles → details drawer at that section. */
  onOpenProfileModule: (section: Fuel21DrawerSection) => void;
  onViewFullSummary: () => void;
  onOpenBenchmark: () => void;
  onOpenIntelligence: () => void;
  onOpenInitiatives: () => void;
  onOpenDataRoom: () => void;
  onOpenPlaybooks: () => void;
  onOpenConnectors: () => void;
  onSkipProfile?: () => void;
  activeTourTarget?: string;
};

export function DashboardV2({
  onOpenTrack,
  onOpenProfileModule,
  onViewFullSummary,
  onOpenBenchmark,
  onOpenIntelligence,
  onOpenInitiatives,
  onOpenDataRoom,
  onOpenPlaybooks,
  onOpenConnectors,
  onSkipProfile,
  activeTourTarget,
}: DashboardV2Actions) {
  const [isRoadmapSkipped, setIsRoadmapSkipped] = useState(false);

  const trackPulseSection = (
      <MobileSnap className="f21-v2-track-grid" label="Company tracks">
        {SCORE_CARDS.map(card => {
          const ScoreIcon = SCORE_ICONS[card.id] ?? Code2;
          const diag = TRACK_DIAGNOSTICS[card.id] ?? {
            score: card.score,
            statusLabel: "Median",
            brief: "Operational metrics and track diagnostics.",
            benefit: "Active telemetry and baseline stability",
          };
          const fullName = TRACK_FULL_NAMES[card.id] ?? card.label;
          const scoreTone = scoreToneFromScore(diag.score);

          return (
            <button
              key={card.id}
              type="button"
              className={`f21-v2-track-card track-${card.id} is-interactive`}
              data-score-tone={scoreTone}
              onClick={() => onOpenTrack(card.id as DashboardTrackId)}
              aria-label={`Review ${fullName} (${card.label}), score ${diag.score} of 100`}
            >
              <div className="f21-v2-track-top-bar">
                <div className="f21-v2-track-title-row">
                  <span className="f21-v2-track-badge" aria-hidden="true">
                    <ScoreIcon size={15} strokeWidth={2.1} />
                  </span>
                  <div className="f21-v2-track-titles-col">
                    <strong className="f21-v2-track-name">{card.label}</strong>
                    <span className="f21-v2-track-full-name">{fullName}</span>
                  </div>
                  <TrackScoreRing score={diag.score} compact />
                </div>
              </div>

              <div className="f21-v2-track-mid">
                <div className="f21-v2-track-status-slot">
                  <span className="f21-v2-score-status">{diag.statusLabel}</span>
                </div>
                <p className="f21-v2-track-brief">{diag.brief}</p>
              </div>

              <div className="f21-v2-track-cta-row">
                <span className="f21-v2-track-cta-btn">
                  <span>Review {card.label} details</span>
                  <ArrowRight size={12} strokeWidth={2.0} className="f21-track-cta-arrow" aria-hidden="true" />
                </span>
              </div>
            </button>
          );
        })}
      </MobileSnap>
  );

  return (
    <section
      className="overview-tour-page f21-v2-container"
      aria-label="Executive dashboard"
    >
      {/* =====================================================================
          1 — Diagnostic Roadmap (Your 5 Modules) - Top by default with Skip
          ===================================================================== */}
      {!isRoadmapSkipped ? (
        <section
          className={`f21-v2-modules-section f21-complete-profile-panel${activeTourTarget === "recommended-actions" ? " tour-highlight" : ""}`}
          aria-label="Complete your profile"
          data-tour-target="recommended-actions"
        >
          <div className="f21-v2-modules-head">
            <div>
              <h2 className="f21-head-with-icon">
                <span className="f21-sec-icon-wrap sec-modules">
                  <Layers size={15} strokeWidth={1.85} aria-hidden="true" />
                </span>
                Complete your profile
              </h2>
              <p className="f21-section-hint">
                Your first step after signup — work through these five tiles to unlock peer benchmarks and deeper track insights.
              </p>
            </div>
            <button
              type="button"
              className="f21-ghost-btn f21-skip-btn"
              onClick={() => {
                setIsRoadmapSkipped(true);
                onSkipProfile?.();
              }}
              title="Hide complete your profile"
            >
              Skip
            </button>
          </div>

          <MobileSnap className="f21-module-grid" label="Profile steps">
            {DASHBOARD_MODULES.map(mod => {
              const Icon = MODULE_ICONS[mod.id as keyof typeof MODULE_ICONS] ?? Sparkles;
              const statusClass =
                mod.status === "Complete" ? "is-complete" : mod.status === "Not started" ? "is-idle" : "is-progress";
              const statusLabel =
                mod.status === "In progress"
                  ? "In progress"
                  : mod.status === "Not started"
                    ? "Not started"
                    : "Complete";

              return (
                <button
                  key={mod.id}
                  type="button"
                  className={`f21-module-card ${statusClass} mod-${mod.id}`}
                  onClick={() => {
                    const drawerSection = MODULE_DRAWER_SECTION[mod.id];
                    if (drawerSection) onOpenProfileModule(drawerSection);
                  }}
                  style={MODULE_DRAWER_SECTION[mod.id] ? undefined : { cursor: "default" }}
                >
                  <div className="f21-module-card-head">
                    <div className="f21-module-title-row">
                      <span className={`f21-module-icon-wrap mod-${mod.id}`} aria-hidden="true">
                        <Icon size={13} strokeWidth={2} />
                      </span>
                      <strong className="f21-module-title">{mod.title}</strong>
                    </div>
                    <span className={`f21-module-status-pill ${statusClass}`}>
                      {mod.status === "Complete" ? (
                        <CheckCircle2 size={10} strokeWidth={2.0} aria-hidden="true" />
                      ) : mod.status === "In progress" ? (
                        <span className="f21-status-dot is-amber" aria-hidden="true" />
                      ) : (
                        <Circle size={9} strokeWidth={1.8} aria-hidden="true" />
                      )}
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  <div className="f21-module-card-action">
                    <span
                      className="f21-module-progress-count"
                      aria-label={`${mod.answered} of ${mod.total} answered`}
                    >
                      <em>{mod.answered}</em>
                      <span className="f21-module-progress-sep">/</span>
                      {mod.total}
                    </span>
                    <span className="f21-module-cta-btn" aria-hidden="true">
                      <ArrowRight size={14} strokeWidth={2.1} className="f21-cta-arrow" />
                    </span>
                  </div>
                </button>
              );
            })}
          </MobileSnap>
        </section>
      ) : null}

      {trackPulseSection}

      {/* =====================================================================
          3 — AI Executive Synthesis & Live Intelligence (Bento Architecture)
          ===================================================================== */}
      <div className="f21-v2-bento-grid">
        {/* Left: AI Executive Brief */}
        <section
          className={`f21-panel f21-v2-brief-card${activeTourTarget === "ai-advisor" ? " tour-highlight" : ""}`}
          aria-label="AI executive brief"
          data-tour-target="ai-advisor"
        >
          <div className="f21-v2-brief-meta-head">
            <div className="f21-head-title-wrap">
              <h2 className="f21-head-with-icon">
                <span className="f21-sec-icon-wrap sec-brief">
                  <Sparkles size={14} strokeWidth={1.85} aria-hidden="true" />
                </span>
                Fuel Executive Brief
              </h2>
            </div>
          </div>

          <div className="f21-v2-narrative-wrap">
            {FUEL_BRIEF.executiveLeads.map(lead => (
              <p key={lead} className="f21-v2-narrative-lead">
                {lead}
              </p>
            ))}
            <ul className="f21-v2-narrative-bullets">
              {FUEL_BRIEF.executiveBullets.map(point => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="f21-v2-brief-footer">
            <button type="button" className="f21-v2-btn-view-summary" onClick={onViewFullSummary}>
              <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
              <span>View full summary</span>
              <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* Right: Benchmark — cohort progress bars */}
        <section className="f21-panel f21-intel-panel f21-telemetry-panel" aria-label="Benchmark">
          <div className="f21-panel-head">
            <div className="f21-head-title-wrap">
              <h2 className="f21-head-with-icon">
                <span className="f21-sec-icon-wrap sec-intel">
                  <Radio size={14} strokeWidth={1.85} aria-hidden="true" />
                </span>
                Benchmark
              </h2>
            </div>
          </div>

          <div className="f21-telemetry-benchmark-list">
            {EXECUTIVE_BENCHMARK_METRICS.slice(0, 3).map(metric => (
              <ExecutiveBenchmarkRow key={metric.fieldKey} metric={metric} />
            ))}
          </div>

          <div className="f21-telemetry-panel-foot f21-v2-track-cta-row">
            <button
              type="button"
              className="f21-telemetry-panel-more-hit"
              onClick={onOpenBenchmark}
            >
              <span className="f21-v2-track-cta-btn">
                <span>View more</span>
                <ArrowRight size={12} strokeWidth={2.0} className="f21-track-cta-arrow" aria-hidden="true" />
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* =====================================================================
          4 — List hub: Intelligence, Initiatives, Data room, Playbooks, Connectors
          ===================================================================== */}
      <div className="f21-v2-list-hub" aria-label="Workspace lists">
        <section className="f21-dash-list-panel f21-dash-list-panel--intel" aria-label="Latest intelligence">
          <DashListPanelHead title="Latest intelligence" />
          <div className="f21-dash-list">
            {LATEST_INTELLIGENCE.map(row => (
              <div key={row.label} className="f21-dash-intel-row">
                <span className="f21-dash-intel-label">{row.label}</span>
                <span className="f21-dash-intel-value">{row.value}</span>
              </div>
            ))}
          </div>
          <DashListPanelFoot label="View all" onAction={onOpenIntelligence} />
        </section>

        <section className="f21-dash-list-panel f21-dash-list-panel--initiatives" aria-label="Initiatives">
          <DashListPanelHead title="Initiatives" />
          <div className="f21-dash-list">
            {INITIATIVES_DATA.map(item => {
              const TrackIcon = SCORE_ICONS[item.trackKey] ?? Target;
              return (
                <div key={item.title} className="f21-dash-initiative-row">
                  <div className="f21-dash-initiative-copy">
                    <span className={`f21-track-pill track-${item.trackKey}`}>
                      <TrackIcon size={11} strokeWidth={1.85} aria-hidden="true" />
                      <span>{item.track}</span>
                    </span>
                    <div className="f21-dash-list-row-main">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="f21-dash-initiative-review"
                    onClick={onOpenInitiatives}
                    aria-label={`Review ${item.title}`}
                  >
                    <span>Review</span>
                    <ArrowRight size={12} strokeWidth={2} className="f21-track-cta-arrow" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
          <DashListPanelFoot label="View all" onAction={onOpenInitiatives} />
        </section>

        <section className="f21-dash-list-panel f21-dash-list-panel--dataroom" aria-label="Data room">
          <DashListPanelHead title="Data room" />
          <div className="f21-dash-list">
            {DATA_ROOM_DATA.map(file => (
              <button
                key={file.name}
                type="button"
                className="f21-dash-list-row f21-dash-dataroom-row"
                onClick={onOpenDataRoom}
                aria-label={`Open ${file.name}`}
              >
                <span className={`f21-file-badge type-${file.type.toLowerCase()}`} aria-hidden="true">
                  <FileTypeIcon type={file.type} />
                </span>
                <span className="f21-dash-list-row-main">
                  <strong>{file.name}</strong>
                  <span>{dataroomFileSlug(file.name, file.type)}</span>
                </span>
                <ArrowUpRight size={14} strokeWidth={2} className="f21-dash-dataroom-open" aria-hidden="true" />
              </button>
            ))}
          </div>
          <DashListPanelFoot label="View all" onAction={onOpenDataRoom} />
        </section>

        <section className="f21-dash-list-panel f21-dash-list-panel--playbooks" aria-label="Playbook suggestions">
          <DashListPanelHead title="Playbook suggestions" />
          <div className="f21-dash-list">
            {PLAYBOOKS_DATA.map(item => (
              <button
                key={item.title}
                type="button"
                className="f21-dash-list-row f21-dash-playbook-row"
                onClick={onOpenPlaybooks}
                aria-label={`Open playbook ${item.title}`}
              >
                <span className="f21-dash-list-row-main">
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </span>
                <ArrowRight size={14} strokeWidth={2} className="f21-dash-row-chevron" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="f21-dash-list-panel f21-dash-list-panel--connectors" aria-label="Connectors">
          <DashListPanelHead title="Connectors" />
          <div className="f21-dash-list">
            {CONNECTORS_DATA.map(c => (
              <button
                key={c.id}
                type="button"
                className="f21-dash-list-row f21-dash-connector-row"
                onClick={onOpenConnectors}
                aria-label={`${c.name} connector`}
              >
                <span className={`f21-dash-connector-mark brand-${c.id}`} aria-hidden="true">
                  <ConnectorBrandIcon brand={c.id} size={20} />
                </span>
                <span className="f21-dash-list-row-main">
                  <strong>{c.name}</strong>
                </span>
                <span className="f21-dash-connector-status">
                  <span className="f21-status-dot" aria-hidden="true" />
                  {c.status}
                </span>
              </button>
            ))}
            <button
              type="button"
              className="f21-dash-list-row f21-dash-connector-row"
              onClick={onOpenConnectors}
              aria-label="Upload files"
            >
              <span className="f21-dash-connector-mark" aria-hidden="true">
                <FolderLock size={16} strokeWidth={1.85} />
              </span>
              <span className="f21-dash-list-row-main">
                <strong>File upload</strong>
              </span>
              <span className="f21-dash-connector-upload">
                Upload files
                <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
              </span>
            </button>
          </div>
          <DashListPanelFoot label="Manage" onAction={onOpenConnectors} />
        </section>
      </div>
    </section>
  );
}
