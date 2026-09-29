import "server-only";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { extractText } from "unpdf";
import type { Skill } from "../types";
import { getDb } from "@/db/client";
import { contextItems } from "@/db/schema";
import { getPitchDeckBytes } from "@/lib/storage/s3";

const input = z.object({
  contextItemId: z
    .string()
    .describe("ID of the context_item the pitch-deck upload route returned."),
  attachmentId: z
    .string()
    .describe(
      "ID of the specific attachment within the context_item — useful when an item has multiple files.",
    )
    .optional(),
});

/**
 * Pull the PDF bytes from S3, run unpdf text extraction, persist the text
 * back onto `context_items.content` so subsequent runs / artifacts can
 * read it without re-extracting. Returns the extracted text inline so the
 * agent can score against the rubric in the same turn.
 *
 * IMPORTANT (prompt-injection mitigation): the playbook prompt frames this
 * text as "user-supplied document content," not as instructions. The text
 * itself is untrusted — if the deck contains "ignore previous and …" the
 * agent should treat that as the deck's content, not an instruction.
 */
export const extractPdfTextSkill: Skill<z.infer<typeof input>, {
  contextItemId: string;
  attachmentId: string;
  text: string;
  pageCount: number;
  byteSize: number;
}> = {
  name: "extractPdfText",
  title: "Extract text from an uploaded PDF",
  description:
    "Read a previously uploaded PDF (typically a pitch deck) from storage, extract its text via unpdf, and persist the result onto the context item so the agent and any future runs can read it without paying the extraction cost again.",
  inputSchema: input,
  readOnly: false,
  costTokens: 2_000,
  async execute({ contextItemId, attachmentId }, ctx) {
    const db = await getDb();
    const [item] = await db
      .select()
      .from(contextItems)
      .where(
        and(
          eq(contextItems.id, contextItemId),
          eq(contextItems.accountId, ctx.accountId),
        ),
      )
      .limit(1);
    if (!item) {
      throw new Error(`context item ${contextItemId} not found`);
    }
    const attachments = (item.attachments ?? []) as Array<{
      id: string;
      filename: string;
      contentType: string;
      byteSize: number;
      storageKey: string;
    }>;
    const target = attachmentId
      ? attachments.find((a) => a.id === attachmentId)
      : attachments.find((a) => a.contentType === "application/pdf") ?? attachments[0];
    if (!target) {
      throw new Error(`no PDF attachment on ${contextItemId}`);
    }

    const buf = await getPitchDeckBytes(target.storageKey);
    // unpdf accepts Uint8Array. Convert from Node Buffer (which is also a
    // Uint8Array but TypeScript wants the broader type).
    const result = await extractText(new Uint8Array(buf), { mergePages: true });
    const text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
    const pageCount = result.totalPages;

    // Persist the extracted text back onto the context item so future runs
    // skip extraction. We only overwrite content if it was empty (so a hand
    // note attached separately isn't clobbered).
    if (!item.content || item.content.trim().length === 0) {
      await db
        .update(contextItems)
        .set({ content: text })
        .where(eq(contextItems.id, contextItemId));
    }

    return {
      contextItemId,
      attachmentId: target.id,
      text,
      pageCount,
      byteSize: target.byteSize,
    };
  },
};
