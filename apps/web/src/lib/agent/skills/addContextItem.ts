import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { addContextItem } from "@/lib/context";

const input = z.object({
  companyUuid: z.string().describe("fuel-data organization UUID"),
  kind: z.enum([
    "note",
    "email",
    "slack_message",
    "meeting_transcript",
    "hubspot_activity",
    "funding_event",
    "signal",
    "document",
    "other",
  ]),
  content: z.string().min(1),
  title: z.string().optional(),
  occurredAt: z
    .string()
    .datetime()
    .optional()
    .describe("ISO8601. Defaults to now."),
});

export const addContextItemSkill: Skill<z.infer<typeof input>> = {
  name: "addContextItem",
  title: "Record a context item on a company",
  description:
    "Attach a context item (note, email, meeting transcript, etc.) to a company. Content is embedded for similarity search on write.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ companyUuid, kind, content, title, occurredAt }, ctx) {
    const item = await addContextItem({
      accountId: ctx.accountId,
      companyUuid,
      kind,
      title,
      content,
      authorEmail: ctx.userEmail,
      source: "mcp",
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    });
    return { id: item.id };
  },
};
