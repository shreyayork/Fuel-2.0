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
import {
  DEFAULT_EXTRACT_BENCHMARK_HINTS_PROMPT,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { EXTRACT_BENCHMARK_HINTS_SLUG } from "@/lib/system-playbooks/slugs";

/**
 * LLM-powered benchmark hint extractor for the onboarding flow.
 *
 * Reads already-cached website markdown + Crunchbase + LinkedIn text
 * and asks Claude Haiku to surface any publicly visible KPI signals:
 * ARR, paying customer count, notable customer names, and current
 * strategic challenges. All extracted values are conservative — the
 * model is instructed never to invent or estimate.
 *
 * Also computes Phase-1 structural hints from the raw enrichment data
 * (no LLM needed):
 *   - headcount midpoint from employee range string
 *   - cash-on-hand estimate from funding amount + age
 *   - journey stage from last funding type
 *
 * Monthly burn is never estimated — only populated when the LLM finds an
 * explicit figure in public text.
 *
 * LLM-extracted values override structural estimates when available.
 *
 * Cost: ~1 500 input + ~300 output Haiku tokens → budgeted at 2 000.
 * All underlying text is already in the enrichment cache so no extra
 * scrapes occur.
 */

const input = z.object({
  domain: z.string().min(3),
  /** Combined public text: website markdown + CB overview + LinkedIn about. */
  publicText: z.string().max(10_000).nullable().optional(),
  /** Raw CB/LinkedIn employee range string, e.g. "101-250". */
  employeeCountRaw: z.string().nullable().optional(),
  totalFundingUsd: z.number().nullable().optional(),
  /** ISO date string of the last funding round, e.g. "2024-06-15". */
  lastFundingAt: z.string().nullable().optional(),
  /** CB investment_type string, e.g. "seed", "series_a". */
  lastFundingType: z.string().nullable().optional(),
});

export interface BenchmarkHints {
  // ── LLM-extracted from public text ────────────────────────────────
  /** ARR if explicitly stated, e.g. "$2M" or "2000000". */
  arr: string | null;
  /** Paying customer count if mentioned, e.g. "500" or "500+". */
  payingCustomers: string | null;
  /** Comma-separated named customer logos/case study companies. */
  notableCustomers: string | null;
  /** Challenges or strategic focus extracted from positioning text. */
  currentChallenges: string | null;
  // ── Phase-1 structural estimates ──────────────────────────────────
  /** Midpoint of employee range, or LLM-found explicit headcount. */
  headcount: string | null;
  /** Estimated cash on hand from funding amount + elapsed time. */
  cashOnHand: string | null;
  /** Monthly net burn only when explicitly stated in public text. */
  monthlyBurn: string | null;
  /** Inferred onboarding journey stage from last funding type. */
  journeyStage: string | null;
  // ── Attribution ───────────────────────────────────────────────────
  sources: Partial<Record<string, string>>;
  error?: string;
}

const EXTRACTOR_MODEL_ID =
  process.env.BEDROCK_EXTRACTOR_MODEL_ID ??
  "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const bedrock = new BedrockRuntimeClient({});

export const extractBenchmarkHintsSkill: Skill<
  z.infer<typeof input>,
  BenchmarkHints
> = {
  name: "extractBenchmarkHints",
  title: "Extract benchmark KPI hints from public company text",
  description:
    "Reads cached website markdown, Crunchbase overview, and LinkedIn description to surface any publicly visible KPI signals (ARR, customer count, notable customers, challenges, monthly burn when stated). Also computes structural estimates for headcount and cash on hand from enrichment data.",
  inputSchema: input,
  readOnly: true,
  costTokens: 2_000,

  async execute({ domain, publicText, employeeCountRaw, totalFundingUsd, lastFundingAt, lastFundingType }) {
    // ── Phase 1: structural estimates (no LLM) ───────────────────────
    const structural = computeStructural({
      employeeCountRaw: employeeCountRaw ?? null,
      totalFundingUsd: totalFundingUsd ?? null,
      lastFundingAt: lastFundingAt ?? null,
      lastFundingType: lastFundingType ?? null,
    });

    const empty: BenchmarkHints = {
      arr: null,
      payingCustomers: null,
      notableCustomers: null,
      currentChallenges: null,
      ...structural,
      sources: { ...structural.sources },
    };

    const text = (publicText ?? "").trim();
    if (!text) return empty;

    // ── Phase 2: LLM extraction ──────────────────────────────────────
    const userText = [
      `Company domain: ${domain}`,
      "",
      "PUBLIC TEXT (website + Crunchbase + LinkedIn — combined):",
      text.slice(0, 9_000),
    ].join("\n");

    const { template: systemPrompt } = await loadSystemPlaybookTemplate(
      EXTRACT_BENCHMARK_HINTS_SLUG,
      DEFAULT_EXTRACT_BENCHMARK_HINTS_PROMPT,
    );

    try {
      const res = await bedrock.send(
        new ConverseCommand({
          modelId: EXTRACTOR_MODEL_ID,
          system: [{ text: systemPrompt }],
          messages: [{ role: "user", content: [{ text: userText }] }] as Message[],
          toolConfig: {
            tools: [HINTS_TOOL],
            toolChoice: { tool: { name: "record_benchmark_hints" } },
          },
          inferenceConfig: { maxTokens: 600, temperature: 0 },
        }),
      );

      const blocks = res.output?.message?.content ?? [];
      for (const block of blocks) {
        const tu = (block as { toolUse?: ToolUseBlock }).toolUse;
        if (tu?.name === "record_benchmark_hints") {
          const raw = (tu.input ?? {}) as Record<string, unknown>;
          const llm = normalizeLlm(raw);
          // LLM values override structural estimates; structural fills gaps
          return merge(empty, llm);
        }
      }
    } catch (e) {
      console.warn("[extractBenchmarkHints] bedrock error", (e as Error).message);
      return { ...empty, error: (e as Error).message?.slice(0, 200) ?? "bedrock_error" };
    }

    return empty;
  },
};

// ─── Structural (Phase 1) ──────────────────────────────────────────────────────

function computeStructural(opts: {
  employeeCountRaw: string | null;
  totalFundingUsd: number | null;
  lastFundingAt: string | null;
  lastFundingType: string | null;
}): Pick<BenchmarkHints, "headcount" | "cashOnHand" | "monthlyBurn" | "journeyStage" | "sources"> {
  const sources: Record<string, string> = {};

  // Headcount — midpoint of CB/LinkedIn range string
  let headcount: string | null = null;
  if (opts.employeeCountRaw) {
    const mid = parseEmployeeRangeMidpoint(opts.employeeCountRaw);
    if (mid !== null) {
      headcount = String(mid);
      sources.headcount = `Estimated midpoint of "${opts.employeeCountRaw}" (from LinkedIn/Crunchbase)`;
    }
  }

  // Cash on hand — funding × decay heuristic
  let cashOnHand: string | null = null;
  if (opts.totalFundingUsd && opts.lastFundingAt) {
    const monthsElapsed = monthsSince(opts.lastFundingAt);
    if (monthsElapsed !== null && monthsElapsed >= 0) {
      // Assume 36-month runway from last raise; linear decay
      const fraction = Math.max(0, 1 - monthsElapsed / 36);
      const estimated = Math.round(opts.totalFundingUsd * fraction);
      if (estimated > 0) {
        cashOnHand = String(estimated);
        sources.cashOnHand = `Estimated from ${formatUsd(opts.totalFundingUsd)} raised ${Math.round(monthsElapsed)} mo ago (verify before using)`;
      }
    }
  }

  // Journey stage from funding type
  const journeyStage = deriveJourneyStage(opts.lastFundingType);
  if (journeyStage) sources.journeyStage = `Inferred from last funding type: "${opts.lastFundingType}"`;

  return { headcount, cashOnHand, monthlyBurn: null, journeyStage, sources };
}

function parseEmployeeRangeMidpoint(raw: string): number | null {
  // Handles "101-250", "51-200 employees", "201 to 500", "1,001-5,000", "10,001+"
  const cleaned = raw.replace(/[,\s]/g, "").toLowerCase().replace("employees", "");
  const rangeMatch = /^(\d+)[-–to]+(\d+)/.exec(cleaned);
  if (rangeMatch) {
    return Math.round((parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2);
  }
  const singleMatch = /^(\d+)\+?$/.exec(cleaned);
  if (singleMatch) return parseInt(singleMatch[1], 10);
  return null;
}

function monthsSince(isoDate: string): number | null {
  try {
    const then = new Date(isoDate).getTime();
    if (isNaN(then)) return null;
    return (Date.now() - then) / (1000 * 60 * 60 * 24 * 30);
  } catch {
    return null;
  }
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

const FUNDING_STAGE_MAP: Record<string, string> = {
  pre_seed:           "Pre-Revenue",
  preseed:            "Pre-Revenue",
  seed:               "Early Revenue",
  series_a:           "PMF",
  series_b:           "Scaling",
  series_c:           "Market Leader",
  series_d:           "Market Leader",
  angel:              "Early Revenue",
  convertible_note:   "Pre-Revenue",
  grant:              "Pre-Revenue",
};

function deriveJourneyStage(lastFundingType: string | null): string | null {
  if (!lastFundingType) return null;
  return FUNDING_STAGE_MAP[lastFundingType.toLowerCase().replace(/[-\s]/g, "_")] ?? null;
}

// ─── LLM normalization + merge ─────────────────────────────────────────────────

function normalizeLlm(raw: Record<string, unknown>): Partial<BenchmarkHints> {
  const pick = (k: string): string | null => {
    const v = raw[k];
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s.length ? s : null;
  };
  const sourcesRaw = (raw.sources ?? {}) as Record<string, unknown>;
  const sources: Record<string, string> = {};
  for (const k of ["arr", "payingCustomers", "notableCustomers", "currentChallenges", "headcount", "monthlyBurn"]) {
    const s = sourcesRaw[k];
    if (typeof s === "string" && s.trim()) sources[k] = s.trim();
  }
  return {
    arr: pick("arr"),
    payingCustomers: pick("payingCustomers"),
    notableCustomers: pick("notableCustomers"),
    currentChallenges: pick("currentChallenges"),
    headcount: pick("headcount"),
    monthlyBurn: pick("monthlyBurn"),
    sources,
  };
}

function merge(base: BenchmarkHints, llm: Partial<BenchmarkHints>): BenchmarkHints {
  return {
    arr:               llm.arr               ?? base.arr,
    payingCustomers:   llm.payingCustomers   ?? base.payingCustomers,
    notableCustomers:  llm.notableCustomers  ?? base.notableCustomers,
    currentChallenges: llm.currentChallenges ?? base.currentChallenges,
    headcount:         llm.headcount         ?? base.headcount,
    cashOnHand:        base.cashOnHand,
    monthlyBurn:       llm.monthlyBurn       ?? base.monthlyBurn,
    journeyStage:      base.journeyStage,
    sources:           { ...base.sources, ...llm.sources },
  };
}

// ─── Tool ─────────────────────────────────────────────────────────────

const HINTS_TOOL: Tool = {
  toolSpec: {
    name: "record_benchmark_hints",
    description: "Record any KPI signals found in the public text. Only populate fields where the value is EXPLICITLY stated.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          arr:               { type: "string", description: "ARR dollar figure if explicitly stated, e.g. '$2M'" },
          payingCustomers:   { type: "string", description: "Customer count if explicitly stated, e.g. '500' or '500+'" },
          notableCustomers:  { type: "string", description: "Comma-separated named customer companies" },
          currentChallenges: { type: "string", description: "Primary challenge this company solves, from their angle. Max 150 chars." },
          headcount:         { type: "string", description: "Explicit headcount number if stated, e.g. '50'. Not ranges." },
          monthlyBurn:       { type: "string", description: "Monthly net burn if explicitly stated, e.g. '$400K'. Never estimate." },
          sources: {
            type: "object",
            description: "Per-field attribution. Short note on where in the text you found each value.",
            properties: {
              arr:               { type: "string" },
              payingCustomers:   { type: "string" },
              notableCustomers:  { type: "string" },
              currentChallenges: { type: "string" },
              headcount:         { type: "string" },
              monthlyBurn:       { type: "string" },
            },
          },
        },
      },
    },
  },
};
