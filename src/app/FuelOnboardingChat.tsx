import React, { useState, useEffect, useRef, useCallback } from "react";
import { fuel } from "./fuelTokens";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | "company-confirm" | "company-name"
  | "profile-description" | "profile-more-details" | "business-model" | "profile-intro" | "domain-claim"
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
  fuelHelp?: boolean;
  fuelHelpContent?: FuelHelpContent;
  valuePropItems?: ValuePropItem[];
  suggestedPlaybooks?: SuggestedPlaybook[];
  profileFormVisible?: boolean;
}

type FuelHelpSection = { label: string; items: string[] };

type FuelHelpContent = {
  label?: string;
  headline: string;
  summary?: string;
  items?: string[];
  sections?: FuelHelpSection[];
  teaser?: string;
};

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
  { id: "launchpad",  name: "Launchpad",        category: "Development", abbr: "LP", color: "#00B48A", york: true },
  { id: "pulse",      name: "Pulse",            category: "Development", abbr: "PL", color: "#00B48A", york: true },
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
  { id: "integrations", label: "Intelligence generation",    step: "platform-overview" },
  { id: "config",       label: "Your workspace config",      step: "done" },
];

const STAGE_ORDER: Step[] = [
  "company-confirm", "company-name",
  "profile-description", "business-model", "profile-more-details", "profile-intro", "domain-claim",
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

function scrollChatToElement(el: HTMLElement | null, offset = 24) {
  if (!el) return;
  requestAnimationFrame(() => {
    const chatScroll = el.closest("[data-fuel-chat-scroll]") as HTMLElement | null;
    if (!chatScroll) return;
    const elRect = el.getBoundingClientRect();
    const scrollRect = chatScroll.getBoundingClientRect();
    const top = chatScroll.scrollTop + (elRect.top - scrollRect.top) - offset;
    chatScroll.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#00B48A",
            animation: `fuelDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            display: "block",
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: "#8FA99A" }}>Fuel AI is thinking...</span>
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
    <div style={{ fontSize: 10, color: "#8FA99A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>
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
            fontSize: 14, fontWeight: 800, color: "#00B48A",
          }}>{fields.name.charAt(0)}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#F2F5F2" }}>{fields.name}</div>
            <div style={{ fontSize: 11, color: "#00B48A", marginTop: 1 }}>{fields.category}</div>
          </div>
          <div style={{
            marginLeft: "auto", fontSize: 10, background: "rgba(61,214,140,0.1)",
            color: "#00B48A", border: "1px solid rgba(61,214,140,0.2)",
            borderRadius: 4, padding: "2px 7px", fontWeight: 600,
          }}>{sourceLabel}</div>
        </div>
        <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
          {displayFields.map(({ label, value, full }) => (
            <div key={label} style={full ? { gridColumn: "1 / -1" } : {}}>
              <div style={{ fontSize: 10, color: "#8FA99A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, color: "#8FA99A", lineHeight: 1.4 }}>{value}</div>
            </div>
          ))}
        </div>
        {rounds.length > 0 && (
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ fontSize: 10, color: "#8FA99A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Funding rounds</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rounds.map(r => (
                <div key={r.id} style={{
                  display: "flex", gap: 8, alignItems: "center",
                  background: "#172632", border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 7, padding: "7px 10px",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8B76D4", minWidth: 70 }}>{r.type}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#00B48A", minWidth: 60 }}>{r.amount || "—"}</span>
                  {r.date && <span style={{ fontSize: 11, color: "#8FA99A" }}>{r.date}</span>}
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
              background: "rgba(61,214,140,0.08)", color: "#00B48A",
              border: "1px solid rgba(61,214,140,0.2)", borderRadius: 6,
              padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>+ Add round</button>
          </div>

          {rounds.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "16px",
              background: "#172632", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 8,
              fontSize: 12, color: "#8FA99A",
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
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#8FA99A", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</div>
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
          background: "transparent", color: "#8FA99A",
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
      <div style={{ fontSize: 10, fontWeight: 800, color: fuel.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
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
              <strong style={{ color: active ? "#F2F5F2" : "#F2F5F2", display: "block", fontSize: 12.5, lineHeight: 1.25 }}>
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
    color: "#F2F5F2",
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
      <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
        + Profile ready
      </div>
      <div style={{ color: "#F2F5F2", fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>
        Review your <span style={{ color: "#00B48A" }}>{companyName || "company"}</span> profile.
      </div>
      <div style={{ color: "#8FA99A", fontSize: 12, lineHeight: 1.45, marginBottom: 14 }}>
        The more accurate this is, the tighter your peer cohort. Garbage in, garbage out.
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
                  <strong style={{ color: active ? "#F2F5F2" : "#F2F5F2", display: "block", fontSize: 11.5, lineHeight: 1.25 }}>
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
                  color: "#00B48A",
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
          color: "#F2F5F2",
          fontSize: 11.5,
          lineHeight: 1.45,
          padding: "10px 12px",
        }}>
          We'll link <strong style={{ color: "#F2F5F2" }}>{domain}</strong> to your Fuel profile. Teammates can create their own profiles for the same company.
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
            Create my profile
          </button>
        ) : null}
      </div>
    </div>
  );
}

type BenchmarkValues = {
  arr: string;
  arrGrowth: string;
  nrr: string;
  logoRetention: string;
  monthlyBurn: string;
  cashOnHand: string;
  grossMargin: string;
  headcount: string;
  payingCustomers: string;
};

type BenchmarkWizardField = {
  key: keyof BenchmarkValues;
  label: string;
  prompt: string;
  promptHint?: string;
  placeholder: string;
  unit: "usd" | "percent" | "count";
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  bandStart: number;
  bandEnd: number;
  lowerIsBetter?: boolean;
};

const COHORT_MODELS = ["B2B SaaS", "Dev Tools", "Healthcare SaaS", "Fintech"];
const COHORT_STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Growth"];
const COHORT_REGIONS = ["US", "Europe", "Global"];

type CohortSelection = { model: string; stage: string; region: string };

function inferCohortFromProfile(profile: CrunchbaseData | null, businessModel = ""): CohortSelection {
  const fallback: CohortSelection = { model: "B2B SaaS", stage: "Seed", region: "US" };
  if (!profile) return fallback;

  const category = profile.category.toLowerCase();
  const modelText = businessModel.toLowerCase();
  let model = "B2B SaaS";
  if (modelText.includes("dev") || category.includes("dev tool")) model = "Dev Tools";
  else if (modelText.includes("health") || category.includes("health")) model = "Healthcare SaaS";
  else if (
    modelText.includes("fintech")
    || category.includes("fintech")
    || category.includes("payment")
    || category.includes("financ")
  ) model = "Fintech";

  const stageText = profile.stage.toLowerCase();
  let stage = "Seed";
  if (stageText.includes("pre-seed")) stage = "Pre-seed";
  else if (stageText.includes("series b")) stage = "Series B";
  else if (stageText.includes("series a")) stage = "Series A";
  else if (stageText.includes("growth")) stage = "Growth";
  else if (stageText.includes("seed")) stage = "Seed";

  const location = profile.location.toLowerCase();
  let region = "US";
  if (
    location.includes("europe")
    || location.includes("uk")
    || location.includes("ireland")
    || location.includes("germany")
    || location.includes("france")
  ) region = "Europe";
  else if (location.includes("global") || location.includes("apac") || location.includes("singapore")) region = "Global";

  return { model, stage, region };
}

const BENCHMARK_WIZARD_FIELDS: BenchmarkWizardField[] = [
  { key: "arr", label: "ARR", prompt: "ARR — what are you at?", promptHint: "(We'll add more metrics after. One at a time.)", placeholder: "500000", unit: "usd", p25: 150000, p50: 500000, p75: 1200000, p90: 2500000, bandStart: 6, bandEnd: 48 },
  { key: "arrGrowth", label: "ARR growth (YoY)", prompt: "How fast is ARR growing year over year?", placeholder: "120", unit: "percent", p25: 120, p50: 200, p75: 350, p90: 600, bandStart: 20, bandEnd: 58 },
  { key: "nrr", label: "Net revenue retention", prompt: "What does net revenue retention look like?", placeholder: "108", unit: "percent", p25: 95, p50: 108, p75: 125, p90: 145, bandStart: 66, bandEnd: 84 },
  { key: "logoRetention", label: "Logo retention", prompt: "What share of customers stayed over the last year?", placeholder: "88", unit: "percent", p25: 80, p50: 88, p75: 93, p90: 97, bandStart: 82, bandEnd: 96 },
  { key: "grossMargin", label: "Gross margin", prompt: "What's your blended gross margin?", placeholder: "72", unit: "percent", p25: 55, p50: 72, p75: 82, p90: 88, bandStart: 64, bandEnd: 92 },
  { key: "monthlyBurn", label: "Monthly net burn", prompt: "Roughly how much net cash are you burning each month?", placeholder: "80000", unit: "usd", p25: 40000, p50: 80000, p75: 180000, p90: 350000, bandStart: 12, bandEnd: 52, lowerIsBetter: true },
  { key: "cashOnHand", label: "Cash on hand", prompt: "How much runway fuel is in the bank today?", placeholder: "1500000", unit: "usd", p25: 500000, p50: 1500000, p75: 3000000, p90: 6000000, bandStart: 22, bandEnd: 50 },
  { key: "headcount", label: "Headcount (FTE)", prompt: "How many full-time people are on the team?", placeholder: "12", unit: "count", p25: 6, p50: 12, p75: 22, p90: 40, bandStart: 15, bandEnd: 55 },
  { key: "payingCustomers", label: "Paying customers", prompt: "Last one — how many paying customers do you have?", placeholder: "40", unit: "count", p25: 10, p50: 40, p75: 150, p90: 500, bandStart: 2, bandEnd: 30 },
];

const BENCHMARK_PERCENTILES = [
  { key: "p25" as const, label: "P25", title: "25th percentile — 25% of peers are at or below" },
  { key: "p50" as const, label: "P50", title: "Median — half the cohort is above, half below" },
  { key: "p75" as const, label: "P75", title: "75th percentile — top quartile" },
  { key: "p90" as const, label: "P90", title: "90th percentile — top 10%" },
];

function getBenchmarkPercentileValue(field: BenchmarkWizardField, key: typeof BENCHMARK_PERCENTILES[number]["key"]) {
  return formatBenchmarkDisplay(field[key], field.unit);
}

function BenchmarkPercentileHint() {
  return (
    <p style={{ color: fuel.textMuted, fontSize: 11, lineHeight: 1.45, margin: "8px 0 0" }}>
      P25–P90 = peer benchmarks · green band = cohort range · dot = you
    </p>
  );
}

function estimateValuePercentile(value: number, field: BenchmarkWizardField): number {
  const { p25, p50, p75, p90 } = field;
  const lerp = (val: number, lo: number, hi: number, pctLo: number, pctHi: number) => {
    if (hi === lo) return Math.round((pctLo + pctHi) / 2);
    const t = Math.min(1, Math.max(0, (val - lo) / (hi - lo)));
    return Math.round(pctLo + t * (pctHi - pctLo));
  };

  if (value <= p25) return Math.max(1, lerp(value, Math.max(0, p25 * 0.35), p25, 1, 25));
  if (value <= p50) return lerp(value, p25, p50, 25, 50);
  if (value <= p75) return lerp(value, p50, p75, 50, 75);
  if (value <= p90) return lerp(value, p75, p90, 75, 90);
  return Math.min(99, lerp(value, p90, p90 * 1.2, 90, 99));
}

function percentileMeaningSuffix(pct: number): string {
  if (pct <= 15) return "bottom of cohort";
  if (pct >= 85) return "top of cohort";
  return `${pct}% of peers at or below`;
}

function BenchmarkPercentileExplanation({
  field,
  value,
  compact = false,
}: {
  field: BenchmarkWizardField;
  value: number | null;
  compact?: boolean;
}) {
  const wrapStyle: React.CSSProperties = {
    alignItems: "baseline",
    color: fuel.text,
    display: "flex",
    flexWrap: "wrap",
    fontSize: compact ? 10.5 : 11,
    fontWeight: 600,
    gap: "4px 6px",
    lineHeight: 1.45,
    margin: compact ? "0 0 8px" : "0 0 10px",
  };

  if (value == null) {
    return (
      <div style={{ ...wrapStyle, color: fuel.textMuted, fontWeight: 500 }}>
        Type a number — dot shows where you land on the bar.
      </div>
    );
  }

  const pct = estimateValuePercentile(value, field);
  const display = formatBenchmarkDisplay(value, field.unit);

  return (
    <div style={wrapStyle}>
      <span style={{ fontSize: compact ? 12 : 13, fontWeight: 800 }}>{display}</span>
      <span style={{ color: fuel.textMuted, fontWeight: 500 }}>·</span>
      <span>{percentileMeaningSuffix(pct)}</span>
    </div>
  );
}

function BenchmarkPercentileScale({
  field,
  compact = false,
  highlightMedian = true,
}: {
  field: BenchmarkWizardField;
  compact?: boolean;
  highlightMedian?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: compact ? 4 : 6 }}>
      {BENCHMARK_PERCENTILES.map(bucket => {
        const isMedian = bucket.key === "p50";
        return (
          <div key={bucket.key} title={bucket.title}>
            <div style={{ color: isMedian && highlightMedian ? fuel.text : fuel.textMuted, fontSize: compact ? 9 : 10, fontWeight: 800 }}>
              {bucket.label}
            </div>
            <div style={{
              color: fuel.text,
              fontSize: compact ? 10.5 : 11.5,
              fontWeight: 700,
              marginTop: compact ? 2 : 3,
            }}>
              {getBenchmarkPercentileValue(field, bucket.key)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BenchmarkPercentileInline({ field }: { field: BenchmarkWizardField }) {
  return (
    <span
      style={{ color: "#8FA99A", fontSize: 10, lineHeight: 1.4 }}
      title="P25–P90 show where peers rank. P50 is the cohort median."
    >
      {BENCHMARK_PERCENTILES.map((bucket, index) => {
        const isMedian = bucket.key === "p50";
        return (
          <span key={bucket.key} title={bucket.title}>
            {bucket.label}{" "}
            {isMedian ? (
              <strong style={{ color: "#F2F5F2", fontWeight: 700 }}>{getBenchmarkPercentileValue(field, bucket.key)}</strong>
            ) : getBenchmarkPercentileValue(field, bucket.key)}
            {index < BENCHMARK_PERCENTILES.length - 1 ? " · " : null}
          </span>
        );
      })}
    </span>
  );
}

function parseBenchmarkNumber(raw: string): number | null {
  const cleaned = raw.replace(/[$,%x,\s]/gi, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function formatBenchmarkDisplay(value: number, unit: BenchmarkWizardField["unit"]) {
  if (unit === "usd") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
    return `$${value}`;
  }
  if (unit === "percent") return `${value}%`;
  return String(value);
}

function interpolateTrackPosition(
  value: number,
  valueLo: number,
  valueHi: number,
  posLo: number,
  posHi: number,
  useLog: boolean,
): number {
  if (valueLo === valueHi) return (posLo + posHi) / 2;
  let t: number;
  if (useLog && valueLo > 0 && valueHi > 0) {
    const logLo = Math.log10(Math.max(valueLo, 1));
    const logHi = Math.log10(Math.max(valueHi, 1));
    const logV = Math.log10(Math.max(value, 1));
    t = (logV - logLo) / Math.max(logHi - logLo, 0.001);
  } else {
    t = (value - valueLo) / Math.max(valueHi - valueLo, 0.001);
  }
  return posLo + Math.min(1, Math.max(0, t)) * (posHi - posLo);
}

function valueToMarkerPercent(value: number, field: BenchmarkWizardField) {
  const { p25, p50, p75, p90, bandStart, bandEnd, lowerIsBetter } = field;
  const useLog = field.unit === "usd" || field.unit === "count";
  const leftEdge = 2;
  const rightEdge = 98;
  const cohortSpan = bandEnd - bandStart;
  const p50Pos = bandStart + cohortSpan / 3;
  const p75Pos = bandStart + (2 * cohortSpan) / 3;
  const floor = useLog ? Math.max(1, p25 * 0.02) : Math.max(0, p25 * 0.35);
  const ceiling = useLog ? p90 * 2.5 : p90 * 1.2;

  if (lowerIsBetter) {
    if (value <= p25) return interpolateTrackPosition(value, floor, p25, leftEdge, bandStart, useLog);
    if (value <= p50) return interpolateTrackPosition(value, p25, p50, bandStart, p50Pos, useLog);
    if (value <= p75) return interpolateTrackPosition(value, p50, p75, p50Pos, p75Pos, useLog);
    if (value <= p90) return interpolateTrackPosition(value, p75, p90, p75Pos, bandEnd, useLog);
    return interpolateTrackPosition(value, p90, ceiling, bandEnd, rightEdge, useLog);
  }

  if (value <= p25) return interpolateTrackPosition(value, floor, p25, leftEdge, bandStart, useLog);
  if (value <= p50) return interpolateTrackPosition(value, p25, p50, bandStart, p50Pos, useLog);
  if (value <= p75) return interpolateTrackPosition(value, p50, p75, p50Pos, p75Pos, useLog);
  if (value <= p90) return interpolateTrackPosition(value, p75, p90, p75Pos, bandEnd, useLog);
  return interpolateTrackPosition(value, p90, ceiling, bandEnd, rightEdge, useLog);
}

function BenchmarkCohortTrack({
  field,
  marker,
  animate = false,
  compact = false,
}: {
  field: BenchmarkWizardField;
  marker: number | null;
  animate?: boolean;
  compact?: boolean;
}) {
  const barHeight = compact ? 8 : 12;
  const outsideCohort = marker != null && (marker < field.bandStart || marker > field.bandEnd);

  return (
    <div style={{
      background: "#07131C",
      borderRadius: 999,
      height: barHeight,
      marginBottom: compact ? 6 : 10,
      overflow: "visible",
      position: "relative",
    }}>
      <div
        title="P25–P90 — where most of your peer cohort falls"
        style={{
          background: "linear-gradient(90deg, rgba(0,180,138,0.25), rgba(0,180,138,0.85))",
          borderRadius: 999,
          height: "100%",
          left: `${field.bandStart}%`,
          position: "absolute",
          width: `${Math.max(4, field.bandEnd - field.bandStart)}%`,
        }}
      />
      {marker != null ? (
        <>
          <div style={{
            background: outsideCohort ? "#F2F5F2" : "#00B48A",
            borderRadius: "50%",
            boxShadow: animate
              ? "0 0 0 6px rgba(0,180,138,0.25), 0 0 18px rgba(0,180,138,0.55)"
              : outsideCohort
                ? "0 0 10px rgba(242,245,242,0.35)"
                : "0 0 12px rgba(0,180,138,0.45)",
            height: compact ? 12 : 16,
            left: `calc(${marker}% - ${compact ? 6 : 8}px)`,
            position: "absolute",
            top: compact ? -2 : -2,
            transition: "left 0.55s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.35s ease",
            width: compact ? 12 : 16,
          }} />
          <div style={{
            background: "#F2F5F2",
            height: compact ? 14 : 18,
            left: `${marker}%`,
            position: "absolute",
            top: compact ? -3 : -3,
            transition: "left 0.55s cubic-bezier(0.34, 1.2, 0.64, 1)",
            width: 2,
          }} />
        </>
      ) : null}
    </div>
  );
}

function getBenchmarkTier(value: number, field: BenchmarkWizardField) {
  const { p25, p50, p75, p90, lowerIsBetter } = field;
  if (lowerIsBetter) {
    if (value <= p25) return "top";
    if (value <= p50) return "upper";
    if (value <= p75) return "mid";
    if (value <= p90) return "lower";
    return "bottom";
  }
  if (value >= p90) return "top";
  if (value >= p75) return "upper";
  if (value >= p50) return "mid";
  if (value >= p25) return "lower";
  return "bottom";
}

function getBenchmarkInsight(field: BenchmarkWizardField, value: number) {
  const tier = getBenchmarkTier(value, field);
  const tierLabel = {
    top: "Top quartile",
    upper: "Above median",
    mid: "Around median",
    lower: "Below median",
    bottom: "Bottom quartile",
  }[tier];
  const hooks: Partial<Record<keyof BenchmarkValues, Record<string, { headline: string; detail: string }>>> = {
    arr: {
      top: { headline: "You're playing with the leaders.", detail: "Strong revenue base — let's see if growth and retention match the scale." },
      upper: { headline: "Solid traction.", detail: "You're ahead of most peers at this stage. Next: is the engine accelerating?" },
      mid: { headline: "Right in the pack.", detail: "Typical for your cohort — small moves in growth or retention can shift the story fast." },
      lower: { headline: "Room to climb.", detail: "Many breakout companies looked like this before they found repeatability." },
      bottom: { headline: "Early innings — and that's the point.", detail: "Fuel tracks movement quarter over quarter so you see progress, not just a snapshot." },
    },
    arrGrowth: {
      top: { headline: "Hypergrowth territory.", detail: "Retention and efficiency usually decide whether this holds — let's check those next." },
      upper: { headline: "Growth is working.", detail: "You're outpacing most peers. The question is whether it's efficient." },
      mid: { headline: "Steady climb.", detail: "Consistent growth here often beats volatile spikes — let's see the rest of the picture." },
      lower: { headline: "Growth is the lever.", detail: "This is where playbooks and initiatives matter most — Fuel will surface the highest-impact moves." },
      bottom: { headline: "Flat or early.", detail: "Not uncommon pre-PMF — the next fields show whether the foundation is building." },
    },
    nrr: {
      top: { headline: "Customers are expanding.", detail: "Best-in-class retention — protect this as you scale GTM." },
      upper: { headline: "Healthy expansion motion.", detail: "You're keeping and growing accounts better than most." },
      mid: { headline: "Holding steady.", detail: "A point of NRR improvement often unlocks disproportionate valuation lift." },
      lower: { headline: "Leakage to watch.", detail: "Fuel flags retention drag early so you can act before it compounds." },
      bottom: { headline: "Retention is the story.", detail: "Fixing this usually beats adding new logos — we'll map the gap to playbooks." },
    },
    monthlyBurn: {
      top: { headline: "Capital-efficient.", detail: "You're burning less than most peers — runway is a strategic asset here." },
      upper: { headline: "Disciplined spend.", detail: "Efficient burn at this stage leaves room to invest when growth clicks." },
      mid: { headline: "Typical burn profile.", detail: "The ratio of burn to growth matters more than the absolute number." },
      lower: { headline: "Burn is elevated.", detail: "Not fatal — but runway math gets important. Cash on hand is up next." },
      bottom: { headline: "Heavy burn zone.", detail: "Visibility here is everything — let's see runway and margin next." },
    },
  };
  const fieldHook = hooks[field.key]?.[tier];
  return {
    tierLabel,
    headline: fieldHook?.headline ?? `${tierLabel} vs your cohort`,
    detail: fieldHook?.detail ?? `You're at ${formatBenchmarkDisplay(value, field.unit)} — Fuel will track how this moves each quarter.`,
  };
}

type BenchmarkSnapshot = {
  values: BenchmarkValues;
  cohort: CohortSelection;
  cohortLabel: string;
  journeyStage: string;
};

type ValuePropItem = { icon: string; title: string; desc: string };

type SuggestedPlaybook = {
  title: string;
  prompt: string;
  track: "Development" | "Marketing" | "RevOps" | "FinOps";
};

type BenchmarkAnalysis = {
  fuelHelpContent: FuelHelpContent;
  suggestedPlaybooks: SuggestedPlaybook[];
};

const STAGE_PLAYBOOKS: Record<string, SuggestedPlaybook[]> = {
  Idea: [
    { track: "Development", title: "Technical Architecture Readiness Review", prompt: "Validate integration points and build sequencing before the next milestone." },
    { track: "Marketing", title: "ICP Validation Sprint", prompt: "Test your ideal customer profile against real outreach signals." },
    { track: "RevOps", title: "CRM Hygiene Review", prompt: "Confirm lifecycle stages and required fields before reporting." },
  ],
  "Pre-Product": [
    { track: "Development", title: "Workflow Friction Review", prompt: "Identify where users slow down before the next design sprint." },
    { track: "Development", title: "Beta Feedback Prioritization", prompt: "Turn early usage patterns into the next release plan." },
    { track: "Marketing", title: "Website Conversion Review", prompt: "Review page intent, conversion paths, and analytics coverage." },
  ],
  "Pre-Revenue": [
    { track: "Development", title: "Beta Feedback Prioritization", prompt: "Turn early usage patterns into the next release plan." },
    { track: "Marketing", title: "ICP Validation Sprint", prompt: "Test the ICP against real outreach and conversion signals." },
    { track: "RevOps", title: "Pipeline Operating Rhythm", prompt: "Use stage movement and conversion gaps to guide weekly review." },
  ],
  "Early Revenue": [
    { track: "Marketing", title: "Repeatable GTM Motion", prompt: "Use customer patterns to shape the next scalable acquisition channel." },
    { track: "RevOps", title: "Pipeline Operating Rhythm", prompt: "Use stage movement and conversion gaps to guide weekly review." },
    { track: "Development", title: "Launch Signal Review", prompt: "Use adoption and support signals to define the next product iteration." },
  ],
  "Product-Market Fit": [
    { track: "Marketing", title: "Outbound Performance Review", prompt: "Compare messaging, personas, and reply quality before scaling volume." },
    { track: "RevOps", title: "Attribution Completion Plan", prompt: "Connect spend, source, and deal data before increasing GTM investment." },
    { track: "FinOps", title: "Runway & Burn Review", prompt: "Review burn ratio against growth to plan the next capital chapter." },
  ],
  Scaling: [
    { track: "Development", title: "Scale Readiness Check", prompt: "Review performance, observability, and backup confidence before expansion." },
    { track: "Marketing", title: "Repeatable GTM Motion", prompt: "Use customer patterns to shape the next scalable acquisition channel." },
    { track: "RevOps", title: "Pipeline Operating Rhythm", prompt: "Use stage movement and conversion gaps to guide weekly review." },
  ],
  "Market Leader": [
    { track: "Development", title: "Release Readiness Playbook", prompt: "Use quality signals to decide what is ready to ship next." },
    { track: "Marketing", title: "Outbound Performance Review", prompt: "Compare messaging, personas, and reply quality before scaling volume." },
    { track: "FinOps", title: "Board Readiness Review", prompt: "Prepare runway, forecast, and efficiency metrics for stakeholders." },
  ],
};

function suggestPlaybooksForStage(journeyStage: string): SuggestedPlaybook[] {
  return STAGE_PLAYBOOKS[journeyStage] ?? STAGE_PLAYBOOKS["Pre-Product"];
}

const STAGE_JOURNEY_MESSAGES: Record<string, string> = {
  Idea: "You're at **Stage 1: Idea** — problem identified, solution taking shape. Most companies at this stage are still figuring out who they're building for. Fuel helps you validate before you build.",
  "Pre-Product": "You're at **Stage 2: Pre-Product** — building MVP, pre-revenue. Based on your profile, not a guess.",
  "Pre-Revenue": "You're at **Stage 3: Pre-Revenue** — product is live, first users are in. The question now isn't whether it works. It's whether people will pay for it.",
  "Early Revenue": "You're at **Stage 4: Early Revenue** — customers are paying, signal is real. This is where most companies stall. Fuel tracks the metrics that tell you if you're building momentum or just activity.",
  "Product-Market Fit": "You're at **Stage 5: Product-Market Fit** — retention is holding, growth is repeatable. You've found something that works. Now it's about not breaking it while you scale.",
  Scaling: "You're at **Stage 6: Scaling** — rapid expansion, efficiency under pressure. Growth is the easy part to measure. Fuel watches the harder stuff — margin, burn, and retention as you add headcount.",
  "Market Leader": "You're at **Stage 7: Market Leader** — category dominance, defending the position. The benchmark shifts at this stage. Your peers aren't startups anymore. Fuel recalibrates your cohort accordingly.",
};

function getStageJourneyMessage(stage: string): string {
  return STAGE_JOURNEY_MESSAGES[stage] ?? STAGE_JOURNEY_MESSAGES["Pre-Product"];
}

type ScoredBenchmarkMetric = {
  field: BenchmarkWizardField;
  value: number;
  tier: ReturnType<typeof getBenchmarkTier>;
};

function getScoredBenchmarkMetrics(snapshot: BenchmarkSnapshot): ScoredBenchmarkMetric[] {
  const scored: ScoredBenchmarkMetric[] = [];
  for (const field of BENCHMARK_WIZARD_FIELDS) {
    const value = parseBenchmarkNumber(snapshot.values[field.key]);
    if (value == null) continue;
    scored.push({
      field,
      value,
      tier: getBenchmarkTier(value, field),
    });
  }
  return scored;
}

type KpiSnapshotMoment = {
  headline: string;
  strength: string;
  gaps: string;
};

function momentMetricLabel(field: BenchmarkWizardField): string {
  const labels: Partial<Record<keyof BenchmarkValues, string>> = {
    arr: "ARR",
    arrGrowth: "ARR growth",
    nrr: "NRR",
    logoRetention: "logo retention",
    grossMargin: "gross margin",
    monthlyBurn: "monthly burn",
    cashOnHand: "cash on hand",
    headcount: "headcount",
    payingCustomers: "paying customers",
  };
  return labels[field.key] ?? field.label;
}

function buildKpiSnapshotMoment(companyName: string, scored: ScoredBenchmarkMetric[]): KpiSnapshotMoment {
  const company = companyName || "your company";
  const headline = `Here's where **${company}** actually sits.`;

  if (!scored.length) {
    return {
      headline,
      strength: "Lock in your numbers above and Fuel will map you against real peers — not generic averages.",
      gaps: "Start with ARR. The rest of the picture builds from there.",
    };
  }

  const margin = metricRef(scored, "grossMargin");
  const burn = metricRef(scored, "monthlyBurn");
  const cash = metricRef(scored, "cashOnHand");
  const arr = metricRef(scored, "arr");
  const growth = metricRef(scored, "arrGrowth");
  const nrr = metricRef(scored, "nrr");
  const strong = scored.filter(entry => isStrongTier(entry.tier));
  const weak = scored.filter(entry => isWeakTier(entry.tier));

  let strength: string;
  if (margin && burn && isStrongTier(margin.tier) && isStrongTier(burn.tier)) {
    strength = "Strong margins, controlled burn — you're running leaner than most peers at your stage. That's not common. It means your growth decisions can be proactive, not defensive.";
  } else if (burn && cash && isStrongTier(burn.tier) && isStrongTier(cash.tier)) {
    strength = "You're spending carefully and sitting on solid cash reserves — both above P50 for your cohort. That runway gives you room to invest when you find what's working.";
  } else if (arr && growth && nrr && isStrongTier(arr.tier) && isStrongTier(growth.tier) && isStrongTier(nrr.tier)) {
    strength = "Revenue, growth, and retention all look strong compared to peers. You're in a rare spot at this stage — the focus shifts to doing it efficiently.";
  } else if (growth && nrr && isStrongTier(growth.tier) && isWeakTier(nrr.tier)) {
    strength = "Growth is outpacing retention — you're acquiring faster than you're keeping. Worth fixing expansion before pouring more into acquisition.";
  } else if (arr && growth && isWeakTier(arr.tier) && isStrongTier(growth.tier)) {
    strength = "Revenue is still early, but growth momentum is real — above P50 for your cohort. The question is whether it converts into durable ARR.";
  } else if (strong.length >= 2) {
    const names = strong.slice(0, 2).map(entry => momentMetricLabel(entry.field));
    strength = `You're ahead on **${names[0]}** and **${names[1]}** — both above P50 for your cohort. Worth protecting while you close the gaps.`;
  } else if (strong.length === 1) {
    strength = `**${momentMetricLabel(strong[0].field)}** is a bright spot — above P50 for your cohort. Build from what's working.`;
  } else {
    strength = "You're in the thick of it with peers at your stage — no single metric stands out yet. The table below shows exactly where you land on the curve.";
  }

  let gaps: string;
  if (weak.length >= 2) {
    const names = weak.slice(0, 2).map(entry => momentMetricLabel(entry.field));
    gaps = `The gaps worth paying attention to: **${names[0]}** and **${names[1]}** — both below P50 for your cohort. That's where Fuel focuses next.`;
  } else if (weak.length === 1) {
    gaps = `The main gap: **${momentMetricLabel(weak[0].field)}** — below P50 for your cohort. That's where Fuel focuses next.`;
  } else if (weak.length === 0 && strong.length >= Math.ceil(scored.length / 2)) {
    gaps = "No major gaps versus peers right now. Fuel will keep watching margin, burn, and retention as you scale.";
  } else {
    const watch = scored
      .filter(entry => entry.tier === "mid" || isWeakTier(entry.tier))
      .slice(0, 2)
      .map(entry => momentMetricLabel(entry.field));
    gaps = watch.length >= 2
      ? `Worth watching: **${watch[0]}** and **${watch[1]}** — around or below median. Small moves there could shift your position fast.`
      : "Nothing alarming versus peers — Fuel will flag drift before it becomes a pattern.";
  }

  return { headline, strength, gaps };
}

function isWeakTier(tier: ReturnType<typeof getBenchmarkTier>) {
  return tier === "lower" || tier === "bottom";
}

function isStrongTier(tier: ReturnType<typeof getBenchmarkTier>) {
  return tier === "top" || tier === "upper";
}

function metricRef(scored: { field: BenchmarkWizardField; value: number; tier: ReturnType<typeof getBenchmarkTier> }[], key: keyof BenchmarkValues) {
  return scored.find(entry => entry.field.key === key);
}

function peerPlain(tier: ReturnType<typeof getBenchmarkTier>): string {
  return {
    top: "among the best",
    upper: "above most peers",
    mid: "around typical",
    lower: "below most peers",
    bottom: "well below peers",
  }[tier];
}

function fmtShort(entry: { field: BenchmarkWizardField; value: number }) {
  return `**${entry.field.label}** (${formatBenchmarkDisplay(entry.value, entry.field.unit)})`;
}

function buildCompositeBenchmarkInsight(snapshot: BenchmarkSnapshot, scored: {
  field: BenchmarkWizardField;
  value: number;
  tier: ReturnType<typeof getBenchmarkTier>;
}[]): string {
  if (!scored.length) {
    return `Fill in your numbers above and Fuel will show how you compare to other **${snapshot.journeyStage}** companies.`;
  }

  const arr = metricRef(scored, "arr");
  const growth = metricRef(scored, "arrGrowth");
  const nrr = metricRef(scored, "nrr");
  const burn = metricRef(scored, "monthlyBurn");
  const cash = metricRef(scored, "cashOnHand");
  const margin = metricRef(scored, "grossMargin");
  const customers = metricRef(scored, "payingCustomers");

  const weakCount = scored.filter(entry => isWeakTier(entry.tier)).length;
  const strongCount = scored.filter(entry => isStrongTier(entry.tier)).length;
  const runwayMonths = burn && cash && burn.value > 0 ? Math.round(cash.value / burn.value) : null;

  if (growth && nrr && isStrongTier(growth.tier) && isWeakTier(nrr.tier)) {
    return `You're growing faster than you retain — ${fmtShort(growth)} is ${peerPlain(growth.tier)} while ${fmtShort(nrr)} is ${peerPlain(nrr.tier)}. Before spending more to acquire, it's worth fixing why customers don't stay or expand.`;
  }

  if (arr && growth && isWeakTier(arr.tier) && isStrongTier(growth.tier)) {
    return `Revenue is still small (${formatBenchmarkDisplay(arr.value, arr.field.unit)} ARR, ${peerPlain(arr.tier)}), but growth (${formatBenchmarkDisplay(growth.value, growth.field.unit)}) is ${peerPlain(growth.tier)}. Momentum is there — the question is whether it converts into durable revenue.`;
  }

  if (arr && growth && isWeakTier(arr.tier) && isWeakTier(growth.tier)) {
    return `Revenue (${formatBenchmarkDisplay(arr.value, arr.field.unit)}) and growth (${formatBenchmarkDisplay(growth.value, growth.field.unit)}) are both lower than most **${snapshot.journeyStage}** peers. That usually means finding one sales or GTM approach that works consistently — before trying to scale it.`;
  }

  if (nrr && arr && isStrongTier(nrr.tier) && isWeakTier(arr.tier)) {
    return `Customers who stay tend to expand — ${fmtShort(nrr)} is ${peerPlain(nrr.tier)} even though ${fmtShort(arr)} is ${peerPlain(arr.tier)}. The product seems to resonate; the next step is usually selling more effectively, not rebuilding the product.`;
  }

  if (burn && cash && isWeakTier(burn.tier) && isWeakTier(cash.tier)) {
    const runwayNote = runwayMonths != null ? ` At current burn, that's roughly **${runwayMonths} months** of runway.` : "";
    return `Burn is high and cash is low compared to peers.${runwayNote} Worth keeping an eye on efficiency before pushing harder on growth.`;
  }

  if (burn && cash && isStrongTier(burn.tier) && isStrongTier(cash.tier)) {
    return `You're spending carefully and have solid cash reserves — both ${peerPlain(burn.tier)} for peers. That gives you room to invest when you find what's working.`;
  }

  if (arr && growth && nrr && isStrongTier(arr.tier) && isStrongTier(growth.tier) && isStrongTier(nrr.tier)) {
    return `Revenue, growth, and retention all look strong compared to peers. You're in a good spot — the focus shifts to doing it efficiently (margin, burn, team size per dollar of revenue).`;
  }

  if (margin && burn && isStrongTier(margin.tier) && isStrongTier(burn.tier)) {
    return `Strong margins and controlled burn — you're running leaner than most peers. That means growth decisions can be proactive, not defensive.`;
  }

  if (customers && arr && isStrongTier(customers.tier) && isWeakTier(arr.tier)) {
    return `You have solid customer count (${formatBenchmarkDisplay(customers.value, customers.field.unit)}) but lower revenue (${formatBenchmarkDisplay(arr.value, arr.field.unit)}). The gap is often pricing or deal size — not lack of demand.`;
  }

  if (strongCount >= 3 && weakCount >= 2) {
    const strength = scored.filter(entry => isStrongTier(entry.tier)).slice(0, 2).map(e => e.field.label.toLowerCase()).join(" and ");
    const gap = scored.filter(entry => isWeakTier(entry.tier)).slice(0, 2).map(e => e.field.label.toLowerCase()).join(" and ");
    return `A mixed picture — ahead on **${strength}**, behind on **${gap}**. Fuel will focus playbooks on the gaps without losing sight of what's already working.`;
  }

  if (strongCount >= Math.ceil(scored.length / 2)) {
    const leaders = scored.filter(entry => isStrongTier(entry.tier)).slice(0, 2).map(e => e.field.label.toLowerCase()).join(" and ");
    return `You're ahead of most peers on the numbers that matter — especially **${leaders}**. Keep compounding what's working.`;
  }

  if (weakCount >= Math.ceil(scored.length / 2)) {
    const gaps = scored.filter(entry => isWeakTier(entry.tier)).slice(0, 2).map(e => e.field.label.toLowerCase()).join(" and ");
    return `Several metrics sit below peers — **${gaps}** stand out most. The playbooks below target the fixes that usually move the needle first at **${snapshot.journeyStage}**.`;
  }

  const closest = [...scored].sort((a, b) => {
    const dist = (tier: ReturnType<typeof getBenchmarkTier>) => ({ top: 2, upper: 1, mid: 0, lower: 1, bottom: 2 }[tier]);
    return dist(a.tier) - dist(b.tier);
  })[0];
  return `You're close to typical for peers overall — **${closest.field.label.toLowerCase()}** is the nearest to the middle. Small improvements in growth or retention could shift your position quickly.`;
}

function analyzeBenchmarkSnapshot(snapshot: BenchmarkSnapshot): BenchmarkAnalysis {
  const scored = getScoredBenchmarkMetrics(snapshot);

  const strongCount = scored.filter(entry => isStrongTier(entry.tier)).length;
  const weakCount = scored.filter(entry => isWeakTier(entry.tier)).length;
  const headlineSuffix = scored.length
    ? weakCount > strongCount
      ? "room to grow"
      : strongCount > weakCount
        ? "ahead of peers"
        : "on track"
    : "in progress";

  return {
    fuelHelpContent: {
      label: "What's next",
      headline: `${snapshot.journeyStage} · ${snapshot.cohortLabel} · ${headlineSuffix}`,
      summary: buildCompositeBenchmarkInsight(snapshot, scored),
    },
    suggestedPlaybooks: suggestPlaybooksForStage(snapshot.journeyStage).slice(0, 2),
  };
}

function buildFuelWorkspacePreviewContent(ctx: {
  companyName?: string;
  journeyStage?: string;
}): FuelHelpContent {
  const company = ctx.companyName || "Your company";
  const stage = ctx.journeyStage || "your stage";

  return {
    label: "What's in Fuel",
    headline: `${company} · ${stage}`,
    summary: "Your workspace is ready with:",
    items: [
      "**Data room** — upload pitch decks, investment notes, and documents; they become your sources",
      "**Pitch deck review** — get structured feedback and intelligence from decks in your data room",
      "**Intelligence** — signals and insights from your benchmark and data room sources",
      "**Research** — market and competitive context Fuel layers on your numbers",
      "**Fuel AI** — ask questions across your profile, benchmark, sources, and gaps",
      "**Playbooks** — AI runbooks using your numbers (see suggestions above)",
    ],
  };
}

function buildFuelHelpContent(
  stage: "benchmark-kickoff" | "business-model" | "tracks" | "integrations",
  ctx: { companyName?: string; businessModel?: string; companyStage?: string; cohortRegion?: string },
): FuelHelpContent {
  switch (stage) {
    case "benchmark-kickoff":
      return {
        headline: "Now for the good part.",
        summary: `You're benchmarked against **${ctx.companyStage || "your stage"}** companies in the **${ctx.cohortRegion || "US"}**.`,
        items: [
          "Add your headline number and watch where you land. No vanity metrics, no generic averages. Just your dot on the curve.",
        ],
      };
    case "business-model":
      return {
        headline: "Business model locked in",
        items: [
          `For **${ctx.businessModel || "your"}** companies, Fuel tracks the GTM, product, and finance signals that predict compounding or stalling.`,
        ],
      };
    case "tracks":
      return {
        headline: "Your four growth tracks",
        items: [
          "Fuel maps intelligence to Development, Marketing, RevOps, and FinOps — tied to the gaps in your benchmark.",
        ],
      };
    case "integrations":
      return {
        headline: "Connect your stack",
        items: [
          "Integrations feed Fuel the live data that turns benchmark gaps into actionable intelligence.",
        ],
      };
    default:
      return { headline: "How Fuel helps", items: ["Fuel turns your operating data into intelligence and action."] };
  }
}

function renderBoldText(text: string, color = fuel.text) {
  return text.split("**").map((part, i) =>
    i % 2 === 0
      ? <span key={i}>{part}</span>
      : <strong key={i} style={{ color, fontWeight: 700 }}>{part}</strong>,
  );
}

function KpiSnapshotMoment({ moment, embedded = false }: { moment: KpiSnapshotMoment; embedded?: boolean }) {
  if (embedded) {
    return (
      <>
        <div style={{ color: "#F2F5F2", fontSize: 15, fontWeight: 700, lineHeight: 1.45, marginBottom: 8 }}>
          {renderBoldText(moment.headline)}
        </div>
        <p style={{ color: fuel.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 8px" }}>
          {renderBoldText(moment.strength)}
        </p>
        <p style={{ color: fuel.textMuted, fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>
          {renderBoldText(moment.gaps)}
        </p>
      </>
    );
  }

  return (
    <div style={{
      background: fuel.surface,
      border: `1px solid ${fuel.border}`,
      borderRadius: 12,
      padding: "16px 18px",
    }}>
      <div style={{ color: fuel.textMuted, fontSize: 9.5, fontWeight: 900, letterSpacing: "0.12em", marginBottom: 10, textTransform: "uppercase" }}>
        Fuel
      </div>
      <div style={{ color: fuel.text, fontSize: 17, fontWeight: 800, lineHeight: 1.35, marginBottom: 10 }}>
        {renderBoldText(moment.headline)}
      </div>
      <div style={{ color: fuel.text, fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
        {renderBoldText(moment.strength)}
      </div>
      <div style={{ color: fuel.textMuted, fontSize: 12.5, lineHeight: 1.55 }}>
        {renderBoldText(moment.gaps)}
      </div>
    </div>
  );
}

function FuelHelpBubble({
  content,
  playbooks,
}: {
  content: FuelHelpContent;
  playbooks?: SuggestedPlaybook[];
}) {
  const trackColors: Record<SuggestedPlaybook["track"], string> = {
    Development: "#00B48A",
    Marketing: "#2BB8A0",
    RevOps: "#D4924A",
    FinOps: "#8B76D4",
  };

  return (
    <div style={{
      background: fuel.surface,
      border: `1px solid ${fuel.border}`,
      borderRadius: "4px 12px 12px 12px",
      padding: "14px 16px",
    }}>
      <div style={{ color: fuel.textMuted, fontSize: 9.5, fontWeight: 900, letterSpacing: "0.12em", marginBottom: 8, textTransform: "uppercase" }}>
        {content.label ?? "How Fuel helps"}
      </div>
      <div style={{ color: fuel.text, fontSize: 15, fontWeight: 800, lineHeight: 1.35, marginBottom: content.summary || content.items?.length || content.sections?.length || playbooks?.length ? 8 : 0 }}>
        {content.headline}
      </div>
      {content.summary ? (
        <div style={{ color: fuel.textMuted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>{renderBoldText(content.summary)}</div>
      ) : null}
      {content.items?.map(item => (
        <div key={item} style={{ color: fuel.text, fontSize: 12.5, lineHeight: 1.55, marginBottom: 5, paddingLeft: 12, position: "relative" }}>
          <span style={{ color: fuel.textMuted, left: 0, position: "absolute" }}>·</span>
          {renderBoldText(item)}
        </div>
      ))}
      {content.sections?.map(section => (
        <div key={section.label} style={{ marginTop: content.items?.length ? 10 : 0 }}>
          <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 4, textTransform: "uppercase" }}>
            {section.label}
          </div>
          {section.items.map(item => (
            <div key={item} style={{ color: fuel.text, fontSize: 12, lineHeight: 1.45, marginBottom: 3, paddingLeft: 12, position: "relative" }}>
              <span style={{ color: fuel.textMuted, left: 0, position: "absolute" }}>·</span>
              {renderBoldText(item)}
            </div>
          ))}
        </div>
      ))}
      {playbooks?.length ? (
        <div style={{ borderTop: `1px solid ${fuel.border}`, marginTop: 12, paddingTop: 12 }}>
          <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 8, textTransform: "uppercase" }}>
            Try these first
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {playbooks.map((playbook, index) => (
              <div key={playbook.title} style={{
                background: "rgba(11,23,32,0.55)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                display: "flex",
                gap: 10,
                padding: 10,
              }}>
                <div style={{
                  alignItems: "center",
                  background: `${trackColors[playbook.track]}22`,
                  borderRadius: 6,
                  color: trackColors[playbook.track],
                  display: "flex",
                  flexShrink: 0,
                  fontSize: 10,
                  fontWeight: 900,
                  height: 24,
                  justifyContent: "center",
                  width: 24,
                }}>
                  {index + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 3 }}>
                    <strong style={{ color: "#F2F5F2", fontSize: 12 }}>{playbook.title}</strong>
                    <span style={{
                      background: `${trackColors[playbook.track]}18`,
                      border: `1px solid ${trackColors[playbook.track]}33`,
                      borderRadius: 999,
                      color: trackColors[playbook.track],
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "1px 6px",
                    }}>
                      {playbook.track}
                    </span>
                  </div>
                  <p style={{ color: "#8FA99A", fontSize: 11.5, lineHeight: 1.45, margin: 0 }}>{playbook.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {content.teaser ? (
        <div style={{
          borderTop: "1px solid rgba(0,180,138,0.14)",
          color: "#F2F5F2",
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: "0.02em",
          marginTop: 10,
          paddingTop: 10,
        }}>
          {content.teaser}
        </div>
      ) : null}
    </div>
  );
}

function BenchmarkInsightCallout({
  insight,
  animate = false,
  compact = false,
}: {
  insight: ReturnType<typeof getBenchmarkInsight>;
  animate?: boolean;
  compact?: boolean;
}) {
  return (
    <div style={{
      animation: animate ? "benchmarkInsightIn 0.45s ease" : undefined,
      background: "rgba(0,180,138,0.08)",
      border: "1px solid rgba(0,180,138,0.16)",
      borderRadius: compact ? 8 : 10,
      marginTop: compact ? 8 : 0,
      padding: compact ? "8px 10px" : "10px 12px",
    }}>
      <strong style={{ color: "#F2F5F2", display: "block", fontSize: compact ? 11.5 : 12.5, marginBottom: compact ? 2 : 4 }}>
        {insight.headline}
      </strong>
      <span style={{ color: "#8FA99A", fontSize: compact ? 10.5 : 11.5, lineHeight: 1.45 }}>{insight.detail}</span>
    </div>
  );
}

function LiveBenchmarkBar({
  field,
  value,
  animate,
  compact = false,
}: {
  field: BenchmarkWizardField;
  value: number | null;
  animate: boolean;
  compact?: boolean;
}) {
  const marker = value != null ? valueToMarkerPercent(value, field) : null;
  const insight = value != null ? getBenchmarkInsight(field, value) : null;

  return (
    <div style={{
      background: compact ? "rgba(11,23,32,0.55)" : "linear-gradient(180deg, rgba(11,23,32,0.95) 0%, rgba(15,30,40,0.85) 100%)",
      border: "1px solid rgba(0,180,138,0.18)",
      borderRadius: compact ? 10 : 12,
      padding: compact ? 12 : 16,
    }}>
      {!compact ? (
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ color: "#8FA99A", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {field.label} · cohort distribution
          </span>
          {insight ? (
            <span style={{
              background: "rgba(0,180,138,0.12)",
              border: "1px solid rgba(0,180,138,0.28)",
              borderRadius: 999,
              color: "#F2F5F2",
              fontSize: 10,
              fontWeight: 800,
              padding: "3px 9px",
            }}>
              {insight.tierLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      <BenchmarkPercentileExplanation compact={compact} field={field} value={value} />
      <BenchmarkCohortTrack animate={animate} compact={compact} field={field} marker={marker} />
      <div style={{ marginBottom: insight && !compact ? 12 : 0, marginTop: compact ? 6 : 8 }}>
        <BenchmarkPercentileScale compact={compact} field={field} />
      </div>
      {insight ? (
        <BenchmarkInsightCallout animate={animate} compact={compact} insight={insight} />
      ) : null}
    </div>
  );
}

function LockedBenchmarkRow({
  field,
  value,
  onEdit,
  editButtonStyle,
}: {
  field: BenchmarkWizardField;
  value: number;
  onEdit: () => void;
  editButtonStyle: React.CSSProperties;
}) {
  const insight = getBenchmarkInsight(field, value);
  const marker = valueToMarkerPercent(value, field);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 0" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 8, marginBottom: 6 }}>
        <span style={{ color: "#F2F5F2", flex: 1, fontSize: 12, fontWeight: 700, minWidth: 0 }}>{field.label}</span>
        <strong style={{ color: "#00B48A", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>
          {formatBenchmarkDisplay(value, field.unit)}
        </strong>
        <span style={{
          background: "rgba(0,180,138,0.1)",
          border: "1px solid rgba(0,180,138,0.2)",
          borderRadius: 999,
          color: "#F2F5F2",
          fontSize: 9.5,
          fontWeight: 800,
          padding: "2px 7px",
          whiteSpace: "nowrap",
        }}>
          {insight.tierLabel}
        </span>
        <button type="button" aria-label={`Edit ${field.label}`} onClick={onEdit} style={{ ...editButtonStyle, height: 24, width: 24, fontSize: 11 }}>
          ✎
        </button>
      </div>
      <BenchmarkPercentileExplanation compact field={field} value={value} />
      <BenchmarkCohortTrack compact field={field} marker={marker} />
      <div style={{ marginBottom: 6, marginTop: 6 }}>
        <BenchmarkPercentileInline field={field} />
      </div>
      <BenchmarkInsightCallout compact insight={insight} />
    </div>
  );
}

function BenchmarkCard({
  onSnapshotChange,
  profile = null,
  businessModel = "",
  companyName = "",
}: {
  onSnapshotChange?: (snapshot: BenchmarkSnapshot, options?: { initial?: boolean }) => void;
  profile?: CrunchbaseData | null;
  businessModel?: string;
  companyName?: string;
}) {
  const inferredCohort = React.useMemo(
    () => inferCohortFromProfile(profile, businessModel),
    [profile, businessModel],
  );
  const [mode, setMode] = React.useState<"entry" | "loading" | "results">("entry");
  const [entryFlow, setEntryFlow] = React.useState<"wizard" | "edit-one">("wizard");
  const [editingFieldIndex, setEditingFieldIndex] = React.useState<number | null>(null);
  const [completedCount, setCompletedCount] = React.useState(0);
  const [pulseKey, setPulseKey] = React.useState<string | null>(null);
  const [cohortEditing, setCohortEditing] = React.useState(false);
  const [selectedJourneyStage, setSelectedJourneyStage] = React.useState("Pre-Product");
  const [cohort, setCohort] = React.useState<CohortSelection>(inferredCohort);
  const [benchmarkValues, setBenchmarkValues] = React.useState<BenchmarkValues>({
    arr: "",
    arrGrowth: "",
    nrr: "",
    logoRetention: "",
    monthlyBurn: "",
    cashOnHand: "",
    grossMargin: "",
    headcount: "",
    payingCustomers: "",
  });

  React.useEffect(() => {
    setCohort(inferredCohort);
  }, [inferredCohort]);

  const cohortLabel = `${cohort.model} · ${cohort.stage} · ${cohort.region}`;

  const buildSnapshot = React.useCallback((): BenchmarkSnapshot => ({
    values: benchmarkValues,
    cohort,
    cohortLabel,
    journeyStage: selectedJourneyStage,
  }), [benchmarkValues, cohort, cohortLabel, selectedJourneyStage]);

  const snapshotSyncedRef = React.useRef(false);
  const prevStageRef = React.useRef(selectedJourneyStage);
  React.useEffect(() => {
    if (mode !== "results") {
      snapshotSyncedRef.current = false;
      return;
    }
    const snapshot = buildSnapshot();
    if (!snapshotSyncedRef.current) {
      snapshotSyncedRef.current = true;
      prevStageRef.current = selectedJourneyStage;
      onSnapshotChange?.(snapshot, { initial: true });
      return;
    }
    if (prevStageRef.current !== selectedJourneyStage) {
      prevStageRef.current = selectedJourneyStage;
      onSnapshotChange?.(snapshot);
    }
  }, [buildSnapshot, mode, onSnapshotChange, selectedJourneyStage]);

  const isSingleFieldEdit = entryFlow === "edit-one" && editingFieldIndex !== null;
  const isEditBrowse = entryFlow === "edit-one" && editingFieldIndex === null;
  const activeField = isSingleFieldEdit
    ? BENCHMARK_WIZARD_FIELDS[editingFieldIndex]
    : BENCHMARK_WIZARD_FIELDS[completedCount];
  const activeRaw = activeField ? benchmarkValues[activeField.key] : "";
  const activeValue = activeField ? parseBenchmarkNumber(activeRaw) : null;
  const allComplete = entryFlow === "edit-one"
    ? editingFieldIndex === null && completedCount >= BENCHMARK_WIZARD_FIELDS.length
    : completedCount >= BENCHMARK_WIZARD_FIELDS.length;
  const showActiveEditor = Boolean(activeField) && (isSingleFieldEdit || !allComplete);
  const activeInputRef = React.useRef<HTMLInputElement>(null);
  const wizardEndRef = React.useRef<HTMLDivElement>(null);
  const journeyResultsRef = React.useRef<HTMLDivElement>(null);
  const resultsScrolledRef = React.useRef(false);

  const scrollWizardIntoView = React.useCallback(() => {
    requestAnimationFrame(() => {
      wizardEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      const chatScroll = wizardEndRef.current?.closest("[data-fuel-chat-scroll]") as HTMLElement | null;
      chatScroll?.scrollTo({ top: chatScroll.scrollHeight, behavior: "smooth" });
    });
  }, []);

  React.useEffect(() => {
    if (mode !== "results") {
      resultsScrolledRef.current = false;
      return;
    }
    if (resultsScrolledRef.current) return;
    resultsScrolledRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollChatToElement(journeyResultsRef.current);
      });
    });
  }, [mode]);

  React.useEffect(() => {
    if (mode !== "entry" || allComplete || isEditBrowse) return;
    scrollWizardIntoView();
    const timer = window.setTimeout(() => activeInputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [allComplete, completedCount, editingFieldIndex, isEditBrowse, mode, scrollWizardIntoView]);

  const journeyStages = [
    { stage: "Stage 1", title: "Idea", detail: "Problem identified", done: true },
    { stage: "Stage 2", title: "Pre-Product", detail: "Building MVP", active: true },
    { stage: "Stage 3", title: "Pre-Revenue", detail: "MVP live · first users" },
    { stage: "Stage 4", title: "Early Revenue", detail: "Paying customers" },
    { stage: "Stage 5", title: "Product-Market Fit", detail: "Repeatable growth" },
    { stage: "Stage 6", title: "Scaling", detail: "Rapid expansion" },
    { stage: "Stage 7", title: "Market Leader", detail: "Category dominance" },
  ];

  const kpiMoment = React.useMemo(() => {
    const scored = getScoredBenchmarkMetrics({
      values: benchmarkValues,
      cohort,
      cohortLabel,
      journeyStage: selectedJourneyStage,
    });
    return buildKpiSnapshotMoment(companyName || profile?.name || "", scored);
  }, [benchmarkValues, cohort, cohortLabel, companyName, profile?.name, selectedJourneyStage]);

  const resultRows = BENCHMARK_WIZARD_FIELDS.map(field => {
    const value = parseBenchmarkNumber(benchmarkValues[field.key]);
    return {
      field,
      group: ["arr", "arrGrowth", "nrr", "logoRetention", "payingCustomers"].includes(field.key) ? "GTM" : field.key === "headcount" ? "R&D" : "G&A",
      sub: field.key === "headcount" ? "Engineering + product" : ["arr", "arrGrowth", "nrr", "logoRetention", "payingCustomers"].includes(field.key) ? "Revenue + retention" : "Capital + efficiency",
      label: field.label,
      start: field.bandStart,
      end: field.bandEnd,
      value,
      marker: value != null ? valueToMarkerPercent(value, field) : null,
      filled: value != null,
    };
  });

  function updateFieldValue(key: keyof BenchmarkValues, value: string) {
    setBenchmarkValues(current => ({ ...current, [key]: value }));
    setPulseKey(key);
    window.setTimeout(() => setPulseKey(null), 650);
  }

  function confirmActiveField() {
    if (!activeField || activeValue == null) return;

    if (isSingleFieldEdit) {
      setEditingFieldIndex(null);
      setCompletedCount(BENCHMARK_WIZARD_FIELDS.length);
      setMode("results");
      onSnapshotChange?.(buildSnapshot());
      setPulseKey(null);
      return;
    }

    const nextCount = completedCount + 1;
    setCompletedCount(nextCount);
    setPulseKey(null);
    if (nextCount >= BENCHMARK_WIZARD_FIELDS.length) {
      setMode("loading");
      window.setTimeout(() => setMode("results"), 1400);
    }
  }

  function cancelSingleFieldEdit() {
    setEditingFieldIndex(null);
    setPulseKey(null);
    if (entryFlow === "edit-one") {
      setCompletedCount(BENCHMARK_WIZARD_FIELDS.length);
      setMode("results");
    }
  }

  function startFieldEdit(index: number) {
    setPulseKey(null);
    if (entryFlow === "edit-one") {
      setEditingFieldIndex(index);
      return;
    }
    setCompletedCount(index);
  }

  function finishEditBrowse() {
    setEditingFieldIndex(null);
    setEntryFlow("wizard");
    setMode("results");
  }

  const cardShell = (children: React.ReactNode) => (
    <div style={{
      background: "#1F3140",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12,
      marginTop: 4,
      overflow: "hidden",
      width: "100%",
    }}>
      {children}
    </div>
  );

  const editButtonStyle: React.CSSProperties = {
    alignItems: "center",
    background: "rgba(61,214,140,0.08)",
    border: "1px solid rgba(61,214,140,0.22)",
    borderRadius: 6,
    color: "#00B48A",
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    font: "inherit",
    fontSize: 12,
    fontWeight: 800,
    height: 28,
    justifyContent: "center",
    width: 28,
  };

  if (mode === "entry") {
    return cardShell(
      <>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px" }}>
          <div style={{ alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" }}>
            <div>
              <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                Your peer cohort
              </div>
              <div style={{ color: fuel.text, fontSize: 14, fontWeight: 800, lineHeight: 1.35 }}>
                {cohortLabel}
              </div>
              <div style={{ color: fuel.textMuted, fontSize: 11.5, lineHeight: 1.45, marginTop: 4 }}>
                Suggested from your profile — adjust if needed.
              </div>
            </div>
            <button type="button" onClick={() => setCohortEditing(current => !current)} style={{ ...editButtonStyle, width: "auto", padding: "0 10px", fontSize: 11 }}>
              {cohortEditing ? "Done" : "Change"}
            </button>
          </div>
          {cohortEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              {[
                { key: "model" as const, label: "Business model", options: COHORT_MODELS },
                { key: "stage" as const, label: "Stage", options: COHORT_STAGES },
                { key: "region" as const, label: "Region", options: COHORT_REGIONS },
              ].map(section => (
                <div key={section.key}>
                  <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>
                    {section.label}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {section.options.map(option => {
                      const active = cohort[section.key] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setCohort(current => ({ ...current, [section.key]: option }))}
                          style={{
                            background: active ? "rgba(0,180,138,0.14)" : "#0B1720",
                            border: active ? "1px solid rgba(0,180,138,0.55)" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 999,
                            color: active ? "#F2F5F2" : "#F2F5F2",
                            cursor: "pointer",
                            font: "inherit",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "5px 10px",
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {!cohortEditing ? <BenchmarkPercentileHint /> : null}
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px 16px 16px",
        }}>
          {isEditBrowse ? (
            <div style={{ alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ color: "#8FA99A", fontSize: 12, lineHeight: 1.45 }}>
                Tap ✎ on any metric to edit one field.
              </div>
              <button
                type="button"
                onClick={finishEditBrowse}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#F2F5F2",
                  cursor: "pointer",
                  flexShrink: 0,
                  font: "inherit",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "7px 12px",
                }}
              >
                Done
              </button>
            </div>
          ) : null}

          {(isEditBrowse ? BENCHMARK_WIZARD_FIELDS : BENCHMARK_WIZARD_FIELDS.slice(0, completedCount)).map((field, index) => {
            if (isSingleFieldEdit && index === editingFieldIndex) return null;
            const value = parseBenchmarkNumber(benchmarkValues[field.key]);
            if (value == null) return null;
            return (
              <LockedBenchmarkRow
                key={field.key}
                editButtonStyle={editButtonStyle}
                field={field}
                onEdit={() => startFieldEdit(index)}
                value={value}
              />
            );
          })}

          {showActiveEditor && activeField ? (
            <div style={{
              background: "rgba(0,180,138,0.06)",
              border: "1px solid rgba(0,180,138,0.22)",
              borderRadius: 10,
              marginTop: isSingleFieldEdit || completedCount > 0 ? 4 : 0,
              padding: 12,
            }}>
              <div style={{ color: "#F2F5F2", fontSize: 14, fontWeight: 800, lineHeight: 1.35, marginBottom: activeField.promptHint ? 6 : 10 }}>
                {activeField.prompt}
              </div>
              {activeField.promptHint ? (
                <div style={{ color: "#8FA99A", fontSize: 12, lineHeight: 1.45, marginBottom: 10 }}>
                  {activeField.promptHint}
                </div>
              ) : null}
              <div style={{ marginBottom: 10, position: "relative" }}>
                <input
                  ref={activeInputRef}
                  key={activeField.key}
                  autoFocus
                  value={activeRaw}
                  onChange={(event) => updateFieldValue(activeField.key, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && activeValue != null) confirmActiveField();
                  }}
                  placeholder={activeField.placeholder}
                  inputMode={activeField.unit === "percent" ? "decimal" : "numeric"}
                  style={{
                    background: "#0B1720",
                    border: "1px solid rgba(0,180,138,0.35)",
                    borderRadius: 10,
                    boxShadow: activeValue != null ? "0 0 0 1px rgba(0,180,138,0.12)" : "none",
                    color: "#F2F5F2",
                    font: "inherit",
                    fontSize: 18,
                    fontWeight: 800,
                    outline: "none",
                    padding: activeField.unit === "percent" ? "10px 36px 10px 12px" : "10px 12px",
                    width: "100%",
                  }}
                />
                {activeField.unit === "percent" ? (
                  <span style={{
                    color: "#8FA99A",
                    fontSize: 16,
                    fontWeight: 800,
                    pointerEvents: "none",
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}>
                    %
                  </span>
                ) : null}
              </div>
              <LiveBenchmarkBar
                compact
                field={activeField}
                value={activeValue}
                animate={pulseKey === activeField.key}
              />
              <div style={{ marginTop: 10 }}>
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <button
                    type="button"
                    disabled={activeValue == null}
                    onClick={confirmActiveField}
                    style={{
                      background: activeValue != null ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)" : "rgba(255,255,255,0.06)",
                      border: "none",
                      borderRadius: 8,
                      color: activeValue != null ? "#0a1a12" : "#8FA99A",
                      cursor: activeValue != null ? "pointer" : "not-allowed",
                      font: "inherit",
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "10px 18px",
                    }}
                  >
                    {isSingleFieldEdit
                      ? "Save →"
                      : completedCount >= BENCHMARK_WIZARD_FIELDS.length - 1
                        ? "See my full benchmark →"
                        : "Lock in & next →"}
                  </button>
                  {isSingleFieldEdit ? (
                    <button
                      type="button"
                      onClick={cancelSingleFieldEdit}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#8FA99A",
                        cursor: "pointer",
                        font: "inherit",
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "10px 4px",
                      }}
                    >
                      Cancel
                    </button>
                  ) : (
                    <span style={{ color: "#8FA99A", fontSize: 11.5 }}>
                      {completedCount + 1} of {BENCHMARK_WIZARD_FIELDS.length}
                    </span>
                  )}
                </div>
                {!isSingleFieldEdit && completedCount < BENCHMARK_WIZARD_FIELDS.length - 1 ? (
                  <div style={{ color: "#8FA99A", fontSize: 11.5, lineHeight: 1.45, marginTop: 8 }}>
                    {BENCHMARK_WIZARD_FIELDS.length - completedCount - 1} more metrics to go. Takes ~3 minutes.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div ref={wizardEndRef} />
        </div>
      </>,
    );
  }

  if (mode === "loading") {
    return (
      <div style={{
        background: "#1F3140", border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 12, marginTop: 4, padding: 20, textAlign: "center", width: "100%",
      }}>
        <div style={{ display: "inline-flex", gap: 4, marginBottom: 12 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 7, height: 7, borderRadius: "50%", background: "#00B48A",
              animation: `fuelDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              display: "block",
            }} />
          ))}
        </div>
        <div style={{ color: "#F2F5F2", fontSize: 14, fontWeight: 800 }}>Building your benchmark</div>
        <div style={{ color: "#8FA99A", fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>
          Plotting {cohortLabel} and locking in your intelligence.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4, width: "100%" }}>
      <div
        ref={journeyResultsRef}
        style={{
        background: "linear-gradient(135deg, #172632 0%, #10202B 100%)",
        border: "1px solid rgba(61,214,140,0.18)",
        borderRadius: 12,
        padding: 16,
      }}>
        <div style={{ alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
              Your startup journey
            </div>
            <div style={{ color: fuel.text, fontSize: 14, fontWeight: 500, lineHeight: 1.6, maxWidth: 560 }}>
              {renderBoldText(getStageJourneyMessage(selectedJourneyStage))}
            </div>
          </div>
          <span style={{
            background: "rgba(0,180,138,0.1)",
            border: "1px solid rgba(0,180,138,0.2)",
            borderRadius: 999,
            color: "#F2F5F2",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 10.5,
            fontWeight: 800,
            padding: "4px 10px",
            whiteSpace: "nowrap",
          }}>
            AI estimate · from profile
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
                  font: "inherit",
                  minHeight: 76,
                  padding: 10,
                  position: "relative",
                  textAlign: "left",
                }}
              >
                {isSelected ? <span style={{ color: "#00B48A", fontSize: 12, position: "absolute", right: 10, top: 8 }}>✓</span> : null}
                <div style={{ color: "#8FA99A", fontSize: 9.5, fontWeight: 900, letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>{item.stage}</div>
                <strong style={{ color: "#F2F5F2", display: "block", fontSize: 12, lineHeight: 1.25 }}>{item.title}</strong>
                <p style={{ color: "#8FA99A", fontSize: 10.5, lineHeight: 1.3, margin: "4px 0 0" }}>{item.detail}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{
        background: "#1F3140",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              KPI snapshot
            </div>
            <button
              type="button"
              title="Edit benchmark numbers"
              aria-label="Edit benchmark numbers"
              onClick={() => {
                setMode("entry");
                setEntryFlow("edit-one");
                setEditingFieldIndex(null);
                setCompletedCount(BENCHMARK_WIZARD_FIELDS.length);
              }}
              style={{
                alignItems: "center",
                background: "rgba(61,214,140,0.08)",
                border: "1px solid rgba(61,214,140,0.22)",
                borderRadius: 7,
                color: "#00B48A",
                cursor: "pointer",
                display: "inline-flex",
                flexShrink: 0,
                font: "inherit",
                fontSize: 11,
                fontWeight: 800,
                height: 28,
                justifyContent: "center",
                width: 32,
              }}
            >
              ✎
            </button>
          </div>
          <KpiSnapshotMoment moment={kpiMoment} embedded />
          <div style={{
            alignItems: "center",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            color: "#8FA99A",
            display: "flex",
            fontSize: 11,
            fontWeight: 600,
            justifyContent: "space-between",
            letterSpacing: "0.02em",
            marginTop: 16,
            padding: "10px 0 14px",
          }}>
            <span>{cohortLabel}</span>
            <span style={{ color: "#8FA99A", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 10.5 }}>n=147</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 20px 20px" }}>
          {resultRows.map((row, index) => {
            const showGroup = index === 0 || resultRows[index - 1].group !== row.group;
            return (
              <div key={row.label} style={{
                alignItems: "start",
                borderTop: showGroup && index > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                display: "grid",
                gap: 12,
                gridTemplateColumns: "92px minmax(0, 1fr)",
                paddingTop: showGroup && index > 0 ? 14 : 0,
              }}>
                <div style={{ paddingTop: showGroup ? 2 : 0 }}>
                  {showGroup ? (
                    <>
                      <div style={{ color: "#00B48A", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{row.group}</div>
                      <div style={{ color: "#8FA99A", fontSize: 10, lineHeight: 1.3, marginTop: 2 }}>{row.sub}</div>
                    </>
                  ) : null}
                </div>
                <div>
                  <div style={{ alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#F2F5F2", fontSize: 12, fontWeight: 700 }}>{row.label}</span>
                    <BenchmarkPercentileInline field={row.field} />
                  </div>
                  {row.value != null ? (
                    <BenchmarkPercentileExplanation compact field={row.field} value={row.value} />
                  ) : null}
                  <BenchmarkCohortTrack compact field={row.field} marker={row.marker} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function YorkServicesCard({ onChoice }: { onChoice: (v: "york-yes" | "york-skip") => void }) {
  const [chosen, setChosen] = React.useState(false);
  const tracks = [
    {
      label: "Development",
      color: "#00B48A",
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
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8FA99A", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5 }}>Fuel tracks</div>
              {t.tracked.map(item => (
                <div key={item} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
                  <span style={{ color: t.color, fontSize: 10, marginTop: 1, flexShrink: 0 }}>·</span>
                  <span style={{ fontSize: 11, color: "#8FA99A", lineHeight: 1.4 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{
              borderTop: `1px solid ${t.color}18`, paddingTop: 8,
              fontSize: 11, color: "#F2F5F2", lineHeight: 1.45, fontStyle: "italic",
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

function ValuePropCard({
  onContinue,
  items,
  headline = "How Fuel accelerates your journey",
}: {
  onContinue: () => void;
  items?: ValuePropItem[];
  headline?: string;
}) {
  const [clicked, setClicked] = React.useState(false);
  const defaultProps: ValuePropItem[] = [
    { icon: "⚡", title: "Real-time Intelligence", desc: "Surface what's moving across product, GTM, revenue, and finance — pulled from your integrations, market data, and a live context feed." },
    { icon: "📋", title: "Playbooks & Initiatives", desc: "Curated operating plays mapped to your stage. Know exactly what to do next — and track every initiative in one place." },
    { icon: "🔭", title: "Competitive Intelligence", desc: "Track competitors, identify whitespace, and stay ahead using Fuel's market data and intelligence layer." },
    { icon: "🤖", title: "Fuel AI", desc: "Research any company, dig into your startup infrastructure, and surface opportunities — built into your operating workflow." },
    { icon: "📊", title: "One Operating Command Center", desc: "Dev · Marketing · RevOps · FinOps — all in a single, unified view." },
  ];
  const props = items?.length ? items : defaultProps;
  return (
    <div style={{
      background: "#1F3140", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F2F5F2" }}>{headline}</div>
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
      summary: "Traffic, paid media, SEO, and campaign performance are available for demand and conversion intelligence generation.",
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
        <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", marginBottom: 5, textTransform: "uppercase" }}>
          York IE projects
        </div>
        <div style={{ color: "#F2F5F2", fontSize: 14, fontWeight: 800 }}>
          Active work Fuel will use for intelligence generation
        </div>
        <div style={{ color: "#8FA99A", fontSize: 12, lineHeight: 1.55, marginTop: 5 }}>
          Your York IE workspace is already connected, so Fuel can use these active projects, updates, and service context automatically. You can review detailed project updates anytime in Scorecard.
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
              <span style={{ color: "#00B48A", fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>{project.area}</span>
              <span style={{ background: "rgba(0,180,138,0.1)", border: "1px solid rgba(0,180,138,0.2)", borderRadius: 999, color: "#F2F5F2", fontSize: 10, fontWeight: 800, padding: "2px 7px" }}>
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
            Use these projects for intelligence →
          </button>
        </div>
      ) : null}
    </div>
  );
}

function WhyIntegrateCard({ onContinue }: { onContinue: () => void }) {
  const [dismissed, setDismissed] = React.useState(false);
  const reasons = [
    { icon: "📡", title: "Intelligence needs a source",        desc: "Without integrations, Fuel has no inputs — you're watching an empty dashboard." },
    { icon: "🎯", title: "Playbooks need context",       desc: "Fuel maps initiatives to what's actually moving in your data, not assumptions." },
    { icon: "⏱️", title: "Every week of lag compounds",  desc: "Most teams discover problems 4–6 weeks late. Integrations close that gap to hours." },
    { icon: "🏆", title: "P90 companies are instrumented", desc: "Better instincts don't explain the benchmark gap — better data does." },
  ];
  const categories = [
    { label: "Development", color: "#00B48A", integrations: ["Jira", "Linear", "Launchpad", "Pulse"] },
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
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8FA99A", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Available integrations</div>
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
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8FA99A", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{cat}</div>
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
                    <span style={{ fontSize: 11.5, color: isSelected ? "#00B48A" : "#8FA99A", fontWeight: isSelected ? 600 : 400 }}>{item.name}</span>
                    {"york" in item && item.york && (
                      <span style={{ fontSize: 9, color: "#00B48A", background: "rgba(61,214,140,0.1)", borderRadius: 3, padding: "1px 4px", fontWeight: 700 }}>York</span>
                    )}
                    {!("york" in item && item.york) && item.premium && (
                      <span style={{ fontSize: 9, color: "#D4924A", background: "rgba(212,146,74,0.1)", borderRadius: 3, padding: "1px 4px", fontWeight: 800 }}>Premium · ${item.addOnPrice}/mo</span>
                    )}
                    {!("york" in item && item.york) && !item.premium && (
                      <span style={{ fontSize: 9, color: "#00B48A", background: "rgba(61,214,140,0.1)", borderRadius: 3, padding: "1px 4px", fontWeight: 800 }}>Free</span>
                    )}
                    {isSelected && <span style={{ fontSize: 12, color: "#00B48A" }}>✓</span>}
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
          <span style={{ fontSize: 12, color: "#8FA99A" }}>You can add premium connectors anytime from the Connector Hub</span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export type OnboardingBenchmarkValues = BenchmarkValues;

export default function FuelOnboardingChat({ onComplete, onManual }: { onComplete: (benchmark: OnboardingBenchmarkValues | null) => void; onManual: () => void }) {
  const inferredCompanyName = inferCompanyNameFromEmail(LOGGED_IN_EMAIL);
  const inferredDomain = domainFromEmail(LOGGED_IN_EMAIL);
  const inferredProfile = inferredCompanyName
    ? (mockCrunchbase(inferredCompanyName) ?? starterFuelProfile(inferredCompanyName))
    : null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<Step>(inferredCompanyName ? "profile-intro" : "company-name");
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    email: LOGGED_IN_EMAIL,
    isYorkClient: checkIsYorkClient(LOGGED_IN_EMAIL),
    companyName: inferredCompanyName,
    crunchbaseData: inferredProfile,
    businessModel: "",
    profileNotes: "",
    verifiedDomain: inferredDomain,
    selectedIntegrations: [],
  });
  const [completedProgress, setCompletedProgress] = useState<Set<string>>(new Set());
  const [pendingIntegrations, setPendingIntegrations] = useState<string[]>([]);
  const [benchmarkContinued, setBenchmarkContinued] = useState(false);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const greetedRef = useRef(false);
  const benchmarkSnapshotMsgIdRef = useRef<string | null>(null);
  const benchmarkWorkspaceMsgIdRef = useRef<string | null>(null);
  const benchmarkClosingMsgIdRef = useRef<string | null>(null);
  const benchmarkJourneyStageRef = useRef("");
  const latestBenchmarkSnapshotRef = useRef<BenchmarkSnapshot | null>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (messages.length <= prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      return;
    }
    prevMessageCountRef.current = messages.length;
    const targetMsg = messages[messages.length - 1];

    // Benchmark results scroll is handled inside BenchmarkCard — don't jump to the fuel-help follow-up.
    if (targetMsg.id === benchmarkSnapshotMsgIdRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      const chatScroll = document.querySelector("[data-fuel-chat-scroll]") as HTMLElement | null;
      const el = chatScroll?.querySelector(`[data-message-id="${targetMsg.id}"]`) as HTMLElement | null;
      if (!el || !chatScroll) return;

      scrollChatToElement(el);
    });
  }, [messages]);

  const pushMessage = useCallback((msg: Omit<ChatMessage, "id"> & { id?: string }) => {
    setMessages(prev => [...prev, { ...msg, id: msg.id ?? uid() }]);
  }, []);

  const aiSay = useCallback((text: string, opts?: {
    chips?: ChatMessage["chips"];
    cardType?: ChatMessage["cardType"];
    cardMode?: ChatMessage["cardMode"];
    cardLabel?: ChatMessage["cardLabel"];
    fuelHelp?: boolean;
    valuePropItems?: ValuePropItem[];
    suggestedPlaybooks?: SuggestedPlaybook[];
    delay?: number;
  }): Promise<void> => {
    return new Promise(resolve => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        pushMessage({
          role: "ai",
          text,
          chips: opts?.chips,
          cardType: opts?.cardType,
          cardMode: opts?.cardMode,
          cardLabel: opts?.cardLabel,
          fuelHelp: opts?.fuelHelp,
          valuePropItems: opts?.valuePropItems,
          suggestedPlaybooks: opts?.suggestedPlaybooks,
        });
        resolve();
      }, opts?.delay ?? 900);
    });
  }, [pushMessage]);

  const pushFuelHelp = useCallback((content: FuelHelpContent) => {
    pushMessage({ role: "ai", text: "", fuelHelp: true, fuelHelpContent: content });
  }, [pushMessage]);

  const handleBenchmarkSnapshotChange = useCallback((snapshot: BenchmarkSnapshot, options?: { initial?: boolean }) => {
    latestBenchmarkSnapshotRef.current = snapshot;
    benchmarkJourneyStageRef.current = snapshot.journeyStage;
    const analysis = analyzeBenchmarkSnapshot(snapshot);

    if (benchmarkSnapshotMsgIdRef.current) {
      setMessages(prev => prev.map(m =>
        m.id === benchmarkSnapshotMsgIdRef.current
          ? { ...m, fuelHelpContent: analysis.fuelHelpContent, suggestedPlaybooks: analysis.suggestedPlaybooks }
          : m,
      ));
      return;
    }

    const postSnapshot = () => {
      const id = uid();
      benchmarkSnapshotMsgIdRef.current = id;
      pushMessage({
        role: "ai",
        id,
        text: "",
        fuelHelp: true,
        fuelHelpContent: analysis.fuelHelpContent,
        suggestedPlaybooks: analysis.suggestedPlaybooks,
      });
    };

    if (options?.initial) {
      setIsTyping(true);
      window.setTimeout(() => {
        setIsTyping(false);
        postSnapshot();
      }, 900);
    } else {
      postSnapshot();
    }
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
        text: `👋 Found you.\n\nYou're signed in as **${LOGGED_IN_EMAIL}** — so I pulled **${inferredCompanyName}** from your domain.\n\nBefore I can show you anything useful, I need 60 seconds of your time. Confirm what I found, fill in what I missed, and I'll build you a benchmark profile against real peers — not generic industry averages.`,
        chips: [{ label: "Review your profile →", value: "show-profile-form" }],
      });
      setStep("profile-intro");
    }, 500);
    return () => clearTimeout(t);
  }, [inferredCompanyName, pushMessage]);

  // ── Step handlers ────────────────────────────────────────────────────────────

  const continueToBenchmarks = useCallback(async () => {
    setCompletedProgress(prev => new Set([...prev, "profile"]));
    const cohort = inferCohortFromProfile(userData.crunchbaseData, userData.businessModel);
    pushFuelHelp(buildFuelHelpContent("benchmark-kickoff", {
      companyName: userData.companyName,
      companyStage: userData.crunchbaseData?.stage || cohort.stage,
      cohortRegion: cohort.region,
    }));
    await aiSay("", { delay: 600, cardType: "benchmark" });
    setStep("benchmark");
  }, [aiSay, pushFuelHelp, userData.businessModel, userData.companyName, userData.crunchbaseData]);

  const askBusinessModel = useCallback(async () => {
    await aiSay("Which business model best matches your company?", { delay: 500, cardType: "business-model" });
    setStep("business-model");
  }, [aiSay]);

  const askDomainClaim = useCallback(async () => {
    const domain = userData.verifiedDomain || inferredDomain;
    await aiSay(`We'll link **${domain}** to your Fuel profile. Others at your company can set up their own profiles to run signals independently.`, {
      delay: 600,
      chips: [{ label: "Create my profile", value: "claim-domain" }],
    });
    setStep("domain-claim");
  }, [aiSay, inferredDomain, userData.verifiedDomain]);

  const startProfileQuestionnaire = useCallback(async (companyName: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    const cb = mockCrunchbase(companyName) ?? starterFuelProfile(companyName);
    setUserData(prev => ({
      ...prev,
      companyName,
      crunchbaseData: cb,
      verifiedDomain: domainFromEmail(prev.email) || cb.website.replace(/^https?:\/\//, ""),
    }));

    await aiSay(
      `Got it. I'll pull what I can on **${companyName}** and build your benchmark profile against real peers — not generic industry averages.`,
      {
        delay: 500,
        chips: [{ label: "Review your profile →", value: "show-profile-form" }],
      },
    );
    setStep("profile-intro");
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
    pushFuelHelp(buildFuelHelpContent("business-model", { businessModel: selected.label }));
    await aiSay("Got it. Anything else Fuel should know before we set up your company profile?", {
      delay: 650,
      chips: [
        { label: "Add more details", value: "add-profile-details" },
        { label: "Continue", value: "skip-profile-details" },
      ],
    });
    setStep("profile-more-details");
    processingRef.current = false;
  }, [aiSay, pushFuelHelp, pushMessage]);

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

  const handleShowProfileForm = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;
    setMessages(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].role === "ai" && next[i].chips?.length) {
          next[i] = { ...next[i], disabled: true, chips: undefined };
          break;
        }
      }
      next.push({ role: "user", text: "Review my profile", id: uid() });
      next.push({ role: "ai", text: "", id: uid(), profileFormVisible: true });
      return next;
    });
    setStep("domain-claim");
    processingRef.current = false;
  }, []);

  const handleDomainClaim = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    disableLastChips();
    pushMessage({ role: "user", text: `Create profile for ${userData.verifiedDomain || inferredDomain}` });
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
    pushMessage({ role: "user", text: `Create profile for ${result.domain}` });
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
      await continueToBenchmarks();
    } else {
      pushMessage({ role: "user", text: "I need to update a few details" });
      await continueToBenchmarks();
    }
    processingRef.current = false;
  }, [continueToBenchmarks, disableLastChips, pushMessage]);

  const handleBenchmarkContinue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setBenchmarkContinued(true);
    setCompletedProgress(prev => new Set([...prev, "benchmarks", "tracks"]));

    setIsTyping(true);
    await new Promise(resolve => window.setTimeout(resolve, 700));
    setIsTyping(false);

    const workspaceId = uid();
    benchmarkWorkspaceMsgIdRef.current = workspaceId;
    pushMessage({
      role: "ai",
      id: workspaceId,
      text: "",
      fuelHelp: true,
      fuelHelpContent: buildFuelWorkspacePreviewContent({
        companyName: userData.companyName,
        journeyStage: benchmarkJourneyStageRef.current || undefined,
      }),
    });

    await new Promise(resolve => window.setTimeout(resolve, 500));

    setIsTyping(true);
    await new Promise(resolve => window.setTimeout(resolve, 700));
    setIsTyping(false);

    const closingId = uid();
    benchmarkClosingMsgIdRef.current = closingId;
    pushMessage({
      role: "ai",
      id: closingId,
      text: userData.companyName
        ? `That's your foundation. Launch when you're ready — Fuel will open **${userData.companyName}**'s workspace and generate your first intelligence pass.\n\nWant more later? Plans and usage live in your profile — no pressure now.`
        : "That's your foundation. Launch when you're ready — Fuel will open your workspace and generate your first intelligence pass.\n\nWant more later? Plans and usage live in your profile — no pressure now.",
    });

    setStep("platform-overview");
    processingRef.current = false;
  }, [pushMessage, userData.companyName]);

  const completeOnboarding = useCallback(() => {
    onComplete(latestBenchmarkSnapshotRef.current?.values ?? null);
  }, [onComplete]);

  const handleStartJourney = useCallback(async () => {
    if (processingRef.current || journeyStarted) return;
    processingRef.current = true;
    setJourneyStarted(true);
    pushMessage({ role: "user", text: "Start my journey →" });

    setIsTyping(true);
    await new Promise(resolve => window.setTimeout(resolve, 1200));
    setIsTyping(false);

    setMessages(prev => prev.map(m =>
      m.id === benchmarkClosingMsgIdRef.current
        ? {
            ...m,
            text: userData.companyName
              ? `✓ Intelligence generated for **${userData.companyName}** — opening your workspace now.`
              : "✓ Intelligence generated — opening your workspace now.",
          }
        : m,
    ));
    setCompletedProgress(prev => new Set([...prev, "integrations", "config"]));
    setStep("done");
    window.setTimeout(completeOnboarding, 700);
    processingRef.current = false;
  }, [completeOnboarding, journeyStarted, pushMessage, userData.companyName]);

  const handleValuePropContinue = useCallback(async () => {
    await handleBenchmarkContinue();
  }, [handleBenchmarkContinue]);

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

    pushMessage({ role: "user", text: "Use these projects for intelligence" });
    setCompletedProgress(prev => new Set([...prev, "integrations", "config"]));
    pushFuelHelp(buildFuelHelpContent("integrations", {}));
    await aiSay("✓ York IE project context is ready. Fuel will use these active workstreams, updates, and service history to generate a richer intelligence view.", { delay: 900 });
    await aiSay("Based on your profile, benchmarks, and York IE project context, we’re generating intelligence for you now.", {
      delay: 700,
      chips: [{ label: "Start my journey →", value: "launch" }],
    });
    setStep("platform-overview");
    processingRef.current = false;
  }, [aiSay, disableLastChips, pushFuelHelp, pushMessage]);

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
        "No integrations connected yet — that's fine. You can add premium connectors anytime from the **Connector Hub**. Tracks without integrations will use form-based input so intelligence and playbooks still work.",
        { delay: 900 }
      );
    }

    await aiSay(
      `🎉 Your Fuel workspace is ready, ${userData.companyName}!\n\nYou now have a unified operating command center covering:\n\n· **Development** — roadmap, code quality, release health\n· **Marketing** — traffic, campaigns, SEO, demand intelligence\n· **RevOps** — pipeline, CRM health, revenue motion\n· **FinOps** — runway, burn, forecast, board readiness\n\nFuel AI will surface intelligence, flag risks, and keep your playbooks current — so you always know exactly where you are and what to do next.`,
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
    setTimeout(completeOnboarding, 600);
  }, [completeOnboarding, disableLastChips, pushMessage]);

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
    else if (step === "profile-intro" && value === "show-profile-form") handleShowProfileForm();
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
  }, [disableLastChips, handleCompanyConfirm, handleCrunchbaseConfirm, handleDomainClaim, handleLaunch, handleMoreDetailsChoice, handleProfileDescriptionChoice, handleShowProfileForm, handleYorkLinkResponse, handleYorkServicesResponse, pushMessage, showManualFuelProfileForm, step]);

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
        @keyframes benchmarkInsightIn {
          from { opacity: 0; transform: translateY(6px); }
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
            <span style={{ fontSize: 12, color: "#8FA99A", fontWeight: 500 }}>by York IE</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: "#00B48A",
              background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.2)",
              borderRadius: 4, padding: "1px 6px", letterSpacing: "0.3px",
            }}>ONBOARDING</span>
          </div>
          <button
            onClick={onManual}
            className="fuel-manual"
            style={{
              background: "none", border: "none", color: "#8FA99A",
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
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }} data-fuel-chat-scroll>
              <div style={{ width: "100%", margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    data-message-id={msg.id}
                    className="fuel-msg"
                    style={{
                    display: "flex",
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                    alignItems: "flex-start", gap: 10,
                  }}>
                    {msg.role === "ai" && <AIAvatar />}
                    {msg.role === "user" && <UserAvatar initial={userInitial} />}

                    <div style={{
                      maxWidth: msg.cardType === "benchmark" ? "min(680px, 96%)" : "85%",
                      width: msg.cardType === "benchmark" ? "100%" : undefined,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}>
                      {(msg.fuelHelpContent || (msg.text && msg.fuelHelp)) && (
                        msg.fuelHelpContent ? (
                          <>
                            <FuelHelpBubble
                              content={msg.fuelHelpContent}
                              playbooks={msg.suggestedPlaybooks}
                            />
                            {msg.id === benchmarkSnapshotMsgIdRef.current && !benchmarkContinued ? (
                              <div style={{ display: "flex", marginTop: 4 }}>
                                <button
                                  type="button"
                                  onClick={handleBenchmarkContinue}
                                  style={{
                                    background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
                                    border: "none",
                                    borderRadius: 7,
                                    color: "#0a1a12",
                                    cursor: "pointer",
                                    font: "inherit",
                                    fontSize: 12,
                                    fontWeight: 800,
                                    letterSpacing: "0.1px",
                                    padding: "9px 20px",
                                  }}
                                >
                                  See how Fuel helps →
                                </button>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div style={{
                            background: "rgba(0,180,138,0.06)",
                            border: "1px solid rgba(0,180,138,0.18)",
                            borderRadius: msg.role === "ai" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                            padding: "11px 14px",
                            fontSize: 13, color: "#F2F5F2", lineHeight: 1.65,
                            whiteSpace: "pre-line",
                          }}>
                            {msg.text.split("**").map((part, i) =>
                              i % 2 === 0
                                ? <span key={i}>{part}</span>
                                : <strong key={i} style={{ color: "#F2F5F2", fontWeight: 700 }}>{part}</strong>
                            )}
                          </div>
                        )
                      )}
                      {msg.text && !msg.fuelHelp && (
                        <div style={{
                          background: msg.role === "ai" ? "#172632" : "#1F3140",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: msg.role === "ai" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                          padding: "11px 14px",
                          fontSize: 13, color: "#F2F5F2", lineHeight: 1.65,
                          whiteSpace: "pre-line",
                        }}>
                          {msg.text.split("**").map((part, i) =>
                            i % 2 === 0
                              ? <span key={i}>{part}</span>
                              : <strong key={i} style={{ color: "#F2F5F2", fontWeight: 700 }}>{part}</strong>
                          )}
                        </div>
                      )}
                      {msg.id === benchmarkClosingMsgIdRef.current && !journeyStarted ? (
                        <div style={{ display: "flex", marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={handleStartJourney}
                            style={{
                              background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
                              border: "none",
                              borderRadius: 7,
                              color: "#0a1a12",
                              cursor: "pointer",
                              font: "inherit",
                              fontSize: 12,
                              fontWeight: 800,
                              letterSpacing: "0.1px",
                              padding: "9px 20px",
                            }}
                          >
                            Start my journey →
                          </button>
                        </div>
                      ) : null}

                      {/* Cards */}
                      {msg.cardType === "crunchbase" && userData.crunchbaseData && (
                        <CrunchbaseCard
                          data={userData.crunchbaseData}
                          onConfirm={handleCrunchbaseConfirm}
                          initialMode={msg.cardMode}
                          sourceLabel={msg.cardLabel}
                        />
                      )}
                      {msg.profileFormVisible && userData.crunchbaseData && (
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
                          onSnapshotChange={handleBenchmarkSnapshotChange}
                          profile={userData.crunchbaseData}
                          businessModel={userData.businessModel}
                          companyName={userData.companyName}
                        />
                      )}
                      {msg.cardType === "value-prop" && (
                        <ValuePropCard
                          items={msg.valuePropItems}
                          onContinue={handleValuePropContinue}
                        />
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
                                York IE will be in touch shortly to match you with the right team.<br />Scorecard is set up and waiting.
                              </div>
                              {!launched && (
                                <button onClick={() => { setLaunched(true); completeOnboarding(); }} style={{
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
                                color: "#00B48A", borderRadius: 20,
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
                  color: inputActive && inputValue.trim() ? "#0a1a12" : "#8FA99A",
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
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8FA99A", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>
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
                      {done ? <span style={{ color: "#00B48A" }}>✓</span> : <span style={{ color: "#8FA99A" }}>○</span>}
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: done ? "#00B48A" : current ? "#8FA99A" : "#8FA99A",
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
                      background: stageReached && i === 0 ? "#00B48A" : "rgba(255,255,255,0.1)",
                    }} />
                    <span style={{
                      fontSize: 12, color: stageReached && i === 0 ? "#8FA99A" : "#8FA99A",
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
              <div style={{ fontSize: 11, fontWeight: 700, color: "#00B48A", marginBottom: 4 }}>⚡ Connector Hub</div>
              <div style={{ fontSize: 11, color: "#8FA99A", lineHeight: 1.5 }}>
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
