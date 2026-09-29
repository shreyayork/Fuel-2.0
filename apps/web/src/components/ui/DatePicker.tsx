"use client";

import { useState, type CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
import { formatYmdLocal, parseYmdLocal } from "@/lib/date-range";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type DatePickerProps = {
  t: Theme;
  /** Selected day as `YYYY-MM-DD`, or empty when unset. */
  value: string;
  onChange: (value: string) => void;
  /** Optional clear affordance when a date is selected. */
  onClear?: () => void;
  placeholder?: string;
  "aria-label"?: string;
  /** Override trigger chrome (e.g. initiative form controls). */
  triggerStyle?: CSSProperties;
  className?: string;
  disabled?: boolean;
  /** When true, days after today cannot be selected (today remains allowed). */
  disableFuture?: boolean;
};

function CalendarGlyph({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}

function formatDayTrigger(ymd: string): string {
  const date = parseYmdLocal(ymd);
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Single-day picker matching Usage `DateRangePicker` chrome:
 * Popover trigger (calendar glyph) + themed `Calendar`.
 */
export function DatePicker(props: DatePickerProps) {
  const ariaLabel = props["aria-label"] ?? "Date";
  const [open, setOpen] = useState(false);
  const selected = props.value ? (parseYmdLocal(props.value) ?? undefined) : undefined;
  const triggerText = selected
    ? formatDayTrigger(props.value)
    : (props.placeholder ?? "Pick a date");
  const today = props.disableFuture ? startOfLocalToday() : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={props.disabled}
          className={props.className}
          aria-label={`${ariaLabel}${selected ? `: ${triggerText}` : ""}`}
          style={{
            alignItems: "center",
            backgroundColor: props.t.panel,
            border: `1px solid ${props.t.rule}`,
            borderRadius: 6,
            boxSizing: "border-box",
            color: selected ? props.t.ink : props.t.muted,
            cursor: props.disabled ? "not-allowed" : "pointer",
            display: "inline-flex",
            fontFamily: props.t.sans,
            fontSize: 12,
            fontWeight: 600,
            gap: 8,
            justifyContent: "flex-start",
            maxWidth: "100%",
            minWidth: 0,
            opacity: props.disabled ? 0.6 : 1,
            padding: "8px 10px",
            textAlign: "left",
            whiteSpace: "nowrap",
            width: "100%",
            ...props.triggerStyle,
          }}
        >
          <CalendarGlyph color={props.t.muted} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {triggerText}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent t={props.t} align="start">
        <div style={{ padding: 10 }}>
          <Calendar
            t={props.t}
            mode="single"
            navLayout="around"
            selected={selected}
            onSelect={(date) => {
              if (!date) {
                props.onClear?.();
                props.onChange("");
                return;
              }
              props.onChange(formatYmdLocal(date));
              setOpen(false);
            }}
            defaultMonth={selected}
            disabled={today ? { after: today } : undefined}
            endMonth={today}
            autoFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function startOfLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
