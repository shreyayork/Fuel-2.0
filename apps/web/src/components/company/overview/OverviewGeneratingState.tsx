"use client";

import { useEffect, useState } from "react";
import { CATEGORY_IDS, CATEGORY_META } from "@/lib/overview/constants";
import type { OverviewGenerationStatus } from "@/lib/overview/types";
import { AdvisorPanelSkeleton, GlanceRowSkeleton } from "./OverviewSkeletons";
import { overviewTracksStyle } from "./styles";

/** Client-simulated build stages — backend has no per-stage progress. */
type OverviewBuildPhase = "summary" | "dev" | "mkt" | "rev" | "suggestions";

const OVERVIEW_BUILD_STEPS: { id: OverviewBuildPhase; label: string }[] = [
  { id: "summary", label: "Writing your company summary" },
  { id: "dev", label: "Building R&D" },
  { id: "mkt", label: "Building GTM" },
  { id: "rev", label: "Building G&A" },
  { id: "suggestions", label: "Preparing initiatives and playbooks" },
];

const OVERVIEW_BUILD_PHASE_ORDER: OverviewBuildPhase[] = [
  "summary",
  "dev",
  "mkt",
  "rev",
  "suggestions",
];

/** Design PatriotPayJourney timers (ms from build start). Stops at suggestions until complete. */
const PHASE_DELAYS_MS: { phase: OverviewBuildPhase; atMs: number }[] = [
  { phase: "dev", atMs: 4_000 },
  { phase: "mkt", atMs: 14_000 },
  { phase: "rev", atMs: 26_000 },
  { phase: "suggestions", atMs: 36_000 },
];

function overviewBuildPhaseIndex(phase: OverviewBuildPhase): number {
  return OVERVIEW_BUILD_PHASE_ORDER.indexOf(phase);
}

function useOverviewBuildPhase(enabled: boolean): OverviewBuildPhase {
  const [phase, setPhase] = useState<OverviewBuildPhase>("summary");

  useEffect(() => {
    if (!enabled) return;
    setPhase("summary");
    const timers = PHASE_DELAYS_MS.map(({ phase: next, atMs }) =>
      window.setTimeout(() => setPhase(next), atMs),
    );
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [enabled]);

  return phase;
}

/** Design build panel — progress bar + current stage only. */
function OverviewBuildPanel({ phase }: { phase: OverviewBuildPhase }) {
  const idx = overviewBuildPhaseIndex(phase);
  const progress = Math.min(100, Math.round((idx / 5) * 100));
  const activeStep =
    OVERVIEW_BUILD_STEPS.find((step) => step.id === phase) ?? OVERVIEW_BUILD_STEPS[0];

  return (
    <div className="sc-overview-build overview-panel" role="status" aria-live="polite">
      <div className="sc-overview-build-top">
        <div>
          <span className="sc-overview-build-eyebrow">Building your Overview</span>
          <h2 className="sc-overview-build-title">Fuel is working from your onboarding</h2>
          <p className="sc-overview-build-copy">
            Summary lands first. R&amp;D, GTM, and G&amp;A follow — other tabs stay open.
          </p>
        </div>
      </div>
      <div
        className="sc-overview-build-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.max(8, progress)}
        aria-label="Overview build progress"
      >
        <div
          className="sc-overview-build-progress-fill is-loading"
          style={{ width: `${Math.max(8, progress)}%` }}
        />
      </div>
      <div className="sc-overview-build-active">
        <i className="sc-overview-build-pulse" aria-hidden="true" />
        <div className="sc-overview-build-active-copy">
          <strong>{activeStep.label}</strong>
        </div>
      </div>
    </div>
  );
}

/**
 * First calculation: build panel + complete advisor/track skeletons.
 * Later saves: same build panel (message + progress + stage) over existing Overview.
 */
export function OverviewGeneratingState({
  status: _status,
  companyName,
  mode,
}: {
  status: OverviewGenerationStatus;
  companyName: string;
  /** `initial` = first calc (panel + skeletons). `refresh` = form-save regen (panel over content). */
  mode: "initial" | "refresh";
}) {
  const phase = useOverviewBuildPhase(true);

  if (mode === "refresh") {
    return <OverviewBuildPanel phase={phase} />;
  }

  return (
    <div className="sc-overview-generating">
      <OverviewBuildPanel phase={phase} />
      <AdvisorPanelSkeleton companyName={companyName} metaLabel="Building…" />
      <div
        className="sc-overview-tracks sc-overview-tracks-glance"
        style={overviewTracksStyle()}
        aria-busy="true"
      >
        {CATEGORY_IDS.map((id) => (
          <GlanceRowSkeleton key={id} label={CATEGORY_META[id].label} />
        ))}
      </div>
    </div>
  );
}
