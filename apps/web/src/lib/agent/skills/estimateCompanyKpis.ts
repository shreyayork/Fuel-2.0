import "server-only";
import { z } from "zod";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { and, eq } from "drizzle-orm";
import type { Skill } from "../types";
import { getDb } from "@/db/client";
import { catalogCompanies } from "@/db/schema";
import { brightDataScrape } from "@/lib/enrichment/brightdata";
import { cachedFetch } from "@/lib/enrichment/cache";
import { normalizeLinkedInCompanyUrl } from "@/lib/enrichment/urls";
import { normalizeDomain } from "@/lib/fuel-data";
import {
  BUSINESS_MODEL_LABELS,
  SAAS_ONLY_FIELDS,
  isBusinessModel,
  type BusinessModel,
} from "@/lib/business-model";
import {
  DEFAULT_ESTIMATE_COMPANY_KPIS_PROMPT,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { ESTIMATE_COMPANY_KPIS_SLUG } from "@/lib/system-playbooks/slugs";

/**
 * Reads everything we already know about a company — website scrape,
 * tech stack, LinkedIn (if a URL is in the catalog), Crunchbase, funding
 * — and asks Claude Haiku to produce structured starting-point KPI
 * estimates with per-field source attribution.
 *
 * Used as the prefill source for guided playbooks like KPI Benchmark.
 * Every value is tagged with the source the agent inferred it from
 * (e.g. "From LinkedIn headcount", "From funding band heuristic") so
 * the wizard can show provenance next to each suggestion.
 *
 * The skill never persists numbers — it just emits estimates. The
 * founder has to touch each one in the wizard for it to count as
 * verified.
 */
const input = z.object({
  domain: z
    .string()
    .min(3)
    .describe(
      "Canonical company domain (e.g. acme.com — protocol and www stripped).",
    ),
});

export interface EstimatedKpiField {
  /** Suggested numeric value (or null if the model declined to estimate). */
  value: number | null;
  /** Short attribution shown next to the field in the UI. */
  source: string;
}

export interface EstimateCompanyKpisResult {
  domain: string;
  /** Per-field estimates keyed by `portfolio_updates` column name. */
  fields: Record<string, EstimatedKpiField>;
  /** Cache-hit flags for the underlying scrapes (debugging). */
  cached: { website: boolean; techStack: boolean; linkedin: boolean };
  error?: string;
}

const EXTRACTOR_MODEL_ID =
  process.env.BEDROCK_EXTRACTOR_MODEL_ID ??
  "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const MAX_MARKDOWN_CHARS = 10_000;

const bedrock = new BedrockRuntimeClient({});

export const estimateCompanyKpisSkill: Skill<
  z.infer<typeof input>,
  EstimateCompanyKpisResult
> = {
  name: "estimateCompanyKpis",
  title: "Estimate a company's headline KPIs from public signals",
  description:
    "Synthesizes a domain's homepage + tech stack + LinkedIn (if known) + Crunchbase + funding into starting-point KPI estimates (ARR, headcount, burn, NRR, etc.) for the guided KPI Benchmark wizard's prefill. Each field carries a source label. The values are suggestions — they only become user-verified when the founder confirms them in the wizard.",
  inputSchema: input,
  readOnly: true,
  costTokens: 3_000,
  async execute({ domain }, ctx) {
    const cleanDomain = normalizeDomain(domain);
    const websiteUrl = cleanDomain ? `https://${cleanDomain}` : `https://${domain}`;
    const empty: EstimateCompanyKpisResult = {
      domain: cleanDomain ?? domain,
      fields: {},
      cached: { website: false, techStack: false, linkedin: false },
    };
    if (!cleanDomain) return { ...empty, error: "invalid_domain" };

    // Pull whatever we know from the catalog row — accountId-scoped so a
    // wandering skill call can't fish across accounts. If no row exists
    // we still proceed; the LLM gets less context but the prompt copes.
    const db = await getDb();
    const accountId = ctx.accountId;
    const catalogRow = accountId
      ? await db
          .select()
          .from(catalogCompanies)
          .where(
            and(
              eq(catalogCompanies.accountId, accountId),
              eq(catalogCompanies.domain, cleanDomain),
            ),
          )
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : null;

    const linkedinUrl = catalogRow?.linkedinUrl ?? null;
    const totalFundingUsd = catalogRow?.totalFundingUsd ?? null;
    const numFundingRounds = catalogRow?.numFundingRounds ?? null;
    const foundedOn = catalogRow?.foundedOn ?? null;
    const businessModel: BusinessModel | null = isBusinessModel(
      catalogRow?.businessModel,
    )
      ? catalogRow!.businessModel
      : null;

    // Read cached scrapes — never trigger a fresh fetch (the onboarding
    // pipeline already populates these). If the cache is cold the skill
    // works with less context.
    const [webResult, techResult] = await Promise.all([
      cachedFetch({
        source: "webscrape:markdown",
        subjectKey: websiteUrl,
        ttlSeconds: 7 * 24 * 3600,
        costTokens: 2_000,
        fetcher: async () => null,
      }).catch(() => null),
      cachedFetch({
        source: "techstack:wappalyzer",
        subjectKey: websiteUrl,
        ttlSeconds: 30 * 24 * 3600,
        costTokens: 2_000,
        fetcher: async () => null,
      }).catch(() => null),
    ]);

    // LinkedIn scrape on cache-first basis. The fetcher CAN run if we
    // don't have a cached result and the catalog has a linkedinUrl —
    // that's the only fresh fetch we make. Bright Data charges per call;
    // cache TTL is 7d for company pages.
    let linkedinResult: Awaited<ReturnType<typeof cachedFetch>> | null = null;
    if (linkedinUrl) {
      try {
        const normalized = normalizeLinkedInCompanyUrl(linkedinUrl);
        linkedinResult = await cachedFetch({
          source: "brightdata:linkedin_company",
          subjectKey: normalized,
          ttlSeconds: 7 * 24 * 3600,
          costTokens: 5_000,
          fetcher: () => brightDataScrape({ kind: "linkedin_company", url: normalized }),
        });
      } catch {
        linkedinResult = null;
      }
    }

    const website = webResult?.data as
      | { title?: string | null; description?: string | null; markdown?: string | null }
      | undefined;
    const techStack = techResult?.data as
      | { detected?: Array<{ name?: string; category?: string }> }
      | undefined;
    const linkedinData = linkedinResult?.data as
      | {
          employees?: number | null;
          headcount?: number | null;
          industry?: string | null;
          specialties?: string[] | null;
          locations?: Array<{ city?: string; country?: string }>;
        }
      | undefined;

    const markdown = (website?.markdown ?? "").slice(0, MAX_MARKDOWN_CHARS);
    const techHint =
      techStack?.detected
        ?.map((d) => `${d.name}${d.category ? ` (${d.category})` : ""}`)
        .filter(Boolean)
        .slice(0, 20)
        .join(", ") ?? "";
    const employeeCountFromLinkedIn =
      typeof linkedinData?.employees === "number"
        ? linkedinData.employees
        : typeof linkedinData?.headcount === "number"
          ? linkedinData.headcount
          : null;

    const userText = [
      `Domain: ${cleanDomain}`,
      catalogRow?.name ? `Company name: ${catalogRow.name}` : null,
      catalogRow?.industry ? `Industry: ${catalogRow.industry}` : null,
      businessModel
        ? `Business model (user-confirmed): ${BUSINESS_MODEL_LABELS[businessModel]} [${businessModel}]`
        : null,
      foundedOn ? `Founded: ${foundedOn}` : null,
      totalFundingUsd != null
        ? `Total funding raised: $${totalFundingUsd.toLocaleString()}`
        : null,
      numFundingRounds != null
        ? `Funding rounds: ${numFundingRounds}`
        : null,
      employeeCountFromLinkedIn != null
        ? `LinkedIn employee count: ${employeeCountFromLinkedIn}`
        : null,
      linkedinData?.specialties?.length
        ? `LinkedIn specialties: ${linkedinData.specialties.slice(0, 10).join(", ")}`
        : null,
      techHint ? `Detected tech stack: ${techHint}` : null,
      website?.description ? `Meta description: ${website.description}` : null,
      "",
      "HOMEPAGE MARKDOWN:",
      markdown || "(empty)",
    ]
      .filter((l) => l != null)
      .join("\n");

    const { template: systemPrompt } = await loadSystemPlaybookTemplate(
      ESTIMATE_COMPANY_KPIS_SLUG,
      DEFAULT_ESTIMATE_COMPANY_KPIS_PROMPT,
    );

    try {
      const res = await bedrock.send(
        new ConverseCommand({
          modelId: EXTRACTOR_MODEL_ID,
          system: [{ text: systemPrompt }],
          messages: [{ role: "user", content: [{ text: userText }] }] as Message[],
          toolConfig: {
            tools: [KPI_TOOL],
            toolChoice: { tool: { name: "record_kpi_estimates" } },
          },
          inferenceConfig: { maxTokens: 1_400, temperature: 0 },
        }),
      );
      const blocks = res.output?.message?.content ?? [];
      for (const block of blocks) {
        const tu = (block as { toolUse?: ToolUseBlock }).toolUse;
        if (tu?.name === "record_kpi_estimates") {
          const raw = (tu.input ?? {}) as { fields?: Record<string, { value?: unknown; source?: unknown }> };
          const fields: Record<string, EstimatedKpiField> = {};
          for (const [k, v] of Object.entries(raw.fields ?? {})) {
            const value = typeof v?.value === "number" ? v.value : null;
            const source =
              typeof v?.source === "string" && v.source.trim()
                ? v.source.trim()
                : "AI estimate";
            fields[k] = { value, source };
          }
          // If the model didn't fill a known-good signal we already have
          // (e.g. headcount from LinkedIn), overwrite it with the ground
          // truth — same source label so the UI is unambiguous.
          if (employeeCountFromLinkedIn != null) {
            fields.fteCount = {
              value: employeeCountFromLinkedIn,
              source: "From LinkedIn headcount",
            };
          }
          // For non-SaaS business models, drop any SaaS-specific fields
          // the model emitted anyway — the wizard hides those inputs, so
          // suggestions for them would be confusing. `operating_and_investment`
          // keeps everything because the operating side may have ARR.
          if (
            businessModel &&
            businessModel !== "saas" &&
            businessModel !== "operating_and_investment"
          ) {
            for (const fieldName of SAAS_ONLY_FIELDS) {
              delete fields[fieldName];
            }
          }
          return {
            ...empty,
            fields,
            cached: {
              website: !!webResult?.cached,
              techStack: !!techResult?.cached,
              linkedin: !!linkedinResult?.cached,
            },
          };
        }
      }
    } catch (e) {
      console.warn("[estimateCompanyKpis] bedrock error", (e as Error).message);
      return {
        ...empty,
        error: (e as Error).message?.slice(0, 200) ?? "bedrock_error",
        cached: {
          website: !!webResult?.cached,
          techStack: !!techResult?.cached,
          linkedin: !!linkedinResult?.cached,
        },
      };
    }
    return {
      ...empty,
      cached: {
        website: !!webResult?.cached,
        techStack: !!techResult?.cached,
        linkedin: !!linkedinResult?.cached,
      },
    };
  },
};

const KPI_TOOL: Tool = {
  toolSpec: {
    name: "record_kpi_estimates",
    description:
      "Record per-field KPI estimates with source attribution. Omit any field you can't responsibly estimate.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          fields: {
            type: "object",
            description: "Map of `portfolio_updates` column name → { value, source }.",
            properties: {
              arrUsd: { type: "object", properties: { value: { type: "number" }, source: { type: "string" } } },
              arrGrowthYoyPct: { type: "object", properties: { value: { type: "number" }, source: { type: "string" } } },
              nrrPct: { type: "object", properties: { value: { type: "number" }, source: { type: "string" } } },
              logoRetentionPct: { type: "object", properties: { value: { type: "number" }, source: { type: "string" } } },
              grossMarginPct: { type: "object", properties: { value: { type: "number" }, source: { type: "string" } } },
              monthlyBurnUsd: { type: "object", properties: { value: { type: "number" }, source: { type: "string" } } },
              cashOnHandUsd: { type: "object", properties: { value: { type: "number" }, source: { type: "string" } } },
              fteCount: { type: "object", properties: { value: { type: "number" }, source: { type: "string" } } },
              paidCustomerCount: { type: "object", properties: { value: { type: "number" }, source: { type: "string" } } },
            },
          },
        },
        required: ["fields"],
      },
    },
  },
};
