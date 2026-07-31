import React, { useEffect, useMemo, useState } from "react";
import { ProfileWizardProgressHeader } from "./ProfileWizardProgressHeader";
import {
  computeCreditBalance,
  getModuleReward,
  loadEarnedProfileCredits,
  markModuleEarned,
  type EarnedProfileCredits,
  type ProfileModuleId,
} from "./profileCredits";
import { loadDetailAnswers, saveDetailAnswers } from "./profileDetailsStorage";
import {
  countApplicableQuestions,
  countDetailAnswers,
  countSectionAnswers,
  DETAIL_SECTIONS,
  getVisibleQuestions,
  isMultiSelectSelected,
  toggleMultiSelectAnswer,
  type DetailAnswers,
} from "./trackQuestions.ts";

export type ProfileDrawerInitialSection = ProfileModuleId | "bench";

const SECTION_TO_STEP: Record<ProfileDrawerInitialSection, number> = {
  company: 0,
  bench: 0,
  dev: 1,
  gtm: 2,
  rev: 3,
};

const STEP_TO_MODULE: ProfileModuleId[] = ["company", "dev", "gtm", "rev"];

function stepToModule(step: number): ProfileModuleId {
  return STEP_TO_MODULE[Math.max(0, Math.min(step, STEP_TO_MODULE.length - 1))];
}

type UnifiedProfileDrawerProps = {
  companyName: string;
  companyKey: string;
  initialSection?: ProfileDrawerInitialSection;
  initialAnswers?: DetailAnswers;
  embedded?: boolean;
  earnedProfileCredits?: EarnedProfileCredits;
  onClose: () => void;
  onSaveClose?: () => void;
  onComplete?: (completedModules: ProfileModuleId[]) => void;
  onModuleEarned?: (earned: EarnedProfileCredits) => void;
  onAnswersChange?: (answers: DetailAnswers) => void;
};

