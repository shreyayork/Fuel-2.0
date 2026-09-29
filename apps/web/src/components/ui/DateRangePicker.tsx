"use client";

import { useState, type CSSProperties } from "react";
import type { DateRange } from "react-day-picker";
import type { Theme } from "@/lib/theme";
import {
  formatDayRangeTrigger,
  formatYmdLocal,
  pendingRangeToPicker,
  parseYmdLocal,
  resolveRangeSelection,
  type DayRange,
  type PendingDayRange,
} from "@/lib/date-range";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type DateRangePickerProps = {
  t: Theme;
  /** Currently applied range — callers pass their active preset range when no custom one is set. */
  value: DayRange | null;
  onChange: (value: DayRange) => void;
  /** Called when the user clears the selection on the calendar. */
  onClear?: () => void;
  /** Optional override for the trigger label (e.g. Usage report label). */
  label?: string;
  "aria-label"?: string;
  numberOfMonths?: number;
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

/** Same surface / type as the neighbouring text inputs and selects. */
function triggerStyle(t: Theme): CSSProperties {
  return {
    alignItems: "center",
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    boxSizing: "border-box",
    color: t.inkSoft,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 600,
    gap: 8,
    justifyContent: "flex-start",
    maxWidth: "100%",
    minWidth: 0,
    padding: "8px 10px",
    textAlign: "left",
    whiteSpace: "nowrap",
  };
}

function toPending(range: DayRange | null): PendingDayRange | null {
  return range ? { start: range.start, end: range.end } : null;
}

function pickerToPending(range: DateRange | undefined): PendingDayRange | null {
  if (!range?.from) return null;
  return {
    start: formatYmdLocal(range.from),
    end: range.to ? formatYmdLocal(range.to) : undefined,
  };
}

/**
 * shadcn-style range picker: Popover trigger + Calendar in range mode.
 *
 * Range transitions (extend past either edge, shrink, clear) come from
 * DayPicker's own range handling; this component only decides what to apply
 * and when to close — a range finished from a start-only selection closes,
 * adjusting an applied range stays open.
 */
export function DateRangePicker(props: DateRangePickerProps) {
  const ariaLabel = props["aria-label"] ?? "Date range";
  const months = props.numberOfMonths ?? 2;
  const [open, setOpen] = useState(false);
  /** Live calendar selection; null while the applied range is on screen. */
  const [draft, setDraft] = useState<PendingDayRange | null>(null);
  const [draftActive, setDraftActive] = useState(false);

  const committed = props.value;
  const shown = draftActive ? draft : toPending(committed);
  const selected = pendingRangeToPicker(shown);
  const incomplete = Boolean(shown?.start && !shown?.end);

  const pendingStart = incomplete && shown ? parseYmdLocal(shown.start) : null;
  const triggerText = pendingStart
    ? pendingStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : (props.label ?? (props.value ? formatDayRangeTrigger(props.value) : "Pick a date range"));

  const appliedLabel = props.value ? formatDayRangeTrigger(props.value) : "";

  const resetDraft = () => {
    setDraft(null);
    setDraftActive(false);
  };

  const handleOpenChange = (next: boolean) => {
    // Dismissing mid-selection discards the draft; the applied range stays.
    if (!next) resetDraft();
    setOpen(next);
  };

  const handleSelect = (next: DateRange | undefined) => {
    const outcome = resolveRangeSelection(shown, pickerToPending(next));
    setDraftActive(true);

    if (outcome.kind === "cleared") {
      setDraft(null);
      props.onClear?.();
      return;
    }
    if (outcome.kind === "pending") {
      setDraft(outcome.pending);
      return;
    }

    setDraft({ start: outcome.range.start, end: outcome.range.end });
    props.onChange(outcome.range);
    if (outcome.close) {
      resetDraft();
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${ariaLabel}${appliedLabel ? `: ${appliedLabel}` : ""}`}
          style={triggerStyle(props.t)}
        >
          <CalendarGlyph color={props.t.muted} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{triggerText}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent t={props.t} align="start">
        <div style={{ padding: 10 }}>
          <Calendar
            t={props.t}
            mode="range"
            numberOfMonths={months}
            navLayout="around"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected?.from}
            autoFocus
          />
          {incomplete ? (
            <p
              style={{
                color: props.t.muted,
                fontFamily: props.t.sans,
                fontSize: 11,
                margin: "4px 4px 0",
              }}
            >
              Select an end date to apply. Current range stays active until then.
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
