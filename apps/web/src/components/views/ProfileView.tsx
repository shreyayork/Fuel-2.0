"use client";

import Link from "next/link";
import { Avatar, Chip, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";
import { ChangePasswordCard } from "./ChangePasswordCard";
import type { SidebarUser } from "../Shell";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function label(t: ReturnType<typeof useTheme>): React.CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 500,
    color: t.muted,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 20, marginBottom: 16 }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}
      >
        <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink }}>{title}</div>
        {right ? <div style={{ fontSize: 11, color: t.muted, letterSpacing: "0.04em" }}>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Field({ t, name, children }: { t: ReturnType<typeof useTheme>; name: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "8px 0", borderTop: `1px solid ${t.ruleSoft}` }}>
      <div style={{ ...label(t), width: 140, flexShrink: 0, paddingTop: 2 }}>{name}</div>
      <div style={{ fontFamily: t.sans, fontSize: 13, color: t.ink, minWidth: 0, flex: 1, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

export function ProfileView({
  user,
  role,
  organizationName,
  portfolios,
  watchlists,
  usage,
  portfolioManagerEnabled = false,
  embedded = false,
  canChangePassword = true,
}: {
  user: SidebarUser;
  role: string;
  organizationName: string | null;
  portfolios: { id: string; name: string; companyCount: number; fundName: string | null }[];
  watchlists: { id: string; name: string; companyCount: number }[];
  usage?: { costTokens: number; runs: number; periodStart: string } | null;
  /** Account `portfolio_manager_enabled` — same gate as Shell Portfolio nav. */
  portfolioManagerEnabled?: boolean;
  /** When true, AccountLayout owns the page title — skip the local SectionHead. */
  embedded?: boolean;
  /** False for Google-only Cognito users (no local password). */
  canChangePassword?: boolean;
}) {
  const t = useTheme();
  const org = organizationName ?? "";

  return (
    <div>
      {embedded ? null : (
        <SectionHead t={t} title="Profile" subtitle="Your account, preferences, and the lists you own." />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: 20,
          background: t.panel,
          border: `1px solid ${t.rule}`,
          marginBottom: 24,
        }}
      >
        <Avatar t={t} person={{ name: user.name ?? user.email, avatar: user.initials }} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2
              style={{
                margin: 0,
                fontFamily: t.sans,
                fontSize: embedded ? 18 : 22,
                fontWeight: 700,
                color: t.ink,
                letterSpacing: "-0.015em",
              }}
            >
              {user.name ?? user.email}
            </h2>
            {role ? <Chip t={t} tone="ghost">{role}</Chip> : null}
          </div>
          {user.name ? (
            <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, marginTop: 4 }}>
              {user.email}
            </div>
          ) : null}
        </div>
        <form action="/sign-out" method="GET">
          <button
            type="submit"
            style={{
              padding: "8px 14px",
              background: "transparent",
              color: t.inkSoft,
              border: `1px solid ${t.rule}`,
              borderRadius: 8,
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <Card title="Account">
            <div>
              <Field t={t} name="Email">{user.email}</Field>
              {user.name ? <Field t={t} name="Display Name">{user.name}</Field> : null}
              <Field t={t} name="Role">{role}</Field>
              <Field t={t} name="Organization">{org || "—"}</Field>
            </div>
          </Card>

          {canChangePassword ? <ChangePasswordCard /> : null}

          <Card title="Notification preferences" right="Soon">
            <div style={{ fontFamily: t.sans, fontSize: 13, color: t.muted, lineHeight: 1.5 }}>
              Per-list cadence lives on each portfolio/watchlist today. Global digest preferences
              (default cadence, delivery day, summary depth) will land here next.
            </div>
          </Card>

          <Card title="Your AI usage" right="this month">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ ...label(t), marginBottom: 4 }}>Tokens</div>
                <div
                  style={{
                    fontFamily: t.sans,
                    fontSize: 22,
                    fontWeight: 700,
                    color: t.ink,
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {formatTokens(usage?.costTokens ?? 0)}
                </div>
              </div>
              <div>
                <div style={{ ...label(t), marginBottom: 4 }}>Agent Runs</div>
                <div
                  style={{
                    fontFamily: t.sans,
                    fontSize: 22,
                    fontWeight: 700,
                    color: t.ink,
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {(usage?.runs ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontFamily: t.sans, fontSize: 12, color: t.muted }}>
              <Link href="/account/usage" style={{ color: t.accent }}>
                See account-wide usage →
              </Link>
            </div>
          </Card>
        </div>

        <div>
          {portfolioManagerEnabled ? (
            <Card title="Your portfolios" right={`${portfolios.length}`}>
              {portfolios.length === 0 ? (
                <div style={{ fontSize: 12, color: t.muted, fontFamily: t.sans }}>
                  No portfolios yet.{" "}
                  <Link href="/portfolio?create=1" style={{ color: t.accent }}>
                    Create One
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {portfolios.map((p) => (
                    <Link
                      key={p.id}
                      href={`/portfolio/${p.id}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 0",
                        borderTop: `1px solid ${t.ruleSoft}`,
                        color: t.ink,
                        textDecoration: "none",
                      }}
                    >
                      <span style={{ fontFamily: t.sans, fontSize: 13 }}>
                        {p.name}
                        {p.fundName ? (
                          <span style={{ color: t.muted, marginLeft: 8, fontSize: 11 }}>
                            {p.fundName}
                          </span>
                        ) : null}
                      </span>
                      <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                        {p.companyCount}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          <Card title="Your watchlists" right={`${watchlists.length}`}>
            {watchlists.length === 0 ? (
              <div style={{ fontSize: 12, color: t.muted, fontFamily: t.sans }}>
                No watchlists yet.{" "}
                <Link href="/watchlists" style={{ color: t.accent }}>
                  Create one.
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {watchlists.map((w) => (
                  <Link
                    key={w.id}
                    href={`/watchlists/${w.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderTop: `1px solid ${t.ruleSoft}`,
                      color: t.ink,
                      textDecoration: "none",
                    }}
                  >
                    <span style={{ fontFamily: t.sans, fontSize: 13 }}>{w.name}</span>
                    <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>
                      {w.companyCount}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
