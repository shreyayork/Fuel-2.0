import "server-only";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { captureIntegrationException } from "@/lib/sentry/capture";
import {
  DEFAULT_YORK_HELP_GENERATION_PROMPT,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { YORK_HELP_GENERATION_SLUG } from "@/lib/system-playbooks/slugs";
import {
  coerceYorkHelpFromRaw,
  formatYorkHelpCatalogForPrompt,
  YORK_HELP_BULLET_TOOL_PROPERTIES,
  YORK_HELP_CTA_URL,
  YORK_HELP_MAX_SERVICES,
  type YorkHelpServiceCatalog,
} from "./catalog";
import { loadYorkHelpServiceCatalog } from "./load-catalog";
import { buildLegacyYorkHelp, type YorkHelpInitiativeInput } from "./fallback";
import type { YorkHelp } from "./types";

const MODEL_ID =
  process.env.BEDROCK_EXTRACTOR_MODEL_ID ??
  "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const bedrock = new BedrockRuntimeClient({});

const RECORD_YORK_HELP_TOOL: Tool = {
  toolSpec: {
    name: "record_york_help",
    description:
      "Record 1–2 How York IE can help services for one initiative. title is a personalized heading; help refines an approved outcome to this initiative.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          section_title: { type: "string" },
          bullets: {
            type: "array",
            minItems: 1,
            maxItems: YORK_HELP_MAX_SERVICES,
            items: {
              type: "object",
              properties: YORK_HELP_BULLET_TOOL_PROPERTIES,
              required: ["title", "help", "primary_service", "track"],
            },
          },
          cta_label: { type: "string" },
        },
        required: ["section_title", "bullets", "cta_label"],
      },
    },
  },
};

function extractToolUse(output: Message | undefined): ToolUseBlock | null {
  const blocks = output?.content ?? [];
  for (const block of blocks) {
    if ("toolUse" in block && block.toolUse?.name === "record_york_help") {
      return block.toolUse;
    }
  }
  return null;
}

async function callBedrockOnce(
  input: YorkHelpInitiativeInput,
  systemPrompt: string,
  catalog: YorkHelpServiceCatalog,
): Promise<YorkHelp | null> {
  const allowedServices = catalog[input.categoryId];
  const userPayload = {
    source: "manual_save",
    companyName: input.companyName ?? null,
    initiativeTitle: input.initiativeTitle,
    description: input.description ?? null,
    kind: input.kind ?? null,
    category_id: input.categoryId,
    topicLabel: input.topicLabel ?? null,
    owners: input.owners ?? [],
    due: input.due ?? null,
    status: input.status ?? null,
    milestones: input.milestones,
    advisors: input.advisors ?? [],
    progress: input.progress ?? { baselineTitle: null, currentTitle: null },
    allowedServices,
  };

  const userText = `Generate york_help for this manually saved initiative.

INITIATIVE:
${JSON.stringify(userPayload, null, 2)}

${formatYorkHelpCatalogForPrompt(input.categoryId, catalog)}

Public CTA destination (do not put the URL in help text): ${YORK_HELP_CTA_URL}

Return JSON with section_title, bullets (1–2 services), cta_label via the record_york_help tool.`;

  const response = await bedrock.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: systemPrompt }],
      messages: [{ role: "user", content: [{ text: userText }] }],
      toolConfig: {
        tools: [RECORD_YORK_HELP_TOOL],
        toolChoice: { tool: { name: "record_york_help" } },
      },
      inferenceConfig: { maxTokens: 2048, temperature: 0.2 },
    }),
  );

  const toolUse = extractToolUse(response.output?.message);
  if (!toolUse?.input) return null;
  return coerceYorkHelpFromRaw(toolUse.input, input.categoryId, catalog);
}

/**
 * Generate How York IE can help for a manually saved initiative.
 * Retries Bedrock once, then uses catalog fallback.
 */
export async function generateYorkHelpForInitiative(
  input: YorkHelpInitiativeInput,
): Promise<{ help: YorkHelp; source: "bedrock" | "legacy" }> {
  const catalog = await loadYorkHelpServiceCatalog();
  if (!input.initiativeTitle.trim() && input.milestones.length === 0) {
    return { help: buildLegacyYorkHelp(input, catalog), source: "legacy" };
  }

  const { template: systemPrompt } = await loadSystemPlaybookTemplate(
    YORK_HELP_GENERATION_SLUG,
    DEFAULT_YORK_HELP_GENERATION_PROMPT,
  );

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const help = await callBedrockOnce(input, systemPrompt, catalog);
      if (help) return { help, source: "bedrock" };
    } catch (error) {
      captureIntegrationException(error, {
        integration: "bedrock",
        operation: "york_help_generate",
        context: { attempt, categoryId: input.categoryId },
      });
    }
  }

  return { help: buildLegacyYorkHelp(input, catalog), source: "legacy" };
}
