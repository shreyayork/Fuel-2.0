import "server-only";
import { z } from "zod";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import type { Skill } from "../types";
import { searchGlobalPlaybooksByQuery } from "@/lib/playbooks";
import {
  DEFAULT_ONBOARD_BENCHMARK_INSIGHTS_PROMPT,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { ONBOARD_BENCHMARK_INSIGHTS_SLUG } from "@/lib/system-playbooks/slugs";
import type {
  OnboardBenchmarkInsightCard,
  OnboardBenchmarkMetricInput,
} from "@/lib/onboard/benchmark-insights-types";

const input = z.object({
  companyName: z.string().min(1),
  cohortKey: z.string().nullable(),
  cohortLabel: z.string().min(1),
  industry: z.string().nullable().optional(),
  businessModel: z.string().nullable().optional(),
  metrics: z.array(
    z.object({
      answerKey: z.string(),
      metricId: z.string(),
      label: z.string(),
      userValue: z.number(),
      displayVal: z.string(),
      tier: z.enum(["top10", "top25", "above", "below", "weak"]),
      p25: z.number(),
      p50: z.number(),
      p75: z.number(),
      p90: z.number(),
      invertedGood: z.boolean(),
      unit: z.string(),
    }),
  ),
});

const INSIGHTS_MODEL_ID =
  process.env.BEDROCK_EXTRACTOR_MODEL_ID ??
  "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const bedrock = new BedrockRuntimeClient({});

const CAT_COLORS: Record<string, string> = {
  Intelligence: "#2BB8A0",
  Initiative: "#00B48A",
  Playbook: "#D4924A",
};

const CAT_ICONS: Record<string, string> = {
  Intelligence: "◎",
  Initiative: "↗",
  Playbook: "▤",
};

const SIGNAL_CATEGORY_BY_METRIC: Record<string, string> = {
  arr_growth_yoy_pct: "growth",
  nrr_pct: "retention",
  gross_margin_pct: "efficiency",
  logo_retention_pct: "retention",
  monthly_burn_usd: "finance",
  cash_on_hand_usd: "finance",
  fte_count: "team",
  paid_customer_count: "growth",
};

async function findPlaybookMatches(metrics: OnboardBenchmarkMetricInput[]) {
  const queries = metrics.map((m) => {
    const focus =
      m.tier === "weak" || m.tier === "below"
        ? `${m.label} recovery improvement`
        : `${m.label} optimization ${m.tier}`;
    return focus;
  });
  const results = await Promise.all(
    queries.map((q) => searchGlobalPlaybooksByQuery({ query: q, limit: 3 })),
  );
  const seen = new Set<string>();
  const out: Array<{ slug: string; title: string; description: string }> = [];
  for (const batch of results) {
    for (const pb of batch) {
      if (seen.has(pb.slug)) continue;
      seen.add(pb.slug);
      out.push({ slug: pb.slug, title: pb.title, description: pb.description });
    }
  }
  return out.slice(0, 18);
}

const INSIGHTS_TOOL: Tool = {
  toolSpec: {
    name: "record_benchmark_insights",
    description: "Record intelligence, initiative, and playbook cards for onboard benchmark summary.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                cat: { type: "string", enum: ["Intelligence", "Initiative", "Playbook"] },
                title: { type: "string" },
                body: { type: "string" },
                metricLabel: { type: "string" },
                displayVal: { type: "string" },
                signalId: { type: "string" },
                signalLabel: { type: "string" },
                playbookSlug: { type: "string" },
                linkedIntelligenceId: { type: "string" },
                linkedIntelligenceTitle: { type: "string" },
              },
              required: ["id", "cat", "title", "body", "metricLabel", "displayVal", "signalId", "signalLabel"],
            },
          },
        },
        required: ["cards"],
      },
    },
  },
};

export const generateOnboardBenchmarkInsightsSkill: Skill<
  z.infer<typeof input>,
  { cards: OnboardBenchmarkInsightCard[]; error?: string }
