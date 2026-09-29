import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluatePipelineSyncPoll,
  latestPipelineSyncFatal,
  HUBSPOT_PIPELINE_SYNC_POLL_TIMEOUT_MS,
} from "./hubspot-sync-status";

describe("evaluatePipelineSyncPoll", () => {
  const queuedAt = "2026-09-03T12:00:00.000Z";
  const queuedAtMs = Date.parse(queuedAt);
  const started = queuedAtMs;

  it("stays pending while queuedAt marker still present", () => {
    const status = evaluatePipelineSyncPoll({
      configs: [
        {
          enabled: true,
          lastSyncAt: null,
          syncState: { queuedAt },
        },
      ],
      queuedAt,
      pollStartedAtMs: started,
      nowMs: started + 10_000,
    });
    assert.equal(status, "pending");
  });

  it("completes when marker cleared and lastSyncAt >= queuedAt", () => {
    const status = evaluatePipelineSyncPoll({
      configs: [
        {
          enabled: true,
          lastSyncAt: "2026-09-03T12:00:05.000Z",
          syncState: {
            lastResult: { dealsSeen: 3, companiesResolved: 1, at: "2026-09-03T12:00:05.000Z" },
          },
        },
      ],
      queuedAt,
      pollStartedAtMs: started,
      nowMs: started + 10_000,
    });
    assert.equal(status, "complete");
  });

  it("does not complete on stale lastSyncAt older than queuedAt", () => {
    const status = evaluatePipelineSyncPoll({
      configs: [
        {
          enabled: true,
          lastSyncAt: "2026-09-03T11:59:00.000Z",
          syncState: {},
        },
      ],
      queuedAt,
      pollStartedAtMs: started,
      nowMs: started + 10_000,
    });
    assert.equal(status, "pending");
  });

  it("times out after configured window", () => {
    const status = evaluatePipelineSyncPoll({
      configs: [
        {
          enabled: true,
          lastSyncAt: null,
          syncState: { queuedAt },
        },
      ],
      queuedAt,
      pollStartedAtMs: started,
      nowMs: started + HUBSPOT_PIPELINE_SYNC_POLL_TIMEOUT_MS,
    });
    assert.equal(status, "timeout");
  });

  it("ignores disabled configs for completion", () => {
    const status = evaluatePipelineSyncPoll({
      configs: [
        {
          enabled: false,
          lastSyncAt: "2026-09-03T12:00:05.000Z",
          syncState: {},
        },
        {
          enabled: true,
          lastSyncAt: null,
          syncState: { queuedAt },
        },
      ],
      queuedAt,
      pollStartedAtMs: started,
      nowMs: started + 5_000,
    });
    assert.equal(status, "pending");
  });

  it("stops when every deal pipeline is disabled", () => {
    const status = evaluatePipelineSyncPoll({
      configs: [
        {
          enabled: false,
          lastSyncAt: null,
          syncState: { queuedAt },
        },
      ],
      queuedAt,
      pollStartedAtMs: started,
      nowMs: started + 5_000,
    });
    assert.equal(status, "no_enabled");
  });

  it("treats missing enabled flag as not enabled", () => {
    const status = evaluatePipelineSyncPoll({
      configs: [
        {
          lastSyncAt: null,
          syncState: { queuedAt },
        },
      ],
      queuedAt,
      pollStartedAtMs: started,
      nowMs: started + 5_000,
    });
    assert.equal(status, "no_enabled");
  });
});

describe("latestPipelineSyncFatal", () => {
  it("returns newest fatal message", () => {
    const fatal = latestPipelineSyncFatal([
      {
        syncState: {
          lastResult: { fatal: "old", at: "2026-09-03T12:00:00.000Z" },
        },
      },
      {
        syncState: {
          lastResult: { fatal: "hubspot_not_connected", at: "2026-09-03T12:01:00.000Z" },
        },
      },
    ]);
    assert.equal(fatal, "hubspot_not_connected");
  });

  it("returns null when no fatal", () => {
    assert.equal(
      latestPipelineSyncFatal([
        { syncState: { lastResult: { dealsSeen: 1, at: "2026-09-03T12:00:00.000Z" } } },
      ]),
      null,
    );
  });
});
