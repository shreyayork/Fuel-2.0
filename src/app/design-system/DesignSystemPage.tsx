import {
  FUEL_STATUS,
  FUEL_STATUS_HEX,
  FUEL_STATUS_LIST,
  statusBadgeClass,
  statusDotClass,
  statusSurfaceClass,
  statusToneClass,
} from "../statusSystem";
import "./design-system.css";

function Swatch({ kind }: { kind: keyof typeof FUEL_STATUS }) {
  const s = FUEL_STATUS[kind];
  return (
    <div className="ds-status-swatch">
      <div
        className="ds-status-swatch-chip"
        style={{ background: s.hex }}
        aria-hidden="true"
      />
      <div className="ds-status-swatch-meta">
        <strong>{s.name}</strong>
        <code>{s.hex}</code>
        <code>{s.css.replace("var(", "").replace(")", "")}</code>
        <span className="ds-status-swatch-aliases">{s.aliases.join(" · ")}</span>
      </div>
    </div>
  );
}

function StatusIndicatorsSection() {
  return (
    <section className="ds-section" id="status-indicators" aria-labelledby="ds-status-heading">
      <p className="ds-eyebrow">Design system</p>
      <h2 id="ds-status-heading">Status indicators</h2>
      <p className="ds-lede">
        Fuel uses exactly three status colors across every screen, component, card, table, badge,
        timeline, and module. Do not introduce additional shades or alternate greens, ambers, or reds
        for the same semantic meaning.
      </p>

      <div className="ds-status-swatches">
        {FUEL_STATUS_LIST.map(s => (
          <Swatch key={s.kind} kind={s.kind} />
        ))}
      </div>

      <h3>Color tokens</h3>
      <div className="ds-table-wrap">
        <table className="ds-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Hex</th>
              <th>CSS token</th>
              <th>Dim background</th>
              <th>Line / border</th>
            </tr>
          </thead>
          <tbody>
            {FUEL_STATUS_LIST.map(s => (
              <tr key={s.kind}>
                <td><strong>{s.name}</strong> <code>({s.kind})</code></td>
                <td><code>{s.hex}</code></td>
                <td><code>--status-{s.kind}</code></td>
                <td><code>--status-{s.kind}-dim</code></td>
                <td><code>--status-{s.kind}-line</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Badge examples</h3>
      <div className="ds-example-row">
        <span className={statusBadgeClass("good")}>Stable</span>
        <span className={statusBadgeClass("watch")}>Watch</span>
        <span className={statusBadgeClass("bad")}>2 new risks</span>
      </div>

      <h3>Dot indicators</h3>
      <div className="ds-example-row">
        <span className={statusDotClass("good")} aria-hidden="true" />
        <span className={statusDotClass("watch")} aria-hidden="true" />
        <span className={statusDotClass("bad")} aria-hidden="true" />
        <span className="ds-example-caption">8px dots — use with visible text labels</span>
      </div>

      <h3>Icon + text</h3>
      <div className="ds-example-col">
        <div className={`fuel-status-row fuel-status-row--good`}>
          <span className={statusDotClass("good")} aria-hidden="true" />
          <span className="fuel-status-row-label">R&D — Stable</span>
        </div>
        <div className={`fuel-status-row fuel-status-row--watch`}>
          <span className={statusDotClass("watch")} aria-hidden="true" />
          <span className="fuel-status-row-label">GTM — Watch</span>
        </div>
        <div className={`fuel-status-row fuel-status-row--bad`}>
          <span className={statusDotClass("bad")} aria-hidden="true" />
          <span className="fuel-status-row-label">G&A — 2 new risks</span>
        </div>
      </div>

      <h3>Surface pills</h3>
      <div className="ds-example-row">
        <span className={statusSurfaceClass("good")}>Complete</span>
        <span className={statusSurfaceClass("watch")}>Building</span>
        <span className={statusSurfaceClass("bad")}>Blocked</span>
      </div>

      <h3>Text tone utilities</h3>
      <div className="ds-example-col">
        <span className={statusToneClass("good")}>Leading cohort · above benchmark</span>
        <span className={statusToneClass("watch")}>Around median · needs attention</span>
        <span className={statusToneClass("bad")}>Critical · below benchmark</span>
      </div>

      <h3>Usage guidelines</h3>
      <ul className="ds-guidelines">
        <li>
          <strong>Good</strong> ({FUEL_STATUS_HEX.good}) — on track, complete, stable, confirmed,
          healthy, ready, above benchmark, top/upper quartile.
        </li>
        <li>
          <strong>Watch</strong> ({FUEL_STATUS_HEX.watch}) — needs attention, in progress, waiting,
          around/below median, building insights, caution — not yet critical.
        </li>
        <li>
          <strong>Critical</strong> ({FUEL_STATUS_HEX.bad}) — blocked, urgent risks, errors,
          bottom quartile, weak performance, validation failures.
        </li>
        <li>
          Neutral metadata (optional fields, idle, no data) uses <code>--fuel-text-muted</code> — not
          a fourth status color.
        </li>
        <li>
          Import helpers from <code>statusSystem.ts</code> for TS/inline styles; use{" "}
          <code>fuel-status-*</code> CSS classes for markup.
        </li>
      </ul>

      <h3>Accessibility</h3>
      <ul className="ds-guidelines">
        <li>Never convey status by color alone — always pair dots/badges with text.</li>
        <li>
          Status colors on white ({FUEL_STATUS_HEX.good} good, {FUEL_STATUS_HEX.watch} watch) meet
          large-text contrast when used at 12px+ bold; {FUEL_STATUS_HEX.bad} critical red meets
          4.5:1 on white for normal text.
        </li>
        <li>Use <code>aria-label</code> on icon-only status controls; include status in visible copy.</li>
        <li>Focus rings should use primary focus tokens, not status colors.</li>
      </ul>
    </section>
  );
}

export default function DesignSystemPage({ onClose }: { onClose?: () => void }) {
  return (
    <div className="ds-page">
      <header className="ds-header">
        <div>
          <p className="ds-eyebrow">Fuel by York IE</p>
          <h1>Design system</h1>
        </div>
        {onClose ? (
          <button type="button" className="ds-close-btn" onClick={onClose}>
            Back to app
          </button>
        ) : null}
      </header>
      <main className="ds-main">
        <StatusIndicatorsSection />
      </main>
    </div>
  );
}
