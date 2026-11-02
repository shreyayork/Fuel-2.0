import React, { useId, useState, type ReactNode } from "react";
import "./FounderView.css";
import { FounderViewNewDesign } from "./FounderViewNewDesign.tsx";
import type { FounderViewTrackId, FounderViewWorkspaceTab } from "./founderViewData.ts";

export type FounderDesignTab = "new" | "old";

const DESIGN_TABS: Array<{ id: FounderDesignTab; label: string }> = [
  { id: "new", label: "New Design" },
  { id: "old", label: "Old Design" },
];

export function FounderDesignCompare({
  initialTab = "new",
  embedded = false,
  oldDesign,
  onExit,
  onOpenTrack,
  onOpenBrief,
  onAddDetails,
  onAskFuel,
  onViewProfile,
  onOpenWorkspaceTab,
}: {
  initialTab?: FounderDesignTab;
  embedded?: boolean;
  oldDesign: ReactNode;
  onExit?: () => void;
  onOpenTrack?: (trackId: FounderViewTrackId) => void;
  onOpenBrief?: () => void;
  onAddDetails?: () => void;
  onAskFuel?: () => void;
  onViewProfile?: () => void;
  onOpenWorkspaceTab?: (tab: FounderViewWorkspaceTab) => void;
}) {
  const [tab, setTab] = useState<FounderDesignTab>(initialTab);
  const tablistId = useId();
  const panelId = useId();

  function selectTab(next: FounderDesignTab) {
    setTab(next);
  }

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, current: FounderDesignTab) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    const index = DESIGN_TABS.findIndex(item => item.id === current);
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % DESIGN_TABS.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + DESIGN_TABS.length) % DESIGN_TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = DESIGN_TABS.length - 1;
    const next = DESIGN_TABS[nextIndex].id;
    selectTab(next);
    queueMicrotask(() => {
      document.getElementById(`${tablistId}-${next}`)?.focus();
    });
  }

  const tabs = (
    <div className="founder-view-design-tabs" role="tablist" aria-label="Design version">
      {DESIGN_TABS.map(item => {
        const selected = tab === item.id;
        return (
          <button
            key={item.id}
            id={`${tablistId}-${item.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectTab(item.id)}
            onKeyDown={event => onTabKeyDown(event, item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  const panel = (
    <div
      id={panelId}
      className="founder-view-panel"
      role="tabpanel"
      aria-labelledby={`${tablistId}-${tab}`}
      key={tab}
    >
      {tab === "new" ? (
        <FounderViewNewDesign
          embedded={embedded}
          onOpenTrack={onOpenTrack}
          onOpenBrief={onOpenBrief}
          onAddDetails={onAddDetails}
          onAskFuel={onAskFuel}
          onViewProfile={onViewProfile}
          onOpenWorkspaceTab={onOpenWorkspaceTab}
        />
      ) : (
        <div className="founder-view-old-live" aria-label="Original Overview design">
          {oldDesign}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="founder-view-page founder-view-page--embedded">
        <div className="founder-view-embedded-bar founder-view-embedded-bar--tabs-only">{tabs}</div>
        <div className="founder-view-stage founder-view-stage--embedded">{panel}</div>
      </div>
    );
  }

  return (
    <div className="founder-view-page">
      <header className="founder-view-chrome">
        <div className="founder-view-chrome-row">
          <div className="founder-view-chrome-actions">
            {tabs}
          </div>
          {onExit ? (
            <button type="button" className="founder-view-btn founder-view-btn-ghost" onClick={onExit}>
              Exit Preview
            </button>
          ) : null}
        </div>
      </header>
      <main className="founder-view-stage">{panel}</main>
    </div>
  );
}
