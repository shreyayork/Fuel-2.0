import "server-only";
import { z } from "zod";
import type { Skill } from "../types";
import { addContextItem } from "@/lib/context";

const input = z.object({
  companyUuid: z.string().describe("fuel-data organization UUID"),
  content: z.string().min(1).describe("Note body (markdown or plain text)"),
  title: z.string().optional(),
});

export const addCompanyNoteSkill: Skill<z.infer<typeof input>, { id: string }> = {
  name: "addCompanyNote",
  title: "Add a private note to a company",
  description:
    "Write a private note about a company. The note is stored on the caller's account and visible to the rest of the account.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ companyUuid, content, title }, ctx) {
    const item = await addContextItem({
      accountId: ctx.accountId,
      companyUuid,
      kind: "note",
      title,
      content,
      authorEmail: ctx.userEmail,
      source: "user:manual",
    });
    return { id: item.id };
  },
};
