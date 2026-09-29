"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { AccountForUser } from "@/lib/accounts";
import {
  accountPlanChipTone,
  accountStatusChipTone,
  formatAccountPlanLabel,
  formatAccountStatusLabel,
} from "@/lib/accounts/display";
import { Chip, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";

/** Full tab registry — Overview stays addressable but is hidden from the tab bar. */
const TABS: Array<{ href: string; label: string; key: string; hidden?: boolean }> = [
  { href: "/account/profile", label: "My Profile", key: "profile" },
  { href: "/account", label: "Overview", key: "overview", hidden: true },
  { href: "/account/users", label: "Users", key: "users" },
  { href: "/account/teams", label: "Teams", key: "teams" },
  { href: "/account/settings", label: "Settings", key: "settings" },
  { href: "/account/integrations", label: "Integrations", key: "integrations" },
  { href: "/account/usage", label: "Usage", key: "usage" },
  { href: "/account/developer", label: "Developer", key: "developer" },
  { href: "/account/billing", label: "Billing", key: "billing" },
];

export function AccountLayout({
  account,
  role,
  isSuperAdmin = false,
  children,
}: {
  account: AccountForUser;
  role: "owner" | "admin" | "member";
  /** Cognito `super-admin` — Overview tab visible only for this role. */
  isSuperAdmin?: boolean;
  children: ReactNode;
}) {
  const t = useTheme();
  const pathname = usePathname();
  const isProfile = pathname === "/account/profile";
  const visibleTabs = TABS.filter((tab) => {
    if (tab.key === "overview") return isSuperAdmin;
    return !tab.hidden;
  });

  return (
    <div>
      <SectionHead
        t={t}
        title={isProfile ? "Profile" : account.name}
        subtitle={
          isProfile
            ? "Your account, preferences, and the lists you own."
            : "Account settings · members, teams, plan, and billing"
        }
        right={
          isProfile ? undefined : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Chip t={t} tone={accountPlanChipTone(account)}>
                {formatAccountPlanLabel(account)}
              </Chip>
              <Chip t={t} tone={accountStatusChipTone(account)}>
                {formatAccountStatusLabel(account)}
              </Chip>
              <Chip t={t} tone="ghost">{role}</Chip>
            </div>
          )
        }
      />

      <div
        className="fuel-scroll-x"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `1px solid ${t.rule}`,
          marginBottom: 24,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {visibleTabs.map((tab) => {
          // Exact match for Overview (`/account`) and My Profile so sibling
          // routes under `/account/*` do not light the wrong tab.
          const active =
            tab.href === "/account"
              ? pathname === "/account"
              : tab.href === "/account/profile"
                ? pathname === "/account/profile"
                : pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.key}
              href={tab.href}
              style={{
                padding: "12px 14px",
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
                fontFamily: t.sans,
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? t.ink : t.muted,
                borderBottom: `2px solid ${active ? t.ink : "transparent"}`,
                marginBottom: -1,
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
