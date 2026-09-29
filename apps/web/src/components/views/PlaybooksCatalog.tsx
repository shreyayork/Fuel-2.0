"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { PLAYBOOK_CATEGORIES } from "@/lib/playbooks-constants";
import { Chip, SectionHead, Tabs, type TabItem } from "../atoms";
import { useTheme } from "../ThemeContext";

export interface PlaybookCard {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  visibility: string;
  tags: string[] | null;
  targetKind: string | null;
}

export interface PlaybookTreeNode {
  category: string;
  subcategories: Array<{
    name: string | null;
    playbooks: PlaybookCard[];
  }>;
}

const ALL_TAB = "all";

const CATEGORY_TABS: TabItem[] = [
  { key: ALL_TAB, label: "All" },
  ...PLAYBOOK_CATEGORIES.map((c) => ({ key: c, label: c })),
];

export function PlaybooksCatalog({
  tree,
  activeQuery,
  activeCategory,
  totalCount,
}: {
  tree: PlaybookTreeNode[];
  activeQuery: string;
  activeCategory: string | null;
  totalCount: number;
}) {
  const t = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(activeQuery);
  const [, startTransition] = useTransition();
  const lastPushedQueryRef = useRef(activeQuery.trim());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTab = activeCategory ?? ALL_TAB;

  const pushFilters = useCallback(
    (nextQ: string, nextCategory: string | null) => {
      const trimmed = nextQ.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      if (nextCategory) params.set("category", nextCategory);
      else params.delete("category");
      lastPushedQueryRef.current = trimmed;
      const qs = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  const submitSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushFilters(q, activeCategory);
  }, [q, activeCategory, pushFilters]);

  // Sync URL → input only for external navigation (back/forward, shared links).
  useEffect(() => {
    const trimmed = activeQuery.trim();
    if (trimmed === lastPushedQueryRef.current) return;
    lastPushedQueryRef.current = trimmed;
    setQ(activeQuery);
  }, [activeQuery]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed === activeQuery.trim()) return;

    debounceRef.current = setTimeout(() => {
      pushFilters(q, activeCategory);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, activeQuery, activeCategory, pushFilters]);

  return (
    <div>
      <SectionHead
        t={t}
        title="Playbooks"
        subtitle={`${totalCount} playbook${totalCount === 1 ? "" : "s"} · runbooks Fuel AI executes against a company using its signal context — diligence, pricing reviews, audits, planning frameworks. Pick one from the catalog; Fuel reads the company's context + benchmarks and produces an artifact you can act on.`}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="Search playbooks by title, description, or tag…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitSearch();
            }
          }}
          style={{
            flex: 1,
            minWidth: 220,
            padding: "8px 12px",
            background: t.panelAlt,
            color: t.ink,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 13,
          }}
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              pushFilters("", activeCategory);
            }}
            style={{
              padding: "6px 10px",
              background: "transparent",
              color: t.muted,
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              fontFamily: t.sans,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div style={{ marginBottom: 18 }}>
        <Tabs
          t={t}
          items={CATEGORY_TABS}
          active={activeTab}
          onChange={(key) => pushFilters(q, key === ALL_TAB ? null : key)}
        />
      </div>

      {tree.length === 0 ? (
        <div
          style={{
            padding: 36,
            textAlign: "center",
            background: t.panel,
            border: `1px dashed ${t.rule}`,
            borderRadius: 8,
            fontFamily: t.sans,
            color: t.muted,
          }}
        >
          No playbooks match your filters.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 22 }}>
          {tree.map((node) => (
            <CategoryBlock
              key={node.category}
              node={node}
              showCategoryHeading={activeTab === ALL_TAB}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryBlock({
  node,
  showCategoryHeading,
}: {
  node: PlaybookTreeNode;
  showCategoryHeading: boolean;
}) {
  const t = useTheme();
  return (
    <div>
      {showCategoryHeading ? (
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 11,
            color: t.muted,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 8,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span>{node.category}</span>
          <span style={{ flex: 1, height: 1, background: t.ruleSoft }} />
        </div>
      ) : null}
      <div style={{ display: "grid", gap: 18 }}>
        {node.subcategories.map((sub, i) => (
          <div key={`${node.category}-${sub.name ?? "_none"}-${i}`}>
            {sub.name ? (
              <div
                style={{
                  fontFamily: t.sans,
                  fontSize: 12,
                  color: t.inkSoft,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {sub.name}
              </div>
            ) : null}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
                gap: 10,
              }}
            >
              {sub.playbooks.map((p) => (
                <PlaybookCardView key={p.id} p={p} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaybookCardView({ p }: { p: PlaybookCard }) {
  const t = useTheme();
  return (
    <Link
      href={`/playbooks/${p.slug}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 8,
        padding: 14,
        display: "block",
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = t.accent;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = t.rule;
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: t.sans,
            fontSize: 14,
            fontWeight: 600,
            color: t.ink,
            letterSpacing: "-0.005em",
          }}
        >
          {p.title}
        </span>
        {p.visibility === "global" ? (
          <Chip t={t} tone="ghost">global</Chip>
        ) : (
          <Chip t={t} tone="accent">custom</Chip>
        )}
      </div>
      <div
        style={{
          fontFamily: t.sans,
          fontSize: 12.5,
          color: t.muted,
          lineHeight: 1.45,
        }}
      >
        {p.description}
      </div>
      {p.tags && p.tags.length > 0 ? (
        <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
          {p.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: t.mono,
                fontSize: 10.5,
                color: t.muted,
                padding: "2px 6px",
                background: t.panelAlt,
                borderRadius: 3,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
