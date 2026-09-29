import "server-only";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  agentRuns,
  companyIntelligence,
  contextItems,
} from "@/db/schema";
import { contextIntelligenceGenerationAction } from "@/lib/integrations/context-intelligence-gate";
import { currentPeriod } from "@/lib/portfolio-updates";
import { getPitchDeckBytes } from "@/lib/storage/s3";
import {
  categoryHintsForDocumentType,
  DATA_ROOM_INTELLIGENCE_CREDITS,
  SOURCE_INTELLIGENCE_CREDITS,
} from "./constants";
import { chargeCreditsInTx, InsufficientCreditsError } from "./credits";
import { DocumentParseError, parseDocumentBuffer } from "./parse-document";
import {
  formatSignalCatalogForPrompt,
  loadSignalCatalog,
  type SignalCatalogDef,
} from "./signal-catalog";
import { coerceInsights } from "./insight-value";
import {
  DEFAULT_INTELLIGENCE_GENERATION_RULES,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { INTELLIGENCE_GENERATION_SLUG } from "@/lib/system-playbooks/slugs";
import type {
  ExtractedIntelligenceItem,
  IntelligenceGenerationResult,
} from "./types";

const GENERATOR_MODEL_ID =
  process.env.BEDROCK_EXTRACTOR_MODEL_ID ??
  "us.anthropic.claude-haiku-4-5-20251001-v1:0";

/**
 * Backend-only safety ceiling against runaway model output.
 * Not a product / business rule — selectivity lives in the prompt.
 */
const SAFETY_MAX_INTELLIGENCE_ITEMS = 20;

/** DB column is still required; we no longer ask the model for a score. */
const DEFAULT_INTELLIGENCE_CONFIDENCE = 1;

const bedrock = new BedrockRuntimeClient({});

type SignalDef = SignalCatalogDef;

function buildRecordIntelligenceTool(): Tool {
  // Permissive JSON Schema (one tool for all kinds); kind-specific value
  // validation runs in coerceInsights before persistence.
  return {
    toolSpec: {
      name: "record_intelligence",
      description:
        "Record only high-value, actionable, evidence-backed intelligence. Each insight maps to exactly one catalog signal_id. Fill the typed value field that matches that signal's kind (value_numeric | value_text | value_bool). Quality over quantity — natural count based on document richness.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              minItems: 1,
              maxItems: SAFETY_MAX_INTELLIGENCE_ITEMS,
              items: {
                type: "object",
                properties: {
                  signal_id: {
                    type: "string",
                    description:
                      "Exact id from the provided signal catalog (e.g. arr_usd, fte_count).",
                  },
                  value_numeric: {
                    type: "number",
                    description:
                      "Required for quantitative signals. Actual JSON number in the signal unit (not a string).",
                  },
                  value_text: {
                    type: "string",
                    description:
                      "Required for qualitative signals. Short paraphrase ≤ 140 chars.",
                  },
                  value_bool: {
                    type: "boolean",
                    description:
                      "Required for boolean signals. Actual JSON boolean true/false — never a string.",
                  },
                  summary: {
                    type: "string",
                    description:
                      "One sentence on why this matters operationally or strategically",
                  },
                  raw_snippet: {
                    type: "string",
                    description: "Supporting quote copied from the document",
                  },
                },
                required: ["signal_id", "summary", "raw_snippet"],
              },
            },
          },
          required: ["insights"],
        },
      },
    },
  };
}

function parseInsightsFromToolInput(input: unknown): unknown[] {
  let payload: unknown = input;
  if (typeof input === "string") {
    try {
      payload = JSON.parse(input) as unknown;
    } catch {
      return [];
    }
  }
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.insights)) return record.insights;
  if (record.signal_id || record.signalId) return [record];
  return [];
}

