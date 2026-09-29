/** User-facing copy when a team name collides within an account. */
export const DUPLICATE_TEAM_NAME_MESSAGE = "A team with this name already exists.";

export function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase();
}

/** Case-insensitive match against existing team names (client pre-check). */
export function isTeamNameTaken(
  candidate: string,
  existing: readonly { id?: string; name: string }[],
  excludeId?: string,
): boolean {
  const normalized = normalizeTeamName(candidate);
  if (!normalized) return false;
  return existing.some((team) => {
    if (excludeId && team.id === excludeId) return false;
    return normalizeTeamName(team.name) === normalized;
  });
}
