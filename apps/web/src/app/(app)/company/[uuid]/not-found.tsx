"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeContext";
import { removeRecentCompany } from "@/lib/recent-companies";

/**
 * Shown when `/company/[uuid]` calls `notFound()`. Prunes the uuid from
 * Recently viewed so the sidebar stops linking to a dead route.
 */
export default function CompanyNotFound() {
  const t = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    const match = pathname?.match(/^\/company\/([^/]+)/);
    if (!match?.[1]) return;
    void removeRecentCompany(decodeURIComponent(match[1]));
  }, [pathname]);

  return (
    <div
      style={{
        alignItems: "flex-start",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 420,
        padding: "48px 8px",
      }}
    >
      <span
        style={{
          color: t.accent,
          fontFamily: t.sans,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Company
      </span>
      <h1
        style={{
          color: t.ink,
          fontFamily: t.sans,
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
        }}
      >
        Company not found
      </h1>
      <p
        style={{
          color: t.muted,
          fontFamily: t.sans,
          fontSize: 14,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        This company is unavailable for your current account, or it no longer
        exists. It has been removed from Recently viewed.
      </p>
      <Link
        href="/"
        style={{
          color: t.accent,
          fontFamily: t.sans,
          fontSize: 13,
          fontWeight: 600,
          marginTop: 4,
          textDecoration: "none",
        }}
      >
        Back to Fuel
      </Link>
    </div>
  );
}
