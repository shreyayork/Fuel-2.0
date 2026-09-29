/** Pure role gate for billing invoice access (safe for unit tests). */
export function isBillingAdminRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}
