import { z } from "zod";
import { PlaybooksView, type SkillSummary } from "@/components/views/PlaybooksView";
import { listSkills } from "@/lib/agent/skills";

export const dynamic = "force-dynamic";

function describeInputSchema(schema: z.ZodTypeAny): Array<{
  name: string;
  type: string;
  required: boolean;
  description?: string;
}> {
  if (!(schema instanceof z.ZodObject)) return [];
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const unwrap = (v: z.ZodTypeAny): z.ZodTypeAny =>
    v instanceof z.ZodOptional || v instanceof z.ZodDefault ? unwrap(v._def.innerType) : v;
  return Object.entries(shape).map(([name, s]) => {
    const base = unwrap(s);
    let type = "string";
    if (base instanceof z.ZodNumber) type = "number";
    else if (base instanceof z.ZodBoolean) type = "boolean";
    else if (base instanceof z.ZodArray) type = "array";
    else if (base instanceof z.ZodObject) type = "object";
    return {
      name,
      type,
      required: !(s instanceof z.ZodOptional || s instanceof z.ZodDefault),
      description: s.description,
    };
  });
}

export default async function PlaybooksPage() {
  const skills: SkillSummary[] = listSkills().map((s) => ({
    name: s.name,
    title: s.title,
    description: s.description,
    readOnly: s.readOnly,
    inputs: describeInputSchema(s.inputSchema),
    sideEffects: sideEffectsFor(s.name),
  }));

  return <PlaybooksView skills={skills} />;
}

function sideEffectsFor(name: string): string[] {
  switch (name) {
    case "searchCompanies":
      return ["Reads from fuel-data OpenSearch"];
    case "getCompany":
      return ["Reads from fuel-data OpenSearch"];
    case "getCompanyContext":
      return ["Reads from Postgres (context_items) scoped to caller account"];
    case "addCompanyNote":
      return ["Writes a row to context_items under the caller's account"];
    case "compareToBenchmark":
      return ["Reads seeded benchmarks"];
    case "scrapeLinkedInCompany":
    case "scrapeLinkedInProfile":
      return [
        "Calls Bright Data LinkedIn scraper (paid, ~$0.002/record)",
        "Caches result in enrichment_cache for 7 days",
      ];
    case "scrapeCrunchbaseCompany":
      return [
        "Calls Bright Data Crunchbase scraper (paid, ~$0.002/record)",
        "Caches result in enrichment_cache for 30 days",
      ];
    case "detectTechStack":
      return [
        "Invokes the self-hosted tech-stack Lambda (no external API cost)",
        "Caches result in enrichment_cache for 30 days",
      ];
    case "scrapeWebsiteMarkdown":
      return [
        "Plain HTTP fetch + HTML → markdown (no external API cost)",
        "Caches result in enrichment_cache for 7 days",
      ];
    case "findSimilarContext":
      return [
        "Embeds query via Amazon Titan v2 and runs pgvector cosine search",
        "Scoped to caller account, reads from context_items",
      ];
    default:
      return [];
  }
}
