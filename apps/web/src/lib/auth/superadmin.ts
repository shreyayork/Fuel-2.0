import "server-only";
import type { FuelSession } from "./verify";

export const SUPER_ADMIN_GROUP = "super-admin";

/** Local-dev stand-in when Cognito is not configured (matches layout / actions). */
export const SUPER_ADMIN_DEV_EMAIL = "mike@york.ie";

/**
 * When Cognito is unset, layout and server actions authorize as this email.
 * Returns null when a real Cognito pool is configured.
 */
export function superAdminDevEmail(): string | null {
  return process.env.COGNITO_USER_POOL_ID ? null : SUPER_ADMIN_DEV_EMAIL;
}

/**
 * Super admin in Fuel 2.0 = membership in the `super-admin` Cognito group.
 * In local dev (no Cognito configured), mike@york.ie is treated as super
 * admin so the super-admin screens are reachable without a deployed pool.
 */
export function isSuperAdmin(session: FuelSession | null | undefined, email?: string | null): boolean {
  if (!process.env.COGNITO_USER_POOL_ID) {
    // Match sessionGroups(): no Cognito → default local user is super-admin.
    // Callers that omit `email` (server actions) must still authorize like layout.
    const effectiveEmail = session?.email ?? email ?? SUPER_ADMIN_DEV_EMAIL;
    return effectiveEmail === SUPER_ADMIN_DEV_EMAIL;
  }
  return !!session?.groups?.includes(SUPER_ADMIN_GROUP);
}

/** Resolves the session's groups (or an empty array if unset). */
export function sessionGroups(session: FuelSession | null | undefined): string[] {
  if (!process.env.COGNITO_USER_POOL_ID) {
    // Local dev: the default user (mike@york.ie) is super admin. Any other
    // email explicitly set on the session gets no groups.
    const effectiveEmail = session?.email ?? SUPER_ADMIN_DEV_EMAIL;
    return effectiveEmail === SUPER_ADMIN_DEV_EMAIL ? ["super-admin"] : [];
  }
  return session?.groups ?? [];
}
