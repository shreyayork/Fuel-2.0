import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  Building2,
  Code2,
  FileText,
  Landmark,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  TrendingUp,
  Upload,
} from "lucide-react";
import { ConnectorBrandIcon, type ConnectorBrand } from "./BrandIcons.tsx";
import { CONNECTORS, CONTEXT_ARTIFACTS, SOURCE_MATERIALS, type ContextTab } from "./demoData.ts";
import { useFuel21DetailsDrawer } from "./Fuel21DetailsDrawer.tsx";
import { OnboardingBenchmarkBar } from "../OnboardingFlow.tsx";
import {
  BENCHMARK_WIZARD_FIELDS,
  formatBenchmarkDisplay,
  getBenchmarkTier,
  getBenchmarkTierStyle,
  valueToMarkerPercent,
} from "../FuelOnboardingChat.tsx";
import { applyCohortPeersToField, loadBenchmarkCohortId } from "../benchmarkCohortData.ts";
import { DETAIL_ANSWERS_CHANGE_EVENT, loadDetailAnswers } from "../ScorecardV2.tsx";
import "./dashboard-v2.css";
import {
  DETAIL_SECTIONS,
  getVisibleQuestions,
  parseMultiSelectAnswer,
  parseProfileFundingRounds,
  type DetailAnswers,
  type DetailQuestion,
} from "../trackQuestions.ts";
import "./context-engine.css";

type FormId = "profile" | "dev" | "mkt" | "rev";
type ConnectorId = (typeof CONNECTORS)[number]["id"];
type SourceId = FormId | "benchmark" | "notes" | "artifacts" | ConnectorId;

const FORMS: { id: FormId; label: string; title: string; icon: ReactNode }[] = [
  { id: "profile", label: "Company profile", title: "Company profile", icon: <Building2 size={14} strokeWidth={2} /> },
  { id: "dev", label: "R&D", title: "Research and development", icon: <Code2 size={14} strokeWidth={2} /> },
  { id: "mkt", label: "GTM", title: "Go-to-market", icon: <TrendingUp size={14} strokeWidth={2} /> },
  { id: "rev", label: "G&A", title: "General and administrative", icon: <Landmark size={14} strokeWidth={2} /> },
];

const NOTE_TABS: ContextTab[] = ["manual", "files"];
const EMPTY_ANSWERS: DetailAnswers = {};
const MISSING_PREVIEW = 4;

function formatAnswer(question: DetailQuestion, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (question.inputType === "funding_rounds") {
    const rounds = parseProfileFundingRounds(trimmed).length;
    return rounds ? `${rounds} round${rounds === 1 ? "" : "s"}` : "";
  }
  if (question.multi) return parseMultiSelectAnswer(trimmed).join(", ");
  return trimmed;
}

