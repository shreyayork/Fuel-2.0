/** Returns a validated same-origin path, or null when absent / unsafe. */
export function sanitizeAuthNextPath(nextPath?: string | null): string | null {
  if (
    typeof nextPath === "string" &&
    nextPath.startsWith("/") &&
    !nextPath.startsWith("//")
  ) {
    return nextPath;
  }
  return null;
}

/**
 * Validates a post-auth redirect target. Falls back to /dashboard so
 * signed-in users land in the app (which forwards to the workspace home).
 */
export function resolveAuthNextPath(nextPath?: string | null): string {
  return sanitizeAuthNextPath(nextPath) ?? "/dashboard";
}
