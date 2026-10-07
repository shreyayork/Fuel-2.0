"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  backfillGranolaAction,
  inspectGranolaToolsAction,
} from "@/app/(app)/account/integrations/granola/actions";
import { Chip } from "../atoms";
import { useTheme } from "../ThemeContext";
import { ctaPrimaryStyle } from "@/lib/theme";

export interface GranolaRecentItem {
  id: string;
  companyUuid: string | null;
  title: string | null;
  occurredAt: string;
}

export function GranolaConfigView({
  connected,
  status,
  lastErrorReason,
  installedByEmail,
  installedAt,
  lastSyncAt,
  recentItems,
}: {
  connected: boolean;
  status?: "connected" | "disconnected" | "error" | null;
  lastErrorReason?: string | null;
  installedByEmail: string | null;
  installedAt: string | null;
  lastSyncAt: string | null;
  recentItems: GranolaRecentItem[];
}) {
  const hasError = connected && status === "error";
  const healthy = connected && status !== "error";
  const t = useTheme();
  const [pending, start] = useTransition();
  const [lastBackfillResult, setLastBackfillResult] = useState<string | null>(null);
  const [toolsDump, setToolsDump] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>
      <div>
        <h1 style={{ fontFamily: t.sans, fontSize: 22, fontWeight: 700, color: t.ink, margin: 0 }}>
          Granola
        </h1>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 13,
            color: t.muted,
            marginTop: 4,
            lineHeight: 1.55,
            maxWidth: 680,
          }}
        >
          When a Granola meeting finishes and an attendee&apos;s email domain matches a company on
          one of your watchlists or portfolios, the summary auto-syncs to that company&apos;s
          Context Feed, extracts signals, and generates Intelligence plus draft Initiatives.
          Runs every 15 minutes.
        </div>
      </div>

      <div
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 10,
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: t.sans, fontSize: 14, fontWeight: 600, color: t.ink }}>
              {hasError
                ? "Connection expired"
                : connected
                  ? "Connected"
                  : "Not connected"}
            </span>
            {hasError ? <Chip t={t} tone="warn">Reconnect needed</Chip> : null}
            {healthy ? <Chip t={t} tone="accent">Active</Chip> : null}
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginTop: 4 }}>
            {hasError ? (
              <>
                {lastErrorReason === "session_expired"
                  ? "Granola signed us out. Reinstall to resume syncing."
                  : `Last error: ${lastErrorReason ?? "unknown"}. Reinstall to resume syncing.`}
              </>
            ) : connected && installedByEmail ? (
              <>
                Connected by {installedByEmail}
                {installedAt ? ` · on ${new Date(installedAt).toLocaleDateString()}` : ""}
                {lastSyncAt
                  ? ` · last sync ${new Date(lastSyncAt).toLocaleString()}`
                  : " · no syncs yet"}
              </>
            ) : (
              "Connect Granola to start syncing."
            )}
          </div>
        </div>
        {hasError ? (
          <a
            href="/api/integrations/granola/install"
            style={{
              ...ctaPrimaryStyle(t),
              padding: "8px 14px",
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Reconnect Granola
          </a>
        ) : healthy ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() =>
                start(async () => {
                  setLastBackfillResult(null);
                  try {
                    await backfillGranolaAction();
                    setLastBackfillResult("Backfill complete.");
                  } catch (e) {
                    setLastBackfillResult(`Backfill failed: ${(e as Error).message.slice(0, 120)}`);
                  }
                })
              }
              disabled={pending}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: `1px solid ${t.rule}`,
                background: pending ? t.panelAlt : "transparent",
                color: pending ? t.muted : t.ink,
                fontFamily: t.sans,
                fontSize: 13,
                fontWeight: 500,
                cursor: pending ? "wait" : "pointer",
              }}
            >
              {pending ? "Syncing history…" : "Sync history"}
            </button>
            <button
              onClick={() =>
                start(async () => {
                  try {
                    const dump = await inspectGranolaToolsAction();
                    setToolsDump(dump);
                  } catch (e) {
                    setToolsDump(`inspect failed: ${(e as Error).message}`);
                  }
                })
              }
              disabled={pending}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: `1px solid ${t.rule}`,
                background: "transparent",
                color: t.ink,
                fontFamily: t.sans,
                fontSize: 13,
                fontWeight: 500,
                cursor: pending ? "wait" : "pointer",
              }}
            >
              Inspect tools
            </button>
          </div>
        ) : (
          <a
            href="/api/integrations/granola/install"
            style={{
              ...ctaPrimaryStyle(t),
              padding: "9px 16px",
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Connect Granola
          </a>
        )}
      </div>

      {lastBackfillResult ? (
        <div style={{ fontFamily: t.sans, fontSize: 12.5, color: t.muted }}>
          {lastBackfillResult}
        </div>
      ) : null}

      {toolsDump ? (
        <pre
          style={{
            background: t.panelAlt,
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            padding: 12,
            fontSize: 11,
            fontFamily: t.mono,
            color: t.ink,
            maxHeight: 320,
            overflow: "auto",
            whiteSpace: "pre",
          }}
        >
          {toolsDump}
        </pre>
      ) : null}

      <div>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 11,
            fontWeight: 600,
            color: t.muted,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Recent synced meetings
        </div>
        {recentItems.length === 0 ? (
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 13,
              color: t.mutedSoft,
              padding: "16px 0",
            }}
          >
            No meetings synced yet. They&apos;ll appear here once Granola runs a meeting with
            someone from a company on your watchlist or portfolio.
          </div>
        ) : (
          <div
            style={{
              background: t.panel,
              border: `1px solid ${t.rule}`,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {recentItems.map((item, i) => (
              <div
                key={item.id}
                style={{
                  padding: "12px 16px",
                  borderTop: i === 0 ? "none" : `1px solid ${t.ruleSoft}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  fontFamily: t.sans,
                  fontSize: 13,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: t.ink, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.title ?? "Untitled meeting"}
                  </div>
                  <div style={{ color: t.muted, fontSize: 11.5, marginTop: 2 }}>
                    {new Date(item.occurredAt).toLocaleString()}
                  </div>
                </div>
                {item.companyUuid ? (
                  <Link
                    href={`/company/${item.companyUuid}`}
                    style={{
                      fontSize: 12,
                      color: t.accent,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    View company →
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
