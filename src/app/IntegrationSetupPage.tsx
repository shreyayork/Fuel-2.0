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
  oauthLabel?: string;
  apiFields?: ApiField[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: "jira", name: "Jira", category: "Development", abbr: "JR", color: "#2684FF",
    method: "apikey",
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
    method: "oauth", oauthLabel: "Connect with Linear",
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
    method: "oauth", oauthLabel: "Connect with Google",
    description: "Bring sessions, users, engagement rates, and funnel data into your Marketing track.",
    dataProvided: ["Sessions & users", "Engagement & bounce rates", "Conversion funnel", "Traffic sources"],
  },
  {
    id: "gads", name: "Google Ads", category: "Marketing", abbr: "Gd", color: "#4285F4",
    method: "oauth", oauthLabel: "Connect with Google",
    description: "Pull spend, conversions, CPA, and campaign performance into your demand signals.",
    dataProvided: ["Campaign spend & ROAS", "Conversions & CPA", "Keyword performance", "Ad group health"],
  },
  {
    id: "semrush", name: "Semrush", category: "Marketing", abbr: "SR", color: "#FF642D",
    method: "apikey",
    description: "Track keyword movement, backlinks, domain authority, and SEO opportunities.",
    dataProvided: ["Keyword rankings", "Backlink profile", "Domain authority score", "SEO opportunities"],
    apiFields: [
      { key: "apikey", label: "API key", placeholder: "Paste your Semrush API key", hint: "Semrush → Profile → API" },
    ],
  },
  {
    id: "linkedin", name: "LinkedIn", category: "Marketing", abbr: "in", color: "#0A66C2",
    method: "oauth", oauthLabel: "Connect with LinkedIn",
    description: "Connect organic and paid LinkedIn performance to your GTM demand signals.",
    dataProvided: ["Organic post engagement", "Follower growth", "Paid campaign metrics", "Lead gen form performance"],
  },
  {
    id: "meta", name: "Meta Ads", category: "Marketing", abbr: "Fb", color: "#1877F2",
    method: "oauth", oauthLabel: "Connect with Meta",
    description: "Bring Facebook and Instagram paid performance into your demand and acquisition view.",
    dataProvided: ["Ad spend & ROAS", "Reach & impressions", "Conversion events", "Audience performance"],
  },
  {
    id: "hubspot", name: "HubSpot", category: "RevOps", abbr: "HS", color: "#FF7A59",
    method: "oauth", oauthLabel: "Connect with HubSpot",
    description: "Sync contacts, companies, deals, pipeline stages, and activities for your RevOps track.",
    dataProvided: ["Pipeline stages & deal health", "Contact & company data", "Activity & task tracking", "Lead-to-opportunity conversion"],
  },
  {
    id: "salesforce", name: "Salesforce", category: "RevOps", abbr: "SF", color: "#00A1E0",
    method: "oauth", oauthLabel: "Connect with Salesforce",
    description: "Pull your CRM data, opportunity pipeline, and forecast signals into Fuel's RevOps view.",
    dataProvided: ["Opportunity pipeline", "Forecast signals", "CRM hygiene score", "Rep activity & stage movement"],
  },
  {
    id: "quickbooks", name: "QuickBooks", category: "FinOps", abbr: "QB", color: "#2CA01C",
    method: "oauth", oauthLabel: "Connect with QuickBooks",
    description: "Bring financial data into your FinOps track — burn rate, cash position, and P&L actuals.",
    dataProvided: ["Cash position & burn rate", "P&L actuals vs. budget", "Monthly close status", "Vendor & payroll data"],
  },
  {
    id: "stripe", name: "Stripe", category: "FinOps", abbr: "St", color: "#635BFF",
    method: "apikey",
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

  return (
    <div style={{ flex: embedded ? 1 : undefined, height: embedded ? "100%" : undefined, minHeight: embedded ? "unset" : "100vh", background: "#132130", display: "flex", flexDirection: "column", fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* Top bar */}
      <div style={{
        height: 52, background: "#1F3140", borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", padding: "0 24px", justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!embedded && (
            <>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 900, color: "#0a1a12",
              }}>F</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#F2F5F2" }}>Fuel</span>
              <span style={{ fontSize: 11, color: "#3A4F5E" }}>by York IE</span>
            </>
          )}
          <span style={{
            fontSize: 9, fontWeight: 700, color: "#D4924A",
            background: "rgba(212,146,74,0.1)", border: "1px solid rgba(212,146,74,0.2)",
            borderRadius: 4, padding: "1px 6px", letterSpacing: "0.3px",
          }}>INTEGRATIONS</span>
          {embedded && view === "configure" && (
            <button onClick={() => setView("select")} style={{
              background: "none", border: "none", color: "#556878",
              fontSize: 12, cursor: "pointer", padding: "0 4px",
            }}>← Back to connectors</button>
          )}
          {!embedded && view === "configure" && (
            <button onClick={() => setView("select")} style={{
              background: "none", border: "none", color: "#556878",
              fontSize: 12, cursor: "pointer", padding: "0 4px",
            }}>← Back to selection</button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: "#556878" }}>
            <span style={{ color: "#3DD68C", fontWeight: 700 }}>{connectedCount}</span> of {INTEGRATIONS.length} connected
          </span>
          {!embedded && (
            <button onClick={onComplete} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              color: "#8FA99A", fontSize: 12, borderRadius: 6, padding: "5px 12px", cursor: "pointer",
            }}>Skip to journey →</button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── SELECTION SCREEN ── */}
        {view === "select" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px 24px" }}>
            <div style={{ maxWidth: 720 }}>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F2F5F2", margin: "0 0 8px" }}>
                  Choose your integrations
                </h1>
                <p style={{ fontSize: 13, color: "#8FA99A", margin: 0, lineHeight: 1.6 }}>
                  Select the tools you use. Fuel will pull signals from each one to power your tracks.
                  York IE integrations are included automatically.
                </p>
              </div>

              {CATEGORIES.map(cat => {
                const items = INTEGRATIONS.filter(i => i.category === cat);
                const catColor = items.find(i => i.method !== "york")?.color ?? "#3DD68C";
                return (
                  <div key={cat} style={{ marginBottom: 28 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: catColor,
                      textTransform: "uppercase", letterSpacing: "0.6px",
                      marginBottom: 10,
                    }}>{cat}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                      {items.map(item => {
                        const isYork = item.method === "york";
                        const isSel = selectedIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleSelect(item.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "11px 13px",
                              background: isSel ? "rgba(61,214,140,0.06)" : "#172632",
                              border: isSel ? "1px solid rgba(61,214,140,0.25)" : "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 9, cursor: isYork ? "default" : "pointer",
                              textAlign: "left", transition: "all 0.15s",
                            }}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                              background: item.color + "22",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, fontWeight: 800, color: item.color,
                            }}>{item.abbr}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: isSel ? "#F2F5F2" : "#8FA99A", marginBottom: 2 }}>
                                {item.name}
                              </div>
                              {isYork && (
                                <span style={{ fontSize: 9.5, color: "#3DD68C", fontWeight: 600 }}>York IE · Auto-connected</span>
                              )}
                            </div>
                            <div style={{
                              width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                              background: isSel ? "rgba(61,214,140,0.15)" : "transparent",
                              border: isSel ? "1px solid rgba(61,214,140,0.5)" : "1px solid rgba(255,255,255,0.12)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {isSel && <span style={{ fontSize: 9, color: "#3DD68C" }}>✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Fixed bottom bar */}
          <div style={{
            flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.07)",
            background: "#1F3140", padding: "16px 48px",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <button
              onClick={goToConfigure}
              disabled={selectedIds.filter(id => !YORK_IDS.includes(id)).length === 0}
              style={{
                background: selectedIds.filter(id => !YORK_IDS.includes(id)).length > 0
                  ? "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)"
                  : "rgba(255,255,255,0.06)",
                color: selectedIds.filter(id => !YORK_IDS.includes(id)).length > 0 ? "#0a1a12" : "#3A4F5E",
                border: "none", borderRadius: 8, padding: "11px 28px",
                fontSize: 13, fontWeight: 800,
                cursor: selectedIds.filter(id => !YORK_IDS.includes(id)).length > 0 ? "pointer" : "default",
                transition: "all 0.2s",
              }}
            >
              Configure selected ({selectedIds.filter(id => !YORK_IDS.includes(id)).length}) →
            </button>
            <span style={{ fontSize: 11, color: "#3A4F5E" }}>
              {selectedIds.length} integrations selected · York IE integrations always included
            </span>
          </div>
          </div>
        )}

        {/* ── CONFIGURE SCREEN ── */}
        {view === "configure" && (
          <>
            {/* Sidebar — only selected integrations */}
            <div style={{
              width: 232, flexShrink: 0, background: "#1F3140",
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
                              flex: 1, fontSize: 12, color: isActive ? "#F2F5F2" : "#8FA99A",
                              fontWeight: isActive ? 600 : 400,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{item.name}</span>
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
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 7, padding: "8px 12px",
                    fontSize: 11, fontWeight: 600, color: "#8FA99A", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> Select more integrations
                </button>
              </div>
            </div>

            {/* Main config panel */}
            <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
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
                      <span style={{ fontSize: 18, fontWeight: 800, color: "#F2F5F2" }}>{active.name}</span>
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                        background: active.color + "18", color: active.color, border: `1px solid ${active.color}30`,
                      }}>{active.category}</span>
                      {active.method === "york" && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#3DD68C", background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: 4, padding: "2px 7px" }}>York IE</span>
                      )}
                    </div>
                    <StatusPill status={statuses[active.id]} />
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 13, color: "#8FA99A", lineHeight: 1.65, margin: "0 0 18px" }}>
                  {active.description}
                </p>

                {/* What Fuel pulls */}
                <div style={{
                  background: "#1F3140", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10, padding: "13px 16px", marginBottom: 22,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#3A4F5E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                    What Fuel pulls from {active.name}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                    {active.dataProvided.map(d => (
                      <div key={d} style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
                        <span style={{ color: active.color, fontSize: 10, marginTop: 2, flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: 12, color: "#8FA99A" }}>{d}</span>
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
                      <div style={{ fontSize: 12, color: "#8FA99A", lineHeight: 1.55 }}>This integration is part of your York IE relationship and requires no additional setup.</div>
                    </div>
                  </div>
                )}

                {active.method === "oauth" && (
                  <div style={{ background: "#1F3140", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "18px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#F2F5F2", marginBottom: 6 }}>Authenticate via {active.name}</div>
                    <div style={{ fontSize: 12, color: "#8FA99A", lineHeight: 1.6, marginBottom: 18 }}>
                      {"You'll be redirected to "}{active.name}{" to authorise Fuel's read-only access. We request only the minimum permissions needed to pull your data."}
                    </div>
                    {!isConnected ? (
                      <button onClick={handleOAuth} disabled={isConnecting} style={{
                        display: "flex", alignItems: "center", gap: 9,
                        background: isConnecting ? "rgba(255,255,255,0.05)" : active.color,
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
                  <div style={{ background: "#1F3140", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "18px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#F2F5F2" }}>API credentials</div>
                    {(active.apiFields ?? []).map(field => (
                      <div key={field.key}>
                        <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#8FA99A", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 7 }}>
                          {field.label}
                        </label>
                        <input
                          type={field.key.includes("key") || field.key.includes("token") || field.key.includes("secret") ? "password" : "text"}
                          value={apiVals[field.key] ?? ""}
                          onChange={e => setApiField(active.id, field.key, e.target.value)}
                          placeholder={field.placeholder}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            background: "#132130", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 7, padding: "9px 12px",
                            fontSize: 12, color: "#F2F5F2", outline: "none",
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
                    <span style={{ fontSize: 11, color: "#3A4F5E" }}>Add this integration anytime from the Fuel Store</span>
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
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#F2F5F2", marginBottom: 6 }}>
                      {connectedCount} integration{connectedCount !== 1 ? "s" : ""} connected
                    </div>
                    <div style={{ fontSize: 12, color: "#8FA99A", marginBottom: 18, lineHeight: 1.6 }}>
                      Your Fuel journey tracks are ready. Signals will start flowing as your integrations sync.
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
            <div style={{
              width: 210, flexShrink: 0, background: "#1F3140",
              borderLeft: "1px solid rgba(255,255,255,0.07)",
              padding: "20px 16px", overflowY: "auto",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#3A4F5E", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Progress</div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 4, marginBottom: 6 }}>
                <div style={{
                  height: 4, borderRadius: 4,
                  background: "linear-gradient(90deg, rgb(0,180,138), rgb(236,214,127))",
                  width: selectedNonYork.length > 0 ? `${(selectedNonYork.filter(i => statuses[i.id] === "connected" || statuses[i.id] === "skipped").length / selectedNonYork.length) * 100}%` : "0%",
                  transition: "width 0.4s ease",
                }} />
              </div>
              <div style={{ fontSize: 11, color: "#556878", marginBottom: 20 }}>
                {selectedNonYork.filter(i => statuses[i.id] === "connected").length} of {selectedNonYork.length} configured
              </div>

              {CATEGORIES.map(cat => {
                const items = selectedIntegrations.filter(i => i.category === cat);
                if (items.length === 0) return null;
                const catColor = items[0]?.color ?? "#3DD68C";
                return (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: catColor, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>{cat}</div>
                    {items.map(item => {
                      const s = statuses[item.id];
                      return (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 0" }}>
                          <span style={{ fontSize: 11, color: s === "connected" ? "#3DD68C" : s === "skipped" ? "#3A4F5E" : s === "connecting" ? "#D4924A" : "#3A4F5E" }}>
                            {s === "connected" ? "✓" : s === "skipped" ? "–" : s === "connecting" ? "●" : "○"}
                          </span>
                          <span style={{ fontSize: 11, color: s === "connected" ? "#8FA99A" : "#3A4F5E" }}>{item.name}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
