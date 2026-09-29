/**
 * TEMP — wipe a user's Fuel 2.0 rows so onboarding / watchlist migration
 * can be re-tested. Public (no Cognito session) but gated by a static
 * secret. Disabled when STAGE=prod. Remove after F20A-126 verification.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  accountMembers,
  accounts,
  agentRuns,
  inviteTokens,
  mcpApiTokens,
  mcpOauthAuthorizationCodes,
  recentlyViewedCompanies,
  teamMembers,
  userPreferences,
  watchlistFollowers,
  watchlists,
  watchlistShares,
} from "@/db/schema";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEMP_SECRET = "thisisstatickeyfortempdeleteuserdatafromdatabse";

function secretMatches(provided: unknown): boolean {
  if (typeof provided !== "string" || provided.length === 0) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(TEMP_SECRET).digest();
  return timingSafeEqual(a, b);
}

function countRows(result: { rowCount?: number | null } | unknown[]): number {
  if (Array.isArray(result)) return result.length;
  return result.rowCount ?? 0;
}

export async function POST(req: Request): Promise<Response> {
  //return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (process.env.STAGE === "prod") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const headerSecret = req.headers.get("x-temp-secret");
  if (!secretMatches(record.secretKey ?? headerSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const email =
    typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const deleted = await db.transaction(async (tx) => {
      const createdAccounts = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(sql`lower(${accounts.creatorEmail}) = ${email}`);
      const createdAccountIds = createdAccounts.map((a) => a.id);

      const memberships = await tx
        .select({ accountId: accountMembers.accountId })
        .from(accountMembers)
        .where(sql`lower(${accountMembers.userEmail}) = ${email}`);
      const memberAccountIds = memberships.map((m) => m.accountId);

      const watchlistFilter =
        createdAccountIds.length > 0
          ? or(
              sql`lower(${watchlists.ownerEmail}) = ${email}`,
              inArray(watchlists.accountId, createdAccountIds),
            )
          : sql`lower(${watchlists.ownerEmail}) = ${email}`;

      const deletedWatchlists = countRows(
        await tx.delete(watchlists).where(watchlistFilter).returning({ id: watchlists.id }),
      );

      const deletedShares = countRows(
        await tx
          .delete(watchlistShares)
          .where(sql`lower(${watchlistShares.userEmail}) = ${email}`)
          .returning({ userEmail: watchlistShares.userEmail }),
      );
      const deletedFollowers = countRows(
        await tx
          .delete(watchlistFollowers)
          .where(sql`lower(${watchlistFollowers.userEmail}) = ${email}`)
          .returning({ userEmail: watchlistFollowers.userEmail }),
      );

      const deletedPrefs = countRows(
        await tx
          .delete(userPreferences)
          .where(sql`lower(${userPreferences.userEmail}) = ${email}`)
          .returning({ key: userPreferences.key }),
      );
      const deletedRecent = countRows(
        await tx
          .delete(recentlyViewedCompanies)
          .where(sql`lower(${recentlyViewedCompanies.userEmail}) = ${email}`)
          .returning({ id: recentlyViewedCompanies.id }),
      );
      const deletedTeamMembers = countRows(
        await tx
          .delete(teamMembers)
          .where(sql`lower(${teamMembers.userEmail}) = ${email}`)
          .returning({ teamId: teamMembers.teamId }),
      );
      const deletedInvites = countRows(
        await tx
          .delete(inviteTokens)
          .where(
            or(
              sql`lower(${inviteTokens.email}) = ${email}`,
              sql`lower(${inviteTokens.invitedByEmail}) = ${email}`,
            ),
          )
          .returning({ tokenHash: inviteTokens.tokenHash }),
      );
      const deletedMcpTokens = countRows(
        await tx
          .delete(mcpApiTokens)
          .where(sql`lower(${mcpApiTokens.userEmail}) = ${email}`)
          .returning({ id: mcpApiTokens.id }),
      );
      const deletedOauthCodes = countRows(
        await tx
          .delete(mcpOauthAuthorizationCodes)
          .where(sql`lower(${mcpOauthAuthorizationCodes.userEmail}) = ${email}`)
          .returning({ code: mcpOauthAuthorizationCodes.code }),
      );
      const deletedAgentRuns = countRows(
        await tx
          .delete(agentRuns)
          .where(sql`lower(${agentRuns.userEmail}) = ${email}`)
          .returning({ id: agentRuns.id }),
      );

      const deletedMemberships = countRows(
        await tx
          .delete(accountMembers)
          .where(sql`lower(${accountMembers.userEmail}) = ${email}`)
          .returning({ accountId: accountMembers.accountId }),
      );

      const deletedAccounts =
        createdAccountIds.length === 0
          ? 0
          : countRows(
              await tx
                .delete(accounts)
                .where(inArray(accounts.id, createdAccountIds))
                .returning({ id: accounts.id }),
            );

      return {
        accounts: deletedAccounts,
        accountMembers: deletedMemberships,
        watchlists: deletedWatchlists,
        watchlistShares: deletedShares,
        watchlistFollowers: deletedFollowers,
        userPreferences: deletedPrefs,
        recentlyViewedCompanies: deletedRecent,
        teamMembers: deletedTeamMembers,
        inviteTokens: deletedInvites,
        mcpApiTokens: deletedMcpTokens,
        mcpOauthAuthorizationCodes: deletedOauthCodes,
        agentRuns: deletedAgentRuns,
        createdAccountIds,
        memberAccountIds,
      };
    });

    return NextResponse.json({
      ok: true,
      email,
      deleted,
    });
  } catch (error) {
    captureIntegrationException(error, {
      integration: "temp_delete_user",
      operation: "wipe",
    });
    return NextResponse.json({ error: "wipe_failed" }, { status: 500 });
  }
}
