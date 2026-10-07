"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import type { Theme } from "@/lib/theme";
import { groupCardHeadStyle, groupCardStyle } from "@/lib/theme";
import type { CompanyIntelligenceRow } from "@/lib/intelligence/types";
import type { DataRoomDocumentSlot, DataRoomSnapshot } from "@/lib/data-room/types";
import type { SignalCatalogItem } from "@/lib/signals/group-catalog";
import {
  catalogCategoryTabKeys,
  type FeedSignalGroup,
  type IntelligenceFeedItem,
} from "@/lib/intelligence/feed";
import {
  INTELLIGENCE_DATE_PRESETS,
  type IntelligenceCustomRange,
  type IntelligenceDatePreset,
} from "@/lib/intelligence/filters";
import type { PaginatedResponse } from "@/lib/list-pagination";
import { INTELLIGENCE_HEAD_ACTION_LABELS } from "@/lib/intelligence/head-actions";
import { formatCategoryLabel, formatPeriodDisplay } from "./format";
import {
  FEED_ROW_GRID_COLUMNS,
  companyTabPrimaryBtnStyle,
  companyTabSecondaryBtnStyle,
  feedSearchFieldStyle,
  feedSearchIconStyle,
  focusBannerStyle,
  ghostButtonStyle,
  inputStyle,
  timelinePanelStyle,
} from "./styles";
import { LogIntelligenceDrawer } from "./LogIntelligenceDrawer";
import { SignalDetailDrawer } from "./SignalDetailDrawer";
import { AddSourceDrawer } from "./AddSourceDrawer";
import {
  SourcesDrawer,
} from "./SourcesDrawer";
import { DocumentNoticeBanner } from "@/components/data-room/DocumentNoticeBanner";
import { MagicShimmer } from "@/components/ai/MagicShimmer";
import {
  applyPageNoticeUpdate,
  EMPTY_PAGE_NOTICE,
  flushPendingPageNotice,
} from "@/lib/intelligence/page-notice";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import {
  clampListPage,
  DEFAULT_LIST_PAGE_SIZE,
  ListPagination,
  type ListPageSize,
} from "@/components/ui/ListPagination";
import { useWorkspaceTourOptional } from "@/components/workspace-tour/WorkspaceTourContext";
import { useDrawerPresence } from "@/components/drawer/motion";
import { useNarrow } from "@/lib/responsive";
import {
  CreateIconButton,
  FilterGroup,
  FilterMenu,
  FilterOption,
  FilterSearch,
  PageToolbar,
} from "@/components/ToolbarActions";

const SEARCH_DEBOUNCE_MS = 300;
/** Skeleton row count — enough to read as a list without a tall placeholder. */
const FEED_SKELETON_ROWS = 6;
/** Cap so a 50-row page size never renders a huge placeholder. */
const FEED_SKELETON_MAX_ROWS = 10;
/** Floor for the feed body so an empty/error state keeps the panel from collapsing. */
const FEED_BODY_MIN_HEIGHT = 120;

type ObservationLike = {
  id: string;
  signalId: string;
  signalLabel: string;
  signalCategory: string;
  signalKind: "quantitative" | "qualitative" | "boolean";
  signalUnit: string | null;
  period: string;
  valueNumeric: number | null;
  valueText: string | null;
  valueBool: boolean | null;
  confidence: number | null;
  rawSnippet: string | null;
  contextItemId: string | null;
  createdAt: string;
};

