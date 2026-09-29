"use client";

import { useEffect, useState } from "react";
import type { Theme } from "@/lib/theme";
import type { DataRoomDocumentSlot } from "@/lib/data-room/types";
import type { PaginatedResponse } from "@/lib/list-pagination";
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

/** Placeholder rows mirror the source row geometry to avoid drawer layout jump. */
function SourceListSkeleton({ t, rows }: { t: Theme; rows: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading sources"
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
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
            padding: "10px 12px",
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
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sources"
        style={{
          background: t.panel,
          borderLeft: `1px solid ${t.rule}`,
          bottom: 0,
          boxShadow: `-24px 0 60px ${t.overlay}`,
          display: "flex",
          flexDirection: "column",
          maxWidth: 480,
          position: "fixed",
          right: 0,
          top: 0,
          width: "min(100vw, 480px)",
          zIndex: 71,
          ...drawerPanelMotionStyle(visible, durationMs),
        }}
      >
        <header
          style={{
            background: t.panelAlt,
            borderBottom: `1px solid ${t.ruleSoft}`,
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            padding: "16px 18px",
          }}
        >
          <div>
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
            <p
              style={{
                color: t.muted,
                fontFamily: t.sans,
                fontSize: 12,
                lineHeight: 1.45,
                margin: "6px 0 0",
              }}
            >
              Notes and documents that feed intelligence. Notes are reference-only; documents can
              generate intelligence.
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={ghostButtonStyle(t)}>
            ✕
          </button>
        </header>

        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {loadState === "loading" || loadState === "idle" ? (
            <SourceListSkeleton
              t={t}
              rows={Math.min(listPageSize, SOURCE_SKELETON_ROWS)}
            />
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
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sources.map((source) => {
                  const isNote = source.kind === "note";
                  const hasIntel =
                    source.status === "generated" && source.intelligenceCount > 0;
                  const canGenerate = !isNote && source.status === "awaiting";
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
                    <div
                      key={source.id}
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
                        display: "flex",
                        gap: 10,
                        padding: "10px 12px",
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
                          padding: "2px 6px",
                          textTransform: "uppercase",
                        }}
                      >
                        {source.originLabel}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong
                          style={{
                            color: t.ink,
                            display: "block",
                            fontFamily: t.sans,
                            fontSize: 13,
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
                        style={{ alignItems: "center", display: "flex", gap: 6 }}
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
                              fontWeight: 600,
                            }}
                          >
                            {source.intelligenceCount} signal
                            {source.intelligenceCount === 1 ? "" : "s"} →
                          </button>
                        ) : isNote ? (
                          <span
                            style={{
                              color: t.mutedSoft,
                              fontFamily: t.sans,
                              fontSize: 11,
                            }}
                          >
                            Reference only
                          </span>
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
                              fontWeight: 600,
                            }}
                          >
                            Extract →
                          </button>
                        ) : null}
                        {onRemove ? (
                          <button
                            type="button"
                            aria-label="Remove source"
                            onClick={() => onRemove(source.id)}
                            style={{
                              background: "transparent",
                              border: `1px solid ${t.rule}`,
                              borderRadius: 4,
                              color: t.muted,
                              cursor: "pointer",
                              fontSize: 12,
                              lineHeight: 1,
                              padding: "2px 6px",
                            }}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
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
