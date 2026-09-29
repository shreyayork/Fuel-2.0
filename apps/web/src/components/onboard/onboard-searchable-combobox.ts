export type ComboboxOption = {
  value: string;
  label: string;
};

/** Display label for a committed value (matched option or raw legacy string). */
export function comboboxCommittedLabel(
  value: string,
  options: ComboboxOption[],
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = options.find((o) => o.value === trimmed || o.label === trimmed);
  return match?.label ?? value;
}

/**
 * Apply a native input edit to combobox draft/selection state.
 * Clearing or editing away from the committed label must clear selection
 * so the previous value cannot repopulate the controlled field.
 */
export function applyComboboxInputEdit(args: {
  inputValue: string;
  committedLabel: string;
}): { draft: string; shouldClearCommitted: boolean } {
  return {
    draft: args.inputValue,
    shouldClearCommitted: args.inputValue !== args.committedLabel,
  };
}
