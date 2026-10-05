"use client";

import { useState } from "react";
import type { Theme } from "@/lib/theme";
import { framedPanelPadStyle } from "@/lib/theme";
import type { Company, FuelDataset } from "@/lib/types";
import { Avatar, Chip, Label, Logo, SectionHead, Sparkline } from "../atoms";
import { FilterMenu, PageToolbar } from "../ToolbarActions";
import { TOUCH_TARGET_MIN } from "@/lib/responsive";

type Filter = "all" | "cont" | "once";

export function InitiativesView({
  t,
  data,
  onOpenCo,
}: {
  t: Theme;
  data: FuelDataset;
  onOpenCo: (co: Company) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const all = data.initiatives;
  const cont = all.filter((e) => e.kind === "continuous");
  const once = all.filter((e) => e.kind === "onetime");
  const filtered = filter === "cont" ? cont : filter === "once" ? once : all;

  return (
    <div>
      <SectionHead
        t={t}
        title="Initiatives"
        subtitle="Active value creation — continuous services, one-time projects, and playbook runs"
        right={
          <PageToolbar
            t={t}
            filter={
              <FilterMenu t={t} activeCount={filter === "all" ? 0 : 1}>
                {(
                  [
                    { k: "all", l: `All · ${all.length}` },
                    { k: "cont", l: `Continuous · ${cont.length}` },
                    { k: "once", l: `Project · ${once.length}` },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setFilter(o.k as Filter)}
                    style={{
                      background: filter === o.k ? t.accentTint : t.panelAlt,
                      border: `1px solid ${filter === o.k ? `${t.accent}66` : t.rule}`,
                      borderRadius: 8,
                      color: t.ink,
                      cursor: "pointer",
                      fontFamily: t.sans,
                      fontSize: 13,
                      fontWeight: filter === o.k ? 650 : 500,
                      minHeight: TOUCH_TARGET_MIN,
                      padding: "0 12px",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    {o.l}
                  </button>
                ))}
              </FilterMenu>
            }
          />
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((e) => {
          const co = data.companies.find((c) => c.id === e.companyId);
          if (!co) return null;
          const isCont = e.kind === "continuous";
          const tone = e.health === "drifting" ? t.warn : t.positive;
          return (
            <div
              key={e.id}
              className="fuel-list-card"
              onClick={() => onOpenCo(co)}
              style={{
                ...framedPanelPadStyle(t, { padding: "16px 20px" }),
                alignItems: "center",
                cursor: "pointer",
                display: "grid",
                gap: 20,
                gridTemplateColumns: "minmax(240px, 1.6fr) 1.2fr 1fr 0.8fr",
              }}
              onMouseEnter={(ev) => {
                (ev.currentTarget as HTMLDivElement).style.background = t.panelAlt;
              }}
              onMouseLeave={(ev) => {
                (ev.currentTarget as HTMLDivElement).style.background = t.panel;
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Logo t={t} co={co} size={28} />
                  <div>
                    <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, fontWeight: 500 }}>
                      {isCont ? "Continuous" : "Project"} · {co.name}
                    </div>
                    <div
                      style={{
                        fontFamily: t.sans,
                        fontSize: 15,
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        marginTop: 2,
                      }}
                    >
                      {e.name}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                {isCont ? (
                  <div>
                    <Label t={t} style={{ marginBottom: 6 }}>
                      AUTOMATION · {e.automation}%
                    </Label>
                    <div style={{ height: 6, background: t.ruleSoft, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: (e.automation ?? 0) + "%", height: "100%", background: t.accent }} />
                    </div>
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      {e.signal ? <Sparkline data={e.signal} w={100} h={22} color={tone} thick={1.4} /> : null}
                      <span style={{ fontFamily: t.sans, fontSize: 12, color: tone, fontWeight: 500 }}>
                        {e.health === "drifting" ? "Drifting" : "On track"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label t={t} style={{ marginBottom: 6 }}>
                      PROGRESS · {e.pct}%
                    </Label>
                    <div style={{ height: 6, background: t.ruleSoft, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: (e.pct ?? 0) + "%", height: "100%", background: t.inkSoft }} />
                    </div>
                    <div style={{ marginTop: 10, fontFamily: t.sans, fontSize: 12, color: t.muted }}>
                      Due {e.due}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Chip t={t} tone="ghost">
                  {e.area}
                </Chip>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: t.sans,
                    fontSize: isCont ? 20 : 14,
                    color: t.ink,
                    letterSpacing: "-0.015em",
                    fontWeight: 500,
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {isCont ? e.value : "Since " + (e.since ?? "—")}
                </div>
                {isCont && e.since ? (
                  <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted, marginTop: 2 }}>
                    Since {e.since}
                  </div>
                ) : null}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                <div style={{ display: "flex" }}>
                  {(e.team ?? [e.ownerId]).map((pid, i) => {
                    const p = data.people.find((pp) => pp.id === pid);
                    if (!p) return null;
                    return (
                      <div key={pid} style={{ marginLeft: i ? -8 : 0, zIndex: 10 - i }}>
                        <Avatar t={t} person={p} size={30} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
