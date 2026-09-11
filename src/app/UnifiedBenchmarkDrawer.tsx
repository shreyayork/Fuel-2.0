import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { drawerPanelPointerProps, useScrimPointerClose } from "./drawerScrim";
import { useDialogA11y } from "./a11y/useDialogA11y";
import { useSaveExitConfirm } from "./SaveExitConfirmDialog";
import { OnboardingBenchmarkFieldList } from "./OnboardingFlow";
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

function toOverviewBenchmark(values: BenchmarkFormValues): OnboardingBenchmarkInput {
  return {
    arr: values.arr,
    arrGrowth: values.arrGrowth,
    nrr: values.nrr,
    logoRetention: values.logoRetention,
    monthlyBurn: values.monthlyBurn,
    cashOnHand: values.cashOnHand,
    grossMargin: values.grossMargin,
    cacPayback: values.cacPayback,
    burnMultiple: values.burnMultiple,
    ruleOf40: values.ruleOf40,
    headcount: values.headcount,
    payingCustomers: values.paidCustomers,
  };
}

function patchOverviewBenchmark(
  values: BenchmarkFormValues,
  key: string,
  next: string,
): BenchmarkFormValues {
  if (key === "payingCustomers") return { ...values, paidCustomers: next };
  if (key in values) return { ...values, [key]: next };
  return values;
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
  const handleScrimPointerDown = useScrimPointerClose(onClose);

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
      className={embedded ? "profile-complete-drawer-inner" : "sc-drawer"}
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
        <div className="sc-drawer-benchmark">
          <div className="bench-drawer-intro">
            <strong>✦ The more you share, the sharper your intelligence</strong>
            <p>
              Every number narrows your cohort. Once metrics are entered, Fuel rebuilds {companyName}&rsquo;s intelligence, suggested initiatives, and playbooks. This step is optional.
              {benchmarkCreditsLeft > 0 ? (
                <> Submit to earn <strong>+{benchmarkCreditsLeft} credits</strong>.</>
              ) : null}
            </p>
          </div>
          <OnboardingBenchmarkFieldList
            values={toOverviewBenchmark(values)}
            onChange={(key, value) => setValues(previous => patchOverviewBenchmark(previous, key, value))}
            inputClassName="bench-field-input"
          />
          <p className="bench-drawer-foot">Numbers stay in your workspace and are never shared externally.</p>
        </div>
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
