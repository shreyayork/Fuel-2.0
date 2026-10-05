"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  accountPlanChipTone,
  accountStatusChipTone,
  formatAccountPlanLabel,
  formatAccountStatusLabel,
} from "@/lib/accounts/display";
import type { Theme } from "@/lib/theme";
import { Chip, Logo } from "../atoms";
import { useTheme } from "../ThemeContext";
import type { Account } from "@/db/schema";

function labelStyle(t: Theme): CSSProperties {
  return {
    color: t.inkSoft,
    fontFamily: t.sans,
    fontSize: 11,
    fontWeight: 650,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  };
}

function SettingsCard({
  t,
  title,
  children,
}: {
  t: Theme;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="fuel-account-settings-card"
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          borderBottom: `1px solid ${t.ruleSoft}`,
          padding: "14px 16px",
        }}
      >
        <h2
          style={{
            color: t.ink,
            fontFamily: t.sans,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          {title}
        </h2>
      </header>
      <div style={{ padding: "4px 16px 8px" }}>{children}</div>
    </section>
  );
}

function Row({
  t,
  name,
  children,
  hint,
}: {
  t: Theme;
  name: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div
      className="fuel-settings-row"
      style={{ borderTop: `1px solid ${t.ruleSoft}` }}
    >
      <div className="fuel-settings-row__label" style={labelStyle(t)}>
        {name}
      </div>
      <div
        style={{
          color: t.ink,
          flex: 1,
          fontFamily: t.sans,
          fontSize: 13.5,
          lineHeight: 1.45,
          minWidth: 0,
        }}
      >
        {children}
        {hint ? (
          <p
            style={{
              color: t.muted,
              fontSize: 12,
              lineHeight: 1.45,
              margin: "6px 0 0",
            }}
          >
            {hint}
          </p>
        ) : null}
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
    <div className="fuel-grid-2 fuel-account-settings">
      <SettingsCard t={t} title="Organization">
        <Row t={t} name="Name">
          {account.name}
        </Row>
        <Row t={t} name="Type">
          <span style={{ textTransform: "capitalize" }}>{account.type}</span>
        </Row>
        <Row t={t} name="Creator">
          <span style={{ overflowWrap: "anywhere" }}>{account.creatorEmail}</span>
        </Row>
        <Row t={t} name="Created">
          {account.createdAt
            ? new Date(account.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </Row>
        {account.legacyId ? (
          <Row t={t} name="Legacy ID">
            <span style={{ color: t.muted, fontFamily: t.mono, fontSize: 12 }}>
              {account.legacyId}
            </span>
          </Row>
        ) : null}
      </SettingsCard>

      <SettingsCard t={t} title="Features">
        <Row
          t={t}
          name="Portfolio manager"
          hint="Surfaces Pipeline and Portfolio in the main navigation."
        >
          <Chip t={t} tone={account.portfolioManagerEnabled ? "positive" : "ghost"}>
            {account.portfolioManagerEnabled ? "Enabled" : "Disabled"}
          </Chip>
        </Row>
        {!account.portfolioManagerEnabled ? (
          <Row
            t={t}
            name="Primary company"
            hint="Company Manager mode — home opens this company instead of Watchlists."
          >
            {primaryCompany ? (
              <div
                className="fuel-account-settings__company"
                style={{
                  alignItems: "center",
                  background: t.panelAlt,
                  border: `1px solid ${t.rule}`,
                  borderRadius: 10,
                  display: "flex",
                  gap: 12,
                  maxWidth: "100%",
                  minWidth: 0,
                  padding: "10px 12px",
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
                  size={32}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: t.ink,
                      fontFamily: t.sans,
                      fontSize: 14,
                      fontWeight: 650,
                      letterSpacing: "-0.01em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {primaryCompany.name}
                  </div>
                  {primaryCompany.domain ? (
                    <div
                      style={{
                        color: t.muted,
                        fontFamily: t.mono,
                        fontSize: 11,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {primaryCompany.domain}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <span style={{ color: t.muted }}>Not set</span>
            )}
          </Row>
        ) : null}
      </SettingsCard>

      <SettingsCard t={t} title="Plan">
        <Row t={t} name="Status">
          <Chip t={t} tone={accountStatusChipTone(account)}>
            {formatAccountStatusLabel(account)}
          </Chip>
        </Row>
        <Row t={t} name="Plan">
          <Chip t={t} tone={accountPlanChipTone(account)}>
            {formatAccountPlanLabel(account)}
          </Chip>
        </Row>
        <Row t={t} name="Stripe customer">
          <span
            style={{
              color: t.muted,
              fontFamily: t.mono,
              fontSize: 12,
              overflowWrap: "anywhere",
            }}
          >
            {account.stripeCustomerId ?? "Not connected"}
          </span>
        </Row>
      </SettingsCard>
    </div>
  );
}
