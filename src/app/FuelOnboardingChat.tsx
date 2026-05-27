import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | "email" | "york-checking" | "company-name" | "team-size"
  | "crunchbase-fetching" | "crunchbase-confirm" | "benchmark"
  | "fuel-value" | "york-services" | "york-link"
  | "integrations-intro" | "integrations-select"
  | "platform-overview" | "done";

interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  chips?: { label: string; value: string; icon?: string }[];
  cardType?: "crunchbase" | "benchmark" | "value-prop" | "york-services" | "why-integrate" | "york-cta" | "integration-select" | "complete";
  disabled?: boolean;
}

interface UserData {
  email: string;
  isYorkClient: boolean;
  companyName: string;
  teamSize: string;
  crunchbaseData: CrunchbaseData | null;
  selectedIntegrations: string[];
}

interface CrunchbaseData {
  name: string;
  description: string;
  stage: string;
  employees: string;
  founded: string;
  location: string;
  totalFunding: string;
  category: string;
  website: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const YORK_DOMAINS = ["patriotpay.com", "yorkiegrowth.io", "nexusai.io", "yorkportfolio.com"];

function checkIsYorkClient(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return YORK_DOMAINS.some(d => domain.includes(d.replace(".com", "").replace(".io", "")));
}

function mockCrunchbase(name: string): CrunchbaseData {
  return {
    name,
    description: `${name} is a B2B SaaS company building modern payment infrastructure for growing SMBs and mid-market operators.`,
    stage: "Seed / Series A",
    employees: "11–50",
    founded: "2021",
    location: "Boston, MA",
    totalFunding: "$4.2M",
    category: "FinTech · Payments Infrastructure",
    website: name.toLowerCase().replace(/\s+/g, "") + ".com",
  };
}

const TEAM_SIZES = ["1–5", "6–15", "16–50", "51–200", "200+"];

const INTEGRATIONS = [
  { id: "jira",       name: "Jira",             category: "Development", abbr: "JR", color: "#2684FF" },
  { id: "linear",     name: "Linear",           category: "Development", abbr: "LN", color: "#5E6AD2" },
  { id: "launchpad",  name: "Launchpad",        category: "Development", abbr: "LP", color: "#3DD68C", york: true },
  { id: "pulse",      name: "Pulse",            category: "Development", abbr: "PL", color: "#3DD68C", york: true },
  { id: "ga4",        name: "Google Analytics", category: "Marketing",   abbr: "GA", color: "#F9AB00" },
  { id: "gads",       name: "Google Ads",       category: "Marketing",   abbr: "Gd", color: "#4285F4" },
  { id: "semrush",    name: "Semrush",          category: "Marketing",   abbr: "SR", color: "#FF642D" },
  { id: "linkedin",   name: "LinkedIn",         category: "Marketing",   abbr: "in", color: "#0A66C2" },
  { id: "meta",       name: "Meta Ads",         category: "Marketing",   abbr: "Fb", color: "#1877F2" },
  { id: "hubspot",    name: "HubSpot",          category: "RevOps",      abbr: "HS", color: "#FF7A59" },
  { id: "salesforce", name: "Salesforce",       category: "RevOps",      abbr: "SF", color: "#00A1E0" },
  { id: "quickbooks", name: "QuickBooks",       category: "FinOps",      abbr: "QB", color: "#2CA01C" },
  { id: "stripe",     name: "Stripe",           category: "FinOps",      abbr: "St", color: "#635BFF" },
];

const PROGRESS_ITEMS = [
  { id: "profile",      label: "Your company profile",       step: "crunchbase-confirm" },
  { id: "benchmarks",   label: "Your growth benchmarks",     step: "benchmark" },
  { id: "tracks",       label: "Your Fuel journey tracks",   step: "fuel-value" },
  { id: "integrations", label: "Your integrations",          step: "integrations-select" },
  { id: "config",       label: "Your workspace config",      step: "done" },
];

const STAGE_ORDER: Step[] = [
  "email", "york-checking", "company-name", "team-size",
  "crunchbase-fetching", "crunchbase-confirm", "benchmark",
  "fuel-value", "york-services", "york-link",
  "integrations-intro", "integrations-select",
  "platform-overview", "done",
];

function stepIndex(s: Step) {
  return STAGE_ORDER.indexOf(s);
}

let _seq = 0;
const uid = () => `${Date.now()}-${++_seq}-${Math.random().toString(36).slice(2)}`;

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#3DD68C",
            animation: `fuelDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            display: "block",
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: "#556878" }}>Fuel AI is thinking...</span>
    </div>
  );
}

function AIAvatar() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 800, color: "#0a1a12",
    }}>F</div>
  );
}

interface FundingRound {
  id: string;
  type: string;
  amount: string;
  date: string;
  investors: string;
}

const ROUND_TYPES = ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Bridge", "Grant", "Angel", "Convertible Note"];

function inputStyle(focused?: boolean): React.CSSProperties {
  return {
    width: "100%", boxSizing: "border-box",
    background: "#132130", border: `1px solid ${focused ? "rgba(61,214,140,0.35)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 6, padding: "7px 10px",
    fontSize: 12, color: "#F2F5F2", outline: "none",
    transition: "border-color 0.15s",
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: "#556878", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>
      {children}
    </div>
  );
}

