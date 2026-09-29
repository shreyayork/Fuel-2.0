import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { agentRuns } from "@/db/schema";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { OVERVIEW_GENERATION_KIND } from "./constants";
import { loadOverviewCohortContext } from "./cohort";
import { generateOverviewAi } from "./generate";
import { partitionAnswersForModel } from "@/lib/onboard/unknown-answer";
import { buildOverviewInput } from "./map-input";
import { beginOverviewPerfLog } from "./perf-log";
import type { OverviewPerfSession } from "./perf-log";
import { persistOverviewGeneration } from "./persist";
import { buildDetailQuestionCatalogForModel } from "./detail-question-catalog";
import { loadOverviewPlaybookCatalog } from "./playbook-catalog";
import { loadSignalCatalog } from "@/lib/intelligence/signal-catalog";
import { valueFieldForKind } from "@/lib/intelligence/insight-value";

export interface OverviewJobPayload {
  accountId: string;
  companyUuid: string;
  userEmail: string;
}

export async function enqueueOverviewJob(payload: OverviewJobPayload): Promise<string> {
  const db = await getDb();
  const runId = randomUUID();
  await db.insert(agentRuns).values({
    id: runId,
    accountId: payload.accountId,
    userEmail: payload.userEmail,
    kind: OVERVIEW_GENERATION_KIND,
    subjectCompanyUuid: payload.companyUuid,
    prompt: "overview_generation",
    status: "pending",
  });
  return runId;
}

export async function runOverviewGeneration(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  runId?: string | null;
  /** Log label for the entrypoint (e.g. sync generate vs worker). */
  source?: string;
  /** Share an outer API timing session (sync generate route). */
  perf?: OverviewPerfSession;
}): Promise<{ snapshotId: string | null; error?: string; runId: string }> {
  const db = await getDb();
  const runId = opts.runId ?? (await enqueueOverviewJob(opts));
  const ownsPerf = !opts.perf;
  const perf =
    opts.perf ??
    beginOverviewPerfLog({
      runId,
      companyUuid: opts.companyUuid,
      accountId: opts.accountId,
      source: opts.source ?? "runOverviewGeneration",
    });
  perf.setRunId(runId);

  if (opts.runId) {
    await db
      .update(agentRuns)
      .set({ status: "running" })
      .where(eq(agentRuns.id, runId));
  }

  const startedAt = Date.now();
  let llmFields: OverviewAgentRunLlmFields = {};

  try {
    const { benchmarkRows, input, playbookCatalog, signalCatalog } = await perf.time(
      "Database Fetch",
      async () => {
        const cohort = await loadOverviewCohortContext(opts.companyUuid);
        const built = await buildOverviewInput({
          accountId: opts.accountId,
          companyUuid: opts.companyUuid,
          cohortKey: cohort.cohortKey,
          benchmarkRows: cohort.benchmarkRows,
        });
        const catalog = await loadOverviewPlaybookCatalog({
          accountId: opts.accountId,
        });
        const signals = await loadSignalCatalog(opts.accountId);
        return {
          benchmarkRows: cohort.benchmarkRows,
          input: built,
          playbookCatalog: catalog,
          signalCatalog: signals,
        };
      },
    );

    const { known: modelAnswers, unknownIds: unknownQuestionIds } =
      partitionAnswersForModel(input.answers);

    const generated = await generateOverviewAi(
      {
        companyName: input.companyName,
        company: input.company,
        founderNarrative: input.founderNarrative,
        cohortKey: input.cohortKey,
        answers: modelAnswers,
        unknown_question_ids: unknownQuestionIds,
        benchmark: input.benchmarkValues,
        profileCompletionPct: input.profileCompletionPct,
        active_intelligence: input.activeIntelligence,
        active_documents: input.activeDocuments,
        playbook_catalog: playbookCatalog.map((p) => ({
          slug: p.slug,
          title: p.title,
          description: p.description,
          category: p.category,
          category_id: p.category_id,
        })),
        signal_catalog: signalCatalog.map((s) => ({
          id: s.id,
          label: s.label,
          category: s.category,
          kind: s.kind,
          unit: s.unit,
          value_field: valueFieldForKind(s.kind),
          description: s.description,
        })),
        detail_question_catalog: buildDetailQuestionCatalogForModel(),
      },
      {
        requestId: runId,
        companyUuid: opts.companyUuid,
        accountId: opts.accountId,
        userEmail: opts.userEmail,
      },
    );
    const { result, playbookId, model, error, timings } = generated;
    llmFields = {
      model,
      prompt: generated.prompt,
      output: generated.output,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
    };

    // Prompt template load is a DB read — roll into Database Fetch for the summary.
    perf.add("Database Fetch", timings.promptLoadMs);
    perf.add("Bedrock Request", timings.bedrockMs);
    perf.add("Bedrock Response Processing", timings.processMs);

    if (!result) {
      await markRunFailed(runId, error ?? "generation_failed", {
        ...llmFields,
        latencyMs: Date.now() - startedAt,
      });
      if (ownsPerf) {
        perf.finish({ status: "error", error: error ?? "generation_failed" });
      }
      return { snapshotId: null, error: error ?? "generation_failed", runId };
    }

    const { snapshotId } = await perf.time("Database Save", () =>
      persistOverviewGeneration({
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
        userEmail: opts.userEmail,
        agentRunId: runId,
        playbookId,
        aiModel: model,
        ai: result,
        answers: input.answers,
        benchmarkRows,
        benchmarkValues: input.benchmarkValues,
        profileCompletionPct: input.profileCompletionPct,
        playbookCatalog,
        signalCatalog,
        activeIntelligence: input.activeIntelligence,
        activeDocuments: input.activeDocuments,
      }),
    );

    await db
      .update(agentRuns)
      .set({
        status: "complete",
        ...toAgentRunLlmColumns(llmFields),
        latencyMs: Date.now() - startedAt,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, runId));

    if (ownsPerf) {
      perf.finish({ status: "ok" });
    }
    return { snapshotId, runId };
  } catch (e) {
    captureIntegrationException(e, {
      integration: "overview",
      operation: "run_overview_generation",
    });
    await markRunFailed(runId, (e as Error).message?.slice(0, 500) ?? "error", {
      ...llmFields,
      latencyMs: Date.now() - startedAt,
    });
    if (ownsPerf) {
      perf.finish({
        status: "error",
        error: (e as Error).message?.slice(0, 200) ?? "error",
      });
    }
    throw e;
  }
}

