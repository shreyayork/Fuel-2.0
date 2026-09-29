import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { integrationConnections } from "@/db/schema";

/** True when the error came back from Granola's MCP as an expired session. */
export function isGranolaSessionExpired(err: unknown): boolean {
  const msg = (err as Error | undefined)?.message ?? "";
  return /Session expired/i.test(msg) || /Please sign in again/i.test(msg);
}

/**
 * Flip a Granola connection to `status="error"` and stamp the reason into
 * metadata (merged, not overwritten). Lets the cron sync skip broken rows
 * and lets the UI surface a Reconnect prompt instead of showing "Active".
 */
export async function markGranolaConnectionError(
  connectionId: string,
  reason: string,
): Promise<void> {
  const db = await getDb();
  const errorPayload = {
    lastErrorAt: new Date().toISOString(),
    lastErrorReason: reason,
  };
  await db
    .update(integrationConnections)
    .set({
      status: "error",
      metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(errorPayload)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(integrationConnections.id, connectionId));
}
