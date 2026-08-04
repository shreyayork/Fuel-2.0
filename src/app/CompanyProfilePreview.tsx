import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { drawerPanelPointerProps, useScrimPointerClose } from "./drawerScrim";
import { useDialogA11y } from "./a11y/useDialogA11y";
import type { OnboardingFlowAnswers } from "./OnboardingFlow.tsx";
import { mapOnboardingToDetailAnswers } from "./OnboardingFlow.tsx";
import { loadDetailAnswers } from "./profileDetailsStorage";
import {
  computeProfileAnswerProgress,
  DETAIL_SECTIONS,
  getVisibleQuestions,
  parseProfileFundingRounds,
  type DetailAnswers,
  type DetailQuestion,
  type DetailSection,
  type DetailSectionId,
} from "./trackQuestions.ts";
import type { ProfileDrawerInitialSection } from "./UnifiedProfileDrawer";
import { EMPTY_BENCHMARK_FORM, type BenchmarkFormValues } from "./UnifiedBenchmarkDrawer";
import { BENCHMARK_WIZARD_FIELDS, formatBenchmarkDisplay } from "./FuelOnboardingChat";
import { isModuleInsightReady } from "./profileProgress";
import type { ProfileModuleId } from "./profileCredits";
import "./companyProfilePreview.css";

type PreviewTab = "company" | "dev" | "gtm" | "rev" | "benchmark";

const BENCHMARK_FORM_KEY_ALIASES: Partial<Record<string, keyof BenchmarkFormValues>> = {
  payingCustomers: "paidCustomers",
};

const BENCHMARK_TEXT_FIELDS: { key: keyof BenchmarkFormValues; label: string }[] = [
  { key: "notableCustomers", label: "Notable customer wins" },
  { key: "notableHires", label: "Notable hires" },
  { key: "otherUpdates", label: "Other updates worth surfacing" },
  { key: "biggestChallenges", label: "Biggest challenges" },
];

const PREVIEW_TABS: {
  id: PreviewTab;
  label: string;
  stepLabel: string;
  sectionId?: DetailSectionId;
  icon: string;
  moduleId?: ProfileModuleId;
}[] = [
  { id: "company", label: "Company & founder", stepLabel: "Profile", sectionId: "profile", icon: "◆", moduleId: "company" },
  { id: "dev", label: "R&D", stepLabel: "R&D", sectionId: "dev", icon: "⚙", moduleId: "dev" },
  { id: "gtm", label: "GTM", stepLabel: "GTM", sectionId: "mkt", icon: "◎", moduleId: "gtm" },
  { id: "rev", label: "G&A", stepLabel: "G&A", sectionId: "rev", icon: "◈", moduleId: "rev" },
  { id: "benchmark", label: "Benchmark metrics", stepLabel: "Benchmark", icon: "◉" },
];

const SECTION_TO_EDIT: Record<PreviewTab, ProfileDrawerInitialSection> = {
  company: "company",
  dev: "dev",
  gtm: "gtm",
  rev: "rev",
  benchmark: "bench",
};

