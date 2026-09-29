import "server-only";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { billingInvoicePdfKey } from "@/lib/credits/invoice-pdf/storage-key";
import { fuelInvoicePdfHeaders } from "@/lib/credits/invoices-shared";

export { billingInvoicePdfKey } from "@/lib/credits/invoice-pdf/storage-key";

/**
 * Centralized S3 client + helpers for the uploads bucket. The bucket
 * (`fuel-uploads-<stage>`) is provisioned by CDK; the bucket name is read
 * from `FUEL_UPLOADS_BUCKET` so the same code runs in every stage.
 *
 * In v1 only the founder-onboarding pitch-deck upload uses this. If more
 * upload kinds land, give each its own `lib/storage/<kind>.ts` thin wrapper
 * and keep the raw client here.
 */
const REGION = process.env.AWS_REGION ?? "us-east-2";
const BUCKET = process.env.FUEL_UPLOADS_BUCKET ?? "";

let cached: S3Client | null = null;
function client(): S3Client {
  if (cached) return cached;
  cached = new S3Client({ region: REGION });
  return cached;
}

export class UploadsNotConfiguredError extends Error {
  constructor() {
    super(
      "FUEL_UPLOADS_BUCKET is not set — provision the uploads bucket and configure the stage env.",
    );
    this.name = "UploadsNotConfiguredError";
  }
}

export interface PitchDeckUploadResult {
  storageKey: string;
  byteSize: number;
}

/**
 * Sanitize a client-supplied filename. We display this to the user but
 * never use it in a storage key — the key is a server-generated uuid.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[\r\n]/g, " ")
    .replace(/[/\\]/g, "-")
    .trim()
    .slice(0, 200) || "pitch-deck.pdf";
}

/** Server-generated key: never trust client input for filesystem paths. */
function pitchDeckKey(accountId: string): string {
  return `accounts/${accountId}/pitch-decks/${randomUUID()}.pdf`;
}

/**
 * Stream a PDF body into S3 under a server-generated key. Callers are
 * expected to have already validated content-type + size + magic bytes.
 */
export async function putPitchDeckObject(opts: {
  accountId: string;
  body: Buffer | Uint8Array;
  filename: string;
}): Promise<PitchDeckUploadResult> {
  if (!BUCKET) throw new UploadsNotConfiguredError();
  const storageKey = pitchDeckKey(opts.accountId);
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
      Body: opts.body,
      ContentType: "application/pdf",
      ContentDisposition: `attachment; filename="${sanitizeFilename(opts.filename)}"`,
      ServerSideEncryption: "AES256",
    }),
  );
  return { storageKey, byteSize: opts.body.byteLength };
}

/** Best-effort delete when a DB write fails after S3 put. */
export async function deleteUploadObject(storageKey: string): Promise<void> {
  if (!BUCKET) return;
  try {
    await client().send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }),
    );
  } catch {
    // Orphan cleanup is best-effort — do not mask the original failure.
  }
}

function dataRoomKey(accountId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
  return `accounts/${accountId}/data-room/${randomUUID()}.${safeExt}`;
}

export async function putDataRoomObject(opts: {
  accountId: string;
  body: Buffer | Uint8Array;
  filename: string;
  contentType: string;
}): Promise<PitchDeckUploadResult> {
  if (!BUCKET) throw new UploadsNotConfiguredError();
  const ext = opts.filename.split(".").pop()?.toLowerCase() || "bin";
  const storageKey = dataRoomKey(opts.accountId, ext);
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
      Body: opts.body,
      ContentType: opts.contentType,
      ContentDisposition: `attachment; filename="${sanitizeFilename(opts.filename)}"`,
      ServerSideEncryption: "AES256",
    }),
  );
  return { storageKey, byteSize: opts.body.byteLength };
}

/** Time-limited GET URL for downloads and agent skills. */
export async function getSignedUploadObjectUrl(storageKey: string): Promise<string> {
  if (!BUCKET) throw new UploadsNotConfiguredError();
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }),
    { expiresIn: 600 },
  );
}

/** @deprecated Use getSignedUploadObjectUrl */
export async function getSignedPitchDeckUrl(storageKey: string): Promise<string> {
  return getSignedUploadObjectUrl(storageKey);
}

/** Read the PDF bytes directly (used by extractPdfText on the agent server). */
export async function getPitchDeckBytes(storageKey: string): Promise<Buffer> {
  return getUploadObjectBytes(storageKey);
}

/** Read object bytes from the uploads bucket. */
export async function getUploadObjectBytes(storageKey: string): Promise<Buffer> {
  if (!BUCKET) throw new UploadsNotConfiguredError();
  const res = await client().send(
    new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }),
  );
  if (!res.Body) throw new Error("empty body from S3");
  // AWS SDK v3 Body is a Node Readable in the Node runtime — collect to Buffer.
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Deterministic key helper re-exported from invoice-pdf/storage-key. */

export async function putBillingInvoicePdfObject(opts: {
  accountId: string;
  stripeInvoiceId: string;
  body: Buffer | Uint8Array;
  filename: string;
}): Promise<{ storageKey: string; byteSize: number }> {
  if (!BUCKET) throw new UploadsNotConfiguredError();
  const storageKey = billingInvoicePdfKey(opts.accountId, opts.stripeInvoiceId);
  const headers = fuelInvoicePdfHeaders(
    sanitizeFilename(opts.filename),
    "attachment",
  );
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
      Body: opts.body,
      ContentType: headers["content-type"],
      ContentDisposition: headers["content-disposition"],
      ServerSideEncryption: "AES256",
    }),
  );
  return { storageKey, byteSize: opts.body.byteLength };
}
