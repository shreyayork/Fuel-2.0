import { useEffect, useState } from "react";
import PatriotPayJourney, { type OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import OnboardingFlow, {
  answersToOnboardingBenchmark,
  isInvestorPersona,
  isOnboardingBenchmarkComplete,
  type OnboardingFlowAnswers,
} from "./OnboardingFlow.tsx";
import IntegrationSetupPage from "./IntegrationSetupPage.tsx";
import FuelLanding from "./marketing/FuelLanding.tsx";
import FuelSignIn from "./marketing/FuelSignIn.tsx";
import { FuelLegalPage } from "./legal/FuelLegalPage.tsx";
import { LegalNavProvider } from "./legal/LegalNavContext.tsx";
import type { LegalDocId } from "./legal/legalContent.ts";
import { requestPortfolioBuild } from "./investor/InvestorDashboard.tsx";
import { resetAndAwardOnboardingCredits } from "./profileCredits.ts";
import { completedOnboardingModules } from "./trackQuestions.ts";
import {
  clearStoredDetailAnswers,
  resetProfileCompletionPromptForNewLogin,
} from "./profileCompletionPromptStorage.ts";
import {
  clearSignedOut,
  createDemoReturningUserSession,
  loadWorkspaceSession,
  saveWorkspaceSession,
} from "./workspaceSession.ts";
import { AdvisorConnectionDialog } from "./AdvisorConnectionDialog.tsx";
import { BriefSharePage } from "./BriefSharePage.tsx";
import { getAuthEmail, setAuthEmail } from "./authSession.ts";
import {
  acceptCompanyAdvisorInvite,
  declineCompanyAdvisorInvite,
  findPendingCompanyAdvisorInviteForRecipient,
  getCompanyAdvisorLinkById,
  isCompanyAdvisorInviteRecipient,
  type CompanyAdvisorLink,
} from "./advisorDirectoryStorage.ts";
import { readBriefShareTokenFromUrl } from "./briefDocStorage.ts";
import {
  acceptAdvisorConnection,
  type AdvisorConnectionPermissions,
  clearAdvisorInviteTokenFromUrl,
  createAdvisorConnectionRequest,
  declineAdvisorConnection,
  getAdvisorConnectionByInviteToken,
  getAdvisorConnectionForCompany,
  readAdvisorInviteTokenFromUrl,
  resetAdvisorConnectionTestState,
  type AdvisorConnectionRecord,
} from "./advisorConnectionStorage.ts";
import { parseProfileFundingRounds } from "./trackQuestions.ts";
import {
  removeNotification,
  resetNotificationsForKind,
  upsertNotification,
  type NotificationAction,
  type WorkspaceNotification,
} from "./notificationStorage.ts";

type View = "landing" | "signin" | "onboarding" | "integrations" | "workspace" | "legal";

function resetAdvisorFeatureOnLocalRefresh() {
  if (typeof window === "undefined") return;
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!isLocal || navigation?.type !== "reload") return;
  resetAdvisorConnectionTestState();
  resetNotificationsForKind("advisor");
}

resetAdvisorFeatureOnLocalRefresh();

function founderCompanyIdFromAnswers(answers: OnboardingFlowAnswers | null | undefined): string | null {
  if (!answers || isInvestorPersona(answers)) return null;
  const slug = answers.profileCompany.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  return slug || null;
}

