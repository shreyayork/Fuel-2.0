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
import { cachedFetch } from "@/lib/enrichment/cache";
import { scrapeWebsiteMarkdown } from "@/lib/enrichment/scrape-web";
import { detectTechStack } from "@/lib/enrichment/tech-stack-client";
import { normalizeDomain } from "@/lib/fuel-data";
import {
  type BusinessModel,
  normalizeBusinessModel,
} from "@/lib/business-model";
import {
  DEFAULT_EXTRACT_COMPANY_PROFILE_PROMPT,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { EXTRACT_COMPANY_PROFILE_SLUG } from "@/lib/system-playbooks/slugs";

/**
 * Read-only synthesizer skill. Takes a domain, reads the cached
 * website-markdown and tech-stack from previous scrapes (running them
 * on demand if absent), then asks Claude Haiku to extract a clean
 * structured company profile.
 *
 * Plays in two contexts:
 *   1. Founder onboarding `/onboard` flow calls it directly to pre-fill
 *      the confirm card (industry, location, founded year, LinkedIn URL).
 *   2. General agent runs can call it via tool-use when the playbook
 *      needs a fast structured snapshot of a company from its homepage.
 *
 * Cost: ~1k input + ~400 output tokens for typical homepages → budget
 * 2,500. Cache reuse for the scrape step is free.
 */
const input = z.object({
  domain: z
    .string()
    .min(3)
    .describe(
      "Canonical company domain (e.g. acme.com — protocol and www are stripped).",
    ),
});

export interface ExtractedProfileFields {
  name: string | null;
  shortDescription: string | null;
  industry: string | null;
  /** 4-digit year string when known. */
  foundedOn: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  /** Coarse business-model classification — drives KPI wizard adaption. */
  businessModel: BusinessModel | null;
}

export interface ExtractCompanyProfileResult extends ExtractedProfileFields {
  domain: string;
  websiteUrl: string;
  /** Per-field attribution — UI surfaces these as "Pulled from {source}". */
  sources: Partial<Record<keyof ExtractedProfileFields, string>>;
  /** Which underlying scrapes were cache-hit (free) vs. fresh. */
  cached: { website: boolean; techStack: boolean };
  error?: string;
}

const EXTRACTOR_MODEL_ID =
  process.env.BEDROCK_EXTRACTOR_MODEL_ID ??
  "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const MAX_MARKDOWN_CHARS = 12_000;

const bedrock = new BedrockRuntimeClient({});

export const extractCompanyProfileSkill: Skill<
  z.infer<typeof input>,
  ExtractCompanyProfileResult
> = {
  name: "extractCompanyProfile",
  title: "Extract a structured company profile from a domain",
  description:
    "Synthesizes the company's homepage scrape + detected tech stack into clean structured fields (name, industry, location, founded year, LinkedIn / Twitter URLs). Uses Claude Haiku for the extraction step; the underlying scrapes are cached. Best for first-touch profiling when only the domain is known.",
  inputSchema: input,
  readOnly: true,
  costTokens: 2_500,
  async execute({ domain }) {
    const cleanDomain = normalizeDomain(domain);
    const websiteUrl = cleanDomain
      ? `https://${cleanDomain}`
      : `https://${domain}`;

    const empty: ExtractCompanyProfileResult = {
      domain: cleanDomain ?? domain,
      websiteUrl,
      name: null,
      shortDescription: null,
      industry: null,
      foundedOn: null,
      locationCity: null,
      locationState: null,
      locationCountry: null,
      linkedinUrl: null,
      twitterUrl: null,
      businessModel: null,
      sources: {},
      cached: { website: false, techStack: false },
    };
    if (!cleanDomain) {
      return { ...empty, error: "invalid_domain" };
    }

    const [webResult, techResult] = await Promise.all([
      cachedFetch({
        source: "webscrape:markdown",
        subjectKey: websiteUrl,
        ttlSeconds: 7 * 24 * 3600,
        costTokens: 2_000,
        fetcher: () =>
          scrapeWebsiteMarkdown({ url: websiteUrl, maxChars: 12_000 }),
      }).catch(() => null),
      cachedFetch({
        source: "techstack:wappalyzer",
        subjectKey: websiteUrl,
        ttlSeconds: 30 * 24 * 3600,
        costTokens: 2_000,
        fetcher: () => detectTechStack({ url: websiteUrl }),
      }).catch(() => null),
    ]);

    const website = webResult?.data as
      | {
          title?: string | null;
          description?: string | null;
          markdown?: string | null;
        }
      | undefined;
    const techStack = techResult?.data as
      | { detected?: Array<{ name?: string; category?: string }> }
      | undefined;

    const markdown = (website?.markdown ?? "").slice(0, MAX_MARKDOWN_CHARS);
    if (!markdown.trim() && !website?.title) {
      return {
        ...empty,
        cached: {
          website: !!webResult?.cached,
          techStack: !!techResult?.cached,
        },
      };
    }

    const techHint =
      techStack?.detected
        ?.map((d) => `${d.name}${d.category ? ` (${d.category})` : ""}`)
        .filter(Boolean)
        .slice(0, 30)
        .join(", ") ?? "";

    const userText = [
      `Domain: ${cleanDomain}`,
      website?.title ? `Page title: ${website.title}` : null,
      website?.description ? `Meta description: ${website.description}` : null,
      techHint ? `Detected tech stack: ${techHint}` : null,
      "",
      "HOMEPAGE MARKDOWN:",
      markdown || "(empty)",
    ]
      .filter((l) => l != null)
      .join("\n");

    const { template: systemPrompt } = await loadSystemPlaybookTemplate(
      EXTRACT_COMPANY_PROFILE_SLUG,
      DEFAULT_EXTRACT_COMPANY_PROFILE_PROMPT,
    );

    try {
      const res = await bedrock.send(
        new ConverseCommand({
          modelId: EXTRACTOR_MODEL_ID,
          system: [{ text: systemPrompt }],
          messages: [
            { role: "user", content: [{ text: userText }] },
          ] as Message[],
          toolConfig: {
            tools: [PROFILE_TOOL],
            toolChoice: { tool: { name: "record_profile" } },
          },
          inferenceConfig: { maxTokens: 700, temperature: 0 },
        }),
      );
      const blocks = res.output?.message?.content ?? [];
      for (const block of blocks) {
        const tu = (block as { toolUse?: ToolUseBlock }).toolUse;
        if (tu?.name === "record_profile") {
          const raw = (tu.input ?? {}) as Record<string, unknown>;
          return {
            ...empty,
            ...normalize(raw),
            cached: {
              website: !!webResult?.cached,
              techStack: !!techResult?.cached,
            },
          };
        }
      }
    } catch (e) {
      console.warn(
        "[extractCompanyProfile] bedrock error",
        (e as Error).message,
      );
      return {
        ...empty,
        error: (e as Error).message?.slice(0, 200) ?? "bedrock_error",
        cached: {
          website: !!webResult?.cached,
          techStack: !!techResult?.cached,
        },
      };
    }
    return {
      ...empty,
      cached: { website: !!webResult?.cached, techStack: !!techResult?.cached },
    };
  },
};

function normalize(
  raw: Record<string, unknown>,
): Partial<ExtractCompanyProfileResult> {
  const pickStr = (k: string): string | null => {
    const v = raw[k];
    if (typeof v !== "string") return null;
    const s = v.trim();
    return s.length ? s : null;
  };
  const sources: ExtractCompanyProfileResult["sources"] = {};
  const sourcesRaw = (raw.sources ?? {}) as Record<string, unknown>;
  for (const k of [
    "name",
    "shortDescription",
    "industry",
    "foundedOn",
    "locationCity",
    "locationState",
    "locationCountry",
    "linkedinUrl",
    "twitterUrl",
    "businessModel",
  ] as const) {
    const s = sourcesRaw[k];
    if (typeof s === "string" && s.trim()) sources[k] = s.trim();
  }
  return {
    name: pickStr("name"),
    shortDescription: pickStr("shortDescription"),
    industry: pickStr("industry"),
    foundedOn: pickStr("foundedOn"),
    locationCity: pickStr("locationCity"),
    locationState: pickStr("locationState"),
    locationCountry: pickStr("locationCountry"),
    linkedinUrl: pickStr("linkedinUrl"),
    twitterUrl: pickStr("twitterUrl"),
    businessModel: normalizeBusinessModel(pickStr("businessModel")),
    sources,
  };
}

const PROFILE_TOOL: Tool = {
  toolSpec: {
    name: "record_profile",
    description:
      "Record the structured profile fields you extracted from the homepage. Omit any field you can't confidently extract.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          name: { type: "string" },
          shortDescription: { type: "string" },
          industry: { type: "string" },
          foundedOn: { type: "string" },
          locationCity: { type: "string" },
          locationState: { type: "string" },
          locationCountry: { type: "string" },
          linkedinUrl: { type: "string" },
          twitterUrl: { type: "string" },
          businessModel: {
            type: "string",
            enum: [
              "saas",
              "operating_services",
              "investment_firm",
              "operating_and_investment",
              "other",
            ],
          },
          sources: {
            type: "object",
            description:
              "Per-field attribution. Each key matches a field above; each value is a short note on where in the source we saw it.",
            properties: {
              name: { type: "string" },
              shortDescription: { type: "string" },
              industry: { type: "string" },
              foundedOn: { type: "string" },
              locationCity: { type: "string" },
              locationState: { type: "string" },
              locationCountry: { type: "string" },
              linkedinUrl: { type: "string" },
              twitterUrl: { type: "string" },
              businessModel: { type: "string" },
            },
          },
        },
      },
    },
  },
};