export function UnifiedProfileDrawer({
  companyName,
  companyKey,
  initialSection = "company",
  initialAnswers,
  embedded = false,
  earnedProfileCredits,
  onClose,
  onSaveClose,
  onComplete,
  onModuleEarned,
  onAnswersChange,
}: UnifiedProfileDrawerProps) {
  const [step, setStep] = useState(() => SECTION_TO_STEP[initialSection] ?? 0);
  const [answers, setAnswers] = useState<DetailAnswers>(() => ({
    ...loadDetailAnswers(companyKey),
    ...initialAnswers,
  }));
  const [justEarnedModule, setJustEarnedModule] = useState<ProfileModuleId | null>(null);

  useEffect(() => {
    setStep(SECTION_TO_STEP[initialSection] ?? 0);
  }, [initialSection, companyKey]);

  useEffect(() => {
    setAnswers(prev => ({ ...loadDetailAnswers(companyKey), ...initialAnswers, ...prev }));
  }, [companyKey, initialAnswers]);

  const mergedEarned = useMemo((): EarnedProfileCredits => {
    return earnedProfileCredits ?? loadEarnedProfileCredits(companyKey);
  }, [companyKey, earnedProfileCredits]);

  const availableCredits = useMemo(
    () => computeCreditBalance(mergedEarned),
    [mergedEarned],
  );

  const section = DETAIL_SECTIONS[step];
  const visibleQuestions = getVisibleQuestions(section, answers);
  const detailTotal = countApplicableQuestions(answers);
  const answeredTotal = countDetailAnswers(answers);
  const isLast = step === DETAIL_SECTIONS.length - 1;
  const activeModule = stepToModule(step);
  let lastGroup: string | undefined;

  const persistAnswers = (next: DetailAnswers) => {
    setAnswers(next);
    saveDetailAnswers(companyKey, next);
    onAnswersChange?.(next);
  };

  const selectAnswer = (qid: string, value: string) => {
    const next = { ...answers };
    if (value.trim()) next[qid] = value;
    else delete next[qid];
    persistAnswers(next);
  };

  const awardModuleIfNeeded = (module: ProfileModuleId) => {
    if (mergedEarned.modules.includes(module)) return;
    const earned = markModuleEarned(module, companyKey);
    onModuleEarned?.(earned);
    setJustEarnedModule(module);
    window.setTimeout(() => {
      setJustEarnedModule(current => (current === module ? null : current));
    }, 2400);
  };

  const handleSaveExit = () => {
    saveDetailAnswers(companyKey, answers);
    onAnswersChange?.(answers);
    onSaveClose?.();
    onClose();
  };

  const handleSaveAndNext = () => {
    saveDetailAnswers(companyKey, answers);
    onAnswersChange?.(answers);
    awardModuleIfNeeded(activeModule);
    if (isLast) {
      const completedModules = STEP_TO_MODULE.filter(module => {
        const sectionIndex = STEP_TO_MODULE.indexOf(module);
        const detailSection = DETAIL_SECTIONS[sectionIndex];
        if (!detailSection) return mergedEarned.modules.includes(module);
        return countSectionAnswers(detailSection, answers) > 0 || mergedEarned.modules.includes(module);
      });
      onComplete?.(completedModules.length > 0 ? completedModules : mergedEarned.modules);
      onSaveClose?.();
      onClose();
      return;
    }
    setStep(current => current + 1);
  };

  const drawer = (
    <aside
      className={embedded ? "profile-complete-drawer-inner" : "sc-drawer"}
      onClick={event => event.stopPropagation()}
      role="dialog"
      aria-label="Complete your profile"
    >
      {!embedded ? (
        <header className="sc-drawer-head">
          <div>
            <span className="sc-drawer-eyebrow">✦ Fuel AI · Complete profile</span>
            <strong className="sc-drawer-co">{companyName}</strong>
          </div>
          <button type="button" className="sc-drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </header>
      ) : (
        <div className="profile-complete-sticky-head">
          <ProfileWizardProgressHeader
            availableCredits={availableCredits}
            earnedModules={mergedEarned.modules}
            activeModule={activeModule}
            stage={activeModule === "company" ? "profile" : "track"}
            justEarnedModule={justEarnedModule}
            justEarnedCredits={justEarnedModule ? getModuleReward(justEarnedModule) : 0}
            embedded={embedded}
            onClose={onClose}
          />
        </div>
      )}

      <div className="sc-drawer-progress">
        <div
          className="sc-drawer-progress-bar"
          style={{ width: `${Math.round((answeredTotal / Math.max(detailTotal, 1)) * 100)}%` }}
        />
      </div>

      <div className="sc-drawer-body profile-wizard-scroll">
        <div className="sc-drawer-section-head">
          <span className="sc-drawer-section-icon" aria-hidden>{section.icon}</span>
          <div>
            <div className="sc-drawer-section-title">{section.title}</div>
            <div className="sc-drawer-section-sub">{section.subtitle}</div>
          </div>
        </div>

        {visibleQuestions.map(question => {
          const groupHeader = question.group && question.group !== lastGroup ? question.group : null;
          if (question.group) lastGroup = question.group;
          return (
            <React.Fragment key={question.id}>
              {groupHeader ? <div className="sc-drawer-group-label">{groupHeader}</div> : null}
              <div className="sc-drawer-q">
                <div className="sc-drawer-q-prompt">{question.prompt}</div>
                {question.subtitle ? <div className="sc-drawer-q-sub">{question.subtitle}</div> : null}
                {question.kind === "text" ? (
                  <textarea
                    className="sc-drawer-text"
                    rows={3}
                    value={answers[question.id] ?? ""}
                    placeholder={question.placeholder}
                    onChange={event => selectAnswer(question.id, event.target.value)}
                  />
                ) : (
                  <div className="sc-drawer-opts">
                    {(question.options ?? []).map(option => {
                      const selected = question.multi
                        ? isMultiSelectSelected(answers[question.id], option)
                        : answers[question.id] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`sc-drawer-opt${selected ? " is-selected" : ""}`}
                          onClick={() => {
                            if (question.multi) {
                              selectAnswer(question.id, toggleMultiSelectAnswer(answers[question.id], option));
                              return;
                            }
                            selectAnswer(question.id, answers[question.id] === option ? "" : option);
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
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