function buildSystemPrompt(opts: {
  companyName: string;
  documentType: string;
  categoryHints: string[];
  catalog: SignalDef[];
  rulesTemplate: string;
}): string {
  const isHubspot = opts.documentType.startsWith("hubspot");
  const isGranola = opts.documentType.startsWith("granola");
  const intro = isHubspot
    ? [
        "You are an expert startup advisor. Analyze HubSpot source content (meeting notes, activity logs, and customer notes) for a portfolio company and extract a small set of actionable intelligence insights.",
        `Company: ${opts.companyName}`,
        `Source type: ${opts.documentType}`,
        `Prioritize decision areas: ${opts.categoryHints.join(", ")}`,
        "",
        "HUBSPOT SOURCE SUBJECT:",
        "- The HubSpot note or email body is the source of truth.",
        "- Extract insights about the company this activity is attached to.",
        "- Prefer Fundraising, GTM, Product, Finance, or Operations signals when present.",
      ]
    : isGranola
      ? [
          "You are an expert startup advisor. Analyze Granola meeting notes for a portfolio company and extract a small set of actionable intelligence insights.",
          `Company: ${opts.companyName}`,
          `Source type: ${opts.documentType}`,
          `Prioritize decision areas: ${opts.categoryHints.join(", ")}`,
          "",
          "GRANOLA SOURCE SUBJECT:",
          "- The Granola meeting summary / notes are the source of truth.",
          "- Extract insights about the company this meeting is attached to.",
          "- Prefer Fundraising, GTM, Product, Finance, or Operations signals when present.",
        ]
      : [
          `You read uploaded documents for portfolio companies and extract a small set of actionable intelligence insights for founders and operators.`,
          `Data Room / upload target company: ${opts.companyName}`,
          `Document type: ${opts.documentType}`,
          `Prioritize decision areas: ${opts.categoryHints.join(", ")}`,
          "",
          "DOCUMENT SUBJECT:",
          "- The uploaded file is the source of truth.",
          "- If the document explicitly names a company, extract insights about that company profile.",
          "- Do not refuse extraction solely because the named company differs from the Data Room upload-target label.",
          "- Skip the document only when it cannot be associated with a single primary company (e.g. a multi-company market report with no clear subject).",
        ];

  const rules = opts.rulesTemplate.replace(
    "{{SAFETY_MAX_ITEMS}}",
    String(SAFETY_MAX_INTELLIGENCE_ITEMS),
  );

  return [
    ...intro,
    "",
    rules,
    "",
    "Signal catalog:",
    formatSignalCatalogForPrompt(opts.catalog),
  ].join("\n");
}

async function callIntelligenceExtractor(opts: {
  accountId: string;
  companyName: string;
  documentType: string;
  documentLabel: string;
  content: string;
  notes?: string;
  categoryHints: string[];
}): Promise<{
  insights: ExtractedIntelligenceItem[];
  rawInsightCount: number;
  inputTokens?: number;
  outputTokens?: number;
}> {
  const catalog = await loadSignalCatalog(opts.accountId);
  if (catalog.length === 0) {
    return { insights: [], rawInsightCount: 0 };
  }
  const catalogById = new Map(catalog.map((d) => [d.id, d]));

  const userText = [
    `Document: ${opts.documentLabel} (${opts.documentType})`,
    opts.notes ? `Founder notes:\n${opts.notes}` : null,
    "",
    "DOCUMENT CONTENT:",
    opts.content,
  ]
    .filter(Boolean)
    .join("\n");

  const messages: Message[] = [{ role: "user", content: [{ text: userText }] }];

  const { template: rulesTemplate } = await loadSystemPlaybookTemplate(
    INTELLIGENCE_GENERATION_SLUG,
    DEFAULT_INTELLIGENCE_GENERATION_RULES,
  );

  const res = await bedrock.send(
    new ConverseCommand({
      modelId: GENERATOR_MODEL_ID,
      system: [
        {
          text: buildSystemPrompt({
            companyName: opts.companyName,
            documentType: opts.documentType,
            categoryHints: opts.categoryHints,
            catalog,
            rulesTemplate,
          }),
        },
      ],
      messages,
      toolConfig: {
        tools: [buildRecordIntelligenceTool()],
        toolChoice: { tool: { name: "record_intelligence" } },
      },
      inferenceConfig: { maxTokens: 4096, temperature: 0 },
    }),
  );

  const usage = res.usage;
  const blocks = res.output?.message?.content ?? [];
  for (const block of blocks) {
    const tu = (block as { toolUse?: ToolUseBlock }).toolUse;
    if (tu?.name === "record_intelligence") {
      const rawInsights = parseInsightsFromToolInput(tu.input);
      const insights = coerceInsights(
        rawInsights,
        catalogById,
        SAFETY_MAX_INTELLIGENCE_ITEMS,
      );
      return {
        insights,
        rawInsightCount: rawInsights.length,
        inputTokens: usage?.inputTokens ?? undefined,
        outputTokens: usage?.outputTokens ?? undefined,
      };
    }
  }
  return { insights: [], rawInsightCount: 0 };
}

