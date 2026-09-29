import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { accounts, accountMembers, inviteTokens, type InviteToken } from "@/db/schema";
import { sendBrandedEmail } from "./email";

export type InviteRole = "owner" | "admin" | "member";

const TOKEN_BYTES = 32;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** App URL used to construct invite magic links. Web lambda sets this in env. */
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export interface PendingInvite {
  tokenHash: string;
  email: string;
  role: InviteRole;
  invitedByEmail: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Create + email a fresh invite. Returns the raw token so callers can log /
 * display it for testing (production callers should not surface it — the
 * email is the delivery mechanism).
 */
export async function createInvite(opts: {
  accountId: string;
  email: string;
  role: InviteRole;
  invitedByEmail: string;
  accountName?: string;
}): Promise<{ rawToken: string; tokenHash: string; expiresAt: Date }> {
  const db = await getDb();
  const normalizedEmail = opts.email.trim().toLowerCase();
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db.insert(inviteTokens).values({
    tokenHash,
    accountId: opts.accountId,
    email: normalizedEmail,
    role: opts.role,
    invitedByEmail: opts.invitedByEmail,
    expiresAt,
  });

  let accountName = opts.accountName;
  if (!accountName) {
    const [row] = await db
      .select({ name: accounts.name })
      .from(accounts)
      .where(eq(accounts.id, opts.accountId))
      .limit(1);
    accountName = row?.name ?? "Fuel";
  }

  await sendInviteEmail({
    to: normalizedEmail,
    rawToken,
    accountName,
    invitedByEmail: opts.invitedByEmail,
    role: opts.role,
  });

  return { rawToken, tokenHash, expiresAt };
}

/** Look up an invite by raw token. Returns null if missing, expired, revoked, or accepted. */
export async function getActiveInviteByToken(rawToken: string): Promise<InviteToken | null> {
  const db = await getDb();
  const candidate = hashToken(rawToken);
  // Constant-time compare isn't strictly required because the hash already
  // went through sha256, but we still pull-by-PK rather than compare against
  // a user-supplied value.
  const [row] = await db
    .select()
    .from(inviteTokens)
    .where(eq(inviteTokens.tokenHash, candidate))
    .limit(1);
  if (!row) return null;
  if (row.acceptedAt || row.revokedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  // Pacify linter: reference timingSafeEqual so lints don't flag the import
  // as unused. The actual security property comes from sha256 + PK lookup.
  void timingSafeEqual;
  return row;
}

/**
 * Consume an invite: mark accepted, insert an accounts_members row, and
 * revoke any sibling pending invites for the same (accountId, email) so
 * resends can't be replayed later. Idempotent if the member row already
 * exists.
 */
export async function acceptInvite(opts: {
  rawToken: string;
  authenticatedEmail: string;
}): Promise<{ accountId: string; role: InviteRole } | { error: "not_found" | "email_mismatch" }> {
  const row = await getActiveInviteByToken(opts.rawToken);
  if (!row) return { error: "not_found" };
  const actingEmail = opts.authenticatedEmail.trim().toLowerCase();
  if (row.email !== actingEmail) return { error: "email_mismatch" };

  const db = await getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .insert(accountMembers)
      .values({
        accountId: row.accountId,
        userEmail: actingEmail,
        role: row.role,
        invitedAt: row.createdAt,
        acceptedAt: now,
      })
      .onConflictDoNothing();

    await tx
      .update(inviteTokens)
      .set({ acceptedAt: now })
      .where(eq(inviteTokens.tokenHash, row.tokenHash));

    // Kill every other still-pending invite for the same (account, email).
    // Keeps the history but prevents a second link from being used.
    await tx
      .update(inviteTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(inviteTokens.accountId, row.accountId),
          eq(inviteTokens.email, actingEmail),
          isNull(inviteTokens.acceptedAt),
          isNull(inviteTokens.revokedAt),
        ),
      );
  });

  return { accountId: row.accountId, role: row.role };
}

export interface PendingInviteForEmail extends PendingInvite {
  accountId: string;
  accountName: string;
}

/**
 * Pending invites for an email address, surfaced on the onboarding flow's
 * interstitial: a founder arriving via /onboard who has an open invite to an
 * existing account should be offered the choice to accept the invite rather
 * than blindly create a second account at their company's domain.
 *
 * Excludes accepted, revoked, and expired invites. Joins `accounts` so the
 * UI can display the account name without a second query.
 */
