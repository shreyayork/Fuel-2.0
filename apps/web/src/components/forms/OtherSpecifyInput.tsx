"use client";

import type { ChangeEvent, CSSProperties } from "react";
import { OTHER_SPECIFY_MAX_LENGTH } from "@/lib/overview/detail-question-catalog";

type OtherSpecifyInputProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  maxLength?: number;
  /** `"input"` for single-line (onboarding); `"textarea"` for overview drawer. */
  as?: "input" | "textarea";
  rows?: number;
  className?: string;
  style?: CSSProperties;
  /** Show a visible label above the field (Add Details drawer). */
  showLabel?: boolean;
  required?: boolean;
  labelStyle?: CSSProperties;
};

/**
 * Free-text field shown when an "Other" choice is selected.
 * Controlled; parent owns clear-on-deselect and answer encoding.
 */
export function OtherSpecifyInput({
  id,
  label = "Please specify",
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = "Please specify",
  maxLength = OTHER_SPECIFY_MAX_LENGTH,
  as = "input",
  rows = 2,
  className,
  style,
  showLabel = false,
  required = false,
  labelStyle,
}: OtherSpecifyInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value.slice(0, maxLength));
  };

  const shared = {
    id,
    value,
    maxLength,
    placeholder,
    "aria-label": label,
    "aria-required": required || undefined,
    required: required || undefined,
    onFocus,
    onBlur,
    onChange: handleChange,
    className,
    style,
  };

  const field =
    as === "textarea" ? (
      <textarea {...shared} rows={rows} />
    ) : (
      <input type="text" {...shared} autoComplete="off" />
    );

  if (!showLabel) return field;

  return (
    <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
        {required ? " *" : ""}
      </label>
      {field}
    </div>
  );
}