export async function generateIntelligenceFromDocument(opts: {
  accountId: string;
  companyUuid: string;
  companyName: string;
  authorEmail: string;
  documentVersionId: string;
  contextItemId: string;
  typeId: string;
  typeLabel: string;
  /** User-facing source title from Add source. */
  title?: string;
  filename: string;
  storageKey: string;
  generationPath: "data_room" | "source";
  notes?: string;
  /** Credits already deducted via workspace ledger (docUpload / generateSource). */
  skipCreditCharge?: boolean;
}): Promise<IntelligenceGenerationResult> {
  const creditCost =
    opts.generationPath === "data_room"
      ? DATA_ROOM_INTELLIGENCE_CREDITS
      : SOURCE_INTELLIGENCE_CREDITS;

  const buf = await getPitchDeckBytes(opts.storageKey);
  const content = await parseDocumentBuffer(buf, opts.filename);
  const sourceTitle = opts.title?.trim() || opts.typeLabel;

  const { insights, rawInsightCount, inputTokens, outputTokens } =
    await callIntelligenceExtractor({
      accountId: opts.accountId,
      companyName: opts.companyName,
      documentType: opts.typeId,
      documentLabel: sourceTitle,
      content,
      notes: opts.notes,
      categoryHints: categoryHintsForDocumentType(opts.typeId),
    });

  if (insights.length === 0) {
    throw new DocumentParseError(
      rawInsightCount > 0 ? "insights_shape_invalid" : "no_insights_extracted",
    );
  }

  const runId = `arun_${randomUUID()}`;
  const now = new Date();
  const period = currentPeriod(now);
  const db = await getDb();

  return db.transaction(async (tx) => {
    let creditBalance: number | undefined;
    let creditsCharged = 0;
    if (!opts.skipCreditCharge) {
      creditBalance = await chargeCreditsInTx(tx, {
        accountId: opts.accountId,
        amount: creditCost,
        reason: `intelligence_${opts.generationPath}`,
        referenceId: opts.documentVersionId,
      });
      creditsCharged = creditCost;
    }

    await tx.insert(agentRuns).values({
      id: runId,
      accountId: opts.accountId,
      userEmail: opts.authorEmail,
      kind: "intelligence_generation",
      subjectCompanyUuid: opts.companyUuid,
      prompt: content.slice(0, 4000),
      output: JSON.stringify({ count: insights.length }),
      model: GENERATOR_MODEL_ID,
      inputTokens: inputTokens ?? null,
      outputTokens: outputTokens ?? null,
      costTokens: (inputTokens ?? 0) + (outputTokens ?? 0),
      status: "ok",
      completedAt: now,
    });

    const intelligenceIds: string[] = [];
    for (const item of insights) {
      const id = `intel_${randomUUID()}`;
      intelligenceIds.push(id);
      await tx.insert(companyIntelligence).values({
        id,
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
        category: item.category,
        headline: item.headline.slice(0, 120),
        keyDetail: item.key_detail.slice(0, 240),
        summary: item.summary.slice(0, 500),
        confidence: DEFAULT_INTELLIGENCE_CONFIDENCE,
        source: `document:${opts.generationPath}`,
        generationPath: opts.generationPath,
        period,
        contextItemId: opts.contextItemId,
        documentVersionId: opts.documentVersionId,
        rawSnippet: item.raw_snippet.slice(0, 500),
        metadata: {
          documentType: opts.typeId,
          filename: opts.filename,
          signalId: item.signal_id,
          title: sourceTitle,
          valueNumeric: item.value_numeric,
          valueText: item.value_text,
          valueBool: item.value_bool,
        },
        isBenchmark: false,
        authorEmail: opts.authorEmail,
        agentRunId: runId,
        createdAt: now,
      });
    }

    await tx
      .update(contextItems)
      .set({ content })
      .where(eq(contextItems.id, opts.contextItemId));

    return { intelligenceIds, creditsCharged, creditBalance };
  });
}

