"use client";

import Link from "next/link";
import type { Theme } from "@/lib/theme";
import type { SuperAdminOverviewStats } from "@/lib/super-admin/overview";
import { useTheme } from "@/components/ThemeContext";
import { AdminPageHeader } from "@/components/views/AdminPageHeader";
import { AdminNavIcon, AdminStatsStrip } from "@/components/views/AdminChrome";
import {
  ADMIN_NAV_GROUPS,
  adminFrequentItems,
  adminShortcutItems,
  type AdminNavItem,
} from "@/components/views/adminNav";
import {
  adminPageStyle,
  adminPanelStyle,
  adminSectionLabelStyle,
} from "@/components/views/adminStyles";

function FrequentRow({ t, item }: { t: Theme; item: AdminNavItem }) {
  return (
    <Link
      href={item.href}
      className="fuel-admin-dest-primary"
      style={{
        alignItems: "center",
        background: t.accentTint,
        border: `1px solid ${t.accent}55`,
        borderRadius: 12,
        color: "inherit",
        display: "grid",
        gap: 12,
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        padding: "16px 18px",
        textDecoration: "none",
        transition: "border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease",
      }}
    >
      <span
        aria-hidden
        style={{
          alignItems: "center",
          background: `${t.accent}22`,
          borderRadius: 10,
          color: t.accent,
          display: "inline-flex",
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        <AdminNavIcon path={item.icon} size={18} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            color: t.ink,
            display: "block",
            fontFamily: t.sans,
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {item.label}
        </span>
        <span
          style={{
            color: t.muted,
            display: "block",
            fontFamily: t.sans,
            fontSize: 13,
            lineHeight: 1.4,
            marginTop: 4,
            overflowWrap: "break-word",
          }}
        >
          {item.blurb}
        </span>
      </span>
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        stroke={t.muted}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 3.5 10.5 8 6 12.5" />
      </svg>
    </Link>
  );
}

function ShortcutChip({ t, item }: { t: Theme; item: AdminNavItem }) {
  return (
    <Link
      href={item.href}
      className="fuel-admin-shortcut"
      style={{
        alignItems: "center",
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 10,
        color: t.inkSoft,
        display: "inline-flex",
        fontFamily: t.sans,
        fontSize: 13,
        fontWeight: 600,
        gap: 8,
        letterSpacing: "-0.01em",
        minHeight: 44,
        padding: "0 14px 0 12px",
        textDecoration: "none",
        transition: "border-color 140ms ease, background-color 140ms ease, color 140ms ease",
      }}
    >
      <span style={{ color: t.accent, display: "inline-flex" }}>
        <AdminNavIcon path={item.icon} />
      </span>
      {item.label}
    </Link>
  );
}

function AreaLink({ t, item }: { t: Theme; item: AdminNavItem }) {
  return (
    <Link
      href={item.href}
      className="fuel-admin-dest-row"
      style={{
        alignItems: "center",
        borderBottom: `1px solid ${t.ruleSoft}`,
        color: "inherit",
        display: "grid",
        gap: 10,
        gridTemplateColumns: "auto minmax(0, 160px) minmax(0, 1fr) auto",
        padding: "12px 16px",
        textDecoration: "none",
        transition: "background-color 140ms ease",
      }}
    >
      <span style={{ color: t.muted, display: "inline-flex" }}>
        <AdminNavIcon path={item.icon} />
      </span>
      <span
        style={{
          color: t.ink,
          fontFamily: t.sans,
          fontSize: 13.5,
          fontWeight: 650,
          letterSpacing: "-0.01em",
        }}
      >
        {item.label}
      </span>
      <span
        style={{
          color: t.muted,
          fontFamily: t.sans,
          fontSize: 12.5,
          lineHeight: 1.35,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.blurb}
      </span>
      <svg
        width={14}
        height={14}
        viewBox="0 0 14 14"
        fill="none"
        stroke={t.mutedSoft}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M5 3l4 4-4 4" />
      </svg>
    </Link>
  );
}

export function SuperAdminOverviewView({ stats }: { stats: SuperAdminOverviewStats }) {
  const t = useTheme();
  const frequent = adminFrequentItems();
  const shortcuts = adminShortcutItems();

  const areaGroups = ADMIN_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => item.href !== "/super-admin"),
  })).filter((g) => g.items.length > 0);

  const primaryAnalytics = [
    {
      label: "Accounts",
      value: stats.accounts,
      footnote: stats.accountsLast7d > 0 ? `+${stats.accountsLast7d} this week` : undefined,
    },
    {
      label: "Pro",
      value: stats.proWorkspaces,
      footnote: stats.cancelingPro > 0 ? `${stats.cancelingPro} canceling` : undefined,
    },
    { label: "Free", value: stats.freeWorkspaces },
    { label: "Members", value: stats.members },
  ];

  const catalogAnalytics = [
    { label: "Campaigns", value: stats.activeCampaigns, footnote: "active" },
    {
      label: "Redeemed",
      value: stats.couponRedeemed,
      footnote: stats.couponPendingSend > 0 ? `${stats.couponPendingSend} pending send` : undefined,
    },
    { label: "Playbooks", value: stats.livePlaybooks },
    { label: "Signals", value: stats.globalSignals },
    { label: "Cohorts", value: stats.cohortRows },
    {
      label: "Network",
      value: stats.advisors + stats.serviceProviders,
      footnote: `${stats.advisorsActive} advisors active`,
    },
    {
      label: "FAQ live",
      value: stats.faqPublished,
      footnote: stats.faqDrafts > 0 ? `${stats.faqDrafts} drafts` : undefined,
    },
    { label: "Chip overrides", value: stats.chipOverrides },
  ];

  return (
    <div className="fuel-admin-page" style={adminPageStyle()}>
      <AdminPageHeader
        t={t}
        title="Overview"
        description="Platform pulse, frequent work, and every Super Admin shortcut."
      />

      <section aria-labelledby="admin-analytics-heading">
        <h2 id="admin-analytics-heading" style={{ ...adminSectionLabelStyle(t), marginBottom: 10 }}>
          Analytics
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AdminStatsStrip t={t} items={primaryAnalytics} />
          <AdminStatsStrip t={t} items={catalogAnalytics} />
        </div>
      </section>

      <section aria-labelledby="admin-frequent-heading">
        <h2 id="admin-frequent-heading" style={{ ...adminSectionLabelStyle(t), marginBottom: 10 }}>
          Frequent
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {frequent.map((item) => (
            <FrequentRow key={item.href} t={t} item={item} />
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-shortcuts-heading">
        <h2 id="admin-shortcuts-heading" style={{ ...adminSectionLabelStyle(t), marginBottom: 10 }}>
          Shortcuts
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {shortcuts.map((item) => (
            <ShortcutChip key={item.href} t={t} item={item} />
          ))}
        </div>
      </section>

      <section aria-labelledby="admin-areas-heading" style={{ marginTop: 4 }}>
        <h2 id="admin-areas-heading" style={{ ...adminSectionLabelStyle(t), marginBottom: 10 }}>
          All areas
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {areaGroups.map((group) => (
            <div key={group.label} style={adminPanelStyle(t)}>
              <div
                style={{
                  ...adminSectionLabelStyle(t),
                  marginBottom: 0,
                  padding: "12px 16px 4px",
                }}
              >
                {group.label}
              </div>
              <div>
                {group.items.map((item) => (
                  <AreaLink key={item.href} t={t} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
