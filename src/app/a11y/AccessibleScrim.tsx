import React from "react";

export function AccessibleScrim({
  onClose,
  label = "Close dialog",
  className,
}: {
  onClose: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`a11y-scrim${className ? ` ${className}` : ""}`}
      aria-label={label}
      onClick={onClose}
      tabIndex={-1}
    />
  );
}
