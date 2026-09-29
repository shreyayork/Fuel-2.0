"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BENCHMARK_STEP,
  DETAIL_SECTIONS,
  DRAWER_TABS,
  PROFILE_FUNDING_ROUND_TYPES,
  applyDetailAnswerUpdate,
  findOtherSpecifyOption,
  formatOtherSpecifyAnswer,
  getVisibleQuestions,
  isChoiceAnswerComplete,
  isMultiSelectSelected,
  isOtherSpecifyOption,
  isOtherSpecifySelected,
  parseMultiSelectAnswer,
  parseOtherSpecifyText,
  parseProfileFundingRounds,
  partitionCreditQuestions,
  filterCountInput,
  resolveTextInputType,
  serializeProfileFundingRounds,
  setMultiSelectOtherText,
  toggleMultiSelectAnswer,
  DETAIL_MULTI_DELIMITER,
  type DetailDrawerStep,
  type DetailQuestion,
  type DetailSection,
  type ProfileFundingRound,
} from "@/lib/overview/detail-question-catalog";
import { OtherSpecifyInput } from "@/components/forms/OtherSpecifyInput";
import { BENCHMARK_DRAWER_FIELDS, countFilledBenchmarkDrawerValues } from "@/lib/overview/benchmark-drawer-fields";
import type { OverviewBenchmarkDrawerPayload } from "@/lib/overview/types";
import { BenchmarkFormPanel, useBenchmarkForm } from "./BenchmarkEditDrawer";
import {
  ONBOARD_UNKNOWN_ANSWER,
  ONBOARD_UNKNOWN_LABEL,
  isUnknownAnswer,
} from "@/lib/onboard/unknown-answer";
import {
  fetchDetailAnswers,
  getCachedDetailAnswers,
  patchDetailAnswers,
  type OverviewMutationResult,
} from "@/lib/overview/client";
import { useOverviewTheme } from "./overview-theme";
import { OVERVIEW_STATUS } from "./overviewTokens";
import {
  benchActionBtnStyle,
  detailBodyStyle,
  detailCloseBtnStyle,
  detailCompanyStyle,
  detailEyebrowStyle,
  detailFootErrorStyle,
  detailFootNavStyle,
  detailFootStyle,
  detailGroupLabelStyle,
  detailHeadStyle,
  detailOptStyle,
  detailOptsStyle,
  detailPanelStyle,
  detailPromptStyle,
  detailFieldsGridStyle,
  detailFundingAddStyle,
  detailFundingListStyle,
  detailFundingRemoveStyle,
  detailFundingRowStyle,
  detailInputStyle,
  detailQSubStyle,
  detailQuestionCardStyle,
  detailQuestionStyle,
  detailSectionHeadStyle,
  detailSectionIconStyle,
  detailSectionMetaStyle,
  detailSectionSubStyle,
  detailSectionTitleStyle,
  detailStepCountStyle,
  detailStepLabelStyle,
  detailStepStyle,
  detailStepsStyle,
  detailTextareaStyle,
} from "./drawerStyles";
import { HoverBtn, OverviewDrawerShell, useDrawerEscape, useNarrow } from "./drawerShared";
import { ProfileCreditRewardToast } from "./ProfileCreditRewardToast";
import { useCreditsOptional } from "@/components/credits/CreditProvider";
import { DatePicker } from "@/components/ui/DatePicker";
import { toFundingRoundDateInputValue } from "@/lib/onboard/funding-rounds";
import {
  creditsPerBlock,
  DEFAULT_FREE_MONTHLY_LIMIT,
  type ProfileCreditReward,
  type ProfileModuleId,
} from "@/lib/credits/profile-modules";

function tabProgress(
  tabId: DetailDrawerStep,
  answers: Record<string, string>,
  benchFilled = 0,
): { answered: number; total: number } {
  if (tabId === "benchmark") {
    return { answered: benchFilled, total: BENCHMARK_DRAWER_FIELDS.length };
  }
  const s = DETAIL_SECTIONS.find((item) => item.id === tabId);
  if (!s) return { answered: 0, total: 0 };
  const qs = getVisibleQuestions(s, answers);
  return {
    answered: qs.filter((q) => answers[q.id]?.trim()).length,
    total: qs.length,
  };
}

