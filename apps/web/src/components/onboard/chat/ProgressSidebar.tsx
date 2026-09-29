"use client";

import {
  onboardSidebarAccentTitle,
  onboardSidebarBody,
  onboardSidebarCardTitle,
  onboardSidebarEyebrow,
  onboardSidebarItem,
} from "../styles";
import { progressItemsForFlow, stepIndex } from "./constants";
import { SIGNAL } from "@/lib/theme";
import type { OnboardingStep } from "./types";

export function ProgressSidebar({
  step,
  completedProgress,
  showYorkProjectsStep = false,
}: {
  step: OnboardingStep;
  completedProgress: Set<string>;
  showYorkProjectsStep?: boolean;
}) {
  const progressItems = progressItemsForFlow(showYorkProjectsStep);
  return (
    <aside
      className="fuel-onboard-progress-rail"
      style={{
        width: 280,
        flexShrink: 0,
        background: SIGNAL.chip,
        borderLeft: `1px solid ${SIGNAL.borderSubtle}`,
        padding: "28px 20px",
        overflowY: "auto",
        fontFamily: SIGNAL.sans,
      }}
    >
      <div style={{ ...onboardSidebarEyebrow(), marginBottom: 16 }}>What&apos;s getting set up</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {progressItems.map((item) => {
          const done = completedProgress.has(item.id);
          const current = !done && stepIndex(step) >= stepIndex(item.step as OnboardingStep);
          return (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: done ? SIGNAL.accentTint : "rgba(255,255,255,0.04)",
                  border: done
                    ? `1px solid ${SIGNAL.accentSoft}`
                    : current
                      ? `1px solid rgba(255,255,255,0.15)`
                      : `1px solid ${SIGNAL.borderSubtle}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                }}
                aria-hidden
              >
                {done ? (
                  <span style={{ color: SIGNAL.accent }}>✓</span>
                ) : (
                  <span style={{ color: SIGNAL.mutedSoft }}>○</span>
                )}
              </div>
              <span style={onboardSidebarItem({ done, current })}>{item.label}</span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 32,
          background: SIGNAL.panel,
          border: `1px solid ${SIGNAL.borderSubtle}`,
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div style={{ ...onboardSidebarCardTitle(), marginBottom: 8 }}>York IE Value Creation Engine</div>
        {["Foundation", "Acceleration", "Scale", "Optimization"].map((stage, i) => {
          const stageReached = completedProgress.has("benchmarks");
          return (
            <div
              key={stage}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                borderBottom: i < 3 ? `1px solid ${SIGNAL.borderFaint}` : "none",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: stageReached && i === 0 ? SIGNAL.accent : "rgba(255,255,255,0.1)",
                }}
                aria-hidden
              />
              <span
                style={onboardSidebarBody({
                  color: stageReached && i === 0 ? SIGNAL.muted : SIGNAL.mutedSoft,
                })}
              >
                Stage {i + 1}: {stage}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 16,
          background: SIGNAL.accentTint,
          border: `1px solid ${SIGNAL.accentSoft}`,
          borderRadius: 10,
          padding: "12px 14px",
        }}
      >
        <div style={{ ...onboardSidebarAccentTitle(), marginBottom: 6 }}>⚡ Fuel Store</div>
        <div style={onboardSidebarBody()}>
          Add integrations and premium connectors anytime from the Fuel Store in your workspace.
        </div>
      </div>
    </aside>
  );
}
