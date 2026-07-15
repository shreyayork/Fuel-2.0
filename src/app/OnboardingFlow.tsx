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
  type OnboardingTrackAnswers,
} from "./trackQuestions.ts";

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
  arr: string; arrGrowth: string; nrr: string; logoRetention: string;
  grossMargin: string; cacPayback: string; burnMultiple: string; ruleOf40: string;
  monthlyBurn: string; cashOnHand: string;
  headcount: string; payingCustomers: string;
  investCheckSize: string; investGeography: string[]; investPipeline: string;
  hubspotConnected?: boolean;
}

const STEPS_DEFAULT: StepId[] = ["profile", "development", "gtm", "revops", "benchmarking"];
const STEPS_INVESTOR_BASE: StepId[] = ["profile", "investment"];
const STEPS_INVESTOR_WITH_HUBSPOT: StepId[] = ["profile", "investment", "hubspot"];

function investorActiveSteps(investPipeline: string): StepId[] {
  return investPipeline === "HubSpot" ? STEPS_INVESTOR_WITH_HUBSPOT : STEPS_INVESTOR_BASE;
}
export const INVESTOR_MODELS = ["Investment firm", "Services or agency"];

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
  "Software / SaaS": "Product company",
  "SaaS / Software product": "Product company",
  "Venture / PE fund": "Investment firm",
  "Agency": "Services or agency",
  "Consultancy": "Services or agency",
  "Services / Agency": "Services or agency",
  "Advisory / Consultancy": "Services or agency",
  "Operating + investment firm": "Investment firm",
  "Other": "Product company",
};

