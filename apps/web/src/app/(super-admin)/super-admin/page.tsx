"use client";

import Link from "next/link";
import type { Theme } from "@/lib/theme";
import { SectionHead } from "@/components/atoms";
import { useTheme } from "@/components/ThemeContext";

function Tile({
  t,
  href,
  title,
  subtitle,
}: {
  t: Theme;
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 18,
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 6,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ fontFamily: t.sans, fontSize: 15, fontWeight: 600, color: t.ink }}>
        {title}
      </div>
      <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginTop: 6 }}>
        {subtitle}
      </div>
    </Link>
  );
}

export default function SuperAdminIndex() {
  const t = useTheme();
  return (
    <div>
      <SectionHead
        t={t}
        title="Super Admin"
        subtitle="Platform-level curation and maintenance."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <Tile
          t={t}
          href="/super-admin/users"
          title="Users"
          subtitle="Reconcile Cognito signups with Fuel accounts, onboarding status, and purchased plans."
        />
        <Tile
          t={t}
          href="/super-admin/signals"
          title="Signals"
          subtitle="The global catalog of quantitative metrics and qualitative observations we extract from every context item."
        />
        <Tile
          t={t}
          href="/super-admin/playbooks"
          title="Playbooks"
          subtitle="Curate York IE's global operating frameworks — diligence, GTM, board prep, and guided wizards."
        />
        <Tile
          t={t}
          href="/super-admin/credits"
          title="Credits"
          subtitle="Edit credit plans, Pro subscription fees, action costs, and top-up packs — with optional Stripe Price sync."
        />
        <Tile
          t={t}
          href="/super-admin/coupons"
          title="Coupons"
          subtitle="Create Stripe coupon campaigns, mint unique promotion codes, and email them to Fuel 1.0 / promo recipients."
        />
        <Tile
          t={t}
          href="/super-admin/service-providers"
          title="Service Providers"
          subtitle="Curate the global directory of law firms, banks, SaaS vendors, etc."
        />
        <Tile
          t={t}
          href="/super-admin/advisors"
          title="Advisors"
          subtitle="Curate instance-level advisors visible to every account alongside each account's own."
        />
        <Tile
          t={t}
          href="/super-admin/chips"
          title="Chips management"
          subtitle="Edit York IE partner marketing headlines for R&D, GTM, and G&A insight chips."
        />
        <Tile
          t={t}
          href="/super-admin/faq"
          title="Help & FAQ"
          subtitle="Curate the platform FAQ — questions, answers, publish state, and display order."
        />
      </div>
    </div>
  );
}
