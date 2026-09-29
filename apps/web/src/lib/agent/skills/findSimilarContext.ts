import "server-only";
import { z } from "zod";
import { sql } from "drizzle-orm";
import type { Skill } from "../types";
import { getDb } from "@/db/client";
import { embedText } from "@/lib/enrichment/embeddings";

const input = z.object({
  query: z
    .string()
    .min(3)
    .describe(
      "Natural-language query. We embed this and return the most semantically similar private context items across the caller account.",
    ),
  limit: z.number().int().min(1).max(50).optional().default(5),
  companyUuid: z
    .string()
    .optional()
    .describe("Optional: restrict results to a single company by fuel-data UUID."),
});

export const findSimilarContextSkill: Skill<
  z.infer<typeof input>,
  {
    query: string;
    items: Array<{
      id: string;
      companyUuid: string | null;
      kind: string;
      title: string | null;
      snippet: string;
      source: string;
      occurredAt: string;
      distance: number;
    }>;
    embeddingAvailable: boolean;
  }
> = {
  name: "findSimilarContext",
  title: "Find semantically similar private context items",
  description:
    "Embed a query via Titan v2 and return the caller account's most similar notes / emails / meeting transcripts / CRM activity using pgvector cosine distance. Use this when you need to pull related context from across companies (e.g., 'what have we learned about sales-led SaaS at PLG scale').",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ query, limit, companyUuid }, ctx) {
    const embedding = await embedText(query);
    if (!embedding) {
      return { query, items: [], embeddingAvailable: false };
    }
    const vec = `[${embedding.join(",")}]`;
    const db = await getDb();
    const rows = await db.execute(sql`
      SELECT
        id, company_uuid, kind, title, content, source, occurred_at,
        (embedding <=> ${vec}::vector) AS distance
      FROM context_items
      WHERE account_id = ${ctx.accountId}
        AND embedding IS NOT NULL
        ${companyUuid ? sql`AND company_uuid = ${companyUuid}` : sql``}
      ORDER BY embedding <=> ${vec}::vector
      LIMIT ${limit}
    `);
    type Row = {
      id: string;
      company_uuid: string | null;
      kind: string;
      title: string | null;
      content: string;
      source: string;
      occurred_at: Date;
      distance: number;
    };
    const items = (rows.rows as unknown as Row[]).map((r) => ({
      id: r.id,
      companyUuid: r.company_uuid,
      kind: r.kind,
      title: r.title,
      snippet: r.content.length > 400 ? r.content.slice(0, 400) + "…" : r.content,
      source: r.source,
      occurredAt: new Date(r.occurred_at).toISOString(),
      distance: Number(r.distance),
    }));
    return { query, items, embeddingAvailable: true };
  },
};