function isIdentitySection(section: DetailSection): boolean {
  return section.id === "profile" || section.id === "context";
}

function hasPrefillAnswers(answers?: Record<string, string> | null): answers is Record<string, string> {
  return Boolean(answers && Object.keys(answers).length > 0);
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
  const t = useOverviewTheme();
  const rounds = parseProfileFundingRounds(value);

  const updateRounds = (next: ProfileFundingRound[]) => {
    onChange(serializeProfileFundingRounds(next));
  };

  return (
    <div style={detailFundingListStyle()}>
      <HoverBtn
        type="button"
        styleFor={(hovered) => detailFundingAddStyle(t, { hovered })}
        onClick={() =>
          updateRounds([
            ...rounds,
            { id: fundingRoundId(), type: "Seed", amount: "", date: "", investors: "" },
          ])
        }
      >
        + Add round
      </HoverBtn>
      {rounds.map((round) => (
        <div key={round.id} style={detailFundingRowStyle()}>
          <select
            aria-label="Round type"
            value={round.type}
            style={detailInputStyle(t, { inset: true })}
            onChange={(event) =>
              updateRounds(
                rounds.map((item) =>
                  item.id === round.id ? { ...item, type: event.target.value } : item,
                ),
              )
            }
          >
            {PROFILE_FUNDING_ROUND_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            aria-label="Round amount"
            value={round.amount}
            placeholder="$1.2M"
            style={detailInputStyle(t, { inset: true })}
            onChange={(event) =>
              updateRounds(
                rounds.map((item) =>
                  item.id === round.id ? { ...item, amount: event.target.value } : item,
                ),
              )
            }
          />
          <DatePicker
            t={t}
            aria-label="Round date"
            value={toFundingRoundDateInputValue(round.date)}
            placeholder="Pick a date"
            onChange={(ymd) =>
              updateRounds(
                rounds.map((item) =>
                  item.id === round.id ? { ...item, date: ymd } : item,
                ),
              )
            }
            onClear={() =>
              updateRounds(
                rounds.map((item) =>
                  item.id === round.id ? { ...item, date: "" } : item,
                ),
              )
            }
            triggerStyle={detailInputStyle(t, { inset: true })}
          />
          <input
            aria-label="Round investors"
            value={round.investors}
            placeholder="Investors"
            style={detailInputStyle(t, { inset: true })}
            onChange={(event) =>
              updateRounds(
                rounds.map((item) =>
                  item.id === round.id ? { ...item, investors: event.target.value } : item,
                ),
              )
            }
          />
          <HoverBtn
            type="button"
            aria-label="Remove funding round"
            styleFor={(hovered) => detailFundingRemoveStyle(t, { hovered })}
            onClick={() => updateRounds(rounds.filter((item) => item.id !== round.id))}
          >
            ×
          </HoverBtn>
        </div>
      ))}
    </div>
  );
}

function ProfileQuestionInput({
  question,
  value,
  focused,
  inset,
  onFocus,
  onBlur,
  onChange,
}: {
  question: DetailQuestion;
  value: string;
  focused: boolean;
  inset: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
}) {
  const t = useOverviewTheme();
  const inputType = resolveTextInputType(question);
  if (inputType === "funding_rounds") {
    return <ProfileFundingRoundsInput value={value} onChange={onChange} />;
  }
  if (inputType === "year") {
    return (
      <input
        id={question.id}
        className="ov-drawer-input"
        type="text"
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        aria-label={question.prompt}
        value={value}
        placeholder={question.placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        style={detailInputStyle(t, { focused, inset })}
        onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
      />
    );
  }
  if (inputType === "count") {
    return (
      <input
        id={question.id}
        className="ov-drawer-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={8}
        autoComplete="off"
        aria-label={question.prompt}
        value={value}
        placeholder={question.placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        style={detailInputStyle(t, { focused, inset })}
        onChange={(event) => onChange(filterCountInput(event.target.value))}
      />
    );
  }
  if (inputType === "url") {
    return (
      <input
        id={question.id}
        className="ov-drawer-input"
        type="url"
        autoComplete="url"
        spellCheck={false}
        value={value}
        placeholder={question.placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        style={detailInputStyle(t, { focused, inset })}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (inputType === "short") {
    return (
      <input
        id={question.id}
        className="ov-drawer-input"
        type="text"
        autoComplete="off"
        value={value}
        placeholder={question.placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        style={detailInputStyle(t, { focused, inset })}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  const rows = question.rows ?? 3;
  return (
    <textarea
      id={question.id}
      className="ov-drawer-input"
      rows={rows}
      value={value}
      placeholder={question.placeholder}
      onFocus={onFocus}
      onBlur={onBlur}
      style={detailTextareaStyle(t, { focused, inset })}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function DetailAnswersSkeleton({ count = 4 }: { count?: number }) {
  const t = useOverviewTheme();
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{ display: "flex", flexDirection: "column", gap: 18, minHeight: 280 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              background: t.panelAlt,
              borderRadius: 6,
              height: 14,
              maxWidth: i % 2 === 0 ? "72%" : "58%",
              opacity: 0.7,
            }}
          />
          <div
            style={{
              background: t.panelAlt,
              borderRadius: 8,
              height: 40,
              opacity: 0.45,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function DetailAnswersDrawer({
  open,
  companyUuid,
  companyName,
  initialStep,
  initialAnswers,
  initialBenchmark,
  onClose,
  onSaved,
}: {
  open: boolean;
  companyUuid: string;
  companyName: string;
  initialStep: DetailDrawerStep;
  /** Prefill from Overview payload when already loaded. */
  initialAnswers?: Record<string, string> | null;
  initialBenchmark?: OverviewBenchmarkDrawerPayload | null;
  onClose: () => void;
  onSaved: (result?: OverviewMutationResult) => void | Promise<void>;
}) {
  const t = useOverviewTheme();
  const credits = useCreditsOptional();
  const narrow = useNarrow(560);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hoverOpt, setHoverOpt] = useState<string | null>(null);
  const [otherDraft, setOtherDraft] = useState<Record<string, string>>({});
  const [reward, setReward] = useState<ProfileCreditReward | null>(null);
  /** Design highlights newly revealed extra questions once, right after the credit popup. */
  const [extrasRevealed, setExtrasRevealed] = useState(false);
  const extrasRef = useRef<HTMLDivElement | null>(null);
  const persistQueueRef = useRef<Record<string, string> | null>(null);
  const persistChainRef = useRef(Promise.resolve());
  const lastPersistedRef = useRef("");
  const persistTimerRef = useRef(0);
  const persistCtxRef = useRef({ companyUuid, credits, onSaved });
  persistCtxRef.current = { companyUuid, credits, onSaved };

  const stepTab = DRAWER_TABS[stepIndex] ?? DRAWER_TABS[0]!;
  const isBenchmark = stepTab.id === "benchmark";
  const section: DetailSection | undefined = isBenchmark
    ? undefined
    : (DETAIL_SECTIONS.find((item) => item.id === stepTab.id) ?? DETAIL_SECTIONS[0]);
  const bench = useBenchmarkForm({
    sessionOpen: open,
    active: open && isBenchmark,
    companyUuid,
    initialBenchmark,
  });
  const benchFilled =
    bench.loaded || bench.filledCount > 0
      ? bench.filledCount
      : countFilledBenchmarkDrawerValues(initialBenchmark?.values);
  const allQuestions = useMemo(
    () => (section ? getVisibleQuestions(section, answers) : []),
    [section, answers],
  );
  const { credit, extra } = useMemo(
    () => (section ? partitionCreditQuestions(section.id, allQuestions) : { credit: [], extra: [] }),
    [section, allQuestions],
  );
  const creditDone =
    credit.length === 0 ||
    credit.every((q) =>
      q.kind === "text"
        ? Boolean(answers[q.id]?.trim())
        : isChoiceAnswerComplete(answers[q.id], q.options),
    );
  const moduleForSection: ProfileModuleId | null =
    section?.id === "profile"
      ? "company"
      : section?.id === "dev"
        ? "dev"
        : section?.id === "mkt"
          ? "gtm"
          : section?.id === "rev"
            ? "rev"
            : null;
  const alreadyEarned = Boolean(
    moduleForSection && credits?.snapshot?.profileModules.includes(moduleForSection),
  );
  const showExtras =
    extra.length > 0 && creditDone && !reward && (alreadyEarned || extrasRevealed);
  const stepQuestions = useMemo(
    () => (showExtras ? [...credit, ...extra] : credit.length > 0 ? credit : allQuestions),
    [showExtras, credit, extra, allQuestions],
  );
  const isLast = stepIndex === DRAWER_TABS.length - 1;
  const isFirst = stepIndex === 0;
  const canEarnCredits = Boolean(moduleForSection) && !alreadyEarned;

  const resolveInitial = useCallback((): Record<string, string> | null => {
    if (hasPrefillAnswers(initialAnswers)) return { ...initialAnswers };
    const cached = getCachedDetailAnswers(companyUuid);
    return hasPrefillAnswers(cached) ? cached : null;
  }, [companyUuid, initialAnswers]);

  const lastOpen = useRef(false);

  const drainAnswerPersist = useCallback(async () => {
    const ctx = persistCtxRef.current;
    while (persistQueueRef.current) {
      const payload = persistQueueRef.current;
      persistQueueRef.current = null;
      const serialized = JSON.stringify(payload);
      if (serialized === lastPersistedRef.current) continue;
      try {
        const result = await patchDetailAnswers(ctx.companyUuid, payload, false);
        lastPersistedRef.current = serialized;
        setSaveError(null);
        const first = result.rewards?.[0] ?? null;
        if (!first) continue;
        setReward(first);
        await ctx.credits?.refreshSnapshot();
        await ctx.onSaved(result);
      } catch {
        setSaveError("Could not save answers. Please try again.");
        return;
      }
    }
  }, []);

  const enqueueAnswerPersist = useCallback((next: Record<string, string>) => {
    persistQueueRef.current = next;
    const pending = persistChainRef.current.then(drainAnswerPersist, drainAnswerPersist);
    persistChainRef.current = pending;
    return pending;
  }, [drainAnswerPersist]);

  const queueAnswerPersist = useCallback(
    (next: Record<string, string>, immediate: boolean) => {
      window.clearTimeout(persistTimerRef.current);
      if (immediate) {
        void enqueueAnswerPersist(next);
        return;
      }
      persistTimerRef.current = window.setTimeout(() => {
        void enqueueAnswerPersist(next);
      }, 450);
    },
    [enqueueAnswerPersist],
  );

  useEffect(() => {
    if (!open) {
      lastOpen.current = false;
      return;
    }

    const justOpened = !lastOpen.current;
    lastOpen.current = true;
    if (!justOpened) return;

    const idx = DRAWER_TABS.findIndex((s) => s.id === initialStep);
    setStepIndex(idx >= 0 ? idx : 0);

    setSaveError(null);
    setSaving(false);
    setExtrasRevealed(false);
    setOtherDraft({});
    persistQueueRef.current = null;
    window.clearTimeout(persistTimerRef.current);

    const local = resolveInitial();
    lastPersistedRef.current = JSON.stringify(local ?? {});
    if (local) {
      setAnswers(local);
      setReady(true);
      return;
    }

    setAnswers({});
    setReady(false);
    let cancelled = false;
    void fetchDetailAnswers(companyUuid)
      .then((next) => {
        if (!cancelled) {
          lastPersistedRef.current = JSON.stringify(next);
          setAnswers(next);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnswers({});
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, initialStep, companyUuid, resolveInitial]);

  useEffect(() => {
    if (!open) {
      window.clearTimeout(persistTimerRef.current);
    }
  }, [open]);

  useEffect(() => {
    setExtrasRevealed(false);
  }, [stepIndex]);

  useDrawerEscape(open, saving, onClose);

  const selectAnswer = (qid: string, value: string, persistMode: "immediate" | "debounce" = "immediate") => {
    setAnswers((prev) => {
      const next = applyDetailAnswerUpdate(prev, qid, value);
      if (next[qid] === prev[qid]) return prev;
      queueAnswerPersist(next, persistMode === "immediate");
      return next;
    });
  };

  const goNext = () => {
    setStepIndex((i) => Math.min(DRAWER_TABS.length - 1, i + 1));
  };

  const goBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const saveAndClose = async () => {
    const incompleteOther = stepQuestions.find((q) => {
      if (q.kind === "text" || !q.options) return false;
      const otherOpt = findOtherSpecifyOption(q.options);
      if (!otherOpt) return false;
      const selected = q.multi
        ? isMultiSelectSelected(answers[q.id], otherOpt)
        : isOtherSpecifySelected(answers[q.id], otherOpt);
      if (!selected) return false;
      return !isChoiceAnswerComplete(answers[q.id], q.options);
    });
    if (incompleteOther) {
      setSaveError('Please specify a value for "Other" before saving.');
      setFocusId(`${incompleteOther.id}-other`);
      return;
    }

    setSaving(true);
    setSaveError(null);
    window.clearTimeout(persistTimerRef.current);
    try {
      await enqueueAnswerPersist(answers);
      const shouldSaveBench = bench.loaded;
      const result = await patchDetailAnswers(companyUuid, answers, !shouldSaveBench);
      lastPersistedRef.current = JSON.stringify(answers);
      const benchResult = shouldSaveBench ? await bench.persist(true) : null;
      const first = result.rewards?.[0] ?? benchResult?.rewards?.[0] ?? null;
      if (first) {
        setReward(first);
        await credits?.refreshSnapshot();
        await onSaved(benchResult ?? result);
        return;
      }
      onClose();
      await onSaved(benchResult ?? result);
    } catch {
      setSaveError("Could not save answers. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const dismissReward = () => {
    setReward(null);
    setExtrasRevealed(true);
    window.setTimeout(() => {
      extrasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const questionBlocks = useMemo(() => {
    let lastGroup: string | undefined;
    return stepQuestions.map((q) => {
      const groupHeader = q.group && q.group !== lastGroup ? q.group : null;
      if (q.group) lastGroup = q.group;
      return { q, groupHeader };
    });
  }, [stepQuestions]);

  return (
    <OverviewDrawerShell
      open={open}
      onClose={onClose}
      ariaLabel="Add company details"
      panelStyle={detailPanelStyle(t)}
    >
          <header style={detailHeadStyle(t)}>
            <div>
              <span style={detailEyebrowStyle(t)}>✦ Fuel AI · Add details</span>
              <strong style={detailCompanyStyle(t)}>{companyName}</strong>
            </div>
            <HoverBtn
              type="button"
              aria-label="Close"
              disabled={saving}
              styleFor={(hovered) => detailCloseBtnStyle(t, { hovered })}
              onClick={onClose}
            >
              ✕
            </HoverBtn>
          </header>

          <div style={detailStepsStyle(t, DRAWER_TABS.length)} role="tablist" aria-label="Profile sections">
            {DRAWER_TABS.map((tab, index) => {
              const active = tab.id === stepTab.id;
              const progress = tabProgress(tab.id, answers, benchFilled);
              const left = Math.max(0, progress.total - progress.answered);
              const complete = progress.total > 0 && left === 0;
              const statusLabel =
                progress.total > 0
                  ? complete
                    ? `${tab.label}, ${progress.answered} of ${progress.total}, complete`
                    : `${tab.label}, ${progress.answered} of ${progress.total}`
                  : tab.label;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-label={statusLabel}
                  aria-selected={active}
                  title={progress.total > 0 ? statusLabel : undefined}
                  disabled={!ready || active}
                  style={detailStepStyle(t, { active, complete })}
                  onClick={() => setStepIndex(index)}
                >
                  <span style={detailStepLabelStyle(t, { active, complete, narrow })}>
                    {tab.label}
                  </span>
                  {progress.total > 0 ? (
                    <span style={detailStepCountStyle(t, { active, complete, narrow })}>
                      {complete ? "✓ " : ""}
                      {progress.answered}/{progress.total}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div style={detailBodyStyle()}>
            <div style={detailSectionHeadStyle()}>
              <span style={detailSectionIconStyle(t)} aria-hidden>
                {isBenchmark ? BENCHMARK_STEP.icon : section?.icon}
              </span>
              <div>
                <div style={detailSectionTitleStyle(t)}>
                  {isBenchmark ? BENCHMARK_STEP.title : section?.title}
                </div>
                <div style={detailSectionSubStyle(t)}>
                  {isBenchmark ? BENCHMARK_STEP.subtitle : section?.subtitle}
                </div>
                {(() => {
                  const progress = tabProgress(stepTab.id, answers, benchFilled);
                  if (progress.total <= 0) return null;
                  const left = Math.max(0, progress.total - progress.answered);
                  return (
                    <div style={detailSectionMetaStyle(t)}>
                      {progress.answered} of {progress.total} answered
                      {left > 0 ? ` · ${left} left` : " · complete"}
                    </div>
                  );
                })()}
              </div>
            </div>
            {canEarnCredits && moduleForSection ? (
              <div style={{ ...detailGroupLabelStyle(t), marginTop: 4, marginBottom: 16 }}>
                +{credits?.snapshot?.creditsPerBlock ?? creditsPerBlock(DEFAULT_FREE_MONTHLY_LIMIT)} credits
              </div>
            ) : null}

            {isBenchmark ? (
              <BenchmarkFormPanel
                companyName={companyName}
                values={bench.values}
                fields={bench.fields}
                cohortKey={bench.cohortKey}
                allCohorts={bench.allCohorts}
                loading={bench.loading}
                cohortLoading={bench.cohortLoading}
                saving={saving || bench.saving}
                error={bench.error}
                onChangeValue={bench.update}
                onCohortChange={(next) => void bench.handleCohortChange(next)}
              />
            ) : !ready ? (
              <DetailAnswersSkeleton />
            ) : (
              <div style={section && isIdentitySection(section) ? detailFieldsGridStyle() : undefined}>
              {questionBlocks.map(({ q, groupHeader }) => {
                const choiceOptions = q.kind === "text" ? [] : (q.options ?? []);
                const withNa = q.kind !== "text" && q.allowUnknown !== false;
                const totalTiles = choiceOptions.length + (withNa ? 1 : 0);
                const lastOptionFull =
                  !withNa && totalTiles % 2 === 1 && choiceOptions.length > 0;
                const unknownSelected = q.multi
                  ? isMultiSelectSelected(answers[q.id], ONBOARD_UNKNOWN_ANSWER)
                  : isUnknownAnswer(answers[q.id]);
                const unknownFullWidth = withNa && totalTiles % 2 === 1;
                const isExtra = extra.some((item) => item.id === q.id);
                const isFirstExtra = extra[0]?.id === q.id;
                const otherOpt = findOtherSpecifyOption(choiceOptions);
                const otherSelected = Boolean(
                  otherOpt &&
                    (q.multi
                      ? isMultiSelectSelected(answers[q.id], otherOpt)
                      : isOtherSpecifySelected(answers[q.id], otherOpt)),
                );
                const otherText =
                  otherOpt && otherSelected
                    ? (otherDraft[q.id] ??
                      (q.multi
                        ? parseOtherSpecifyText(
                            parseMultiSelectAnswer(answers[q.id]).find((part) =>
                              isOtherSpecifySelected(part, otherOpt),
                            ),
                            otherOpt,
                          )
                        : parseOtherSpecifyText(answers[q.id], otherOpt)))
                    : "";
                const carded = Boolean(section && isIdentitySection(section));
                return (
                  <Fragment key={q.id}>
                    {groupHeader ? (
                      <div
                        style={{
                          ...detailGroupLabelStyle(t),
                          gridColumn: "1 / -1",
                          margin: "4px 0 0",
                        }}
                      >
                        {groupHeader}
                      </div>
                    ) : null}
                    <div
                      ref={isFirstExtra ? extrasRef : undefined}
                      style={{
                        ...(carded ? detailQuestionCardStyle(t) : detailQuestionStyle()),
                        ...(carded && !q.group ? { gridColumn: "1 / -1" } : null),
                        ...(isExtra && extrasRevealed
                          ? {
                              animation: "scDrawerReveal 1.8s ease",
                              boxShadow: `inset 3px 0 0 ${OVERVIEW_STATUS.good}`,
                              paddingLeft: 12,
                            }
                          : null),
                      }}
                    >
                      <div style={{ ...detailPromptStyle(t), marginBottom: carded ? 8 : 11 }}>
                        {q.prompt}
                      </div>
                      {q.subtitle ? <div style={detailQSubStyle(t)}>{q.subtitle}</div> : null}
                      {q.kind === "text" ? (
                        <ProfileQuestionInput
                          question={q}
                          value={answers[q.id] ?? ""}
                          focused={focusId === q.id}
                          inset={carded}
                          onFocus={() => setFocusId(q.id)}
                          onBlur={() => setFocusId(null)}
                          onChange={(next) => selectAnswer(q.id, next, "debounce")}
                        />
                      ) : (
                        <div
                          style={detailOptsStyle({ stacked: false, narrow: false })}
                          role={q.multi ? "group" : "radiogroup"}
                          aria-label={q.prompt}
                        >
                          {choiceOptions.map((opt, i) => {
                            const selected = q.multi
                              ? isMultiSelectSelected(answers[q.id], opt)
                              : isOtherSpecifyOption(opt)
                                ? otherSelected
                                : answers[q.id] === opt;
                            const optKey = `${q.id}:${opt}`;
                            const lastFull = lastOptionFull && i === choiceOptions.length - 1;
                            return (
                              <button
                                key={opt}
                                type="button"
                                aria-pressed={selected}
                                style={{
                                  ...detailOptStyle(t, {
                                    selected,
                                    hovered: hoverOpt === optKey,
                                  }),
                                  textAlign: "center",
                                  ...(lastFull ? { gridColumn: "1 / -1" } : null),
                                }}
                                onMouseEnter={() => setHoverOpt(optKey)}
                                onMouseLeave={() => setHoverOpt(null)}
                                onClick={() => {
                                  if (q.multi) {
                                    const withoutUnknown = parseMultiSelectAnswer(answers[q.id])
                                      .filter((v) => !isUnknownAnswer(v))
                                      .join(DETAIL_MULTI_DELIMITER);
                                    const next = toggleMultiSelectAnswer(withoutUnknown, opt);
                                    if (isOtherSpecifyOption(opt) && !isMultiSelectSelected(withoutUnknown, opt)) {
                                      setOtherDraft((prev) => ({ ...prev, [q.id]: "" }));
                                    } else if (isOtherSpecifyOption(opt)) {
                                      setOtherDraft((prev) => {
                                        const copy = { ...prev };
                                        delete copy[q.id];
                                        return copy;
                                      });
                                    }
                                    selectAnswer(q.id, next);
                                    return;
                                  }
                                  if (isOtherSpecifyOption(opt)) {
                                    setOtherDraft((prev) => ({
                                      ...prev,
                                      [q.id]: parseOtherSpecifyText(answers[q.id], opt),
                                    }));
                                    selectAnswer(q.id, formatOtherSpecifyAnswer(opt, parseOtherSpecifyText(answers[q.id], opt)));
                                    return;
                                  }
                                  setOtherDraft((prev) => {
                                    const copy = { ...prev };
                                    delete copy[q.id];
                                    return copy;
                                  });
                                  selectAnswer(q.id, answers[q.id] === opt ? "" : opt);
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                          {q.allowUnknown !== false ? (
                          <button
                            type="button"
                            aria-pressed={unknownSelected}
                            style={{
                              ...detailOptStyle(t, {
                                selected: unknownSelected,
                                hovered: hoverOpt === `${q.id}:unknown`,
                                unknown: true,
                              }),
                              ...(unknownFullWidth ? { gridColumn: "1 / -1" } : null),
                            }}
                            onMouseEnter={() => setHoverOpt(`${q.id}:unknown`)}
                            onMouseLeave={() => setHoverOpt(null)}
                            onClick={() => {
                              setOtherDraft((prev) => {
                                const copy = { ...prev };
                                delete copy[q.id];
                                return copy;
                              });
                              if (q.multi) {
                                selectAnswer(
                                  q.id,
                                  unknownSelected ? "" : ONBOARD_UNKNOWN_ANSWER,
                                );
                                return;
                              }
                              selectAnswer(
                                q.id,
                                unknownSelected ? "" : ONBOARD_UNKNOWN_ANSWER,
                              );
                            }}
                          >
                            {ONBOARD_UNKNOWN_LABEL}
                          </button>
                          ) : null}
                        </div>
                      )}
                      {otherSelected && otherOpt ? (
                        <OtherSpecifyInput
                          as="textarea"
                          id={`${q.id}-other`}
                          className="ov-drawer-input"
                          rows={2}
                          placeholder="Please specify"
                          value={otherText}
                          style={detailTextareaStyle(t, { focused: focusId === `${q.id}-other` })}
                          onFocus={() => setFocusId(`${q.id}-other`)}
                          onBlur={() => setFocusId(null)}
                          onChange={(text) => {
                            setOtherDraft((prev) => ({ ...prev, [q.id]: text }));
                            if (q.multi) {
                              selectAnswer(
                                q.id,
                                setMultiSelectOtherText(answers[q.id], otherOpt, text),
                                "debounce",
                              );
                              return;
                            }
                            selectAnswer(
                              q.id,
                              formatOtherSpecifyAnswer(otherOpt, text),
                              "debounce",
                            );
                          }}
                        />
                      ) : null}
                    </div>
                  </Fragment>
                );
              })}
              </div>
            )}
          </div>

          <footer style={detailFootStyle(t)}>
            {saveError ? (
              <p style={detailFootErrorStyle(t)}>{saveError}</p>
            ) : null}
            <HoverBtn
              type="button"
              disabled={saving || bench.saving || (!ready && !isBenchmark)}
              styleFor={(hovered) =>
                benchActionBtnStyle(t, "cancel", {
                  hovered,
                  disabled: saving || bench.saving || (!ready && !isBenchmark),
                })
              }
              onClick={() => void saveAndClose()}
            >
              {saving || bench.saving ? "Saving…" : "Save & close"}
            </HoverBtn>
            <div style={detailFootNavStyle()}>
              {!isFirst ? (
                <HoverBtn
                  type="button"
                  disabled={saving || !ready}
                  styleFor={(hovered) =>
                    benchActionBtnStyle(t, "cancel", {
                      hovered,
                      disabled: saving || !ready,
                    })
                  }
                  onClick={goBack}
                >
                  Back
                </HoverBtn>
              ) : null}
              {!isLast ? (
                <HoverBtn
                  type="button"
                  disabled={saving || !ready}
                  styleFor={(hovered) =>
                    benchActionBtnStyle(t, "save", {
                      hovered,
                      disabled: saving || !ready,
                    })
                  }
                  onClick={goNext}
                >
                  Next →
                </HoverBtn>
              ) : (
                <HoverBtn
                  type="button"
                  disabled={saving || bench.saving || (!ready && !isBenchmark)}
                  styleFor={(hovered) =>
                    benchActionBtnStyle(t, "save", {
                      hovered,
                      disabled: saving || bench.saving || (!ready && !isBenchmark),
                    })
                  }
                  onClick={() => void saveAndClose()}
                >
                  {saving || bench.saving ? "Saving…" : "Save details"}
                </HoverBtn>
              )}
            </div>
          </footer>
          {reward ? <ProfileCreditRewardToast reward={reward} onDismiss={dismissReward} /> : null}
    </OverviewDrawerShell>
  );
}
