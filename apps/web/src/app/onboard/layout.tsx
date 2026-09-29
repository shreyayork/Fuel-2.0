import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth/session";
import { SIGNAL } from "@/lib/theme";

export const dynamic = "force-dynamic";

/**
 * Onboarding layout. Authenticated, but DOES NOT mount the AppShell — the
 * user has no account yet. Full-bleed shell for the chat onboarding experience.
 */
export default async function OnboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const requireAuth = process.env.COGNITO_USER_POOL_ID != null;
  if (requireAuth) {
    const session = await getSession();
    if (!session) redirect("/sign-in?next=/onboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: SIGNAL.bg,
        color: SIGNAL.ink,
        fontFamily: SIGNAL.sans,
      }}
    >
      {children}
    </main>
  );
}
