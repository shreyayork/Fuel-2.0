import { useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  Check,
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
  Plug,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Wallet,
} from "lucide-react";
import {
  ConnectorBrandIcon,
  RealDocIcon,
  RealPdfIcon,
  RealXlsIcon,
} from "./BrandIcons.tsx";
import {
  DASHBOARD_MODULES,
  FUEL_BRIEF,
  LATEST_INTELLIGENCE,
  SCORE_CARDS,
  type NavId,
} from "./demoData.ts";
import "./dashboard-v2.css";

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

const PLAYBOOK_ICONS = [
  ShieldCheck,
  TrendingUp,
  Wallet,
];

const REALTIME_METRICS = [
  {
    label: "ARR",
    value: "$35M",
    meta: "Latest",
    metaTone: "muted" as const,
    sub: "Finance context",
    icon: CircleDollarSign,
  },
  {
    label: "Test Coverage",
    value: "84%",
    meta: "+9pp",
    metaTone: "good" as const,
    sub: "QA benchmark",
    icon: ShieldCheck,
  },
  {
    label: "CAC Payback",
    value: "19mo",
    meta: "+2mo",
    metaTone: "watch" as const,
    sub: "Channel efficiency",
    icon: Clock,
  },
  {
    label: "Growth Position",
    value: "Bottom 25%",
    meta: "Seed Rank",
    metaTone: "muted" as const,
    sub: "FinTech cohort",
    icon: Compass,
  },
];

const TRACK_DIAGNOSTICS: Record<
  string,
  {
    score: number;
    statusLabel: string;
    brief: string;
    highlight: string;
    benefit: string;
  }
> = {
  rd: {
    score: 60,
    statusLabel: "Median",
    brief: "Product & engineering has fixable gaps if you focus now. Top constraint right now: ",
    highlight: "capacity and hiring",
    benefit: "Ship cadence & backlog prioritization",
  },
  gtm: {
    score: 50,
    statusLabel: "Median",
    brief: "Growth is bottlenecked at qualified pipeline. Fix conversion before spending more ",
    highlight: "top-of-funnel",
    benefit: "Paying customers & defined pipeline",
  },
  ga: {
    score: 75,
    statusLabel: "Above avg",
    brief: "Solid Ops & finance foundation with key efficiency levers ready to pull for ",
    highlight: "fiscal resilience",
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
    track: "R&D",
    trackKey: "rd" as const,
    desc: "Release QA checklists & checkout regression benchmarks for engineering.",
    readTime: "4 min read",
    tag: "Seed Stage",
  },
  {
    title: "Tune your acquisition mix",
    track: "GTM",
    trackKey: "gtm" as const,
    desc: "CAC payback rebalancing across outbound pipeline & paid acquisition.",
    readTime: "6 min read",
    tag: "Growth Focus",
  },
  {
    title: "Plan your cash runway",
    track: "G&A",
    trackKey: "ga" as const,
    desc: "13-week rolling cash model & burn scenario planner for executive runway.",
    readTime: "5 min read",
    tag: "Board Ready",
  },
];

function FileTypeIcon({ type }: { type: string }) {
  if (type === "XLS") return <RealXlsIcon size={22} />;
  if (type === "DOC") return <RealDocIcon size={22} />;
  return <RealPdfIcon size={22} />;
}

