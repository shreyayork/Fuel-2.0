import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { onboardEnrichmentRuns } from "@/db/schema";
import type { EnrichmentPayload } from "@/lib/catalog-enrich";
import type { ExtractCompanyProfileResult } from "@/lib/agent/skills/extractCompanyProfile";
import type { BenchmarkHints } from "@/lib/agent/skills/extractBenchmarkHints";
import type { OnboardEnrichmentTarget } from "@/lib/onboard/resolve-enrichment-target";
import { captureIntegrationException } from "@/lib/sentry/capture";

export type OnboardEnrichmentRunStatus =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type OnboardEnrichmentResult = {
  enrichment: EnrichmentPayload;
  extracted: ExtractCompanyProfileResult | null;
  benchmarkHints: BenchmarkHints | null;
};

export type OnboardEnrichmentRun = typeof onboardEnrichmentRuns.$inferSelect;

const ACTIVE_STATUSES: OnboardEnrichmentRunStatus[] = [
  "pending",
  "queued",
  "running",
];

export async function createOrReuseOnboardEnrichmentRun(opts: {
  cognitoSub: string;
  userEmail: string;
  target: OnboardEnrichmentTarget;
}): Promise<OnboardEnrichmentRun> {
  const db = await getDb();
  const existing = await findActiveOnboardEnrichmentRun(
    opts.cognitoSub,
    opts.target.domain,
  );
  if (existing) return existing;

  const id = randomUUID();
  try {
    const [created] = await db
      .insert(onboardEnrichmentRuns)
      .values({
        id,
        cognitoSub: opts.cognitoSub,
        userEmail: opts.userEmail.toLowerCase(),
        domain: opts.target.domain,
        fuelDataCompanyId: opts.target.companyId,
        targetSource: opts.target.source,
      })
      .returning();
    if (created) return created;
  } catch (error) {
    const raced = await findActiveOnboardEnrichmentRun(
      opts.cognitoSub,
      opts.target.domain,
    );
    if (raced) return raced;
    throw error;
  }
  throw new Error("onboard enrichment run was not created");
}

export async function findActiveOnboardEnrichmentRun(
  cognitoSub: string,
  domain: string,
): Promise<OnboardEnrichmentRun | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(onboardEnrichmentRuns)
    .where(
      and(
        eq(onboardEnrichmentRuns.cognitoSub, cognitoSub),
        eq(onboardEnrichmentRuns.domain, domain),
        inArray(onboardEnrichmentRuns.status, ACTIVE_STATUSES),
      ),
    )
    .orderBy(desc(onboardEnrichmentRuns.startedAt))
    .limit(1);
  return row ?? null;
}

export async function getOwnedOnboardEnrichmentRun(
  runId: string,
  cognitoSub: string,
): Promise<OnboardEnrichmentRun | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(onboardEnrichmentRuns)
    .where(
      and(
        eq(onboardEnrichmentRuns.id, runId),
        eq(onboardEnrichmentRuns.cognitoSub, cognitoSub),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getOnboardEnrichmentRun(
  runId: string,
): Promise<OnboardEnrichmentRun | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(onboardEnrichmentRuns)
    .where(eq(onboardEnrichmentRuns.id, runId))
    .limit(1);
  return row ?? null;
}

export async function markOnboardEnrichmentQueued(
  runId: string,
  result: OnboardEnrichmentResult,
): Promise<boolean> {
  const db = await getDb();
  const [updated] = await db
    .update(onboardEnrichmentRuns)
    .set({
      status: "queued",
      enrichmentPayload: result.enrichment as unknown as Record<string, unknown>,
      extractedPayload:
        result.extracted as unknown as Record<string, unknown> | null,
      benchmarkHints:
        result.benchmarkHints as unknown as Record<string, unknown> | null,
      steps: {
        website: result.enrichment.providers.website ? "done" : "error",
        techstack: result.enrichment.providers.techStack ? "done" : "error",
        crunchbase: "queued",
        linkedin: "queued",
        extract: result.extracted?.error ? "error" : "done",
      },
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(onboardEnrichmentRuns.id, runId),
        eq(onboardEnrichmentRuns.status, "pending"),
      ),
    )
    .returning({ id: onboardEnrichmentRuns.id });
  return Boolean(updated);
}

export async function claimOnboardEnrichmentRun(
  runId: string,
): Promise<OnboardEnrichmentRun | null> {
  const db = await getDb();
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
  const [row] = await db
    .update(onboardEnrichmentRuns)
    .set({
      status: "running",
      attemptCount: sql`${onboardEnrichmentRuns.attemptCount} + 1`,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(onboardEnrichmentRuns.id, runId),
        or(
          inArray(onboardEnrichmentRuns.status, ["queued", "failed"]),
          and(
            eq(onboardEnrichmentRuns.status, "running"),
            lt(onboardEnrichmentRuns.updatedAt, staleBefore),
          ),
        ),
      ),
    )
    .returning();
  return row ?? null;
}

export async function completeOnboardEnrichmentRun(
  runId: string,
  result: OnboardEnrichmentResult,
): Promise<void> {
  const now = new Date();
  const db = await getDb();
  await db
    .update(onboardEnrichmentRuns)
    .set({
      status: "completed",
      enrichmentPayload: result.enrichment as unknown as Record<string, unknown>,
      extractedPayload:
        result.extracted as unknown as Record<string, unknown> | null,
      benchmarkHints:
        result.benchmarkHints as unknown as Record<string, unknown> | null,
      steps: {
        website: result.enrichment.providers.website ? "done" : "error",
        techstack: result.enrichment.providers.techStack ? "done" : "error",
        crunchbase: result.enrichment.providers.crunchbase ? "done" : "error",
        linkedin: result.enrichment.providers.linkedin ? "done" : "error",
        extract: result.extracted?.error ? "error" : "done",
      },
      errorMessage: null,
      completedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(onboardEnrichmentRuns.id, runId),
        eq(onboardEnrichmentRuns.status, "running"),
      ),
    );
}

export async function failOnboardEnrichmentRun(
  runId: string,
  errorMessage: string,
  willRetry = false,
): Promise<void> {
  const db = await getDb();
  await db
    .update(onboardEnrichmentRuns)
    .set({
      status: willRetry ? "queued" : "failed",
      errorMessage: errorMessage.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(onboardEnrichmentRuns.id, runId),
        eq(onboardEnrichmentRuns.status, "running"),
      ),
    );
}

export async function linkOnboardEnrichmentRunToClaim(opts: {
  runId: string;
  cognitoSub: string;
  accountId: string;
  catalogCompanyId: string;
}): Promise<OnboardEnrichmentRun | null> {
  const db = await getDb();
  const [row] = await db
    .update(onboardEnrichmentRuns)
    .set({
      accountId: opts.accountId,
      catalogCompanyId: opts.catalogCompanyId,
      claimedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(onboardEnrichmentRuns.id, opts.runId),
        eq(onboardEnrichmentRuns.cognitoSub, opts.cognitoSub),
      ),
    )
    .returning();
  return row ?? null;
}

export async function dispatchOnboardEnrichmentRun(
  runId: string,
): Promise<boolean> {
  const queueUrl = process.env.ONBOARD_ENRICHMENT_QUEUE_URL;
  if (!queueUrl) return false;
  try {
    const { SQSClient, SendMessageCommand } = await import(
      "@aws-sdk/client-sqs"
    );
    await new SQSClient({}).send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ runId }),
      }),
    );
    return true;
  } catch (error) {
    captureIntegrationException(error, {
      integration: "onboard_enrichment",
      operation: "queue_dispatch",
      context: { runId },
    });
    return false;
  }
}