const BUSINESS_MODELS = [
  { id: "product",   label: "Product company",             desc: "SaaS, marketplace, or app with recurring or transactional revenue." },
  { id: "services",  label: "Services or agency",          desc: "Project, retainer, or advisory-based revenue." },
  { id: "invest",    label: "Investment firm",             desc: "Fund or holding company managing a portfolio." },
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
  development:  { label: "Development",   sub: "Product & engineering" },
  gtm:          { label: "Go-to-market",  sub: "Sales & growth" },
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
    businessModel: "Product company", industry: "FinTech · Payments Infrastructure",
    founded: "2021", city: "Boston", stateRegion: "MA", country: "United States",
    linkedin: "https://linkedin.com/company/patriotpay",
    funding: [{ type: "Seed", amount: "$4.2M" }],
  },
  {
    id: "ramp", name: "Ramp", domain: "ramp.com",
    whatTheyDo: "Ramp is a finance automation platform helping businesses spend less and save more through corporate cards and expense management.",
    businessModel: "Product company", industry: "FinTech · Spend Management",
    founded: "2019", city: "New York", stateRegion: "NY", country: "United States",
    linkedin: "https://linkedin.com/company/ramp",
    funding: [{ type: "Series D", amount: "$300M" }],
  },
  {
    id: "mercury", name: "Mercury", domain: "mercury.com",
    whatTheyDo: "Mercury provides banking for startups — accounts, cards, and treasury tools built for venture-backed companies.",
    businessModel: "Product company", industry: "FinTech · Banking",
    founded: "2017", city: "San Francisco", stateRegion: "CA", country: "United States",
    linkedin: "https://linkedin.com/company/mercuryhq",
    funding: [{ type: "Series B", amount: "$120M" }],
  },
  {
    id: "deel", name: "Deel", domain: "deel.com",
    whatTheyDo: "Deel is a global HR platform for hiring, paying, and managing international teams and contractors.",
    businessModel: "Product company", industry: "HR Tech · Global Payroll",
    founded: "2019", city: "San Francisco", stateRegion: "CA", country: "United States",
    linkedin: "https://linkedin.com/company/deel",
    funding: [{ type: "Series D", amount: "$50M" }],
  },
  {
    id: "vanta", name: "Vanta", domain: "vanta.com",
    whatTheyDo: "Vanta automates security and compliance monitoring for SOC 2, ISO 27001, HIPAA, and more.",
    businessModel: "Product company", industry: "Security · Compliance",
    founded: "2018", city: "San Francisco", stateRegion: "CA", country: "United States",
    linkedin: "https://linkedin.com/company/vanta-security",
    funding: [{ type: "Series B", amount: "$150M" }],
  },
  {
    id: "nexus-ai", name: "Nexus AI", domain: "nexusai.io",
    whatTheyDo: "Nexus AI builds vertical AI agents for operations teams in regulated industries.",
    businessModel: "Product company", industry: "AI · Enterprise Software",
    founded: "2022", city: "Boston", stateRegion: "MA", country: "United States",
    linkedin: "https://linkedin.com/company/nexusai",
    funding: [{ type: "Seed", amount: "$6.5M" }],
  },
  {
    id: "york-growth", name: "York IE", domain: "yorkiegrowth.io",
    whatTheyDo: "York IE is an operating and investment firm partnering with early-stage B2B software companies.",
    businessModel: "Investment firm", industry: "Venture · Value Creation",
    founded: "2015", city: "Manchester", stateRegion: "NH", country: "United States",
    linkedin: "https://linkedin.com/company/york-ie",
    funding: [{ type: "Series A", amount: "Undisclosed" }],
  },
  {
    id: "stripe", name: "Stripe", domain: "stripe.com",
    whatTheyDo: "Stripe builds economic infrastructure for the internet — payments, billing, and financial tools for businesses of all sizes.",
    businessModel: "Product company", industry: "FinTech · Payments",
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
          background: "#172632", border: "1px solid rgba(255,255,255,0.1)",
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
                background: "linear-gradient(135deg, #1E4D8C, #2BB8A0)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color: "#fff",
              }}>{c.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F2F5F2" }}>{c.name}</div>
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
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: #F2F5F2;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  .of-input:focus { border-color: rgba(61,214,140,0.4) !important; outline: none; }

  .of-chip { transition: all 0.15s; }
  .of-chip:hover { border-color: rgba(255,255,255,0.2) !important; color: #F2F5F2 !important; }

  .of-figma-opt { transition: all 0.15s ease; }
  .of-figma-opt:hover { border-color: rgba(255,255,255,0.22) !important; color: #F2F5F2 !important; background: rgba(255,255,255,0.03) !important; }
  .of-figma-opt--on:hover { border-color: #3DD68C !important; background: rgba(61,214,140,0.08) !important; color: #F2F5F2 !important; }

  .of-figma-q-title { font-size: clamp(26px, 2.8vw, 36px); font-weight: 800; color: #F2F5F2; margin: 0; letter-spacing: -0.5px; line-height: 1.12; }
  .of-figma-q-grouped { font-size: clamp(15px, 2vw, 16px); font-weight: 500; color: #8FA99A; margin: 0; line-height: 1.5; }
  .of-figma-q-sub { font-size: clamp(13px, 1.8vw, 15px); color: #556878; margin: 12px 0 0; line-height: 1.55; }
  .of-step-heading h2 { font-size: clamp(28px, 3vw, 36px); }
  .of-step-heading p { font-size: clamp(13px, 1.8vw, 15px); }

  .of-add-round:hover { border-color: rgba(255,255,255,0.2) !important; color: #8FA99A !important; }

  .of-back:hover { color: #8FA99A !important; }

  .of-suggest-item:hover { background: rgba(61,214,140,0.08) !important; }

  .of-left-col { width: 50%; min-width: 0; }
  .of-form-col {
    width: 100%;
    max-width: 520px;
    padding: 88px 72px 100px;
    box-sizing: border-box;
  }
  .of-form-col--centered { padding: 40px 72px 96px; }

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
    color: #8FA99A;
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
    color: #8FA99A;
    line-height: 1.65;
    font-style: italic;
  }

  .of-form-col .of-figma-opt { font-size: 14px; }

  @media (min-width: 1280px) {
    .of-left-col { width: 48%; }
    .of-form-col { max-width: 560px; padding: 92px 80px 104px; }
    .of-form-col--centered { padding: 44px 80px 100px; }
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
    .of-form-col { max-width: 600px; padding: 96px 84px 108px; }
    .of-form-col--centered { padding: 48px 84px 104px; }
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
    .of-form-col { max-width: 620px; padding: 100px 88px 112px; }
    .of-form-col--centered { padding: 52px 88px 108px; }
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
    .of-form-col { max-width: 640px; padding: 104px 92px 116px; }
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

const SELECT_ACCENT = "#3DD68C";

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
                padding: longList ? "14px 16px" : "15px 18px",
                borderRadius: 10,
                fontWeight: on ? 600 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: longList ? "left" : "center",
                lineHeight: 1.35,
                background: on ? `${accent}14` : "transparent",
                border: on ? `1.5px solid ${accent}` : "1.5px solid rgba(255,255,255,0.12)",
                color: on ? "#F2F5F2" : "#8FA99A",
                letterSpacing: "-0.1px",
              }}
            >{opt}</button>
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
                <div className="of-opt-title" style={{ fontWeight: on ? 600 : 500, color: on ? "#F2F5F2" : "#C8D4CE" }}>{opt.label}</div>
                <div className="of-opt-desc" style={{ color: on ? "#8FA99A" : "#556878" }}>{opt.desc}</div>
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
      {hint && <p style={{ fontSize: 12, color: "#8FA99A", marginTop: 12, lineHeight: 1.55 }}>{hint}</p>}
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
                background: on ? `${accent}14` : "transparent",
                border: on ? `1.5px solid ${accent}` : "1.5px solid rgba(255,255,255,0.12)",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                border: on ? `2px solid ${accent}` : "2px solid rgba(255,255,255,0.15)",
                background: on ? `${accent}33` : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {on && <div style={{ width: 7, height: 7, borderRadius: "50%", background: accent }} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="of-opt-title" style={{ fontWeight: on ? 600 : 500, color: on ? "#F2F5F2" : "#C8D4CE" }}>{opt.label}</div>
                <div className="of-opt-desc" style={{ color: on ? "#8FA99A" : "#556878" }}>{opt.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
      {hint && <p style={{ fontSize: 12, color: "#8FA99A", marginTop: 12, lineHeight: 1.55 }}>{hint}</p>}
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
                color: on ? "#F2F5F2" : "#8FA99A",
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
    return "#3DD68C";
  }
  if (val < p25) return "#E56B6B";
  if (val < p50) return "#D4924A";
  return "#3DD68C";
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
              <label style={{ fontSize: 11, fontWeight: 700, color: "#8FA99A", textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</label>
            </div>
            <input
              className={inputClassName}
              value={raw}
              onChange={e => onChange(m.key, e.target.value)}
              placeholder={m.ph}
              style={{ ...inp, padding: "8px 12px", fontSize: 13, marginBottom: 7, borderColor: hasVal ? `${dc}55` : undefined, transition: "border-color 0.3s" }}
            />
            <div style={{ position: "relative", height: 7, background: "rgba(255,255,255,0.04)", borderRadius: 4 }}>
              <div style={{ position: "absolute", left: `${p25pct}%`, top: 0, width: `${p75pct - p25pct}%`, height: "100%", background: "rgba(61,214,140,0.28)", borderRadius: 2 }} />
              <div style={{ position: "absolute", left: `${p25pct}%`, top: 0, width: 1, height: "100%", background: "rgba(61,214,140,0.3)" }} />
              <div style={{ position: "absolute", left: `${p75pct}%`, top: 0, width: 1, height: "100%", background: "rgba(61,214,140,0.45)" }} />
              {dotPct !== null ? (
                <div style={{
                  position: "absolute", top: -5, zIndex: 2,
                  left: `calc(${dotPct}% - 8px)`,
                  width: 17, height: 17, borderRadius: "50%",
                  background: dc, border: "2px solid #0F1E2B",
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
      <h2 style={{ fontWeight: 800, color: "#F2F5F2", margin: "0 0 10px", letterSpacing: "-0.5px", lineHeight: 1.1 }}>{meta.label}</h2>
      <p style={{ color: "#556878", margin: 0, fontWeight: 400, lineHeight: 1.5 }}>{meta.sub}</p>
    </div>
  );
}

function normalizeBusinessModel(label: string): string {
  return LEGACY_BUSINESS_MODELS[label] ?? label;
}

export type OnboardingFlowAnswers = Answers;

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
    productDescription: answers.profileProductDescription,
    approxHeadcount: answers.profileApproxHeadcount || answers.headcount,
  });
}

export function isInvestorPersona(answers: OnboardingFlowAnswers | null | undefined): boolean {
  return INVESTOR_MODELS.includes(answers?.profileBusinessModel ?? "");
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function OnboardingFlow({ onComplete }: { onComplete: (answers: Answers) => void }) {
  const [stepIndex, setStepIndex] = useState(0);

  const [companyQuery, setCompanyQuery] = useState("Patriot Pay");
  const [searchState, setSearchState] = useState<"idle" | "searching" | "review">("idle");
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    company:"", whatTheyDo:"", businessModel:"",
    industry:"", founded:"", city:"", stateRegion:"", country:"",
    website:"", linkedin:"", additionalContext:"",
    productDescription:"", approxHeadcount:"",
  });
  const [fundingRounds, setFundingRounds] = useState<FundingRound[]>([]);

  const [answers, setAnswers] = useState<Answers>(() => ({
    ...emptyOnboardingTrackAnswers(),
    profileProductDescription: "",
    profileApproxHeadcount: "",
    arr:"", arrGrowth:"", nrr:"", logoRetention:"", grossMargin:"",
    cacPayback:"", burnMultiple:"", ruleOf40:"",
    monthlyBurn:"", cashOnHand:"", headcount:"", payingCustomers:"",
    investCheckSize:"", investGeography:[], investPipeline:"",
  }));
  const [investStages, setInvestStages] = useState<string[]>([]);
  const [investSectors, setInvestSectors] = useState<string[]>([]);
  const [investQ, setInvestQ] = useState(0);
  const [hubspotStatus, setHubspotStatus] = useState<HubSpotStatus>("pending");
  const [benchmarkGenerating, setBenchmarkGenerating] = useState(false);
  const [benchmarkSummaryReady, setBenchmarkSummaryReady] = useState(false);

  const filledBenchmarkCount = useMemo(
    () => ONBOARDING_BENCHMARK_FIELDS.filter(m => parseVal(answers[m.key as keyof Answers] || "") !== null).length,
    [answers],
  );
  const allBenchmarkFilled = filledBenchmarkCount === ONBOARDING_BENCHMARK_FIELDS.length;

  const isInvestor = INVESTOR_MODELS.includes(profileForm.businessModel);
  const activeSteps = useMemo<StepId[]>(
    () => (isInvestor ? investorActiveSteps(answers.investPipeline) : STEPS_DEFAULT),
    [isInvestor, answers.investPipeline],
  );

  const stepId = activeSteps[stepIndex];
  const isLast = stepIndex === activeSteps.length - 1;
  const showConnectLater = stepId === "hubspot" && hubspotStatus !== "connected";

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

  function setPF(k:keyof ProfileForm, v:string) { setProfileForm(p=>({...p,[k]:v})); }
  function setAns(k:keyof Answers, v:string) { setAnswers(p=>({...p,[k]:v})); }

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
      setSearchState("review");
    }, 1600);
  }

  function trySelectCompanyFromQuery() {
    const match = findCompanyByQuery(companyQuery);
    if (match) loadCompanyProfile(match);
  }

  function addRound() { setFundingRounds(p=>[...p,{id:rid(),type:"Seed",amount:"",date:"",investors:""}]); }
  function updateRound(id:string,k:keyof FundingRound,v:string) { setFundingRounds(p=>p.map(r=>r.id===id?{...r,[k]:v}:r)); }
  function removeRound(id:string) { setFundingRounds(p=>p.filter(r=>r.id!==id)); }

  function connectHubSpot() {
    if (hubspotStatus !== "pending") return;
    setHubspotStatus("connecting");
    setTimeout(() => setHubspotStatus("connected"), 1800);
  }

  function canAdvance() {
    if (stepId==="profile") {
      if (searchState === "idle") return !!findCompanyByQuery(companyQuery);
      if (searchState === "searching") return false;
      return searchState === "review" && !!profileForm.company && !!profileForm.businessModel;
    }
    if (stepId==="development") {
      return !!(answers.dev_product_stage && answers.dev_product_type && answers.dev_delivery_constraint);
    }
    if (stepId==="gtm") {
      return !!(answers.mkt_sales_motion && answers.mkt_funnel_gap && answers.mkt_icp_clarity && answers.mkt_revenue_tracking);
    }
    if (stepId==="revops") {
      return !!(answers.rev_runway && answers.rev_finance_management && answers.rev_capital_priority);
    }
    if (stepId==="investment") {
      if (investQ===0) return investStages.length > 0;
      if (investQ===1) return investSectors.length > 0;
      if (investQ===2) return !!answers.investCheckSize;
      if (investQ===3) return answers.investGeography.length > 0;
      if (investQ===4) return !!answers.investPipeline;
    }
    if (stepId === "benchmarking" && allBenchmarkFilled && benchmarkGenerating) return false;
    if (stepId === "hubspot") return hubspotStatus === "connected";
    return true;
  }

  function finishOnboarding() {
    const connected = hubspotStatus === "connected";
    try {
      window.localStorage.setItem("fuel-investor-hubspot-connected", connected ? "true" : "false");
    } catch { /* ignore */ }
    onComplete({
      ...answers,
      profileProductDescription: profileForm.productDescription || profileForm.whatTheyDo,
      profileApproxHeadcount: profileForm.approxHeadcount || answers.headcount,
      profileBusinessModel: profileForm.businessModel,
      profileCompany: profileForm.company,
      hubspotConnected: connected,
    });
  }

  function skipConnectors() {
    finishOnboarding();
  }

  function next() {
    if (stepId === "profile" && searchState === "idle") {
      trySelectCompanyFromQuery();
      return;
    }
    if (stepId==="investment" && investQ < 4) { setInvestQ(q=>q+1); return; }
    if (stepId==="investment") setInvestQ(0);
    if (isLast) { finishOnboarding(); return; }
    setStepIndex(i=>i+1);
  }

  function back() {
    if (stepId === "profile") {
      if (searchState === "review") { setSearchState("idle"); return; }
    }
    if (stepId==="investment" && investQ > 0) { setInvestQ(q=>q-1); return; }
    if (activeSteps[stepIndex-1]==="investment") setInvestQ(4);
    setStepIndex(i=>Math.max(0,i-1));
  }

  const showBack = stepIndex > 0
    || (stepId === "investment" && investQ > 0)
    || (stepId === "profile" && searchState === "review");

  const companyName = profileForm.company || companyQuery || "your company";

  const currentSubQ = stepId === "investment" ? investQ : 0;
  const isTopAligned =
    stepId === "development" ||
    stepId === "gtm" ||
    stepId === "revops" ||
    (stepId === "profile" && searchState === "review") ||
    stepId === "benchmarking";
  const isCenteredView = !isTopAligned && (
    (stepId === "profile" && searchState !== "review")
    || stepId === "investment"
    || stepId === "hubspot"
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [stepId, searchState, currentSubQ]);

  const rightPanel: Record<StepId, React.ReactNode> = {
    profile:     <ProfileMotion searchState={searchState} form={profileForm} companyQuery={companyQuery} isInvestor={isInvestor} />,
    development: <DevMotion answers={answers} companyName={companyName} />,
    gtm:         <GtmMotion answers={answers} companyName={companyName} />,
    revops:      <RevopsMotion answers={answers} companyName={companyName} />,
    investment:  <InvestmentMotion
      investQ={currentSubQ}
      stages={investStages}
      sectors={investSectors}
      checkSize={answers.investCheckSize}
      geography={answers.investGeography}
      pipeline={answers.investPipeline}
      companyName={companyName}
    />,
    benchmarking:<BenchmarkMotion
      answers={answers}
      cohortLabel={profileForm.industry || "FinTech SaaS · Seed"}
      companyName={companyName}
      allMetricsFilled={allBenchmarkFilled}
      filledCount={filledBenchmarkCount}
      totalCount={ONBOARDING_BENCHMARK_FIELDS.length}
      isGenerating={benchmarkGenerating}
      summaryReady={benchmarkSummaryReady}
    />,
    hubspot:     <HubSpotMotion status={hubspotStatus} companyName={companyName} />,
    sources:     null,
  };

  // Progress accounts for sub-questions within multi-part steps
  const totalUnits = activeSteps.reduce((n, s) => n + (SUB_Q_COUNT[s] ?? 1), 0);
  const doneUnits = activeSteps.slice(0, stepIndex).reduce((n, s) => n + (SUB_Q_COUNT[s] ?? 1), 0)
    + currentSubQ;
  const progressPct = Math.round((doneUnits / Math.max(totalUnits - 1, 1)) * 100);

  return (
    <>
      <style>{css}</style>
      <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex" }}>
        <div style={{ width:"100vw", height:"100vh", background:"#0C1A25", display:"flex", fontFamily:"Inter, -apple-system, sans-serif" }}>

          {/* ── LEFT ── */}
          <div className="of-left-col" style={{ display:"flex", flexDirection:"column", position:"relative" }}>

            {/* Logo — top left */}
            <div style={{ position:"absolute", top:28, left:48, display:"flex", alignItems:"center", gap:8, zIndex:2 }}>
              <div style={{ width:24, height:24, borderRadius:6, background:"linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#0a1a12" }}>F</div>
              <span style={{ fontSize:13, fontWeight:700, color:"#F2F5F2", letterSpacing:"-0.2px" }}>Fuel</span>
              <span style={{ fontSize:11, color:"#2A3D4E" }}>by York IE</span>
            </div>

            {/* Scrollable content */}
            <div
              ref={scrollRef}
              style={{
                flex: 1, overflowY: "auto", display: "flex",
                alignItems: isCenteredView ? "center" : "flex-start",
                justifyContent: "center", minHeight: 0,
              }}
            >
              <div className={`of-form-col${isCenteredView ? " of-form-col--centered" : ""}`}>
                <div className="of-step" key={`${stepId}-${currentSubQ}-${searchState}`}>

                  {/* PROFILE */}
                  {stepId==="profile" && (
                    <div>
                      {searchState==="idle" && (
                        <div>
                          <h2 className="of-figma-q-title" style={{ marginBottom: 12 }}>
                            Which company is this workspace for?
                          </h2>
                          <p className="of-figma-q-sub" style={{ margin: "0 0 28px" }}>
                            Search by name — Fuel pulls your profile, funding history, and cohort match from public signals.
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

                      {searchState==="searching" && (
                        <div style={{ padding:"48px 0", textAlign:"center" }}>
                          <div style={{ position:"relative", width:80, height:80, margin:"0 auto 24px" }}>
                            <div className="of-spin" style={{ width:80, height:80, borderRadius:"50%", border:"3px solid rgba(61,214,140,0.1)", borderTop:"3px solid #3DD68C", position:"absolute" }} />
                            <div className="of-spin" style={{ width:56, height:56, borderRadius:"50%", border:"2px solid rgba(61,214,140,0.06)", borderBottom:"2px solid rgba(61,214,140,0.4)", position:"absolute", top:12, left:12, animationDirection:"reverse", animationDuration:"0.65s" }} />
                          </div>
                          <div style={{ fontSize:17, fontWeight:700, color:"#F2F5F2", marginBottom:6 }}>Building {companyQuery}'s profile…</div>
                          <div style={{ fontSize:13, color:"#556878" }}>Pulling Crunchbase, LinkedIn, funding, and cohort signals</div>
                        </div>
                      )}

                      {searchState==="review" && (
                        <div>
                          <div style={{ marginBottom:24 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                              <div className="of-pulse" style={{ width:8, height:8, borderRadius:"50%", background:"#3DD68C" }} />
                              <span style={{ fontSize:11, fontWeight:700, color:"#3DD68C", textTransform:"uppercase", letterSpacing:"0.5px" }}>Profile ready</span>
                            </div>
                            <h2 style={{ fontSize:34, fontWeight:800, color:"#F2F5F2", margin:"0 0 8px", letterSpacing:"-0.4px", lineHeight:1.15 }}>Review your {profileForm.company} profile.</h2>
                            <p style={{ fontSize:15, color:"#556878", margin:0, lineHeight:1.6 }}>The more accurate this is, the tighter your peer cohort. Garbage in, garbage out.</p>
                          </div>

                          <Field label="Company" required>
                            <input className="of-input" value={profileForm.company} onChange={e=>setPF("company",e.target.value)} style={inp} />
                          </Field>

                          <Field label="What they do" required hint="1–3 sentences for intelligence and playbooks">
                            <textarea className="of-input" value={profileForm.whatTheyDo} onChange={e=>setPF("whatTheyDo",e.target.value)} rows={3} style={{ ...inp, resize:"vertical", lineHeight:1.65 }} />
                          </Field>

                          <Field label="Product description" hint="Website + Crunchbase — add wedge, ICP nuance, and why you win">
                            <textarea className="of-input" value={profileForm.productDescription} onChange={e=>setPF("productDescription",e.target.value)} rows={3} placeholder="What you build, who it's for, and what makes you different." style={{ ...inp, resize:"vertical", lineHeight:1.65 }} />
                          </Field>

                          <Field label="Approx headcount (FTE)" hint="Prefilled from LinkedIn when available — confirm if needed">
                            <input className="of-input" value={profileForm.approxHeadcount} onChange={e=>setPF("approxHeadcount",e.target.value)} placeholder="e.g. 18" style={inp} />
                          </Field>

                          <div style={{ marginBottom:20 }}>
                            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#8FA99A", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:9 }}>
                              Organization type<span style={{ color:"#E56B6B", marginLeft:3 }}>*</span>
                            </label>
                            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                              {BUSINESS_MODELS.map(bm=>{
                                const on = profileForm.businessModel===bm.label;
                                return (
                                  <button key={bm.id} type="button" className={`of-figma-opt${on ? " of-figma-opt--on" : ""}`} onClick={()=>setPF("businessModel",bm.label)} style={{ display:"flex", alignItems:"flex-start", gap:13, padding:"14px 16px", borderRadius:10, textAlign:"left", background: on ? `${SELECT_ACCENT}14` : "transparent", border: on ? `1.5px solid ${SELECT_ACCENT}` : "1.5px solid rgba(255,255,255,0.12)", cursor:"pointer", fontFamily:"inherit" }}>
                                    <div style={{ width:18, height:18, borderRadius:"50%", flexShrink:0, marginTop:1, border: on ? `2px solid ${SELECT_ACCENT}` : "2px solid rgba(255,255,255,0.15)", background: on ? `${SELECT_ACCENT}33` : "transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                      {on && <div style={{ width:7, height:7, borderRadius:"50%", background:SELECT_ACCENT }} />}
                                    </div>
                                    <div>
                                      <div style={{ fontSize:13, fontWeight:700, color: on?"#F2F5F2":"#8FA99A", marginBottom:2 }}>{bm.label}</div>
                                      <div style={{ fontSize:12, color:"#3A4F5E", lineHeight:1.5 }}>{bm.desc}</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <Field label="Industry" required hint="From homepage positioning">
                            <input className="of-input" value={profileForm.industry} onChange={e=>setPF("industry",e.target.value)} style={inp} />
                          </Field>

                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                            <Field label="Founded" required>
                              <input className="of-input" value={profileForm.founded} onChange={e=>setPF("founded",e.target.value)} placeholder="2021" style={inp} />
                            </Field>
                            <Field label="City" required>
                              <input className="of-input" value={profileForm.city} onChange={e=>setPF("city",e.target.value)} placeholder="Boston" style={inp} />
                            </Field>
                            <Field label="State / Region" required>
                              <input className="of-input" value={profileForm.stateRegion} onChange={e=>setPF("stateRegion",e.target.value)} placeholder="MA" style={inp} />
                            </Field>
                            <Field label="Country" required>
                              <input className="of-input" value={profileForm.country} onChange={e=>setPF("country",e.target.value)} placeholder="United States" style={inp} />
                            </Field>
                          </div>

                          <Field label="Website" required hint="From domain extension">
                            <input className="of-input" value={profileForm.website} onChange={e=>setPF("website",e.target.value)} style={inp} />
                          </Field>

                          <Field label="LinkedIn">
                            <input className="of-input" value={profileForm.linkedin} onChange={e=>setPF("linkedin",e.target.value)} placeholder="https://linkedin.com/company/patriotpay" style={inp} />
                          </Field>

                          {/* Funding rounds */}
                          <div style={{ marginBottom:20 }}>
                            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#8FA99A", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:9 }}>Funding history</label>
                            <p style={{ fontSize:12, color:"#556878", margin:"0 0 10px", lineHeight:1.55 }}>From Crunchbase — confirm rounds, amounts, and dates. No need to re-enter if this looks right.</p>
                            {fundingRounds.length>0 && (
                              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:8 }}>
                                {fundingRounds.map(r=>(
                                  <div key={r.id} style={{ background:"#1A2D3F", border:"1px solid rgba(255,255,255,0.07)", borderRadius:9, padding:"11px 13px" }}>
                                    <div style={{ display:"grid", gridTemplateColumns:"110px 90px 110px 1fr 28px", gap:8, alignItems:"center" }}>
                                      <select value={r.type} onChange={e=>updateRound(r.id,"type",e.target.value)} style={{ ...inp, padding:"7px 9px", cursor:"pointer" }}>
                                        {ROUND_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                                      </select>
                                      <input value={r.amount} onChange={e=>updateRound(r.id,"amount",e.target.value)} placeholder="$4.2M" style={{ ...inp, padding:"7px 10px" }} />
                                      <input value={r.date} onChange={e=>updateRound(r.id,"date",e.target.value)} placeholder="dd/mm/yyyy" style={{ ...inp, padding:"7px 10px" }} />
                                      <input value={r.investors} onChange={e=>updateRound(r.id,"investors",e.target.value)} placeholder="Investors" style={{ ...inp, padding:"7px 10px" }} />
                                      <button onClick={()=>removeRound(r.id)} style={{ background:"none", border:"none", color:"#556878", fontSize:16, cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button className="of-add-round" onClick={addRound} style={{ background:"none", border:"1px dashed rgba(255,255,255,0.1)", borderRadius:8, padding:"9px 18px", fontSize:13, color:"#3A4F5E", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7, transition:"all 0.15s" }}>
                              <span style={{ fontSize:16, lineHeight:1 }}>+</span> Add round
                            </button>
                          </div>

                          <Field label="Additional context">
                            <textarea className="of-input" value={profileForm.additionalContext} onChange={e=>setPF("additionalContext",e.target.value)} placeholder="Customers, priorities, markets, or anything Fuel should remember." rows={3} style={{ ...inp, resize:"vertical", lineHeight:1.65 }} />
                          </Field>

                          <div style={{ padding:"11px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, fontSize:12, color:"#3A4F5E", lineHeight:1.6 }}>
                            Teammates can create their own profiles for the same company once <span style={{ color:"#556878" }}>{profileForm.company}</span> is linked.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DEVELOPMENT — all questions grouped */}
                  {stepId==="development" && (
                    <div>
                      <StepHeading meta={STEP_META.development} />
                      <FigmaQuestion grouped title="Where is your product today?" options={["Idea — not yet in development", "In active development", "Built — not yet launched", "Launched — early users or customers", "Launched — scaling usage or revenue"]} value={answers.dev_product_stage} onChange={v => setAns("dev_product_stage", v)} />
                      <FigmaQuestion grouped title="What type of product are you building?" options={["SaaS / web app", "Marketplace", "API or developer platform", "Other"]} value={answers.dev_product_type} onChange={v => setAns("dev_product_type", v)} />
                      <FigmaQuestion grouped title="What is the primary constraint slowing down your product delivery?" options={["Planning and prioritization", "Capacity and hiring", "Quality and reliability", "Technical debt / Architecture"]} value={answers.dev_delivery_constraint} onChange={v => setAns("dev_delivery_constraint", v)} />
                    </div>
                  )}

                  {/* GTM — onboarding questions */}
                  {stepId==="gtm" && (
                    <div>
                      <StepHeading meta={STEP_META.gtm} />
                      <FigmaQuestion grouped title="What is your primary go-to-market motion?" options={["Sales-led", "Product-led", "Founder-led", "Not yet"]} value={answers.mkt_sales_motion} onChange={v => setAns("mkt_sales_motion", v)} hint={answers.mkt_sales_motion === "Product-led" ? "Self-serve scales well — if conversion holds. We'll track it." : undefined} />
                      <FigmaDescQuestion grouped title="Where are you losing the most ground?" subtitle="Pick the stage where growth is stalling — demand, deals, or retention." options={GTM_FUNNEL_CHOICES} value={answers.mkt_funnel_gap} onChange={v => setAns("mkt_funnel_gap", v)} hint={answers.mkt_funnel_gap ? GTM_FUNNEL_HINTS[answers.mkt_funnel_gap as GtmFunnelStage] : undefined} />
                      <FigmaQuestion grouped title="How clear is your ideal customer profile today?" subtitle="Can your team describe who buys, why they buy, and who to disqualify?" options={["Documented and shared", "Written ICP the team uses for targeting and qualification", "Clear in founder's head", "We know who fits, but it's not written or enforced yet", "Still a hypothesis", "Early signal from customers, but not validated", "Not defined yet", "Selling broadly or still figuring out who fits"]} value={answers.mkt_icp_clarity} onChange={v => setAns("mkt_icp_clarity", v)} />
                      <FigmaQuestion grouped title="How do you track and close revenue today?" options={["CRM with a defined sales process", "CRM but informal process", "Spreadsheet or lightweight tracking", "No systematic pipeline yet"]} value={answers.mkt_revenue_tracking} onChange={v => setAns("mkt_revenue_tracking", v)} />
                    </div>
                  )}

                  {/* G&A — onboarding questions */}
                  {stepId==="revops" && (
                    <div>
                      <StepHeading meta={STEP_META.revops} />
                      <FigmaQuestion grouped title="How long is your current runway?" options={["Under 6 months", "6–12 months", "12–18 months", "Over 18 months"]} value={answers.rev_runway} onChange={v => setAns("rev_runway", v)} />
                      <FigmaQuestion grouped title="How do you manage company finances today?" options={["Accounting software with regular close", "Spreadsheet + accountant or bookkeeper", "Founder-managed / informal", "Not set up yet"]} value={answers.rev_finance_management} onChange={v => setAns("rev_finance_management", v)} />
                      <FigmaQuestion grouped title="What's your near-term capital and reporting priority?" options={["Actively fundraising", "Open to investor introductions", "Focused on extending runway / reaching profitability", "Not focused on capital right now"]} value={answers.rev_capital_priority} onChange={v => setAns("rev_capital_priority", v)} />
                    </div>
                  )}

                  {/* INVESTMENT — one question at a time */}
                  {stepId==="investment" && (
                    <div className="of-step" key={investQ}>

                      {investQ===0 && (
                        <FigmaMultiSelect
                          title="What stages do you typically invest in?"
                          subtitle="Select all that apply."
                          options={["Pre-seed / Seed", "Series A / B", "Growth / Series C+"]}
                          selected={investStages}
                          onToggle={s => {
                            if (investStages.includes(s)) setInvestStages(p => p.filter(x => x !== s));
                            else setInvestStages(p => [...p, s]);
                          }}
                        />
                      )}

                      {investQ===1 && (
                        <FigmaMultiSelect
                          title="What sectors are you most active in?"
                          subtitle="Pick up to 3."
                          options={["SaaS / Software", "FinTech", "Healthcare", "Deep tech / AI", "Consumer", "Other"]}
                          selected={investSectors}
                          onToggle={s => {
                            if (investSectors.includes(s)) setInvestSectors(p => p.filter(x => x !== s));
                            else if (investSectors.length < 3) setInvestSectors(p => [...p, s]);
                          }}
                          max={3}
                        />
                      )}

                      {investQ===2 && (
                        <FigmaQuestion
                          title="What is your typical check size?"
                          options={["Under $500K", "$500K – $2M", "$2M – $10M", "Over $10M"]}
                          value={answers.investCheckSize}
                          onChange={v => setAns("investCheckSize", v)}
                        />
                      )}

                      {investQ===3 && (
                        <FigmaDescMultiSelect
                          title="Where do you primarily invest?"
                          subtitle="Select all regions that apply. US is listed separately from Canada and Mexico."
                          options={INVEST_GEOGRAPHY_OPTIONS}
                          selected={answers.investGeography}
                          onToggle={toggleInvestGeography}
                        />
                      )}

                      {investQ===4 && (
                        <FigmaQuestion
                          title="How are you managing your deal pipeline?"
                          options={["HubSpot", "Another CRM", "Spreadsheet", "Not yet"]}
                          value={answers.investPipeline}
                          onChange={v => setAns("investPipeline", v)}
                          hint={answers.investPipeline === "HubSpot"
                            ? "We'll connect HubSpot in the next step to load your pipeline."
                            : undefined}
                        />
                      )}

                    </div>
                  )}

                  {/* BENCHMARKING — operating companies only */}
                  {stepId==="benchmarking" && (
                    <div>
                      <div style={{ marginBottom:20 }}>
                        <h2 style={{ fontSize:38, fontWeight:800, color:"#F2F5F2", margin:"0 0 10px", letterSpacing:"-0.5px", lineHeight:1.1 }}>How do you stack up?</h2>
                        <p style={{ fontSize:16, color:"#556878", margin:0, lineHeight:1.55 }}>Enter your numbers — the graph shows where you sit. Fuel builds your intelligence, initiatives, and playbooks behind the scenes. You unlock everything in your scorecard.</p>
                      </div>

                      <div style={{ background:"linear-gradient(135deg, rgba(43,184,160,0.1) 0%, rgba(61,214,140,0.06) 100%)", border:"1px solid rgba(43,184,160,0.25)", borderRadius:12, padding:"14px 18px", marginBottom:22 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#2BB8A0", marginBottom:4 }}>✦ The more you share, the sharper your intelligence</div>
                        <div style={{ fontSize:12, color:"#8FA99A", lineHeight:1.6 }}>Every number narrows your cohort. Fuel queues your <strong style={{ color:"#F2F5F2" }}>intelligence</strong>, <strong style={{ color:"#F2F5F2" }}>initiatives</strong>, and <strong style={{ color:"#F2F5F2" }}>playbooks</strong> — you see the full stack when you launch. This step is optional.</div>
                      </div>

                      <OnboardingBenchmarkFieldList
                        values={answers}
                        onChange={(key, value) => setAns(key as keyof Answers, value)}
                      />
                      <div style={{ marginTop:8, fontSize:11, color:"#3A4F5E" }}>Numbers stay in your workspace and are never shared externally.</div>
                    </div>
                  )}

                  {/* HUBSPOT — investors final step */}
                  {stepId==="hubspot" && (
                    <div>
                      <h2 className="of-figma-q-title" style={{ marginBottom: 12 }}>Connect HubSpot</h2>
                      <p className="of-figma-q-sub" style={{ marginBottom: 28 }}>
                        Load your deal pipeline into Fuel. Contacts, companies, deal stages, and notes sync automatically.
                      </p>

                      <div style={{
                        background: hubspotStatus === "connected" ? "rgba(61,214,140,0.06)" : "#1A2D3F",
                        border: hubspotStatus === "connected" ? "1.5px solid rgba(61,214,140,0.35)" : "1.5px solid rgba(255,255,255,0.1)",
                        borderRadius: 14, padding: "22px 20px", marginBottom: 22,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                            background: "#FF7A5922",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800, color: "#FF7A59",
                          }}>HS</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#F2F5F2" }}>HubSpot CRM</div>
                            <div style={{ fontSize: 12, color: "#8FA99A", marginTop: 2 }}>Deal pipeline · contacts · companies</div>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            color: hubspotStatus === "connected" ? "#3DD68C" : hubspotStatus === "connecting" ? "#D4924A" : "#556878",
                            background: hubspotStatus === "connected" ? "rgba(61,214,140,0.1)" : hubspotStatus === "connecting" ? "rgba(212,146,74,0.1)" : "rgba(255,255,255,0.04)",
                            borderRadius: 6, padding: "3px 9px",
                          }}>
                            {hubspotStatus === "connected" ? "Connected" : hubspotStatus === "connecting" ? "Connecting…" : "Not connected"}
                          </span>
                        </div>

                        {hubspotStatus === "pending" && (
                          <button
                            type="button"
                            onClick={connectHubSpot}
                            style={{
                              width: "100%",
                              background: "#FF7A59",
                              color: "#fff",
                              border: "none",
                              borderRadius: 10,
                              padding: "13px 20px",
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            Connect with HubSpot
                          </button>
                        )}

                        {hubspotStatus === "connecting" && (
                          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                            <div className="of-hubspot-bar" style={{ height: "100%", background: "linear-gradient(90deg, #FF7A59, #FFB199)", borderRadius: 2, animation: "ofHubspotLoad 1.8s ease-in-out forwards" }} />
                          </div>
                        )}

                        {hubspotStatus === "connected" && (
                          <div style={{ fontSize: 12, color: "#3DD68C", lineHeight: 1.55 }}>
                            ✓ Pipeline synced — {24} deals, {156} contacts loaded into Fuel.
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: 11, fontWeight: 700, color: "#8FA99A", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                        What Fuel pulls in
                      </div>
                      {["Deal stages & pipeline health", "Contacts & company records", "Activity notes & task history", "Owner assignments & deal values"].map(item => (
                        <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF7A59", flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: "#8FA99A" }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Bottom bar — back + progress + CTA */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:64, display:"flex", alignItems:"center", padding:"0 48px", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {showBack && (
                  <button className="of-back" onClick={back} style={{ background:"none", border:"none", color:"#8FA99A", fontSize:18, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0, flexShrink:0 }}>←</button>
                )}
                <div style={{ width:160, height:3, background:"rgba(255,255,255,0.07)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:2, background:"linear-gradient(90deg, rgb(0,180,138), rgb(61,214,140))", width:`${progressPct}%`, transition:"width 0.4s ease" }} />
                </div>
                <span style={{ fontSize:11, color:"#2A3D4E" }}>{stepIndex + 1} / {activeSteps.length}</span>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                {stepId==="benchmarking" && (
                  <span style={{ fontSize:12, color:"#2A3D4E" }}>
                    {benchmarkGenerating ? "Generating…" : "Optional"}
                  </span>
                )}
                {showConnectLater && (
                  <button
                    type="button"
                    onClick={skipConnectors}
                    style={{
                      fontSize: 12,
                      color: "#F2F5F2",
                      textDecoration: "underline",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      padding: 0,
                    }}
                  >
                    Connect later
                  </button>
                )}
                <button onClick={next} disabled={!canAdvance()} style={{
                  background: canAdvance() ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)" : "rgba(255,255,255,0.05)",
                  color: canAdvance() ? "#0a1a12" : "#2A3D4E",
                  border:"none", borderRadius:10, padding:"12px 32px",
                  fontSize:14, fontWeight:700,
                  cursor: canAdvance() ? "pointer" : "default",
                  fontFamily:"inherit", transition:"all 0.2s",
                  letterSpacing:"-0.1px",
                }}>
                  {isLast ? "Start my journey" : "Continue"}
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div style={{ flex:1, background:"linear-gradient(175deg, #EEF8F5 0%, #D8F0EA 45%, #C8E8DF 100%)", overflow:"hidden", position:"relative" }}>
            <div className="of-motion-scale-inner of-step" key={`g-${stepId}-${searchState}-${currentSubQ}-${hubspotStatus}-${benchmarkGenerating}-${benchmarkSummaryReady}`}>
              {rightPanel[stepId]}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
