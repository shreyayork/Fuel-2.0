import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ProfileMotion, DevMotion, GtmMotion, RevopsMotion,
  InvestmentMotion, BenchmarkMotion, HubSpotMotion,
  GTM_FUNNEL_HINTS, GTM_FUNNEL_CHOICES, type GtmFunnelStage,
} from "./OnboardingMotionGraphics.tsx";
import type { OnboardingBenchmarkInput } from "./PatriotPayJourney.tsx";
import {
  ONBOARDING_TRACK_FIELDS,
  emptyOnboardingTrackAnswers,
  mapOnboardingToDetailAnswers as mapTrackOnboardingToDetailAnswers,
  serializeProfileFundingRounds,
  type OnboardingTrackAnswers,
} from "./trackQuestions.ts";
import { FuelIcon } from "./icons";
import { applyFuelTheme, readFuelTheme, toggleFuelTheme, type FuelTheme } from "./fuelTheme";
import { sanitizeBenchmarkNumericInput } from "./benchmarkInput";
import { saveDetailAnswers, loadDetailAnswers } from "./profileDetailsStorage.ts";
import {
  clearOnboardingProgress,
  loadOnboardingProgress,
  loadSavedBusinessType,
  ONBOARDING_COMPANY_KEY,
  saveOnboardingProgress,
  saveBusinessType,
  BUSINESS_TYPE_MODEL,
  type OnboardingBusinessType,
  type OnboardingSearchState,
  type SavedOnboardingProgress,
} from "./onboardingProgressStorage.ts";
import { isBrowserReload } from "./workspaceSession.ts";
import { isModuleFullyComplete } from "./profileProgress.ts";
import type { DetailAnswers } from "./trackQuestions.ts";

// ─── Types ──────────────────────────────────────────────────────────────────

type StepId = "profile" | "development" | "gtm" | "revops" | "benchmarking" | "investment" | "hubspot" | "sources";
type ConnectStatus = "pending" | "connecting" | "connected";
type HubSpotStatus = ConnectStatus;

interface FundingRound { id: string; type: string; amount: string; date: string; investors: string; }
interface ProfileForm {
  company: string; whatTheyDo: string; businessModel: string;
  industry: string; founded: string; city: string; stateRegion: string;
  country: string; website: string; linkedin: string; additionalContext: string;
  productDescription: string; approxHeadcount: string;
}
interface Answers extends OnboardingTrackAnswers {
  profileProductDescription: string;
  profileApproxHeadcount: string;
  profileBusinessModel?: string;
  profileCompany?: string;
  profileIndustry?: string;
  profileFounded?: string;
  profileCity?: string;
  profileStateRegion?: string;
  profileCountry?: string;
  profileWebsite?: string;
  profileLinkedin?: string;
  profileAdditionalContext?: string;
  profileFundingRounds?: string;
  /** Set during short onboarding (Step 2). Live auth sync belongs in backend lock. */
  userFullName?: string;
  userRole?: string;
  /** False until in-app profile sections + benchmarks are finished. */
  profileSetupComplete?: boolean;
  arr: string; arrGrowth: string; nrr: string; logoRetention: string;
  grossMargin: string; cacPayback: string; burnMultiple: string; ruleOf40: string;
  monthlyBurn: string; cashOnHand: string;
  headcount: string; payingCustomers: string;
  investCheckSize: string; investGeography: string[]; investPipeline: string;
  hubspotConnected?: boolean;
}

/** Roles for onboarding Step 2 — domain-accurate operator / founder titles. */
export const ONBOARDING_USER_ROLES = [
  "Founder / Co-founder",
  "CEO",
  "CTO",
  "COO",
  "Head of Product",
  "Head of Growth",
  "Head of Sales",
  "Head of Finance",
  "Investor / Partner",
  "Operator / Advisor",
  "Other",
] as const;

const STEPS_PRODUCT: StepId[] = ["profile", "development", "gtm", "revops", "benchmarking"];
const STEPS_SERVICE: StepId[] = ["profile"];
const STEPS_INVESTOR_BASE: StepId[] = ["profile", "investment"];
const STEPS_INVESTOR_WITH_HUBSPOT: StepId[] = ["profile", "investment", "hubspot"];

/** @deprecated Use STEPS_PRODUCT */
const STEPS_DEFAULT = STEPS_PRODUCT;

function stepsForBusinessType(type: OnboardingBusinessType, investPipeline: string): StepId[] {
  if (type === "product") return STEPS_PRODUCT;
  if (type === "service") return STEPS_SERVICE;
  return investorActiveSteps(investPipeline);
}

function investorActiveSteps(investPipeline: string): StepId[] {
  return investPipeline === "HubSpot" ? STEPS_INVESTOR_WITH_HUBSPOT : STEPS_INVESTOR_BASE;
}
export const INVESTOR_MODELS = ["Investment"];

import {
  INVEST_GEOGRAPHY_OPTIONS,
  investGeographyDisplayLabel,
  normalizeInvestGeography,
} from "./investGeography.ts";

export {
  INVEST_GEOGRAPHY_OPTIONS,
  dealMatchesInvestGeography,
  investGeographyDisplayLabel,
  normalizeInvestGeography,
  normalizeInvestGeographyLabel,
  normalizeInvestGeographySelection,
} from "./investGeography.ts";

const LEGACY_BUSINESS_MODELS: Record<string, string> = {
  "Software / SaaS": "Product",
  "SaaS / Software product": "Product",
  "Product company": "Product",
  "Venture / PE fund": "Investment",
  "Investment firm": "Investment",
  "Operating + investment firm": "Investment",
  "Agency": "Services or Agency",
  "Consultancy": "Services or Agency",
  "Services / Consultancy": "Services or Agency",
  "Services or agency": "Services or Agency",
  "Services / Agency": "Services or Agency",
  "Advisory / Fundraising": "Services or Agency",
  "Other": "Product",
};

/** Canonical org types — Product / Services or Agency / Investment everywhere. */
export const ORGANIZATION_TYPES = [
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
] as const;

const BUSINESS_MODELS = ORGANIZATION_TYPES;

const BUSINESS_TYPE_ENTRY_OPTIONS: {
  type: OnboardingBusinessType;
  label: string;
  desc: string;
}[] = [
  { type: "product", label: "Product", desc: ORGANIZATION_TYPES[0].desc },
  { type: "service", label: "Service / Agency", desc: ORGANIZATION_TYPES[1].desc },
  { type: "investment", label: "Investment", desc: ORGANIZATION_TYPES[2].desc },
];

const ONBOARDING_BENCHMARK_FIELDS: {
  label: string;
  key: keyof OnboardingBenchmarkInput;
  ph: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  unit: "%" | "usd" | "" | "mo" | "x";
  lowerIsBetter?: boolean;
}[] = [
  { label: "ARR", key: "arr", ph: "e.g. $1,200,000", p25: 150_000, p50: 500_000, p75: 1_200_000, p90: 2_500_000, unit: "usd" },
  { label: "ARR growth (YoY)", key: "arrGrowth", ph: "e.g. 85%", p25: 18, p50: 42, p75: 80, p90: 140, unit: "%" },
  { label: "Net revenue retention", key: "nrr", ph: "e.g. 108%", p25: 88, p50: 104, p75: 118, p90: 130, unit: "%" },
  { label: "Gross margin", key: "grossMargin", ph: "e.g. 72%", p25: 48, p50: 62, p75: 74, p90: 82, unit: "%" },
  { label: "CAC payback", key: "cacPayback", ph: "e.g. 16 mo", p25: 10, p50: 16, p75: 26, p90: 42, unit: "mo", lowerIsBetter: true },
  { label: "Burn multiple", key: "burnMultiple", ph: "e.g. 2.1x", p25: 1.3, p50: 2.1, p75: 3.4, p90: 5.5, unit: "x", lowerIsBetter: true },
  { label: "Rule of 40", key: "ruleOf40", ph: "e.g. 28", p25: 15, p50: 28, p75: 40, p90: 55, unit: "%" },
  { label: "Logo retention", key: "logoRetention", ph: "e.g. 92%", p25: 72, p50: 84, p75: 91, p90: 96, unit: "%" },
  { label: "Monthly net burn", key: "monthlyBurn", ph: "e.g. $85,000", p25: 40000, p50: 85000, p75: 160000, p90: 280000, unit: "usd", lowerIsBetter: true },
  { label: "Cash on hand", key: "cashOnHand", ph: "e.g. $3,200,000", p25: 800000, p50: 2000000, p75: 4000000, p90: 8000000, unit: "usd" },
  { label: "Headcount (FTE)", key: "headcount", ph: "e.g. 18", p25: 8, p50: 15, p75: 28, p90: 50, unit: "" },
  { label: "Paying customers", key: "payingCustomers", ph: "e.g. 40", p25: 18, p50: 45, p75: 90, p90: 180, unit: "" },
];

export { ONBOARDING_BENCHMARK_FIELDS };

const STEP_META: Record<StepId, { label: string; sub: string }> = {
  profile:      { label: "Profile",       sub: "Review your details" },
  development:  { label: "R&D",           sub: "Product & engineering" },
  gtm:          { label: "GTM",           sub: "Sales & growth" },
  revops:       { label: "G&A",           sub: "Pipeline & financials" },
  investment:   { label: "Investment",    sub: "Fund thesis & deal flow" },
  hubspot:      { label: "Connect",       sub: "Load your deal pipeline" },
  benchmarking: { label: "Benchmarking",  sub: "How do you stack up?" },
  sources:      { label: "Sources",       sub: "Meetings & investor updates" },
};

/** Screenshot-aligned benchmark fields (step 5). */
const ONBOARDING_BENCHMARK_STEP_FIELDS = ONBOARDING_BENCHMARK_FIELDS.filter(m =>
  ["arrGrowth", "nrr", "grossMargin", "logoRetention", "monthlyBurn", "cashOnHand", "headcount", "payingCustomers"].includes(m.key),
);

export const ONBOARDING_UNKNOWN = "I don't know / NA";

const PIPELINE_TOOL_OPTIONS = ["CRM", "Spreadsheet", "Nothing yet", ONBOARDING_UNKNOWN] as const;
const SALES_PROCESS_OPTIONS = ["Documented", "Informal", "Not yet", ONBOARDING_UNKNOWN] as const;
const INVESTOR_INTRO_OPTIONS = ["Yes", "Not right now", "Actively fundraising", ONBOARDING_UNKNOWN] as const;

const BUILD_STAGE_OPTIONS = [
  "Pre-launch — still building",
  "Launched — early users or customers",
  "Scaling — product is proven, growing fast",
  ONBOARDING_UNKNOWN,
] as const;

const PRODUCT_CHALLENGE_OPTIONS = [
  "Speed of execution",
  "Quality and reliability",
  "Roadmap clarity",
  "Not enough engineers",
  ONBOARDING_UNKNOWN,
] as const;

const ROUND_TYPES = ["Pre-seed","Seed","Series A","Series B","Series C+","Bridge","Grant","Revenue-based"];

interface CompanyRecord {
  id: string;
  name: string;
  domain: string;
  whatTheyDo: string;
  businessModel: string;
  industry: string;
  founded: string;
  city: string;
  stateRegion: string;
  country: string;
  linkedin: string;
  funding: { type: string; amount: string }[];
}

