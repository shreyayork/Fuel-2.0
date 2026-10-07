"use client";

import Link from "next/link";
import {
  Suspense,
  use,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { useUrlSyncedTab } from "@/lib/use-url-synced-tab";
import type { Theme } from "@/lib/theme";
import { ctaPrimaryStyle, ctaTertiaryStyle, framedPanelPadStyle } from "@/lib/theme";
import type { NetworkInvestor, InvestorBookmarkView } from "@/lib/investors";
import { BREAKPOINTS, useNarrow } from "@/lib/responsive";
import { Chip, Label, SectionHead } from "../atoms";
import { FilterGroup, FilterMenu, FilterOption, FilterSearch, PageToolbar } from "../ToolbarActions";
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

function button(t: Theme, variant: "primary" | "ghost" = "ghost"): CSSProperties {
  return {
    ...(variant === "primary" ? ctaPrimaryStyle(t) : ctaTertiaryStyle(t)),
    alignItems: "center",
    borderRadius: 8,
    boxSizing: "border-box",
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

function investorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

function BookmarkMark({ t, name }: { t: Theme; name: string }) {
  return (
    <div
      className="fuel-investor-mark"
      aria-hidden
      style={{
        alignItems: "center",
        background: `${t.accent}14`,
        border: `1px solid ${t.rule}`,
        borderRadius: 10,
        color: t.ink,
        display: "flex",
        flexShrink: 0,
        fontFamily: t.sans,
        fontSize: 13,
        fontWeight: 700,
        height: 44,
        justifyContent: "center",
        letterSpacing: "-0.02em",
        width: 44,
      }}
    >
      {investorInitials(name)}
    </div>
  );
}

function formatBookmarkDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Chevron({ t }: { t: Theme }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 3.5L10.5 8 6 12.5"
        stroke={t.mutedSoft}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const phone = useNarrow(BREAKPOINTS.md);
  const [tab, setTab] = useUrlSyncedTab<Tab>({
    paramName: "tab",
    validKeys: TAB_KEYS,
    defaultValue: "network",
  });
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b) => b.investorId)), [bookmarks]);

  return (
    <div className="fuel-page fuel-investors-page">
      <SectionHead
        t={t}
        title="Investors"
        subtitle={
          phone
            ? undefined
            : "Co-investors in your portfolio companies, auto-curated from fuel-data"
        }
        right={
          <PageToolbar
            t={t}
            filter={
              <FilterMenu
                t={t}
                activeCount={(tab !== "network" ? 1 : 0) + (query.trim() ? 1 : 0)}
                onClear={() => {
                  setTab("network");
                  setQuery("");
                }}
              >
                <FilterGroup t={t} title="View">
                    {(
                      [
                        { k: "network", label: "Network" },
                        {
                          k: "bookmarks",
                          label: "Bookmarked",
                          n: bookmarks.length,
                        },
                      ] as const
                    ).map((o) => (
                      <FilterOption
                        key={o.k}
                        t={t}
                        selected={tab === o.k}
                        onSelect={() => setTab(o.k)}
                        trailing={"n" in o ? o.n : undefined}
                      >
                        {o.label}
                      </FilterOption>
                    ))}
                </FilterGroup>
                {tab === "network" ? (
                  <FilterGroup t={t} title="Search">
                    <FilterSearch
                      t={t}
                      value={query}
                      onChange={setQuery}
                      placeholder="Investor or company…"
                      aria-label="Filter investors"
                    />
                  </FilterGroup>
                ) : null}
              </FilterMenu>
            }
          />
        }
      />

      {tab === "network" ? (
        <div>
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
        <BookmarksPanel t={t} bookmarks={bookmarks} phone={phone} />
      )}
    </div>
  );
}

