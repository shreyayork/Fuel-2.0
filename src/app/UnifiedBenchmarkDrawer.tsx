import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { drawerPanelPointerProps, useScrimPointerClose } from "./drawerScrim";
import { sanitizeBenchmarkNumericInput } from "./benchmarkInput";
import { useDialogA11y } from "./a11y/useDialogA11y";
import { useSaveExitConfirm } from "./SaveExitConfirmDialog";
import {
  BENCHMARK_REWARD_CREDITS,
  computeCreditBalance,
  loadEarnedProfileCredits,
  PROFILE_TOTAL_CREDITS,
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
  compact = false,
}: {
  label: string;
  cohortKey: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  compact?: boolean;
}) {
  const cohort = BENCHMARK_FIELD_COHORT[cohortKey];
  const filled = value.trim().length > 0;
  const statusLabel = filled ? "Confirmed" : required ? "Needs input" : "Optional";
  const statusTone = filled ? "confirmed" : required ? "needed" : "optional";

  return (
    <label className={`log-private-metric benchmark-suggest-field${compact ? " benchmark-suggest-field--compact" : ""}${filled ? " is-filled" : ""}`}>
      <span className="benchmark-suggest-label-row">
        <span className="benchmark-suggest-label">{label}</span>
        {!filled ? (
          <b className={`benchmark-suggest-status is-${statusTone}`}>{statusLabel}</b>
        ) : null}
      </span>
      <div className="benchmark-metric-input-row">
        <input
          value={value}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          onChange={event => onChange(sanitizeBenchmarkNumericInput(event.target.value))}
          placeholder={placeholder}
          aria-required={required}
        />
        {compact && cohort && !filled ? (
          <button
            type="button"
            className="benchmark-suggest-link"
            onClick={event => {
              event.preventDefault();
              onChange(cohort.median);
            }}
          >
            Use {cohort.median}
          </button>
        ) : null}
      </div>
      {!compact && cohort ? (
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
      ) : !compact && !cohort ? (
        <em className="log-private-no-cohort">no cohort data</em>
      ) : null}
    </label>
  );
}

