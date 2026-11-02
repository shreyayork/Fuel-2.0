import React from "react";
import { FounderDesignCompare } from "./FounderDesignCompare.tsx";

export type { FounderDesignTab } from "./FounderDesignCompare.tsx";

export default function FounderView({ onExit }: { onExit?: () => void }) {
  return (
    <FounderDesignCompare
      onExit={onExit}
      oldDesign={
        <div className="founder-view-old-fallback overview-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Original Overview</h3>
          <p style={{ maxWidth: "480px", margin: "0 auto 20px", color: "var(--fv-body)" }}>
            The original overview lives inside the interactive founder workspace. You can switch between New Design and Old Design seamlessly directly in the workspace.
          </p>
          {onExit && (
            <button
              type="button"
              className="founder-view-btn founder-view-btn-primary"
              onClick={onExit}
            >
              Open Live Founder Workspace
            </button>
          )}
        </div>
      }
    />
  );
}
