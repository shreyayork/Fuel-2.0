import "server-only";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  agentRuns,
  companyIntelligence,
  companyInitiatives,
  contextItems,
  dataRoomDocumentVersions,
} from "@/db/schema";
import { captureIntegrationException } from "@/lib/sentry/capture";
import {
  DEFAULT_DOCUMENT_INITIATIVE_GENERATION_RULES,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { DOCUMENT_INITIATIVE_GENERATION_SLUG } from "@/lib/system-playbooks/slugs";
import {
  createCompanyInitiative,
  type InitiativeArea,
  type InitiativeSourceDocument,
} from "@/lib/company-initiatives";
import {
  CATEGORY_META,
  type OverviewCategoryId,
} from "@/lib/overview/constants";
import { normalizeInitiatives } from "@/lib/overview/normalize-ai-response";
import { InitiativeAiSchema } from "@/lib/overview/types";
import { resolveCompanyName } from "@/lib/intelligence/resolve-company";
import {
  YORK_HELP_BULLET_TOOL_PROPERTIES,
  stripYorkHelpPromptAppendix,
  yorkHelpPromptAppendix,
  type YorkHelpServiceCatalog,
} from "@/lib/york-help/catalog-data";
import { loadYorkHelpServiceCatalog } from "@/lib/york-help/load-catalog";
import {
  contextItemAlreadyProcessed,
  documentVersionAlreadyProcessed,
  matchIntelligenceLinks,
  taggedTypesFromInitiative,
  MAX_DOCUMENT_INITIATIVES,
  type DocIntel,
} from "./from-document-helpers";
import { z } from "zod";

/** agent_runs.kind for the decoupled document → initiative job (F20A-200). */
export const DOCUMENT_INITIATIVE_GENERATION_KIND =
  "document_initiative_generation" as const;

/** agent_runs.kind for HubSpot activity → initiative job (F20A-190). */
export const HUBSPOT_INITIATIVE_GENERATION_KIND =
  "hubspot_initiative_generation" as const;

/** agent_runs.kind for Granola meeting → initiative job. */
export const GRANOLA_INITIATIVE_GENERATION_KIND =
  "granola_initiative_generation" as const;

export type ContextInitiativeSource = "hubspot" | "granola";

function contextInitiativeKind(
  source: ContextInitiativeSource,
):
  | typeof HUBSPOT_INITIATIVE_GENERATION_KIND
  | typeof GRANOLA_INITIATIVE_GENERATION_KIND {
  return source === "granola"
    ? GRANOLA_INITIATIVE_GENERATION_KIND
    : HUBSPOT_INITIATIVE_GENERATION_KIND;
}

function contextInitiativeSourceFromKind(
  kind: string,
): ContextInitiativeSource | null {
  if (kind === HUBSPOT_INITIATIVE_GENERATION_KIND) return "hubspot";
  if (kind === GRANOLA_INITIATIVE_GENERATION_KIND) return "granola";
  return null;
}

function contextSourceDisplayName(source: ContextInitiativeSource): string {
  return source === "granola" ? "Granola" : "HubSpot";
}

const MODEL_ID =
  process.env.BEDROCK_EXTRACTOR_MODEL_ID ??
  "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const bedrock = new BedrockRuntimeClient({});

const InitiativeListSchema = z.array(InitiativeAiSchema);

function initiativesTool(): Tool {
  return {
    toolSpec: {
      name: "record_document_initiatives",
      description:
        "Record 1-3 actionable initiatives grounded strictly in the uploaded document and its extracted intelligence.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            suggested_initiatives: {
              type: "array",
              minItems: 0,
              maxItems: MAX_DOCUMENT_INITIATIVES,
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  benefit: {
                    type: "string",
                    description:
                      "2-4 short bullets, one per line, on the value of completing this initiative.",
                  },
                  category_id: { type: "string", enum: ["dev", "mkt", "rev"] },
                  cadence: { type: "string", enum: ["one-time", "recurring"] },
                  tagged_intelligence_types: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "All related intelligence types or signal ids. Empty array if none are related.",
                  },
                  source_rationale: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  milestones: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        due_date: { type: "string" },
                        checked: { type: "boolean" },
                      },
                      required: ["title"],
                    },
                  },
                  york_help: {
                    type: "object",
                    description:
                      "1–2 York IE services. Each bullet has a personalized title and an approved outcome refined to this initiative — not one bullet per milestone.",
                    properties: {
                      section_title: { type: "string" },
                      bullets: {
                        type: "array",
                        minItems: 1,
                        maxItems: 2,
                        items: {
                          type: "object",
                          properties: YORK_HELP_BULLET_TOOL_PROPERTIES,
                          required: ["title", "primary_service", "help", "track"],
                        },
                      },
                      cta_label: { type: "string" },
                    },
                  },
                },
                required: ["title", "description", "benefit", "category_id", "milestones"],
              },
            },
          },
          required: ["suggested_initiatives"],
        },
      },
    },
  };
}

