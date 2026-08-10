import React, { useEffect, useMemo, useState } from "react";
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
import {
  BENCHMARK_WIZARD_FIELDS,
  formatBenchmarkDisplay,
  getBenchmarkTier,
  getBenchmarkTierStyle,
} from "./FuelOnboardingChat";
import { isModuleInsightReady } from "./profileProgress";
import type { ProfileModuleId } from "./profileCredits";
import "./companyProfilePreview.css";

export type ProfilePreviewTab = "company" | "dev" | "gtm" | "rev" | "benchmark";

type PreviewTab = ProfilePreviewTab;

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

function countFilledBenchmarkMetrics(values: BenchmarkFormValues): number {
  return BENCHMARK_WIZARD_FIELDS.filter(field => {
    const formKey = BENCHMARK_FORM_KEY_ALIASES[field.key] ?? field.key;
    const raw = values[formKey as keyof BenchmarkFormValues];
    return typeof raw === "string" && raw.trim().length > 0;
  }).length;
}

type BenchmarkSnapshotTier = ReturnType<typeof getBenchmarkTier>;

type BenchmarkSnapshotRow = {
  id: string;
  label: string;
  you: string;
  colour: string;
  p25: string;
  p50: string;
  p75: string;
  p90: string;
  band: string;
  tier: BenchmarkSnapshotTier;
  isStrong: boolean;
};

const SNAPSHOT_BAND_LABELS: Record<BenchmarkSnapshotTier, string> = {
  top: "Top decile",
  upper: "Above median",
  mid: "Around median",
  lower: "Below median",
  bottom: "Below cohort",
};

function buildBenchmarkSnapshotRows(values: BenchmarkFormValues): BenchmarkSnapshotRow[] {
  return BENCHMARK_WIZARD_FIELDS.flatMap(field => {
    const formKey = BENCHMARK_FORM_KEY_ALIASES[field.key] ?? field.key;
    const raw = values[formKey as keyof BenchmarkFormValues];
    if (typeof raw !== "string" || !raw.trim()) return [];
    const value = parseBenchmarkPreviewNumber(raw);
    if (value == null) return [];
    const tier = getBenchmarkTier(value, field);
    const tierStyle = getBenchmarkTierStyle(tier);
    return [{
      id: field.key,
      label: field.label,
      you: formatBenchmarkDisplay(value, field.unit),
      colour: tierStyle.value,
      p25: formatBenchmarkDisplay(field.p25, field.unit),
      p50: formatBenchmarkDisplay(field.p50, field.unit),
      p75: formatBenchmarkDisplay(field.p75, field.unit),
      p90: formatBenchmarkDisplay(field.p90, field.unit),
      band: SNAPSHOT_BAND_LABELS[tier],
      tier,
      isStrong: tier === "top" || tier === "upper",
    }];
  });
}

function buildPreviewCohortLabel(answers: DetailAnswers, externalLabel?: string): string {
  if (externalLabel?.trim()) return externalLabel.trim();
  const industry = answers.profile_industry?.trim();
  const product = answers.profile_product_description?.trim();
  const productSegment = product
    ? product.split(/[·—–,]/)[0]?.trim().slice(0, 48)
    : undefined;
  const rounds = parseProfileFundingRounds(answers.profile_funding_rounds ?? "");
  const stage = rounds.length > 0 ? rounds[rounds.length - 1].type : "Seed";
  const parts = [industry, productSegment, stage].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Comparable Seed-stage companies";
}

