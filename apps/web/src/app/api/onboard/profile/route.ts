import "server-only";
import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listAccountsForUser } from "@/lib/accounts";
import {
  runEnrichmentPipeline,
  type EnrichmentPayload,
  type EnrichmentMonitoringContext,
} from "@/lib/catalog-enrich";
import {
  extractCompanyProfileSkill,
  type ExtractCompanyProfileResult,
} from "@/lib/agent/skills/extractCompanyProfile";
import {
  extractBenchmarkHintsSkill,
  type BenchmarkHints,
} from "@/lib/agent/skills/extractBenchmarkHints";
import { buildNdjsonStream, NDJSON_HEADERS } from "@/lib/streaming/ndjson";
import {
  captureIntegrationException,
  captureIntegrationMessage,
} from "@/lib/sentry/capture";
import {
  resolveOnboardEnrichmentTarget,
  type OnboardEnrichmentTarget,
} from "@/lib/onboard/resolve-enrichment-target";
import {
  isOnboardUnlockWithoutCrunchbaseEnabled,
  isReviewUnlockReady,
} from "@/lib/onboard/unlock-without-crunchbase";
import {
  claimOnboardEnrichmentRun,
  completeOnboardEnrichmentRun,
  createOrReuseOnboardEnrichmentRun,
  dispatchOnboardEnrichmentRun,
  getOnboardEnrichmentRun,
  markOnboardEnrichmentQueued,
} from "@/lib/onboard/enrichment-runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Crunchbase Bright Data jobs for heavy orgs measured ~9 min collection;
// keep route budget aligned with Lambda timeout + CB client default (600s).
export const maxDuration = 600;

/**
 * Streaming profile-reveal endpoint for `/onboard`.
 *
 * Enrichment domain is resolved server-side: an explicit onboard company
 * selection (fuel-data id/domain query params) takes precedence over the
 * Cognito-verified session email domain. Selected companies must resolve
 * through fuel-data so arbitrary domains cannot be scraped.
 *
 * Same-domain re-signups intentionally produce a NEW workspace each
 * time. Teammates who want to share a workspace go through the invite
 * flow (an owner sends an invite from /account/users) — cold signups
 * never auto-join an existing workspace.
 */
type StepId = "website" | "techstack" | "crunchbase" | "linkedin" | "extract" | "cohort";

interface StepEvent {
  type: "step";
  id: StepId;
  status: "running" | "done" | "error";
  label: string;
  error?: string;
}

/** Composite payload sent once enrichment + extraction both settle. */
export interface OnboardProfilePayload {
  enrichment: EnrichmentPayload;
  /** Skill output — present unless the extractor errored. */
  extracted: ExtractCompanyProfileResult | null;
  /** LLM-extracted + structurally-computed benchmark hints for the BenchmarkCard pre-fill. */
  benchmarkHints: BenchmarkHints | null;
}

interface ProfileEvent {
  type: "profile";
  payload: OnboardProfilePayload;
  /** True while LinkedIn / extract still running. */
  partial?: boolean;
  /** Client may show review while slow providers continue. */
  unlockReview?: boolean;
}

interface DoneEvent {
  type: "done";
}

interface JobEvent {
  type: "job";
  runId: string;
  status: "pending" | "queued" | "running" | "completed" | "failed";
}

interface ErrorEvent {
  type: "error";
  code: "blocked_provider" | "already_has_account" | "unknown";
  message: string;
}

type OnboardEvent = StepEvent | ProfileEvent | JobEvent | DoneEvent | ErrorEvent;

const STEP_LABELS: Record<StepId, string> = {
  website: "Scanning your homepage",
  techstack: "Detecting your tech stack",
  crunchbase: "Looking up Crunchbase",
  linkedin: "Reading your LinkedIn company page",
  extract: "Reading the details into a profile",
  cohort: "Identifying your peer cohort",
};

