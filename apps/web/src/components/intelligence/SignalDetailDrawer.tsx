"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useDrawerPresence,
} from "@/components/drawer/motion";
import {
  documentHistoryScrimStyle,
  documentHistorySidebarStyle,
} from "@/components/data-room/styles";
import type { IntelligenceFeedItem } from "@/lib/intelligence/feed";
import {
  isProfileOrBenchmarkProvenance,
  resolveFeedSourceKindLabel,
} from "@/lib/intelligence/source-label";
import { formatPeriodDisplay } from "./format";

/** Typography aligned with Design `.provenance-*` (PatriotPayJourney.css). */
function categoryStyle(t: Theme): CSSProperties {
  return {
    color: t.accent,
    display: "block",
    fontFamily: t.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    lineHeight: 1.2,
    textTransform: "uppercase",
  };
}

function signalNameStyle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0,
    lineHeight: 1.35,
    margin: 0,
  };
}

function valueStyle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 500,
    letterSpacing: 0,
    lineHeight: 1.4,
    margin: "2px 0 0",
  };
}

function sectionTitleStyle(t: Theme): CSSProperties {
  return {
    color: t.accent,
    display: "block",
    fontFamily: t.sans,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: "0.08em",
    margin: 0,
    textTransform: "uppercase",
  };
}

function factLabelStyle(t: Theme): CSSProperties {
  return {
    color: t.accent,
    fontFamily: t.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    margin: 0,
    textTransform: "uppercase",
  };
}

function factValueStyle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 12.5,
    fontWeight: 500,
    margin: 0,
  };
}