/** Placeholder rows mirror `SignalRow` geometry so the feed never jumps on load. */
function SignalFeedSkeleton({ t, rows }: { t: Theme; rows: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading intelligence">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="fuel-intel-feed-item fuel-group__item">
          <div className="fuel-intel-feed-row" style={{ cursor: "default" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <MagicShimmer theme={t} width="54%" height={9} rounded={3} />
              <MagicShimmer theme={t} width={i % 2 ? "72%" : "88%"} height={12} rounded={4} />
            </div>
            <MagicShimmer theme={t} width={i % 3 ? "38%" : "54%"} height={12} rounded={4} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <MagicShimmer theme={t} width={44} height={12} rounded={4} />
            </div>
            <div
              style={{
                alignItems: "center",
                display: "flex",
                gap: 6,
                justifyContent: "flex-end",
                minHeight: 22,
              }}
            >
              <MagicShimmer theme={t} width={72} height={19} rounded={7} />
              <MagicShimmer theme={t} width={68} height={19} rounded={7} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalRow({
  t,
  latest,
  history,
  blinking,
  onSelect,
}: {
  t: Theme;
  latest: IntelligenceFeedItem;
  history: IntelligenceFeedItem[];
  blinking: boolean;
  onSelect: (item: IntelligenceFeedItem) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const sourceCount = latest.sourceCount;

  return (
    <div
      data-feed-id={latest.id}
      className="fuel-intel-feed-item fuel-group__item"
      style={{
        animation: blinking ? "intelHighlight 1.6s ease-out 2" : undefined,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        className="fuel-intel-feed-row"
        onClick={() => onSelect(latest)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(latest);
          }
        }}
        style={
          {
            ["--fuel-row-accent" as string]: t.accent,
          } as CSSProperties
        }
        onMouseEnter={(e) => {
          e.currentTarget.style.background = t.mode === "signal" ? "rgba(255, 255, 255, 0.03)" : t.panelAlt;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span
            style={{
              color: t.accent,
              fontFamily: t.sans,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {latest.categoryLabel}
          </span>
          <span
            style={{
              color: t.ink,
              fontFamily: t.sans,
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {latest.signalName}
          </span>
        </div>
        <strong
          style={{
            color: t.ink,
            fontFamily: t.sans,
            fontSize: 15,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
            minWidth: 0,
            overflow: "hidden",
            textAlign: "left",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {latest.valueLabel}
        </strong>
        <time
          style={{
            color: t.muted,
            fontFamily: t.sans,
            fontSize: 12.5,
            fontVariantNumeric: "tabular-nums",
            fontWeight: 500,
            textAlign: "right",
            whiteSpace: "nowrap",
          }}
        >
          {formatPeriodDisplay(latest.period)}
        </time>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 6,
            justifyContent: "flex-end",
            minHeight: 22,
            visibility: sourceCount > 0 || history.length > 0 ? "visible" : "hidden",
          }}
        >
          {sourceCount > 0 ? (
            <span
              title={`${sourceCount} linked source${sourceCount === 1 ? "" : "s"}`}
              style={{
                background: t.panelInner,
                border: `1px solid ${t.ruleSoft}`,
                borderRadius: 7,
                color: t.muted,
                display: "inline-flex",
                gap: 5,
                fontFamily: t.sans,
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1,
                padding: "3px 8px",
                whiteSpace: "nowrap",
              }}
            >
              <span>Sources</span>
              <span>{sourceCount}</span>
            </span>
          ) : null}
          {history.length > 0 ? (
            <button
              type="button"
              aria-expanded={historyOpen}
              onClick={(e) => {
                e.stopPropagation();
                setHistoryOpen((o) => !o);
              }}
              style={{
                background: historyOpen ? `${t.accent}14` : t.panelInner,
                border: `1px solid ${t.ruleSoft}`,
                borderRadius: 7,
                color: t.muted,
                cursor: "pointer",
                display: "inline-flex",
                gap: 5,
                fontFamily: t.sans,
                fontSize: 11,
                fontWeight: 600,
                lineHeight: 1,
                padding: "3px 8px",
                whiteSpace: "nowrap",
              }}
            >
              <span>History</span>
              <span>{history.length}</span>
              <span aria-hidden="true">{historyOpen ? "▴" : "▾"}</span>
            </button>
          ) : null}
        </div>
      </div>
      {historyOpen
        ? history.map((row) => (
            <div
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(row)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(row);
                }
              }}
              style={{
                alignItems: "center",
                background: t.panelAlt,
                borderTop: `1px solid ${t.ruleSoft}`,
                cursor: "pointer",
                display: "grid",
                gap: "10px 16px",
                gridTemplateColumns: FEED_ROW_GRID_COLUMNS,
                padding: "8px 18px 8px 28px",
              }}
            >
              <span style={{ color: t.mutedSoft, fontFamily: t.sans, fontSize: 11 }}>
                Earlier
              </span>
              <span
                style={{
                  color: t.inkSoft,
                  fontFamily: t.sans,
                  fontSize: 12.5,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.valueLabel}
              </span>
              <time
                style={{
                  color: t.mutedSoft,
                  fontFamily: t.sans,
                  fontSize: 12,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                }}
              >
                {formatPeriodDisplay(row.period)}
              </time>
              <span />
            </div>
          ))
        : null}
    </div>
  );
}

export function IntelligencePage({
  t,
  companyUuid,
  signalCatalog,
  observations,
  companyIntelligence,
  currentPeriod,
  dataRoomSlots,
  initialSourcesTotal = 0,
  creditBalance,
  highlightIds = [],
  onClearHighlight,
  onFocusIntelligence,
  onIntelligenceChange,
  onObservationsChange,
  onCreditBalanceChange,
  onDataRoomSnapshot,
  onUpdateBenchmark,
  timelineShimmer = false,
}: {
  t: Theme;
  companyUuid: string;
  signalCatalog: SignalCatalogItem[];
  observations: ObservationLike[];
  companyIntelligence: CompanyIntelligenceRow[];
  currentPeriod?: string;
  dataRoomSlots: DataRoomDocumentSlot[];
  /** Docs ∪ HubSpot notes — matches Sources drawer meta.total. */
  initialSourcesTotal?: number;
  creditBalance: number;
  highlightIds?: string[];
  onClearHighlight?: () => void;
  onFocusIntelligence?: (ids: string[], label: string) => void;
  onIntelligenceChange?: (items: CompanyIntelligenceRow[]) => void;
  onObservationsChange?: (observations: ObservationLike[]) => void;
  onCreditBalanceChange?: (balance: number) => void;
  onDataRoomSnapshot?: (snapshot: DataRoomSnapshot) => void;
  onUpdateBenchmark: () => void;
  timelineShimmer?: boolean;
}) {
  const tour = useWorkspaceTourOptional();
  const router = useRouter();
  /** Matches `.fuel-intel-tab` mobile breakpoint (max-width: 639px). */
  const phone = useNarrow(640);
  const boardRef = useRef<HTMLDivElement>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [datePreset, setDatePreset] = useState<IntelligenceDatePreset>("current-quarter");
  const [customRange, setCustomRange] = useState<IntelligenceCustomRange | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const addSourcePresence = useDrawerPresence(showAddSource);
  const [pageNotice, setPageNotice] = useState(EMPTY_PAGE_NOTICE);
  const addSourceDrawerBlocksNotice =
    showAddSource || addSourcePresence.mounted;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [blinkingIds, setBlinkingIds] = useState<string[]>([]);
  const [focusLabel, setFocusLabel] = useState<string | null>(null);
  const [listPage, setListPage] = useState(0);
  const [listPageSize, setListPageSize] = useState<ListPageSize>(DEFAULT_LIST_PAGE_SIZE);
  const [signalGroups, setSignalGroups] = useState<FeedSignalGroup[]>([]);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [sourcesRefreshKey, setSourcesRefreshKey] = useState(0);
  const [sourcesTotal, setSourcesTotal] = useState(initialSourcesTotal);
  const feedBodyRef = useRef<HTMLDivElement>(null);
  const [feedBodyHeight, setFeedBodyHeight] = useState(0);
  const focusActive = highlightIds.length > 0;

  useEffect(() => {
    if (!highlightIds.length) setFocusLabel(null);
  }, [highlightIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Reset to first page when server-side filters change.
  useEffect(() => {
    setListPage(0);
  }, [categoryFilter, debouncedSearch, datePreset, customRange, focusActive, listPageSize]);

  useEffect(() => {
    const ctrl = new AbortController();
    const offset = listPage * listPageSize;
    const params = new URLSearchParams({
      limit: String(listPageSize),
      offset: String(offset),
    });
    if (categoryFilter !== "All") params.set("category", categoryFilter);
    if (debouncedSearch) params.set("q", debouncedSearch);
    params.set("datePreset", datePreset);
    if (datePreset === "custom" && customRange) {
      params.set("customStart", customRange.start);
      params.set("customEnd", customRange.end);
    }
    if (focusActive && highlightIds.length > 0) {
      params.set("focusIds", highlightIds.join(","));
    }

    setFeedLoading(true);
    setFeedError(null);

    void (async () => {
      // Clamping re-runs this effect, so the skeleton must stay up until the
      // corrected page resolves — otherwise the list flashes back and forth.
      let refetching = false;
      try {
        const res = await fetch(
          `/api/company/${companyUuid}/intelligence/feed?${params.toString()}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) {
          throw new Error(`feed_${res.status}`);
        }
        const json = (await res.json()) as PaginatedResponse<FeedSignalGroup>;
        if (ctrl.signal.aborted) return;
        const clamped = clampListPage(listPage, json.meta.total, listPageSize);
        setFeedTotal(json.meta.total);
        if (clamped !== listPage) {
          refetching = true;
          setListPage(clamped);
          return;
        }
        setSignalGroups(json.data);
      } catch (error) {
        if (ctrl.signal.aborted) return;
        setFeedError(error instanceof Error ? error.message : "feed_failed");
        setSignalGroups([]);
        setFeedTotal(0);
      } finally {
        if (!ctrl.signal.aborted && !refetching) setFeedLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [
    companyUuid,
    listPage,
    listPageSize,
    categoryFilter,
    debouncedSearch,
    datePreset,
    customRange,
    focusActive,
    highlightIds,
    feedRefreshKey,
  ]);

  const feedItems = useMemo(
    () => signalGroups.flatMap((group) => group.items),
    [signalGroups],
  );

  const tabKeys = useMemo(
    () => ["All", ...catalogCategoryTabKeys(signalCatalog)],
    [signalCatalog],
  );

  useEffect(() => {
    setSourcesTotal(initialSourcesTotal);
  }, [initialSourcesTotal]);

  const selectedItem = useMemo(
    () => feedItems.find((item) => item.id === selectedId) ?? null,
    [feedItems, selectedId],
  );

  const selectedSiblings = useMemo(() => {
    if (!selectedItem) return [];
    const group = signalGroups.find(
      (g) =>
        g.categoryKey === selectedItem.categoryKey &&
        g.signalName === selectedItem.signalName,
    );
    return group?.items ?? [selectedItem];
  }, [signalGroups, selectedItem]);

  useEffect(() => {
    if (!highlightIds.length) return;
    const idSet = new Set(highlightIds);
    setBlinkingIds(
      feedItems
        .filter((item) => {
          if (idSet.has(item.id)) return true;
          if (item.intelligenceId != null && idSet.has(item.intelligenceId)) return true;
          if (item.observationId != null && idSet.has(item.observationId)) return true;
          return item.sources.some((source) => idSet.has(source.id));
        })
        .map((item) => item.id),
    );
    const blinkTimer = window.setTimeout(() => setBlinkingIds([]), 900);
    const scrollTimer = window.setTimeout(() => {
      boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(scrollTimer);
    };
  }, [highlightIds, feedItems]);

  const handleFocusIntelligence = (ids: string[], label: string) => {
    setFocusLabel(label);
    onFocusIntelligence?.(ids, label);
  };

  const handleClearFocus = () => {
    setFocusLabel(null);
    onClearHighlight?.();
  };

  const refreshFeed = () => setFeedRefreshKey((k) => k + 1);
  const refreshSources = () => setSourcesRefreshKey((k) => k + 1);

  const handlePageNotice = useCallback(
    (message: string | null) => {
      setPageNotice((current) =>
        applyPageNoticeUpdate(current, message, addSourceDrawerBlocksNotice),
      );
    },
    [addSourceDrawerBlocksNotice],
  );

  useEffect(() => {
    setPageNotice((current) =>
      flushPendingPageNotice(current, addSourceDrawerBlocksNotice),
    );
  }, [addSourceDrawerBlocksNotice]);

  const handleIntelligenceGenerated = (ids: string[], _sourceTitle: string) => {
    const feedIds = ids.map((id) => `intel:${id}`);
    setCategoryFilter("All");
    setSearchQuery("");
    setDebouncedSearch("");
    setDatePreset("current-quarter");
    setCustomRange(null);
    setListPage(0);
    setShowAddSource(false);
    setShowSources(false);
    setSelectedId(null);
    handleClearFocus();
    setBlinkingIds(feedIds);
    window.setTimeout(() => setBlinkingIds([]), 1600);
    window.setTimeout(() => {
      boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    refreshFeed();
    refreshSources();
  };

  const filtersActive = Boolean(
    searchQuery.trim() ||
      categoryFilter !== "All" ||
      datePreset !== "current-quarter" ||
      customRange != null,
  );

  const boardLoading = feedLoading || timelineShimmer;
  const focusItemCount = feedItems.length;
  /** Empty feed on phone: skip chips/search until the user has something to filter. */
  const hideFeedChrome =
    phone && !focusActive && !filtersActive && feedTotal === 0 && !feedError;

  // Hold the last rendered feed height while a refresh is pending so filter,
  // page-size, and page changes swap content for skeleton without collapsing.
  useEffect(() => {
    if (boardLoading) return;
    const height = feedBodyRef.current?.offsetHeight ?? 0;
    if (height > 0) setFeedBodyHeight(height);
  }, [boardLoading, signalGroups, feedError, feedTotal]);

  const feedSkeletonRows = Math.min(
    listPageSize,
    FEED_SKELETON_MAX_ROWS,
    Math.max(signalGroups.length, FEED_SKELETON_ROWS),
  );

  const board = (
    <div
      ref={boardRef}
      className="fuel-company-tab__panel"
      style={{ ...timelinePanelStyle(t), padding: 0, gap: 0 }}
    >
      {focusActive ? (
        <div style={{ ...focusBannerStyle(t), margin: 12 }}>
          <span style={{ color: t.inkSoft, fontFamily: t.sans, fontSize: 13 }}>
            Showing {focusItemCount} intelligence item
            {focusItemCount === 1 ? "" : "s"}
            {focusLabel ? (
              <>
                {" "}
                from <strong style={{ color: t.ink }}>{focusLabel}</strong>
              </>
            ) : (
              " from focus"
            )}
            {feedTotal > signalGroups.length
              ? ` (${feedTotal} signals)`
              : null}
          </span>
          <button type="button" onClick={handleClearFocus} style={ghostButtonStyle(t)}>
            Show all intelligence
          </button>
        </div>
      ) : null}

      {!focusActive && !hideFeedChrome && !phone ? (
        <div
          role="tablist"
          aria-label="Intelligence categories"
          className="fuel-chip-scroll"
          style={{ borderBottom: `1px solid ${t.ruleSoft}` }}
        >
          {tabKeys.map((key) => {
            const active = categoryFilter === key;
            const label = key === "All" ? "All" : formatCategoryLabel(key);
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategoryFilter(key)}
                style={{
                  background: active ? t.ink : t.mode === "editorial" ? t.bg : t.panelAlt,
                  border: `1px solid ${active ? t.ink : t.rule}`,
                  borderRadius: 999,
                  color: active ? (t.mode === "editorial" ? t.panel : t.bg) : t.inkSoft,
                  cursor: "pointer",
                  fontFamily: t.sans,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  padding: "6px 12px",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {!focusActive && !hideFeedChrome && !phone ? (
        <div
          className="fuel-intel-tab__toolbar"
          style={{
            alignItems: "center",
            borderBottom: `1px solid ${t.ruleSoft}`,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "space-between",
            padding: "10px 14px",
          }}
        >
          <label
            className="fuel-intel-search"
            style={{
              display: "block",
              flex: "1 1 220px",
              minWidth: 0,
              position: "relative",
            }}
          >
            <span aria-hidden style={feedSearchIconStyle(t)}>
              ⌕
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search signals…"
              aria-label="Search intelligence"
              style={feedSearchFieldStyle(t)}
            />
          </label>
          <div
            className="fuel-intel-tab__toolbar-meta"
            style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}
          >
            <select
              aria-label="Date range"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as IntelligenceDatePreset)}
              style={{
                ...inputStyle(t),
                color: t.inkSoft,
                fontFamily: t.sans,
                fontWeight: 600,
                width: "auto",
              }}
            >
              {INTELLIGENCE_DATE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            {datePreset === "custom" ? (
              <DateRangePicker
                t={t}
                value={customRange}
                onChange={setCustomRange}
                onClear={() => setCustomRange(null)}
                aria-label="Custom date range"
                numberOfMonths={2}
              />
            ) : null}
            {!phone ? (
              <button
                type="button"
                onClick={() => setShowSources(true)}
                style={{
                  ...ghostButtonStyle(t),
                  alignItems: "center",
                  display: "inline-flex",
                  gap: 6,
                }}
              >
                Sources
                <span
                  style={{
                    background: t.panelInner,
                    borderRadius: 999,
                    color: t.inkSoft,
                    fontFamily: t.mono,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                  }}
                >
                  {sourcesTotal}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="fuel-group" style={groupCardStyle(t, { padding: phone ? 14 : 12 })}>
        <div className="fuel-group__head" style={groupCardHeadStyle(t)}>
          <span className="fuel-group__title" style={{ color: t.ink, fontFamily: t.sans, fontSize: phone ? 15 : 13 }}>
            Signals
          </span>
          <span className="fuel-group__meta" style={{ color: t.muted, fontFamily: t.sans, fontSize: phone ? 13 : 12 }}>
            {feedLoading ? "…" : feedTotal}
          </span>
        </div>
      <div
        ref={feedBodyRef}
        className="fuel-intel-feed fuel-group__body"
        style={{
          minHeight: boardLoading
            ? Math.max(FEED_BODY_MIN_HEIGHT, feedBodyHeight)
            : FEED_BODY_MIN_HEIGHT,
        }}
      >
        {boardLoading ? (
          <SignalFeedSkeleton t={t} rows={feedSkeletonRows} />
        ) : feedError ? (
          <div style={{ padding: "28px 18px", textAlign: "center" }}>
            <p style={{ color: t.inkSoft, fontFamily: t.sans, fontSize: 14, margin: 0 }}>
              Couldn’t load intelligence
            </p>
            <button
              type="button"
              onClick={refreshFeed}
              style={{ ...ghostButtonStyle(t), marginTop: 12 }}
            >
              Retry
            </button>
          </div>
        ) : feedTotal === 0 ? (
          <div
            className="fuel-intel-tab__empty"
            style={{
              alignItems: "center",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: phone ? "28px 20px" : "40px 24px",
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
                display: "flex",
                fontSize: 18,
                fontWeight: 700,
                height: 48,
                justifyContent: "center",
                width: 48,
              }}
            >
              ⌕
            </div>
            <p style={{ color: t.ink, fontFamily: t.sans, fontSize: 15, fontWeight: 700, margin: 0 }}>
              {filtersActive
                ? "No intelligence matches these filters"
                : "No intelligence yet"}
            </p>
            <p
              style={{
                color: t.muted,
                fontFamily: t.sans,
                fontSize: 13,
                lineHeight: 1.5,
                margin: 0,
                maxWidth: 360,
              }}
            >
              {filtersActive
                ? "Widen the date range, clear search, or switch category."
                : "Add a source or log a signal to start the private intelligence feed for this company."}
            </p>
            {/* Head already has Add/Log on phone — keep empty CTAs for desktop + focus mode */}
            {!filtersActive && (focusActive || !phone) ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowAddSource(true)}
                  style={companyTabSecondaryBtnStyle(t)}
                >
                  Add source
                </button>
                <button
                  type="button"
                  onClick={() => setShowLog(true)}
                  style={companyTabPrimaryBtnStyle(t)}
                >
                  Log intelligence
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {signalGroups.map(({ categoryKey, signalName, items }) => (
              <SignalRow
                key={`${categoryKey}:${signalName}`}
                t={t}
                latest={items[0]}
                history={items.slice(1)}
                blinking={blinkingIds.includes(items[0].id)}
                onSelect={(item) => {
                  setSelectedId(item.id);
                }}
              />
            ))}
            <div style={{ padding: "0 18px 12px" }}>
              <ListPagination
                t={t}
                page={listPage}
                pageSize={listPageSize}
                total={feedTotal}
                itemLabel="signals"
                onPageChange={setListPage}
                onPageSizeChange={(size) => {
                  setListPageSize(size);
                  setListPage((p) => clampListPage(p, feedTotal, size));
                }}
              />
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );

  return (
    <section className="fuel-company-tab fuel-intel-tab" style={{ fontFamily: t.sans }}>
      <div className="fuel-company-tab__head fuel-intel-tab__head">
        <div className="fuel-intel-tab__intro" style={{ minWidth: 0, flex: phone ? "1 1 auto" : "1 1 220px" }}>
          {phone ? null : (
            <p className="fuel-company-tab__eyebrow" style={{ color: t.accent }}>
              Private signals
            </p>
          )}
          <div className="fuel-intel-tab__title-row">
            <h2 className="fuel-company-tab__title" style={{ color: t.ink }}>
              Intelligence
            </h2>
            {phone ? (
              <p className="fuel-intel-tab__meta" style={{ color: t.muted, margin: 0 }}>
                <span>
                  {feedLoading
                    ? "Loading…"
                    : `${feedTotal} signal${feedTotal === 1 ? "" : "s"}`}
                </span>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  className="fuel-intel-tab__meta-link"
                  onClick={() => setShowSources(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: t.inkSoft,
                    cursor: "pointer",
                    font: "inherit",
                    fontWeight: 600,
                    padding: 0,
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  {sourcesTotal} source{sourcesTotal === 1 ? "" : "s"}
                </button>
              </p>
            ) : (
              <div className="fuel-company-tab__stats fuel-intel-tab__stats">
                <span
                  className="fuel-company-tab__stat"
                  style={{
                    background: t.mode === "editorial" ? t.bg : t.panelAlt,
                    border: `1px solid ${t.rule}`,
                    color: t.muted,
                  }}
                >
                  Signals <strong style={{ color: t.ink }}>{feedLoading ? "…" : feedTotal}</strong>
                </span>
                <button
                  type="button"
                  className="fuel-company-tab__stat fuel-intel-tab__sources-stat"
                  onClick={() => setShowSources(true)}
                  aria-label={`Open sources (${sourcesTotal})`}
                  style={{
                    background: t.mode === "editorial" ? t.bg : t.panelAlt,
                    border: `1px solid ${t.rule}`,
                    color: t.muted,
                    cursor: "pointer",
                    font: "inherit",
                    textAlign: "left",
                  }}
                >
                  Sources <strong style={{ color: t.ink }}>{sourcesTotal}</strong>
                </button>
              </div>
            )}
          </div>
          {phone ? null : (
            <p className="fuel-company-tab__subtitle fuel-intel-tab__subtitle" style={{ color: t.muted }}>
              Metrics from benchmarks, sources, and logged context — private to your account.
            </p>
          )}
        </div>
        {!focusActive ? (
          phone ? (
            <PageToolbar
              t={t}
              filter={
                <FilterMenu
                  t={t}
                  activeCount={
                    (categoryFilter !== "All" ? 1 : 0) +
                    (searchQuery.trim() ? 1 : 0) +
                    (datePreset !== "current-quarter" || customRange != null ? 1 : 0)
                  }
                  onClear={() => {
                    setCategoryFilter("All");
                    setSearchQuery("");
                    setDatePreset("current-quarter");
                    setCustomRange(null);
                  }}
                >
                  <FilterGroup t={t} title="Category">
                      {tabKeys.map((key) => (
                        <FilterOption
                          key={key}
                          t={t}
                          selected={categoryFilter === key}
                          onSelect={() => setCategoryFilter(key)}
                        >
                          {key === "All" ? "All" : formatCategoryLabel(key)}
                        </FilterOption>
                      ))}
                  </FilterGroup>
                  <FilterGroup t={t} title="Search">
                    <FilterSearch
                      t={t}
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search signals…"
                      aria-label="Search intelligence"
                    />
                  </FilterGroup>
                  <FilterGroup t={t} title="Date">
                      {INTELLIGENCE_DATE_PRESETS.map((preset) => (
                        <FilterOption
                          key={preset.id}
                          t={t}
                          selected={datePreset === preset.id}
                          onSelect={() => setDatePreset(preset.id)}
                        >
                          {preset.label}
                        </FilterOption>
                      ))}
                    {datePreset === "custom" ? (
                      <div className="fuel-filter-field">
                      <DateRangePicker
                        t={t}
                        value={customRange}
                        onChange={setCustomRange}
                        onClear={() => setCustomRange(null)}
                        aria-label="Custom date range"
                        numberOfMonths={1}
                      />
                      </div>
                    ) : null}
                  </FilterGroup>
                </FilterMenu>
              }
              create={
                <CreateIconButton
                  t={t}
                  label={INTELLIGENCE_HEAD_ACTION_LABELS[1]}
                  data-tour-target="log-intelligence"
                  className={
                    tour?.activeTarget === "log-intelligence" ? "fuel-tour-highlight" : undefined
                  }
                  onClick={() => setShowLog(true)}
                />
              }
            />
          ) : (
            <div className="fuel-company-tab__actions fuel-intel-tab__actions">
              <button
                type="button"
                data-tour-target="add-source"
                className={
                  tour?.activeTarget === "add-source" ? "fuel-tour-highlight" : undefined
                }
                onClick={() => setShowAddSource(true)}
                style={companyTabSecondaryBtnStyle(t)}
              >
                {INTELLIGENCE_HEAD_ACTION_LABELS[0]}
              </button>
              <button
                type="button"
                data-tour-target="log-intelligence"
                className={
                  tour?.activeTarget === "log-intelligence" ? "fuel-tour-highlight" : undefined
                }
                onClick={() => setShowLog(true)}
                style={companyTabPrimaryBtnStyle(t)}
              >
                {INTELLIGENCE_HEAD_ACTION_LABELS[1]}
              </button>
              <button
                type="button"
                onClick={onUpdateBenchmark}
                style={companyTabSecondaryBtnStyle(t)}
              >
                {INTELLIGENCE_HEAD_ACTION_LABELS[2]}
              </button>
            </div>
          )
        ) : null}
      </div>

      {pageNotice.page && !addSourceDrawerBlocksNotice ? (
        <DocumentNoticeBanner
          t={t}
          message={pageNotice.page}
          onDismiss={() => handlePageNotice(null)}
        />
      ) : null}

      {board}

      <LogIntelligenceDrawer
        t={t}
        open={showLog}
        companyUuid={companyUuid}
        signalCatalog={signalCatalog}
        defaultPeriod={currentPeriod}
        onClose={() => setShowLog(false)}
        onLogged={() => {
          refreshFeed();
          router.refresh();
        }}
      />

      <SourcesDrawer
        t={t}
        open={showSources}
        companyUuid={companyUuid}
        refreshKey={sourcesRefreshKey}
        onClose={() => setShowSources(false)}
        onFocusIntelligence={handleFocusIntelligence}
        onTotalChange={setSourcesTotal}
      />

      <AddSourceDrawer
        t={t}
        open={showAddSource}
        companyUuid={companyUuid}
        documentSlots={dataRoomSlots}
        creditBalance={creditBalance}
        onClose={() => setShowAddSource(false)}
        onBalanceChange={onCreditBalanceChange}
        onItemsChange={onIntelligenceChange}
        onDataRoomSnapshot={(snapshot) => {
          setSourcesTotal(snapshot.sourcesTotal);
          onDataRoomSnapshot?.(snapshot);
        }}
        onDocumentNotice={handlePageNotice}
        onIntelligenceGenerated={handleIntelligenceGenerated}
      />

      <SignalDetailDrawer
        t={t}
        item={selectedItem}
        siblings={selectedSiblings}
        onClose={() => setSelectedId(null)}
      />
    </section>
  );
}