export async function generateIntelligenceFromSource(opts: {
  accountId: string;
  companyUuid: string;
  companyName: string;
  authorEmail: string;
  title: string;
  notes: string;
  documentVersionId?: string;
  contextItemId?: string;
  typeId?: string;
  typeLabel?: string;
  filename?: string;
  storageKey?: string;
  skipCreditCharge?: boolean;
  /** Overrides notes-path documentType (e.g. hubspot_note). */
  documentType?: string;
  /** Overrides persisted company_intelligence.source. */
  source?: string;
  /** Overrides persisted company_intelligence.generation_path. */
  generationPath?: string;
  /**
   * When set with contextItemId, delete prior company_intelligence for that
   * context item inside the same transaction before insert (content-change regen).
   */
  replaceContextItemIntelligence?: boolean;
}): Promise<IntelligenceGenerationResult> {
  if (opts.documentVersionId && opts.contextItemId && opts.storageKey && opts.filename) {
    return generateIntelligenceFromDocument({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      companyName: opts.companyName,
      authorEmail: opts.authorEmail,
      documentVersionId: opts.documentVersionId,
      contextItemId: opts.contextItemId,
      typeId: opts.typeId ?? "custom",
      typeLabel: opts.typeLabel ?? opts.title,
      title: opts.title,
      filename: opts.filename,
      storageKey: opts.storageKey,
      generationPath: "source",
      notes: opts.notes,
      skipCreditCharge: opts.skipCreditCharge,
    });
  }

  const creditCost = SOURCE_INTELLIGENCE_CREDITS;
  const combined = `${opts.title}\n\n${opts.notes}`.trim();
  if (!opts.title.trim() || !opts.notes.trim()) {
    throw new DocumentParseError("notes_too_short");
  }

  const documentType = opts.documentType ?? "source_notes";
  const source = opts.source ?? "source_notes";
  const generationPath = opts.generationPath ?? "source";

  const { insights, rawInsightCount, inputTokens, outputTokens } =
    await callIntelligenceExtractor({
      accountId: opts.accountId,
      companyName: opts.companyName,
      documentType,
      documentLabel: opts.title,
      content: combined,
      categoryHints: ["finance", "growth", "fundraising", "team", "strategic"],
    });

  if (insights.length === 0) {
    throw new DocumentParseError(
      rawInsightCount > 0 ? "insights_shape_invalid" : "no_insights_extracted",
    );
  }

  const runId = `arun_${randomUUID()}`;
  const now = new Date();
  const period = currentPeriod(now);
  const db = await getDb();

  return db.transaction(async (tx) => {
    // Serialize concurrent content-change regens for the same context item:
    // lock row, delete prior intel, then insert replacements in one tx.
    if (opts.replaceContextItemIntelligence && opts.contextItemId) {
      await tx.execute(
        sql`SELECT id FROM context_items WHERE id = ${opts.contextItemId} AND account_id = ${opts.accountId} FOR UPDATE`,
      );
      await tx
        .delete(companyIntelligence)
        .where(
          and(
            eq(companyIntelligence.accountId, opts.accountId),
            eq(companyIntelligence.contextItemId, opts.contextItemId),
          ),
        );
    }

    let creditBalance: number | undefined;
    let creditsCharged = 0;
    if (!opts.skipCreditCharge) {
      creditBalance = await chargeCreditsInTx(tx, {
        accountId: opts.accountId,
        amount: creditCost,
        reason: "intelligence_source",
      });
      creditsCharged = creditCost;
    }

    await tx.insert(agentRuns).values({
      id: runId,
      accountId: opts.accountId,
      userEmail: opts.authorEmail,
      kind: "intelligence_generation",
      subjectCompanyUuid: opts.companyUuid,
      prompt: combined.slice(0, 4000),
      output: JSON.stringify({ count: insights.length }),
      model: GENERATOR_MODEL_ID,
      inputTokens: inputTokens ?? null,
      outputTokens: outputTokens ?? null,
      costTokens: (inputTokens ?? 0) + (outputTokens ?? 0),
      status: "ok",
      completedAt: now,
    });

    const intelligenceIds: string[] = [];
    for (const item of insights) {
      const id = `intel_${randomUUID()}`;
      intelligenceIds.push(id);
      await tx.insert(companyIntelligence).values({
        id,
        accountId: opts.accountId,
        companyUuid: opts.companyUuid,
        category: item.category,
        headline: item.headline.slice(0, 120),
        keyDetail: item.key_detail.slice(0, 240),
        summary: item.summary.slice(0, 500),
        confidence: DEFAULT_INTELLIGENCE_CONFIDENCE,
        source,
        generationPath,
        period,
        contextItemId: opts.contextItemId ?? null,
        documentVersionId: opts.documentVersionId ?? null,
        rawSnippet: item.raw_snippet.slice(0, 500),
        metadata: {
          title: opts.title,
          signalId: item.signal_id,
          valueNumeric: item.value_numeric,
          valueText: item.value_text,
          valueBool: item.value_bool,
        },
        isBenchmark: false,
        authorEmail: opts.authorEmail,
        agentRunId: runId,
        createdAt: now,
      });
    }

    return { intelligenceIds, creditsCharged, creditBalance };
  });
}

