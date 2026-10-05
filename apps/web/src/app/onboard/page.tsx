import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAccountsForUser } from "@/lib/accounts";
import { isGenericProvider, parseEmailDomain } from "@/lib/auth/email-domains";
import { getPendingInvitesForEmail } from "@/lib/invites";
import { BlockedProviderScreen } from "@/components/onboard/BlockedProviderScreen";
import { PendingInviteInterstitial } from "@/components/onboard/PendingInviteInterstitial";
import { OnboardingExperience } from "@/components/onboard/chat";
import { OnboardingFlowExperience } from "@/components/onboard/v2";
import { ProfileStream } from "@/components/onboard/ProfileStream";
import { getCachedCompanyHintBundle } from "@/lib/onboard/resolve-company-hint-bundle";
import type { CompanyHintBundle } from "@/lib/onboard/map-company-hit";
export const dynamic = "force-dynamic";

type Cta = "benchmark" | "pitch-deck" | "explore";

function parseCta(raw: string | undefined): Cta {
  if (raw === "pitch-deck" || raw === "explore") return raw;
  return "benchmark";
}

/**
 * Onboarding orchestrator. Server-renders one of three branches:
 *   1. Blocked provider (Gmail / Outlook / etc.) — friendly "use your work
 *      email" screen.
 *   2. Pending invite — soft prompt offering to accept an existing invite
 *      instead of creating a duplicate account at the same company.
 *   3. v2 wizard (default) — two-column onboarding flow; chat via `?flow=chat`.
 *
 * If the user already has an account, the (app) layout's redirect should
 * have caught them before they got here; but defense-in-depth, if we ever
 * land here with a membership row, send them home.
 */
export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cta?: string; continueAnyway?: string; flow?: string }>;
}) {
  const { cta: ctaParam, continueAnyway, flow } = await searchParams;
  const cta = parseCta(ctaParam);
  const skipInviteCheck = continueAnyway === "1";

  // Design/local preview: no Cognito — always allow the onboarding UI.
  const designPreview = process.env.COGNITO_USER_POOL_ID == null;
  const requireAuth = !designPreview;
  const session = requireAuth ? await getSession() : null;
  if (requireAuth && !session) {
    redirect(
      `/sign-in?next=${encodeURIComponent(`/onboard?cta=${cta}`)}`,
    );
  }

  const email = session?.email ?? "mike@york.ie";

  // Design / local preview always shows the onboarding wizard after Sign in
  // (Product vs Investment path). Do not skip to Overview when a seed account
  // already exists — use the in-app nav for that surface.

  // Skip membership / provider gates in design preview so Sign in → onboard
  // always lands on the wizard for visual QA (first-time only).
  if (!designPreview) {
    const memberships = await listAccountsForUser(email);
    if (memberships.length > 0) redirect("/");

    if (isGenericProvider(email)) {
      return <BlockedProviderScreen email={email} />;
    }
  }

  const pendingInvites =
    designPreview || skipInviteCheck
      ? []
      : await getPendingInvitesForEmail(email);
  if (pendingInvites.length > 0) {
    return (
      <PendingInviteInterstitial
        invites={pendingInvites.map((i) => ({
          accountId: i.accountId,
          accountName: i.accountName,
          role: i.role,
          invitedByEmail: i.invitedByEmail,
          expiresAt: i.expiresAt.toISOString(),
        }))}
        cta={cta}
      />
    );
  }

  // Legacy streaming enrichment path (`?flow=stream`) — chat fallback via `?flow=chat`.
  if (flow === "stream") {
    const domain = parseEmailDomain(email) ?? "";
    return <ProfileStream cta={cta} email={email} domain={domain} />;
  }

  if (flow === "chat") {
    return <OnboardingExperience email={email} cta={cta} />;
  }

  // Design preview: never block the wizard on Neptune / fuel-data company hints.
  const domain = parseEmailDomain(email) ?? "";
  const designHintName = domain
    ? domain.split(".")[0]!.charAt(0).toUpperCase() + domain.split(".")[0]!.slice(1)
    : "Your company";
  const initialCompanyBundle: CompanyHintBundle | undefined = designPreview
    ? {
        hint: {
          domain,
          name: designHintName,
          source: "heuristic",
        },
        candidates: domain
          ? [
              {
                id: `design_${domain}`,
                name: designHintName,
                domain,
                whatTheyDo: "",
                industry: "",
                founded: "",
                city: "",
                stateRegion: "",
                country: "",
                linkedin: "",
                businessModel: "Product company",
                funding: [],
              },
            ]
          : [],
      }
    : await getCachedCompanyHintBundle(email);

  return (
    <OnboardingFlowExperience
      email={email}
      cta={cta}
      domain={domain}
      designPreview={designPreview}
      initialCompanyBundle={initialCompanyBundle}
    />
  );
}
