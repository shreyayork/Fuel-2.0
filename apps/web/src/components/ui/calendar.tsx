"use client";

import { useEffect, type CSSProperties } from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";
import { onAccentText, type Theme } from "@/lib/theme";

export type CalendarProps = DayPickerProps & { t: Theme };

const CALENDAR_STYLE_ID = "fuel-calendar-style";

/**
 * shadcn-style density + squared continuous range, scoped to `.fuel-cal`.
 * Colors resolve from per-instance CSS vars (see calendarVars) so both themes
 * share one stylesheet. Injected once.
 */
const CALENDAR_CSS = `
.fuel-cal.rdp-root { --rdp-months-gap: 1.25rem; font-size: 12.5px; }
/* navLayout="around": prev sits at the left edge of the first month, next at
 * the right edge of the last one, captions centered between them. */
.fuel-cal .rdp-month_caption { height: 2rem; font-size: 12.5px; font-weight: 600; }
.fuel-cal .rdp-nav { height: 2rem; gap: 2px; }
.fuel-cal .rdp-button_next,
.fuel-cal .rdp-button_previous { width: 1.75rem; height: 1.75rem; border-radius: 6px; }
.fuel-cal[data-nav-layout="around"] .rdp-button_previous,
.fuel-cal[data-nav-layout="around"] .rdp-button_next { height: 1.75rem; top: 2px; }
.fuel-cal .rdp-button_next:hover,
.fuel-cal .rdp-button_previous:hover { background: var(--fuel-cal-hover); }
.fuel-cal .rdp-chevron { width: 16px; height: 16px; fill: var(--fuel-cal-muted); }
/* Flex rows (shadcn layout) so each week keeps its own vertical gutter — a
 * highlighted range never merges with the rows above or below it. */
.fuel-cal .rdp-month_grid { width: 100%; border-collapse: collapse; }
.fuel-cal .rdp-weekdays { display: flex; }
.fuel-cal .rdp-week { display: flex; width: 100%; margin-top: 4px; }
.fuel-cal .rdp-weekday { flex: 1; font-size: 11px; font-weight: 600; opacity: 1; color: var(--fuel-cal-ink); padding: 4px 0; }
.fuel-cal .rdp-day { flex: 1; width: 2rem; height: 2rem; }
.fuel-cal .rdp-day_button {
  width: 2rem; height: 2rem; border: 0; border-radius: 6px;
  font-size: 12.5px; font-weight: 600;
}
.fuel-cal .rdp-day_button:hover { background: var(--fuel-cal-hover); }
.fuel-cal .rdp-outside { opacity: 0.4; }
.fuel-cal .rdp-selected { font-size: 12.5px; font-weight: 600; }
.fuel-cal .rdp-selected .rdp-day_button { border: 0; }
/* Continuous squared range on the cell; rounded only at ends. */
.fuel-cal .rdp-range_start,
.fuel-cal .rdp-range_middle,
.fuel-cal .rdp-range_end { background: none; background-color: var(--fuel-cal-range-tint); }
.fuel-cal .rdp-range_start { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
.fuel-cal .rdp-range_end { border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
.fuel-cal .rdp-range_middle .rdp-day_button { border-radius: 0; color: var(--fuel-cal-ink); background: none; }
.fuel-cal .rdp-range_start .rdp-day_button,
.fuel-cal .rdp-range_end .rdp-day_button {
  background-color: var(--rdp-accent-color); color: var(--fuel-cal-on-accent);
}
.fuel-cal .rdp-range_start.rdp-range_end { background: none; }
`;

function useCalendarStylesheet() {
  useEffect(() => {
    if (document.getElementById(CALENDAR_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = CALENDAR_STYLE_ID;
    style.textContent = CALENDAR_CSS;
    document.head.appendChild(style);
  }, []);
}

function calendarVars(t: Theme): CSSProperties {
  const onAccent = onAccentText(t);
  return {
    ["--rdp-accent-color" as string]: t.accent,
    ["--rdp-accent-background-color" as string]: t.accentTint,
    ["--rdp-day_button-border-radius" as string]: "6px",
    ["--rdp-selected-border" as string]: "0",
    ["--fuel-cal-range-tint" as string]: t.accentTint,
    ["--fuel-cal-on-accent" as string]: onAccent,
    ["--fuel-cal-ink" as string]: t.inkSoft,
    ["--fuel-cal-muted" as string]: t.muted,
    ["--fuel-cal-hover" as string]: t.borderFaint,
    color: t.inkSoft,
    fontFamily: t.sans,
    fontWeight: 600,
  };
}

/** Themed DayPicker — shadcn Calendar composition, Fuel tokens. */
export function Calendar({ t, className, style, ...props }: CalendarProps) {
  useCalendarStylesheet();
  return (
    <DayPicker
      showOutsideDays={false}
      className={`fuel-cal${className ? ` ${className}` : ""}`}
      style={{ ...calendarVars(t), ...style }}
      {...props}
    />
  );
}