/** Form stores ARR in millions and burn / cash in thousands. Cohort bars use dollars. */
function benchmarkDollars(key: string, raw: string): number | null {
  const cleaned = raw.replace(/[$,%x,\s]/gi, "").replace(/mo(nths?)?$/i, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  if (key === "arr" && Math.abs(value) < 1000) return value * 1_000_000;
  if ((key === "monthlyBurn" || key === "cashOnHand") && Math.abs(value) < 10_000) return value * 1_000;
  return value;
}

function useDetailAnswers(companyName: string): DetailAnswers {
  const [answers, setAnswers] = useState<DetailAnswers>(() => loadDetailAnswers(companyName));
  useEffect(() => {
    const reload = () => setAnswers(loadDetailAnswers(companyName));
    reload();
    window.addEventListener(DETAIL_ANSWERS_CHANGE_EVENT, reload);
    return () => window.removeEventListener(DETAIL_ANSWERS_CHANGE_EVENT, reload);
  }, [companyName]);
  return answers;
}

function Meter({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <span className="f21-ce-meter" aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

function SourceGlyph({ tab }: { tab: ContextTab }) {
  if (tab === "slack" || tab === "granola" || tab === "hubspot") {
    return <ConnectorBrandIcon brand={tab as ConnectorBrand} size={13} />;
  }
  if (tab === "manual") return <NotebookPen size={13} strokeWidth={2} aria-hidden="true" />;
  return <FileText size={13} strokeWidth={2} aria-hidden="true" />;
}

export type ContextEngineArtifact = { id: string; title: string; meta: string };

export function ContextEnginePage({
  artifacts,
  companyName = "Patriot Pay",
  benchmark = {},
  profileFallback = EMPTY_ANSWERS,
}: {
  artifacts?: ContextEngineArtifact[];
  companyName?: string;
  benchmark?: Record<string, string | undefined>;
  /** Public company details shown until the founder saves their own profile answers. */
  profileFallback?: DetailAnswers;
} = {}) {
  const { openDrawer, openContextDrawer } = useFuel21DetailsDrawer();
  const answers = useDetailAnswers(companyName);
  const artifactList = artifacts && artifacts.length > 0 ? artifacts : CONTEXT_ARTIFACTS;
  const [active, setActive] = useState<SourceId>("profile");
  const [query, setQuery] = useState("");
  const [showAllMissing, setShowAllMissing] = useState(false);

  const forms = useMemo(
    () =>
      FORMS.map(form => {
        const section = DETAIL_SECTIONS.find(item => item.id === form.id);
        const questions = section ? getVisibleQuestions(section, answers) : [];
        const rows = questions.map(question => {
          const saved = formatAnswer(question, answers[question.id]);
          const fallback = form.id === "profile" && !saved ? profileFallback[question.id]?.trim() ?? "" : "";
          return { question, value: saved || fallback, inferred: Boolean(fallback) };
        });
        return {
          ...form,
          known: rows.filter(row => row.value),
          missing: rows.filter(row => !row.value),
          inferredCount: rows.filter(row => row.inferred).length,
          total: rows.length,
        };
      }),
    [answers, profileFallback],
  );

  const cohortId = loadBenchmarkCohortId();
  const metrics = BENCHMARK_WIZARD_FIELDS.map(template => {
    const numeric = benchmarkDollars(template.key, String(benchmark[template.key] ?? ""));
    const field = applyCohortPeersToField(template, cohortId);
    return { template, field, numeric };
  });
  const metricsKnown = metrics.filter(metric => metric.numeric != null).length;

  const notes = SOURCE_MATERIALS.filter(item => NOTE_TABS.includes(item.tab));
  const connectorItems = (id: ConnectorId) => SOURCE_MATERIALS.filter(item => item.tab === id);

  const knownTotal = forms.reduce((sum, f) => sum + f.known.length, 0) + metricsKnown;
  const questionTotal = forms.reduce((sum, f) => sum + f.total, 0) + metrics.length;
  const coverage = questionTotal ? Math.round((knownTotal / questionTotal) * 100) : 0;
  const nextGap = [...forms].sort((a, b) => b.missing.length - a.missing.length)[0];

  const select = (id: SourceId) => {
    setActive(id);
    setQuery("");
    setShowAllMissing(false);
  };

  const activeForm = forms.find(f => f.id === active);
  const activeConnector = CONNECTORS.find(c => c.id === active);

  const matches = (text: string) => !query.trim() || text.toLowerCase().includes(query.trim().toLowerCase());

  const renderMaterialList = (items: typeof SOURCE_MATERIALS, empty: string) => {
    const shown = items.filter(item => matches(`${item.title} ${item.meta} ${item.intelligence}`));
    if (!shown.length) return <p className="f21-ce-empty">{query ? "Nothing matches that search." : empty}</p>;
    return (
      <ul className="f21-ce-items">
        {shown.map(item => (
          <li key={item.id} className="f21-ce-item">
            <span className={`f21-source-icon brand-${item.tab}`} data-tab={item.tab}>
              <SourceGlyph tab={item.tab} />
            </span>
            <div className="f21-ce-item-main">
              <strong>{item.title}</strong>
              <span>{item.meta}</span>
            </div>
            <div className="f21-ce-item-learned">
              <span className="f21-ce-label">Fuel learned</span>
              <strong>{item.intelligence}</strong>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderPanel = () => {
    if (activeForm) {
      const missing = showAllMissing ? activeForm.missing : activeForm.missing.slice(0, MISSING_PREVIEW);
      const hiddenCount = activeForm.missing.length - missing.length;
      return (
        <>
          <header className="f21-ce-panel-head">
            <div>
              <h2>{activeForm.title}</h2>
              <p>
                {activeForm.known.length} of {activeForm.total} answered
                {activeForm.inferredCount
                  ? ` · ${activeForm.inferredCount} from your public profile`
                  : ""}
              </p>
            </div>
            <button type="button" className="f21-btn f21-btn-primary" onClick={() => openDrawer(activeForm.id)}>
              <Pencil size={13} strokeWidth={2} aria-hidden="true" />
              {activeForm.known.length ? "Edit answers" : "Start answering"}
            </button>
          </header>

          <section className="f21-ce-block">
            <h3 className="f21-ce-label">What Fuel knows</h3>
            {activeForm.known.length ? (
              <dl className="f21-ce-facts">
                {activeForm.known.map(({ question, value }) => (
                  <div key={question.id}>
                    <dt>{question.prompt}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="f21-ce-empty">Nothing yet. Answer a few questions so Fuel can tailor its advice.</p>
            )}
          </section>

          {activeForm.missing.length ? (
            <section className="f21-ce-block">
              <h3 className="f21-ce-label">Still missing · {activeForm.missing.length}</h3>
              <ul className="f21-ce-missing">
                {missing.map(({ question }) => (
                  <li key={question.id}>
                    <button type="button" onClick={() => openDrawer(activeForm.id)}>
                      <span>{question.prompt}</span>
                      <Plus size={13} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              {hiddenCount > 0 ? (
                <button type="button" className="f21-ce-more" onClick={() => setShowAllMissing(true)}>
                  Show {hiddenCount} more
                </button>
              ) : null}
            </section>
          ) : null}
        </>
      );
    }

    if (active === "benchmark") {
      return (
        <>
          <header className="f21-ce-panel-head">
            <div>
              <h2>Benchmark metrics</h2>
              <p>
                {metricsKnown} of {metrics.length} metrics added · used to compare you with peers
              </p>
            </div>
            <button type="button" className="f21-btn f21-btn-primary" onClick={() => openDrawer("benchmark")}>
              <Pencil size={13} strokeWidth={2} aria-hidden="true" />
              Update metrics
            </button>
          </header>
          <div className="f21-telemetry-benchmark-list">
            {metrics.map(({ template, field, numeric }) => {
              const display =
                numeric != null ? formatBenchmarkDisplay(numeric, template.unit) : "Not added";
              const marker = numeric != null && field ? valueToMarkerPercent(numeric, field) : null;
              const tierStyle =
                numeric != null && field ? getBenchmarkTierStyle(getBenchmarkTier(numeric, field)) : null;
              return (
                <div key={template.key} className="f21-telemetry-benchmark-row">
                  <div className="f21-telemetry-benchmark-row-head">
                    <span className="f21-telemetry-label">{field?.label ?? template.label}</span>
                    <span className="f21-telemetry-val is-inline">{display}</span>
                  </div>
                  {field ? (
                    <div className="f21-telemetry-benchmark-track">
                      <OnboardingBenchmarkBar
                        field={field}
                        dotPct={marker}
                        dotColorValue={tierStyle?.marker ?? "var(--f21-accent)"}
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
                  ) : (
                    <p className="f21-ce-empty">Not in this peer group</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      );
    }

    if (active === "notes" || active === "artifacts" || activeConnector) {
      const title =
        active === "notes" ? "Notes and files" : active === "artifacts" ? "Artifacts" : activeConnector?.name ?? "";
      const sub =
        active === "notes"
          ? "Your notes and uploads"
          : active === "artifacts"
            ? "Saved by Fuel for you"
            : "Connected · synced automatically";
      return (
        <>
          <header className="f21-ce-panel-head">
            <div>
              <h2>{title}</h2>
              <p>{sub}</p>
            </div>
            <div className="f21-ce-head-tools">
              <label className="f21-ce-search">
                <Search size={13} strokeWidth={2} aria-hidden="true" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search"
                  aria-label={`Search ${title}`}
                />
              </label>
              {active === "notes" ? (
                <button type="button" className="f21-btn f21-btn-primary" onClick={openContextDrawer}>
                  <Plus size={14} strokeWidth={2} aria-hidden="true" />
                  Add new
                </button>
              ) : null}
            </div>
          </header>
          {active === "notes" ? (
            renderMaterialList(notes, "No notes or files yet.")
          ) : active === "artifacts" ? (
            (() => {
              const shown = artifactList.filter(item => matches(`${item.title} ${item.meta}`));
              return shown.length ? (
                <ul className="f21-ce-items">
                  {shown.map(item => (
                    <li key={item.id} className="f21-ce-item is-simple">
                      <span className="f21-source-icon" aria-hidden="true">
                        <FileText size={13} strokeWidth={2} />
                      </span>
                      <div className="f21-ce-item-main">
                        <strong>{item.title}</strong>
                        <span>{item.meta}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="f21-ce-empty">Nothing matches that search.</p>
              );
            })()
          ) : activeConnector ? (
            renderMaterialList(connectorItems(activeConnector.id), "Nothing synced yet.")
          ) : null}
        </>
      );
    }
    return null;
  };

  const railItem = (id: SourceId, icon: ReactNode, label: string, meta: ReactNode) => (
    <li key={id}>
      <button
        type="button"
        className={`f21-ce-rail-item${active === id ? " is-active" : ""}`}
        aria-current={active === id ? "true" : undefined}
        onClick={() => select(id)}
      >
        <span className="f21-ce-rail-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="f21-ce-rail-label">{label}</span>
        <span className="f21-ce-rail-meta">{meta}</span>
      </button>
    </li>
  );

  return (
    <div className="f21-page f21-context f21-ce">
      <div className="f21-page-head">
        <div>
          <h1>Context Engine</h1>
          <p className="f21-lede">Everything Fuel knows about {companyName}. Better context means sharper advice.</p>
        </div>
        <div className="f21-page-actions">
          <button type="button" className="f21-btn f21-btn-primary" onClick={openContextDrawer}>
            <Upload size={14} strokeWidth={2} aria-hidden="true" />
            Add context
          </button>
        </div>
      </div>

      <section className="f21-panel f21-ce-coverage" aria-label="Context coverage">
        <div className="f21-ce-coverage-score">
          <strong>{coverage}%</strong>
          <span>
            {knownTotal} of {questionTotal} answers in place
          </span>
        </div>
        <Meter value={knownTotal} total={questionTotal} />
        {nextGap && nextGap.missing.length ? (
          <button type="button" className="f21-ce-next" onClick={() => select(nextGap.id)}>
            Biggest gap: {nextGap.label}, {nextGap.missing.length} questions left
          </button>
        ) : null}
      </section>

      <div className="f21-ce-body">
        <nav className="f21-ce-rail" aria-label="Context sources">
          <div className="f21-ce-rail-group">
            <h2 className="f21-ce-label">About your company</h2>
            <ul>
              {forms.map(f =>
                railItem(f.id, f.icon, f.label, (
                  <>
                    <Meter value={f.known.length} total={f.total} />
                    {f.known.length}/{f.total}
                  </>
                )),
              )}
              {railItem("benchmark", <BarChart3 size={14} strokeWidth={2} />, "Benchmark", (
                <>
                  <Meter value={metricsKnown} total={metrics.length} />
                  {metricsKnown}/{metrics.length}
                </>
              ))}
            </ul>
          </div>

          <div className="f21-ce-rail-group">
            <h2 className="f21-ce-label">Your material</h2>
            <ul>
              {railItem("notes", <NotebookPen size={14} strokeWidth={2} />, "Notes and files", notes.length)}
              {railItem("artifacts", <FileText size={14} strokeWidth={2} />, "Artifacts", artifactList.length)}
            </ul>
          </div>

          <div className="f21-ce-rail-group">
            <h2 className="f21-ce-label">Connected apps</h2>
            <ul>
              {CONNECTORS.map(c =>
                railItem(c.id, <ConnectorBrandIcon brand={c.id} size={13} />, c.name, connectorItems(c.id).length),
              )}
            </ul>
            <button type="button" className="f21-ce-connect">
              <Plus size={13} strokeWidth={2} aria-hidden="true" />
              Connect an app
            </button>
          </div>
        </nav>

        <section className="f21-panel f21-ce-panel">{renderPanel()}</section>
      </div>
    </div>
  );
}
