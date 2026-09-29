"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useOverviewTheme } from "./overview-theme";

const POPOVER_CLOSE_MS = 160;

/** Truncated glance focus copy — hover tooltip only; click still opens the track. */
export function GlanceFocusText({ text }: { text: string }) {
  const t = useOverviewTheme();
  const ref = useRef<HTMLParagraphElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setTruncated(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    };
  }, [text]);

  const cancelClose = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const keepOpen = () => {
    if (!truncated) return;
    cancelClose();
    setOpen(true);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), POPOVER_CLOSE_MS);
  };

  const showTip = truncated && open;

  return (
    <Popover modal={false} open={showTip} onOpenChange={(next) => truncated && setOpen(next)}>
      <PopoverAnchor asChild>
        <p
          ref={ref}
          className={`sc-glance-track-focus${truncated ? " is-truncated" : ""}`}
          onMouseEnter={keepOpen}
          onMouseLeave={scheduleClose}
        >
          {text}
        </p>
      </PopoverAnchor>
      <PopoverContent
        t={t}
        side="bottom"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={keepOpen}
        onMouseLeave={scheduleClose}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "min(360px, calc(100vw - 24px))",
          maxHeight: "min(240px, 50vh)",
          overflowY: "auto",
          padding: "10px 12px",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 12.5,
            color: t.inkSoft,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
      </PopoverContent>
    </Popover>
  );
}
