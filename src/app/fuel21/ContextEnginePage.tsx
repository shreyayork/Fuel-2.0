import { useEffect, useMemo, useState } from "react";
import {
  Filter,
  NotebookPen,
  Pencil,
  Plus,
  Search,
  Upload,
  FileText,
} from "lucide-react";
import { ConnectorBrandIcon, type ConnectorBrand } from "./BrandIcons.tsx";
import {
  CONNECTORS,
  CONTEXT_ARTIFACTS,
  CONTEXT_TABS,
  SOURCE_MATERIALS,
  type ContextTab,
} from "./demoData.ts";
import { useFuel21DetailsDrawer, type Fuel21DrawerSection } from "./Fuel21DetailsDrawer.tsx";
import { DETAIL_ANSWERS_CHANGE_EVENT, loadDetailAnswers } from "../ScorecardV2.tsx";
import {
  DETAIL_SECTIONS,
  getVisibleQuestions,
  parseMultiSelectAnswer,
  parseProfileFundingRounds,
  type DetailAnswers,
  type DetailQuestion,
  type DetailSectionId,
} from "../trackQuestions.ts";

type FormTab = "profile" | "dev" | "mkt" | "rev";
type EngineTab = "notes" | FormTab | "benchmark" | "artifacts" | "slack" | "granola" | "hubspot";

const FORM_TABS: { id: FormTab; label: string; title: string }[] = [
  { id: "profile", label: "Profile", title: "Company profile" },
  { id: "dev", label: "R&D", title: "Research and development" },
  { id: "mkt", label: "GTM", title: "Go-to-market" },
  { id: "rev", label: "G&A", title: "General and administrative" },
];

const BENCHMARK_FIELDS: { key: string; label: string }[] = [
  { key: "arr", label: "Annual recurring revenue" },
  { key: "arrGrowth", label: "Revenue growth (year over year)" },
  { key: "nrr", label: "Net revenue retention" },
  { key: "logoRetention", label: "Customer retention" },
  { key: "grossMargin", label: "Gross margin" },
  { key: "cacPayback", label: "Months to recover acquisition cost" },
  { key: "burnMultiple", label: "Burn multiple" },
  { key: "ruleOf40", label: "Rule of 40" },
  { key: "monthlyBurn", label: "Monthly burn" },
  { key: "cashOnHand", label: "Cash on hand" },
  { key: "headcount", label: "Headcount" },
  { key: "payingCustomers", label: "Paying customers" },
];

const NOTE_SOURCE_TABS: ContextTab[] = ["manual", "files"];
const CONNECTOR_TABS = CONTEXT_TABS.filter(t => t.id === "slack" || t.id === "granola" || t.id === "hubspot");

function SourceGlyph({ tab }: { tab: ContextTab }) {
  if (tab === "slack" || tab === "granola" || tab === "hubspot") {
    return <ConnectorBrandIcon brand={tab as ConnectorBrand} size={13} />;
  }
  if (tab === "manual") return <NotebookPen size={13} strokeWidth={2} aria-hidden="true" />;
  return <FileText size={13} strokeWidth={2} aria-hidden="true" />;
}

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

export type ContextEngineArtifact = { id: string; title: string; meta: string };

