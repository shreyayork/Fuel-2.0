import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ProfileMotion,
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

const STEPS_DEFAULT: StepId[] = ["profile", "development", "gtm", "revops", "benchmarking"];
const STEPS_INVESTOR_BASE: StepId[] = ["profile", "investment"];
const STEPS_INVESTOR_WITH_HUBSPOT: StepId[] = ["profile", "investment", "hubspot"];

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
  development:  { label: "Development",   sub: "Product & engineering" },
  gtm:          { label: "Go to market",  sub: "Sales & growth" },
  revops:       { label: "G&A",           sub: "Capital + efficiency" },
  investment:   { label: "Investment",    sub: "Fund thesis & deal flow" },
  hubspot:      { label: "Connect",       sub: "Load your deal pipeline" },
  benchmarking: { label: "Benchmarking",  sub: "Optional — compare metrics" },
  sources:      { label: "Sources",       sub: "Meetings & investor updates" },
};

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

  .of-figma-opt {
    background: var(--surface-2, var(--input-bg, #1a2d3f)) !important;
    border: 1px solid var(--panel-border, var(--border, rgba(255,255,255,0.14))) !important;
    color: var(--text-2) !important;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .of-figma-opt:hover {
    background: rgba(18, 184, 134, 0.06) !important;
    border-color: rgba(18, 184, 134, 0.35) !important;
    color: var(--text-1) !important;
  }
  .of-figma-opt:focus-visible {
    outline: 2px solid var(--fuel-accent, var(--fuel-accent));
    outline-offset: 2px;
  }
  .of-figma-opt--on,
  .of-figma-opt--on:hover {
    background: rgba(18, 184, 134, 0.1) !important;
    border-color: var(--fuel-accent) !important;
    color: var(--text-1) !important;
  }
  .of-figma-opt-indicator {
    align-items: center;
    background: transparent;
    border: 2px solid var(--border, rgba(255,255,255,0.22));
    border-radius: 50%;
    display: flex;
    flex-shrink: 0;
    height: 18px;
    justify-content: center;
    margin-top: 1px;
    width: 18px;
  }
  .of-figma-opt--on .of-figma-opt-indicator {
    background: rgba(18, 184, 134, 0.2);
    border-color: var(--fuel-accent);
  }
  .of-figma-opt-indicator-dot {
    background: var(--fuel-accent);
    border-radius: 50%;
    height: 7px;
    width: 7px;
  }

  .of-figma-q-title { font-size: clamp(26px, 2.8vw, 36px); font-weight: 800; color: var(--text-1); margin: 0; letter-spacing: -0.5px; line-height: 1.12; }
  .of-figma-q-grouped { font-size: clamp(15px, 2vw, 16px); font-weight: 500; color: var(--text-2); margin: 0; line-height: 1.5; }
  .of-figma-q-sub { font-size: clamp(13px, 1.8vw, 15px); color: #556878; margin: 12px 0 0; line-height: 1.55; }
  .of-step-heading h2 { font-size: clamp(28px, 3vw, 36px); }
  .of-step-heading p { font-size: clamp(13px, 1.8vw, 15px); }

  .of-add-round:hover { border-color: var(--border-strong) !important; color: var(--text-2) !important; }

  .of-back:hover { color: var(--text-2) !important; }

  .of-suggest-item:hover { background: rgba(61,214,140,0.08) !important; }

  .of-left-col { width: 50%; min-width: 0; }
  .of-form-col {
    width: 100%;
    max-width: 520px;
    padding: 88px 72px 80px;
    box-sizing: border-box;
  }
  .of-form-col--centered { padding: 40px 72px 80px; }

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
  .of-opt-title { font-size: 14px; line-height: 1.3; }
  .of-opt-desc { font-size: 12px; margin-top: 3px; line-height: 1.5; }
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
    font-family: Inter, -apple-system, sans-serif;
    color: var(--text-1);
  }
  html[data-theme="light"] .of-shell {
    background: #F7F8FA;
  }
  .of-brand-bar {
    position: absolute;
    top: 28px;
    left: 48px;
    right: 48px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
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
  html[data-theme="light"] .of-figma-opt {
    background: #ffffff !important;
    border-color: #e8eaed !important;
    color: #3d4f5f !important;
  }
  html[data-theme="light"] .of-figma-opt:hover {
    background: rgba(18, 184, 134, 0.06) !important;
    border-color: rgba(18, 184, 134, 0.35) !important;
    color: #1a2332 !important;
  }
  html[data-theme="light"] .of-figma-opt--on,
  html[data-theme="light"] .of-figma-opt--on:hover {
    background: rgba(18, 184, 134, 0.08) !important;
    border-color: var(--fuel-accent) !important;
    color: #1a2332 !important;
  }
  html[data-theme="light"] .of-figma-opt-indicator {
    border-color: #e8eaed;
  }
  html[data-theme="light"] .of-figma-opt--on .of-figma-opt-indicator {
    background: rgba(18, 184, 134, 0.16);
    border-color: var(--fuel-accent);
  }

  .of-org-type-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 28px;
  }
  .of-org-type-label {
    color: var(--text-2);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .of-org-type-required {
    color: #e05c5c;
  }
  .of-org-type-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: 1fr;
  }
  .of-org-type-option {
    align-items: flex-start;
    background: var(--surface-2, var(--input-bg, #1a2d3f));
    border: 1px solid var(--panel-border, var(--border, rgba(255,255,255,0.14)));
    border-radius: 8px;
    color: var(--panel-strong, var(--text-1));
    cursor: pointer;
    display: flex;
    font: inherit;
    gap: 12px;
    min-height: 0;
    padding: 14px 14px;
    text-align: left;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .of-org-type-option:hover {
    background: rgba(18, 184, 134, 0.06);
    border-color: rgba(18, 184, 134, 0.35);
    color: var(--text-1);
  }
  .of-org-type-option:focus-visible {
    outline: 2px solid var(--fuel-accent, var(--fuel-accent));
    outline-offset: 2px;
  }
  .of-org-type-option.is-selected {
    background: rgba(18, 184, 134, 0.1);
    border-color: var(--fuel-accent);
    color: var(--text-1);
  }
  .of-org-type-radio {
    align-items: center;
    border: 2px solid var(--border, rgba(255,255,255,0.22));
    border-radius: 50%;
    display: flex;
    flex-shrink: 0;
    height: 18px;
    justify-content: center;
    margin-top: 1px;
    width: 18px;
  }
  .of-org-type-option.is-selected .of-org-type-radio {
    border-color: var(--fuel-accent);
  }
  .of-org-type-radio-dot {
    background: var(--fuel-accent);
    border-radius: 50%;
    height: 8px;
    width: 8px;
  }
  .of-org-type-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .of-org-type-option strong {
    display: block;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }
  .of-org-type-option small {
    color: var(--panel-muted, #556878);
    display: block;
    font-size: 11px;
    line-height: 1.4;
  }
  .of-org-type-option.is-selected strong {
    color: var(--text-1);
  }
  html[data-theme="light"] .of-org-type-option {
    background: #ffffff;
    border-color: #e8eaed;
    color: #1a2332;
  }
  html[data-theme="light"] .of-org-type-option:hover {
    background: rgba(18, 184, 134, 0.06);
    border-color: rgba(18, 184, 134, 0.35);
  }
  html[data-theme="light"] .of-org-type-option.is-selected {
    background: rgba(18, 184, 134, 0.08);
    border-color: var(--fuel-accent);
  }
  html[data-theme="light"] .of-org-type-radio {
    border-color: #e8eaed;
  }
  html[data-theme="light"] .of-org-type-option.is-selected .of-org-type-radio {
    border-color: var(--fuel-accent);
  }
  html[data-theme="light"] .of-org-type-option small {
    color: #5b6b7c;
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
    border-radius: 8px; display: grid; gap: 6px; grid-template-columns: 96px 86px 128px 1fr 26px;
    margin-bottom: 6px; padding: 7px;
  }
  .of-funding-row .of-input { font-size: 11px; min-height: 34px; padding: 6px 7px; }
  .of-funding-remove {
    align-items: center; background: rgba(201,95,95,0.1); border: 1px solid rgba(201,95,95,0.2);
    border-radius: 5px; color: #C95F5F; cursor: pointer; display: inline-flex; font: inherit;
    font-size: 14px; height: 26px; justify-content: center; padding: 0; width: 26px;
  }
  .of-teammates-note { color: var(--text-3); font-size: 12px; line-height: 1.55; margin: 18px 0 0; }
  .of-profile-error { color: var(--status-bad, #E05C5C); font-size: 12px; margin: 8px 0 0; }
  html[data-theme="light"] .of-funding-row { background: #fff; border-color: #e8eaed; }

  .of-form-col .of-figma-opt { font-size: 14px; }

  @media (min-width: 1280px) {
    .of-left-col { width: 48%; }
    .of-form-col { max-width: 560px; padding: 92px 80px 80px; }
    .of-form-col--centered { padding: 44px 80px 80px; }
    .of-figma-q-title { font-size: clamp(28px, 2.9vw, 38px); }
    .of-figma-q-grouped { font-size: 16px; }
    .of-figma-q-sub { font-size: 15px; }
    .of-step-heading h2 { font-size: clamp(30px, 3.1vw, 38px); }
    .of-step-heading p { font-size: 15px; }
    .of-field-label { font-size: 11px; margin-bottom: 8px; }
    .of-field-hint { font-size: 11px; }
    .of-input { font-size: 14px; padding: 11px 15px; border-radius: 9px; }
    .of-form-col .of-figma-opt { font-size: 14px !important; padding: 14px 17px !important; }
    .of-opt-title { font-size: 14px; }
    .of-opt-desc { font-size: 12px; }
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
    .of-form-col { max-width: 600px; padding: 96px 84px 80px; }
    .of-form-col--centered { padding: 48px 84px 80px; }
    .of-step-heading { margin-bottom: 40px !important; }
    .of-figma-q-title { font-size: clamp(29px, 3vw, 40px); }
    .of-figma-q-grouped { font-size: 16px; }
    .of-figma-q-sub { font-size: 15px; }
    .of-step-heading h2 { font-size: clamp(31px, 3.2vw, 40px); }
    .of-step-heading p { font-size: 15px; }
    .of-field-label { font-size: 11px; letter-spacing: 0.5px; }
    .of-input { font-size: 14px; padding: 11px 16px; border-radius: 9px; }
    .of-form-col .of-figma-opt { font-size: 14px !important; padding: 14px 18px !important; border-radius: 10px !important; }
    .of-opt-title { font-size: 14px; }
    .of-opt-desc { font-size: 13px; }
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
    .of-form-col .of-figma-opt { font-size: 15px !important; padding: 15px 18px !important; }
    .of-opt-title { font-size: 15px; }
    .of-opt-desc { font-size: 13px; }
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
    .of-form-col .of-figma-opt { font-size: 15px !important; }
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

const SELECT_ACCENT = "var(--btn-primary-bg)";

function isLongOptionList(options: string[]): boolean {
  return options.length > 4 || options.some(opt => opt.length > 30);
}

function FigmaQuestion({
  title, subtitle, options, value, onChange, accent = SELECT_ACCENT, hint, columns, grouped = false,
}: {
  title: string; subtitle?: string; options: string[]; value: string;
  onChange: (v: string) => void; accent?: string; hint?: string; columns?: number; grouped?: boolean;
}) {
  const longList = isLongOptionList(options);
  const gridColumns = longList ? 2 : (columns ?? 2);
  const singleColumn = gridColumns === 1;
  const showSelectionIndicator = singleColumn || longList;

  return (
    <div style={{ marginBottom: grouped ? 36 : 0 }}>
      <h2 className={grouped ? "of-figma-q-grouped" : "of-figma-q-title"}>{title}</h2>
      {subtitle && <p className="of-figma-q-sub">{subtitle}</p>}
      <div style={{
        display: "grid",
        gridTemplateColumns: singleColumn ? "1fr" : "repeat(2, minmax(0, 1fr))",
        gap: 10,
        marginTop: grouped ? 14 : 28,
      }}>
        {options.map(opt => {
          const on = value === opt;
          return (
            <button
              key={opt}
              type="button"
              className={`of-figma-opt${on ? " of-figma-opt--on" : ""}`}
              onClick={() => onChange(opt)}
              style={{
                alignItems: showSelectionIndicator ? "flex-start" : undefined,
                display: showSelectionIndicator ? "flex" : undefined,
                gap: showSelectionIndicator ? 13 : undefined,
                padding: longList ? "14px 16px" : "15px 18px",
                borderRadius: 10,
                fontWeight: on ? 600 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: longList ? "left" : "center",
                lineHeight: 1.35,
                letterSpacing: "-0.1px",
              }}
            >
              {showSelectionIndicator ? (
                <div className="of-figma-opt-indicator" aria-hidden="true">
                  {on ? <div className="of-figma-opt-indicator-dot" /> : null}
                </div>
              ) : null}
              <span style={{ flex: showSelectionIndicator ? 1 : undefined, textAlign: longList ? "left" : "inherit" }}>
                {opt}
              </span>
            </button>
          );
        })}
      </div>
      {hint && value && (
        <div className="of-figma-hint">
          {hint}
        </div>
      )}
    </div>
  );
}

function FigmaDescMultiSelect({
  title, subtitle, options, selected, onToggle, accent = SELECT_ACCENT, hint, grouped = false,
}: {
  title: string; subtitle?: string;
  options: readonly { label: string; desc: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  accent?: string; hint?: string; grouped?: boolean;
}) {
  return (
    <div style={{ marginBottom: grouped ? 36 : 0 }}>
      <h2 className={grouped ? "of-figma-q-grouped" : "of-figma-q-title"}>{title}</h2>
      {subtitle && <p className="of-figma-q-sub">{subtitle}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: grouped ? 14 : 28 }}>
        {options.map(opt => {
          const on = selected.includes(opt.label);
          return (
            <button
              key={opt.label}
              type="button"
              className={`of-figma-opt${on ? " of-figma-opt--on" : ""}`}
              onClick={() => onToggle(opt.label)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 13,
                padding: "14px 16px", borderRadius: 10, textAlign: "left",
                cursor: "pointer", fontFamily: "inherit",
                background: on ? `${accent}14` : "transparent",
                border: on ? `1.5px solid ${accent}` : "1.5px solid rgba(255,255,255,0.12)",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                border: on ? `2px solid ${accent}` : "2px solid rgba(255,255,255,0.15)",
                background: on ? `${accent}33` : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {on ? <span style={{ color: accent, fontSize: 12, fontWeight: 800, lineHeight: 1 }}>✓</span> : null}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="of-opt-title" style={{ fontWeight: on ? 600 : 500, color: on ? "var(--text-1)" : "var(--panel-body)" }}>{opt.label}</div>
                <div className="of-opt-desc" style={{ color: on ? "var(--text-2)" : "#556878" }}>{opt.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
      {selected.length > 0 ? (
        <p style={{ marginTop: 16, fontSize: 13, color: "#556878" }}>
          {selected.length} region{selected.length === 1 ? "" : "s"} selected
        </p>
      ) : null}
      {hint && <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 12, lineHeight: 1.55 }}>{hint}</p>}
    </div>
  );
}

function FigmaDescQuestion({
  title, subtitle, options, value, onChange, accent = SELECT_ACCENT, hint, grouped = false,
}: {
  title: string; subtitle?: string;
  options: readonly { label: string; desc: string }[];
  value: string; onChange: (v: string) => void;
  accent?: string; hint?: string; grouped?: boolean;
}) {
  return (
    <div style={{ marginBottom: grouped ? 36 : 0 }}>
      <h2 className={grouped ? "of-figma-q-grouped" : "of-figma-q-title"}>{title}</h2>
      {subtitle && <p className="of-figma-q-sub">{subtitle}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: grouped ? 14 : 28 }}>
        {options.map(opt => {
          const on = value === opt.label;
          return (
            <button
              key={opt.label}
              type="button"
              className={`of-figma-opt${on ? " of-figma-opt--on" : ""}`}
              onClick={() => onChange(opt.label)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 13,
                padding: "14px 16px", borderRadius: 10, textAlign: "left",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <div className="of-figma-opt-indicator" aria-hidden="true">
                {on ? <div className="of-figma-opt-indicator-dot" /> : null}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="of-opt-title" style={{ fontWeight: on ? 600 : 500, color: on ? "var(--text-1)" : "var(--panel-body)" }}>{opt.label}</div>
                <div className="of-opt-desc" style={{ color: on ? "var(--text-2)" : "#556878" }}>{opt.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
      {hint && <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 12, lineHeight: 1.55 }}>{hint}</p>}
    </div>
  );
}

function FigmaMultiSelect({
  title, subtitle, options, selected, onToggle, accent = SELECT_ACCENT, max,
}: {
  title: string; subtitle?: string; options: string[]; selected: string[];
  onToggle: (v: string) => void; accent?: string; max?: number;
}) {
  const atMax = max !== undefined && selected.length >= max;
  return (
    <div>
      <h2 className="of-figma-q-title">{title}</h2>
      {subtitle && <p className="of-figma-q-sub">{subtitle}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 28 }}>
        {options.map(opt => {
          const on = selected.includes(opt);
          const disabled = !on && atMax;
          return (
            <button
              key={opt}
              type="button"
              className={`of-figma-opt${on ? " of-figma-opt--on" : ""}`}
              onClick={() => onToggle(opt)}
              disabled={disabled}
              style={{
                padding: "15px 18px",
                borderRadius: 10,
                fontWeight: on ? 600 : 400,
                cursor: disabled ? "default" : "pointer",
                fontFamily: "inherit",
                textAlign: "center",
                lineHeight: 1.35,
                background: on ? `${accent}14` : "transparent",
                border: on ? `1.5px solid ${accent}` : "1.5px solid rgba(255,255,255,0.12)",
                color: on ? "var(--text-1)" : "var(--text-2)",
                opacity: disabled ? 0.35 : 1,
                letterSpacing: "-0.1px",
              }}
            >{opt}</button>
          );
        })}
      </div>
      {selected.length > 0 && max !== undefined && (
        <p style={{ marginTop: 16, fontSize: 13, color: "#556878" }}>{selected.length} of {max} selected</p>
      )}
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
}: {
  values: Partial<Record<keyof OnboardingBenchmarkInput, string>>;
  onChange: (key: keyof OnboardingBenchmarkInput, value: string) => void;
  inputClassName?: string;
}) {
  return (
    <>
      {ONBOARDING_BENCHMARK_FIELDS.map(m => {
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
              onChange={e => onChange(m.key, e.target.value)}
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
    <div className="of-step-heading" style={{ marginBottom: 36 }}>
      <h2 style={{ fontWeight: 800, color: "var(--text-1)", margin: "0 0 10px", letterSpacing: "-0.5px", lineHeight: 1.1 }}>{meta.label}</h2>
      <p style={{ color: "#556878", margin: 0, fontWeight: 400, lineHeight: 1.5 }}>{meta.sub}</p>
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
    track[key] = answers[key] ?? "";
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

// ─── Main ────────────────────────────────────────────────────────────────────

export default function OnboardingFlow({ onComplete }: { onComplete: (answers: Answers) => void }) {
  /*
   * Short onboarding: company search → organization type.
   * Full profile questions (company details, funding, context) live in Complete Profile.
   * Catalog fields from company search are passed through for silent prefill in-app.
   */
  type EntryPhase = "org" | "identity";
  const [entryPhase, setEntryPhase] = useState<EntryPhase>("org");

  const [companyQuery, setCompanyQuery] = useState("Patriot Pay");
  const [searchState, setSearchState] = useState<"idle" | "searching" | "ready">("idle");
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    company:"", whatTheyDo:"", businessModel:"",
    industry:"", founded:"", city:"", stateRegion:"", country:"",
    website:"", linkedin:"", additionalContext:"",
    productDescription:"", approxHeadcount:"",
  });
  const [fundingRounds, setFundingRounds] = useState<FundingRound[]>([]);
  const [identityErrors, setIdentityErrors] = useState<{ businessModel?: string }>({});
  const [theme, setTheme] = useState<FuelTheme>(() => readFuelTheme());

  const [answers] = useState<Answers>(() => ({
    ...emptyOnboardingTrackAnswers(),
    profileProductDescription: "",
    profileApproxHeadcount: "",
    arr:"", arrGrowth:"", nrr:"", logoRetention:"", grossMargin:"",
    cacPayback:"", burnMultiple:"", ruleOf40:"",
    monthlyBurn:"", cashOnHand:"", headcount:"", payingCustomers:"",
    investCheckSize:"", investGeography:[], investPipeline:"",
    profileSetupComplete: false,
  }));

  useEffect(() => {
    applyFuelTheme(theme);
  }, [theme]);

  function loadCompanyProfile(record: CompanyRecord) {
    setSearchState("searching");
    setCompanyQuery(record.name);
    setTimeout(() => {
      setProfileForm(prev => ({
        company: record.name,
        whatTheyDo: record.whatTheyDo,
        businessModel: prev.businessModel || normalizeBusinessModel(record.businessModel),
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
      setSearchState("ready");
      setEntryPhase("identity");
    }, 1600);
  }

  function trySelectCompanyFromQuery() {
    const match = findCompanyByQuery(companyQuery);
    if (match) loadCompanyProfile(match);
  }

  function finishOnboarding() {
    try {
      window.localStorage.setItem("fuel-investor-hubspot-connected", "false");
    } catch { /* ignore */ }
    onComplete({
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
        : "",
      userFullName: "",
      userRole: "",
      profileSetupComplete: false,
      hubspotConnected: false,
    });
  }

  function validateIdentity() {
    const e: { businessModel?: string } = {};
    if (!profileForm.businessModel) e.businessModel = "Choose an organization type to continue.";
    setIdentityErrors(e);
    return Object.keys(e).length === 0;
  }

  function canAdvanceOrg() {
    if (searchState === "searching") return false;
    if (searchState === "ready") return true;
    return !!findCompanyByQuery(companyQuery);
  }

  function canAdvanceIdentity() {
    return !!profileForm.businessModel;
  }

  function next() {
    if (entryPhase === "org") {
      if (searchState === "idle") {
        trySelectCompanyFromQuery();
        return;
      }
      if (searchState === "ready") setEntryPhase("identity");
      return;
    }
    if (!validateIdentity()) return;
    finishOnboarding();
  }

  function back() {
    if (entryPhase === "identity") {
      setEntryPhase("org");
      setSearchState("idle");
    }
  }

  const companyName = profileForm.company || companyQuery || "your company";
  const isCenteredView = entryPhase === "org";
  const progressPct = entryPhase === "org" ? (searchState === "ready" ? 50 : 25) : 100;
  const stepLabel = entryPhase === "org" ? "Step 1 of 2" : "Step 2 of 2";
  const orgReady = entryPhase === "org" ? canAdvanceOrg() : canAdvanceIdentity();

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [entryPhase, searchState]);

  const motionSearchState = entryPhase === "identity" || searchState === "ready"
    ? "review" as const
    : searchState;

  return (
    <>
      <style>{css}</style>
      <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex" }}>
        <div className="of-shell">

          <div className="of-left-col" style={{ display:"flex", flexDirection:"column", position:"relative" }}>

            <div className="of-brand-bar">
              <div className="of-brand-mark">
                <div className="of-brand-logo">F</div>
                <span className="of-brand-name">Fuel</span>
                <span className="of-brand-sub">by York IE</span>
              </div>
              <button
                type="button"
                className="of-theme-toggle"
                onClick={() => setTheme(prev => toggleFuelTheme(prev))}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                <FuelIcon name={theme === "dark" ? "appearanceLight" : "appearanceDark"} size={14} />
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
            </div>

            <div
              ref={scrollRef}
              style={{
                flex: 1, overflowY: "auto", display: "flex",
                alignItems: isCenteredView ? "center" : "flex-start",
                justifyContent: "center", minHeight: 0,
              }}
            >
              <div className={`of-form-col${isCenteredView ? " of-form-col--centered" : ""}`}>
                <div className="of-step" key={`${entryPhase}-${searchState}`}>

                  {entryPhase === "org" && (
                    <div>
                      {searchState === "idle" && (
                        <div>
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.22)",
                            borderRadius: 999, padding: "5px 12px", marginBottom: 18,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--btn-primary-bg)" }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--btn-primary-bg)", letterSpacing: "0.02em" }}>{stepLabel}</span>
                          </div>
                          <h2 className="of-figma-q-title" style={{ marginBottom: 12 }}>
                            Let's build your intelligence workspace.
                          </h2>
                          <p className="of-figma-q-sub" style={{ margin: "0 0 28px" }}>
                            Search for your company — Fuel pulls your profile, funding history, and cohort data from public signals to give you a head start.
                          </p>
                          <CompanySearch
                            value={companyQuery}
                            onChange={v => setCompanyQuery(v)}
                            onSelect={loadCompanyProfile}
                          />
                          <p style={{ fontSize:12, color:"#3A4F5E", marginTop:14, lineHeight:1.55 }}>
                            Pick a match from the list, or continue with your entry if you don't see it.
                          </p>
                        </div>
                      )}

                      {searchState === "searching" && (
                        <div style={{ padding:"48px 0", textAlign:"center" }}>
                          <div style={{ position:"relative", width:80, height:80, margin:"0 auto 24px" }}>
                            <div className="of-spin" style={{ width:80, height:80, borderRadius:"50%", border:"3px solid rgba(61,214,140,0.1)", borderTop:"3px solid var(--btn-primary-bg)", position:"absolute" }} />
                            <div className="of-spin" style={{ width:56, height:56, borderRadius:"50%", border:"2px solid rgba(61,214,140,0.06)", borderBottom:"2px solid rgba(61,214,140,0.4)", position:"absolute", top:12, left:12, animationDirection:"reverse", animationDuration:"0.65s" }} />
                          </div>
                          <div style={{ fontSize:17, fontWeight:700, color:"var(--text-1)", marginBottom:6 }}>Analysing {companyQuery}…</div>
                          <div style={{ fontSize:13, color:"#556878" }}>Pulling funding history, team signals, and cohort benchmarks</div>
                        </div>
                      )}
                    </div>
                  )}

                  {entryPhase === "identity" && (
                    <div className="of-identity of-step">
                      <div className="of-identity-step-pill">
                        <span className="of-identity-step-pill-dot" aria-hidden="true" />
                        <span className="of-identity-step-pill-label">{stepLabel}</span>
                      </div>
                      <h2 className="of-figma-q-title">
                        What type of organization is {companyName}?
                      </h2>
                      <p className="of-figma-q-sub">
                        Fuel uses this to configure the right intelligence tracks, benchmarks, and scoring model for your workspace. You&apos;ll confirm company details in Complete Profile next.
                      </p>

                      <div className="of-org-type-section">
                        <div className="of-org-type-label">Organization type <span className="of-org-type-required" aria-hidden="true">*</span></div>
                        <div className="of-org-type-grid" role="radiogroup" aria-label="Organization type">
                          {BUSINESS_MODELS.map(model => {
                            const selected = profileForm.businessModel === model.label;
                            return (
                              <button
                                key={model.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                className={`of-org-type-option${selected ? " is-selected" : ""}`}
                                onClick={() => {
                                  setProfileForm(prev => ({ ...prev, businessModel: model.label }));
                                  if (identityErrors.businessModel) {
                                    setIdentityErrors(prev => ({ ...prev, businessModel: undefined }));
                                  }
                                }}
                              >
                                <span className="of-org-type-radio" aria-hidden="true">
                                  {selected ? <span className="of-org-type-radio-dot" /> : null}
                                </span>
                                <span className="of-org-type-copy">
                                  <strong>{model.label}</strong>
                                  <small>{model.desc}</small>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {identityErrors.businessModel ? (
                          <p className="of-identity-error" role="alert">{identityErrors.businessModel}</p>
                        ) : null}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            <div className="of-footer">
              <div className="of-footer-left">
                {entryPhase === "identity" && (
                  <button type="button" className="fuel-cta fuel-cta--tertiary of-cta-tertiary of-back" onClick={back} aria-label="Back">←</button>
                )}
                <div className="of-progress-track">
                  <div className="of-progress-fill" style={{ width:`${progressPct}%` }} />
                </div>
                <span className="of-progress-label">{entryPhase === "org" ? "1 / 2" : "2 / 2"}</span>
              </div>

              <div className="of-footer-right">
                <button
                  type="button"
                  className="fuel-cta fuel-cta--primary of-cta-primary"
                  onClick={next}
                  disabled={!orgReady}
                >
                  {entryPhase === "org" ? "Next →" : "Open my dashboard →"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ flex:1, background:"linear-gradient(175deg, #EEF8F5 0%, #D8F0EA 45%, #C8E8DF 100%)", overflow:"hidden", position:"relative" }}>
            <div className="of-motion-scale-inner of-step" key={`g-${entryPhase}-${searchState}-${companyName}`}>
              <ProfileMotion
                searchState={motionSearchState}
                form={profileForm}
                companyQuery={companyQuery}
                isInvestor={INVESTOR_MODELS.includes(profileForm.businessModel)}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