export async function GET(req: Request): Promise<Response> {
  const session = await getSession();
  if (process.env.COGNITO_USER_POOL_ID && !session) {
    redirect("/sign-in?next=/onboard");
  }
  const email = session?.email ?? "mike@york.ie";
  const userId = session?.sub ?? "local-development";
  //const email = "maheshchomal@snabbit.com";
  if (!email) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const url = new URL(req.url);
  const queueMode = url.searchParams.get("background") === "1";
  const enrichmentTarget = await resolveOnboardEnrichmentTarget(email, {
    companyId: url.searchParams.get("companyId"),
    companyDomain: url.searchParams.get("companyDomain"),
  });

  if (!enrichmentTarget) {
    // Stream a single error event so the client renders the blocked-provider
    // screen consistently with other failure paths.
    return new Response(
      buildNdjsonStream(
        (async function* (): AsyncGenerator<OnboardEvent> {
          yield {
            type: "error",
            code: "blocked_provider",
            message:
              "Generic / disposable email providers can't claim a company.",
          };
        })(),
      ),
      { headers: NDJSON_HEADERS },
    );
  }

  // Defense in depth: if the user already has an account, the layout-level
  // redirect should already have caught this, but treat the API as the
  // source of truth and refuse here too.
  const memberships = await listAccountsForUser(email);
  if (memberships.length > 0) {
    return new Response(
      buildNdjsonStream(
        (async function* (): AsyncGenerator<OnboardEvent> {
          yield {
            type: "error",
            code: "already_has_account",
            message: "You already have a Fuel account.",
          };
        })(),
      ),
      { headers: NDJSON_HEADERS },
    );
  }

  const run = queueMode
    ? await createOrReuseOnboardEnrichmentRun({
        cognitoSub: userId,
        userEmail: email,
        target: enrichmentTarget,
      })
    : null;
  const runId = run?.id ?? randomUUID();

  return new Response(
    buildNdjsonStream(
      enrichDomainEvents(enrichmentTarget, email, userId, runId, {
        queueMode,
        shouldDispatch: run?.status === "pending",
        existingStatus: run?.status ?? null,
      }),
    ),
    {
      headers: NDJSON_HEADERS,
    },
  );
}

/**
 * Wraps `runEnrichmentPipeline` and streams step + profile events.
 *
 * Review unlocks from selected Fuel data immediately. Website and early LLM
 * extraction can fill gaps while Crunchbase and LinkedIn continue in-stream.
 * `ONBOARD_UNLOCK_WITHOUT_CRUNCHBASE=0` restores the legacy server unlock.
 */
