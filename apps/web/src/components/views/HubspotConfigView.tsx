"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Chip } from "../atoms";
import { useTheme } from "../ThemeContext";
import { DatePicker } from "../ui/DatePicker";
import {
  togglePipelineAction,
  renamePipelineConfigAction,
  saveActivityConfigAction,
  syncHubspotPipelinesAction,
} from "@/app/(app)/account/integrations/hubspot/actions";
import type { IntegrationConnection } from "@/db/schema";
import {
  evaluatePipelineSyncPoll,
  latestPipelineSyncFatal,
} from "@/lib/integrations/hubspot-sync-status";

interface PipelineRow {
  id: string;
  label: string;
  stageCount: number;
  config: { id: string; enabled: boolean; label: string | null } | null;
}

interface ActivityConfigRow {
  syncEmails: boolean;
  syncNotes: boolean;
  associationScope: string;
  backfillSince: string | null;
  lastEmailSyncAt: string | null;
  lastNoteSyncAt: string | null;
  syncState: Record<string, unknown> | null;
}

function Spinner({ color }: { color: string }) {
  return (
    <>
      <style jsx>{`
        @keyframes hubspot-config-spin { to { transform: rotate(360deg); } }
      `}</style>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 12,
          height: 12,
          borderRadius: "50%",
          border: `1.5px solid rgba(0,0,0,0.15)`,
          borderTopColor: color,
          animation: "hubspot-config-spin 700ms linear infinite",
        }}
      />
    </>
  );
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

