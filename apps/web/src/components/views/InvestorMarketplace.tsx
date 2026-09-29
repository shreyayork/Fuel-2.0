"use client";

import Link from "next/link";
import { Suspense, use, useMemo, useState, useTransition } from "react";
import { useUrlSyncedTab } from "@/lib/use-url-synced-tab";
import type { Theme } from "@/lib/theme";
import type { NetworkInvestor, InvestorBookmarkView } from "@/lib/investors";
import { Chip, Label, SectionHead } from "../atoms";
import { useTheme } from "../ThemeContext";
import {
  bookmarkInvestorAction,
  unbookmarkInvestorAction,
} from "@/app/(app)/investors/actions";

/**
 * Logo box: prefers Neptune's `logo_url`, falls back to a Google favicon
 * derived from the investor's domain (high coverage), and finally to a
 * 2-letter initial badge. The <img> hides itself onError so a 404 doesn't
 * leave a broken-image placeholder — fallback chain advances by re-rendering
 * with the next source.
 */
function InvestorLogo({ t, investor }: { t: Theme; investor: NetworkInvestor }) {
  const initials = investor.name.slice(0, 2).toUpperCase();
  const sources: string[] = [];
  if (investor.logoUrl) sources.push(investor.logoUrl);
  if (investor.domain) {
    sources.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(investor.domain)}&sz=64`);
  }
  const [idx, setIdx] = useState(0);
  const src = sources[idx];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={investor.name}
        referrerPolicy="no-referrer"
        onError={() => setIdx((i) => i + 1)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          objectFit: "contain",
          background: t.panelAlt,
          border: `1px solid ${t.rule}`,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 6,
        background: t.panelAlt,
        border: `1px solid ${t.rule}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: t.sans,
        fontWeight: 700,
        color: t.muted,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function button(t: Theme, variant: "primary" | "ghost" = "ghost"): React.CSSProperties {
  return {
    padding: "8px 14px",
    background: variant === "primary" ? t.ink : "transparent",
    color: variant === "primary" ? t.bg : t.inkSoft,
    border: `1px solid ${variant === "primary" ? t.ink : t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  };
}

function input(t: Theme): React.CSSProperties {
  return {
    padding: "10px 12px",
    background: t.panelAlt,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    borderRadius: 6,
    fontFamily: t.sans,
    fontSize: 14,
    width: "100%",
  };
}

const TAB_KEYS = ["network", "bookmarks"] as const;
type Tab = (typeof TAB_KEYS)[number];

export function InvestorMarketplace({
  bookmarks,
  networkPromise,
}: {
  bookmarks: InvestorBookmarkView[];
  /** Pass an unresolved Promise from the server component so the page
   *  shell + bookmarks tab render immediately, and the network grid
   *  streams in via Suspense once the Gremlin query returns. */
  networkPromise: Promise<NetworkInvestor[]>;
}) {
  const t = useTheme();
  const [tab, setTab] = useUrlSyncedTab<Tab>({
    paramName: "tab",
    validKeys: TAB_KEYS,
    defaultValue: "network",
  });
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b) => b.investorId)), [bookmarks]);

  return (
    <div>
      <SectionHead
        t={t}
        title="Investors"
        subtitle="Co-investors in your portfolio companies, auto-curated from fuel-data"
      />

      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: `1px solid ${t.rule}` }}>
        {(
          [
            { k: "network", label: `Network` },
            { k: "bookmarks", label: `Bookmarked · ${bookmarks.length}` },
          ] as const
        ).map((o) => (
          <button
            key={o.k}
            onClick={() => setTab(o.k)}
            style={{
              background: "transparent",
              border: "none",
              padding: "10px 16px",
              borderBottom: tab === o.k ? `2px solid ${t.accent}` : "2px solid transparent",
              color: tab === o.k ? t.ink : t.muted,
              fontFamily: t.sans,
              fontSize: 13,
              fontWeight: tab === o.k ? 600 : 500,
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {tab === "network" ? (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by investor or portfolio company name…"
              style={input(t)}
            />
          </div>
          <Suspense fallback={<NetworkLoading t={t} />}>
            <NetworkGrid
              t={t}
              networkPromise={networkPromise}
              query={query}
              bookmarkedIds={bookmarkedIds}
              onToggle={(inv) =>
                startTransition(() => {
                  const fd = new FormData();
                  fd.set("investorId", inv.id);
                  fd.set("investorName", inv.name);
                  if (bookmarkedIds.has(inv.id)) {
                    return unbookmarkInvestorAction(fd);
                  }
                  return bookmarkInvestorAction(fd);
                })
              }
            />
          </Suspense>
        </div>
      ) : (
        <div>
          {bookmarks.length === 0 ? (
            <Empty t={t} text="No bookmarks yet. Switch to Network to find co-investors." />
          ) : (
            <Grid>
              {bookmarks.map((b) => {
                const cardStyle: React.CSSProperties = {
                  display: "block",
                  background: t.panel,
                  border: `1px solid ${t.rule}`,
                  borderRadius: 6,
                  padding: 16,
                  textDecoration: "none",
                  color: "inherit",
                };
                const body = (
                  <>
                    <div
                      style={{
                        fontFamily: t.sans,
                        fontSize: 14,
                        fontWeight: 600,
                        color: b.hasCompanyProfile ? t.accent : t.ink,
                      }}
                    >
                      {b.investorName}
                    </div>
                    <div style={{ marginTop: 6, fontFamily: t.sans, fontSize: 11, color: t.muted }}>
                      Bookmarked {b.addedAt.toLocaleDateString()} by {b.addedByEmail}
                    </div>
                  </>
                );
                if (b.hasCompanyProfile && b.companyUuid) {
                  return (
                    <Link
                      key={b.investorId}
                      href={`/company/${encodeURIComponent(b.companyUuid)}`}
                      style={cardStyle}
                    >
                      {body}
                    </Link>
                  );
                }
                return (
                  <div key={b.investorId} style={cardStyle}>
                    {body}
                  </div>
                );
              })}
            </Grid>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Suspense-aware network grid. `use(networkPromise)` suspends until the
 * server's Gremlin call returns; the parent shows <NetworkLoading/>
 * meanwhile. Re-renders fast for filter changes since the promise is
 * already resolved by then.
 */
function NetworkGrid({
  t,
  networkPromise,
  query,
  bookmarkedIds,
  onToggle,
}: {
  t: Theme;
  networkPromise: Promise<NetworkInvestor[]>;
  query: string;
  bookmarkedIds: Set<string>;
  onToggle: (inv: NetworkInvestor) => void;
}) {
  const network = use(networkPromise);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? network.filter(
        (inv) =>
          inv.name.toLowerCase().includes(q) ||
          inv.portfolioCompanies.some((c) => c.name.toLowerCase().includes(q)),
      )
    : network;

  if (network.length === 0) {
    return (
      <Empty
        t={t}
        text="No co-investors found yet. Add portfolio companies to a portfolio-type watchlist so we can pull their funding rounds."
      />
    );
  }
  if (filtered.length === 0) {
    return <Empty t={t} text="No matches — clear the filter to see all." />;
  }
  return (
    <>
      <div
        style={{
          fontFamily: t.mono,
          fontSize: 11,
          color: t.muted,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {filtered.length} of {network.length}
      </div>
      <Grid>
        {filtered.map((inv) => (
          <NetworkCard
            key={inv.id}
            t={t}
            investor={inv}
            bookmarked={bookmarkedIds.has(inv.id)}
            onToggle={() => onToggle(inv)}
          />
        ))}
      </Grid>
    </>
  );
}

function NetworkLoading({ t }: { t: Theme }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        gap: 12,
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            padding: 16,
            height: 120,
            opacity: 0.55,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                background: t.panelAlt,
                border: `1px solid ${t.rule}`,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ width: "60%", height: 12, background: t.panelAlt, borderRadius: 3, marginBottom: 6 }} />
              <div style={{ width: "40%", height: 10, background: t.panelAlt, borderRadius: 3 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function Empty({ t, text }: { t: Theme; text: string }) {
  return (
    <div
      style={{
        padding: 40,
        textAlign: "center",
        background: t.panel,
        border: `1px solid ${t.rule}`,
        fontFamily: t.sans,
        fontSize: 13,
        color: t.muted,
      }}
    >
      {text}
    </div>
  );
}

function NetworkCard({
  t,
  investor,
  bookmarked,
  onToggle,
}: {
  t: Theme;
  investor: NetworkInvestor;
  bookmarked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${bookmarked ? t.accent : t.rule}`,
        borderRadius: 6,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <InvestorLogo t={t} investor={investor} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {investor.hasCompanyProfile && investor.companyUuid ? (
            <Link
              href={`/company/${encodeURIComponent(investor.companyUuid)}`}
              style={{ color: t.accent, textDecoration: "none" }}
            >
              <div
                style={{
                  fontFamily: t.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {investor.name}
              </div>
            </Link>
          ) : (
            <div
              style={{
                fontFamily: t.sans,
                fontSize: 14,
                fontWeight: 600,
                color: t.ink,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {investor.name}
            </div>
          )}
          <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted }}>
            Co-invested in {investor.coInvestmentCount} portfolio{" "}
            {investor.coInvestmentCount === 1 ? "company" : "companies"}
          </div>
        </div>
      </div>

      {investor.portfolioCompanies.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {investor.portfolioCompanies.slice(0, 6).map((c) => (
            <Link
              key={c.uuid}
              href={`/company/${c.uuid}`}
              style={{ textDecoration: "none" }}
              title={c.name}
            >
              <Chip t={t} tone="ghost">
                {c.name.length > 18 ? `${c.name.slice(0, 18)}…` : c.name}
              </Chip>
            </Link>
          ))}
          {investor.portfolioCompanies.length > 6 ? (
            <Chip t={t} tone="ghost">
              +{investor.portfolioCompanies.length - 6}
            </Chip>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {bookmarked ? (
          <Chip t={t} tone="accent">Bookmarked</Chip>
        ) : (
          <Label t={t}>Not bookmarked</Label>
        )}
        <button onClick={onToggle} style={button(t, bookmarked ? "ghost" : "primary")}>
          {bookmarked ? "Remove" : "Bookmark"}
        </button>
      </div>
    </div>
  );
}
