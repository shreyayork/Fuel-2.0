import "server-only";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { enrichmentCache, type EnrichmentCacheRow } from "@/db/schema";
import { captureIntegrationException } from "@/lib/sentry/capture";

/**
 * Wraps a paid provider call in a read-through cache keyed on
 * (source, subjectKey). Same subject queried twice within TTL returns the
 * cached row — no extra API cost. Errors are also cached briefly so we
 * don't hammer a failing provider.
 */
export interface CachedFetchOptions<T> {
  source: string;
  subjectKey: string;
  ttlSeconds: number;
  /** TTL for negative/error results. Defaults to 5 minutes. */
  errorTtlSeconds?: number;
  costTokens: number;
  /** Set false when the caller emits richer provider telemetry. */
  captureFailure?: boolean;
  /** Provider call. Only invoked on cache miss or expiry. */
  fetcher: () => Promise<T>;
}

export interface CachedResult<T> {
  data: T | null;
  cached: boolean;
  error?: string;
}

export async function cachedFetch<T>(opts: CachedFetchOptions<T>): Promise<CachedResult<T>> {
  const db = await getDb();
  const now = new Date();

  const [hit] = await db
    .select()
    .from(enrichmentCache)
    .where(
      and(
        eq(enrichmentCache.source, opts.source),
        eq(enrichmentCache.subjectKey, opts.subjectKey),
      ),
    )
    .limit(1);

  if (hit && hit.expiresAt > now) {
    if (hit.error) return { data: null, cached: true, error: hit.error };
    return { data: hit.response as T, cached: true };
  }

  // Miss or stale — call provider, upsert fresh row.
  try {
    const data = await opts.fetcher();
    const expiresAt = new Date(now.getTime() + opts.ttlSeconds * 1000);
    await upsert({
      hitId: hit?.id,
      source: opts.source,
      subjectKey: opts.subjectKey,
      response: data as unknown as Record<string, unknown> | unknown[],
      error: null,
      expiresAt,
      costTokens: opts.costTokens,
    });
    return { data, cached: false };
  } catch (e) {
    const msg = (e as Error).message?.slice(0, 500) ?? "provider error";
    if (opts.captureFailure !== false) {
      captureIntegrationException(e, {
        integration: "enrichment",
        operation: "provider_fetch",
        level: "warning",
        context: { source: opts.source, subjectKey: opts.subjectKey },
      });
    }
    const expiresAt = new Date(
      now.getTime() + (opts.errorTtlSeconds ?? 300) * 1000,
    );
    await upsert({
      hitId: hit?.id,
      source: opts.source,
      subjectKey: opts.subjectKey,
      response: null,
      error: msg,
      expiresAt,
      costTokens: 0,
    });
    return { data: null, cached: false, error: msg };
  }
}

async function upsert(opts: {
  hitId?: string;
  source: string;
  subjectKey: string;
  response: Record<string, unknown> | unknown[] | null;
  error: string | null;
  expiresAt: Date;
  costTokens: number;
}): Promise<void> {
  const db = await getDb();
  const now = new Date();
  if (opts.hitId) {
    await db
      .update(enrichmentCache)
      .set({
        response: opts.response ?? null,
        error: opts.error,
        fetchedAt: now,
        expiresAt: opts.expiresAt,
        costTokens: opts.costTokens,
      })
      .where(eq(enrichmentCache.id, opts.hitId));
  } else {
    await db.insert(enrichmentCache).values({
      id: randomUUID(),
      source: opts.source,
      subjectKey: opts.subjectKey,
      response: opts.response ?? null,
      error: opts.error,
      fetchedAt: now,
      expiresAt: opts.expiresAt,
      costTokens: opts.costTokens,
    });
  }
}

export async function peek(opts: {
  source: string;
  subjectKey: string;
}): Promise<EnrichmentCacheRow | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(enrichmentCache)
    .where(
      and(
        eq(enrichmentCache.source, opts.source),
        eq(enrichmentCache.subjectKey, opts.subjectKey),
      ),
    )
    .limit(1);
  return row ?? null;
}
