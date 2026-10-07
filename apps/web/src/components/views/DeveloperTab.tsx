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
import { ctaPrimaryStyle } from "@/lib/theme";
import {
  dataTableFrameStyle,
  dataTableStyle,
  dataTdActionsStyle,
  dataTdStyle,
  dataThStyle,
} from "./adminStyles";

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

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 12, padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
            flexWrap: "wrap",
            gap: 8,
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
          className="fuel-developer-token-form"
          action={(fd) => startTransition(() => createMcpTokenAction(fd))}
          style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}
        >
          <input
            name="name"
            placeholder="Token label (e.g. Claude desktop)"
            required
            style={{
              flex: "1 1 200px",
              minWidth: 0,
              padding: "10px 12px",
              background: t.panelAlt,
              color: t.ink,
              border: `1px solid ${t.rule}`,
              borderRadius: 8,
              fontFamily: t.sans,
              fontSize: 16,
              minHeight: 44,
              boxSizing: "border-box",
            }}
          />
          <select
            name="expiresInDays"
            defaultValue="90"
            aria-label="Expiration"
            style={{
              flex: "0 1 180px",
              padding: "10px 12px",
              background: t.panelAlt,
              color: t.ink,
              border: `1px solid ${t.rule}`,
              borderRadius: 8,
              fontFamily: t.sans,
              fontSize: 16,
              minHeight: 44,
              boxSizing: "border-box",
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
              alignItems: "center",
              ...ctaPrimaryStyle(t),
              borderRadius: 8,
              cursor: "pointer",
              display: "inline-flex",
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 600,
              justifyContent: "center",
              minHeight: 44,
              padding: "10px 16px",
              whiteSpace: "nowrap",
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
          <div className="fuel-data-table-frame fuel-table-wrap" style={dataTableFrameStyle(t)}>
            <table className="fuel-data-table" style={dataTableStyle()}>
              <thead>
                <tr>
                  <th style={dataThStyle(t)}>Name</th>
                  <th style={dataThStyle(t)}>Prefix</th>
                  <th style={dataThStyle(t)}>Created</th>
                  <th style={dataThStyle(t)}>Expires</th>
                  <th style={dataThStyle(t)}>Last used</th>
                  <th style={dataThStyle(t, { align: "right" })}></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((tk) => {
                  const exp = expiryLabel(tk.expiresAt);
                  return (
                  <tr key={tk.id}>
                    <td style={dataTdStyle(t, { primary: true, top: false })}>
                      {tk.name}
                    </td>
                    <td style={dataTdStyle(t, { mono: true, top: false })}>
                      {tk.tokenPrefix}…
                    </td>
                    <td style={dataTdStyle(t, { top: false })}>
                      {fmtDate(tk.createdAt)}
                    </td>
                    <td
                      style={{
                        ...dataTdStyle(t, { top: false }),
                        color: exp.expired ? t.warn : t.muted,
                        fontWeight: exp.expired ? 600 : 400,
                      }}
                    >
                      {exp.expired ? `Expired ${exp.text}` : exp.text}
                    </td>
                    <td style={dataTdStyle(t, { top: false })}>
                      {fmtDate(tk.lastUsedAt)}
                    </td>
                    <td style={dataTdActionsStyle(t)}>
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
          </div>
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
