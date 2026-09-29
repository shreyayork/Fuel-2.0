"use client";

import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import * as Sentry from "@sentry/nextjs";
import type { Theme } from "@/lib/theme";
import { SuggestedInitiativeReviewDrawer } from "@/components/company/initiatives/SuggestedInitiativeReviewDrawer";
import { pillarFromStored } from "@/components/company/initiatives/pillars";
import { useToast } from "@/components/toast/ToastProvider";
import {
  briefSuggestionKey,
  briefSuggestionPersistKey,
  briefSuggestionToReviewItem,
  reduceBriefSuggestionState,
  type BriefSuggestion,
  type BriefSuggestionActionState,
} from "@/lib/briefs/split-suggestions";

export const BRIEF_CREATE_SUCCESS_TOAST = "Initiative created";
export const BRIEF_CREATE_ERROR_TOAST = "Could not create initiative. Try again.";
export const BRIEF_DISMISS_TOAST = "Suggestion dismissed";

function reviewBtnStyle(t: Theme, opts?: { disabled?: boolean }): CSSProperties {
  const disabled = Boolean(opts?.disabled);
  return {
    padding: "6px 12px",
    background: "transparent",
    color: disabled ? t.mutedSoft : t.muted,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.7 : 1,
  };
}

function initialStatesFromCreated(
  suggestions: BriefSuggestion[],
  createdSuggestionKeys: ReadonlySet<string> | readonly string[],
): Record<string, BriefSuggestionActionState> {
  const created =
    createdSuggestionKeys instanceof Set
      ? createdSuggestionKeys
      : new Set(createdSuggestionKeys);
  const next: Record<string, BriefSuggestionActionState> = {};
  for (let index = 0; index < suggestions.length; index++) {
    const suggestion = suggestions[index]!;
    if (created.has(briefSuggestionPersistKey(suggestion))) {
      next[briefSuggestionKey(suggestion, index)] = "created";
    }
  }
  return next;
}

