import React, { useEffect, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";
import {
  getModuleReward,
  PROFILE_MODULE_REWARDS,
  PROFILE_TOTAL_CREDITS,
  type ProfileModuleId,
} from "./profileCredits";

const STEPPER_STEPS: { id: ProfileModuleId; label: string }[] = [
  { id: "company", label: "Profile" },
  { id: "dev", label: "R&D" },
  { id: "gtm", label: "GTM" },
  { id: "rev", label: "G&A" },
];

const ENCOURAGEMENT: Record<ProfileModuleId, string> = {
  company: "Answer 2+ fields to unlock +40 credits and your early report",
  dev: "Answer 2+ fields to unlock +40 credits and R&D insights",
  gtm: "Answer 2+ fields to unlock +40 credits and GTM insights",
  rev: "Answer 2+ fields to unlock +40 credits and finance insights",
};

const SPRING_SNAPPY = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.82 };

function AnimatedCreditValue({ value, celebrate }: { value: number; celebrate: boolean }) {
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 140, damping: 22, mass: 0.65 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    return spring.on("change", latest => setDisplay(Math.round(latest)));
  }, [reduced, spring, value]);

  return (
    <motion.span
      className="pwp-credits-value"
      animate={celebrate && !reduced ? { scale: [1, 1.18, 1], color: ["#86efac", "#6ee7b7", "#86efac"] } : { scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {display}
    </motion.span>
  );
}

type ProfileWizardProgressHeaderProps = {
  availableCredits: number;
  earnedModules: ProfileModuleId[];
  activeModule: ProfileModuleId;
  stage: "profile" | "track" | "results";
  justEarnedModule: ProfileModuleId | null;
  justEarnedCredits: number;
  embedded?: boolean;
  onClose?: () => void;
};

export function ProfileWizardProgressHeader({
  availableCredits,
  earnedModules,
  activeModule,
  stage,
  justEarnedModule,
  justEarnedCredits,
  embedded = false,
  onClose,
}: ProfileWizardProgressHeaderProps) {
  const reduced = useReducedMotion();
  const compact = embedded;
  const celebrating = Boolean(justEarnedModule);
  const activeStepId = stage === "results" ? null : activeModule;
  const encouragement = stage === "results"
    ? "All sections complete — your intelligence unlock is stronger."
    : activeStepId && !earnedModules.includes(activeStepId)
      ? ENCOURAGEMENT[activeStepId]
      : activeStepId
        ? `${STEPPER_STEPS.find(step => step.id === activeStepId)?.label ?? "Section"} saved — keep going for more credits.`
        : "Keep going — every answer unlocks sharper recommendations.";

  const remainingModuleCredits = STEPPER_STEPS
    .filter(step => !earnedModules.includes(step.id))
    .reduce((sum, step) => sum + PROFILE_MODULE_REWARDS[step.id], 0);

  const showEncouragement = celebrating || stage === "results" || !compact;

  return (
    <div
      className={`profile-wizard-progress pwp-enhanced${compact ? " pwp-compact" : ""}${celebrating ? " is-celebrating" : ""}${stage === "results" ? " is-complete" : ""}`}
      aria-label="Intelligence unlock progress"
    >
      <div className="pwp-top">
        <motion.div
          className="pwp-title-block"
          initial={reduced ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="pwp-title">Profile setup</span>
          {!compact && remainingModuleCredits > 0 && stage !== "results" ? (
            <span className="pwp-title-sub">
              +{remainingModuleCredits} credits left in this wizard
            </span>
          ) : null}
        </motion.div>

        <div className="pwp-top-end">
          <motion.div
            className="pwp-credits-wrap"
            animate={celebrating && !reduced ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="pwp-credits"
              aria-live="polite"
              aria-label={`${availableCredits} of ${PROFILE_TOTAL_CREDITS} credits unlocked${remainingModuleCredits > 0 ? `; ${remainingModuleCredits} credits remaining in this wizard` : ""}`}
            >
              <AnimatedCreditValue value={availableCredits} celebrate={celebrating} />
              <span className="pwp-credits-sep">/</span>
              <span className="pwp-credits-total">{PROFILE_TOTAL_CREDITS}</span>
              <AnimatePresence>
                {justEarnedModule ? (
                  <motion.span
                    key={justEarnedModule}
                    className="pwp-credits-delta"
                    initial={reduced ? false : { opacity: 0, y: 8, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.92 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    +{justEarnedCredits}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
            {celebrating && !reduced ? (
              <span className="pwp-credits-sparkles" aria-hidden="true">
                {[0, 1, 2, 3].map(index => (
                  <motion.span
                    key={index}
                    className="pwp-credits-sparkle"
                    initial={{ opacity: 0, scale: 0.2 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.2, 1, 0.35],
                      x: [0, (index - 1.5) * 10],
                      y: [0, -10 - index * 3],
                    }}
                    transition={{ duration: 0.75, delay: index * 0.05, ease: "easeOut" }}
                  />
                ))}
              </span>
            ) : null}
          </motion.div>

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

      <LayoutGroup id="profile-wizard-steps">
        <ol className={`pwp-steps${compact ? " pwp-steps-segmented" : ""}`} aria-label="Profile sections">
          {STEPPER_STEPS.map((step, index) => {
            const done = earnedModules.includes(step.id) || stage === "results";
            const current = activeModule === step.id && stage !== "results";
            return (
              <motion.li
                key={step.id}
                className={`pwp-step${done ? " is-done" : ""}${current ? " is-current" : ""}`}
                aria-current={current ? "step" : undefined}
                layout={compact ? false : "position"}
                transition={SPRING_SNAPPY}
              >
                <span className="pwp-step-inner">
                  {!compact ? (
                    <AnimatePresence mode="popLayout" initial={false}>
                      {done ? (
                        <motion.svg
                          key="check"
                          className="pwp-step-check"
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                          aria-hidden="true"
                          initial={reduced ? false : { opacity: 0, scale: 0.3, rotate: -18 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, scale: 0.4 }}
                          transition={SPRING_SNAPPY}
                        >
                          <path
                            d="M1 4l2.5 2.5L9 1"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </motion.svg>
                      ) : current ? (
                        <motion.span
                          key="dot"
                          className="pwp-step-dot"
                          aria-hidden="true"
                          initial={reduced ? false : { scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={SPRING_SNAPPY}
                        />
                      ) : null}
                    </AnimatePresence>
                  ) : done ? (
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
                  <span className="pwp-step-label">{step.label}</span>
                  {!compact && current ? (
                    <motion.span
                      layoutId="pwp-step-underline"
                      className="pwp-step-underline"
                      transition={SPRING_SNAPPY}
                    />
                  ) : null}
                </span>
                {!compact && index < STEPPER_STEPS.length - 1 ? (
                  <span className={`pwp-step-connector${done ? " is-filled" : ""}`} aria-hidden="true" />
                ) : null}
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>

      {showEncouragement ? (
        <AnimatePresence mode="wait">
          <motion.p
            key={`${stage}-${activeModule}-${justEarnedModule ?? "idle"}-${compact ? "compact" : "full"}`}
            className={`pwp-encourage${celebrating ? " is-celebrate" : ""}${compact ? " pwp-encourage-compact" : ""}`}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {justEarnedModule
              ? `+${getModuleReward(justEarnedModule)} credits unlocked — nice work!`
              : encouragement}
          </motion.p>
        </AnimatePresence>
      ) : null}
    </div>
  );
}
