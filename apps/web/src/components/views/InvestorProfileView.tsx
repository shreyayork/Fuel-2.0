"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { Theme } from "@/lib/theme";
import type { InvestorProfile } from "@/lib/fuel-data";
import { Chip, Label, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";
import {
  bookmarkInvestorAction,
  unbookmarkInvestorAction,
} from "@/app/(app)/investors/actions";

function button(t: Theme, variant: "primary" | "ghost" = "ghost"): React.CSSProperties {
  return {
    alignItems: "center",
    background: variant === "primary" ? t.ink : "transparent",
    border: `1px solid ${variant === "primary" ? t.ink : t.rule}`,
    borderRadius: 8,
    boxSizing: "border-box",
    color: variant === "primary" ? t.bg : t.inkSoft,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 550,
    justifyContent: "center",
    minHeight: 44,
    padding: "8px 14px",
  };
}

export function InvestorProfileView({
  profile,
  bookmarked,
}: {
  profile: InvestorProfile;
  bookmarked: boolean;
}) {
  const t = useTheme();
  const [isPending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(() => {
      const fd = new FormData();
      fd.set("investorId", profile.id);
      fd.set("investorName", profile.name);
      if (bookmarked) return unbookmarkInvestorAction(fd);
      return bookmarkInvestorAction(fd);
    });

  return (
    <div className="fuel-page">
      <div>
        <Link
          href="/investors"
          style={{
            alignItems: "center",
            color: t.muted,
            display: "inline-flex",
            fontFamily: t.sans,
            fontSize: 13,
            minHeight: 44,
            textDecoration: "none",
          }}
        >
          ← All investors
        </Link>
      </div>

      <div
        className="fuel-network-hero"
        style={{
          background: t.panel,
          border: `1px solid ${t.rule}`,
        }}
      >
        {profile.logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="fuel-network-hero__mark"
            src={profile.logoUrl}
            alt={profile.name}
            referrerPolicy="no-referrer"
            style={{ width: 64, height: 64, borderRadius: 10, objectFit: "contain", background: t.panelAlt }}
          />
        ) : (
          <div
            className="fuel-network-hero__mark"
            style={{
              width: 64,
              height: 64,
              borderRadius: 10,
              background: t.panelAlt,
              border: `1px solid ${t.rule}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: t.sans,
              fontWeight: 700,
              fontSize: 20,
              color: t.muted,
            }}
          >
            {profile.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="fuel-network-hero__body">
          <h1
            style={{
              margin: 0,
              fontFamily: t.sans,
              fontSize: "clamp(1.25rem, 1.1rem + 0.8vw, 1.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: t.ink,
              overflowWrap: "anywhere",
            }}
          >
            {profile.name}
          </h1>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            {profile.type ? <Chip t={t} tone="ghost">{profile.type}</Chip> : null}
            {profile.investmentCount != null ? (
              <Chip t={t} tone="ghost">
                {profile.investmentCount} known investment{profile.investmentCount === 1 ? "" : "s"}
              </Chip>
            ) : null}
            {bookmarked ? <Chip t={t} tone="accent">Bookmarked</Chip> : null}
          </div>
          {profile.description ? (
            <div
              style={{
                marginTop: 10,
                fontFamily: t.sans,
                fontSize: 14,
                color: t.inkSoft,
                lineHeight: 1.55,
                overflowWrap: "anywhere",
              }}
            >
              {profile.description}
            </div>
          ) : null}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              fontFamily: t.sans,
              fontSize: 14,
            }}
          >
            {profile.website ? (
              <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: t.accent, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                Website
              </a>
            ) : null}
            {profile.linkedinUrl ? (
              <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: t.accent, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                LinkedIn
              </a>
            ) : null}
          </div>
        </div>
        <div className="fuel-network-hero__actions">
          <button type="button" onClick={toggle} disabled={isPending} style={button(t, bookmarked ? "ghost" : "primary")}>
            {bookmarked ? "Remove bookmark" : "Bookmark"}
          </button>
        </div>
      </div>

      <div>
        <SectionHead t={t} title="Backed companies" subtitle={`${profile.backedCompanies.length} known`} />
        {profile.backedCompanies.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", background: t.panel, border: `1px solid ${t.rule}`, borderRadius: 10, fontFamily: t.sans, fontSize: 14, color: t.muted, lineHeight: 1.45 }}>
            No backed companies in fuel-data. This investor may not have public Crunchbase data, or the Neptune edge shape differs from the default.
          </div>
        ) : (
          <div className="fuel-network-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))" }}>
            {profile.backedCompanies.map((c) => (
              <Link
                key={c.uuid}
                href={`/company/${c.uuid}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  background: t.panel,
                  border: `1px solid ${t.rule}`,
                  borderRadius: 6,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                {c.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={c.logoUrl}
                    alt={c.name}
                    referrerPolicy="no-referrer"
                    style={{ width: 32, height: 32, borderRadius: 4, objectFit: "contain", background: t.panelAlt }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 4,
                      background: t.panelAlt,
                      border: `1px solid ${t.rule}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: t.sans,
                      fontSize: 11,
                      fontWeight: 700,
                      color: t.muted,
                    }}
                  >
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: t.sans,
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.name}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <details style={{ marginTop: 20, background: t.panel, border: `1px solid ${t.rule}`, padding: 16, borderRadius: 6 }}>
        <summary style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, cursor: "pointer" }}>
          Raw vertex properties ({Object.keys(profile.properties).length} fields)
        </summary>
        <pre
          style={{
            background: t.panelAlt,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            padding: 10,
            fontFamily: t.mono,
            fontSize: 11,
            color: t.inkSoft,
            maxHeight: 260,
            overflow: "auto",
            marginTop: 10,
          }}
        >
          {JSON.stringify(profile.properties, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// Supress unused import warning (Label is used nowhere here, but kept to match other views' imports).
void Label;
