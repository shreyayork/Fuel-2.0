import { useMemo, useState } from "react";
import {
  ChevronRight,
  Filter,
  Lock,
  NotebookPen,
  Pencil,
  Search,
  Upload,
  FileText,
} from "lucide-react";
import { ConnectorBrandIcon, type ConnectorBrand } from "./BrandIcons.tsx";
import {
  CONNECTORS,
  CONTEXT_ARTIFACTS,
  CONTEXT_TABS,
  REVIEW_ITEMS,
  SOURCE_MATERIALS,
  type ContextTab,
} from "./demoData.ts";

function SourceGlyph({ tab }: { tab: ContextTab }) {
  if (tab === "slack" || tab === "granola" || tab === "hubspot") {
    return <ConnectorBrandIcon brand={tab as ConnectorBrand} size={13} />;
  }
  if (tab === "manual") return <NotebookPen size={13} strokeWidth={2} aria-hidden="true" />;
  return <FileText size={13} strokeWidth={2} aria-hidden="true" />;
}

export type ContextEngineArtifact = { id: string; title: string; meta: string };

export function ContextEnginePage({ artifacts }: { artifacts?: ContextEngineArtifact[] } = {}) {
  const artifactList = artifacts && artifacts.length > 0 ? artifacts : CONTEXT_ARTIFACTS;
  const [tab, setTab] = useState<ContextTab>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("payment-qa");
  const [selectedArtifactId, setSelectedArtifactId] = useState(artifactList[0]?.id ?? "");

  const filteredArtifacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artifactList;
    return artifactList.filter(
      item => item.title.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q),
    );
  }, [artifactList, query]);

  const filtered = useMemo(() => {
    return SOURCE_MATERIALS.filter(item => {
      if (tab === "artifacts") return false;
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
  const selectedArtifact =
    filteredArtifacts.find(item => item.id === selectedArtifactId) ?? filteredArtifacts[0] ?? null;

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
            <h2>{tab === "artifacts" ? "Artifacts" : "Source material"}</h2>
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
          {tab === "artifacts" ? null : (
          <div className="f21-context-cols">
            <span>Material / source</span>
            <span>Intelligence / related work</span>
          </div>
          )}
          <ul className="f21-source-list">
            {tab === "artifacts"
              ? filteredArtifacts.map(item => {
                  const active = selectedArtifact?.id === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`f21-source-row${active ? " is-selected" : ""}`}
                        onClick={() => setSelectedArtifactId(item.id)}
                      >
                        <span className="f21-source-icon" aria-hidden="true">
                          <FileText size={13} strokeWidth={2} />
                        </span>
                        <span className="f21-source-main">
                          <strong>{item.title}</strong>
                          <em>{item.meta}</em>
                        </span>
                      </button>
                    </li>
                  );
                })
              : filtered.map(item => {
              const active = selected?.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`f21-source-row${active ? " is-selected" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className={`f21-source-icon brand-${item.tab}`} data-tab={item.tab}>
                      <SourceGlyph tab={item.tab} />
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
          {tab === "artifacts" && selectedArtifact ? (
            <section className="f21-panel f21-detail-card">
              <div className="f21-detail-kicker">
                <FileText size={13} strokeWidth={2} aria-hidden="true" />
                <span>Artifact</span>
              </div>
              <h3>{selectedArtifact.title}</h3>
              <p className="f21-detail-meta">{selectedArtifact.meta}</p>
            </section>
          ) : selected ? (
            <section className="f21-panel f21-detail-card">
              <div className="f21-detail-kicker">
                <SourceGlyph tab={selected.tab} />
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
              <span className="f21-link-btn" aria-hidden="true">
                Open →
              </span>
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
            <span key={c.id} className="f21-connector-status-item">
              <span className={`f21-connector-mark brand-${c.id} is-compact`} aria-hidden="true">
                <ConnectorBrandIcon brand={c.id} size={11} />
              </span>
              {c.name} · Connected
            </span>
          ))}
        </div>
        <span className="f21-footer-note">Example workspace data</span>
      </footer>
    </div>
  );
}