async function* enrichDomainEvents(
  target: OnboardEnrichmentTarget,
  userEmail: string,
  userId: string,
  runId: string,
  options: {
    queueMode: boolean;
    shouldDispatch: boolean;
    existingStatus: string | null;
  },
): AsyncGenerator<OnboardEvent> {
  const { domain } = target;
  const monitoring: EnrichmentMonitoringContext = {
    runId,
    userId,
    companyId: target.companyId,
    targetSource: target.source,
  };
  const pipelineStartedAt = Date.now();
  captureIntegrationMessage("onboard_enrichment_started", {
    integration: "onboard_enrichment",
    operation: "onboard_enrichment",
    level: "info",
    userId,
    tags: { process_status: "started" },
    context: {
      runId,
      domain,
      companyId: target.companyId,
      targetSource: target.source,
    },
  });
  if (options.queueMode) {
    yield {
      type: "job",
      runId,
      status:
        options.existingStatus === "running" ||
        options.existingStatus === "queued"
          ? options.existingStatus
          : "pending",
    };
  }

  yield {
    type: "step",
    id: "website",
    status: "running",
    label: STEP_LABELS.website,
  };
  yield {
    type: "step",
    id: "techstack",
    status: "running",
    label: STEP_LABELS.techstack,
  };
  yield {
    type: "step",
    id: "crunchbase",
    status: "running",
    label: STEP_LABELS.crunchbase,
  };
  yield {
    type: "step",
    id: "linkedin",
    status: "running",
    label: STEP_LABELS.linkedin,
  };
  yield {
    type: "step",
    id: "extract",
    status: "running",
    label: STEP_LABELS.extract,
  };
  yield {
    type: "step",
    id: "cohort",
    status: "running",
    label: STEP_LABELS.cohort,
  };

  const pending: OnboardEvent[] = [];
  let wake: (() => void) | null = null;
  const push = (ev: OnboardEvent) => {
    pending.push(ev);
    wake?.();
    wake = null;
  };

  let enrichmentResult: EnrichmentPayload | undefined;
  let pipelineError: string | null = null;
  const unlockWithoutCb = isOnboardUnlockWithoutCrunchbaseEnabled();
  let reviewUnlocked = false;
  let earlyExtracted: ExtractCompanyProfileResult | null = null;
  let earlyExtractStarted = false;

  const pushUnlockProfile = (
    payload: EnrichmentPayload,
    extracted: ExtractCompanyProfileResult | null,
  ) => {
    if (reviewUnlocked) return;
    reviewUnlocked = true;
    console.info(
      `[onboard] unlockReview domain=${payload.domain} fuelData=${payload.providers.fuelData} website=${payload.providers.website} crunchbase=${payload.providers.crunchbase} earlyExtract=${Boolean(extracted)} flag=${unlockWithoutCb}`,
    );
    push({
      type: "profile",
      partial: true,
      payload: {
        enrichment: payload,
        extracted,
        benchmarkHints: null,
      },
      unlockReview: true,
    });
  };

  const tryUnlockFromPayload = (
    payload: EnrichmentPayload,
    extracted: ExtractCompanyProfileResult | null = earlyExtracted,
  ) => {
    if (!unlockWithoutCb || reviewUnlocked) return;
    if (
      isReviewUnlockReady({
        enrichment: payload,
        extracted,
        businessModel: "Product company",
      })
    ) {
      pushUnlockProfile(payload, extracted);
    }
  };

  const runEarlyExtractIfNeeded = async (payload: EnrichmentPayload) => {
    if (!unlockWithoutCb || reviewUnlocked || earlyExtractStarted) return;
    earlyExtractStarted = true;
    try {
      earlyExtracted = await extractCompanyProfileSkill
        .execute({ domain: payload.domain }, { userEmail, accountId: "" })
        .catch((e: Error) => {
          captureIntegrationException(e, {
            integration: "bedrock",
            operation: "extract_company_profile_early",
            level: "warning",
          });
          return null;
        });
      push({
        type: "step",
        id: "extract",
        status: earlyExtracted?.error ? "error" : "done",
        label: STEP_LABELS.extract,
        error: earlyExtracted?.error,
      });
      tryUnlockFromPayload(payload, earlyExtracted);
      // After website + extract attempt, unlock even if some fields missing —
      // user can edit; never wait for Crunchbase when flag is on.
      if (!reviewUnlocked) {
        pushUnlockProfile(payload, earlyExtracted);
      }
    } catch (e) {
      captureIntegrationException(e, {
        integration: "bedrock",
        operation: "onboard_extract_early",
      });
      push({
        type: "step",
        id: "extract",
        status: "error",
        label: STEP_LABELS.extract,
        error: (e as Error).message?.slice(0, 200) ?? "extraction failed",
      });
      if (!reviewUnlocked) {
        pushUnlockProfile(payload, null);
      }
    }
  };

  const pipelinePromise = Sentry.startSpan(
    {
      name: "onboard.enrichment",
      op: "onboarding.enrichment",
      attributes: {
        "enrichment.run_id": runId,
        "enrichment.domain": domain,
        "enrichment.target_source": target.source,
      },
    },
    () =>
      runEnrichmentPipeline({
        domain,
        monitoring,
        mode: options.queueMode ? "fast" : "full",
        onPhase: async ({ phase, payload }) => {
      if (phase === "fuel_data_ready") {
        tryUnlockFromPayload(payload);
        return;
      }
      if (phase === "website_ready") {
        push({
          type: "step",
          id: "website",
          status: payload.providers.website ? "done" : "error",
          label: STEP_LABELS.website,
          error: payload.providers.website
            ? undefined
            : "couldn't reach the homepage",
        });
        push({
          type: "step",
          id: "techstack",
          status: payload.providers.techStack ? "done" : "error",
          label: STEP_LABELS.techstack,
          error: payload.providers.techStack
            ? undefined
            : "tech stack inconclusive",
        });
        if (unlockWithoutCb) {
          tryUnlockFromPayload(payload);
          await runEarlyExtractIfNeeded(payload);
        }
        return;
      }
      if (phase === "crunchbase_ready") {
        push({
          type: "step",
          id: "crunchbase",
          status: payload.providers.crunchbase ? "done" : "error",
          label: STEP_LABELS.crunchbase,
          error: payload.providers.crunchbase
            ? undefined
            : "Crunchbase page not found or not scraped",
        });
        if (!unlockWithoutCb) {
          pushUnlockProfile(payload, null);
        } else if (!reviewUnlocked) {
          pushUnlockProfile(payload, earlyExtracted);
        } else {
          push({
            type: "profile",
            partial: true,
            payload: {
              enrichment: payload,
              extracted: earlyExtracted,
              benchmarkHints: null,
            },
          });
        }
        return;
      }
      if (phase === "bright_data_ready" || phase === "complete") {
        push({
          type: "step",
          id: "linkedin",
          status: payload.providers.linkedin ? "done" : "error",
          label: STEP_LABELS.linkedin,
          error: payload.providers.linkedin
            ? undefined
            : "LinkedIn page not found or not scraped",
        });
        if (phase === "bright_data_ready") {
          push({
            type: "profile",
            partial: true,
            payload: {
              enrichment: payload,
              extracted: earlyExtracted,
              benchmarkHints: null,
            },
          });
        }
      }
        },
      }),
  )
    .then((payload) => {
      enrichmentResult = payload;
      captureIntegrationMessage(
        options.queueMode
          ? "onboard_enrichment_fast_phase_completed"
          : "onboard_enrichment_completed",
        {
        integration: "onboard_enrichment",
        operation: "onboard_enrichment",
        level: "info",
        userId,
        tags: {
          process_status: options.queueMode ? "fast_completed" : "completed",
        },
        context: {
          runId,
          domain,
          companyId: target.companyId,
          targetSource: target.source,
          status: "completed",
          durationMs: Date.now() - pipelineStartedAt,
          providers: payload.providers,
          unavailableCount: payload.timing.unavailable.length,
        },
        },
      );
      wake?.();
      wake = null;
    })
    .catch((e) => {
      captureIntegrationException(e, {
        integration: "enrichment",
        operation: "onboard_profile",
        userId,
        context: {
          runId,
          domain,
          companyId: target.companyId,
          targetSource: target.source,
          durationMs: Date.now() - pipelineStartedAt,
        },
      });
      captureIntegrationMessage("onboard_enrichment_completed", {
        integration: "onboard_enrichment",
        operation: "onboard_enrichment",
        level: "error",
        userId,
        tags: { process_status: "failed" },
        context: {
          runId,
          domain,
          companyId: target.companyId,
          targetSource: target.source,
          status: "failed",
          durationMs: Date.now() - pipelineStartedAt,
        },
      });
      pipelineError = (e as Error).message ?? "enrichment failed";
      wake?.();
      wake = null;
    });

  while (!enrichmentResult && !pipelineError) {
    while (pending.length > 0) {
      yield pending.shift()!;
    }
    if (enrichmentResult || pipelineError) break;
    await new Promise<void>((resolve) => {
      wake = resolve;
    });
  }
  while (pending.length > 0) {
    yield pending.shift()!;
  }
  await pipelinePromise;

  if (pipelineError || !enrichmentResult) {
    const msg = pipelineError ?? "enrichment failed";
    for (const id of [
      "website",
      "techstack",
      "crunchbase",
      "linkedin",
      "extract",
      "cohort",
    ] as StepId[]) {
      yield {
        type: "step",
        id,
        status: "error",
        label: STEP_LABELS[id],
        error: msg,
      };
    }
    yield { type: "error", code: "unknown", message: msg };
    return;
  }

  let enrichment = enrichmentResult;

  let extracted: ExtractCompanyProfileResult | null = earlyExtracted;
  let benchmarkHints: BenchmarkHints | null = null;

  const cbRaw = (enrichment.sources.crunchbase ?? {}) as Record<
    string,
    unknown
  >;
  const liRaw = (enrichment.sources.linkedin ?? {}) as Record<string, unknown>;
  const publicText =
    [
      enrichment.longDescription
        ? `WEBSITE:\n${enrichment.longDescription.slice(0, 5_000)}`
        : null,
      (cbRaw.about ?? cbRaw.company_overview ?? cbRaw.full_description)
        ? `CRUNCHBASE:\n${String(cbRaw.about ?? cbRaw.company_overview ?? cbRaw.full_description).slice(0, 2_000)}`
        : null,
      (liRaw.description ?? liRaw.about ?? liRaw.overview)
        ? `LINKEDIN:\n${String(liRaw.description ?? liRaw.about ?? liRaw.overview).slice(0, 2_000)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n") || null;

  try {
    const extractPromise = earlyExtracted
      ? Promise.resolve(earlyExtracted)
      : extractCompanyProfileSkill
          .execute({ domain: enrichment.domain }, { userEmail, accountId: "" })
          .catch((e: Error) => {
            captureIntegrationException(e, {
              integration: "bedrock",
              operation: "extract_company_profile",
              level: "warning",
            });
            return null;
          });

    [extracted, benchmarkHints] = await Promise.all([
      extractPromise,
      extractBenchmarkHintsSkill
        .execute(
          {
            domain: enrichment.domain,
            publicText,
            employeeCountRaw: enrichment.employeeCount,
            totalFundingUsd: enrichment.totalFundingUsd,
            lastFundingAt: enrichment.lastFundingAt,
            lastFundingType: enrichment.lastFundingType,
          },
          { userEmail, accountId: "" },
        )
        .catch((e: Error) => {
          captureIntegrationException(e, {
            integration: "bedrock",
            operation: "extract_benchmark_hints",
            level: "warning",
          });
          return null;
        }),
    ]);

    if (!earlyExtractStarted) {
      yield {
        type: "step",
        id: "extract",
        status: extracted?.error ? "error" : "done",
        label: STEP_LABELS.extract,
        error: extracted?.error,
      };
    }
  } catch (e) {
    captureIntegrationException(e, {
      integration: "bedrock",
      operation: "onboard_extract",
    });
    if (!earlyExtractStarted) {
      yield {
        type: "step",
        id: "extract",
        status: "error",
        label: STEP_LABELS.extract,
        error: (e as Error).message?.slice(0, 200) ?? "extraction failed",
      };
    }
  }

  if (options.queueMode) {
    const fastResult = {
      enrichment,
      extracted,
      benchmarkHints: benchmarkHints ?? null,
    };
    const markedQueued =
      options.shouldDispatch &&
      (await markOnboardEnrichmentQueued(runId, fastResult));
    if (markedQueued) {
      const dispatched = await dispatchOnboardEnrichmentRun(runId);
      if (dispatched) {
        captureIntegrationMessage("onboard_enrichment_queued", {
          integration: "onboard_enrichment",
          operation: "queue_dispatch",
          level: "info",
          userId,
          tags: { process_status: "queued" },
          context: {
            runId,
            domain,
            companyId: target.companyId,
            targetSource: target.source,
          },
        });
        yield { type: "job", runId, status: "queued" };
      } else {
        const inlineRun = await claimOnboardEnrichmentRun(runId);
        if (inlineRun) {
          enrichment = await runEnrichmentPipeline({
            domain,
            monitoring,
            mode: "full",
          });
          await completeOnboardEnrichmentRun(runId, {
            enrichment,
            extracted,
            benchmarkHints: benchmarkHints ?? null,
          });
          yield { type: "job", runId, status: "completed" };
        } else {
          const current = await getOnboardEnrichmentRun(runId);
          yield {
            type: "job",
            runId,
            status: current?.status === "completed" ? "completed" : "running",
          };
        }
      }
    } else {
      const current = await getOnboardEnrichmentRun(runId);
      yield {
        type: "job",
        runId,
        status:
          current?.status === "completed"
            ? "completed"
            : current?.status === "running"
              ? "running"
              : "queued",
      };
    }
  }

  yield {
    type: "step",
    id: "cohort",
    status: "done",
    label: STEP_LABELS.cohort,
  };

  yield {
    type: "profile",
    partial: false,
    payload: { enrichment, extracted, benchmarkHints: benchmarkHints ?? null },
    unlockReview: !reviewUnlocked,
  };

  yield { type: "done" };
}

