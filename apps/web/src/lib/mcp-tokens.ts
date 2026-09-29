import "server-only";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { mcpApiTokens, type McpApiToken } from "@/db/schema";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function generateRawToken(): string {
  return `fuel_${randomBytes(24).toString("base64url")}`;
}

export interface CreatedToken {
  id: string;
  rawToken: string;
  prefix: string;
  name: string;
}

export async function createMcpToken(opts: {
  accountId: string;
  userEmail: string;
  name: string;
  /** Days until expiry. Omit or pass `null` for no expiration. */
  expiresInDays?: number | null;
  /** Cognito groups the caller has right now. Snapshotted on the token. */
  groups?: string[] | null;
  /** "manual" (default) for tokens minted on /account/developer; "oauth"
   *  for tokens issued by the OAuth token endpoint. */
  issuedVia?: "manual" | "oauth";
  /** For OAuth-issued tokens: the DCR client this token belongs to. */
  clientId?: string | null;
}): Promise<CreatedToken> {
  const db = await getDb();
  const id = randomUUID();
  const raw = generateRawToken();
  const prefix = raw.slice(0, 13);
  const tokenHash = sha256(raw);
  const expiresAt =
    opts.expiresInDays != null && opts.expiresInDays > 0
      ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000)
      : null;
  await db.insert(mcpApiTokens).values({
    id,
    accountId: opts.accountId,
    userEmail: opts.userEmail,
    name: opts.name,
    tokenHash,
    tokenPrefix: prefix,
    expiresAt,
    groups: opts.groups ?? null,
    issuedVia: opts.issuedVia ?? "manual",
    clientId: opts.clientId ?? null,
  });
  return { id, rawToken: raw, prefix, name: opts.name };
}

export async function listMcpTokens(opts: {
  accountId: string;
  userEmail: string;
}): Promise<McpApiToken[]> {
  const db = await getDb();
  return db
    .select()
    .from(mcpApiTokens)
    .where(
      and(
        eq(mcpApiTokens.accountId, opts.accountId),
        eq(mcpApiTokens.userEmail, opts.userEmail),
      ),
    )
    .orderBy(desc(mcpApiTokens.createdAt));
}

export async function revokeMcpToken(opts: {
  id: string;
  userEmail: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(mcpApiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(mcpApiTokens.id, opts.id), eq(mcpApiTokens.userEmail, opts.userEmail)));
}

export async function resolveMcpToken(rawToken: string): Promise<McpApiToken | null> {
  if (!rawToken.startsWith("fuel_")) return null;
  const db = await getDb();
  const tokenHash = sha256(rawToken);
  const [row] = await db
    .select()
    .from(mcpApiTokens)
    .where(
      and(
        eq(mcpApiTokens.tokenHash, tokenHash),
        isNull(mcpApiTokens.revokedAt),
        // Null expiry = no expiration; otherwise must be in the future.
        or(isNull(mcpApiTokens.expiresAt), gt(mcpApiTokens.expiresAt, sql`now()`)),
      ),
    )
    .limit(1);
  if (!row) return null;
  // Touch lastUsedAt asynchronously — don't block the call.
  void db
    .update(mcpApiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(mcpApiTokens.id, row.id));
  return row;
}
