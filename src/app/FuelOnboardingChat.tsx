import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { fuel } from "./fuelTokens";
import "./benchmark-peer.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step =
  | "company-confirm" | "company-name"
  | "profile-description" | "profile-more-details" | "business-model" | "profile-intro" | "domain-claim"
  | "crunchbase-fetching" | "crunchbase-missing" | "crunchbase-url" | "crunchbase-confirm" | "benchmark"
  | "fuel-value" | "york-services" | "york-link"
  | "integrations-intro" | "integrations-select"
  | "platform-overview" | "done"
  | "gtm-q1" | "gtm-q2" | "gtm-q3" | "gtm-q4"
  | "revops-q1" | "revops-q2" | "revops-q3" | "revops-q4"
  | "dev-q1" | "dev-q2" | "dev-q3" | "team-structure";

interface QualAnswers {
  salesMotion: string;
  funnelBreakdown: string;
  dealSize: string;
  investorIntros: string;
  pipelineTool: string;
  salesProcess: string;
  contractType: string;
  runway: string;
  productType: string;
  aiRole: string;
  productChallenge: string;
}

// ── Value Creation Engine assessment types ────────────────────────────────────

interface VCESignal {
  key: string;
  label: string;
  score: number;
  gapLine: string;
  strengthLine: string;
}

interface VCEAssessment {
  stageName: "Foundation" | "Acceleration" | "Scale" | "Optimization";
  stageDesc: string;
  score: number;
  topGaps: VCESignal[];
  topStrength: VCESignal;
}

// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  chips?: { label: string; value: string; icon?: string }[];
  cardType?: "crunchbase" | "profile-form" | "business-model" | "benchmark" | "value-prop" | "york-services" | "york-projects" | "why-integrate" | "york-cta" | "integration-select" | "complete" | "team-structure" | "gtm-qual" | "revops-qual" | "dev-qual" | "gtm-category" | "revops-category" | "dev-category";
  cardMode?: "view" | "edit";
  cardLabel?: string;
  disabled?: boolean;
  fuelHelp?: boolean;
  fuelHelpContent?: FuelHelpContent;
  valuePropItems?: ValuePropItem[];
  suggestedPlaybooks?: SuggestedPlaybook[];
  profileFormVisible?: boolean;
  kpiSnapshotMoment?: KpiSnapshotMoment;
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
    id: "product",
    label: "Product",
    desc: "SaaS, marketplace, or app with recurring or transactional revenue.",
  },
  {
    id: "services",
    label: "Services or Agency",
    desc: "Project, retainer, or advisory-based revenue.",
  },
  {
    id: "investment",
    label: "Investment",
    desc: "Fund or holding company managing a portfolio.",
  },
];

const PROGRESS_ITEMS = [
  { id: "profile",      label: "Your company profile",       step: "domain-claim" },
  { id: "benchmarks",   label: "Your growth benchmarks",     step: "benchmark" },
  { id: "tracks",       label: "Your Fuel journey tracks",   step: "fuel-value" },
  { id: "integrations", label: "Intelligence generation",    step: "platform-overview" },
  { id: "config",       label: "Your workspace config",      step: "done" },
];

const WIZARD_PROGRESS_ITEMS = [
  { id: "profile",      label: "Company profile",        activeFrom: 1,  doneAfter: 1 },
  { id: "gtm",          label: "GTM & Marketing",        activeFrom: 2,  doneAfter: 3 },
  { id: "revops",       label: "RevOps & finance",       activeFrom: 4,  doneAfter: 5 },
  { id: "development",  label: "Product & engineering",  activeFrom: 6,  doneAfter: 7 },
  { id: "team",         label: "Team structure",         activeFrom: 8,  doneAfter: 8 },
  { id: "intelligence", label: "Intelligence pass",      activeFrom: 10, doneAfter: 10 },
] as const;

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

