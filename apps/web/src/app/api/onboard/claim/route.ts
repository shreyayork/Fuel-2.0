import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  InvalidSignupEmailError,
  UserAlreadyHasAccountError,
  getActiveAccountForUser,
  provisionCompanyAccount,
} from "@/lib/accounts";
import { resolveAuthenticatedHomePath } from "@/lib/auth/home-path";
import { hasAnyBenchmarkInput } from "@/lib/onboard/benchmark-fields";
import { ClaimBody } from "@/lib/onboard/claim-body-schema";
import { enrichClaimProfileWithWizard } from "@/lib/onboard/claim-profile";
import { upsertUpdate, currentPeriod } from "@/lib/portfolio-updates";
import { captureIntegrationException, captureIntegrationMessage } from "@/lib/sentry/capture";
import {
  dispatchOverviewJob,
  enqueueOverviewJob,
} from "@/lib/overview/run-overview-job";
import { startLegacyWatchlistMigration } from "@/lib/onboard/legacy-watchlist-migration";
import { sendWelcomeEmailBestEffort } from "@/lib/email/send-welcome";
import { resolveOnboardClaimRedirect } from "@/lib/onboard/claim-redirect";
import { mapOnboardingToAnswers } from "@/lib/overview/onboarding-field-map";
import { extraDetailQuestionIds } from "@/lib/overview/detail-question-catalog";
import { upsertDetailAnswers } from "@/lib/overview/sync-answers";
import { awardEligibleProfileCredits } from "@/lib/overview/award-profile-credits";
import { persistProfileEarn } from "@/lib/credits/queries";
import {
  findActiveOnboardEnrichmentRun,
  getOwnedOnboardEnrichmentRun,
  linkOnboardEnrichmentRunToClaim,
} from "@/lib/onboard/enrichment-runs";
import {
  patchCatalogCompanyFromEnrichment,
  type EnrichmentPayload,
} from "@/lib/catalog-enrich";
import { normalizeDomain } from "@/lib/fuel-data";
import { autoBuildInvestorPortfolios } from "@/lib/portfolio/auto-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  const email =
    session?.email ??
    (process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie");
  if (!email) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  let parsed: import("@/lib/onboard/claim-body-schema").ParsedClaimBody;
  try {
    const raw = await req.json();
    parsed = ClaimBody.parse(raw);
  } catch (e) {
    const issues = (e as { issues?: Array<{ path?: string[]; message: string }> })?.issues;
    const detail = issues
      ? JSON.stringify(
          issues.map((i) => `${i.path?.join(".") ?? "?"}: ${i.message}`),
        )
      : (e as Error).message;
    return NextResponse.json(
      { error: "invalid_body", detail },
      { status: 400 },
    );
  }

  try {
    const cognitoSub = session?.sub ?? "local-development";
    const explicitRun = parsed.enrichmentRunId
      ? await getOwnedOnboardEnrichmentRun(parsed.enrichmentRunId, cognitoSub)
      : null;
    if (parsed.enrichmentRunId && !explicitRun) {
      return NextResponse.json(
        { error: "invalid_enrichment_run" },
        { status: 400 },
      );
    }
    const claimDomain = normalizeDomain(parsed.profile.website ?? "");
    const ownedRun =
      explicitRun ??
      (claimDomain
        ? await findActiveOnboardEnrichmentRun(cognitoSub, claimDomain)
        : null);
    const completedEnrichment =
      ownedRun?.status === "completed"
        ? (ownedRun.enrichmentPayload as unknown as EnrichmentPayload)
        : null;
    const claimProfile = completedEnrichment
      ? mergeCompletedEnrichment(parsed.profile, completedEnrichment)
      : parsed.profile;
    const profile = enrichClaimProfileWithWizard(claimProfile, {
      flowType: parsed.flowType,
      cohortKey: parsed.cohortKey,
      answers: parsed.answers,
      investorAnswers: parsed.investorAnswers,
      profileForm: parsed.profileForm,
      fundingRounds: parsed.fundingRounds,
      rawBenchmarkInputs: parsed.rawBenchmarkInputs,
    });

    const flowType = parsed.flowType === "investor" ? "investor" : "operating";

    const { account, catalogCompany } = await provisionCompanyAccount({
      email,
      profile,
      flowType,
    });
    if (ownedRun) {
      const linkedRun = await linkOnboardEnrichmentRunToClaim({
        runId: ownedRun.id,
        cognitoSub,
        accountId: account.id,
        catalogCompanyId: catalogCompany.id,
      });
      if (linkedRun?.status === "completed" && linkedRun.enrichmentPayload) {
        await patchCatalogCompanyFromEnrichment(
          catalogCompany.id,
          linkedRun.enrichmentPayload as unknown as EnrichmentPayload,
        );
      }
    }

    const mapped = mapOnboardingToAnswers({
      operating: parsed.answers ?? undefined,
      profileForm: parsed.profileForm ?? undefined,
    });
    const earnAnswers = Object.fromEntries(
      mapped.map((row) => [row.questionId, row.answer ?? ""]),
    );
    if (parsed.setupIncomplete) {
      const extras = Object.fromEntries(extraDetailQuestionIds().map((id) => [id, ""]));
      await upsertDetailAnswers({
        accountId: account.id,
        companyUuid: catalogCompany.id,
        answers: extras,
      });
    }
    if (Object.keys(earnAnswers).length > 0) {
      await upsertDetailAnswers({
        accountId: account.id,
        companyUuid: catalogCompany.id,
        answers: earnAnswers,
      });
    }
    if (flowType !== "investor") {
      await awardEligibleProfileCredits({
        accountId: account.id,
        answers: earnAnswers,
        replaceModules: Boolean(parsed.setupIncomplete),
        setupIncomplete: parsed.setupIncomplete,
        benchmarkComplete:
          parsed.metrics != null &&
          hasAnyBenchmarkInput(parsed.metrics) &&
          [
            parsed.metrics.arrUsd,
            parsed.metrics.arrGrowthYoyPct,
            parsed.metrics.nrrPct,
            parsed.metrics.logoRetentionPct,
            parsed.metrics.monthlyBurnUsd,
            parsed.metrics.cashOnHandUsd,
            parsed.metrics.grossMarginPct,
            parsed.metrics.fteCount,
            parsed.metrics.paidCustomerCount,
          ].every((v) => v != null),
      });
    }

    const hasBenchmarkMetrics =
      parsed.metrics != null && hasAnyBenchmarkInput(parsed.metrics);

    if (hasBenchmarkMetrics) {
      await saveBenchmarkSubmission({
        accountId: account.id,
        companyUuid: catalogCompany.id,
        email,
        metrics: parsed.metrics!,
      }).catch((e) => {
        captureIntegrationMessage("Onboard benchmark submission save failed", {
          integration: "portfolio",
          operation: "benchmark_submission",
          context: { accountId: account.id },
        });
        captureIntegrationException(e, {
          integration: "portfolio",
          operation: "benchmark_submission",
        });
      });
    }

    const cohortParam = parsed.cohortKey?.trim();
    const runId = await enqueueOverviewJob({
      accountId: account.id,
      companyUuid: catalogCompany.id,
      userEmail: email,
    });
    void dispatchOverviewJob(runId);

    // Fuel 1.0 → 2.0 watchlists: background only (do not await).
    startLegacyWatchlistMigration({
      creatorEmail: email,
      targetAccountId: account.id,
    });

    if (flowType === "investor") {
      void autoBuildInvestorPortfolios({
        accountId: account.id,
        userEmail: email,
        firmName: catalogCompany.name,
        firmDomain: catalogCompany.domain,
        force: true,
      }).catch((e) => {
        captureIntegrationException(e, {
          integration: "neptune",
          operation: "investor_portfolio_auto_build_claim",
        });
      });
    }

    void sendWelcomeEmailBestEffort({
      to: email,
      accountId: account.id,
      companyUuid: catalogCompany.id,
      flowType,
      givenName: session?.givenName ?? null,
    });

    const redirectUrl = resolveOnboardClaimRedirect({
      flowType,
      cta: parsed.cta,
      companyUuid: catalogCompany.id,
      cohortKey: cohortParam,
      setupIncomplete: parsed.setupIncomplete,
    });

    return NextResponse.json({
      accountId: account.id,
      companyUuid: catalogCompany.id,
      redirect: redirectUrl,
      overviewJobId: runId,
      legacyWatchlists: { started: true },
    });
  } catch (e) {
    if (e instanceof InvalidSignupEmailError) {
      return NextResponse.json({ error: "blocked_provider" }, { status: 400 });
    }
    if (e instanceof UserAlreadyHasAccountError) {
      // Local design / re-claim: still send the user into the CTA-specific
      // workspace instead of dumping them on the marketing site (`/`).
      const account = await getActiveAccountForUser(email);
      const flowType = parsed.flowType === "investor" ? "investor" : "operating";
      const designPreview = process.env.COGNITO_USER_POOL_ID == null;
      const setupIncomplete =
        parsed.setupIncomplete === true || (designPreview && flowType === "operating");
      if (account && setupIncomplete && flowType === "operating") {
        await persistProfileEarn(account.id, {
          setupIncomplete: true,
          profilePromptDismissed: false,
        }).catch(() => undefined);
      }
      const redirect =
        account?.primaryCompanyUuid
          ? resolveOnboardClaimRedirect({
              flowType,
              // Prefer Overview + Complete Profile over Intelligence on re-claim.
              cta:
                designPreview && parsed.cta === "benchmark"
                  ? "explore"
                  : parsed.cta,
              companyUuid: account.primaryCompanyUuid,
              cohortKey: parsed.cohortKey?.trim() || null,
              setupIncomplete,
            })
          : resolveAuthenticatedHomePath(account);
      return NextResponse.json(
        { error: "already_has_account", redirect },
        { status: 409 },
      );
    }
    captureIntegrationException(e, { integration: "onboard", operation: "claim" });
    return NextResponse.json(
      { error: "internal_error", detail: (e as Error).message ?? "unknown" },
      { status: 500 },
    );
  }
}

