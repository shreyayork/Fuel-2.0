import React, { useState } from "react";

type ConnectionMethod = "oauth" | "apikey" | "york";
type Status = "pending" | "connecting" | "connected" | "skipped";
type View = "select" | "configure";

interface ApiField {
  key: string;
  label: string;
  placeholder: string;
  hint?: string;
}

interface Integration {
  id: string;
  name: string;
  category: string;
  abbr: string;
  color: string;
  method: ConnectionMethod;
  description: string;
  dataProvided: string[];
  premium?: boolean;
  addOnPrice?: number;
  oauthLabel?: string;
  apiFields?: ApiField[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: "jira", name: "Jira", category: "Development", abbr: "JR", color: "#2684FF",
    method: "apikey", premium: true, addOnPrice: 29,
    description: "Pull your roadmap items, issue counts, active work, and release status directly into your Development track.",
    dataProvided: ["Roadmap items & epics", "Active / closed / future work", "Release notes & status", "Issue counts by type"],
    apiFields: [
      { key: "domain",   label: "Jira domain",  placeholder: "yourcompany.atlassian.net", hint: "Your Atlassian subdomain" },
      { key: "email",    label: "Account email", placeholder: "you@company.com" },
      { key: "apitoken", label: "API token",     placeholder: "Paste your Jira API token", hint: "Atlassian account → Security → API tokens" },
    ],
  },
  {
    id: "linear", name: "Linear", category: "Development", abbr: "LN", color: "#5E6AD2",
    method: "oauth", premium: false, addOnPrice: 0, oauthLabel: "Connect with Linear",
    description: "Sync your Linear workspace to track project delivery health, active cycles, and issue velocity.",
    dataProvided: ["Active cycles & projects", "Issue velocity & throughput", "Team workload", "Roadmap milestones"],
  },
  {
    id: "launchpad", name: "Launchpad", category: "Development", abbr: "LP", color: "#3DD68C",
    method: "york",
    description: "York IE's design platform — design previews, approval status, and handoff state flow directly into Fuel.",
    dataProvided: ["Design previews & URLs", "Design status & approval state", "Handoff readiness"],
  },
  {
    id: "pulse", name: "Pulse", category: "Development", abbr: "PL", color: "#3DD68C",
    method: "york",
    description: "York IE's code quality platform — stability, speed, risk scores, and weekly health summaries.",
    dataProvided: ["Code quality score", "Stability & speed metrics", "Risk flags", "Weekly quality trends"],
  },
  {
    id: "ga4", name: "Google Analytics", category: "Marketing", abbr: "GA", color: "#F9AB00",
    method: "oauth", premium: false, addOnPrice: 0, oauthLabel: "Connect with Google",
    description: "Bring sessions, users, engagement rates, and funnel data into your Marketing track.",
    dataProvided: ["Sessions & users", "Engagement & bounce rates", "Conversion funnel", "Traffic sources"],
  },
  {
    id: "gads", name: "Google Ads", category: "Marketing", abbr: "Gd", color: "#4285F4",
    method: "oauth", premium: true, addOnPrice: 59, oauthLabel: "Connect with Google",
    description: "Pull spend, conversions, CPA, and campaign performance into your demand signals.",
    dataProvided: ["Campaign spend & ROAS", "Conversions & CPA", "Keyword performance", "Ad group health"],
  },
  {
    id: "semrush", name: "Semrush", category: "Marketing", abbr: "SR", color: "#FF642D",
    method: "apikey", premium: true, addOnPrice: 79,
    description: "Track keyword movement, backlinks, domain authority, and SEO opportunities.",
    dataProvided: ["Keyword rankings", "Backlink profile", "Domain authority score", "SEO opportunities"],
    apiFields: [
      { key: "apikey", label: "API key", placeholder: "Paste your Semrush API key", hint: "Semrush → Profile → API" },
    ],
  },
  {
    id: "linkedin", name: "LinkedIn", category: "Marketing", abbr: "in", color: "#0A66C2",
    method: "oauth", premium: true, addOnPrice: 39, oauthLabel: "Connect with LinkedIn",
    description: "Connect organic and paid LinkedIn performance to your GTM demand signals.",
    dataProvided: ["Organic post engagement", "Follower growth", "Paid campaign metrics", "Lead gen form performance"],
  },
  {
    id: "meta", name: "Meta Ads", category: "Marketing", abbr: "Fb", color: "#1877F2",
    method: "oauth", premium: true, addOnPrice: 39, oauthLabel: "Connect with Meta",
    description: "Bring Facebook and Instagram paid performance into your demand and acquisition view.",
    dataProvided: ["Ad spend & ROAS", "Reach & impressions", "Conversion events", "Audience performance"],
  },
  {
    id: "hubspot", name: "HubSpot", category: "RevOps", abbr: "HS", color: "#FF7A59",
    method: "oauth", premium: false, addOnPrice: 0, oauthLabel: "Connect with HubSpot",
    description: "Sync contacts, companies, deals, pipeline stages, and activities for your RevOps track.",
    dataProvided: ["Pipeline stages & deal health", "Contact & company data", "Activity & task tracking", "Lead-to-opportunity conversion"],
  },
  {
    id: "salesforce", name: "Salesforce", category: "RevOps", abbr: "SF", color: "#00A1E0",
    method: "oauth", premium: true, addOnPrice: 99, oauthLabel: "Connect with Salesforce",
    description: "Pull your CRM data, opportunity pipeline, and forecast signals into Fuel's RevOps view.",
    dataProvided: ["Opportunity pipeline", "Forecast signals", "CRM hygiene score", "Rep activity & stage movement"],
  },
  {
    id: "quickbooks", name: "QuickBooks", category: "FinOps", abbr: "QB", color: "#2CA01C",
    method: "oauth", premium: true, addOnPrice: 49, oauthLabel: "Connect with QuickBooks",
    description: "Bring financial data into your FinOps track — burn rate, cash position, and P&L actuals.",
    dataProvided: ["Cash position & burn rate", "P&L actuals vs. budget", "Monthly close status", "Vendor & payroll data"],
  },
  {
    id: "stripe", name: "Stripe", category: "FinOps", abbr: "St", color: "#635BFF",
    method: "apikey", premium: false, addOnPrice: 0,
    description: "Pull revenue, MRR, churn, and payment health directly from your Stripe account.",
    dataProvided: ["MRR & ARR", "Churn & expansion revenue", "Payment health", "Customer billing status"],
    apiFields: [
      { key: "secret_key", label: "Secret key", placeholder: "sk_live_...", hint: "Stripe Dashboard → Developers → API keys" },
    ],
  },
];

