import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { contextItems } from "@/db/schema";

export async function createDocumentContextItem(opts: {
  accountId: string;
  companyUuid: string;
  authorEmail: string;
  typeId: string;
  typeLabel: string;
  /** User-facing source title when provided (preferred over type label). */
  title?: string;
  filename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  source: "data_room" | "intelligence";
}): Promise<{ contextItemId: string; attachmentId: string }> {
  const contextItemId = `ctx_${randomUUID()}`;
  const attachmentId = randomUUID();
  const now = new Date();
  const title = opts.title?.trim() || opts.typeLabel;

  const db = await getDb();
  // Empty placeholder only — parsed text + intelligence generation run after
  // upload. Skip onContextItemCreated here (empty content would stamp-and-skip
  // for any later extract path).
  await db.insert(contextItems).values({
    id: contextItemId,
    accountId: opts.accountId,
    companyUuid: opts.companyUuid,
    kind: "document",
    title,
    content: "",
    authorEmail: opts.authorEmail,
    source: `${opts.source}:${opts.typeId}`,
    sourceExternalId: contextItemId,
    occurredAt: now,
    attachments: [
      {
        id: attachmentId,
        filename: opts.filename,
        contentType: opts.contentType,
        byteSize: opts.byteSize,
        storageKey: opts.storageKey,
        uploadedAt: now.toISOString(),
        uploadedByEmail: opts.authorEmail,
      },
    ],
  });

  return { contextItemId, attachmentId };
}