function buildSystemPrompt(opts: {
  companyName: string;
  documentLabel: string;
  intel: DocIntel[];
  sourceKind?: "document" | "hubspot" | "granola";
  rulesTemplate: string;
  yorkHelpCatalog?: YorkHelpServiceCatalog;
}): string {
  const asOf = new Date();
  const asOfIso = asOf.toISOString().slice(0, 10);
  const isContextSource =
    opts.sourceKind === "hubspot" || opts.sourceKind === "granola";
  const sourceName =
    opts.sourceKind === "granola"
      ? "Granola"
      : opts.sourceKind === "hubspot"
        ? "HubSpot"
        : "Document";
  const rules = stripYorkHelpPromptAppendix(
    opts.rulesTemplate
      .replace("{{MAX_INITIATIVES}}", String(MAX_DOCUMENT_INITIATIVES))
      .replace("{{AS_OF_ISO}}", asOfIso),
  );

  return [
    isContextSource
      ? `You turn ${sourceName} source content (and its extracted intelligence) into a small set of actionable operating initiatives for a portfolio company.`
      : "You turn a single uploaded document (and its extracted intelligence) into a small set of actionable operating initiatives for a portfolio company.",
    `Company: ${opts.companyName}`,
    `${isContextSource ? `${sourceName} source` : "Document"}: ${opts.documentLabel}`,
    "",
    rules,
    "",
    yorkHelpPromptAppendix(undefined, opts.yorkHelpCatalog),
    "",
    isContextSource
      ? `${sourceName.toUpperCase()} INTELLIGENCE:`
      : "DOCUMENT INTELLIGENCE:",
    opts.intel.length > 0
      ? opts.intel
          .map(
            (i) =>
              `- [${i.type}] ${i.headline}${i.highlight ? ` — ${i.highlight}` : ""}`,
          )
          .join("\n")
      : "- (no extracted intelligence)",
  ].join("\n");
}

async function loadInitiativeRulesTemplate(): Promise<string> {
  const { template } = await loadSystemPlaybookTemplate(
    DOCUMENT_INITIATIVE_GENERATION_SLUG,
    DEFAULT_DOCUMENT_INITIATIVE_GENERATION_RULES,
  );
  return template;
}

async function loadDocumentIntelligence(opts: {
  accountId: string;
  companyUuid: string;
  documentVersionId: string;
}): Promise<DocIntel[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: companyIntelligence.id,
      headline: companyIntelligence.headline,
      keyDetail: companyIntelligence.keyDetail,
      category: companyIntelligence.category,
      metadata: companyIntelligence.metadata,
    })
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.companyUuid, opts.companyUuid),
        eq(companyIntelligence.documentVersionId, opts.documentVersionId),
      ),
    );
  return rows.map((r) => {
    const meta = (r.metadata ?? {}) as { intelligenceType?: string };
    return {
      id: r.id,
      type: meta.intelligenceType ?? r.category,
      headline: r.headline,
      category: r.category,
      highlight: r.keyDetail,
    };
  });
}