function TrackScoreRing({
  score,
  track,
}: {
  score: number;
  track: "rd" | "gtm" | "ga";
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 30;
  const stroke = 4.5;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (clamped / 100) * circ;

  return (
    <div className={`f21-v2-score-ring track-${track}`} aria-hidden="true">
      <svg className="f21-v2-score-ring-svg" viewBox="0 0 72 72" width="72" height="72">
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

function ModuleRingProgress({
  answered,
  total,
  statusClass,
}: {
  answered: number;
  total: number;
  statusClass: string;
}) {
  const safeTotal = Math.max(1, total);
  const clamped = Math.max(0, Math.min(100, Math.round((answered / safeTotal) * 100)));
  const radius = 18;
  const stroke = 3.2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (clamped / 100) * circ;

  return (
    <div className={`f21-module-ring ${statusClass}`} aria-hidden="true">
      <svg className="f21-module-ring-svg" viewBox="0 0 44 44" width="44" height="44">
        <circle className="f21-module-ring-bg" cx="22" cy="22" r={radius} strokeWidth={stroke} fill="none" />
        <circle
          className="f21-module-ring-meter"
          cx="22"
          cy="22"
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="f21-module-ring-label">
        <em>{answered}</em>
        <span>/{total}</span>
      </span>
    </div>
  );
}

export function DashboardV2({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  const [isRoadmapSkipped, setIsRoadmapSkipped] = useState(false);

  return (
    <div className="f21-v2-container">
      {/* =====================================================================
          1 — Diagnostic Roadmap (Your 5 Modules) - Top by default with Skip
          ===================================================================== */}
      {isRoadmapSkipped ? (
        <div className="f21-roadmap-dismissed-strip">
          <div className="f21-roadmap-dismissed-left">
            <span className="f21-sec-icon-wrap sec-modules f21-sec-icon-sm" aria-hidden="true">
              <Layers size={13} strokeWidth={1.85} />
            </span>
            <span className="f21-roadmap-dismissed-title">Diagnostic roadmap hidden</span>
            <span className="f21-roadmap-dismissed-sep">·</span>
            <span className="f21-roadmap-dismissed-sub">5 operating modules can be resumed anytime</span>
          </div>
          <button
            type="button"
            className="f21-ghost-btn f21-resume-btn"
            onClick={() => setIsRoadmapSkipped(false)}
          >
            Resume roadmap
          </button>
        </div>
      ) : (
        <section className="f21-v2-modules-section" aria-label="Company diagnostic roadmap">
          <div className="f21-v2-modules-head">
            <div>
              <h2 className="f21-head-with-icon">
                <span className="f21-sec-icon-wrap sec-modules">
                  <Layers size={15} strokeWidth={1.85} aria-hidden="true" />
                </span>
                Company Diagnostic Roadmap
              </h2>
              <p className="f21-section-hint">Progressively unlock peer benchmarks and deeper insights across 5 operating domains.</p>
            </div>
            <button
              type="button"
              className="f21-ghost-btn f21-skip-btn"
              onClick={() => setIsRoadmapSkipped(true)}
              title="Skip diagnostic roadmap"
            >
              Skip
            </button>
          </div>

          <div className="f21-module-grid">
            {DASHBOARD_MODULES.map(mod => {
              const Icon = MODULE_ICONS[mod.id as keyof typeof MODULE_ICONS] ?? Sparkles;
              const statusClass =
                mod.status === "Complete" ? "is-complete" : mod.status === "Not started" ? "is-idle" : "is-progress";
              const statusLabel =
                mod.status === "In progress" ? "Active" : mod.status === "Not started" ? "Idle" : "Done";

              return (
                <button
                  key={mod.id}
                  type="button"
                  className={`f21-module-card ${statusClass} mod-${mod.id}`}
                  onClick={() => {
                    if (mod.href) onNavigate(mod.href);
                  }}
                  style={mod.href ? undefined : { cursor: "default" }}
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
                    <ModuleRingProgress
                      answered={mod.answered}
                      total={mod.total}
                      statusClass={statusClass}
                    />
                    <span className="f21-module-cta-btn">
                      <span>{mod.action.replace("→", "").trim()}</span>
                      <ArrowRight size={12} strokeWidth={2.0} className="f21-cta-arrow" aria-hidden="true" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          2 — Track Scores (R&D / GTM / G&A) — Meter Cards
          ===================================================================== */}
      <div className="f21-v2-track-grid" aria-label="Executive track pulse">
        {SCORE_CARDS.map(card => {
          const ScoreIcon = SCORE_ICONS[card.id] ?? Code2;
          const diag = TRACK_DIAGNOSTICS[card.id] ?? {
            score: card.score,
            statusLabel: "Median",
            brief: "Operational metrics and track diagnostics.",
            highlight: "key levers",
            benefit: "Active telemetry and baseline stability",
          };
          const fullName = TRACK_FULL_NAMES[card.id] ?? card.label;

          return (
            <button
              key={card.id}
              type="button"
              className={`f21-v2-track-card track-${card.id} is-interactive`}
              onClick={() => onNavigate(card.id === "rd" ? "rd" : "context")}
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
                </div>
                <span className="f21-v2-score-status">{diag.statusLabel}</span>
              </div>

              <div className="f21-v2-track-mid">
                <TrackScoreRing score={diag.score} track={card.id} />
                <p className="f21-v2-track-brief">
                  {diag.brief}
                  <strong>{diag.highlight}</strong>.
                </p>
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
      </div>

      {/* =====================================================================
          3 — AI Executive Synthesis & Live Intelligence (Bento Architecture)
          ===================================================================== */}
      <div className="f21-v2-bento-grid">
        {/* Left: AI Executive Brief */}
        <section className="f21-panel f21-v2-brief-card" aria-label="AI executive brief">
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
            <h3 className="f21-v2-narrative-headline">
              Retention is strong · Prioritize R&D, GTM & G&A to accelerate cohort rank
            </h3>
            <p className="f21-v2-narrative-lead">
              Patriot Pay leads peer benchmarks in retention. Accelerating velocity across release testing, sales routing, and cash governance directly unlocks Series A valuation headroom.
            </p>
          </div>

          <div className="f21-v2-brief-footer">
            <div className="f21-v2-brief-context-hint">
              <span>Calibrated with 42 Seed FinTech peers</span>
            </div>
            <button type="button" className="f21-v2-btn-view-summary">
              <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
              <span>View Summary</span>
              <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* Right: Real Intelligence — Minimalist Executive KPI Grid */}
        <section className="f21-panel f21-intel-panel f21-telemetry-panel" aria-label="Real Intelligence">
          <div className="f21-panel-head">
            <div className="f21-head-title-wrap">
              <h2 className="f21-head-with-icon">
                <span className="f21-sec-icon-wrap sec-intel">
                  <Radio size={14} strokeWidth={1.85} aria-hidden="true" />
                </span>
                Real Intelligence
              </h2>
            </div>
          </div>

          <div className="f21-telemetry-grid">
            {REALTIME_METRICS.map(metric => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="f21-telemetry-tile">
                  <div className="f21-telemetry-tile-top">
                    <span className="f21-telemetry-label">{metric.label}</span>
                    <Icon size={14} strokeWidth={1.85} className="f21-telemetry-tile-icon" aria-hidden="true" />
                  </div>
                  <strong className="f21-telemetry-val">{metric.value}</strong>
                  <div className="f21-telemetry-tile-bottom">
                    <span className={`f21-telemetry-meta-chip is-${metric.metaTone}`}>{metric.meta}</span>
                    <span className="f21-telemetry-sub">{metric.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="f21-telemetry-footer-bar">
            <span className="f21-telemetry-footer-sync-dot" aria-hidden="true" />
            <span className="f21-telemetry-footer-text">Continuous telemetry across GitHub, Stripe & QuickBooks</span>
          </div>
        </section>
      </div>

      {/* =====================================================================
          4 — Strategic Initiatives & Recommended Playbooks (Execution Pair)
          ===================================================================== */}
      <div className="f21-dash-pair f21-quad-pair">
        {/* Strategic Initiatives — Minimalist Modern SaaS List */}
        <section className="f21-panel f21-quad-panel f21-initiatives-panel" aria-label="Strategic initiatives">
          <div className="f21-panel-head">
            <div className="f21-head-title-wrap">
              <h2 className="f21-head-with-icon">
                <span className="f21-sec-icon-wrap sec-initiatives">
                  <Target size={15} strokeWidth={1.85} aria-hidden="true" />
                </span>
                Strategic Initiatives
              </h2>
            </div>
            <button type="button" className="f21-ghost-btn">
              View all
            </button>
          </div>

          <div className="f21-clean-list">
            {INITIATIVES_DATA.map(item => {
              const TrackIcon = SCORE_ICONS[item.trackKey] ?? Target;

              return (
                <div key={item.title} className="f21-clean-row f21-initiative-row">
                  <div className="f21-init-meta-strip">
                    <span className={`f21-track-pill track-${item.trackKey}`}>
                      <TrackIcon size={11} strokeWidth={1.85} aria-hidden="true" />
                      <span>{item.track}</span>
                    </span>
                  </div>

                  <div className="f21-clean-row-main">
                    <strong className="f21-clean-row-title">{item.title}</strong>
                    <p className="f21-clean-row-desc">{item.detail}</p>
                  </div>

                  <div className="f21-clean-row-action">
                    <button type="button" className="f21-link-btn" aria-label={`Review ${item.title}`}>
                      <span>Review</span>
                      <ArrowRight size={12} strokeWidth={2.0} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recommended Playbooks — Minimalist Modern SaaS List */}
        <section className="f21-panel f21-quad-panel f21-playbooks-panel" aria-label="Recommended playbooks">
          <div className="f21-panel-head">
            <div className="f21-head-title-wrap">
              <h2 className="f21-head-with-icon">
                <span className="f21-sec-icon-wrap sec-playbooks">
                  <BookOpenCheck size={15} strokeWidth={1.85} aria-hidden="true" />
                </span>
                Recommended Playbooks
              </h2>
            </div>
          </div>

          <div className="f21-clean-list">
            {PLAYBOOKS_DATA.map((item, i) => {
              const PlayIcon = PLAYBOOK_ICONS[i] ?? BookOpenCheck;

              return (
                <div
                  key={item.title}
                  className={`f21-clean-row f21-playbook-row track-${item.trackKey}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open playbook ${item.title}`}
                >
                  <span className={`f21-playbook-icon-box track-${item.trackKey}`} aria-hidden="true">
                    <PlayIcon size={14} strokeWidth={1.85} />
                  </span>

                  <div className="f21-clean-row-main">
                    <div className="f21-playbook-name-row">
                      <strong className="f21-clean-row-title">{item.title}</strong>
                      <span className={`f21-playbook-track-pill track-${item.trackKey}`}>{item.track}</span>
                    </div>
                    <p className="f21-clean-row-desc">{item.desc}</p>
                  </div>

                  <div className="f21-clean-row-action">
                    <ArrowRight className="f21-row-arrow" size={13} strokeWidth={2.0} aria-hidden="true" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* =====================================================================
          5 — Active Connectors & Company Data Room (Side-by-Side Assets Pair)
          ===================================================================== */}
      <div className="f21-dash-pair f21-quad-pair">
        {/* Active Connectors — Clean Minimalist Vertical Cards */}
        <section className="f21-panel f21-quad-panel f21-connectors-panel" aria-label="Ecosystem connectors">
          <div className="f21-panel-head">
            <div className="f21-head-title-wrap">
              <h2 className="f21-head-with-icon">
                <span className="f21-sec-icon-wrap sec-connectors">
                  <Plug size={15} strokeWidth={1.85} aria-hidden="true" />
                </span>
                Active Connectors
              </h2>
            </div>
            <button type="button" className="f21-ghost-btn" onClick={() => onNavigate("context")}>
              Manage
            </button>
          </div>

          <div className="f21-vertical-card-grid">
            {CONNECTORS_DATA.map(c => (
              <div
                key={c.id}
                className={`f21-vertical-card f21-connector-vcard brand-${c.id}`}
                aria-label={`${c.name} connector status`}
              >
                <div className="f21-vcard-top">
                  <span className={`f21-connector-mark brand-${c.id}`} aria-hidden="true">
                    <ConnectorBrandIcon brand={c.id} size={24} />
                  </span>
                  <span className="f21-connector-badge is-checkbox" aria-label={`${c.name} connected`}>
                    <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                  </span>
                </div>

                <div className="f21-vcard-body">
                  <strong className="f21-vcard-name">{c.name}</strong>
                  <span className="f21-vcard-metric">{c.metric}</span>
                  <span className="f21-vcard-sync">{c.syncTime}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Company Data Room — Clean Minimalist Vertical Cards */}
        <section className="f21-panel f21-quad-panel f21-dataroom-panel" aria-label="Verified data room">
          <div className="f21-panel-head">
            <div className="f21-head-title-wrap">
              <h2 className="f21-head-with-icon">
                <span className="f21-sec-icon-wrap sec-dataroom">
                  <FolderLock size={15} strokeWidth={1.85} aria-hidden="true" />
                </span>
                Company Data Room
              </h2>
            </div>
            <button type="button" className="f21-ghost-btn" onClick={() => onNavigate("context")}>
              View all
            </button>
          </div>

          <div className="f21-vertical-card-grid">
            {DATA_ROOM_DATA.map(file => (
              <div
                key={file.name}
                className={`f21-vertical-card f21-dataroom-vcard type-${file.type.toLowerCase()}`}
                role="button"
                tabIndex={0}
                aria-label={`Open ${file.name} ${file.type}`}
              >
                <div className="f21-vcard-top">
                  <span className={`f21-file-badge type-${file.type.toLowerCase()}`} aria-hidden="true">
                    <FileTypeIcon type={file.type} />
                  </span>
                </div>

                <div className="f21-vcard-body">
                  <strong className="f21-vcard-name">{file.name}</strong>
                  <span className="f21-vcard-metric">{file.subtitle}</span>
                  <span className="f21-vcard-sync">{file.size} · {file.updated}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
