import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { drawerPanelPointerProps, useScrimPointerClose } from "./drawerScrim";
import { confirmDiscardAndClose } from "./formConfirm";
import { useSaveExitConfirm } from "./SaveExitConfirmDialog";
import { ProfileWizardProgressHeader } from "./ProfileWizardProgressHeader";
import {
  computeCreditBalance,
  getModuleReward,
  loadEarnedProfileCredits,
  tryMarkModuleEarned,
  type EarnedProfileCredits,
  type ProfileCreditReward,
  type ProfileModuleId,
} from "./profileCredits";
import {
  isModuleInsightReady,
  moduleCreditsHeadline,
  moduleCreditsMessage,
} from "./profileProgress";
import { loadDetailAnswers, saveDetailAnswers } from "./profileDetailsStorage";
import {
  countSectionAnswers,
  DETAIL_SECTIONS,
  getVisibleQuestions,
  isMultiSelectSelected,
  parseProfileFundingRounds,
  PROFILE_FUNDING_ROUND_TYPES,
  serializeProfileFundingRounds,
  toggleMultiSelectAnswer,
  type DetailAnswers,
  type DetailQuestion,
  type DetailTextInputType,
  type ProfileFundingRound,
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

function resolveTextInputType(question: DetailQuestion): DetailTextInputType {
  if (question.inputType) return question.inputType;
  return "textarea";
}

function fundingRoundId(): string {
  return `fr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function ProfileFundingRoundsInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const rounds = parseProfileFundingRounds(value);

  const updateRounds = (next: ProfileFundingRound[]) => {
    onChange(next.length > 0 ? serializeProfileFundingRounds(next) : "");
  };

  const addRound = () => {
    updateRounds([
      ...rounds,
      { id: fundingRoundId(), type: "Seed", amount: "", date: "", investors: "" },
    ]);
  };

  const updateRound = (id: string, key: keyof ProfileFundingRound, nextValue: string) => {
    updateRounds(rounds.map(round => (round.id === id ? { ...round, [key]: nextValue } : round)));
  };

  const deleteRound = (id: string) => {
    updateRounds(rounds.filter(round => round.id !== id));
  };

  return (
    <div className="sc-drawer-funding">
      <div className="sc-drawer-funding-head">
        <button type="button" className="sc-drawer-funding-add" onClick={addRound}>
          + Add round
        </button>
      </div>
      {rounds.length > 0 ? (
        <div className="sc-drawer-funding-list">
          {rounds.map(round => (
            <div key={round.id} className="sc-drawer-funding-row">
              <select
                className="sc-drawer-input sc-drawer-funding-type"
                value={round.type}
                aria-label="Round type"
                onChange={event => updateRound(round.id, "type", event.target.value)}
              >
                {PROFILE_FUNDING_ROUND_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <input
                className="sc-drawer-input sc-drawer-funding-amount"
                value={round.amount}
                placeholder="$1.2M"
                aria-label="Round amount"
                onChange={event => updateRound(round.id, "amount", event.target.value)}
              />
              <input
                type="date"
                className="sc-drawer-input sc-drawer-funding-date"
                value={round.date}
                aria-label="Round date"
                onChange={event => updateRound(round.id, "date", event.target.value)}
              />
              <input
                className="sc-drawer-input sc-drawer-funding-investors"
                value={round.investors}
                placeholder="Investors"
                aria-label="Round investors"
                onChange={event => updateRound(round.id, "investors", event.target.value)}
              />
              <button
                type="button"
                className="sc-drawer-funding-remove"
                aria-label="Remove funding round"
                onClick={() => deleteRound(round.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProfileQuestionInput({
  question,
  value,
  onChange,
}: {
  question: DetailQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputType = resolveTextInputType(question);
  const placeholder = question.placeholder;

  if (inputType === "funding_rounds") {
    return <ProfileFundingRoundsInput value={value} onChange={onChange} />;
  }

  if (inputType === "year") {
    return (
      <input
        id={question.id}
        type="text"
        inputMode="numeric"
        className="sc-drawer-input sc-drawer-input--year"
        value={value}
        placeholder={placeholder}
        maxLength={4}
        autoComplete="off"
        aria-label={question.prompt}
        onChange={event => onChange(event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
      />
    );
  }

  if (inputType === "url") {
    return (
      <input
        id={question.id}
        type="url"
        className="sc-drawer-input sc-drawer-input--url"
        value={value}
        placeholder={placeholder}
        autoComplete="url"
        spellCheck={false}
        onChange={event => onChange(event.target.value)}
      />
    );
  }

  if (inputType === "short") {
    return (
      <input
        id={question.id}
        type="text"
        className="sc-drawer-input sc-drawer-input--short"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={event => onChange(event.target.value)}
      />
    );
  }

  const rows = question.rows ?? 3;
  return (
    <textarea
      id={question.id}
      className={`sc-drawer-text${rows <= 2 ? " sc-drawer-text--compact" : ""}`}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
    />
  );
}

function renderChoiceOptions(
  question: DetailQuestion,
  answers: DetailAnswers,
  selectAnswer: (qid: string, value: string) => void,
) {
  const groupId = `${question.id}-legend`;
  const isMulti = Boolean(question.multi);

  if (question.cardStyle) {
    return (
      <fieldset className="sc-drawer-opts-fieldset sc-drawer-opts-fieldset--cards">
        <legend id={groupId} className="sr-only">{question.prompt}</legend>
        <div className="sc-drawer-org-cards" role="radiogroup" aria-labelledby={groupId}>
          {(question.options ?? []).map(option => {
            const selected = answers[question.id] === option;
            const description = question.cardDescriptions?.[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`sc-drawer-org-card${selected ? " is-selected" : ""}`}
                onClick={() => selectAnswer(question.id, selected ? "" : option)}
              >
                <span className="sc-drawer-org-radio" aria-hidden="true">
                  {selected ? <span className="sc-drawer-org-radio-dot" /> : null}
                </span>
                <span className="sc-drawer-org-copy">
                  <strong>{option}</strong>
                  {description ? <small>{description}</small> : null}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className={`sc-drawer-opts-fieldset${(question.options?.length ?? 0) <= 3 ? " sc-drawer-opts-fieldset--stack" : ""}`}>
      <legend id={groupId} className="sr-only">{question.prompt}</legend>
      <div className={`sc-drawer-opts${(question.options?.length ?? 0) <= 3 ? " sc-drawer-opts--stack" : ""}`} role={isMulti ? "group" : undefined} aria-labelledby={groupId}>
        {(question.options ?? []).map(option => {
          const selected = isMulti
            ? isMultiSelectSelected(answers[question.id], option)
            : answers[question.id] === option;
          return (
            <button
              key={option}
              type="button"
              className={`sc-drawer-opt${selected ? " is-selected" : ""}`}
              aria-pressed={selected}
              onClick={() => {
                if (isMulti) {
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
    </fieldset>
  );
}

type QuestionRenderBlock =
  | { kind: "single"; question: DetailQuestion; groupHeader: string | null }
  | { kind: "field-row"; questions: DetailQuestion[]; groupHeader: string | null };

function buildQuestionBlocks(questions: DetailQuestion[]): QuestionRenderBlock[] {
  const blocks: QuestionRenderBlock[] = [];
  let lastGroup: string | undefined;
  let index = 0;

  while (index < questions.length) {
    const question = questions[index];
    const groupHeader = question.group && question.group !== lastGroup ? question.group : null;
    const inputType = resolveTextInputType(question);

    if (
      question.group
      && (inputType === "short" || inputType === "year")
    ) {
      const rowQuestions: DetailQuestion[] = [];
      const groupName = question.group;
      while (
        index < questions.length
        && questions[index].group === groupName
        && (resolveTextInputType(questions[index]) === "short"
          || resolveTextInputType(questions[index]) === "year")
      ) {
        rowQuestions.push(questions[index]);
        index += 1;
      }
      blocks.push({ kind: "field-row", questions: rowQuestions, groupHeader });
      lastGroup = groupName;
      continue;
    }

    blocks.push({ kind: "single", question, groupHeader });
    if (question.group) lastGroup = question.group;
    index += 1;
  }

  return blocks;
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
  onModuleSaved?: (module: ProfileModuleId, answers: DetailAnswers) => void;
  onModuleProgress?: (module: ProfileModuleId, answers: DetailAnswers) => void;
  onModuleCreditReward?: (reward: ProfileCreditReward) => void;
  onAnswersChange?: (answers: DetailAnswers) => void;
  /** Parent scrim / shell can call the same guarded close handler as the drawer X button. */
  onBindRequestClose?: (requestClose: () => void) => void;
  /** After browser reload — empty forms, no onboarding prefill until user types. */
  reloadLandingActive?: boolean;
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
  onModuleSaved,
  onModuleProgress,
  onModuleCreditReward,
  onAnswersChange,
  onBindRequestClose,
  reloadLandingActive = false,
}: UnifiedProfileDrawerProps) {
  const { requestSaveExit, dialog: saveExitConfirmDialog } = useSaveExitConfirm();
  const [step, setStep] = useState(() => SECTION_TO_STEP[initialSection] ?? 0);
  const [answers, setAnswers] = useState<DetailAnswers>(() => {
    if (reloadLandingActive) {
      return companyName.trim() ? { profile_company: companyName.trim() } : {};
    }
    return {
      ...(initialAnswers ?? {}),
      ...loadDetailAnswers(companyKey),
    };
  });
  const [justEarnedModule, setJustEarnedModule] = useState<ProfileModuleId | null>(null);
  const hydratedRef = useRef<string | null>(null);
  const initialAnswersRef = useRef(initialAnswers);
  initialAnswersRef.current = initialAnswers;
  const baselineAnswersRef = useRef<DetailAnswers>({});
  const progressTriggeredRef = useRef<Set<ProfileModuleId>>(new Set());

  useEffect(() => {
    setStep(SECTION_TO_STEP[initialSection] ?? 0);
    progressTriggeredRef.current = new Set();
  }, [initialSection, companyKey]);

  // Hydrate from storage once per company/section open — never while the user is typing.
  useEffect(() => {
    const hydrationKey = `${companyKey}:${initialSection}`;
    if (hydratedRef.current === hydrationKey) return;
    hydratedRef.current = hydrationKey;
    setAnswers(() => {
      const loaded: DetailAnswers = reloadLandingActive
        ? (companyName.trim() ? { profile_company: companyName.trim() } : {})
        : {
            ...(initialAnswersRef.current ?? {}),
            ...loadDetailAnswers(companyKey),
          };
      if (!reloadLandingActive && !loaded.profile_company?.trim() && companyName.trim()) {
        loaded.profile_company = companyName.trim();
      }
      baselineAnswersRef.current = { ...loaded };
      return loaded;
    });
  }, [companyKey, companyName, initialSection, reloadLandingActive]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(answers) !== JSON.stringify(baselineAnswersRef.current),
    [answers],
  );

  const mergedEarned = useMemo((): EarnedProfileCredits => {
    return earnedProfileCredits ?? loadEarnedProfileCredits(companyKey);
  }, [companyKey, earnedProfileCredits]);

  const availableCredits = useMemo(
    () => computeCreditBalance(mergedEarned),
    [mergedEarned],
  );

  const section = DETAIL_SECTIONS[step];
  const visibleQuestions = getVisibleQuestions(section, answers);
  const questionBlocks = buildQuestionBlocks(visibleQuestions);
  const isLast = step === DETAIL_SECTIONS.length - 1;
  const activeModule = stepToModule(step);

  const maybeUnlockModuleProgress = (next: DetailAnswers, module: ProfileModuleId) => {
    if (!isModuleInsightReady(module, next)) return;

    if (!mergedEarned.modules.includes(module)) {
      const { earned, reward } = tryMarkModuleEarned(
        module,
        companyKey,
        moduleCreditsHeadline(module),
        moduleCreditsMessage(module),
      );
      if (reward) {
        onModuleEarned?.(earned);
        onModuleCreditReward?.(reward);
        setJustEarnedModule(module);
        window.setTimeout(() => {
          setJustEarnedModule(current => (current === module ? null : current));
        }, 2400);
      }
    }

    if (!progressTriggeredRef.current.has(module)) {
      progressTriggeredRef.current.add(module);
      onModuleProgress?.(module, next);
    }
  };

  const selectAnswer = (qid: string, value: string) => {
    setAnswers(prev => {
      const next = { ...prev };
      if (value === "") delete next[qid];
      else next[qid] = value;
      saveDetailAnswers(companyKey, next);
      return next;
    });
  };

  const awardModuleIfNeeded = (module: ProfileModuleId) => {
    if (mergedEarned.modules.includes(module)) return;
    if (!isModuleInsightReady(module, answers)) return;
    const { earned, reward } = tryMarkModuleEarned(
      module,
      companyKey,
      moduleCreditsHeadline(module),
      moduleCreditsMessage(module),
    );
    if (!reward) return;
    onModuleEarned?.(earned);
    onModuleCreditReward?.(reward);
    setJustEarnedModule(module);
    window.setTimeout(() => {
      setJustEarnedModule(current => (current === module ? null : current));
    }, 2400);
  };

  const notifyModuleSaved = (savedAnswers: DetailAnswers) => {
    onModuleSaved?.(activeModule, savedAnswers);
  };

  const persistAndClose = useCallback(() => {
    saveDetailAnswers(companyKey, answers);
    baselineAnswersRef.current = { ...answers };
    maybeUnlockModuleProgress(answers, activeModule);
    onAnswersChange?.(answers);
    awardModuleIfNeeded(activeModule);
    notifyModuleSaved(answers);
    onSaveClose?.();
    onClose();
  }, [activeModule, answers, companyKey, onAnswersChange, onClose, onSaveClose]);

  const requestClose = useCallback(() => {
    if (!hasUnsavedChanges) {
      onClose();
      return;
    }
    if (!confirmDiscardAndClose()) return;
    onClose();
  }, [hasUnsavedChanges, onClose]);

  const handleScrimPointerDown = useScrimPointerClose(requestClose);

  useEffect(() => {
    onBindRequestClose?.(requestClose);
  }, [onBindRequestClose, requestClose]);

  const handleSaveExit = () => {
    requestSaveExit(persistAndClose);
  };

  const handleSaveAndNext = () => {
    saveDetailAnswers(companyKey, answers);
    baselineAnswersRef.current = { ...answers };
    maybeUnlockModuleProgress(answers, activeModule);
    onAnswersChange?.(answers);
    awardModuleIfNeeded(activeModule);
    notifyModuleSaved(answers);
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

  const goToStep = useCallback((targetStep: number) => {
    if (targetStep === step) return;
    saveDetailAnswers(companyKey, answers);
    baselineAnswersRef.current = { ...answers };
    maybeUnlockModuleProgress(answers, activeModule);
    onAnswersChange?.(answers);
    setStep(targetStep);
  }, [activeModule, answers, companyKey, onAnswersChange, step]);

  const drawer = (
    <aside
      className={embedded ? "profile-complete-drawer-inner" : "sc-drawer"}
      {...drawerPanelPointerProps()}
      role="dialog"
      aria-label="Complete your profile"
    >
      {!embedded ? (
        <header className="sc-drawer-head">
          <div>
            <span className="sc-drawer-eyebrow">✦ Fuel AI · Complete profile</span>
            <strong className="sc-drawer-co">{companyName}</strong>
          </div>
          <button type="button" className="sc-drawer-x" onClick={requestClose} aria-label="Close">✕</button>
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
            onClose={requestClose}
            onStepSelect={(_moduleId, index) => goToStep(index)}
          />
        </div>
      )}

      <div className="sc-drawer-body profile-wizard-scroll">
        <div className="sc-drawer-section-head">
          <span className="sc-drawer-section-icon" aria-hidden>{section.icon}</span>
          <div>
            <div className="sc-drawer-section-title">{section.title}</div>
            <div className="sc-drawer-section-sub">{section.subtitle}</div>
          </div>
        </div>

        {questionBlocks.map(block => {
          if (block.kind === "field-row") {
            return (
              <React.Fragment key={block.questions.map(q => q.id).join("-")}>
                {block.groupHeader ? <div className="sc-drawer-group-label">{block.groupHeader}</div> : null}
                <div className="sc-drawer-field-grid">
                  {block.questions.map(question => (
                    <div key={question.id} className="sc-drawer-q sc-drawer-q--inline">
                      <label className="sc-drawer-q-prompt" htmlFor={question.id}>{question.prompt}</label>
                      {question.subtitle ? <div className="sc-drawer-q-sub">{question.subtitle}</div> : null}
                      {question.sourceHint ? (
                        <div className="sc-drawer-source-hint">• {question.sourceHint}</div>
                      ) : null}
                      <ProfileQuestionInput
                        question={question}
                        value={answers[question.id] ?? ""}
                        onChange={value => selectAnswer(question.id, value)}
                      />
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          }

          const question = block.question;
          const isText = question.kind === "text";
          const isFunding = resolveTextInputType(question) === "funding_rounds";
          return (
            <React.Fragment key={question.id}>
              {block.groupHeader ? <div className="sc-drawer-group-label">{block.groupHeader}</div> : null}
              <div className={`sc-drawer-q${resolveTextInputType(question) === "year" ? " sc-drawer-q--year" : ""}${isFunding ? " sc-drawer-q--funding" : ""}`}>
                {isText && !isFunding ? (
                  <label className="sc-drawer-q-prompt" htmlFor={question.id}>{question.prompt}</label>
                ) : (
                  <div className="sc-drawer-q-prompt" id={`${question.id}-label`}>{question.prompt}</div>
                )}
                {question.subtitle ? <div className="sc-drawer-q-sub" id={`${question.id}-hint`}>{question.subtitle}</div> : null}
                {question.sourceHint ? (
                  <div className="sc-drawer-source-hint">• {question.sourceHint}</div>
                ) : null}
                {isText ? (
                  <ProfileQuestionInput
                    question={question}
                    value={answers[question.id] ?? ""}
                    onChange={value => selectAnswer(question.id, value)}
                  />
                ) : (
                  renderChoiceOptions(question, answers, selectAnswer)
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
