"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import {
  addPipelineDealToFuelAction,
  loadStageRowsAction,
  searchPipelineDealsAction,
  toggleStageVisibilityAction,
} from "@/app/(app)/pipeline/actions";
import { Chip, Logo, SectionHead } from "../atoms";

export interface SyncedPipeline {
  config: {
    id: string;
    provider: string;
    providerPipelineId: string;
    providerPipelineName: string;
    label: string | null;
    lastSyncAt: string | null;
    stages: Array<{
      id: string;
      label: string;
      displayOrder: number;
      probability?: number;
      isClosed?: boolean;
      closedStageType?: string;
    }>;
    stageOverrides?: Record<string, "shown" | "hidden">;
    /** HubSpot portal (hub) id — powers the per-deal "open in HubSpot" icon. */
    hubspotPortalId?: string | null;
  };
  companies: Array<{
    id: string;
    providerDealId: string;
    providerPipelineStageId: string | null;
    companyName: string | null;
    companyDomain: string | null;
    companyIndustry: string | null;
    dealName: string | null;
    dealAmount: number | null;
    dealCloseDate: string | null;
    fuelDataUuid: string | null;
  }>;
  /** Real row count per stage (incl. rows not yet shipped to the client).
   *  Keyed by `${configId}:${stageId or "_null_"}`. */
  stageCounts: Record<string, number>;
}

type PipelineDeal = SyncedPipeline["companies"][number];

const COLUMN_WIDTH = 280;
const CARDS_PER_COLUMN_DEFAULT = 8;