function SuggestionRow({
  t,
  suggestion,
  suggestionKey,
  state,
  busy,
  onReview,
}: {
  t: Theme;
  suggestion: BriefSuggestion;
  suggestionKey: string;
  state: BriefSuggestionActionState;
  busy: boolean;
  onReview: () => void;
}) {
  const actionLocked = busy || state === "submitting" || state === "created";

  if (state === "dismissed") return null;

  return (
    <div
      data-suggestion-key={suggestionKey}
      style={{
        background: t.panelAlt,
        border: `1px solid ${t.rule}`,
        borderLeft: `2px solid ${t.accent}`,
        borderRadius: 6,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 600,
              color: t.ink,
              display: "flex",
              gap: 8,
              alignItems: "baseline",
              flexWrap: "wrap",
            }}
          >
            <span>{suggestion.title}</span>
            <span
              style={{
                fontFamily: t.mono,
                fontSize: 10,
                color: t.mutedSoft,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {suggestion.kind}
              {suggestion.area ? ` · ${suggestion.area}` : ""}
            </span>
            {state === "created" ? (
              <span
                style={{
                  fontFamily: t.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  color: t.positive,
                }}
              >
                ✓ Added to Initiatives
              </span>
            ) : null}
          </div>
          {suggestion.description || suggestion.rationale ? (
            <div
              style={{
                marginTop: 4,
                fontFamily: t.sans,
                fontSize: 12,
                color: t.inkSoft,
                lineHeight: 1.5,
              }}
            >
              {suggestion.description || suggestion.rationale}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
          {state === "created" ? (
            <button type="button" style={reviewBtnStyle(t, { disabled: true })} disabled>
              ✓ Added
            </button>
          ) : (
            <button
              type="button"
              aria-label={`Review suggested initiative: ${suggestion.title}`}
              disabled={actionLocked}
              onClick={onReview}
              style={reviewBtnStyle(t, { disabled: actionLocked })}
            >
              Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Research list for brief / playbook suggested initiatives.
 * List shows Review only — Create / Dismiss live in {@link SuggestedInitiativeReviewDrawer}.
 * `createdSuggestionKeys` hydrates "Added" after refresh from durable DB links.
 */
export function BriefSuggestedInitiatives({
  t,
  suggestions,
  companyUuid,
  sourceArtifactId,
  createdSuggestionKeys = [],
  heading = "Suggested initiatives · pick one to turn into an active initiative tracked on the Initiatives tab",
}: {
  t: Theme;
  suggestions: BriefSuggestion[];
  companyUuid: string;
  sourceArtifactId?: string;
  /** Persist keys already converted to initiatives (server load). */
  createdSuggestionKeys?: readonly string[];
  heading?: string | null;
}) {
  const { showToast } = useToast();
  const [, startTransition] = useTransition();
  const createdSet = useMemo(
    () => new Set(createdSuggestionKeys),
    [createdSuggestionKeys],
  );
  const suggestionsSignature = suggestions
    .map((s, i) => briefSuggestionKey(s, i))
    .join("|");
  const createdSignature = [...createdSet].sort().join("|");

  const [states, setStates] = useState<Record<string, BriefSuggestionActionState>>(() =>
    initialStatesFromCreated(suggestions, createdSet),
  );
  /** Which suggestion the shared Overview review drawer is showing (survives submit). */
  const [reviewKey, setReviewKey] = useState<string | null>(null);

  useEffect(() => {
    setStates(initialStatesFromCreated(suggestions, createdSet));
    setReviewKey(null);
  }, [suggestionsSignature, createdSignature, suggestions, createdSet]);

  const setState = (key: string, action: Parameters<typeof reduceBriefSuggestionState>[1]) => {
    setStates((prev) => {
      const current = prev[key] ?? "default";
      const next = reduceBriefSuggestionState(current, action);
      if (next === current) return prev;
      return { ...prev, [key]: next };
    });
  };

  const reviewing = useMemo(() => {
    if (!reviewKey) return null;
    for (let index = 0; index < suggestions.length; index++) {
      const suggestion = suggestions[index]!;
      const key = briefSuggestionKey(suggestion, index);
      if (key !== reviewKey) continue;
      const state = states[key] ?? "default";
      if (state === "dismissed" || state === "created") return null;
      return { key, suggestion, state };
    }
    return null;
  }, [reviewKey, suggestions, states]);

  const anySubmitting = Object.values(states).some((s) => s === "submitting");
  const visibleSuggestions = suggestions.filter((suggestion, index) => {
    const key = briefSuggestionKey(suggestion, index);
    return (states[key] ?? "default") !== "dismissed";
  });

  const acceptFromReview = (key: string, suggestion: BriefSuggestion) => {
    if (anySubmitting) return;
    setState(key, { type: "submit" });
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("companyUuid", companyUuid);
        fd.set("name", suggestion.title);
        const description =
          suggestion.description.trim() || suggestion.rationale.trim();
        if (description) fd.set("description", description);
        fd.set("kind", suggestion.kind);
        fd.set("pillar", pillarFromStored({ area: suggestion.area }));
        if (suggestion.area) fd.set("area", suggestion.area);
        if (suggestion.benefit?.trim()) fd.set("benefit", suggestion.benefit.trim());
        if (suggestion.milestones.length > 0) {
          fd.set(
            "milestones",
            JSON.stringify(
              suggestion.milestones.map((m) => ({
                title: m.title,
                dueDate: m.dueDate,
                checked: false,
              })),
            ),
          );
        }
        if (suggestion.sources.length > 0) {
          fd.set(
            "sourceDocuments",
            JSON.stringify(
              suggestion.sources.map((s) => ({
                title: s.title,
                typeLabel: s.typeLabel ?? null,
              })),
            ),
          );
        }
        if (sourceArtifactId) fd.set("sourceArtifactId", sourceArtifactId);
        fd.set("sourceSuggestionKey", briefSuggestionPersistKey(suggestion));
        const mod = await import("@/app/(app)/company/[uuid]/initiative-actions");
        const result = await mod.createInitiativeAction(fd);
        if (!result?.id) {
          setStates((prev) => ({ ...prev, [key]: "default" }));
          showToast({ message: BRIEF_CREATE_ERROR_TOAST, variant: "error" });
          return;
        }
        setState(key, { type: "created" });
        setReviewKey(null);
        showToast({ message: BRIEF_CREATE_SUCCESS_TOAST, variant: "success" });
      } catch (error) {
        Sentry.captureException(error);
        setStates((prev) => ({ ...prev, [key]: "default" }));
        showToast({ message: BRIEF_CREATE_ERROR_TOAST, variant: "error" });
      }
    });
  };

  if (suggestions.length === 0 || visibleSuggestions.length === 0) return null;

  const reviewBusy = Boolean(reviewing && reviewing.state === "submitting");

  return (
    <div style={{ marginTop: 16 }}>
      {heading ? (
        <div
          style={{
            fontFamily: t.mono,
            fontSize: 10,
            color: t.mutedSoft,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 8,
          }}
        >
          {heading}
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {suggestions.map((suggestion, index) => {
          const key = briefSuggestionKey(suggestion, index);
          const state = states[key] ?? "default";
          if (state === "dismissed") return null;
          return (
            <SuggestionRow
              key={key}
              t={t}
              suggestion={suggestion}
              suggestionKey={key}
              state={state}
              busy={anySubmitting}
              onReview={() => setReviewKey(key)}
            />
          );
        })}
      </div>

      <SuggestedInitiativeReviewDrawer
        t={t}
        open={Boolean(reviewing)}
        item={
          reviewing ? briefSuggestionToReviewItem(reviewing.suggestion) : null
        }
        fallbackName={reviewing?.suggestion.title}
        busy={reviewBusy}
        accepted={false}
        adding={reviewBusy}
        onClose={() => {
          if (reviewBusy) return;
          setReviewKey(null);
        }}
        onDismiss={() => {
          if (!reviewing || reviewBusy) return;
          const key = reviewing.key;
          setReviewKey(null);
          setState(key, { type: "dismiss" });
          showToast({ message: BRIEF_DISMISS_TOAST, variant: "info" });
        }}
        onAccept={() => {
          if (!reviewing) return;
          acceptFromReview(reviewing.key, reviewing.suggestion);
        }}
      />
    </div>
  );
}