/** Min content length before auto-intelligence from a context item (mirrors extract). */
const CONTEXT_ITEM_MIN_CONTENT_CHARS = 40;

/**
 * Generate company_intelligence from a synced context_item (HubSpot, Granola, …).
 * Idempotent by contextItemId unless `replaceExisting` (content-change regen).
 * Always skipCreditCharge (system sync).
 */
export async function generateIntelligenceFromContextItem(opts: {
  accountId: string;
  companyUuid: string;
  companyName: string;
  authorEmail: string;
  contextItemId: string;
  title: string;
  content: string;
  /** Persisted company_intelligence.source (e.g. "hubspot" | "granola"). */
  source: string;
  /** Persisted company_intelligence.generation_path. */
  generationPath: string;
  /** Prompt / extractor documentType (e.g. hubspot_note, granola_meeting). */
  documentType: string;
  /** Used when title is blank. */
  defaultTitle: string;
  minContentChars?: number;
  /**
   * When true, delete prior company_intelligence for this context item and
   * insert a fresh set (F20A-254 content-change path).
   */
  replaceExisting?: boolean;
}): Promise<IntelligenceGenerationResult & { skipped: boolean }> {
  const db = await getDb();
  const existing = await db
    .select({ id: companyIntelligence.id })
    .from(companyIntelligence)
    .where(
      and(
        eq(companyIntelligence.accountId, opts.accountId),
        eq(companyIntelligence.companyUuid, opts.companyUuid),
        eq(companyIntelligence.contextItemId, opts.contextItemId),
      ),
    );
  const replaceExisting = Boolean(opts.replaceExisting);
  if (
    contextIntelligenceGenerationAction({
      existingCount: existing.length,
      replaceExisting,
    }) === "skip"
  ) {
    return {
      intelligenceIds: existing.map((r) => r.id),
      creditsCharged: 0,
      skipped: true,
    };
  }

  const title = opts.title.trim() || opts.defaultTitle;
  const notes = opts.content.trim();
  const minChars = opts.minContentChars ?? CONTEXT_ITEM_MIN_CONTENT_CHARS;
  if (notes.length < minChars) {
    return { intelligenceIds: [], creditsCharged: 0, skipped: true };
  }

  try {
    const result = await generateIntelligenceFromSource({
      accountId: opts.accountId,
      companyUuid: opts.companyUuid,
      companyName: opts.companyName,
      authorEmail: opts.authorEmail,
      title,
      notes,
      contextItemId: opts.contextItemId,
      skipCreditCharge: true,
      documentType: opts.documentType,
      source: opts.source,
      generationPath: opts.generationPath,
      replaceContextItemIntelligence: replaceExisting && existing.length > 0,
    });
    return { ...result, skipped: false };
  } catch (e) {
    if (e instanceof DocumentParseError) {
      return { intelligenceIds: [], creditsCharged: 0, skipped: true };
    }
    throw e;
  }
}

/**
 * Generate company_intelligence from a HubSpot activity context_item.
 * Thin wrapper over generateIntelligenceFromContextItem.
 */
export async function generateIntelligenceFromHubspotActivity(opts: {
  accountId: string;
  companyUuid: string;
  companyName: string;
  authorEmail: string;
  contextItemId: string;
  title: string;
  content: string;
  activityKind: "note" | "email";
}): Promise<IntelligenceGenerationResult & { skipped: boolean }> {
  return generateIntelligenceFromContextItem({
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    companyName: opts.companyName,
    authorEmail: opts.authorEmail,
    contextItemId: opts.contextItemId,
    title: opts.title,
    content: opts.content,
    source: "hubspot",
    generationPath: "hubspot",
    documentType:
      opts.activityKind === "email" ? "hubspot_email" : "hubspot_note",
    defaultTitle:
      opts.activityKind === "email" ? "HubSpot email" : "HubSpot note",
  });
}

export { DocumentParseError, InsufficientCreditsError };
