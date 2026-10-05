"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { accentGradient, framedPanelPadStyle, framedPanelStyle, onAccentText, type Theme } from "@/lib/theme";
import { BREAKPOINTS, TOUCH_TARGET_MIN, useNarrow } from "@/lib/responsive";
import {
  addPipelineDealToFuelAction,
  loadStageRowsAction,
  searchPipelineDealsAction,
  toggleStageVisibilityAction,
} from "@/app/(app)/pipeline/actions";
import { Chip, Logo, SectionHead } from "../atoms";
import { FilterMenu, PageToolbar } from "../ToolbarActions";

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
  pipelines = [],
  activePipelineId,
  onSelectPipeline,
}: {
  t: Theme;
  pipeline: SyncedPipeline;
  pipelines?: Array<{ key: string; label: string }>;
  activePipelineId?: string;
  onSelectPipeline?: (id: string) => void;
}) {
  const phone = useNarrow(BREAKPOINTS.md);
  const { config, stageCounts } = pipeline;
  const overrides = config.stageOverrides ?? {};
  const stages = [...config.stages].sort((a, b) => a.displayOrder - b.displayOrder);
  const stageDefs =
    stages.length > 0 ? stages : [{ id: "__all__", label: "Deals", displayOrder: 0 }];

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PipelineDeal[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

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

  const resolvedStageId =
    activeStageId && visible.some((col) => col.stage.id === activeStageId)
      ? activeStageId
      : (visible[0]?.stage.id ?? null);
  const activeColumn =
    visible.find((col) => col.stage.id === resolvedStageId) ?? visible[0] ?? null;

  const visibleDeals = isSearching
    ? companies.length
    : visible.reduce((acc, col) => acc + col.totalCount, 0);
  const totalValue = visible.reduce(
    (acc, col) => acc + col.items.reduce((s, c) => s + (c.dealAmount ?? 0), 0),
    0,
  );

  const stageLabel = activeColumn?.stage.label;
  const stageDeals = activeColumn?.totalCount ?? 0;
  const stageValue = (activeColumn?.items ?? []).reduce(
    (s, c) => s + (c.dealAmount ?? 0),
    0,
  );
  const subtitle = isSearching
    ? `${visibleDeals} matching “${query.trim()}” · ${fmtAmount(totalValue)}`
    : phone
      ? [stageLabel, `${stageDeals.toLocaleString()} deals`, fmtAmount(stageValue)]
          .filter(Boolean)
          .join(" · ")
      : `${visibleDeals.toLocaleString()} deals · ${fmtAmount(totalValue)} total · synced ${fmtRelative(
          config.lastSyncAt,
        )}${hidden.length > 0 ? ` · ${hidden.length} stage${hidden.length === 1 ? "" : "s"} hidden` : ""}`;
  const filterActiveCount =
    (query.trim() ? 1 : 0) +
    (phone && resolvedStageId && resolvedStageId !== visible[0]?.stage.id ? 1 : 0) +
    (phone && pipelines.length > 1 && activePipelineId && activePipelineId !== pipelines[0]?.key
      ? 1
      : 0);

  return (
    <div className="fuel-page fuel-pipeline-page">
      <SectionHead
        t={t}
        title={config.label || config.providerPipelineName}
        subtitle={subtitle}
        right={
          <PageToolbar
            t={t}
            extra={phone ? null : <Chip t={t} tone="ghost">{config.provider}</Chip>}
            filter={
              <FilterMenu t={t} activeCount={filterActiveCount}>
                {phone && pipelines.length > 1 && onSelectPipeline ? (
                  <div
                    role="tablist"
                    aria-label="Synced pipelines"
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {pipelines.map((tab) => {
                      const selected = tab.key === (activePipelineId ?? config.id);
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => onSelectPipeline(tab.key)}
                          style={{
                            alignItems: "center",
                            background: selected ? t.accentTint : "transparent",
                            border: `1px solid ${selected ? `${t.accent}66` : t.rule}`,
                            borderRadius: 8,
                            color: selected ? t.ink : t.muted,
                            cursor: "pointer",
                            display: "flex",
                            fontFamily: t.sans,
                            fontSize: 13,
                            fontWeight: selected ? 650 : 500,
                            justifyContent: "space-between",
                            minHeight: TOUCH_TARGET_MIN,
                            padding: "8px 12px",
                            textAlign: "left",
                            width: "100%",
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {phone ? (
                  <div
                    role="tablist"
                    aria-label="Pipeline stages"
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {visible.map((col) => {
                      const selected = col.stage.id === resolvedStageId;
                      return (
                        <button
                          key={col.stage.id}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => setActiveStageId(col.stage.id)}
                          style={{
                            alignItems: "center",
                            background: selected ? t.accentTint : "transparent",
                            border: `1px solid ${selected ? `${t.accent}66` : t.rule}`,
                            borderRadius: 8,
                            color: selected ? t.ink : t.muted,
                            cursor: "pointer",
                            display: "flex",
                            fontFamily: t.sans,
                            fontSize: 13,
                            fontWeight: selected ? 650 : 500,
                            justifyContent: "space-between",
                            minHeight: TOUCH_TARGET_MIN,
                            padding: "8px 12px",
                            textAlign: "left",
                            width: "100%",
                          }}
                        >
                          <span>{col.stage.label}</span>
                          <span
                            style={{
                              color: selected ? t.accent : t.mutedSoft,
                              fontFamily: t.mono,
                              fontSize: 12,
                              fontWeight: 650,
                            }}
                          >
                            {col.totalCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <input
                  className="fuel-pipeline-search"
                  placeholder="Search deals…"
                  aria-label="Search deals"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    background: t.panelAlt,
                    color: t.ink,
                    border: `1px solid ${t.rule}`,
                    borderRadius: 8,
                    fontFamily: t.sans,
                    fontSize: 16,
                    opacity: searching ? 0.7 : 1,
                    minHeight: TOUCH_TARGET_MIN,
                    width: "100%",
                  }}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    style={{
                      alignSelf: "flex-start",
                      background: "transparent",
                      border: "none",
                      color: t.accent,
                      cursor: "pointer",
                      fontFamily: t.sans,
                      fontSize: 13,
                      fontWeight: 650,
                      minHeight: TOUCH_TARGET_MIN,
                      padding: "0 4px",
                    }}
                  >
                    Clear search
                  </button>
                ) : null}
                {phone ? (
                  <Link
                    href="/account/integrations/hubspot"
                    style={{
                      color: t.muted,
                      fontFamily: t.sans,
                      fontSize: 13,
                      fontWeight: 550,
                      minHeight: TOUCH_TARGET_MIN,
                      padding: "8px 2px",
                      textDecoration: "none",
                    }}
                  >
                    Manage pipelines →
                  </Link>
                ) : null}
              </FilterMenu>
            }
          />
        }
      />

      {isSearching && companies.length === 0 && !searching ? (
        <div
          style={{
            ...framedPanelStyle(t),
            marginBottom: 8,
            padding: 24,
            textAlign: "center",
            fontFamily: t.sans,
            fontSize: 14,
            color: t.muted,
          }}
        >
          No deals match your search.
        </div>
      ) : null}

      {phone ? (
        <div className="fuel-pipeline-mobile">
          {activeColumn ? (
            <StageColumn
              key={activeColumn.stage.id}
              t={t}
              configId={config.id}
              stage={activeColumn.stage}
              items={activeColumn.items}
              totalCount={activeColumn.totalCount}
              canHide={false}
              isSearchActive={isSearching}
              hubspotPortalId={config.hubspotPortalId ?? null}
              phone
            />
          ) : null}

          {hidden.length > 0 ? (
            <HiddenStagesPanel
              t={t}
              configId={config.id}
              hidden={hidden.map(({ stage, totalCount }) => ({
                stage,
                count: totalCount,
              }))}
              phone
            />
          ) : null}
        </div>
      ) : (
        <div className="fuel-kanban">
          <div className="fuel-kanban__track">
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
                hidden={hidden.map(({ stage, totalCount }) => ({
                  stage,
                  count: totalCount,
                }))}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function HiddenStagesPanel({
  t,
  configId,
  hidden,
  phone = false,
}: {
  t: Theme;
  configId: string;
  hidden: Array<{
    stage: SyncedPipeline["config"]["stages"][number];
    count: number;
  }>;
  phone?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  return (
    <div
      className={phone ? "fuel-pipeline-hidden" : undefined}
      style={{
        width: phone ? "100%" : expanded ? 260 : 160,
        flexShrink: 0,
        background: t.panel,
        border: `1px dashed ${t.rule}`,
        borderRadius: 8,
        padding: phone ? 12 : 10,
        minHeight: phone ? undefined : 100,
        alignSelf: phone ? "stretch" : "flex-start",
        marginTop: phone ? 4 : 0,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: phone ? "8px 0" : 0,
          minHeight: phone ? TOUCH_TARGET_MIN : undefined,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: t.sans,
          fontSize: phone ? 14 : 12.5,
          color: t.muted,
          fontWeight: 500,
        }}
      >
        <span style={{ letterSpacing: "-0.005em" }}>
          {hidden.length} hidden stage{hidden.length === 1 ? "" : "s"}
        </span>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: phone ? 12 : 10.5,
            color: t.mutedSoft,
            marginTop: 2,
          }}
        >
          {expanded ? "Tap a stage to show" : "Tap to expand"}
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
                  padding: phone ? "12px 12px" : "6px 8px",
                  minHeight: phone ? TOUCH_TARGET_MIN : undefined,
                  background: t.panelAlt,
                  border: `1px solid ${t.ruleSoft}`,
                  borderRadius: 6,
                  fontFamily: t.sans,
                  fontSize: phone ? 14 : 12,
                  color: t.inkSoft,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
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
                <span style={{ color: t.muted, fontSize: phone ? 13 : 11 }}>{count}</span>
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
  phone = false,
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
  phone?: boolean;
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
      className={phone ? "fuel-pipeline-stage-panel" : "fuel-kanban__col"}
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderRadius: 12,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        minHeight: phone ? undefined : 380,
        width: phone ? "100%" : undefined,
        padding: phone ? 14 : 10,
      }}
    >
      <div
        style={{
          paddingBottom: 10,
          marginBottom: 10,
          borderBottom: `1px solid ${t.rule}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: t.sans,
              fontSize: phone ? 15 : 12.5,
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
              fontSize: phone ? 13 : 11,
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
                  width: phone ? TOUCH_TARGET_MIN : 18,
                  height: phone ? TOUCH_TARGET_MIN : 18,
                  padding: 0,
                  background: "transparent",
                  border: `1px solid ${t.ruleSoft}`,
                  borderRadius: 6,
                  color: t.muted,
                  fontFamily: t.mono,
                  fontSize: phone ? 16 : 10,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
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
              fontSize: phone ? 13 : 11,
              color: t.muted,
              marginTop: 4,
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
            padding: phone ? "28px 12px" : "18px 8px",
            textAlign: "center",
            fontFamily: t.sans,
            fontSize: phone ? 14 : 12,
            color: t.mutedSoft,
          }}
        >
          No deals in this stage
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: phone ? 10 : 8,
          }}
        >
          {visible.map((c) => (
            <DealCard
              key={c.id}
              t={t}
              c={c}
              hubspotPortalId={hubspotPortalId}
              phone={phone}
            />
          ))}
        </div>
      )}

      {!isSearchActive && (serverHasMore || remainingClient > 0) ? (
        <button
          type="button"
          onClick={loadAll}
          disabled={loading}
          style={{
            marginTop: 12,
            padding: phone ? "12px 14px" : "6px 10px",
            minHeight: phone ? TOUCH_TARGET_MIN : undefined,
            background: "transparent",
            color: t.muted,
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            fontFamily: t.sans,
            fontSize: phone ? 14 : 11,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading…" : `Show ${totalCount - visible.length} more`}
        </button>
      ) : !isSearchActive && expanded && items.length > CARDS_PER_COLUMN_DEFAULT ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          style={{
            marginTop: 12,
            padding: phone ? "12px 14px" : "6px 10px",
            minHeight: phone ? TOUCH_TARGET_MIN : undefined,
            background: "transparent",
            color: t.muted,
            border: `1px solid ${t.rule}`,
            borderRadius: 8,
            fontFamily: t.sans,
            fontSize: phone ? 14 : 11,
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
  phone = false,
}: {
  t: Theme;
  c: SyncedPipeline["companies"][number];
  hubspotPortalId: string | null;
  phone?: boolean;
}) {
  const isEd = t.mode === "editorial";
  return (
    <DealCardInner
      t={t}
      c={c}
      hubspotPortalId={hubspotPortalId}
      isEd={isEd}
      phone={phone}
    />
  );
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
  phone = false,
}: {
  t: Theme;
  c: SyncedPipeline["companies"][number];
  hubspotPortalId: string | null;
  isEd: boolean;
  phone?: boolean;
}) {
  const title = c.companyName || c.dealName || "Untitled deal";
  const sub = c.dealName && c.companyName ? c.dealName : null;
  const tagline = c.companyIndustry || c.companyDomain || null;
  const isMatched = !!c.fuelDataUuid;
  const [adding, startAdd] = useTransition();

  const card = (
    <div
      style={{
        ...framedPanelPadStyle(t, { padding: phone ? "14px 14px" : "10px 12px" }),
        background: isEd ? t.panel : t.panelAlt,
        cursor: isMatched ? "pointer" : "default",
        transition: "border-color 120ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: sub || tagline ? 6 : 0,
        }}
      >
        {isMatched ? (
          <Logo
            t={t}
            co={{
              logo: title.slice(0, 2).toUpperCase(),
              name: c.companyName ?? title,
              uuid: c.fuelDataUuid ?? null,
            }}
            size={phone ? 28 : 22}
          />
        ) : null}
        <span
          style={{
            fontFamily: t.sans,
            fontSize: phone ? 15 : 13,
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
              fontSize: phone ? 14 : 12,
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
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(
                `https://app.hubspot.com/contacts/${encodeURIComponent(hubspotPortalId)}/record/0-3/${encodeURIComponent(c.providerDealId)}`,
                "_blank",
                "noopener,noreferrer",
              );
            }}
            title="Open deal in HubSpot"
            aria-label="Open deal in HubSpot"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              width: phone ? TOUCH_TARGET_MIN : 18,
              height: phone ? TOUCH_TARGET_MIN : 18,
              borderRadius: 6,
              opacity: 0.85,
            }}
          >
            <HubspotSprocket />
          </button>
        ) : null}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: t.sans,
            fontSize: phone ? 13 : 11.5,
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
            fontSize: phone ? 13 : 11,
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
            fontSize: phone ? 11 : 10,
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
          marginTop: phone ? 10 : 6,
          paddingTop: phone ? 10 : 6,
          borderTop: `1px solid ${t.ruleSoft}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          fontFamily: t.sans,
          fontSize: phone ? 12 : 10.5,
          color: t.muted,
          letterSpacing: "0.02em",
          flexWrap: phone ? "wrap" : undefined,
        }}
      >
        <span>{c.dealCloseDate ? `close · ${fmtDate(c.dealCloseDate)}` : "\u00a0"}</span>
        {!c.fuelDataUuid && c.companyDomain ? (
          <form
            onClick={(e) => e.stopPropagation()}
            action={(fd) => startAdd(() => addPipelineDealToFuelAction(fd))}
            style={{ display: "inline-flex", marginLeft: "auto" }}
          >
            <input type="hidden" name="pipelineCompanyId" value={c.id} />
            <input type="hidden" name="domain" value={c.companyDomain ?? ""} />
            <input type="hidden" name="name" value={c.companyName ?? ""} />
            <button
              type="submit"
              disabled={adding}
              style={{
                padding: phone ? "10px 14px" : "2px 8px",
                minHeight: phone ? TOUCH_TARGET_MIN : undefined,
                borderRadius: 6,
                border: "none",
                fontFamily: t.sans,
                fontSize: phone ? 13 : 10,
                fontWeight: 600,
                color: onAccentText(t),
                cursor: adding ? "default" : "pointer",
                background: adding ? t.panelAlt : accentGradient(t),
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
