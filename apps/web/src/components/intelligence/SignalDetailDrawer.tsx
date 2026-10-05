"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  accentChipBg,
  accentChipBorder,
  accentChipFg,
  panelCardSurface,
  type Theme,
} from "@/lib/theme";
import { BREAKPOINTS, TOUCH_TARGET_MIN, mqMax, useMediaQuery } from "@/lib/responsive";
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

/** Section eyebrows — muted meta, not accent (COLOR_SYSTEM / provenance). */
function sectionLabelStyle(t: Theme): CSSProperties {
  return {
    color: t.mutedSoft,
    display: "block",
    fontFamily: t.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    margin: 0,
    textTransform: "uppercase",
  };
}

function categoryChipStyle(t: Theme): CSSProperties {
  return {
    alignSelf: "flex-start",
    background: accentChipBg(t),
    border: `1px solid ${accentChipBorder(t)}`,
    borderRadius: 4,
    color: accentChipFg(t),
    display: "inline-block",
    fontFamily: t.mono,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.06em",
    lineHeight: 1.2,
    padding: "3px 7px",
    textTransform: "uppercase",
  };
}

function signalNameStyle(t: Theme): CSSProperties {
  return {
    color: t.ink,
    fontFamily: t.sans,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    lineHeight: 1.3,
    margin: 0,
  };
}

function valueStyle(t: Theme): CSSProperties {
  return {
    color: t.inkSoft,
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0,
    lineHeight: 1.4,
    margin: 0,
  };
}

