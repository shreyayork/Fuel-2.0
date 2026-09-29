/**
 * Pure helpers for HubSpot "Sync now" poll completion.
 *
 * The UI stamps `syncState.queuedAt` on enabled pipeline configs, then polls
 * until each queued config's `lastSyncAt` advances past that marker (or the
 * marker is cleared by finalize). Client wall-clock must not gate completion —
 * only server timestamps — otherwise clock skew / empty enabled sets spin forever.
 */

export const HUBSPOT_PIPELINE_SYNC_POLL_TIMEOUT_MS = 5 * 60 * 1000;

export type PipelineSyncPollConfig = {
  lastSyncAt?: string | Date | null;
  syncState?: Record<string, unknown> | null;
  enabled?: boolean;
};

export type PipelineSyncPollStatus = "pending" | "complete" | "timeout" | "no_enabled";

function toMs(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Decide whether a Sync-now poll should keep going.
 *
 * Complete when no enabled config still carries our `queuedAt` AND at least one
 * enabled config has `lastSyncAt >= queuedAt` (finalize always stamps lastSyncAt).
 * If nothing was ever queued (`enabledCount === 0`), callers must not poll.
 * If every pipeline is disabled mid-poll, terminate as `no_enabled` — there is
 * no lastSyncAt transition left to wait for.
 */
export function evaluatePipelineSyncPoll(opts: {
  configs: PipelineSyncPollConfig[];
  queuedAt: string;
  pollStartedAtMs: number;
  nowMs: number;
  timeoutMs?: number;
}): PipelineSyncPollStatus {
  const timeoutMs = opts.timeoutMs ?? HUBSPOT_PIPELINE_SYNC_POLL_TIMEOUT_MS;
  if (opts.nowMs - opts.pollStartedAtMs >= timeoutMs) return "timeout";

  const queuedAtMs = toMs(opts.queuedAt);
  if (!queuedAtMs) return "timeout";

  const enabled = opts.configs.filter((c) => c.enabled === true);
  if (enabled.length === 0) return "no_enabled";

  const stillQueued = enabled.some(
    (c) => (c.syncState as { queuedAt?: unknown } | null | undefined)?.queuedAt === opts.queuedAt,
  );
  if (stillQueued) return "pending";

  const newest = enabled.reduce(
    (max, c) => Math.max(max, toMs(c.lastSyncAt ?? null)),
    0,
  );
  if (newest >= queuedAtMs) return "complete";

  // Marker cleared but lastSyncAt missing/stale — treat as still pending until timeout
  // (finalize should always set lastSyncAt; this covers a partial write race).
  return "pending";
}

/** Surface fatal from the newest lastResult, if any. */
export function latestPipelineSyncFatal(
  configs: PipelineSyncPollConfig[],
): string | null {
  let bestAt = 0;
  let fatal: string | null = null;
  for (const c of configs) {
    const lastResult = (c.syncState as { lastResult?: { fatal?: string; at?: string } } | null)
      ?.lastResult;
    if (!lastResult?.fatal) continue;
    const at = toMs(lastResult.at ?? null);
    if (at >= bestAt) {
      bestAt = at;
      fatal = lastResult.fatal;
    }
  }
  return fatal;
}
