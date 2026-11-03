import {
  ArrowUpRight,
  BookOpen,
  Compass,
  FileSpreadsheet,
  FileText,
  Settings2,
  Upload,
  Wallet,
} from "lucide-react";
import {
  CONNECTORS,
  DASHBOARD_INITIATIVES,
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

export function DashboardPage({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  return (
    <div className="f21-page f21-dashboard">
      <div className="f21-page-head">
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
      </div>

      <div className="f21-score-grid">
        {SCORE_CARDS.map(card => {
          const goesToRd = card.id === "rd";
          return (
            <button
              key={card.id}
              type="button"
              className="f21-score-card"
              onClick={goesToRd ? () => onNavigate("rd") : undefined}
              style={goesToRd ? undefined : { cursor: "default" }}
            >
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
            </button>
          );
        })}
      </div>
      <p className="f21-footnote">Scores refresh from accepted context and benchmarks.</p>

      <section className="f21-panel f21-fuel-brief" aria-label="Fuel brief">
        <div className="f21-fuel-brief-head">
          <span className="f21-eyebrow">Fuel brief</span>
          <span className="f21-fuel-brief-quote" aria-hidden="true">
            “
          </span>
        </div>
        <p className="f21-fuel-brief-summary">{FUEL_BRIEF.summary}</p>
        <ul className="f21-fuel-brief-initiatives">
          {FUEL_BRIEF.initiativeBriefs.map(item => (
            <li key={item.title}>
              <span className={`f21-track-tag track-${item.track.replace("&", "").toLowerCase()}`}>
                {item.track}
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
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

      <div className="f21-dash-mid">
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
        </section>

        <section className="f21-panel">
          <div className="f21-panel-head">
            <h2>Initiatives</h2>
            <span className="f21-link-btn" aria-hidden="true">
              View all →
            </span>
          </div>
          <ul className="f21-initiative-list">
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
      </div>

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
            <span className="f21-link-btn" aria-hidden="true">
              Manage →
            </span>
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
