import React from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  BENCHMARK_REWARD_CREDITS,
  PROFILE_TOTAL_CREDITS,
  type EarnedProfileCredits,
} from "./profileCredits";

export const BENCHMARK_DRAWER_STEPS = [
  { id: "scale", label: "Scale", encouragement: "Start with scale — ARR and customer count anchor your cohort." },
  { id: "growth", label: "Growth", encouragement: "Growth and retention show how durable your revenue engine is." },
  { id: "efficiency", label: "Efficiency", encouragement: "Efficiency metrics power burn, margin, and Rule of 40 comparisons." },
  { id: "capital", label: "Capital", encouragement: "Capital and narrative context sharpen runway and investor readiness." },
] as const;

type BenchmarkWizardProgressHeaderProps = {
  availableCredits: number;
  earnedProfileCredits?: EarnedProfileCredits;
  activeStep: number;
  justEarnedBenchmark?: boolean;
  embedded?: boolean;
  onClose?: () => void;
};

export function BenchmarkWizardProgressHeader({
  availableCredits,
  earnedProfileCredits,
  activeStep,
  justEarnedBenchmark = false,
  embedded = false,
  onClose,
}: BenchmarkWizardProgressHeaderProps) {
  const reduced = useReducedMotion();
  const compact = embedded;
  const benchmarkEarned = Boolean(
    earnedProfileCredits?.benchmark && earnedProfileCredits?.benchmarkViaSubmit,
  );
  const benchmarkCreditsLeft = benchmarkEarned ? 0 : BENCHMARK_REWARD_CREDITS;
  const encouragement = justEarnedBenchmark
    ? `+${BENCHMARK_REWARD_CREDITS} credits unlocked — benchmark submitted!`
    : BENCHMARK_DRAWER_STEPS[activeStep]?.encouragement
      ?? "Submit cohort metrics to unlock peer comparisons and sharper intelligence.";
  const showEncouragement = justEarnedBenchmark || !compact;

  return (
    <div
      className={`profile-wizard-progress pwp-enhanced benchmark-wizard-progress${compact ? " pwp-compact" : ""}${justEarnedBenchmark ? " is-celebrating" : ""}`}
      aria-label="Benchmark progress"
    >
      <div className="pwp-top">
        <motion.div
          className="pwp-title-block"
          initial={reduced ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="pwp-title">Benchmark setup</span>
          {!compact && benchmarkCreditsLeft > 0 ? (
            <span className="pwp-title-sub">+{benchmarkCreditsLeft} credits when you submit</span>
          ) : null}
        </motion.div>

        <div className="pwp-top-end">
          <div
            className="pwp-credits-wrap"
            aria-live="polite"
            aria-label={`${availableCredits} of ${PROFILE_TOTAL_CREDITS} credits unlocked${benchmarkCreditsLeft > 0 ? `; ${benchmarkCreditsLeft} credits available on submit` : ""}`}
          >
            <div className="pwp-credits">
              <span className="pwp-credits-value">{availableCredits}</span>
              <span className="pwp-credits-sep">/</span>
              <span className="pwp-credits-total">{PROFILE_TOTAL_CREDITS}</span>
            </div>
          </div>

          {embedded && onClose ? (
            <button
              type="button"
              className="profile-complete-drawer-x"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <ol className={`pwp-steps${compact ? " pwp-steps-segmented" : ""}`} aria-label="Benchmark sections">
        {BENCHMARK_DRAWER_STEPS.map((step, index) => {
          const done = benchmarkEarned || index < activeStep;
          const current = index === activeStep && !benchmarkEarned;
          return (
            <li
              key={step.id}
              className={`pwp-step${done ? " is-done" : ""}${current ? " is-current" : ""}`}
              aria-current={current ? "step" : undefined}
            >
              <span className="pwp-step-inner">
                {compact ? (
                  done ? (
                    <svg className="pwp-step-check" width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                      <path
                        d="M1 4l2.5 2.5L9 1"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null
                ) : done ? (
                  <svg className="pwp-step-check" width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                    <path
                      d="M1 4l2.5 2.5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : current ? (
                  <span className="pwp-step-dot" aria-hidden="true" />
                ) : null}
                <span className="pwp-step-label">{step.label}</span>
                {!compact && current ? <span className="pwp-step-underline" /> : null}
              </span>
              {!compact && index < BENCHMARK_DRAWER_STEPS.length - 1 ? (
                <span className={`pwp-step-connector${done ? " is-filled" : ""}`} aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {showEncouragement ? (
        <p className={`pwp-encourage${justEarnedBenchmark ? " is-celebrate" : ""}${compact ? " pwp-encourage-compact" : ""}`}>
          {encouragement}
        </p>
      ) : null}
    </div>
  );
}