function BookmarksPanel({
  t,
  bookmarks,
  phone,
}: {
  t: Theme;
  bookmarks: InvestorBookmarkView[];
  phone: boolean;
}) {
  if (bookmarks.length === 0) {
    return (
      <Empty
        t={t}
        title="No saved investors yet"
        text="Switch to Network and bookmark co-investors you want to keep close."
      />
    );
  }

  return (
    <div
      className="fuel-investor-bookmark-panel"
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        className="fuel-investor-bookmark-panel__head"
        style={{
          alignItems: "baseline",
          borderBottom: `1px solid ${t.ruleSoft}`,
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          padding: phone ? "12px 14px" : "12px 16px",
        }}
      >
        <span
          style={{
            color: t.ink,
            fontFamily: t.sans,
            fontSize: 13,
            fontWeight: 650,
          }}
        >
          Saved investors
        </span>
        <span
          style={{
            color: t.muted,
            fontFamily: t.mono,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {bookmarks.length}
        </span>
      </div>
      <ul
        className="fuel-investor-bookmark-list"
        style={{ listStyle: "none", margin: 0, padding: 0 }}
      >
        {bookmarks.map((b, index) => (
          <BookmarkRow
            key={b.investorId}
            t={t}
            bookmark={b}
            phone={phone}
            divider={index > 0}
          />
        ))}
      </ul>
    </div>
  );
}

function BookmarkRow({
  t,
  bookmark: b,
  phone,
  divider,
}: {
  t: Theme;
  bookmark: InvestorBookmarkView;
  phone: boolean;
  divider: boolean;
}) {
  const navigable = Boolean(b.hasCompanyProfile && b.companyUuid);
  const rowStyle: CSSProperties = {
    alignItems: "center",
    borderTop: divider ? `1px solid ${t.ruleSoft}` : undefined,
    color: "inherit",
    display: "flex",
    gap: 12,
    minHeight: phone ? 64 : 60,
    padding: phone ? "12px 14px" : "12px 16px",
    textDecoration: "none",
  };

  const body = (
    <>
      <BookmarkMark t={t} name={b.investorName} />
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div
          style={{
            color: navigable ? t.accent : t.ink,
            fontFamily: t.sans,
            fontSize: phone ? 15 : 14,
            fontWeight: 650,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {b.investorName}
        </div>
        <div
          className="fuel-investor-bookmark-meta"
          style={{
            alignItems: "center",
            color: t.muted,
            display: "flex",
            flexWrap: "wrap",
            fontFamily: t.sans,
            fontSize: 12,
            gap: "2px 8px",
            marginTop: 4,
          }}
        >
          <span>{formatBookmarkDate(b.addedAt)}</span>
          <span aria-hidden style={{ opacity: 0.55 }}>
            ·
          </span>
          <span
            title={b.addedByEmail}
            style={{
              maxWidth: phone ? "100%" : 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {b.addedByEmail}
          </span>
        </div>
        {navigable ? (
          <span
            style={{
              color: t.accent,
              display: "inline-block",
              fontFamily: t.sans,
              fontSize: 11,
              fontWeight: 650,
              marginTop: 5,
            }}
          >
            Open company profile
          </span>
        ) : null}
      </div>
      {navigable ? (
        <span style={{ color: t.mutedSoft, display: "inline-flex", flexShrink: 0 }}>
          <Chevron t={t} />
        </span>
      ) : null}
    </>
  );

  if (navigable && b.companyUuid) {
    return (
      <li>
        <Link
          href={`/company/${encodeURIComponent(b.companyUuid)}`}
          className="fuel-investor-bookmark-row fuel-investor-bookmark-row--link"
          style={rowStyle}
        >
          {body}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className="fuel-investor-bookmark-row" style={rowStyle}>
        {body}
      </div>
    </li>
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
    <div className="fuel-network-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            ...framedPanelPadStyle(t),
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
  return <div className="fuel-network-grid">{children}</div>;
}

function Empty({
  t,
  text,
  title,
}: {
  t: Theme;
  text: string;
  title?: string;
}) {
  return (
    <div
      className="fuel-investor-empty"
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 12,
        fontFamily: t.sans,
        padding: "36px 22px",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden
        style={{
          alignItems: "center",
          background: `${t.accent}14`,
          borderRadius: 14,
          color: t.accent,
          display: "inline-flex",
          height: 48,
          justifyContent: "center",
          marginBottom: 12,
          width: 48,
        }}
      >
        <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2.8l1.9 4.1 4.5.5-3.4 3.1.9 4.4L10 12.8 5.9 14.9l.9-4.4-3.4-3.1 4.5-.5L10 2.8z"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {title ? (
        <div
          style={{
            color: t.ink,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            marginBottom: 6,
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ color: t.muted, fontSize: 13, lineHeight: 1.5, margin: "0 auto", maxWidth: 34 * 16 }}>
        {text}
      </div>
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
      className="fuel-network-card"
      style={{
        background: t.panel,
        border: `1px solid ${bookmarked ? t.accent : t.rule}`,
        borderRadius: 12,
        boxShadow: "none",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
        padding: 16,
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
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
                  fontWeight: 650,
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {investor.name}
              </div>
            </Link>
          ) : (
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
              {investor.name}
            </div>
          )}
          <div style={{ color: t.muted, fontFamily: t.sans, fontSize: 12, marginTop: 3 }}>
            Co-invested in {investor.coInvestmentCount} portfolio{" "}
            {investor.coInvestmentCount === 1 ? "company" : "companies"}
          </div>
        </div>
      </div>

      {investor.portfolioCompanies.length > 0 ? (
        <div className="fuel-network-card__chips" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
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

      <div className="fuel-network-card-foot">
        {bookmarked ? (
          <Chip t={t} tone="accent">Saved</Chip>
        ) : (
          <Label t={t}>Not saved</Label>
        )}
        <button type="button" onClick={onToggle} style={button(t, bookmarked ? "ghost" : "primary")}>
          {bookmarked ? "Remove" : "Save"}
        </button>
      </div>
    </div>
  );
}