/** True when this document version already produced initiatives (idempotency). */
async function documentAlreadyProcessed(opts: {
  accountId: string;
  companyUuid: string;
  documentVersionId: string;
}): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ sourceDocuments: companyInitiatives.sourceDocuments })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
        eq(companyInitiatives.source, "document"),
      ),
    );
  return documentVersionAlreadyProcessed(
    rows.map((r) => r.sourceDocuments),
    opts.documentVersionId,
  );
}

/**
 * Generate + persist document-grounded initiatives without touching the
 * Overview pipeline. Idempotent by documentVersionId. Returns created count.
 */
export async function generateDocumentInitiatives(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  documentVersionId: string;
  runId?: string | null;
}): Promise<{ created: number; skipped: boolean }> {
  const db = await getDb();

  if (
    await documentAlreadyProcessed({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      documentVersionId: opts.documentVersionId,
    })
  ) {
    return { created: 0, skipped: true };
  }

  const [version] = await db
    .select()
    .from(dataRoomDocumentVersions)
    .where(
      and(
        eq(dataRoomDocumentVersions.id, opts.documentVersionId),
        eq(dataRoomDocumentVersions.accountId, opts.accountId),
        eq(dataRoomDocumentVersions.companyUuid, opts.companyUuid),
      ),
    )
    .limit(1);
  if (!version) return { created: 0, skipped: true };

  const intel = await loadDocumentIntelligence({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    documentVersionId: opts.documentVersionId,
  });

  const documentLabel = version.typeLabel || version.filename;
  const companyName = await resolveCompanyName(opts.companyUuid);
  const [rulesTemplate, yorkHelpCatalog] = await Promise.all([
    loadInitiativeRulesTemplate(),
    loadYorkHelpServiceCatalog(),
  ]);
  const messages: Message[] = [
    {
      role: "user",
      content: [
        {
          text: `Generate document-grounded initiatives for "${documentLabel}". Use the record_document_initiatives tool.`,
        },
      ],
    },
  ];

  const res = await bedrock.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [
        {
          text: buildSystemPrompt({
            companyName,
            documentLabel,
            intel,
            rulesTemplate,
            yorkHelpCatalog,
          }),
        },
      ],
      messages,
      toolConfig: {
        tools: [initiativesTool()],
        toolChoice: { tool: { name: "record_document_initiatives" } },
      },
      inferenceConfig: { maxTokens: 4096, temperature: 0.2 },
    }),
  );

  let rawInitiatives: unknown = [];
  for (const block of res.output?.message?.content ?? []) {
    const tu = (block as { toolUse?: ToolUseBlock }).toolUse;
    if (tu?.name === "record_document_initiatives") {
      const input =
        typeof tu.input === "string"
          ? (JSON.parse(tu.input) as Record<string, unknown>)
          : (tu.input as Record<string, unknown> | undefined);
      rawInitiatives =
        input?.suggested_initiatives ?? input?.suggestedInitiatives ?? [];
      break;
    }
  }

  const normalized = normalizeInitiatives(rawInitiatives, yorkHelpCatalog);
  const parsed = InitiativeListSchema.safeParse(normalized);
  const initiatives = (parsed.success ? parsed.data : []).slice(
    0,
    MAX_DOCUMENT_INITIATIVES,
  );

  const sourceDocument: InitiativeSourceDocument = {
    id: version.id,
    documentVersionId: version.id,
    title: documentLabel,
    typeLabel: version.typeLabel,
  };

  let created = 0;
  for (const init of initiatives) {
    const categoryId = init.category_id as OverviewCategoryId;
    const area = (CATEGORY_META[categoryId]?.initiativeArea ??
      "other") as InitiativeArea;
    const rawName = init.title.trim();
    const name =
      rawName && rawName.toLowerCase() !== "initiative"
        ? rawName
        : `${CATEGORY_META[categoryId].label} operating initiative`;

    await createCompanyInitiative({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      kind: init.cadence === "one-time" ? "onetime" : "continuous",
      name,
      area,
      description: init.description,
      status: "draft",
      ownerEmail: opts.userEmail,
      due: init.due_date ?? null,
      createdByEmail: opts.userEmail,
      source: "document",
      overviewCategoryId: init.category_id,
      intelligenceLinks: matchIntelligenceLinks(
        taggedTypesFromInitiative(init),
        intel,
      ),
      sourceDocuments: [sourceDocument],
      sourceRationale: init.source_rationale ?? null,
      benefit: init.benefit ?? null,
      priority: init.priority ?? null,
      baselineMetric: init.baseline_metric ?? null,
      targetMetric: init.target_metric ?? null,
      benchmarkCohort: init.benchmark_cohort ?? null,
      milestones: (init.milestones ?? []).map((m) => ({
        title: m.title,
        dueDate: m.due_date ?? null,
        checked: m.checked === true,
      })),
      yorkHelp: init.york_help
        ? {
            section_title: init.york_help.section_title,
            bullets: init.york_help.bullets.map((b) => ({
              title: b.title || b.milestone || b.primary_service,
              milestone: b.milestone || b.title || b.primary_service,
              help: b.help,
              primary_service: b.primary_service,
              track: b.track,
            })),
            cta_label: init.york_help.cta_label,
          }
        : null,
    });
    created += 1;
  }

  if (opts.runId) {
    const usage = res.usage;
    await db
      .update(agentRuns)
      .set({
        status: "complete",
        model: MODEL_ID,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        costTokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
        output: JSON.stringify({ created }),
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, opts.runId));
  }

  return { created, skipped: false };
}