const COMPANY_CATALOG: CompanyRecord[] = [
  {
    id: "patriot-pay", name: "Patriot Pay", domain: "patriotpay.com",
    whatTheyDo: "Patriot Pay is a B2B SaaS company building modern payment infrastructure for growing SMBs and mid-market operators.",
    businessModel: "Product", industry: "FinTech · Payments Infrastructure",
    founded: "2021", city: "Boston", stateRegion: "MA", country: "United States",
    linkedin: "https://linkedin.com/company/patriotpay",
    funding: [{ type: "Seed", amount: "$4.2M" }],
  },
  {
    id: "ramp", name: "Ramp", domain: "ramp.com",
    whatTheyDo: "Ramp is a finance automation platform helping businesses spend less and save more through corporate cards and expense management.",
    businessModel: "Product", industry: "FinTech · Spend Management",
    founded: "2019", city: "New York", stateRegion: "NY", country: "United States",
    linkedin: "https://linkedin.com/company/ramp",
    funding: [{ type: "Series D", amount: "$300M" }],
  },
  {
    id: "mercury", name: "Mercury", domain: "mercury.com",
    whatTheyDo: "Mercury provides banking for startups — accounts, cards, and treasury tools built for venture-backed companies.",
    businessModel: "Product", industry: "FinTech · Banking",
    founded: "2017", city: "San Francisco", stateRegion: "CA", country: "United States",
    linkedin: "https://linkedin.com/company/mercuryhq",
    funding: [{ type: "Series B", amount: "$120M" }],
  },
  {
    id: "deel", name: "Deel", domain: "deel.com",
    whatTheyDo: "Deel is a global HR platform for hiring, paying, and managing international teams and contractors.",
    businessModel: "Product", industry: "HR Tech · Global Payroll",
    founded: "2019", city: "San Francisco", stateRegion: "CA", country: "United States",
    linkedin: "https://linkedin.com/company/deel",
    funding: [{ type: "Series D", amount: "$50M" }],
  },
  {
    id: "vanta", name: "Vanta", domain: "vanta.com",
    whatTheyDo: "Vanta automates security and compliance monitoring for SOC 2, ISO 27001, HIPAA, and more.",
    businessModel: "Product", industry: "Security · Compliance",
    founded: "2018", city: "San Francisco", stateRegion: "CA", country: "United States",
    linkedin: "https://linkedin.com/company/vanta-security",
    funding: [{ type: "Series B", amount: "$150M" }],
  },
  {
    id: "nexus-ai", name: "Nexus AI", domain: "nexusai.io",
    whatTheyDo: "Nexus AI builds vertical AI agents for operations teams in regulated industries.",
    businessModel: "Product", industry: "AI · Enterprise Software",
    founded: "2022", city: "Boston", stateRegion: "MA", country: "United States",
    linkedin: "https://linkedin.com/company/nexusai",
    funding: [{ type: "Seed", amount: "$6.5M" }],
  },
  {
    id: "york-growth", name: "York IE", domain: "yorkiegrowth.io",
    whatTheyDo: "York IE is an operating and investment firm partnering with early-stage B2B software companies.",
    businessModel: "Investment", industry: "Venture · Value Creation",
    founded: "2015", city: "Manchester", stateRegion: "NH", country: "United States",
    linkedin: "https://linkedin.com/company/york-ie",
    funding: [{ type: "Series A", amount: "Undisclosed" }],
  },
  {
    id: "stripe", name: "Stripe", domain: "stripe.com",
    whatTheyDo: "Stripe builds economic infrastructure for the internet — payments, billing, and financial tools for businesses of all sizes.",
    businessModel: "Product", industry: "FinTech · Payments",
    founded: "2010", city: "San Francisco", stateRegion: "CA", country: "United States",
    linkedin: "https://linkedin.com/company/stripe",
    funding: [{ type: "Series I", amount: "$6.5B" }],
  },
];

function findCompanyByQuery(query: string): CompanyRecord | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return COMPANY_CATALOG.find(c => c.name.toLowerCase() === q)
    ?? COMPANY_CATALOG.find(c => c.name.toLowerCase().startsWith(q))
    ?? COMPANY_CATALOG.find(c => c.name.toLowerCase().includes(q))
    ?? null;
}

function filterCompanies(query: string): CompanyRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMPANY_CATALOG.slice(0, 6);
  return COMPANY_CATALOG.filter(c =>
    c.name.toLowerCase().includes(q)
    || c.industry.toLowerCase().includes(q)
    || c.domain.includes(q)
  ).slice(0, 6);
}

