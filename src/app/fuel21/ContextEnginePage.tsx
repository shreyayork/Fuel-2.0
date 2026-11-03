import { useMemo, useState } from "react";
import {
  ChevronRight,
  Filter,
  Lock,
  MessageSquare,
  NotebookPen,
  Pencil,
  Search,
  Upload,
  FileText,
} from "lucide-react";
import {
  CONNECTORS,
  CONTEXT_TABS,
  REVIEW_ITEMS,
  SOURCE_MATERIALS,
  type ContextTab,
} from "./demoData.ts";

function sourceIcon(tab: ContextTab) {
  if (tab === "slack") return MessageSquare;
  if (tab === "manual") return NotebookPen;
  return FileText;
}

export function ContextEnginePage() {
  const [tab, setTab] = useState<ContextTab>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("payment-qa");

  const filtered = useMemo(() => {
    return SOURCE_MATERIALS.filter(item => {
      if (tab !== "all" && item.tab !== tab) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.intelligence.toLowerCase().includes(q) ||
        item.meta.toLowerCase().includes(q)
      );
    });
  }, [tab, query]);

  const selected = SOURCE_MATERIALS.find(s => s.id === selectedId) ?? filtered[0] ?? SOURCE_MATERIALS[0];

  return (
    <div className="f21-page f21-context">
      <div className="f21-page-head">
        <div>
          <h1>Context Engine</h1>
          <p className="f21-lede">Company context, connected to the decisions ahead.</p>
        </div>
        <div className="f21-page-actions">
          <button type="button" className="f21-btn f21-btn-primary">
            <Upload size={14} strokeWidth={2} aria-hidden="true" />
            Upload files
          </button>
        </div>
      </div>

      <div className="f21-context-tabs">
        {CONTEXT_TABS.map(t => (
          <button
            key={t.id}
            type="button"
            className={`f21-context-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.id === "manual" ? <Pencil size={12} strokeWidth={2} aria-hidden="true" /> : null}
            {t.label} {t.count}
          </button>
        ))}
        <button type="button" className="f21-link-btn f21-add-connector">
          Add connector +
        </button>
      </div>

      <div className="f21-context-layout">
        <section className="f21-panel f21-context-list-panel">
          <div className="f21-panel-head f21-context-list-head">
            <h2>Source material</h2>
            <label className="f21-find">
              <Search size={13} strokeWidth={2} aria-hidden="true" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Find material"
                aria-label="Find material"
              />
              <Filter size={13} strokeWidth={2} aria-hidden="true" />
            </label>
          </div>
          <div className="f21-context-cols">
            <span>Material / source</span>
            <span>Intelligence / related work</span>
          </div>
          <ul className="f21-source-list">
            {filtered.map(item => {
              const Icon = sourceIcon(item.tab);
              const active = selected?.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`f21-source-row${active ? " is-selected" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="f21-source-icon" data-tab={item.tab}>
                      <Icon size={14} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="f21-source-main">
                      <strong>{item.title}</strong>
                      <em>{item.meta}</em>
                    </span>
                    <span className="f21-source-side">
                      <strong>{item.intelligence}</strong>
                      {item.related ? <em className="f21-related">{item.related}</em> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="f21-manual-cta">
            A thought that isn&apos;t in a file?{" "}
            <button type="button" className="f21-link-btn" onClick={() => setTab("manual")}>
              Write a note in Manual →
            </button>
          </p>
        </section>

        <aside className="f21-context-detail">
          {selected ? (
            <section className="f21-panel f21-detail-card">
              <div className="f21-detail-kicker">
                <MessageSquare size={13} strokeWidth={2} aria-hidden="true" />
                <span>{selected.detail.channel ?? selected.source}</span>
              </div>
              <h3>{selected.title}</h3>
              <p className="f21-detail-meta">{selected.detail.synced}</p>
              <div className="f21-detail-block">
                <div className="f21-eyebrow">Summary</div>
                <p>{selected.detail.summary}</p>
              </div>
              {selected.detail.metrics.length ? (
                <div className="f21-detail-block">
                  <div className="f21-eyebrow">Latest intelligence</div>
                  <ul className="f21-detail-metrics">
                    {selected.detail.metrics.map(m => (
                      <li key={m.label}>
                        <span>{m.label}</span>
                        <strong>{m.value}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="f21-detail-block">
                <div className="f21-eyebrow">Initiative suggestions</div>
                <div className="f21-mini-initiative">
                  <span className="f21-mini-tag">{selected.detail.initiative.tag}</span>
                  <strong>{selected.detail.initiative.title}</strong>
                  <p>{selected.detail.initiative.detail}</p>
                </div>
              </div>
              <button type="button" className="f21-evidence-link">
                <Lock size={13} strokeWidth={2} aria-hidden="true" />
                Evidence &amp; access
                <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </section>
          ) : null}

          <section className="f21-panel f21-review-card">
            <div className="f21-panel-head">
              <h2>2 items to review</h2>
              <button type="button" className="f21-link-btn">
                Open →
              </button>
            </div>
            <ul className="f21-review-list">
              {REVIEW_ITEMS.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <footer className="f21-context-footer">
        <div className="f21-connector-status">
          {CONNECTORS.map(c => (
            <span key={c.name}>
              <span className="f21-dot" aria-hidden="true" />
              {c.name} · Connected
            </span>
          ))}
        </div>
        <span className="f21-footer-note">Example workspace data</span>
      </footer>
    </div>
  );
}
