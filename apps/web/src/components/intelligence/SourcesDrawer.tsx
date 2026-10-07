"use client";

import { useEffect, useState } from "react";
import type { Theme } from "@/lib/theme";
import type { DataRoomDocumentSlot } from "@/lib/data-room/types";
import type { PaginatedResponse } from "@/lib/list-pagination";
import { BREAKPOINTS, TOUCH_TARGET_MIN, mqMax, useMediaQuery } from "@/lib/responsive";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useDrawerPresence,
} from "@/components/drawer/motion";
import { MagicShimmer } from "@/components/ai/MagicShimmer";
import {
  clampListPage,
  DEFAULT_LIST_PAGE_SIZE,
  ListPagination,
  type ListPageSize,
} from "@/components/ui/ListPagination";
import { BackNav } from "@/components/atoms";
import { drawerCloseBtnStyle, mobileAddScreenStyle } from "@/components/drawer/styles";
import { ghostButtonStyle } from "./styles";

export type IntelligenceSourceListItem = {
  id: string;
  kind: "note" | "doc";
  /** Chip: HubSpot / Granola / Doc / Note. */
  originLabel: string;
  title: string;
  addedAtLabel: string;
  uploadedAtMs: number;
  contextItemId: string | null;
  status: "generated" | "awaiting" | "reference";
  intelligenceIds: string[];
  intelligenceCount: number;
};

/** Legacy helper for callers that still have full Data Room slots (e.g. badges). */
export function sourcesFromDocumentSlots(
  slots: DataRoomDocumentSlot[],
): IntelligenceSourceListItem[] {
  const items: IntelligenceSourceListItem[] = [];
  for (const slot of slots) {
    const current = slot.current;
    if (!current) continue;
    const count = current.intelligenceCount ?? 0;
    items.push({
      id: current.id,
      kind: "doc",
      originLabel: "Doc",
      title: current.name || slot.typeLabel,
      addedAtLabel: current.uploadedAt
        ? new Date(current.uploadedAt).toLocaleDateString()
        : slot.typeLabel,
      uploadedAtMs: current.uploadedAtMs ?? 0,
      contextItemId: current.contextItemId ?? null,
      status: count > 0 ? "generated" : "awaiting",
      intelligenceIds: current.observationIds ?? [],
      intelligenceCount: count,
    });
  }
  return items.sort((a, b) => b.uploadedAtMs - a.uploadedAtMs);
}

/** Skeleton row count — enough to read as a list without a tall placeholder. */
const SOURCE_SKELETON_ROWS = 5;

function CloseIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 4l8 8M12 4L4 12"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Placeholder rows mirror the source row geometry to avoid drawer layout jump. */
function SourceListSkeleton({ t, rows }: { t: Theme; rows: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading sources"
      style={{ display: "flex", flexDirection: "column", gap: 6 }}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            alignItems: "center",
            background: t.panelInner,
            border: `1px solid ${t.ruleSoft}`,
            borderRadius: 8,
            display: "flex",
            gap: 10,
            minHeight: 48,
            padding: "8px 12px",
          }}
        >
          <MagicShimmer theme={t} width={34} height={16} rounded={4} />
          <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 5, minWidth: 0 }}>
            <MagicShimmer theme={t} width={i % 2 ? "62%" : "78%"} height={13} rounded={4} />
            <MagicShimmer theme={t} width={72} height={10} rounded={4} />
          </div>
          <MagicShimmer theme={t} width={i % 3 ? 64 : 78} height={11} rounded={4} />
        </div>
      ))}
    </div>
  );
}

function statusLabel(source: IntelligenceSourceListItem): string | null {
  if (source.kind === "note") return "Reference";
  if (source.status === "generated" && source.intelligenceCount > 0) {
    return `${source.intelligenceCount} signal${source.intelligenceCount === 1 ? "" : "s"}`;
  }
  if (source.status === "awaiting") return "Extract";
  return null;
}

/** Focus keys for a source: intel ids + document version + context item. */
export function sourceFocusIds(source: IntelligenceSourceListItem): string[] {
  return [
    ...source.intelligenceIds,
    source.id,
    ...(source.contextItemId ? [source.contextItemId] : []),
  ];
}