async function markRunFailed(runId: string, message: string): Promise<void> {
  const db = await getDb();
  await db
    .update(agentRuns)
    .set({
      status: "failed",
      errorMessage: message.slice(0, 500),
      completedAt: new Date(),
    })
    .where(eq(agentRuns.id, runId));
}

/** Insert a pending job row keyed to a document version. */
export async function enqueueDocumentInitiativeJob(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  documentVersionId: string;
}): Promise<string> {
  const db = await getDb();
  const runId = randomUUID();
  await db.insert(agentRuns).values({
    id: runId,
    accountId: opts.accountId,
    userEmail: opts.userEmail,
    kind: DOCUMENT_INITIATIVE_GENERATION_KIND,
    subjectCompanyUuid: opts.companyUuid,
    // documentVersionId travels in prompt — no dedicated column needed.
    prompt: opts.documentVersionId,
    status: "pending",
  });
  return runId;
}

/** Run a queued job by id (called inline or from the internal route). */
export async function runDocumentInitiativeJob(runId: string): Promise<void> {
  const db = await getDb();
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.id, runId))
    .limit(1);
  if (!run || run.kind !== DOCUMENT_INITIATIVE_GENERATION_KIND) return;
  if (run.status === "complete") return;
  const documentVersionId = run.prompt;
  const companyUuid = run.subjectCompanyUuid;
  if (!documentVersionId || !companyUuid) {
    await markRunFailed(runId, "missing_document_version");
    return;
  }

  await db
    .update(agentRuns)
    .set({ status: "running" })
    .where(eq(agentRuns.id, runId));

  try {
    await generateDocumentInitiatives({
      accountId: run.accountId,
      companyUuid,
      userEmail: run.userEmail,
      documentVersionId,
      runId,
    });
  } catch (e) {
    captureIntegrationException(e, {
      integration: "bedrock",
      operation: "document_initiative_generation",
      context: { companyUuid, documentVersionId },
    });
    await markRunFailed(runId, (e as Error).message ?? "error");
  }
}

/**
 * Enqueue + dispatch document-driven initiative generation after document
 * intelligence is persisted. Fire-and-forget; never touches the Overview
 * pipeline. Returns whether a job was started.
 */
export async function enqueueDocumentInitiativeGeneration(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  documentVersionId: string;
}): Promise<{ generating: boolean }> {
  const runId = await enqueueDocumentInitiativeJob(opts);
  void dispatchInitiativeGenerationJob(runId);
  return { generating: true };
}

export type DocumentInitiativeGenerationStatus =
  | "none"
  | "pending"
  | "running"
  | "complete"
  | "failed";

