import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | "company-confirm" | "company-name"
  | "profile-description" | "profile-more-details" | "business-model" | "domain-claim"
  | "crunchbase-fetching" | "crunchbase-missing" | "crunchbase-url" | "crunchbase-confirm" | "benchmark"
  | "fuel-value" | "york-services" | "york-link"
  | "integrations-intro" | "integrations-select"
  | "platform-overview" | "done";

interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  chips?: { label: string; value: string; icon?: string }[];
  cardType?: "crunchbase" | "profile-form" | "business-model" | "benchmark" | "value-prop" | "york-services" | "york-projects" | "why-integrate" | "york-cta" | "integration-select" | "complete";
  cardMode?: "view" | "edit";
  cardLabel?: string;
  disabled?: boolean;
}

interface UserData {
  email: string;
  isYorkClient: boolean;
  companyName: string;
  crunchbaseData: CrunchbaseData | null;
  businessModel: string;
  profileNotes: string;
  verifiedDomain: string;
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

interface ProfileFormResult {
  companyName: string;
  description: string;
  businessModel: string;
  industry: string;
  founded: string;
  city: string;
  region: string;
  country: string;
  website: string;
  linkedin: string;
  fundingRounds: FundingRound[];
  notes: string;
  domain: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const YORK_DOMAINS = ["patriotpay.com", "yorkiegrowth.io", "nexusai.io", "yorkportfolio.com"];
const LOGGED_IN_EMAIL = "matt@patriotpay.com";
const PERSONAL_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"];
const DOMAIN_COMPANY_OVERRIDES: Record<string, string> = {
  patriotpay: "Patriot Pay",
  yorkiegrowth: "York IE Growth",
  nexusai: "Nexus AI",
  yorkportfolio: "York Portfolio",
};

function checkIsYorkClient(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return YORK_DOMAINS.some(d => domain.includes(d.replace(".com", "").replace(".io", "")));
}

function titleCaseCompany(value: string): string {
  return value
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim();
}

function inferCompanyNameFromEmail(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain || PERSONAL_EMAIL_DOMAINS.includes(domain)) return "";

