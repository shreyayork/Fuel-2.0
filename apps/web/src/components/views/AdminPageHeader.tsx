import type { ReactNode } from "react";
import type { Theme } from "@/lib/theme";

/**
 * Task-first page chrome for Super Admin — title leads, support line stays short,
 * actions sit on the right. Replaces generic SectionHead on admin surfaces.
 */
export function AdminPageHeader({
  t,
  title,
  description,
  actions,
}: {
  t: Theme;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      className="fuel-admin-page-header"
      style={{
        alignItems: "flex-start",
        borderBottom: `1px solid ${t.rule}`,
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        justifyContent: "space-between",
        paddingBottom: 18,
      }}
    >
      <div style={{ flex: "1 1 240px", maxWidth: 560, minWidth: 0 }}>
        <h1
          style={{
            color: t.ink,
            fontFamily: t.sans,
            fontSize: 29,
            fontWeight: 750,
            letterSpacing: "-0.03em",
            lineHeight: 1.12,
            margin: 0,
          }}
        >
          {title}
        </h1>
        <div
          aria-hidden
          className="fuel-admin-page-header__rule"
          style={{
            background: t.accent,
            borderRadius: 1,
            height: 2,
            marginTop: 12,
            width: 48,
          }}
        />
        {description ? (
          <p
            className="fuel-admin-page-header__desc"
            style={{
              color: t.muted,
              fontFamily: t.sans,
              fontSize: 13.5,
              lineHeight: 1.45,
              margin: "10px 0 0",
              maxWidth: "42ch",
              overflowWrap: "break-word",
              wordBreak: "normal",
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexShrink: 0,
            flexWrap: "wrap",
            gap: 8,
            paddingTop: 2,
          }}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