export function SourcesDrawer({
  t,
  open,
  companyUuid,
  refreshKey = 0,
  onClose,
  onSelectSource,
  onGenerate,
  onRemove,
  onFocusIntelligence,
  onTotalChange,
}: {
  t: Theme;
  open: boolean;
  companyUuid: string;
  /** Bump after upload/generate so the open drawer refetches. */
  refreshKey?: number;
  onClose: () => void;
  onSelectSource?: (id: string) => void;
  onGenerate?: (id: string) => void;
  onRemove?: (id: string) => void;
  onFocusIntelligence?: (ids: string[], label: string) => void;
  onTotalChange?: (total: number) => void;
}) {
  const { mounted, visible, durationMs } = useDrawerPresence(open);
  const sheet = useMediaQuery(mqMax(BREAKPOINTS.md), false);
  const [listPage, setListPage] = useState(0);
  const [listPageSize, setListPageSize] = useState<ListPageSize>(DEFAULT_LIST_PAGE_SIZE);
  const [sources, setSources] = useState<IntelligenceSourceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setListPage(0);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setLoadState("idle");
      return;
    }

    const controller = new AbortController();
    setLoadState("loading");
    void (async () => {
      try {
        const params = new URLSearchParams({
          limit: String(listPageSize),
          offset: String(listPage * listPageSize),
        });
        const res = await fetch(
          `/api/company/${companyUuid}/intelligence/sources?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`sources_fetch_${res.status}`);
        const payload = (await res.json()) as PaginatedResponse<IntelligenceSourceListItem>;
        if (controller.signal.aborted) return;

        const clamped = clampListPage(listPage, payload.meta.total, listPageSize);
        setTotal(payload.meta.total);
        onTotalChange?.(payload.meta.total);
        if (clamped !== listPage) {
          setListPage(clamped);
          return;
        }
        setSources(payload.data);
        setLoadState("ready");
      } catch (error) {
        if (controller.signal.aborted || (error as Error).name === "AbortError") return;
        setLoadState("error");
      }
    })();

    return () => controller.abort();
  }, [open, companyUuid, listPage, listPageSize, refreshKey, retryKey, onTotalChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <>
      {sheet ? null : (
        <button
          type="button"
          aria-label="Close sources"
          onClick={onClose}
          style={{
            background: t.overlay,
            border: "none",
            bottom: 0,
            cursor: "pointer",
            left: 0,
            position: "fixed",
            right: 0,
            top: 0,
            zIndex: 70,
            ...drawerScrimMotionStyle(visible, durationMs),
          }}
        />
      )}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sources"
        className={sheet ? "fuel-add-screen" : undefined}
        style={{
          background: t.panel,
          ...(sheet
            ? mobileAddScreenStyle(t, { zIndex: 90 })
            : {
                borderLeft: `1px solid ${t.rule}`,
                bottom: 0,
                boxShadow: `-24px 0 60px ${t.overlay}`,
                maxWidth: 420,
                position: "fixed",
                right: 0,
                top: 0,
                width: "min(100vw, 420px)",
                zIndex: 71,
              }),
          display: "flex",
          flexDirection: "column",
          ...(!sheet ? { position: "fixed", zIndex: 71 } : null),
          ...drawerPanelMotionStyle(visible, durationMs, { from: "right" }),
        }}
      >
        <header
          style={{
            alignItems: "flex-start",
            background: t.panel,
            borderBottom: `1px solid ${t.ruleSoft}`,
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            padding: sheet ? "8px 12px 12px" : "14px 16px",
          }}
        >
          {sheet ? <BackNav t={t} label="Back" iconOnly onClick={onClose} /> : null}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
              <h2
                style={{
                  color: t.ink,
                  fontFamily: t.sans,
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Sources
              </h2>
              {loadState === "ready" && total > 0 ? (
                <span
                  style={{
                    color: t.muted,
                    fontFamily: t.mono,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {total}
                </span>
              ) : null}
            </div>
            <p
              style={{
                color: t.muted,
                fontFamily: t.sans,
                fontSize: 12,
                lineHeight: 1.35,
                margin: "4px 0 0",
              }}
            >
              Notes stay as reference · docs can extract signals
            </p>
          </div>
          {sheet ? null : (
            <button
              type="button"
              className="fuel-drawer-close"
              aria-label="Close"
              onClick={onClose}
              style={drawerCloseBtnStyle(t)}
            >
              <CloseIcon />
            </button>
          )}
        </header>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: sheet ? "12px 14px calc(12px + env(safe-area-inset-bottom, 0px))" : 14,
          }}
        >
          {loadState === "loading" || loadState === "idle" ? (
            <SourceListSkeleton t={t} rows={Math.min(listPageSize, SOURCE_SKELETON_ROWS)} />
          ) : null}
          {loadState === "error" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ color: t.muted, fontFamily: t.sans, fontSize: 13, margin: 0 }}>
                Could not load sources.
              </p>
              <button
                type="button"
                style={ghostButtonStyle(t)}
                onClick={() => setRetryKey((key) => key + 1)}
              >
                Retry
              </button>
            </div>
          ) : null}
          {loadState === "ready" && total === 0 ? (
            <p style={{ color: t.muted, fontFamily: t.sans, fontSize: 13, margin: 0 }}>
              No sources added yet.
            </p>
          ) : null}
          {loadState === "ready" && sources.length > 0 ? (
            <>
              <ul
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                }}
              >
                {sources.map((source) => {
                  const isNote = source.kind === "note";
                  const hasIntel =
                    source.status === "generated" && source.intelligenceCount > 0;
                  const canGenerate = !isNote && source.status === "awaiting";
                  const meta = statusLabel(source);
                  const focusFromSource = () => {
                    if (!hasIntel) {
                      onSelectSource?.(source.id);
                      onClose();
                      return;
                    }
                    onFocusIntelligence?.(sourceFocusIds(source), source.title);
                    onClose();
                  };
                  return (
                    <li key={source.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={focusFromSource}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            focusFromSource();
                          }
                        }}
                        style={{
                          alignItems: "center",
                          background: t.panelInner,
                          border: `1px solid ${t.ruleSoft}`,
                          borderRadius: 8,
                          cursor: "pointer",
                          display: "grid",
                          gap: "6px 10px",
                          gridTemplateColumns: "auto minmax(0, 1fr) auto",
                          minHeight: TOUCH_TARGET_MIN,
                          padding: "8px 10px",
                        }}
                      >
                        <span
                          style={{
                            background: isNote ? `${t.muted}22` : `${t.accent}22`,
                            borderRadius: 4,
                            color: isNote ? t.muted : t.accent,
                            fontFamily: t.mono,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            padding: "3px 6px",
                            textTransform: "uppercase",
                          }}
                        >
                          {source.originLabel}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <strong
                            style={{
                              color: t.ink,
                              display: "block",
                              fontFamily: t.sans,
                              fontSize: 13,
                              fontWeight: 650,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {source.title}
                          </strong>
                          <span
                            style={{
                              color: t.mutedSoft,
                              fontFamily: t.mono,
                              fontSize: 10,
                            }}
                          >
                            {source.addedAtLabel}
                          </span>
                        </div>
                        <div
                          style={{
                            alignItems: "center",
                            display: "flex",
                            gap: 4,
                            justifyContent: "flex-end",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hasIntel ? (
                            <button
                              type="button"
                              onClick={focusFromSource}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: t.accent,
                                cursor: "pointer",
                                fontFamily: t.sans,
                                fontSize: 11,
                                fontWeight: 650,
                                minHeight: 36,
                                padding: "0 4px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {meta} →
                            </button>
                          ) : canGenerate ? (
                            <button
                              type="button"
                              onClick={() => onGenerate?.(source.id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: t.accent,
                                cursor: "pointer",
                                fontFamily: t.sans,
                                fontSize: 11,
                                fontWeight: 650,
                                minHeight: 36,
                                padding: "0 4px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Extract →
                            </button>
                          ) : meta ? (
                            <span
                              style={{
                                color: t.mutedSoft,
                                fontFamily: t.sans,
                                fontSize: 11,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {meta}
                            </span>
                          ) : null}
                          {onRemove ? (
                            <button
                              type="button"
                              aria-label="Remove source"
                              onClick={() => onRemove(source.id)}
                              style={{
                                alignItems: "center",
                                background: "transparent",
                                border: `1px solid ${t.rule}`,
                                borderRadius: 6,
                                color: t.muted,
                                cursor: "pointer",
                                display: "inline-flex",
                                height: 32,
                                justifyContent: "center",
                                width: 32,
                              }}
                            >
                              <CloseIcon />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <ListPagination
                t={t}
                page={listPage}
                pageSize={listPageSize}
                total={total}
                itemLabel="sources"
                onPageChange={setListPage}
                onPageSizeChange={(size) => {
                  setListPageSize(size);
                  setListPage((p) => clampListPage(p, total, size));
                }}
              />
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
