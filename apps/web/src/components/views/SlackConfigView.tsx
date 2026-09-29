"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Chip, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";
import { toggleSlackChannelAction } from "@/app/(app)/account/integrations/slack/actions";

interface ConnectionSummary {
  id: string;
  installedByEmail: string;
  installedAt: string;
  status: string;
  team: string | null;
}

interface ChannelRow {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  numMembers?: number;
  enabled: boolean;
  lastEventAt: string | null;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export function SlackConfigView({
  connection,
  channels,
  fetchError,
  canManage,
}: {
  connection: ConnectionSummary | null;
  channels: ChannelRow[];
  fetchError: string | null;
  canManage: boolean;
}) {
  const t = useTheme();
  const [filter, setFilter] = useState<"all" | "joined" | "enabled">("joined");

  const filtered = channels.filter((c) => {
    if (filter === "all") return true;
    if (filter === "joined") return c.isMember;
    return c.enabled;
  });

  filtered.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <SectionHead
        t={t}
        title="Slack"
        subtitle="Pick the channels where investor updates land. Each message is captured as context and extracted against the signal catalog."
      />

      {!connection ? (
        <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 6, padding: 20 }}>
          <div style={{ fontFamily: t.sans, fontSize: 13, color: t.inkSoft, marginBottom: 12 }}>
            Slack isn&apos;t connected yet. Install the app to select channels.
          </div>
          <Link
            href="/api/integrations/slack/install"
            style={{
              display: "inline-block",
              padding: "8px 14px",
              background: t.ink,
              color: t.bg,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Connect Slack
          </Link>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              background: t.panelAlt,
              border: `1px solid ${t.ruleSoft}`,
              borderRadius: 6,
              marginBottom: 14,
              fontFamily: t.sans,
              fontSize: 12,
              color: t.muted,
            }}
          >
            <Chip t={t} tone="accent">Connected</Chip>
            <span>
              {connection.team ?? "workspace"} · installed by{" "}
              <span style={{ color: t.inkSoft }}>{connection.installedByEmail}</span>
            </span>
            <div style={{ flex: 1 }} />
            <Link
              href="/api/integrations/slack/install"
              style={{ color: t.accent, textDecoration: "none", fontSize: 11 }}
            >
              Reinstall
            </Link>
          </div>

          {fetchError ? (
            <div
              style={{
                padding: 10,
                marginBottom: 12,
                background: "#FF7A5922",
                border: `1px solid #FF7A5966`,
                borderRadius: 6,
                fontFamily: t.mono,
                fontSize: 11,
                color: t.warn,
              }}
            >
              Channel list fetch failed: {fetchError}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(["joined", "all", "enabled"] as const).map((k) => {
              const labels = { all: "All visible", joined: "Bot is a member", enabled: "Subscribed" };
              const active = filter === k;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: `1px solid ${active ? t.ink : t.rule}`,
                    background: active ? t.ink : "transparent",
                    color: active ? t.bg : t.inkSoft,
                    fontFamily: t.sans,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {labels[k]}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            <div style={{ fontFamily: t.mono, fontSize: 10, color: t.mutedSoft, alignSelf: "center" }}>
              {channels.length} channels visible
            </div>
          </div>

          <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: t.muted, fontFamily: t.sans, fontSize: 13 }}>
                No channels match this filter.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Channel", "Members", "Last event", ""].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          fontFamily: t.sans,
                          fontSize: 10,
                          color: t.muted,
                          borderBottom: `1px solid ${t.rule}`,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <ChannelRow key={c.id} t={t} channel={c} canManage={canManage} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ChannelRow({
  t,
  channel,
  canManage,
}: {
  t: ReturnType<typeof useTheme>;
  channel: ChannelRow;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td style={{ padding: "10px 12px", fontFamily: t.sans, fontSize: 13, color: t.ink, borderBottom: `1px solid ${t.ruleSoft}` }}>
        <span style={{ color: t.muted, marginRight: 4 }}>{channel.isPrivate ? "🔒" : "#"}</span>
        {channel.name}
        {channel.isPrivate ? (
          <Chip t={t} tone="ghost">private</Chip>
        ) : null}
        {!channel.isMember ? (
          <span style={{ marginLeft: 8, color: t.mutedSoft, fontSize: 11 }}>bot not joined</span>
        ) : null}
      </td>
      <td style={{ padding: "10px 12px", fontFamily: t.mono, fontSize: 11, color: t.muted, borderBottom: `1px solid ${t.ruleSoft}` }}>
        {channel.numMembers ?? "—"}
      </td>
      <td style={{ padding: "10px 12px", fontFamily: t.mono, fontSize: 11, color: t.muted, borderBottom: `1px solid ${t.ruleSoft}` }}>
        {fmtRelative(channel.lastEventAt)}
      </td>
      <td style={{ padding: "10px 12px", textAlign: "right", borderBottom: `1px solid ${t.ruleSoft}` }}>
        {canManage ? (
          <form
            action={(fd) => {
              fd.set("channelId", channel.id);
              fd.set("channelName", channel.name);
              fd.set("isPrivate", String(channel.isPrivate));
              fd.set("next", channel.enabled ? "" : "on");
              startTransition(() => toggleSlackChannelAction(fd));
            }}
          >
            <button
              type="submit"
              disabled={pending}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${channel.enabled ? t.accent : t.rule}`,
                background: channel.enabled ? t.accent : "transparent",
                color: channel.enabled ? t.bg : t.inkSoft,
                fontFamily: t.sans,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {pending ? "…" : channel.enabled ? "Subscribed" : "Subscribe"}
            </button>
          </form>
        ) : (
          <span style={{ color: t.muted, fontFamily: t.sans, fontSize: 11 }}>
            {channel.enabled ? "Subscribed" : "—"}
          </span>
        )}
      </td>
    </tr>
  );
}