const CATEGORIES = ["Development", "Marketing", "RevOps", "FinOps"];

// York integrations are always included
const YORK_IDS = INTEGRATIONS.filter(i => i.method === "york").map(i => i.id);

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; color: string; bg: string }> = {
    pending:    { label: "Not connected", color: "#3A4F5E", bg: "rgba(255,255,255,0.04)" },
    connecting: { label: "Connecting…",   color: "#D4924A", bg: "rgba(212,146,74,0.1)"  },
    connected:  { label: "Connected",     color: "#3DD68C", bg: "rgba(61,214,140,0.1)"  },
    skipped:    { label: "Skipped",       color: "#556878", bg: "rgba(255,255,255,0.04)" },
  };
  const { label, color, bg } = map[status];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, borderRadius: 4, padding: "2px 8px" }}>
      {label}
    </span>
  );
}

export default function IntegrationSetupPage({ onComplete, embedded }: { onComplete: () => void; embedded?: boolean }) {
  const [view, setView] = useState<View>("select");
  // selectedIds: which integrations the user has chosen to set up
  const [selectedIds, setSelectedIds] = useState<string[]>(YORK_IDS);
  const [statuses, setStatuses] = useState<Record<string, Status>>(() =>
    Object.fromEntries(INTEGRATIONS.map(i => [i.id, i.method === "york" ? "connected" : "pending"]))
  );
  const [activeId, setActiveId] = useState<string>(INTEGRATIONS.find(i => i.method !== "york")!.id);
  const [apiValues, setApiValues] = useState<Record<string, Record<string, string>>>({});

  const active = INTEGRATIONS.find(i => i.id === activeId)!;
  const selectedIntegrations = INTEGRATIONS.filter(i => selectedIds.includes(i.id));
  const connectedCount = Object.values(statuses).filter(s => s === "connected").length;
  const selectedNonYork = selectedIntegrations.filter(i => i.method !== "york");
  const selectedPremium = selectedIntegrations.filter(i => i.premium);
  const selectedFree = selectedIntegrations.filter(i => i.method !== "york" && !i.premium);
  const premiumMonthlyTotal = selectedPremium.reduce((sum, item) => sum + (item.addOnPrice ?? 0), 0);
  const configuredPremiumCount = selectedPremium.filter(i => statuses[i.id] === "connected").length;
  const allDone = selectedNonYork.length > 0 && selectedNonYork.every(i => statuses[i.id] === "connected" || statuses[i.id] === "skipped");

  function toggleSelect(id: string) {
    if (YORK_IDS.includes(id)) return; // can't deselect york integrations
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function goToConfigure() {
    const first = selectedIntegrations.find(i => i.method !== "york");
    if (first) setActiveId(first.id);
    setView("configure");
  }

  function setStatus(id: string, s: Status) {
    setStatuses(prev => ({ ...prev, [id]: s }));
  }

  function advanceToNext(currentId: string) {
    const remaining = selectedIntegrations.filter(i => i.id !== currentId && i.method !== "york" && statuses[i.id] === "pending");
    if (remaining.length > 0) setTimeout(() => setActiveId(remaining[0].id), 500);
  }

  function handleOAuth() {
    setStatus(active.id, "connecting");
    setTimeout(() => { setStatus(active.id, "connected"); advanceToNext(active.id); }, 1800);
  }

  function handleApiConnect() {
    const vals = apiValues[active.id] ?? {};
    if ((active.apiFields ?? []).some(f => !vals[f.key]?.trim())) return;
    setStatus(active.id, "connecting");
    setTimeout(() => { setStatus(active.id, "connected"); advanceToNext(active.id); }, 1400);
  }

  function handleSkip() {
    setStatus(active.id, "skipped");
    advanceToNext(active.id);
  }

  function setApiField(id: string, key: string, val: string) {
    setApiValues(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [key]: val } }));
  }

  const apiVals = apiValues[active.id] ?? {};
  const apiReady = (active.apiFields ?? []).every(f => apiVals[f.key]?.trim());
  const isConnecting = statuses[active.id] === "connecting";
  const isConnected  = statuses[active.id] === "connected";
  const configurableCount = selectedIds.filter(id => !YORK_IDS.includes(id)).length;
  const hasConfigurable = configurableCount > 0;

  return (
    <div
      className={`isp-root${embedded ? " is-embedded" : ""}`}
      style={{
        flex: embedded ? 1 : undefined,
        height: embedded ? "100%" : undefined,
        minHeight: embedded ? 0 : "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, -apple-system, sans-serif",
        minWidth: 0,
      }}
    >
      <style>{`
        .isp-root.is-embedded {
          min-height: 0;
        }
        @media (max-width: 760px) {
          .isp-root {
            height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          .isp-topbar {
            height: auto !important;
            min-height: 48px;
            padding: 10px 14px !important;
            flex-wrap: wrap;
            gap: 8px 12px;
          }
          .isp-topbar-right {
            flex-wrap: wrap;
            width: 100%;
            justify-content: flex-start !important;
            gap: 8px 12px !important;
          }
          .isp-body {
            flex: 1 1 0 !important;
            flex-direction: column !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          .isp-select-shell {
            display: flex !important;
            flex: 1 1 0 !important;
            flex-direction: column !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          .isp-select-scroll {
            -webkit-overflow-scrolling: touch;
            display: block !important;
            flex: 1 1 0 !important;
            min-height: 0 !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
          }
          .isp-select-layout {
            display: flex !important;
            flex: none !important;
            flex-direction: column !important;
            height: auto !important;
            min-height: min-content !important;
            overflow: visible !important;
            width: 100% !important;
          }
          .isp-select-main {
            flex: none !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            padding: 16px 14px 12px !important;
          }
          .isp-select-main h1 {
            font-size: 20px !important;
            letter-spacing: -0.02em;
            line-height: 1.2 !important;
            margin-bottom: 6px !important;
          }
          .isp-card-grid {
            gap: 12px !important;
            grid-template-columns: 1fr !important;
          }
          .isp-connector-card {
            min-height: 0 !important;
            padding: 14px !important;
          }
          .isp-summary-rail,
          .isp-config-nav,
          .isp-progress-rail {
            width: 100% !important;
            border-left: none !important;
            border-right: none !important;
            border-top: 1px solid var(--panel-border, rgba(255,255,255,0.07)) !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .isp-summary-rail {
            padding: 14px 14px 20px !important;
          }
          .isp-select-footer {
            align-items: stretch !important;
            box-shadow: 0 -8px 28px rgba(0,0,0,0.18) !important;
            flex-direction: column !important;
            gap: 8px !important;
            padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .isp-select-footer button {
            width: 100% !important;
          }
          .isp-select-footer-meta {
            line-height: 1.4;
            white-space: normal !important;
          }
          .isp-config-nav {
            border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.07)) !important;
            border-top: none !important;
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            padding: 8px 0 !important;
            scrollbar-width: none;
          }
          .isp-config-nav::-webkit-scrollbar {
            display: none;
          }
          .isp-config-nav > div {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
          }
          .isp-detail-meta {
            grid-template-columns: 1fr !important;
          }
          .isp-config-stage {
            flex-direction: column !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          .isp-config-main {
            -webkit-overflow-scrolling: touch;
            flex: 1 1 0 !important;
            min-height: 0 !important;
            overflow-y: auto !important;
            padding: 16px 14px !important;
          }
          .isp-config-nav button {
            flex: 0 0 auto;
            white-space: nowrap;
          }
        }
        @media (max-width: 480px) {
          .isp-topbar-right {
            gap: 8px;
            font-size: 12px;
          }
        }
        .isp-topbar {
          align-items: center;
          background: var(--surface-3, var(--panel));
          border-bottom: 1px solid var(--panel-border, rgb(38, 57, 71));
          display: flex;
          flex-shrink: 0;
          height: 52px;
          justify-content: space-between;
          padding: 0 24px;
        }
        .isp-topbar-left,
        .isp-topbar-right {
          align-items: center;
          display: flex;
          gap: 12px;
          min-width: 0;
        }
        .isp-brand-mark {
          align-items: center;
          background: linear-gradient(135deg, rgb(0, 180, 138) 0%, rgb(236, 214, 127) 100%);
          border-radius: 7px;
          color: #0a1a12;
          display: inline-flex;
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 900;
          height: 28px;
          justify-content: center;
          width: 28px;
        }
        .isp-brand-name {
          color: var(--text-1);
          font-size: 13px;
          font-weight: 700;
        }
        .isp-brand-sub,
        .isp-back-link {
          background: none;
          border: 0;
          color: var(--text-3);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          padding: 0;
        }
        .isp-badge {
          background: rgba(212, 146, 74, 0.12);
          border: 1px solid rgba(212, 146, 74, 0.28);
          border-radius: 6px;
          color: #d4924a;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 3px 8px;
        }
        .isp-topbar-stat {
          color: var(--text-3);
          font-size: 12px;
        }
        .isp-topbar-stat strong {
          color: var(--fuel-accent, #00b48a);
          font-weight: 700;
        }
        .isp-topbar-addons {
          color: #d4924a;
          font-size: 12px;
          font-weight: 700;
        }
        .isp-skip-btn {
          background: transparent;
          border: 1px solid var(--panel-border, rgb(38, 57, 71));
          border-radius: 7px;
          color: var(--text-2);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          padding: 5px 12px;
        }
        .isp-select-inner {
          margin: 0 auto;
          max-width: 880px;
        }
        .isp-select-intro {
          margin-bottom: 24px;
        }
        .isp-select-intro h1 {
          color: var(--text-1);
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin: 0 0 8px;
        }
        .isp-select-intro p {
          color: var(--text-2);
          font-size: 14px;
          line-height: 1.55;
          margin: 0;
        }
        .isp-category {
          margin-bottom: 24px;
        }
        .isp-category-label {
          color: var(--fuel-accent, #00b48a);
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
          text-transform: uppercase;
        }
        .isp-card-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .isp-connector-card {
          align-items: flex-start;
          background: var(--panel, #172632);
          border: 1px solid var(--panel-border, rgb(38, 57, 71));
          border-radius: 10px;
          color: inherit;
          cursor: pointer;
          display: flex;
          font: inherit;
          gap: 12px;
          min-height: 0;
          padding: 16px;
          text-align: left;
          transition: border-color 0.14s ease, background 0.14s ease;
        }
        .isp-connector-card:hover:not(.is-york) {
          border-color: rgba(255, 255, 255, 0.16);
        }
        .isp-connector-card.is-selected {
          background: color-mix(in srgb, var(--fuel-accent, #00b48a) 10%, var(--panel, #172632));
          border-color: color-mix(in srgb, var(--fuel-accent, #00b48a) 45%, var(--panel-border, rgb(38, 57, 71)));
        }
        .isp-connector-card.is-york {
          cursor: default;
        }
        .isp-connector-logo {
          align-items: center;
          border-radius: 8px;
          display: inline-flex;
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 800;
          height: 36px;
          justify-content: center;
          width: 36px;
        }
        .isp-connector-body {
          display: flex;
          flex: 1 1 auto;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .isp-connector-name {
          color: var(--text-1);
          font-size: 14px;
          font-weight: 700;
          line-height: 1.25;
        }
        .isp-connector-desc {
          color: var(--text-2);
          font-size: 12.5px;
          line-height: 1.45;
        }
        .isp-connector-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }
        .isp-chip {
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 9px;
        }
        .isp-chip--included,
        .isp-chip--free {
          background: color-mix(in srgb, var(--fuel-accent, #00b48a) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--fuel-accent, #00b48a) 28%, transparent);
          color: var(--fuel-accent, #00b48a);
        }
        .isp-chip--premium {
          background: rgba(212, 146, 74, 0.12);
          border: 1px solid rgba(212, 146, 74, 0.28);
          color: #d4924a;
        }
        .isp-connector-check {
          align-items: center;
          border: 1px solid var(--panel-border, rgb(38, 57, 71));
          border-radius: 999px;
          color: var(--fuel-accent, #00b48a);
          display: inline-flex;
          flex-shrink: 0;
          font-size: 12px;
          font-weight: 700;
          height: 22px;
          justify-content: center;
          width: 22px;
        }
        .isp-connector-check.is-on {
          background: color-mix(in srgb, var(--fuel-accent, #00b48a) 16%, transparent);
          border-color: color-mix(in srgb, var(--fuel-accent, #00b48a) 50%, transparent);
        }
        .isp-summary-rail {
          background: var(--surface-3, var(--panel)) !important;
          border-left: 1px solid var(--panel-border, rgb(38, 57, 71)) !important;
        }
        .isp-select-footer {
          background: var(--surface-3, var(--panel)) !important;
          border-top: 1px solid var(--panel-border, rgb(38, 57, 71)) !important;
        }
        html[data-theme="light"] .isp-connector-card {
          background: #ffffff;
          border-color: #e8eaed;
          box-shadow: 0 1px 2px rgba(26, 35, 50, 0.03);
        }
        html[data-theme="light"] .isp-connector-card:hover:not(.is-york) {
          border-color: #d5dae1;
        }
        html[data-theme="light"] .isp-connector-card.is-selected {
          background: color-mix(in srgb, var(--fuel-accent, #00b48a) 8%, #ffffff);
          border-color: color-mix(in srgb, var(--fuel-accent, #00b48a) 40%, #e8eaed);
          box-shadow: none;
        }
        html[data-theme="light"] .isp-topbar,
        html[data-theme="light"] .isp-summary-rail,
        html[data-theme="light"] .isp-select-footer {
          background: #f7f8fa !important;
          border-color: #e8eaed !important;
        }
        html[data-theme="light"] .isp-skip-btn {
          background: #ffffff;
          border-color: #e8eaed;
          color: var(--text-1);
        }
        html[data-theme="light"] .isp-connector-check {
          border-color: #d5dae1;
        }
        @media (max-width: 1100px) {
          .isp-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 760px) {
          .isp-card-grid {
            gap: 12px !important;
            grid-template-columns: 1fr !important;
          }
          .isp-connector-card {
            min-height: 0 !important;
            padding: 14px !important;
          }
          .isp-select-intro h1 {
            font-size: 20px !important;
          }
          .isp-select-intro p {
            font-size: 13px !important;
          }
          .isp-category {
            margin-bottom: 18px;
          }
        }

        html[data-theme="light"] .isp-summary-rail,
        html[data-theme="light"] .isp-select-footer,
        html[data-theme="light"] .isp-topbar {
          border-color: #e8eaed !important;
        }

        .isp-summary-title,
        .isp-summary-section-label {
          color: var(--text-3);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
          text-transform: uppercase;
        }

        .isp-summary-title {
          font-size: 12px;
          margin-bottom: 12px;
        }

        .isp-summary-card {
          background: var(--panel, #172632);
          border: 1px solid var(--panel-border, rgb(38, 57, 71));
          border-radius: 12px;
          margin-bottom: 16px;
          padding: 14px;
        }

        .isp-summary-row {
          align-items: center;
          color: var(--text-2);
          display: flex;
          font-size: 12.5px;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .isp-summary-row:last-of-type {
          margin-bottom: 0;
        }

        .isp-summary-row strong {
          color: var(--text-1);
          font-weight: 700;
        }

        .isp-summary-row strong.is-free {
          color: var(--fuel-accent, #00b48a);
        }

        .isp-summary-row strong.is-premium {
          color: #d4924a;
        }

        .isp-summary-divider {
          background: var(--panel-border, var(--border));
          height: 1px;
          margin: 12px 0;
        }

        .isp-summary-total {
          align-items: baseline;
          display: flex;
          justify-content: space-between;
        }

        .isp-summary-total-label {
          color: var(--text-1);
          font-size: 12.5px;
          font-weight: 700;
        }

        .isp-summary-total-value {
          color: var(--text-1);
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .isp-summary-total-value span {
          color: var(--text-3);
          font-size: 11px;
          font-weight: 600;
        }

        .isp-summary-empty,
        .isp-summary-note {
          color: var(--text-2);
          font-size: 12.5px;
          line-height: 1.5;
        }

        .isp-summary-empty {
          margin-bottom: 18px;
        }

        .isp-select-footer-cta:disabled {
          background: var(--wash, rgba(10, 20, 28, 0.08)) !important;
          color: var(--text-3) !important;
          cursor: default !important;
        }

        html[data-theme="light"] .isp-summary-card {
          background: #ffffff;
          border-color: #e8eaed;
          box-shadow: 0 1px 2px rgba(26, 35, 50, 0.04);
        }

        html[data-theme="light"] .isp-select-footer {
          background: #ffffff !important;
          border-top-color: #e8eaed !important;
          box-shadow: 0 -8px 24px rgba(26, 35, 50, 0.06) !important;
        }

        html[data-theme="light"] .isp-select-footer-meta {
          color: var(--text-3) !important;
        }
      `}</style>

      {/* Top bar */}
      <div className="isp-topbar">
        <div className="isp-topbar-left">
          {!embedded && (
            <>
              <div className="isp-brand-mark" aria-hidden="true">F</div>
              <span className="isp-brand-name">Fuel</span>
              <span className="isp-brand-sub">by York IE</span>
            </>
          )}
          <span className="isp-badge">Integrations</span>
          {embedded && view !== "select" && (
            <button type="button" className="isp-back-link" onClick={() => setView("select")}>← Back to connectors</button>
          )}
          {!embedded && view !== "select" && (
            <button type="button" className="isp-back-link" onClick={() => setView("select")}>← Back to selection</button>
          )}
        </div>
        <div className="isp-topbar-right">
          <span className="isp-topbar-stat">
            <strong>{connectedCount}</strong> of {INTEGRATIONS.length} connected
          </span>
          {selectedPremium.length > 0 && (
            <span className="isp-topbar-addons">${premiumMonthlyTotal}/mo add-ons</span>
          )}
          {!embedded && (
            <button type="button" className="isp-skip-btn" onClick={onComplete}>Skip to journey →</button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="isp-body" style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── SELECTION SCREEN ── */}
        {view === "select" && (
          <div className="isp-select-shell" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          <div className="isp-select-scroll" style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          <div className="isp-select-layout" style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden", width: "100%" }}>
          <div className="isp-select-main" style={{ flex: 1, overflowY: "auto", padding: "40px 48px 24px", minHeight: 0 }}>
            <div className="isp-select-inner">
              <div className="isp-select-intro">
                <h1>Choose your integrations</h1>
                <p>
                  Select the tools you use. Premium connectors are summarized in the sidebar before setup.
                  York IE integrations are included automatically.
                </p>
              </div>

              {CATEGORIES.map(cat => {
                const items = INTEGRATIONS.filter(i => i.category === cat);
                const catColor = items.find(i => i.method !== "york")?.color ?? "#3DD68C";
                return (
                  <div key={cat} className="isp-category">
                    <div className="isp-category-label" style={{ color: catColor }}>{cat}</div>
                    <div className="isp-card-grid">
                      {items.map(item => {
                        const isYork = item.method === "york";
                        const isSel = selectedIds.includes(item.id);
                        const isPremium = Boolean(item.premium);
                        return (
                          <button
                            type="button"
                            key={item.id}
                            className={`isp-connector-card${isSel ? " is-selected" : ""}${isYork ? " is-york" : ""}`}
                            onClick={() => toggleSelect(item.id)}
                            aria-pressed={isSel}
                          >
                            <span
                              className="isp-connector-logo"
                              style={{ background: `${item.color}22`, color: item.color }}
                              aria-hidden="true"
                            >
                              {item.abbr}
                            </span>
                            <span className="isp-connector-body">
                              <strong className="isp-connector-name">{item.name}</strong>
                              <span className="isp-connector-desc">{item.description}</span>
                              <span className="isp-connector-chips">
                                {isYork ? <span className="isp-chip isp-chip--included">York IE · Included</span> : null}
                                {isPremium ? (
                                  <span className="isp-chip isp-chip--premium">Premium · ${item.addOnPrice}/mo</span>
                                ) : !isYork ? (
                                  <span className="isp-chip isp-chip--free">Free</span>
                                ) : null}
                              </span>
                            </span>
                            <span className={`isp-connector-check${isSel ? " is-on" : ""}`} aria-hidden="true">
                              {isSel ? "✓" : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          <div className="isp-summary-rail" style={{
            width: 280, flexShrink: 0, background: "var(--surface-3)",
            borderLeft: "1px solid var(--panel-border, rgba(255,255,255,0.07))",
            padding: "20px 16px", overflowY: "auto",
          }}>
            <div className="isp-summary-title">Selection summary</div>
            <div className="isp-summary-card">
              <div className="isp-summary-row">
                <span>Selected</span>
                <strong>{selectedIds.length}</strong>
              </div>
              <div className="isp-summary-row">
                <span>Free connectors</span>
                <strong className="is-free">{selectedFree.length}</strong>
              </div>
              <div className="isp-summary-row">
                <span>Premium add-ons</span>
                <strong className="is-premium">{selectedPremium.length}</strong>
              </div>
              <div className="isp-summary-divider" />
              <div className="isp-summary-total">
                <span className="isp-summary-total-label">Monthly add-on</span>
                <span className="isp-summary-total-value">
                  ${premiumMonthlyTotal}<span>/mo</span>
                </span>
              </div>
            </div>

            <div className="isp-summary-section-label">Premium connectors</div>
            {selectedPremium.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                {selectedPremium.map(item => (
                  <div key={item.id} className="isp-summary-premium-row" style={{
                    display: "flex", alignItems: "center", gap: 9,
                    background: "var(--panel)", border: "1px solid var(--panel-border, rgba(255,255,255,0.06))",
                    borderRadius: 9, padding: "9px 10px",
                  }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                      background: item.color + "22",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 800, color: item.color,
                    }}>{item.abbr}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#D4924A" }}>${item.addOnPrice}/mo</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="isp-summary-empty">No paid add-ons selected yet.</p>
            )}

            <div className="isp-summary-section-label">Included</div>
            <p className="isp-summary-note">
              York IE connectors and free connectors do not change the subscription total.
            </p>
          </div>
          </div>
          </div>

          {/* Fixed bottom bar */}
          <div
            className="isp-select-footer"
            style={{
              flexShrink: 0, borderTop: "1px solid var(--panel-border, rgba(255,255,255,0.07))",
              background: "var(--surface-3)", padding: "16px 48px",
              display: "flex", alignItems: "center", gap: 16,
              zIndex: 5,
              boxShadow: "0 -18px 36px rgba(0,0,0,0.18)",
            }}
          >
            <button
              type="button"
              className="isp-select-footer-cta"
              onClick={goToConfigure}
              disabled={!hasConfigurable}
              style={{
                background: hasConfigurable
                  ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)"
                  : undefined,
                color: hasConfigurable ? "#0a1a12" : undefined,
                border: "none", borderRadius: 8, padding: "11px 28px",
                fontSize: 13, fontWeight: 800,
                cursor: hasConfigurable ? "pointer" : "default",
                transition: "all 0.2s",
              }}
            >
              {hasConfigurable
                ? `Configure selected (${configurableCount}) →`
                : "Select connectors to configure"}
            </button>
            <span className="isp-select-footer-meta" style={{ fontSize: 11, color: "var(--text-3)" }}>
              {selectedIds.length} selected · {selectedFree.length} free · {selectedPremium.length} premium · York IE included
            </span>
          </div>
          </div>
        )}

        {/* ── CONFIGURE SCREEN ── */}
        {view === "configure" && (
          <>
            {/* Sidebar — only selected integrations */}
            <div className="isp-config-stage" style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div className="isp-config-nav" style={{
              width: 232, flexShrink: 0, background: "var(--surface-3)",
              borderRight: "1px solid rgba(255,255,255,0.07)",
              overflowY: "auto", padding: "14px 0", display: "flex", flexDirection: "column",
            }}>
              <div style={{ flex: 1 }}>
                {CATEGORIES.map(cat => {
                  const items = selectedIntegrations.filter(i => i.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} style={{ marginBottom: 4 }}>
                      <div style={{
                        fontSize: 9.5, fontWeight: 700, color: "#3A4F5E",
                        textTransform: "uppercase", letterSpacing: "0.5px",
                        padding: "8px 16px 4px",
                      }}>{cat}</div>
                      {items.map(item => {
                        const status = statuses[item.id];
                        const isActive = item.id === activeId;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveId(item.id)}
                            style={{
                              width: "100%", display: "flex", alignItems: "center", gap: 9,
                              padding: "7px 16px",
                              background: isActive ? "rgba(61,214,140,0.06)" : "transparent",
                              borderTop: "none", borderRight: "none", borderBottom: "none",
                              borderLeft: isActive ? "2px solid #3DD68C" : "2px solid transparent",
                              cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                            }}
                          >
                            <div style={{
                              width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                              background: item.color + "22",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 8.5, fontWeight: 800, color: item.color,
                            }}>{item.abbr}</div>
                            <span style={{
                              flex: 1, fontSize: 12, color: isActive ? "var(--text-1)" : "var(--text-2)",
                              fontWeight: isActive ? 600 : 400,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{item.name}</span>
                            {item.method !== "york" && (
                              <span style={{
                                flexShrink: 0, fontSize: 9, fontWeight: 800,
                                color: item.premium ? "#D4924A" : "#3DD68C",
                              }}>
                                {item.premium ? `$${item.addOnPrice}` : "Free"}
                              </span>
                            )}
                            <span style={{ flexShrink: 0, fontSize: 11 }}>
                              {status === "connected"  && <span style={{ color: "#3DD68C" }}>✓</span>}
                              {status === "skipped"    && <span style={{ color: "#3A4F5E" }}>–</span>}
                              {status === "connecting" && <span style={{ color: "#D4924A" }}>●</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Select more button */}
              <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={() => setView("select")}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: "rgba(255,255,255,0.04)", border: "1px solid var(--panel-border)",
                    borderRadius: 7, padding: "8px 12px",
                    fontSize: 11, fontWeight: 600, color: "var(--text-2)", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> Select more integrations
                </button>
              </div>
            </div>

            {/* Main config panel */}
            <div className="isp-config-main" style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
              <div style={{ maxWidth: 560 }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: active.color + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, color: active.color,
                  }}>{active.abbr}</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)" }}>{active.name}</span>
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                        background: active.color + "18", color: active.color, border: `1px solid ${active.color}30`,
                      }}>{active.category}</span>
                      {active.method === "york" && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#3DD68C", background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: 4, padding: "2px 7px" }}>York IE</span>
                      )}
                      {active.premium && (
                        <span style={{ fontSize: 9.5, fontWeight: 800, color: "#D4924A", background: "rgba(212,146,74,0.1)", border: "1px solid rgba(212,146,74,0.22)", borderRadius: 4, padding: "2px 7px" }}>
                          Premium · ${active.addOnPrice}/mo
                        </span>
                      )}
                      {active.method !== "york" && !active.premium && (
                        <span style={{ fontSize: 9.5, fontWeight: 800, color: "#3DD68C", background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: 4, padding: "2px 7px" }}>
                          Free
                        </span>
                      )}
                    </div>
                    <StatusPill status={statuses[active.id]} />
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65, margin: "0 0 18px" }}>
                  {active.description}
                </p>

                {/* What Fuel pulls */}
                <div style={{
                  background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10, padding: "13px 16px", marginBottom: 22,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#3A4F5E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    What Fuel pulls from {active.name}
                  </div>
                  <div className="isp-detail-meta" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                    {active.dataProvided.map(d => (
                      <div key={d} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                        <span style={{ color: active.color, fontSize: 10, marginTop: 2, flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connection UI */}
                {active.method === "york" && (
                  <div style={{
                    background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.15)",
                    borderRadius: 10, padding: "16px", display: "flex", alignItems: "flex-start", gap: 12,
                  }}>
                    <span style={{ fontSize: 18, marginTop: 1 }}>✓</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#3DD68C", marginBottom: 4 }}>Automatically connected via York IE</div>
                      <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>This integration is part of your York IE relationship and requires no additional setup.</div>
                    </div>
                  </div>
                )}

                {active.method === "oauth" && (
                  <div style={{ background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "18px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 6 }}>Authenticate via {active.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 18 }}>
                      {"You'll be redirected to "}{active.name}{" to authorise Fuel's read-only access. We request only the minimum permissions needed to pull your data."}
                    </div>
                    {!isConnected ? (
                      <button onClick={handleOAuth} disabled={isConnecting} style={{
                        display: "flex", alignItems: "center", gap: 9,
                        background: isConnecting ? "var(--border)" : active.color,
                        color: isConnecting ? "#556878" : "#fff",
                        border: "none", borderRadius: 8, padding: "10px 22px",
                        fontSize: 13, fontWeight: 700, cursor: isConnecting ? "default" : "pointer", transition: "all 0.2s",
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 4, background: "rgba(255,255,255,0.2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 800, flexShrink: 0,
                        }}>{active.abbr}</div>
                        {isConnecting ? "Connecting…" : (active.oauthLabel ?? `Connect with ${active.name}`)}
                      </button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#3DD68C", fontSize: 13, fontWeight: 600 }}>
                        ✓ Connected successfully
                      </div>
                    )}
                  </div>
                )}

                {active.method === "apikey" && (
                  <div style={{ background: "var(--surface-3)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "18px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>API credentials</div>
                    {(active.apiFields ?? []).map(field => (
                      <div key={field.key}>
                        <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 7 }}>
                          {field.label}
                        </label>
                        <input
                          type={field.key.includes("key") || field.key.includes("token") || field.key.includes("secret") ? "password" : "text"}
                          value={apiVals[field.key] ?? ""}
                          onChange={e => setApiField(active.id, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            background: "var(--bg)", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 7, padding: "9px 12px",
                            fontSize: 12, color: "var(--text-1)", outline: "none",
                          }}
                        />
                        {field.hint && <div style={{ fontSize: 11, color: "#3A4F5E", marginTop: 5 }}>💡 {field.hint}</div>}
                      </div>
                    ))}
                    {!isConnected ? (
                      <button onClick={handleApiConnect} disabled={!apiReady || isConnecting} style={{
                        background: apiReady && !isConnecting
                          ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)"
                          : "rgba(255,255,255,0.06)",
                        color: apiReady && !isConnecting ? "#0a1a12" : "#3A4F5E",
                        border: "none", borderRadius: 7, padding: "9px 22px",
                        fontSize: 12, fontWeight: 700,
                        cursor: apiReady && !isConnecting ? "pointer" : "default", transition: "all 0.2s",
                      }}>
                        {isConnecting ? "Verifying credentials…" : "Verify & connect"}
                      </button>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#3DD68C", fontSize: 13, fontWeight: 600 }}>
                        ✓ Credentials verified — connected
                      </div>
                    )}
                  </div>
                )}

                {/* Skip */}
                {!isConnected && active.method !== "york" && !embedded && (
                  <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
                    <button onClick={handleSkip} style={{
                      background: "transparent", color: "#556878",
                      border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6,
                      padding: "7px 14px", fontSize: 12, cursor: "pointer",
                    }}>Skip for now</button>
                    <span style={{ fontSize: 11, color: "#3A4F5E" }}>Add this premium connector anytime from the Connector Hub</span>
                  </div>
                )}

                {/* All done CTA */}
                {allDone && !embedded && (
                  <div style={{
                    marginTop: 32, background: "rgba(61,214,140,0.05)",
                    border: "1px solid rgba(61,214,140,0.2)", borderRadius: 12,
                    padding: "22px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 10 }}>🎉</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
                      {connectedCount} integration{connectedCount !== 1 ? "s" : ""} connected
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 18, lineHeight: 1.6 }}>
                      Your Fuel journey tracks are ready. Intelligence will start flowing as your integrations sync.
                    </div>
                    <button onClick={onComplete} style={{
                      background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
                      color: "#0a1a12", border: "none", borderRadius: 8,
                      padding: "10px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                    }}>Let the journey begin →</button>
                  </div>
                )}
              </div>
            </div>

            {/* Right progress rail */}
            <div className="isp-progress-rail" style={{
              width: 210, flexShrink: 0, background: "var(--surface-3)",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              padding: "20px 16px", overflowY: "auto",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#3A4F5E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Progress</div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 4, marginBottom: 6 }}>
                <div style={{
                  height: 4, borderRadius: 4,
                  background: "linear-gradient(90deg, rgb(0,180,138), rgb(236,214,127))",
                  width: selectedNonYork.length > 0 ? `${(selectedNonYork.filter(i => statuses[i.id] === "connected" || statuses[i.id] === "skipped").length / selectedNonYork.length) * 100}%` : "0%",
                  transition: "width 0.4s ease",
                }} />
              </div>
              <div style={{ fontSize: 13, color: "#556878", marginBottom: 20 }}>
                {selectedNonYork.filter(i => statuses[i.id] === "connected").length} of {selectedNonYork.length} configured
              </div>
              {selectedPremium.length > 0 && (
                <div style={{
                  background: "rgba(212,146,74,0.08)", border: "1px solid rgba(212,146,74,0.18)",
                  borderRadius: 9, padding: "10px 11px", marginBottom: 18,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#D4924A", textTransform: "uppercase", letterSpacing: "0.45px", marginBottom: 5 }}>
                    Premium usage
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.45 }}>
                    <strong style={{ color: "var(--text-1)" }}>{configuredPremiumCount}</strong> connected · ${premiumMonthlyTotal}/mo approved
                  </div>
                </div>
              )}

              {CATEGORIES.map(cat => {
                const items = selectedIntegrations.filter(i => i.category === cat);
                if (items.length === 0) return null;
                const catColor = items[0]?.color ?? "#3DD68C";
                return (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: catColor, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>{cat}</div>
                    {items.map(item => {
                      const s = statuses[item.id];
                      return (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                          <span style={{ fontSize: 13, color: s === "connected" ? "#3DD68C" : s === "skipped" ? "#3A4F5E" : s === "connecting" ? "#D4924A" : "#3A4F5E" }}>
                            {s === "connected" ? "✓" : s === "skipped" ? "–" : s === "connecting" ? "●" : "○"}
                          </span>
                          <span style={{ fontSize: 13, color: s === "connected" ? "var(--text-2)" : "#3A4F5E" }}>{item.name}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
