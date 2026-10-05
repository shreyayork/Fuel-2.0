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
            className="fuel-integration-card"
            style={{
              alignItems: "center",
              background: t.panel,
              border: `1px solid ${t.rule}`,
              borderRadius: 12,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "1fr auto",
              padding: 18,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
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
                  className="fuel-integration-meta"
                  style={{
                    marginTop: 8,
                    fontFamily: t.sans,
                    fontSize: 12,
                    color: t.muted,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 14,
                  }}
                >
                  <span>installed by {conn.installedByEmail}</span>
                  <span aria-hidden>•</span>
                  <span>{fmtDate(conn.installedAt)}</span>
                  {conn.accountExternalId ? (
                    <>
                      <span aria-hidden>•</span>
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
            <div className="fuel-integration-card__actions" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {conn && p.configurePath ? (
                <Link
                  href={p.configurePath}
                  style={{
                    alignItems: "center",
                    background: t.ink,
                    border: `1px solid ${t.ink}`,
                    borderRadius: 8,
                    color: t.bg,
                    display: "inline-flex",
                    fontFamily: t.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    minHeight: 44,
                    padding: "8px 14px",
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
                        alignItems: "center",
                        background: "transparent",
                        border: `1px solid ${t.rule}`,
                        borderRadius: 8,
                        color: t.ink,
                        display: "inline-flex",
                        fontFamily: t.sans,
                        fontSize: 13,
                        minHeight: 44,
                        padding: "8px 12px",
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
                          alignItems: "center",
                          background: "transparent",
                          border: `1px solid ${t.rule}`,
                          borderRadius: 8,
                          color: t.muted,
                          cursor: "pointer",
                          display: "inline-flex",
                          fontFamily: t.sans,
                          fontSize: 13,
                          minHeight: 44,
                          padding: "8px 12px",
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
                    alignItems: "center",
                    background: blocked ? t.panelAlt : t.ink,
                    border: `1px solid ${blocked ? t.rule : t.ink}`,
                    borderRadius: 8,
                    color: blocked ? t.muted : t.bg,
                    display: "inline-flex",
                    fontFamily: t.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    minHeight: 44,
                    padding: "8px 14px",
                    pointerEvents: blocked ? "none" : "auto",
                    textDecoration: "none",
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