export default function App() {
  const [view, setView] = useState<View>(() => readAdvisorInviteTokenFromUrl() ? "signin" : "landing");
  const [legalDoc, setLegalDoc] = useState<LegalDocId>("terms");
  const [legalReturnView, setLegalReturnView] = useState<View>("landing");
  const [onboardingBenchmark, setOnboardingBenchmark] = useState<OnboardingBenchmarkInput | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingFlowAnswers | null>(null);
  const [workspaceInitialPage, setWorkspaceInitialPage] = useState("overview-building");
  const [connectionReview, setConnectionReview] = useState<AdvisorConnectionRecord | null>(null);
  const [pendingAdvisorConnection, setPendingAdvisorConnection] = useState<AdvisorConnectionRecord | null>(null);
  const [advisorAutoPromptShown, setAdvisorAutoPromptShown] = useState(false);
  const [profilePromptSuppressed, setProfilePromptSuppressed] = useState(false);
  const [companyAdvisorInviteReview, setCompanyAdvisorInviteReview] = useState<CompanyAdvisorLink | null>(null);
  const [pendingCompanyAdvisorInvite, setPendingCompanyAdvisorInvite] = useState<CompanyAdvisorLink | null>(null);
  const [companyAdvisorAutoPromptShown, setCompanyAdvisorAutoPromptShown] = useState(false);

  function companyAdvisorNotificationId(link: CompanyAdvisorLink) {
    return `company-advisor-invite:${link.id}:${link.invitedAt ?? "pending"}`;
  }

  function resolveCompanyAdvisorInviteForUser(
    email: string,
    answers: OnboardingFlowAnswers | null | undefined,
  ): CompanyAdvisorLink | null {
    return findPendingCompanyAdvisorInviteForRecipient(email, {
      excludeCompanyId: founderCompanyIdFromAnswers(answers) ?? undefined,
    });
  }

  function queueCompanyAdvisorInvite(
    link: CompanyAdvisorLink | null,
    email: string,
    answers: OnboardingFlowAnswers | null | undefined,
  ) {
    if (!link || !isCompanyAdvisorInviteRecipient(email, link)) {
      setPendingCompanyAdvisorInvite(null);
      return;
    }
    if (founderCompanyIdFromAnswers(answers) === link.companyId) {
      setPendingCompanyAdvisorInvite(null);
      return;
    }
    setPendingCompanyAdvisorInvite(link);
    setCompanyAdvisorAutoPromptShown(false);
    upsertNotification({
      id: companyAdvisorNotificationId(link),
      kind: "advisor",
      sourceLabel: "Advisors",
      title: `${link.companyName} invited you to connect`,
      message: "Review what they want to share before you accept.",
      action: {
        type: "company_advisor_invite_review",
        label: "Review invitation",
        linkId: link.id,
      },
    });
  }

  function queueCompanyAdvisorInvitesForEmail(
    email: string,
    answers: OnboardingFlowAnswers | null | undefined = onboardingAnswers,
  ) {
    queueCompanyAdvisorInvite(resolveCompanyAdvisorInviteForUser(email, answers), email, answers);
  }

  function advisorNotificationId(connection: AdvisorConnectionRecord) {
    return `advisor-connection:${connection.companyId}:${connection.requestedAt ?? "pending"}`;
  }

  function queueAdvisorConnection(connection: AdvisorConnectionRecord | null) {
    setPendingAdvisorConnection(connection);
    if (!connection) {
      setProfilePromptSuppressed(false);
      return;
    }
    setAdvisorAutoPromptShown(false);
    setProfilePromptSuppressed(true);
    const source = connection.source ?? (connection.status === "invite_sent" ? "invite" : "request");
    upsertNotification({
      id: advisorNotificationId(connection),
      kind: "advisor",
      sourceLabel: "Advisor",
      title: source === "invite"
        ? `${connection.advisorName} invited you to connect`
        : source === "crunchbase"
          ? "Possible advisor relationship found"
          : `${connection.advisorName} sent a connection request`,
      message: source === "crunchbase"
        ? `Fuel found ${connection.advisorName} listed as an advisor to ${connection.companyName}.`
        : `Review how ${connection.advisorName} can monitor shared information for ${connection.companyName}.`,
      action: {
        type: "advisor_connection_review",
        label: source === "invite" ? "Review invitation" : "Review relationship",
        companyId: connection.companyId,
      },
    });
  }

  function handleNotificationAction(action: NotificationAction, _notification: WorkspaceNotification) {
    if (action.type === "company_advisor_invite_review") {
      const email = getAuthEmail();
      const link = pendingCompanyAdvisorInvite?.id === action.linkId
        ? pendingCompanyAdvisorInvite
        : getCompanyAdvisorLinkById(action.linkId);
      if (
        link
        && isCompanyAdvisorInviteRecipient(email, link)
        && founderCompanyIdFromAnswers(onboardingAnswers) !== link.companyId
      ) {
        setCompanyAdvisorInviteReview(link);
      }
      return;
    }
    if (action.type !== "advisor_connection_review") return;
    const connection = pendingAdvisorConnection?.companyId === action.companyId
      ? pendingAdvisorConnection
      : getAdvisorConnectionForCompany(action.companyId);
    if (connection) {
      setProfilePromptSuppressed(true);
      setConnectionReview(connection);
    }
  }

  useEffect(() => {
    if (view !== "workspace" || !pendingAdvisorConnection || advisorAutoPromptShown) return;
    const timer = window.setTimeout(() => {
      setConnectionReview(pendingAdvisorConnection);
      setAdvisorAutoPromptShown(true);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [advisorAutoPromptShown, pendingAdvisorConnection, view]);

  useEffect(() => {
    if (view !== "workspace" || !pendingCompanyAdvisorInvite || companyAdvisorAutoPromptShown) return;
    const email = getAuthEmail();
    const link = pendingCompanyAdvisorInvite;
    if (
      !isCompanyAdvisorInviteRecipient(email, link)
      || founderCompanyIdFromAnswers(onboardingAnswers) === link.companyId
    ) {
      setPendingCompanyAdvisorInvite(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setCompanyAdvisorInviteReview(link);
      setCompanyAdvisorAutoPromptShown(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [companyAdvisorAutoPromptShown, onboardingAnswers, pendingCompanyAdvisorInvite, view]);

  function releaseProfilePromptAfterAdvisor() {
    window.setTimeout(() => setProfilePromptSuppressed(false), 900);
  }

  function pendingCompanyConnection(answers: OnboardingFlowAnswers | null | undefined) {
    const inviteToken = readAdvisorInviteTokenFromUrl();
    const invited = inviteToken ? getAdvisorConnectionByInviteToken(inviteToken) : null;
    if (invited?.status === "invite_sent") return invited;
    if (!answers || isInvestorPersona(answers)) return null;
    const domain = answers.profileWebsite?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ?? "";
    const companyId = answers.profileCompany.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const connection = getAdvisorConnectionForCompany(companyId, domain);
    if (connection?.status === "request_pending" || connection?.status === "invite_sent") {
      return connection;
    }
    if (connection) return null;
    const hasDetectedAdvisor = parseProfileFundingRounds(answers.profileFundingRounds)
      .some(round => round.investors.toLowerCase().includes("york ie"));
    return hasDetectedAdvisor
      ? createAdvisorConnectionRequest({
          id: companyId,
          name: answers.profileCompany,
          domain,
          source: "crunchbase",
        })
      : null;
  }

  function enterWorkspaceFromSignIn(email: string) {
    clearSignedOut();
    setAuthEmail(email);
    let session = loadWorkspaceSession();
    if (!session) {
      session = createDemoReturningUserSession();
      saveWorkspaceSession(session);
    }
    setOnboardingAnswers(session.onboardingAnswers);
    setOnboardingBenchmark(session.onboardingBenchmark);
    queueAdvisorConnection(pendingCompanyConnection(session.onboardingAnswers));
    queueCompanyAdvisorInvitesForEmail(email, session.onboardingAnswers);
    setWorkspaceInitialPage(
      isInvestorPersona(session.onboardingAnswers)
        ? "investor-portfolios"
        : "scorecard-v2",
    );
    setView("workspace");
  }

  function openLegal(doc: LegalDocId, returnTo: View) {
    setLegalDoc(doc);
    setLegalReturnView(returnTo);
    setView("legal");
  }

  const briefShareToken = readBriefShareTokenFromUrl();
  if (briefShareToken) {
    return <BriefSharePage token={briefShareToken} />;
  }

  if (view === "legal") {
    return (
      <LegalNavProvider openLegal={doc => openLegal(doc, legalReturnView)}>
        <FuelLegalPage
          variant="marketing"
          doc={legalDoc}
          onDocChange={setLegalDoc}
          onBack={() => setView(legalReturnView)}
          onSignIn={() => setView("signin")}
          onGetStarted={() => setView("signin")}
          onOpenLegal={doc => openLegal(doc, legalReturnView)}
          onFaq={() => {
            setView("landing");
            window.setTimeout(() => {
              document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
            }, 80);
          }}
        />
      </LegalNavProvider>
    );
  }

  if (view === "landing") {
    return (
      <LegalNavProvider openLegal={doc => openLegal(doc, "landing")}>
        <FuelLanding
          onSignIn={() => setView("signin")}
          onGetStarted={() => setView("signin")}
          onOpenLegal={doc => openLegal(doc, "landing")}
        />
      </LegalNavProvider>
    );
  }

  if (view === "signin") {
    const inviteToken = readAdvisorInviteTokenFromUrl();
    const invite = inviteToken ? getAdvisorConnectionByInviteToken(inviteToken) : null;
    return (
      <LegalNavProvider openLegal={doc => openLegal(doc, "signin")}>
        <FuelSignIn
          onBack={() => setView("landing")}
          initialEmail={invite?.recipientEmail}
          initialMode={invite ? "signup" : "signin"}
          onAuthComplete={(mode, email) => {
            setAuthEmail(email);
            if (mode === "signup") {
              queueCompanyAdvisorInvitesForEmail(email, null);
              setView("onboarding");
              return;
            }
            enterWorkspaceFromSignIn(email);
          }}
          onOpenLegal={doc => openLegal(doc, "signin")}
        />
      </LegalNavProvider>
    );
  }

  if (view === "workspace") {
    const isInvestor = isInvestorPersona(onboardingAnswers);
    return (
      <>
        <PatriotPayJourney
          initialPage={
            isInvestor
              ? "investor-portfolios"
              : workspaceInitialPage
          }
          initialBenchmark={onboardingBenchmark}
          initialOnboardingAnswers={onboardingAnswers}
          persona={isInvestor ? "investor" : "founder"}
          onNotificationAction={handleNotificationAction}
          suppressProfileCompletionPrompt={
            profilePromptSuppressed
            || Boolean(connectionReview)
            || Boolean(companyAdvisorInviteReview)
          }
        />
        <AdvisorConnectionDialog
          open={Boolean(connectionReview) || Boolean(companyAdvisorInviteReview)}
          connection={connectionReview}
          companyInvite={companyAdvisorInviteReview}
          onAccept={(permissions: AdvisorConnectionPermissions) => {
            if (companyAdvisorInviteReview) {
              acceptCompanyAdvisorInvite(companyAdvisorInviteReview.id);
              removeNotification(companyAdvisorNotificationId(companyAdvisorInviteReview));
              setCompanyAdvisorInviteReview(null);
              setPendingCompanyAdvisorInvite(null);
              return;
            }
            if (connectionReview) {
              acceptAdvisorConnection(connectionReview.companyId, permissions);
              removeNotification(advisorNotificationId(connectionReview));
            }
            clearAdvisorInviteTokenFromUrl();
            setConnectionReview(null);
            setPendingAdvisorConnection(null);
            releaseProfilePromptAfterAdvisor();
          }}
          onDecline={() => {
            if (companyAdvisorInviteReview) {
              declineCompanyAdvisorInvite(companyAdvisorInviteReview.id);
              removeNotification(companyAdvisorNotificationId(companyAdvisorInviteReview));
              setCompanyAdvisorInviteReview(null);
              setPendingCompanyAdvisorInvite(null);
              return;
            }
            if (connectionReview) {
              declineAdvisorConnection(connectionReview.companyId);
              removeNotification(advisorNotificationId(connectionReview));
            }
            clearAdvisorInviteTokenFromUrl();
            setConnectionReview(null);
            setPendingAdvisorConnection(null);
            releaseProfilePromptAfterAdvisor();
          }}
          onClose={() => {
            setCompanyAdvisorInviteReview(null);
            setConnectionReview(null);
            releaseProfilePromptAfterAdvisor();
          }}
        />
      </>
    );
  }
  if (view === "integrations") {
    return (
      <IntegrationSetupPage
        onComplete={() => setView("workspace")}
      />
    );
  }
  return (
    <OnboardingFlow
      onComplete={answers => {
        clearStoredDetailAnswers(answers.profileCompany, "Patriot Pay", "patriotpay");
        requestPortfolioBuild(answers.profileCompany || "Your fund");
        const benchmark = answersToOnboardingBenchmark(answers);
        setOnboardingBenchmark(benchmark);
        setOnboardingAnswers(answers);
        saveWorkspaceSession({ onboardingAnswers: answers, onboardingBenchmark: benchmark });
        clearSignedOut();
        const isInvestor = isInvestorPersona(answers);
        if (!isInvestor) {
          resetAndAwardOnboardingCredits(
            completedOnboardingModules(answers),
            isOnboardingBenchmarkComplete(answers),
            "patriotpay",
          );
        }
        resetProfileCompletionPromptForNewLogin("patriotpay");
        setWorkspaceInitialPage(isInvestor ? "investor-portfolios" : "overview-building");
        queueAdvisorConnection(pendingCompanyConnection(answers));
        queueCompanyAdvisorInvitesForEmail(getAuthEmail(), answers);
        setView("workspace");
      }}
    />
  );
}