function parseBenchmarkPreviewNumber(raw: string): number | null {
  const cleaned = raw.replace(/[$,%x,\s]/gi, "").replace(/mo(nths?)?$/i, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function formatBenchmarkPreviewValue(
  fieldKey: string,
  raw: string,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const wizardField = BENCHMARK_WIZARD_FIELDS.find(item => item.key === fieldKey);
  if (!wizardField) return trimmed;
  const numeric = parseBenchmarkPreviewNumber(trimmed);
  if (numeric != null) return formatBenchmarkDisplay(numeric, wizardField.unit);
  return trimmed;
}

function countFilledBenchmarkMetrics(values: BenchmarkFormValues): number {
  return BENCHMARK_WIZARD_FIELDS.filter(field => {
    const formKey = BENCHMARK_FORM_KEY_ALIASES[field.key] ?? field.key;
    const raw = values[formKey as keyof BenchmarkFormValues];
    return typeof raw === "string" && raw.trim().length > 0;
  }).length;
}

function BenchmarkPreviewFields({ values }: { values: BenchmarkFormValues }) {
  const metricEntries = BENCHMARK_WIZARD_FIELDS.map(field => {
    const formKey = BENCHMARK_FORM_KEY_ALIASES[field.key] ?? field.key;
    const raw = values[formKey as keyof BenchmarkFormValues];
    const display = typeof raw === "string" ? formatBenchmarkPreviewValue(field.key, raw) : null;
    return display ? { key: field.key, label: field.label, display } : null;
  }).filter(Boolean) as { key: string; label: string; display: string }[];

  const textEntries = BENCHMARK_TEXT_FIELDS.map(field => {
    const raw = values[field.key];
    const display = typeof raw === "string" ? raw.trim() : "";
    return display ? { ...field, display } : null;
  }).filter(Boolean) as { key: keyof BenchmarkFormValues; label: string; display: string }[];

  const hasOpenToIntros = values.openToIntros;
  const filledCount = metricEntries.length;

  if (filledCount === 0 && textEntries.length === 0 && !hasOpenToIntros) {
    return (
      <div className="cpp-empty-card">
        <strong>No benchmark metrics yet</strong>
        <p>Add cohort numbers in Edit benchmark to unlock peer comparisons.</p>
      </div>
    );
  }

  return (
    <>
      {filledCount > 0 ? (
        <div className="cpp-field-grid">
          {metricEntries.map(entry => (
            <div key={entry.key} className="cpp-field-card">
              <span className="cpp-field-label">{entry.label}</span>
              <p className="cpp-field-value">{entry.display}</p>
            </div>
          ))}
        </div>
      ) : null}
      {textEntries.length > 0 ? (
        <div className="cpp-field-grid cpp-field-grid--compact cpp-benchmark-text-grid">
          {textEntries.map(entry => (
            <div key={entry.key} className="cpp-field-card is-wide">
              <span className="cpp-field-label">{entry.label}</span>
              <p className="cpp-field-value">{entry.display}</p>
            </div>
          ))}
        </div>
      ) : null}
      {hasOpenToIntros ? (
        <div className="cpp-field-grid cpp-field-grid--compact">
          <div className="cpp-field-card">
            <span className="cpp-field-label">Investor intros</span>
            <p className="cpp-field-value">Open to investor intros this quarter</p>
          </div>
        </div>
      ) : null}
      {filledCount < BENCHMARK_WIZARD_FIELDS.length ? (
        <p className="cpp-empty cpp-empty--muted">
          {BENCHMARK_WIZARD_FIELDS.length - filledCount} more metric{BENCHMARK_WIZARD_FIELDS.length - filledCount === 1 ? "" : "s"} available in benchmark.
        </p>
      ) : null}
    </>
  );
}

function mergePreviewAnswers(
  companyKey: string,
  onboardingAnswers: OnboardingFlowAnswers | null | undefined,
  reloadLandingActive: boolean,
): DetailAnswers {
  const stored = loadDetailAnswers(companyKey);
  if (reloadLandingActive) return stored;
  if (!onboardingAnswers) return stored;
  return { ...mapOnboardingToDetailAnswers(onboardingAnswers), ...stored };
}

function formatAnswerValue(question: DetailQuestion, raw?: string): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;

  if (question.inputType === "funding_rounds") {
    const rounds = parseProfileFundingRounds(value);
    if (!rounds.length) return null;
    return rounds
      .map(round => {
        const parts = [round.type];
        if (round.amount?.trim()) parts.push(round.amount.trim());
        if (round.date?.trim()) parts.push(round.date.trim());
        if (round.investors?.trim()) parts.push(round.investors.trim());
        return parts.join(" · ");
      })
      .join("\n");
  }

  return value;
}

function isLongFormField(question: DetailQuestion, display: string): boolean {
  return question.inputType === "textarea"
    || question.inputType === "funding_rounds"
    || display.includes("\n")
    || display.length > 72;
}

function ProfilePreviewFields({
  section,
  answers,
}: {
  section: DetailSection;
  answers: DetailAnswers;
}) {
  const questions = getVisibleQuestions(section, answers);
  const answered = questions.filter(q => formatAnswerValue(q, answers[q.id]));
  const empty = questions.length - answered.length;

  if (questions.length === 0) {
    return <p className="cpp-empty">No questions in this section yet.</p>;
  }

  return (
    <>
      {answered.length === 0 ? (
        <div className="cpp-empty-card">
          <strong>Nothing submitted yet</strong>
          <p>Add responses in Edit profile to unlock insights for this section.</p>
        </div>
      ) : (
        <div className="cpp-field-grid">
          {answered.map(question => {
            const display = formatAnswerValue(question, answers[question.id]);
            if (!display) return null;
            return (
              <div
                key={question.id}
                className={`cpp-field-card${isLongFormField(question, display) ? " is-wide" : ""}`}
              >
                <span className="cpp-field-label">{question.prompt}</span>
                <p className="cpp-field-value">{display}</p>
              </div>
            );
          })}
        </div>
      )}
      {empty > 0 ? (
        <p className="cpp-empty cpp-empty--muted">
          {empty} more field{empty === 1 ? "" : "s"} available in this section.
        </p>
      ) : null}
    </>
  );
}

function FounderCard({
  name,
  role,
  email,
}: {
  name: string;
  role: string;
  email: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <section className="cpp-card cpp-card--founder" aria-label="Founder details">
      <div className="cpp-card-head">
        <div className="cpp-card-head-row">
          <span className="cpp-card-icon" aria-hidden="true">👤</span>
          <div>
            <h3>Founder details</h3>
            <span className="cpp-card-meta">From onboarding</span>
          </div>
        </div>
      </div>
      <div className="cpp-founder-lead">
        <span className="cpp-founder-avatar" aria-hidden="true">{initial}</span>
        <div>
          <strong className="cpp-founder-name">{name}</strong>
          <span className="cpp-founder-role">{role}</span>
        </div>
      </div>
      <div className="cpp-field-grid cpp-field-grid--compact">
        <div className="cpp-field-card">
          <span className="cpp-field-label">Email</span>
          <p className="cpp-field-value">{email}</p>
        </div>
      </div>
    </section>
  );
}

export function CompanyProfilePreview({
  open,
  companyName,
  companyKey,
  onboardingAnswers,
  reloadLandingActive = false,
  userFullName,
  userRole,
  userEmail,
  syncKey = 0,
  benchmarkValues,
  benchmarkEarned = false,
  onClose,
  onEditProfile,
  onEditBenchmark,
}: {
  open: boolean;
  companyName: string;
  companyKey: string;
  onboardingAnswers?: OnboardingFlowAnswers | null;
  reloadLandingActive?: boolean;
  userFullName?: string;
  userRole?: string;
  userEmail?: string;
  syncKey?: number;
  benchmarkValues?: BenchmarkFormValues;
  benchmarkEarned?: boolean;
  onClose: () => void;
  onEditProfile: (section?: ProfileDrawerInitialSection) => void;
  onEditBenchmark?: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<PreviewTab>("company");
  useDialogA11y(open, dialogRef, onClose);
  const handleScrimPointerDown = useScrimPointerClose(onClose, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const answers = useMemo(
    () => mergePreviewAnswers(companyKey, onboardingAnswers, reloadLandingActive),
    [companyKey, onboardingAnswers, reloadLandingActive, syncKey],
  );

  const progress = useMemo(() => computeProfileAnswerProgress(answers), [answers]);

  const activeSection = PREVIEW_TABS.find(tab => tab.id === activeTab)?.sectionId;
  const section = activeSection ? DETAIL_SECTIONS.find(item => item.id === activeSection) : undefined;
  const activeTabMeta = PREVIEW_TABS.find(tab => tab.id === activeTab);

  const tabDone = useMemo(() => {
    const done: Record<PreviewTab, boolean> = {
      company: false,
      dev: false,
      gtm: false,
      rev: false,
      benchmark: false,
    };
    PREVIEW_TABS.forEach(tab => {
      if (tab.id === "benchmark") {
        done.benchmark = benchmarkEarned || (benchmarkValues ? countFilledBenchmarkMetrics(benchmarkValues) > 0 : false);
        return;
      }
      if (tab.moduleId) done[tab.id] = isModuleInsightReady(tab.moduleId, answers);
    });
    return done;
  }, [answers, benchmarkEarned, benchmarkValues]);

  if (!open) return null;

  const founderName = userFullName?.trim() || "Not provided";
  const founderRole = userRole?.trim() || "Not provided";
  const founderEmail = userEmail?.trim() || "Not provided";
  const progressPct = progress.total > 0 ? Math.min(100, progress.percent) : 0;
  const activeEditLabel = activeTabMeta?.stepLabel ?? "section";

  const handleEditActiveSection = () => {
    if (activeTab === "benchmark") {
      onEditBenchmark?.();
      return;
    }
    onEditProfile(SECTION_TO_EDIT[activeTab]);
  };

  return createPortal(
    <div className="cpp-scrim profile-complete-drawer-scrim" onPointerDown={handleScrimPointerDown} role="presentation">
      <aside
        ref={dialogRef}
        className="cpp-panel profile-complete-drawer"
        {...drawerPanelPointerProps()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cpp-title"
      >
        <header className="cpp-head sc-drawer-head">
          <div className="cpp-head-main">
            <span className="cpp-eyebrow sc-drawer-eyebrow">✦ Profile preview</span>
            <strong id="cpp-title" className="cpp-co sc-drawer-co">{companyName}</strong>
            <div className="cpp-progress sc-drawer-progress" aria-hidden="true">
              <div className="cpp-progress-bar sc-drawer-progress-bar" style={{ width: `${Math.max(progressPct, progress.answered > 0 ? 4 : 0)}%` }} />
            </div>
            <span className="cpp-progress-label">
              {progress.total > 0 ? `${progress.percent}% profile complete` : "Profile not started"}
            </span>
          </div>
          <button type="button" className="cpp-close sc-drawer-x profile-complete-drawer-x" onClick={onClose} aria-label="Close profile preview">
            ✕
          </button>
        </header>

        <div className="cpp-preview-steps profile-wizard-progress pwp-enhanced pwp-compact">
          <ol className="pwp-steps pwp-steps-segmented" aria-label="Profile sections">
            {PREVIEW_TABS.map(tab => {
              const done = tabDone[tab.id];
              const current = activeTab === tab.id;
              return (
                <li
                  key={tab.id}
                  className={`pwp-step${done ? " is-done" : ""}${current ? " is-current" : ""}`}
                >
                  <button
                    type="button"
                    className="pwp-step-btn"
                    aria-current={current ? "step" : undefined}
                    aria-label={`${tab.stepLabel}${current ? ", current section" : ""}`}
                    disabled={current}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="pwp-step-inner">
                      {done ? (
                        <svg
                          className="pwp-step-check"
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M1 4l2.5 2.5L9 1"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                      <span className="pwp-step-label">{tab.stepLabel}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="cpp-shell">
          <div className="cpp-content sc-drawer-body">
            {activeTab === "company" ? (
              <div className="cpp-stack">
                <FounderCard name={founderName} role={founderRole} email={founderEmail} />
                {section ? (
                  <section className="cpp-card" aria-label="Company details">
                    <div className="cpp-card-head">
                      <div className="cpp-card-head-row">
                        <span className="cpp-card-icon" aria-hidden="true">{section.icon}</span>
                        <div>
                          <h3>{section.title}</h3>
                          {section.subtitle ? <span className="cpp-card-meta">{section.subtitle}</span> : null}
                        </div>
                      </div>
                    </div>
                    <ProfilePreviewFields section={section} answers={answers} />
                  </section>
                ) : null}
              </div>
            ) : activeTab === "benchmark" ? (
              <section className="cpp-card cpp-card--solo" aria-label="Benchmark metrics">
                <BenchmarkPreviewFields values={benchmarkValues ?? EMPTY_BENCHMARK_FORM} />
              </section>
            ) : section ? (
              <section className="cpp-card cpp-card--solo" aria-label={section.title}>
                <ProfilePreviewFields section={section} answers={answers} />
              </section>
            ) : null}
          </div>
        </div>

        <footer className="cpp-foot sc-drawer-foot profile-wizard-foot">
          <button
            type="button"
            className="sc-drawer-btn primary"
            onClick={handleEditActiveSection}
          >
            Edit {activeEditLabel}
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
