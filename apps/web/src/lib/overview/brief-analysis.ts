import "server-only";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import { cachedFetch } from "@/lib/enrichment/cache";
import { captureIntegrationException } from "@/lib/sentry/capture";
import {
  DEFAULT_OVERVIEW_BRIEF_ANALYSIS_PROMPT,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { OVERVIEW_BRIEF_ANALYSIS_SLUG } from "@/lib/system-playbooks/slugs";
import type { FullSummaryBriefAnalysis } from "./full-summary-types";

const MODEL_ID =
  process.env.BEDROCK_EXTRACTOR_MODEL_ID ??
  "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const bedrock = new BedrockRuntimeClient({});

const BriefAnalysisSchema = z.object({
  cohortPosition: z.object({
    paragraphs: z.array(z.string()).min(0).max(3),
  }),
  areasToWatch: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
      }),
    )
    .max(2),
});

const BRIEF_TOOL: Tool = {
  toolSpec: {
    name: "record_brief_analysis",
    description: "Record cohort position paragraphs and areas to watch.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          cohortPosition: {
            type: "object",
            properties: {
              paragraphs: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 3,
              },
            },
            required: ["paragraphs"],
          },
          areasToWatch: {
            type: "array",
            maxItems: 2,
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                detail: { type: "string" },
              },
              required: ["title", "detail"],
            },
          },
        },
        required: ["cohortPosition", "areasToWatch"],
      },
    },
  },
};

function userPrompt(period: string, inputJson: string): string {
  return `Analyze this company's cohort position for the company full summary page.

Benchmark period: ${period}

Company and benchmark context (JSON):
${inputJson}

Return JSON with cohortPosition.paragraphs (2–3 paragraphs) and areasToWatch (0–2 items) per the system instructions.`;
}

async function callBedrockOnce(
  period: string,
  input: Record<string, unknown>,
  systemPrompt: string,
): Promise<FullSummaryBriefAnalysis> {
  const inputJson = JSON.stringify(input);
  const res = await bedrock.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: systemPrompt }],
      messages: [
        {
          role: "user",
          content: [{ text: userPrompt(period, inputJson) }],
        },
      ] as Message[],
      toolConfig: {
        tools: [BRIEF_TOOL],
        toolChoice: { tool: { name: "record_brief_analysis" } },
      },
      inferenceConfig: { maxTokens: 2048, temperature: 0.2 },
    }),
  );

  const blocks = res.output?.message?.content ?? [];
  for (const block of blocks) {
    const tu = (block as { toolUse?: ToolUseBlock }).toolUse;
    if (tu?.name === "record_brief_analysis" && tu.input) {
      const parsed = BriefAnalysisSchema.safeParse(tu.input);
      if (parsed.success) {
        return {
          cohortPosition: {
            paragraphs: parsed.data.cohortPosition.paragraphs
              .map((p) => p.trim())
              .filter(Boolean)
              .slice(0, 3),
          },
          areasToWatch: parsed.data.areasToWatch
            .map((a) => ({
              title: a.title.trim(),
              detail: a.detail.trim(),
            }))
            .filter((a) => a.title && a.detail)
            .slice(0, 2),
        };
      }
      throw new Error("invalid_brief_analysis_shape");
    }
  }
  throw new Error("no_brief_analysis_tool_output");
}

export async function generateBriefAnalysis(opts: {
  companyUuid: string;
  period: string;
  fingerprint: string;
  input: Record<string, unknown>;
}): Promise<{
  analysis: FullSummaryBriefAnalysis | null;
  cached: boolean;
  error: string | null;
}> {
  const metrics = (opts.input.snapshot as { metrics?: unknown[] } | undefined)
    ?.metrics;
  if (!Array.isArray(metrics) || metrics.length === 0) {
    return { analysis: null, cached: false, error: null };
  }

  const subjectKey = `${opts.companyUuid}:${opts.period}:${opts.fingerprint}`;

  try {
    const { template: systemPrompt } = await loadSystemPlaybookTemplate(
      OVERVIEW_BRIEF_ANALYSIS_SLUG,
      DEFAULT_OVERVIEW_BRIEF_ANALYSIS_PROMPT,
    );

    const result = await cachedFetch<FullSummaryBriefAnalysis>({
      source: "overview:brief_analysis",
      subjectKey,
      ttlSeconds: 60 * 60 * 24 * 30,
      errorTtlSeconds: 60 * 5,
      costTokens: 1,
      fetcher: async () => {
        try {
          return await callBedrockOnce(opts.period, opts.input, systemPrompt);
        } catch (first) {
          // One retry for parse/shape failures per ticket.
          try {
            return await callBedrockOnce(opts.period, opts.input, systemPrompt);
          } catch (second) {
            captureIntegrationException(second ?? first, {
              integration: "bedrock",
              operation: "overview_brief_analysis",
              context: { companyUuid: opts.companyUuid, period: opts.period },
            });
            throw second ?? first;
          }
        }
      },
    });

    if (result.error || !result.data) {
      return {
        analysis: null,
        cached: result.cached,
        error: result.error ?? "analysis_unavailable",
      };
    }
    return { analysis: result.data, cached: result.cached, error: null };
  } catch (error) {
    captureIntegrationException(error, {
      integration: "bedrock",
      operation: "overview_brief_analysis",
      context: { companyUuid: opts.companyUuid, period: opts.period },
    });
    return {
      analysis: null,
      cached: false,
      error: (error as Error).message?.slice(0, 200) ?? "bedrock_error",
    };
  }
}