> = {
  name: "generateOnboardBenchmarkInsights",
  title: "Generate onboard benchmark insight cards",
  description:
    "Produces intelligence, initiative, and playbook cards from user benchmark inputs vs cohort percentiles.",
  inputSchema: input,
  readOnly: true,
  costTokens: 4_000,

  async execute(payload) {
    const playbooks = await findPlaybookMatches(payload.metrics);
    const userText = [
      `Company: ${payload.companyName}`,
      `Cohort: ${payload.cohortLabel}${payload.cohortKey ? ` (${payload.cohortKey})` : ""}`,
      payload.industry ? `Industry: ${payload.industry}` : "",
      payload.businessModel ? `Business model: ${payload.businessModel}` : "",
      "",
      "METRICS (user value vs cohort percentiles):",
      ...payload.metrics.map(
        (m) =>
          `- ${m.label} (${m.metricId}): ${m.displayVal} — tier=${m.tier}; P25=${m.p25} P50=${m.p50} P75=${m.p75} P90=${m.p90}${m.invertedGood ? " (lower is better)" : ""}`,
      ),
      "",
      "PLAYBOOK CATALOG (use slug for Playbook cards when relevant):",
      ...playbooks.map((p) => `- ${p.slug}: ${p.title} — ${p.description.slice(0, 120)}`),
    ]
      .filter(Boolean)
      .join("\n");

    const { template: systemPrompt } = await loadSystemPlaybookTemplate(
      ONBOARD_BENCHMARK_INSIGHTS_SLUG,
      DEFAULT_ONBOARD_BENCHMARK_INSIGHTS_PROMPT,
    );

    try {
      const res = await bedrock.send(
        new ConverseCommand({
          modelId: INSIGHTS_MODEL_ID,
          system: [{ text: systemPrompt }],
          messages: [{ role: "user", content: [{ text: userText }] }] as Message[],
          toolConfig: {
            tools: [INSIGHTS_TOOL],
            toolChoice: { tool: { name: "record_benchmark_insights" } },
          },
          inferenceConfig: { maxTokens: 4096, temperature: 0.2 },
        }),
      );

      const blocks = res.output?.message?.content ?? [];
      for (const block of blocks) {
        const tu = (block as { toolUse?: ToolUseBlock }).toolUse;
        if (tu?.name === "record_benchmark_insights") {
          const raw = (tu.input ?? {}) as { cards?: unknown[] };
          const cards = normalizeCards(raw.cards ?? [], playbooks);
          return { cards };
        }
      }
      return { cards: [], error: "no_tool_output" };
    } catch (e) {
      console.warn("[generateOnboardBenchmarkInsights] bedrock error", (e as Error).message);
      return {
        cards: [],
        error: (e as Error).message?.slice(0, 200) ?? "bedrock_error",
      };
    }
  },
};

function normalizeCards(
  raw: unknown[],
  playbooks: Array<{ slug: string; title: string }>,
): OnboardBenchmarkInsightCard[] {
  const slugSet = new Set(playbooks.map((p) => p.slug));
  const out: OnboardBenchmarkInsightCard[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    const cat = c.cat;
    if (cat !== "Intelligence" && cat !== "Initiative" && cat !== "Playbook") continue;
    const signalId = typeof c.signalId === "string" ? c.signalId : "unknown";
    const id = typeof c.id === "string" ? c.id : `${signalId}-${String(cat).toLowerCase()}`;
    const playbookSlug =
      typeof c.playbookSlug === "string" && slugSet.has(c.playbookSlug)
        ? c.playbookSlug
        : null;
    out.push({
      id,
      cat,
      title: String(c.title ?? "").slice(0, 120),
      body: String(c.body ?? "").slice(0, 400),
      metricLabel: String(c.metricLabel ?? ""),
      displayVal: String(c.displayVal ?? ""),
      signalCategory: SIGNAL_CATEGORY_BY_METRIC[signalId] ?? "strategic",
      signalId,
      signalLabel: String(c.signalLabel ?? c.metricLabel ?? signalId),
      playbookSlug,
      linkedIntelligenceId:
        typeof c.linkedIntelligenceId === "string" ? c.linkedIntelligenceId : null,
      linkedIntelligenceTitle:
        typeof c.linkedIntelligenceTitle === "string" ? c.linkedIntelligenceTitle : null,
    });
  }
  return out.slice(0, 30);
}

export function insightCardPresentation(card: OnboardBenchmarkInsightCard) {
  return {
    ...card,
    color: CAT_COLORS[card.cat] ?? "#2BB8A0",
    icon: CAT_ICONS[card.cat] ?? "◎",
  };
}
