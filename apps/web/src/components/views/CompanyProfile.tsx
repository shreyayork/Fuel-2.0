"use client";

import { useState } from "react";
import type { Theme } from "@/lib/theme";
import type { Company, FuelDataset, InitiativeWithTeam, CompanySignal } from "@/lib/types";
import {
  Avatar,
  Chip,
  KPI,
  Label,
  Logo,
  PercentileBar,
  Sparkline,
  Tabs,
} from "../atoms";
import { G } from "../icons";

type Tab = "overview" | "metrics" | "context" | "engage" | "dataroom";

export function CompanyProfile({
  t,
  co,
  data,
  onBack,
}: {
  t: Theme;
  co: Company;
  data: FuelDataset;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const subs = data.initiatives.filter((e) => e.companyId === co.id);
  const signals = data.signalsByCompany[co.id] ?? [];

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: t.sans,
          fontSize: 13,
          fontWeight: 500,
          color: t.muted,
          marginBottom: 20,
          padding: 0,
        }}
      >
        {G.back} Back to {co.list === "portfolio" ? "Portfolio" : "Pipeline"}
      </button>

      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo t={t} co={co} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: t.sans,
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: t.ink,
                }}
              >
                {co.name}
              </h1>
              <Chip t={t} tone="ghost">
                {co.stage}
              </Chip>
              <Chip t={t} tone="ghost">
                {co.industry}
              </Chip>
              {co.raising ? (
                <Chip t={t} tone="accent">
                  Raising {co.targetRound}
                </Chip>
              ) : null}
            </div>
            <div style={{ marginTop: 4, fontFamily: t.sans, fontSize: 13, color: t.muted }}>
              {co.hq}
              {co.employees ? " · " + co.employees + " FTE" : ""}
              {co.list === "portfolio" ? " · Led by Sarah Chen" : " · Owner: " + (co.hubspotOwner ?? "")}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, marginBottom: 28 }}>
        <Tabs
          t={t}
          active={tab}
          onChange={(k) => setTab(k as Tab)}
          items={[
            { key: "overview", label: "Overview" },
            { key: "metrics", label: "Private Metrics" },
            { key: "context", label: "Context Feed", count: signals.length },
            { key: "engage", label: "Initiatives", count: subs.length },
            { key: "dataroom", label: "Data Room" },
          ]}
        />
      </div>

      {tab === "overview" && <Overview t={t} co={co} data={data} signals={signals} subs={subs} />}
      {tab === "metrics" && <Metrics t={t} co={co} data={data} />}
      {tab === "context" && <Context t={t} co={co} signals={signals} />}
      {tab === "engage" && <InitiativesTab t={t} data={data} subs={subs} />}
      {tab === "dataroom" && <DataRoom t={t} />}
    </div>
  );
}