export function SignalDetailDrawer({
  t,
  item,
  siblings,
  onClose,
}: {
  t: Theme;
  item: IntelligenceFeedItem | null;
  siblings: IntelligenceFeedItem[];
  onClose: () => void;
}) {
  const open = Boolean(item);
  const { mounted, visible, durationMs } = useDrawerPresence(open);
  const [displayItem, setDisplayItem] = useState(item);
  const [displaySiblings, setDisplaySiblings] = useState(siblings);

  useEffect(() => {
    if (item) {
      setDisplayItem(item);
      setDisplaySiblings(siblings);
    }
  }, [item, siblings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !displayItem) return null;

  const hasHistory = displaySiblings.length > 1;
  const sourceCount = displayItem.sources.length;
  const emptySourcesCopy = isProfileOrBenchmarkProvenance({
    source: displayItem.source,
    generationPath: displayItem.generationPath,
    isBenchmark: displayItem.isBenchmark,
  })
    ? "This value came from the profile or benchmark."
    : "No linked sources.";

  return (
    <>
      <button
        type="button"
        aria-label="Close signal detail"
        style={{
          ...documentHistoryScrimStyle(t),
          ...drawerScrimMotionStyle(visible, durationMs),
        }}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Signal detail"
        style={{
          ...documentHistorySidebarStyle(t),
          ...drawerPanelMotionStyle(visible, durationMs),
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: t.panelAlt,
            borderBottom: `1px solid ${t.ruleSoft}`,
            display: "flex",
            flexShrink: 0,
            justifyContent: "space-between",
            padding: "16px 18px",
          }}
        >
          <strong
            style={{
              color: t.ink,
              fontFamily: t.sans,
              fontSize: 14,
              fontWeight: 650,
            }}
          >
            Signal detail
          </strong>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              color: t.inkSoft,
              cursor: "pointer",
              fontFamily: t.sans,
              fontSize: 11,
              padding: "4px 8px",
            }}
          >
            Close · Esc
          </button>
        </div>

        <div
          style={{
            background: `linear-gradient(180deg, ${t.accent}0A 0%, transparent 48px)`,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: 18,
            overflow: "auto",
            padding: 18,
          }}
        >
          <section
            style={{
              background: t.panelInner,
              border: `1px solid ${t.ruleSoft}`,
              borderLeft: `3px solid ${t.accent}`,
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "14px 14px 12px",
            }}
          >
            <span style={categoryStyle(t)}>{displayItem.categoryLabel}</span>
            <h2 style={signalNameStyle(t)}>{displayItem.signalName}</h2>
            {displayItem.valueLabel ? <p style={valueStyle(t)}>{displayItem.valueLabel}</p> : null}
            <dl
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "minmax(0, 1fr)",
                margin: "8px 0 0",
              }}
            >
              <div
                style={{
                  background: `${t.accent}0F`,
                  border: `1px solid ${t.accent}2E`,
                  borderRadius: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  padding: "8px 10px",
                }}
              >
                <dt style={factLabelStyle(t)}>Period</dt>
                <dd style={factValueStyle(t)}>{formatPeriodDisplay(displayItem.period)}</dd>
              </div>
            </dl>
          </section>

          {displayItem.summary ? (
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 style={sectionTitleStyle(t)}>Summary</h3>
              <div
                style={{
                  background: t.panelInner,
                  border: `1px solid ${t.ruleSoft}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <p
                  style={{
                    color: t.inkSoft,
                    fontFamily: t.sans,
                    fontSize: 13,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {displayItem.summary}
                </p>
              </div>
            </section>
          ) : null}

          {displayItem.note ? (
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 style={sectionTitleStyle(t)}>Note</h3>
              <div
                style={{
                  background: t.panelInner,
                  border: `1px solid ${t.ruleSoft}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <p
                  style={{
                    color: t.inkSoft,
                    fontFamily: t.sans,
                    fontSize: 13,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {displayItem.note}
                </p>
              </div>
            </section>
          ) : null}

          <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={sectionTitleStyle(t)}>
              {sourceCount > 0
                ? `${sourceCount} source${sourceCount === 1 ? "" : "s"}`
                : "Sources"}
            </h3>
            {sourceCount > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {displayItem.sources.map((source) => {
                  const kindLabel = resolveFeedSourceKindLabel({
                    kind: source.kind,
                    provenanceSource: displayItem.source,
                  });
                  return (
                    <article
                      key={source.id}
                      style={{
                        background: t.panelInner,
                        border: `1px solid ${t.ruleSoft}`,
                        borderRadius: 10,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          justifyContent: "space-between",
                        }}
                      >
                        <strong
                          style={{
                            color: t.ink,
                            fontFamily: t.sans,
                            fontSize: 12.5,
                            fontWeight: 600,
                          }}
                        >
                          {source.title}
                        </strong>
                        {source.date ? (
                          <time
                            style={{
                              color: t.mutedSoft,
                              fontFamily: t.sans,
                              fontSize: 11,
                            }}
                          >
                            {new Date(source.date).toLocaleDateString()}
                          </time>
                        ) : null}
                      </div>
                      {kindLabel ? (
                        <p
                          style={{
                            color: t.muted,
                            fontFamily: t.sans,
                            fontSize: 11,
                            margin: "4px 0 0",
                          }}
                        >
                          {kindLabel}
                        </p>
                      ) : null}
                      {source.description ? (
                        <p
                          style={{
                            color: t.inkSoft,
                            fontFamily: t.sans,
                            fontSize: 12,
                            margin: "6px 0 0",
                          }}
                        >
                          {source.description}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  background: `${t.accent}0D`,
                  border: `1px dashed ${t.accent}47`,
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <p
                  style={{
                    color: t.muted,
                    fontFamily: t.sans,
                    fontSize: 13,
                    lineHeight: 1.45,
                    margin: 0,
                  }}
                >
                  {emptySourcesCopy}
                </p>
              </div>
            )}
          </section>

          {hasHistory ? (
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 style={sectionTitleStyle(t)}>History · {displaySiblings.length}</h3>
              <div
                style={{
                  background: t.panelInner,
                  border: `1px solid ${t.ruleSoft}`,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                {displaySiblings.map((entry) => {
                  const isSelected = entry.id === displayItem.id;
                  return (
                    <div
                      key={entry.id}
                      style={{
                        background: isSelected ? `${t.accent}14` : "transparent",
                        borderBottom: `1px solid ${t.ruleSoft}`,
                        borderLeft: isSelected
                          ? `3px solid ${t.accent}`
                          : "3px solid transparent",
                        padding: "10px 12px",
                      }}
                    >
                      <p
                        style={{
                          color: t.ink,
                          fontFamily: t.sans,
                          fontSize: 12.5,
                          fontWeight: 500,
                          lineHeight: 1.4,
                          margin: 0,
                        }}
                      >
                        {entry.valueLabel}
                      </p>
                      <time
                        style={{
                          color: t.mutedSoft,
                          display: "block",
                          fontFamily: t.sans,
                          fontSize: 11,
                          marginTop: 4,
                        }}
                      >
                        {formatPeriodDisplay(entry.period)}
                      </time>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </>
  );
}