function OnboardingWelcomeScreen({
  companyName,
  email,
  onStart,
}: {
  companyName: string;
  email: string;
  onStart: () => void;
}) {
  return (
    <div style={{
      alignItems: "center",
      animation: "fuelFadeUp 0.4s ease both",
      display: "flex",
      flex: 1,
      flexDirection: "column",
      justifyContent: "center",
      minHeight: 0,
      padding: "48px 32px",
      textAlign: "center",
    }}>
      <div style={{
        alignItems: "center",
        background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
        borderRadius: 20,
        boxShadow: "0 12px 40px rgba(0,180,138,0.18)",
        color: "#0a1a12",
        display: "flex",
        fontSize: 36,
        fontWeight: 900,
        height: 80,
        justifyContent: "center",
        marginBottom: 32,
        width: 80,
      }}>
        F
      </div>
      <h1 style={{ color: fuel.text, fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 16px" }}>
        Found you.
      </h1>
      <p style={{ color: fuel.textMuted, fontSize: 16, lineHeight: 1.65, margin: "0 0 10px", maxWidth: 480 }}>
        I&apos;m <span style={{ color: fuel.text, fontWeight: 700 }}>Fuel</span>, your smart advisor.
        The kind that doesn&apos;t take a percentage of your company.
      </p>
      <p style={{ color: fuel.textMuted, fontSize: 16, lineHeight: 1.65, margin: "0 0 36px", maxWidth: 480 }}>
        {companyName ? (
          <>
            Signed in as <span style={{ color: fuel.text, fontWeight: 700 }}>{email}</span>. I pulled{" "}
            <span style={{ color: fuel.text, fontWeight: 700 }}>{companyName}</span> from your domain.
          </>
        ) : (
          <>Signed in as <span style={{ color: fuel.text, fontWeight: 700 }}>{email}</span>.</>
        )}
        <br />
        Confirm what I found, fill in what I missed, and I&apos;ll benchmark you against real peers, not industry averages.
      </p>
      <button
        type="button"
        onClick={onStart}
        style={{
          background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
          border: "none",
          borderRadius: 10,
          color: "#0a1a12",
          cursor: "pointer",
          font: "inherit",
          fontSize: 14,
          fontWeight: 800,
          padding: "14px 28px",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,180,138,0.25)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        Review my profile →
      </button>
      <p style={{ color: fuel.textMuted, fontSize: 11, margin: "16px 0 0" }}>
        About 60 seconds · 10 steps
      </p>
    </div>
  );
}

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
      <span style={{ fontSize: 11, color: "var(--text-2)" }}>Fuel AI is thinking...</span>
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
    background: "var(--bg)", border: `1px solid ${focused ? "rgba(61,214,140,0.35)" : "var(--panel-border)"}`,
    borderRadius: 6, padding: "7px 10px",
    fontSize: 12, color: "var(--text-1)", outline: "none",
    transition: "border-color 0.15s",
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: "var(--text-2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>
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
        background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.1)",
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
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)" }}>{fields.name}</div>
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
              <div style={{ fontSize: 10, color: "var(--text-2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.4 }}>{value}</div>
            </div>
          ))}
        </div>
        {rounds.length > 0 && (
          <div style={{ padding: "0 16px 12px" }}>
            <div style={{ fontSize: 10, color: "var(--text-2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Funding rounds</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rounds.map(r => (
                <div key={r.id} style={{
                  display: "flex", gap: 8, alignItems: "center",
                  background: "var(--panel)", border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 7, padding: "7px 10px",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#8B76D4", minWidth: 70 }}>{r.type}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#00B48A", minWidth: 60 }}>{r.amount || "—"}</span>
                  {r.date && <span style={{ fontSize: 11, color: "var(--text-2)" }}>{r.date}</span>}
                  {r.investors && (
                    <span style={{ fontSize: 11, color: "var(--text-2)", marginLeft: "auto", textAlign: "right" }}>
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
              background: "transparent", color: "var(--text-2)",
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
      background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>Update company details</div>
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
              background: "var(--panel)", border: "1px dashed var(--panel-border)", borderRadius: 8,
              fontSize: 12, color: "var(--text-2)",
            }}>No rounds added yet — click "Add round" to start</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden" }}>
              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "120px 90px 80px 1fr 32px",
                gap: 0, background: "var(--panel)",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                padding: "6px 10px",
              }}>
                {["Round", "Amount", "Date", "Investors", ""].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {rounds.map((r, i) => (
                <div key={r.id} style={{
                  display: "grid", gridTemplateColumns: "120px 90px 80px 1fr 32px",
                  gap: 6, alignItems: "center",
                  background: i % 2 === 0 ? "var(--panel)" : "var(--bg)",
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
          background: "transparent", color: "var(--text-2)",
          border: "1px solid var(--panel-border)", borderRadius: 7,
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
      background: "var(--surface-3)",
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
                background: active ? "rgba(0,180,138,0.13)" : "var(--bg)",
                border: active ? "1px solid rgba(0,180,138,0.55)" : "1px solid var(--panel-border)",
                borderRadius: 9,
                color: "inherit",
                cursor: "pointer",
                opacity: submitted && !active ? 0.55 : 1,
                minHeight: 96,
                padding: 12,
                textAlign: "left",
              }}
            >
              <strong style={{ color: active ? "var(--text-1)" : "var(--text-1)", display: "block", fontSize: 12.5, lineHeight: 1.25 }}>
                {option.label}
              </strong>
              <span style={{ color: "var(--text-2)", display: "block", fontSize: 11.5, lineHeight: 1.35, marginTop: 5 }}>
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
    businessModel || "Product"
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
    color: "var(--text-1)",
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
      background: "var(--surface-3)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12,
      marginTop: 4,
      padding: 16,
    }}>
      <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
        + Profile ready
      </div>
      <div style={{ color: "var(--text-1)", fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>
        Review your <span style={{ color: "#00B48A" }}>{companyName || "company"}</span> profile.
      </div>
      <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.45, marginBottom: 14 }}>
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
                    border: active ? "1px solid rgba(0,180,138,0.55)" : "1px solid var(--panel-border)",
                    borderRadius: 9,
                    color: "inherit",
                    cursor: "pointer",
                    minHeight: 76,
                    padding: 10,
                    textAlign: "left",
                  }}
                >
                  <strong style={{ color: active ? "var(--text-1)" : "var(--text-1)", display: "block", fontSize: 11.5, lineHeight: 1.25 }}>
                    {option.label}
                  </strong>
                  <span style={{ color: "var(--text-2)", display: "block", fontSize: 10.5, lineHeight: 1.3, marginTop: 4 }}>
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
                    background: "var(--panel)",
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
          color: "var(--text-1)",
          fontSize: 11.5,
          lineHeight: 1.45,
          padding: "10px 12px",
        }}>
          We'll link <strong style={{ color: "var(--text-1)" }}>{domain}</strong> to your Fuel profile. Teammates can create their own profiles for the same company.
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
  cacPayback: string;
  burnMultiple: string;
  ruleOf40: string;
  headcount: string;
  payingCustomers: string;
};

export type BenchmarkWizardField = {
  key: keyof BenchmarkValues;
  label: string;
  prompt: string;
  promptHint?: string;
  placeholder: string;
  unit: "usd" | "percent" | "count" | "months" | "multiple";
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

export const BENCHMARK_WIZARD_FIELDS: BenchmarkWizardField[] = [
  { key: "arr", label: "ARR", prompt: "ARR — what are you at?", promptHint: "(We'll add more metrics after. One at a time.)", placeholder: "500000", unit: "usd", p25: 150000, p50: 500000, p75: 1200000, p90: 2500000, bandStart: 6, bandEnd: 48 },
  { key: "arrGrowth", label: "ARR growth (YoY)", prompt: "How fast is ARR growing year over year?", placeholder: "120", unit: "percent", p25: 120, p50: 200, p75: 350, p90: 600, bandStart: 20, bandEnd: 58 },
  { key: "nrr", label: "Net revenue retention", prompt: "What does net revenue retention look like?", placeholder: "108", unit: "percent", p25: 95, p50: 108, p75: 125, p90: 145, bandStart: 66, bandEnd: 84 },
  { key: "logoRetention", label: "Logo retention", prompt: "What share of customers stayed over the last year?", placeholder: "88", unit: "percent", p25: 80, p50: 88, p75: 93, p90: 97, bandStart: 82, bandEnd: 96 },
  { key: "grossMargin", label: "Gross margin", prompt: "What's your blended gross margin?", placeholder: "72", unit: "percent", p25: 55, p50: 72, p75: 82, p90: 88, bandStart: 64, bandEnd: 92 },
  { key: "cacPayback", label: "CAC payback", prompt: "How many months to recover customer acquisition cost?", placeholder: "16", unit: "months", p25: 10, p50: 16, p75: 26, p90: 42, bandStart: 20, bandEnd: 62, lowerIsBetter: true },
  { key: "burnMultiple", label: "Burn multiple", prompt: "What's your burn multiple right now?", placeholder: "2.1", unit: "multiple", p25: 1.3, p50: 2.1, p75: 3.4, p90: 5.5, bandStart: 18, bandEnd: 58, lowerIsBetter: true },
  { key: "ruleOf40", label: "Rule of 40", prompt: "What's your Rule of 40 (growth % + profit margin %)?", placeholder: "28", unit: "percent", p25: 15, p50: 28, p75: 40, p90: 55, bandStart: 30, bandEnd: 78 },
  { key: "monthlyBurn", label: "Monthly net burn", prompt: "Roughly how much net cash are you burning each month?", placeholder: "80000", unit: "usd", p25: 40000, p50: 80000, p75: 180000, p90: 350000, bandStart: 12, bandEnd: 52, lowerIsBetter: true },
  { key: "cashOnHand", label: "Cash on hand", prompt: "How much runway fuel is in the bank today?", placeholder: "1500000", unit: "usd", p25: 500000, p50: 1500000, p75: 3000000, p90: 6000000, bandStart: 22, bandEnd: 50 },
  { key: "headcount", label: "Headcount (FTE)", prompt: "How many full-time people are on the team?", placeholder: "12", unit: "count", p25: 6, p50: 12, p75: 22, p90: 40, bandStart: 15, bandEnd: 55 },
  { key: "payingCustomers", label: "Paying customers", prompt: "How many paying customers do you have?", placeholder: "40", unit: "count", p25: 10, p50: 40, p75: 150, p90: 500, bandStart: 2, bandEnd: 30 },
];

type BenchmarkGroupDef = {
  key: string;
  label: string;
  sub: string;
  color: string;
  fieldKeys: (keyof BenchmarkValues)[];
};

const BENCHMARK_GROUPS: BenchmarkGroupDef[] = [
  { key: "gtm", label: "GTM", sub: "Revenue + retention", color: "#00B48A", fieldKeys: ["arr", "arrGrowth", "nrr", "logoRetention"] },
  { key: "ga", label: "G&A", sub: "Capital + efficiency", color: "#D4924A", fieldKeys: ["grossMargin", "cacPayback", "burnMultiple", "ruleOf40", "monthlyBurn", "cashOnHand"] },
  { key: "rd", label: "R&D", sub: "Engineering + product", color: "#8B76D4", fieldKeys: ["headcount", "payingCustomers"] },
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

function getValuePercentileBucket(value: number, field: BenchmarkWizardField): "below" | "p25" | "p50" | "p75" | "p90" | "above" {
  const { p25, p50, p75, p90, lowerIsBetter } = field;
  if (lowerIsBetter) {
    if (value <= p25) return "above";
    if (value <= p50) return "p90";
    if (value <= p75) return "p75";
    if (value <= p90) return "p50";
    return "below";
  }
  if (value <= p25) return "below";
  if (value <= p50) return "p25";
  if (value <= p75) return "p50";
  if (value <= p90) return "p75";
  return "above";
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
  const tierStyle = getBenchmarkTierStyle(getBenchmarkTier(value, field));

  return (
    <div style={wrapStyle}>
      <span style={{ color: tierStyle.marker, fontSize: compact ? 12 : 13, fontWeight: 800 }}>{display}</span>
      <span style={{ color: fuel.textMuted, fontWeight: 500 }}>·</span>
      <span style={{ color: tierStyle.marker, fontWeight: 700 }}>{percentileMeaningSuffix(pct)}</span>
    </div>
  );
}

export function BenchmarkPercentileScale({
  field,
  compact = false,
  highlightMedian = true,
  value = null,
}: {
  field: BenchmarkWizardField;
  compact?: boolean;
  highlightMedian?: boolean;
  value?: number | null;
}) {
  const activeBucket = value != null ? getValuePercentileBucket(value, field) : null;
  const tierStyle = value != null ? getBenchmarkTierStyle(getBenchmarkTier(value, field)) : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: compact ? 4 : 6 }}>
      {BENCHMARK_PERCENTILES.map(bucket => {
        const isMedian = bucket.key === "p50";
        const isActive = activeBucket === bucket.key
          || (activeBucket === "above" && bucket.key === "p90")
          || (activeBucket === "below" && bucket.key === "p25");
        return (
          <div key={bucket.key} title={bucket.title}>
    <div style={{
              color: isActive && tierStyle
                ? tierStyle.marker
                : isMedian && highlightMedian
                  ? fuel.text
                  : fuel.textMuted,
              fontSize: compact ? 9 : 10,
              fontWeight: 800,
            }}>
              {bucket.label}
            </div>
            <div style={{
              color: isActive && tierStyle ? tierStyle.marker : fuel.text,
              fontSize: compact ? 10.5 : 11.5,
              fontWeight: isActive ? 800 : 700,
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

function BenchmarkPercentileInline({
  field,
  value = null,
}: {
  field: BenchmarkWizardField;
  value?: number | null;
}) {
  const activeBucket = value != null ? getValuePercentileBucket(value, field) : null;
  const tierStyle = value != null ? getBenchmarkTierStyle(getBenchmarkTier(value, field)) : null;

  return (
    <span
      style={{ color: "var(--text-2)", fontSize: 10, lineHeight: 1.4 }}
      title="P25–P90 show where peers rank. P50 is the cohort median."
    >
      {BENCHMARK_PERCENTILES.map((bucket, index) => {
        const isMedian = bucket.key === "p50";
        const isActive = activeBucket === bucket.key
          || (activeBucket === "above" && bucket.key === "p90")
          || (activeBucket === "below" && bucket.key === "p25");
        const bucketColor = isActive && tierStyle
          ? tierStyle.marker
          : isMedian
            ? fuel.text
            : undefined;
        return (
          <span key={bucket.key} title={bucket.title} style={bucketColor ? { color: bucketColor, fontWeight: isActive ? 700 : 600 } : undefined}>
            {bucket.label}{" "}
            {isMedian || isActive ? (
              <strong style={{ color: bucketColor ?? "var(--text-1)", fontWeight: 700 }}>{getBenchmarkPercentileValue(field, bucket.key)}</strong>
            ) : getBenchmarkPercentileValue(field, bucket.key)}
            {index < BENCHMARK_PERCENTILES.length - 1 ? " · " : null}
          </span>
        );
      })}
    </span>
  );
}

function parseBenchmarkNumber(raw: string): number | null {
  const cleaned = raw.replace(/[$,%x,\s]/gi, "").replace(/mo(nths?)?$/i, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function formatBenchmarkDisplay(value: number, unit: BenchmarkWizardField["unit"]) {
  if (unit === "usd") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
    return `$${value}`;
  }
  if (unit === "percent") return `${value}%`;
  if (unit === "months") return `${value} mo`;
  if (unit === "multiple") return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}x`;
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

export function valueToMarkerPercent(value: number, field: BenchmarkWizardField) {
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

export function getBenchmarkTier(value: number, field: BenchmarkWizardField) {
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

type BenchmarkTier = ReturnType<typeof getBenchmarkTier>;

/** Status styles — green / amber / red only (identical in light and dark). */
const STATUS_STYLE_GOOD = {
  marker: "#12b886",
  glow: "rgba(18,184,134,0.35)",
  badgeBg: "rgba(18,184,134,0.12)",
  badgeBorder: "rgba(18,184,134,0.28)",
  calloutBg: "rgba(18,184,134,0.08)",
  calloutBorder: "rgba(18,184,134,0.22)",
  value: "#12b886",
} as const;

const STATUS_STYLE_WATCH = {
  marker: "#F5A623",
  glow: "rgba(245,166,35,0.35)",
  badgeBg: "rgba(245,166,35,0.12)",
  badgeBorder: "rgba(245,166,35,0.28)",
  calloutBg: "rgba(245,166,35,0.08)",
  calloutBorder: "rgba(245,166,35,0.22)",
  value: "#F5A623",
} as const;

const STATUS_STYLE_BAD = {
  marker: "#E05C5C",
  glow: "rgba(224,92,92,0.35)",
  badgeBg: "rgba(224,92,92,0.12)",
  badgeBorder: "rgba(224,92,92,0.28)",
  calloutBg: "rgba(224,92,92,0.08)",
  calloutBorder: "rgba(224,92,92,0.22)",
  value: "#E05C5C",
} as const;

export const BENCHMARK_TIER_PALETTE: Record<BenchmarkTier, {
  marker: string;
  glow: string;
  badgeBg: string;
  badgeBorder: string;
  calloutBg: string;
  calloutBorder: string;
  value: string;
}> = {
  top: { ...STATUS_STYLE_GOOD },
  upper: { ...STATUS_STYLE_GOOD },
  mid: { ...STATUS_STYLE_WATCH },
  lower: { ...STATUS_STYLE_WATCH },
  bottom: { ...STATUS_STYLE_BAD },
};

export function getBenchmarkTierStyle(tier: BenchmarkTier) {
  return BENCHMARK_TIER_PALETTE[tier];
}

export function BenchmarkCohortTrack({
  field,
  marker,
  value = null,
  animate = false,
  compact = false,
}: {
  field: BenchmarkWizardField;
  marker: number | null;
  value?: number | null;
  animate?: boolean;
  compact?: boolean;
}) {
  const barHeight = compact ? 8 : 12;
  const tier = value != null ? getBenchmarkTier(value, field) : null;
  const tierStyle = tier ? getBenchmarkTierStyle(tier) : null;
  const outsideCohort = marker != null && (marker < field.bandStart || marker > field.bandEnd);
  const markerColor = tierStyle?.marker ?? (outsideCohort ? "var(--text-1)" : "#00B48A");
  const markerGlow = tierStyle?.glow ?? "rgba(0,180,138,0.45)";

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
            background: markerColor,
            border: "2px solid var(--text-1)",
            borderRadius: "50%",
            boxShadow: animate
              ? `0 0 0 6px rgba(255,255,255,0.12), 0 0 18px ${markerGlow}`
              : `0 0 10px ${markerGlow}`,
            height: compact ? 12 : 16,
            left: `calc(${marker}% - ${compact ? 6 : 8}px)`,
            position: "absolute",
            top: compact ? -2 : -2,
            transition: "left 0.55s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.35s ease, background 0.35s ease",
            width: compact ? 12 : 16,
            zIndex: 2,
          }} />
          <div style={{
            background: "var(--text-1)",
            height: compact ? 14 : 18,
            left: `${marker}%`,
            position: "absolute",
            top: compact ? -3 : -3,
            transition: "left 0.55s cubic-bezier(0.34, 1.2, 0.64, 1)",
            width: 2,
            zIndex: 2,
          }} />
        </>
      ) : null}
    </div>
  );
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

export type SuggestedPlaybook = {
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

export function suggestPlaybooksForStage(journeyStage: string): SuggestedPlaybook[] {
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
  strengthBullets: string[];
  gapBullets: string[];
  journeyStage?: string;
  stageLine?: string;
};

function momentMetricLabel(field: BenchmarkWizardField): string {
  const labels: Partial<Record<keyof BenchmarkValues, string>> = {
    arr: "ARR",
    arrGrowth: "ARR growth",
    nrr: "NRR",
    logoRetention: "logo retention",
    grossMargin: "gross margin",
    cacPayback: "CAC payback",
    burnMultiple: "burn multiple",
    ruleOf40: "Rule of 40",
    monthlyBurn: "monthly burn",
    cashOnHand: "cash on hand",
    headcount: "headcount",
    payingCustomers: "paying customers",
  };
  return labels[field.key] ?? field.label;
}

function buildKpiSnapshotMoment(companyName: string, scored: ScoredBenchmarkMetric[], journeyStage?: string): KpiSnapshotMoment {
  const company = companyName || "your company";
  const headline = `Here's where **${company}** actually sits.`;

  if (!scored.length) {
    return {
      headline,
      journeyStage,
      strengthBullets: [
        "Add your headline metrics above — Fuel maps you against real peers, not generic averages.",
        "Start with ARR; the rest of the picture builds from there.",
      ],
      gapBullets: [
        "Complete the benchmark to see where you sit versus peers.",
      ],
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

  let strengthBullets: string[];
  if (margin && burn && isStrongTier(margin.tier) && isStrongTier(burn.tier)) {
    strengthBullets = [
      "Gross margin is above P50 for your cohort.",
      "Monthly burn is controlled — leaner than most peers at your stage.",
      "Growth decisions can be proactive, not defensive.",
    ];
  } else if (burn && cash && isStrongTier(burn.tier) && isStrongTier(cash.tier)) {
    strengthBullets = [
      "Burn is below median — you're spending carefully.",
      "Cash reserves are solid relative to peers.",
      "Runway gives you room to invest when you find what's working.",
    ];
  } else if (arr && growth && nrr && isStrongTier(arr.tier) && isStrongTier(growth.tier) && isStrongTier(nrr.tier)) {
    strengthBullets = [
      "ARR, growth, and retention all sit above P50.",
      "Rare position at this stage — protect what's working.",
      "Focus shifts to scaling efficiently, not chasing fixes.",
    ];
  } else if (growth && nrr && isStrongTier(growth.tier) && isWeakTier(nrr.tier)) {
    strengthBullets = [
      `**${momentMetricLabel(growth.field)}** is above P50 — real acquisition momentum.`,
      "Retention sits below peers — tighten before you scale spend.",
    ];
  } else if (arr && growth && isWeakTier(arr.tier) && isStrongTier(growth.tier)) {
    strengthBullets = [
      "Growth momentum is above P50 even though ARR is still early.",
      "Next question: does momentum convert into durable revenue?",
    ];
  } else if (strong.length >= 2) {
    const names = strong.slice(0, 2).map(entry => momentMetricLabel(entry.field));
    strengthBullets = [
      `**${names[0]}** and **${names[1]}** both above P50 for your cohort.`,
      "Worth protecting while you close the gaps below.",
    ];
  } else if (strong.length === 1) {
    strengthBullets = [
      `**${momentMetricLabel(strong[0].field)}** is your clearest bright spot — above P50.`,
      "Build from what's working before chasing new levers.",
    ];
  } else {
    strengthBullets = [
      "No single metric stands out yet — you're in the mix with peers.",
      "The comparison table shows exactly where you land on the curve.",
    ];
  }

  let gapBullets: string[];
  if (weak.length >= 2) {
    const names = weak.slice(0, 2).map(entry => momentMetricLabel(entry.field));
    gapBullets = [
      `**${names[0]}** and **${names[1]}** both below P50 — priority focus areas.`,
      "Stage-matched playbooks below target fixes that usually move the needle first.",
    ];
  } else if (weak.length === 1) {
    gapBullets = [
      `**${momentMetricLabel(weak[0].field)}** is your main gap — below P50 for your cohort.`,
      "Closing this usually has the fastest impact on your peer position.",
    ];
  } else if (weak.length === 0 && strong.length >= Math.ceil(scored.length / 2)) {
    gapBullets = [
      "Nothing alarming versus peers right now.",
      "Fuel will keep watching margin, burn, and retention as you scale.",
    ];
  } else {
    const watch = scored
      .filter(entry => entry.tier === "mid" || isWeakTier(entry.tier))
      .slice(0, 2)
      .map(entry => momentMetricLabel(entry.field));
    gapBullets = watch.length >= 2
      ? [
          `**${watch[0]}** and **${watch[1]}** sit around or below median.`,
          "Small improvements there could shift your position quickly.",
        ]
      : [
          "Nothing alarming versus peers — Fuel will flag drift early.",
        ];
  }

  return { headline, strengthBullets, gapBullets, journeyStage };
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

function InsightBulletList({ items, color = fuel.text }: { items: string[]; color?: string }) {
  if (!items.length) return null;

  return (
    <ul style={{ color, flex: 1, fontSize: 12.5, lineHeight: 1.55, listStyle: "none", margin: 0, padding: 0 }}>
      {items.map(item => (
        <li key={item} style={{ marginBottom: 6, paddingLeft: 12, position: "relative" }}>
          <span style={{ color: fuel.textMuted, left: 0, position: "absolute" }}>·</span>
          {renderBoldText(item, color)}
        </li>
      ))}
    </ul>
  );
}

export function SuggestedPlaybooksList({
  playbooks,
  journeyStage,
}: {
  playbooks: SuggestedPlaybook[];
  journeyStage?: string;
}) {
  const trackColors: Record<SuggestedPlaybook["track"], string> = {
    Development: "#00B48A",
    Marketing: "#2BB8A0",
    RevOps: "#D4924A",
    FinOps: "#8B76D4",
  };

  if (!playbooks.length) return null;

  return (
    <div style={{ borderTop: `1px solid ${fuel.border}`, marginTop: 14, paddingTop: 14 }}>
      <div style={{ color: fuel.text, fontSize: 13, fontWeight: 800, lineHeight: 1.35, marginBottom: 4 }}>
        Playbooks for your stage
      </div>
      <div style={{ color: fuel.textMuted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
        {journeyStage ? (
          <>
            Based on your <strong style={{ color: fuel.text, fontWeight: 700 }}>{journeyStage}</strong> stage and benchmark gaps,
            these runbooks show where Fuel can help first — each one turns a gap into a concrete next step.
          </>
        ) : (
          <>Based on your benchmark, these runbooks show where Fuel can help first — each one turns a gap into a concrete next step.</>
        )}
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
                <strong style={{ color: "var(--text-1)", fontSize: 12 }}>{playbook.title}</strong>
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
              <p style={{ color: "var(--text-2)", fontSize: 11.5, lineHeight: 1.45, margin: 0 }}>{playbook.prompt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiSnapshotMoment({
  moment,
  embedded = false,
  layout = embedded ? "stacked" : "columns",
  playbooks = [],
  showContinue = false,
  onContinue,
}: {
  moment: KpiSnapshotMoment;
  embedded?: boolean;
  layout?: "stacked" | "columns";
  playbooks?: SuggestedPlaybook[];
  showContinue?: boolean;
  onContinue?: () => void;
}) {
  const panelStyle = (variant: "good" | "gap"): React.CSSProperties => ({
    background: variant === "good" ? "rgba(0,180,138,0.07)" : "rgba(212,146,74,0.07)",
    border: variant === "good" ? "1px solid rgba(0,180,138,0.18)" : "1px solid rgba(212,146,74,0.2)",
    borderRadius: 9,
    display: "flex",
    flexDirection: "column",
    minHeight: layout === "columns" ? 120 : undefined,
    minWidth: 0,
    padding: "12px 14px",
  });

  const goodPanel = (
    <div style={panelStyle("good")}>
      <div style={{
        color: fuel.accent,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.08em",
        marginBottom: 8,
        textTransform: "uppercase",
      }}>
        What&apos;s good
      </div>
      <InsightBulletList items={moment.strengthBullets} />
    </div>
  );

  const gapPanel = (
    <div style={panelStyle("gap")}>
      <div style={{
        color: "#D4924A",
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.08em",
        marginBottom: 8,
        textTransform: "uppercase",
      }}>
        What needs improvement
      </div>
      <InsightBulletList items={moment.gapBullets} color={fuel.textMuted} />
    </div>
  );

  const insightSections = (
    <div style={{
      display: "grid",
      gap: 10,
      gridTemplateColumns: layout === "columns" ? "minmax(0, 1fr) minmax(0, 1fr)" : "1fr",
      marginTop: 10,
    }}>
      {goodPanel}
      {gapPanel}
    </div>
  );

  if (embedded) {
    return (
      <>
        <div style={{ color: "var(--text-1)", fontSize: 15, fontWeight: 700, lineHeight: 1.45, marginBottom: 4 }}>
          {renderBoldText(moment.headline)}
        </div>
        {insightSections}
      </>
    );
  }

  return (
    <div style={{
      background: fuel.surface,
      border: `1px solid ${fuel.border}`,
      borderRadius: 12,
      marginTop: 4,
      padding: "16px 18px",
      width: "100%",
    }}>
      <div style={{ color: fuel.textMuted, fontSize: 9.5, fontWeight: 900, letterSpacing: "0.12em", marginBottom: 8, textTransform: "uppercase" }}>
        Benchmark readout
      </div>
      <div style={{ color: fuel.text, fontSize: 16, fontWeight: 800, lineHeight: 1.35, marginBottom: 2 }}>
        {renderBoldText(moment.headline)}
      </div>
      {moment.stageLine ? (
        <div style={{ color: fuel.textMuted, fontSize: 12.5, lineHeight: 1.5, marginBottom: 2 }}>
          {renderBoldText(moment.stageLine)}
        </div>
      ) : null}
      {insightSections}
      <SuggestedPlaybooksList playbooks={playbooks} journeyStage={moment.journeyStage} />
      {showContinue && onContinue ? (
        <div style={{ display: "flex", marginTop: 14 }}>
          <button
            type="button"
            onClick={onContinue}
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
        <SuggestedPlaybooksList playbooks={playbooks} />
      ) : null}
      {content.teaser ? (
        <div style={{
          borderTop: "1px solid rgba(0,180,138,0.14)",
          color: "var(--text-1)",
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
      <strong style={{ color: "var(--text-1)", display: "block", fontSize: compact ? 11.5 : 12.5, marginBottom: compact ? 2 : 4 }}>
        {insight.headline}
      </strong>
      <span style={{ color: "var(--text-2)", fontSize: compact ? 10.5 : 11.5, lineHeight: 1.45 }}>{insight.detail}</span>
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
          <span style={{ color: "var(--text-2)", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {field.label} · cohort distribution
          </span>
          {insight ? (
            <span style={{
              background: "rgba(0,180,138,0.12)",
              border: "1px solid rgba(0,180,138,0.28)",
              borderRadius: 999,
              color: "var(--text-1)",
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
      <BenchmarkCohortTrack animate={animate} compact={compact} field={field} marker={marker} value={value} />
      <div style={{ marginBottom: insight && !compact ? 12 : 0, marginTop: compact ? 6 : 8 }}>
        <BenchmarkPercentileScale compact={compact} field={field} value={value} />
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
  const pct = estimateValuePercentile(value, field);
  const tierStyle = getBenchmarkTierStyle(getBenchmarkTier(value, field));

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "10px 0" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 8, marginBottom: 8 }}>
        <span style={{ color: fuel.text, flex: 1, fontSize: 12, fontWeight: 700, minWidth: 0 }}>{field.label}</span>
        <strong style={{ color: fuel.accent, fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>
          {formatBenchmarkDisplay(value, field.unit)}
        </strong>
        <span style={{
          background: "rgba(0,180,138,0.1)",
          border: "1px solid rgba(0,180,138,0.2)",
          borderRadius: 999,
          color: fuel.text,
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
      <BenchmarkCohortTrack compact field={field} marker={marker} value={value} />
      <p style={{ color: fuel.textMuted, fontSize: 11, lineHeight: 1.45, margin: "8px 0 0" }}>
        <span style={{ color: tierStyle.marker, fontWeight: 700 }}>{percentileMeaningSuffix(pct)}</span>
        <span style={{ color: fuel.textMuted, margin: "0 6px" }}>·</span>
        <span>{insight.headline}</span>
      </p>
    </div>
  );
}

function buildBenchmarkResultRows(values: Partial<BenchmarkValues>) {
  const benchmarkValues: BenchmarkValues = {
    arr: values.arr ?? "",
    arrGrowth: values.arrGrowth ?? "",
    nrr: values.nrr ?? "",
    logoRetention: values.logoRetention ?? "",
    monthlyBurn: values.monthlyBurn ?? "",
    cashOnHand: values.cashOnHand ?? "",
    grossMargin: values.grossMargin ?? "",
    cacPayback: values.cacPayback ?? "",
    burnMultiple: values.burnMultiple ?? "",
    ruleOf40: values.ruleOf40 ?? "",
    headcount: values.headcount ?? "",
    payingCustomers: values.payingCustomers ?? "",
  };

  const GTM_KEYS = ["arr", "arrGrowth", "nrr", "logoRetention"];
  const RD_KEYS = ["headcount", "payingCustomers"];
  return BENCHMARK_WIZARD_FIELDS.map(field => {
    const value = parseBenchmarkNumber(benchmarkValues[field.key]);
    const group = GTM_KEYS.includes(field.key) ? "GTM" : RD_KEYS.includes(field.key) ? "R&D" : "G&A";
    const sub = group === "GTM" ? "Revenue + retention" : group === "R&D" ? "Engineering + product" : "Capital + efficiency";
    return { field, group, sub, label: field.label, value, marker: value != null ? valueToMarkerPercent(value, field) : null };
  });
}

export type MetricPlaybookOption = {
  id: string;
  title: string;
  track?: SuggestedPlaybook["track"];
};

function PlaybookPickerDropdown({
  playbooks,
  selectedId,
  onSelect,
}: {
  playbooks: MetricPlaybookOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number; minWidth: number } | null>(null);
  const selected = playbooks.find(playbook => playbook.id === selectedId) ?? playbooks[0];

  const updateMenuPosition = React.useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const menuWidth = 280;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12));
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(playbooks.length * 42 + 36, 280);
    const top = spaceBelow >= estimatedHeight + 12
      ? rect.bottom + 8
      : Math.max(12, rect.top - estimatedHeight - 8);

    setMenuPosition({
      top,
      left,
      minWidth: Math.max(rect.width, menuWidth),
    });
  }, [playbooks.length]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu = open && menuPosition ? createPortal(
    <div
      ref={menuRef}
      className="document-upload-menu document-upload-menu-floating document-upload-menu-inline"
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        minWidth: menuPosition.minWidth,
      }}
      role="listbox"
    >
      <div className="document-upload-menu-head">Suggested playbook</div>
      {playbooks.map(playbook => (
        <button
          type="button"
          key={playbook.id}
          className={`document-upload-option benchmark-playbook-option${playbook.id === selectedId ? " is-selected" : ""}`}
          onClick={() => {
            onSelect(playbook.id);
            setOpen(false);
          }}
        >
          <span>{playbook.title}</span>
          {playbook.track ? <span className="document-upload-option-status">{playbook.track}</span> : null}
        </button>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <div
        ref={wrapRef}
        className={`document-upload-wrap document-upload-wrap-inline benchmark-playbook-picker${open ? " is-open" : ""}`}
      >
        <button
          type="button"
          className={`document-upload-trigger-inline document-upload-trigger${open ? " is-open" : ""}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen(current => !current)}
        >
          {selected?.title ?? "Choose playbook"} ▾
        </button>
      </div>
      {menu}
    </>
  );
}

function BenchmarkMetricRowActions({
  metricKey,
  playbooks,
  onGenerateInitiative,
}: {
  metricKey: keyof BenchmarkValues;
  playbooks: MetricPlaybookOption[];
  onGenerateInitiative?: (metricKey: keyof BenchmarkValues, playbookId: string) => void;
}) {
  const [selectedId, setSelectedId] = React.useState(playbooks[0]?.id ?? "");

  React.useEffect(() => {
    setSelectedId(playbooks[0]?.id ?? "");
  }, [playbooks]);

  if (!playbooks.length) return null;

  return (
    <div className="benchmark-metric-actions">
      <PlaybookPickerDropdown
        playbooks={playbooks}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <button
        type="button"
        className="signals-private-btn primary benchmark-metric-initiative-btn"
        onClick={() => onGenerateInitiative?.(metricKey, selectedId)}
      >
        Generate an initiative
      </button>
    </div>
  );
}

export function BenchmarkPeerComparisonPanel({
  values,
  cohortLabel = "B2B SaaS · Seed · US",
  onEdit,
  metricPlaybooks,
  onGenerateInitiative,
}: {
  values: Partial<BenchmarkValues>;
  cohortLabel?: string;
  onEdit?: () => void;
  metricPlaybooks?: Partial<Record<keyof BenchmarkValues, MetricPlaybookOption[]>>;
  onGenerateInitiative?: (metricKey: keyof BenchmarkValues, playbookId: string) => void;
}) {
  const resultRows = buildBenchmarkResultRows(values);
  const showMetricActions = Boolean(metricPlaybooks && onGenerateInitiative);

  return (
    <div className={`benchmark-peer-panel${showMetricActions ? " benchmark-peer-panel-actions" : ""}`}>
      <div className="benchmark-peer-panel-head">
        <div className="benchmark-peer-panel-head-row">
          <div className="benchmark-peer-panel-kicker">
            Peer comparison
          </div>
          {onEdit ? (
            <button
              type="button"
              title="Edit benchmark numbers"
              aria-label="Edit benchmark numbers"
              onClick={onEdit}
              className="benchmark-peer-edit-btn"
            >
              ✎
            </button>
          ) : null}
        </div>
        <div className="benchmark-peer-panel-cohort">
          <span>{cohortLabel}</span>
          <span className="benchmark-peer-panel-n">n=147</span>
        </div>
      </div>
      <div className="benchmark-peer-rows">
        {resultRows.map((row, index) => {
          const showGroup = index === 0 || resultRows[index - 1].group !== row.group;
          return (
            <div
              key={row.label}
              className={`benchmark-peer-row${showGroup && index > 0 ? " benchmark-peer-row-group-start" : ""}`}
            >
              <div className="benchmark-peer-row-label">
                {showGroup ? (
                  <>
                    <div className="benchmark-peer-group">{row.group}</div>
                    <div className="benchmark-peer-group-sub">{row.sub}</div>
                  </>
                ) : null}
              </div>
              <div className="benchmark-peer-row-body">
                <div className="benchmark-peer-metric-head">
                  <span className="benchmark-peer-metric-name">{row.label}</span>
                  <BenchmarkPercentileInline field={row.field} value={row.value} />
                </div>
                {row.value != null ? (
                  <BenchmarkPercentileExplanation compact field={row.field} value={row.value} />
                ) : null}
                <BenchmarkCohortTrack compact field={row.field} marker={row.marker} value={row.value} />
                {showMetricActions ? (
                  <BenchmarkMetricRowActions
                    metricKey={row.field.key}
                    playbooks={metricPlaybooks?.[row.field.key] ?? []}
                    onGenerateInitiative={onGenerateInitiative}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Value Creation Engine ─────────────────────────────────────────────────────

function computeVCEAssessment(
  quals: QualAnswers,
  benchValues: Partial<BenchmarkValues>,
  headcount: TeamHeadcount,
): VCEAssessment {
  const parsedARR = parseBenchmarkNumber(benchValues.arr ?? "");
  const arrField = BENCHMARK_WIZARD_FIELDS.find(f => f.key === "arr");
  const arrTier = parsedARR != null && arrField ? getBenchmarkTier(parsedARR, arrField) : null;

  const parsedNRR = parseBenchmarkNumber(benchValues.nrr ?? "");

  const parsedGM = parseBenchmarkNumber(benchValues.grossMargin ?? "");
  const gmField = BENCHMARK_WIZARD_FIELDS.find(f => f.key === "grossMargin");
  const gmTier = parsedGM != null && gmField ? getBenchmarkTier(parsedGM, gmField) : null;

  const signals: VCESignal[] = [
    {
      key: "pipeline",
      label: "Pipeline visibility",
      score: quals.pipelineTool === "CRM" ? 1 : quals.pipelineTool === "Spreadsheet" ? 0.5 : 0,
      gapLine: "Add a CRM to unlock the next stage.",
      strengthLine: "CRM in place — pipeline is visible and forecastable. Protect this.",
    },
    {
      key: "salesProcess",
      label: "Sales process",
      score: quals.salesProcess === "Documented" ? 1 : quals.salesProcess === "Informal" ? 0.5 : 0,
      gapLine: "Define your sales process before scaling.",
      strengthLine: "Documented sales process — consistency is a competitive advantage.",
    },
    {
      key: "runway",
      label: "Runway",
      score: quals.runway === "Over 18 months" ? 1
        : quals.runway === "12–18 months" ? 0.75
        : quals.runway === "6–12 months" ? 0.5
        : 0,
      gapLine: "Runway is critical — address this first.",
      strengthLine: "Strong runway — decisions can be strategic, not defensive.",
    },
    {
      key: "arr",
      label: "ARR cohort position",
      score: arrTier == null ? 0 : ["top", "upper"].includes(arrTier) ? 1 : arrTier === "mid" ? 0.5 : 0,
      gapLine: "Revenue foundation needs to strengthen.",
      strengthLine: "ARR above cohort median — revenue foundation is solid.",
    },
    {
      key: "gtm",
      label: "GTM motion",
      score: (quals.salesMotion === "Sales-led" || quals.salesMotion === "Product-led") ? 1
        : quals.salesMotion === "Founder-led" ? 0.5
        : 0,
      gapLine: "Define a repeatable GTM motion.",
      strengthLine: "Defined GTM motion — acquisition is repeatable, not heroic.",
    },
    {
      key: "marketing",
      label: "Marketing function",
      score: (headcount["Marketing"] ?? 0) > 0 ? 1 : 0,
      gapLine: "No marketing function yet.",
      strengthLine: "Marketing function exists — demand generation can scale independently.",
    },
    {
      key: "nrr",
      label: "NRR",
      score: parsedNRR == null ? 0 : parsedNRR > 110 ? 1 : parsedNRR >= 100 ? 0.5 : 0,
      gapLine: "Track NRR to measure revenue health.",
      strengthLine: "NRR above 110% — existing customers are expanding. Protect this.",
    },
    {
      key: "grossMargin",
      label: "Gross margin",
      score: gmTier == null ? 0 : gmTier === "top" ? 1 : gmTier === "upper" ? 0.5 : 0,
      gapLine: "Gross margin needs attention.",
      strengthLine: "Gross margin above cohort — unit economics are working. Protect this as engineering scales.",
    },
  ];

  const totalScore = signals.reduce((sum, s) => sum + s.score, 0);
  const stageName: VCEAssessment["stageName"] =
    totalScore >= 7 ? "Optimization"
    : totalScore >= 5 ? "Scale"
    : totalScore >= 3 ? "Acceleration"
    : "Foundation";

  const stageDescs: Record<VCEAssessment["stageName"], string> = {
    "Foundation": "Foundation — building the operational trust needed before growth can be repeatable.",
    "Acceleration": "Acceleration — growth is happening but not yet systematic or predictable.",
    "Scale": "Scale — the motion exists. Now it needs to compound without adding fragility.",
    "Optimization": "Optimization — the business is durable. Focus shifts to margin and long-term enterprise value.",
  };

  const sorted = [...signals].sort((a, b) => a.score - b.score);
  const topGaps = sorted.slice(0, 2);
  const topStrength = [...signals].sort((a, b) => b.score - a.score)[0];

  return { stageName, stageDesc: stageDescs[stageName], score: totalScore, topGaps, topStrength };
}

// ── CategoryCard ─────────────────────────────────────────────────────────────
// Self-contained card: qual chips + one-at-a-time benchmark entry + N/A skip

interface CategoryBenchField {
  fieldKey: keyof BenchmarkValues;
  condition?: (quals: Record<string, string>, ext: Record<string, string>) => boolean;
}

function CategoryCard({
  categoryLabel,
  categoryDescription,
  categoryColor,
  categoryBg,
  questions,
  benchFields,
  externalQuals = {},
  benchStepOffset = 0,
  benchTotal,
  onComplete,
}: {
  categoryLabel: string;
  categoryDescription: string;
  categoryColor: string;
  categoryBg: string;
  questions: QualQuestion[];
  benchFields: CategoryBenchField[];
  externalQuals?: Record<string, string>;
  benchStepOffset?: number;
  benchTotal?: number;
  onComplete: (quals: Record<string, string>, values: Record<string, string>) => void;
}) {
  const [quals, setQuals] = React.useState<Record<string, string>>({});
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [doneKeys, setDoneKeys] = React.useState<Set<string>>(new Set());
  const [pulseKey, setPulseKey] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const activeFieldRef = React.useRef<HTMLDivElement>(null);
  const activeInputRef = React.useRef<HTMLInputElement>(null);
  const benchAdvanceRef = React.useRef(false);

  const allAnswers = { ...externalQuals, ...quals };
  const visibleQuestions = questions.filter(q => !q.condition || q.condition(allAnswers));
  const allQualsAnswered = visibleQuestions.every(q => quals[q.key] !== undefined);

  const visibleBenchFields = benchFields
    .map(b => ({ b, field: BENCHMARK_WIZARD_FIELDS.find(f => f.key === b.fieldKey)! }))
    .filter(({ b, field }) => field && (!b.condition || b.condition(quals, externalQuals)))
    .map(({ field }) => field);

  const activeField = visibleBenchFields.find(f => !doneKeys.has(f.key)) ?? null;
  const allBenchDone = visibleBenchFields.every(f => doneKeys.has(f.key));
  const canContinue = allQualsAnswered && allBenchDone && !submitted;

  const activeRaw = activeField ? (values[activeField.key] ?? "") : "";
  const activeValue = activeField ? parseBenchmarkNumber(activeRaw) : null;

  const lockedCount = visibleBenchFields.filter(f => doneKeys.has(f.key)).length;
  const counterTotal = benchTotal ?? visibleBenchFields.length;
  const counterCurrent = benchTotal != null
    ? Math.min(lockedCount + 1 + benchStepOffset, benchTotal)
    : Math.min(lockedCount + 1, visibleBenchFields.length);
  const counterStep = benchTotal != null
    ? lockedCount + 1 + benchStepOffset
    : lockedCount + 1;

  const editBtnStyle: React.CSSProperties = {
    alignItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    color: "var(--text-2)",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    fontSize: 10,
    fontWeight: 800,
    height: 26,
    justifyContent: "center",
    padding: "0 8px",
  };

  function handleQualSelect(key: string, val: string) {
    if (submitted) return;
    setQuals(prev => ({ ...prev, [key]: val }));
  }

  React.useEffect(() => {
    if (!allQualsAnswered || !activeField || submitted || !benchAdvanceRef.current) return;
    benchAdvanceRef.current = false;
    requestAnimationFrame(() => {
      scrollChatToElement(activeFieldRef.current);
      window.setTimeout(() => activeInputRef.current?.focus(), 60);
    });
  }, [activeField?.key, allQualsAnswered, submitted]);

  function updateValue(key: keyof BenchmarkValues, raw: string) {
    setValues(prev => ({ ...prev, [key]: raw }));
    setPulseKey(key);
    window.setTimeout(() => setPulseKey(null), 650);
  }

  function lockInActive() {
    if (!activeField || activeValue == null) return;
    benchAdvanceRef.current = true;
    setDoneKeys(prev => new Set([...prev, activeField.key]));
    setPulseKey(null);
  }

  function skipActive() {
    if (!activeField) return;
    benchAdvanceRef.current = true;
    setValues(prev => ({ ...prev, [activeField.key]: "__na__" }));
    setDoneKeys(prev => new Set([...prev, activeField.key]));
  }

  function editField(key: string) {
    if (submitted) return;
    setDoneKeys(prev => { const next = new Set(prev); next.delete(key); return next; });
  }

  function handleContinue() {
    if (!canContinue) return;
    setSubmitted(true);
    const cleanValues: Record<string, string> = {};
    for (const f of visibleBenchFields) {
      const v = values[f.key];
      if (v && v !== "__na__") cleanValues[f.key] = v;
    }
    // TODO: send quals + cleanValues to API alongside profile data
    onComplete(quals, cleanValues);
  }

  return (
    <div style={{ background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, marginTop: 4, overflow: "hidden", width: "100%" }}>

      {/* Category header */}
      <div style={{ background: categoryBg, borderBottom: "1px solid var(--panel-border)", padding: "11px 16px 10px" }}>
        <div style={{ color: categoryColor, fontSize: 10, fontWeight: 900, letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 3 }}>
          {categoryLabel}
        </div>
        <div style={{ color: "var(--text-2)", fontSize: 12, fontWeight: 500, lineHeight: 1.5 }}>{categoryDescription}</div>
      </div>

      {/* Qualitative questions */}
      {visibleQuestions.length > 0 && (
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {visibleQuestions.map((q, i) => {
            const sel = quals[q.key];
            const ack = sel ? (q.acks[sel] ?? q.defaultAck) : null;
            return (
              <div key={q.key} style={{
                animation: "fuelFadeUp 0.3s ease both",
                borderBottom: i < visibleQuestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                padding: "10px 16px",
              }}>
                <div style={{ color: "var(--text-1)", fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>{q.label}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {q.options.map(opt => {
                    const isSelected = sel === opt;
                    return (
                      <button key={opt} type="button" disabled={submitted}
                        onClick={() => handleQualSelect(q.key, opt)}
                        style={{
                          background: isSelected ? "rgba(0,180,138,0.15)" : "#0B1720",
                          border: `1px solid ${isSelected ? "rgba(0,180,138,0.55)" : "var(--border-strong)"}`,
                          borderRadius: 20, color: isSelected ? "#00B48A" : "var(--text-2)",
                          cursor: submitted ? "default" : "pointer", font: "inherit",
                          fontSize: 11.5, fontWeight: isSelected ? 700 : 500,
                          padding: "5px 12px", transition: "all 0.15s",
                        }}
                      >{opt}</button>
                    );
                  })}
                </div>
                {ack && (
                  <div style={{
                    animation: "fuelFadeUp 0.3s ease both",
                    background: "rgba(0,180,138,0.06)",
                    border: "1px solid rgba(0,180,138,0.16)",
                    borderRadius: 8,
                    color: "#9BD4BC",
                    fontSize: 12,
                    lineHeight: 1.55,
                    marginTop: 8,
                    padding: "9px 12px",
                  }}>
                    {ack}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Benchmark numbers */}
      {visibleBenchFields.length > 0 && (
        <div style={{ padding: "12px 16px 14px" }}>
          <div style={{ alignItems: "center", display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ color: "var(--text-2)", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>Numbers</div>
            {counterTotal > 1 && (
              <div style={{ color: "#6B8899", fontSize: 11 }}>
                {counterCurrent} of {counterTotal}
              </div>
            )}
          </div>

          {/* Locked rows */}
          {visibleBenchFields.filter(f => doneKeys.has(f.key)).map(field => {
            const raw = values[field.key];
            const isNA = raw === "__na__";
            const val = isNA ? null : parseBenchmarkNumber(raw);
            if (isNA) {
              return (
                <div key={field.key} style={{ alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, display: "flex", gap: 8, marginBottom: 6, padding: "8px 12px" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "var(--text-2)", fontSize: 12, fontWeight: 600 }}>{field.label}</span>
                    <span style={{ color: "#6B8899", fontSize: 11, marginLeft: 8 }}>skipped</span>
                  </div>
                  {!submitted && <button type="button" onClick={() => editField(field.key)} style={editBtnStyle}>✎</button>}
                </div>
              );
            }
            if (val == null) return null;
            return <LockedBenchmarkRow key={field.key} editButtonStyle={submitted ? { display: "none" } : editBtnStyle} field={field} onEdit={() => editField(field.key)} value={val} />;
          })}

          {/* Active metric entry — only after qual chips are answered */}
          {!submitted && activeField && allQualsAnswered && (
            <div
              ref={activeFieldRef}
              style={{
              animation: "fuelFadeUp 0.3s ease both",
              background: "rgba(0,180,138,0.06)",
              border: "1px solid rgba(0,180,138,0.22)",
              borderRadius: 10,
              marginTop: lockedCount > 0 ? 4 : 0,
              padding: 12,
            }}>
              <div style={{ color: "var(--text-1)", fontSize: 14, fontWeight: 800, lineHeight: 1.35, marginBottom: activeField.promptHint ? 5 : 10 }}>
                {activeField.prompt}
              </div>
              {activeField.promptHint && (
                <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.45, marginBottom: 10 }}>{activeField.promptHint}</div>
              )}
              <div style={{ position: "relative", marginBottom: 10 }}>
                <input
                  ref={activeInputRef}
                  key={activeField.key}
                  value={activeRaw}
                  onChange={e => updateValue(activeField.key, e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && activeValue != null) lockInActive(); }}
                  placeholder={activeField.placeholder}
                  inputMode={activeField.unit === "percent" ? "decimal" : "numeric"}
                  style={{
                    background: "#0B1720",
                    border: `1px solid ${activeValue != null ? "rgba(0,180,138,0.35)" : "rgba(255,255,255,0.12)"}`,
                    borderRadius: 10,
                    boxShadow: activeValue != null ? "0 0 0 1px rgba(0,180,138,0.12)" : "none",
                    color: "var(--text-1)", font: "inherit", fontSize: 18, fontWeight: 800, outline: "none",
                    padding: activeField.unit === "percent" ? "10px 36px 10px 12px" : "10px 12px",
                    transition: "border-color 0.15s, box-shadow 0.15s", width: "100%",
                  }}
                />
                {activeField.unit === "percent" && (
                  <span style={{ color: "var(--text-2)", fontSize: 16, fontWeight: 800, pointerEvents: "none", position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>%</span>
                )}
              </div>
              <LiveBenchmarkBar compact field={activeField} value={activeValue} animate={pulseKey === activeField.key} />
              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                <button type="button" disabled={activeValue == null} onClick={lockInActive} style={{
                  background: activeValue != null ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)" : "rgba(255,255,255,0.06)",
                  border: "none", borderRadius: 8,
                  color: activeValue != null ? "#0a1a12" : "var(--text-2)",
                  cursor: activeValue != null ? "pointer" : "not-allowed",
                  font: "inherit", fontSize: 12, fontWeight: 800, padding: "10px 18px",
                }}>
                  {lockedCount >= visibleBenchFields.length - 1 ? "Lock in →" : "Lock in & next →"}
                </button>
                <span style={{ color: "var(--text-2)", fontSize: 11.5 }}>
                  {counterStep} of {counterTotal}
                </span>
                <button type="button" onClick={skipActive} style={{
                  background: "none", border: "none", color: "#6B8899",
                  cursor: "pointer", font: "inherit", fontSize: 11.5, padding: "10px 0",
                  textDecoration: "underline", textDecorationStyle: "dotted",
                }}>
                  Don't know / N/A
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Continue / Done */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px 14px" }}>
        {submitted ? (
          <div style={{ color: "#00B48A", fontSize: 12, fontWeight: 700 }}>✓ Done</div>
        ) : (
          <>
            <button type="button" disabled={!canContinue} onClick={handleContinue} style={{
              background: canContinue
                ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)"
                : "rgba(255,255,255,0.07)",
              border: "none", borderRadius: 8,
              color: canContinue ? "#0a1a12" : "var(--text-2)",
              cursor: canContinue ? "pointer" : "not-allowed",
              font: "inherit", fontSize: 12, fontWeight: 800, padding: "9px 20px",
              transition: "background 0.15s",
            }}>
              Continue →
            </button>
            {!canContinue && (
              <div style={{ color: "#6B8899", fontSize: 11, marginTop: 6 }}>
                {!allQualsAnswered
                  ? "Answer the questions above, then fill in your numbers."
                  : !allBenchDone
                    ? "Fill in the remaining numbers to continue."
                    : ""}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── QualSectionCard ──────────────────────────────────────────────────────────

interface QualQuestion {
  key: string;
  label: string;
  options: string[];
  acks: Record<string, string>;
  defaultAck: string;
  condition?: (answers: Record<string, string>) => boolean;
}

function QualSectionCard({
  sectionLabel,
  sectionSub,
  questions,
  externalAnswers = {},
  onComplete,
}: {
  sectionLabel: string;
  sectionSub?: string;
  questions: QualQuestion[];
  externalAnswers?: Record<string, string>;
  onComplete: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const allAnswers = { ...externalAnswers, ...answers };

  const visibleQuestions = questions.filter(q => !q.condition || q.condition(allAnswers));
  const allAnswered = visibleQuestions.every(q => answers[q.key] !== undefined);

  function handleSelect(key: string, value: string) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  function handleContinue() {
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    onComplete(answers);
  }

  return (
    <div style={{
      background: "var(--panel)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12,
      marginTop: 6,
      overflow: "hidden",
    }}>
      <div style={{
        background: "rgba(0,180,138,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "10px 14px",
      }}>
        <div style={{ color: "#00B48A", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>
          {sectionLabel}
        </div>
        {sectionSub && (
          <div style={{ color: "var(--text-2)", fontSize: 12, fontWeight: 600 }}>{sectionSub}</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {visibleQuestions.map((q, i) => {
          const selectedAnswer = answers[q.key];
          const isAnswered = selectedAnswer !== undefined;
          const ack = isAnswered ? (q.acks[selectedAnswer] ?? q.defaultAck) : null;

          return (
            <div
              key={q.key}
              style={{
                animation: "fuelFadeUp 0.3s ease both",
                borderBottom: i < visibleQuestions.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                padding: "11px 14px",
              }}
            >
              <div style={{ color: "var(--text-1)", fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, marginBottom: 9 }}>
                {q.label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {q.options.map(opt => {
                  const isSelected = selectedAnswer === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={submitted}
                      onClick={() => handleSelect(q.key, opt)}
                      style={{
                        background: isSelected ? "rgba(0,180,138,0.15)" : "#0B1720",
                        border: `1px solid ${isSelected ? "rgba(0,180,138,0.55)" : "var(--border-strong)"}`,
                        borderRadius: 20,
                        color: isSelected ? "#00B48A" : "var(--text-2)",
                        cursor: submitted ? "default" : "pointer",
                        font: "inherit",
                        fontSize: 11.5,
                        fontWeight: isSelected ? 700 : 500,
                        padding: "5px 12px",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {ack && (
                <div style={{
                  animation: "fuelFadeUp 0.25s ease both",
                  color: "#00B48A",
                  fontSize: 11.5,
                  fontWeight: 600,
                  lineHeight: 1.45,
                  marginTop: 7,
                }}>
                  ✓ {ack}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 14px 13px" }}>
          <button
            type="button"
            disabled={!allAnswered}
            onClick={handleContinue}
            style={{
              background: allAnswered
                ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)"
                : "rgba(255,255,255,0.07)",
              border: "none",
              borderRadius: 8,
              color: allAnswered ? "#0a1a12" : "var(--text-2)",
              cursor: allAnswered ? "pointer" : "not-allowed",
              font: "inherit",
              fontSize: 12,
              fontWeight: 800,
              padding: "9px 20px",
              transition: "background 0.15s",
            }}
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}

// ── BenchmarkCard ─────────────────────────────────────────────────────────────

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
  const [activeGroupIdx, setActiveGroupIdx] = React.useState(0);
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
    cacPayback: "",
    burnMultiple: "",
    ruleOf40: "",
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
      background: "var(--surface-3)",
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
    // Active group info (used in wizard mode)
    const activeGroup = BENCHMARK_GROUPS[activeGroupIdx];
    const activeGroupReady = activeGroup?.fieldKeys.every(
      k => parseBenchmarkNumber(benchmarkValues[k]) != null,
    ) ?? false;

    function lockGroupAndAdvance() {
      if (activeGroupIdx < BENCHMARK_GROUPS.length - 1) {
        setActiveGroupIdx(prev => prev + 1);
      } else {
        setCompletedCount(BENCHMARK_WIZARD_FIELDS.length);
        setMode("loading");
        window.setTimeout(() => setMode("results"), 1400);
      }
    }

    return cardShell(
      <>
        {/* Cohort header */}
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
                            border: active ? "1px solid rgba(0,180,138,0.55)" : "1px solid var(--panel-border)",
                            borderRadius: 999,
                            color: "var(--text-1)",
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

        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px 16px" }}>
          {entryFlow === "edit-one" ? (
            // ── Edit-browse / single-field-edit mode ─────────────────────────
            <>
              {isEditBrowse && (
                <div style={{ alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.45 }}>
                    Tap ✎ on any metric to edit one field.
                  </div>
                  <button
                    type="button"
                    onClick={finishEditBrowse}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                      color: "var(--text-1)",
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
              )}
              {BENCHMARK_WIZARD_FIELDS.map((field, index) => {
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
                  marginTop: 4,
                  padding: 12,
                }}>
                  <div style={{ color: "var(--text-1)", fontSize: 14, fontWeight: 800, lineHeight: 1.35, marginBottom: activeField.promptHint ? 6 : 10 }}>
                    {activeField.prompt}
                        </div>
                  {activeField.promptHint ? (
                    <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.45, marginBottom: 10 }}>
                      {activeField.promptHint}
                    </div>
                  ) : null}
                  <div style={{ marginBottom: 10, position: "relative" }}>
                      <input
                      ref={activeInputRef}
                      key={activeField.key}
                      autoFocus
                      value={activeRaw}
                      onChange={e => updateFieldValue(activeField.key, e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && activeValue != null) confirmActiveField(); }}
                      placeholder={activeField.placeholder}
                      inputMode={activeField.unit === "percent" ? "decimal" : "numeric"}
                      style={{
                        background: "#0B1720",
                        border: "1px solid rgba(0,180,138,0.35)",
                        borderRadius: 10,
                        boxShadow: activeValue != null ? "0 0 0 1px rgba(0,180,138,0.12)" : "none",
                        color: "var(--text-1)",
                        font: "inherit",
                        fontSize: 18,
                        fontWeight: 800,
                        outline: "none",
                        padding: activeField.unit === "percent" ? "10px 36px 10px 12px" : "10px 12px",
                        width: "100%",
                      }}
                    />
                    {activeField.unit === "percent" && (
                      <span style={{ color: "var(--text-2)", fontSize: 16, fontWeight: 800, pointerEvents: "none", position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>%</span>
                    )}
              </div>
                  <LiveBenchmarkBar compact field={activeField} value={activeValue} animate={pulseKey === activeField.key} />
                  <div style={{ alignItems: "center", display: "flex", gap: 10, marginTop: 10 }}>
                    <button
                      type="button"
                      disabled={activeValue == null}
                      onClick={confirmActiveField}
                      style={{
                        background: activeValue != null ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)" : "rgba(255,255,255,0.06)",
                        border: "none",
                        borderRadius: 8,
                        color: activeValue != null ? "#0a1a12" : "var(--text-2)",
                        cursor: activeValue != null ? "pointer" : "not-allowed",
                        font: "inherit",
                        fontSize: 12,
                        fontWeight: 800,
                        padding: "10px 18px",
                      }}
                    >
                      Save →
                    </button>
                    <button type="button" onClick={cancelSingleFieldEdit} style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 700, padding: "10px 4px" }}>
                      Cancel
                    </button>
            </div>
        </div>
              ) : null}
            </>
          ) : (
            // ── Grouped wizard mode ───────────────────────────────────────────
            <>
              {/* Locked groups */}
              {BENCHMARK_GROUPS.slice(0, activeGroupIdx).map((group, gIdx) => (
                <div key={group.key} style={{ marginBottom: 2 }}>
                  <div style={{ alignItems: "center", display: "flex", gap: 8, marginBottom: 6 }}>
                    <div style={{ color: group.color, fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {group.label} · {group.sub}
                    </div>
                    <span style={{ color: "#00B48A", fontSize: 11 }}>✓</span>
                    <button
                      type="button"
                      onClick={() => setActiveGroupIdx(gIdx)}
                      style={{ ...editButtonStyle, marginLeft: "auto" }}
                    >
                      ✎
                    </button>
                  </div>
                  {group.fieldKeys.map(key => {
                    const field = BENCHMARK_WIZARD_FIELDS.find(f => f.key === key)!;
                    const value = parseBenchmarkNumber(benchmarkValues[key]);
                    if (value == null) return null;
                    return (
                      <LockedBenchmarkRow
                        key={key}
                        editButtonStyle={editButtonStyle}
                        field={field}
                        onEdit={() => setActiveGroupIdx(gIdx)}
                        value={value}
                      />
                    );
                  })}
                </div>
              ))}

              {/* Active group */}
              {activeGroup && (
                <div style={{
                  background: "rgba(0,180,138,0.04)",
                  border: "1px solid rgba(0,180,138,0.18)",
                  borderRadius: 10,
                  overflow: "hidden",
                }}>
                  <div style={{
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 12px 9px",
                  }}>
                    <div>
                      <div style={{ color: activeGroup.color, fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
                        {activeGroup.label}
                      </div>
                      <div style={{ color: "var(--text-1)", fontSize: 13, fontWeight: 800 }}>
                        {activeGroup.sub}
                      </div>
                    </div>
                    <div style={{ color: "var(--text-2)", fontSize: 11, fontWeight: 700 }}>
                      {activeGroupIdx + 1} of {BENCHMARK_GROUPS.length}
                    </div>
                  </div>

                  {activeGroup.fieldKeys.map((key, idx) => {
                    const field = BENCHMARK_WIZARD_FIELDS.find(f => f.key === key)!;
                    const rawValue = benchmarkValues[key];
                    const value = parseBenchmarkNumber(rawValue);
                    return (
                      <div
                        key={key}
                        style={{
                          animation: "fuelFadeUp 0.3s ease both",
                          borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
                          padding: "14px 14px",
                        }}
                      >
                        <div style={{ color: "var(--text-1)", fontSize: 14, fontWeight: 800, lineHeight: 1.35, marginBottom: field.promptHint ? 5 : 10 }}>
                          {field.prompt}
                        </div>
                        {field.promptHint && (
                          <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.45, marginBottom: 10 }}>
                            {field.promptHint}
                          </div>
                        )}
                        <div style={{ marginBottom: 10, position: "relative" }}>
                          <input
                            value={rawValue}
                            onChange={e => updateFieldValue(key, e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && activeGroupReady) lockGroupAndAdvance(); }}
                            placeholder={field.placeholder}
                            inputMode={field.unit === "percent" ? "decimal" : "numeric"}
                            style={{
                              background: "#0B1720",
                              border: `1px solid ${value != null ? "rgba(0,180,138,0.35)" : "rgba(255,255,255,0.12)"}`,
                              borderRadius: 10,
                              boxShadow: value != null ? "0 0 0 1px rgba(0,180,138,0.12)" : "none",
                              color: "var(--text-1)",
                              font: "inherit",
                              fontSize: 18,
                              fontWeight: 800,
                              outline: "none",
                              padding: field.unit === "percent" ? "10px 36px 10px 12px" : "10px 12px",
                              transition: "border-color 0.15s, box-shadow 0.15s",
                              width: "100%",
                            }}
                          />
                          {field.unit === "percent" && (
                            <span style={{ color: "var(--text-2)", fontSize: 16, fontWeight: 800, pointerEvents: "none", position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>%</span>
                          )}
                        </div>
                        <LiveBenchmarkBar compact field={field} value={value} animate={pulseKey === key} />
                      </div>
                    );
                  })}

                  <div style={{ alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 12, padding: "10px 12px 12px" }}>
                    <button
                      type="button"
                      disabled={!activeGroupReady}
                      onClick={lockGroupAndAdvance}
                      style={{
                        background: activeGroupReady
                          ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)"
                          : "rgba(255,255,255,0.07)",
                        border: "none",
                        borderRadius: 8,
                        color: activeGroupReady ? "#0a1a12" : "var(--text-2)",
                        cursor: activeGroupReady ? "pointer" : "not-allowed",
                        font: "inherit",
                        fontSize: 12,
                        fontWeight: 800,
                        padding: "10px 18px",
                      }}
                    >
                      {activeGroupIdx < BENCHMARK_GROUPS.length - 1
                        ? `Lock in ${activeGroup.label} →`
                        : "See my full benchmark →"}
          </button>
                    <span style={{ color: "var(--text-2)", fontSize: 11.5 }}>
                      {activeGroup.fieldKeys.filter(k => parseBenchmarkNumber(benchmarkValues[k]) != null).length} / {activeGroup.fieldKeys.length} filled
                    </span>
        </div>
      </div>
              )}
            </>
          )}
          <div ref={wizardEndRef} />
        </div>
      </>,
    );
  }

  if (mode === "loading") {
    return (
      <div style={{
        background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.09)",
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
        <div style={{ color: "var(--text-1)", fontSize: 14, fontWeight: 800 }}>Building your benchmark</div>
        <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.5, marginTop: 5 }}>
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
        background: "linear-gradient(135deg, var(--panel) 0%, var(--bg-main) 100%)",
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
            color: "var(--text-1)",
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
                <div style={{ color: "var(--text-2)", fontSize: 9.5, fontWeight: 900, letterSpacing: "0.08em", marginBottom: 6, textTransform: "uppercase" }}>{item.stage}</div>
              <strong style={{ color: "var(--text-1)", display: "block", fontSize: 12, lineHeight: 1.25 }}>{item.title}</strong>
              <p style={{ color: "var(--text-2)", fontSize: 10.5, lineHeight: 1.3, margin: "4px 0 0" }}>{item.detail}</p>
            </button>
            );
          })}
        </div>
      </div>

      <BenchmarkPeerComparisonPanel
        values={benchmarkValues}
        cohortLabel={cohortLabel}
        onEdit={() => {
          setMode("entry");
          setEntryFlow("edit-one");
          setEditingFieldIndex(null);
          setCompletedCount(BENCHMARK_WIZARD_FIELDS.length);
        }}
      />
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
      background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>York IE — embedded growth partner</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4, lineHeight: 1.55 }}>
          York IE provides senior practitioners — not consultants — across the same four tracks Fuel monitors. They work inside your team to move the numbers Fuel is tracking.
        </div>
      </div>

      <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {tracks.map(t => (
          <div key={t.label} style={{
            background: "var(--panel)", border: `1px solid ${t.color}22`,
            borderRadius: 9, padding: "12px 13px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.color }}>{t.label}</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5 }}>Fuel tracks</div>
              {t.tracked.map(item => (
                <div key={item} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
                  <span style={{ color: t.color, fontSize: 10, marginTop: 1, flexShrink: 0 }}>·</span>
                  <span style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.4 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{
              borderTop: `1px solid ${t.color}18`, paddingTop: 8,
              fontSize: 11, color: "var(--text-1)", lineHeight: 1.45, fontStyle: "italic",
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
            background: "transparent", color: "var(--text-2)",
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
      background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{headline}</div>
      </div>
      <div style={{ padding: "10px 16px 4px", display: "flex", flexDirection: "column", gap: 8 }}>
        {props.map(p => (
          <div key={p.title} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{p.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>{p.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>{p.desc}</div>
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
      background: "var(--surface-3)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12,
      marginTop: 4,
      overflow: "hidden",
    }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", marginBottom: 5, textTransform: "uppercase" }}>
          York IE projects
        </div>
        <div style={{ color: "var(--text-1)", fontSize: 14, fontWeight: 800 }}>
          Active work Fuel will use for intelligence generation
        </div>
        <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.55, marginTop: 5 }}>
          Your York IE workspace is already connected, so Fuel can use these active projects, updates, and service context automatically. You can review detailed project updates anytime in Scorecard.
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, padding: 14 }}>
        {projects.map(project => (
          <div key={project.title} style={{
            background: "var(--panel)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 9,
            padding: 12,
          }}>
            <div style={{ alignItems: "center", display: "flex", gap: 8, marginBottom: 5 }}>
              <span style={{ color: "#00B48A", fontSize: 10, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>{project.area}</span>
              <span style={{ background: "rgba(0,180,138,0.1)", border: "1px solid rgba(0,180,138,0.2)", borderRadius: 999, color: "var(--text-1)", fontSize: 10, fontWeight: 800, padding: "2px 7px" }}>
                {project.status}
              </span>
            </div>
            <strong style={{ color: "var(--text-1)", display: "block", fontSize: 13 }}>{project.title}</strong>
            <p style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.5, margin: "5px 0 0" }}>{project.summary}</p>
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
      background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>Why add integrations?</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3 }}>Your integrations are what power everything in Fuel.</div>
      </div>

      {/* Reasons — compact 2-col */}
      <div style={{ padding: "12px 16px 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {reasons.map(r => (
          <div key={r.title} style={{
            display: "flex", gap: 9, alignItems: "flex-start",
            background: "var(--panel)", border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 8, padding: "9px 11px",
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{r.icon}</span>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.45 }}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Available integrations by track */}
      <div style={{ padding: "8px 16px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Available integrations</div>
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
                    fontSize: 11, color: "var(--text-2)",
                    background: "var(--panel)", border: "1px solid rgba(255,255,255,0.07)",
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
      background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12, overflow: "hidden", marginTop: 4,
    }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>Set up your integrations</div>
        <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 3 }}>Select the integrations you want active. Premium connectors can be added to your Fuel subscription from the Connector Hub.</div>
      </div>
      {categories.map(cat => {
        const items = INTEGRATIONS.filter(i => i.category === cat);
        return (
          <div key={cat} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{cat}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {items.map(item => {
                const isSelected = selected.includes(item.id);
                return (
                  <button key={item.id} onClick={() => onToggle(item.id)} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    background: isSelected ? "rgba(61,214,140,0.1)" : "var(--panel)",
                    border: isSelected ? "1px solid rgba(61,214,140,0.3)" : "1px solid var(--panel-border)",
                    borderRadius: 7, padding: "6px 10px",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      background: item.color + "22",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800, color: item.color,
                    }}>{item.abbr}</span>
                    <span style={{ fontSize: 11.5, color: isSelected ? "#00B48A" : "var(--text-2)", fontWeight: isSelected ? 600 : 400 }}>{item.name}</span>
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
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>You can add premium connectors anytime from the Connector Hub</span>
        )}
      </div>
    </div>
  );
}

// ─── Team Structure Card ─────────────────────────────────────────────────────

const TEAM_FUNCTIONS = [
  "Engineering",
  "Product & Design",
  "Sales",
  "Marketing",
  "Customer Success",
  "Finance & Ops",
  "Leadership",
] as const;

type TeamFunction = typeof TEAM_FUNCTIONS[number];
type TeamHeadcount = Record<TeamFunction, number>;

function defaultTeamDistribution(total: number): TeamHeadcount {
  const t = Math.max(total, 1);
  return {
    Engineering: Math.max(1, Math.round(t * 0.34)),
    "Product & Design": Math.max(1, Math.round(t * 0.12)),
    Sales: Math.max(1, Math.round(t * 0.14)),
    Marketing: Math.max(1, Math.round(t * 0.08)),
    "Customer Success": Math.max(1, Math.round(t * 0.08)),
    "Finance & Ops": Math.max(1, Math.round(t * 0.08)),
    Leadership: Math.max(1, Math.round(t * 0.16)),
  };
}

const FUNCTION_COLORS: Record<TeamFunction, string> = {
  Engineering: "#00B48A",
  "Product & Design": "#2BB8A0",
  Sales: "#D4924A",
  Marketing: "#8B76D4",
  "Customer Success": "#9BD4BC",
  "Finance & Ops": "#C9976B",
  Leadership: "var(--text-1)",
};

function linkedInTeamDistribution(total: number): TeamHeadcount {
  const t = Math.max(total, 1);
  return {
    Engineering: Math.max(1, Math.round(t * 0.34)),
    "Product & Design": Math.round(t * 0.12),
    Sales: Math.round(t * 0.14),
    Marketing: Math.round(t * 0.08),
    "Customer Success": Math.round(t * 0.08),
    "Finance & Ops": Math.round(t * 0.08),
    Leadership: Math.round(t * 0.16),
  };
}

function TeamStructureCard({
  totalHeadcount,
  onConfirm,
  hideEmptyRows = false,
  allowAddFunction = false,
  confirmLabel = "Looks right →",
}: {
  totalHeadcount: number;
  onConfirm: (headcount: TeamHeadcount) => void;
  hideEmptyRows?: boolean;
  allowAddFunction?: boolean;
  confirmLabel?: string;
}) {
  const [counts, setCounts] = React.useState<TeamHeadcount>(
    linkedInTeamDistribution(totalHeadcount || 12),
  );
  const [confirmed, setConfirmed] = React.useState(false);
  const [addedFunctions, setAddedFunctions] = React.useState<Set<TeamFunction>>(new Set());

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...Object.values(counts), 1);

  const visibleFunctions = TEAM_FUNCTIONS.filter(fn =>
    !hideEmptyRows || counts[fn] > 0 || addedFunctions.has(fn),
  );
  const hiddenFunctions = TEAM_FUNCTIONS.filter(fn =>
    hideEmptyRows && counts[fn] === 0 && !addedFunctions.has(fn),
  );

  const update = (fn: TeamFunction, delta: number) => {
    setCounts(prev => ({ ...prev, [fn]: Math.max(0, prev[fn] + delta) }));
  };

  const addFunction = (fn: TeamFunction) => {
    setAddedFunctions(prev => new Set([...prev, fn]));
    setCounts(prev => ({ ...prev, [fn]: Math.max(1, prev[fn]) }));
  };

  return (
    <div style={{
      background: "var(--surface-3)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12,
      marginTop: 4,
      overflow: "hidden",
    }}>
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 16px",
      }}>
        <div style={{ color: "var(--text-2)", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          Team structure
        </div>
        <div style={{ color: "var(--text-1)", fontSize: 14, fontWeight: 800, lineHeight: 1.35 }}>
          {total} people total
        </div>
        <div style={{ color: "var(--text-2)", fontSize: 11.5, lineHeight: 1.45, marginTop: 3 }}>
          We pulled this from LinkedIn. Adjust if anything looks off.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "10px 16px 14px" }}>
        {visibleFunctions.map(fn => {
          const count = counts[fn];
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const color = FUNCTION_COLORS[fn];
          return (
            <div key={fn} style={{
              alignItems: "center",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              display: "grid",
              gap: 10,
              gridTemplateColumns: "130px 1fr 80px",
              padding: "8px 0",
            }}>
              <div style={{ color: "var(--text-1)", fontSize: 12, fontWeight: 600 }}>{fn}</div>
              <div style={{
                background: "#07131C",
                borderRadius: 999,
                height: 6,
                overflow: "hidden",
                position: "relative",
              }}>
                <div style={{
                  background: color,
                  borderRadius: 999,
                  height: "100%",
                  opacity: 0.75,
                  transition: "width 0.3s ease",
                  width: `${pct}%`,
                }} />
              </div>
              <div style={{ alignItems: "center", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {!confirmed && (
                  <button
                    type="button"
                    onClick={() => update(fn, -1)}
                    disabled={count === 0}
                    style={{
                      alignItems: "center",
                      background: "var(--border)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 4,
                      color: "var(--text-2)",
                      cursor: count === 0 ? "not-allowed" : "pointer",
                      display: "flex",
                      fontSize: 13,
                      fontWeight: 700,
                      height: 20,
                      justifyContent: "center",
                      lineHeight: 1,
                      opacity: count === 0 ? 0.3 : 1,
                      width: 20,
                    }}
                  >−</button>
                )}
                <span style={{ color: color, fontSize: 13, fontWeight: 800, minWidth: 18, textAlign: "center" }}>
                  {count}
                </span>
                {!confirmed && (
                  <button
                    type="button"
                    onClick={() => update(fn, 1)}
                    style={{
                      alignItems: "center",
                      background: "rgba(0,180,138,0.08)",
                      border: "1px solid rgba(0,180,138,0.2)",
                      borderRadius: 4,
                      color: "#00B48A",
                      cursor: "pointer",
                      display: "flex",
                      fontSize: 13,
                      fontWeight: 700,
                      height: 20,
                      justifyContent: "center",
                      lineHeight: 1,
                      width: 20,
                    }}
                  >+</button>
                )}
              </div>
            </div>
          );
        })}
        {allowAddFunction && hiddenFunctions.length > 0 && !confirmed && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 8, paddingTop: 10 }}>
            <div style={{ color: "var(--text-2)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 8, textTransform: "uppercase" }}>
              Add a function
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {hiddenFunctions.map(fn => (
                <button
                  key={fn}
                  type="button"
                  onClick={() => addFunction(fn)}
                  style={{
                    background: "#0B1720",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 20,
                    color: "var(--text-2)",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "5px 12px",
                  }}
                >
                  + {fn}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!confirmed && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px 14px" }}>
          <button
            type="button"
            onClick={() => {
              setConfirmed(true);
              onConfirm(counts);
            }}
            style={{
              background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
              border: "none",
              borderRadius: 8,
              color: "#0a1a12",
              cursor: "pointer",
              font: "inherit",
              fontSize: 12,
              fontWeight: 800,
              padding: "9px 20px",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Onboarding wizard ────────────────────────────────────────────────────────

type WizardStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

const WIZARD_STEP_COUNT = 10;

const WIZARD_STEP_LABELS: Record<WizardStepId, string> = {
  1: "Profile",
  2: "GTM questions",
  3: "GTM numbers",
  4: "RevOps questions",
  5: "RevOps numbers",
  6: "Development questions",
  7: "Development numbers",
  8: "Team",
  9: "Review",
  10: "Suggestions",
};

const WIZARD_STEP_TITLES: Record<WizardStepId, string> = {
  1: "Review your profile",
  2: "GTM & Marketing",
  3: "GTM numbers",
  4: "RevOps",
  5: "RevOps numbers",
  6: "Development",
  7: "Development numbers",
  8: "Confirm your team",
  9: "Review your answers",
  10: "Here is where your company actually sits",
};

const GTM_WIZARD_QUESTIONS: QualQuestion[] = [
  {
    key: "salesMotion",
    label: "What is your primary sales motion?",
    options: ["Sales-led", "Product-led", "Founder-led", "Not yet"],
    acks: {
      "Sales-led": "A defined motion. Let's see if the numbers support it.",
      "Product-led": "Self-serve scales well — if conversion holds. We'll track it.",
      "Founder-led": "Founder-led works early but creates a ceiling. We'll flag this in your Scorecard.",
      "Not yet": "Pre-GTM. That shapes everything else in this section.",
    },
    defaultAck: "Got it.",
  },
  {
    key: "funnelBreakdown",
    label: "Where does your funnel break down most?",
    options: ["Awareness", "Conversion", "Retention"],
    acks: {
      Awareness: "Top of funnel is the hardest to fix without a dedicated motion. Noted.",
      Conversion: "Pipeline exists but isn't closing. Could be ICP, messaging, or process. We'll dig in.",
      Retention: "Keeping customers is the real moat. Let's see your retention numbers.",
    },
    defaultAck: "Noted.",
    condition: (a) => Boolean(a.salesMotion) && a.salesMotion !== "Not yet",
  },
  {
    key: "dealSize",
    label: "What is your average deal size?",
    options: ["Under $1K", "$1K–$10K", "$10K–$100K", "Don't know yet"],
    acks: {
      "Under $1K": "High volume, low touch. Efficiency matters.",
      "$1K–$10K": "Mid-market motion. Sales cycle and CAC payback are the metrics to watch.",
      "$10K–$100K": "Enterprise-leaning. Sales process and cycle length will matter a lot.",
      "Don't know yet": "That's okay at this stage. We'll revisit as pipeline develops.",
    },
    defaultAck: "Noted.",
    condition: (a) => a.salesMotion === "Sales-led" || a.salesMotion === "Founder-led",
  },
  {
    key: "investorIntros",
    label: "Are you open to investor intros from York IE?",
    options: ["Yes", "Not right now", "Actively fundraising"],
    acks: {
      Yes: "Noted. York IE will flag relevant intros based on your profile.",
      "Not right now": "Got it. You can update this anytime from your profile.",
      "Actively fundraising": "Good timing. We'll make sure your Scorecard supports the narrative.",
    },
    defaultAck: "Noted.",
  },
];

const REVOPS_WIZARD_QUESTIONS: QualQuestion[] = [
  {
    key: "pipelineTool",
    label: "What are you using to manage your pipeline?",
    options: ["CRM", "Spreadsheet", "Nothing yet"],
    acks: {
      CRM: "Good foundation. Pipeline visibility is a real advantage at this stage.",
      Spreadsheet: "Gets the job done early on. Watch for gaps as the team grows.",
      "Nothing yet": "No pipeline tool means no pipeline visibility. That's a gap we'll track.",
    },
    defaultAck: "Got it.",
  },
  {
    key: "salesProcess",
    label: "How defined is your sales process?",
    options: ["Documented", "Informal", "Not yet"],
    acks: {
      Documented: "A written process is a competitive advantage. Protect it.",
      Informal: "Consistent but not captured. One bad hire away from inconsistency.",
      "Not yet": "That's the right thing to know. Define it before you scale the team.",
    },
    defaultAck: "Got it.",
    condition: (a) => Boolean(a.pipelineTool) && a.pipelineTool !== "Nothing yet",
  },
  {
    key: "contractType",
    label: "What is your primary contract type?",
    options: ["Monthly", "Annual", "Usage-based", "Not yet defined"],
    acks: {
      Monthly: "Flexible for customers, but annual contracts improve predictability.",
      Annual: "Strong for forecasting and reducing churn risk.",
      "Usage-based": "Aligns incentives with customer value. NRR is your key metric.",
      "Not yet defined": "Define this before your first enterprise conversation.",
    },
    defaultAck: "Noted.",
    condition: (a) => a.salesMotion !== "Not yet" && Boolean(a.salesMotion),
  },
  {
    key: "runway",
    label: "How long is your current runway?",
    options: ["Under 6 months", "6–12 months", "12–18 months", "Over 18 months"],
    acks: {
      "Under 6 months": "That's urgent. This will show as the highest priority signal in your Scorecard.",
      "6–12 months": "Enough to execute, not enough to be comfortable. Keep an eye on burn.",
      "12–18 months": "Solid position. Enough runway to be intentional about growth.",
      "Over 18 months": "Strong position. Growth decisions can be proactive, not defensive.",
    },
    defaultAck: "Got it.",
  },
];

const DEV_WIZARD_QUESTIONS: QualQuestion[] = [
  {
    key: "productType",
    label: "What type of product are you building?",
    options: ["SaaS / web app", "API / platform", "Marketplace", "Hardware + software"],
    acks: {
      "SaaS / web app": "The most common model in your cohort. Gross margin and churn are key.",
      "API / platform": "Developer-led growth is possible here. Usage metrics matter.",
      Marketplace: "Two-sided dynamics add complexity. Liquidity is the primary challenge.",
      "Hardware + software": "Harder margins, stickier customers. Gross margin benchmarks will differ.",
    },
    defaultAck: "Got it.",
  },
  {
    key: "aiRole",
    label: "Is AI core to your product?",
    options: ["Core product", "A feature", "Not yet"],
    acks: {
      "Core product": "AI-native. SOC 2 and ISO compliance early will unlock enterprise faster.",
      "A feature": "AI as a differentiator. Make sure it's defensible, not just additive.",
      "Not yet": "Not required at this stage. Worth revisiting at Acceleration.",
    },
    defaultAck: "Got it.",
  },
  {
    key: "productChallenge",
    label: "What is your biggest product challenge right now?",
    options: ["Speed", "Quality", "Roadmap clarity"],
    acks: {
      Speed: "Velocity matters. We'll track shipping cadence in your Scorecard.",
      Quality: "Reliability builds trust faster than features. Got it.",
      "Roadmap clarity": "Direction before speed. A clear roadmap compounds over time.",
    },
    defaultAck: "Noted.",
  },
];

const GTM_BENCH_KEYS: (keyof BenchmarkValues)[] = ["arr", "arrGrowth", "nrr", "logoRetention"];
const REVOPS_BENCH_KEYS: (keyof BenchmarkValues)[] = ["grossMargin", "cacPayback", "burnMultiple", "ruleOf40", "monthlyBurn", "cashOnHand"];
const DEV_BENCH_KEYS: (keyof BenchmarkValues)[] = ["headcount", "payingCustomers"];

const WIZARD_GROUP_COLORS = { gtm: "#00B48A", revops: "#D4924A", dev: "#8B76D4" } as const;

const WIZARD_STEP_INTROS: Partial<Record<WizardStepId, string>> = {
  2: "Your go-to-market motion drives everything else in your benchmark. Tell me how you sell — I'll map it against peers at your stage.",
  3: "Now the numbers. ARR, growth, retention — this is where you land on the curve against real companies like yours.",
  4: "RevOps is the engine behind revenue. Pipeline tools, process, contracts, runway — this is where leaks show up.",
  5: "Margin, burn, cash — the financial picture that determines how long you can execute.",
  6: "Product and engineering shape what you can ship and how fast. Three quick questions.",
  7: "Team size and customer count — the scaling signals peers use to compare trajectory.",
  8: "Last input before your intelligence pass. Confirm your team breakdown — Fuel found this on LinkedIn.",
};

const WIZARD_STEP_EYEBROWS: Partial<Record<WizardStepId, { label: string; color: string }>> = {
  2: { label: "GTM & Marketing", color: WIZARD_GROUP_COLORS.gtm },
  3: { label: "GTM & Marketing", color: WIZARD_GROUP_COLORS.gtm },
  4: { label: "RevOps & Finance", color: WIZARD_GROUP_COLORS.revops },
  5: { label: "RevOps & Finance", color: WIZARD_GROUP_COLORS.revops },
  6: { label: "Product & Engineering", color: WIZARD_GROUP_COLORS.dev },
  7: { label: "Product & Engineering", color: WIZARD_GROUP_COLORS.dev },
};

function WizardStepHeader({ step, title }: { step: WizardStepId; title: string }) {
  const intro = WIZARD_STEP_INTROS[step];
  const eyebrow = WIZARD_STEP_EYEBROWS[step];
  return (
    <div style={{ marginBottom: 28 }}>
      {eyebrow ? (
        <div style={{
          color: fuel.textMuted,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.12em",
          marginBottom: 10,
          textTransform: "uppercase",
        }}>
          <span style={{ color: eyebrow.color, marginRight: 6 }}>●</span>
          {eyebrow.label}
        </div>
      ) : null}
      <h2 style={{ color: fuel.text, fontSize: 22, fontWeight: 800, lineHeight: 1.3, margin: intro ? "0 0 10px" : 0 }}>
        {title}
      </h2>
      {intro ? (
        <p style={{ color: fuel.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 540 }}>
          {intro}
        </p>
      ) : null}
    </div>
  );
}

function WizardStepIndicator({ step }: { step: WizardStepId }) {
  const pct = (step / WIZARD_STEP_COUNT) * 100;
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ color: "var(--text-2)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 10 }}>
        Step {step} of {WIZARD_STEP_COUNT} · {WIZARD_STEP_LABELS[step]}
      </div>
      <div style={{ background: "#07131C", borderRadius: 999, height: 4, overflow: "hidden" }}>
        <div style={{
          background: "linear-gradient(90deg, #00B48A, #ECD67F)",
          borderRadius: 999,
          height: "100%",
          transition: "width 0.35s ease",
          width: `${pct}%`,
        }} />
      </div>
    </div>
  );
}

/** Contextual ack after chip select — soft green fill, no selection echo. */
function QualAckMessage({ text }: { text: string }) {
  return (
    <div style={{
      animation: "fuelFadeUp 0.22s ease both",
      background: "rgba(0,180,138,0.08)",
      border: "1px solid rgba(0,180,138,0.18)",
      borderLeft: `2px solid ${fuel.accent}`,
      borderRadius: 8,
      color: fuel.text,
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 1.5,
      marginTop: 12,
      padding: "10px 13px",
    }}>
      {text}
    </div>
  );
}

function WizardQualStep({
  step,
  title,
  questions,
  answers,
  externalAnswers = {},
  onChange,
}: {
  step: WizardStepId;
  title: string;
  questions: QualQuestion[];
  answers: Record<string, string>;
  externalAnswers?: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const allAnswers = { ...externalAnswers, ...answers };
  const visible = questions.filter(q => !q.condition || q.condition(allAnswers));

  return (
    <div>
      <WizardStepHeader step={step} title={title} />
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {visible.map(q => {
          const sel = answers[q.key];
          const ack = sel ? (q.acks[sel] ?? q.defaultAck) : null;
          return (
            <div key={q.key} style={{ marginBottom: ack ? 4 : 0 }}>
              <div style={{ color: fuel.text, fontSize: 15, fontWeight: 700, lineHeight: 1.45, marginBottom: 12 }}>{q.label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {q.options.map(opt => {
                  const isSelected = sel === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onChange(q.key, opt)}
                      style={{
                        background: isSelected ? "rgba(0,180,138,0.15)" : fuel.surfaceInset,
                        border: `1px solid ${isSelected ? "rgba(0,180,138,0.55)" : fuel.border}`,
                        borderRadius: 20,
                        color: isSelected ? fuel.accent : fuel.textMuted,
                        cursor: "pointer",
                        font: "inherit",
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 500,
                        padding: "8px 16px",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {ack && <QualAckMessage text={ack} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isBenchFieldFilled(raw: string | undefined): boolean {
  if (!raw) return false;
  if (raw === "__na__") return true;
  return parseBenchmarkNumber(raw) != null;
}

type SectionTrack = "GTM" | "RevOps" | "Development";

type SectionIntelSignal = {
  signalId: string;
  category: string;
  label: string;
  value: string;
  description: string;
  tone: "good" | "gap" | "neutral";
};

type SectionSummaryNumber = {
  label: string;
  value: string;
  hint?: string;
};

type IntelSignalCatalogEntry = {
  signalId: string;
  category: string;
  label: string;
};

const PREVIEW_MAX = { signals: 3, initiatives: 2, playbooks: 2, connections: 3 } as const;

const BENCH_INTEL_SIGNALS: Record<string, IntelSignalCatalogEntry> = {
  arr: { signalId: "arr_usd", category: "growth", label: "ARR" },
  arrGrowth: { signalId: "arr_growth_yoy_pct", category: "growth", label: "ARR growth (YoY)" },
  nrr: { signalId: "nrr_pct", category: "retention", label: "Net revenue retention" },
  logoRetention: { signalId: "logo_retention_pct", category: "retention", label: "Logo retention" },
  grossMargin: { signalId: "gross_margin_pct", category: "efficiency", label: "Gross margin (blended)" },
  cacPayback: { signalId: "cac_payback_months", category: "efficiency", label: "CAC payback" },
  burnMultiple: { signalId: "burn_multiple", category: "efficiency", label: "Burn multiple" },
  ruleOf40: { signalId: "rule_of_40", category: "efficiency", label: "Rule of 40" },
  monthlyBurn: { signalId: "monthly_burn_usd", category: "finance", label: "Monthly net burn" },
  cashOnHand: { signalId: "cash_on_hand_usd", category: "finance", label: "Cash on hand" },
  headcount: { signalId: "fte_count", category: "team", label: "FTE headcount" },
  payingCustomers: { signalId: "paid_customer_count", category: "growth", label: "Paid customers" },
};

const QUAL_INTEL_SIGNALS: Partial<Record<keyof QualAnswers, IntelSignalCatalogEntry>> = {
  salesMotion: { signalId: "go_to_market_motion", category: "gtm", label: "Primary GTM motion" },
  funnelBreakdown: { signalId: "channel_challenges", category: "gtm", label: "Channel / GTM challenges" },
  dealSize: { signalId: "average_deal_size_usd", category: "gtm", label: "Average deal size" },
  investorIntros: { signalId: "open_to_investor_intros", category: "fundraising", label: "Open to investor intros" },
  pipelineTool: { signalId: "crm_platform", category: "vendor stack", label: "CRM platform" },
  salesProcess: { signalId: "channel_challenges", category: "gtm", label: "Sales process" },
  contractType: { signalId: "primary_contract_length_months", category: "gtm", label: "Primary contract type" },
  runway: { signalId: "runway_months", category: "finance", label: "Runway" },
  productType: { signalId: "sector_category", category: "product", label: "Product type" },
  aiRole: { signalId: "ai_selection_category", category: "product", label: "AI classification" },
  productChallenge: { signalId: "key_risks", category: "strategic", label: "Product challenge" },
};

function tonePriority(tone: SectionIntelSignal["tone"]) {
  return tone === "gap" ? 0 : tone === "neutral" ? 1 : 2;
}

function firstSentence(text: string) {
  const match = text.match(/^[^.!?]+[.!?]?/);
  return match ? match[0].trim() : text;
}

function IntelligencePreviewRow({ signal }: { signal: SectionIntelSignal }) {
  return (
    <div style={{
      background: "rgba(31, 49, 64, 0.38)",
      border: `1px solid ${signal.tone === "gap" ? "rgba(212,146,74,0.25)" : fuel.border}`,
      borderRadius: 8,
      display: "grid",
      gap: "6px 14px",
      gridTemplateColumns: "92px minmax(0, 1fr)",
      padding: "11px 12px",
    }}>
      <span style={{
        alignSelf: "start",
        background: "rgba(10, 20, 28, 0.55)",
        border: "1px solid var(--panel-border)",
        borderRadius: 999,
        color: fuel.textMuted,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.04em",
        padding: "4px 8px",
        textAlign: "center",
        textTransform: "lowercase",
      }}>
        {signal.category}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: "6px 10px" }}>
          <strong style={{ color: fuel.text, fontSize: 13, fontWeight: 500 }}>{signal.label}</strong>
          <span style={{
            color: signal.tone === "gap" ? "#D4924A" : fuel.accent,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {signal.value}
          </span>
        </div>
        {signal.description ? (
          <p style={{ color: fuel.textMuted, fontSize: 11.5, lineHeight: 1.45, margin: "4px 0 0" }}>{signal.description}</p>
        ) : null}
      </div>
    </div>
  );
}

type SectionFieldInitiative = {
  id: string;
  fieldLabel: string;
  title: string;
  description: string;
  cadence: "Continuous" | "One-time";
  track: SectionTrack | "Cross-functional";
};

type HolisticConnection = {
  id: string;
  domains: SectionTrack[];
  summary: string;
  tone: "good" | "gap" | "neutral";
};

type SectionSummary = {
  headline: string;
  fuelHelp: string;
  summaryNumbers: SectionSummaryNumber[];
  signals: SectionIntelSignal[];
  initiatives: SectionFieldInitiative[];
  playbooks: SuggestedPlaybook[];
  connections?: HolisticConnection[];
  stageName?: string;
};

const TIER_ORDER = { bottom: 0, lower: 1, mid: 2, upper: 3, top: 4 } as const;

const GTM_METRIC_PLAYBOOKS: Partial<Record<(typeof GTM_BENCH_KEYS)[number], SuggestedPlaybook>> = {
  arr: { track: "Marketing", title: "Repeatable GTM Motion", prompt: "Shape the next scalable acquisition channel from customer patterns." },
  arrGrowth: { track: "Marketing", title: "Outbound Performance Review", prompt: "Compare messaging and reply quality before scaling volume." },
  nrr: { track: "RevOps", title: "Retention Playbook", prompt: "Map expansion and churn drivers before adding new logos." },
  logoRetention: { track: "Marketing", title: "ICP Validation Sprint", prompt: "Test ICP against real outreach and conversion signals." },
};

const GTM_QUAL_INITIATIVES: Partial<Record<keyof QualAnswers, Record<string, Pick<SectionFieldInitiative, "title" | "description" | "cadence">>>> = {
  salesMotion: {
    "Sales-led": { title: "Document sales-led playbook", description: "Capture stages, criteria, and handoffs before the next hire.", cadence: "One-time" },
    "Product-led": { title: "Optimize PLG conversion funnel", description: "Instrument signup → activation → paid and fix the biggest drop.", cadence: "Continuous" },
    "Founder-led": { title: "Build repeatable sales motion", description: "Define a motion others can run before founder bandwidth caps growth.", cadence: "Continuous" },
    "Not yet": { title: "Define GTM motion before scaling", description: "Pick one motion and one ICP before spending on acquisition.", cadence: "One-time" },
  },
  funnelBreakdown: {
    Awareness: { title: "Top-of-funnel acquisition sprint", description: "One channel, one message, one ICP — validate before spreading spend.", cadence: "One-time" },
    Conversion: { title: "Fix conversion before adding pipeline", description: "Audit ICP, messaging, and process — pipeline that won't close is noise.", cadence: "Continuous" },
    Retention: { title: "Retention health check", description: "Map churn drivers and expansion paths before chasing new logos.", cadence: "Continuous" },
  },
  dealSize: {
    "Under $1K": { title: "Automate high-volume onboarding", description: "CAC payback is everything at this deal size — remove manual touch.", cadence: "Continuous" },
    "$1K–$10K": { title: "Track CAC payback by segment", description: "Sales cycle and payback period decide whether this motion scales.", cadence: "Continuous" },
    "$10K–$100K": { title: "Document enterprise sales process", description: "Cycle length and process consistency matter more as deal size climbs.", cadence: "One-time" },
    "Don't know yet": { title: "Set deal size target for ICP", description: "Define expected ACV before building pipeline or hiring sales.", cadence: "One-time" },
  },
  investorIntros: {
    Yes: { title: "Align Scorecard for investor intros", description: "Keep benchmark narrative current so York IE can flag relevant intros.", cadence: "Continuous" },
    "Not right now": { title: "Revisit fundraising readiness", description: "Set a checkpoint to refresh Scorecard before the next raise.", cadence: "One-time" },
    "Actively fundraising": { title: "Fundraise narrative sprint", description: "Tie GTM metrics to the story investors will pressure-test first.", cadence: "One-time" },
  },
};

const GTM_METRIC_INITIATIVES: Record<(typeof GTM_BENCH_KEYS)[number], { gap: Pick<SectionFieldInitiative, "title" | "description" | "cadence">; strong: Pick<SectionFieldInitiative, "title" | "description" | "cadence"> }> = {
  arr: {
    gap: { title: "Define first revenue milestone", description: "Set a specific ARR target and identify the first 3 target customers.", cadence: "One-time" },
    strong: { title: "Scale repeatable acquisition channel", description: "Lock the next ARR milestone and the one channel that gets you there.", cadence: "Continuous" },
  },
  arrGrowth: {
    gap: { title: "Diagnose growth bottleneck", description: "Find whether the lever is pipeline, conversion, or retention before spending more.", cadence: "One-time" },
    strong: { title: "Protect hypergrowth efficiency", description: "Track retention and burn ratio so growth doesn't outrun unit economics.", cadence: "Continuous" },
  },
  nrr: {
    gap: { title: "Stop revenue leakage", description: "Fix churn and contraction before adding new logos — NRR is the story.", cadence: "Continuous" },
    strong: { title: "Expand existing accounts", description: "Double down on expansion motion while retention is ahead of peers.", cadence: "Continuous" },
  },
  logoRetention: {
    gap: { title: "Run churn post-mortem", description: "Interview recent churned logos — pattern usually shows up in 5 calls.", cadence: "One-time" },
    strong: { title: "Protect logo retention moat", description: "Document what keeps customers — it's your most defensible GTM asset.", cadence: "Continuous" },
  },
};

const REVOPS_METRIC_PLAYBOOKS: Partial<Record<(typeof REVOPS_BENCH_KEYS)[number], SuggestedPlaybook>> = {
  grossMargin: { track: "FinOps", title: "Margin Review", prompt: "Benchmark margins and identify cost drivers before scaling headcount." },
  monthlyBurn: { track: "FinOps", title: "Runway & Burn Review", prompt: "Map burn drivers and the fastest path to extended runway." },
  cashOnHand: { track: "FinOps", title: "Board Readiness Review", prompt: "Prepare runway, forecast, and efficiency metrics for stakeholders." },
};

const REVOPS_QUAL_INITIATIVES: Partial<Record<keyof QualAnswers, Record<string, Pick<SectionFieldInitiative, "title" | "description" | "cadence">>>> = {
  pipelineTool: {
    CRM: { title: "Protect CRM hygiene", description: "Keep lifecycle stages and required fields clean before reporting scales.", cadence: "Continuous" },
    Spreadsheet: { title: "Migrate pipeline to CRM", description: "Spreadsheets break as volume grows — pipeline visibility unlocks GTM playbooks.", cadence: "One-time" },
    "Nothing yet": { title: "Implement CRM before scaling sales", description: "Pipeline visibility is a prerequisite for any repeatable revenue motion.", cadence: "One-time" },
  },
  salesProcess: {
    Documented: { title: "Protect documented sales process", description: "Capture updates as the team grows — consistency is the advantage.", cadence: "Continuous" },
    Informal: { title: "Document sales process", description: "Informal process doesn't survive the next hire — write it down now.", cadence: "One-time" },
    "Not yet": { title: "Define sales process before hiring", description: "Define stages and criteria before adding sales headcount.", cadence: "One-time" },
  },
  contractType: {
    Monthly: { title: "Test annual contract incentives", description: "Annual contracts improve predictability — pilot with willing customers.", cadence: "One-time" },
    Annual: { title: "Protect annual contract motion", description: "Strong for forecasting — track renewal rates and expansion alongside.", cadence: "Continuous" },
    "Usage-based": { title: "Instrument usage for NRR tracking", description: "Usage-based models live or die on NRR — make it visible weekly.", cadence: "Continuous" },
    "Not yet defined": { title: "Define contract structure", description: "Pick a default contract type before enterprise conversations.", cadence: "One-time" },
  },
  runway: {
    "Under 6 months": { title: "Extend runway within 30 days", description: "Identify top costs to pause and begin bridge conversations immediately.", cadence: "One-time" },
    "6–12 months": { title: "Plan next capital event", description: "Begin investor conversations before runway drops below 6 months.", cadence: "Continuous" },
    "12–18 months": { title: "Align burn to growth plan", description: "Enough runway to execute — tie spend to the metrics that move.", cadence: "Continuous" },
    "Over 18 months": { title: "Invest proactively in RevOps", description: "Strong runway — build pipeline infrastructure before you need it.", cadence: "Continuous" },
  },
};

const REVOPS_METRIC_INITIATIVES: Record<(typeof REVOPS_BENCH_KEYS)[number], { gap: Pick<SectionFieldInitiative, "title" | "description" | "cadence">; strong: Pick<SectionFieldInitiative, "title" | "description" | "cadence"> }> = {
  grossMargin: {
    gap: { title: "Review COGS and delivery costs", description: "Small margin improvements compound into meaningful runway extension.", cadence: "One-time" },
    strong: { title: "Protect gross margin as you scale", description: "High margin is a competitive advantage — audit hosting and support load before hiring.", cadence: "Continuous" },
  },
  cacPayback: {
    gap: { title: "Redesign acquisition economics", description: "Long payback usually points at channel mix, ICP fit, or sales-cycle drag — fix the path before scaling spend.", cadence: "One-time" },
    strong: { title: "Scale efficient acquisition", description: "Payback looks healthy — double down on the channels recovering capital fastest.", cadence: "Continuous" },
  },
  burnMultiple: {
    gap: { title: "Improve capital efficiency", description: "Tighten spend that does not move ARR until burn multiple trends toward peer median.", cadence: "One-time" },
    strong: { title: "Keep burn multiple disciplined", description: "Efficient burn leaves room to invest when growth clicks.", cadence: "Continuous" },
  },
  ruleOf40: {
    gap: { title: "Balance growth and profitability", description: "Rule of 40 below peers means growth or margin (or both) needs a clearer operating plan.", cadence: "One-time" },
    strong: { title: "Defend Rule of 40 strength", description: "Growth plus margin is working — keep instrumentation tight as you scale.", cadence: "Continuous" },
  },
  monthlyBurn: {
    gap: { title: "Audit burn drivers", description: "Identify the top 3 costs that don't directly drive revenue or retention.", cadence: "One-time" },
    strong: { title: "Maintain capital efficiency", description: "Efficient burn leaves room to invest when growth clicks.", cadence: "Continuous" },
  },
  cashOnHand: {
    gap: { title: "Model runway scenarios", description: "Build base, downside, and upside cash models for the next 12 months.", cadence: "One-time" },
    strong: { title: "Use cash position strategically", description: "Runway is an asset — invest in the highest-impact gaps first.", cadence: "Continuous" },
  },
};

const DEV_METRIC_PLAYBOOKS: Partial<Record<(typeof DEV_BENCH_KEYS)[number], SuggestedPlaybook>> = {
  headcount: { track: "Development", title: "Scale Readiness Check", prompt: "Review team structure and infrastructure before the next growth push." },
  payingCustomers: { track: "RevOps", title: "Pipeline Operating Rhythm", prompt: "Use stage movement and conversion gaps to guide weekly review." },
};

const DEV_QUAL_INITIATIVES: Partial<Record<keyof QualAnswers, Record<string, Pick<SectionFieldInitiative, "title" | "description" | "cadence">>>> = {
  productType: {
    "SaaS / web app": { title: "Track gross margin vs headcount", description: "SaaS economics depend on margin — connect product delivery cost to GTM scale.", cadence: "Continuous" },
    "API / platform": { title: "Instrument usage metrics", description: "Developer-led growth needs usage data tied to revenue expansion.", cadence: "Continuous" },
    Marketplace: { title: "Measure liquidity metrics", description: "Two-sided dynamics need supply and demand signals before GTM spend.", cadence: "Continuous" },
    "Hardware + software": { title: "Audit COGS per unit", description: "Margin benchmarks differ — track delivery cost before scaling sales.", cadence: "One-time" },
  },
  aiRole: {
    "Core product": { title: "Start SOC 2 / ISO early", description: "AI-native products need compliance to unlock enterprise — start before it's urgent.", cadence: "One-time" },
    "A feature": { title: "Validate AI defensibility", description: "Ensure AI is a moat, not a checkbox — test against peer differentiation.", cadence: "One-time" },
    "Not yet": { title: "Revisit AI roadmap at Acceleration", description: "Not required now — schedule a checkpoint as product matures.", cadence: "One-time" },
  },
  productChallenge: {
    Speed: { title: "Remove shipping blockers", description: "Velocity matters — audit review cycles and deployment friction this sprint.", cadence: "Continuous" },
    Quality: { title: "Reliability sprint", description: "Fix the top 3 support drivers before the next feature push.", cadence: "One-time" },
    "Roadmap clarity": { title: "Align roadmap to GTM motion", description: "Direction before speed — tie the next quarter to what sales can actually sell.", cadence: "One-time" },
  },
};

const DEV_METRIC_INITIATIVES: Record<(typeof DEV_BENCH_KEYS)[number], { gap: Pick<SectionFieldInitiative, "title" | "description" | "cadence">; strong: Pick<SectionFieldInitiative, "title" | "description" | "cadence"> }> = {
  headcount: {
    gap: { title: "Define engineering team structure", description: "Decide in-house vs contractors before the next funding round.", cadence: "One-time" },
    strong: { title: "Protect team efficiency as you hire", description: "Right-size hiring against gross margin and delivery capacity.", cadence: "Continuous" },
  },
  payingCustomers: {
    gap: { title: "Focus on first 10 paying customers", description: "Set a specific customer target before scaling any acquisition channel.", cadence: "One-time" },
    strong: { title: "Connect customers to retention metrics", description: "Customer count is traction — tie it to NRR and logo retention next.", cadence: "Continuous" },
  },
};

const DEFAULT_SECTION_PLAYBOOKS: Record<SectionTrack, SuggestedPlaybook[]> = {
  GTM: [
    { track: "Marketing", title: "ICP Validation Sprint", prompt: "Test ICP against real outreach and conversion signals." },
    { track: "Marketing", title: "Repeatable GTM Motion", prompt: "Shape the next scalable acquisition channel from customer patterns." },
  ],
  RevOps: [
    { track: "FinOps", title: "Runway & Burn Review", prompt: "Map burn drivers and the fastest path to extended runway." },
    { track: "RevOps", title: "Pipeline Operating Rhythm", prompt: "Use stage movement and conversion gaps to guide weekly review." },
  ],
  Development: [
    { track: "Development", title: "Launch Signal Review", prompt: "Use adoption and support signals to define the next product iteration." },
    { track: "Development", title: "Scale Readiness Check", prompt: "Review team structure before the next growth push." },
  ],
};

const FUEL_HELP_BY_TRACK: Record<SectionTrack, (company: string) => string> = {
  GTM: c => c
    ? `Fuel turns this into tracked initiatives and runnable playbooks in ${c}'s workspace — not generic advice.`
    : "Fuel turns this into tracked initiatives and runnable playbooks in your workspace — not generic advice.",
  RevOps: c => c
    ? `Fuel connects ${c}'s runway, margin, and pipeline signals to FinOps playbooks — not isolated spreadsheets.`
    : "Fuel connects runway, margin, and pipeline signals to FinOps playbooks — not isolated spreadsheets.",
  Development: c => c
    ? `Fuel ties ${c}'s product and team signals to what GTM can actually promise — not roadmap fiction.`
    : "Fuel ties product and team signals to what GTM can actually promise — not roadmap fiction.",
};

function getMetricTier(benchValues: Record<string, string>, key: keyof BenchmarkValues) {
  const raw = benchValues[key];
  if (!raw || raw === "__na__") return null;
  const val = parseBenchmarkNumber(raw);
  if (val == null) return null;
  const field = BENCHMARK_WIZARD_FIELDS.find(f => f.key === key)!;
  return { tier: getBenchmarkTier(val, field), field, value: val };
}

function buildSectionSummary(config: {
  track: SectionTrack;
  qualQuestions: QualQuestion[];
  qualAnswers: Record<string, string>;
  qualExternal?: Record<string, string>;
  qualInitiatives: Partial<Record<keyof QualAnswers, Record<string, Pick<SectionFieldInitiative, "title" | "description" | "cadence">>>>;
  qualGapCheck?: (key: string, answer: string) => boolean;
  benchKeys: readonly (keyof BenchmarkValues)[];
  benchValues: Record<string, string>;
  metricInitiatives: Record<string, { gap: Pick<SectionFieldInitiative, "title" | "description" | "cadence">; strong: Pick<SectionFieldInitiative, "title" | "description" | "cadence"> }>;
  metricPlaybooks: Partial<Record<string, SuggestedPlaybook>>;
  companyName: string;
  sectionShort: string;
}): SectionSummary {
  const {
    track, qualQuestions, qualAnswers, qualExternal = {}, qualInitiatives, qualGapCheck,
    benchKeys, benchValues, metricInitiatives, metricPlaybooks, companyName, sectionShort,
  } = config;
  const allAnswers = { ...qualExternal, ...qualAnswers };
  const visibleQ = qualQuestions.filter(q => !q.condition || q.condition(allAnswers));

  const signals: SectionIntelSignal[] = [];
  const initiatives: SectionFieldInitiative[] = [];
  const summaryNumbers: SectionSummaryNumber[] = [];
  const gapInitiatives: SectionFieldInitiative[] = [];
  const otherInitiatives: SectionFieldInitiative[] = [];

  for (const q of visibleQ) {
    const answer = qualAnswers[q.key];
    if (!answer) continue;
    const ack = q.acks[answer] ?? q.defaultAck;
    const qualTone: SectionIntelSignal["tone"] = qualGapCheck?.(q.key, answer) ? "gap" : "neutral";
    const qualDef = QUAL_INTEL_SIGNALS[q.key as keyof QualAnswers];
    signals.push({
      signalId: qualDef?.signalId ?? q.key,
      category: qualDef?.category ?? track.toLowerCase(),
      label: qualDef?.label ?? q.label.replace(/\?$/, ""),
      value: answer,
      description: firstSentence(ack),
      tone: qualTone,
    });

    const qualInit = qualInitiatives[q.key as keyof QualAnswers]?.[answer];
    if (qualInit) {
      const init = { id: `${track.toLowerCase()}-qual-${q.key}`, fieldLabel: q.label.replace(/\?$/, ""), track, ...qualInit };
      (qualTone === "gap" ? gapInitiatives : otherInitiatives).push(init);
    }
  }

  const scoredMetrics: { key: string; tier: ReturnType<typeof getBenchmarkTier> }[] = [];

  for (const key of benchKeys) {
    const raw = benchValues[key];
    const field = BENCHMARK_WIZARD_FIELDS.find(f => f.key === key)!;
    const benchDef = BENCH_INTEL_SIGNALS[key];
    if (!raw) continue;

    if (raw === "__na__") {
      signals.push({
        signalId: benchDef?.signalId ?? key,
        category: benchDef?.category ?? track.toLowerCase(),
        label: benchDef?.label ?? field.label,
        value: "Not logged",
        description: "Missing from peer comparison",
        tone: "neutral",
      });
      gapInitiatives.push({
        id: `${track.toLowerCase()}-bench-${key}-capture`,
        fieldLabel: field.label,
        track,
        title: `Capture ${field.label.toLowerCase()}`,
        description: `Logging this unlocks peer comparison and stage-matched playbooks.`,
        cadence: "One-time",
      });
      continue;
    }

    const val = parseBenchmarkNumber(raw);
    if (val == null) continue;
    const tier = getBenchmarkTier(val, field);
    const insight = getBenchmarkInsight(field, val);
    const tone: SectionIntelSignal["tone"] = isWeakTier(tier) ? "gap" : isStrongTier(tier) ? "good" : "neutral";
    scoredMetrics.push({ key, tier });
    signals.push({
      signalId: benchDef?.signalId ?? key,
      category: benchDef?.category ?? track.toLowerCase(),
      label: benchDef?.label ?? field.label,
      value: formatBenchmarkDisplay(val, field.unit),
      description: isWeakTier(tier) ? insight.headline : insight.tierLabel,
      tone,
    });

    if (summaryNumbers.length < 3) {
      summaryNumbers.push({
        label: benchDef?.label ?? field.label,
        value: formatBenchmarkDisplay(val, field.unit),
        hint: insight.tierLabel,
      });
    }

    const metricInit = metricInitiatives[key][isWeakTier(tier) ? "gap" : "strong"];
    const init = { id: `${track.toLowerCase()}-bench-${key}`, fieldLabel: field.label, track, ...metricInit };
    (isWeakTier(tier) ? gapInitiatives : otherInitiatives).push(init);
  }

  initiatives.push(...gapInitiatives, ...otherInitiatives);

  const topSignals = [...signals].sort((a, b) => tonePriority(a.tone) - tonePriority(b.tone)).slice(0, PREVIEW_MAX.signals);
  const gapCount = signals.filter(s => s.tone === "gap").length;
  const goodCount = signals.filter(s => s.tone === "good").length;
  const headline = gapCount > 0 && goodCount > 0
    ? `${goodCount} strength${goodCount > 1 ? "s" : ""} · ${gapCount} gap${gapCount > 1 ? "s" : ""}`
    : gapCount > 0
      ? `${gapCount} gap${gapCount > 1 ? "s" : ""} to address`
      : goodCount > 0
        ? `Strong ${sectionShort} signals`
        : `${sectionShort} snapshot ready`;

  let playbooks = scoredMetrics
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])
    .flatMap(m => metricPlaybooks[m.key] ? [metricPlaybooks[m.key]!] : [])
    .filter((pb, i, arr) => arr.findIndex(x => x.title === pb.title) === i)
    .slice(0, PREVIEW_MAX.playbooks);

  if (!playbooks.length) playbooks = DEFAULT_SECTION_PLAYBOOKS[track].slice(0, PREVIEW_MAX.playbooks);

  return {
    headline,
    fuelHelp: FUEL_HELP_BY_TRACK[track](companyName),
    summaryNumbers,
    signals: topSignals,
    initiatives: initiatives.slice(0, PREVIEW_MAX.initiatives),
    playbooks,
  };
}

function buildGtmSectionSummary(quals: QualAnswers, benchValues: Record<string, string>, companyName: string): SectionSummary {
  return buildSectionSummary({
    track: "GTM",
    qualQuestions: GTM_WIZARD_QUESTIONS,
    qualAnswers: { salesMotion: quals.salesMotion, funnelBreakdown: quals.funnelBreakdown, dealSize: quals.dealSize, investorIntros: quals.investorIntros },
    qualInitiatives: GTM_QUAL_INITIATIVES,
    qualGapCheck: (key, answer) =>
      (key === "funnelBreakdown" && answer === "Conversion")
      || (key === "salesMotion" && (answer === "Founder-led" || answer === "Not yet")),
    benchKeys: GTM_BENCH_KEYS,
    benchValues,
    metricInitiatives: GTM_METRIC_INITIATIVES,
    metricPlaybooks: GTM_METRIC_PLAYBOOKS,
    companyName,
    sectionShort: "GTM",
  });
}

function buildRevopsSectionSummary(quals: QualAnswers, benchValues: Record<string, string>, companyName: string): SectionSummary {
  return buildSectionSummary({
    track: "RevOps",
    qualQuestions: REVOPS_WIZARD_QUESTIONS,
    qualAnswers: { pipelineTool: quals.pipelineTool, salesProcess: quals.salesProcess, contractType: quals.contractType, runway: quals.runway },
    qualExternal: { salesMotion: quals.salesMotion },
    qualInitiatives: REVOPS_QUAL_INITIATIVES,
    qualGapCheck: (key, answer) =>
      (key === "pipelineTool" && answer === "Nothing yet")
      || (key === "salesProcess" && answer === "Not yet")
      || (key === "runway" && answer === "Under 6 months"),
    benchKeys: REVOPS_BENCH_KEYS,
    benchValues,
    metricInitiatives: REVOPS_METRIC_INITIATIVES,
    metricPlaybooks: REVOPS_METRIC_PLAYBOOKS,
    companyName,
    sectionShort: "RevOps",
  });
}

function buildDevSectionSummary(quals: QualAnswers, benchValues: Record<string, string>, companyName: string): SectionSummary {
  return buildSectionSummary({
    track: "Development",
    qualQuestions: DEV_WIZARD_QUESTIONS,
    qualAnswers: { productType: quals.productType, aiRole: quals.aiRole, productChallenge: quals.productChallenge },
    qualInitiatives: DEV_QUAL_INITIATIVES,
    qualGapCheck: (key, answer) => key === "productChallenge" && answer === "Speed",
    benchKeys: DEV_BENCH_KEYS,
    benchValues,
    metricInitiatives: DEV_METRIC_INITIATIVES,
    metricPlaybooks: DEV_METRIC_PLAYBOOKS,
    companyName,
    sectionShort: "Development",
  });
}

function buildHolisticSectionSummary(
  quals: QualAnswers,
  benchValues: Record<string, string>,
  companyName: string,
  headcount: TeamHeadcount,
): SectionSummary {
  const benchPartial: Partial<BenchmarkValues> = {};
  for (const k of [...GTM_BENCH_KEYS, ...REVOPS_BENCH_KEYS, ...DEV_BENCH_KEYS]) {
    const v = benchValues[k];
    if (v && v !== "__na__") benchPartial[k] = v;
  }
  const vce = computeVCEAssessment(quals, benchPartial, headcount);

  const arr = getMetricTier(benchValues, "arr");
  const nrr = getMetricTier(benchValues, "nrr");
  const gm = getMetricTier(benchValues, "grossMargin");
  const burn = getMetricTier(benchValues, "monthlyBurn");
  const growth = getMetricTier(benchValues, "arrGrowth");
  const connections: HolisticConnection[] = [];

  const pushConnection = (c: HolisticConnection) => {
    if (!connections.some(x => x.id === c.id)) connections.push(c);
  };

  if (quals.runway === "Under 6 months" || (burn && isWeakTier(burn.tier))) {
    pushConnection({
      id: "runway-limits-growth",
      domains: ["RevOps", "GTM"],
      tone: "gap",
      summary: "Runway and burn constrain GTM and hiring — Fuel prioritizes capital efficiency before growth playbooks.",
    });
  }

  if ((quals.pipelineTool === "Nothing yet" || quals.pipelineTool === "Spreadsheet")
    && quals.salesMotion !== "Not yet" && quals.salesMotion !== "Product-led") {
    pushConnection({
      id: "pipeline-blocks-gtm",
      domains: ["RevOps", "GTM"],
      tone: "gap",
      summary: "GTM can't scale without pipeline visibility — RevOps fixes unlock the Marketing playbooks Fuel recommends next.",
    });
  }

  if (quals.salesMotion === "Product-led" && quals.funnelBreakdown === "Conversion") {
    pushConnection({
      id: "plg-needs-product",
      domains: ["GTM", "Development"],
      tone: "gap",
      summary: "PLG conversion leaks are usually a product problem — Fuel links onboarding fixes to acquisition metrics.",
    });
  }

  if (quals.funnelBreakdown === "Retention" || (nrr && isWeakTier(nrr.tier))) {
    pushConnection({
      id: "retention-cross-cut",
      domains: ["GTM", "RevOps", "Development"],
      tone: "gap",
      summary: "Retention spans product, success, and renewals — Fuel surfaces it before you chase new logos.",
    });
  }

  if (quals.productChallenge === "Speed" && growth && isWeakTier(growth.tier)) {
    pushConnection({
      id: "speed-unlocks-growth",
      domains: ["Development", "GTM"],
      tone: "gap",
      summary: "Growth is waiting on shipping speed — dev velocity is the GTM lever Fuel tracks first.",
    });
  }

  if (gm && isWeakTier(gm.tier) && (headcount["Engineering"] ?? 0) > 0) {
    pushConnection({
      id: "margin-vs-headcount",
      domains: ["Development", "RevOps"],
      tone: "gap",
      summary: "Engineering scale is outpacing unit economics — Fuel flags margin before the next hire.",
    });
  }

  if (arr && isStrongTier(arr.tier) && nrr && isStrongTier(nrr.tier)) {
    pushConnection({
      id: "revenue-engine-strong",
      domains: ["GTM", "RevOps"],
      tone: "good",
      summary: "Revenue engine is working — Fuel protects expansion while flagging RevOps gaps that could slow scale.",
    });
  }

  if (connections.length < 2) {
    pushConnection({
      id: "fuel-system-view",
      domains: ["GTM", "RevOps", "Development"],
      tone: "neutral",
      summary: "GTM, RevOps, and product signals compound — Fuel maps gaps across all three so fixes don't fight each other.",
    });
  }

  const summaryNumbers: SectionSummaryNumber[] = [];
  if (arr) {
    const insight = getBenchmarkInsight(arr.field, arr.value);
    summaryNumbers.push({ label: "ARR", value: formatBenchmarkDisplay(arr.value, arr.field.unit), hint: insight.tierLabel });
  }
  if (nrr) {
    const insight = getBenchmarkInsight(nrr.field, nrr.value);
    summaryNumbers.push({ label: "NRR", value: formatBenchmarkDisplay(nrr.value, nrr.field.unit), hint: insight.tierLabel });
  }
  if (quals.runway) {
    summaryNumbers.push({ label: "Runway", value: quals.runway, hint: "Qualitative" });
  } else if (burn) {
    summaryNumbers.push({ label: "Monthly burn", value: formatBenchmarkDisplay(burn.value, burn.field.unit), hint: getBenchmarkInsight(burn.field, burn.value).tierLabel });
  }

  const topConnections = [...connections]
    .sort((a, b) => tonePriority(a.tone) - tonePriority(b.tone))
    .slice(0, PREVIEW_MAX.connections);

  const signals: SectionIntelSignal[] = topConnections.map(c => ({
    signalId: c.id,
    category: "strategic",
    label: c.domains.join(" × "),
    value: c.tone === "gap" ? "Priority gap" : c.tone === "good" ? "Strength" : "Connected",
    description: c.summary,
    tone: c.tone,
  }));

  const initiatives: SectionFieldInitiative[] = vce.topGaps.slice(0, PREVIEW_MAX.initiatives).map(gap => ({
    id: `holistic-${gap.key}`,
    fieldLabel: gap.label,
    track: "Cross-functional",
    title: gap.label,
    description: gap.gapLine,
    cadence: "Continuous",
  }));

  if (initiatives.length === 0) {
    initiatives.push({
      id: "holistic-foundation",
      fieldLabel: "Operating foundation",
      track: "Cross-functional",
      title: "Complete your intelligence pass",
      description: "Fuel generates cross-functional priorities once GTM, RevOps, and product data connect.",
      cadence: "Continuous",
    });
  }

  const weakKeys = [...GTM_BENCH_KEYS, ...REVOPS_BENCH_KEYS, ...DEV_BENCH_KEYS]
    .map(k => ({ k, m: getMetricTier(benchValues, k) }))
    .filter((x): x is { k: keyof BenchmarkValues; m: NonNullable<ReturnType<typeof getMetricTier>> } => x.m != null && isWeakTier(x.m.tier))
    .sort((a, b) => TIER_ORDER[a.m.tier] - TIER_ORDER[b.m.tier]);

  const allPlaybooks = { ...GTM_METRIC_PLAYBOOKS, ...REVOPS_METRIC_PLAYBOOKS, ...DEV_METRIC_PLAYBOOKS };
  let playbooks = weakKeys
    .flatMap(({ k }) => allPlaybooks[k as keyof typeof allPlaybooks] ? [allPlaybooks[k as keyof typeof allPlaybooks]!] : [])
    .filter((pb, i, arr) => arr.findIndex(x => x.title === pb.title) === i)
    .slice(0, PREVIEW_MAX.playbooks);

  if (!playbooks.length) {
    playbooks = [
      { track: "Marketing", title: "Repeatable GTM Motion", prompt: "Shape the next scalable acquisition channel from customer patterns." },
      { track: "FinOps", title: "Runway & Burn Review", prompt: "Map burn drivers and the fastest path to extended runway." },
    ];
  }

  const gapDomains = new Set(topConnections.filter(c => c.tone === "gap").flatMap(c => c.domains));
  const headline = gapDomains.size >= 2
    ? "Cross-functional gaps — Fuel connects the picture"
    : vce.stageName === "Foundation"
      ? "Foundation stage — one operating view"
      : `${vce.stageName} — GTM, RevOps, and product linked`;

  const fuelHelp = companyName
    ? `Fuel reads ${companyName}'s signals together — initiatives and playbooks target what actually moves the business.`
    : "Fuel reads your signals together — initiatives and playbooks target what actually moves the business.";

  return {
    headline,
    fuelHelp,
    summaryNumbers: summaryNumbers.slice(0, 3),
    signals,
    initiatives,
    playbooks,
    stageName: vce.stageName,
  };
}

function WizardSectionSummary({
  sectionLabel,
  color,
  headline,
  fuelHelp,
  summaryNumbers,
  signals,
  initiatives,
  playbooks,
  stageName,
  nextHint,
}: {
  sectionLabel: string;
  color: string;
  headline: string;
  fuelHelp: string;
  summaryNumbers: SectionSummaryNumber[];
  signals: SectionIntelSignal[];
  initiatives: SectionFieldInitiative[];
  playbooks: SuggestedPlaybook[];
  stageName?: string;
  nextHint: string;
}) {
  const trackColors: Record<SuggestedPlaybook["track"], string> = {
    Development: "#00B48A",
    Marketing: "#2BB8A0",
    RevOps: "#D4924A",
    FinOps: "#8B76D4",
  };

  const isHolistic = sectionLabel === "Full operating picture";

  return (
    <div style={{ animation: "fuelFadeUp 0.35s ease both" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{
          color: fuel.textMuted,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.12em",
          marginBottom: 8,
          textTransform: "uppercase",
        }}>
          {isHolistic ? "Fuel intelligence · full picture" : `${sectionLabel} · preview`}
        </div>
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <h2 style={{ color: fuel.text, fontSize: 18, fontWeight: 800, lineHeight: 1.3, margin: 0 }}>
            {headline}
          </h2>
          {stageName ? (
            <span style={{
              background: "rgba(0,180,138,0.12)",
              border: "1px solid rgba(0,180,138,0.28)",
              borderRadius: 999,
              color: fuel.accent,
              fontSize: 10,
              fontWeight: 800,
              padding: "3px 9px",
            }}>
              {stageName}
            </span>
          ) : null}
        </div>
        {summaryNumbers.length > 0 ? (
          <div style={{
            background: fuel.surfaceRaised,
            border: `1px solid ${fuel.border}`,
            borderRadius: 10,
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 20px",
            marginBottom: 12,
            padding: "12px 14px",
          }}>
            {summaryNumbers.map(n => (
              <div key={n.label}>
                <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 700, marginBottom: 2, textTransform: "uppercase" }}>{n.label}</div>
                <div style={{ color: fuel.text, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 15, fontWeight: 700 }}>{n.value}</div>
                {n.hint ? <div style={{ color: fuel.textMuted, fontSize: 10, marginTop: 2 }}>{n.hint}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
        <p style={{ color: fuel.textMuted, fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
          {fuelHelp}
        </p>
      </div>

      {signals.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Intelligence
            </div>
            <em style={{ color: fuel.textMuted, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, fontStyle: "normal" }}>
              top {signals.length}
            </em>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {signals.map(s => (
              <IntelligencePreviewRow key={s.signalId} signal={s} />
            ))}
          </div>
        </div>
      ) : null}

      {initiatives.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
            Suggested initiatives
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {initiatives.map((init, i) => (
              <div
                key={init.id}
                style={{
                  background: fuel.surfaceRaised,
                  border: `1px solid ${fuel.border}`,
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 10,
                  padding: "11px 13px",
                }}
              >
                <div style={{ color: fuel.text, fontSize: 13, fontWeight: 800, lineHeight: 1.35, marginBottom: 4 }}>{init.title}</div>
                <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 4, textTransform: "uppercase" }}>
                  {init.track} · {init.cadence} · {init.fieldLabel}
                </div>
                <p style={{ color: fuel.textMuted, fontSize: 12, lineHeight: 1.45, margin: 0 }}>{init.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {playbooks.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
            Playbooks
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {playbooks.map((playbook, index) => (
              <div key={playbook.title} style={{
                background: fuel.surfaceInset,
                border: `1px solid ${fuel.border}`,
                borderRadius: 8,
                display: "flex",
                gap: 10,
                padding: "10px 12px",
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
                  height: 22,
                  justifyContent: "center",
                  width: 22,
                }}>
                  {index + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 2 }}>
                    <span style={{ color: fuel.text, fontSize: 12, fontWeight: 700 }}>{playbook.title}</span>
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
                  <p style={{ color: fuel.textMuted, fontSize: 11.5, lineHeight: 1.4, margin: 0 }}>{playbook.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{
        background: "rgba(0,180,138,0.06)",
        border: `1px solid ${fuel.borderAccent}`,
        borderRadius: 8,
        color: fuel.textMuted,
        fontSize: 12,
        lineHeight: 1.5,
        padding: "10px 14px",
      }}>
        {nextHint}
      </div>
    </div>
  );
}

function WizardBenchStep({
  step,
  title,
  fieldKeys,
  values,
  onChange,
  onSkip,
}: {
  step: WizardStepId;
  title: string;
  fieldKeys: (keyof BenchmarkValues)[];
  values: Record<string, string>;
  onChange: (key: keyof BenchmarkValues, raw: string) => void;
  onSkip: (key: keyof BenchmarkValues) => void;
}) {
  const fields = fieldKeys.map(k => BENCHMARK_WIZARD_FIELDS.find(f => f.key === k)!).filter(Boolean);
  const filledCount = fields.filter(f => isBenchFieldFilled(values[f.key])).length;

  return (
    <div>
      <WizardStepHeader step={step} title={title} />
      <p style={{ color: fuel.textMuted, fontSize: 13, lineHeight: 1.5, margin: "-12px 0 24px" }}>
        {filledCount} of {fields.length} complete · enter what you know, N/A what you don&apos;t
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {fields.map(field => {
          const raw = values[field.key] ?? "";
          const isNA = raw === "__na__";
          const numVal = isNA ? null : parseBenchmarkNumber(raw);

          return (
            <div
              key={field.key}
              style={{
                background: fuel.surfaceRaised,
                border: `1px solid ${fuel.border}`,
                borderRadius: 10,
                padding: "14px 16px",
              }}
            >
              <div style={{ color: fuel.text, fontSize: 13, fontWeight: 700, marginBottom: field.promptHint ? 4 : 10 }}>
                {field.prompt}
              </div>
              {field.promptHint ? (
                <div style={{ color: fuel.textMuted, fontSize: 11.5, lineHeight: 1.45, marginBottom: 10 }}>{field.promptHint}</div>
              ) : null}

              {isNA ? (
                <div style={{ alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" }}>
                  <span style={{ color: fuel.textMuted, fontSize: 12, fontWeight: 600 }}>Don&apos;t know / N/A</span>
                  <button
                    type="button"
                    onClick={() => onChange(field.key, "")}
                    style={{
                      background: "none",
                      border: "none",
                      color: fuel.accent,
                      cursor: "pointer",
                      font: "inherit",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: 0,
                    }}
                  >
                    Enter a value
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ position: "relative", marginBottom: numVal != null ? 10 : 0 }}>
                    <input
                      value={raw}
                      onChange={e => onChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      inputMode={field.unit === "percent" ? "decimal" : "numeric"}
                      style={{
                        background: fuel.surfaceInset,
                        border: `1px solid ${numVal != null ? "rgba(0,180,138,0.35)" : fuel.border}`,
                        borderRadius: 10,
                        boxShadow: numVal != null ? "0 0 0 1px rgba(0,180,138,0.12)" : "none",
                        color: fuel.text,
                        font: "inherit",
                        fontSize: 16,
                        fontWeight: 800,
                        outline: "none",
                        padding: field.unit === "percent" ? "10px 36px 10px 12px" : "10px 12px",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                        width: "100%",
                      }}
                    />
                    {field.unit === "percent" && (
                      <span style={{
                        color: fuel.textMuted,
                        fontSize: 14,
                        fontWeight: 800,
                        pointerEvents: "none",
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}>%</span>
                    )}
                  </div>
                  {numVal != null && (
                    <LiveBenchmarkBar compact field={field} value={numVal} animate={false} />
                  )}
                  <button
                    type="button"
                    onClick={() => onSkip(field.key)}
                    style={{
                      background: "none",
                      border: "none",
                      color: fuel.text,
                      cursor: "pointer",
                      font: "inherit",
                      fontSize: 12,
                      fontWeight: 600,
                      marginTop: 10,
                      padding: 0,
                      textDecoration: "underline",
                      textDecorationStyle: "dotted",
                    }}
                  >
                    Don&apos;t know / N/A
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildQualSignals(
  quals: QualAnswers,
  questions: QualQuestion[],
  group: string,
  color: string,
  externalAnswers: Record<string, string> = {},
) {
  const all = { ...externalAnswers, ...quals };
  return questions
    .filter(q => (!q.condition || q.condition(all)) && quals[q.key as keyof QualAnswers])
    .map(q => ({
      group,
      color,
      text: q.acks[quals[q.key as keyof QualAnswers]] ?? q.defaultAck,
    }));
}

type ReviewSectionData = {
  id: string;
  label: string;
  color: string;
  editStep: WizardStepId;
  qualItems: { label: string; value: string }[];
  benchItems: { label: string; value: string; tierLabel?: string; isNA?: boolean }[];
};

function WizardReviewStep({
  sections,
  onEdit,
}: {
  sections: ReviewSectionData[];
  onEdit: (step: WizardStepId) => void;
}) {
  const totalAnswers = sections.reduce(
    (n, s) => n + s.qualItems.filter(i => i.value).length + s.benchItems.length,
    0,
  );

  return (
    <div>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{
          alignItems: "center",
          background: "rgba(0,180,138,0.1)",
          border: "1px solid rgba(0,180,138,0.22)",
          borderRadius: 14,
          display: "inline-flex",
          height: 52,
          justifyContent: "center",
          marginBottom: 16,
          width: 52,
        }}>
          <span style={{ color: fuel.accent, fontSize: 22, fontWeight: 800 }}>✓</span>
        </div>
        <h2 style={{ color: fuel.text, fontSize: 24, fontWeight: 800, lineHeight: 1.25, margin: "0 0 8px" }}>
          Review your answers
        </h2>
        <p style={{ color: fuel.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 auto", maxWidth: 420 }}>
          {totalAnswers} data points locked in. Edit anything before Fuel generates your intelligence pass.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sections.map(section => {
          const qualCount = section.qualItems.filter(i => i.value).length;
          const benchCount = section.benchItems.length;
          const countLabel = [qualCount ? `${qualCount} answers` : "", benchCount ? `${benchCount} metrics` : ""]
            .filter(Boolean).join(" · ");

          return (
            <div
              key={section.id}
              style={{
                background: fuel.surfaceRaised,
                border: `1px solid ${fuel.border}`,
                borderLeft: `3px solid ${section.color}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div style={{
                alignItems: "center",
                display: "flex",
                gap: 12,
                justifyContent: "space-between",
                padding: "14px 16px",
              }}>
                <div>
                  <div style={{ color: fuel.text, fontSize: 14, fontWeight: 800 }}>{section.label}</div>
                  {countLabel ? (
                    <div style={{ color: fuel.textMuted, fontSize: 11, marginTop: 3 }}>{countLabel}</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(section.editStep)}
                  style={{
                    background: "rgba(0,180,138,0.08)",
                    border: "1px solid rgba(0,180,138,0.2)",
                    borderRadius: 8,
                    color: fuel.accent,
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "6px 12px",
                  }}
                >
                  Edit
                </button>
              </div>

              <div style={{ borderTop: `1px solid ${fuel.border}`, padding: "14px 16px 16px" }}>
                {section.qualItems.filter(i => i.value).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: benchCount ? 14 : 0 }}>
                    {section.qualItems.filter(i => i.value).map(item => (
                      <div
                        key={item.label}
                        style={{
                          background: fuel.surfaceInset,
                          border: `1px solid ${fuel.border}`,
                          borderRadius: 20,
                          color: fuel.text,
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: "5px 11px",
                        }}
                      >
                        <span style={{ color: fuel.textMuted, fontWeight: 500 }}>{item.label}: </span>
                        {item.value}
                      </div>
                    ))}
                  </div>
                )}
                {section.benchItems.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {section.benchItems.map(item => (
                      <div
                        key={item.label}
                        style={{
                          alignItems: "center",
                          background: fuel.surfaceInset,
                          border: `1px solid ${fuel.border}`,
                          borderRadius: 9,
                          display: "flex",
                          gap: 10,
                          justifyContent: "space-between",
                          padding: "9px 12px",
                        }}
                      >
                        <span style={{ color: fuel.textMuted, fontSize: 12 }}>{item.label}</span>
                        <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
                          <span style={{ color: item.isNA ? fuel.textMuted : fuel.text, fontSize: 13, fontWeight: 800 }}>
                            {item.isNA ? "N/A" : item.value}
                          </span>
                          {item.tierLabel && !item.isNA ? (
                            <span style={{
                              background: "rgba(0,180,138,0.1)",
                              border: "1px solid rgba(0,180,138,0.2)",
                              borderRadius: 999,
                              color: fuel.text,
                              fontSize: 9.5,
                              fontWeight: 800,
                              padding: "2px 7px",
                              whiteSpace: "nowrap",
                            }}>
                              {item.tierLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const VCE_STAGE_LABELS = ["Foundation", "Acceleration", "Scale", "Optimization"] as const;

function WizardPayoffStep({
  companyName,
  vce,
  stageIdx,
  signals,
  initiatives,
  createdInitiatives,
  onCreateInitiative,
}: {
  companyName: string;
  vce: VCEAssessment;
  stageIdx: number;
  signals: { group: string; color: string; text: string }[];
  initiatives: { id: string; title: string; description: string }[];
  createdInitiatives: Set<string>;
  onCreateInitiative: (id: string) => void;
}) {
  return (
    <div>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(145deg, rgba(0,180,138,0.14) 0%, rgba(236,214,127,0.06) 55%, rgba(31,49,64,0.4) 100%)`,
        border: `1px solid ${fuel.borderAccent}`,
        borderRadius: 16,
        marginBottom: 20,
        overflow: "hidden",
        padding: "24px 22px",
        position: "relative",
      }}>
        <div style={{
          color: fuel.textMuted,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.12em",
          marginBottom: 10,
          textTransform: "uppercase",
        }}>
          Operational stage
        </div>
        <h2 style={{ color: fuel.text, fontSize: 26, fontWeight: 800, lineHeight: 1.2, margin: "0 0 6px" }}>
          {companyName || "Your company"}
        </h2>
        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <span style={{
            background: "rgba(0,180,138,0.15)",
            border: "1px solid rgba(0,180,138,0.35)",
            borderRadius: 999,
            color: fuel.accent,
            fontSize: 13,
            fontWeight: 800,
            padding: "5px 14px",
          }}>
            {vce.stageName}
          </span>
          <span style={{ color: fuel.textMuted, fontSize: 12 }}>
            {vce.score} of 8 signals strong
          </span>
        </div>
        <p style={{ color: fuel.textMuted, fontSize: 13, lineHeight: 1.65, margin: 0, maxWidth: 520 }}>
          {vce.stageDesc}
        </p>
      </div>

      {/* Stage track */}
      <div style={{
        background: fuel.surfaceRaised,
        border: `1px solid ${fuel.border}`,
        borderRadius: 12,
        marginBottom: 16,
        padding: "16px 18px",
      }}>
        <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 14, textTransform: "uppercase" }}>
          Value Creation Engine
        </div>
        <div style={{ alignItems: "center", display: "flex", gap: 0, justifyContent: "space-between" }}>
          {VCE_STAGE_LABELS.map((label, i) => {
            const isActive = i === stageIdx;
            const isDone = i < stageIdx;
            return (
              <React.Fragment key={label}>
                <div style={{ alignItems: "center", display: "flex", flex: 1, flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <div style={{
                    background: isDone ? "rgba(0,180,138,0.2)" : isActive ? "rgba(0,180,138,0.12)" : "rgba(255,255,255,0.04)",
                    border: isDone ? "1px solid rgba(0,180,138,0.5)" : isActive ? "1px solid rgba(0,180,138,0.4)" : `1px solid ${fuel.border}`,
                    borderRadius: "50%",
                    color: isDone || isActive ? fuel.accent : fuel.textMuted,
                    fontSize: 10,
                    fontWeight: 800,
                    height: 28,
                    lineHeight: "28px",
                    textAlign: "center",
                    width: 28,
                  }}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span style={{
                    color: isActive ? fuel.text : fuel.textMuted,
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 500,
                    textAlign: "center",
                  }}>
                    {label}
                  </span>
                </div>
                {i < 3 ? (
                  <div style={{
                    background: isDone ? "rgba(0,180,138,0.35)" : "var(--panel-border)",
                    flex: "0 0 24px",
                    height: 2,
                    marginBottom: 18,
                  }} />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Gap + Protect */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", marginBottom: 20 }}>
        <div style={{
          background: "rgba(201,151,107,0.08)",
          border: "1px solid rgba(201,151,107,0.22)",
          borderRadius: 12,
          padding: "14px 16px",
        }}>
          <div style={{ color: "#C9976B", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 8, textTransform: "uppercase" }}>
            Priority gap
          </div>
          <p style={{ color: fuel.text, fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
            {vce.topGaps[0]?.gapLine}
          </p>
        </div>
        <div style={{
          background: "rgba(0,180,138,0.06)",
          border: "1px solid rgba(0,180,138,0.18)",
          borderRadius: 12,
          padding: "14px 16px",
        }}>
          <div style={{ color: fuel.accent, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 8, textTransform: "uppercase" }}>
            Protect this
          </div>
          <p style={{ color: fuel.text, fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
            {vce.topStrength.strengthLine}
          </p>
        </div>
      </div>

      {/* Signals */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase" }}>
          Qualitative signals
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(["GTM", "RevOps", "Development"] as const).map(group => {
            const groupSignals = signals.filter(s => s.group === group);
            if (!groupSignals.length) return null;
            const accent = group === "GTM" ? WIZARD_GROUP_COLORS.gtm : group === "RevOps" ? WIZARD_GROUP_COLORS.revops : WIZARD_GROUP_COLORS.dev;
            return (
              <div
                key={group}
                style={{
                  background: fuel.surfaceRaised,
                  border: `1px solid ${fuel.border}`,
                  borderLeft: `3px solid ${accent}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div style={{ color: accent, fontSize: 11, fontWeight: 800, marginBottom: 10 }}>{group}</div>
                {groupSignals.map((s, i) => (
                  <div key={i} style={{ alignItems: "flex-start", display: "flex", gap: 10, marginBottom: i < groupSignals.length - 1 ? 10 : 0 }}>
                    <div style={{ background: s.color, borderRadius: "50%", flexShrink: 0, height: 7, marginTop: 6, width: 7 }} />
                    <p style={{ color: fuel.textMuted, fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>{s.text}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <p style={{ color: fuel.textMuted, fontSize: 11, fontStyle: "italic", margin: "10px 0 0" }}>
          Benchmark signals refine after your first intelligence pass.
        </p>
      </div>

      {/* Initiatives */}
      {initiatives.length > 0 && (
        <div>
          <div style={{ color: fuel.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase" }}>
            Suggested initiatives
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {initiatives.map((init, i) => (
              <div
                key={init.id}
                style={{
                  background: fuel.surfaceRaised,
                  border: `1px solid ${fuel.border}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <div style={{ alignItems: "flex-start", display: "flex", gap: 12 }}>
                  <div style={{
                    alignItems: "center",
                    background: "rgba(0,180,138,0.1)",
                    border: "1px solid rgba(0,180,138,0.2)",
                    borderRadius: 8,
                    color: fuel.accent,
                    display: "flex",
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 800,
                    height: 28,
                    justifyContent: "center",
                    width: 28,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: fuel.text, fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{init.title}</div>
                    <p style={{ color: fuel.textMuted, fontSize: 12.5, lineHeight: 1.55, margin: "0 0 12px" }}>{init.description}</p>
                    <button
                      type="button"
                      onClick={() => onCreateInitiative(init.id)}
                      disabled={createdInitiatives.has(init.id)}
                      style={{
                        background: createdInitiatives.has(init.id) ? "rgba(0,180,138,0.1)" : "rgba(0,180,138,0.08)",
                        border: "1px solid rgba(0,180,138,0.25)",
                        borderRadius: 8,
                        color: fuel.accent,
                        cursor: createdInitiatives.has(init.id) ? "default" : "pointer",
                        font: "inherit",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "7px 14px",
                      }}
                    >
                      {createdInitiatives.has(init.id) ? "✓ Added to Initiatives" : "Create initiative"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WizardLaunchOverlay({ companyName }: { companyName: string }) {
  return (
    <div style={{
      alignItems: "center",
      animation: "fuelFadeUp 0.35s ease both",
      background: "rgba(11,23,32,0.94)",
      display: "flex",
      flexDirection: "column",
      inset: 0,
      justifyContent: "center",
      position: "absolute",
      zIndex: 20,
    }}>
      <div style={{
        animation: "fuelDot 1.2s ease infinite",
        background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
        borderRadius: 14,
        color: "#0a1a12",
        fontSize: 18,
        fontWeight: 900,
        height: 56,
        lineHeight: "56px",
        marginBottom: 20,
        textAlign: "center",
        width: 56,
      }}>
        F
      </div>
      <div style={{ color: fuel.text, fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
        Opening your workspace
      </div>
      <div style={{ color: fuel.textMuted, fontSize: 13 }}>
        Generating intelligence for {companyName || "your company"}…
      </div>
    </div>
  );
}

type SectionBridge = "gtm" | "revops" | "dev" | "holistic" | null;

function OnboardingWizard({
  companyName,
  profileData,
  onProfileSubmit,
  onComplete,
  onVCEUpdate,
  onStepChange,
}: {
  companyName: string;
  profileData: {
    crunchbaseData: CrunchbaseData;
    businessModel: string;
    notes: string;
    domain: string;
  };
  onProfileSubmit: (result: ProfileFormResult) => void;
  onComplete: (data: { quals: QualAnswers; bench: Partial<BenchmarkValues>; team: TeamHeadcount }) => Promise<void>;
  onVCEUpdate: (stageIdx: number, gapLine: string, assessment: VCEAssessment) => void;
  onStepChange: (step: WizardStepId) => void;
}) {
  const emptyQual: QualAnswers = {
    salesMotion: "", funnelBreakdown: "", dealSize: "", investorIntros: "",
    pipelineTool: "", salesProcess: "", contractType: "", runway: "",
    productType: "", aiRole: "", productChallenge: "",
  };
  const [step, setStep] = React.useState<WizardStepId>(1);
  const [profileResult, setProfileResult] = React.useState<ProfileFormResult | null>(null);
  const [quals, setQuals] = React.useState<QualAnswers>(emptyQual);
  const [benchValues, setBenchValues] = React.useState<Record<string, string>>({});
  const [team, setTeam] = React.useState<TeamHeadcount | null>(null);
  const [vce, setVce] = React.useState<VCEAssessment | null>(null);
  const [createdInitiatives, setCreatedInitiatives] = React.useState<Set<string>>(new Set());
  const [launching, setLaunching] = React.useState(false);
  const [stageIdx, setStageIdx] = React.useState<number | null>(null);
  const [sectionBridge, setSectionBridge] = React.useState<SectionBridge>(null);

  React.useEffect(() => {
    onStepChange(step);
  }, [step, onStepChange]);

  const gtmAnswers = { salesMotion: quals.salesMotion, funnelBreakdown: quals.funnelBreakdown, dealSize: quals.dealSize, investorIntros: quals.investorIntros };
  const revopsAnswers = { pipelineTool: quals.pipelineTool, salesProcess: quals.salesProcess, contractType: quals.contractType, runway: quals.runway };
  const devAnswers = { productType: quals.productType, aiRole: quals.aiRole, productChallenge: quals.productChallenge };

  const visibleGtmQ = GTM_WIZARD_QUESTIONS.filter(q => !q.condition || q.condition(gtmAnswers));
  const visibleRevopsQ = REVOPS_WIZARD_QUESTIONS.filter(q => !q.condition || q.condition({ ...revopsAnswers, salesMotion: quals.salesMotion }));
  const profileDone = profileResult !== null;
  const gtmQualDone = visibleGtmQ.every(q => quals[q.key as keyof QualAnswers]);
  const revopsQualDone = visibleRevopsQ.every(q => quals[q.key as keyof QualAnswers]);
  const devQualDone = DEV_WIZARD_QUESTIONS.every(q => quals[q.key as keyof QualAnswers]);
  const gtmBenchDone = GTM_BENCH_KEYS.every(k => isBenchFieldFilled(benchValues[k]));
  const revopsBenchDone = REVOPS_BENCH_KEYS.every(k => isBenchFieldFilled(benchValues[k]));
  const devBenchDone = DEV_BENCH_KEYS.every(k => isBenchFieldFilled(benchValues[k]));
  const teamDone = team !== null;

  const wizardHeadcount = (() => {
    const raw = benchValues.headcount ?? "";
    if (raw === "__na__" || !raw) return 12;
    const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? 12 : n;
  })();

  const updateBench = (key: keyof BenchmarkValues, raw: string) => {
    setBenchValues(prev => ({ ...prev, [key]: raw }));
  };

  const skipBenchField = (key: keyof BenchmarkValues) => {
    setBenchValues(prev => ({ ...prev, [key]: "__na__" }));
  };

  const goNext = () => {
    if (sectionBridge === "holistic") {
      setSectionBridge(null);
      setStep(8);
      return;
    }
    if (sectionBridge === "dev") {
      setSectionBridge("holistic");
      return;
    }
    if (sectionBridge === "revops") {
      setSectionBridge(null);
      setStep(6);
      return;
    }
    if (sectionBridge === "gtm") {
      setSectionBridge(null);
      setStep(4);
      return;
    }
    if (step === 7 && devBenchDone) {
      setSectionBridge("dev");
      return;
    }
    if (step === 5 && revopsBenchDone) {
      setSectionBridge("revops");
      return;
    }
    if (step === 3 && gtmBenchDone) {
      setSectionBridge("gtm");
      return;
    }
    if (step === 9) {
      const benchPartial: Partial<BenchmarkValues> = {};
      for (const k of [...GTM_BENCH_KEYS, ...REVOPS_BENCH_KEYS, ...DEV_BENCH_KEYS]) {
        const v = benchValues[k];
        if (v && v !== "__na__") benchPartial[k] = v;
      }
      const headcount = team ?? linkedInTeamDistribution(wizardHeadcount);
      const assessment = computeVCEAssessment(quals, benchPartial, headcount);
      setVce(assessment);
      const stageOrder: VCEAssessment["stageName"][] = ["Foundation", "Acceleration", "Scale", "Optimization"];
      const stageIdx = stageOrder.indexOf(assessment.stageName);
      const gapLine = assessment.stageName === "Optimization"
        ? "Focus on margin expansion and long-term enterprise value."
        : assessment.topGaps[0]?.gapLine ?? "";
      onVCEUpdate(stageIdx, gapLine, assessment);
      setStageIdx(stageIdx);
      // TODO: persist wizard answers + assessment to API
      setStep(10);
      return;
    }
    if (step < WIZARD_STEP_COUNT) setStep((step + 1) as WizardStepId);
  };

  const goBack = () => {
    if (sectionBridge) {
      setSectionBridge(null);
      return;
    }
    if (step > 1) setStep((step - 1) as WizardStepId);
  };

  const gtmSummary = buildGtmSectionSummary(quals, benchValues, companyName);
  const revopsSummary = buildRevopsSectionSummary(quals, benchValues, companyName);
  const devSummary = buildDevSectionSummary(quals, benchValues, companyName);
  const holisticSummary = buildHolisticSectionSummary(
    quals,
    benchValues,
    companyName,
    linkedInTeamDistribution(wizardHeadcount),
  );

  const canNext = (() => {
    if (sectionBridge) return true;
    if (step === 1) return profileDone;
    if (step === 2) return gtmQualDone;
    if (step === 3) return gtmBenchDone;
    if (step === 4) return revopsQualDone;
    if (step === 5) return revopsBenchDone;
    if (step === 6) return devQualDone;
    if (step === 7) return devBenchDone;
    if (step === 8) return teamDone;
    if (step === 9) return true;
    return false;
  })();

  const nextLabel = sectionBridge === "holistic"
    ? "Confirm team →"
    : sectionBridge === "dev"
      ? "See full picture →"
      : sectionBridge === "revops"
        ? "Continue to Development →"
        : sectionBridge === "gtm"
          ? "Continue to RevOps →"
          : step === 8
            ? "Continue →"
            : step === 9
              ? "Submit →"
              : "Next →";

  const signals = [
    ...buildQualSignals(quals, GTM_WIZARD_QUESTIONS, "GTM", WIZARD_GROUP_COLORS.gtm),
    ...buildQualSignals(quals, REVOPS_WIZARD_QUESTIONS, "RevOps", WIZARD_GROUP_COLORS.revops, { salesMotion: quals.salesMotion }),
    ...buildQualSignals(quals, DEV_WIZARD_QUESTIONS, "Development", WIZARD_GROUP_COLORS.dev),
  ];

  const initiatives = vce?.topGaps.slice(0, 3).map(gap => ({
    id: gap.key,
    title: gap.label,
    description: gap.gapLine,
  })) ?? [];

  const buildBenchItems = (keys: (keyof BenchmarkValues)[]) =>
    keys.flatMap(key => {
      const raw = benchValues[key];
      const field = BENCHMARK_WIZARD_FIELDS.find(f => f.key === key)!;
      if (!raw) return [];
      if (raw === "__na__") return [{ label: field.label, value: "N/A", isNA: true }];
      const val = parseBenchmarkNumber(raw);
      if (val == null) return [];
      const tier = getBenchmarkTier(val, field);
      const tierLabel = { top: "Top quartile", upper: "Above median", mid: "Around median", lower: "Below median", bottom: "Bottom quartile" }[tier];
      return [{ label: field.label, value: formatBenchmarkDisplay(val, field.unit), tierLabel }];
    });

  const reviewSections: ReviewSectionData[] = [
    ...(profileResult ? [{
      id: "profile",
      label: "Profile",
      color: fuel.accent,
      editStep: 1 as WizardStepId,
      qualItems: [
        { label: "Company", value: profileResult.companyName },
        { label: "Business model", value: profileResult.businessModel },
        { label: "Industry", value: profileResult.industry },
        { label: "Founded", value: profileResult.founded },
        { label: "Location", value: [profileResult.city, profileResult.region, profileResult.country].filter(Boolean).join(", ") },
      ],
      benchItems: [],
    }] : []),
    {
      id: "gtm",
      label: "GTM & Marketing",
      color: WIZARD_GROUP_COLORS.gtm,
      editStep: 2,
      qualItems: visibleGtmQ.map(q => ({ label: q.label, value: quals[q.key as keyof QualAnswers] })),
      benchItems: buildBenchItems(GTM_BENCH_KEYS),
    },
    {
      id: "revops",
      label: "RevOps",
      color: WIZARD_GROUP_COLORS.revops,
      editStep: 4,
      qualItems: visibleRevopsQ.map(q => ({ label: q.label, value: quals[q.key as keyof QualAnswers] })),
      benchItems: buildBenchItems(REVOPS_BENCH_KEYS),
    },
    {
      id: "development",
      label: "Development",
      color: WIZARD_GROUP_COLORS.dev,
      editStep: 6,
      qualItems: DEV_WIZARD_QUESTIONS.map(q => ({ label: q.label, value: quals[q.key as keyof QualAnswers] })),
      benchItems: buildBenchItems(DEV_BENCH_KEYS),
    },
    {
      id: "team",
      label: "Team",
      color: "var(--text-2)",
      editStep: 8,
      qualItems: team ? TEAM_FUNCTIONS.filter(fn => team[fn] > 0).map(fn => ({ label: fn, value: `${team[fn]} FTE` })) : [],
      benchItems: [],
    },
  ];

  const handleStartJourney = async () => {
    if (launching) return;
    setLaunching(true);
    const benchPartial: Partial<BenchmarkValues> = {};
    for (const k of [...GTM_BENCH_KEYS, ...REVOPS_BENCH_KEYS, ...DEV_BENCH_KEYS]) {
      const v = benchValues[k];
      if (v && v !== "__na__") benchPartial[k] = v;
    }
    await onComplete({
      quals,
      bench: benchPartial,
      team: team ?? linkedInTeamDistribution(wizardHeadcount),
    });
  };

  const contentMaxWidth = step >= 9 || sectionBridge === "holistic" ? 720 : 640;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: "relative" }}>
      {launching && <WizardLaunchOverlay companyName={companyName} />}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 0 24px" }} data-fuel-chat-scroll>
        <div style={{ margin: "0 auto", maxWidth: contentMaxWidth, padding: "0 24px", width: "100%" }}>
          {step < 10 && <WizardStepIndicator step={step} />}

          {sectionBridge === "gtm" ? (
            <WizardSectionSummary
              sectionLabel="GTM & Marketing"
              color={WIZARD_GROUP_COLORS.gtm}
              headline={gtmSummary.headline}
              fuelHelp={gtmSummary.fuelHelp}
              summaryNumbers={gtmSummary.summaryNumbers}
              signals={gtmSummary.signals}
              initiatives={gtmSummary.initiatives}
              playbooks={gtmSummary.playbooks}
              nextHint="Next up: RevOps — pipeline visibility, sales process, contracts, and runway."
            />
          ) : null}

          {sectionBridge === "revops" ? (
            <WizardSectionSummary
              sectionLabel="RevOps & Finance"
              color={WIZARD_GROUP_COLORS.revops}
              headline={revopsSummary.headline}
              fuelHelp={revopsSummary.fuelHelp}
              summaryNumbers={revopsSummary.summaryNumbers}
              signals={revopsSummary.signals}
              initiatives={revopsSummary.initiatives}
              playbooks={revopsSummary.playbooks}
              nextHint="Next up: Development — product type, AI role, and engineering signals."
            />
          ) : null}

          {sectionBridge === "dev" ? (
            <WizardSectionSummary
              sectionLabel="Product & Engineering"
              color={WIZARD_GROUP_COLORS.dev}
              headline={devSummary.headline}
              fuelHelp={devSummary.fuelHelp}
              summaryNumbers={devSummary.summaryNumbers}
              signals={devSummary.signals}
              initiatives={devSummary.initiatives}
              playbooks={devSummary.playbooks}
              nextHint="Next: Fuel connects GTM, RevOps, and product into one operating picture."
            />
          ) : null}

          {sectionBridge === "holistic" ? (
            <WizardSectionSummary
              sectionLabel="Full operating picture"
              color={fuel.accent}
              headline={holisticSummary.headline}
              fuelHelp={holisticSummary.fuelHelp}
              summaryNumbers={holisticSummary.summaryNumbers}
              signals={holisticSummary.signals}
              initiatives={holisticSummary.initiatives}
              playbooks={holisticSummary.playbooks}
              stageName={holisticSummary.stageName}
              nextHint="Almost done — confirm your team breakdown and Fuel generates your intelligence pass."
            />
          ) : null}

          {!sectionBridge && step === 1 && profileData.crunchbaseData && (
            <ProfileFormCard
              data={profileData.crunchbaseData}
              businessModel={profileData.businessModel}
              notes={profileData.notes}
              domain={profileData.domain}
              onSubmit={result => {
                onProfileSubmit(result);
                setProfileResult(result);
                setStep(2);
              }}
            />
          )}
          {!sectionBridge && step === 2 && (
            <WizardQualStep
              step={2}
              title={WIZARD_STEP_TITLES[2]}
              questions={GTM_WIZARD_QUESTIONS}
              answers={gtmAnswers}
              onChange={(k, v) => setQuals(prev => ({ ...prev, [k]: v }))}
            />
          )}
          {!sectionBridge && step === 3 && (
            <WizardBenchStep
              step={3}
              title={WIZARD_STEP_TITLES[3]}
              fieldKeys={GTM_BENCH_KEYS}
              values={benchValues}
              onChange={updateBench}
              onSkip={skipBenchField}
            />
          )}
          {!sectionBridge && step === 4 && (
            <WizardQualStep
              step={4}
              title={WIZARD_STEP_TITLES[4]}
              questions={REVOPS_WIZARD_QUESTIONS}
              answers={revopsAnswers}
              externalAnswers={{ salesMotion: quals.salesMotion }}
              onChange={(k, v) => setQuals(prev => ({ ...prev, [k]: v }))}
            />
          )}
          {!sectionBridge && step === 5 && (
            <WizardBenchStep
              step={5}
              title={WIZARD_STEP_TITLES[5]}
              fieldKeys={REVOPS_BENCH_KEYS}
              values={benchValues}
              onChange={updateBench}
              onSkip={skipBenchField}
            />
          )}
          {!sectionBridge && step === 6 && (
            <WizardQualStep
              step={6}
              title={WIZARD_STEP_TITLES[6]}
              questions={DEV_WIZARD_QUESTIONS}
              answers={devAnswers}
              onChange={(k, v) => setQuals(prev => ({ ...prev, [k]: v }))}
            />
          )}
          {!sectionBridge && step === 7 && (
            <WizardBenchStep
              step={7}
              title={WIZARD_STEP_TITLES[7]}
              fieldKeys={DEV_BENCH_KEYS}
              values={benchValues}
              onChange={updateBench}
              onSkip={skipBenchField}
            />
          )}
          {!sectionBridge && step === 8 && (
            <div>
              <WizardStepHeader step={8} title={WIZARD_STEP_TITLES[8]} />
              <TeamStructureCard
                totalHeadcount={wizardHeadcount}
                hideEmptyRows
                allowAddFunction
                confirmLabel="Confirm team →"
                onConfirm={hc => { setTeam(hc); setStep(9); }}
              />
            </div>
          )}
          {step === 9 && (
            <WizardReviewStep sections={reviewSections} onEdit={setStep} />
          )}
          {step === 10 && vce && stageIdx !== null && (
            <WizardPayoffStep
              companyName={companyName}
              vce={vce}
              stageIdx={stageIdx}
              signals={signals}
              initiatives={initiatives}
              createdInitiatives={createdInitiatives}
              onCreateInitiative={id => {
                setCreatedInitiatives(prev => new Set([...prev, id]));
                // TODO: create initiative in Initiatives tab via API
              }}
            />
          )}
        </div>
      </div>

      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "var(--panel)",
        padding: "16px 24px",
        display: "flex",
        gap: 12,
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        {(step > 1 && step < WIZARD_STEP_COUNT) || sectionBridge ? (
          <button type="button" onClick={goBack} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, color: "var(--text-2)", cursor: "pointer", font: "inherit",
            fontSize: 12, fontWeight: 700, padding: "10px 18px",
          }}>
            ← Back
          </button>
        ) : <div />}
        {(step < WIZARD_STEP_COUNT || sectionBridge) ? (
          step !== 1 && step !== 8 && !sectionBridge ? (
            <button type="button" disabled={!canNext} onClick={goNext} style={{
              background: canNext ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)" : "rgba(255,255,255,0.07)",
              border: "none", borderRadius: 8,
              color: canNext ? "#0a1a12" : "var(--text-2)",
              cursor: canNext ? "pointer" : "not-allowed",
              font: "inherit", fontSize: 12, fontWeight: 800, padding: "10px 22px",
            }}>
              {nextLabel}
            </button>
          ) : sectionBridge ? (
            <button type="button" onClick={goNext} style={{
              background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
              border: "none", borderRadius: 8,
              color: "#0a1a12",
              cursor: "pointer",
              font: "inherit", fontSize: 12, fontWeight: 800, padding: "10px 22px",
            }}>
              {nextLabel}
            </button>
          ) : null
        ) : (
          <button
            type="button"
            disabled={launching}
            onClick={handleStartJourney}
            style={{
              background: launching ? "rgba(255,255,255,0.07)" : "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
              border: "none", borderRadius: 8,
              color: launching ? "var(--text-2)" : "#0a1a12",
              cursor: launching ? "not-allowed" : "pointer",
              font: "inherit", fontSize: 12, fontWeight: 800, padding: "10px 22px",
            }}
          >
            {launching ? "Opening workspace…" : "Start my journey →"}
          </button>
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
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStepId>(1);

  // Operationally-derived stage (set after team confirmation from 8-signal VCE scoring).
  // null = not yet computed; falls back to profile-based cohort stage.
  const [operationalStageIdx, setOperationalStageIdx] = useState<number | null>(null);
  const [operationalGapLine, setOperationalGapLine] = useState<string>("");

  const emptyQualAnswers: QualAnswers = {
    salesMotion: "", funnelBreakdown: "", dealSize: "", investorIntros: "",
    pipelineTool: "", salesProcess: "", contractType: "", runway: "",
    productType: "", aiRole: "", productChallenge: "",
  };
  const [qualAnswers, setQualAnswers] = useState<QualAnswers>(emptyQualAnswers);
  // Ref for synchronous reads inside async handlers
  const qualAnswersRef = useRef<QualAnswers>(emptyQualAnswers);
  // Holds pending KPI data while RevOps qual questions run
  const pendingKpiRef = useRef<{ kpiMoment: KpiSnapshotMoment; suggestedPlaybooks: SuggestedPlaybook[] } | null>(null);
  // Tracks whether a team-structure card message has been pushed
  const teamStructureMsgIdRef = useRef<string | null>(null);
  // Accumulates benchmark values from all three CategoryCards
  const accumulatedBenchRef = useRef<Partial<BenchmarkValues>>({});
  // Stores confirmed team headcount for Value Creation Engine scoring
  const teamHeadcountRef = useRef<TeamHeadcount | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const greetedRef = useRef(false);
  const benchmarkKpiInsightMsgIdRef = useRef<string | null>(null);
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

    // Benchmark results scroll is handled inside BenchmarkCard — don't jump to the readout follow-up.
    if (targetMsg.id === benchmarkKpiInsightMsgIdRef.current) {
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
    const kpiMoment: KpiSnapshotMoment = {
      ...buildKpiSnapshotMoment(
        userData.companyName || userData.crunchbaseData?.name || "",
        getScoredBenchmarkMetrics(snapshot),
        snapshot.journeyStage,
      ),
      stageLine: analysis.fuelHelpContent.headline,
    };

    // Update an already-visible KPI card when the user changes journey stage
    if (benchmarkKpiInsightMsgIdRef.current) {
      setMessages(prev => prev.map(m => {
        if (m.id === benchmarkKpiInsightMsgIdRef.current) {
          return { ...m, kpiSnapshotMoment: kpiMoment, suggestedPlaybooks: analysis.suggestedPlaybooks };
        }
        return m;
      }));
      return;
    }

    if (options?.initial) {
      // Store pending KPI and show RevOps qualitative card first
      pendingKpiRef.current = { kpiMoment, suggestedPlaybooks: analysis.suggestedPlaybooks };

      window.setTimeout(() => {
        setIsTyping(true);
        window.setTimeout(() => {
          setIsTyping(false);
          pushMessage({
            role: "ai",
            id: uid(),
            text: "One more section — your operations.",
            cardType: "revops-qual",
          });
        }, 700);
      }, 800);
    } else {
      const id = uid();
      benchmarkKpiInsightMsgIdRef.current = id;
      pushMessage({
        role: "ai",
        id,
        text: "",
        kpiSnapshotMoment: kpiMoment,
        suggestedPlaybooks: analysis.suggestedPlaybooks,
      });
    }
  }, [aiSay, pushMessage, userData.companyName, userData.crunchbaseData?.name]);

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
          text: `👋 Hi — I'm **Fuel**, your smart advisor. The kind that doesn't take a percentage of your company.\n\nYou're signed in as **${LOGGED_IN_EMAIL}**. What company should I set up?`,
        });
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      setStep("profile-intro");
    }, 500);
    return () => clearTimeout(t);
  }, [inferredCompanyName, pushMessage]);

  // ── Step handlers ────────────────────────────────────────────────────────────

  // Shows the benchmark numbers wizard card (after GTM qual questions)
  const showBenchmarkNumbers = useCallback(async () => {
    const cohort = inferCohortFromProfile(userData.crunchbaseData, userData.businessModel);
    const helpContent = buildFuelHelpContent("benchmark-kickoff", {
      companyName: userData.companyName,
      companyStage: userData.crunchbaseData?.stage || cohort.stage,
      cohortRegion: cohort.region,
    });
    // Single message: help bubble + benchmark form flow together with no gap
    await new Promise(resolve => window.setTimeout(resolve, 400));
    pushMessage({ role: "ai", id: uid(), text: "", fuelHelp: true, fuelHelpContent: helpContent, cardType: "benchmark" });
    setStep("benchmark");
  }, [pushMessage, userData.businessModel, userData.companyName, userData.crunchbaseData]);

  // Entry point — launches the 10-step onboarding wizard (profile is step 1)
  const startWizard = useCallback(() => {
    disableLastChips();
    setWizardActive(true);
  }, [disableLastChips]);

  // GTM category complete → show RevOps category
  // ── Dynamic summary helpers ──────────────────────────────────────────────────

  function buildGtmSummary(quals: Record<string, string>): string {
    const sm = quals.salesMotion ?? "";
    const fb = quals.funnelBreakdown ?? "";
    if (sm === "Not yet") {
      return "GTM picture is clear. Pre-GTM stage — no acquisition motion defined yet. That's the most important thing to build next. Let's look at your operations.";
    }
    const motions: Record<string, string> = {
      "Sales-led": "Sales-led motion",
      "Product-led": "Product-led motion",
      "Founder-led": "Founder-led motion",
    };
    const gaps: Record<string, string> = {
      "Awareness": "with an awareness gap — growth is possible but not yet systematic",
      "Conversion": "with a conversion gap — pipeline exists but isn't closing consistently",
      "Retention": "with a retention challenge — customers aren't staying at the rate needed",
    };
    const motionText = motions[sm] ?? "GTM motion defined";
    const gapText = gaps[fb] ?? "with a clear operational picture";
    return `GTM picture is clear. ${motionText} ${gapText}. Let's look at your operations.`;
  }

  function buildRevOpsSummary(quals: Record<string, string>): string {
    const tool = quals.pipelineTool ?? "";
    const runway = quals.runway ?? "";
    const tools: Record<string, string> = {
      "CRM": "CRM in place",
      "Spreadsheet": "Spreadsheet-based pipeline",
      "Nothing yet": "No pipeline tool yet",
    };
    const runways: Record<string, string> = {
      "Under 6 months": "runway is under 6 months — that's the most urgent flag right now",
      "6–12 months": "6–12 months of runway — enough to execute, not enough to be comfortable",
      "12–18 months": "12–18 months of runway — solid position",
      "Over 18 months": "strong runway position",
    };
    const toolText = tools[tool] ?? "pipeline setup noted";
    const runwayText = runways[runway] ?? "runway is being tracked";
    return `RevOps baseline captured. ${toolText} and ${runwayText}. On to your product.`;
  }

  function buildDevSummary(quals: Record<string, string>): string {
    const pt = quals.productType ?? "";
    const pc = quals.productChallenge ?? "";
    const products: Record<string, string> = {
      "SaaS / web app": "SaaS product",
      "API / platform": "API platform",
      "Marketplace": "marketplace",
      "Hardware + software": "hardware + software product",
    };
    const challenges: Record<string, string> = {
      "Speed": "a velocity challenge — shipping cadence will be a signal to track",
      "Quality": "a quality challenge — reliability builds trust faster than features",
      "Roadmap clarity": "a roadmap clarity gap — direction before speed",
    };
    const productText = products[pt] ?? "product setup noted";
    const challengeText = challenges[pc] ?? "development focus noted";
    return `Product picture is clear. ${productText} with ${challengeText}. One last step — let's confirm your team.`;
  }

  // ── Category completion handlers ─────────────────────────────────────────────

  const handleGtmCategoryComplete = useCallback(async (newQuals: Record<string, string>, newValues: Record<string, string>) => {
    accumulatedBenchRef.current = { ...accumulatedBenchRef.current, ...newValues };
    qualAnswersRef.current = { ...qualAnswersRef.current, ...newQuals } as typeof qualAnswersRef.current;
    setQualAnswers(prev => ({ ...prev, ...newQuals }));
    await aiSay(buildGtmSummary(newQuals), { delay: 700 });
    pushMessage({ role: "ai", id: uid(), text: "", cardType: "revops-category" });
  }, [aiSay, pushMessage]);

  // RevOps category complete → show Dev category
  const handleRevOpsCategoryComplete = useCallback(async (newQuals: Record<string, string>, newValues: Record<string, string>) => {
    accumulatedBenchRef.current = { ...accumulatedBenchRef.current, ...newValues };
    qualAnswersRef.current = { ...qualAnswersRef.current, ...newQuals } as typeof qualAnswersRef.current;
    setQualAnswers(prev => ({ ...prev, ...newQuals }));
    await aiSay(buildRevOpsSummary(newQuals), { delay: 700 });
    pushMessage({ role: "ai", id: uid(), text: "", cardType: "dev-category" });
  }, [aiSay, pushMessage]);

  // Dev category complete → show team structure
  const handleDevCategoryComplete = useCallback(async (newQuals: Record<string, string>, newValues: Record<string, string>) => {
    accumulatedBenchRef.current = { ...accumulatedBenchRef.current, ...newValues };
    qualAnswersRef.current = { ...qualAnswersRef.current, ...newQuals } as typeof qualAnswersRef.current;
    setQualAnswers(prev => ({ ...prev, ...newQuals }));
    await aiSay(buildDevSummary(newQuals), { delay: 700 });
    const id = uid();
    teamStructureMsgIdRef.current = id;
    setIsTyping(true);
    await new Promise(resolve => window.setTimeout(resolve, 800));
    setIsTyping(false);
    pushMessage({
      role: "ai", id,
      text: "We found your team on LinkedIn. Does this look right?",
      cardType: "team-structure" as ChatMessage["cardType"],
    });
    setStep("team-structure");
  }, [aiSay, pushMessage]);

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
    setStep("profile-intro");
    processingRef.current = false;
  }, []);

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

  const applyProfileResult = useCallback((result: ProfileFormResult) => {
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
    setCompletedProgress(prev => new Set([...prev, "profile"]));
    // TODO: persist profile to API
  }, []);

  const handleShowProfileForm = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;
    startWizard();
    processingRef.current = false;
  }, [startWizard]);

  const handleDomainClaim = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    disableLastChips();
    pushMessage({ role: "user", text: `Create profile for ${userData.verifiedDomain || inferredDomain}` });
    startWizard();
    processingRef.current = false;
  }, [startWizard, disableLastChips, inferredDomain, pushMessage, userData.verifiedDomain]);

  const handleProfileFormSubmit = useCallback(async (result: ProfileFormResult) => {
    applyProfileResult(result);
    startWizard();
  }, [applyProfileResult, startWizard]);

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
      startWizard();
    } else {
      pushMessage({ role: "user", text: "I need to update a few details" });
      startWizard();
    }
    processingRef.current = false;
  }, [startWizard, disableLastChips, pushMessage]);

  // ── Qualitative completion handlers ─────────────────────────────────────────

  // Called when GTM qual card is submitted → shows transition + benchmark numbers
  const handleGtmQualComplete = useCallback(async (answers: Record<string, string>) => {
    qualAnswersRef.current = { ...qualAnswersRef.current, ...answers } as typeof qualAnswersRef.current;
    setQualAnswers(prev => ({ ...prev, ...answers }));
      await aiSay(
      `Great. Now let's see where ${userData.companyName || "your company"} sits on the numbers.`,
      { delay: 700 },
    );
    await showBenchmarkNumbers();
  }, [aiSay, showBenchmarkNumbers, userData.companyName]);

  // Called after all RevOps answers — shows transition + posts pending KPI + dev qual card
  const showKpiAfterRevOps = useCallback(async () => {
      await aiSay(
      `You're all set. Here's where ${userData.companyName || "your company"} stands across your cohort.`,
      { delay: 600 },
    );
    const pending = pendingKpiRef.current;
    if (!pending) return;
    const id = uid();
    benchmarkKpiInsightMsgIdRef.current = id;
    pushMessage({
      role: "ai",
      id,
      text: "",
      kpiSnapshotMoment: pending.kpiMoment,
      suggestedPlaybooks: pending.suggestedPlaybooks,
    });
    pendingKpiRef.current = null;

    // Show dev qual card after a brief pause
    window.setTimeout(() => {
      setIsTyping(true);
      window.setTimeout(() => {
        setIsTyping(false);
        pushMessage({
          role: "ai",
          id: uid(),
          text: "Last section — your product and engineering.",
          cardType: "dev-qual",
        });
      }, 800);
    }, 1000);
  }, [aiSay, pushMessage, userData.companyName]);

  // Called when RevOps qual card is submitted → shows KPI snapshot
  const handleRevOpsQualComplete = useCallback(async (answers: Record<string, string>) => {
    qualAnswersRef.current = { ...qualAnswersRef.current, ...answers } as typeof qualAnswersRef.current;
    setQualAnswers(prev => ({ ...prev, ...answers }));
    await showKpiAfterRevOps();
  }, [showKpiAfterRevOps]);

  // Called when Dev qual card is submitted → shows team structure card
  const handleDevQualComplete = useCallback(async (answers: Record<string, string>) => {
    qualAnswersRef.current = { ...qualAnswersRef.current, ...answers } as typeof qualAnswersRef.current;
    setQualAnswers(prev => ({ ...prev, ...answers }));
    await aiSay("Almost done. Let's confirm your team.", { delay: 500 });
    const id = uid();
    teamStructureMsgIdRef.current = id;
    setIsTyping(true);
    await new Promise(resolve => window.setTimeout(resolve, 800));
    setIsTyping(false);
    pushMessage({
      role: "ai",
      id,
      text: "We found your team on LinkedIn. Does this look right?",
      cardType: "team-structure" as ChatMessage["cardType"],
    });
    setStep("team-structure");
  }, [aiSay, pushMessage]);

  // ── Benchmark snapshot ──────────────────────────────────────────────────────

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

  const handleWizardStepChange = useCallback((step: WizardStepId) => {
    setWizardStep(step);
    setCompletedProgress(prev => {
      const next = new Set(prev);
      if (step >= 2) next.add("profile");
      if (step >= 4) next.add("gtm");
      if (step >= 6) next.add("revops");
      if (step >= 8) next.add("development");
      if (step >= 9) next.add("team");
      return next;
    });
  }, []);

  const handleWizardVCEUpdate = useCallback((stageIdx: number, gapLine: string, _assessment: VCEAssessment) => {
    setOperationalStageIdx(stageIdx);
    setOperationalGapLine(gapLine);
    setCompletedProgress(prev => new Set([...prev, "intelligence"]));
    // TODO: persist VCE stage + score to API
  }, []);

  const completeOnboarding = useCallback(() => {
    onComplete(latestBenchmarkSnapshotRef.current?.values ?? null);
  }, [onComplete]);

  const handleWizardComplete = useCallback(async (data: {
    quals: QualAnswers;
    bench: Partial<BenchmarkValues>;
    team: TeamHeadcount;
  }) => {
    qualAnswersRef.current = data.quals;
    setQualAnswers(data.quals);
    accumulatedBenchRef.current = data.bench;
    teamHeadcountRef.current = data.team;
    // TODO: send qualAnswers + benchmark values + team headcount to API

    const cohort = inferCohortFromProfile(userData.crunchbaseData, userData.businessModel);
    const cohortLabel = `${cohort.model} · ${cohort.stage} · ${cohort.region}`;
    const emptyBench: BenchmarkValues = {
      arr: "", arrGrowth: "", nrr: "", logoRetention: "", monthlyBurn: "",
      cashOnHand: "", grossMargin: "", cacPayback: "", burnMultiple: "", ruleOf40: "",
      headcount: "", payingCustomers: "",
    };
    const snapshot: BenchmarkSnapshot = {
      values: { ...emptyBench, ...data.bench },
      cohort,
      cohortLabel,
      journeyStage: cohort.stage,
    };
    latestBenchmarkSnapshotRef.current = snapshot;
    benchmarkJourneyStageRef.current = cohort.stage;

    setCompletedProgress(prev => new Set([...prev, "profile", "gtm", "revops", "development", "team", "intelligence"]));
    setStep("done");

    await new Promise(resolve => window.setTimeout(resolve, 1600));
    setWizardActive(false);
    completeOnboarding();
  }, [completeOnboarding, userData.businessModel, userData.crunchbaseData]);

  // Called when team structure card is confirmed — posts KPI → VCE → workspace setup
  const handleTeamStructureConfirm = useCallback(async (_headcount: TeamHeadcount) => {
    // TODO: send qualAnswersRef.current + accumulatedBenchRef.current + _headcount to API
    teamHeadcountRef.current = _headcount;
    await aiSay("Your profile is complete. Here's what Fuel found.", { delay: 700 });

    // Build KPI snapshot from accumulated CategoryCard benchmark values
    const hasCategoryValues = Object.keys(accumulatedBenchRef.current).length > 0;
    if (hasCategoryValues) {
      const cohort = inferCohortFromProfile(userData.crunchbaseData, userData.businessModel);
      const cohortLabel = `${cohort.model} · ${cohort.stage} · ${cohort.region}`;
      const emptyBench: BenchmarkValues = {
        arr: "", arrGrowth: "", nrr: "", logoRetention: "", monthlyBurn: "",
        cashOnHand: "", grossMargin: "", cacPayback: "", burnMultiple: "", ruleOf40: "",
        headcount: "", payingCustomers: "",
      };
      const snapshot: BenchmarkSnapshot = {
        values: { ...emptyBench, ...accumulatedBenchRef.current },
        cohort,
        cohortLabel,
        journeyStage: cohort.stage,
      };
      latestBenchmarkSnapshotRef.current = snapshot;
      const analysis = analyzeBenchmarkSnapshot(snapshot);
      const kpiMoment: KpiSnapshotMoment = {
        ...buildKpiSnapshotMoment(
          userData.companyName || userData.crunchbaseData?.name || "",
          getScoredBenchmarkMetrics(snapshot),
          snapshot.journeyStage,
        ),
        stageLine: analysis.fuelHelpContent.headline,
      };
      const id = uid();
      benchmarkKpiInsightMsgIdRef.current = id;
      pushMessage({ role: "ai", id, text: "", kpiSnapshotMoment: kpiMoment, suggestedPlaybooks: analysis.suggestedPlaybooks });
      await new Promise(resolve => window.setTimeout(resolve, 1000));
    }

    // Derive operational stage from 8-signal VCE scoring, update sidebar, send chat message
    {
      const vce = computeVCEAssessment(
        qualAnswersRef.current,
        accumulatedBenchRef.current,
        teamHeadcountRef.current ?? defaultTeamDistribution(12),
      );
      const stageOrder: VCEAssessment["stageName"][] = ["Foundation", "Acceleration", "Scale", "Optimization"];
      const stageIdx = stageOrder.indexOf(vce.stageName);
      const topGapLine = vce.topGaps[0]?.gapLine ?? "Focus on margin expansion and long-term enterprise value.";
      const isOptimization = vce.stageName === "Optimization";
      const sidebarGapLine = isOptimization
        ? "Focus on margin expansion and long-term enterprise value."
        : topGapLine;

      // Update sidebar to reflect operationally-derived stage
      setOperationalStageIdx(stageIdx);
      setOperationalGapLine(sidebarGapLine);

      // TODO: persist vce.stageName and vce.score to API so Scorecard can use it

      // Build and send the Fuel AI chat message
      const co = userData.companyName || userData.crunchbaseData?.name || "your company";
      const stageMessages: Record<VCEAssessment["stageName"], string> = {
        Foundation: `Based on what you've shared, ${co} is at the Foundation stage — building the operational trust needed before growth can be repeatable. ${topGapLine} Fuel will track your movement quarter over quarter.`,
        Acceleration: `Based on what you've shared, ${co} is at the Acceleration stage — growth is happening but not yet systematic. ${topGapLine} The goal now is repeatable growth that doesn't depend on heroics.`,
        Scale: `Based on what you've shared, ${co} is at the Scale stage — the motion exists. ${topGapLine} The goal now is growth that compounds without adding fragility.`,
        Optimization: `Based on what you've shared, ${co} is at the Optimization stage — focus shifts to margin expansion and long-term enterprise value.`,
      };
      await aiSay(stageMessages[vce.stageName], { delay: 700 });
    }

    await handleBenchmarkContinue();
  }, [aiSay, handleBenchmarkContinue, pushMessage, userData.businessModel, userData.companyName, userData.crunchbaseData]);

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
    else if (step === "profile-intro" && (value === "start-wizard" || value === "show-profile-form")) handleShowProfileForm();
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
  }, [
    disableLastChips,
    handleCompanyConfirm, handleCrunchbaseConfirm, handleDomainClaim,
    handleLaunch, handleMoreDetailsChoice, handleProfileDescriptionChoice,
    handleShowProfileForm, handleYorkLinkResponse, handleYorkServicesResponse,
    pushMessage, showManualFuelProfileForm, step,
  ]);

  const inputActive = step === "company-name" || step === "profile-description" || step === "profile-more-details" || step === "crunchbase-url";
  const userInitial = (userData.email || userData.companyName || "U").trim().charAt(0).toUpperCase();
  const sidebarWizardStep: WizardStepId | 0 = wizardActive ? wizardStep : step === "profile-intro" ? 1 : 0;
  const showWelcome = !wizardActive && step === "profile-intro";

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
        .fuel-manual:hover { color: var(--text-2) !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--panel-border); border-radius: 3px; }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(10,20,28,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "stretch", justifyContent: "stretch",
      }}>
      <div style={{
        width: "100vw", height: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column",
        fontFamily: "Inter, -apple-system, sans-serif",
      }}>
        {/* Top bar */}
        <div style={{
          height: 52, background: "var(--surface-3)",
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
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>Fuel</span>
            <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>by York IE</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: "#00B48A",
              background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.2)",
              borderRadius: 4, padding: "1px 6px", letterSpacing: "0.3px",
            }}>ONBOARDING</span>
          </div>
          {wizardActive && wizardStep >= 2 && (
          <button
            onClick={onManual}
            className="fuel-manual"
            style={{
              background: "none", border: "none", color: "var(--text-2)",
              fontSize: 12, cursor: "pointer", transition: "color 0.15s",
            }}
          >
            Set up later →
          </button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", maxHeight: "calc(100vh - 52px)" }}>

          {/* ── Chat panel ── */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            minWidth: 0, background: "var(--bg)",
          }}>
            {/* Messages / wizard */}
            {wizardActive ? (
              <OnboardingWizard
                companyName={userData.companyName || userData.crunchbaseData?.name || ""}
                profileData={{
                  crunchbaseData: userData.crunchbaseData ?? starterFuelProfile(userData.companyName || "Your company"),
                  businessModel: userData.businessModel,
                  notes: userData.profileNotes,
                  domain: userData.verifiedDomain || inferredDomain,
                }}
                onProfileSubmit={applyProfileResult}
                onStepChange={handleWizardStepChange}
                onVCEUpdate={handleWizardVCEUpdate}
                onComplete={handleWizardComplete}
              />
            ) : showWelcome ? (
              <OnboardingWelcomeScreen
                companyName={userData.companyName || inferredCompanyName || ""}
                email={LOGGED_IN_EMAIL}
                onStart={startWizard}
              />
            ) : (
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
                      maxWidth: (msg.cardType === "benchmark" || msg.kpiSnapshotMoment || msg.cardType === "gtm-category" || msg.cardType === "revops-category" || msg.cardType === "dev-category") ? "min(680px, 96%)" : "85%",
                      width: (msg.cardType === "benchmark" || msg.kpiSnapshotMoment || msg.cardType === "gtm-category" || msg.cardType === "revops-category" || msg.cardType === "dev-category") ? "100%" : undefined,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}>
                      {msg.kpiSnapshotMoment ? (
                        <KpiSnapshotMoment
                          moment={msg.kpiSnapshotMoment}
                          playbooks={msg.suggestedPlaybooks}
                          showContinue={false}
                          onContinue={handleBenchmarkContinue}
                        />
                      ) : null}
                      {(msg.fuelHelpContent || (msg.text && msg.fuelHelp)) && (
                        msg.fuelHelpContent ? (
                          <FuelHelpBubble
                            content={msg.fuelHelpContent}
                            playbooks={msg.suggestedPlaybooks}
                          />
                        ) : (
                          <div style={{
                            background: "rgba(0,180,138,0.06)",
                            border: "1px solid rgba(0,180,138,0.18)",
                            borderRadius: msg.role === "ai" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                            padding: "11px 14px",
                            fontSize: 13, color: "var(--text-1)", lineHeight: 1.65,
                            whiteSpace: "pre-line",
                          }}>
                            {msg.text.split("**").map((part, i) =>
                              i % 2 === 0
                                ? <span key={i}>{part}</span>
                                : <strong key={i} style={{ color: "var(--text-1)", fontWeight: 700 }}>{part}</strong>
                            )}
                          </div>
                        )
                      )}
                      {msg.text && !msg.fuelHelp && (
                        <div style={{
                          background: msg.role === "ai" ? "var(--panel)" : "var(--surface-3)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: msg.role === "ai" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                          padding: "11px 14px",
                          fontSize: 13, color: "var(--text-1)", lineHeight: 1.65,
                          whiteSpace: "pre-line",
                        }}>
                          {msg.text.split("**").map((part, i) =>
                            i % 2 === 0
                              ? <span key={i}>{part}</span>
                              : <strong key={i} style={{ color: "var(--text-1)", fontWeight: 700 }}>{part}</strong>
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
                              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>Your Fuel workspace is ready</div>
                              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 14 }}>
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
                      {/* ── GTM & Marketing category card ── */}
                      {msg.cardType === "gtm-category" && (
                        <CategoryCard
                          categoryLabel="GTM & Marketing"
                          categoryDescription="Your acquisition motion, funnel health, and sales approach."
                          categoryColor="#00B48A"
                          categoryBg="rgba(0,180,138,0.07)"
                          questions={[
                            {
                              key: "salesMotion",
                              label: "What is your primary sales motion?",
                              options: ["Sales-led", "Product-led", "Founder-led", "Not yet"],
                              acks: {
                                "Sales-led": "A defined motion. Let's see if the numbers support it.",
                                "Product-led": "Self-serve scales well — if conversion holds. We'll track it.",
                                "Founder-led": "Founder-led works early but creates a ceiling. We'll flag this in your Scorecard.",
                                "Not yet": "Pre-GTM. That shapes everything else in this section.",
                              },
                              defaultAck: "Got it.",
                            },
                            {
                              key: "funnelBreakdown",
                              label: "Where does your funnel break down most?",
                              options: ["Awareness", "Conversion", "Retention"],
                              acks: {
                                "Awareness": "Top of funnel is the hardest to fix without a dedicated motion. Noted.",
                                "Conversion": "Pipeline exists but isn't closing. Could be ICP, messaging, or process. We'll dig in.",
                                "Retention": "Keeping customers is the real moat. Let's see your retention numbers.",
                              },
                              defaultAck: "Noted.",
                              condition: (a) => Boolean(a.salesMotion) && a.salesMotion !== "Not yet",
                            },
                            {
                              key: "dealSize",
                              label: "What is your average deal size?",
                              options: ["Under $1K", "$1K–$10K", "$10K–$100K", "Don't know yet"],
                              acks: {
                                "Under $1K": "High volume, low touch. Efficiency matters.",
                                "$1K–$10K": "Mid-market motion. Sales cycle and CAC payback are the metrics to watch.",
                                "$10K–$100K": "Enterprise-leaning. Sales process and cycle length will matter a lot.",
                                "Don't know yet": "That's okay at this stage. We'll revisit as pipeline develops.",
                              },
                              defaultAck: "Noted.",
                              condition: (a) => a.salesMotion === "Sales-led" || a.salesMotion === "Founder-led",
                            },
                            {
                              key: "investorIntros",
                              label: "Are you open to investor intros from York IE?",
                              options: ["Yes", "Not right now", "Actively fundraising"],
                              acks: {
                                "Yes": "Noted. York IE will flag relevant intros based on your profile.",
                                "Not right now": "Got it. You can update this anytime from your profile.",
                                "Actively fundraising": "Good timing. We'll make sure your Scorecard supports the narrative.",
                              },
                              defaultAck: "Noted.",
                            },
                          ]}
                          benchFields={[
                            { fieldKey: "arr" },
                            { fieldKey: "arrGrowth" },
                            { fieldKey: "nrr" },
                            { fieldKey: "logoRetention" },
                          ]}
                          benchStepOffset={0}
                          benchTotal={12}
                          onComplete={handleGtmCategoryComplete}
                        />
                      )}

                      {/* ── RevOps category card ── */}
                      {msg.cardType === "revops-category" && (
                        <CategoryCard
                          categoryLabel="RevOps"
                          categoryDescription="Pipeline management, sales process, and financial health."
                          categoryColor="#D4924A"
                          categoryBg="rgba(212,146,74,0.07)"
                          questions={[
                            {
                              key: "pipelineTool",
                              label: "What are you using to manage your pipeline?",
                              options: ["CRM", "Spreadsheet", "Nothing yet"],
                              acks: {
                                "CRM": "Good foundation. Pipeline visibility is a real advantage at this stage.",
                                "Spreadsheet": "Gets the job done early on. Watch for gaps as the team grows.",
                                "Nothing yet": "No pipeline tool means no pipeline visibility. That's a gap we'll track.",
                              },
                              defaultAck: "Got it.",
                            },
                            {
                              key: "salesProcess",
                              label: "How defined is your sales process?",
                              options: ["Documented", "Informal", "Not yet"],
                              acks: {
                                "Documented": "A written process is a competitive advantage. Protect it.",
                                "Informal": "Consistent but not captured. One bad hire away from inconsistency.",
                                "Not yet": "That's the right thing to know. Define it before you scale the team.",
                              },
                              defaultAck: "Got it.",
                              condition: (a) => Boolean(a.pipelineTool) && a.pipelineTool !== "Nothing yet",
                            },
                            {
                              key: "contractType",
                              label: "What is your primary contract type?",
                              options: ["Monthly", "Annual", "Usage-based", "Not yet defined"],
                              acks: {
                                "Monthly": "Flexible for customers, but annual contracts improve predictability.",
                                "Annual": "Strong for forecasting and reducing churn risk.",
                                "Usage-based": "Aligns incentives with customer value. NRR is your key metric.",
                                "Not yet defined": "Define this before your first enterprise conversation.",
                              },
                              defaultAck: "Noted.",
                              condition: (a) => a.salesMotion !== "Not yet" && Boolean(a.salesMotion),
                            },
                            {
                              key: "runway",
                              label: "How long is your current runway?",
                              options: ["Under 6 months", "6–12 months", "12–18 months", "Over 18 months"],
                              acks: {
                                "Under 6 months": "That's urgent. This will show as the highest priority signal in your Scorecard.",
                                "6–12 months": "Enough to execute, not enough to be comfortable. Keep an eye on burn.",
                                "12–18 months": "Solid position. Enough runway to be intentional about growth.",
                                "Over 18 months": "Strong position. Growth decisions can be proactive, not defensive.",
                              },
                              defaultAck: "Got it.",
                            },
                          ]}
                          benchFields={[
                            { fieldKey: "grossMargin" },
                            { fieldKey: "cacPayback" },
                            { fieldKey: "burnMultiple" },
                            { fieldKey: "ruleOf40" },
                            { fieldKey: "monthlyBurn" },
                            { fieldKey: "cashOnHand" },
                          ]}
                          benchStepOffset={4}
                          benchTotal={12}
                          externalQuals={{ salesMotion: qualAnswers.salesMotion }}
                          onComplete={handleRevOpsCategoryComplete}
                        />
                      )}

                      {/* ── Development category card ── */}
                      {msg.cardType === "dev-category" && (
                        <CategoryCard
                          categoryLabel="Development"
                          categoryDescription="Engineering setup, product type, and biggest challenges."
                          categoryColor="#8B76D4"
                          categoryBg="rgba(139,118,212,0.07)"
                          questions={[
                            {
                              key: "productType",
                              label: "What type of product are you building?",
                              options: ["SaaS / web app", "API / platform", "Marketplace", "Hardware + software"],
                              acks: {
                                "SaaS / web app": "The most common model in your cohort. Gross margin and churn are key.",
                                "API / platform": "Developer-led growth is possible here. Usage metrics matter.",
                                "Marketplace": "Two-sided dynamics add complexity. Liquidity is the primary challenge.",
                                "Hardware + software": "Harder margins, stickier customers. Gross margin benchmarks will differ.",
                              },
                              defaultAck: "Got it.",
                            },
                            {
                              key: "aiRole",
                              label: "Is AI core to your product?",
                              options: ["Core product", "A feature", "Not yet"],
                              acks: {
                                "Core product": "AI-native. SOC 2 and ISO compliance early will unlock enterprise faster.",
                                "A feature": "AI as a differentiator. Make sure it's defensible, not just additive.",
                                "Not yet": "Not required at this stage. Worth revisiting at Acceleration.",
                              },
                              defaultAck: "Got it.",
                            },
                            {
                              key: "productChallenge",
                              label: "What is your biggest product challenge right now?",
                              options: ["Speed", "Quality", "Roadmap clarity"],
                              acks: {
                                "Speed": "Velocity matters. We'll track shipping cadence in your Scorecard.",
                                "Quality": "Reliability builds trust faster than features. Got it.",
                                "Roadmap clarity": "Direction before speed. A clear roadmap compounds over time.",
                              },
                              defaultAck: "Noted.",
                            },
                          ]}
                          benchFields={[
                            { fieldKey: "headcount" },
                            { fieldKey: "payingCustomers" },
                          ]}
                          benchStepOffset={10}
                          benchTotal={12}
                          onComplete={handleDevCategoryComplete}
                        />
                      )}

                      {msg.cardType === "team-structure" && msg.id === teamStructureMsgIdRef.current && (
                        <TeamStructureCard
                          totalHeadcount={
                            (() => {
                              const raw = latestBenchmarkSnapshotRef.current?.values.headcount ?? "";
                              const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
                              return isNaN(n) ? 12 : n;
                            })()
                          }
                          onConfirm={handleTeamStructureConfirm}
                        />
                      )}


                      {/* GTM qualitative card */}
                      {msg.cardType === "gtm-qual" && (
                        <QualSectionCard
                          sectionLabel="GTM · Sales & Revenue"
                          sectionSub="A few quick questions about your go-to-market"
                          questions={[
                            {
                              key: "salesMotion",
                              label: "What is your primary sales motion right now?",
                              options: ["Sales-led", "Product-led", "Founder-led", "Not yet"],
                              acks: {
                                "Not yet": "Got it — pre-GTM. That shapes everything.",
                                "Founder-led": "Classic early stage. Good to know.",
                              },
                              defaultAck: "Got it.",
                            },
                            {
                              key: "funnelBreakdown",
                              label: "Where does your funnel break down most?",
                              options: ["Awareness", "Conversion", "Retention"],
                              acks: {
                                Awareness: "Top of funnel — we'll look at that.",
                                Conversion: "Pipeline exists but not closing. Noted.",
                                Retention: "Keeping customers is the hardest part. Got it.",
                              },
                              defaultAck: "Noted.",
                              condition: (a) => Boolean(a.salesMotion) && a.salesMotion !== "Not yet",
                            },
                            {
                              key: "dealSize",
                              label: "What is your average deal size?",
                              options: ["Under $1K", "$1K–$10K", "$10K–$100K", "Don't know yet"],
                              acks: {},
                              defaultAck: "Noted.",
                              condition: (a) => a.salesMotion === "Sales-led" || a.salesMotion === "Founder-led",
                            },
                            {
                              key: "investorIntros",
                              label: "Are you open to investor intros from York IE?",
                              options: ["Yes", "Not right now", "Actively fundraising"],
                              acks: { "Actively fundraising": "Good timing — we'll flag relevant intros." },
                              defaultAck: "Noted.",
                            },
                          ]}
                          onComplete={handleGtmQualComplete}
                        />
                      )}

                      {/* RevOps qualitative card */}
                      {msg.cardType === "revops-qual" && (
                        <QualSectionCard
                          sectionLabel="RevOps · Operations"
                          sectionSub="How you run the business day to day"
                          questions={[
                            {
                              key: "pipelineTool",
                              label: "What are you using to manage your pipeline?",
                              options: ["CRM", "Spreadsheet", "Nothing yet"],
                              acks: {
                                CRM: "Good foundation.",
                                Spreadsheet: "Gets the job done early on.",
                                "Nothing yet": "No pipeline tool yet — that's a gap we'll flag.",
                              },
                              defaultAck: "Got it.",
                            },
                            {
                              key: "salesProcess",
                              label: "How defined is your sales process?",
                              options: ["Documented", "Informal", "Not yet"],
                              acks: {},
                              defaultAck: "Got it.",
                              condition: (a) => a.pipelineTool !== "Nothing yet" && Boolean(a.pipelineTool),
                            },
                            {
                              key: "contractType",
                              label: "What is your primary contract type?",
                              options: ["Monthly", "Annual", "Usage-based", "Not yet defined"],
                              acks: {},
                              defaultAck: "Noted.",
                              condition: (a) => a.salesMotion !== "Not yet" && Boolean(a.salesMotion),
                            },
                            {
                              key: "runway",
                              label: "How long is your current runway?",
                              options: ["Under 6 months", "6–12 months", "12–18 months", "Over 18 months"],
                              acks: {
                                "Under 6 months": "That's urgent — we'll make sure it shows in your Scorecard.",
                                "Over 18 months": "Strong position. Growth decisions can be proactive.",
                              },
                              defaultAck: "Got it.",
                            },
                          ]}
                          externalAnswers={{ salesMotion: qualAnswers.salesMotion }}
                          onComplete={handleRevOpsQualComplete}
                        />
                      )}

                      {/* Development qualitative card */}
                      {msg.cardType === "dev-qual" && (
                        <QualSectionCard
                          sectionLabel="Engineering · Product & Dev"
                          sectionSub="Your product and technical foundation"
                          questions={[
                            {
                              key: "productType",
                              label: "What type of product are you building?",
                              options: ["SaaS / web app", "API / platform", "Marketplace", "Hardware + software"],
                              acks: {},
                              defaultAck: "Got it.",
                            },
                            {
                              key: "aiRole",
                              label: "Is AI core to your product?",
                              options: ["Core product", "A feature", "Not yet"],
                              acks: {
                                "Core product": "AI-native — noted. Compliance readiness will matter early for enterprise.",
                              },
                              defaultAck: "Got it.",
                            },
                            {
                              key: "productChallenge",
                              label: "What is your biggest product challenge right now?",
                              options: ["Speed", "Quality", "Roadmap clarity"],
                              acks: {
                                Speed: "Velocity matters. We'll track it.",
                                Quality: "Reliability builds trust. Got it.",
                                "Roadmap clarity": "Direction before speed. Noted.",
                              },
                              defaultAck: "Noted.",
                            },
                          ]}
                          onComplete={handleDevQualComplete}
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
                                background: "var(--panel)",
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
                      background: "var(--panel)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "4px 12px 12px 12px",
                    }}>
                      <TypingDots />
                    </div>
                  </div>
                )}

              </div>
            </div>
            )}

            {/* Input — only visible during text-entry steps */}
            {inputActive && <div style={{
              borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "var(--panel)", padding: "14px 24px",
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
                  flex: 1, background: "var(--surface-3)",
                  border: "1px solid var(--panel-border)",
                  borderRadius: 8, padding: "10px 14px",
                  fontSize: 13, color: "var(--text-1)",
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
                  color: inputActive && inputValue.trim() ? "#0a1a12" : "var(--text-2)",
                }}
              >→</button>
            </div>}
          </div>

          {/* ── Left sidebar ── */}
          <div style={{
            width: 260, flexShrink: 0,
            background: "#1A2E3D",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            padding: "28px 18px",
            overflowY: "auto",
            order: -1,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>
              What&apos;s getting set up
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {WIZARD_PROGRESS_ITEMS.map(item => {
                const done = sidebarWizardStep > item.doneAfter;
                const current = sidebarWizardStep > 0 && !done && sidebarWizardStep >= item.activeFrom && sidebarWizardStep <= item.doneAfter;
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: done ? "rgba(61,214,140,0.15)" : current ? "rgba(0,180,138,0.08)" : "rgba(255,255,255,0.04)",
                      border: done ? "1px solid rgba(61,214,140,0.4)" : current ? "1px solid rgba(0,180,138,0.35)" : "1px solid rgba(255,255,255,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, transition: "all 0.3s",
                    }}>
                      {done ? <span style={{ color: "#00B48A" }}>✓</span> : current ? <span style={{ color: "#00B48A", fontSize: 8 }}>●</span> : <span style={{ color: "var(--text-2)" }}>○</span>}
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: done ? "#00B48A" : current ? "var(--text-1)" : "var(--text-2)",
                      fontWeight: done || current ? 600 : 400,
                      transition: "color 0.3s",
                    }}>{item.label}</span>
                  </div>
                );
              })}
            </div>

            {/* York IE Value Creation Engine — auto-updates from profile + benchmarks */}
            <div style={{
              marginTop: 28, background: "var(--panel)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10, padding: "14px 14px 10px",
            }}>
              <div style={{
                fontSize: 9, fontWeight: 800, color: "var(--text-2)",
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14,
              }}>
                York IE · Value Creation
              </div>
              {([
                { label: "Foundation", sub: "Benchmarks + peer map" },
                { label: "Acceleration", sub: "GTM + hiring signal" },
                { label: "Scale", sub: "Unit economics + M&A" },
                { label: "Optimization", sub: "Exit + enterprise readiness" },
              ] as const).map((stg, i) => {
                const isActive = operationalStageIdx !== null && i === operationalStageIdx;
                const isDone = operationalStageIdx !== null && i < operationalStageIdx;
                return (
                  <div key={stg.label} style={{
                    display: "flex", alignItems: "flex-start", gap: 9,
                    padding: "8px 0",
                    borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    transition: "all 0.3s",
                  }}>
                    {/* Stage indicator */}
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                      background: isDone ? "rgba(0,180,138,0.2)" : isActive ? "rgba(0,180,138,0.12)" : "rgba(255,255,255,0.04)",
                      border: isDone ? "1px solid rgba(0,180,138,0.5)" : isActive ? "1px solid rgba(0,180,138,0.35)" : "1px solid rgba(255,255,255,0.07)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 700, transition: "all 0.3s",
                    }}>
                      {isDone
                        ? <span style={{ color: "#00B48A" }}>✓</span>
                        : <span style={{ color: isActive ? "#00B48A" : "#566E7A" }}>{i + 1}</span>
                      }
                  </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <span style={{
                          fontSize: 12, fontWeight: isActive ? 700 : isDone ? 600 : 400,
                          color: isDone ? "#00B48A" : isActive ? "var(--text-1)" : "#566E7A",
                          transition: "color 0.3s",
                        }}>
                          {stg.label}
                        </span>
                        {isActive && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, color: "#00B48A",
                            background: "rgba(0,180,138,0.1)", border: "1px solid rgba(0,180,138,0.25)",
                            borderRadius: 8, padding: "1px 6px", letterSpacing: "0.05em",
                          }}>ACTIVE</span>
                        )}
              </div>
                      {/* Sub-text: show operational gap line after team confirm, else stage description */}
                      {(isActive || isDone) && (
                        <div style={{ fontSize: 10, color: isDone ? "#6B8899" : "var(--text-2)", marginTop: 2 }}>
                          {isActive ? operationalGapLine : stg.sub}
            </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