function Overview({
  t,
  co,
  data,
  signals,
  subs,
}: {
  t: Theme;
  co: Company;
  data: FuelDataset;
  signals: CompanySignal[];
  subs: InitiativeWithTeam[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28 }}>
      <div>
        <div style={{ display: "flex", border: `1px solid ${t.rule}`, background: t.panel, marginBottom: 24 }}>
          <KPI
            t={t}
            idx={0}
            label="ARR"
            value={"$" + (co.arr / 1e6).toFixed(1) + "M"}
            delta={co.arrGrowth}
            spark={[3.5, 4.2, 5.1, 5.8, 6.5, 7.2, 7.8, co.arr / 1e6]}
            sparkColor={t.accent}
          />
          <KPI
            t={t}
            idx={1}
            label="NRR"
            value={co.nrr + "%"}
            footnote={co.nrr > 110 ? "Expansion strong" : "At target"}
          />
          <KPI
            t={t}
            idx={2}
            label="Burn"
            value={"$" + ((co.burn ?? 0) / 1000).toFixed(0) + "K"}
            footnote="per month"
          />
          <KPI
            t={t}
            idx={3}
            label="Runway"
            value={(co.runway ?? 0) + "mo"}
            footnote={(co.runway ?? 0) < 12 ? "Tight" : "Healthy"}
          />
        </div>

        <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 28, marginBottom: 20 }}>
          <Label t={t} style={{ marginBottom: 14 }}>
            Intelligence Brief · Synthesized from {signals.length + 8} items
          </Label>
          <p
            style={{
              margin: 0,
              fontFamily: t.sans,
              fontSize: 15,
              fontWeight: 400,
              lineHeight: 1.6,
              color: t.ink,
            }}
          >
            <span style={{ fontWeight: 600, color: t.ink }}>{co.name}</span>
            {" is tracking " + (co.arrGrowth > 60 ? "ahead of plan" : "to plan") +
              " on ARR and outperforming peers on NRR. The operating team's attention this month is on closing the SE hiring gap before the " +
              (co.arr > 5e6 ? "expansion push into mid-market" : "move upmarket") +
              "."}
          </p>
          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: `1px solid ${t.ruleSoft}`,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 18,
            }}
          >
            <Stat t={t} l="Closest Comp" v="Fivetran (2021)" />
            <Stat t={t} l="Next Milestone" v="Series C, Q3 '26" />
            <Stat t={t} l="Board Cadence" v="Every 8 weeks" />
          </div>
        </div>

        {subs.length ? (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: t.sans,
                  fontWeight: 600,
                  fontSize: 20,
                  letterSpacing: "-0.015em",
                }}
              >
                Active initiatives
              </h3>
              <Label t={t}>{subs.length} ITEMS</Label>
            </div>
            {subs.slice(0, 3).map((e) => (
              <div
                key={e.id}
                style={{
                  background: t.panel,
                  border: `1px solid ${t.rule}`,
                  padding: "14px 18px",
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <Chip t={t} tone={e.kind === "continuous" ? "accent" : "ghost"}>
                    {e.kind === "continuous" ? "Continuous" : "Project"}
                  </Chip>
                  <div
                    style={{
                      marginTop: 8,
                      fontFamily: t.sans,
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {e.name}
                  </div>
                  <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginTop: 2 }}>
                    {e.area}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {e.kind === "continuous" && e.signal ? (
                    <Sparkline
                      data={e.signal as number[]}
                      w={120}
                      h={28}
                      color={e.health === "drifting" ? t.warn : t.positive}
                      thick={1.4}
                    />
                  ) : (
                    <div style={{ fontFamily: t.mono, fontSize: 14, color: t.ink }}>{e.pct}%</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <div style={{ position: "sticky", top: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 12,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: t.sans,
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: "-0.01em",
              }}
            >
              Live signal
            </h3>
            <Label t={t}>Q2 · REALTIME</Label>
          </div>
          <div style={{ background: t.panel, border: `1px solid ${t.rule}` }}>
            {signals.length ? (
              signals.map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 16px",
                    borderBottom: i === signals.length - 1 ? "none" : `1px solid ${t.ruleSoft}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Chip t={t} tone="ghost">
                      {s.kind}
                    </Chip>
                    <span style={{ fontFamily: t.sans, fontSize: 11, color: t.mutedSoft }}>
                      {s.at} ago
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: t.inkSoft }}>{s.text}</div>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  fontFamily: t.sans,
                  fontSize: 13,
                  color: t.muted,
                }}
              >
                No recent signal
              </div>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <Label t={t} style={{ marginBottom: 10 }}>
              PEOPLE ON THIS ACCOUNT
            </Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[1, 3, 5].map((pid) => {
                const p = data.people.find((pp) => pp.id === pid);
                if (!p) return null;
                return (
                  <div
                    key={pid}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}
                  >
                    <Avatar t={t} person={p} size={30} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted }}>{p.role}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ t, l, v }: { t: Theme; l: string; v: string }) {
  return (
    <div>
      <Label t={t}>{l}</Label>
      <div
        style={{
          marginTop: 4,
          fontFamily: t.sans,
          fontSize: 14,
          fontWeight: 500,
          color: t.ink,
          letterSpacing: "-0.005em",
        }}
      >
        {v}
      </div>
    </div>
  );
}

function Metrics({ t, co, data }: { t: Theme; co: Company; data: FuelDataset }) {
  const bm = data.benchmarks;
  return (
    <div>
      <div style={{ display: "flex", border: `1px solid ${t.rule}`, background: t.panel, marginBottom: 24 }}>
        <KPI
          t={t}
          idx={0}
          label="ARR"
          value={"$" + (co.arr / 1e6).toFixed(1) + "M"}
          delta={co.arrGrowth}
          spark={[3.5, 4.2, 5.1, 5.8, 6.5, 7.2, 7.8, co.arr / 1e6]}
          sparkColor={t.accent}
        />
        <KPI
          t={t}
          idx={1}
          label="Pipeline"
          value="$4.2M"
          spark={[2.1, 2.6, 3.0, 3.2, 3.6, 3.9, 4.0, 4.2]}
          sparkColor={t.positive}
        />
        <KPI
          t={t}
          idx={2}
          label="Win Rate"
          value="28%"
          spark={[20, 22, 24, 23, 25, 27, 28, 28]}
          sparkColor={t.positive}
        />
        <KPI t={t} idx={3} label="CAC Payback" value="11mo" footnote="vs. 18mo peer median" />
        <KPI t={t} idx={4} label="eNPS" value={42} footnote="Strong" />
      </div>
      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 24 }}>
        <h3
          style={{
            margin: "0 0 18px",
            fontFamily: t.sans,
            fontWeight: 600,
            fontSize: 20,
            letterSpacing: "-0.015em",
          }}
        >
          {co.name} vs. peers
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1.4fr 2fr",
            padding: "8px 0",
            borderBottom: `1px solid ${t.rule}`,
            fontFamily: t.sans,
            fontSize: 11,
            color: t.muted,
            fontWeight: 500,
          }}
        >
          <div>Metric</div>
          <div style={{ textAlign: "right" }}>p25</div>
          <div style={{ textAlign: "right" }}>p50</div>
          <div style={{ textAlign: "right" }}>p75</div>
          <div style={{ textAlign: "right" }}>This co.</div>
          <div>Position</div>
        </div>
        {bm.map((v) => (
          <div
            key={v.metric}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1.4fr 2fr",
              padding: "14px 0",
              borderBottom: `1px solid ${t.ruleSoft}`,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 13 }}>{v.metric}</div>
            <div
              style={{
                textAlign: "right",
                fontFamily: t.sans,
                fontSize: 13,
                color: t.muted,
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {v.p25}
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: t.sans,
                fontSize: 13,
                color: t.inkSoft,
                fontFeatureSettings: '"tnum" 1',
                fontWeight: 500,
              }}
            >
              {v.p50}
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: t.sans,
                fontSize: 13,
                color: t.muted,
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {v.p75}
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: t.sans,
                fontSize: 18,
                color: t.accent,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {v.you}
            </div>
            <div>
              <PercentileBar t={t} bench={v} w={200} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Context({ t, co, signals }: { t: Theme; co: Company; signals: CompanySignal[] }) {
  return (
    <div>
      <div style={{ background: t.panel, border: `1px solid ${t.rule}`, padding: 24, marginBottom: 20 }}>
        <Label t={t} style={{ marginBottom: 12 }}>
          Synthesis · Updated 12m ago
        </Label>
        <p style={{ margin: 0, fontFamily: t.sans, fontSize: 15, lineHeight: 1.6, color: t.ink }}>
          The {co.name} thread this month centers on expansion and hiring. Sarah has two unresolved threads: the
          Nordics pilot (high-conviction, pushing to close) and the SE gap (recruiter engaged, 3 candidates
          active). No red flags.
        </p>
      </div>
      <div style={{ background: t.panel, border: `1px solid ${t.rule}` }}>
        <div
          style={{
            padding: "12px 20px",
            borderBottom: `1px solid ${t.rule}`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: t.sans,
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: "-0.01em",
            }}
          >
            Signal feed
          </h3>
          <Label t={t}>{signals.length} items</Label>
        </div>
        {(signals.length
          ? signals
          : [{ at: "—", kind: "—", text: "No signal captured yet." }]
        ).map((s, i) => (
          <div
            key={i}
            style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${t.ruleSoft}`,
              display: "grid",
              gridTemplateColumns: "80px 90px 1fr",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, fontWeight: 500 }}>
              {s.at} ago
            </div>
            <Chip t={t} tone="ghost">
              {s.kind}
            </Chip>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: t.inkSoft }}>{s.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InitiativesTab({
  t,
  data,
  subs,
}: {
  t: Theme;
  data: FuelDataset;
  subs: InitiativeWithTeam[];
}) {
  if (subs.length === 0) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: "center",
          fontFamily: t.sans,
          fontSize: 13,
          color: t.muted,
          background: t.panel,
          border: `1px solid ${t.rule}`,
        }}
      >
        NO ACTIVE INITIATIVES
      </div>
    );
  }
  return (
    <div>
      {subs.map((e) => (
        <div
          key={e.id}
          style={{
            background: t.panel,
            border: `1px solid ${t.rule}`,
            borderLeft: `3px solid ${e.kind === "continuous" ? t.accent : t.inkSoft}`,
            padding: 20,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 20, alignItems: "center" }}>
            <div>
              <Chip t={t} tone={e.kind === "continuous" ? "accent" : "ghost"}>
                {e.kind === "continuous" ? "Continuous" : "Project"}
              </Chip>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: t.sans,
                  fontSize: 18,
                  fontWeight: 600,
                  letterSpacing: "-0.015em",
                }}
              >
                {e.name}
              </div>
              <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginTop: 4 }}>
                {e.area} · {e.since ?? "due " + e.due}
              </div>
            </div>
            <div>
              {e.kind === "continuous" ? (
                <>
                  <Label t={t} style={{ marginBottom: 6 }}>
                    Automation · {e.automation}%
                  </Label>
                  <div style={{ height: 6, background: t.ruleSoft, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: (e.automation ?? 0) + "%", height: "100%", background: t.accent }} />
                  </div>
                  {e.signal ? (
                    <Sparkline
                      data={e.signal as number[]}
                      w={180}
                      h={30}
                      color={e.health === "drifting" ? t.warn : t.positive}
                      thick={1.5}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  <Label t={t} style={{ marginBottom: 6 }}>
                    Progress · {e.pct}%
                  </Label>
                  <div style={{ height: 6, background: t.ruleSoft, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: (e.pct ?? 0) + "%", height: "100%", background: t.inkSoft }} />
                  </div>
                </>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {(e.team ?? [e.ownerId]).map((pid, i) => {
                const p = data.people.find((pp) => pp.id === pid);
                if (!p) return null;
                return (
                  <div key={pid} style={{ marginLeft: i ? -8 : 0 }}>
                    <Avatar t={t} person={p} size={32} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataRoom({ t }: { t: Theme }) {
  const files = [
    { name: "Board Deck — Q1 '26.pdf", kind: "PDF", size: "4.2 MB", by: "SC", when: "4d ago" },
    { name: "Financial Model v8.xlsx", kind: "XLSX", size: "820 KB", by: "OR", when: "1w ago" },
    { name: "Pricing Study.pptx", kind: "PPTX", size: "12 MB", by: "MS", when: "2w ago" },
    { name: "Customer References.docx", kind: "DOC", size: "140 KB", by: "SC", when: "3w ago" },
    { name: "SOC 2 Evidence.zip", kind: "ZIP", size: "28 MB", by: "ER", when: "1mo ago" },
  ];
  return (
    <div style={{ background: t.panel, border: `1px solid ${t.rule}` }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "40px 2fr 100px 100px 100px 80px",
          padding: "12px 20px",
          borderBottom: `1px solid ${t.rule}`,
          fontFamily: t.sans,
          fontSize: 11,
          color: t.muted,
          fontWeight: 500,
        }}
      >
        <div />
        <div>File</div>
        <div>Kind</div>
        <div>Size</div>
        <div>By</div>
        <div style={{ textAlign: "right" }}>When</div>
      </div>
      {files.map((f, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "40px 2fr 100px 100px 100px 80px",
            padding: "14px 20px",
            borderBottom: i === files.length - 1 ? "none" : `1px solid ${t.ruleSoft}`,
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <div style={{ color: t.muted }}>{G.doc}</div>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "-0.005em",
            }}
          >
            {f.name}
          </div>
          <div>
            <Chip t={t} tone="ghost">
              {f.kind}
            </Chip>
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.inkSoft }}>{f.size}</div>
          <div style={{ fontFamily: t.sans, fontSize: 12, color: t.inkSoft }}>{f.by}</div>
          <div style={{ textAlign: "right", fontFamily: t.sans, fontSize: 12, color: t.muted }}>
            {f.when}
          </div>
        </div>
      ))}
    </div>
  );
}
