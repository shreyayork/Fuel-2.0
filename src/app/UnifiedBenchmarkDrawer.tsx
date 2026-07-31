import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BenchmarkWizardProgressHeader } from "./BenchmarkWizardProgressHeader";
import {
  computeCreditBalance,
  loadEarnedProfileCredits,
  type EarnedProfileCredits,
} from "./profileCredits";

export type BenchmarkFormValues = {
  headcount: string;
  paidCustomers: string;
  arr: string;
  arrGrowth: string;
  nrr: string;
  logoRetention: string;
  grossMargin: string;
  cacPayback: string;
  burnMultiple: string;
  ruleOf40: string;
  cashOnHand: string;
  monthlyBurn: string;
  openToIntros: boolean;
  notableCustomers: string;
  notableHires: string;
  otherUpdates: string;
  biggestChallenges: string;
};

export const EMPTY_BENCHMARK_FORM: BenchmarkFormValues = {
  headcount: "",
  paidCustomers: "",
  arr: "",
  arrGrowth: "",
  nrr: "",
  logoRetention: "",
  grossMargin: "",
  cacPayback: "",
  burnMultiple: "",
  ruleOf40: "",
  cashOnHand: "",
  monthlyBurn: "",
  openToIntros: false,
  notableCustomers: "",
  notableHires: "",
  otherUpdates: "",
  biggestChallenges: "",
};

export const BENCHMARK_PERIOD = "2026-Q2";

const BENCHMARK_METRIC_KEYS: (keyof BenchmarkFormValues)[] = [
  "headcount",
  "paidCustomers",
  "arr",
  "arrGrowth",
  "nrr",
  "logoRetention",
  "grossMargin",
  "cacPayback",
  "burnMultiple",
  "ruleOf40",
  "cashOnHand",
  "monthlyBurn",
];

const BENCHMARK_FIELD_COHORT: Record<string, { bot25: string; median: string; top25: string; top10: string }> = {
  headcount: { bot25: "6", median: "11", top25: "22", top10: "45" },
  paidCustomers: { bot25: "10", median: "48", top25: "150", top10: "500" },
  arr: { bot25: "$250K", median: "$500K", top25: "$1.2M", top10: "$2.5M" },
  arrGrowth: { bot25: "120%", median: "180%", top25: "350%", top10: "450%" },
  nrr: { bot25: "95%", median: "105%", top25: "125%", top10: "145%" },
  logoRetention: { bot25: "75%", median: "85%", top25: "93%", top10: "97%" },
  grossMargin: { bot25: "55%", median: "72%", top25: "82%", top10: "88%" },
  cacPayback: { bot25: "30.0m", median: "16.0m", top25: "10.0m", top10: "6.0m" },
  burnMultiple: { bot25: "3.50x", median: "2.10x", top25: "1.40x", top10: "0.50x" },
  ruleOf40: { bot25: "—", median: "—", top25: "—", top10: "—" },
  cashOnHand: { bot25: "$500K", median: "$1.3M", top25: "$3.0M", top10: "$6.0M" },
  monthlyBurn: { bot25: "$50K", median: "$100K", top25: "$200K", top10: "$350K" },
};

function countFilledBenchmarkMetrics(values: BenchmarkFormValues): number {
  return BENCHMARK_METRIC_KEYS.filter(key => String(values[key] ?? "").trim().length > 0).length;
}

