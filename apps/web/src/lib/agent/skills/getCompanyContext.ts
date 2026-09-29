import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { listContextForCompany } from "@/lib/context";

const input = z.object({
  companyUuid: z.string().describe("fuel-data organization UUID"),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export const getCompanyContextSkill: Skill<z.infer<typeof input>, {
  items: Array<{
    id: string;
    kind: string;
    title: string | null;
    content: string;
    author: string | null;
    source: string;
    occurredAt: string;
  }>;
}> = {
  name: "getCompanyContext",
  title: "Get private context for a company",
  description:
    "Return the caller account's private context items (notes, emails, meeting transcripts, HubSpot activity) for a company, most recent first.",
  inputSchema: input,
  readOnly: true,
  costTokens: 1_000,
  async execute({ companyUuid, limit }, ctx) {
    const rows = await listContextForCompany({
      accountId: ctx.accountId,
      companyUuid,
      limit: limit,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        content: r.content,
        author: r.authorEmail,
        source: r.source,
        occurredAt: r.occurredAt.toISOString(),
      })),
    };
  },
};
