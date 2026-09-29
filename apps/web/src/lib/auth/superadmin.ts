import "server-only";
import type { FuelSession } from "./verify";

export const SUPER_ADMIN_GROUP = "super-admin";

/**
 * Super admin in Fuel 2.0 = membership in the `super-admin` Cognito group.
 * In local dev (no Cognito configured), mike@york.ie is treated as super
 * admin so the super-admin screens are reachable without a deployed pool.
 */
export function isSuperAdmin(session: FuelSession | null | undefined, email?: string | null): boolean {
  if (!process.env.COGNITO_USER_POOL_ID) {
    // Match sessionGroups(): no Cognito → default local user is super-admin.
    // Callers that omit `email` (server actions) must still authorize like layout.
    const effectiveEmail = session?.email ?? email ?? "mike@york.ie";
    return effectiveEmail === "mike@york.ie";
  }
  return !!session?.groups?.includes(SUPER_ADMIN_GROUP);
}

/** Resolves the session's groups (or an empty array if unset). */
export function sessionGroups(session: FuelSession | null | undefined): string[] {
  if (!process.env.COGNITO_USER_POOL_ID) {
    // Local dev: the default user (mike@york.ie) is super admin. Any other
    // email explicitly set on the session gets no groups.
    const effectiveEmail = session?.email ?? "mike@york.ie";
    return effectiveEmail === "mike@york.ie" ? ["super-admin"] : [];
  }
  return session?.groups ?? [];
}
