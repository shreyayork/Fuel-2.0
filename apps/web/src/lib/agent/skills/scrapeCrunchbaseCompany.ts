import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { brightDataScrape } from "@/lib/enrichment/brightdata";
import { cachedFetch } from "@/lib/enrichment/cache";
import { normalizeCrunchbaseCompanyUrl } from "@/lib/enrichment/urls";

const input = z.object({
  crunchbaseUrl: z
    .string()
    .describe(
      "Crunchbase URL, crunchbase.com/organization/<slug>, or just the organization slug.",
    ),
});

export const scrapeCrunchbaseCompanySkill: Skill<z.infer<typeof input>, {
  url: string;
  cached: boolean;
  data: Record<string, unknown> | null;
  error?: string;
}> = {
  name: "scrapeCrunchbaseCompany",
  title: "Scrape a Crunchbase company profile",
  description:
    "Fetch a Crunchbase organization profile (funding rounds, investors, key people, acquisitions, categories) via Bright Data. Cached 30 days — funding data changes slowly.",
  inputSchema: input,
  readOnly: true,
  costTokens: 5_000,
  async execute({ crunchbaseUrl }) {
    const url = normalizeCrunchbaseCompanyUrl(crunchbaseUrl);
    const result = await cachedFetch({
      source: "brightdata:crunchbase_company",
      subjectKey: url,
      ttlSeconds: 30 * 24 * 3600,
      costTokens: 5_000,
      fetcher: () => brightDataScrape({ kind: "crunchbase_company", url }),
    });
    return {
      url,
      cached: result.cached,
      data: (result.data as Record<string, unknown>) ?? null,
      error: result.error,
    };
  },
};
