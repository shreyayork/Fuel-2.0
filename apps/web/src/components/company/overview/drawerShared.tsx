"use client";

import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  drawerPanelMotionStyle,
  drawerScrimMotionStyle,
  useDrawerPresence,
} from "@/components/drawer/motion";
import {
  drawerRootStyle,
  drawerScrimStyle,
  overviewDrawerKeyframesCss,
} from "./drawerStyles";
import { useOverviewTheme } from "./overview-theme";

export function useNarrow(bp = 560): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [bp]);
  return narrow;
}

export function useDrawerEscape(
  open: boolean,
  blocked: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || blocked) return;
      // Stop before AgentDrawer (window) so closing this panel does not
      // also dismiss Talk to Agent.
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, blocked, onClose]);
}

export function HoverBtn({
  styleFor,
  ...rest
}: {
  styleFor: (hovered: boolean) => CSSProperties;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      {...rest}
      style={styleFor(hovered)}
      onMouseEnter={(e) => {
        setHovered(true);
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        rest.onMouseLeave?.(e);
      }}
    />
  );
}

type OverviewDrawerShellProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  /** Benchmark/sources use the bench scrim + slide-in panel. */
  variant?: "detail" | "bench";
  panelStyle: CSSProperties;
  children: ReactNode;
};

/** Shared portal + scrim + dialog panel for Overview side drawers. */
export function OverviewDrawerShell({
  open,
  onClose,
  ariaLabel,
  variant = "detail",
  panelStyle,
  children,
}: OverviewDrawerShellProps) {
  const t = useOverviewTheme();
  const { mounted, visible, durationMs } = useDrawerPresence(open);
  if (!mounted) return null;

  const bench = variant === "bench";
  return createPortal(
    <div style={drawerRootStyle(t)}>
      <style>{overviewDrawerKeyframesCss(t)}</style>
      <div
        style={{
          ...drawerScrimStyle(t, { bench }),
          ...drawerScrimMotionStyle(visible, durationMs),
        }}
        onClick={onClose}
      >
        <aside
          style={{
            ...panelStyle,
            ...drawerPanelMotionStyle(visible, durationMs),
          }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
        >
          {children}
        </aside>
      </div>
    </div>,
    document.body,
  );
}
