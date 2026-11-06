import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  Code2,
  Compass,
  FileSpreadsheet,
  FileText,
  Gem,
  Megaphone,
  Settings2,
  Upload,
  Wallet,
} from "lucide-react";
import { ConnectorBrandIcon } from "./BrandIcons.tsx";
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

const PLAYBOOK_ICONS = [Compass, BookOpen, Wallet];

const MODULE_ICONS = {
  profile: Gem,
  rd: Code2,
  gtm: Megaphone,
  ga: Building2,
  benchmark: BarChart3,
} as const;

const SCORE_ICONS = {
  rd: Code2,
  gtm: Megaphone,
  ga: Building2,
} as const;

function FileTypeIcon({ type }: { type: string }) {
  if (type === "XLS") return <FileSpreadsheet size={14} strokeWidth={2} />;
  return <FileText size={14} strokeWidth={2} />;
}

export function DashboardPage({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  return (
    <div className="f21-page f21-dashboard">
      <header className="f21-page-head">
        <div>
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
      </header>

      {/* 1 — Track scores */}
      <section className="f21-panel f21-score-board" aria-label="Track scores">
        <div className="f21-panel-head">
          <div>
            <h2>Track scores</h2>
            <p className="f21-section-hint">Scores refresh from accepted context and benchmarks.</p>
          </div>
        </div>
        <div className="f21-score-strip">
          {SCORE_CARDS.map(card => {
            const goesToRd = card.id === "rd";
            const ScoreIcon = SCORE_ICONS[card.id] ?? Code2;
            return (
              <button
                key={card.id}
                type="button"
                className={`f21-score-cell track-${card.id}`}
                onClick={goesToRd ? () => onNavigate("rd") : undefined}
                style={goesToRd ? undefined : { cursor: "default" }}
                aria-label={`${card.label} ${card.score} of 100`}
              >
                <div className="f21-score-cell-top">
                  <span className="f21-score-label-row">
                    <ScoreIcon size={13} strokeWidth={2} aria-hidden="true" />
                    <span className="f21-score-label">{card.label}</span>
                  </span>
                  <ArrowUpRight className="f21-score-arrow" size={15} strokeWidth={2} aria-hidden="true" />
                </div>
                <strong className="f21-score-num">
                  {card.score}
                  <span>/100</span>
                </strong>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2 — Modules */}
      <section className="f21-panel f21-module-board" aria-label="Your 5 modules">
        <div className="f21-panel-head">
          <div>
            <h2>Your 5 modules</h2>
            <p className="f21-section-hint">Finish these to unlock a sharper brief and peer scores.</p>
          </div>
        </div>
        <div className="f21-module-strip">
          {DASHBOARD_MODULES.map(mod => {
            const Icon = MODULE_ICONS[mod.id as keyof typeof MODULE_ICONS] ?? Gem;
            const pct = Math.round((mod.answered / mod.total) * 100);
            const statusClass =
              mod.status === "Complete" ? "is-complete" : mod.status === "Not started" ? "is-idle" : "is-progress";
            return (
              <button
                key={mod.id}
                type="button"
                className={`f21-module-cell ${statusClass}`}
                onClick={() => {
                  if (mod.href) onNavigate(mod.href);
                }}
                style={mod.href ? undefined : { cursor: "default" }}
              >
                <div className="f21-module-cell-top">
                  <span className="f21-module-icon-wrap" aria-hidden="true">
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className={`f21-module-status ${statusClass}`}>{mod.status}</span>
                </div>
                <strong>{mod.title}</strong>
                <div className="f21-module-meta">
                  <span>
                    {mod.answered}/{mod.total} answered
                  </span>
                  <em>{mod.credit}</em>
                </div>
                <div className="f21-module-meter" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="f21-module-tags">
                  {mod.tags.slice(0, 3).map(tag => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <span className="f21-module-cta">{mod.action}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3 — Compact brief + intelligence */}
      <div className="f21-dash-pair">
        <section className="f21-panel f21-brief-panel" aria-label="Fuel brief">
          <div className="f21-panel-head">
            <h2>Fuel brief</h2>
            <button type="button" className="f21-ghost-btn">
              Read full brief
            </button>
          </div>
          <p className="f21-brief-lead">{FUEL_BRIEF.summary}</p>
          <dl className="f21-brief-points">
            {FUEL_BRIEF.intelligenceHighlights.slice(0, 2).map(item => (
              <div key={item.label} className="f21-brief-point">
                <dt>
                  {item.label}
                  <strong>{item.value}</strong>
                </dt>
                <dd>{item.point}</dd>
              </div>
            ))}
          </dl>
          <div className="f21-brief-meta">
            {FUEL_BRIEF.tags.map(tag => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </section>

        <section className="f21-panel f21-intel-panel">
          <div className="f21-panel-head">
            <h2>Latest intelligence</h2>
            <button type="button" className="f21-ghost-btn">
              View all
            </button>
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
          <div className="f21-divider" />
          <div className="f21-eyebrow f21-eyebrow--inline">Also from the brief</div>
          <ul className="f21-side-notes">
            {FUEL_BRIEF.intelligenceHighlights.slice(2).map(item => (
              <li key={item.label}>
                <strong>
                  {item.label} · <span className="f21-side-note-val">{item.value}</span>
                </strong>
                <p>{item.point}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 4 — Initiatives | Connectors */}
      <div className="f21-dash-pair">
        <section className="f21-panel">
          <div className="f21-panel-head">
            <h2>Initiatives</h2>
            <button type="button" className="f21-ghost-btn">
              View all
            </button>
          </div>
          <div className="f21-init-table">
            {DASHBOARD_INITIATIVES.map(item => (
              <div key={item.title} className="f21-init-row">
                <span className={`f21-track-tag track-${item.track.toLowerCase().replace("&", "")}`}>{item.track}</span>
                <div className="f21-initiative-copy">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <button type="button" className="f21-link-btn">
                  Review →
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="f21-panel f21-connectors-panel">
          <div className="f21-panel-head">
            <h2>Connectors</h2>
            <button type="button" className="f21-ghost-btn" onClick={() => onNavigate("context")}>
              Manage
            </button>
          </div>
          <ul className="f21-connector-rows">
            {CONNECTORS.map(c => (
              <li key={c.id}>
                <span className={`f21-connector-mark brand-${c.id}`} aria-hidden="true">
                  <ConnectorBrandIcon brand={c.id} size={14} />
                </span>
                <strong className="f21-connector-name">{c.name}</strong>
                <span className="f21-connector-badge is-on">
                  <span className="f21-connector-live" aria-hidden="true" />
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="f21-connector-upload-btn" onClick={() => onNavigate("context")}>
            <span className="f21-connector-upload-icon" aria-hidden="true">
              <Upload size={14} strokeWidth={2} />
            </span>
            <span className="f21-connector-copy">
              <strong>Upload files</strong>
              <em>Add PDFs, sheets, or notes to context</em>
            </span>
          </button>
        </section>
      </div>

      {/* 5 — Data room | Playbooks — same pair grid */}
      <div className="f21-dash-pair">
        <section className="f21-panel">
          <div className="f21-panel-head">
            <h2>Data room</h2>
            <button type="button" className="f21-ghost-btn">
              View all
            </button>
          </div>
          <ul className="f21-file-list">
            {DATA_ROOM_FILES.map(file => (
              <li key={file.name}>
                <span className={`f21-file-icon type-${file.type.toLowerCase()}`} aria-hidden="true">
                  <FileTypeIcon type={file.type} />
                </span>
                <span className="f21-file-name">{file.name}</span>
                <em className="f21-file-type">{file.type}</em>
              </li>
            ))}
          </ul>
        </section>

        <section className="f21-panel">
          <div className="f21-panel-head">
            <h2>Playbook suggestions</h2>
            <button type="button" className="f21-ghost-btn">
              View all
            </button>
          </div>
          <ul className="f21-playbook-list">
            {PLAYBOOK_SUGGESTIONS.map((item, i) => {
              const Icon = PLAYBOOK_ICONS[i] ?? BookOpen;
              return (
                <li key={item.title}>
                  <span className="f21-playbook-icon" aria-hidden="true">
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <em>{item.track}</em>
                  </div>
                  <ArrowUpRight className="f21-playbook-arrow" size={14} strokeWidth={2} aria-hidden="true" />
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
