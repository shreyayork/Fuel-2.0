"use client";

import { useEffect, useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Theme } from "@/lib/theme";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useDrawerPresence,
} from "@/components/drawer/motion";
import { useTheme } from "../ThemeContext";

interface Signal {
  id: string;
  label: string;
  kind: "quantitative" | "qualitative" | "boolean";
  unit: string | null;
  category: string | null;
  invertedGood: boolean;
}

interface ContextItem {
  id: string;
  kind: string;
  title: string | null;
  content: string;
  authorEmail: string | null;
  source: string;
  sourceExternalId: string | null;
  occurredAt: string;
  contributors: string[] | null;
  meetingKey: string | null;
}

interface Observation {
  id: string;
  signalId: string;
  period: string;
  valueNumeric: number | null;
  valueText: string | null;
  valueBool: boolean | null;
  confidence: number | null;
  rawSnippet: string | null;
  source: string;
  authorEmail: string | null;
  createdAt: string;
  supersededAt: string | null;
  supersededById: string | null;
  contextItemId: string | null;
}

interface HistoryEntry {
  id: string;
  valueNumeric: number | null;
  valueText: string | null;
  valueBool: boolean | null;
  confidence: number | null;
  source: string;
  authorEmail: string | null;
  createdAt: string;
  supersededAt: string | null;
  supersededById: string | null;
}

interface ProvenanceBundle {
  observation: Observation;
  signal: Signal | null;
  contextItem: ContextItem | null;
  parsedSource: { kind: string; raw: string; label: string; ref: string | null };
  history: HistoryEntry[];
}

export function ProvenanceDrawer({
  observationId,
  onClose,
  companyUuid,
}: {
  observationId: string | null;
  onClose: () => void;
  companyUuid: string;
}) {
  const t = useTheme();
  const [bundle, setBundle] = useState<ProvenanceBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = Boolean(observationId);
  const { mounted, visible, durationMs } = useDrawerPresence(open);

  useEffect(() => {
    if (!observationId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/observations/${observationId}/provenance`)
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
  }, [observationId]);

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
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.28)",
          zIndex: 60,
          ...drawerScrimMotionStyle(visible, durationMs),
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(560px, 95vw)",
          background: t.panel,
          borderLeft: `1px solid ${t.rule}`,
          zIndex: 61,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 32px rgba(0,0,0,0.14)",
          ...drawerPanelMotionStyle(visible, durationMs),
        }}
      >
        <DrawerHeader t={t} title="Signal provenance" onClose={onClose} />
        <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
          {loading ? (
            <div style={{ color: t.muted, fontFamily: t.sans, fontSize: 13 }}>Loading…</div>
          ) : error ? (
            <div style={{ color: t.negative, fontFamily: t.sans, fontSize: 13 }}>Error: {error}</div>
          ) : bundle ? (
            <ProvenanceBody t={t} bundle={bundle} companyUuid={companyUuid} />
          ) : null}
        </div>
      </div>
    </>
  );
}

function DrawerHeader({ t, title, onClose }: { t: Theme; title: string; onClose: () => void }) {
  return (
    <div
      style={{
        padding: "16px 24px",
        borderBottom: `1px solid ${t.rule}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ fontFamily: t.sans, fontSize: 14, fontWeight: 600, color: t.ink }}>{title}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          background: "transparent",
          border: `1px solid ${t.rule}`,
          color: t.muted,
          fontFamily: t.sans,
          fontSize: 12,
          padding: "4px 10px",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        Close · Esc
      </button>
    </div>
  );
}