function BenchmarkPreviewFields({
  values,
  cohortLabel,
}: {
  values: BenchmarkFormValues;
  cohortLabel: string;
}) {
  const snapshotRows = buildBenchmarkSnapshotRows(values);

  const textEntries = BENCHMARK_TEXT_FIELDS.map(field => {
    const raw = values[field.key];
    const display = typeof raw === "string" ? raw.trim() : "";
    return display ? { ...field, display } : null;
  }).filter(Boolean) as { key: keyof BenchmarkFormValues; label: string; display: string }[];

  const hasOpenToIntros = values.openToIntros;
  const filledCount = snapshotRows.length;

  return (
    <section className="cpp-card cpp-card--solo cpp-benchmark-snapshot" aria-label="Benchmark metrics">
      {filledCount === 0 && textEntries.length === 0 && !hasOpenToIntros ? (
        <div className="cpp-empty-card">
          <strong>No benchmark metrics yet</strong>
          <p>Add cohort numbers in Edit benchmark to unlock peer comparisons.</p>
        </div>
      ) : (
        <>
          {filledCount > 0 ? (
            <div className="cpp-snapshot-panel" aria-label="Benchmark snapshot">
              <div className="cpp-snapshot-table-wrap">
                <h3 className="cpp-snapshot-title">Snapshot</h3>
                <div className="cpp-snapshot-table-scroll">
                  <table className="cpp-snapshot-table">
                    <thead>
                      <tr>
                        <th scope="col">Metric</th>
                        <th scope="col">You</th>
                        <th scope="col">Cohort p50</th>
                        <th scope="col">p25</th>
                        <th scope="col">p75</th>
                        <th scope="col">p90</th>
                        <th scope="col">Band</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotRows.map(row => (
                        <tr key={row.id}>
                          <td>{row.label}</td>
                          <td>
                            <strong className="cpp-snapshot-you" style={{ color: row.colour }}>
                              {row.you}
                            </strong>
                          </td>
                          <td>{row.p50}</td>
                          <td>{row.p25}</td>
                          <td>{row.p75}</td>
                          <td>{row.p90}</td>
                          <td>
                            <span className={`cpp-snapshot-band cpp-snapshot-band--${row.tier}`}>
                              {row.isStrong ? (
                                <span className="cpp-snapshot-check" aria-hidden="true">✓</span>
                              ) : null}
                              {row.band}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <footer className="cpp-snapshot-foot">
                  <p className="cpp-snapshot-cohort-note">
                    Peer cohort: {cohortLabel}. Values from the latest private benchmark submission.
                  </p>
                </footer>
              </div>
            </div>
          ) : null}
          {textEntries.length > 0 ? (
            <div className="cpp-field-grid cpp-field-grid--compact cpp-benchmark-text-grid">
              {textEntries.map(entry => (
                <div key={entry.key} className="cpp-field-card">
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
          {filledCount > 0 && filledCount < BENCHMARK_WIZARD_FIELDS.length ? (
            <p className="cpp-empty cpp-empty--muted">
              {BENCHMARK_WIZARD_FIELDS.length - filledCount} more metric{BENCHMARK_WIZARD_FIELDS.length - filledCount === 1 ? "" : "s"} available in benchmark.
            </p>
          ) : null}
        </>
      )}
    </section>
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
              <div key={question.id} className="cpp-field-card">
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

function PreviewSectionHeading({
  title,
  meta,
}: {
  title: string;
  meta?: string | null;
}) {
  return (
    <div className="cpp-section-heading">
      <span className="cpp-section-pointer" aria-hidden="true">›</span>
      <div className="cpp-section-heading-copy">
        <h3>{title}</h3>
        {meta ? <span className="cpp-card-meta">{meta}</span> : null}
      </div>
    </div>
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
  return (
    <section className="cpp-card cpp-card--founder" aria-label="Founder details">
      <div className="cpp-card-head">
        <PreviewSectionHeading title="Founder details" meta="From onboarding" />
      </div>
      <div className="cpp-field-grid cpp-field-grid--compact">
        <div className="cpp-field-card">
          <span className="cpp-field-label">Name</span>
          <p className="cpp-field-value">{name}</p>
        </div>
        <div className="cpp-field-card">
          <span className="cpp-field-label">Role</span>
          <p className="cpp-field-value">{role}</p>
        </div>
        <div className="cpp-field-card">
          <span className="cpp-field-label">Email</span>
          <p className="cpp-field-value">{email}</p>
        </div>
      </div>
    </section>
  );
}

function ProfileProgressRing({
  percent,
  display,
  size = 64,
}: {
  percent: number;
  display: string;
  size?: number;
}) {
  const ringRadius = 26;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeOffset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100);

  return (
    <div className="cpp-page-progress-ring" aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius}
          fill="none"
          stroke="var(--panel-border)"
          strokeWidth="5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={ringRadius}
          fill="none"
          stroke="var(--fuel-accent, var(--accent))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="cpp-page-progress-ring-label">
        <strong>{display}</strong>
      </span>
    </div>
  );
}

export type CompanyProfilePageProps = {
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
  cohortLabel?: string;
  initialTab?: ProfilePreviewTab;
  companyMeta?: string;
  companyDomain?: string;
  canEdit?: boolean;
  onBack: () => void;
  onEditProfile: (section?: ProfileDrawerInitialSection) => void;
  onEditBenchmark?: () => void;
};

export function CompanyProfilePage({
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
  cohortLabel: cohortLabelProp,
  initialTab = "company",
  companyMeta,
  companyDomain,
  canEdit = true,
  onBack,
  onEditProfile,
  onEditBenchmark,
}: CompanyProfilePageProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, companyKey]);

  const answers = useMemo(
    () => mergePreviewAnswers(companyKey, onboardingAnswers, reloadLandingActive),
    [companyKey, onboardingAnswers, reloadLandingActive, syncKey],
  );

  const progress = useMemo(() => computeProfileAnswerProgress(answers), [answers]);

  const cohortLabel = useMemo(
    () => buildPreviewCohortLabel(answers, cohortLabelProp),
    [answers, cohortLabelProp],
  );

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

  const founderName = userFullName?.trim() || "Not provided";
  const founderRole = userRole?.trim() || "Not provided";
  const founderEmail = userEmail?.trim() || "Not provided";
  const progressPct = progress.total > 0 ? Math.min(100, progress.percent) : 0;
  const activeEditLabel = activeTabMeta?.stepLabel ?? "section";

  const progressDisplay = progress.total > 0
    ? progress.percent.toString().padStart(2, "0")
    : "00";

  const handleEditActiveSection = () => {
    if (activeTab === "benchmark") {
      onEditBenchmark?.();
      return;
    }
    onEditProfile(SECTION_TO_EDIT[activeTab]);
  };

  return (
    <div className="cpp-page">
      <div className="cpp-page-toolbar">
        <button type="button" className="cpp-page-back" onClick={onBack}>
          ← Back
        </button>
        {canEdit ? (
          <button type="button" className="cpp-page-edit-btn" onClick={handleEditActiveSection}>
            Edit {activeEditLabel}
            <span aria-hidden="true">→</span>
          </button>
        ) : (
          <span className="cpp-page-readonly-badge">View only</span>
        )}
      </div>

      <header className="cpp-page-hero">
        <div className="cpp-page-hero-main">
          <div className="cpp-page-hero-copy">
            <span className="cpp-page-eyebrow">{canEdit ? "Company profile" : "Recently viewed"}</span>
            <h1 className="cpp-page-title">{companyName}</h1>
            {companyMeta || companyDomain ? (
              <p className="cpp-page-meta">
                {companyMeta}
                {companyMeta && companyDomain ? " · " : null}
                {companyDomain}
              </p>
            ) : null}
          </div>
          <div className="cpp-page-progress-card" aria-label="Profile completion">
            <ProfileProgressRing percent={progressPct} display={progressDisplay} />
            <div className="cpp-page-progress-copy">
              <span>Profile complete</span>
              <p>
                {progress.answered > 0
                  ? `${progress.answered} of ${progress.total} fields answered`
                  : "No profile fields answered yet"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <nav className="cpp-page-tabs" aria-label="Profile sections">
        {PREVIEW_TABS.map(tab => {
          const done = tabDone[tab.id];
          const current = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`cpp-page-tab${current ? " is-active" : ""}${done ? " is-done" : ""}`}
              aria-current={current ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              {done ? <span className="cpp-page-tab-check" aria-hidden="true">✓</span> : null}
              {tab.stepLabel}
            </button>
          );
        })}
      </nav>

      <div className="cpp-page-body">
        <div className="cpp-page-content">
          {activeTab === "company" ? (
            <div className="cpp-stack">
              <FounderCard name={founderName} role={founderRole} email={founderEmail} />
              {section ? (
                <section className="cpp-card" aria-label="Company details">
                  <div className="cpp-card-head">
                    <PreviewSectionHeading
                      title={section.title}
                      meta={section.subtitle}
                    />
                  </div>
                  <ProfilePreviewFields section={section} answers={answers} />
                </section>
              ) : null}
            </div>
          ) : activeTab === "benchmark" ? (
            <BenchmarkPreviewFields
              values={benchmarkValues ?? EMPTY_BENCHMARK_FORM}
              cohortLabel={cohortLabel}
            />
          ) : section ? (
            <section className="cpp-card cpp-card--solo" aria-label={section.title}>
              <div className="cpp-card-head cpp-card-head--solo">
                <PreviewSectionHeading title={section.title} meta={section.subtitle} />
              </div>
              <ProfilePreviewFields section={section} answers={answers} />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use CompanyProfilePage — drawer preview removed in favor of full-page profile. */
export function CompanyProfilePreview(props: CompanyProfilePageProps & { open: boolean; onClose: () => void }) {
  const { open, onClose, ...pageProps } = props;
  if (!open) return null;
  return <CompanyProfilePage {...pageProps} onBack={onClose} />;
}