type OverviewAgentRunLlmFields = {
  model?: string;
  prompt?: string | null;
  output?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
};

function toAgentRunLlmColumns(fields: OverviewAgentRunLlmFields): {
  model?: string;
  prompt?: string | null;
  output?: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costTokens: number;
} {
  const inputTokens = fields.inputTokens ?? null;
  const outputTokens = fields.outputTokens ?? null;
  return {
    ...(fields.model ? { model: fields.model } : {}),
    ...(fields.prompt != null ? { prompt: fields.prompt } : {}),
    ...(fields.output !== undefined ? { output: fields.output } : {}),
    inputTokens,
    outputTokens,
    costTokens: (inputTokens ?? 0) + (outputTokens ?? 0),
  };
}

async function markRunFailed(
  runId: string,
  message: string,
  fields: OverviewAgentRunLlmFields & { latencyMs?: number } = {},
): Promise<void> {
  const db = await getDb();
  await db
    .update(agentRuns)
    .set({
      status: "failed",
      errorMessage: message,
      completedAt: new Date(),
      ...toAgentRunLlmColumns(fields),
      ...(fields.latencyMs != null ? { latencyMs: fields.latencyMs } : {}),
    })
    .where(eq(agentRuns.id, runId));
}

export async function runOverviewJob(runId: string): Promise<void> {
  const db = await getDb();
  const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, runId)).limit(1);
  if (!run || run.kind !== OVERVIEW_GENERATION_KIND) return;
  if (run.status === "complete") return;
  const companyUuid = run.subjectCompanyUuid;
  if (!companyUuid) {
    await markRunFailed(runId, "missing_company_uuid");
    return;
  }

  await runOverviewGeneration({
    accountId: run.accountId,
    companyUuid,
    userEmail: run.userEmail,
    runId,
    source: "internal_worker",
  });
}

export async function dispatchOverviewJob(runId: string): Promise<void> {
  const token = process.env.INTERNAL_CRON_TOKEN;
  const base = process.env.APP_URL ?? "http://localhost:3000";

  if (!token) {
    void runOverviewJob(runId).catch((e) => {
      captureIntegrationException(e, {
        integration: "overview",
        operation: "dispatch_inline",
      });
    });
    return;
  }

  void fetch(`${base}/api/internal/overview/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ runId }),
  }).catch((e) => {
    captureIntegrationException(e, {
      integration: "overview",
      operation: "dispatch_http",
    });
  });
}