/** Latest document-initiative job status for a company (UI polling). */
export async function getDocumentInitiativeGenerationStatus(
  accountId: string,
  companyUuid: string,
): Promise<{ status: DocumentInitiativeGenerationStatus; runId: string | null }> {
  const db = await getDb();
  const [run] = await db
    .select({ id: agentRuns.id, status: agentRuns.status })
    .from(agentRuns)
    .where(
      and(
        eq(agentRuns.accountId, accountId),
        eq(agentRuns.subjectCompanyUuid, companyUuid),
        eq(agentRuns.kind, DOCUMENT_INITIATIVE_GENERATION_KIND),
      ),
    )
    .orderBy(desc(agentRuns.startedAt))
    .limit(1);
  if (!run) return { status: "none", runId: null };
  const status =
    run.status === "pending" ||
    run.status === "running" ||
    run.status === "complete" ||
    run.status === "failed"
      ? (run.status as DocumentInitiativeGenerationStatus)
      : "none";
  return { status, runId: run.id };
}

async function loadContextIntelligence(opts: {
  accountId: string;
  companyUuid: string;
  contextItemId: string;
}): Promise<DocIntel[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: companyIntelligence.id,
      headline: companyIntelligence.headline,
      keyDetail: companyIntelligence.keyDetail,
      category: companyIntelligence.category,
      metadata: companyIntelligence.metadata,
    })
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.companyUuid, opts.companyUuid),
        eq(companyIntelligence.contextItemId, opts.contextItemId),
      ),
    );
  return rows.map((r) => {
    const meta = (r.metadata ?? {}) as { intelligenceType?: string };
    return {
      id: r.id,
      type: meta.intelligenceType ?? r.category,
      headline: r.headline,
      category: r.category,
      highlight: r.keyDetail,
    };
  });
}

async function contextInitiativeAlreadyProcessed(opts: {
  accountId: string;
  companyUuid: string;
  contextItemId: string;
  source: ContextInitiativeSource;
}): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ sourceDocuments: companyInitiatives.sourceDocuments })
    .from(companyInitiatives)
    .where(
      and(
        eq(companyInitiatives.accountId, opts.accountId),
        eq(companyInitiatives.companyUuid, opts.companyUuid),
        eq(companyInitiatives.source, opts.source),
      ),
    );
  return contextItemAlreadyProcessed(
    rows.map((r) => r.sourceDocuments),
    opts.contextItemId,
  );
}

function contextTypeLabel(
  source: ContextInitiativeSource,
  itemSource: string,
): string {
  if (source === "granola") return "Granola meeting";
  return itemSource.includes(":email:") ? "HubSpot email" : "HubSpot note";
}

/**
 * Generate draft initiatives from context-item intelligence (HubSpot / Granola).
 * Idempotent by contextItemId. Never touches Overview.
 */