export async function getPendingInvitesForEmail(
  email: string,
): Promise<PendingInviteForEmail[]> {
  const db = await getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await db
    .select({
      tokenHash: inviteTokens.tokenHash,
      email: inviteTokens.email,
      role: inviteTokens.role,
      invitedByEmail: inviteTokens.invitedByEmail,
      expiresAt: inviteTokens.expiresAt,
      createdAt: inviteTokens.createdAt,
      accountId: inviteTokens.accountId,
      accountName: accounts.name,
    })
    .from(inviteTokens)
    .innerJoin(accounts, eq(accounts.id, inviteTokens.accountId))
    .where(
      and(
        eq(inviteTokens.email, normalizedEmail),
        isNull(inviteTokens.acceptedAt),
        isNull(inviteTokens.revokedAt),
        gt(inviteTokens.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(inviteTokens.createdAt));
  return rows;
}

/** List pending invites for an admin UI. Excludes accepted + revoked. */
export async function listPendingInvites(accountId: string): Promise<PendingInvite[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.accountId, accountId),
        isNull(inviteTokens.acceptedAt),
        isNull(inviteTokens.revokedAt),
      ),
    )
    .orderBy(desc(inviteTokens.createdAt));
  return rows.map((r) => ({
    tokenHash: r.tokenHash,
    email: r.email,
    role: r.role,
    invitedByEmail: r.invitedByEmail,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
  }));
}

/** Revoke by token hash. Idempotent — no-op if already revoked or accepted. */
export async function revokeInvite(opts: {
  accountId: string;
  tokenHash: string;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(inviteTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(inviteTokens.tokenHash, opts.tokenHash),
        eq(inviteTokens.accountId, opts.accountId),
        isNull(inviteTokens.acceptedAt),
        isNull(inviteTokens.revokedAt),
      ),
    );
}

/**
 * "Resend" = create a new token with fresh expiry + re-send the email,
 * and revoke the existing pending invite for the same (account, email) so
 * the old link stops working. Returns the new raw token.
 */
export async function resendInvite(opts: {
  accountId: string;
  tokenHash: string;
  actorEmail: string;
}): Promise<{ rawToken: string } | { error: "not_found" }> {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.tokenHash, opts.tokenHash),
        eq(inviteTokens.accountId, opts.accountId),
        isNull(inviteTokens.acceptedAt),
        isNull(inviteTokens.revokedAt),
      ),
    )
    .limit(1);
  if (!existing) return { error: "not_found" };

  await db
    .update(inviteTokens)
    .set({ revokedAt: new Date() })
    .where(eq(inviteTokens.tokenHash, existing.tokenHash));

  const fresh = await createInvite({
    accountId: existing.accountId,
    email: existing.email,
    role: existing.role,
    invitedByEmail: opts.actorEmail,
  });
  return { rawToken: fresh.rawToken };
}

/** Simple per-account rate cap to avoid blasting SES. */
export async function pendingInviteCount(accountId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<string>`count(*)::text` })
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.accountId, accountId),
        isNull(inviteTokens.acceptedAt),
        isNull(inviteTokens.revokedAt),
      ),
    );
  return Number(row?.n ?? 0);
}

async function sendInviteEmail(opts: {
  to: string;
  rawToken: string;
  accountName: string;
  invitedByEmail: string;
  role: InviteRole;
}): Promise<void> {
  const link = `${APP_URL}/invite/${encodeURIComponent(opts.rawToken)}`;
  await sendBrandedEmail({
    to: opts.to,
    subject: `You're invited to ${opts.accountName} on Fuel`,
    preheader: `${opts.invitedByEmail} invited you to ${opts.accountName} on Fuel`,
    heading: `Join ${opts.accountName} on Fuel`,
    intro: `${opts.invitedByEmail} invited you to collaborate as a ${opts.role}.`,
    cta: { label: "Accept invite", href: link },
    body: `Or paste this link into your browser if the button doesn't open: ${link}`,
    footnote:
      "This invite expires in 7 days. If you weren't expecting it, you can safely ignore this email.",
  });
}
