"use client";

import type { CSSProperties } from "react";
import {
  accountPlanChipTone,
  accountStatusChipTone,
  formatAccountPlanLabel,
  formatAccountStatusLabel,
} from "@/lib/accounts/display";
import { Chip, Logo } from "../atoms";
import { useTheme } from "../ThemeContext";
import type { Account } from "@/db/schema";

function labelStyle(t: ReturnType<typeof useTheme>): CSSProperties {
  return {
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 500,
    color: t.muted,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <div style={{ display: "flex", gap: 14, padding: "12px 0", borderTop: `1px solid ${t.ruleSoft}` }}>
      <div style={{ ...labelStyle(t), width: 160, flexShrink: 0, paddingTop: 4 }}>{name}</div>
      <div style={{ fontFamily: t.sans, fontSize: 13, color: t.ink, minWidth: 0, flex: 1, lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  );
}

export function AccountSettingsTab({
  account,
  primaryCompany = null,
}: {
  account: Account;
  /** Resolved {uuid, name, domain, logoUrl} for the saved primary-company
   *  uuid (if any). null when the account has no primary company set, or
   *  the uuid no longer resolves (stale fuel-data row). */
  primaryCompany?: {
    uuid: string;
    name: string;
    domain: string | null;
    logoUrl: string | null;
  } | null;
}) {
  const t = useTheme();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 20 }}>
        <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink, marginBottom: 10 }}>
          Organization
        </div>
        <Row name="Name">{account.name}</Row>
        <Row name="Type">{account.type}</Row>
        <Row name="Creator">{account.creatorEmail}</Row>
        <Row name="Created">
          {account.createdAt
            ? new Date(account.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </Row>
        {account.legacyId ? (
          <Row name="Legacy ID">
            <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>{account.legacyId}</span>
          </Row>
        ) : null}
      </div>

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 20 }}>
        <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink, marginBottom: 10 }}>
          Features
        </div>
        <Row name="Portfolio manager">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Chip t={t} tone={account.portfolioManagerEnabled ? "positive" : "ghost"}>
              {account.portfolioManagerEnabled ? "Enabled" : "Disabled"}
            </Chip>
            <span style={{ color: t.muted, fontSize: 11 }}>
              Surfaces Pipeline + Portfolio nav
            </span>
          </div>
        </Row>
        {!account.portfolioManagerEnabled ? (
          <Row name="Primary company">
            {primaryCompany ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px 6px 6px",
                  background: t.panelAlt,
                  border: `1px solid ${t.rule}`,
                  borderRadius: 999,
                }}
              >
                <Logo
                  t={t}
                  co={{
                    logo: primaryCompany.name.slice(0, 2).toUpperCase(),
                    name: primaryCompany.name,
                    logoUrl: primaryCompany.logoUrl ?? undefined,
                    uuid: primaryCompany.uuid,
                  }}
                  size={22}
                />
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                  <span style={{ fontFamily: t.sans, fontSize: 12.5, fontWeight: 600, color: t.ink }}>
                    {primaryCompany.name}
                  </span>
                  {primaryCompany.domain ? (
                    <span style={{ fontFamily: t.mono, fontSize: 10, color: t.mutedSoft }}>
                      {primaryCompany.domain}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <span style={{ color: t.muted }}>—</span>
            )}
            <div style={{ color: t.muted, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
              Company Manager mode. Landing page skips /watchlists and
              opens this company profile.
            </div>
          </Row>
        ) : null}
      </div>

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 20 }}>
        <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink, marginBottom: 10 }}>
          Plan
        </div>
        <Row name="Status">
          <Chip t={t} tone={accountStatusChipTone(account)}>
            {formatAccountStatusLabel(account)}
          </Chip>
        </Row>
        <Row name="Plan">
          <Chip t={t} tone={accountPlanChipTone(account)}>
            {formatAccountPlanLabel(account)}
          </Chip>
        </Row>
        <Row name="Stripe customer">
          <span style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>
            {account.stripeCustomerId ?? "not connected"}
          </span>
        </Row>
      </div>
    </div>
  );
}
