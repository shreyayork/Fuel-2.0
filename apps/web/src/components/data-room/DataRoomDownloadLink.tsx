"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
import { useToast } from "@/components/toast/ToastProvider";
import { dataRoomIntelligenceLinkStyle } from "./styles";

type DownloadPayload = {
  url: string;
  filename?: string;
};

export function DataRoomDownloadLink({
  t,
  href,
  label = "Download",
  style,
}: {
  t: Theme;
  href: string;
  label?: string;
  style?: CSSProperties;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);

    try {
      const res = await fetch(href, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 401 || res.status === 403) {
        showToast({
          message: "Session expired. Refresh the page and try again.",
          variant: "error",
        });
        return;
      }

      if (!res.ok) {
        showToast({ message: "Download failed. Please try again.", variant: "error" });
        return;
      }

      const payload = (await res.json()) as DownloadPayload;
      if (!payload.url) {
        showToast({ message: "Download failed. Please try again.", variant: "error" });
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = payload.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      if (payload.filename) {
        anchor.download = payload.filename;
      }
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      showToast({ message: "Download failed. Please try again.", variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handleClick}
      style={{
        ...dataRoomIntelligenceLinkStyle(t),
        background: "transparent",
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.7 : 1,
        textDecoration: "none",
        ...style,
      }}
    >
      {busy ? "Downloading…" : label}
    </button>
  );
}
