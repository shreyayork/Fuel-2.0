import { useEffect, useRef, useState } from "react";
import { Fuel21ContextDrawerPanel } from "./Fuel21ContextDrawer.tsx";
import { Fuel21ActionDrawerPanel, type Fuel21ActionDrawerLive } from "./Fuel21ActionDrawer.tsx";
import {
  F21_COMPANION_PANEL_SWITCH_MS,
  type Fuel21CompanionBenchPanel,
} from "./fuel21CompanionDrawer.ts";
import "../PatriotPayJourney.css";
import "./fuel21-companion-drawer.css";
import "./fuel21-action-drawer.css";

function CompanionPanelLoading({ panel }: { panel: Fuel21CompanionBenchPanel }) {
  const label =
    panel === "context"
      ? "Loading context…"
      : panel === "intelligence"
        ? "Loading intelligence…"
        : panel === "initiatives"
          ? "Loading initiatives…"
          : "Loading data room…";

  return (
    <div className="f21-companion-panel-loading" aria-busy="true" aria-live="polite">
      <div className="f21-companion-loading-bar f21-companion-loading-bar--md" />
      <div className="f21-companion-loading-bar f21-companion-loading-bar--sm" />
      <div className="f21-companion-loading-bar f21-companion-loading-bar--block" />
      <p className="f21-companion-loading-label">{label}</p>
    </div>
  );
}

export function Fuel21CompanionBenchHost({
  activePanel,
  onClose,
  onOpenContextEngine,
  live,
}: {
  activePanel: Fuel21CompanionBenchPanel | null;
  onClose: () => void;
  onOpenContextEngine?: () => void;
  live?: Fuel21ActionDrawerLive;
}) {
  const [displayPanel, setDisplayPanel] = useState<Fuel21CompanionBenchPanel | null>(null);
  const [loading, setLoading] = useState(false);
  const displayRef = useRef<Fuel21CompanionBenchPanel | null>(null);
  const switchTokenRef = useRef(0);

  useEffect(() => {
    if (activePanel === null) {
      switchTokenRef.current += 1;
      displayRef.current = null;
      setDisplayPanel(null);
      setLoading(false);
      return;
    }

    const previous = displayRef.current;
    if (previous === null) {
      displayRef.current = activePanel;
      setDisplayPanel(activePanel);
      setLoading(false);
      return;
    }

    if (previous === activePanel) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const token = ++switchTokenRef.current;
    const timer = window.setTimeout(() => {
      if (token !== switchTokenRef.current) return;
      displayRef.current = activePanel;
      setDisplayPanel(activePanel);
      setLoading(false);
    }, F21_COMPANION_PANEL_SWITCH_MS);

    return () => window.clearTimeout(timer);
  }, [activePanel]);

  if (activePanel === null && displayPanel === null) return null;

  const panelToRender = displayPanel ?? activePanel;

  return (
    <div className="bench-drawer-scrim f21-companion-scrim f21-context-drawer-scrim" onClick={onClose}>
      <aside
        className={`bench-drawer f21-companion-drawer add-sources-drawer${panelToRender === "context" ? " f21-context-drawer-shell" : ""}`}
        onClick={event => event.stopPropagation()}
        aria-label="Workspace companion panel"
      >
        <div className="f21-companion-panel-viewport">
          {loading && activePanel ? <CompanionPanelLoading panel={activePanel} /> : null}
          {panelToRender ? (
            <div key={panelToRender} className="f21-companion-panel-stage">
              {panelToRender === "context" ? (
                <Fuel21ContextDrawerPanel
                  embedded
                  onClose={onClose}
                  onOpenContextEngine={
                    onOpenContextEngine
                      ? () => {
                          onClose();
                          onOpenContextEngine();
                        }
                      : undefined
                  }
                />
              ) : (
                <Fuel21ActionDrawerPanel
                  embedded
                  id={panelToRender}
                  onClose={onClose}
                  panelActive={activePanel === panelToRender}
                  live={live}
                />
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
