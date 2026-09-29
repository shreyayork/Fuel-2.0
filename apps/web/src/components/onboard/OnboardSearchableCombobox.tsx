"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { onboardV2FieldInput } from "@/components/onboard/styles";
import {
  applyComboboxInputEdit,
  comboboxCommittedLabel,
  type ComboboxOption,
} from "@/components/onboard/onboard-searchable-combobox";

export type OnboardComboboxOption = ComboboxOption;

type OnboardSearchableComboboxProps = {
  value: string;
  options: OnboardComboboxOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** When true, marks the trigger invalid for a11y. */
  invalid?: boolean;
  /** Extra styles merged onto the text input (error border, etc.). */
  inputStyle?: CSSProperties;
  id?: string;
  "aria-labelledby"?: string;
};

/**
 * Dark-theme searchable combobox for onboarding profile fields.
 * Mirrors CompanySearch keyboard behavior with listbox semantics.
 * Unknown/legacy `value` not in `options` is preserved and shown.
 */
export function OnboardSearchableCombobox({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Search…",
  invalid = false,
  inputStyle,
  id,
  "aria-labelledby": ariaLabelledBy,
}: OnboardSearchableComboboxProps) {
  const listboxId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() =>
    comboboxCommittedLabel(value, options),
  );
  const [highlight, setHighlight] = useState(0);

  const optionsWithOrphan = useMemo(() => {
    const trimmed = value.trim();
    if (!trimmed) return options;
    if (options.some((o) => o.value === trimmed || o.label === trimmed)) {
      return options;
    }
    return [{ value: trimmed, label: trimmed }, ...options];
  }, [options, value]);

  const committedLabel = comboboxCommittedLabel(value, optionsWithOrphan);
  const committedLabelRef = useRef(committedLabel);
  committedLabelRef.current = committedLabel;

  // Sync draft from committed value when not actively editing (pick / parent reset).
  useEffect(() => {
    if (editingRef.current) return;
    setDraft(committedLabel);
  }, [committedLabel]);

  const filtered = useMemo(() => {
    const needle = draft.trim().toLowerCase();
    if (!needle || !editingRef.current) return optionsWithOrphan;
    return optionsWithOrphan.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        o.value.toLowerCase().includes(needle),
    );
  }, [optionsWithOrphan, draft]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        editingRef.current = false;
        setOpen(false);
        setDraft(committedLabelRef.current);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [draft, filtered.length, open]);

  function pick(opt: OnboardComboboxOption) {
    editingRef.current = false;
    onChange(opt.value);
    setDraft(opt.label);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onInputChange(next: string) {
    const result = applyComboboxInputEdit({
      inputValue: next,
      committedLabel: committedLabelRef.current,
    });
    editingRef.current = true;
    setDraft(result.draft);
    setOpen(true);
    if (result.shouldClearCommitted && value) {
      onChange("");
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      if (open && filtered[highlight]) {
        e.preventDefault();
        pick(filtered[highlight]);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      editingRef.current = false;
      setOpen(false);
      setDraft(committedLabelRef.current);
    }
  }

  const baseInput = onboardV2FieldInput({
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : undefined,
    ...inputStyle,
  });

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        id={id}
        className="of-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && filtered[highlight]
            ? `${listboxId}-opt-${highlight}`
            : undefined
        }
        aria-invalid={invalid || undefined}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        value={draft}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        style={baseInput}
      />
      {open && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 40,
            margin: 0,
            padding: 4,
            listStyle: "none",
            maxHeight: 220,
            overflowY: "auto",
            background: "#0B141C",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
          }}
        >
          {filtered.length === 0 ? (
            <li
              style={{
                padding: "10px 12px",
                fontSize: 13,
                color: "#8FA99A",
              }}
            >
              No matches
            </li>
          ) : (
            filtered.map((opt, i) => {
              const selected = opt.value === value || opt.label === value;
              const active = i === highlight;
              return (
                <li
                  key={`${opt.value}-${opt.label}`}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(opt);
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: "pointer",
                    color: selected || active ? "#F2F5F2" : "#8FA99A",
                    background: active
                      ? "rgba(61,214,140,0.12)"
                      : selected
                        ? "rgba(61,214,140,0.06)"
                        : "transparent",
                  }}
                >
                  {opt.label}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