function CrunchbaseCard({ data, onConfirm }: { data: CrunchbaseData; onConfirm: (v: string) => void }) {
  const [mode, setMode] = React.useState<"view" | "edit">("view");
  const [confirmed, setConfirmed] = React.useState(false);
  const [fields, setFields] = React.useState({
    name: data.name,
    description: data.description,
    stage: data.stage,
    employees: data.employees,
    founded: data.founded,
    location: data.location,
    category: data.category,
    website: data.website,
  });
  const [rounds, setRounds] = React.useState<FundingRound[]>([
    { id: uid(), type: "Seed", amount: data.totalFunding, date: "", investors: "" },
  ]);

  const setField = (k: keyof typeof fields, v: string) => setFields(f => ({ ...f, [k]: v }));

  const addRound = () => setRounds(r => [...r, { id: uid(), type: "Seed", amount: "", date: "", investors: "" }]);
  const deleteRound = (id: string) => setRounds(r => r.filter(x => x.id !== id));
  const updateRound = (id: string, k: keyof FundingRound, v: string) =>
    setRounds(r => r.map(x => x.id === id ? { ...x, [k]: v } : x));

  const totalFundingDisplay = rounds.length === 0
    ? "—"
    : rounds.map(r => r.amount).filter(Boolean).join(" + ") || "—";

  // ── View mode ──
  if (mode === "view") {
    const displayFields = [
      { label: "Description", value: fields.description, full: true },
      { label: "Stage", value: fields.stage },
      { label: "Team size", value: fields.employees },
      { label: "Founded", value: fields.founded },
      { label: "Location", value: fields.location },
      { label: "Total funding", value: totalFundingDisplay },
    ];
    return (
      <div style={{
        background: "#1F3140", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12, overflow: "hidden", marginTop: 4,
      }}>
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #1a3d2f 0%, #132130 100%)",
            border: "1px solid rgba(61,214,140,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#3DD68C",
          }}>{fields.name.charAt(0)}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#F2F5F2" }}>{fields.name}</div>
            <div style={{ fontSize: 11, color: "#3DD68C", marginTop: 1 }}>{fields.category}</div>
          </div>
          <div style={{
            marginLeft: "auto", fontSize: 10, background: "rgba(61,214,140,0.1)",
            color: "#3DD68C", border: "1px solid rgba(61,214,140,0.2)",
            borderRadius: 4, padding: "2px 7px", fontWeight: 600,
          }}>Crunchbase</div>
        </div>
        <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
          {displayFields.map(({ label, value, full }) => (
            <div key={label} style={full ? { gridColumn: "1 / -1" } : {}}>
              <div style={{ fontSize: 10, color: "#556878", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, color: "#8FA99A", lineHeight: 1.4 }}>{value}</div>
            </div>
          ))}
        </div>
        {rounds.length > 0 && (
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ fontSize: 10, color: "#556878", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Funding rounds</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rounds.map(r => (
                <div key={r.id} style={{
                  display: "flex", gap: 8, alignItems: "center",
                  background: "#172632", border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 7, padding: "7px 10px",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8B76D4", minWidth: 70 }}>{r.type}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#3DD68C", minWidth: 60 }}>{r.amount || "—"}</span>
                  {r.date && <span style={{ fontSize: 11, color: "#556878" }}>{r.date}</span>}
                  {r.investors && (
                    <span style={{ fontSize: 11, color: "#8FA99A", marginLeft: "auto", textAlign: "right" }}>
                      {r.investors}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {!confirmed && (
          <div style={{ padding: "0 16px 14px", display: "flex", gap: 8 }}>
            <button onClick={() => { setConfirmed(true); onConfirm("confirm"); }} style={{
              background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
              color: "#0a1a12", border: "none", borderRadius: 7,
              padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>Yes, looks good</button>
            <button onClick={() => setMode("edit")} style={{
              background: "transparent", color: "#8FA99A",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
              padding: "8px 14px", fontSize: 12, cursor: "pointer",
            }}>Update details</button>
          </div>
        )}
      </div>
    );
  }

  // ── Edit mode ──
  return (
    <div style={{
      background: "#1F3140", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F2F5F2" }}>Update company details</div>
        <div style={{
          marginLeft: "auto", fontSize: 10, background: "rgba(139,118,212,0.12)",
          color: "#8B76D4", border: "1px solid rgba(139,118,212,0.2)",
          borderRadius: 4, padding: "2px 7px", fontWeight: 600,
        }}>Editing</div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <FieldLabel>Company name</FieldLabel>
            <input value={fields.name} onChange={e => setField("name", e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <input value={fields.category} onChange={e => setField("category", e.target.value)} style={inputStyle()} />
          </div>
        </div>

        {/* Description */}
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={fields.description}
            onChange={e => setField("description", e.target.value)}
            rows={2}
            style={{ ...inputStyle(), resize: "vertical" }}
          />
        </div>

        {/* Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <FieldLabel>Stage</FieldLabel>
            <select value={fields.stage} onChange={e => setField("stage", e.target.value)} style={inputStyle()}>
              {["Pre-seed", "Seed", "Seed / Series A", "Series A", "Series B", "Series C", "Growth"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Team size</FieldLabel>
            <select value={fields.employees} onChange={e => setField("employees", e.target.value)} style={inputStyle()}>
              {["1–5", "6–10", "11–50", "51–100", "101–250", "250+"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Founded</FieldLabel>
            <input value={fields.founded} onChange={e => setField("founded", e.target.value)} style={inputStyle()} placeholder="e.g. 2021" />
          </div>
        </div>

        {/* Row 3 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <FieldLabel>Location</FieldLabel>
            <input value={fields.location} onChange={e => setField("location", e.target.value)} style={inputStyle()} placeholder="City, State" />
          </div>
          <div>
            <FieldLabel>Website</FieldLabel>
            <input value={fields.website} onChange={e => setField("website", e.target.value)} style={inputStyle()} placeholder="company.com" />
          </div>
        </div>

        {/* Funding rounds */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <FieldLabel>Funding rounds</FieldLabel>
            <button onClick={addRound} style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "rgba(61,214,140,0.08)", color: "#3DD68C",
              border: "1px solid rgba(61,214,140,0.2)", borderRadius: 6,
              padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>+ Add round</button>
          </div>

          {rounds.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "16px",
              background: "#172632", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 8,
              fontSize: 12, color: "#3A4F5E",
            }}>No rounds added yet — click "Add round" to start</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden" }}>
              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "120px 90px 80px 1fr 32px",
                gap: 0, background: "#172632",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                padding: "6px 10px",
              }}>
                {["Round", "Amount", "Date", "Investors", ""].map(h => (
                  <div key={h} style={{ fontSize: 9.5, fontWeight: 700, color: "#3A4F5E", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {rounds.map((r, i) => (
                <div key={r.id} style={{
                  display: "grid", gridTemplateColumns: "120px 90px 80px 1fr 32px",
                  gap: 6, alignItems: "center",
                  background: i % 2 === 0 ? "#172632" : "#132130",
                  borderBottom: i < rounds.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  padding: "6px 10px",
                }}>
                  <select
                    value={r.type}
                    onChange={e => updateRound(r.id, "type", e.target.value)}
                    style={{ ...inputStyle(), padding: "5px 7px", fontSize: 11 }}
                  >
                    {ROUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    value={r.amount}
                    onChange={e => updateRound(r.id, "amount", e.target.value)}
                    placeholder="$1.2M"
                    style={{ ...inputStyle(), padding: "5px 7px", fontSize: 11 }}
                  />
                  <input
                    value={r.date}
                    onChange={e => updateRound(r.id, "date", e.target.value)}
                    placeholder="Q1 2023"
                    style={{ ...inputStyle(), padding: "5px 7px", fontSize: 11 }}
                  />
                  <input
                    value={r.investors}
                    onChange={e => updateRound(r.id, "investors", e.target.value)}
                    placeholder="York IE, Accel, Sequoia..."
                    style={{ ...inputStyle(), padding: "5px 7px", fontSize: 11 }}
                  />
                  <button
                    onClick={() => deleteRound(r.id)}
                    style={{
                      width: 24, height: 24, borderRadius: 4, flexShrink: 0,
                      background: "rgba(201,95,95,0.1)", color: "#C95F5F",
                      border: "1px solid rgba(201,95,95,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, cursor: "pointer", lineHeight: 1,
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", gap: 8,
      }}>
        <button onClick={() => setMode("view")} style={{
          background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
          color: "#0a1a12", border: "none", borderRadius: 7,
          padding: "8px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Save & review</button>
        <button onClick={() => setMode("view")} style={{
          background: "transparent", color: "#556878",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7,
          padding: "8px 14px", fontSize: 12, cursor: "pointer",
        }}>Cancel</button>
      </div>
    </div>
  );
}

interface BenchmarkMetric {
  label: string;
  desc: string;
  p25: string;
  p50: string;
  p75: string;
  p90: string;
  accent?: boolean;
}

function BenchmarkMetricCard({ m }: { m: BenchmarkMetric }) {
  const cols = [
    { label: "P25", value: m.p25 },
    { label: "P50", value: m.p50 },
    { label: "P75", value: m.p75 },
    { label: "P90", value: m.p90, highlight: true },
  ];
  return (
    <div style={{
      background: "#172632", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8, padding: "11px 13px",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#D0DDD8", marginBottom: 2 }}>{m.label}</div>
      <div style={{ fontSize: 10.5, color: "#556878", marginBottom: 10, lineHeight: 1.3 }}>{m.desc}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
        {cols.map(c => (
          <div key={c.label}>
            <div style={{ fontSize: 9.5, color: "#3A4F5E", fontWeight: 600, marginBottom: 3 }}>{c.label}</div>
            <div style={{
              fontSize: 12.5, fontWeight: 700,
              color: c.highlight ? "#3DD68C" : "#8FA99A",
            }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenchmarkCard({ stage, onContinue }: { stage: string; onContinue: () => void }) {
  const [continued, setContinued] = React.useState(false);
  const metrics: BenchmarkMetric[] = [
    { label: "ARR",                  desc: "Annual recurring revenue (USD).",          p25: "$150K",  p50: "$500K",  p75: "$1.2M",  p90: "$2.5M" },
    { label: "Headcount (FTE)",      desc: "Total full-time employees.",               p25: "6",      p50: "12",     p75: "22",     p90: "40" },
    { label: "ARR growth (YoY)",     desc: "Year-over-year ARR growth rate.",          p25: "120%",   p50: "200%",   p75: "350%",   p90: "600%" },
    { label: "CAC payback",          desc: "Months to recover customer acquisition cost.", p25: "10mo", p50: "16mo", p75: "26mo",   p90: "42mo" },
    { label: "Gross margin",         desc: "Revenue minus COGS, as % of revenue.",    p25: "55%",    p50: "72%",    p75: "82%",    p90: "88%" },
    { label: "Net revenue retention",desc: "NRR from existing customers 12-mo prior.", p25: "95%",   p50: "108%",   p75: "125%",   p90: "145%" },
    { label: "Monthly burn",         desc: "Net cash burn per month. Compare within stage.", p25: "$40K", p50: "$80K", p75: "$160K", p90: "$300K" },
    { label: "Rule of 40",           desc: "ARR growth % + FCF margin %. 40%+ is healthy.", p25: "N/A", p50: "N/A",  p75: "N/A",   p90: "N/A", accent: true },
  ];

  const cohortPills = [
    { label: "B2B SaaS", color: "#2BB8A0" },
    { label: stage.split("/")[0].trim(), color: "#8B76D4" },
    { label: "US", color: "#556878" },
  ];

  return (
    <div style={{
      background: "#1F3140", border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F2F5F2", marginRight: 4 }}>Your benchmark cohort</div>
        {cohortPills.map(p => (
          <span key={p.label} style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px",
            borderRadius: 4, background: p.color + "22", color: p.color,
            border: `1px solid ${p.color}44`,
          }}>{p.label}</span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#3A4F5E" }}>
          Percentile distributions · Seed · FinTech
        </span>
      </div>

      {/* Cohort description */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
        fontSize: 12, color: "#8FA99A", lineHeight: 1.7,
      }}>
        Your cohort is <strong style={{ color: "#D0DDD8" }}>B2B SaaS · {stage} · United States</strong> — early-revenue software companies selling to SMB and mid-market buyers, typically 12–36 months into their growth motion. Distributions are drawn from the York IE portfolio and aggregated market data. The spread from P25 to P90 reflects the gap that <strong style={{ color: "#D0DDD8" }}>operating discipline and signal clarity</strong> create over time.
      </div>

      {/* Percentile legend */}
      <div style={{
        padding: "7px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex", gap: 16, alignItems: "center",
      }}>
        {["P25", "P50", "P75"].map(p => (
          <span key={p} style={{ fontSize: 10, color: "#3A4F5E" }}>
            <span style={{ color: "#8FA99A", fontWeight: 600 }}>{p}</span> percentile
          </span>
        ))}
        <span style={{ fontSize: 10, color: "#3A4F5E" }}>
          <span style={{ color: "#3DD68C", fontWeight: 700 }}>P90</span> top performers
        </span>
      </div>

      {/* Metric grid */}
      <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {metrics.filter(m => !m.accent).map(m => (
          <BenchmarkMetricCard key={m.label} m={m} />
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{
          background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.12)",
          borderRadius: 8, padding: "10px 12px",
          fontSize: 12, color: "#8FA99A", lineHeight: 1.6,
        }}>
          💡 <strong style={{ color: "#F2F5F2" }}>The companies hitting P90 aren't exceptional by luck.</strong>{" "}
          They act on signals faster, run tighter playbooks, and know their numbers cold — because they have a system. Fuel is that system.
        </div>
        {!continued && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => { setContinued(true); onContinue(); }} style={{
              background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
              color: "#0a1a12", border: "none", borderRadius: 7,
              padding: "9px 20px", fontSize: 12, fontWeight: 800, cursor: "pointer",
              letterSpacing: "0.1px",
            }}>Show me how Fuel gets me to P90 →</button>
            <span style={{ fontSize: 10.5, color: "#3A4F5E" }}>York portfolio · Bright Data · synthetic cohort</span>
          </div>
        )}
      </div>
    </div>
  );
}

function YorkServicesCard({ onChoice }: { onChoice: (v: "york-yes" | "york-skip") => void }) {
  const [chosen, setChosen] = React.useState(false);
  const tracks = [
    {
      label: "Development",
      color: "#3DD68C",
      icon: "⚙️",
      tracked: ["Product roadmap & delivery health", "Code quality & release readiness", "Design approval status"],
      helps: "Senior engineers and product leads embedded in your team — shipping faster, quality intact.",
    },
    {
      label: "Marketing",
      color: "#2BB8A0",
      icon: "📣",
      tracked: ["Traffic, demand & channel mix", "SEO, paid, social performance", "Conversion funnel signals"],
      helps: "GTM strategy to execution — demand gen, brand, content, and pipeline-ready marketing.",
    },
    {
      label: "RevOps",
      color: "#D4924A",
      icon: "💼",
      tracked: ["Pipeline health & CRM hygiene", "Lead-to-opportunity conversion", "Sales process & forecast signals"],
      helps: "Clean pipeline, measurable revenue motion, and a sales process that scales without heroics.",
    },
    {
      label: "FinOps",
      color: "#8B76D4",
      icon: "📊",
      tracked: ["Runway, burn & cash position", "Budget vs. actuals & forecast", "Board & fundraising readiness"],
      helps: "From monthly close to board-ready reporting — finance as a strategic lever, not a chore.",
    },
  ];

  return (
    <div style={{
      background: "#1F3140", border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F2F5F2" }}>York IE — embedded growth partner</div>
        <div style={{ fontSize: 12, color: "#8FA99A", marginTop: 4, lineHeight: 1.55 }}>
          York IE provides senior practitioners — not consultants — across the same four tracks Fuel monitors. They work inside your team to move the numbers Fuel is tracking.
        </div>
      </div>

      <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {tracks.map(t => (
          <div key={t.label} style={{
            background: "#172632", border: `1px solid ${t.color}22`,
            borderRadius: 9, padding: "12px 13px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.color }}>{t.label}</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#3A4F5E", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5 }}>Fuel tracks</div>
              {t.tracked.map(item => (
                <div key={item} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
                  <span style={{ color: t.color, fontSize: 10, marginTop: 1, flexShrink: 0 }}>·</span>
                  <span style={{ fontSize: 11, color: "#8FA99A", lineHeight: 1.4 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{
              borderTop: `1px solid ${t.color}18`, paddingTop: 8,
              fontSize: 11, color: "#D0DDD8", lineHeight: 1.45, fontStyle: "italic",
            }}>{t.helps}</div>
          </div>
        ))}
      </div>

      {!chosen && (
        <div style={{ padding: "4px 16px 14px", display: "flex", gap: 8 }}>
          <button onClick={() => { setChosen(true); onChoice("york-yes"); }} style={{
            background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
            color: "#0a1a12", border: "none", borderRadius: 7,
            padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>I want York IE on my team →</button>
          <button onClick={() => { setChosen(true); onChoice("york-skip"); }} style={{
            background: "transparent", color: "#8FA99A",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
            padding: "8px 14px", fontSize: 12, cursor: "pointer",
          }}>I'll focus on integrations for now</button>
        </div>
      )}
    </div>
  );
}

function ValuePropCard({ onContinue }: { onContinue: () => void }) {
  const [clicked, setClicked] = React.useState(false);
  const props = [
    { icon: "⚡", title: "Real-time Signals",        desc: "Surface what's moving across product, GTM, revenue, and finance — pulled from your integrations, market data, and a live context feed of articles, podcasts, and funding events streaming in from Fuel Data." },
    { icon: "📋", title: "Playbooks & Initiatives", desc: "Curated operating plays mapped to your stage. Know exactly what to do next — and track every initiative in one place." },
    { icon: "🔭", title: "Competitive Intelligence", desc: "Track competitors, identify whitespace, and stay ahead using Fuel's market data and signal layer." },
    { icon: "🤖", title: "Fuel AI",                  desc: "Research any company, dig into your startup infrastructure, generate summaries, and surface opportunities — all powered by Fuel AI built directly into your operating workflow." },
    { icon: "📊", title: "One Operating Command Center", desc: "Dev · Marketing · RevOps · FinOps — all in a single, unified view." },
  ];
  return (
    <div style={{
      background: "#1F3140", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F2F5F2" }}>How Fuel accelerates your journey</div>
      </div>
      <div style={{ padding: "10px 16px 4px", display: "flex", flexDirection: "column", gap: 8 }}>
        {props.map(p => (
          <div key={p.title} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{p.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F2F5F2", marginBottom: 2 }}>{p.title}</div>
              <div style={{ fontSize: 11.5, color: "#8FA99A", lineHeight: 1.5 }}>{p.desc}</div>
            </div>
          </div>
        ))}
      </div>
      {!clicked && (
        <div style={{ padding: "10px 16px 14px" }}>
          <button onClick={() => { setClicked(true); onContinue(); }} style={{
            background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
            color: "#0a1a12", border: "none", borderRadius: 7,
            padding: "9px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>This is exactly what we need →</button>
        </div>
      )}
    </div>
  );
}

function WhyIntegrateCard({ onContinue }: { onContinue: () => void }) {
  const [dismissed, setDismissed] = React.useState(false);
  const reasons = [
    { icon: "📡", title: "Signals need a source",        desc: "Without integrations, Fuel has no inputs — you're watching an empty dashboard." },
    { icon: "🎯", title: "Playbooks need context",       desc: "Fuel maps initiatives to what's actually moving in your data, not assumptions." },
    { icon: "⏱️", title: "Every week of lag compounds",  desc: "Most teams discover problems 4–6 weeks late. Integrations close that gap to hours." },
    { icon: "🏆", title: "P90 companies are instrumented", desc: "Better instincts don't explain the benchmark gap — better data does." },
  ];
  const categories = [
    { label: "Development", color: "#3DD68C", integrations: ["Jira", "Linear", "Launchpad", "Pulse"] },
    { label: "Marketing",   color: "#2BB8A0", integrations: ["Google Analytics", "Google Ads", "Semrush", "LinkedIn", "Meta"] },
    { label: "RevOps",      color: "#D4924A", integrations: ["HubSpot", "Salesforce"] },
    { label: "FinOps",      color: "#8B76D4", integrations: ["QuickBooks", "Stripe"] },
  ];
  return (
    <div style={{
      background: "#1F3140", border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F2F5F2" }}>Why add integrations?</div>
        <div style={{ fontSize: 12, color: "#8FA99A", marginTop: 3 }}>Your integrations are what power everything in Fuel.</div>
      </div>

      {/* Reasons — compact 2-col */}
      <div style={{ padding: "12px 16px 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {reasons.map(r => (
          <div key={r.title} style={{
            display: "flex", gap: 9, alignItems: "flex-start",
            background: "#172632", border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 8, padding: "9px 11px",
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{r.icon}</span>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#F2F5F2", marginBottom: 2 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: "#8FA99A", lineHeight: 1.45 }}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Available integrations by track */}
      <div style={{ padding: "8px 16px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#3A4F5E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Available integrations</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {categories.map(cat => (
            <div key={cat.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: cat.color, minWidth: 82,
                background: cat.color + "18", borderRadius: 4, padding: "2px 7px",
                border: `1px solid ${cat.color}30`, textAlign: "center",
              }}>{cat.label}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {cat.integrations.map(name => (
                  <span key={name} style={{
                    fontSize: 11, color: "#8FA99A",
                    background: "#172632", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 5, padding: "2px 8px",
                  }}>{name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!dismissed && (
        <div style={{ padding: "4px 16px 14px" }}>
          <button onClick={() => { setDismissed(true); onContinue(); }} style={{
            background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
            color: "#0a1a12", border: "none", borderRadius: 7,
            padding: "9px 20px", fontSize: 12, fontWeight: 800, cursor: "pointer",
          }}>Set up my integrations →</button>
        </div>
      )}
    </div>
  );
}

function IntegrationSelector({
  selected, onToggle, onDone,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  onDone: () => void;
}) {
  const categories = ["Development", "Marketing", "RevOps", "FinOps"];
  return (
    <div style={{
      background: "#1F3140", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F2F5F2" }}>Set up your integrations</div>
        <div style={{ fontSize: 11.5, color: "#8FA99A", marginTop: 3 }}>Select the integrations you want active. You can add more anytime from the Fuel Store.</div>
      </div>
      {categories.map(cat => {
        const items = INTEGRATIONS.filter(i => i.category === cat);
        return (
          <div key={cat} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#556878", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{cat}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {items.map(item => {
                const isSelected = selected.includes(item.id);
                return (
                  <button key={item.id} onClick={() => onToggle(item.id)} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: isSelected ? "rgba(61,214,140,0.1)" : "#172632",
                    border: isSelected ? "1px solid rgba(61,214,140,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 7, padding: "6px 10px",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      background: item.color + "22",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800, color: item.color,
                    }}>{item.abbr}</span>
                    <span style={{ fontSize: 11.5, color: isSelected ? "#3DD68C" : "#8FA99A", fontWeight: isSelected ? 600 : 400 }}>{item.name}</span>
                    {"york" in item && item.york && (
                      <span style={{ fontSize: 9, color: "#3DD68C", background: "rgba(61,214,140,0.1)", borderRadius: 3, padding: "1px 4px", fontWeight: 700 }}>York</span>
                    )}
                    {isSelected && <span style={{ fontSize: 12, color: "#3DD68C" }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ padding: "12px 16px", display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={onDone} style={{
          background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
          color: "#0a1a12", border: "none", borderRadius: 7,
          padding: "9px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>
          {selected.length > 0 ? `Connect ${selected.length} integration${selected.length > 1 ? "s" : ""}` : "Skip for now"}
        </button>
        {selected.length === 0 && (
          <span style={{ fontSize: 11, color: "#3A4F5E" }}>You can add integrations anytime from the Fuel Store</span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FuelOnboardingChat({ onComplete, onManual }: { onComplete: () => void; onManual: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<Step>("email");
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    email: "", isYorkClient: false, companyName: "",
    teamSize: "", crunchbaseData: null, selectedIntegrations: [],
  });
  const [completedProgress, setCompletedProgress] = useState<Set<string>>(new Set());
  const [pendingIntegrations, setPendingIntegrations] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const greetedRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const pushMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages(prev => [...prev, { ...msg, id: uid() }]);
  }, []);

  const aiSay = useCallback((text: string, opts?: {
    chips?: ChatMessage["chips"];
    cardType?: ChatMessage["cardType"];
    delay?: number;
  }): Promise<void> => {
    return new Promise(resolve => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        pushMessage({ role: "ai", text, chips: opts?.chips, cardType: opts?.cardType });
        resolve();
      }, opts?.delay ?? 900);
    });
  }, [pushMessage]);

  const disableLastChips = useCallback(() => {
    setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, disabled: true, chips: undefined } : m));
  }, []);

  // Kick off with greeting — guarded ref prevents duplicate under StrictMode double-mount
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const t = setTimeout(() => {
      pushMessage({
        role: "ai",
        text: "👋 Hi! I'm Fuel AI, York IE's onboarding assistant.\n\nI'll help set up your Fuel workspace in just a few minutes — so you can see your company's full operating picture from day one.\n\nWhat's your work email address?",
      });
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // ── Step handlers ────────────────────────────────────────────────────────────

  const handleEmailSubmit = useCallback(async (email: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    pushMessage({ role: "user", text: email });
    setStep("york-checking");

    const isYork = checkIsYorkClient(email);
    setUserData(prev => ({ ...prev, email, isYorkClient: isYork }));

    await aiSay("Checking your account...", { delay: 500 });

    if (isYork) {
      await aiSay(
        "✓ Your company is already partnering with York IE — great! Let's connect your Fuel workspace and get your journey properly configured.\n\nWhat's your company name?",
        { delay: 1100 }
      );
    } else {
      await aiSay(
        "Welcome to Fuel! Let's build your workspace from scratch — it takes less than 3 minutes, and you'll leave with a real operating picture of your business.\n\nWhat's your company name?",
        { delay: 1200 }
      );
    }
    setStep("company-name");
    processingRef.current = false;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [aiSay, pushMessage]);

  const handleCompanyNameSubmit = useCallback(async (name: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    pushMessage({ role: "user", text: name });
    setUserData(prev => ({ ...prev, companyName: name }));

    await aiSay(`Nice to meet you, ${name}! How large is your team right now?`, {
      delay: 700,
      chips: TEAM_SIZES.map(s => ({ label: s, value: s })),
    });
    setStep("team-size");
    processingRef.current = false;
  }, [aiSay, pushMessage]);

  const handleTeamSizeSelect = useCallback(async (size: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    disableLastChips();
    pushMessage({ role: "user", text: size });
    setUserData(prev => ({ ...prev, teamSize: size }));

    await aiSay("Perfect. Let me pull your company profile from Crunchbase...", { delay: 500 });
    setStep("crunchbase-fetching");
    setIsTyping(true);

    await new Promise(r => setTimeout(r, 2000));
    setIsTyping(false);

    const cb = mockCrunchbase(userData.companyName);
    setUserData(prev => ({ ...prev, crunchbaseData: cb }));

    await aiSay("Found your profile. Does this look right?", { delay: 300, cardType: "crunchbase" });
    setStep("crunchbase-confirm");
    processingRef.current = false;
  }, [aiSay, disableLastChips, pushMessage, userData.companyName]);

  const handleCrunchbaseConfirm = useCallback(async (val: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    disableLastChips();

    if (val === "confirm") {
      pushMessage({ role: "user", text: "Yes, looks good" });
      setCompletedProgress(prev => new Set([...prev, "profile"]));

      await aiSay(
        `Perfect. Here's the benchmark picture for **${userData.crunchbaseData?.stage ?? "Seed"} · B2B SaaS · US** — the cohort your business maps to.\n\nAcross the York IE portfolio and aggregated market data, there's a consistent pattern: most teams are burning more than they realize, growing slower than they think, and leaving retention leverage on the table. The top quartile isn't smarter — they just have **better visibility into what's moving**.\n\nThe P90 column isn't a ceiling — it's where operating clarity takes you. See where the range sits today, and what Fuel makes possible.`,
        { delay: 900 }
      );
      await aiSay("", { delay: 600, cardType: "benchmark" });
      setStep("benchmark");
    } else {
      pushMessage({ role: "user", text: "I need to update a few details" });
      await aiSay(
        `No problem — we'll work with what we have. Here's the benchmark picture for companies at your stage.\n\nAcross York IE's portfolio and B2B SaaS data, the gap between median and top-quartile performance comes down to one thing: **operating clarity**. The P90 companies aren't raising more — they're seeing more. That's exactly what Fuel is built to give you.`,
        { delay: 900 }
      );
      await aiSay("", { delay: 400, cardType: "benchmark" }
      );
      setStep("benchmark");
      setCompletedProgress(prev => new Set([...prev, "profile"]));
    }
    processingRef.current = false;
  }, [aiSay, disableLastChips, pushMessage]);

  const handleBenchmarkContinue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setCompletedProgress(prev => new Set([...prev, "benchmarks"]));

    await aiSay("Here's exactly how Fuel helps you close the gap and reach the next stage.", {
      delay: 700, cardType: "value-prop"
    });
    setStep("fuel-value");
    processingRef.current = false;
  }, [aiSay]);

  const handleValuePropContinue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setCompletedProgress(prev => new Set([...prev, "tracks"]));

    if (!userData.isYorkClient) {
      await aiSay(
        "Fuel tracks everything — but York IE moves the numbers. Here's how their team works across the same four tracks you just saw.",
        { delay: 900, cardType: "york-services" }
      );
      setStep("york-services");
    } else {
      await aiSay(
        "Since you're already with York IE, let's link your York platform so Fuel can pull in your project updates, resource data, and service context automatically.",
        {
          delay: 900,
          chips: [
            { label: "Link my York account", value: "link" },
            { label: "Skip for now", value: "skip" },
          ],
        }
      );
      setStep("york-link");
    }
    processingRef.current = false;
  }, [aiSay, userData.isYorkClient]);

  const handleYorkServicesResponse = useCallback(async (val: "york-yes" | "york-skip") => {
    if (processingRef.current) return;
    processingRef.current = true;

    if (val === "york-yes") {
      pushMessage({ role: "user", text: "I want York IE on my team →" });
      await aiSay(
        "That's the right call. 🎉\n\nYour York IE Customer Success team will be in touch shortly to walk you through service options and get you matched with the right practitioners.\n\nIn the meantime, your Fuel workspace is ready — you'll have full visibility across Development, Marketing, RevOps, and FinOps from day one.",
        { delay: 900 }
      );
      await aiSay(
        `Welcome to Fuel, ${userData.companyName || "there"}. Let's build something great.`,
        { delay: 1400, cardType: "york-cta" }
      );
      setStep("done");
    } else {
      pushMessage({ role: "user", text: "I'll focus on integrations for now" });
      await aiSay(
        "Understood — York IE is always available from your workspace when you're ready.\n\nBefore we finish, setting up your integrations is the single highest-leverage thing you can do right now. Here's why it matters:",
        { delay: 800 }
      );
      await aiSay(
        "",
        { delay: 600, cardType: "why-integrate" }
      );
      setStep("integrations-select");
    }
    processingRef.current = false;
  }, [aiSay, onComplete, pushMessage, userData.companyName]);

  const handleYorkLinkResponse = useCallback(async (val: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    disableLastChips();

    if (val === "link") {
      pushMessage({ role: "user", text: "Link my York account" });
      await aiSay("✓ York IE platform linked. Your project updates, resource allocation, and service context will now flow into your Fuel journey.", { delay: 900 });
    } else {
      pushMessage({ role: "user", text: "Skip for now" });
      await aiSay("No problem — you can link your York account anytime from workspace settings.", { delay: 600 });
    }
    await aiSay("Let's finish setting up your integrations.", { delay: 800, cardType: "integration-select" });
    setStep("integrations-select");
    processingRef.current = false;
  }, [aiSay, disableLastChips, pushMessage]);

  const handleIntegrationsDone = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    const count = pendingIntegrations.length;
    setUserData(prev => ({ ...prev, selectedIntegrations: pendingIntegrations }));
    setCompletedProgress(prev => new Set([...prev, "integrations"]));

    pushMessage({ role: "user", text: count > 0 ? `Connect ${count} integration${count > 1 ? "s" : ""}` : "Skip for now" });

    if (count > 0) {
      await aiSay(`✓ ${count} integration${count > 1 ? "s" : ""} queued for connection. Your data will start flowing into your journey tracks within minutes.`, { delay: 800 });
    } else {
      await aiSay(
        "No integrations connected yet — that's fine. You can add them anytime from the **Fuel Store**. Tracks without integrations will use form-based input so signals and playbooks still work.",
        { delay: 900 }
      );
    }

    await aiSay(
      `🎉 Your Fuel workspace is ready, ${userData.companyName}!\n\nYou now have a unified operating command center covering:\n\n· **Development** — roadmap, code quality, release health\n· **Marketing** — traffic, campaigns, SEO, demand signals\n· **RevOps** — pipeline, CRM health, revenue motion\n· **FinOps** — runway, burn, forecast, board readiness\n\nFuel AI will surface signals, flag risks, and keep your playbooks current — so you always know exactly where you are and what to do next.`,
      { delay: 1200 }
    );

    await aiSay("Ready to launch your journey?", {
      delay: 800,
      chips: [{ label: "Launch my Fuel journey →", value: "launch" }],
    });
    setCompletedProgress(prev => new Set([...prev, "config"]));
    setStep("platform-overview");
    processingRef.current = false;
  }, [aiSay, pendingIntegrations, pushMessage, userData.companyName]);

  const handleLaunch = useCallback(() => {
    disableLastChips();
    pushMessage({ role: "user", text: "Launch my Fuel journey →" });
    setTimeout(onComplete, 600);
  }, [disableLastChips, onComplete, pushMessage]);

  // ── Input handler ─────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const val = inputValue.trim();
    if (!val || processingRef.current) return;
    setInputValue("");

    if (step === "email") {
      if (!val.includes("@")) return;
      handleEmailSubmit(val);
    } else if (step === "company-name") {
      handleCompanyNameSubmit(val);
    }
  }, [handleCompanyNameSubmit, handleEmailSubmit, inputValue, step]);

  const handleChipClick = useCallback((value: string) => {
    if (processingRef.current) return;
    if (step === "team-size") handleTeamSizeSelect(value);
    else if (step === "crunchbase-confirm") handleCrunchbaseConfirm(value);
    else if (step === "york-services") handleYorkServicesResponse(value as "york-yes" | "york-skip");
    else if (step === "york-link") handleYorkLinkResponse(value);
    else if (step === "platform-overview") handleLaunch();
  }, [handleCrunchbaseConfirm, handleLaunch, handleTeamSizeSelect, handleYorkLinkResponse, handleYorkServicesResponse, step]);

  const inputActive = step === "email" || step === "company-name";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes fuelDot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes fuelFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fuel-msg { animation: fuelFadeUp 0.3s ease both; }
        .fuel-chip-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .fuel-send:hover { opacity: 0.85; }
        .fuel-manual:hover { color: #8FA99A !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(10,20,28,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "stretch", justifyContent: "stretch",
      }}>
      <div style={{
        width: "100vw", height: "100vh", background: "#132130",
        display: "flex", flexDirection: "column",
        fontFamily: "Inter, -apple-system, sans-serif",
      }}>
        {/* Top bar */}
        <div style={{
          height: 52, background: "#1F3140",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center",
          padding: "0 24px", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 900, color: "#0a1a12",
            }}>F</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#F2F5F2" }}>Fuel</span>
            <span style={{ fontSize: 11, color: "#3A4F5E", fontWeight: 500 }}>by York IE</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: "#3DD68C",
              background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.2)",
              borderRadius: 4, padding: "1px 6px", letterSpacing: "0.3px",
            }}>ONBOARDING</span>
          </div>
          <button
            onClick={onManual}
            className="fuel-manual"
            style={{
              background: "none", border: "none", color: "#556878",
              fontSize: 12, cursor: "pointer", transition: "color 0.15s",
            }}
          >
            Set up later →
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", maxHeight: "calc(100vh - 52px)" }}>

          {/* ── Chat panel ── */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            minWidth: 0, background: "#132130",
          }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
              <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>

                {messages.map(msg => (
                  <div key={msg.id} className="fuel-msg" style={{
                    display: "flex",
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                    alignItems: "flex-start", gap: 10,
                  }}>
                    {msg.role === "ai" && <AIAvatar />}

                    <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 6 }}>
                      {msg.text && (
                        <div style={{
                          background: msg.role === "ai" ? "#172632" : "#1F3140",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: msg.role === "ai" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                          padding: "11px 14px",
                          fontSize: 13, color: "#D0DDD8", lineHeight: 1.65,
                          whiteSpace: "pre-line",
                        }}>
                          {msg.text.split("**").map((part, i) =>
                            i % 2 === 0
                              ? <span key={i}>{part}</span>
                              : <strong key={i} style={{ color: "#F2F5F2", fontWeight: 700 }}>{part}</strong>
                          )}
                        </div>
                      )}

                      {/* Cards */}
                      {msg.cardType === "crunchbase" && userData.crunchbaseData && (
                        <CrunchbaseCard
                          data={userData.crunchbaseData}
                          onConfirm={handleCrunchbaseConfirm}
                        />
                      )}
                      {msg.cardType === "benchmark" && (
                        <BenchmarkCard
                          stage={userData.crunchbaseData?.stage ?? "Seed"}
                          onContinue={handleBenchmarkContinue}
                        />
                      )}
                      {msg.cardType === "value-prop" && (
                        <ValuePropCard onContinue={handleValuePropContinue} />
                      )}
                      {msg.cardType === "york-services" && (
                        <YorkServicesCard onChoice={handleYorkServicesResponse} />
                      )}
                      {msg.cardType === "why-integrate" && (
                        <WhyIntegrateCard onContinue={() => {
                          pushMessage({ role: "ai", text: "", id: uid(), cardType: "integration-select" });
                        }} />
                      )}
                      {msg.cardType === "york-cta" && (() => {
                        const LaunchCard = () => {
                          const [launched, setLaunched] = React.useState(false);
                          return (
                            <div style={{
                              background: "linear-gradient(135deg, rgba(0,180,138,0.08) 0%, rgba(236,214,127,0.06) 100%)",
                              border: "1px solid rgba(61,214,140,0.2)", borderRadius: 10,
                              padding: "18px 16px", marginTop: 4, textAlign: "center",
                            }}>
                              <div style={{ fontSize: 24, marginBottom: 8 }}>🚀</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#F2F5F2", marginBottom: 6 }}>Your Fuel workspace is ready</div>
                              <div style={{ fontSize: 12, color: "#8FA99A", lineHeight: 1.65, marginBottom: 14 }}>
                                York IE will be in touch shortly to match you with the right team.<br />Your journey dashboard is set up and waiting.
                              </div>
                              {!launched && (
                                <button onClick={() => { setLaunched(true); onComplete(); }} style={{
                                  background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
                                  color: "#0a1a12", border: "none", borderRadius: 8,
                                  padding: "10px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                                  letterSpacing: "0.1px",
                                }}>Let the journey begin →</button>
                              )}
                            </div>
                          );
                        };
                        return <LaunchCard />;
                      })()}
                      {msg.cardType === "integration-select" && (
                        <IntegrationSelector
                          selected={pendingIntegrations}
                          onToggle={id => setPendingIntegrations(prev =>
                            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                          )}
                          onDone={handleIntegrationsDone}
                        />
                      )}

                      {/* Chips */}
                      {msg.chips && !msg.disabled && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 2 }}>
                          {msg.chips.map(chip => (
                            <button
                              key={chip.value}
                              className="fuel-chip-btn"
                              onClick={() => handleChipClick(chip.value)}
                              style={{
                                background: "#172632",
                                border: "1px solid rgba(61,214,140,0.25)",
                                color: "#3DD68C", borderRadius: 20,
                                padding: "6px 14px", fontSize: 12, fontWeight: 600,
                                cursor: "pointer", transition: "all 0.15s",
                              }}
                            >{chip.label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="fuel-msg" style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <AIAvatar />
                    <div style={{
                      background: "#172632", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "4px 12px 12px 12px",
                    }}>
                      <TypingDots />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div style={{
              borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "#172632", padding: "14px 24px",
              display: "flex", gap: 10, alignItems: "center",
            }}>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                disabled={!inputActive}
                placeholder={
                  step === "email" ? "Enter your work email..."
                  : step === "company-name" ? "Enter your company name..."
                  : "Use the options above to continue..."
                }
                style={{
                  flex: 1, background: "#1F3140",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, padding: "10px 14px",
                  fontSize: 13, color: "#F2F5F2",
                  outline: "none", transition: "border-color 0.15s",
                  opacity: inputActive ? 1 : 0.4,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputActive || !inputValue.trim()}
                className="fuel-send"
                style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: inputActive && inputValue.trim()
                    ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)"
                    : "rgba(255,255,255,0.06)",
                  border: "none", cursor: inputActive ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                  fontSize: 15,
                  color: inputActive && inputValue.trim() ? "#0a1a12" : "#3A4F5E",
                }}
              >→</button>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div style={{
            width: 280, flexShrink: 0,
            background: "#1F3140",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            padding: "28px 20px",
            overflowY: "auto",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#556878", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>
              What&apos;s getting set up
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PROGRESS_ITEMS.map(item => {
                const done = completedProgress.has(item.id);
                const current = !done && stepIndex(step) >= stepIndex(item.step as Step);
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: done ? "rgba(61,214,140,0.15)" : "rgba(255,255,255,0.04)",
                      border: done ? "1px solid rgba(61,214,140,0.4)" : current ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10,
                      transition: "all 0.3s",
                    }}>
                      {done ? <span style={{ color: "#3DD68C" }}>✓</span> : <span style={{ color: "#3A4F5E" }}>○</span>}
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: done ? "#3DD68C" : current ? "#8FA99A" : "#3A4F5E",
                      fontWeight: done ? 600 : 400,
                      transition: "color 0.3s",
                    }}>{item.label}</span>
                  </div>
                );
              })}
            </div>

            {/* York IE callout */}
            <div style={{
              marginTop: 32, background: "#172632",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10, padding: "14px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#F2F5F2", marginBottom: 6 }}>York IE Value Creation Engine</div>
              {["Foundation", "Acceleration", "Scale", "Optimization"].map((stage, i) => {
                const stageReached = completedProgress.has("benchmarks");
                return (
                  <div key={stage} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "5px 0",
                    borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: stageReached && i === 0 ? "#3DD68C" : "rgba(255,255,255,0.1)",
                    }} />
                    <span style={{
                      fontSize: 11, color: stageReached && i === 0 ? "#8FA99A" : "#3A4F5E",
                    }}>Stage {i + 1}: {stage}</span>
                  </div>
                );
              })}
            </div>

            {/* Fuel store hint */}
            <div style={{
              marginTop: 16, background: "rgba(61,214,140,0.05)",
              border: "1px solid rgba(61,214,140,0.12)",
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#3DD68C", marginBottom: 4 }}>⚡ Fuel Store</div>
              <div style={{ fontSize: 11, color: "#556878", lineHeight: 1.5 }}>
                Add integrations and premium connectors anytime from the Fuel Store in your workspace.
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