function ProvenanceBody({
  t,
  bundle,
  companyUuid,
}: {
  t: Theme;
  bundle: ProvenanceBundle;
  companyUuid: string;
}) {
  const { observation, signal, contextItem, parsedSource, history } = bundle;
  const value = formatValue(observation, signal);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={labelStyle(t)}>{signal?.category ?? "Signal"}</div>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 18,
            fontWeight: 600,
            color: t.ink,
            marginTop: 4,
          }}
        >
          {signal?.label ?? observation.signalId}
        </div>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 28,
              fontWeight: 600,
              color: t.accent,
              letterSpacing: "-0.01em",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {value}
          </div>
          <div style={{ fontFamily: t.mono, fontSize: 12, color: t.muted }}>
            {observation.period}
          </div>
          {observation.supersededAt ? (
            <span
              style={{
                fontFamily: t.mono,
                fontSize: 10,
                color: t.warn,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Superseded
            </span>
          ) : null}
        </div>
        {observation.confidence != null ? (
          <div style={{ marginTop: 6, fontFamily: t.mono, fontSize: 11, color: t.muted }}>
            confidence {(observation.confidence * 100).toFixed(0)}%
          </div>
        ) : null}
        <div style={{ marginTop: 4, fontFamily: t.mono, fontSize: 11, color: t.mutedSoft }}>
          Recorded {new Date(observation.createdAt).toLocaleString()}
        </div>
      </div>

      {observation.rawSnippet ? (
        <Section t={t} title="Supporting snippet">
          <blockquote
            style={{
              margin: 0,
              padding: "10px 14px",
              borderLeft: `3px solid ${t.accent}`,
              background: t.panelAlt,
              fontFamily: t.serif,
              fontSize: 13,
              lineHeight: 1.55,
              color: t.inkSoft,
            }}
          >
            {observation.rawSnippet}
          </blockquote>
        </Section>
      ) : null}

      <Section
        t={t}
        title={`Source · ${parsedSource.label}`}
        right={observation.authorEmail ?? contextItem?.authorEmail ?? undefined}
      >
        {contextItem ? (
          <ContextItemCard t={t} item={contextItem} companyUuid={companyUuid} />
        ) : (
          <SourceFallback
            t={t}
            parsedSource={parsedSource}
            observation={observation}
            companyUuid={companyUuid}
          />
        )}
      </Section>

      {history.length > 1 ? (() => {
        // Group entries by normalized value so a fact quoted across N
        // emails collapses into one "appeared in N items" row. The
        // current observation stays highlighted within its group.
        const groups = dedupHistoryByValue(history, observation.id);
        return (
          <Section t={t} title={`History · ${history.length}${groups.length < history.length ? ` · ${groups.length} distinct` : ""}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {groups.map((g) => {
                const showsCurrent = g.entries.some((h) => h.id === observation.id);
                const latest = g.entries[0];
                return (
                  <div
                    key={g.key}
                    style={{
                      padding: "6px 10px",
                      background: showsCurrent ? t.accentSoft : t.panelAlt,
                      border: `1px solid ${showsCurrent ? t.accent : t.ruleSoft}`,
                      borderRadius: 4,
                      fontFamily: t.mono,
                      fontSize: 11,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 10,
                      }}
                    >
                      <div style={{ color: t.inkSoft }}>
                        {formatHistoryValue(latest, signal)}
                        {g.entries.length > 1 ? (
                          <span style={{ marginLeft: 8, color: t.mutedSoft }}>
                            · appeared in {g.entries.length} items
                          </span>
                        ) : null}
                        {latest.supersededAt ? (
                          <span style={{ marginLeft: 8, color: t.mutedSoft }}>(superseded)</span>
                        ) : null}
                      </div>
                      <div style={{ color: t.muted, fontSize: 10 }}>
                        {latest.authorEmail ? `${latest.authorEmail} · ` : ""}
                        {new Date(latest.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })() : null}
    </div>
  );
}

/**
 * Renders the Source section when the observation has no linked
 * context_item. For sources that legitimately don't have one — quarterly
 * portfolio_update submissions, manual entries — we describe the origin
 * instead of falsely claiming the context_item was deleted. Only the
 * "extraction" sources (slack/granola/hubspot/email/note) actually expect
 * a context_item, and only those get the "no longer available" warning.
 */
function SourceFallback({
  t,
  parsedSource,
  observation,
  companyUuid,
}: {
  t: Theme;
  parsedSource: { kind: string; raw: string; label: string; ref: string | null };
  observation: Observation;
  companyUuid: string;
}) {
  const period = observation.period;
  if (parsedSource.kind === "portfolio_update") {
    return (
      <div
        style={{
          padding: "12px 14px",
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          background: t.panelAlt,
          fontFamily: t.sans,
          fontSize: 12.5,
          color: t.inkSoft,
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: 4 }}>
          Quarterly portfolio submission · {period}
        </div>
        <div style={{ color: t.muted, fontSize: 12 }}>
          Recorded directly on the company&apos;s quarterly form. View all
          submissions on the{" "}
          <a
            href={`/company/${companyUuid}#updates`}
            style={{ color: t.accent, textDecoration: "none" }}
          >
            company profile
          </a>
          .
        </div>
        {parsedSource.ref ? (
          <div style={{ marginTop: 6, fontFamily: t.mono, fontSize: 10, color: t.mutedSoft }}>
            update id · {parsedSource.ref}
          </div>
        ) : null}
      </div>
    );
  }
  if (parsedSource.kind === "manual") {
    return (
      <div
        style={{
          padding: "12px 14px",
          border: `1px solid ${t.rule}`,
          borderRadius: 8,
          background: t.panelAlt,
          fontFamily: t.sans,
          fontSize: 12.5,
          color: t.inkSoft,
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Manual entry · {period}</div>
        <div style={{ color: t.muted, fontSize: 12 }}>
          Logged directly by an operator. No supporting context item was
          attached.
        </div>
      </div>
    );
  }
  // Extraction-style sources (slack/granola/hubspot/email/note) DO expect
  // a context_item; if it's missing here the row was likely deleted.
  return (
    <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted }}>
      {parsedSource.raw}
      <div style={{ marginTop: 4, fontFamily: t.mono, fontSize: 11 }}>
        Context item no longer available — it may have been deleted.
      </div>
    </div>
  );
}

function Section({
  t,
  title,
  right,
  children,
}: {
  t: Theme;
  title: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={labelStyle(t)}>{title}</div>
        {right ? (
          <div style={{ fontFamily: t.mono, fontSize: 10, color: t.mutedSoft }}>{right}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ContextItemCard({
  t,
  item,
  companyUuid,
}: {
  t: Theme;
  item: ContextItem;
  companyUuid: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const contributors = item.contributors ?? [];
  return (
    <div
      style={{
        background: t.panelAlt,
        border: `1px solid ${t.ruleSoft}`,
        padding: 12,
        borderRadius: 4,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontFamily: t.sans, fontSize: 13, fontWeight: 600, color: t.ink }}>
          {item.title ?? item.kind.replace(/_/g, " ")}
        </div>
        <div style={{ fontFamily: t.mono, fontSize: 10, color: t.muted }}>
          {new Date(item.occurredAt).toLocaleDateString()}
        </div>
      </div>
      <div style={{ marginTop: 4, fontFamily: t.mono, fontSize: 10, color: t.mutedSoft }}>
        {item.kind} · {item.source}
        {contributors.length > 1 ? ` · ${contributors.length} contributors` : ""}
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            color: t.accent,
            fontFamily: t.sans,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {expanded ? "Hide content" : "Show content"}
        </button>
        <a
          href={`/company/${companyUuid}?tab=private#ctx-${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: 14,
            color: t.accent,
            fontFamily: t.sans,
            fontSize: 12,
            textDecoration: "none",
          }}
        >
          Open in Private tab →
        </a>
      </div>
      {expanded ? (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            background: t.panel,
            border: `1px solid ${t.ruleSoft}`,
            borderRadius: 4,
            fontFamily: t.sans,
            fontSize: 12,
            color: t.inkSoft,
            lineHeight: 1.55,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}

function formatValue(
  o: Pick<Observation, "valueNumeric" | "valueText" | "valueBool">,
  signal: Signal | null,
): string {
  if (signal?.kind === "quantitative" && o.valueNumeric != null) {
    return formatQuant(o.valueNumeric, signal.unit);
  }
  if (signal?.kind === "boolean" && o.valueBool != null) return o.valueBool ? "Yes" : "No";
  if (o.valueText) return o.valueText;
  if (o.valueNumeric != null) return o.valueNumeric.toLocaleString();
  return "—";
}

/**
 * Group history entries by value (normalized) so a quoted-reply chain
 * that propagated the same fact across N emails collapses into one row.
 * `currentObservationId` pins the group that contains the drawer's
 * focused observation so it still highlights.
 */
function dedupHistoryByValue(
  history: HistoryEntry[],
  currentObservationId: string,
): Array<{ key: string; entries: HistoryEntry[] }> {
  const groups = new Map<string, HistoryEntry[]>();
  for (const h of history) {
    const key =
      h.valueNumeric != null
        ? `n:${h.valueNumeric}`
        : h.valueBool != null
        ? `b:${h.valueBool}`
        : h.valueText
        ? `t:${h.valueText.trim().toLowerCase().slice(0, 120)}`
        : `null:${h.id}`;
    const arr = groups.get(key) ?? [];
    arr.push(h);
    groups.set(key, arr);
  }
  // Sort each group's entries newest-first so the representative is the
  // most recent occurrence of that value.
  const out = Array.from(groups.entries()).map(([key, entries]) => {
    entries.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    return { key, entries };
  });
  // Surface the group containing the current observation first, then
  // remaining groups newest-first.
  out.sort((a, b) => {
    const aCurrent = a.entries.some((h) => h.id === currentObservationId) ? 0 : 1;
    const bCurrent = b.entries.some((h) => h.id === currentObservationId) ? 0 : 1;
    if (aCurrent !== bCurrent) return aCurrent - bCurrent;
    return a.entries[0].createdAt > b.entries[0].createdAt ? -1 : 1;
  });
  return out;
}

function formatHistoryValue(h: HistoryEntry, signal: Signal | null): string {
  return formatValue(
    { valueNumeric: h.valueNumeric, valueText: h.valueText, valueBool: h.valueBool },
    signal,
  );
}

function formatQuant(n: number, unit: string | null): string {
  switch (unit) {
    case "usd":
      if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
      if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
      if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
      return `$${n.toLocaleString()}`;
    case "pct":
      return `${n.toFixed(1)}%`;
    case "months":
      return `${n.toFixed(1)} mo`;
    case "days":
      return `${n.toFixed(0)} d`;
    case "ratio":
      return n.toFixed(2);
    case "count":
      return n.toLocaleString();
    case "score":
      return n.toFixed(1);
    default:
      return n.toLocaleString();
  }
}

function labelStyle(t: Theme): CSSProperties {
  return {
    fontFamily: t.mono,
    fontSize: 10,
    color: t.mutedSoft,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };
}
