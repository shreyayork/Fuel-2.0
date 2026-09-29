/** Pure helpers for York help temporary dismiss (calendar days). */

export function yorkHelpTemporaryDismissUntil(
  hideDays: number,
  now = new Date(),
): Date {
  const until = new Date(now.getTime());
  until.setDate(until.getDate() + hideDays);
  return until;
}

export function isYorkHelpTemporaryDismissMode(mode: string): boolean {
  return mode === "hide" || mode === "14d";
}