function mergeCompletedEnrichment(
  profile: import("@/lib/onboard/claim-body-schema").ParsedClaimBody["profile"],
  enrichment: EnrichmentPayload,
): import("@/lib/onboard/claim-body-schema").ParsedClaimBody["profile"] {
  return {
    ...profile,
    shortDescription: profile.shortDescription ?? enrichment.shortDescription,
    longDescription: profile.longDescription ?? enrichment.longDescription,
    industry: profile.industry ?? enrichment.industry,
    locationCity: profile.locationCity ?? enrichment.locationCity,
    locationState: profile.locationState ?? enrichment.locationState,
    locationCountry: profile.locationCountry ?? enrichment.locationCountry,
    employeeCount: profile.employeeCount ?? enrichment.employeeCount,
    foundedOn: profile.foundedOn ?? enrichment.foundedOn,
    totalFundingUsd: profile.totalFundingUsd ?? enrichment.totalFundingUsd,
    numFundingRounds: profile.numFundingRounds ?? enrichment.numFundingRounds,
    linkedinUrl: profile.linkedinUrl ?? enrichment.linkedinUrl,
    crunchbaseUrl: profile.crunchbaseUrl ?? enrichment.crunchbaseUrl,
    twitterUrl: profile.twitterUrl ?? enrichment.twitterUrl,
    website: profile.website ?? enrichment.websiteUrl,
    sources: {
      ...enrichment.sources,
      ...(profile.sources ?? {}),
      enrichmentTiming: enrichment.timing,
      enrichmentProviders: enrichment.providers,
    },
  };
}

