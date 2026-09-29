import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  patchCatalogCompanyFromEnrichment,
  runEnrichmentPipeline,
} from "@/lib/catalog-enrich";
import {
  claimOnboardEnrichmentRun,
  completeOnboardEnrichmentRun,
  failOnboardEnrichmentRun,
  getOnboardEnrichmentRun,
} from "@/lib/onboard/enrichment-runs";
import {
  extractCompanyProfileSkill,
  type ExtractCompanyProfileResult,
} from "@/lib/agent/skills/extractCompanyProfile";
import {
  extractBenchmarkHintsSkill,
  type BenchmarkHints,
} from "@/lib/agent/skills/extractBenchmarkHints";
import {
  captureIntegrationException,
  captureIntegrationMessage,
} from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 840;

function matchesSecret(value: string, expected: string | undefined): boolean {
  if (!value || !expected) return false;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function POST(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!matchesSecret(bearer, process.env.INTERNAL_CRON_TOKEN)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { runId?: string };
  if (!body.runId) {
    return NextResponse.json({ error: "missing_run_id" }, { status: 400 });
  }

  const run = await claimOnboardEnrichmentRun(body.runId);
  if (!run) {
    const existing = await getOnboardEnrichmentRun(body.runId);
    if (existing?.status === "completed") {
      return NextResponse.json({ ok: true, status: existing.status });
    }
    if (existing?.status === "running") {
      return NextResponse.json(
        { error: "run_already_running" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "run_not_claimable" }, { status: 409 });
  }

  const startedAt = Date.now();
  captureIntegrationMessage("onboard_enrichment_queue_started", {
    integration: "onboard_enrichment",
    operation: "queue_worker",
    level: "info",
    userId: run.cognitoSub,
    tags: { process_status: "running" },
    context: {
      runId: run.id,
      domain: run.domain,
      companyId: run.fuelDataCompanyId,
      attempt: run.attemptCount,
    },
  });

  try {
    const enrichment = await runEnrichmentPipeline({
      domain: run.domain,
      mode: "full",
      monitoring: {
        runId: run.id,
        userId: run.cognitoSub,
        companyId: run.fuelDataCompanyId,
        targetSource: run.targetSource,
      },
    });
    const publicText = [
      enrichment.longDescription,
      JSON.stringify(enrichment.sources.crunchbase ?? {}),
      JSON.stringify(enrichment.sources.linkedin ?? {}),
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 10_000);
    const [extracted, benchmarkHints] = await Promise.all([
      extractCompanyProfileSkill
        .execute(
          { domain: run.domain },
          { userEmail: run.userEmail, accountId: run.accountId ?? "" },
        )
        .catch((error) => {
          captureIntegrationException(error, {
            integration: "bedrock",
            operation: "queued_extract_company_profile",
            level: "warning",
            userId: run.cognitoSub,
            context: { runId: run.id, domain: run.domain },
          });
          return (
            (run.extractedPayload as ExtractCompanyProfileResult | null) ?? null
          );
        }),
      extractBenchmarkHintsSkill
        .execute(
          {
            domain: run.domain,
            publicText,
            employeeCountRaw: enrichment.employeeCount,
            totalFundingUsd: enrichment.totalFundingUsd,
            lastFundingAt: enrichment.lastFundingAt,
            lastFundingType: enrichment.lastFundingType,
          },
          { userEmail: run.userEmail, accountId: run.accountId ?? "" },
        )
        .catch((error) => {
          captureIntegrationException(error, {
            integration: "bedrock",
            operation: "queued_extract_benchmark_hints",
            level: "warning",
            userId: run.cognitoSub,
            context: { runId: run.id, domain: run.domain },
          });
          return (run.benchmarkHints as BenchmarkHints | null) ?? null;
        }),
    ]);
    const result = {
      enrichment,
      extracted,
      benchmarkHints,
    };
    await completeOnboardEnrichmentRun(run.id, result);
    const completedRun = await getOnboardEnrichmentRun(run.id);
    if (completedRun?.catalogCompanyId) {
      await patchCatalogCompanyFromEnrichment(
        completedRun.catalogCompanyId,
        enrichment,
      );
    }
    captureIntegrationMessage("onboard_enrichment_queue_completed", {
      integration: "onboard_enrichment",
      operation: "queue_worker",
      level: "info",
      userId: run.cognitoSub,
      tags: { process_status: "completed" },
      context: {
        runId: run.id,
        domain: run.domain,
        companyId: run.fuelDataCompanyId,
        durationMs: Date.now() - startedAt,
        providers: enrichment.providers,
      },
    });
    return NextResponse.json({ ok: true, status: "completed" });
  } catch (error) {
    const willRetry = run.attemptCount < 3;
    await failOnboardEnrichmentRun(
      run.id,
      error instanceof Error ? error.message : String(error),
      willRetry,
    );
    captureIntegrationException(error, {
      integration: "onboard_enrichment",
      operation: "queue_worker",
      userId: run.cognitoSub,
      tags: { process_status: willRetry ? "retrying" : "failed" },
      context: {
        runId: run.id,
        domain: run.domain,
        companyId: run.fuelDataCompanyId,
        durationMs: Date.now() - startedAt,
        attempt: run.attemptCount,
      },
    });
    return NextResponse.json({ error: "enrichment_failed" }, { status: 500 });
  }
}