export function ContextEnginePage({
  artifacts,
  companyName = "Patriot Pay",
  benchmark = {},
}: {
  artifacts?: ContextEngineArtifact[];
  companyName?: string;
  benchmark?: Record<string, string | undefined>;
} = {}) {
  const { openDrawer, openContextDrawer } = useFuel21DetailsDrawer();
  const answers = useDetailAnswers(companyName);
  const artifactList = artifacts && artifacts.length > 0 ? artifacts : CONTEXT_ARTIFACTS;
  const [tab, setTab] = useState<EngineTab>("notes");
  const [query, setQuery] = useState("");

  const formProgress = useMemo(() => {
    const progress: Partial<Record<FormTab, { answered: number; total: number }>> = {};
    FORM_TABS.forEach(form => {
      const section = DETAIL_SECTIONS.find(item => item.id === form.id);
      const questions = section ? getVisibleQuestions(section, answers) : [];
      progress[form.id] = {
        answered: questions.filter(q => formatAnswer(q, answers[q.id])).length,
        total: questions.length,
      };
    });
    return progress;
  }, [answers]);

  const benchmarkAnswered = BENCHMARK_FIELDS.filter(field => String(benchmark[field.key] ?? "").trim()).length;
  const noteCount = SOURCE_MATERIALS.filter(item => NOTE_SOURCE_TABS.includes(item.tab)).length;

  const filteredArtifacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artifactList;
    return artifactList.filter(
      item => item.title.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q),
    );
  }, [artifactList, query]);

  const filtered = useMemo(() => {
    return SOURCE_MATERIALS.filter(item => {
      if (tab === "notes") {
        if (!NOTE_SOURCE_TABS.includes(item.tab)) return false;
      } else if (item.tab !== tab) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.intelligence.toLowerCase().includes(q) ||
        item.meta.toLowerCase().includes(q)
      );
    });
  }, [tab, query]);

  const activeForm = FORM_TABS.find(form => form.id === tab);
  const isFormTab = Boolean(activeForm) || tab === "benchmark";

  const tabs: { id: EngineTab; label: string; count: string }[] = [
    { id: "notes", label: "Notes", count: String(noteCount) },
    ...FORM_TABS.map(form => ({
      id: form.id,
      label: form.label,
      count: `${formProgress[form.id]?.answered ?? 0}/${formProgress[form.id]?.total ?? 0}`,
    })),
    { id: "benchmark", label: "Benchmark", count: `${benchmarkAnswered}/${BENCHMARK_FIELDS.length}` },
    { id: "artifacts", label: "Artifacts", count: String(artifactList.length) },
    ...CONNECTOR_TABS.map(t => ({ id: t.id as EngineTab, label: t.label, count: String(t.count) })),
  ];

  const openForm = (section: Fuel21DrawerSection) => openDrawer(section);

  return (
    <div className="f21-page f21-context">
      <div className="f21-page-head">
        <div>
          <h1>Context Engine</h1>
          <p className="f21-lede">Everything Fuel knows about your company, in one place.</p>
        </div>
        <div className="f21-page-actions">
          <button type="button" className="f21-btn f21-btn-primary" onClick={openContextDrawer}>
            <Upload size={14} strokeWidth={2} aria-hidden="true" />
            Add context
          </button>
        </div>
      </div>

      <div className="f21-context-tabs" role="tablist" aria-label="Context sources">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`f21-context-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => {
              setTab(t.id);
              setQuery("");
            }}
          >
            {t.label} {t.count}
          </button>
        ))}
        <button type="button" className="f21-link-btn f21-add-connector">
          Add connector +
        </button>
      </div>

      {isFormTab ? (
        <section className="f21-panel f21-context-form-panel">
          <div className="f21-panel-head f21-context-list-head">
            <div>
              <h2>{activeForm ? activeForm.title : "Benchmark"}</h2>
              <p className="f21-context-form-sub">
                {activeForm
                  ? `${formProgress[activeForm.id]?.answered ?? 0} of ${formProgress[activeForm.id]?.total ?? 0} answered`
                  : `${benchmarkAnswered} of ${BENCHMARK_FIELDS.length} metrics added`}
              </p>
            </div>
            <button
              type="button"
              className="f21-btn f21-btn-primary"
              onClick={() => openForm(activeForm ? (activeForm.id as DetailSectionId) : "benchmark")}
            >
              <Pencil size={13} strokeWidth={2} aria-hidden="true" />
              Edit {activeForm ? activeForm.label : "benchmark"}
            </button>
          </div>
          <dl className="f21-context-answers">
            {activeForm
              ? (() => {
                  const section = DETAIL_SECTIONS.find(item => item.id === activeForm.id);
                  const questions = section ? getVisibleQuestions(section, answers) : [];
                  return questions.map(question => {
                    const value = formatAnswer(question, answers[question.id]);
                    return (
                      <div key={question.id} className="f21-context-answer">
                        <dt>{question.prompt}</dt>
                        <dd className={value ? "" : "is-empty"}>{value || "Not answered yet"}</dd>
                      </div>
                    );
                  });
                })()
              : BENCHMARK_FIELDS.map(field => {
                  const value = String(benchmark[field.key] ?? "").trim();
                  return (
                    <div key={field.key} className="f21-context-answer">
                      <dt>{field.label}</dt>
                      <dd className={value ? "" : "is-empty"}>{value || "Not added yet"}</dd>
                    </div>
                  );
                })}
          </dl>
        </section>
      ) : (
        <section className="f21-panel f21-context-list-panel">
            <div className="f21-panel-head f21-context-list-head">
              <h2>{tab === "artifacts" ? "Artifacts" : tab === "notes" ? "Notes and files" : "Source material"}</h2>
              <div className="f21-context-list-tools">
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
                {tab === "notes" ? (
                  <button type="button" className="f21-btn f21-btn-primary" onClick={openContextDrawer}>
                    <Plus size={14} strokeWidth={2} aria-hidden="true" />
                    Add new
                  </button>
                ) : null}
              </div>
            </div>
            {tab === "artifacts" ? null : (
              <div className="f21-context-cols">
                <span>Material / source</span>
                <span>Intelligence / related work</span>
              </div>
            )}
            <ul className="f21-source-list">
              {tab === "artifacts"
                ? filteredArtifacts.map(item => (
                      <li key={item.id}>
                        <div className="f21-source-row">
                          <span className="f21-source-icon" aria-hidden="true">
                            <FileText size={13} strokeWidth={2} />
                          </span>
                          <span className="f21-source-main">
                            <strong>{item.title}</strong>
                            <em>{item.meta}</em>
                          </span>
                        </div>
                      </li>
                    ))
                : filtered.map(item => (
                      <li key={item.id}>
                        <div className="f21-source-row">
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
                        </div>
                      </li>
                    ))}
            </ul>
          </section>
      )}

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
