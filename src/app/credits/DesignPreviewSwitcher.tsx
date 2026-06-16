import React from "react";
import { DEMO_PRESETS } from "./demoPresets";
import { useCredits } from "./CreditProvider";
import { isDemoMode } from "./isDemoMode";
import type { DemoPresetId } from "./types";

export function DesignPreviewSwitcher() {
  const { applyDemoPreset } = useCredits();
  if (!isDemoMode) return null;

  return (
    <div className="credit-design-preview" aria-label="Design preview controls">
      <label>Design Preview</label>
      <select
        defaultValue="free-healthy"
        onChange={event => applyDemoPreset(event.target.value as DemoPresetId)}
      >
        {DEMO_PRESETS.map(preset => (
          <option key={preset.id} value={preset.id}>{preset.label}</option>
        ))}
      </select>
    </div>
  );
}