export async function generateContextInitiatives(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  contextItemId: string;
  source: ContextInitiativeSource;
  runId?: string | null;
}): Promise<{ created: number; skipped: boolean }> {
  const db = await getDb();
  const sourceName = contextSourceDisplayName(opts.source);

  if (
    await contextInitiativeAlreadyProcessed({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      contextItemId: opts.contextItemId,
      source: opts.source,
    })
  ) {
    return { created: 0, skipped: true };
  }

  const [item] = await db
    .select()
    .from(contextItems)
    .where(
      and(
        eq(contextItems.id, opts.contextItemId),
        eq(contextItems.accountId, opts.accountId),
        eq(contextItems.companyUuid, opts.companyUuid),
      ),
    )
    .limit(1);
  if (!item) return { created: 0, skipped: true };

  const intel = await loadContextIntelligence({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    contextItemId: opts.contextItemId,
  });
  if (intel.length === 0) return { created: 0, skipped: true };

  const typeLabel = contextTypeLabel(opts.source, item.source);
  const documentLabel = item.title?.trim() || typeLabel;
  const companyName = await resolveCompanyName(opts.companyUuid);
  const [rulesTemplate, yorkHelpCatalog] = await Promise.all([
    loadInitiativeRulesTemplate(),
    loadYorkHelpServiceCatalog(),
  ]);
  const messages: Message[] = [
    {
      role: "user",
      content: [
        {
          text: `Generate ${sourceName}-grounded initiatives for "${documentLabel}". Use the record_document_initiatives tool.`,
        },
      ],
    },
  ];

  const res = await bedrock.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [
        {
          text: buildSystemPrompt({
            companyName,
            documentLabel,
            intel,
            sourceKind: opts.source,
            rulesTemplate,
            yorkHelpCatalog,
          }),
        },
      ],
      messages,
      toolConfig: {
        tools: [initiativesTool()],
        toolChoice: { tool: { name: "record_document_initiatives" } },
      },
      inferenceConfig: { maxTokens: 4096, temperature: 0.2 },
    }),
  );

  let rawInitiatives: unknown = [];
  for (const block of res.output?.message?.content ?? []) {
    const tu = (block as { toolUse?: ToolUseBlock }).toolUse;
    if (tu?.name === "record_document_initiatives") {
      const input =
        typeof tu.input === "string"
          ? (JSON.parse(tu.input) as Record<string, unknown>)
          : (tu.input as Record<string, unknown> | undefined);
      rawInitiatives =
        input?.suggested_initiatives ?? input?.suggestedInitiatives ?? [];
      break;
    }
  }

  const normalized = normalizeInitiatives(rawInitiatives, yorkHelpCatalog);
  const parsed = InitiativeListSchema.safeParse(normalized);
  const initiatives = (parsed.success ? parsed.data : []).slice(
    0,
    MAX_DOCUMENT_INITIATIVES,
  );

  const sourceDocument: InitiativeSourceDocument = {
    id: item.id,
    documentVersionId: null,
    title: documentLabel,
    typeLabel,
  };

  let created = 0;
  for (const init of initiatives) {
    const categoryId = init.category_id as OverviewCategoryId;
    const area = (CATEGORY_META[categoryId]?.initiativeArea ??
      "other") as InitiativeArea;
    const rawName = init.title.trim();
    const name =
      rawName && rawName.toLowerCase() !== "initiative"
        ? rawName
        : `${CATEGORY_META[categoryId].label} operating initiative`;

    await createCompanyInitiative({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      kind: init.cadence === "one-time" ? "onetime" : "continuous",
      name,
      area,
      description: init.description,
      status: "draft",
      ownerEmail: opts.userEmail,
      due: init.due_date ?? null,
      createdByEmail: opts.userEmail,
      source: opts.source,
      overviewCategoryId: init.category_id,
      intelligenceLinks: matchIntelligenceLinks(
        taggedTypesFromInitiative(init),
        intel,
      ),
      sourceDocuments: [sourceDocument],
      sourceRationale: init.source_rationale ?? null,
      benefit: init.benefit ?? null,
      priority: init.priority ?? null,
      baselineMetric: init.baseline_metric ?? null,
      targetMetric: init.target_metric ?? null,
      benchmarkCohort: init.benchmark_cohort ?? null,
      milestones: (init.milestones ?? []).map((m) => ({
        title: m.title,
        dueDate: m.due_date ?? null,
        checked: m.checked === true,
      })),
      yorkHelp: init.york_help
        ? {
            section_title: init.york_help.section_title,
            bullets: init.york_help.bullets.map((b) => ({
              title: b.title || b.milestone || b.primary_service,
              milestone: b.milestone || b.title || b.primary_service,
              help: b.help,
              primary_service: b.primary_service,
              track: b.track,
            })),
            cta_label: init.york_help.cta_label,
          }
        : null,
    });
    created += 1;
  }

  if (opts.runId) {
    const usage = res.usage;
    await db
      .update(agentRuns)
      .set({
        status: "complete",
        model: MODEL_ID,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        costTokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
        output: JSON.stringify({ created }),
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, opts.runId));
  }

  return { created, skipped: false };
}

/** @deprecated Prefer generateContextInitiatives({ source: "hubspot" }) */
export async function generateHubspotInitiatives(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  contextItemId: string;
  runId?: string | null;
}): Promise<{ created: number; skipped: boolean }> {
  return generateContextInitiatives({ ...opts, source: "hubspot" });
}