/** HubSpot backfill stores ISO; form + DatePicker use `YYYY-MM-DD`. */
function backfillYmd(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function HubspotConfigView({
  connection,
  pipelines,
  fetchError,
  canManage,
  lastSyncAt,
  activityConfig,
  missingActivityScopes,
}: {
  connection: IntegrationConnection | null;
  pipelines: PipelineRow[];
  fetchError: string | null;
  canManage: boolean;
  lastSyncAt: string | null;
  activityConfig: ActivityConfigRow | null;
  missingActivityScopes: string[];
}) {
  const t = useTheme();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Sync state: `queueing` = action in flight, `syncing` = background job
  // still working. Completion uses server `queuedAt` vs `lastSyncAt` (not
  // client Date.now()) so clock skew / empty enabled sets cannot spin forever.
  const [activePoll, setActivePoll] = useState<{
    queuedAt: string;
    startedAtMs: number;
  } | null>(null);
  const [queueing, setQueueing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Force the "last sync N ago" label to re-render every 10s so it stays live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((x) => x + 1), 10_000);
    return () => clearInterval(iv);
  }, []);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!activePoll) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/pipeline-diag", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          configs?: Array<{
            enabled?: boolean;
            lastSyncAt?: string | null;
            syncState?: Record<string, unknown> | null;
          }>;
        };
        const configs = (data.configs ?? []).map((c) => ({
          enabled: c.enabled === true,
          lastSyncAt: c.lastSyncAt,
          syncState: c.syncState ?? null,
        }));
        const status = evaluatePipelineSyncPoll({
          configs,
          queuedAt: activePoll.queuedAt,
          pollStartedAtMs: activePoll.startedAtMs,
          nowMs: Date.now(),
        });
        if (status === "pending") return;
        setActivePoll(null);
        if (status === "timeout") {
          setSyncError(
            "Sync timed out before pipelines finished updating. Enable at least one pipeline, then try Sync now again.",
          );
        } else if (status === "no_enabled") {
          setSyncError("Enable at least one deal pipeline below before syncing.");
        } else {
          const fatal = latestPipelineSyncFatal(configs);
          setSyncError(
            fatal
              ? `Sync finished with an error: ${fatal.slice(0, 200)}`
              : null,
          );
        }
        router.refresh();
      } catch {
        // transient — keep polling until timeout
      }
    };
    poll();
    pollRef.current = setInterval(poll, 4_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activePoll, router]);

  const onSync = () => {
    if (queueing || activePoll) return;
    setSyncError(null);
    setQueueing(true);
    startTransition(async () => {
      try {
        const result = await syncHubspotPipelinesAction();
        if (!result.ok) {
          setSyncError(
            result.error === "no_enabled_pipelines"
              ? "Enable at least one deal pipeline below before syncing."
              : "Could not start sync — no active account.",
          );
          return;
        }
        setActivePoll({ queuedAt: result.queuedAt, startedAtMs: Date.now() });
      } catch {
        setSyncError("Could not start HubSpot sync. Try again.");
      } finally {
        setQueueing(false);
      }
    });
  };

  const status: "idle" | "queueing" | "syncing" = queueing
    ? "queueing"
    : activePoll
    ? "syncing"
    : "idle";

  const hasEnabledPipeline = pipelines.some((p) => p.config?.enabled);

  // If every deal pipeline is toggled Off while a Sync-now poll is running,
  // stop immediately — no lastSyncAt transition can occur.
  useEffect(() => {
    if (!activePoll || hasEnabledPipeline) return;
    setActivePoll(null);
    setSyncError("Enable at least one deal pipeline below before syncing.");
  }, [activePoll, hasEnabledPipeline]);

  if (!connection) {
    return (
      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 24 }}>
        <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink, marginBottom: 8 }}>
          HubSpot is not connected
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, marginBottom: 16 }}>
          Connect your HubSpot account to select which deal pipelines feed Fuel&apos;s Pipeline section.
        </div>
        <Link
          href="/account/integrations"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            background: t.ink,
            color: t.bg,
            border: `1px solid ${t.ink}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 12,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Go to Integrations →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <style>{`
        .hubspot-top-split {
          display: grid;
          gap: 16px;
          /* Integration left (2fr), Activities to Sync right (3fr) */
          grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
          align-items: start;
        }
        @media (max-width: 900px) {
          .hubspot-top-split {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="hubspot-top-split">
        <div
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            padding: 16,
            borderRadius: 6,
            display: "flex",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink }}>
                HubSpot
              </span>
              <Chip t={t} tone={connection.status === "connected" ? "positive" : "warn"}>
                {connection.status}
              </Chip>
            </div>
            <div
              style={{
                fontFamily: t.sans,
                fontSize: 12,
                color: t.muted,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span>installed by {connection.installedByEmail}</span>
              {connection.accountExternalId ? (
                <>
                  <span>•</span>
                  <span style={{ fontFamily: t.mono }}>hub {connection.accountExternalId}</span>
                </>
              ) : null}
              <span>•</span>
              <span>
                last sync {fmtRelative(lastSyncAt)}
                {status === "syncing" ? (
                  <span style={{ color: t.accent, marginLeft: 8, fontWeight: 500 }}>
                    · syncing…
                  </span>
                ) : null}
              </span>
            </div>
            {syncError ? (
              <div
                role="alert"
                style={{
                  marginTop: 8,
                  fontFamily: t.sans,
                  fontSize: 12,
                  color: "#b34141",
                }}
              >
                {syncError}
              </div>
            ) : null}
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={onSync}
              disabled={status !== "idle"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                background: status !== "idle" ? t.panelAlt : t.ink,
                color: status !== "idle" ? t.muted : t.bg,
                border: `1px solid ${status !== "idle" ? t.rule : t.ink}`,
                borderRadius: 6,
                fontFamily: t.sans,
                fontSize: 12,
                fontWeight: 500,
                cursor: status !== "idle" ? "not-allowed" : "pointer",
                minWidth: 120,
                justifyContent: "center",
                transition: "background 180ms ease",
                flexShrink: 0,
              }}
            >
              {status === "queueing" ? (
                <>
                  <Spinner color={t.muted} />
                  Queueing…
                </>
              ) : status === "syncing" ? (
                <>
                  <Spinner color={t.accent} />
                  Syncing…
                </>
              ) : (
                "Sync now"
              )}
            </button>
          ) : null}
        </div>
        <ActivitySyncCard
          canManage={canManage}
          config={activityConfig}
          missingScopes={missingActivityScopes}
        />
      </div>

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 20 }}>
        <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink, marginBottom: 14 }}>
          Deal Pipeline - Enable the pipelines to fetch the data from.
        </div>

        {fetchError ? (
          <div
            style={{
              background: t.panelAlt,
              border: `1px solid #b34141`,
              padding: "10px 14px",
              borderRadius: 6,
              fontFamily: t.mono,
              fontSize: 12,
              color: t.ink,
              marginBottom: 14,
            }}
          >
            Could not fetch pipelines: {fetchError.slice(0, 200)}
          </div>
        ) : null}

        {pipelines.length === 0 && !fetchError ? (
          <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted }}>
            No deal pipelines found in this HubSpot account.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Pipeline", "Stages", "Display label", "", "Enabled"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      fontFamily: t.sans,
                      fontSize: 11,
                      color: t.muted,
                      borderBottom: `1px solid ${t.rule}`,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pipelines.map((p) => (
                <tr key={p.id}>
                  <td
                    style={{
                      padding: "10px",
                      fontFamily: t.sans,
                      fontSize: 13,
                      color: t.ink,
                      borderBottom: `1px solid ${t.ruleSoft}`,
                    }}
                  >
                    {p.label}
                    <div style={{ fontFamily: t.mono, fontSize: 10, color: t.muted }}>{p.id}</div>
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      fontFamily: t.sans,
                      fontSize: 12,
                      color: t.muted,
                      borderBottom: `1px solid ${t.ruleSoft}`,
                    }}
                  >
                    {p.stageCount}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderBottom: `1px solid ${t.ruleSoft}`,
                    }}
                  >
                    {canManage && p.config?.enabled ? (
                      <form
                        action={(fd) => startTransition(() => renamePipelineConfigAction(fd))}
                        style={{ display: "flex", gap: 6 }}
                      >
                        <input type="hidden" name="providerPipelineId" value={p.id} />
                        <input type="hidden" name="providerPipelineName" value={p.label} />
                        <input
                          name="label"
                          defaultValue={p.config?.label ?? ""}
                          placeholder={p.label}
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            background: t.panelAlt,
                            color: t.ink,
                            border: `1px solid ${t.rule}`,
                            borderRadius: 4,
                            fontFamily: t.sans,
                            fontSize: 12,
                          }}
                        />
                        <button
                          type="submit"
                          style={{
                            padding: "4px 10px",
                            background: "transparent",
                            color: t.muted,
                            border: `1px solid ${t.rule}`,
                            borderRadius: 4,
                            fontFamily: t.sans,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
                        {p.config?.label ?? "—"}
                      </span>
                    )}
                  </td>
                  <td style={{ borderBottom: `1px solid ${t.ruleSoft}` }} />
                  <td
                    style={{
                      padding: "10px",
                      borderBottom: `1px solid ${t.ruleSoft}`,
                      textAlign: "right",
                    }}
                  >
                    {canManage ? (
                      <form action={(fd) => startTransition(() => togglePipelineAction(fd))}>
                        <input type="hidden" name="providerPipelineId" value={p.id} />
                        <input type="hidden" name="providerPipelineName" value={p.label} />
                        <input
                          type="hidden"
                          name="enabled"
                          value={p.config?.enabled ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          style={{
                            padding: "4px 12px",
                            background: p.config?.enabled ? t.ink : "transparent",
                            color: p.config?.enabled ? t.bg : t.ink,
                            border: `1px solid ${t.ink}`,
                            borderRadius: 12,
                            fontFamily: t.sans,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          {p.config?.enabled ? "On" : "Off"}
                        </button>
                      </form>
                    ) : (
                      <Chip t={t} tone={p.config?.enabled ? "positive" : "ghost"}>
                        {p.config?.enabled ? "on" : "off"}
                      </Chip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ActivitySyncCard({
  canManage,
  config,
  missingScopes,
}: {
  canManage: boolean;
  config: ActivityConfigRow | null;
  missingScopes: string[];
}) {
  const t = useTheme();
  // Loading follows the real saveActivityConfigAction promise. Must be set in
  // the submit handler (not a form Server Action), or React defers the paint.
  const [saving, setSaving] = useState(false);
  const [backfillValue, setBackfillValue] = useState(() =>
    backfillYmd(config?.backfillSince ?? null),
  );

  const syncEmails = config?.syncEmails ?? false;
  const syncNotes = config?.syncNotes ?? false;
  const associationScope =
    config?.associationScope === "company" || config?.associationScope === "contact"
      ? config.associationScope
      : "both";
  const backfillSince = config?.backfillSince ?? null;

  useEffect(() => {
    setBackfillValue(backfillYmd(backfillSince));
  }, [backfillSince]);

  const needsReauth = missingScopes.length > 0;

  const lastEmailResult = (config?.syncState as
    | {
        lastEmailResult?: {
          seen?: number;
          inserted?: number;
          updated?: number;
          skipped?: number;
          companiesScanned?: number;
          at?: string;
        };
      }
    | undefined)?.lastEmailResult;
  const lastNoteResult = (config?.syncState as
    | {
        lastNoteResult?: {
          seen?: number;
          inserted?: number;
          updated?: number;
          skipped?: number;
          companiesScanned?: number;
          at?: string;
        };
      }
    | undefined)?.lastNoteResult;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving || needsReauth || !canManage) return;
    // Set loading synchronously in the click/submit path — NOT inside a Server
    // Action form `action`. Updates inside form actions run as a transition and
    // often do not paint until the awaited server work finishes, so the button
    // never visibly enters loading despite the API running.
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    void (async () => {
      try {
        await saveActivityConfigAction(fd);
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        padding: 20,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 15,
          fontWeight: 600,
          color: t.ink,
          marginBottom: 4,
        }}
      >
        Activities to Sync
      </div>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 13,
          color: t.muted,
          marginBottom: 14,
        }}
      >
        Bring HubSpot emails and notes into each matched company&apos;s context feed.
        Activities are fetched <em>per watchlisted company</em> — emails or notes
        for HubSpot companies outside your portfolios and watchlists never leave
        HubSpot.
      </div>

      {needsReauth ? (
        <div
          style={{
            background: t.panelAlt,
            border: `1px solid #b38a41`,
            padding: "10px 14px",
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 12,
            color: t.ink,
            marginBottom: 14,
          }}
        >
          Reconnect HubSpot to grant the scopes activity sync needs:{" "}
          <span style={{ fontFamily: t.mono }}>{missingScopes.join(", ")}</span>
          .{" "}
          <a
            href="/api/integrations/hubspot/install"
            title="Re-run OAuth in place. Your pipeline configs stay."
            style={{ color: t.accent, textDecoration: "underline" }}
          >
            Reconnect →
          </a>
        </div>
      ) : null}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            fontFamily: t.sans,
            fontSize: 13,
            color: t.ink,
          }}
        >
          <input
            type="checkbox"
            name="syncEmails"
            value="true"
            defaultChecked={syncEmails}
            disabled={!canManage || needsReauth || saving}
          />
          Sync emails
          {lastEmailResult ? (
            <span
              style={{
                fontFamily: t.mono,
                fontSize: 11,
                color: t.muted,
                marginLeft: 8,
              }}
            >
              last run: {lastEmailResult.inserted ?? 0} new / {lastEmailResult.updated ?? 0} updated / {lastEmailResult.seen ?? 0} seen across {lastEmailResult.companiesScanned ?? 0} companies
            </span>
          ) : null}
        </label>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            fontFamily: t.sans,
            fontSize: 13,
            color: t.ink,
          }}
        >
          <input
            type="checkbox"
            name="syncNotes"
            value="true"
            defaultChecked={syncNotes}
            disabled={!canManage || needsReauth || saving}
          />
          Sync notes
          {lastNoteResult ? (
            <span
              style={{
                fontFamily: t.mono,
                fontSize: 11,
                color: t.muted,
                marginLeft: 8,
              }}
            >
              last run: {lastNoteResult.inserted ?? 0} new / {lastNoteResult.updated ?? 0} updated / {lastNoteResult.seen ?? 0} seen across {lastNoteResult.companiesScanned ?? 0} companies
            </span>
          ) : null}
        </label>

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
            Match via
          </span>
          {(["company", "contact", "both"] as const).map((v) => (
            <label
              key={v}
              style={{
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
                fontFamily: t.sans,
                fontSize: 12,
                color: t.ink,
              }}
            >
              <input
                type="radio"
                name="associationScope"
                value={v}
                defaultChecked={associationScope === v}
                disabled={!canManage || needsReauth || saving}
              />
              {v}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
            Backfill since
          </span>
          <input type="hidden" name="backfillSince" value={backfillValue} />
          <DatePicker
            t={t}
            value={backfillValue}
            onChange={setBackfillValue}
            onClear={() => setBackfillValue("")}
            disableFuture
            disabled={!canManage || needsReauth || saving}
            aria-label="Backfill since"
            placeholder="Pick a date"
            triggerStyle={{
              width: "auto",
              minWidth: 148,
              padding: "4px 8px",
              background: t.panelAlt,
              fontWeight: 400,
            }}
          />
          <span style={{ fontFamily: t.sans, fontSize: 11, color: t.muted }}>
            defaults to 90 days if blank
          </span>
        </div>

        {canManage ? (
          <div>
            <button
              type="submit"
              disabled={needsReauth || saving}
              aria-busy={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                background: needsReauth || saving ? t.panelAlt : t.ink,
                color: needsReauth || saving ? t.muted : t.bg,
                border: `1px solid ${needsReauth || saving ? t.rule : t.ink}`,
                borderRadius: 6,
                fontFamily: t.sans,
                fontSize: 12,
                fontWeight: 500,
                cursor: needsReauth || saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? (
                <>
                  <Spinner color={t.muted} />
                  Saving…
                </>
              ) : (
                "Save activity sync"
              )}
            </button>
          </div>
        ) : null}
      </form>

      {config && (config.lastEmailSyncAt || config.lastNoteSyncAt) ? (
        <div
          style={{
            marginTop: 12,
            fontFamily: t.mono,
            fontSize: 11,
            color: t.muted,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {config.lastEmailSyncAt ? (
            <span>emails: last synced {fmtRelative(config.lastEmailSyncAt)}</span>
          ) : null}
          {config.lastNoteSyncAt ? (
            <span>notes: last synced {fmtRelative(config.lastNoteSyncAt)}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
