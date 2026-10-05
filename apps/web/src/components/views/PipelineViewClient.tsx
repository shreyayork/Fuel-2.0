"use client";

import Link from "next/link";
import { useState } from "react";
import { BREAKPOINTS, TOUCH_TARGET_MIN, useNarrow } from "@/lib/responsive";
import { useTheme } from "../ThemeContext";
import { SyncedPipelineView, type SyncedPipeline } from "./SyncedPipelineView";

export function PipelineViewClient({
  syncedPipelines,
}: {
  syncedPipelines: SyncedPipeline[];
}) {
  const t = useTheme();
  const phone = useNarrow(BREAKPOINTS.md);
  const tabs: Array<{ key: string; label: string }> = syncedPipelines.map((p) => ({
    key: p.config.id,
    label: p.config.label || p.config.providerPipelineName,
  }));
  const [active, setActive] = useState<string>(tabs[0]?.key ?? "");

  const synced = syncedPipelines.find((p) => p.config.id === active) ?? null;

  return (
    <div className="fuel-pipeline-shell">
      {phone || syncedPipelines.length === 0 ? null : (
        <div
          className="fuel-pipeline-tabs"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            borderBottom: `1px solid ${t.rule}`,
            marginBottom: 18,
            paddingBottom: 0,
          }}
        >
          <div
            className="fuel-tabs-scroll"
            role="tablist"
            aria-label="Synced pipelines"
            style={{
              flex: 1,
              minWidth: 0,
            }}
          >
            {tabs.map((tab) => {
              const isActive = tab.key === active;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(tab.key)}
                  style={{
                    padding: "10px 14px",
                    minHeight: TOUCH_TARGET_MIN,
                    background: "transparent",
                    border: "none",
                    fontFamily: t.sans,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? t.ink : t.muted,
                    borderBottom: `2px solid ${isActive ? t.ink : "transparent"}`,
                    marginBottom: -1,
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <Link
            href="/account/integrations/hubspot"
            style={{
              padding: "8px 12px",
              minHeight: TOUCH_TARGET_MIN,
              display: "inline-flex",
              alignItems: "center",
              fontFamily: t.sans,
              fontSize: 12,
              color: t.muted,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Manage pipelines →
          </Link>
        </div>
      )}

      {synced ? (
        <SyncedPipelineView
          t={t}
          pipeline={synced}
          pipelines={tabs}
          activePipelineId={active}
          onSelectPipeline={setActive}
        />
      ) : (
        <div
          style={{
            padding: 16,
            background: t.panel,
            border: `1px dashed ${t.rule}`,
            fontFamily: t.sans,
            fontSize: 14,
            color: t.muted,
            borderRadius: 8,
          }}
        >
          No pipeline connected yet. Connect HubSpot under Account → Integrations,
          or run the local pipeline demo seed.
        </div>
      )}
    </div>
  );
}
