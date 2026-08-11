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
import type { ProfileModuleId } from "./profileCredits";
import "./companyProfilePreview.css";

export type ProfilePreviewTab = "overview" | "company" | "dev" | "gtm" | "rev" | "benchmark";

type PreviewTab = ProfilePreviewTab;

/** Optional portfolio / company identity snapshot already available in-app (no invented fields). */
export type CompanyProfileSnapshot = {
  logo?: string;
  logoBg?: string;
  logoUrl?: string;
  domain?: string;
  meta?: string;
  stage?: string;
  sector?: string;
  health?: "strong" | "watch" | "struggling";
  onFuel?: boolean;
  headquarters?: string;
  employees?: string;
  invested?: string;
  estimatedValueLabel?: string;
  moicLabel?: string;
  ownership?: string;
  arr?: string;
  arrGrowthLabel?: string;
  runway?: string;
  nrrLabel?: string;
  investedAt?: string;
  lastUpdate?: string;
  daysSinceBenchmark?: number;
  redFlags?: string[];
  strugglingAreas?: string[];
  founderName?: string;
  founderTitle?: string;
  founderEmail?: string;
  founderLinkedin?: string;
};

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
  moduleId?: ProfileModuleId;
}[] = [
  { id: "overview", label: "Overview", stepLabel: "Overview" },
  { id: "company", label: "Company", stepLabel: "Company", sectionId: "profile", moduleId: "company" },
  { id: "dev", label: "R&D", stepLabel: "R&D", sectionId: "dev", moduleId: "dev" },
  { id: "gtm", label: "GTM", stepLabel: "GTM", sectionId: "mkt", moduleId: "gtm" },
  { id: "rev", label: "G&A", stepLabel: "G&A", sectionId: "rev", moduleId: "rev" },
  { id: "benchmark", label: "Benchmarks", stepLabel: "Benchmarks" },
];

