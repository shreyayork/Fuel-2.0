"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import * as Sentry from "@sentry/nextjs";
import type { Theme } from "@/lib/theme";
import type { AccountMemberOption } from "@/app/(app)/account/actions";
import { INVALID_EMAIL_MESSAGE, isValidEmail } from "@/lib/is-valid-email";
import { fieldLabelStyle, formControlStyle } from "./styles";

/** Suggestions come from workspace members; free-form entry must be a valid email. */
const SUGGESTION_LIMIT = 8;

function memberMatchesQuery(email: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const lower = email.toLowerCase();
  if (lower.includes(needle)) return true;
  const local = (email.split("@")[0] ?? "").toLowerCase();
  const nameish = local.replace(/[._+-]/g, " ");
  return nameish.includes(needle) || local.includes(needle);
}

/**
 * Design `InitiativeAssigneesField`: chip box, email commit on Enter/comma/blur,
 * optional member email suggestions. Label: Owner.
 */
export function MemberAssigneesField({
  t,
  value,
  onChange,
  disabled = false,
  loadWhen = true,
  labelStyle,
  label = "Owner",
}: {
  t: Theme;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** When false, skip fetching (e.g. drawer closed). */
  loadWhen?: boolean;
  labelStyle?: CSSProperties;
  label?: string;
}) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const loadStarted = useRef(false);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [members, setMembers] = useState<AccountMemberOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isLight = t.mode === "editorial";
  const boxActive = focused || open;

  const loadMembers = useCallback(async () => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    setLoading(true);
    setError(null);
    try {
      const mod = await import("@/app/(app)/account/actions");
      const rows = await mod.listActiveAccountMembersAction();
      setMembers(rows);
    } catch (err) {
      Sentry.captureException(err);
      setError("Could not load workspace members.");
      setMembers([]);
      loadStarted.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadWhen) return;
    void loadMembers();
  }, [loadWhen, loadMembers]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const suggestions = (members ?? [])
    .filter((m) => !value.some((s) => s.toLowerCase() === m.email.toLowerCase()))
    .filter((m) => memberMatchesQuery(m.email, draft))
    .slice(0, SUGGESTION_LIMIT);

  useEffect(() => {
    setHighlight(0);
  }, [draft, members]);

  const commitName = (raw: string) => {
    const name = raw.trim().replace(/,$/, "");
    if (!name) return;
    if (!isValidEmail(name)) {
      setValidationError(INVALID_EMAIL_MESSAGE);
      return;
    }
    if (value.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setDraft("");
      setValidationError(null);
      setOpen(false);
      return;
    }
    onChange([...value, name]);
    setDraft("");
    setValidationError(null);
    setOpen(false);
  };

  const removeName = (name: string) => {
    onChange(value.filter((entry) => entry !== name));
    queueMicrotask(() => inputRef.current?.focus());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "Backspace" && !draft && value.length) {
      e.preventDefault();
      onChange(value.slice(0, -1));
      return;
    }
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (open && suggestions.length > 0 && e.key === "Enter") {
        const pick = suggestions[highlight];
        if (pick) {
          commitName(pick.email);
          return;
        }
      }
      commitName(draft);
      return;
    }
    if (!open && e.key === "ArrowDown" && !disabled) {
      setOpen(true);
      void loadMembers();
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    }
  };

  const showSuggestions =
    open && !disabled && draft.trim().length > 0 && (loading || error || suggestions.length > 0);

  // Match Details form controls: idle gray (`t.bg`), focus white + ink/accent border.
  const idleControl = formControlStyle(t);
  const focusBorder = isLight ? t.ink : t.accent;

  return (
    <div ref={rootRef} style={{ minWidth: 0, position: "relative" }}>
      <span style={labelStyle ?? fieldLabelStyle(t)}>{label}</span>
      <div
        style={{
          ...idleControl,
          alignItems: "center",
          background: boxActive ? t.panel : idleControl.background,
          border: `1px solid ${boxActive ? focusBorder : t.rule}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          minHeight: 41,
          padding: "6px 8px",
          opacity: disabled ? 0.65 : 1,
        }}
        onClick={() => {
          if (disabled) return;
          inputRef.current?.focus();
        }}
      >
        {value.map((name) => (
          <span
            key={name}
            style={{
              alignItems: "center",
              background: `${t.accent}1F`,
              border: `1px solid ${t.accent}4D`,
              borderRadius: 999,
              color: t.accent,
              display: "inline-flex",
              fontFamily: t.sans,
              fontSize: 12,
              fontWeight: 600,
              gap: 4,
              padding: "4px 8px 4px 10px",
            }}
          >
            {name}
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                removeName(name);
              }}
              style={{
                background: "transparent",
                border: 0,
                color: "inherit",
                cursor: disabled ? "default" : "pointer",
                fontSize: 14,
                lineHeight: 1,
                padding: "0 2px",
              }}
              aria-label={`Remove ${name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          disabled={disabled}
          onChange={(e) => {
            setDraft(e.target.value);
            if (validationError) setValidationError(null);
            setOpen(true);
            void loadMembers();
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
            void loadMembers();
          }}
          onBlur={() => {
            setFocused(false);
            if (draft.trim()) commitName(draft);
          }}
          onKeyDown={onKeyDown}
          placeholder={value.length ? "Add another email" : "Add an email"}
          aria-label={label}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? `${listboxId}-error` : undefined}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={Boolean(showSuggestions)}
          role="combobox"
          style={{
            background: "transparent",
            border: 0,
            color: t.ink,
            flex: "1 1 120px",
            fontFamily: t.sans,
            fontSize: 13,
            minWidth: 120,
            outline: "none",
            padding: "4px 6px",
          }}
        />
      </div>

      {validationError ? (
        <div
          id={`${listboxId}-error`}
          role="alert"
          style={{
            color: t.negative,
            fontFamily: t.sans,
            fontSize: 12,
            marginTop: 6,
          }}
        >
          {validationError}
        </div>
      ) : null}

      {showSuggestions ? (
        <div
          id={listboxId}
          role="listbox"
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            marginTop: 6,
            overflow: "hidden",
            padding: 4,
            position: "absolute",
            left: 0,
            right: 0,
            zIndex: 20,
            boxShadow: `0 8px 24px ${t.overlay}`,
          }}
        >
          {loading ? (
            <div
              style={{
                color: t.muted,
                fontFamily: t.sans,
                fontSize: 12.5,
                padding: "8px 10px",
              }}
            >
              Loading members…
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              style={{
                color: t.negative,
                fontFamily: t.sans,
                fontSize: 12.5,
                padding: "8px 10px",
              }}
            >
              {error}
            </div>
          ) : null}
          {!loading && !error
            ? suggestions.map((m, i) => {
                const active = i === highlight;
                return (
                  <button
                    key={m.email}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => commitName(m.email)}
                    style={{
                      background: active ? `${t.accent}1A` : "transparent",
                      border: 0,
                      borderRadius: 6,
                      color: t.ink,
                      cursor: "pointer",
                      fontFamily: t.sans,
                      fontSize: 12.5,
                      padding: "8px 10px",
                      textAlign: "left",
                    }}
                  >
                    {m.email}
                  </button>
                );
              })
            : null}
        </div>
      ) : null}
    </div>
  );
}
