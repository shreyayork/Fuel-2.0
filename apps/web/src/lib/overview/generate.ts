import "server-only";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { hydratePrompt, loadOverviewPromptTemplate } from "./prompt";
import {
  logOverviewBedrockRequest,
  logOverviewBedrockResponse,
} from "./perf-log";
import { normalizeOverviewAiResponse } from "./normalize-ai-response";
import { OverviewAiResponseSchema, type OverviewAiResponse } from "./types";
import { loadYorkHelpServiceCatalog } from "@/lib/york-help/load-catalog";
import { YORK_HELP_BULLET_TOOL_PROPERTIES } from "@/lib/york-help/catalog-data";
import { OVERVIEW_BEDROCK_TIMEOUT_MS } from "./constants";

const MODEL_ID =
  process.env.BEDROCK_EXTRACTOR_MODEL_ID ??
  "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const bedrock = new BedrockRuntimeClient({
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 10_000,
    requestTimeout: OVERVIEW_BEDROCK_TIMEOUT_MS,
    // Without this flag Smithy only warns when requestTimeout is exceeded.
    throwOnRequestTimeout: true,
  }),
});

const USER_PROMPT =
  "Generate the complete overview for this company. Use the record_overview tool.";

const INFERENCE = {
  maxTokens: 16384,
  temperature: 0.2,
} as const;

const OVERVIEW_TOOL: Tool = {
  toolSpec: {
    name: "record_overview",
    description: "Record the full company overview analysis.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          advisor: { type: "object" },
          categories: { type: "array" },
          intelligence: {
            type: "array",
            description:
              "0-15 catalog-grounded insights when evidence supports it (0 is fine if benchmarks are empty/sparse). Each item needs signal_id from INPUT.signal_catalog, category_id (dev|mkt|rev), text, and the typed value field matching that signal's kind (value_numeric | value_text | value_bool). Optional evidence_source (profile|form|document). Never invent Unknown/N/A values; omit signals with null INPUT.benchmark values.",
            items: {
              type: "object",
              properties: {
                signal_id: {
                  type: "string",
                  description:
                    "Exact id from INPUT.signal_catalog[].id (e.g. arr_usd, fte_count).",
                },
                category_id: { type: "string", enum: ["dev", "mkt", "rev"] },
                text: {
                  type: "string",
                  description: "Why this matters operationally or strategically.",
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
                title: {
                  type: "string",
                  description: "Prefer the catalog signal label; overwritten server-side.",
                },
                type: {
                  type: "string",
                  description: "Optional freeform type; overwritten from catalog category.",
                },
                evidence_source: {
                  type: "string",
                  enum: ["profile", "form", "document"],
                  description:
                    "Which INPUT grounded this item: INPUT.company / profile_* → profile; track answers → form; uploaded docs → document. Omit for logged INPUT.benchmark metrics (server labels Benchmark).",
                },
              },
              required: ["signal_id", "category_id", "text"],
            },
          },
          suggested_initiatives: {
            type: "array",
            description:
              "2-3 initiatives per track. Each item needs title, description, benefit, category_id (dev|mkt|rev), cadence, 2-4 milestones (never empty), nested york_help, tagged_intelligence_types (all related types, empty if none), source_documents, and priority.",
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description:
                    "Specific actionable title. Never use the bare word Initiative.",
                },
                description: { type: "string" },
                benefit: {
                  type: "string",
                  description:
                    "2–4 short bullets, one per line, on the value of completing this initiative. Do not mention AI, prompts, or Fuel internals.",
                },
                category_id: { type: "string", enum: ["dev", "mkt", "rev"] },
                cadence: { type: "string", enum: ["one-time", "recurring"] },
                tagged_intelligence_types: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "All related intelligence types or signal ids. Empty array if none are related.",
                },
                source_rationale: {
                  type: "string",
                  description: "Optional evidence note for which insight or document drove the suggestion.",
                },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                source_documents: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      title: { type: "string" },
                      type_label: { type: "string" },
                    },
                    required: ["title"],
                  },
                },
                milestones: {
                  type: "array",
                  minItems: 2,
                  maxItems: 4,
                  description:
                    "Concrete execution steps for this initiative. Never return an empty array.",
                  items: {
                    type: "object",
                    properties: {
                      title: {
                        type: "string",
                        description: "Short actionable milestone (required).",
                      },
                      due_date: {
                        type: "string",
                        description:
                          "MM-DD-YYYY target date on or after INPUT.as_of_date. Never use a past or prior-year date.",
                      },
                      checked: {
                        type: "boolean",
                        description: "Always false for new suggestions.",
                      },
                    },
                    required: ["title"],
                  },
                },
                york_help: {
                  type: "object",
                  description:
                    "How York IE can help for this initiative only — nested, not a top-level list. 1–2 catalog services. Each bullet has a personalized title and an approved outcome refined to this initiative.",
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
                  required: ["section_title", "bullets", "cta_label"],
                },
              },
              required: ["title", "description", "benefit", "category_id", "milestones", "york_help"],
            },
          },
          suggested_playbooks: { type: "array" },
          journey_stage: { type: "object" },
        },
        required: ["advisor", "categories", "suggested_initiatives"],
      },
    },
  },
};