function CompanySearch({
  value, onChange, onSelect, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (c: CompanyRecord) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => filterCompanies(value), [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => { setHighlight(0); }, [value, suggestions.length]);

  function pick(c: CompanyRecord) {
    onChange(c.name);
    onSelect(c);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          className="of-input"
          value={value}
          disabled={disabled}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (!open || suggestions.length === 0) {
              if (e.key === "Enter") {
                const match = findCompanyByQuery(value);
                if (match) pick(match);
              }
              return;
            }
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
            if (e.key === "Enter") { e.preventDefault(); pick(suggestions[highlight]); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search companies…"
          style={{ ...inp, fontSize: 15, padding: "14px 44px 14px 16px", borderRadius: 10 }}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(true); }}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "#556878", fontSize: 18,
              cursor: "pointer", padding: 0, lineHeight: 1,
            }}
            aria-label="Clear"
          >×</button>
        )}
      </div>

      {open && !disabled && suggestions.length > 0 && (
        <div className="of-suggest-panel" style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 20,
          background: "var(--panel)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12, overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
        }}>
          <div style={{ padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#3A4F5E", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            Companies · Crunchbase
          </div>
          {suggestions.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className="of-suggest-item"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(c)}
              style={{
                width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                fontFamily: "inherit", padding: "12px 14px",
                background: i === highlight ? "rgba(61,214,140,0.08)" : "transparent",
                borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                display: "flex", alignItems: "center", gap: 12,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: "linear-gradient(135deg, #1E4D8C, #00B48A)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: "#fff",
              }}>{c.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#556878", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.industry} · {c.city}, {c.stateRegion}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "#3A4F5E", flexShrink: 0 }}>{c.domain}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

let _rid = 0;
const rid = () => `r${Date.now()}-${++_rid}`;

// ─── Styles ──────────────────────────────────────────────────────────────────

const css = `
  @keyframes ofFadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ofFadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes ofScaleIn  { from { opacity:0; transform:scale(0.88); } to { opacity:1; transform:scale(1); } }
  @keyframes ofSlideR   { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } }
  @keyframes ofSpin     { to { transform:rotate(360deg); } }
  @keyframes ofPulse    { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.5;transform:scale(0.94);} }
  @keyframes ofBarFill  { from { width:0; } to { width:var(--w,0%); } }
  @keyframes ofGlow     { 0%,100%{box-shadow:0 0 20px rgba(61,214,140,.15);} 50%{box-shadow:0 0 40px rgba(61,214,140,.4);} }
  @keyframes ofDraw     { from{stroke-dashoffset:600} to{stroke-dashoffset:0} }
  @keyframes ofCountUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ofOrbit    { from{transform:rotate(0deg) translateX(72px) rotate(0deg)} to{transform:rotate(360deg) translateX(72px) rotate(-360deg)} }
  @keyframes ofShimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes ofWave     { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }
  @keyframes ofParticle { 0%{opacity:0;transform:translateY(-10px)} 30%{opacity:1} 100%{opacity:0;transform:translateY(100px)} }

  @keyframes ofHubspotLoad { from { width: 0; } to { width: 100%; } }

  .of-step  { animation: ofFadeUp 0.3s ease both; }
  .of-spin  { animation: ofSpin 0.9s linear infinite; }
  .of-pulse { animation: ofPulse 2s ease infinite; }
  .of-glow  { animation: ofGlow 2.5s ease infinite; }

  .of-input {
    width: 100%;
    box-sizing: border-box;
    background: #1A2D3F;
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: var(--text-1);
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  .of-input:focus { border-color: rgba(61,214,140,0.4) !important; outline: none; }

  .of-chip { transition: all 0.15s; }
  .of-chip:hover { border-color: var(--border-strong) !important; color: var(--text-1) !important; }

  /* Selection fields — onboarding track steps (sc-drawer-* + local polish) */
  .of-track-step {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .of-step-heading {
    border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    margin-bottom: 28px;
    padding-bottom: 20px;
  }
  .of-step-heading h2 {
    color: var(--text-1);
    font-size: clamp(30px, 3.1vw, 38px);
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1.1;
    margin: 0 0 8px;
  }
  .of-step-heading p {
    color: var(--text-2);
    font-size: 15px;
    line-height: 1.5;
    margin: 0;
  }
  html[data-theme="light"] .of-step-heading {
    border-bottom-color: #e8eaed;
  }

  .of-form-col .sc-drawer-q,
  .of-form-col .of-track-q {
    margin-bottom: 28px;
  }
  .of-form-col .sc-drawer-q:last-child,
  .of-form-col .of-track-q:last-child {
    margin-bottom: 0;
  }
  .of-form-col .sc-drawer-opts-fieldset .sc-drawer-opts,
  .of-form-col .sc-drawer-opts-fieldset .sc-drawer-org-cards {
    margin-top: 0;
  }
  .of-form-col .of-track-q-label {
    color: var(--text-1);
    display: block;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.45;
    margin: 0 0 12px;
  }
  .of-form-col .sc-drawer-q-sub {
    color: var(--text-3, #556878);
    font-size: 13px;
    line-height: 1.5;
    margin: -4px 0 12px;
  }
  .of-form-col .sc-drawer-opts {
    gap: 10px;
  }
  .of-form-col .sc-drawer-opt {
    align-items: center;
    background: var(--surface-2, #1a2d3f);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
    border-radius: 10px;
    box-sizing: border-box;
    color: var(--text-2);
    display: inline-flex;
    font-size: 13px;
    font-weight: 500;
    justify-content: center;
    line-height: 1.4;
    min-height: 44px;
    padding: 11px 14px;
    text-align: center;
    transition: background 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease, color 0.14s ease;
    width: 100%;
  }
  .of-form-col .sc-drawer-opts--stack .sc-drawer-opt {
    justify-content: flex-start;
    text-align: left;
  }
  .of-form-col .sc-drawer-opt:hover {
    border-color: var(--border-strong, rgba(255, 255, 255, 0.22));
    color: var(--text-1);
  }
  .of-form-col .sc-drawer-opt:focus-visible {
    outline: 2px solid var(--fuel-accent, var(--btn-primary-bg));
    outline-offset: 2px;
  }
  .of-form-col .sc-drawer-opt.is-selected {
    background: var(--status-good-dim, rgba(18, 184, 134, 0.1));
    border-color: var(--status-good-line, var(--fuel-accent));
    box-shadow: 0 0 0 1px rgba(18, 184, 134, 0.14);
    color: var(--text-1);
    font-weight: 600;
  }
  .of-form-col .of-opt-unknown {
    border-style: dashed;
    color: var(--text-3, #556878);
    font-size: 12.5px;
    grid-column: 1 / -1;
    margin-top: 2px;
    min-height: 40px;
  }
  .of-form-col .sc-drawer-org-cards .of-opt-unknown {
    grid-column: auto;
    margin-top: 4px;
    text-align: center;
    width: 100%;
  }
  .of-form-col .sc-drawer-opt:disabled {
    cursor: default;
    opacity: 0.35;
  }
  html[data-theme="light"] .of-form-col .sc-drawer-opt {
    background: #ffffff;
    border-color: #e8eaed;
    color: #3d4f5f;
  }
  html[data-theme="light"] .of-form-col .sc-drawer-opt:hover {
    background: #f7f8fa;
    border-color: #d5d9de;
    color: #1a2332;
  }
  html[data-theme="light"] .of-form-col .sc-drawer-opt.is-selected {
    background: rgba(18, 184, 134, 0.08);
    border-color: var(--fuel-accent);
    box-shadow: 0 0 0 1px rgba(18, 184, 134, 0.12);
    color: #1a2332;
  }
  html[data-theme="light"] .of-form-col .of-opt-unknown {
    background: #f7f8fa;
    border-color: #d5d9de;
  }
  .of-form-col .sc-drawer-opts:not(.sc-drawer-opts--stack) .sc-drawer-opt {
    justify-content: flex-start;
    text-align: left;
  }
  .of-form-col .sc-drawer-org-cards {
    gap: 10px;
  }
  .of-form-col .sc-drawer-org-card {
    border-radius: 10px;
    padding: 13px 14px;
  }
  .sr-only {
    border: 0;
    clip: rect(0, 0, 0, 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  .of-figma-q-title { font-size: clamp(26px, 2.8vw, 36px); font-weight: 800; color: var(--text-1); margin: 0; letter-spacing: -0.5px; line-height: 1.12; }
  .of-figma-q-grouped { font-size: clamp(15px, 2vw, 16px); font-weight: 500; color: var(--text-2); margin: 0; line-height: 1.5; }
  .of-figma-q-sub { font-size: clamp(13px, 1.8vw, 15px); color: #556878; margin: 12px 0 0; line-height: 1.55; }

  .of-add-round:hover { border-color: var(--border-strong) !important; color: var(--text-2) !important; }

  .of-back:hover { color: var(--text-2) !important; }

  .of-suggest-item:hover { background: rgba(61,214,140,0.08) !important; }

  .of-left-col {
    width: 50%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .of-form-col {
    width: 100%;
    max-width: 520px;
    padding: 32px 72px 96px;
    box-sizing: border-box;
  }
  .of-form-col--centered { padding: 32px 72px 96px; }

  .of-motion-scale-inner {
    --of-motion-scale: 1;
    --of-motion-card-max: clamp(360px, 88%, 440px);
    --of-motion-pad-x: clamp(24px, 2.5vw, 32px);
    --of-motion-glow: clamp(480px, 42vw, 560px);
    --of-motion-root: clamp(13.5px, 0.38vw + 11.8px, 14.75px);
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: scale(var(--of-motion-scale));
    transform-origin: center center;
    font-size: var(--of-motion-root);
  }

  .of-field-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 7px;
  }
  .of-field-hint { font-size: 11px; color: #3A4F5E; margin-top: 5px; }
  .of-figma-hint {
    margin-top: 18px;
    padding: 12px 16px;
    background: rgba(61,214,140,0.04);
    border: 1px solid rgba(61,214,140,0.12);
    border-radius: 10px;
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.65;
    font-style: italic;
  }

  /* Identity step — align with onboarding form rhythm (8px scale) */
  .of-identity {
    display: flex;
    flex-direction: column;
  }
  .of-identity-step-pill {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 8px;
    background: rgba(61,214,140,0.1);
    border: 1px solid rgba(61,214,140,0.22);
    border-radius: 999px;
    padding: 6px 12px;
    margin-bottom: 20px;
  }
  .of-identity-step-pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--btn-primary-bg);
    flex-shrink: 0;
  }
  .of-identity-step-pill-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--btn-primary-bg);
    letter-spacing: 0.02em;
  }
  .of-identity .of-figma-q-title { margin-bottom: 12px; }
  .of-identity .of-figma-q-sub { margin: 0 0 24px; }
  .of-identity-role {
    margin-bottom: 20px;
  }
  .of-identity-role-trigger {
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .of-identity-role-trigger.is-placeholder { color: #556878; }
  .of-identity-role-chevron { color: #556878; flex-shrink: 0; }
  .of-identity-role-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 30;
    background: var(--panel, #1A2D3F);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    overflow: hidden;
    max-height: 260px;
    overflow-y: auto;
    box-shadow: 0 16px 48px rgba(0,0,0,0.35);
  }
  .of-identity-role-option {
    width: 100%;
    text-align: left;
    border: none;
    cursor: pointer;
    font-family: inherit;
    padding: 12px 14px;
    background: transparent;
    color: var(--text-1);
    font-size: 14px;
    font-weight: 500;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .of-identity-role-option.is-selected {
    background: rgba(61,214,140,0.1);
    font-weight: 700;
  }
  .of-identity-role-option:hover {
    background: rgba(61,214,140,0.08);
  }
  .of-identity-role-option:focus-visible {
    outline: 2px solid var(--btn-primary-bg);
    outline-offset: -2px;
  }
  .of-identity-error {
    color: #E05C5C;
    font-size: 12px;
    margin: 8px 0 0;
    line-height: 1.35;
  }
  .of-identity-note {
    margin-top: 8px;
    padding: 14px 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.55;
  }

  .of-shell {
    width: 100vw;
    height: 100vh;
    background: #0C1A25;
    display: flex;
    font-family: var(--font-family);
    color: var(--text-1);
  }
  html[data-theme="light"] .of-shell {
    background: #F7F8FA;
  }
  .of-brand-bar {
    position: relative;
    z-index: 10;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 48px 16px;
    background: #0C1A25;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  html[data-theme="light"] .of-brand-bar {
    background: #F7F8FA;
    border-bottom-color: #e8eaed;
  }
  .of-brand-actions {
    align-items: center;
    display: flex;
    flex-shrink: 0;
    gap: 14px;
  }
  .of-left-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .of-left-scroll--centered {
    align-items: center;
  }
  .of-brand-mark {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .of-brand-logo {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 900;
    color: #0a1a12;
  }
  .of-brand-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-1);
    letter-spacing: -0.2px;
  }
  .of-brand-sub {
    font-size: 11px;
    color: #2A3D4E;
  }
  html[data-theme="light"] .of-brand-sub { color: #7a8b9a; }
  .of-theme-toggle {
    align-items: center;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    color: var(--text-2);
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    font-size: 12px;
    font-weight: 650;
    gap: 8px;
    padding: 8px 12px;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .of-theme-toggle--icon {
    border-radius: 8px;
    justify-content: center;
    padding: 8px;
    width: 34px;
    height: 34px;
  }
  .of-theme-toggle:hover {
    background: rgba(61,214,140,0.1);
    border-color: rgba(61,214,140,0.28);
    color: var(--text-1);
  }
  .of-theme-toggle:focus-visible {
    outline: 2px solid var(--btn-primary-bg);
    outline-offset: 2px;
  }
  html[data-theme="light"] .of-theme-toggle {
    background: #ffffff;
    border-color: #d5d9de;
    color: #5b6b7c;
    box-shadow: 0 1px 2px rgba(26,35,50,0.04);
  }
  html[data-theme="light"] .of-theme-toggle:hover {
    border-color: rgba(18, 184, 134, 0.4);
    color: #1a2332;
  }
  .of-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 56px;
    padding: 12px 48px 16px;
    border-top: 1px solid rgba(255,255,255,0.06);
    background: #0C1A25;
  }
  html[data-theme="light"] .of-footer {
    background: #F7F8FA;
    border-top-color: #e8eaed;
  }
  .of-footer-left,
  .of-footer-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .of-progress-track {
    width: 160px;
    height: 3px;
    background: rgba(255,255,255,0.07);
    border-radius: 2px;
    overflow: hidden;
  }
  html[data-theme="light"] .of-progress-track { background: #e8eaed; }
  .of-progress-fill {
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(90deg, rgb(0,180,138), rgb(61,214,140));
    transition: width 0.4s ease;
  }
  .of-progress-label {
    font-size: 11px;
    color: #556878;
  }
  html[data-theme="light"] .of-progress-label { color: #7a8b9a; }
  .of-skip-link {
    background: var(--btn-secondary-bg, transparent);
    border: 1px solid var(--btn-secondary-border, rgba(255, 255, 255, 0.14));
    border-radius: 8px;
    color: var(--btn-secondary-text, var(--text-2));
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: 650;
    line-height: 1;
    padding: 8px 12px;
    text-decoration: none;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    white-space: nowrap;
  }
  .of-skip-link:hover {
    background: var(--btn-secondary-hover-bg, rgba(255, 255, 255, 0.06));
    color: var(--text-1);
  }
  .of-skip-link:focus-visible {
    outline: 2px solid var(--fuel-accent, var(--btn-primary-bg));
    outline-offset: 2px;
  }
  .of-step-dots {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-right: 4px;
  }
  .of-step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    transition: background 0.2s ease, transform 0.2s ease;
  }
  html[data-theme="light"] .of-step-dot { background: #d5d9de; }
  .of-step-dot--active {
    background: var(--btn-primary-bg);
    transform: scale(1.15);
  }
  .of-step-dot--done { background: rgba(61,214,140,0.45); }
  /* Next / Enter — solid Fuel mint (no gradient) */
  .of-cta-primary {
    background: var(--fuel-accent);
    border: 1px solid var(--fuel-accent);
    border-radius: 10px;
    color: #ffffff;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.1px;
    padding: 11px 24px;
    box-shadow: none;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .of-cta-primary:hover:not(:disabled) {
    background: var(--btn-primary-hover);
    border-color: var(--btn-primary-hover);
    box-shadow: none;
    filter: none;
  }
  .of-cta-primary:disabled {
    background: #1F3140;
    border-color: transparent;
    box-shadow: none;
    color: #556878;
    cursor: default;
    filter: none;
    opacity: 1;
  }
  html[data-theme="light"] .of-cta-primary:disabled {
    background: #e8eaed;
    border-color: #e8eaed;
    color: #9aa8b5;
  }
  .of-cta-tertiary {
    background: transparent;
    border: none;
    color: var(--text-2);
    cursor: pointer;
    font-family: inherit;
    font-size: 18px;
    line-height: 1;
    padding: 6px 8px;
    margin: 0;
  }
  .of-cta-tertiary:hover { color: var(--text-1); }
  .of-cta-tertiary:focus-visible {
    outline: 2px solid var(--btn-primary-bg);
    outline-offset: 2px;
  }
  html[data-theme="light"] .of-identity-note {
    background: #ffffff;
    border-color: #e8eaed;
  }
  html[data-theme="light"] .of-input {
    background: #ffffff;
    border-color: #d5d9de;
    color: #1a2332;
  }

  .of-profile-review { display: flex; flex-direction: column; }
  .of-profile-ready-pill {
    align-items: center; align-self: flex-start; background: rgba(61,214,140,0.1);
    border: 1px solid rgba(61,214,140,0.22); border-radius: 999px; color: var(--btn-primary-bg);
    display: inline-flex; font-size: 11px; font-weight: 700; gap: 8px; letter-spacing: 0.04em;
    margin-bottom: 18px; padding: 6px 12px; text-transform: uppercase;
  }
  .of-profile-ready-pill-dot { background: var(--btn-primary-bg); border-radius: 999px; height: 6px; width: 6px; }
  .of-profile-review-title {
    color: var(--text-1); font-size: clamp(24px, 2.4vw, 30px); font-weight: 800;
    letter-spacing: -0.02em; line-height: 1.15; margin: 0 0 10px;
  }
  .of-profile-review-title em { color: var(--fuel-accent, var(--btn-primary-bg)); font-style: normal; }
  .of-profile-review-sub { color: var(--text-2); font-size: 13px; line-height: 1.55; margin: 0 0 22px; }
  .of-profile-fields { display: flex; flex-direction: column; gap: 2px; }
  .of-field-grid-2 { display: grid; gap: 0 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .of-source-pill {
    color: var(--text-3); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10px; font-weight: 700; margin-top: 6px;
  }
  .of-funding-head { align-items: center; display: flex; justify-content: space-between; margin-bottom: 8px; }
  .of-funding-add {
    background: rgba(61,214,140,0.08); border: 1px solid rgba(61,214,140,0.2); border-radius: 6px;
    color: var(--fuel-accent, var(--btn-primary-bg)); cursor: pointer; font: inherit; font-size: 10.5px;
    font-weight: 700; padding: 4px 9px;
  }
  .of-funding-row {
    align-items: center; background: var(--panel); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px; display: grid; gap: 6px;
    grid-template-columns: minmax(72px, 96px) minmax(70px, 86px) minmax(90px, 128px) minmax(0, 1fr) 26px;
    margin-bottom: 6px; padding: 7px;
  }
  .of-funding-row .of-input {
    font-size: 11px; min-height: 34px; min-width: 0; padding: 6px 7px; width: 100%;
  }
  .of-funding-row select.of-input {
    color: var(--text-1); cursor: pointer;
  }
  .of-funding-row select.of-input option {
    background: #1A2D3F; color: var(--text-1);
  }
  .of-funding-remove {
    align-items: center; background: rgba(201,95,95,0.1); border: 1px solid rgba(201,95,95,0.2);
    border-radius: 5px; color: #C95F5F; cursor: pointer; display: inline-flex; font: inherit;
    font-size: 14px; height: 26px; justify-content: center; padding: 0; width: 26px;
  }
  .of-teammates-note { color: var(--text-3); font-size: 12px; line-height: 1.55; margin: 18px 0 0; }
  .of-profile-error { color: var(--status-bad, #E05C5C); font-size: 12px; margin: 8px 0 0; }
  html[data-theme="light"] .of-funding-row { background: #fff; border-color: #e8eaed; }
  html[data-theme="light"] .of-funding-row select.of-input option { background: #fff; color: #1a2332; }

  @media (min-width: 1280px) {
    .of-left-col { width: 48%; }
    .of-form-col { max-width: 560px; padding: 28px 80px 96px; }
    .of-form-col--centered { padding: 28px 80px 96px; }
    .of-figma-q-title { font-size: clamp(28px, 2.9vw, 38px); }
    .of-figma-q-grouped { font-size: 16px; }
    .of-figma-q-sub { font-size: 15px; }
    .of-step-heading h2 { font-size: clamp(30px, 3.1vw, 38px); }
    .of-step-heading p { font-size: 15px; }
    .of-field-label { font-size: 11px; margin-bottom: 8px; }
    .of-field-hint { font-size: 11px; }
    .of-input { font-size: 14px; padding: 11px 15px; border-radius: 9px; }
    .of-figma-hint { font-size: 13px; padding: 12px 16px; }
    .of-motion-scale-inner {
      --of-motion-scale: 1.08;
      --of-motion-card-max: clamp(420px, 38vw, 480px);
      --of-motion-pad-x: clamp(28px, 2.4vw, 34px);
      --of-motion-glow: clamp(540px, 40vw, 600px);
      --of-motion-root: clamp(14px, 0.34vw + 12px, 15.25px);
    }
  }

  @media (min-width: 1440px) {
    .of-left-col { width: 47%; }
    .of-form-col { max-width: 600px; padding: 28px 84px 96px; }
    .of-form-col--centered { padding: 28px 84px 96px; }
    .of-step-heading { margin-bottom: 40px !important; }
    .of-figma-q-title { font-size: clamp(29px, 3vw, 40px); }
    .of-figma-q-grouped { font-size: 16px; }
    .of-figma-q-sub { font-size: 15px; }
    .of-step-heading h2 { font-size: clamp(31px, 3.2vw, 40px); }
    .of-step-heading p { font-size: 15px; }
    .of-field-label { font-size: 11px; letter-spacing: 0.5px; }
    .of-input { font-size: 14px; padding: 11px 16px; border-radius: 9px; }
    .of-figma-hint { font-size: 13px; padding: 12px 16px; }
    .of-motion-scale-inner {
      --of-motion-scale: 1.12;
      --of-motion-card-max: clamp(440px, 36vw, 500px);
      --of-motion-pad-x: clamp(30px, 2.2vw, 36px);
      --of-motion-glow: clamp(580px, 38vw, 640px);
      --of-motion-root: clamp(14.25px, 0.3vw + 12.2px, 15.75px);
    }
  }

  @media (min-width: 1600px) {
    .of-form-col { max-width: 620px; padding: 100px 88px 80px; }
    .of-form-col--centered { padding: 52px 88px 80px; }
    .of-figma-q-title { font-size: clamp(30px, 3.1vw, 42px); }
    .of-figma-q-grouped { font-size: 17px; }
    .of-figma-q-sub { font-size: 15px; }
    .of-step-heading h2 { font-size: clamp(32px, 3.3vw, 42px); }
    .of-step-heading p { font-size: 15px; }
    .of-input { font-size: 15px; padding: 12px 16px; }
    .of-figma-hint { font-size: 13px; padding: 12px 16px; }
    .of-motion-scale-inner {
      --of-motion-scale: 1.16;
      --of-motion-card-max: clamp(460px, 34vw, 520px);
      --of-motion-pad-x: clamp(32px, 2vw, 38px);
      --of-motion-glow: clamp(620px, 36vw, 680px);
      --of-motion-root: clamp(14.5px, 0.27vw + 12.5px, 16.25px);
    }
  }

  @media (min-width: 1920px) {
    .of-form-col { max-width: 640px; padding: 104px 92px 80px; }
    .of-motion-scale-inner {
      --of-motion-scale: 1.2;
      --of-motion-card-max: clamp(480px, 32vw, 540px);
      --of-motion-pad-x: clamp(34px, 1.8vw, 40px);
      --of-motion-glow: clamp(660px, 34vw, 720px);
      --of-motion-root: clamp(14.75px, 0.24vw + 12.8px, 16.75px);
    }
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }
`;

// ─── Left-panel field helpers ────────────────────────────────────────────────

const inp: React.CSSProperties = {
  /* base styles in .of-input CSS — keep only overrides here if needed */
};

function Field({ label, required, hint, children }: {
  label:string; required?:boolean; hint?:string; children:React.ReactNode;
}) {
  return (
    <div style={{ marginBottom:20 }}>
      <label className="of-field-label">
        {label}{required && <span style={{ color:"#E56B6B", marginLeft:3 }}>*</span>}
      </label>
      {children}
      {hint && <div className="of-field-hint">• {hint}</div>}
    </div>
  );
}

function isLongOptionList(options: string[]): boolean {
  return options.length > 4 || options.some(opt => opt.length > 30);
}

function FigmaQuestion({
  title, subtitle, options, value, onChange, hint, columns, grouped = false, unknownOption = false,
}: {
  title: string; subtitle?: string; options: string[]; value: string;
  onChange: (v: string) => void; hint?: string; columns?: number; grouped?: boolean;
  unknownOption?: boolean;
}) {
  const promptId = React.useId();
  const displayOptions = unknownOption && !options.includes(ONBOARDING_UNKNOWN)
    ? [...options, ONBOARDING_UNKNOWN]
    : options;
  const useStack = columns === 1 || isLongOptionList(displayOptions);

  return (
    <div className={`sc-drawer-q${grouped ? " of-track-q" : ""}`}>
      {grouped ? (
        <p className="of-track-q-label" id={promptId}>{title}</p>
      ) : (
        <>
          <h2 className="of-figma-q-title">{title}</h2>
          {subtitle ? <p className="of-figma-q-sub">{subtitle}</p> : null}
        </>
      )}
      <fieldset className={`sc-drawer-opts-fieldset${useStack ? " sc-drawer-opts-fieldset--stack" : ""}`}>
        <legend className="sr-only">{title}</legend>
        <div
          className={`sc-drawer-opts${useStack ? " sc-drawer-opts--stack" : ""}`}
          role="radiogroup"
          aria-labelledby={grouped ? promptId : undefined}
          aria-label={grouped ? undefined : title}
        >
          {displayOptions.map(opt => {
            const on = value === opt;
            const isUnknown = opt === ONBOARDING_UNKNOWN;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={on}
                className={`sc-drawer-opt${on ? " is-selected" : ""}${isUnknown ? " of-opt-unknown" : ""}`}
                onClick={() => onChange(isUnknown ? ONBOARDING_UNKNOWN : opt)}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </fieldset>
      {hint && value ? (
        <div className="of-figma-hint">{hint}</div>
      ) : null}
    </div>
  );
}

function FigmaDescMultiSelect({
  title, subtitle, options, selected, onToggle, hint, grouped = false,
}: {
  title: string; subtitle?: string;
  options: readonly { label: string; desc: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  hint?: string; grouped?: boolean;
}) {
  const promptId = React.useId();
  return (
    <div className={`sc-drawer-q${grouped ? " of-track-q" : ""}`}>
      {grouped ? (
        <p className="of-track-q-label" id={promptId}>{title}</p>
      ) : (
        <>
          <h2 className="of-figma-q-title">{title}</h2>
          {subtitle ? <p className="sc-drawer-q-sub">{subtitle}</p> : null}
        </>
      )}
      <fieldset className="sc-drawer-opts-fieldset sc-drawer-opts-fieldset--cards">
        <legend className="sr-only">{title}</legend>
        <div className="sc-drawer-org-cards" role="group" aria-label={title}>
          {options.map(opt => {
            const on = selected.includes(opt.label);
            return (
              <button
                key={opt.label}
                type="button"
                aria-pressed={on}
                className={`sc-drawer-org-card${on ? " is-selected" : ""}`}
                onClick={() => onToggle(opt.label)}
              >
                <span className="sc-drawer-org-radio" aria-hidden="true">
                  {on ? <span className="sc-drawer-org-radio-dot" /> : null}
                </span>
                <span className="sc-drawer-org-copy">
                  <strong>{opt.label}</strong>
                  <small>{opt.desc}</small>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {selected.length > 0 ? (
        <p className="sc-drawer-q-sub" style={{ marginTop: 14 }}>
          {selected.length} region{selected.length === 1 ? "" : "s"} selected
        </p>
      ) : null}
      {hint ? <p className="sc-drawer-q-sub" style={{ marginTop: 12 }}>{hint}</p> : null}
    </div>
  );
}

function FigmaDescQuestion({
  title, subtitle, options, value, onChange, hint, grouped = false, unknownOption = false,
}: {
  title: string; subtitle?: string;
  options: readonly { label: string; desc: string }[];
  value: string; onChange: (v: string) => void;
  hint?: string; grouped?: boolean; unknownOption?: boolean;
}) {
  const promptId = React.useId();
  return (
    <div className={`sc-drawer-q${grouped ? " of-track-q" : ""}`}>
      {grouped ? (
        <p className="of-track-q-label" id={promptId}>{title}</p>
      ) : (
        <>
          <h2 className="of-figma-q-title">{title}</h2>
          {subtitle ? <p className="sc-drawer-q-sub">{subtitle}</p> : null}
        </>
      )}
      <fieldset className="sc-drawer-opts-fieldset sc-drawer-opts-fieldset--cards">
        <legend className="sr-only">{title}</legend>
        <div
          className="sc-drawer-org-cards"
          role="radiogroup"
          aria-labelledby={grouped ? promptId : undefined}
          aria-label={grouped ? undefined : title}
        >
          {options.map(opt => {
            const on = value === opt.label;
            return (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={on}
                className={`sc-drawer-org-card${on ? " is-selected" : ""}`}
                onClick={() => onChange(opt.label)}
              >
                <span className="sc-drawer-org-radio" aria-hidden="true">
                  {on ? <span className="sc-drawer-org-radio-dot" /> : null}
                </span>
                <span className="sc-drawer-org-copy">
                  <strong>{opt.label}</strong>
                  <small>{opt.desc}</small>
                </span>
              </button>
            );
          })}
          {unknownOption ? (
            <button
              type="button"
              className={`sc-drawer-opt of-opt-unknown${value === ONBOARDING_UNKNOWN ? " is-selected" : ""}`}
              onClick={() => onChange(ONBOARDING_UNKNOWN)}
            >
              {ONBOARDING_UNKNOWN}
            </button>
          ) : null}
        </div>
      </fieldset>
      {hint ? <p className="sc-drawer-q-sub" style={{ marginTop: 12 }}>{hint}</p> : null}
    </div>
  );
}

function FigmaMultiSelect({
  title, subtitle, options, selected, onToggle, max,
}: {
  title: string; subtitle?: string; options: string[]; selected: string[];
  onToggle: (v: string) => void; max?: number;
}) {
  const atMax = max !== undefined && selected.length >= max;
  const useStack = options.length <= 3;

  return (
    <div className="sc-drawer-q">
      <h2 className="of-figma-q-title">{title}</h2>
      {subtitle ? <p className="sc-drawer-q-sub">{subtitle}</p> : null}
      <fieldset className={`sc-drawer-opts-fieldset${useStack ? " sc-drawer-opts-fieldset--stack" : ""}`}>
        <legend className="sr-only">{title}</legend>
        <div className={`sc-drawer-opts${useStack ? " sc-drawer-opts--stack" : ""}`} role="group" aria-label={title}>
          {options.map(opt => {
            const on = selected.includes(opt);
            const disabled = !on && atMax;
            return (
              <button
                key={opt}
                type="button"
                className={`sc-drawer-opt${on ? " is-selected" : ""}`}
                aria-pressed={on}
                onClick={() => onToggle(opt)}
                disabled={disabled}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </fieldset>
      {selected.length > 0 && max !== undefined ? (
        <p className="sc-drawer-q-sub" style={{ marginTop: 14 }}>{selected.length} of {max} selected</p>
      ) : null}
    </div>
  );
}

// ─── Benchmark helpers ───────────────────────────────────────────────────────
function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function formatBenchmarkP(v: number, unit: string): string {
  if (unit === "%") return `${v}%`;
  if (unit === "usd") return formatUsd(v);
  if (unit === "mo") return `${v} mo`;
  if (unit === "x") return `${v}x`;
  return String(v);
}

function parseVal(s: string): number | null {
  if (!s.trim()) return null;
  const c = s.replace(/[$,\s]/g, "").replace(/mo(nths?)?$/i, "").replace(/x$/i, "");
  const m = c.match(/^([\d.]+)\s*M$/i);  if (m) return parseFloat(m[1]) * 1_000_000;
  const k = c.match(/^([\d.]+)\s*K$/i);  if (k) return parseFloat(k[1]) * 1_000;
  const p = c.match(/^([\d.]+)\s*%?$/);  if (p) return parseFloat(p[1]);
  return null;
}

function dotColor(val: number, p25: number, p50: number, p75: number, lowerIsBetter = false): string {
  if (lowerIsBetter) {
    if (val > p75) return "#E56B6B";
    if (val > p50) return "#D4924A";
    return "var(--btn-primary-bg)";
  }
  if (val < p25) return "#E56B6B";
  if (val < p50) return "#D4924A";
  return "var(--btn-primary-bg)";
}

function dotGlow(val: number, p25: number, p50: number, p75: number, lowerIsBetter = false): string {
  if (lowerIsBetter) {
    if (val > p75) return "0 0 10px rgba(229,107,107,0.7)";
    if (val > p50) return "0 0 10px rgba(212,146,74,0.6)";
    if (val <= p25) return "0 0 14px rgba(61,214,140,0.8)";
    return "0 0 10px rgba(61,214,140,0.55)";
  }
  if (val < p25) return "0 0 10px rgba(229,107,107,0.7)";
  if (val < p50) return "0 0 10px rgba(212,146,74,0.6)";
  if (val >= p75) return "0 0 14px rgba(61,214,140,0.8)";
  return "0 0 10px rgba(61,214,140,0.55)";
}

export function OnboardingBenchmarkFieldList({
  values,
  onChange,
  inputClassName = "of-input",
  fields = ONBOARDING_BENCHMARK_FIELDS,
}: {
  values: Partial<Record<keyof OnboardingBenchmarkInput, string>>;
  onChange: (key: keyof OnboardingBenchmarkInput, value: string) => void;
  inputClassName?: string;
  fields?: typeof ONBOARDING_BENCHMARK_FIELDS;
}) {
  return (
    <>
      {fields.map(m => {
        const raw = values[m.key] ?? "";
        const val = parseVal(raw);
        const hasVal = val !== null;
        const lowerIsBetter = m.lowerIsBetter === true;
        const displayMax = m.p90 * 1.3;
        const p25pct = (m.p25 / displayMax) * 100;
        const p75pct = (m.p75 / displayMax) * 100;
        const dotPct = hasVal ? Math.min(Math.max((val! / displayMax) * 100, 1), 99) : null;
        const dc = hasVal ? dotColor(val!, m.p25, m.p50, m.p75, lowerIsBetter) : "#3A4F5E";
        return (
          <div key={m.key} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</label>
            </div>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className={inputClassName}
              value={raw}
              onChange={e => onChange(m.key, sanitizeBenchmarkNumericInput(e.target.value))}
              placeholder={m.ph}
              style={{ ...inp, padding: "8px 12px", fontSize: 13, marginBottom: 7, borderColor: hasVal ? `${dc}55` : undefined, transition: "border-color 0.3s" }}
            />
            <div style={{ position: "relative", height: 7, background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>
              <div style={{ position: "absolute", left: `${p25pct}%`, top: 0, width: `${p75pct - p25pct}%`, height: "100%", background: "var(--status-good, var(--fuel-accent))", borderRadius: 2 }} />
              <div style={{ position: "absolute", left: `${p25pct}%`, top: 0, width: 1, height: "100%", background: "var(--status-good, var(--fuel-accent))" }} />
              <div style={{ position: "absolute", left: `${p75pct}%`, top: 0, width: 1, height: "100%", background: "var(--status-good, var(--fuel-accent))" }} />
              {dotPct !== null ? (
                <div style={{
                  position: "absolute", top: -5, zIndex: 2,
                  left: `calc(${dotPct}% - 8px)`,
                  width: 17, height: 17, borderRadius: "50%",
                  background: dc,
                  boxShadow: dotGlow(val!, m.p25, m.p50, m.p75, lowerIsBetter),
                  transition: "left 0.5s cubic-bezier(0.34,1.56,0.64,1), background 0.3s, box-shadow 0.3s",
                }} />
              ) : null}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              {[{ l: "P25", v: m.p25 }, { l: "P75", v: m.p75 }, { l: "P90", v: m.p90 }].map(p => (
                <span key={p.l} style={{ fontSize: 9, color: "#3A4F5E" }}>{p.l} {formatBenchmarkP(p.v, m.unit)}</span>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

const SUB_Q_COUNT: Partial<Record<StepId, number>> = {
  investment: 5,
};

function StepHeading({ meta }: { meta: { label: string; sub: string } }) {
  return (
    <div className="of-step-heading">
      <h2>{meta.label}</h2>
      <p>{meta.sub}</p>
    </div>
  );
}

function normalizeBusinessModel(label: string): string {
  return LEGACY_BUSINESS_MODELS[label] ?? label;
}

export type OnboardingFlowAnswers = Answers;

export function hasCompletedOnboardingTracks(answers: OnboardingFlowAnswers | null | undefined): boolean {
  if (!answers) return false;
  if (answers.profileSetupComplete) return true;
  if (INVESTOR_MODELS.includes(answers.profileBusinessModel ?? "")) {
    return Boolean(answers.investCheckSize && answers.investGeography?.length);
  }
  return ONBOARDING_TRACK_FIELDS.every(key => Boolean(answers[key]?.trim()));
}

export function answersToOnboardingBenchmark(answers: Answers): OnboardingBenchmarkInput {
  return {
    arr: answers.arr,
    arrGrowth: answers.arrGrowth,
    nrr: answers.nrr,
    logoRetention: answers.logoRetention,
    monthlyBurn: answers.monthlyBurn,
    cashOnHand: answers.cashOnHand,
    grossMargin: answers.grossMargin,
    cacPayback: answers.cacPayback,
    burnMultiple: answers.burnMultiple,
    ruleOf40: answers.ruleOf40,
    headcount: answers.headcount,
    payingCustomers: answers.payingCustomers,
  };
}

/** Maps onboarding qual questions into View-details drawer IDs. */
export function mapOnboardingToDetailAnswers(answers: Answers): Record<string, string> {
  const track: Partial<OnboardingTrackAnswers> = {};
  ONBOARDING_TRACK_FIELDS.forEach(key => {
    const raw = answers[key] ?? "";
    track[key] = raw === ONBOARDING_UNKNOWN ? "" : raw;
  });
  return mapTrackOnboardingToDetailAnswers(track, {
    company: answers.profileCompany,
    productDescription: answers.profileProductDescription,
    organizationType: answers.profileBusinessModel,
    industry: answers.profileIndustry,
    founded: answers.profileFounded,
    city: answers.profileCity,
    stateRegion: answers.profileStateRegion,
    country: answers.profileCountry,
    website: answers.profileWebsite,
    linkedin: answers.profileLinkedin,
    additionalContext: answers.profileAdditionalContext,
    fundingRounds: answers.profileFundingRounds,
    approxHeadcount: answers.profileApproxHeadcount || answers.headcount,
  });
}

export function isInvestorPersona(answers: OnboardingFlowAnswers | null | undefined): boolean {
  return INVESTOR_MODELS.includes(answers?.profileBusinessModel ?? "");
}

function mergeDetailAnswersPreserveExisting(
  existing: DetailAnswers,
  incoming: DetailAnswers,
): DetailAnswers {
  const merged: DetailAnswers = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value?.trim()) merged[key] = value.trim();
  }
  return merged;
}

function buildAnswersPayload(
  answers: Answers,
  profileForm: ProfileForm,
  fundingRounds: FundingRound[],
): Answers {
  return {
    ...answers,
    profileProductDescription: profileForm.productDescription || profileForm.whatTheyDo,
    profileApproxHeadcount: profileForm.approxHeadcount || answers.headcount,
    profileBusinessModel: profileForm.businessModel,
    profileCompany: profileForm.company,
    profileIndustry: profileForm.industry,
    profileFounded: profileForm.founded,
    profileCity: profileForm.city,
    profileStateRegion: profileForm.stateRegion,
    profileCountry: profileForm.country,
    profileWebsite: profileForm.website,
    profileLinkedin: profileForm.linkedin,
    profileAdditionalContext: profileForm.additionalContext,
    profileFundingRounds: fundingRounds.length > 0
      ? serializeProfileFundingRounds(fundingRounds.map(({ id, ...round }) => ({ id, ...round })))
      : answers.profileFundingRounds ?? "",
  };
}

function countStepBenchmarkFilled(answers: Answers): number {
  return ONBOARDING_BENCHMARK_STEP_FIELDS.filter(m => {
    const raw = answers[m.key as keyof Answers];
    return parseVal(typeof raw === "string" ? raw : "") !== null;
  }).length;
}

function isProfileStepComplete(profileForm: ProfileForm, searchState: OnboardingSearchState): boolean {
  if (searchState !== "review") return false;
  return Boolean(
    profileForm.company?.trim()
    && profileForm.whatTheyDo?.trim()
    && profileForm.businessModel
    && profileForm.industry?.trim()
    && profileForm.founded?.trim()
    && profileForm.city?.trim()
    && profileForm.stateRegion?.trim()
    && profileForm.country?.trim()
    && profileForm.website?.trim(),
  );
}

function isTrackFieldComplete(value?: string): boolean {
  return Boolean(value?.trim() && value !== ONBOARDING_UNKNOWN);
}

function isDevelopmentStepComplete(answers: Answers): boolean {
  return isTrackFieldComplete(answers.dev_product_stage)
    && isTrackFieldComplete(answers.dev_product_type)
    && isTrackFieldComplete(answers.dev_delivery_constraint);
}

function isGtmStepComplete(answers: Answers): boolean {
  return isTrackFieldComplete(answers.mkt_sales_motion)
    && isTrackFieldComplete(answers.mkt_funnel_gap)
    && isTrackFieldComplete(answers.rev_capital_priority);
}

function isRevopsStepComplete(answers: Answers): boolean {
  return isTrackFieldComplete(answers.mkt_revenue_tracking)
    && isTrackFieldComplete(answers.mkt_icp_clarity)
    && isTrackFieldComplete(answers.rev_runway);
}

function computeProfileSetupComplete(answers: Answers, profileForm: ProfileForm, searchState: OnboardingSearchState): boolean {
  const payload = buildAnswersPayload(answers, profileForm, []);
  const detail = mapOnboardingToDetailAnswers(payload) as DetailAnswers;
  const benchmarkFilled = countStepBenchmarkFilled(answers);
  const benchmarkTotal = ONBOARDING_BENCHMARK_STEP_FIELDS.length;
  const modulesOk = (["company", "dev", "gtm", "rev"] as const).every(id => isModuleFullyComplete(id, detail));
  const benchmarkOk = benchmarkFilled >= benchmarkTotal;
  return isProfileStepComplete(profileForm, searchState) && modulesOk && benchmarkOk;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function OnboardingFlow({ onComplete }: { onComplete: (answers: Answers) => void }) {
  const resumeSaved = typeof window !== "undefined" && !isBrowserReload();
  const saved = resumeSaved ? loadOnboardingProgress() : null;
  const savedBusinessType = resumeSaved
    ? (saved?.businessType ?? loadSavedBusinessType())
    : null;

  const [businessType, setBusinessType] = useState<OnboardingBusinessType | null>(savedBusinessType);
  const [stepIndex, setStepIndex] = useState(saved?.stepIndex ?? 0);
  const [companyQuery, setCompanyQuery] = useState(saved?.companyQuery ?? "Patriot Pay");
  const [searchState, setSearchState] = useState<OnboardingSearchState>(saved?.searchState ?? "idle");
  const [profileForm, setProfileForm] = useState<ProfileForm>(() => {
    const base = saved?.profileForm ?? {
      company:"", whatTheyDo:"", businessModel:"",
      industry:"", founded:"", city:"", stateRegion:"", country:"",
      website:"", linkedin:"", additionalContext:"",
      productDescription:"", approxHeadcount:"",
    };
    if (savedBusinessType && !base.businessModel) {
      return { ...base, businessModel: BUSINESS_TYPE_MODEL[savedBusinessType] };
    }
    return base;
  });
  const [fundingRounds, setFundingRounds] = useState<FundingRound[]>(() => saved?.fundingRounds ?? []);
  const [theme, setTheme] = useState<FuelTheme>(() => readFuelTheme());

  const [answers, setAnswers] = useState<Answers>(() => ({
    ...emptyOnboardingTrackAnswers(),
    profileProductDescription: "",
    profileApproxHeadcount: "",
    arr:"", arrGrowth:"", nrr:"", logoRetention:"", grossMargin:"",
    cacPayback:"", burnMultiple:"", ruleOf40:"",
    monthlyBurn:"", cashOnHand:"", headcount:"", payingCustomers:"",
    investCheckSize:"", investGeography:[], investPipeline:"",
    profileSetupComplete: false,
    ...(saved?.answers as Partial<Answers> | undefined),
  }));

  const [investStages, setInvestStages] = useState<string[]>([]);
  const [investSectors, setInvestSectors] = useState<string[]>([]);
  const [investQ, setInvestQ] = useState(0);
  const [hubspotStatus, setHubspotStatus] = useState<HubSpotStatus>("pending");
  const [benchmarkGenerating, setBenchmarkGenerating] = useState(false);
  const [benchmarkSummaryReady, setBenchmarkSummaryReady] = useState(false);

  const filledBenchmarkCount = useMemo(
    () => countStepBenchmarkFilled(answers),
    [answers],
  );
  const allBenchmarkFilled = filledBenchmarkCount === ONBOARDING_BENCHMARK_STEP_FIELDS.length;

  const isInvestor = businessType === "investment";
  const isProductFlow = businessType === "product";
  const isServiceFlow = businessType === "service";
  const activeSteps = useMemo<StepId[]>(
    () => (businessType ? stepsForBusinessType(businessType, answers.investPipeline) : []),
    [businessType, answers.investPipeline],
  );

  const stepId = businessType ? activeSteps[Math.min(stepIndex, activeSteps.length - 1)] : "profile";
  const isLast = businessType ? stepIndex >= activeSteps.length - 1 : false;
  const showBusinessTypeEntry = businessType === null;
  const showConnectLater = stepId === "hubspot" && hubspotStatus !== "connected";

  useEffect(() => {
    applyFuelTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (stepIndex >= activeSteps.length) {
      setStepIndex(Math.max(0, activeSteps.length - 1));
    }
  }, [activeSteps.length, stepIndex]);

  useEffect(() => {
    if (stepId !== "benchmarking" || !allBenchmarkFilled) {
      setBenchmarkGenerating(false);
      setBenchmarkSummaryReady(false);
      return;
    }
    setBenchmarkSummaryReady(false);
    setBenchmarkGenerating(true);
    const t = setTimeout(() => {
      setBenchmarkGenerating(false);
      setBenchmarkSummaryReady(true);
    }, 2400);
    return () => clearTimeout(t);
  }, [stepId, allBenchmarkFilled, answers]);

  function setPF(k: keyof ProfileForm, v: string) { setProfileForm(p => ({ ...p, [k]: v })); }
  function setAns(k: keyof Answers, v: string) { setAnswers(p => ({ ...p, [k]: v })); }

  function snapshotProgress(nextStepIndex = stepIndex): SavedOnboardingProgress {
    return {
      businessType: businessType!,
      stepIndex: nextStepIndex,
      companyQuery,
      searchState,
      profileForm,
      fundingRounds,
      answers: answers as unknown as SavedOnboardingProgress["answers"],
    };
  }

  function persistProgress(nextStepIndex = stepIndex) {
    if (!businessType) return;
    const payload = buildAnswersPayload(answers, profileForm, fundingRounds);
    const incoming = mapOnboardingToDetailAnswers(payload) as DetailAnswers;
    const existing = loadDetailAnswers(ONBOARDING_COMPANY_KEY);
    saveDetailAnswers(ONBOARDING_COMPANY_KEY, mergeDetailAnswersPreserveExisting(existing, incoming));
    saveOnboardingProgress(snapshotProgress(nextStepIndex));
  }

  function toggleInvestGeography(label: string) {
    setAnswers(prev => {
      const current = prev.investGeography;
      if (label === "Global") {
        return { ...prev, investGeography: current.includes("Global") ? [] : ["Global"] };
      }
      const withoutGlobal = current.filter(g => g !== "Global");
      if (withoutGlobal.includes(label)) {
        return { ...prev, investGeography: withoutGlobal.filter(g => g !== label) };
      }
      return { ...prev, investGeography: [...withoutGlobal, label] };
    });
  }

  function selectBusinessType(type: OnboardingBusinessType) {
    if (type === "service" || type === "investment") {
      finishShortFlow(type);
      return;
    }
    const model = BUSINESS_TYPE_MODEL[type];
    setBusinessType(type);
    setProfileForm(prev => ({ ...prev, businessModel: model }));
    setStepIndex(0);
    setSearchState("idle");
    saveBusinessType(type);
    saveOnboardingProgress({
      businessType: type,
      stepIndex: 0,
      companyQuery,
      searchState: "idle",
      profileForm: { ...profileForm, businessModel: model },
      fundingRounds,
      answers: answers as unknown as SavedOnboardingProgress["answers"],
    });
  }

  function loadCompanyProfile(record: CompanyRecord) {
    setSearchState("searching");
    setCompanyQuery(record.name);
    setTimeout(() => {
      const model = businessType ? BUSINESS_TYPE_MODEL[businessType] : "";
      setProfileForm(prev => ({
        company: record.name,
        whatTheyDo: record.whatTheyDo,
        businessModel: prev.businessModel || model || normalizeBusinessModel(record.businessModel),
        industry: record.industry,
        founded: record.founded,
        city: record.city,
        stateRegion: record.stateRegion,
        country: record.country,
        website: `https://${record.domain}`,
        linkedin: record.linkedin,
        additionalContext: "",
        productDescription: record.whatTheyDo,
        approxHeadcount: "",
      }));
      setFundingRounds(record.funding.map(f => ({
        id: rid(), type: f.type, amount: f.amount, date: "", investors: "",
      })));
      setSearchState(isServiceFlow ? "ready" : "review");
    }, 1600);
  }

  function trySelectCompanyFromQuery() {
    const match = findCompanyByQuery(companyQuery);
    if (match) loadCompanyProfile(match);
  }

  function addRound() { setFundingRounds(p => [...p, { id: rid(), type: "Seed", amount: "", date: "", investors: "" }]); }
  function updateRound(id: string, k: keyof FundingRound, v: string) { setFundingRounds(p => p.map(r => r.id === id ? { ...r, [k]: v } : r)); }
  function removeRound(id: string) { setFundingRounds(p => p.filter(r => r.id !== id)); }

  function connectHubSpot() {
    if (hubspotStatus !== "pending") return;
    setHubspotStatus("connecting");
    setTimeout(() => setHubspotStatus("connected"), 1800);
  }

  function canAdvance() {
    if (showBusinessTypeEntry) return false;
    if (stepId === "profile") {
      if (searchState === "idle") return !!findCompanyByQuery(companyQuery);
      if (searchState === "searching") return false;
      if (isServiceFlow) return searchState === "ready";
      return searchState === "review" && isProfileStepComplete(profileForm, "review");
    }
    if (stepId === "development") return isDevelopmentStepComplete(answers);
    if (stepId === "gtm") return isGtmStepComplete(answers);
    if (stepId === "revops") return isRevopsStepComplete(answers);
    if (stepId === "investment") {
      if (investQ === 0) return investStages.length > 0;
      if (investQ === 1) return investSectors.length > 0;
      if (investQ === 2) return !!answers.investCheckSize;
      if (investQ === 3) return answers.investGeography.length > 0;
      if (investQ === 4) return !!answers.investPipeline;
    }
    if (stepId === "benchmarking" && allBenchmarkFilled && benchmarkGenerating) return false;
    if (stepId === "hubspot") return hubspotStatus === "connected";
    return true;
  }

  function finishShortFlow(type: Extract<OnboardingBusinessType, "service" | "investment">) {
    const model = BUSINESS_TYPE_MODEL[type];
    const mergedProfile = { ...profileForm, businessModel: model };
    clearOnboardingProgress();
    try {
      window.localStorage.setItem("fuel-investor-hubspot-connected", "false");
    } catch { /* ignore */ }
    const payload = buildAnswersPayload(answers, mergedProfile, fundingRounds);
    onComplete({
      ...payload,
      profileBusinessModel: model,
      profileSetupComplete: false,
      hubspotConnected: false,
    });
  }

  function finishOnboarding() {
    const connected = hubspotStatus === "connected";
    if (businessType) persistProgress(stepIndex);
    clearOnboardingProgress();
    try {
      window.localStorage.setItem("fuel-investor-hubspot-connected", connected ? "true" : "false");
    } catch { /* ignore */ }
    const payload = buildAnswersPayload(answers, profileForm, fundingRounds);
    onComplete({
      ...payload,
      profileSetupComplete: isProductFlow
        ? computeProfileSetupComplete(answers, profileForm, searchState === "review" ? "review" : "idle")
        : false,
      hubspotConnected: connected,
    });
  }

  function skipConnectors() {
    finishOnboarding();
  }

  function advanceStep() {
    if (isLast) {
      finishOnboarding();
      return;
    }
    const nextIndex = stepIndex + 1;
    persistProgress(nextIndex);
    setStepIndex(nextIndex);
  }

  function skipStep() {
    // Product: organization selection is required — no setup-later escape.
    if (isProductFlow && stepId === "profile" && (searchState === "idle" || searchState === "searching")) return;
    if (stepId === "profile" && searchState === "searching") return;

    // Product "Setup later": save entered data and exit to the main workspace,
    // skipping the rest of onboarding. Incomplete fields stay incomplete.
    if (isProductFlow) {
      finishOnboarding();
      return;
    }

    if (stepId === "investment" && investQ < 4) {
      setInvestQ(q => q + 1);
      return;
    }
    if (stepId === "investment") setInvestQ(0);
    advanceStep();
  }

  function next() {
    if (stepId === "profile" && searchState === "idle") {
      trySelectCompanyFromQuery();
      return;
    }
    if (stepId === "profile" && isServiceFlow && searchState === "ready") {
      persistProgress(stepIndex);
      finishOnboarding();
      return;
    }
    if (stepId === "investment" && investQ < 4) {
      setInvestQ(q => q + 1);
      return;
    }
    if (stepId === "investment") setInvestQ(0);
    advanceStep();
  }

  function back() {
    if (stepIndex === 0 && businessType && stepId === "profile") {
      if (searchState === "review" || searchState === "ready") {
        setSearchState("idle");
        return;
      }
      if (searchState === "idle") {
        setBusinessType(null);
        return;
      }
    }
    if (stepId === "profile") {
      if (searchState === "review") {
        setSearchState("idle");
        return;
      }
    }
    if (stepId === "investment" && investQ > 0) {
      setInvestQ(q => q - 1);
      return;
    }
    if (activeSteps[stepIndex - 1] === "investment") setInvestQ(4);
    setStepIndex(i => Math.max(0, i - 1));
  }

  const showBack = showBusinessTypeEntry
    ? false
    : stepIndex > 0
    || (stepId === "investment" && investQ > 0)
    || (stepId === "profile" && (searchState === "review" || searchState === "ready"))
    || (stepIndex === 0 && businessType !== null);

  const companyName = profileForm.company || companyQuery || "your company";
  const currentSubQ = stepId === "investment" ? investQ : 0;

  const motionSearchState = showBusinessTypeEntry
    ? "idle" as const
    : isServiceFlow && searchState === "ready"
      ? "review" as const
      : searchState === "ready"
        ? "review" as const
        : searchState;

  const isTopAligned =
    !showBusinessTypeEntry && (
      stepId === "development"
      || stepId === "gtm"
      || stepId === "revops"
      || (stepId === "profile" && (searchState === "review" || searchState === "ready"))
      || stepId === "benchmarking"
    );
  const isCenteredView = showBusinessTypeEntry || (!isTopAligned && (
    (stepId === "profile" && searchState === "idle")
    || stepId === "investment"
    || stepId === "hubspot"
  ));

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [businessType, stepId, searchState, currentSubQ]);

  const rightPanel: Record<StepId, React.ReactNode> = {
    profile: <ProfileMotion searchState={motionSearchState} form={profileForm} companyQuery={companyQuery} isInvestor={isInvestor} />,
    development: <DevMotion answers={answers} companyName={companyName} />,
    gtm: <GtmMotion answers={answers} companyName={companyName} />,
    revops: <RevopsMotion answers={answers} companyName={companyName} />,
    investment: (
      <InvestmentMotion
        investQ={currentSubQ}
        stages={investStages}
        sectors={investSectors}
        checkSize={answers.investCheckSize}
        geography={answers.investGeography}
        pipeline={answers.investPipeline}
        companyName={companyName}
      />
    ),
    benchmarking: (
      <BenchmarkMotion
        answers={answers}
        cohortLabel={profileForm.industry || "FinTech SaaS · Seed"}
        companyName={companyName}
        allMetricsFilled={allBenchmarkFilled}
        filledCount={filledBenchmarkCount}
        totalCount={ONBOARDING_BENCHMARK_STEP_FIELDS.length}
        isGenerating={benchmarkGenerating}
        summaryReady={benchmarkSummaryReady}
      />
    ),
    hubspot: <HubSpotMotion status={hubspotStatus} companyName={companyName} />,
    sources: null,
  };

  const progressPct = showBusinessTypeEntry
    ? 0
    : Math.round((stepIndex / Math.max(activeSteps.length - 1, 1)) * 100);

  const onProfilePhase = stepId === "profile";
  const profilePhaseCurrent = searchState === "idle" || searchState === "searching" ? 1 : 2;
  const footerProgressCurrent = onProfilePhase ? profilePhaseCurrent : stepIndex + 1;
  const footerProgressTotal = onProfilePhase ? 2 : activeSteps.length;
  const footerProgressPct = onProfilePhase
    ? Math.round(((profilePhaseCurrent - 1) / Math.max(footerProgressTotal - 1, 1)) * 100)
    : progressPct;

  const onProfileReview = onProfilePhase && (searchState === "review" || (isServiceFlow && searchState === "ready"));

  const continueLabel = showBusinessTypeEntry
    ? "Continue"
    : onProfileReview
      ? (isServiceFlow ? "Open my dashboard →" : isProductFlow ? "Continue →" : "Continue")
      : isLast
        ? (isServiceFlow ? "Open my dashboard →" : "Start my journey")
        : "Continue";

  const onProductOrgSelection =
    isProductFlow &&
    stepId === "profile" &&
    (searchState === "idle" || searchState === "searching");
  const showSetupLater =
    isProductFlow &&
    !showBusinessTypeEntry &&
    !onProductOrgSelection;
  const showLegacySkip =
    !isProductFlow &&
    !showBusinessTypeEntry &&
    searchState !== "searching";
  const showSecondarySkip = showSetupLater || showLegacySkip;

  return (
    <>
      <style>{css}</style>
      <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex" }}>
        <div className="of-shell">

          <div className="of-left-col">

            <div className="of-brand-bar">
              <div className="of-brand-mark">
                <div className="of-brand-logo">F</div>
                <span className="of-brand-name">Fuel</span>
                <span className="of-brand-sub">by York IE</span>
              </div>
              <div className="of-brand-actions">
                {showSecondarySkip ? (
                  <button type="button" className="of-skip-link" onClick={skipStep}>
                    {showSetupLater ? "Setup later" : "Skip for now"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="of-theme-toggle of-theme-toggle--icon"
                  onClick={() => setTheme(prev => toggleFuelTheme(prev))}
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  <FuelIcon name={theme === "dark" ? "appearanceLight" : "appearanceDark"} size={16} />
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className={`of-left-scroll${isCenteredView ? " of-left-scroll--centered" : ""}`}
            >
              <div className={`of-form-col${isCenteredView ? " of-form-col--centered" : ""}`}>
                <div className="of-step" key={`${businessType ?? "entry"}-${stepId}-${currentSubQ}-${searchState}`}>

                  {showBusinessTypeEntry ? (
                    <div className="of-identity of-step">
                      <h2 className="of-figma-q-title" style={{ marginBottom: 12 }}>
                        What type of business are you?
                      </h2>
                      <p className="of-figma-q-sub" style={{ margin: "0 0 28px" }}>
                        Fuel configures your workspace, intelligence tracks, and benchmarks based on how you operate.
                      </p>
                      <div style={{ marginTop: 28 }}>
                        <div className="sc-drawer-org-cards" role="radiogroup" aria-label="Business type">
                          {BUSINESS_TYPE_ENTRY_OPTIONS.map(opt => (
                            <button
                              key={opt.type}
                              type="button"
                              role="radio"
                              aria-checked={false}
                              className="sc-drawer-org-card"
                              onClick={() => selectBusinessType(opt.type)}
                            >
                              <span className="sc-drawer-org-radio" aria-hidden="true" />
                              <span className="sc-drawer-org-copy">
                                <strong>{opt.label}</strong>
                                <small>{opt.desc}</small>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {!showBusinessTypeEntry && stepId === "profile" && (
                    <div>
                      {searchState === "idle" && (
                        <div>
                          <h2 className="of-figma-q-title" style={{ marginBottom: 12 }}>
                            {isServiceFlow
                              ? "Let's build your intelligence workspace."
                              : "Which company is this workspace for?"}
                          </h2>
                          <p className="of-figma-q-sub" style={{ margin: "0 0 28px" }}>
                            {isServiceFlow
                              ? "Search for your company — Fuel pulls your profile, funding history, and cohort data from public signals to give you a head start."
                              : "Search by name — Fuel pulls your profile, funding history, and cohort match from public signals."}
                          </p>
                          <CompanySearch
                            value={companyQuery}
                            onChange={v => setCompanyQuery(v)}
                            onSelect={loadCompanyProfile}
                          />
                          <p style={{ fontSize:12, color:"#3A4F5E", marginTop:14, lineHeight:1.55 }}>
                            Select a match from the list, or continue with your current selection.
                          </p>
                        </div>
                      )}

                      {searchState === "searching" && (
                        <div style={{ padding:"48px 0", textAlign:"center" }}>
                          <div style={{ position:"relative", width:80, height:80, margin:"0 auto 24px" }}>
                            <div className="of-spin" style={{ width:80, height:80, borderRadius:"50%", border:"3px solid rgba(61,214,140,0.1)", borderTop:"3px solid var(--btn-primary-bg)", position:"absolute" }} />
                            <div className="of-spin" style={{ width:56, height:56, borderRadius:"50%", border:"2px solid rgba(61,214,140,0.06)", borderBottom:"2px solid rgba(61,214,140,0.4)", position:"absolute", top:12, left:12, animationDirection:"reverse", animationDuration:"0.65s" }} />
                          </div>
                          <div style={{ fontSize:17, fontWeight:700, color:"var(--text-1)", marginBottom:6 }}>Building {companyQuery}&apos;s profile…</div>
                          <div style={{ fontSize:13, color:"#556878" }}>Pulling Crunchbase, LinkedIn, funding, and cohort signals</div>
                        </div>
                      )}

                      {searchState === "ready" && isServiceFlow && (
                        <div>
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                              <div className="of-pulse" style={{ width:8, height:8, borderRadius:"50%", background:"var(--btn-primary-bg)" }} />
                              <span style={{ fontSize:11, fontWeight:700, color:"var(--btn-primary-bg)", textTransform:"uppercase", letterSpacing:"0.5px" }}>Profile ready</span>
                            </div>
                            <h2 style={{ fontSize:34, fontWeight:800, color:"var(--text-1)", margin:"0 0 8px", letterSpacing:"-0.4px", lineHeight:1.15 }}>
                              You&apos;re set up for {profileForm.company}.
                            </h2>
                            <p style={{ fontSize:15, color:"#556878", margin:0, lineHeight:1.6 }}>
                              Fuel prefilled your workspace from public signals. Complete your company profile anytime in-app.
                            </p>
                          </div>
                        </div>
                      )}

                      {searchState === "review" && !isServiceFlow && (
                        <div>
                          <div style={{ marginBottom:24 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                              <div className="of-pulse" style={{ width:8, height:8, borderRadius:"50%", background:"var(--btn-primary-bg)" }} />
                              <span style={{ fontSize:11, fontWeight:700, color:"var(--btn-primary-bg)", textTransform:"uppercase", letterSpacing:"0.5px" }}>Profile ready</span>
                            </div>
                            <h2 style={{ fontSize:34, fontWeight:800, color:"var(--text-1)", margin:"0 0 8px", letterSpacing:"-0.4px", lineHeight:1.15 }}>Review your {profileForm.company} profile.</h2>
                            <p style={{ fontSize:15, color:"#556878", margin:0, lineHeight:1.6 }}>The more accurate this is, the tighter your peer cohort. Garbage in, garbage out.</p>
                          </div>

                          <Field label="Company" required>
                            <input className="of-input" value={profileForm.company} onChange={e => setPF("company", e.target.value)} style={inp} />
                          </Field>

                          <Field label="What they do" required>
                            <textarea className="of-input" value={profileForm.whatTheyDo} onChange={e => setPF("whatTheyDo", e.target.value)} rows={3} style={{ ...inp, resize:"vertical", lineHeight:1.65 }} />
                          </Field>

                          <Field label="Industry" required hint="From homepage positioning">
                            <input className="of-input" value={profileForm.industry} onChange={e => setPF("industry", e.target.value)} style={inp} />
                          </Field>

                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                            <Field label="Founded" required>
                              <input className="of-input" value={profileForm.founded} onChange={e => setPF("founded", e.target.value)} placeholder="2021" style={inp} />
                            </Field>
                            <Field label="City" required>
                              <input className="of-input" value={profileForm.city} onChange={e => setPF("city", e.target.value)} placeholder="Boston" style={inp} />
                            </Field>
                            <Field label="State / Region" required>
                              <input className="of-input" value={profileForm.stateRegion} onChange={e => setPF("stateRegion", e.target.value)} placeholder="MA" style={inp} />
                            </Field>
                            <Field label="Country" required>
                              <input className="of-input" value={profileForm.country} onChange={e => setPF("country", e.target.value)} placeholder="United States" style={inp} />
                            </Field>
                          </div>

                          <Field label="Website" required hint="From domain extension">
                            <input className="of-input" value={profileForm.website} onChange={e => setPF("website", e.target.value)} style={inp} />
                          </Field>

                          <Field label="LinkedIn">
                            <input className="of-input" value={profileForm.linkedin} onChange={e => setPF("linkedin", e.target.value)} placeholder="https://linkedin.com/company/patriotpay" style={inp} />
                          </Field>

                          <div style={{ marginBottom:20 }}>
                            <label className="of-field-label">Funding rounds</label>
                            {fundingRounds.length > 0 && (
                              <div style={{ marginBottom:8 }}>
                                {fundingRounds.map(r => (
                                  <div key={r.id} className="of-funding-row">
                                    <select
                                      className="of-input"
                                      value={r.type}
                                      onChange={e => updateRound(r.id, "type", e.target.value)}
                                      aria-label="Round type"
                                    >
                                      {ROUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <input
                                      className="of-input"
                                      value={r.amount}
                                      onChange={e => updateRound(r.id, "amount", e.target.value)}
                                      placeholder="$4.2M"
                                      aria-label="Round amount"
                                    />
                                    <input
                                      className="of-input"
                                      value={r.date}
                                      onChange={e => updateRound(r.id, "date", e.target.value)}
                                      placeholder="dd/mm/yyyy"
                                      aria-label="Round date"
                                    />
                                    <input
                                      className="of-input"
                                      value={r.investors}
                                      onChange={e => updateRound(r.id, "investors", e.target.value)}
                                      placeholder="Investors"
                                      aria-label="Round investors"
                                    />
                                    <button
                                      type="button"
                                      className="of-funding-remove"
                                      onClick={() => removeRound(r.id)}
                                      aria-label="Remove round"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button type="button" className="of-add-round" onClick={addRound} style={{ background:"none", border:"1px dashed rgba(255,255,255,0.1)", borderRadius:8, padding:"9px 18px", fontSize:13, color:"#8FA99A", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7 }}>
                              <span style={{ fontSize:16, lineHeight:1 }}>+</span> Add round
                            </button>
                          </div>

                          <Field label="Additional context">
                            <textarea className="of-input" value={profileForm.additionalContext} onChange={e => setPF("additionalContext", e.target.value)} placeholder="Customers, priorities, markets, or anything Fuel should remember." rows={3} style={{ ...inp, resize:"vertical", lineHeight:1.65 }} />
                          </Field>

                          <div style={{ padding:"11px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, fontSize:12, color:"#3A4F5E", lineHeight:1.6 }}>
                            Teammates can create their own profiles for the same company once <span style={{ color:"#556878" }}>{profileForm.company}</span> is linked.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!showBusinessTypeEntry && isProductFlow && stepId === "development" && (
                    <div className="of-track-step">
                      <StepHeading meta={STEP_META.development} />
                      <FigmaQuestion grouped unknownOption columns={1} title="Where are you in the build?" options={[...BUILD_STAGE_OPTIONS.filter(o => o !== ONBOARDING_UNKNOWN)]} value={answers.dev_product_stage} onChange={v => setAns("dev_product_stage", v)} />
                      <FigmaQuestion grouped unknownOption title="What type of product are you building?" options={["SaaS / web app", "Marketplace", "API or developer platform", "Other"]} value={answers.dev_product_type} onChange={v => setAns("dev_product_type", v)} />
                      <FigmaQuestion grouped unknownOption columns={1} title="What's your biggest product challenge right now?" options={[...PRODUCT_CHALLENGE_OPTIONS.filter(o => o !== ONBOARDING_UNKNOWN)]} value={answers.dev_delivery_constraint} onChange={v => setAns("dev_delivery_constraint", v)} />
                    </div>
                  )}

                  {!showBusinessTypeEntry && isProductFlow && stepId === "gtm" && (
                    <div className="of-track-step">
                      <StepHeading meta={STEP_META.gtm} />
                      <FigmaQuestion grouped unknownOption title="What is your primary sales motion?" options={["Sales-led", "Product-led", "Founder-led", "Not yet"]} value={answers.mkt_sales_motion} onChange={v => setAns("mkt_sales_motion", v)} />
                      <FigmaDescQuestion grouped unknownOption title="Where does your go-to-market break down most?" subtitle="Pick the funnel stage where you're losing the most ground." options={GTM_FUNNEL_CHOICES} value={answers.mkt_funnel_gap} onChange={v => setAns("mkt_funnel_gap", v)} hint={answers.mkt_funnel_gap ? GTM_FUNNEL_HINTS[answers.mkt_funnel_gap as GtmFunnelStage] : undefined} />
                      <FigmaQuestion grouped unknownOption columns={1} title="Are you open to investor introductions from York IE?" options={[...INVESTOR_INTRO_OPTIONS.filter(o => o !== ONBOARDING_UNKNOWN)]} value={answers.rev_capital_priority} onChange={v => setAns("rev_capital_priority", v)} />
                    </div>
                  )}

                  {!showBusinessTypeEntry && isProductFlow && stepId === "revops" && (
                    <div className="of-track-step">
                      <StepHeading meta={STEP_META.revops} />
                      <FigmaQuestion grouped unknownOption columns={1} title="What are you using to manage your pipeline?" options={[...PIPELINE_TOOL_OPTIONS.filter(o => o !== ONBOARDING_UNKNOWN)]} value={answers.mkt_revenue_tracking} onChange={v => setAns("mkt_revenue_tracking", v)} />
                      <FigmaQuestion grouped unknownOption columns={1} title="How defined is your sales process?" options={[...SALES_PROCESS_OPTIONS.filter(o => o !== ONBOARDING_UNKNOWN)]} value={answers.mkt_icp_clarity} onChange={v => setAns("mkt_icp_clarity", v)} />
                      <FigmaQuestion grouped unknownOption title="How long is your current runway?" options={["Under 6 months", "6–12 months", "12–18 months", "Over 18 months"]} value={answers.rev_runway} onChange={v => setAns("rev_runway", v)} />
                    </div>
                  )}

                  {!showBusinessTypeEntry && stepId === "investment" && (
                    <div className="of-step" key={investQ}>
                      {investQ === 0 && (
                        <FigmaMultiSelect title="What stages do you typically invest in?" subtitle="Select all that apply." options={["Pre-seed / Seed", "Series A / B", "Growth / Series C+"]} selected={investStages} onToggle={s => { if (investStages.includes(s)) setInvestStages(p => p.filter(x => x !== s)); else setInvestStages(p => [...p, s]); }} />
                      )}
                      {investQ === 1 && (
                        <FigmaMultiSelect title="What sectors are you most active in?" subtitle="Pick up to 3." options={["SaaS / Software", "FinTech", "Healthcare", "Deep tech / AI", "Consumer", "Other"]} selected={investSectors} onToggle={s => { if (investSectors.includes(s)) setInvestSectors(p => p.filter(x => x !== s)); else if (investSectors.length < 3) setInvestSectors(p => [...p, s]); }} max={3} />
                      )}
                      {investQ === 2 && (
                        <FigmaQuestion title="What is your typical check size?" options={["Under $500K", "$500K – $2M", "$2M – $10M", "Over $10M"]} value={answers.investCheckSize} onChange={v => setAns("investCheckSize", v)} />
                      )}
                      {investQ === 3 && (
                        <FigmaDescMultiSelect title="Where do you primarily invest?" subtitle="Select all regions that apply." options={INVEST_GEOGRAPHY_OPTIONS} selected={answers.investGeography} onToggle={toggleInvestGeography} />
                      )}
                      {investQ === 4 && (
                        <FigmaQuestion title="How are you managing your deal pipeline?" options={["HubSpot", "Another CRM", "Spreadsheet", "Not yet"]} value={answers.investPipeline} onChange={v => setAns("investPipeline", v)} hint={answers.investPipeline === "HubSpot" ? "We'll connect HubSpot in the next step to load your pipeline." : undefined} />
                      )}
                    </div>
                  )}

                  {!showBusinessTypeEntry && isProductFlow && stepId === "benchmarking" && (
                    <div>
                      <div style={{ marginBottom:20 }}>
                        <h2 style={{ fontSize:38, fontWeight:800, color:"var(--text-1)", margin:"0 0 10px", letterSpacing:"-0.5px", lineHeight:1.1 }}>How do you stack up?</h2>
                        <p style={{ fontSize:16, color:"#556878", margin:0, lineHeight:1.55 }}>Enter what you know — mark the rest as unknown. Fuel generates your action plan on the right once all metrics are in.</p>
                      </div>

                      <div style={{ background:"linear-gradient(135deg, rgba(43,184,160,0.1) 0%, rgba(61,214,140,0.06) 100%)", border:"1px solid rgba(43,184,160,0.25)", borderRadius:12, padding:"14px 18px", marginBottom:22 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#2BB8A0", marginBottom:4 }}>✦ The more you share, the sharper your intelligence</div>
                        <div style={{ fontSize:12, color:"#8FA99A", lineHeight:1.6 }}>Every number narrows your cohort. Once all metrics are entered, Fuel builds your <strong style={{ color:"var(--text-1)" }}>intelligence</strong>, suggested <strong style={{ color:"var(--text-1)" }}>initiatives</strong>, and <strong style={{ color:"var(--text-1)" }}>playbooks</strong> on the right. This step is optional.</div>
                      </div>

                      <OnboardingBenchmarkFieldList
                        fields={ONBOARDING_BENCHMARK_STEP_FIELDS}
                        values={answers}
                        onChange={(key, value) => setAns(key as keyof Answers, value)}
                      />
                      <div style={{ marginTop:8, fontSize:11, color:"#3A4F5E" }}>Numbers stay in your workspace and are never shared externally.</div>
                    </div>
                  )}

                  {!showBusinessTypeEntry && stepId === "hubspot" && (
                    <div>
                      <h2 className="of-figma-q-title" style={{ marginBottom: 12 }}>Connect HubSpot</h2>
                      <p className="of-figma-q-sub" style={{ marginBottom: 28 }}>Load your deal pipeline into Fuel. Contacts, companies, deal stages, and notes sync automatically.</p>
                      <div style={{ background: hubspotStatus === "connected" ? "rgba(61,214,140,0.06)" : "#1A2D3F", border: hubspotStatus === "connected" ? "1.5px solid rgba(61,214,140,0.35)" : "1.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "22px 20px", marginBottom: 22 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "#FF7A5922", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#FF7A59" }}>HS</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>HubSpot CRM</div>
                            <div style={{ fontSize: 12, color: "#8FA99A", marginTop: 2 }}>Deal pipeline · contacts · companies</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 600, color: hubspotStatus === "connected" ? "#3DD68C" : hubspotStatus === "connecting" ? "#D4924A" : "#556878", background: hubspotStatus === "connected" ? "rgba(61,214,140,0.1)" : hubspotStatus === "connecting" ? "rgba(212,146,74,0.1)" : "rgba(255,255,255,0.04)", borderRadius: 6, padding: "3px 9px" }}>
                            {hubspotStatus === "connected" ? "Connected" : hubspotStatus === "connecting" ? "Connecting…" : "Not connected"}
                          </span>
                        </div>
                        {hubspotStatus === "pending" && (
                          <button type="button" onClick={connectHubSpot} style={{ width: "100%", background: "#FF7A59", color: "#fff", border: "none", borderRadius: 10, padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Connect with HubSpot</button>
                        )}
                        {hubspotStatus === "connecting" && (
                          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                            <div className="of-hubspot-bar" style={{ height: "100%", background: "linear-gradient(90deg, #FF7A59, #FFB199)", borderRadius: 2, animation: "ofHubspotLoad 1.8s ease-in-out forwards" }} />
                          </div>
                        )}
                        {hubspotStatus === "connected" && (
                          <div style={{ fontSize: 12, color: "#3DD68C", lineHeight: 1.55 }}>✓ Pipeline synced — 24 deals, 156 contacts loaded into Fuel.</div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {!showBusinessTypeEntry ? (
            <div className="of-footer">
              <div className="of-footer-left">
                {showBack && (
                  <button type="button" className="fuel-cta fuel-cta--tertiary of-cta-tertiary of-back" onClick={back} aria-label="Back">←</button>
                )}
                {footerProgressTotal > 1 ? (
                  <>
                    <div className="of-step-dots" aria-label={`Step ${footerProgressCurrent} of ${footerProgressTotal}`}>
                      {Array.from({ length: footerProgressTotal }, (_, i) => (
                        <span
                          key={i}
                          className={`of-step-dot${i === footerProgressCurrent - 1 ? " of-step-dot--active" : ""}${i < footerProgressCurrent - 1 ? " of-step-dot--done" : ""}`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <div className="of-progress-track">
                      <div className="of-progress-fill" style={{ width:`${footerProgressPct}%` }} />
                    </div>
                    <span className="of-progress-label">{footerProgressCurrent} / {footerProgressTotal}</span>
                  </>
                ) : (
                  <span className="of-progress-label">1 / 1</span>
                )}
              </div>

              <div className="of-footer-right">
                {stepId === "benchmarking" && (
                  <span style={{ fontSize:12, color:"#556878" }}>{benchmarkGenerating ? "Generating…" : "Optional"}</span>
                )}
                {showConnectLater && (
                  <button type="button" onClick={skipConnectors} style={{ fontSize: 12, color: "var(--text-1)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Connect later</button>
                )}
                <button
                  type="button"
                  className="fuel-cta fuel-cta--primary of-cta-primary"
                  onClick={next}
                  disabled={!canAdvance()}
                >
                  {continueLabel}
                </button>
              </div>
            </div>
            ) : null}
          </div>

          <div style={{ flex:1, background:"linear-gradient(175deg, #EEF8F5 0%, #D8F0EA 45%, #C8E8DF 100%)", overflow:"hidden", position:"relative" }}>
            <div className="of-motion-scale-inner of-step" key={`g-${businessType ?? "entry"}-${stepId}-${searchState}-${currentSubQ}-${hubspotStatus}-${benchmarkGenerating}-${benchmarkSummaryReady}`}>
              {showBusinessTypeEntry
                ? <ProfileMotion searchState="idle" form={profileForm} companyQuery={companyQuery} isInvestor={false} />
                : rightPanel[stepId]}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
