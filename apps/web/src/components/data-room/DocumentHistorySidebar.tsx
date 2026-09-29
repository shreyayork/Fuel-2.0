"use client";

import { useEffect } from "react";
import type { Theme } from "@/lib/theme";
import type { DataRoomDocumentSlot } from "@/lib/data-room/types";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useAnimatedDrawerClose,
} from "@/components/drawer/motion";
import { DataRoomDownloadLink } from "./DataRoomDownloadLink";
import { documentHistoryScrimStyle, documentHistorySidebarStyle } from "./styles";

export function DocumentHistorySidebar({
  t,
  slot,
  onClose,
  onViewIntelligence,
}: {
  t: Theme;
  slot: DataRoomDocumentSlot;
  onClose: () => void;
  onViewIntelligence?: (intelligenceIds: string[]) => void;
}) {
  const { visible, durationMs, requestClose } = useAnimatedDrawerClose(onClose);
  const versions = slot.current ? [slot.current, ...slot.history] : slot.history;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close document history"
        style={{
          ...documentHistoryScrimStyle(t),
          ...drawerScrimMotionStyle(visible, durationMs),
        }}
        onClick={requestClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Document history for ${slot.typeLabel}`}
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
          <div>
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
              Document history
            </span>
            <strong
              style={{
                color: t.ink,
                fontFamily: t.sans,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {slot.typeLabel}
            </strong>
          </div>
          <button
            type="button"
            onClick={requestClose}
            style={{
              background: "transparent",
              border: `1px solid ${t.rule}`,
              borderRadius: 6,
              color: t.muted,
              cursor: "pointer",
              fontFamily: t.sans,
              fontSize: 12,
              padding: "6px 10px",
            }}
          >
            Close · Esc
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
          {versions.length ? (
            versions.map((version, index) => (
              <div
                key={version.id}
                style={{
                  background: t.panelInner,
                  border: `1px solid ${t.rule}`,
                  borderRadius: 8,
                  marginBottom: 12,
                  minWidth: 0,
                  overflow: "hidden",
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: 8,
                    justifyContent: "space-between",
                    marginBottom: 8,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      color: index === 0 ? t.accent : t.muted,
                      flexShrink: 0,
                      fontFamily: t.sans,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {index === 0 ? "Latest" : "Archived"}
                  </span>
                  <time
                    style={{
                      color: t.muted,
                      flexShrink: 0,
                      fontFamily: t.sans,
                      fontSize: 11,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {version.uploadedAt}
                  </time>
                </div>
                <strong
                  title={version.name}
                  style={{
                    color: t.ink,
                    display: "block",
                    fontFamily: t.sans,
                    fontSize: 14,
                    marginBottom: 8,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {version.name}
                </strong>
                <div
                  style={{
                    color: t.muted,
                    display: "flex",
                    fontFamily: t.sans,
                    fontSize: 12,
                    gap: 12,
                  }}
                >
                  <span>{version.format}</span>
                  <span>{version.source}</span>
                </div>
                {version.intelligenceCount > 0 ? (
                  <p
                    style={{
                      color: t.inkSoft,
                      fontFamily: t.sans,
                      fontSize: 12,
                      margin: "10px 0 0",
                    }}
                  >
                    {version.intelligenceCount} intelligence item
                    {version.intelligenceCount === 1 ? "" : "s"} generated
                    {version.observationIds[0] && onViewIntelligence ? (
                      <>
                        {" · "}
                        <button
                          type="button"
                          onClick={() => onViewIntelligence(version.observationIds)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: t.accent,
                            cursor: "pointer",
                            font: "inherit",
                            fontWeight: 600,
                            padding: 0,
                          }}
                        >
                          View intelligence→
                        </button>
                      </>
                    ) : null}
                  </p>
                ) : null}
                <DataRoomDownloadLink
                  t={t}
                  href={version.downloadPath}
                  style={{ display: "inline-block", marginTop: 12 }}
                />
              </div>
            ))
          ) : (
            <div
              style={{
                background: `${t.panelAlt}59`,
                border: `1px dashed ${t.rule}`,
                borderRadius: 8,
                padding: 18,
              }}
            >
              <strong
                style={{
                  color: t.ink,
                  display: "block",
                  fontFamily: t.sans,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                No uploads yet
              </strong>
              <p
                style={{
                  color: t.muted,
                  fontFamily: t.sans,
                  fontSize: 13,
                  lineHeight: 1.5,
                  margin: "8px 0 0",
                }}
              >
                Previous versions will appear here when you replace this document type.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