export type OverviewAiTimings = {
  /** Prompt template read from DB. */
  promptLoadMs: number;
  /** Wall time for Bedrock Converse. */
  bedrockMs: number;
  /** Normalize + Zod validate tool output. */
  processMs: number;
};

export type OverviewAiRunRecord = {
  prompt: string;
  output: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
};

function stringifyOverviewRunOutput(value: unknown): string | null {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function tokensFromUsage(usage?: {
  inputTokens?: number;
  outputTokens?: number;
} | null): Pick<OverviewAiRunRecord, "inputTokens" | "outputTokens"> {
  return {
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
  };
}

export async function generateOverviewAi(
  modelInput: Record<string, unknown>,
  meta?: {
    requestId?: string | null;
    companyUuid?: string | null;
    accountId?: string | null;
    userEmail?: string | null;
  },
): Promise<{
  result: OverviewAiResponse | null;
  playbookId: string | null;
  model: string;
  error?: string;
  timings: OverviewAiTimings;
} & OverviewAiRunRecord> {
  const promptLoadStart = performance.now();
  const [{ playbookId, template }, yorkHelpCatalog] = await Promise.all([
    loadOverviewPromptTemplate(),
    loadYorkHelpServiceCatalog(),
  ]);
  const promptLoadMs = performance.now() - promptLoadStart;
  const systemText = hydratePrompt(template, modelInput, new Date(), yorkHelpCatalog);
  const prompt = `${systemText}\n\n${USER_PROMPT}`;
  const signalCatalogRaw = Array.isArray(modelInput.signal_catalog)
    ? modelInput.signal_catalog
    : [];
  const signalCatalog = signalCatalogRaw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id.trim() : "";
      const label = typeof r.label === "string" ? r.label.trim() : "";
      const category = typeof r.category === "string" ? r.category.trim() : "";
      if (!id || !label) return null;
      const kindRaw = typeof r.kind === "string" ? r.kind.trim() : "";
      const kind =
        kindRaw === "boolean" || kindRaw === "qualitative" || kindRaw === "quantitative"
          ? kindRaw
          : "quantitative";
      const unit = typeof r.unit === "string" ? r.unit : null;
      return { id, label, category: category || "growth", kind, unit };
    })
    .filter(
      (
        row,
      ): row is {
        id: string;
        label: string;
        category: string;
        kind: "quantitative" | "qualitative" | "boolean";
        unit: string | null;
      } => row != null,
    );

  const emptyTimings = (): OverviewAiTimings => ({
    promptLoadMs,
    bedrockMs: 0,
    processMs: 0,
  });

  try {
    logOverviewBedrockRequest({
      requestId: meta?.requestId,
      companyUuid: meta?.companyUuid,
      accountId: meta?.accountId,
      userEmail: meta?.userEmail,
      modelId: MODEL_ID,
      systemTemplate: template,
      userPrompt: USER_PROMPT,
      resolvedSystemPrompt: systemText,
      parameters: {
        temperature: INFERENCE.temperature,
        maxTokens: INFERENCE.maxTokens,
      },
      toolName: "record_overview",
    });

    const bedrockStart = performance.now();
    const res = await bedrock.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: systemText }],
        messages: [
          {
            role: "user",
            content: [{ text: USER_PROMPT }],
          },
        ] as Message[],
        toolConfig: {
          tools: [OVERVIEW_TOOL],
          toolChoice: { tool: { name: "record_overview" } },
        },
        inferenceConfig: { ...INFERENCE },
      }),
      { abortSignal: AbortSignal.timeout(OVERVIEW_BEDROCK_TIMEOUT_MS) },
    );
    const bedrockMs = performance.now() - bedrockStart;

    const processStart = performance.now();
    const blocks = res.output?.message?.content ?? [];
    const responseMeta = {
      requestId: meta?.requestId,
      companyUuid: meta?.companyUuid,
      accountId: meta?.accountId,
      modelId: MODEL_ID,
      bedrockMs,
      stopReason: res.stopReason ?? null,
      usage: res.usage
        ? {
            inputTokens: res.usage.inputTokens,
            outputTokens: res.usage.outputTokens,
            totalTokens: res.usage.totalTokens,
          }
        : null,
      rawOutput: {
        stopReason: res.stopReason,
        usage: res.usage,
        content: blocks,
      },
    };

    for (const block of blocks) {
      const tu = (block as { toolUse?: ToolUseBlock }).toolUse;
      if (tu?.name === "record_overview" && tu.input) {
        const normalized = normalizeOverviewAiResponse(tu.input, {
          signalCatalog,
          yorkHelpCatalog,
        });
        const parsed = OverviewAiResponseSchema.safeParse(normalized);
        const processMs = performance.now() - processStart;
        const timings = { promptLoadMs, bedrockMs, processMs };
        if (parsed.success) {
          logOverviewBedrockResponse({
            ...responseMeta,
            parsedResult: parsed.data,
          });
          return {
            result: parsed.data,
            playbookId,
            model: MODEL_ID,
            timings,
            prompt,
            output: stringifyOverviewRunOutput(parsed.data),
            ...tokensFromUsage(res.usage),
          };
        }
        const issue = parsed.error.issues[0];
        const detail = issue
          ? `${issue.path.join(".") || "root"}: ${issue.message}`
          : "validation_failed";
        const parseError = `invalid_ai_shape:${detail.slice(0, 180)}`;
        logOverviewBedrockResponse({
          ...responseMeta,
          parsedResult: normalized,
          parseError,
        });
        return {
          result: null,
          playbookId,
          model: MODEL_ID,
          error: parseError,
          timings,
          prompt,
          output: stringifyOverviewRunOutput(normalized),
          ...tokensFromUsage(res.usage),
        };
      }
    }

    const noToolError = "no_tool_output";
    logOverviewBedrockResponse({
      ...responseMeta,
      parseError: noToolError,
    });
    return {
      result: null,
      playbookId,
      model: MODEL_ID,
      error: noToolError,
      timings: {
        promptLoadMs,
        bedrockMs,
        processMs: performance.now() - processStart,
      },
      prompt,
      output: stringifyOverviewRunOutput(blocks),
      ...tokensFromUsage(res.usage),
    };
  } catch (e) {
    const timedOut = isBedrockTimeoutError(e);
    captureIntegrationException(e, {
      integration: "bedrock",
      operation: timedOut ? "overview_generation_timeout" : "overview_generation",
    });
    const errMsg = timedOut
      ? "bedrock_timeout"
      : ((e as Error).message?.slice(0, 200) ?? "bedrock_error");
    logOverviewBedrockResponse({
      requestId: meta?.requestId,
      companyUuid: meta?.companyUuid,
      accountId: meta?.accountId,
      modelId: MODEL_ID,
      bedrockMs: 0,
      rawOutput: null,
      parseError: errMsg,
    });
    return {
      result: null,
      playbookId,
      model: MODEL_ID,
      error: errMsg,
      timings: emptyTimings(),
      prompt,
      output: null,
      inputTokens: null,
      outputTokens: null,
    };
  }
}

function isBedrockTimeoutError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    name === "TimeoutError" ||
    name === "AbortError" ||
    /timed out|timeout|aborted|TimeoutError/i.test(message)
  );
}