function fmtAmount(n: number | null, { short = true } = {}): string {
  if (n == null || n === 0) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return short ? `$${(n / 1e3).toFixed(0)}k` : `$${(n / 1e3).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function isStageVisible(
  stage: SyncedPipeline["config"]["stages"][number],
  overrides: Record<string, "shown" | "hidden">,
): boolean {
  const override = overrides[stage.id];
  if (override === "shown") return true;
  if (override === "hidden") return false;
  // Auto-default: hide stages HubSpot itself flags as closed-lost.
  if (stage.isClosed && stage.probability === 0) return false;
  return true;
}

function groupDealsByStage(
  companies: PipelineDeal[],
  stageDefs: SyncedPipeline["config"]["stages"],
  configId: string,
  stageCounts: Record<string, number>,
  isSearching: boolean,
) {
  return stageDefs.map((s) => {
    const stageKey = `${configId}:${s.id === "__all__" ? "_null_" : s.id}`;
    const items = companies.filter(
      (c) => (c.providerPipelineStageId ?? "__all__") === s.id,
    );
    return {
      stage: s,
      items,
      totalCount: isSearching ? items.length : (stageCounts[stageKey] ?? 0),
    };
  });
}

export function SyncedPipelineView({
  t,
  pipeline,
}: {
  t: Theme;
  pipeline: SyncedPipeline;
}) {
  const { config, stageCounts } = pipeline;
  const overrides = config.stageOverrides ?? {};
  const stages = [...config.stages].sort((a, b) => a.displayOrder - b.displayOrder);
  const stageDefs =
    stages.length > 0 ? stages : [{ id: "__all__", label: "Deals", displayOrder: 0 }];

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PipelineDeal[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setQuery("");
    setSearchResults(null);
    setSearching(false);
  }, [config.id]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const fd = new FormData();
      fd.set("configId", config.id);
      fd.set("q", trimmed);
      try {
        const rows = await searchPipelineDealsAction(fd);
        if (!cancelled) setSearchResults(rows);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, config.id]);

  const companies = searchResults ?? pipeline.companies;
  const isSearching = query.trim().length > 0;

  const allByStage = groupDealsByStage(
    companies,
    stageDefs,
    config.id,
    stageCounts,
    isSearching,
  );

  const visible = allByStage.filter(({ stage }) => isStageVisible(stage, overrides));
  const hidden = allByStage.filter(({ stage }) => !isStageVisible(stage, overrides));

  const visibleDeals = isSearching
    ? companies.length
    : visible.reduce((acc, col) => acc + col.totalCount, 0);
  const totalValue = visible.reduce(
    (acc, col) => acc + col.items.reduce((s, c) => s + (c.dealAmount ?? 0), 0),
    0,
  );

  const subtitle = isSearching
    ? `${visibleDeals} deal${visibleDeals === 1 ? "" : "s"} matching "${query.trim()}" · ${fmtAmount(totalValue)} total`
    : `${visibleDeals.toLocaleString()} deals · ${fmtAmount(totalValue)} total · synced ${fmtRelative(
        config.lastSyncAt,
      )}${hidden.length > 0 ? ` · ${hidden.length} stage${hidden.length === 1 ? "" : "s"} hidden` : ""}`;

  return (
    <div>
      <SectionHead
        t={t}
        title={config.label || config.providerPipelineName}
        subtitle={subtitle}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                placeholder="Search deals…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: 300,
                  padding: "8px 12px",
                  background: t.panelAlt,
                  color: t.ink,
                  border: `1px solid ${t.rule}`,
                  borderRadius: 6,
                  fontFamily: t.sans,
                  fontSize: 13,
                  opacity: searching ? 0.7 : 1,
                }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  style={{
                    padding: "6px 10px",
                    background: "transparent",
                    color: t.muted,
                    border: `1px solid ${t.rule}`,
                    borderRadius: 6,
                    fontFamily: t.sans,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <Chip t={t} tone="ghost">{config.provider}</Chip>
          </div>
        }
      />

      {isSearching && companies.length === 0 && !searching ? (
        <div
          style={{
            padding: 24,
            marginBottom: 18,
            textAlign: "center",
            background: t.panel,
            border: `1px dashed ${t.rule}`,
            borderRadius: 8,
            fontFamily: t.sans,
            fontSize: 13,
            color: t.muted,
          }}
        >
          No deals match your search.
        </div>
      ) : null}

      {/* Horizontal-scroll kanban. Each column fixed width so 10+ stages don't
          squeeze into unreadable slivers. Overscroll shows the full set. */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          paddingBottom: 8,
          maxWidth: "100%",
        }}
      >
        <div style={{ display: "flex", gap: 10, width: "max-content" }}>
          {visible.map((col) => (
            <StageColumn
              key={col.stage.id}
              t={t}
              configId={config.id}
              stage={col.stage}
              items={col.items}
              totalCount={col.totalCount}
              canHide
              isSearchActive={isSearching}
              hubspotPortalId={config.hubspotPortalId ?? null}
            />
          ))}
          {hidden.length > 0 ? (
            <HiddenStagesPanel
              t={t}
              configId={config.id}
              hidden={hidden.map(({ stage, totalCount }) => ({ stage, count: totalCount }))}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HiddenStagesPanel({
  t,
  configId,
  hidden,
}: {
  t: Theme;
  configId: string;
  hidden: Array<{
    stage: SyncedPipeline["config"]["stages"][number];
    count: number;
  }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  return (
    <div
      style={{
        width: expanded ? 260 : 160,
        flexShrink: 0,
        background: t.panel,
        border: `1px dashed ${t.rule}`,
        borderRadius: 8,
        padding: 10,
        minHeight: 100,
        alignSelf: "flex-start",
      }}
    >
      <button
        onClick={() => setExpanded((x) => !x)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: t.sans,
          fontSize: 12.5,
          color: t.muted,
          fontWeight: 500,
        }}
      >
        <span style={{ letterSpacing: "-0.005em" }}>
          {hidden.length} hidden stage{hidden.length === 1 ? "" : "s"}
        </span>
        <div style={{ fontFamily: t.sans, fontSize: 10.5, color: t.mutedSoft, marginTop: 2 }}>
          {expanded ? "click a stage to show" : "tap to expand"}
        </div>
      </button>
      {expanded ? (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {hidden.map(({ stage, count }) => (
            <form
              key={stage.id}
              action={(fd) => startTransition(() => toggleStageVisibilityAction(fd))}
              style={{ display: "flex" }}
            >
              <input type="hidden" name="configId" value={configId} />
              <input type="hidden" name="stageId" value={stage.id} />
              <input type="hidden" name="state" value="shown" />
              <button
                type="submit"
                style={{
                  flex: 1,
                  textAlign: "left",
                  padding: "6px 8px",
                  background: t.panelAlt,
                  border: `1px solid ${t.ruleSoft}`,
                  borderRadius: 6,
                  fontFamily: t.sans,
                  fontSize: 12,
                  color: t.inkSoft,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
                title={stage.closedStageType ?? ""}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {stage.label}
                </span>
                <span style={{ color: t.muted, fontSize: 11 }}>{count}</span>
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StageColumn({
  t,
  configId,
  stage,
  items: initialItems,
  totalCount,
  canHide,
  isSearchActive,
  hubspotPortalId,
}: {
  t: Theme;
  configId: string;
  stage: SyncedPipeline["config"]["stages"][number];
  items: SyncedPipeline["companies"];
  /** Real total for this stage; may exceed `items.length` if the server
   *  truncated the first page (default 20). */
  totalCount: number;
  canHide: boolean;
  isSearchActive: boolean;
  hubspotPortalId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [loading, startLoading] = useTransition();
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
    if (!isSearchActive) setExpanded(false);
  }, [initialItems, isSearchActive]);

  const visible = isSearchActive || expanded
    ? items
    : items.slice(0, CARDS_PER_COLUMN_DEFAULT);
  // The "more" count is whichever is bigger: the rows the server held back,
  // or rows we have but haven't expanded to show.
  const serverHasMore = totalCount > items.length;
  const remainingClient = items.length - visible.length;
  const stageValue = items.reduce((acc, c) => acc + (c.dealAmount ?? 0), 0);
  const label = stage.label;

  const loadAll = () => {
    if (!serverHasMore || loading) {
      setExpanded(true);
      return;
    }
    const fd = new FormData();
    fd.set("configId", configId);
    fd.set("stageId", stage.id === "__all__" ? "" : stage.id);
    startLoading(async () => {
      const full = await loadStageRowsAction(fd);
      setItems(full);
      setExpanded(true);
    });
  };

  return (
    <div
      style={{
        width: COLUMN_WIDTH,
        flexShrink: 0,
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 8,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        minHeight: 380,
      }}
    >
      <div
        style={{
          paddingBottom: 10,
          marginBottom: 10,
          borderBottom: `1px solid ${t.rule}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontFamily: t.sans,
              fontSize: 12.5,
              color: t.ink,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              flex: 1,
            }}
            title={label}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              color: t.muted,
              fontWeight: 500,
              flexShrink: 0,
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {totalCount}
          </span>
          {canHide ? (
            <form
              action={(fd) => startTransition(() => toggleStageVisibilityAction(fd))}
              style={{ display: "inline-flex", flexShrink: 0 }}
            >
              <input type="hidden" name="configId" value={configId} />
              <input type="hidden" name="stageId" value={stage.id} />
              <input type="hidden" name="state" value="hidden" />
              <button
                type="submit"
                title="Hide this stage"
                aria-label="Hide stage"
                style={{
                  width: 18,
                  height: 18,
                  padding: 0,
                  background: "transparent",
                  border: `1px solid ${t.ruleSoft}`,
                  borderRadius: 4,
                  color: t.muted,
                  fontFamily: t.mono,
                  fontSize: 10,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </form>
          ) : null}
        </div>
        {stageValue > 0 ? (
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 11,
              color: t.muted,
              marginTop: 2,
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {fmtAmount(stageValue)}
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div
          style={{
            padding: "18px 8px",
            textAlign: "center",
            fontFamily: t.sans,
            fontSize: 12,
            color: t.mutedSoft,
          }}
        >
          —
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((c) => (
            <DealCard key={c.id} t={t} c={c} hubspotPortalId={hubspotPortalId} />
          ))}
        </div>
      )}

      {!isSearchActive && (serverHasMore || remainingClient > 0) ? (
        <button
          onClick={loadAll}
          disabled={loading}
          style={{
            marginTop: 10,
            padding: "6px 10px",
            background: "transparent",
            color: t.muted,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 11,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading…" : `Show ${totalCount - visible.length} more`}
        </button>
      ) : !isSearchActive && expanded && items.length > CARDS_PER_COLUMN_DEFAULT ? (
        <button
          onClick={() => setExpanded(false)}
          style={{
            marginTop: 10,
            padding: "6px 10px",
            background: "transparent",
            color: t.muted,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Collapse
        </button>
      ) : null}
    </div>
  );
}

function DealCard({
  t,
  c,
  hubspotPortalId,
}: {
  t: Theme;
  c: SyncedPipeline["companies"][number];
  hubspotPortalId: string | null;
}) {
  const isEd = t.mode === "editorial";
  return <DealCardInner t={t} c={c} hubspotPortalId={hubspotPortalId} isEd={isEd} />;
}

/** 16x16 HubSpot sprocket — six-arm orange mark. */
function HubspotSprocket() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style={{ display: "block" }}>
      <g stroke="#FF7A59" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="6" y1="8.5" x2="18" y2="15.5" />
        <line x1="6" y1="15.5" x2="18" y2="8.5" />
      </g>
      <g fill="#FF7A59">
        <circle cx="12" cy="5" r="2.5" />
        <circle cx="12" cy="19" r="2.5" />
        <circle cx="5.5" cy="8.5" r="2.5" />
        <circle cx="18.5" cy="8.5" r="2.5" />
        <circle cx="5.5" cy="15.5" r="2.5" />
        <circle cx="18.5" cy="15.5" r="2.5" />
        <circle cx="12" cy="12" r="3" />
      </g>
    </svg>
  );
}

function DealCardInner({
  t,
  c,
  hubspotPortalId,
  isEd,
}: {
  t: Theme;
  c: SyncedPipeline["companies"][number];
  hubspotPortalId: string | null;
  isEd: boolean;
}) {
  const title = c.companyName || c.dealName || "Untitled deal";
  const sub = c.dealName && c.companyName ? c.dealName : null;
  const tagline = c.companyIndustry || c.companyDomain || null;
  const isMatched = !!c.fuelDataUuid;
  const [adding, startAdd] = useTransition();

  const card = (
    <div
      style={{
        background: isEd ? "#FFF" : t.panelAlt,
        // Matched cards get a colored left stripe; orphans get a dashed
        // muted stripe to make the distinction readable at a glance.
        border: `1px solid ${t.rule}`,
        borderLeft: isMatched
          ? `3px solid ${t.accent}`
          : `3px dashed ${t.ruleSoft}`,
        borderRadius: 6,
        padding: "10px 12px",
        cursor: isMatched ? "pointer" : "default",
        transition: "border-color 120ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: sub || tagline ? 4 : 0,
        }}
      >
        {isMatched ? (
          <Logo
            t={t}
            co={{ logo: title.slice(0, 2).toUpperCase(), name: c.companyName ?? title, uuid: c.fuelDataUuid ?? null }}
            size={22}
          />
        ) : null}
        <span
          style={{
            fontFamily: t.sans,
            fontSize: 13,
            fontWeight: 600,
            color: t.ink,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
            flex: 1,
          }}
          title={title}
        >
          {title}
        </span>
        {c.dealAmount != null && c.dealAmount > 0 ? (
          <span
            style={{
              fontFamily: t.sans,
              fontSize: 12,
              fontWeight: 600,
              color: t.ink,
              fontFeatureSettings: '"tnum" 1',
              flexShrink: 0,
            }}
          >
            {fmtAmount(c.dealAmount)}
          </span>
        ) : null}
        {hubspotPortalId && c.providerDealId ? (
          <a
            href={`https://app.hubspot.com/contacts/${encodeURIComponent(hubspotPortalId)}/record/0-3/${encodeURIComponent(c.providerDealId)}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open deal in HubSpot"
            aria-label="Open deal in HubSpot"
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 18,
              height: 18,
              borderRadius: 4,
              textDecoration: "none",
              opacity: 0.85,
            }}
          >
            <HubspotSprocket />
          </a>
        ) : null}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 11.5,
            color: t.inkSoft,
            marginBottom: tagline ? 2 : 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={sub}
        >
          {sub}
        </div>
      ) : null}
      {tagline ? (
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 11,
            color: t.muted,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={tagline}
        >
          {tagline}
        </div>
      ) : null}
      {!isMatched && !c.companyDomain ? (
        <div
          style={{
            marginTop: 4,
            fontFamily: t.mono,
            fontSize: 10,
            color: t.warn,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Missing domain
        </div>
      ) : null}
      <div
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: `1px solid ${t.ruleSoft}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 6,
          fontFamily: t.sans,
          fontSize: 10.5,
          color: t.muted,
          letterSpacing: "0.02em",
        }}
      >
        <span>{c.dealCloseDate ? `close · ${fmtDate(c.dealCloseDate)}` : "\u00a0"}</span>
        {!c.fuelDataUuid && c.companyDomain ? (
          <form
            onClick={(e) => e.stopPropagation()}
            action={(fd) => startAdd(() => addPipelineDealToFuelAction(fd))}
            style={{ display: "inline-flex" }}
          >
            <input type="hidden" name="pipelineCompanyId" value={c.id} />
            <input type="hidden" name="domain" value={c.companyDomain ?? ""} />
            <input type="hidden" name="name" value={c.companyName ?? ""} />
            <button
              type="submit"
              disabled={adding}
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                border: "none",
                fontFamily: t.sans,
                fontSize: 10,
                fontWeight: 600,
                color: "#0B1116",
                cursor: adding ? "default" : "pointer",
                background: adding
                  ? t.panelAlt
                  : "linear-gradient(135deg, #00B48A 0%, #ECD67F 100%)",
                opacity: adding ? 0.5 : 1,
              }}
            >
              {adding ? "Adding…" : "Add to Fuel"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );

  return c.fuelDataUuid ? (
    <Link
      href={`/company/${c.fuelDataUuid}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      {card}
    </Link>
  ) : (
    card
  );
}
