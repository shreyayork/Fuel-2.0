import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Info,
  Settings2,
} from "lucide-react";
import {
  RD_INITIATIVES,
  RD_INTELLIGENCE,
  RD_NEEDS,
  RD_PLAYBOOKS,
  RD_WORKING,
  type NavId,
} from "./demoData.ts";

export function RdAnalysisPage({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  return (
    <div className="f21-page f21-rd">
      <div className="f21-page-head">
        <div>
          <h1>R&amp;D analysis</h1>
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

      <section className="f21-panel f21-rd-summary">
        <div className="f21-rd-score">
          <div className="f21-rd-score-value">
            <strong>78</strong>
            <span>/ 100</span>
          </div>
          <div className="f21-rd-trend">↗ +6 over 8 weeks</div>
        </div>
        <div className="f21-rd-summary-copy-wrap">
          <div className="f21-eyebrow">Analysis</div>
          <p className="f21-rd-summary-copy">
            Reliable delivery and ownership, but payment testing and a fresh security review need attention.
          </p>
        </div>
      </section>

      <div className="f21-rd-mid">
        <section className="f21-panel">
          <div className="f21-panel-head">
            <h2>What&apos;s working</h2>
          </div>
          <ul className="f21-working-list">
            {RD_WORKING.map(item => (
              <li key={item.title}>
                <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="f21-panel">
          <div className="f21-panel-head">
            <h2>Needs improvement</h2>
            <Info size={14} strokeWidth={2} className="f21-warn-icon" aria-hidden="true" />
          </div>
          <ul className="f21-needs-list">
            {RD_NEEDS.map(item => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="f21-rd-bottom">
        <section className="f21-rd-initiatives">
          <div className="f21-section-title">Initiative suggestions</div>
          <div className="f21-init-grid">
            {RD_INITIATIVES.map(item => (
              <div key={item.title} className="f21-panel f21-init-card">
                <div className="f21-init-card-top">
                  <span className="f21-mini-tag">{item.tag}</span>
                  <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" />
                </div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="f21-rd-side">
          <section className="f21-panel">
            <div className="f21-panel-head">
              <h2>Intelligence</h2>
            </div>
            <ul className="f21-rd-intel">
              {RD_INTELLIGENCE.map(row => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="f21-panel">
            <div className="f21-panel-head">
              <h2>Playbook suggestions</h2>
            </div>
            <ul className="f21-rd-playbooks">
              {RD_PLAYBOOKS.map(title => (
                <li key={title}>
                  <BookOpen size={14} strokeWidth={2} aria-hidden="true" />
                  <span>{title}</span>
                  <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