  const root = domain.split(".")[0] ?? "";
  return DOMAIN_COMPANY_OVERRIDES[root] ?? titleCaseCompany(root);
}

function domainFromEmail(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

function mockCrunchbase(name: string): CrunchbaseData | null {
  const normalized = name.trim().toLowerCase();
  const knownCompanies = ["patriot pay", "york ie growth", "nexus ai", "york portfolio"];
  if (!knownCompanies.includes(normalized)) return null;

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

function starterFuelProfile(name: string): CrunchbaseData {
  return {
    name,
    description: "",
    stage: "Seed",
    employees: "1–5",
    founded: "",
    location: "",
    totalFunding: "",
    category: "",
    website: name.toLowerCase().replace(/\s+/g, "") + ".com",
  };
}

const INTEGRATIONS = [
  { id: "jira",       name: "Jira",             category: "Development", abbr: "JR", color: "#2684FF", premium: true, addOnPrice: 29 },
  { id: "linear",     name: "Linear",           category: "Development", abbr: "LN", color: "#5E6AD2", premium: false, addOnPrice: 0 },
  { id: "launchpad",  name: "Launchpad",        category: "Development", abbr: "LP", color: "#3DD68C", york: true },
  { id: "pulse",      name: "Pulse",            category: "Development", abbr: "PL", color: "#3DD68C", york: true },
  { id: "ga4",        name: "Google Analytics", category: "Marketing",   abbr: "GA", color: "#F9AB00", premium: false, addOnPrice: 0 },
  { id: "gads",       name: "Google Ads",       category: "Marketing",   abbr: "Gd", color: "#4285F4", premium: true, addOnPrice: 59 },
  { id: "semrush",    name: "Semrush",          category: "Marketing",   abbr: "SR", color: "#FF642D", premium: true, addOnPrice: 79 },
  { id: "linkedin",   name: "LinkedIn",         category: "Marketing",   abbr: "in", color: "#0A66C2", premium: true, addOnPrice: 39 },
  { id: "meta",       name: "Meta Ads",         category: "Marketing",   abbr: "Fb", color: "#1877F2", premium: true, addOnPrice: 39 },
  { id: "hubspot",    name: "HubSpot",          category: "RevOps",      abbr: "HS", color: "#FF7A59", premium: false, addOnPrice: 0 },
  { id: "salesforce", name: "Salesforce",       category: "RevOps",      abbr: "SF", color: "#00A1E0", premium: true, addOnPrice: 99 },
  { id: "quickbooks", name: "QuickBooks",       category: "FinOps",      abbr: "QB", color: "#2CA01C", premium: true, addOnPrice: 49 },
  { id: "stripe",     name: "Stripe",           category: "FinOps",      abbr: "St", color: "#635BFF", premium: false, addOnPrice: 0 },
];

const BUSINESS_MODEL_OPTIONS = [
  {
    id: "saas",
    label: "SaaS / Software product",
    desc: "Recurring software revenue with ARR, NRR, customer logos.",
  },
  {
    id: "services",
    label: "Services / Consultancy",
    desc: "Hands-on services, agencies, consultancies, or revenue per engagement.",
  },
  {
    id: "investment",
    label: "Investment firm",
    desc: "Fund or holding company with AUM, portfolio companies, and returns.",
  },
  {
    id: "operating-investment",
    label: "Operating + investment firm",
    desc: "Both operating revenue and portfolio or investment activity.",
  },
  {
    id: "other",
    label: "Other",
    desc: "Fuel will collect what matters for your model.",
  },
];

const PROGRESS_ITEMS = [
  { id: "profile",      label: "Your company profile",       step: "domain-claim" },
  { id: "benchmarks",   label: "Your growth benchmarks",     step: "benchmark" },
  { id: "tracks",       label: "Your Fuel journey tracks",   step: "fuel-value" },
  { id: "integrations", label: "Your York IE projects",      step: "york-link" },
  { id: "config",       label: "Your workspace config",      step: "done" },
];

const STAGE_ORDER: Step[] = [
  "company-confirm", "company-name",
  "profile-description", "business-model", "profile-more-details", "domain-claim",
  "crunchbase-fetching", "crunchbase-missing", "crunchbase-url", "crunchbase-confirm", "benchmark",
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

function UserAvatar({ initial }: { initial: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 800, color: "#0a1a12",
    }}>{initial}</div>
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

function CrunchbaseCard({
  data,
  onConfirm,
  initialMode = "view",
  sourceLabel = "Crunchbase",
}: {
  data: CrunchbaseData;
  onConfirm: (v: string) => void;
  initialMode?: "view" | "edit";
  sourceLabel?: string;
}) {
  const [mode, setMode] = React.useState<"view" | "edit">(initialMode);
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
          }}>{sourceLabel}</div>
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
              fontSize: 12, color: "#6F8798",
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
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#6F8798", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</div>
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

function BusinessModelCard({ selected, onSelect }: { selected?: string; onSelect: (id: string) => void }) {
  const [choice, setChoice] = React.useState(selected || "");
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <div style={{
      background: "#1F3140",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12,
      marginTop: 4,
      padding: 14,
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#3DD68C", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        Business model
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {BUSINESS_MODEL_OPTIONS.map(option => {
          const active = choice === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={submitted}
              onClick={() => {
                if (submitted) return;
                setChoice(option.id);
                setSubmitted(true);
                onSelect(option.id);
              }}
              style={{
                background: active ? "rgba(0,180,138,0.13)" : "#132130",
                border: active ? "1px solid rgba(0,180,138,0.55)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 9,
                color: "inherit",
                cursor: "pointer",
                opacity: submitted && !active ? 0.55 : 1,
                minHeight: 96,
                padding: 12,
                textAlign: "left",
              }}
            >
              <strong style={{ color: active ? "#8FE8D2" : "#F2F5F2", display: "block", fontSize: 12.5, lineHeight: 1.25 }}>
                {option.label}
              </strong>
              <span style={{ color: "#8FA99A", display: "block", fontSize: 11.5, lineHeight: 1.35, marginTop: 5 }}>
                {option.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileFormCard({
  data,
  businessModel,
  notes,
  domain,
  onSubmit,
}: {
  data: CrunchbaseData;
  businessModel: string;
  notes: string;
  domain: string;
  onSubmit: (result: ProfileFormResult) => void;
}) {
  const [companyName, setCompanyName] = React.useState(data.name);
  const [description, setDescription] = React.useState(data.description);
  const [selectedModel, setSelectedModel] = React.useState(
    businessModel || "Operating + investment firm"
  );
  const [industry, setIndustry] = React.useState(data.category || "Investment Firm");
  const [founded, setFounded] = React.useState(data.founded);
  const [city, setCity] = React.useState(data.location.split(",")[0]?.trim() || "");
  const [region, setRegion] = React.useState(data.location.split(",")[1]?.trim() || "");
  const [country, setCountry] = React.useState(domain.endsWith(".ie") ? "Ireland" : "United States");
  const [website, setWebsite] = React.useState(data.website.startsWith("http") ? data.website : `https://${data.website || domain}`);
  const [linkedin, setLinkedin] = React.useState("");
  const [rounds, setRounds] = React.useState<FundingRound[]>([
    { id: uid(), type: "Seed", amount: data.totalFunding, date: "", investors: "" },
  ]);
  const [profileNotes, setProfileNotes] = React.useState(notes);
  const [claimed, setClaimed] = React.useState(false);
  const sourcePillStyle: React.CSSProperties = {
    alignSelf: "flex-start",
    background: "rgba(0,180,138,0.1)",
    border: "1px solid rgba(0,180,138,0.16)",
    borderRadius: 999,
    color: "#8FE8D2",
    display: "inline-flex",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 9.5,
    fontWeight: 700,
    marginTop: 6,
    maxWidth: "100%",
    padding: "2px 8px",
  };
  const requiredLabel = (label: string) => `${label} *`;
  const compactInputStyle = { ...inputStyle(), padding: "8px 10px", fontSize: 12.5 };
  const addRound = () => setRounds(current => [...current, { id: uid(), type: "Seed", amount: "", date: "", investors: "" }]);
  const deleteRound = (id: string) => setRounds(current => current.filter(round => round.id !== id));
  const updateRound = (id: string, key: keyof FundingRound, value: string) => {
    setRounds(current => current.map(round => round.id === id ? { ...round, [key]: value } : round));
  };

  return (
    <div style={{
      background: "#1F3140",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12,
      marginTop: 4,
      padding: 16,
    }}>
      <div style={{ color: "#3DD68C", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
        + Profile ready
      </div>
      <div style={{ color: "#F2F5F2", fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>
        Review your <span style={{ color: "#00B48A" }}>{companyName || "company"}</span> profile.
      </div>
      <div style={{ color: "#8FA99A", fontSize: 12, lineHeight: 1.45, marginBottom: 14 }}>
        Confirm what looks right and we'll set up your workspace.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <label>
          <FieldLabel>{requiredLabel("Company")}</FieldLabel>
          <input required value={companyName} onChange={event => setCompanyName(event.target.value)} style={{ ...compactInputStyle, border: "1px solid rgba(61,214,140,0.35)" }} />
        </label>

        <label>
          <FieldLabel>{requiredLabel("What they do")}</FieldLabel>
          <textarea
            required
            value={description}
            onChange={event => setDescription(event.target.value)}
            rows={2}
            style={{ ...compactInputStyle, resize: "vertical" }}
          />
        </label>

        <div>
          <FieldLabel>{requiredLabel("Business model")}</FieldLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {BUSINESS_MODEL_OPTIONS.map(option => {
              const active = selectedModel === option.label;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedModel(option.label)}
                  style={{
                    background: active ? "rgba(0,180,138,0.13)" : "#0B1720",
                    border: active ? "1px solid rgba(0,180,138,0.55)" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 9,
                    color: "inherit",
                    cursor: "pointer",
                    minHeight: 76,
                    padding: 10,
                    textAlign: "left",
                  }}
                >
                  <strong style={{ color: active ? "#8FE8D2" : "#F2F5F2", display: "block", fontSize: 11.5, lineHeight: 1.25 }}>
                    {option.label}
                  </strong>
                  <span style={{ color: "#8FA99A", display: "block", fontSize: 10.5, lineHeight: 1.3, marginTop: 4 }}>
                    {option.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>
                <FieldLabel>{requiredLabel("Industry")}</FieldLabel>
                <input required value={industry} onChange={event => setIndustry(event.target.value)} style={compactInputStyle} />
                <div style={sourcePillStyle}>• From homepage positioning</div>
              </label>
              <label>
                <FieldLabel>{requiredLabel("Founded")}</FieldLabel>
                <input required value={founded} onChange={event => setFounded(event.target.value)} style={compactInputStyle} />
              </label>
              <label>
                <FieldLabel>{requiredLabel("City")}</FieldLabel>
                <input required value={city} onChange={event => setCity(event.target.value)} style={compactInputStyle} />
              </label>
              <label>
                <FieldLabel>{requiredLabel("State / region")}</FieldLabel>
                <input required value={region} onChange={event => setRegion(event.target.value)} style={compactInputStyle} />
              </label>
              <label>
                <FieldLabel>{requiredLabel("Country")}</FieldLabel>
                <input required value={country} onChange={event => setCountry(event.target.value)} style={compactInputStyle} />
              </label>
              <label>
                <FieldLabel>{requiredLabel("Website")}</FieldLabel>
                <input required value={website} onChange={event => setWebsite(event.target.value)} style={compactInputStyle} />
                <div style={sourcePillStyle}>• From domain extension</div>
              </label>
            </div>
            <label>
              <FieldLabel>{requiredLabel("LinkedIn")}</FieldLabel>
              <input required value={linkedin} onChange={event => setLinkedin(event.target.value)} style={compactInputStyle} />
            </label>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <FieldLabel>Funding rounds</FieldLabel>
                <button onClick={addRound} style={{
                  background: "rgba(61,214,140,0.08)",
                  border: "1px solid rgba(61,214,140,0.2)",
                  borderRadius: 6,
                  color: "#3DD68C",
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "4px 9px",
                }}>
                  + Add round
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rounds.map(round => (
                  <div key={round.id} style={{
                    alignItems: "center",
                    background: "#172632",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8,
                    display: "grid",
                    gap: 6,
                    gridTemplateColumns: "96px 86px 128px 1fr 26px",
                    padding: 7,
                  }}>
                    <select value={round.type} onChange={event => updateRound(round.id, "type", event.target.value)} style={{ ...compactInputStyle, padding: "6px 7px", fontSize: 11 }}>
                      {ROUND_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <input value={round.amount} onChange={event => updateRound(round.id, "amount", event.target.value)} placeholder="$1.2M" style={{ ...compactInputStyle, padding: "6px 7px", fontSize: 11 }} />
                    <input type="date" value={round.date} onChange={event => updateRound(round.id, "date", event.target.value)} placeholder="dd/mm/yyyy" style={{ ...compactInputStyle, padding: "6px 7px", fontSize: 11 }} />
                    <input value={round.investors} onChange={event => updateRound(round.id, "investors", event.target.value)} placeholder="Investors" style={{ ...compactInputStyle, padding: "6px 7px", fontSize: 11 }} />
                    <button onClick={() => deleteRound(round.id)} style={{
                      alignItems: "center",
                      background: "rgba(201,95,95,0.1)",
                      border: "1px solid rgba(201,95,95,0.2)",
                      borderRadius: 5,
                      color: "#C95F5F",
                      cursor: "pointer",
                      display: "flex",
                      fontSize: 13,
                      height: 24,
                      justifyContent: "center",
                      lineHeight: 1,
                      width: 24,
                    }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <label>
              <FieldLabel>Additional context</FieldLabel>
              <textarea
                value={profileNotes}
                onChange={event => setProfileNotes(event.target.value)}
                rows={3}
                placeholder="Customers, priorities, markets, or anything Fuel should remember."
                style={{ ...compactInputStyle, resize: "vertical" }}
              />
            </label>
          </div>

        <div style={{
          background: "rgba(0,180,138,0.08)",
          border: "1px solid rgba(0,180,138,0.18)",
          borderRadius: 8,
          color: "#8FE8D2",
          fontSize: 11.5,
          lineHeight: 1.45,
          padding: "10px 12px",
        }}>
          You'll claim <strong style={{ color: "#F2F5F2" }}>{domain}</strong> as your verified company domain.
        </div>

        {!claimed ? (
          <button
            type="button"
            onClick={() => {
              setClaimed(true);
              onSubmit({
                companyName,
                description,
                businessModel: selectedModel,
                industry,
                founded,
                city,
                region,
                country,
                website,
                linkedin,
                fundingRounds: rounds,
                notes: profileNotes,
                domain,
              });
            }}
            style={{
              alignSelf: "flex-start",
              background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(16,206,161) 100%)",
              border: "none",
              borderRadius: 9,
              color: "#0a1a12",
              cursor: "pointer",
              font: "inherit",
              fontSize: 12.5,
              fontWeight: 800,
              padding: "10px 22px",
            }}
          >
            Claim this company
          </button>
        ) : null}
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
            <div style={{ fontSize: 11, color: "#6F8798", fontWeight: 600, marginBottom: 3 }}>{c.label}</div>
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
  const [mode, setMode] = React.useState<"form" | "loading" | "results">("form");
  const [activeTooltip, setActiveTooltip] = React.useState<string | null>(null);
  const [selectedJourneyStage, setSelectedJourneyStage] = React.useState("Pre-Product");
  const [benchmarkValues, setBenchmarkValues] = React.useState({
    arr: "",
    arrGrowth: "",
    nrr: "",
    logoRetention: "",
    monthlyBurn: "",
    cashOnHand: "",
    grossMargin: "",
    headcount: "",
    payingCustomers: "",
    notableCustomers: "",
    currentChallenges: "",
  });
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
  const benchmarkGroups = [
    {
      title: "Revenue + Retention",
      fields: [
        { key: "arr", label: "ARR (annualized)", placeholder: "500000", info: "Annual recurring revenue in dollars." },
        { key: "arrGrowth", label: "ARR growth, YoY", placeholder: "200", info: "Year-over-year ARR growth percentage. Enter 200 for 200%." },
        { key: "nrr", label: "Net revenue retention", placeholder: "108", info: "Revenue retained and expanded from existing customers. Enter as a percentage." },
        { key: "logoRetention", label: "Logo retention (annual)", placeholder: "88", info: "Percent of customers retained over the last year." },
      ],
    },
    {
      title: "Capital Efficiency",
      fields: [
        { key: "monthlyBurn", label: "Monthly burn (net) *", placeholder: "80000", info: "Average net cash burn per month in dollars." },
        { key: "cashOnHand", label: "Cash on hand *", placeholder: "1500000", info: "Current cash balance in dollars." },
        { key: "grossMargin", label: "Gross margin *", placeholder: "72", info: "Gross margin percentage. Enter 72 for 72%." },
      ],
    },
    {
      title: "Team + Customers",
      fields: [
        { key: "headcount", label: "Headcount (FTEs) *", placeholder: "12", info: "Total full-time equivalent team members." },
        { key: "payingCustomers", label: "Paying customers", placeholder: "40", info: "Current number of paying customer accounts or logos." },
      ],
    },
    {
      title: "Anything worth flagging?",
      fields: [
        { key: "notableCustomers", label: "Notable customers", placeholder: "Customer names or segments", type: "textarea", info: "Important customers, segments, logos, or customer concentration notes." },
        { key: "currentChallenges", label: "Current challenges", placeholder: "What should Fuel watch?", type: "textarea", info: "Known risks, blockers, or operating challenges to include in signal generation." },
      ],
    },
  ];
  const journeyStages = [
    { stage: "Stage 1", title: "Idea", detail: "Problem identified", done: true },
    { stage: "Stage 2", title: "Pre-Product", detail: "Building MVP", active: true },
    { stage: "Stage 3", title: "Pre-Revenue", detail: "MVP live · first users" },
    { stage: "Stage 4", title: "Early Revenue", detail: "Paying customers" },
    { stage: "Stage 5", title: "Product-Market Fit", detail: "Repeatable growth" },
    { stage: "Stage 6", title: "Scaling", detail: "Rapid expansion" },
    { stage: "Stage 7", title: "Market Leader", detail: "Category dominance" },
  ];
  const kpiRows = [
    { group: "GTM", sub: "Revenue + retention", label: "ARR", p25: "$150K", p50: "$500K", p75: "$1.2M", p90: "$2.5M", start: 6, end: 48, marker: 20 },
    { group: "GTM", sub: "Revenue + retention", label: "ARR growth, YoY", p25: "120%", p50: "200%", p75: "350%", p90: "600%", start: 20, end: 58, marker: 34 },
    { group: "GTM", sub: "Revenue + retention", label: "Net revenue retention", p25: "95%", p50: "108%", p75: "125%", p90: "145%", start: 66, end: 84, marker: 75 },
    { group: "GTM", sub: "Revenue + retention", label: "Logo retention", p25: "80%", p50: "88%", p75: "93%", p90: "97%", start: 82, end: 96, marker: 88 },
    { group: "GTM", sub: "Revenue + retention", label: "Paying customers", p25: "10", p50: "40", p75: "150", p90: "500", start: 2, end: 30, marker: 8 },
    { group: "GTM", sub: "Revenue + retention", label: "CAC payback", p25: "10.0 mo", p50: "16.0 mo", p75: "26.0 mo", p90: "42.0 mo", start: 24, end: 54, marker: 38 },
    { group: "R&D", sub: "Engineering + product", label: "Headcount", p25: "6", p50: "12", p75: "22", p90: "40", start: 15, end: 55, marker: 30 },
    { group: "G&A", sub: "Capital + efficiency", label: "Cash on hand", p25: "$500K", p50: "$1.5M", p75: "$3.0M", p90: "$6.0M", start: 22, end: 50, marker: 31 },
    { group: "G&A", sub: "Capital + efficiency", label: "Monthly burn", p25: "$40K", p50: "$80K", p75: "$180K", p90: "$350K", start: 12, end: 52, marker: 29 },
    { group: "G&A", sub: "Capital + efficiency", label: "Gross margin", p25: "55%", p50: "72%", p75: "82%", p90: "88%", start: 64, end: 92, marker: 73 },
    { group: "G&A", sub: "Capital + efficiency", label: "Burn multiple", p25: "1.3x", p50: "2.1x", p75: "3.4x", p90: "5.5x", start: 24, end: 58, marker: 38 },
  ];

  function updateBenchmarkValue(key: string, value: string) {
    setBenchmarkValues(current => ({ ...current, [key]: value }));
  }

  function saveBenchmarkValues() {
    setMode("loading");
    window.setTimeout(() => {
      setMode("results");
    }, 1400);
  }

  if (mode === "form") {
    return (
      <div style={{
        background: "#1F3140", border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 12, overflow: "hidden", marginTop: 4,
      }}>
        <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#F2F5F2" }}>Add your benchmark numbers</div>
          <div style={{ fontSize: 12, color: "#8FA99A", marginTop: 4, lineHeight: 1.5 }}>
            Share your current numbers and Fuel will identify your benchmark range, generate signals, recommend playbooks, and surface the initiatives that can help your startup grow.
          </div>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {benchmarkGroups.map(group => (
            <div key={group.title} style={{
              background: "#172632",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 13,
            }}>
              <div style={{ color: "#556878", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                {group.title}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {group.fields.map(input => (
                  <label key={input.key} style={group.fields.length === 1 ? { gridColumn: "1 / -1" } : {}}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, position: "relative" }}>
                      <FieldLabel>{input.label}</FieldLabel>
                      <span
                        onMouseEnter={() => setActiveTooltip(input.key)}
                        onMouseLeave={() => setActiveTooltip(null)}
                        onFocus={() => setActiveTooltip(input.key)}
                        onBlur={() => setActiveTooltip(null)}
                        tabIndex={0}
                        style={{
                          alignItems: "center",
                          border: "1px solid rgba(255,255,255,0.16)",
                          borderRadius: "50%",
                          color: "#8FA99A",
                          cursor: "help",
                          display: "inline-flex",
                          fontSize: 9,
                          fontWeight: 800,
                          height: 14,
                          justifyContent: "center",
                          lineHeight: 1,
                          marginBottom: 4,
                          width: 14,
                        }}
                      >
                        i
                      </span>
                      {activeTooltip === input.key ? (
                        <div style={{
                          background: "#0B1720",
                          border: "1px solid rgba(61,214,140,0.22)",
                          borderRadius: 8,
                          boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
                          color: "#D0DDD8",
                          fontSize: 11,
                          left: 0,
                          lineHeight: 1.45,
                          maxWidth: 260,
                          padding: "8px 10px",
                          position: "absolute",
                          top: 20,
                          width: "max-content",
                          zIndex: 20,
                        }}>
                          {input.info}
                        </div>
                      ) : null}
                    </div>
                    {input.type === "textarea" ? (
                      <textarea
                        value={benchmarkValues[input.key as keyof typeof benchmarkValues]}
                        onChange={event => updateBenchmarkValue(input.key, event.target.value)}
                        placeholder={input.placeholder}
                        rows={2}
                        style={{ ...inputStyle(), padding: "8px 10px", fontSize: 12.5, resize: "vertical" }}
                      />
                    ) : (
                      <input
                        type="number"
                        value={benchmarkValues[input.key as keyof typeof benchmarkValues]}
                        onChange={event => updateBenchmarkValue(input.key, event.target.value)}
                        placeholder={input.placeholder}
                        style={{ ...inputStyle(), padding: "8px 10px", fontSize: 12.5 }}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 16px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={saveBenchmarkValues} style={{
            background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
            color: "#0a1a12", border: "none", borderRadius: 7,
            padding: "9px 20px", fontSize: 12, fontWeight: 800, cursor: "pointer",
          }}>
            Save and identify benchmark →
          </button>
          <span style={{ fontSize: 12, color: "#6F8798" }}>You can leave unknown fields blank</span>
        </div>
      </div>
    );
  }

  if (mode === "loading") {
    return (
      <div style={{
        background: "#1F3140", border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 12, marginTop: 4, padding: 20, textAlign: "center",
      }}>
        <div style={{ display: "inline-flex", gap: 4, marginBottom: 12 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 7, height: 7, borderRadius: "50%", background: "#3DD68C",
              animation: `fuelDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              display: "block",
            }} />
          ))}
        </div>
        <div style={{ color: "#F2F5F2", fontSize: 14, fontWeight: 800 }}>Identifying your benchmark</div>
        <div style={{ color: "#8FA99A", fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>
          Fuel is matching your numbers to the closest cohort and percentile range.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 14, marginTop: 4,
    }}>
      <div style={{
        background: "linear-gradient(135deg, #172632 0%, #10202B 100%)",
        border: "1px solid rgba(61,214,140,0.18)",
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ color: "#3DD68C", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
              Your startup journey
            </div>
            <div style={{ color: "#F2F5F2", fontSize: 20, fontWeight: 800 }}>
              Currently at <span style={{ color: "#00B48A" }}>{selectedJourneyStage}.</span>
            </div>
          </div>
          <span style={{
            background: "rgba(0,180,138,0.1)",
            border: "1px solid rgba(0,180,138,0.2)",
            borderRadius: 999,
            color: "#8FE8D2",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 10.5,
            fontWeight: 800,
            padding: "4px 10px",
            whiteSpace: "nowrap",
          }}>
            AI estimate · from public signal
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
          {journeyStages.map(item => {
            const isSelected = item.title === selectedJourneyStage;
            return (
            <button
              key={item.stage}
              type="button"
              onClick={() => setSelectedJourneyStage(item.title)}
              style={{
              background: isSelected ? "rgba(0,180,138,0.13)" : item.done ? "rgba(31,49,64,0.85)" : "#0B1720",
              border: isSelected ? "1px solid rgba(0,180,138,0.55)" : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 9,
              cursor: "pointer",
              minHeight: 76,
              padding: 10,
              position: "relative",
              textAlign: "left",
              font: "inherit",
            }}>
              {isSelected ? <span style={{ color: "#00B48A", fontSize: 12, position: "absolute", right: 10, top: 8 }}>✓</span> : null}
              <div style={{ color: "#6F8798", fontSize: 9.5, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{item.stage}</div>
              <strong style={{ color: "#F2F5F2", display: "block", fontSize: 12, lineHeight: 1.25 }}>{item.title}</strong>
              <p style={{ color: "#8FA99A", fontSize: 10.5, lineHeight: 1.3, margin: "4px 0 0" }}>{item.detail}</p>
            </button>
          )})}
        </div>
        <div style={{ color: "#8FA99A", fontSize: 12, lineHeight: 1.5, marginTop: 12 }}>
          We inferred this from your public profile. Click another card if it doesn't match.
        </div>
      </div>

      <div style={{
        background: "#1F3140",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px 18px 12px" }}>
          <div style={{ alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "#3DD68C", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                KPI snapshot
              </div>
              <div style={{ color: "#F2F5F2", fontSize: 19, fontWeight: 800 }}>
                How your cohort performs across R&D, GTM, and G&A.
              </div>
            </div>
            <button
              type="button"
              title="Edit benchmark numbers"
              aria-label="Edit benchmark numbers"
              onClick={() => setMode("form")}
              style={{
                alignItems: "center",
                background: "rgba(61,214,140,0.08)",
                border: "1px solid rgba(61,214,140,0.22)",
                borderRadius: 7,
                color: "#3DD68C",
                cursor: "pointer",
                display: "inline-flex",
                font: "inherit",
                fontSize: 12,
                fontWeight: 800,
                height: 30,
                justifyContent: "center",
                width: 34,
              }}
            >
              ✎
            </button>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 999,
            color: "#8FA99A",
            display: "inline-block",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 10.5,
            fontWeight: 800,
            marginTop: 14,
            padding: "4px 9px",
          }}>
            Cohort · b2b saas · seed · US · n=147
          </div>
          <div style={{ color: "#8FA99A", fontSize: 12.5, lineHeight: 1.5, marginTop: 10 }}>
            Cohort distribution shown below — your marker lands once you run a benchmark.
          </div>
        </div>
        <div style={{ padding: "4px 20px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          {kpiRows.map((row, index) => {
            const showGroup = index === 0 || kpiRows[index - 1].group !== row.group;
            return (
              <div key={`${row.group}-${row.label}`} style={{
                alignItems: "center",
                borderTop: showGroup && index > 0 ? "1px solid rgba(255,255,255,0.07)" : "none",
                display: "grid",
                gap: 16,
                gridTemplateColumns: "104px minmax(0, 1fr)",
                paddingTop: showGroup && index > 0 ? 16 : 0,
              }}>
                <div>
                  {showGroup ? (
                    <>
                      <div style={{ color: "#00B48A", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>{row.group}</div>
                      <div style={{ color: "#6F8798", fontSize: 10.5, lineHeight: 1.25, marginTop: 2 }}>{row.sub}</div>
                    </>
                  ) : null}
                </div>
                <div>
                  <div style={{ display: "flex", gap: 14, justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#F2F5F2", fontSize: 12.5, fontWeight: 700 }}>{row.label}</span>
                    <span style={{ color: "#8FA99A", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 10.5, lineHeight: 1.4, textAlign: "right" }}>
                      p25 {row.p25} · p50 <strong style={{ color: "#F2F5F2" }}>{row.p50}</strong> · p75 {row.p75} · p90 {row.p90}
                    </span>
                  </div>
                  <div style={{ background: "#07131C", borderRadius: 999, height: 9, overflow: "hidden", position: "relative" }}>
                    <div style={{
                      background: "linear-gradient(90deg, rgba(0,180,138,0.42), rgba(0,180,138,0.9))",
                      height: "100%",
                      left: `${row.start}%`,
                      position: "absolute",
                      width: `${Math.max(4, row.end - row.start)}%`,
                    }} />
                    <div style={{
                      background: "#D0DDD8",
                      height: 14,
                      left: `${row.marker}%`,
                      position: "absolute",
                      top: -3,
                      width: 1,
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 2px 2px" }}>
        <div style={{
          background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.12)",
          borderRadius: 8, padding: "10px 12px",
          fontSize: 12, color: "#8FA99A", lineHeight: 1.6,
        }}>
          <strong style={{ color: "#F2F5F2" }}>Your benchmark is now ready.</strong>{" "}
          Fuel can use these signals to recommend playbooks and identify the highest-leverage initiatives for your next stage.
        </div>
        {!continued && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => { setContinued(true); onContinue(); }} style={{
              background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
              color: "#0a1a12", border: "none", borderRadius: 7,
              padding: "9px 20px", fontSize: 12, fontWeight: 800, cursor: "pointer",
              letterSpacing: "0.1px",
            }}>Show me how Fuel helps →</button>
            <span style={{ fontSize: 12, color: "#6F8798" }}>York portfolio · benchmark cohort · operating signals</span>
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
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6F8798", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5 }}>Fuel tracks</div>
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

function YorkProjectsCard({ onContinue }: { onContinue: () => void }) {
  const [continued, setContinued] = React.useState(false);
  const projects = [
    {
      area: "Development",
      title: "Patient billing workflow",
      status: "Active",
      summary: "Roadmap execution, Launchpad approvals, Pulse quality signals, and release readiness for the core billing workflow.",
    },
    {
      area: "Marketing",
      title: "GTM dashboard",
      status: "Live",
      summary: "Traffic, paid media, SEO, and campaign performance are available for demand and conversion signal generation.",
    },
    {
      area: "RevOps",
      title: "Pipeline operating rhythm",
      status: "Monitoring",
      summary: "CRM hygiene, lead-to-opportunity conversion, and forecast signals are being tracked for growth planning.",
    },
  ];

  return (
    <div style={{
      background: "#1F3140",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12,
      marginTop: 4,
      overflow: "hidden",
    }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ color: "#3DD68C", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", marginBottom: 5, textTransform: "uppercase" }}>
          York IE projects
        </div>
        <div style={{ color: "#F2F5F2", fontSize: 14, fontWeight: 800 }}>
          Active work Fuel will use for signal generation
        </div>
        <div style={{ color: "#8FA99A", fontSize: 12, lineHeight: 1.55, marginTop: 5 }}>
          Your York IE workspace is already connected, so Fuel can use these active projects, updates, and service context automatically. You can review detailed project updates anytime in Current Updates.
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, padding: 14 }}>
        {projects.map(project => (
          <div key={project.title} style={{
            background: "#172632",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 9,
            padding: 12,
          }}>
            <div style={{ alignItems: "center", display: "flex", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#3DD68C", fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>{project.area}</span>
              <span style={{ background: "rgba(0,180,138,0.1)", border: "1px solid rgba(0,180,138,0.2)", borderRadius: 999, color: "#8FE8D2", fontSize: 10, fontWeight: 800, padding: "2px 7px" }}>
                {project.status}
              </span>
            </div>
            <strong style={{ color: "#F2F5F2", display: "block", fontSize: 13 }}>{project.title}</strong>
            <p style={{ color: "#8FA99A", fontSize: 12, lineHeight: 1.5, margin: "5px 0 0" }}>{project.summary}</p>
          </div>
        ))}
      </div>
      {!continued ? (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 14px" }}>
          <button
            onClick={() => {
              setContinued(true);
              onContinue();
            }}
            style={{
              background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
              border: "none",
              borderRadius: 7,
              color: "#0a1a12",
              cursor: "pointer",
              font: "inherit",
              fontSize: 12,
              fontWeight: 800,
              padding: "9px 18px",
            }}
          >
            Use these projects for signals →
          </button>
        </div>
      ) : null}
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
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#6F8798", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Available integrations</div>
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
        <div style={{ fontSize: 11.5, color: "#8FA99A", marginTop: 3 }}>Select the integrations you want active. Premium connectors can be added to your Fuel subscription from the Connector Hub.</div>
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
                    {!("york" in item && item.york) && item.premium && (
                      <span style={{ fontSize: 9, color: "#D4924A", background: "rgba(212,146,74,0.1)", borderRadius: 3, padding: "1px 4px", fontWeight: 800 }}>Premium · ${item.addOnPrice}/mo</span>
                    )}
                    {!("york" in item && item.york) && !item.premium && (
                      <span style={{ fontSize: 9, color: "#3DD68C", background: "rgba(61,214,140,0.1)", borderRadius: 3, padding: "1px 4px", fontWeight: 800 }}>Free</span>
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
          <span style={{ fontSize: 12, color: "#6F8798" }}>You can add premium connectors anytime from the Connector Hub</span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FuelOnboardingChat({ onComplete, onManual }: { onComplete: () => void; onManual: () => void }) {
  const inferredCompanyName = inferCompanyNameFromEmail(LOGGED_IN_EMAIL);
  const inferredDomain = domainFromEmail(LOGGED_IN_EMAIL);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<Step>(inferredCompanyName ? "company-confirm" : "company-name");
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    email: LOGGED_IN_EMAIL, isYorkClient: checkIsYorkClient(LOGGED_IN_EMAIL), companyName: inferredCompanyName,
    crunchbaseData: null, businessModel: "", profileNotes: "", verifiedDomain: inferredDomain, selectedIntegrations: [],
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
    cardMode?: ChatMessage["cardMode"];
    cardLabel?: ChatMessage["cardLabel"];
    delay?: number;
  }): Promise<void> => {
    return new Promise(resolve => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        pushMessage({ role: "ai", text, chips: opts?.chips, cardType: opts?.cardType, cardMode: opts?.cardMode, cardLabel: opts?.cardLabel });
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
      if (!inferredCompanyName) {
        pushMessage({
          role: "ai",
          text: `👋 Hi! I'm Fuel AI, York IE's onboarding assistant.\n\nYou're signed in as **${LOGGED_IN_EMAIL}**. What company should I set up in Fuel?`,
        });
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      pushMessage({
        role: "ai",
        text: `👋 Hi! I'm Fuel AI, York IE's onboarding assistant.\n\nYou're signed in as **${LOGGED_IN_EMAIL}**, so I found **${inferredCompanyName}** from your email domain.\n\nIs this the company you want to set up in Fuel?`,
        chips: [
          { label: `Yes, set up ${inferredCompanyName}`, value: "confirm-company" },
        ],
      });
    }, 500);
    return () => clearTimeout(t);
  }, [inferredCompanyName, pushMessage]);

  // ── Step handlers ────────────────────────────────────────────────────────────

  const continueToBenchmarks = useCallback(async () => {
    setCompletedProgress(prev => new Set([...prev, "profile"]));
    await aiSay(
      `Perfect. Your Fuel profile is ready.\n\nHere's the benchmark picture for **${userData.crunchbaseData?.stage ?? "Seed"} · B2B SaaS · US** — the cohort your business maps to.\n\nAcross the York IE portfolio and aggregated market data, there is a consistent pattern: the top quartile has better visibility into what's moving. Fuel turns that visibility into signals and action.`,
      { delay: 900 }
    );
    await aiSay("", { delay: 600, cardType: "benchmark" });
    setStep("benchmark");
  }, [aiSay, userData.crunchbaseData?.stage]);

  const askBusinessModel = useCallback(async () => {
    await aiSay("Which business model best matches your company?", { delay: 500, cardType: "business-model" });
    setStep("business-model");
  }, [aiSay]);

  const askDomainClaim = useCallback(async () => {
    const domain = userData.verifiedDomain || inferredDomain;
    await aiSay(`You'll claim **${domain}** as your verified company domain.`, {
      delay: 600,
      chips: [{ label: "Claim this company", value: "claim-domain" }],
    });
    setStep("domain-claim");
  }, [aiSay, inferredDomain, userData.verifiedDomain]);

  const startProfileQuestionnaire = useCallback(async (companyName: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setUserData(prev => ({ ...prev, companyName }));

    await aiSay(`Great. I’ll piece together a quick Fuel profile for **${companyName}** from your website and account context.`, { delay: 500 });
    setStep("profile-description");
    setIsTyping(true);

    await new Promise(r => setTimeout(r, 1200));
    setIsTyping(false);

    const cb = mockCrunchbase(companyName) ?? starterFuelProfile(companyName);
    setUserData(prev => ({ ...prev, crunchbaseData: cb, verifiedDomain: cb.website || prev.verifiedDomain }));
    await aiSay("", { delay: 500, cardType: "profile-form" });
    setStep("domain-claim");
    processingRef.current = false;
  }, [aiSay]);

  const handleCompanyConfirm = useCallback(async (value: string) => {
    if (processingRef.current) return;
    disableLastChips();

    if (value === "confirm-company") {
      pushMessage({ role: "user", text: `Yes, set up ${userData.companyName}` });
      await startProfileQuestionnaire(userData.companyName);
      return;
    }

    pushMessage({ role: "user", text: "Use a different company name" });
    await aiSay("No problem. What company name should I use?", { delay: 500 });
    setStep("company-name");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [aiSay, disableLastChips, pushMessage, startProfileQuestionnaire, userData.companyName]);

  const handleCompanyNameSubmit = useCallback(async (name: string) => {
    if (processingRef.current) return;
    pushMessage({ role: "user", text: name });
    await startProfileQuestionnaire(name);
  }, [pushMessage, startProfileQuestionnaire]);

  const handleProfileDescriptionChoice = useCallback(async (value: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    disableLastChips();

    if (value === "description-confirm") {
      pushMessage({ role: "user", text: "Looks right" });
      await askBusinessModel();
      processingRef.current = false;
      return;
    }

    pushMessage({ role: "user", text: "Update description" });
    await aiSay("Sure. What should Fuel use for the company description?", { delay: 500 });
    setStep("profile-description");
    setTimeout(() => inputRef.current?.focus(), 100);
    processingRef.current = false;
  }, [aiSay, askBusinessModel, disableLastChips, pushMessage]);

  const handleProfileDescriptionSubmit = useCallback(async (description: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    pushMessage({ role: "user", text: description });
    setUserData(prev => ({
      ...prev,
      crunchbaseData: prev.crunchbaseData
        ? { ...prev.crunchbaseData, description }
        : { ...starterFuelProfile(prev.companyName), description },
    }));
    await askBusinessModel();
    processingRef.current = false;
  }, [askBusinessModel, pushMessage]);

  const handleBusinessModelSelect = useCallback(async (id: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    const selected = BUSINESS_MODEL_OPTIONS.find(option => option.id === id) || BUSINESS_MODEL_OPTIONS[0];
    pushMessage({ role: "user", text: selected.label });
    setUserData(prev => ({ ...prev, businessModel: selected.label }));
    await aiSay("Got it. Anything else Fuel should know before we claim the company profile?", {
      delay: 650,
      chips: [
        { label: "Add more details", value: "add-profile-details" },
        { label: "Continue", value: "skip-profile-details" },
      ],
    });
    setStep("profile-more-details");
    processingRef.current = false;
  }, [aiSay, pushMessage]);

  const handleMoreDetailsChoice = useCallback(async (value: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    disableLastChips();

    if (value === "add-profile-details") {
      pushMessage({ role: "user", text: "Add more details" });
      await aiSay("Add any notes you want Fuel to remember about the company, customers, model, or priorities.", { delay: 500 });
      setStep("profile-more-details");
      setTimeout(() => inputRef.current?.focus(), 100);
      processingRef.current = false;
      return;
    }

    pushMessage({ role: "user", text: "Continue" });
    await askDomainClaim();
    processingRef.current = false;
  }, [aiSay, askDomainClaim, disableLastChips, pushMessage]);

  const handleMoreDetailsSubmit = useCallback(async (details: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    pushMessage({ role: "user", text: details });
    setUserData(prev => ({ ...prev, profileNotes: details }));
    await askDomainClaim();
    processingRef.current = false;
  }, [askDomainClaim, pushMessage]);

  const handleDomainClaim = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    disableLastChips();
    pushMessage({ role: "user", text: `Claim ${userData.verifiedDomain || inferredDomain}` });
    await continueToBenchmarks();
    processingRef.current = false;
  }, [continueToBenchmarks, disableLastChips, inferredDomain, pushMessage, userData.verifiedDomain]);

  const handleProfileFormSubmit = useCallback(async (result: ProfileFormResult) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setUserData(prev => ({
      ...prev,
      companyName: result.companyName,
      businessModel: result.businessModel,
      profileNotes: result.notes,
      verifiedDomain: result.domain,
      crunchbaseData: prev.crunchbaseData
        ? {
          ...prev.crunchbaseData,
          name: result.companyName,
          description: result.description,
          category: result.industry,
          founded: result.founded,
          totalFunding: result.fundingRounds.map(round => round.amount).filter(Boolean).join(" + "),
          location: [result.city, result.region, result.country].filter(Boolean).join(", "),
          website: result.website || result.domain,
        }
        : {
          ...starterFuelProfile(result.companyName),
          description: result.description,
          category: result.industry,
          founded: result.founded,
          totalFunding: result.fundingRounds.map(round => round.amount).filter(Boolean).join(" + "),
          location: [result.city, result.region, result.country].filter(Boolean).join(", "),
          website: result.website || result.domain,
        },
    }));
    pushMessage({ role: "user", text: `Claim ${result.domain}` });
    await continueToBenchmarks();
    processingRef.current = false;
  }, [continueToBenchmarks, pushMessage]);

  const showManualFuelProfileForm = useCallback(async () => {
    const starterProfile = starterFuelProfile(userData.companyName);
    setUserData(prev => ({ ...prev, crunchbaseData: starterProfile }));
    await aiSay(
      "No problem. Fill in the company profile below and Fuel will use these details for onboarding.",
      { delay: 500, cardType: "crunchbase", cardMode: "edit", cardLabel: "Fuel profile" }
    );
    setStep("crunchbase-confirm");
  }, [aiSay, userData.companyName]);

  const handleCrunchbaseUrlSubmit = useCallback(async (url: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    pushMessage({ role: "user", text: url });
    await aiSay("Thanks — I found the profile from that URL. Does this look right?", { delay: 600 });
    const cb = mockCrunchbase(userData.companyName) ?? starterFuelProfile(userData.companyName);
    setUserData(prev => ({ ...prev, crunchbaseData: cb }));
    await aiSay("", { delay: 300, cardType: "crunchbase" });
    setStep("crunchbase-confirm");
    processingRef.current = false;
  }, [aiSay, pushMessage, userData.companyName]);

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
    await aiSay(
      "Now let me show you how Fuel helps turn those benchmark gaps into operating signals and action.",
      { delay: 700, cardType: "value-prop" }
    );
    setStep("fuel-value");
    processingRef.current = false;
  }, [aiSay]);

  const handleValuePropContinue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setCompletedProgress(prev => new Set([...prev, "tracks"]));

    await aiSay(
      "Because you're already a York customer, your York IE workspace is connected automatically. Here are the active projects Fuel will use to generate your signals.",
      { delay: 900, cardType: "york-projects" }
    );
    setStep("york-link");
    processingRef.current = false;
  }, [aiSay]);

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

    pushMessage({ role: "user", text: "Use these projects for signals" });
    setCompletedProgress(prev => new Set([...prev, "integrations", "config"]));
    await aiSay("✓ York IE project context is ready. Fuel will use these active workstreams, updates, and service history to generate a richer signal view.", { delay: 900 });
    await aiSay("Based on your profile, benchmarks, and York IE project context, we’re generating signals for you now.", {
      delay: 700,
      chips: [{ label: "Start my journey →", value: "launch" }],
    });
    setStep("platform-overview");
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
        "No integrations connected yet — that's fine. You can add premium connectors anytime from the **Connector Hub**. Tracks without integrations will use form-based input so signals and playbooks still work.",
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
    pushMessage({ role: "user", text: "Start my journey →" });
    setTimeout(onComplete, 600);
  }, [disableLastChips, onComplete, pushMessage]);

  // ── Input handler ─────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const val = inputValue.trim();
    if (!val || processingRef.current) return;
    setInputValue("");

    if (step === "company-name") {
      handleCompanyNameSubmit(val);
    } else if (step === "profile-description") {
      handleProfileDescriptionSubmit(val);
    } else if (step === "profile-more-details") {
      handleMoreDetailsSubmit(val);
    } else if (step === "crunchbase-url") {
      handleCrunchbaseUrlSubmit(val);
    }
  }, [handleCompanyNameSubmit, handleCrunchbaseUrlSubmit, handleMoreDetailsSubmit, handleProfileDescriptionSubmit, inputValue, step]);

  const handleChipClick = useCallback((value: string) => {
    if (processingRef.current) return;
    if (step === "company-confirm") handleCompanyConfirm(value);
    else if (step === "profile-description") handleProfileDescriptionChoice(value);
    else if (step === "profile-more-details") handleMoreDetailsChoice(value);
    else if (step === "domain-claim") handleDomainClaim();
    else if (step === "crunchbase-url" && value === "no-crunchbase-account") {
      disableLastChips();
      pushMessage({ role: "user", text: "No Crunchbase account" });
      showManualFuelProfileForm();
    }
    else if (step === "crunchbase-confirm") handleCrunchbaseConfirm(value);
    else if (step === "york-services") handleYorkServicesResponse(value as "york-yes" | "york-skip");
    else if (step === "york-link") handleYorkLinkResponse(value);
    else if (step === "platform-overview") handleLaunch();
  }, [disableLastChips, handleCompanyConfirm, handleCrunchbaseConfirm, handleDomainClaim, handleLaunch, handleMoreDetailsChoice, handleProfileDescriptionChoice, handleYorkLinkResponse, handleYorkServicesResponse, pushMessage, showManualFuelProfileForm, step]);

  const inputActive = step === "company-name" || step === "profile-description" || step === "profile-more-details" || step === "crunchbase-url";
  const userInitial = (userData.email || userData.companyName || "U").trim().charAt(0).toUpperCase();

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
        .fuel-msg {
          width: 100%;
          animation: fuelFadeUp 0.3s ease both;
          border: none;
          border-image: none;
        }
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
            <span style={{ fontSize: 12, color: "#6F8798", fontWeight: 500 }}>by York IE</span>
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
              <div style={{ width: "100%", margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>

                {messages.map(msg => (
                  <div key={msg.id} className="fuel-msg" style={{
                    display: "flex",
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                    alignItems: "flex-start", gap: 10,
                  }}>
                    {msg.role === "ai" && <AIAvatar />}
                    {msg.role === "user" && <UserAvatar initial={userInitial} />}

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
                          initialMode={msg.cardMode}
                          sourceLabel={msg.cardLabel}
                        />
                      )}
                      {msg.cardType === "profile-form" && userData.crunchbaseData && (
                        <ProfileFormCard
                          data={userData.crunchbaseData}
                          businessModel={userData.businessModel}
                          notes={userData.profileNotes}
                          domain={userData.verifiedDomain || inferredDomain}
                          onSubmit={handleProfileFormSubmit}
                        />
                      )}
                      {msg.cardType === "business-model" && (
                        <BusinessModelCard selected={userData.businessModel} onSelect={handleBusinessModelSelect} />
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
                      {msg.cardType === "york-projects" && (
                        <YorkProjectsCard onContinue={() => handleYorkLinkResponse("projects")} />
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
                                York IE will be in touch shortly to match you with the right team.<br />Current Updates is set up and waiting.
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
                  step === "company-name" ? "Enter your company name..."
                  : step === "profile-description" ? "Describe what your company does..."
                  : step === "profile-more-details" ? "Add company details..."
                  : step === "crunchbase-url" ? "Paste your Crunchbase profile URL..."
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
                  color: inputActive && inputValue.trim() ? "#0a1a12" : "#6F8798",
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
                      {done ? <span style={{ color: "#3DD68C" }}>✓</span> : <span style={{ color: "#6F8798" }}>○</span>}
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: done ? "#3DD68C" : current ? "#8FA99A" : "#6F8798",
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
                      fontSize: 12, color: stageReached && i === 0 ? "#8FA99A" : "#6F8798",
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
              <div style={{ fontSize: 11, fontWeight: 700, color: "#3DD68C", marginBottom: 4 }}>⚡ Connector Hub</div>
              <div style={{ fontSize: 11, color: "#556878", lineHeight: 1.5 }}>
                Add integrations and premium connectors anytime from the Connector Hub in your workspace.
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
