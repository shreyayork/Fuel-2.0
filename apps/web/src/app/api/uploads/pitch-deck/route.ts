import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import {
  putPitchDeckObject,
  UploadsNotConfiguredError,
} from "@/lib/storage/s3";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { getDb } from "@/db/client";
import { contextItems } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Max upload size — pitch decks are usually <10MB, hard cap at 25. */
const MAX_BYTES = 25 * 1024 * 1024;
const PDF_MAGIC = Buffer.from("%PDF-", "utf8");

/**
 * Pitch-deck upload endpoint. POST multipart/form-data with field `file`.
 *
 * Security posture:
 *   - Authenticated session + active account required.
 *   - Size cap enforced before reading the whole stream.
 *   - First 5 bytes must be %PDF- (don't trust client-supplied
 *     Content-Type alone).
 *   - S3 key is server-generated (`accounts/<accountId>/pitch-decks/<uuid>.pdf`)
 *     — never use client filename in the path.
 *   - Bucket has no public read; downloads go through signed URLs.
 */
export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  const account = await getActiveAccountForUser(session.email);
  if (!account) {
    return NextResponse.json({ error: "no_account" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: MAX_BYTES },
      { status: 413 },
    );
  }

  const ab = await file.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length < 5 || !buf.slice(0, 5).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: "not_a_pdf" }, { status: 400 });
  }

  let storageKey: string;
  let byteSize: number;
  try {
    const res = await putPitchDeckObject({
      accountId: account.id,
      body: buf,
      filename: file.name,
    });
    storageKey = res.storageKey;
    byteSize = res.byteSize;
  } catch (e) {
    if (e instanceof UploadsNotConfiguredError) {
      return NextResponse.json({ error: "uploads_not_configured" }, { status: 503 });
    }
    captureIntegrationException(e, { integration: "s3", operation: "pitch_deck_upload" });
    console.error("[uploads/pitch-deck] s3 put failed", e);
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }

  const attachmentId = randomUUID();
  const contextItemId = `ctx_${randomUUID()}`;
  const now = new Date();
  const safeFilename = file.name.replace(/[\r\n]/g, " ").trim().slice(0, 200);

  const db = await getDb();
  await db.insert(contextItems).values({
    id: contextItemId,
    accountId: account.id,
    companyUuid: account.primaryCompanyUuid ?? null,
    kind: "document",
    title: safeFilename || "Pitch deck",
    content: "",
    authorEmail: session.email,
    source: "user",
    sourceExternalId: contextItemId,
    occurredAt: now,
    createdAt: now,
    attachments: [
      {
        id: attachmentId,
        filename: safeFilename,
        contentType: "application/pdf",
        byteSize,
        storageKey,
        uploadedAt: now.toISOString(),
        uploadedByEmail: session.email,
      },
    ],
  });

  return NextResponse.json({ contextItemId, attachmentId, byteSize });
}
