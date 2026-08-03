/** Shared copy for drawer forms that save partial progress on exit. */
export function confirmSaveAndExit(): boolean {
  return window.confirm(
    "Save your progress and exit? You can continue where you left off anytime.",
  );
}

export function confirmDiscardAndClose(): boolean {
  return window.confirm(
    "Close without saving? Any unsaved answers in this module will be lost.",
  );
}
