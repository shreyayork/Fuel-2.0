import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { cachedFetch } from "@/lib/enrichment/cache";
import { scrapeWebsiteMarkdown } from "@/lib/enrichment/scrape-web";

const input = z.object({
  url: z
    .string()
    .describe("Fully qualified URL to fetch and convert to markdown."),
  maxChars: z
    .number()
    .int()
    .min(500)
    .max(40_000)
    .optional()
    .describe("Truncate the markdown body at this many characters. Default 12,000."),
});

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const url = new URL(u);
    return `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, "");
  } catch {
    return u;
  }
}

export const scrapeWebsiteMarkdownSkill: Skill<z.infer<typeof input>, {
  url: string;
  finalUrl?: string;
  title: string | null;
  description: string | null;
  markdown: string;
  status?: number;
  cached: boolean;
  error?: string;
}> = {
  name: "scrapeWebsiteMarkdown",
  title: "Fetch a webpage and return it as clean markdown",
  description:
    "Plain HTTP fetch + HTML-to-markdown conversion. Strips nav/header/footer/scripts so the output is signal-heavy — useful for reading VC portfolio pages, company homepages, blog posts, careers pages. Cached 7 days. No external API cost. Note: may fail or return partial content on SPA-heavy sites that require JS rendering.",
  inputSchema: input,
  readOnly: true,
  costTokens: 2_000,
  async execute({ url, maxChars }) {
    const normalized = normalizeUrl(url);
    const result = await cachedFetch({
      source: "webscrape:markdown",
      subjectKey: normalized,
      ttlSeconds: 7 * 24 * 3600,
      costTokens: 2_000,
      fetcher: () =>
        scrapeWebsiteMarkdown({ url: normalized, maxChars: maxChars ?? 12_000 }),
    });
    if (result.error || !result.data) {
      return {
        url: normalized,
        title: null,
        description: null,
        markdown: "",
        cached: result.cached,
        error: result.error,
      };
    }
    const data = result.data as {
      url: string;
      finalUrl: string;
      status: number;
      title: string | null;
      description: string | null;
      markdown: string;
      error?: string;
    };
    return {
      url: data.url,
      finalUrl: data.finalUrl,
      title: data.title,
      description: data.description,
      markdown: data.markdown,
      status: data.status,
      cached: result.cached,
      error: data.error,
    };
  },
};
