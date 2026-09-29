"use client";

import type { Theme } from "@/lib/theme";
import {
  documentNoticeActionStyle,
  documentNoticeBannerStyle,
} from "./styles";

export function DocumentNoticeBanner({
  t,
  message,
  showOpenDataRoom,
  onOpenDataRoom,
  onDismiss,
}: {
  t: Theme;
  message: string;
  showOpenDataRoom?: boolean;
  onOpenDataRoom?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div style={documentNoticeBannerStyle(t)} role="status">
      <span>{message}</span>
      <div style={{ alignItems: "center", display: "flex", flexShrink: 0, gap: 8 }}>
        {showOpenDataRoom && onOpenDataRoom ? (
          <button type="button" style={documentNoticeActionStyle(t)} onClick={onOpenDataRoom}>
            Open Data Room
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Dismiss"
          style={{
            ...documentNoticeActionStyle(t),
            fontSize: 16,
            lineHeight: 1,
            padding: "2px 8px",
          }}
          onClick={onDismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
