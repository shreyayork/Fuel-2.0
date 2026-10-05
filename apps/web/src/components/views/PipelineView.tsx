"use client";

import type { CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
import { framedPanelPadStyle, framedPanelStyle } from "@/lib/theme";
import type { Company, FuelDataset } from "@/lib/types";
import { Chip, Logo, SectionHead } from "../atoms";
import { G } from "../icons";

const STAGES = ["Screening", "First Meeting", "Evaluation", "Diligence", "Term Sheet"] as const;

function btn(t: Theme, active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: active ? t.ink : "transparent",
    color: active ? t.bg : t.inkSoft,
    border: `1px solid ${t.ink}`,
    padding: "8px 14px",
    borderRadius: 8,
    fontFamily: t.sans,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  };
}

export function PipelineView({
  t,
  data,
  onOpenCo,
}: {
  t: Theme;
  data: FuelDataset;
  onOpenCo: (co: Company) => void;
}) {
  const cos = data.companies.filter((c) => c.list === "pipeline");
  const byStage = STAGES.map((s) => ({ s, items: cos.filter((c) => c.hubspotStage === s) }));

  return (
    <div className="fuel-page">
      <SectionHead
        t={t}
        title="Pipeline"
        subtitle={`${cos.length} active deals · synced with HubSpot`}
        right={
          // Legacy fixture view — same icon create pattern as live list pages.
          <button
            type="button"
            aria-label="Add company"
            title="Add company"
            style={{
              ...btn(t, true),
              height: 44,
              justifyContent: "center",
              minWidth: 44,
              padding: 0,
              width: 44,
            }}
          >
            {G.plus}
          </button>
        }
      />

      <div className="fuel-kanban">
        <div className="fuel-kanban__track">
        {byStage.map((col) => (
          <div
            key={col.s}
            className="fuel-kanban__col"
            style={{
              ...framedPanelStyle(t, { padding: 10 }),
              boxSizing: "border-box",
              minHeight: 380,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 10,
                borderBottom: `1px solid ${t.rule}`,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontFamily: t.sans,
                  fontSize: 12,
                  color: t.ink,
                  fontWeight: 600,
                  letterSpacing: "-0.005em",
                }}
              >
                {col.s}
              </div>
              <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, fontWeight: 500 }}>
                {col.items.length}
              </div>
            </div>
            {col.items.length ? (
              col.items.map((c) => {
                const tone =
                  c.fitScore >= 85 ? t.positive : c.fitScore >= 75 ? t.warn : t.muted;
                return (
                  <div
                    key={c.id}
                    onClick={() => onOpenCo(c)}
                    style={{
                      ...framedPanelPadStyle(t, { padding: 12 }),
                      cursor: "pointer",
                      marginBottom: 8,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = t.accent;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = t.rule;
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <Logo t={t} co={c} size={30} />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: t.sans,
                              fontSize: 14,
                              fontWeight: 600,
                              letterSpacing: "-0.01em",
                              color: t.ink,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.name}
                          </div>
                          <div
                            style={{
                              fontFamily: t.sans,
                              fontSize: 11,
                              color: t.muted,
                              marginTop: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.industry}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontFamily: t.sans,
                            fontSize: 18,
                            color: tone,
                            fontWeight: 600,
                            lineHeight: 1,
                            letterSpacing: "-0.01em",
                            fontFeatureSettings: '"tnum" 1',
                          }}
                        >
                          {c.fitScore}
                        </div>
                        <div style={{ fontFamily: t.sans, fontSize: 10, color: t.muted, marginTop: 3 }}>
                          fit
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontFamily: t.sans, fontSize: 11, color: t.muted }}>ARR</span>
                      <span
                        style={{
                          fontFamily: t.sans,
                          fontSize: 13,
                          fontWeight: 500,
                          color: t.ink,
                          fontFeatureSettings: '"tnum" 1',
                        }}
                      >
                        {"$" + (c.arr / 1e6).toFixed(1) + "M "}
                        <span style={{ color: t.positive, fontWeight: 500 }}>+{c.arrGrowth}%</span>
                      </span>
                    </div>
                    {c.raising ? (
                      <Chip t={t} tone="accent">
                        Raising {c.targetRound}
                      </Chip>
                    ) : (
                      <Chip t={t} tone="ghost">
                        Next: {c.targetRound}
                      </Chip>
                    )}
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: `1px solid ${t.ruleSoft}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>{c.hubspotId}</div>
                      <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted }}>
                        {c.hubspotOwner}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: 16,
                  textAlign: "center",
                  fontFamily: t.sans,
                  fontSize: 13,
                  color: t.mutedSoft,
                }}
              >
                —
              </div>
            )}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