export async function enqueueContextInitiativeJob(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  contextItemId: string;
  source: ContextInitiativeSource;
}): Promise<string> {
  const db = await getDb();
  const runId = randomUUID();
  await db.insert(agentRuns).values({
    id: runId,
    accountId: opts.accountId,
    userEmail: opts.userEmail,
    kind: contextInitiativeKind(opts.source),
    subjectCompanyUuid: opts.companyUuid,
    prompt: opts.contextItemId,
    status: "pending",
  });
  return runId;
}

/** @deprecated Prefer enqueueContextInitiativeJob({ source: "hubspot" }) */
export async function enqueueHubspotInitiativeJob(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  contextItemId: string;
}): Promise<string> {
  return enqueueContextInitiativeJob({ ...opts, source: "hubspot" });
}

export async function runContextInitiativeJob(runId: string): Promise<void> {
  const db = await getDb();
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.id, runId))
    .limit(1);
  if (!run) return;
  const source = contextInitiativeSourceFromKind(run.kind);
  if (!source) return;
  if (run.status === "complete") return;
  const contextItemId = run.prompt;
  const companyUuid = run.subjectCompanyUuid;
  if (!contextItemId || !companyUuid) {
    await markRunFailed(runId, "missing_context_item");
    return;
  }

  await db
    .update(agentRuns)
    .set({ status: "running" })
    .where(eq(agentRuns.id, runId));

  try {
    await generateContextInitiatives({
      accountId: run.accountId,
      companyUuid,
      userEmail: run.userEmail,
      contextItemId,
      source,
      runId,
    });
  } catch (e) {
    captureIntegrationException(e, {
      integration: "bedrock",
      operation: `${source}_initiative_generation`,
      context: { companyUuid, contextItemId },
    });
    await markRunFailed(runId, (e as Error).message ?? "error");
  }
}

/** @deprecated Prefer runContextInitiativeJob */
export async function runHubspotInitiativeJob(runId: string): Promise<void> {
  await runContextInitiativeJob(runId);
}

/** Dispatch document or context (HubSpot/Granola) initiative jobs by kind. */
export async function runInitiativeGenerationJob(runId: string): Promise<void> {
  const db = await getDb();
  const [run] = await db
    .select({ kind: agentRuns.kind })
    .from(agentRuns)
    .where(eq(agentRuns.id, runId))
    .limit(1);
  if (!run) return;
  if (contextInitiativeSourceFromKind(run.kind)) {
    await runContextInitiativeJob(runId);
    return;
  }
  await runDocumentInitiativeJob(runId);
}

export async function dispatchInitiativeGenerationJob(
  runId: string,
): Promise<void> {
  const token = process.env.INTERNAL_CRON_TOKEN;
  const base = process.env.APP_URL ?? "http://localhost:3000";

  if (!token) {
    void runInitiativeGenerationJob(runId).catch((e) => {
      captureIntegrationException(e, {
        integration: "bedrock",
        operation: "dispatch_initiative_inline",
      });
    });
    return;
  }

  void fetch(`${base}/api/internal/initiatives/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ runId }),
  }).catch((e) => {
    captureIntegrationException(e, {
      integration: "bedrock",
      operation: "dispatch_initiative_http",
    });
  });
}

/**
 * Enqueue + dispatch context-driven initiative generation after intelligence
 * is persisted. Fire-and-forget; failures do not roll back intelligence.
 */
export async function enqueueContextInitiativeGeneration(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  contextItemId: string;
  source: ContextInitiativeSource;
}): Promise<{ generating: boolean }> {
  const runId = await enqueueContextInitiativeJob(opts);
  void dispatchInitiativeGenerationJob(runId);
  return { generating: true };
}

/**
 * Enqueue + dispatch HubSpot-driven initiative generation after intelligence
 * is persisted. Fire-and-forget; failures do not roll back intelligence.
 */
export async function enqueueHubspotInitiativeGeneration(opts: {
  accountId: string;
  companyUuid: string;
  userEmail: string;
  contextItemId: string;
}): Promise<{ generating: boolean }> {
  return enqueueContextInitiativeGeneration({ ...opts, source: "hubspot" });
}
