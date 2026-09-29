"use client";

import Link from "next/link";
import { useState } from "react";
import { useTheme } from "../ThemeContext";
import { SyncedPipelineView, type SyncedPipeline } from "./SyncedPipelineView";

export function PipelineViewClient({
  syncedPipelines,
}: {
  syncedPipelines: SyncedPipeline[];
}) {
  const t = useTheme();
  const tabs: Array<{ key: string; label: string }> = syncedPipelines.map((p) => ({
    key: p.config.id,
    label: p.config.label || p.config.providerPipelineName,
  }));
  const [active, setActive] = useState<string>(tabs[0]?.key ?? "");

  const synced = syncedPipelines.find((p) => p.config.id === active) ?? null;

  return (
    <div>
      {syncedPipelines.length === 0 ? null : (
        <div
          style={{
            display: "flex",
            gap: 4,
            borderBottom: `1px solid ${t.rule}`,
            marginBottom: 18,
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.key === active;
            return (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                style={{
                  padding: "10px 14px",
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
          <div style={{ flex: 1 }} />
          <Link
            href="/account/integrations/hubspot"
            style={{
              padding: "8px 12px",
              fontFamily: t.sans,
              fontSize: 12,
              color: t.muted,
              textDecoration: "none",
            }}
          >
            Manage pipelines →
          </Link>
        </div>
      )}

      {synced ? (
        <SyncedPipelineView t={t} pipeline={synced} />
      ) : (
        <div
          style={{
            padding: 16,
            background: t.panel,
            border: `1px dashed ${t.rule}`,
            fontFamily: t.sans,
            fontSize: 13,
            color: t.muted,
            textAlign: "center",
          }}
        >
          Connect HubSpot and enable a deal pipeline to see your real deals here.{" "}
          <Link href="/account/integrations" style={{ color: t.ink }}>
            Go to Integrations →
          </Link>
        </div>
      )}
    </div>
  );
}
