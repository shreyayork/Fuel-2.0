"use client";

import { useEffect, useState } from "react";
import type { Theme } from "@/lib/theme";
import { useTheme } from "@/components/ThemeContext";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useDrawerPresence,
} from "@/components/drawer/motion";
import {
  documentHistoryScrimStyle,
  documentHistorySidebarStyle,
} from "@/components/data-room/styles";
import { formatCategoryLabel } from "./format";

interface ProvenanceBundle {
  intelligence: {
    id: string;
    category: string;
    headline: string;
    keyDetail: string | null;
    summary: string;
    rawSnippet: string | null;
    source: string;
    period: string | null;
    isBenchmark: boolean;
    createdAt: string;
  };
  contextItem: {
    id: string;
    title: string | null;
    source: string;
    kind: string;
  } | null;
  document: {
    id: string;
    typeLabel: string;
    filename: string;
    source: string;
  } | null;
}

export function IntelligenceProvenanceDrawer({
  intelligenceId,
  onClose,
}: {
  intelligenceId: string | null;
  onClose: () => void;
}) {
  const t = useTheme();
  const open = Boolean(intelligenceId);
  const { mounted, visible, durationMs } = useDrawerPresence(open);
  const [bundle, setBundle] = useState<ProvenanceBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!intelligenceId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/intelligence/${intelligenceId}/provenance`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`request failed: ${res.status}`);
        return (await res.json()) as ProvenanceBundle;
      })
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [intelligenceId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const title = bundle?.intelligence.headline ?? "Intelligence detail";

  return (
    <>
      <button
        type="button"
        aria-label="Close intelligence provenance"
        style={{
          ...documentHistoryScrimStyle(t),
          ...drawerScrimMotionStyle(visible, durationMs),
        }}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Intelligence provenance for ${title}`}
        style={{
          ...documentHistorySidebarStyle(t),
          ...drawerPanelMotionStyle(visible, durationMs),
        }}
      >
        <div
          style={{
            alignItems: "flex-start",
            borderBottom: `1px solid ${t.rule}`,
            display: "flex",
            justifyContent: "space-between",
            padding: "18px 20px",
          }}
        >
          <div style={{ minWidth: 0, paddingRight: 12 }}>
            <span
              style={{
                color: t.accent,
                display: "block",
                fontFamily: t.sans,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Intelligence provenance
            </span>
            <strong
              title={title}
              style={{
                color: t.ink,
                display: "block",
                fontFamily: t.sans,
                fontSize: 18,
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              color: t.muted,
              cursor: "pointer",
              flexShrink: 0,
              fontFamily: t.sans,
              fontSize: 12,
              padding: "6px 10px",
            }}
          >
            Close · Esc
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
          {loading ? (
            <div style={{ color: t.muted, fontFamily: t.sans, fontSize: 13 }}>Loading…</div>
          ) : error ? (
            <div style={{ color: t.negative, fontFamily: t.sans, fontSize: 13 }}>Error: {error}</div>
          ) : bundle ? (
            <ProvenanceBody t={t} bundle={bundle} />
          ) : null}
        </div>
      </aside>
    </>
  );
}

function ProvenanceBody({ t, bundle }: { t: Theme; bundle: ProvenanceBundle }) {
  const intel = bundle.intelligence;
  const docLabel = bundle.document?.typeLabel ?? bundle.contextItem?.title ?? "Source";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          background: t.panelInner,
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "14px 16px",
        }}
      >
        <span style={typeBadgeStyle(t)}>{formatCategoryLabel(intel.category)}</span>
        <div style={{ ...valueStyle(t), fontSize: 15, fontWeight: 600 }}>{intel.headline}</div>
        {intel.period ? (
          <div style={{ color: t.mutedSoft, fontFamily: t.mono, fontSize: 10 }}>
            {intel.period.toUpperCase()}
          </div>
        ) : null}
        {intel.keyDetail ? (
          <div style={{ color: t.accent, fontFamily: t.mono, fontSize: 12 }}>{intel.keyDetail}</div>
        ) : null}
      </div>

      {intel.summary ? (
        <ProvenanceSection t={t} label="Summary" value={intel.summary} />
      ) : null}

      {intel.rawSnippet ? (
        <div>
          <div style={labelStyle(t)}>Snippet</div>
          <blockquote
            style={{
              background: `${t.panelAlt}59`,
              border: `1px solid ${t.ruleSoft}`,
              borderLeft: `3px solid ${t.accent}`,
              borderRadius: 8,
              color: t.inkSoft,
              fontFamily: t.sans,
              fontSize: 12,
              lineHeight: 1.5,
              margin: 0,
              padding: "12px 14px",
            }}
          >
            {intel.rawSnippet}
          </blockquote>
        </div>
      ) : null}

      <ProvenanceSection t={t} label="Document" value={docLabel} />
      {bundle.document ? (
        <div style={{ color: t.muted, fontFamily: t.mono, fontSize: 11, marginTop: -8 }}>
          {bundle.document.filename}
        </div>
      ) : null}

      <ProvenanceSection t={t} label="Generation" value={intel.source} />
    </div>
  );
}

function ProvenanceSection({ t, label, value }: { t: Theme; label: string; value: string }) {
  return (
    <div
      style={{
        background: t.panelInner,
        border: `1px solid ${t.rule}`,
        borderRadius: 8,
        padding: "12px 14px",
      }}
    >
      <div style={labelStyle(t)}>{label}</div>
      <div style={valueStyle(t)}>{value}</div>
    </div>
  );
}

function typeBadgeStyle(t: Theme) {
  return {
    alignSelf: "flex-start",
    border: `1px solid ${t.rule}`,
    borderRadius: 4,
    color: t.mutedSoft,
    fontFamily: t.mono,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: "0.06em",
    padding: "2px 6px",
    textTransform: "uppercase" as const,
  };
}

function labelStyle(t: Theme) {
  return {
    color: t.mutedSoft,
    fontFamily: t.mono,
    fontSize: 10,
    letterSpacing: "0.06em",
    marginBottom: 4,
    textTransform: "uppercase" as const,
  };
}

function valueStyle(t: Theme) {
  return {
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 13,
    lineHeight: 1.45,
  };
}
