import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CircleDot,
  Compass,
  FileSpreadsheet,
  FileText,
  Gem,
  Megaphone,
  Settings2,
  Target,
  Upload,
  Wallet,
} from "lucide-react";
import {
  CONNECTORS,
  DASHBOARD_INITIATIVES,
  DASHBOARD_MODULES,
  DATA_ROOM_FILES,
  FUEL_BRIEF,
  LATEST_INTELLIGENCE,
  PLAYBOOK_SUGGESTIONS,
  SCORE_CARDS,
  type NavId,
} from "./demoData.ts";

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 72;
  const h = 28;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="f21-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

const PLAYBOOK_ICONS = [Compass, BookOpen, Wallet];

const MODULE_ICONS = {
  profile: Gem,
  rd: Target,
  gtm: Megaphone,
  ga: CircleDot,
  benchmark: BarChart3,
} as const;

export function DashboardPage({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  return (
    <div className="f21-page f21-dashboard">
      <div className="f21-page-head f21-page-head--hero">
        <div>
          <span className="f21-eyebrow">Founder workspace</span>
          <h1>Dashboard</h1>
          <p className="f21-lede">Your company in focus.</p>
        </div>
        <div className="f21-page-actions">
          <button type="button" className="f21-btn f21-btn-secondary">
            <Settings2 size={14} strokeWidth={2} aria-hidden="true" />
            Add/update benchmarks
          </button>
          <button type="button" className="f21-btn f21-btn-primary" onClick={() => onNavigate("context")}>
            + Add context
          </button>
        </div>
      </div>

      {/* 1 — Track scores */}
      <section aria-label="Track scores">
        <div className="f21-section-head">
          <h2 className="f21-section-title">Track scores</h2>
          <p className="f21-section-hint">Scores refresh from accepted context and benchmarks.</p>
        </div>
        <div className="f21-score-grid">
          {SCORE_CARDS.map(card => {
            const goesToRd = card.id === "rd";
            return (
              <button
                key={card.id}
                type="button"
                className={`f21-score-card track-${card.id}`}
                onClick={goesToRd ? () => onNavigate("rd") : undefined}
                style={goesToRd ? undefined : { cursor: "default" }}
              >
                <div className="f21-score-card-glow" aria-hidden="true" />
                <div className="f21-score-card-top">
                  <span>{card.label}</span>
                  <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
                </div>
                <div className="f21-score-card-body">
                  <div>
                    <div className="f21-score-value">
                      {card.score} <span>/ 100</span>
                    </div>
                    <div className="f21-score-delta">{card.delta}</div>
                  </div>
                  <Sparkline values={card.spark} />
                </div>
                <div className="f21-score-bar" aria-hidden="true">
                  <span style={{ width: `${card.score}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2 — Complete profile / modules */}
      <section className="f21-modules" aria-label="Your 5 modules">
        <div className="f21-section-head">
          <h2 className="f21-section-title">Your 5 modules</h2>
          <p className="f21-section-hint">Finish these to unlock a sharper brief and peer scores.</p>
        </div>
        <div className="f21-modules-grid">
          {DASHBOARD_MODULES.map(mod => {
            const Icon = MODULE_ICONS[mod.id as keyof typeof MODULE_ICONS] ?? Gem;
            const statusClass =
              mod.status === "Complete" ? "is-complete" : mod.status === "Not started" ? "is-idle" : "is-progress";
            return (
              <button
                key={mod.id}
                type="button"
                className={`f21-module-card ${statusClass}`}
                onClick={() => {
                  if (mod.href) onNavigate(mod.href);
                }}
                style={mod.href ? undefined : { cursor: "default" }}
              >
                <div className="f21-module-card-top">
                  <span className="f21-module-icon" aria-hidden="true">
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className={`f21-module-status ${statusClass}`}>{mod.status}</span>
                </div>
                <strong className="f21-module-title">{mod.title}</strong>
                <div className="f21-module-progress">{mod.progress}</div>
                <div className="f21-module-bar" aria-hidden="true">
                  <span style={{ width: `${Math.round((mod.answered / mod.total) * 100)}%` }} />
                </div>
                <div className="f21-module-tags">
                  {mod.tags.map(tag => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="f21-module-card-foot">
                  <em>{mod.credit}</em>
                  <span className="f21-link-btn">{mod.action}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3 — Compact brief + latest intelligence beside it */}
      <div className="f21-brief-row">
        <section className="f21-panel f21-fuel-brief f21-fuel-brief--compact" aria-label="Fuel brief">
          <div className="f21-fuel-brief-head">
            <span className="f21-eyebrow">Fuel brief</span>
            <span className="f21-fuel-brief-quote" aria-hidden="true">
              “
            </span>
          </div>
          <p className="f21-fuel-brief-summary">{FUEL_BRIEF.summary}</p>
          <ul className="f21-fuel-brief-intel f21-fuel-brief-intel--compact">
            {FUEL_BRIEF.intelligenceHighlights.slice(0, 2).map(item => (
              <li key={item.label}>
                <div className="f21-brief-intel-metric">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <p>{item.point}</p>
              </li>
            ))}
          </ul>
          <div className="f21-fuel-brief-foot">
            <button type="button" className="f21-link-btn">
              Read full brief
              <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
            </button>
            <div className="f21-fuel-brief-tags">
              {FUEL_BRIEF.tags.map(tag => (
                <span key={tag} className="f21-fuel-brief-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="f21-panel">
          <div className="f21-panel-head">
            <h2>Latest intelligence</h2>
            <span className="f21-link-btn" aria-hidden="true">
              View all →
            </span>
          </div>
          <ul className="f21-intel-list">
            {LATEST_INTELLIGENCE.map(row => (
              <li key={row.label}>
                <span className="f21-intel-label">{row.label}</span>
                <span className="f21-intel-value">{row.value}</span>
                <span className={`f21-intel-meta is-${row.metaTone}`}>{row.meta}</span>
              </li>
            ))}
          </ul>
          <div className="f21-brief-intel-label" style={{ marginTop: 8 }}>
            More from the brief
          </div>
          <ul className="f21-side-highlights">
            {FUEL_BRIEF.intelligenceHighlights.slice(2).map(item => (
              <li key={item.label}>
                <strong>
                  {item.label}: {item.value}
                </strong>
                <p>{item.point}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 4 — Initiatives */}
      <section className="f21-panel">
        <div className="f21-panel-head">
          <h2>Initiatives</h2>
          <span className="f21-link-btn" aria-hidden="true">
            View all →
          </span>
        </div>
        <ul className="f21-initiative-list f21-initiative-list--row">
          {DASHBOARD_INITIATIVES.map(item => (
            <li key={item.title}>
              <span className={`f21-track-tag track-${item.track.replace("&", "").toLowerCase()}`}>
                {item.track}
              </span>
              <div className="f21-initiative-copy">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span className="f21-link-btn" aria-hidden="true">
                Review →
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 5 — Supporting widgets */}
      <div className="f21-dash-bottom">
        <section className="f21-panel">
          <div className="f21-panel-head">
            <h2>Data room</h2>
            <span className="f21-link-btn" aria-hidden="true">
              View all →
            </span>
          </div>
          <ul className="f21-file-list">
            {DATA_ROOM_FILES.map(file => (
              <li key={file.name}>
                {file.type === "XLS" ? (
                  <FileSpreadsheet size={15} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <FileText size={15} strokeWidth={2} aria-hidden="true" />
                )}
                <span>{file.name}</span>
                <em>{file.type}</em>
                <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
              </li>
            ))}
          </ul>
        </section>

        <section className="f21-panel">
          <div className="f21-panel-head">
            <h2>Playbook suggestions</h2>
            <span className="f21-link-btn" aria-hidden="true">
              View all →
            </span>
          </div>
          <ul className="f21-playbook-list">
            {PLAYBOOK_SUGGESTIONS.map((item, i) => {
              const Icon = PLAYBOOK_ICONS[i] ?? BookOpen;
              return (
                <li key={item.title}>
                  <Icon size={15} strokeWidth={2} aria-hidden="true" />
                  <div>
                    <strong>{item.title}</strong>
                    <em>{item.track}</em>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="f21-panel">
          <div className="f21-panel-head">
            <h2>Connectors</h2>
            <button type="button" className="f21-link-btn" onClick={() => onNavigate("context")}>
              Manage →
            </button>
          </div>
          <ul className="f21-connector-list">
            {CONNECTORS.map(c => (
              <li key={c.name}>
                <span className="f21-dot" aria-hidden="true" />
                <strong>{c.name}</strong>
                <em>· {c.status}</em>
              </li>
            ))}
            <li className="f21-connector-upload">
              <span>File upload</span>
              <button type="button" className="f21-link-btn" onClick={() => onNavigate("context")}>
                <Upload size={12} strokeWidth={2} aria-hidden="true" />
                Upload files ↗
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