function BenchmarkDrawerHead({
  companyName,
  availableCredits,
  benchmarkCreditsLeft,
  embedded,
  onClose,
}: {
  companyName: string;
  availableCredits: number;
  benchmarkCreditsLeft: number;
  embedded: boolean;
  onClose: () => void;
}) {
  if (embedded) {
    return (
      <div className="profile-complete-sticky-head">
        <div className="profile-wizard-progress pwp-enhanced pwp-compact benchmark-drawer-head-compact">
          <div className="pwp-top">
            <div className="pwp-title-block">
              <span className="pwp-title">How do you stack up?</span>
            </div>
            <div className="pwp-top-end">
              <div
                className="pwp-credits-wrap"
                aria-live="polite"
                aria-label={`${availableCredits} of ${PROFILE_TOTAL_CREDITS} credits unlocked${benchmarkCreditsLeft > 0 ? `; ${benchmarkCreditsLeft} credits on submit` : ""}`}
              >
                <div className="pwp-credits">
                  <span className="pwp-credits-value">{availableCredits}</span>
                  <span className="pwp-credits-sep">/</span>
                  <span className="pwp-credits-total">{PROFILE_TOTAL_CREDITS}</span>
                </div>
              </div>
              <button type="button" className="profile-complete-drawer-x" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <header className="sc-drawer-head">
      <div>
        <span className="sc-drawer-eyebrow">✦ Fuel AI · Benchmark</span>
        <strong className="sc-drawer-co">{companyName}</strong>
      </div>
      <button type="button" className="sc-drawer-x" onClick={onClose} aria-label="Close">✕</button>
    </header>
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
  /** Persist partial benchmark progress without awarding submit credits. */
  onSaveDraft?: (values: BenchmarkFormValues) => void;
};

export function UnifiedBenchmarkDrawer({
  companyName,
  companyKey,
  initialValues = EMPTY_BENCHMARK_FORM,
  embedded = false,
  earnedProfileCredits,
  onClose,
  onSubmit,
  onSaveDraft,
}: UnifiedBenchmarkDrawerProps) {
  const { requestSaveExit, dialog: saveExitConfirmDialog } = useSaveExitConfirm();
  const [values, setValues] = useState<BenchmarkFormValues>(() => ({ ...initialValues }));
  const hydratedRef = useRef<string | null>(null);
  const initialValuesRef = useRef(initialValues);
  initialValuesRef.current = initialValues;

  // Hydrate once per company open — never while the user is typing.
  useEffect(() => {
    const hydrationKey = companyKey;
    if (hydratedRef.current === hydrationKey) return;
    hydratedRef.current = hydrationKey;
    setValues({ ...initialValuesRef.current });
  }, [companyKey]);

  const mergedEarned = useMemo((): EarnedProfileCredits => {
    return earnedProfileCredits ?? loadEarnedProfileCredits(companyKey);
  }, [companyKey, earnedProfileCredits]);

  const availableCredits = useMemo(
    () => computeCreditBalance(mergedEarned),
    [mergedEarned],
  );

  const benchmarkEarned = Boolean(
    mergedEarned.benchmark && mergedEarned.benchmarkViaSubmit,
  );
  const benchmarkCreditsLeft = benchmarkEarned ? 0 : BENCHMARK_REWARD_CREDITS;
  const filledCount = countFilledBenchmarkMetrics(values);
  const handleScrimPointerDown = useScrimPointerClose(onClose);

  const update = (key: keyof BenchmarkFormValues, next: string | boolean) => {
    setValues(previous => ({ ...previous, [key]: next }));
  };

  const handleSaveExit = () => {
    requestSaveExit(() => {
      onSaveDraft?.(values);
      onClose();
    });
  };

  const handleSubmit = () => {
    onSubmit(values);
    onClose();
  };

  const drawer = (
    <aside
      className={embedded ? "profile-complete-drawer-inner benchmark-wizard-shell benchmark-wizard-shell--single" : "sc-drawer"}
      {...drawerPanelPointerProps()}
      role="dialog"
      aria-label={`Benchmark setup for ${companyName}`}
    >
      <BenchmarkDrawerHead
        companyName={companyName}
        availableCredits={availableCredits}
        benchmarkCreditsLeft={benchmarkCreditsLeft}
        embedded={embedded}
        onClose={onClose}
      />

      <div className="sc-drawer-body profile-wizard-scroll benchmark-wizard-scroll">
        <div className="bench-drawer-intro benchmark-drawer-intro--embedded">
          <strong>✦ The more you share, the sharper your intelligence</strong>
          <p>
            Enter your numbers below — the bar shows where you sit in your cohort. Fuel refreshes{" "}
            {companyName}&rsquo;s intelligence once metrics are in.
            {benchmarkCreditsLeft > 0 ? (
              <> Submit to earn <strong>+{benchmarkCreditsLeft} credits</strong>.</>
            ) : null}
          </p>
        </div>

        <p className="benchmark-drawer-progress-copy" aria-live="polite">
          <span>{filledCount} of {BENCHMARK_METRIC_KEYS.length} core metrics entered</span>
        </p>

        <div className="log-private-sections benchmark-drawer-sections">
          <section className="log-private-section">
            <h3>Scale</h3>
            <p className="log-private-section-lead">Headcount, customers, and ARR anchor your cohort position.</p>
            <div className="log-private-grid benchmark-metric-stack">
              <BenchmarkMetricField compact label="Headcount (FTE)" cohortKey="headcount" value={values.headcount} onChange={v => update("headcount", v)} placeholder="100" />
              <BenchmarkMetricField compact label="Paid customers" cohortKey="paidCustomers" value={values.paidCustomers} onChange={v => update("paidCustomers", v)} placeholder="9990" />
              <BenchmarkMetricField compact label="ARR USD" cohortKey="arr" value={values.arr} onChange={v => update("arr", v)} placeholder="1200" />
            </div>
          </section>

          <section className="log-private-section">
            <h3>Growth &amp; retention</h3>
            <p className="log-private-section-lead">Velocity and retention shape how peers compare your momentum.</p>
            <div className="benchmark-metric-stack">
              <BenchmarkMetricField compact label="ARR growth YoY %" cohortKey="arrGrowth" value={values.arrGrowth} onChange={v => update("arrGrowth", v)} placeholder="10" />
              <div className="log-private-grid two benchmark-metric-pair">
              <BenchmarkMetricField compact label="Net revenue retention %" cohortKey="nrr" value={values.nrr} onChange={v => update("nrr", v)} placeholder="10" />
              <BenchmarkMetricField compact label="Logo retention %" cohortKey="logoRetention" value={values.logoRetention} onChange={v => update("logoRetention", v)} placeholder="10" />
              </div>
            </div>
          </section>

          <section className="log-private-section">
            <h3>Efficiency</h3>
            <p className="log-private-section-lead">Margin, payback, and burn efficiency drive capital comparisons.</p>
            <div className="log-private-grid two benchmark-metric-pair">
              <BenchmarkMetricField compact label="Gross margin %" cohortKey="grossMargin" value={values.grossMargin} onChange={v => update("grossMargin", v)} placeholder="100" />
              <BenchmarkMetricField compact label="CAC payback months" cohortKey="cacPayback" value={values.cacPayback} onChange={v => update("cacPayback", v)} placeholder="100" />
              <BenchmarkMetricField compact label="Burn multiple" cohortKey="burnMultiple" value={values.burnMultiple} onChange={v => update("burnMultiple", v)} placeholder="200" />
              <BenchmarkMetricField compact label="Rule of 40 %" cohortKey="ruleOf40" value={values.ruleOf40} onChange={v => update("ruleOf40", v)} placeholder="20" />
            </div>
          </section>

          <section className="log-private-section">
            <h3>Capital &amp; narrative</h3>
            <p className="log-private-section-lead">Runway context plus updates Fuel can surface in intelligence.</p>
            <div className="log-private-grid two benchmark-metric-pair">
              <BenchmarkMetricField compact label="Cash on hand USD" cohortKey="cashOnHand" value={values.cashOnHand} onChange={v => update("cashOnHand", v)} placeholder="200" />
              <BenchmarkMetricField compact label="Monthly burn USD" cohortKey="monthlyBurn" value={values.monthlyBurn} onChange={v => update("monthlyBurn", v)} placeholder="200" />
            </div>
            <div className="log-private-narrative">
              <label><span>Notable customer wins</span><textarea value={values.notableCustomers} onChange={e => update("notableCustomers", e.target.value)} rows={2} className="sc-drawer-text sc-drawer-text--compact" /></label>
              <label><span>Notable hires</span><textarea value={values.notableHires} onChange={e => update("notableHires", e.target.value)} rows={2} className="sc-drawer-text sc-drawer-text--compact" /></label>
              <label><span>Other updates worth surfacing</span><textarea value={values.otherUpdates} onChange={e => update("otherUpdates", e.target.value)} rows={2} className="sc-drawer-text sc-drawer-text--compact" /></label>
              <label><span>Biggest challenges</span><textarea value={values.biggestChallenges} onChange={e => update("biggestChallenges", e.target.value)} rows={2} className="sc-drawer-text sc-drawer-text--compact" /></label>
            </div>
            <label className="log-private-intros">
              <input type="checkbox" checked={values.openToIntros} onChange={e => update("openToIntros", e.target.checked)} />
              Open to investor intros this quarter
            </label>
          </section>
        </div>

        <p className="bench-drawer-foot benchmark-drawer-foot--embedded">Numbers stay in your workspace and are never shared externally.</p>
      </div>

      <footer className="sc-drawer-foot profile-wizard-foot">
        <button type="button" className="sc-drawer-btn secondary" onClick={handleSaveExit}>
          Save and exit
        </button>
        <button type="button" className="sc-drawer-btn primary" onClick={handleSubmit}>
          Submit benchmark{benchmarkCreditsLeft > 0 ? ` · +${benchmarkCreditsLeft} credits` : ""}
        </button>
      </footer>
    </aside>
  );

  if (embedded) {
    return (
      <>
        {drawer}
        {saveExitConfirmDialog}
      </>
    );
  }

  return (
    <div className="sc-drawer-scrim" onPointerDown={handleScrimPointerDown} role="presentation">
      {drawer}
      {saveExitConfirmDialog}
    </div>
  );
}

export function CompleteBenchmarkDrawer({
  open,
  companyName,
  companyKey,
  initialValues,
  earnedProfileCredits,
  elevatedScrim = false,
  onClose,
  onSubmit,
  onSaveDraft,
}: {
  open: boolean;
  companyName: string;
  companyKey?: string;
  initialValues?: BenchmarkFormValues;
  earnedProfileCredits?: EarnedProfileCredits;
  elevatedScrim?: boolean;
  onClose: () => void;
  onSubmit: (values: BenchmarkFormValues) => void;
  onSaveDraft?: (values: BenchmarkFormValues) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
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

  if (!open) return null;

  return createPortal(
    <div
      className={`profile-complete-drawer-scrim${elevatedScrim ? " profile-complete-drawer-scrim--elevated" : ""}`}
      onPointerDown={handleScrimPointerDown}
      role="presentation"
    >
      <aside
        ref={dialogRef}
        className="profile-complete-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="benchmark-complete-drawer-title"
        {...drawerPanelPointerProps()}
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
            onSaveDraft={onSaveDraft}
          />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
