"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTheme } from "../ThemeContext";
import {
  createMcpTokenAction,
  revokeMcpTokenAction,
  dismissNewTokenAction,
} from "@/app/(app)/account/developer/actions";
import type { McpApiToken } from "@/db/schema";

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function expiryLabel(d: Date | string | null | undefined): { text: string; expired: boolean } {
  if (!d) return { text: "Never", expired: false };
  const date = typeof d === "string" ? new Date(d) : d;
  const expired = date.getTime() <= Date.now();
  return { text: fmtDate(date), expired };
}

export function DeveloperTab({
  tokens,
  newToken,
  userEmail,
}: {
  tokens: McpApiToken[];
  newToken: string | null;
  userEmail: string;
}) {
  const t = useTheme();
  const [, startTransition] = useTransition();

  const visible = tokens.filter((tk) => !tk.revokedAt);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {newToken ? (
        <div
          style={{
            background: t.panelAlt,
            border: `1px solid ${t.accent}`,
            padding: 16,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 600,
              color: t.ink,
              marginBottom: 6,
            }}
          >
            New token created — copy it now
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginBottom: 10 }}>
            This is the only time the full token will be shown. Store it somewhere safe.
          </div>
          <div
            style={{
              fontFamily: t.mono,
              fontSize: 12,
              color: t.ink,
              background: t.panel,
              border: `1px solid ${t.rule}`,
              padding: "10px 12px",
              borderRadius: 6,
              wordBreak: "break-all",
              userSelect: "all",
            }}
          >
            {newToken}
          </div>
          <form action={() => startTransition(() => dismissNewTokenAction())}>
            <button
              type="submit"
              style={{
                marginTop: 10,
                padding: "6px 12px",
                background: "transparent",
                color: t.muted,
                border: `1px solid ${t.rule}`,
                borderRadius: 6,
                fontFamily: t.sans,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </form>
        </div>
      ) : null}

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
          }}
        >
          <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink }}>
            MCP API tokens
          </div>
          <span style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
            {userEmail}
          </span>
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, marginBottom: 16 }}>
          Tokens authenticate Claude (or any MCP client) to your Fuel account. Each token acts on
          your behalf with your account&apos;s permissions.
        </div>

        <form
          action={(fd) => startTransition(() => createMcpTokenAction(fd))}
          style={{ display: "flex", gap: 8, marginBottom: 18 }}
        >
          <input
            name="name"
            placeholder="Token label (e.g. Claude desktop)"
            required
            style={{
              flex: 1,
              padding: "8px 10px",
              background: t.panelAlt,
              color: t.ink,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 13,
            }}
          />
          <select
            name="expiresInDays"
            defaultValue="90"
            aria-label="Expiration"
            style={{
              padding: "8px 10px",
              background: t.panelAlt,
              color: t.ink,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 13,
            }}
          >
            <option value="30">Expires in 30 days</option>
            <option value="90">Expires in 90 days</option>
            <option value="365">Expires in 1 year</option>
            <option value="">No expiration</option>
          </select>
          <button
            type="submit"
            style={{
              padding: "8px 14px",
              background: t.ink,
              color: t.bg,
              border: `1px solid ${t.ink}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Generate token
          </button>
        </form>

        {visible.length === 0 ? (
          <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, padding: "12px 0" }}>
            No tokens yet.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Prefix", "Created", "Expires", "Last used", ""].map((h) => (
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
              {visible.map((tk) => {
                const exp = expiryLabel(tk.expiresAt);
                return (
                <tr key={tk.id}>
                  <td
                    style={{
                      padding: "10px",
                      fontFamily: t.sans,
                      fontSize: 13,
                      color: t.ink,
                      borderBottom: `1px solid ${t.ruleSoft}`,
                    }}
                  >
                    {tk.name}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      fontFamily: t.mono,
                      fontSize: 12,
                      color: t.muted,
                      borderBottom: `1px solid ${t.ruleSoft}`,
                    }}
                  >
                    {tk.tokenPrefix}…
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
                    {fmtDate(tk.createdAt)}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      fontFamily: t.sans,
                      fontSize: 12,
                      color: exp.expired ? t.warn : t.muted,
                      borderBottom: `1px solid ${t.ruleSoft}`,
                      fontWeight: exp.expired ? 600 : 400,
                    }}
                  >
                    {exp.expired ? `Expired ${exp.text}` : exp.text}
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
                    {fmtDate(tk.lastUsedAt)}
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      borderBottom: `1px solid ${t.ruleSoft}`,
                      textAlign: "right",
                    }}
                  >
                    <form action={(fd) => startTransition(() => revokeMcpTokenAction(fd))}>
                      <input type="hidden" name="id" value={tk.id} />
                      <button
                        type="submit"
                        style={{
                          padding: "4px 10px",
                          background: "transparent",
                          color: t.muted,
                          border: `1px solid ${t.rule}`,
                          borderRadius: 6,
                          fontFamily: t.sans,
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        Revoke
                      </button>
                    </form>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 20 }}>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 15,
            fontWeight: 600,
            color: t.ink,
            marginBottom: 8,
          }}
        >
          Connect from Claude
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, marginBottom: 12 }}>
          Add Fuel as a remote MCP server in your Claude client.
        </div>
        <pre
          style={{
            background: t.panelAlt,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            padding: 12,
            fontFamily: t.mono,
            fontSize: 12,
            color: t.ink,
            overflow: "auto",
          }}
        >
{`{
  "mcpServers": {
    "fuel": {
      "url": "https://stage.v2.fuel.york.ie/api/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}`}
        </pre>
      </div>

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
            gap: 12,
          }}
        >
          <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink }}>
            Agent skills
          </div>
          <Link
            href="/account/developer/skills"
            style={{
              padding: "6px 12px",
              background: "transparent",
              color: t.ink,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 12,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            View skills →
          </Link>
        </div>
        <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted }}>
          The primitive tools Fuel&apos;s agent uses to compose playbooks — search
          companies, read context, write notes, compare benchmarks, scrape
          LinkedIn, etc. Anything you can call as an MCP client is listed with
          its input schema, side effects, and cost so you can wire Fuel into
          your own tooling.
        </div>
      </div>
    </div>
  );
}