async function saveBenchmarkSubmission(opts: {
  accountId: string;
  companyUuid: string;
  email: string;
  metrics: NonNullable<import("@/lib/onboard/claim-body-schema").ParsedClaimBody["metrics"]>;
}): Promise<void> {
  const m = opts.metrics;

  await upsertUpdate({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    period: currentPeriod(),
    asOf: null,
    submittedByEmail: opts.email,
    status: "submitted",
    arrUsd: m.arrUsd ?? null,
    arrGrowthYoyPct: m.arrGrowthYoyPct ?? null,
    nrrPct: m.nrrPct ?? null,
    logoRetentionPct: m.logoRetentionPct ?? null,
    monthlyBurnUsd: m.monthlyBurnUsd ?? null,
    cashOnHandUsd: m.cashOnHandUsd ?? null,
    grossMarginPct: m.grossMarginPct ?? null,
    fteCount: m.fteCount ?? null,
    paidCustomerCount: m.paidCustomerCount ?? null,
    notableCustomers: m.notableCustomers ?? null,
    challenges: m.challenges ?? null,
    cacPaybackMonths: m.cacPaybackMonths ?? null,
    burnMultiple: m.burnMultiple ?? null,
    ruleOf40Pct: m.ruleOf40Pct ?? null,
    notableHires: null,
    otherUpdates: null,
    bankingPartner: null,
    legalCounsel: null,
    cloudProvider: null,
    capTablePlatform: null,
    doInsuranceProvider: null,
    crmPlatform: null,
    openToInvestorIntros: false,
  });
}
