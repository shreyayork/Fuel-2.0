"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { PLAYBOOK_CATEGORIES } from "@/lib/playbooks-constants";
import { useNarrow } from "@/lib/responsive";
import { Chip, SectionHead, type TabItem } from "../atoms";
import { FilterGroup, FilterMenu, FilterOption, FilterSearch, PageToolbar } from "../ToolbarActions";
import { useTheme } from "../ThemeContext";
import { framedPanelStyle, groupCardStyle, groupCardHeadStyle, groupItemStyle } from "@/lib/theme";

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
  const compact = useNarrow();
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

  const countLabel = `${totalCount} playbook${totalCount === 1 ? "" : "s"}`;
  const subtitle = compact
    ? countLabel
    : `${countLabel} · Fuel AI runbooks for diligence, pricing, audits, and planning`;

  return (
    <div className="fuel-playbooks-catalog">
      <SectionHead
        t={t}
        title="Playbooks"
        subtitle={subtitle}
        right={
          <PageToolbar
            t={t}
            filter={
              <FilterMenu
                t={t}
                activeCount={(activeCategory ? 1 : 0) + (q.trim() ? 1 : 0)}
                onClear={() => {
                  setQ("");
                  pushFilters("", null);
                }}
              >
                <FilterGroup t={t} title="Search">
                  <FilterSearch
                    t={t}
                    value={q}
                    onChange={setQ}
                    placeholder="Search playbooks…"
                    aria-label="Search playbooks"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitSearch();
                      }
                    }}
                  />
                </FilterGroup>
                <FilterGroup t={t} title="Category">
                    {CATEGORY_TABS.map((tab) => (
                      <FilterOption
                        key={tab.key}
                        t={t}
                        selected={activeTab === tab.key}
                        onSelect={() =>
                          pushFilters(q, tab.key === ALL_TAB ? null : tab.key)
                        }
                      >
                        {tab.label}
                      </FilterOption>
                    ))}
                </FilterGroup>
              </FilterMenu>
            }
          />
        }
      />

      {tree.length === 0 ? (
        <div
          style={{
            ...framedPanelStyle(t),
            color: t.muted,
            fontFamily: t.sans,
            padding: 36,
            textAlign: "center",
          }}
        >
          No playbooks match your filters.
        </div>
      ) : (
        <div style={{ display: "grid", gap: compact ? 16 : 22 }}>
          {tree.map((node) => (
            <CategoryBlock
              key={node.category}
              node={node}
              showCategoryHeading={activeTab === ALL_TAB}
              compact={compact}
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
  compact,
}: {
  node: PlaybookTreeNode;
  showCategoryHeading: boolean;
  compact: boolean;
}) {
  const t = useTheme();
  return (
    <div>
      {showCategoryHeading ? (
        <div
          style={{
            alignItems: "center",
            color: t.muted,
            display: "flex",
            fontFamily: t.mono,
            fontSize: 10.5,
            fontWeight: 650,
            gap: 10,
            letterSpacing: "0.12em",
            marginBottom: compact ? 8 : 10,
            textTransform: "uppercase",
          }}
        >
          <span>{node.category}</span>
          <span style={{ background: t.ruleSoft, flex: 1, height: 1 }} />
        </div>
      ) : null}
      <div style={{ display: "grid", gap: compact ? 12 : 18 }}>
        {node.subcategories.map((sub, i) => (
          <div
            key={`${node.category}-${sub.name ?? "_none"}-${i}`}
            className="fuel-group"
            style={groupCardStyle(t)}
          >
            <div className="fuel-group__head" style={groupCardHeadStyle(t)}>
              <span className="fuel-group__title" style={{ color: t.ink, fontFamily: t.sans, fontSize: 14 }}>
                {sub.name ?? node.category}
              </span>
              <span className="fuel-group__meta" style={{ color: t.muted, fontFamily: t.sans, fontSize: 12 }}>
                {sub.playbooks.length}
              </span>
            </div>
            {compact ? (
              <div className="fuel-card-stack fuel-group__body">
                {sub.playbooks.map((p) => (
                  <PlaybookCardView key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <div
                className="fuel-group__body"
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
                }}
              >
                {sub.playbooks.map((p) => (
                  <PlaybookCardView key={p.id} p={p} />
                ))}
              </div>
            )}
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
      className="fuel-group__item"
      style={{
        ...groupItemStyle(t, { padding: 14 }),
        color: "inherit",
        display: "block",
        textDecoration: "none",
      }}
    >
      <div
        style={{
          alignItems: "baseline",
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            color: t.ink,
            fontFamily: t.sans,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "-0.005em",
          }}
        >
          {p.title}
        </span>
        {p.visibility !== "global" ? (
          <Chip t={t} tone="accent">custom</Chip>
        ) : null}
      </div>
      <div
        style={{
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
          color: t.muted,
          display: "-webkit-box",
          fontFamily: t.sans,
          fontSize: 12.5,
          lineHeight: 1.45,
          overflow: "hidden",
        }}
      >
        {p.description}
      </div>
      {p.tags && p.tags.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {p.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                background: t.panelAlt,
                borderRadius: 3,
                color: t.muted,
                fontFamily: t.mono,
                fontSize: 10.5,
                padding: "2px 6px",
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