function BenchmarkMetricField({
  label,
  cohortKey,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  cohortKey: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const cohort = BENCHMARK_FIELD_COHORT[cohortKey];
  const filled = value.trim().length > 0;
  const statusLabel = filled ? "Confirmed" : required ? "Needs your input" : "Optional";
  const statusTone = filled ? "confirmed" : required ? "needed" : "optional";

  return (
    <label className={`log-private-metric benchmark-suggest-field${filled ? " is-filled" : ""}`}>
      <span className="benchmark-suggest-label-row">
        <span className="benchmark-suggest-label">{label}</span>
        <b className={`benchmark-suggest-status is-${statusTone}`}>{statusLabel}</b>
      </span>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        aria-required={required}
      />
      {cohort ? (
        <div className="log-private-metric-cohort">
          <div className="signals-bar" aria-hidden="true"><b /><i /></div>
          <div className="signals-benchmark-scale">
            <span>Bot 25% ({cohort.bot25})</span>
            <span>Median ({cohort.median})</span>
            <span>Top 25% ({cohort.top25})</span>
            <span>Top 10% ({cohort.top10})</span>
          </div>
          <button
            type="button"
            className="benchmark-suggest-apply"
            onClick={event => {
              event.preventDefault();
              onChange(cohort.median);
            }}
          >
            Suggested · Seed median {cohort.median}
          </button>
        </div>
      ) : (
        <em className="log-private-no-cohort">no cohort data</em>
      )}
    </label>
  );
}

type UnifiedBenchmarkDrawerProps = {
  companyName: string;
  companyKey: string;
  initialValues?: BenchmarkFormValues;
  embedded?: boolean;
  earnedProfileCredits?: EarnedProfileCredits;
  onClose: () => void;
  onSubmit: (values: BenchmarkFormValues) => void;
};

export function UnifiedBenchmarkDrawer({
  companyName,
  companyKey,
  initialValues = EMPTY_BENCHMARK_FORM,
  embedded = false,
  earnedProfileCredits,
  onClose,
  onSubmit,
}: UnifiedBenchmarkDrawerProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<BenchmarkFormValues>(() => ({ ...initialValues }));
  const [justEarnedBenchmark, setJustEarnedBenchmark] = useState(false);

  useEffect(() => {
    setValues({ ...initialValues });
    setStep(0);
  }, [companyKey, initialValues]);

  const mergedEarned = useMemo((): EarnedProfileCredits => {
    return earnedProfileCredits ?? loadEarnedProfileCredits(companyKey);
  }, [companyKey, earnedProfileCredits]);

  const availableCredits = useMemo(
    () => computeCreditBalance(mergedEarned),
    [mergedEarned],
  );

  const filledCount = countFilledBenchmarkMetrics(values);
  const progressPct = Math.round((filledCount / BENCHMARK_METRIC_KEYS.length) * 100);
  const isLast = step === 3;

  const update = (key: keyof BenchmarkFormValues, next: string | boolean) => {
    setValues(previous => ({ ...previous, [key]: next }));
  };

  const handleSaveExit = () => {
    onClose();
  };

  const handleSaveAndNext = () => {
    if (isLast) {
      onSubmit(values);
      setJustEarnedBenchmark(true);
      window.setTimeout(() => setJustEarnedBenchmark(false), 2400);
      onClose();
      return;
    }
    setStep(current => current + 1);
  };

  const stepHeadings = [
    { title: "Scale", subtitle: "Headcount, customers, and ARR anchor your cohort position.", icon: "◆" },
    { title: "Growth & retention", subtitle: "Velocity and retention shape how peers compare your momentum.", icon: "◆" },
    { title: "Efficiency", subtitle: "Margin, payback, and burn efficiency drive capital comparisons.", icon: "◆" },
    { title: "Capital & narrative", subtitle: "Runway context plus updates Fuel can surface in intelligence.", icon: "◆" },
  ] as const;

  const section = stepHeadings[step];

  const drawer = (
    <aside
      className={embedded ? "profile-complete-drawer-inner benchmark-wizard-shell" : "sc-drawer"}
      onClick={event => event.stopPropagation()}
      role="dialog"
      aria-label={`Benchmark setup for ${companyName}`}
    >
      {embedded ? (
        <div className="profile-complete-sticky-head">
          <BenchmarkWizardProgressHeader
            availableCredits={availableCredits}
            earnedProfileCredits={mergedEarned}
            activeStep={step}
            justEarnedBenchmark={justEarnedBenchmark}
            embedded={embedded}
            onClose={onClose}
          />
        </div>
      ) : (
        <header className="sc-drawer-head">
          <div>
            <span className="sc-drawer-eyebrow">✦ Fuel AI · Benchmark</span>
            <strong className="sc-drawer-co">{companyName}</strong>
          </div>
          <button type="button" className="sc-drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </header>
      )}

      <div className="sc-drawer-progress">
        <div className="sc-drawer-progress-bar" style={{ width: `${Math.max(progressPct, 4)}%` }} />
      </div>

      <div className="sc-drawer-body profile-wizard-scroll">
        <div className="sc-drawer-section-head">
          <span className="sc-drawer-section-icon" aria-hidden>{section.icon}</span>
          <div>
            <div className="sc-drawer-section-title">{section.title}</div>
            <div className="sc-drawer-section-sub">{section.subtitle}</div>
          </div>
        </div>

        {step === 0 ? (
          <div className="log-private-grid">
            <BenchmarkMetricField label="Headcount (FTE)" cohortKey="headcount" value={values.headcount} onChange={v => update("headcount", v)} placeholder="100" />
            <BenchmarkMetricField label="Paid customers" cohortKey="paidCustomers" value={values.paidCustomers} onChange={v => update("paidCustomers", v)} placeholder="9990" />
            <BenchmarkMetricField label="ARR USD" cohortKey="arr" value={values.arr} onChange={v => update("arr", v)} placeholder="1200" />
          </div>
        ) : null}

        {step === 1 ? (
          <>
            <BenchmarkMetricField label="ARR growth YoY %" cohortKey="arrGrowth" value={values.arrGrowth} onChange={v => update("arrGrowth", v)} placeholder="10" />
            <div className="log-private-grid two">
              <BenchmarkMetricField label="Net revenue retention %" cohortKey="nrr" value={values.nrr} onChange={v => update("nrr", v)} placeholder="10" />
              <BenchmarkMetricField label="Logo retention %" cohortKey="logoRetention" value={values.logoRetention} onChange={v => update("logoRetention", v)} placeholder="10" />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <div className="log-private-grid two">
            <BenchmarkMetricField label="Gross margin %" cohortKey="grossMargin" value={values.grossMargin} onChange={v => update("grossMargin", v)} placeholder="100" />
            <BenchmarkMetricField label="CAC payback months" cohortKey="cacPayback" value={values.cacPayback} onChange={v => update("cacPayback", v)} placeholder="100" />
            <BenchmarkMetricField label="Burn multiple" cohortKey="burnMultiple" value={values.burnMultiple} onChange={v => update("burnMultiple", v)} placeholder="200" />
            <BenchmarkMetricField label="Rule of 40 %" cohortKey="ruleOf40" value={values.ruleOf40} onChange={v => update("ruleOf40", v)} placeholder="20" />
          </div>
        ) : null}

        {step === 3 ? (
          <>
            <div className="log-private-grid two">
              <BenchmarkMetricField label="Cash on hand USD" cohortKey="cashOnHand" value={values.cashOnHand} onChange={v => update("cashOnHand", v)} placeholder="200" />
              <BenchmarkMetricField label="Monthly burn USD" cohortKey="monthlyBurn" value={values.monthlyBurn} onChange={v => update("monthlyBurn", v)} placeholder="200" />
            </div>
            <div className="log-private-narrative">
              <label><span>Notable customer wins</span><textarea value={values.notableCustomers} onChange={e => update("notableCustomers", e.target.value)} rows={2} className="sc-drawer-text" /></label>
              <label><span>Notable hires</span><textarea value={values.notableHires} onChange={e => update("notableHires", e.target.value)} rows={2} className="sc-drawer-text" /></label>
              <label><span>Other updates worth surfacing</span><textarea value={values.otherUpdates} onChange={e => update("otherUpdates", e.target.value)} rows={2} className="sc-drawer-text" /></label>
              <label><span>Biggest challenges</span><textarea value={values.biggestChallenges} onChange={e => update("biggestChallenges", e.target.value)} rows={2} className="sc-drawer-text" /></label>
            </div>
            <label className="log-private-intros">
              <input type="checkbox" checked={values.openToIntros} onChange={e => update("openToIntros", e.target.checked)} />
              Open to investor intros this quarter
            </label>
          </>
        ) : null}
      </div>

      <footer className="sc-drawer-foot profile-wizard-foot">
        <button type="button" className="sc-drawer-btn secondary" onClick={handleSaveExit}>
          Save and exit
        </button>
        <button type="button" className="sc-drawer-btn primary" onClick={handleSaveAndNext}>
          Save and next →
        </button>
      </footer>
    </aside>
  );

  if (embedded) return drawer;

  return (
    <div className="sc-drawer-scrim" onClick={onClose}>
      {drawer}
    </div>
  );
}

export function CompleteBenchmarkDrawer({
  open,
  companyName,
  companyKey,
  initialValues,
  earnedProfileCredits,
  onClose,
  onSubmit,
}: {
  open: boolean;
  companyName: string;
  companyKey?: string;
  initialValues?: BenchmarkFormValues;
  earnedProfileCredits?: EarnedProfileCredits;
  onClose: () => void;
  onSubmit: (values: BenchmarkFormValues) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="profile-complete-drawer-scrim" onClick={onClose} role="presentation">
      <aside
        className="profile-complete-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="benchmark-complete-drawer-title"
        onClick={event => event.stopPropagation()}
      >
        <h2 id="benchmark-complete-drawer-title" className="sr-only">Submit benchmark metrics</h2>
        <div className="profile-complete-drawer-body">
          <UnifiedBenchmarkDrawer
            key={`${companyName}-${companyKey}-benchmark-drawer`}
            embedded
            companyName={companyName}
            companyKey={companyKey ?? companyName}
            initialValues={initialValues}
            earnedProfileCredits={earnedProfileCredits}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
