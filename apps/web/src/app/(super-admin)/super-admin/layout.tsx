import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { SuperAdminShell } from "@/components/SuperAdminShell";

export const dynamic = "force-dynamic";

/**
 * Dedicated shell for /super-admin/*. Lives in its own route group so the
 * normal-user bundle doesn't ship any of the super-admin view code — App
 * Router code-splits per segment, and nothing in (app) imports from here.
 *
 * Non-super-admin users get a 404 (rather than 403) so the existence of
 * admin screens isn't leaked to unauthorized callers.
 */
export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  // Local dev (no Cognito configured) has no session cookie; fall back to
  // the default dev user so isSuperAdmin's dev path can authorize.
  const devEmail = process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie";
  if (!isSuperAdmin(session, devEmail)) notFound();
  return <SuperAdminShell>{children}</SuperAdminShell>;
}
