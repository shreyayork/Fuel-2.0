import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { resolveAuthenticatedHomePath } from "@/lib/auth/home-path";
import { MarketingLanding } from "@/components/marketing/MarketingLanding";

export const dynamic = "force-dynamic";

/**
 * Public root. Branches on session presence:
 *   - Unauthenticated → marketing landing (dual CTAs, walkthrough loop,
 *     teaser widget). The two CTAs deep-link into /onboard with the right
 *     `cta` param after sign-in.
 *   - Authenticated + account → workspace home (company overview for
 *     founders, /portfolio for PMs, /watchlists otherwise).
 *   - Authenticated + zero accounts → /onboard (defense in depth; the
 *     (app)/layout redirect catches this on any other authenticated route).
 */
export default async function RootPage() {
  const requireAuth = process.env.COGNITO_USER_POOL_ID != null;
  if (!requireAuth) {
    // Dev mode with no Cognito wired: skip session checks and forward to
    // the authenticated dashboard, matching the previous bare-/ behavior.
    redirect("/dashboard");
  }

  const session = await getSession();
  if (!session) {
    return <MarketingLanding />;
  }
  const account = await getActiveAccountForUser(session.email);
  if (!account) {
    redirect("/onboard");
  }
  redirect(resolveAuthenticatedHomePath(account));
}