function nestedWellStyle(t: Theme): CSSProperties {
  return {
    background: t.panelInner,
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    boxSizing: "border-box",
    width: "100%",
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
  const sheet = useMediaQuery(mqMax(BREAKPOINTS.md), false);
  const { mounted, visible, durationMs } = useDrawerPresence(open);
  const [displayItem, setDisplayItem] = useState(item);
  const [displaySiblings, setDisplaySiblings] = useState(siblings);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

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

  if (!mounted || !displayItem || !portalReady) return null;

  const hasHistory = displaySiblings.length > 1;
  const sourceCount = displayItem.sources.length;
  const emptySourcesCopy = isProfileOrBenchmarkProvenance({
    source: displayItem.source,
    generationPath: displayItem.generationPath,
    isBenchmark: displayItem.isBenchmark,
  })
    ? "This value came from the profile or benchmark."
    : "No linked sources.";

  const closeBtnStyle: CSSProperties = {
    alignItems: "center",
    background: t.panel,
    border: `1px solid ${t.rule}`,
    borderRadius: 8,
    boxSizing: "border-box",
    color: t.muted,
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    fontFamily: t.sans,
    fontSize: sheet ? 12 : 11,
    fontWeight: 600,
    justifyContent: "center",
    minHeight: sheet ? TOUCH_TARGET_MIN : undefined,
    minWidth: sheet ? TOUCH_TARGET_MIN : undefined,
    padding: sheet ? "0 12px" : "6px 10px",
  };

  return createPortal(
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
        className="fuel-side-sheet"
        style={{
          ...(sheet
            ? {
                background: t.panel,
                borderRadius: "16px 16px 0 0",
                borderTop: `1px solid ${t.rule}`,
                bottom: 0,
                boxShadow: `0 -16px 48px ${t.overlay}`,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                left: 0,
                maxHeight: "min(92vh, 720px)",
                overflow: "hidden",
                position: "fixed",
                right: 0,
                top: "auto",
                width: "100%",
                zIndex: 60,
              }
            : documentHistorySidebarStyle(t)),
          ...drawerPanelMotionStyle(visible, durationMs, {
            from: sheet ? "bottom" : "right",
          }),
        }}
      >
        {sheet ? (
          <div
            aria-hidden
            style={{
              alignSelf: "center",
              background: t.rule,
              borderRadius: 999,
              flexShrink: 0,
              height: 4,
              marginTop: 8,
              width: 36,
            }}
          />
        ) : null}

        <div
          style={{
            alignItems: "center",
            background: t.panel,
            borderBottom: `1px solid ${t.rule}`,
            display: "flex",
            flexShrink: 0,
            gap: 12,
            justifyContent: "space-between",
            padding: sheet ? "10px 16px 12px" : "14px 18px",
          }}
        >
          <strong
            style={{
              color: t.ink,
              fontFamily: t.sans,
              fontSize: 14,
              fontWeight: 650,
              minWidth: 0,
            }}
          >
            Signal detail
          </strong>
          <button
            type="button"
            className="fuel-side-sheet__close"
            onClick={onClose}
            style={closeBtnStyle}
          >
            {sheet ? "Close" : "Close · Esc"}
          </button>
        </div>

        <div
          style={{
            background: t.bg,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: sheet ? 14 : 16,
            minHeight: 0,
            minWidth: 0,
            overflow: "auto",
            padding: sheet
              ? "14px 16px calc(16px + env(safe-area-inset-bottom, 0px))"
              : "16px 18px 20px",
            width: "100%",
          }}
        >
          <section
            style={{
              ...panelCardSurface(t),
              borderRadius: 10,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: sheet ? "12px 14px" : "14px 16px",
              width: "100%",
            }}
          >
            <span style={categoryChipStyle(t)}>{displayItem.categoryLabel}</span>
            <h2 style={signalNameStyle(t)}>{displayItem.signalName}</h2>
            {displayItem.valueLabel ? <p style={valueStyle(t)}>{displayItem.valueLabel}</p> : null}
            <div
              style={{
                alignItems: "baseline",
                alignSelf: "flex-start",
                background: accentChipBg(t),
                border: `1px solid ${accentChipBorder(t)}`,
                borderRadius: 8,
                display: "inline-flex",
                flexWrap: "wrap",
                gap: "2px 10px",
                marginTop: 2,
                padding: "6px 10px",
              }}
            >
              <span
                style={{
                  color: accentChipFg(t),
                  fontFamily: t.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Period
              </span>
              <span
                style={{
                  color: t.ink,
                  fontFamily: t.sans,
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                {formatPeriodDisplay(displayItem.period)}
              </span>
            </div>
          </section>

          {displayItem.summary ? (
            <section style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <h3 style={sectionLabelStyle(t)}>Summary</h3>
              <div style={{ ...nestedWellStyle(t), padding: "12px 14px" }}>
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
            <section style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <h3 style={sectionLabelStyle(t)}>Note</h3>
              <div style={{ ...nestedWellStyle(t), padding: "12px 14px" }}>
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

          <section style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <h3 style={sectionLabelStyle(t)}>
              {sourceCount > 0
                ? `${sourceCount} source${sourceCount === 1 ? "" : "s"}`
                : "Sources"}
            </h3>
            {sourceCount > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                {displayItem.sources.map((source) => {
                  const kindLabel = resolveFeedSourceKindLabel({
                    kind: source.kind,
                    provenanceSource: displayItem.source,
                  });
                  return (
                    <article
                      key={source.id}
                      style={{
                        ...nestedWellStyle(t),
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          justifyContent: "space-between",
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            color: t.ink,
                            fontFamily: t.sans,
                            fontSize: 12.5,
                            fontWeight: 600,
                            minWidth: 0,
                          }}
                        >
                          {source.title}
                        </strong>
                        {source.date ? (
                          <time
                            style={{
                              color: t.mutedSoft,
                              flexShrink: 0,
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
                  background: t.panelInner,
                  border: `1px dashed ${t.rule}`,
                  borderRadius: 8,
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  width: "100%",
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
            <section style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <h3 style={sectionLabelStyle(t)}>History · {displaySiblings.length}</h3>
              <div style={{ ...nestedWellStyle(t), overflow: "hidden" }}>
                {displaySiblings.map((entry) => {
                  const isSelected = entry.id === displayItem.id;
                  return (
                    <div
                      key={entry.id}
                      style={{
                        background: isSelected ? t.accentTint : "transparent",
                        borderBottom: `1px solid ${t.ruleSoft}`,
                        boxSizing: "border-box",
                        padding: "10px 12px",
                        width: "100%",
                      }}
                    >
                      <p
                        style={{
                          color: t.ink,
                          fontFamily: t.sans,
                          fontSize: 12.5,
                          fontWeight: isSelected ? 600 : 500,
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
    </>,
    document.body,
  );
}
