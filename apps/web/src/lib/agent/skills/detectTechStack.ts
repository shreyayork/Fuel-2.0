import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { cachedFetch } from "@/lib/enrichment/cache";
import { detectTechStack } from "@/lib/enrichment/tech-stack-client";

const input = z.object({
  url: z
    .string()
    .describe("Fully qualified URL to analyze (e.g. https://example.com)."),
});

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const url = new URL(u);
    // Drop query/hash — same tech regardless.
    return `${url.protocol}//${url.host}${url.pathname === "/" ? "" : url.pathname}`.replace(/\/$/, "");
  } catch {
    return u;
  }
}

export const detectTechStackSkill: Skill<z.infer<typeof input>, {
  url: string;
  cached: boolean;
  detected: Array<{ name: string; category: string; evidence: string[] }>;
  status?: number;
  error?: string;
}> = {
  name: "detectTechStack",
  title: "Detect technologies used on a website",
  description:
    "Fetches a URL and returns the technologies detected from HTTP headers, HTML, script tags, cookies, and meta tags — frontend frameworks, clouds, CDNs, analytics, CRMs, payments, auth, observability. Cached 30 days. Self-hosted (no external API cost).",
  inputSchema: input,
  readOnly: true,
  costTokens: 2_000,
  async execute({ url }) {
    const normalized = normalizeUrl(url);
    const result = await cachedFetch({
      source: "techstack:wappalyzer",
      subjectKey: normalized,
      ttlSeconds: 30 * 24 * 3600,
      costTokens: 2_000,
      fetcher: async () => detectTechStack({ url: normalized }),
    });
    if (result.error || !result.data) {
      return {
        url: normalized,
        cached: result.cached,
        detected: [],
        error: result.error,
      };
    }
    const data = result.data as {
      url: string;
      status: number;
      detected: Array<{ name: string; category: string; evidence: string[] }>;
    };
    return {
      url: data.url,
      cached: result.cached,
      detected: data.detected,
      status: data.status,
    };
  },
};
