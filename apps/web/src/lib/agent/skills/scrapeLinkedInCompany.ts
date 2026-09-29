import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { brightDataScrape } from "@/lib/enrichment/brightdata";
import { cachedFetch } from "@/lib/enrichment/cache";
import { normalizeLinkedInCompanyUrl } from "@/lib/enrichment/urls";

const input = z.object({
  linkedinUrl: z
    .string()
    .describe(
      "LinkedIn company URL, linkedin.com/company/<slug>, or just the company slug.",
    ),
});

export const scrapeLinkedInCompanySkill: Skill<z.infer<typeof input>, {
  url: string;
  cached: boolean;
  data: Record<string, unknown> | null;
  error?: string;
}> = {
  name: "scrapeLinkedInCompany",
  title: "Scrape a LinkedIn company profile",
  description:
    "Fetch a LinkedIn company profile (employees, headcount, industry, specialties, locations, affiliated companies, recent updates) via Bright Data. Cached 7 days.",
  inputSchema: input,
  readOnly: true,
  costTokens: 5_000,
  async execute({ linkedinUrl }) {
    const url = normalizeLinkedInCompanyUrl(linkedinUrl);
    const result = await cachedFetch({
      source: "brightdata:linkedin_company",
      subjectKey: url,
      ttlSeconds: 7 * 24 * 3600,
      costTokens: 5_000,
      fetcher: () => brightDataScrape({ kind: "linkedin_company", url }),
    });
    return {
      url,
      cached: result.cached,
      data: (result.data as Record<string, unknown>) ?? null,
      error: result.error,
    };
  },
};
