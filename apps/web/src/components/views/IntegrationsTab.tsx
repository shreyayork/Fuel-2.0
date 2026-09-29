"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Chip } from "../atoms";
import { useTheme } from "../ThemeContext";
import { disconnectIntegrationAction } from "@/app/(app)/account/integrations/actions";
import type { IntegrationConnection } from "@/db/schema";

export interface ProviderSummary {
  id: IntegrationConnection["provider"];
  name: string;
  description: string;
  category: string;
  available: boolean;
  configured: boolean;
  configurePath?: string;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function IntegrationsTab({
  providers,
  connections,
  canManage,
  flash,
}: {
  providers: ProviderSummary[];
  connections: IntegrationConnection[];
  canManage: boolean;
  flash: { error?: string; connected?: string };
}) {
  const t = useTheme();
  const [, startTransition] = useTransition();
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {flash.connected ? (
        <div
          style={{
            background: t.panelAlt,
            border: `1px solid ${t.accent}`,
            padding: "10px 14px",
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 13,
            color: t.ink,
          }}
        >
          Connected {flash.connected}.
        </div>
      ) : null}
      {flash.error ? (
        <div
          style={{
            background: t.panelAlt,
            border: `1px solid #b34141`,
            padding: "10px 14px",
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 13,
            color: t.ink,
          }}
        >
          Connection failed: <span style={{ fontFamily: t.mono }}>{flash.error}</span>
        </div>
      ) : null}

      {providers.map((p) => {
        const conn = byProvider.get(p.id) ?? null;
        const installPath = `/api/integrations/${p.id}/install`;
        const blocked = p.available && !p.configured;
        return (
          <div
            key={p.id}
            style={{
              background: t.panel,
              border: `1px solid ${t.rule}`,
              padding: 18,
              borderRadius: 6,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span
                  style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink }}
                >
                  {p.name}
                </span>
                <Chip t={t} tone="ghost">{p.category}</Chip>
                {conn ? (
                  <Chip t={t} tone={conn.status === "connected" ? "positive" : "warn"}>
                    {conn.status}
                  </Chip>
                ) : !p.available ? (
                  <Chip t={t} tone="ghost">soon</Chip>
                ) : null}
              </div>
              <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, lineHeight: 1.5 }}>
                {p.description}
              </div>
              {conn ? (
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: t.sans,
                    fontSize: 12,
                    color: t.muted,
                    display: "flex",
                    gap: 14,
                  }}
                >
                  <span>installed by {conn.installedByEmail}</span>
                  <span>•</span>
                  <span>{fmtDate(conn.installedAt)}</span>
                  {conn.accountExternalId ? (
                    <>
                      <span>•</span>
                      <span style={{ fontFamily: t.mono }}>id {conn.accountExternalId}</span>
                    </>
                  ) : null}
                </div>
              ) : null}
              {blocked ? (
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: t.mono,
                    fontSize: 11,
                    color: t.muted,
                  }}
                >
                  OAuth secret not found. Create{" "}
                  <span>fuel2-{process.env.NEXT_PUBLIC_STAGE ?? "stage"}-{p.id}-oauth</span> in
                  Secrets Manager and redeploy.
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {conn && p.configurePath ? (
                <Link
                  href={p.configurePath}
                  style={{
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
                  Configure
                </Link>
              ) : null}
              {conn ? (
                canManage ? (
                  <>
                    <a
                      href={installPath}
                      title="Re-run the OAuth flow. Preserves pipeline + activity configurations."
                      style={{
                        padding: "6px 12px",
                        background: "transparent",
                        color: t.ink,
                        border: `1px solid ${t.rule}`,
                        borderRadius: 6,
                        fontFamily: t.sans,
                        fontSize: 12,
                        textDecoration: "none",
                      }}
                    >
                      Reconnect
                    </a>
                    <form
                      action={(fd) => {
                        if (
                          typeof window !== "undefined" &&
                          !window.confirm(
                            `Disconnect ${p.name}? This removes the stored token AND cascade-deletes any pipeline / activity configurations tied to this install. To refresh scopes without losing configs, use "Reconnect" instead.`,
                          )
                        ) {
                          return;
                        }
                        startTransition(() => disconnectIntegrationAction(fd));
                      }}
                    >
                      <input type="hidden" name="provider" value={p.id} />
                      <button
                        type="submit"
                        style={{
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
                        Disconnect
                      </button>
                    </form>
                  </>
                ) : null
              ) : p.available ? (
                <a
                  href={blocked ? "#" : installPath}
                  aria-disabled={blocked}
                  style={{
                    padding: "8px 14px",
                    background: blocked ? t.panelAlt : t.ink,
                    color: blocked ? t.muted : t.bg,
                    border: `1px solid ${blocked ? t.rule : t.ink}`,
                    borderRadius: 6,
                    fontFamily: t.sans,
                    fontSize: 12,
                    fontWeight: 500,
                    textDecoration: "none",
                    pointerEvents: blocked ? "none" : "auto",
                  }}
                >
                  Connect
                </a>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