const SECTION_TO_EDIT: Record<PreviewTab, ProfileDrawerInitialSection> = {
  overview: "company",
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
  canEdit = true,
}: {
  values: BenchmarkFormValues;
  cohortLabel: string;
  canEdit?: boolean;
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
          <strong>{canEdit ? "No benchmark metrics yet" : "No benchmark metrics available"}</strong>
          <p>
            {canEdit
              ? "Add cohort numbers in Edit benchmark to unlock peer comparisons."
              : "This company has not shared benchmark metrics."}
          </p>
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
                        <th scope="col">{canEdit ? "You" : "Company"}</th>
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
          {canEdit && filledCount > 0 && filledCount < BENCHMARK_WIZARD_FIELDS.length ? (
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
  canEdit = true,
}: {
  section: DetailSection;
  answers: DetailAnswers;
  canEdit?: boolean;
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
          <strong>{canEdit ? "Nothing submitted yet" : "No details available"}</strong>
          <p>
            {canEdit
              ? "Add responses in Edit profile to unlock insights for this section."
              : "This company has not shared profile details for this section."}
          </p>
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
      {canEdit && empty > 0 ? (
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
  linkedin,
}: {
  name: string;
  role: string;
  email: string;
  linkedin?: string;
}) {
  const linkedinHref = linkedin
    ? (linkedin.startsWith("http") ? linkedin : `https://${linkedin}`)
    : null;

  return (
    <section className="cpp-card cpp-card--founder" aria-label="Founder details">
      <div className="cpp-card-head">
        <PreviewSectionHeading title="Founder details" />
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
        {linkedinHref ? (
          <div className="cpp-field-card">
            <span className="cpp-field-label">LinkedIn</span>
            <p className="cpp-field-value">
              <a href={linkedinHref} target="_blank" rel="noreferrer">{linkedin}</a>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProfileIdentityMark({
  companyName,
  snapshot,
}: {
  companyName: string;
  snapshot?: CompanyProfileSnapshot | null;
}) {
  const [useFallback, setUseFallback] = useState(false);
  const logoUrl = snapshot?.logoUrl;
  const initial = snapshot?.logo || companyName.slice(0, 1).toUpperCase();
  const bg = snapshot?.logoBg || "var(--surface-3, #1F3140)";

  if (logoUrl && !useFallback) {
    return (
      <span className="cpp-page-logo cpp-page-logo--photo" aria-hidden="true">
        <img src={logoUrl} alt="" onError={() => setUseFallback(true)} />
      </span>
    );
  }

  return (
    <span className="cpp-page-logo" style={{ background: bg }} aria-hidden="true">
      {initial}
    </span>
  );
}

function healthStatusLabel(health: CompanyProfileSnapshot["health"]): string {
  if (health === "strong") return "Strong";
  if (health === "watch") return "Watch";
  if (health === "struggling") return "Struggling";
  return "";
}

function healthStatusClass(health: CompanyProfileSnapshot["health"]): string {
  if (health === "strong") return "fuel-status-badge fuel-status-badge--good";
  if (health === "watch") return "fuel-status-badge fuel-status-badge--watch";
  if (health === "struggling") return "fuel-status-badge fuel-status-badge--bad";
  return "";
}

function SnapshotFacts({ snapshot }: { snapshot: CompanyProfileSnapshot }) {
  const facts = [
    { label: "Website", value: snapshot.domain },
    { label: "Headquarters", value: snapshot.headquarters },
    { label: "Team size", value: snapshot.employees },
    { label: "Last update", value: snapshot.lastUpdate },
    {
      label: "Benchmark",
      value: snapshot.daysSinceBenchmark != null ? `${snapshot.daysSinceBenchmark}d ago` : undefined,
    },
    { label: "On Fuel", value: snapshot.onFuel == null ? undefined : snapshot.onFuel ? "Yes" : "No" },
  ].filter(item => Boolean(item.value));

  if (facts.length === 0) return null;

  return (
    <section className="cpp-card" aria-label="Company facts">
      <div className="cpp-card-head">
        <PreviewSectionHeading title="Company facts" />
      </div>
      <div className="cpp-field-grid cpp-field-grid--compact">
        {facts.map(fact => (
          <div key={fact.label} className="cpp-field-card">
            <span className="cpp-field-label">{fact.label}</span>
            <p className="cpp-field-value">{fact.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SnapshotMetrics({ snapshot }: { snapshot: CompanyProfileSnapshot }) {
  const metrics = [
    { label: "Invested", value: snapshot.invested },
    { label: "Est. value", value: snapshot.estimatedValueLabel },
    { label: "MOIC", value: snapshot.moicLabel },
    { label: "Ownership", value: snapshot.ownership },
    { label: "ARR", value: snapshot.arrGrowthLabel ? `${snapshot.arr} ${snapshot.arrGrowthLabel}` : snapshot.arr },
    { label: "Runway", value: snapshot.runway },
    { label: "NRR", value: snapshot.nrrLabel },
    { label: "Invested date", value: snapshot.investedAt },
  ].filter(item => Boolean(item.value));

  if (metrics.length === 0) return null;

  return (
    <section className="cpp-card" aria-label="Key metrics">
      <div className="cpp-card-head">
        <PreviewSectionHeading title="Key metrics" />
      </div>
      <div className="cpp-metric-grid">
        {metrics.map(metric => (
          <article key={metric.label} className="cpp-metric-tile">
            <em>{metric.label}</em>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function OverviewSignals({ snapshot }: { snapshot: CompanyProfileSnapshot }) {
  const hasFlags = (snapshot.redFlags?.length ?? 0) > 0;
  const hasAreas = (snapshot.strugglingAreas?.length ?? 0) > 0;
  if (!hasFlags && !hasAreas) return null;

  return (
    <section className="cpp-card" aria-label="Signals and focus">
      <div className="cpp-card-head">
        <PreviewSectionHeading title="Signals & focus" />
      </div>
      {hasFlags ? (
        <ul className="cpp-signal-list">
          {snapshot.redFlags!.map(flag => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      ) : null}
      {hasAreas ? (
        <div className="cpp-chip-row">
          {snapshot.strugglingAreas!.map(area => (
            <span key={area} className="cpp-chip">{area}</span>
          ))}
        </div>
      ) : null}
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
  profileSnapshot?: CompanyProfileSnapshot | null;
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
  initialTab = "overview",
  companyMeta,
  companyDomain,
  profileSnapshot = null,
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
  const companySection = DETAIL_SECTIONS.find(item => item.id === "profile");

  const founderName = canEdit
    ? (userFullName?.trim() || profileSnapshot?.founderName?.trim() || "Not provided")
    : (profileSnapshot?.founderName?.trim() || "Not provided");
  const founderRole = canEdit
    ? (userRole?.trim() || profileSnapshot?.founderTitle?.trim() || "Not provided")
    : (profileSnapshot?.founderTitle?.trim() || "Not provided");
  const founderEmail = canEdit
    ? (userEmail?.trim() || profileSnapshot?.founderEmail?.trim() || "Not provided")
    : (profileSnapshot?.founderEmail?.trim() || "Not provided");
  const progressPct = progress.total > 0 ? Math.min(100, progress.percent) : 0;
  const activeEditLabel = activeTab === "overview"
    ? "Company"
    : (activeTabMeta?.stepLabel ?? "section");

  const progressDisplay = progress.total > 0
    ? progress.percent.toString().padStart(2, "0")
    : "00";

  const metaLine = companyMeta || profileSnapshot?.meta || "";
  const domainLine = companyDomain || profileSnapshot?.domain || "";
  const headerMetrics = [
    { label: "ARR", value: profileSnapshot?.arr },
    { label: "MOIC", value: profileSnapshot?.moicLabel },
    { label: "Runway", value: profileSnapshot?.runway },
    { label: "NRR", value: profileSnapshot?.nrrLabel },
  ].filter(item => Boolean(item.value));

  const handleEditActiveSection = () => {
    if (!canEdit) return;
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
      </div>

      <header className="cpp-page-hero">
        <div className="cpp-page-hero-main">
          <div className="cpp-page-identity">
            <ProfileIdentityMark companyName={companyName} snapshot={profileSnapshot} />
            <div className="cpp-page-hero-copy">
              <span className="cpp-page-eyebrow">
                {canEdit ? "My company" : "Recently viewed"}
              </span>
              <h1 className="cpp-page-title">{companyName}</h1>
              {metaLine || domainLine ? (
                <p className="cpp-page-meta">
                  {metaLine}
                  {metaLine && domainLine ? " · " : null}
                  {domainLine}
                </p>
              ) : null}
              <div className="cpp-page-tags">
                {profileSnapshot?.stage ? (
                  <span className="cpp-page-tag">{profileSnapshot.stage}</span>
                ) : null}
                {profileSnapshot?.sector ? (
                  <span className="cpp-page-tag">{profileSnapshot.sector}</span>
                ) : null}
                {profileSnapshot?.health ? (
                  <span className={healthStatusClass(profileSnapshot.health)}>
                    {healthStatusLabel(profileSnapshot.health)}
                  </span>
                ) : null}
                {profileSnapshot?.onFuel ? (
                  <span className="cpp-page-tag cpp-page-tag--accent">On Fuel</span>
                ) : null}
              </div>
            </div>
          </div>
          {canEdit ? (
            <div className="cpp-page-hero-aside">
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
              <button type="button" className="cpp-page-edit-btn" onClick={handleEditActiveSection}>
                Edit {activeEditLabel}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : headerMetrics.length > 0 ? (
            <div className="cpp-page-header-metrics" aria-label="Key company metrics">
              {headerMetrics.map(metric => (
                <article key={metric.label}>
                  <em>{metric.label}</em>
                  <strong>{metric.value}</strong>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <nav className="tabs cpp-page-tabs" role="tablist" aria-label="Profile sections">
        {PREVIEW_TABS.map(tab => {
          const current = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`tab${current ? " active" : ""}`}
              aria-selected={current}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="cpp-page-body">
        <div className="cpp-page-content">
          {activeTab === "overview" ? (
            <div className="cpp-stack">
              {profileSnapshot ? <SnapshotMetrics snapshot={profileSnapshot} /> : null}
              {canEdit && companySection ? (
                <section className="cpp-card" aria-label="Profile summary">
                  <div className="cpp-card-head">
                    <PreviewSectionHeading
                      title="Profile summary"
                      meta={companySection.subtitle}
                    />
                  </div>
                  <ProfilePreviewFields section={companySection} answers={answers} canEdit={canEdit} />
                </section>
              ) : null}
              {profileSnapshot ? <SnapshotFacts snapshot={profileSnapshot} /> : null}
              <FounderCard
                name={founderName}
                role={founderRole}
                email={founderEmail}
                linkedin={profileSnapshot?.founderLinkedin}
              />
              {profileSnapshot ? <OverviewSignals snapshot={profileSnapshot} /> : null}
              {!profileSnapshot && !canEdit ? (
                <div className="cpp-empty-card">
                  <strong>Limited profile data</strong>
                  <p>No additional company details are available for this view.</p>
                </div>
              ) : null}
            </div>
          ) : activeTab === "company" ? (
            <div className="cpp-stack">
              <FounderCard
                name={founderName}
                role={founderRole}
                email={founderEmail}
                linkedin={profileSnapshot?.founderLinkedin}
              />
              {section ? (
                <section className="cpp-card" aria-label="Company details">
                  <div className="cpp-card-head">
                    <PreviewSectionHeading
                      title={section.title}
                      meta={section.subtitle}
                    />
                  </div>
                  <ProfilePreviewFields section={section} answers={answers} canEdit={canEdit} />
                </section>
              ) : null}
              {profileSnapshot ? <SnapshotFacts snapshot={profileSnapshot} /> : null}
            </div>
          ) : activeTab === "benchmark" ? (
            <BenchmarkPreviewFields
              values={benchmarkValues ?? EMPTY_BENCHMARK_FORM}
              cohortLabel={cohortLabel}
              canEdit={canEdit}
            />
          ) : section ? (
            <section className="cpp-card cpp-card--solo" aria-label={section.title}>
              <div className="cpp-card-head cpp-card-head--solo">
                <PreviewSectionHeading title={section.title} meta={section.subtitle} />
              </div>
              <ProfilePreviewFields section={section} answers={answers} canEdit={canEdit} />
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
