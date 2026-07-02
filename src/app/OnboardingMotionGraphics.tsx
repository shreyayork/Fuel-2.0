import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";

// ─── Shared types (mirrors OnboardingFlow) ───────────────────────────────────

type SearchState = "idle" | "searching" | "review";

interface ProfileForm {
  company: string;
  industry: string;
  businessModel: string;
  website: string;
  city?: string;
  stateRegion?: string;
}

interface Answers {
  productType?: string;
  buildStage?: string;
  productChallenge?: string;
  salesMotion?: string;
  funnelBreakdown?: string;
  investorIntros?: string;
  pipelineTool?: string;
  salesProcess?: string;
  runway?: string;
  arr?: string;
  arrGrowth?: string;
  nrr?: string;
  grossMargin?: string;
  logoRetention?: string;
  monthlyBurn?: string;
  cashOnHand?: string;
  headcount?: string;
  payingCustomers?: string;
  invPortfolioCount?: string;
  invActiveDeals?: string;
  invDealsClosed?: string;
  invMedianGrowth?: string;
  invFollowOnRate?: string;
  invAum?: string;
}

// ─── Motion tokens ───────────────────────────────────────────────────────────

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_SPRING = { type: "spring" as const, stiffness: 260, damping: 28 };

/** GTM funnel — 1:1 with the funnel breakdown question and motion graphic */
export const GTM_FUNNEL_STAGES = [
  { label: "Awareness", pct: 100, desc: "People don't know we exist" },
  { label: "Conversion", pct: 48, desc: "Engaged but not buying" },
  { label: "Retention", pct: 20, desc: "Buying but not staying" },
] as const;

export type GtmFunnelStage = (typeof GTM_FUNNEL_STAGES)[number]["label"];

export const GTM_FUNNEL_CHOICES = GTM_FUNNEL_STAGES.map(({ label, desc }) => ({ label, desc }));

export const GTM_FUNNEL_OPTIONS: GtmFunnelStage[] = GTM_FUNNEL_STAGES.map(s => s.label);

export const GTM_FUNNEL_HINTS: Record<GtmFunnelStage, string> = {
  Awareness: "Top-of-funnel is the leak — Fuel benchmarks demand channels and ICP reach vs your cohort.",
  Conversion: "Engaged but not buying — Fuel tracks win rate, sales cycle, and deal-stage conversion.",
  Retention: "Buying but not staying — Fuel surfaces churn risk, NRR, and expansion signals account-by-account.",
};

export const GTM_FUNNEL_CALLOUTS: Record<GtmFunnelStage, string> = {
  Awareness: "Demand intelligence queued — ICP, channel mix, and top-of-funnel playbooks",
  Conversion: "Conversion playbooks queued — pipeline velocity, win rate, and close diagnostics",
  Retention: "Retention playbooks queued — NRR, logo health, and expansion signals",
};

function normalizeFunnelStage(raw?: string): GtmFunnelStage {
  if (!raw) return "Conversion";
  if (raw === "Close" || raw === "Pipeline" || raw === "Interest" || raw === "Consideration") return "Conversion";
  if (GTM_FUNNEL_OPTIONS.includes(raw as GtmFunnelStage)) return raw as GtmFunnelStage;
  return "Conversion";
}

function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function parseMetricVal(s: string): number | null {
  if (!s.trim()) return null;
  const c = s.replace(/[$,\s]/g, "");
  const m = c.match(/^([\d.]+)\s*M$/i);
  if (m) return parseFloat(m[1]) * 1_000_000;
  const k = c.match(/^([\d.]+)\s*K$/i);
  if (k) return parseFloat(k[1]) * 1_000;
  const p = c.match(/^([\d.]+)\s*%?$/);
  if (p) return parseFloat(p[1]);
  return null;
}

function MaskedValue({ fontSize = 13, wide = false }: { fontSize?: number; wide?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        fontSize,
        fontWeight: 800,
        color: "#8A9E96",
        letterSpacing: "0.1em",
        filter: "blur(4px)",
        userSelect: "none",
        lineHeight: 1,
      }}
    >
      {wide ? "••••" : "•••"}
    </span>
  );
}

type DevSelectionRow = { label: string; value: string; meaning: string };

const BUILD_STAGE_MEANINGS: Record<string, string> = {
  "Pre-launch — still building": "Intelligence weighted toward MVP scope, launch gates, and first ship.",
  "Launched — early users or customers": "Intelligence weighted toward iteration loops and early-user feedback.",
  "Scaling — product is proven, growing fast": "Intelligence weighted toward reliability, scale guardrails, and throughput.",
};

const PRODUCT_TYPE_MEANINGS: Record<string, string> = {
  "SaaS / web app": "Recurring software — roadmap tied to adoption, retention, and release cadence.",
  "Marketplace": "Two-sided platform — balance supply-side and demand-side delivery priorities.",
  "API or developer platform": "Developer product — API stability, docs, and integration velocity.",
  "Other": "Custom product model — Fuel adapts intelligence to your stack and motion.",
};

const CHALLENGE_SUMMARIES: Record<string, string> = {
  "Speed of execution": "Fuel centers Development intelligence on release cadence, WIP discipline, and shipping throughput.",
  "Quality and reliability": "Fuel centers Development intelligence on release stability, defect reduction, and test coverage.",
  "Roadmap clarity": "Fuel centers Development intelligence on stakeholder alignment, prioritization, and revenue-tied bets.",
  "Not enough engineers": "Fuel centers Development intelligence on capacity planning, hiring sequence, and leverage per engineer.",
};

function shortBuildStage(stage: string): string {
  return stage.split("—")[0]?.trim() || stage;
}

function deriveDevIntelligence(answers: Partial<Answers>) {
  const challenge = answers.productChallenge;
  const stage = answers.buildStage;

  const selections: DevSelectionRow[] = [];
  if (stage) {
    selections.push({
      label: "Build stage",
      value: shortBuildStage(stage),
      meaning: BUILD_STAGE_MEANINGS[stage] ?? "Shapes which Development intelligence Fuel prioritizes.",
    });
  }
  if (answers.productType) {
    selections.push({
      label: "Product type",
      value: answers.productType,
      meaning: PRODUCT_TYPE_MEANINGS[answers.productType] ?? "Defines how Fuel frames your product context.",
    });
  }
  if (challenge) {
    selections.push({
      label: "Top challenge",
      value: challenge,
      meaning: CHALLENGE_SUMMARIES[challenge] ?? "Primary Development focus for intelligence.",
    });
  }

  return {
    focus: challenge
      ? { label: challenge, summary: CHALLENGE_SUMMARIES[challenge] ?? "Fuel maps Development intelligence to your stated challenge." }
      : null,
    selections,
    stackLine: [stage ? shortBuildStage(stage) : null, answers.productType?.split("/")[0]?.trim()].filter(Boolean).join(" · ")
      || "Answer Development questions to shape your profile",
  };
}

type GtmFunnelRow = { label: GtmFunnelStage; pct: number; desc: string; signal: string; isHot: boolean };

function deriveGtmIntelligence(answers: Partial<Answers>) {
  const motion = answers.salesMotion || "Not yet";
  const breakdown = answers.funnelBreakdown ? normalizeFunnelStage(answers.funnelBreakdown) : null;

  const stageOk: Record<GtmFunnelStage, string> = {
    Awareness: "Reach building",
    Conversion: "Engaged leads",
    Retention: "Customers staying",
  };
  const stageGap: Record<GtmFunnelStage, string> = {
    Awareness: "Visibility gap",
    Conversion: "Not converting",
    Retention: "Churn risk",
  };

  const funnel: GtmFunnelRow[] = GTM_FUNNEL_STAGES.map(stage => ({
    ...stage,
    signal: breakdown && stage.label === breakdown ? stageGap[stage.label] : stageOk[stage.label],
    isHot: breakdown === stage.label,
  }));

  const motionKpis: Record<string, [{ label: string; value: string }, { label: string; value: string }]> = {
    "Sales-led": [{ label: "Primary motion", value: "AE-led" }, { label: "Deal shape", value: "Multi-touch" }],
    "Product-led": [{ label: "Primary motion", value: "Self-serve" }, { label: "Conversion", value: "PQL → paid" }],
    "Founder-led": [{ label: "Primary motion", value: "Founder-close" }, { label: "Deal shape", value: "High-touch" }],
    "Not yet": [{ label: "Primary motion", value: "Forming" }, { label: "GTM stage", value: "Early" }],
  };

  const introsLine = answers.investorIntros === "Actively fundraising"
    ? "Fundraise mode — investor intro signals active"
    : answers.investorIntros === "Yes"
      ? "Open to York IE investor introductions"
      : answers.investorIntros === "Not right now"
        ? "Investor intros paused"
        : null;

  return {
    funnel,
    kpis: motionKpis[motion] ?? motionKpis["Not yet"],
    callout: breakdown ? GTM_FUNNEL_CALLOUTS[breakdown] : motion !== "Not yet" ? `Playbooks aligned to ${motion.toLowerCase()} motion` : "Select your sales motion and funnel gap",
    introsLine,
    motion,
  };
}

function deriveRevopsIntelligence(answers: Partial<Answers>) {
  const tool = answers.pipelineTool;
  const process = answers.salesProcess;
  const runway = answers.runway;

  const maturityLabel = !tool && !process
    ? "Profiling"
    : tool === "CRM" && process === "Documented"
      ? "Operational"
      : tool === "CRM" || process === "Documented"
        ? "Emerging"
        : "Early-stage";

  const runwayMeta: Record<string, { color: string; tag: string; insight: string }> = {
    "Under 6 months": { color: "#E56B6B", tag: "Tight runway", insight: "Prioritize burn efficiency and pipeline conversion — extension scenarios queued." },
    "6–12 months": { color: "#D4924A", tag: "Manageable runway", insight: "Balance growth spend with pipeline coverage — efficiency playbooks ready." },
    "12–18 months": { color: "#8B76D4", tag: "Comfortable runway", insight: "Room to invest — Fuel models growth vs. discipline tradeoffs." },
    "Over 18 months": { color: "#00B48A", tag: "Strong runway", insight: "Capital buffer supports growth bets — deployment scenarios active." },
  };

  const runwayInfo = runway ? runwayMeta[runway] : null;

  const stackSignals = [
    tool ? { label: "Pipeline tracking", value: tool } : null,
    process ? { label: "Sales process", value: process } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return {
    runway: runway || "Add runway",
    runwayInfo,
    maturityLabel,
    stackSignals,
    stackLine: [tool, process].filter(Boolean).join(" · ") || "Answer G&A questions to model your stack",
    insight: runwayInfo?.insight ?? (tool && process ? "Fuel links pipeline hygiene to forecast confidence." : "Pipeline tool and sales process shape your G&A model."),
  };
}

function SignalValue({ children, color = "#1A2B26", fontSize = 12 }: { children: React.ReactNode; color?: string; fontSize?: number }) {
  return (
    <span style={{ fontSize, fontWeight: 700, color, textAlign: "right" as const, lineHeight: 1.3 }}>
      {children}
    </span>
  );
}

// ─── Shell & primitives ──────────────────────────────────────────────────────

function MotionShell({ children, accent = "#00B48A" }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
        style={{
          position: "absolute", width: 520, height: 520, borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}18 0%, transparent 68%)`,
          top: "50%", left: "50%", x: "-50%", y: "-58%", pointerEvents: "none",
        }}
      />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: "100%", maxWidth: 420, padding: "0 28px", position: "relative", zIndex: 1 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function FuelProductCard({
  title, subtitle, children, delay = 0,
}: { title: string; subtitle?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, delay, ease: EASE_OUT }}
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        boxShadow: "0 24px 64px rgba(8, 40, 32, 0.12), 0 4px 16px rgba(8, 40, 32, 0.06)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid #EEF2F0" }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: "linear-gradient(135deg, rgb(0,180,138) 0%, rgb(236,214,127) 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 900, color: "#0a1a12",
        }}>F</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2B26", letterSpacing: "-0.2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 10.5, color: "#8A9E96", marginTop: 1 }}>{subtitle}</div>}
        </div>
        <div style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #00B48A, #2BB8A0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 800, color: "#fff",
        }}>{title[0]?.toUpperCase() || "F"}</div>
      </div>
      <div style={{ padding: "22px 20px 24px", minHeight: 220, position: "relative", background: "#FAFCFB" }}>
        {children}
      </div>
    </motion.div>
  );
}

function InsightCursor({ label, color = "#F24E1E", path }: { label: string; color?: string; path: { x: number; y: number }[] }) {
  const mx = useMotionValue(path[0].x);
  const my = useMotionValue(path[0].y);
  const sx = useSpring(mx, { stiffness: 120, damping: 22 });
  const sy = useSpring(my, { stiffness: 120, damping: 22 });

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % path.length;
      mx.set(path[i].x);
      my.set(path[i].y);
    }, 2200);
    return () => clearInterval(t);
  }, [path, mx, my]);

  return (
    <motion.div style={{ position: "absolute", left: sx, top: sy, zIndex: 10, pointerEvents: "none" }}>
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}>
        <path d="M1 1L1 17.5L5.5 13.5L9 20L11.5 18.5L8 12.5L14.5 12.5L1 1Z" fill={color} stroke="#fff" strokeWidth="1.2" />
      </svg>
      <motion.div
        key={label}
        initial={{ opacity: 0, x: -6, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        style={{
          position: "absolute", left: 16, top: 14,
          background: color, color: "#fff",
          fontSize: 11, fontWeight: 700, padding: "4px 10px",
          borderRadius: 4, whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        {label}
      </motion.div>
    </motion.div>
  );
}

function SceneDots({ count, active }: { count: number; active: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 22 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === active ? 22 : 6, opacity: i === active ? 1 : 0.35 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          style={{ height: 6, borderRadius: 3, background: i === active ? "#1A2B26" : "#1A2B26" }}
        />
      ))}
    </motion.div>
  );
}

function StaggerItem({ children, i = 0 }: { children: React.ReactNode; i?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + i * 0.1, duration: 0.45, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

function PulseRing({ color = "#00B48A" }: { color?: string }) {
  return (
    <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 20px" }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.8], opacity: [0.35, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: `2px solid ${color}`,
          }}
        />
      ))}
      <div style={{
        position: "absolute", inset: 8, borderRadius: "50%",
        background: `${color}14`, border: `2px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26,
      }}>◎</div>
    </div>
  );
}

// ─── Profile scene ───────────────────────────────────────────────────────────

export function ProfileMotion({ searchState, form, companyQuery, isInvestor = false }: {
  searchState: SearchState; form: ProfileForm; companyQuery: string; isInvestor?: boolean;
}) {
  const company = form.company || companyQuery || "your company";
  const displayName = company;

  const cursorPath = useMemo(() => [
    { x: 60, y: 90 }, { x: 180, y: 70 }, { x: 140, y: 150 }, { x: 90, y: 120 }, { x: 200, y: 130 },
  ], []);

  const scanItems = ["Homepage", "Crunchbase", "LinkedIn", "Funding signals"];

  return (
    <MotionShell accent="#00B48A">
      <AnimatePresence mode="wait">
        {searchState === "idle" && (
          <motion.div key="idle" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35 }}>
            <FuelProductCard title={`${displayName}'s workspace`} subtitle="Select a company to begin">
              <div style={{ textAlign: "center", paddingTop: 12 }}>
                <PulseRing />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2B26", marginBottom: 6 }}>{displayName}</div>
                <div style={{ fontSize: 12, color: "#8A9E96", lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
                  {isInvestor
                    ? "Fuel will build your fund profile — portfolio benchmarks, deal suggestions, and pipeline intelligence."
                    : "Fuel will build your operating profile from funding, industry, and cohort signals."}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 22 }}>
                  {(isInvestor ? ["Portfolio", "Deal flow", "Sectors", "Fuel AI"] : ["Company data", "Funding", "Industry", "Cohort"]).map((label, i) => (
                    <motion.span
                      key={label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.12, duration: 0.4, ease: EASE_OUT }}
                      style={{
                        fontSize: 11, fontWeight: 600, color: "#5A7A70",
                        background: "#EEF6F3", border: "1px solid #D4E8E0",
                        borderRadius: 20, padding: "5px 12px",
                      }}
                    >
                      {label}
                    </motion.span>
                  ))}
                </div>
              </div>
              <InsightCursor label={displayName} color="#00B48A" path={cursorPath} />
            </FuelProductCard>
          </motion.div>
        )}

        {searchState === "searching" && (
          <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <FuelProductCard title={`Building ${displayName}…`} subtitle="Enriching profile">
              <div style={{ position: "relative" }}>
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "absolute", left: 0, right: 0, height: 2,
                    background: "linear-gradient(90deg, transparent, #00B48A, transparent)",
                    zIndex: 2,
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
                  {scanItems.map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.2, duration: 0.45, ease: EASE_OUT }}
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
                        style={{ width: 8, height: 8, borderRadius: "50%", background: "#00B48A", flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#E8F0ED", overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ delay: 0.3 + i * 0.35, duration: 1.1, ease: EASE_OUT }}
                          style={{ height: "100%", background: "linear-gradient(90deg, #00B48A, #7EDFC4)", borderRadius: 4 }}
                        />
                      </div>
                      <span style={{ fontSize: 11, color: "#8A9E96", width: 90, flexShrink: 0 }}>{item}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </FuelProductCard>
          </motion.div>
        )}

        {searchState === "review" && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <FuelProductCard title={`${company}'s profile`} subtitle={isInvestor ? "Fund matched · portfolio intelligence" : "Cohort matched"}>
              <InsightCursor label={company} color="#F24E1E" path={cursorPath} />
              {(isInvestor ? [
                { k: "Focus", v: form.industry || "Venture · Value Creation" },
                { k: "Model", v: form.businessModel?.split("+")[0]?.trim() || "Investment" },
                { k: "HQ", v: [form.city, form.stateRegion].filter(Boolean).join(", ") || "—" },
                { k: "Fuel AI", v: "Deal + portfolio ready" },
              ] : [
                { k: "Industry", v: form.industry || "FinTech · Payments" },
                { k: "Model", v: form.businessModel?.split("/")[0]?.trim() || "Product" },
                { k: "Website", v: form.website?.replace(/^https?:\/\//, "") || "—" },
                { k: "Cohort", v: "Seed · B2B · NA" },
              ]).map((row, i) => (
                <StaggerItem key={row.k} i={i}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", marginBottom: 6,
                    background: "#fff", borderRadius: 10, border: "1px solid #E8F0ED",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#8A9E96", textTransform: "uppercase", letterSpacing: "0.4px" }}>{row.k}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2B26" }}>{row.v}</span>
                  </div>
                </StaggerItem>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.45, ease: EASE_OUT }}
                style={{ marginTop: 10, padding: "10px 12px", background: "#E8F8F3", borderRadius: 10, border: "1px solid #B8E8D8" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#00B48A" }}>Profile completeness</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#00B48A" }}>82%</span>
                </div>
                <div style={{ height: 5, background: "#C8E8DC", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "82%" }}
                    transition={{ delay: 0.7, duration: 1, ease: EASE_OUT }}
                    style={{ height: "100%", background: "linear-gradient(90deg, #00B48A, #2BB8A0)", borderRadius: 3 }}
                  />
                </div>
              </motion.div>
            </FuelProductCard>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionShell>
  );
}

// ─── Development scene ───────────────────────────────────────────────────────

export function DevMotion({ answers, companyName = "Your company" }: { answers: Partial<Answers>; companyName?: string }) {
  const intel = useMemo(() => deriveDevIntelligence(answers), [answers]);

  return (
    <MotionShell accent="#3DD68C">
      <FuelProductCard title={`${companyName}`} subtitle={intel.stackLine}>
        {intel.focus ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ marginBottom: 14, padding: "10px 12px", background: "#E8F8F3", borderRadius: 8, border: "1px solid #B8E8D8" }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, color: "#00B48A", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>
              Development focus
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1A2B26", marginBottom: 4 }}>{intel.focus.label}</div>
            <div style={{ fontSize: 11, color: "#5A7A70", lineHeight: 1.55 }}>{intel.focus.summary}</div>
          </motion.div>
        ) : (
          <div style={{ fontSize: 11, color: "#8A9E96", lineHeight: 1.6, marginBottom: 14 }}>
            Answer the Development questions — Fuel will map your selections to intelligence.
          </div>
        )}
        {intel.selections.length > 0 ? (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#8A9E96", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>
              From your answers
            </div>
            {intel.selections.map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, ...EASE_SPRING }}
                style={{
                  padding: "10px 12px", marginBottom: 8,
                  background: "#fff", borderRadius: 8, border: "1px solid #E8F0ED",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#8A9E96" }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2B26", textAlign: "right" }}>{row.value}</span>
                </div>
                <div style={{ fontSize: 10, color: "#5A7A70", lineHeight: 1.5 }}>{row.meaning}</div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#8A9E96", lineHeight: 1.6 }}>
            Selections appear here as you complete each question.
          </div>
        )}
      </FuelProductCard>
    </MotionShell>
  );
}

// ─── GTM scene ───────────────────────────────────────────────────────────────

export function GtmMotion({ answers, companyName = "Your company" }: { answers: Partial<Answers>; companyName?: string }) {
  const intel = useMemo(() => deriveGtmIntelligence(answers), [answers]);

  return (
    <MotionShell accent="#D4924A">
      <FuelProductCard title={`${companyName}`} subtitle={answers.salesMotion ? `GTM · ${answers.salesMotion} motion` : "GTM funnel · pipeline intelligence"}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
          {intel.funnel.map((stage, i) => {
            const taperPct = Math.max(stage.pct, 28);
            return (
              <motion.div
                key={stage.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.45, ease: EASE_OUT }}
                style={{ width: "100%", position: "relative" }}
              >
                <motion.div
                  animate={stage.isHot ? { boxShadow: ["0 0 0 rgba(212,146,74,0)", "0 0 16px rgba(212,146,74,0.35)", "0 0 0 rgba(212,146,74,0)"] } : {}}
                  transition={{ duration: 2, repeat: stage.isHot ? Infinity : 0 }}
                  style={{
                    position: "relative",
                    width: "100%",
                    background: stage.isHot ? "#FFF8EE" : "#fff",
                    border: `1.5px solid ${stage.isHot ? "#D4924A" : "#E8F0ED"}`,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${taperPct}%`,
                    background: stage.isHot ? "rgba(212,146,74,0.12)" : "rgba(212,146,74,0.06)",
                    borderRadius: "6px 0 0 6px",
                  }} />
                  <div style={{
                    position: "relative",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 12px", gap: 8, minHeight: 34,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 11, color: "#5A7A70", whiteSpace: "nowrap" }}>{stage.label}</span>
                      <div style={{ fontSize: 9, color: "#8A9E96", marginTop: 1 }}>{stage.desc}</div>
                    </div>
                    <SignalValue color={stage.isHot ? "#D4924A" : "#1A2B26"} fontSize={11}>{stage.signal}</SignalValue>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {intel.kpis.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.4, ease: EASE_OUT }}
              style={{ background: "#fff", border: "1px solid #E8F0ED", borderRadius: 8, padding: "10px 12px" }}
            >
              <div style={{ fontSize: 9, fontWeight: 700, color: "#8A9E96", textTransform: "uppercase", letterSpacing: "0.4px" }}>{m.label}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1A2B26", marginTop: 4, lineHeight: 1.3 }}>{m.value}</div>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ...EASE_SPRING }}
          style={{ marginTop: 12, padding: "8px 12px", background: "#FFF8EE", borderRadius: 8, border: "1px solid #F0DFC0", fontSize: 11, color: "#A07030", fontWeight: 600, lineHeight: 1.5 }}
        >
          {intel.callout}
        </motion.div>
        {intel.introsLine && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, ...EASE_SPRING }}
            style={{ marginTop: 8, padding: "7px 12px", background: "#F4FAF8", borderRadius: 8, border: "1px solid #D4EDE6", fontSize: 10, color: "#5A7A70", fontWeight: 600 }}
          >
            {intel.introsLine}
          </motion.div>
        )}
      </FuelProductCard>
    </MotionShell>
  );
}

// ─── RevOps scene ────────────────────────────────────────────────────────────

export function RevopsMotion({ answers, companyName = "Your company" }: { answers: Partial<Answers>; companyName?: string }) {
  const intel = useMemo(() => deriveRevopsIntelligence(answers), [answers]);

  return (
    <MotionShell accent="#8B76D4">
      <FuelProductCard title={`${companyName}`} subtitle={intel.stackLine}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#8A9E96", textTransform: "uppercase" }}>Runway</div>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ fontSize: intel.runway.length > 14 ? 15 : 18, fontWeight: 800, color: intel.runwayInfo?.color ?? "#1A2B26", marginTop: 2, lineHeight: 1.25 }}>
              {intel.runway}
            </motion.div>
            {intel.runwayInfo && (
              <div style={{ fontSize: 10, color: intel.runwayInfo.color, fontWeight: 600, marginTop: 4 }}>{intel.runwayInfo.tag}</div>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#8A9E96", textTransform: "uppercase" }}>Ops maturity</div>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ fontSize: 16, fontWeight: 800, color: "#1A2B26", marginTop: 2 }}>
              {intel.maturityLabel}
            </motion.div>
          </div>
        </div>
        {intel.stackSignals.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#8A9E96", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>
              From your answers
            </div>
            {intel.stackSignals.map((row, i) => (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.1, ...EASE_SPRING }}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 12px", marginBottom: 6,
                  background: "#fff", borderRadius: 8, border: "1px solid #E8F0ED",
                }}
              >
                <span style={{ fontSize: 10, color: "#8A9E96" }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2B26" }}>{row.value}</span>
              </motion.div>
            ))}
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, ...EASE_SPRING }}
          style={{ marginTop: 10, padding: "8px 12px", background: "#F5F0FA", borderRadius: 8, border: "1px solid #E0D4F0", fontSize: 11, color: "#6B5A8A", fontWeight: 600, lineHeight: 1.5 }}
        >
          {intel.insight}
        </motion.div>
      </FuelProductCard>
    </MotionShell>
  );
}

// ─── Investment scene ────────────────────────────────────────────────────────

interface DealSuggestion {
  name: string;
  sector: string;
  stage: string;
  geo: string;
  checkFit: string[];
  growth: string;
  score: number;
}

const DEAL_SUGGESTIONS: DealSuggestion[] = [
  { name: "Patriot Pay", sector: "FinTech", stage: "Pre-seed / Seed", geo: "United States", checkFit: ["$500K – $2M"], growth: "85% ARR", score: 94 },
  { name: "Nexus AI", sector: "Deep tech / AI", stage: "Pre-seed / Seed", geo: "United States", checkFit: ["Under $500K", "$500K – $2M"], growth: "120% ARR", score: 91 },
  { name: "Mercury", sector: "FinTech", stage: "Series A / B", geo: "United States", checkFit: ["$2M – $10M", "Over $10M"], growth: "62% ARR", score: 88 },
  { name: "Vanta", sector: "SaaS / Software", stage: "Series A / B", geo: "United States", checkFit: ["$2M – $10M"], growth: "74% ARR", score: 86 },
  { name: "Ramp", sector: "FinTech", stage: "Growth / Series C+", geo: "United States", checkFit: ["Over $10M"], growth: "48% ARR", score: 82 },
  { name: "Deel", sector: "SaaS / Software", stage: "Growth / Series C+", geo: "Global", checkFit: ["$2M – $10M", "Over $10M"], growth: "55% ARR", score: 80 },
];

function filterDealSuggestions(
  stages: string[], sectors: string[], checkSize: string, geography: string,
): DealSuggestion[] {
  return DEAL_SUGGESTIONS
    .filter(d => {
      if (stages.length && !stages.includes(d.stage)) return false;
      if (sectors.length && !sectors.some(s => d.sector.includes(s.split("/")[0].trim()) || s.includes(d.sector.split("/")[0].trim()))) return false;
      if (checkSize && !d.checkFit.includes(checkSize)) return false;
      if (geography && geography !== "Global" && d.geo !== geography && geography !== "North America") return false;
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function SuggestionCard({ deal, i }: { deal: DealSuggestion; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.1, duration: 0.4, ease: EASE_OUT }}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "11px 13px", marginBottom: 8,
        background: "#fff", borderRadius: 10, border: "1px solid #DDD0F5",
        boxShadow: "0 2px 8px rgba(139,118,212,0.08)",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: "linear-gradient(135deg, #8B76D4, #B8A0E8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 800, color: "#fff",
      }}>
        {deal.name[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2B26" }}>{deal.name}</div>
        <div style={{ fontSize: 10, color: "#8A9E96", marginTop: 2 }}>{deal.stage} · {deal.growth}</div>
      </div>
      <div style={{
        fontSize: 11, fontWeight: 800, color: "#8B76D4",
        background: "#F3EFFE", borderRadius: 8, padding: "3px 8px", flexShrink: 0,
      }}>
        {deal.score}%
      </div>
    </motion.div>
  );
}

export function InvestmentMotion({
  investQ = 0,
  stages = [],
  sectors = [],
  checkSize = "",
  geography = "",
  pipeline = "",
  companyName = "Your fund",
}: {
  investQ?: number;
  stages?: string[];
  sectors?: string[];
  checkSize?: string;
  geography?: string;
  pipeline?: string;
  companyName?: string;
}) {
  const suggestions = useMemo(
    () => filterDealSuggestions(stages, sectors, checkSize, geography),
    [stages, sectors, checkSize, geography],
  );

  const stageBars = useMemo(() => {
    const pool = stages.length ? stages : ["Pre-seed / Seed", "Series A / B", "Growth / Series C+"];
    const vals = [14, 9, 5, 3];
    return pool.slice(0, 4).map((s, i) => ({
      stage: s.replace(" / ", " · "),
      deals: vals[i] ?? 4,
      pct: Math.max(20, 100 - i * 22),
    }));
  }, [stages]);

  const subtitles = [
    stages.length ? `Stage focus · ${stages.join(", ")}` : "Stage focus · deal flow",
    sectors.length ? `Sectors · ${sectors.slice(0, 2).join(", ")}` : "Smart company suggestions",
    checkSize ? `Check size · ${checkSize}` : "Deal sizing · portfolio fit",
    geography ? `Geography · ${geography}` : "Geo-matched opportunities",
    pipeline ? `Pipeline · ${pipeline}` : "Deal pipeline · CRM connect",
  ];

  return (
    <MotionShell accent="#8B76D4">
      <FuelProductCard title={companyName} subtitle={subtitles[investQ] ?? "Fund intelligence"}>
        <AnimatePresence mode="wait">
          {investQ === 0 && (
            <motion.div key="stages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8B76D4", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Stage-matched deal flow
              </div>
              {stageBars.map((s, i) => (
                <div key={s.stage} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#5A7A70" }}>{s.stage}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#8B76D4" }}>{s.deals} deals</span>
                  </div>
                  <div style={{ height: 5, background: "#E8F0ED", borderRadius: 3, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{ delay: 0.15 + i * 0.1, duration: 0.8, ease: EASE_OUT }}
                      style={{ height: "100%", background: "#8B76D4", borderRadius: 3 }}
                    />
                  </div>
                </div>
              ))}
              {stages.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                  {stages.map(s => (
                    <span key={s} style={{ fontSize: 10, fontWeight: 600, color: "#8B76D4", background: "#F3EFFE", border: "1px solid #DDD0F5", borderRadius: 12, padding: "4px 10px" }}>{s}</span>
                  ))}
                </div>
              )}

            </motion.div>
          )}

          {investQ === 1 && (
            <motion.div key="sectors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8B76D4", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Smart company suggestions
              </div>
              {(suggestions.length ? suggestions : DEAL_SUGGESTIONS.slice(0, 3)).map((d, i) => (
                <SuggestionCard key={d.name} deal={d} i={i} />
              ))}
              {sectors.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {sectors.map(s => (
                    <span key={s} style={{ fontSize: 10, fontWeight: 600, color: "#8B76D4", background: "#F3EFFE", border: "1px solid #DDD0F5", borderRadius: 12, padding: "4px 10px" }}>{s}</span>
                  ))}
                </div>
              )}

            </motion.div>
          )}

          {investQ === 2 && (
            <motion.div key="check" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8B76D4", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Portfolio · deal sizing
              </div>
              {[
                { label: "Thesis fit", pct: checkSize ? 88 : 52 },
                { label: "Check alignment", pct: checkSize ? 92 : 48 },
                { label: "Follow-on capacity", pct: checkSize ? 76 : 55 },
              ].map((b, i) => (
                <div key={b.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#5A7A70" }}>{b.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#8B76D4" }}>{b.pct}%</span>
                  </div>
                  <div style={{ height: 5, background: "#E8F0ED", borderRadius: 3, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${b.pct}%` }}
                      transition={{ delay: 0.15 + i * 0.1, duration: 0.8, ease: EASE_OUT }}
                      style={{ height: "100%", background: "#8B76D4", borderRadius: 3 }}
                    />
                  </div>
                </div>
              ))}
              {checkSize && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: "#F3EFFE", borderRadius: 10, border: "1px solid #DDD0F5", fontSize: 11, color: "#5A4A78", lineHeight: 1.55 }}>
                  Sweet spot: <strong>{checkSize}</strong> — {(suggestions.length ? suggestions : DEAL_SUGGESTIONS.slice(0, 2)).map(d => d.name).join(", ")} fit your range.
                </div>
              )}

            </motion.div>
          )}

          {investQ === 3 && (
            <motion.div key="geo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8B76D4", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {geography || "Geo-matched"} opportunities
              </div>
              {(suggestions.length ? suggestions : DEAL_SUGGESTIONS.filter(d => !geography || d.geo === geography || geography === "Global").slice(0, 3)).map((d, i) => (
                <SuggestionCard key={d.name} deal={d} i={i} />
              ))}
              {geography && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#8A9E96", lineHeight: 1.55 }}>
                  Prioritizing {geography} companies raising in your stage and sector focus.
                </div>
              )}

            </motion.div>
          )}

          {investQ === 4 && (
            <motion.div key="pipeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8B76D4", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {pipeline === "HubSpot" ? "HubSpot · connecting" : "Deal pipeline"}
              </div>
              {[
                { stage: "Sourced", count: 24, color: "#8B76D4" },
                { stage: "Diligence", count: 8, color: "#00B48A" },
                { stage: "Term sheet", count: 3, color: "#D4924A" },
                { stage: "Portfolio", count: pipeline ? 18 : 12, color: "#2BB8A0" },
              ].map((s, i) => (
                <motion.div
                  key={s.stage}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.35 }}
                  style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#5A7A70", flex: 1 }}>{s.stage}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.count}</span>
                </motion.div>
              ))}
              {pipeline && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, ...EASE_SPRING }}
                  style={{ marginTop: 10, padding: "10px 12px", background: "#E8F8F3", borderRadius: 10, border: "1px solid #B8E8D8", fontSize: 11, color: "#2A6B58", lineHeight: 1.55 }}
                >
                  {pipeline === "HubSpot"
                    ? "✓ HubSpot connection queued — deals, contacts, and notes will sync on setup."
                    : `We'll import your ${pipeline} pipeline and unify deal + portfolio tracking.`}
                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </FuelProductCard>
    </MotionShell>
  );
}

// ─── HubSpot connect scene (investor final step) ─────────────────────────────

type HubSpotStatus = "pending" | "connecting" | "connected";

const PIPELINE_DEALS = [
  { name: "Nexus AI", stage: "Diligence", value: "$1.2M", color: "#00B48A" },
  { name: "Patriot Pay", stage: "Term sheet", value: "$800K", color: "#D4924A" },
  { name: "Mercury", stage: "Sourced", value: "$2.5M", color: "#8B76D4" },
  { name: "Vanta", stage: "Portfolio", value: "$3.1M", color: "#2BB8A0" },
];

export function HubSpotMotion({ status, companyName = "Your fund" }: { status: HubSpotStatus; companyName?: string }) {
  const visibleDeals = status === "connected" ? PIPELINE_DEALS.length : status === "connecting" ? 2 : 0;

  return (
    <MotionShell accent="#FF7A59">
      <FuelProductCard title={companyName} subtitle={status === "connected" ? "HubSpot · pipeline loaded" : "HubSpot · deal pipeline"}>
        <AnimatePresence mode="wait">
          {status === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, margin: "0 auto 16px",
                  background: "#FFF0EB", border: "1px solid #FFD4C4",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800, color: "#FF7A59",
                }}>HS</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2B26", marginBottom: 6 }}>Your pipeline, ready to load</div>
                <div style={{ fontSize: 12, color: "#8A9E96", lineHeight: 1.65, maxWidth: 280, margin: "0 auto" }}>
                  Connect HubSpot and Fuel will import deals, contacts, and stages into your workspace.
                </div>
              </div>
              <div style={{ marginTop: 20, padding: "12px 14px", background: "#fff", borderRadius: 12, border: "1px dashed #E8D0C8" }}>
                {["Deal stages", "Contacts", "Companies", "Notes"].map((label, i) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < 3 ? 8 : 0, opacity: 0.45 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E8D0C8" }} />
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#F5EBE8" }} />
                    <span style={{ fontSize: 10, color: "#B8A8A0", width: 72, textAlign: "right" }}>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {(status === "connecting" || status === "connected") && (
            <motion.div key="sync" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#FF7A59", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {status === "connecting" ? "Syncing pipeline…" : "Pipeline loaded"}
              </div>
              {PIPELINE_DEALS.slice(0, visibleDeals).map((deal, i) => (
                <motion.div
                  key={deal.name}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: status === "connecting" ? i * 0.35 : i * 0.08, duration: 0.4, ease: EASE_OUT }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", marginBottom: 8,
                    background: "#fff", borderRadius: 10, border: "1px solid #F0E0DA",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: deal.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2B26" }}>{deal.name}</div>
                    <div style={{ fontSize: 10, color: "#8A9E96", marginTop: 1 }}>{deal.stage}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: deal.color }}>{deal.value}</span>
                </motion.div>
              ))}
              {status === "connecting" && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ fontSize: 11, color: "#8A9E96", textAlign: "center", marginTop: 8 }}
                >
                  Importing deals & contacts from HubSpot…
                </motion.div>
              )}
              {status === "connected" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  style={{ marginTop: 12, padding: "10px 12px", background: "#E8F8F3", borderRadius: 10, border: "1px solid #B8E8D8", fontSize: 11, color: "#2A6B58", lineHeight: 1.55 }}
                >
                  ✓ 24 deals · 156 contacts synced. Fuel AI is ready to surface insights from your pipeline.
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </FuelProductCard>
    </MotionShell>
  );
}

// ─── Sources scene (founder integrations) ────────────────────────────────────

type SourceStatus = "pending" | "connecting" | "connected";

const SLACK_ACCENT = "#4A9FD4";

const SIGNAL_ITEMS = [
  { cat: "Intelligence", label: "ARR growth above cohort P75", color: "#2BB8A0" },
  { cat: "Initiative", label: "Investor intro follow-up drafted", color: "#00B48A" },
  { cat: "Playbook", label: "Board prep playbook queued", color: "#D4924A" },
];

export function SourcesMotion({
  granolaStatus,
  slackStatus,
  hubspotStatus,
  companyName = "Your company",
}: {
  granolaStatus: SourceStatus;
  slackStatus: SourceStatus;
  hubspotStatus?: SourceStatus;
  companyName?: string;
}) {
  const anyConnected = granolaStatus === "connected" || slackStatus === "connected" || hubspotStatus === "connected";
  const anyConnecting = granolaStatus === "connecting" || slackStatus === "connecting" || hubspotStatus === "connecting";
  const signalCount = (granolaStatus === "connected" ? 2 : 0) + (slackStatus === "connected" ? 3 : 0) + (hubspotStatus === "connected" ? 2 : 0);

  return (
    <MotionShell accent="#00B48A">
      <FuelProductCard
        title={companyName}
        subtitle={anyConnected ? "Sources · intelligence active" : "Sources · meetings & updates"}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#00B48A", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Private sources → signal catalog
        </div>

        {/* Granola flow */}
        <motion.div
          animate={{ opacity: granolaStatus === "pending" ? 0.55 : 1 }}
          style={{
            padding: "12px 14px", marginBottom: 10,
            background: granolaStatus === "connected" ? "#FFFBF5" : "#fff",
            borderRadius: 12,
            border: `1px solid ${granolaStatus === "connected" ? "#F0DFC0" : "#E8F0ED"}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "#D4924A22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#D4924A" }}>G</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2B26" }}>Granola</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#D4924A", background: "#D4924A14", borderRadius: 4, padding: "1px 6px" }}>meetings</span>
          </div>
          {granolaStatus === "pending" && (
            <div style={{ fontSize: 11, color: "#8A9E96", lineHeight: 1.55 }}>Meeting summaries sync to watchlist & portfolio company sources.</div>
          )}
          {(granolaStatus === "connecting" || granolaStatus === "connected") && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <div style={{ fontSize: 11, color: "#5A7A70", marginBottom: 6 }}>Q4 board prep · {companyName}</div>
              <div style={{ fontSize: 11.5, color: "#1A2B26", lineHeight: 1.55, padding: "8px 10px", background: "#fff", borderRadius: 8, border: "1px solid #F0E4D0" }}>
                {granolaStatus === "connected"
                  ? "✓ Summary synced to private sources — investor sentiment and runway discussed."
                  : "Importing meeting summary…"}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Slack flow */}
        <motion.div
          animate={{ opacity: slackStatus === "pending" ? 0.55 : 1 }}
          style={{
            padding: "12px 14px", marginBottom: 14,
            background: slackStatus === "connected" ? "#F5FAFF" : "#fff",
            borderRadius: 12,
            border: `1px solid ${slackStatus === "connected" ? "#C8DFF0" : "#E8F0ED"}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: `${SLACK_ACCENT}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: SLACK_ACCENT }}>S</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2B26" }}>Slack</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: SLACK_ACCENT, background: `${SLACK_ACCENT}14`, borderRadius: 4, padding: "1px 6px" }}>chat</span>
          </div>
          {slackStatus === "pending" && (
            <div style={{ fontSize: 11, color: "#8A9E96", lineHeight: 1.55 }}>Investor update channels feed the signal catalog.</div>
          )}
          {(slackStatus === "connecting" || slackStatus === "connected") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {["#investor-updates", "#board-prep"].map((ch, i) => (
                <motion.div
                  key={ch}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.35 }}
                  style={{ fontSize: 11, color: "#5A7A70", padding: "6px 10px", background: "#fff", borderRadius: 8, border: "1px solid #D8E8F4" }}
                >
                  <span style={{ fontWeight: 700, color: SLACK_ACCENT }}>{ch}</span>
                  {slackStatus === "connected" ? " · 12 messages indexed" : " · monitoring…"}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {hubspotStatus !== undefined && (
          <motion.div
            animate={{ opacity: hubspotStatus === "pending" ? 0.55 : 1 }}
            style={{
              padding: "12px 14px", marginBottom: 14,
              background: hubspotStatus === "connected" ? "#FFF5F2" : "#fff",
              borderRadius: 12,
              border: `1px solid ${hubspotStatus === "connected" ? "#FFD4C8" : "#E8F0ED"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#FF7A5922", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#FF7A59" }}>HS</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1A2B26" }}>HubSpot CRM</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#FF7A59", background: "#FF7A5914", borderRadius: 4, padding: "1px 6px" }}>crm</span>
            </div>
            {hubspotStatus === "pending" && (
              <div style={{ fontSize: 11, color: "#8A9E96", lineHeight: 1.55 }}>Deal pipeline, contacts, and companies sync into Fuel.</div>
            )}
            {(hubspotStatus === "connecting" || hubspotStatus === "connected") && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                <div style={{ fontSize: 11, color: "#5A7A70", marginBottom: 6 }}>Pipeline · {companyName}</div>
                <div style={{ fontSize: 11.5, color: "#1A2B26", lineHeight: 1.55, padding: "8px 10px", background: "#fff", borderRadius: 8, border: "1px solid #FFD4C8" }}>
                  {hubspotStatus === "connected"
                    ? "✓ 24 deals and 156 contacts synced — pipeline health indexed."
                    : "Syncing deal pipeline…"}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Generated outputs */}
        <AnimatePresence>
          {(anyConnecting || anyConnected) && (
            <motion.div
              key="signals"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8A9E96", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                {anyConnected ? `Fuel generated ${signalCount || 1} signal${signalCount !== 1 ? "s" : ""}` : "Extracting signals…"}
              </div>
              {SIGNAL_ITEMS.slice(0, anyConnected ? Math.max(signalCount, 1) : 1).map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.12, duration: 0.35 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", marginBottom: 6,
                    background: "#fff", borderRadius: 10, border: `1px solid ${item.color}33`,
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, color: item.color, textTransform: "uppercase", width: 88, flexShrink: 0 }}>
                    {item.cat}{item.cat !== "Intelligence" ? " · suggested" : ""}
                  </span>
                  <span style={{ fontSize: 11, color: "#1A2B26", lineHeight: 1.4 }}>{item.label}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!anyConnecting && !anyConnected && (
          <div style={{ textAlign: "center", padding: "8px 0 4px", fontSize: 11, color: "#8A9E96", lineHeight: 1.6 }}>
            {hubspotStatus !== undefined
              ? "Connect Granola, Slack, or HubSpot to start building intelligence from real signals."
              : "Connect Granola or Slack to start building intelligence, initiatives, and playbooks from real signals."}
          </div>
        )}
      </FuelProductCard>
    </MotionShell>
  );
}

// ─── Benchmark scene ─────────────────────────────────────────────────────────

type InsightCat = "Intelligence" | "Initiative" | "Playbook";

type SignalCategory =
  | "board reporting" | "customer success" | "efficiency" | "finance"
  | "fundraising" | "growth" | "gtm" | "product" | "retention"
  | "strategic" | "team" | "vendor stack";

interface InsightCard {
  id: string;
  cat: InsightCat;
  color: string;
  icon: string;
  title: string;
  body: string;
  metricLabel: string;
  displayVal: string;
  signalCategory: SignalCategory;
  signalId: string;
  signalLabel: string;
  linkedIntelligenceId?: string;
  linkedIntelligenceTitle?: string;
}

interface MetricDef {
  key: keyof Answers;
  label: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  unit: string;
  format: (v: number) => string;
  signalCategory: SignalCategory;
  signalId: string;
  signalLabel: string;
}

type PerfTier = "top10" | "top25" | "above" | "below" | "weak";

const TIER_POSITION: Record<PerfTier, string> = {
  top10: "top 10%",
  top25: "top quartile",
  above: "above median",
  below: "below median",
  weak: "bottom quartile",
};

const FOUNDER_NEXT_STEPS: Record<string, Record<PerfTier, string>> = {
  arrGrowth: {
    top10: "Protect what's working — instrument leading indicators so growth doesn't slip before your next raise.",
    top25: "Push toward top-decile velocity — prioritize the demand levers that separate P75 from P90 in your cohort.",
    above: "Close the gap to top quartile — run a focused demand sprint on the channels converting best today.",
    below: "Treat growth as the bottleneck — tighten ICP focus and run the GTM plays peers used to reach median.",
    weak: "Reset the growth motion — start with the recovery playbook before adding spend or headcount.",
  },
  nrr: {
    top10: "Turn retention into expansion — identify accounts ready for upsell while churn stays near zero.",
    top25: "Push NRR toward best-in-class — run a structured expansion motion on your highest-fit accounts.",
    above: "Close the expansion gap — prioritize upsell and cross-sell on accounts already showing product pull.",
    below: "Stop leakage first — fix onboarding and health-score gaps before chasing new logos.",
    weak: "Run the NRR recovery sequence — peers regained median retention in ~90 days with this playbook.",
  },
  grossMargin: {
    top10: "Reinvest margin advantage — allocate savings toward highest-ROI growth without compressing unit economics.",
    top25: "Stretch toward elite margins — audit delivery cost and pricing power while demand is strong.",
    above: "Find the next margin point — review COGS and delivery mix to reach top-quartile economics.",
    below: "Fix unit economics before scaling — margin recovery unlocks runway and fundraising optionality.",
    weak: "Run a margin reset — cut delivery waste before increasing burn or sales spend.",
  },
  logoRetention: {
    top10: "Compound trust into growth — turn your sticky base into case studies, referrals, and expansion.",
    top25: "Push toward best-in-class retention — tighten health scores and proactive outreach on at-risk accounts.",
    above: "Close the retention gap — focus CS and onboarding on the accounts most likely to churn.",
    below: "Stop churn before chasing new logos — fix the first 90-day experience and support response loops.",
    weak: "Run the retention recovery playbook — peers recovered ~6pts in a quarter with this sequence.",
  },
  monthlyBurn: {
    top10: "Deploy capital deliberately — extend runway by investing only in signals that move ARR.",
    top25: "Keep burn disciplined — you have room to invest in growth without sacrificing efficiency.",
    above: "Trim toward median burn — find operational levers that don't slow what's already working.",
    below: "Extend runway now — tie burn review to cash position before options narrow.",
    weak: "Run the runway extension playbook — cut ~15% without hitting growth levers peers protected.",
  },
  cashOnHand: {
    top10: "Put cash to work — allocate toward highest-conviction bets while stress-testing downside scenarios.",
    top25: "Deploy from strength — you have buffer to execute initiatives without near-term fundraising pressure.",
    above: "Optimize deployment — prioritize initiatives with the clearest path to ARR or margin improvement.",
    below: "Stretch runway — link burn, growth, and fundraising timing before cash becomes the constraint.",
    weak: "Run cash preservation steps — triage burn and prep fundraising narrative while you still have optionality.",
  },
  headcount: {
    top10: "Scale without losing efficiency — hire into the roles that unlock the next revenue tier.",
    top25: "Add capacity surgically — backfill the roles constraining delivery or sales velocity.",
    above: "Right-size for the next stage — hire where ARR-per-FTE is slipping, not everywhere at once.",
    below: "Relieve the bandwidth bottleneck — sequence hiring so growth doesn't stall waiting on capacity.",
    weak: "Run the team scaling playbook — staged hires that don't break burn or focus.",
  },
  payingCustomers: {
    top10: "Turn traction into a repeatable motion — systematize what's working before CAC rises.",
    top25: "Push toward top-quartile logos — double down on the channel producing your best customers.",
    above: "Close the logo gap — fix the funnel stage leaking the most engaged prospects.",
    below: "Make demand repeatable — diagnose top-of-funnel before increasing spend.",
    weak: "Run the first-50 playbook — build a repeatable motion peers used to escape early-traction stall.",
  },
};

function fuelActionLine(cards: InsightCard[]): string {
  const cats = new Set(cards.map(c => c.cat));
  const parts: string[] = [];
  if (cats.has("Intelligence")) parts.push("intelligence");
  if (cats.has("Initiative")) parts.push("a suggested initiative");
  if (cats.has("Playbook")) parts.push("a playbook to run");
  if (parts.length === 0) return "";
  if (parts.length === 1) return `Fuel surfaced ${parts[0]} to help you improve.`;
  if (parts.length === 2) return `Fuel surfaced ${parts[0]} and ${parts[1]} to help you improve.`;
  return "Fuel surfaced intelligence, a suggested initiative, and a playbook to help you improve.";
}

function perfTier(val: number, p25: number, p50: number, p75: number, p90: number) {
  if (val >= p90) return "top10" as const;
  if (val >= p75) return "top25" as const;
  if (val >= p50) return "above" as const;
  if (val >= p25) return "below" as const;
  return "weak" as const;
}

function normalizeForCohort(m: MetricDef, val: number): number {
  return val;
}

function formatMetricDisplay(m: MetricDef, val: number): string {
  return m.format(normalizeForCohort(m, val));
}

function perfTierForMetric(m: MetricDef, val: number) {
  const norm = normalizeForCohort(m, val);
  if (m.key === "monthlyBurn") {
    if (norm <= m.p25) return "top10" as const;
    if (norm <= m.p50) return "top25" as const;
    if (norm <= m.p75) return "above" as const;
    if (norm <= m.p90) return "below" as const;
    return "weak" as const;
  }
  return perfTier(norm, m.p25, m.p50, m.p75, m.p90);
}

const BENCHMARK_METRICS: MetricDef[] = [
  { key: "arrGrowth", label: "ARR growth", p25: 18, p50: 42, p75: 80, p90: 140, unit: "%", format: v => `${v}%`, signalCategory: "growth", signalId: "arr_growth_yoy_pct", signalLabel: "ARR growth (YoY)" },
  { key: "nrr", label: "NRR", p25: 88, p50: 104, p75: 118, p90: 130, unit: "%", format: v => `${v}%`, signalCategory: "retention", signalId: "nrr_pct", signalLabel: "Net revenue retention" },
  { key: "grossMargin", label: "Gross margin", p25: 48, p50: 62, p75: 74, p90: 82, unit: "%", format: v => `${v}%`, signalCategory: "efficiency", signalId: "gross_margin_pct", signalLabel: "Gross margin (blended)" },
  { key: "logoRetention", label: "Logo retention", p25: 72, p50: 84, p75: 91, p90: 96, unit: "%", format: v => `${v}%`, signalCategory: "retention", signalId: "logo_retention_pct", signalLabel: "Logo retention" },
  { key: "monthlyBurn", label: "Monthly burn", p25: 40000, p50: 85000, p75: 160000, p90: 280000, unit: "usd", format: formatUsd, signalCategory: "finance", signalId: "monthly_burn_usd", signalLabel: "Monthly net burn" },
  { key: "cashOnHand", label: "Cash on hand", p25: 800000, p50: 2000000, p75: 4000000, p90: 8000000, unit: "usd", format: formatUsd, signalCategory: "finance", signalId: "cash_on_hand_usd", signalLabel: "Cash on hand" },
  { key: "headcount", label: "Headcount", p25: 8, p50: 15, p75: 28, p90: 50, unit: "", format: v => `${v} FTE`, signalCategory: "team", signalId: "fte_count", signalLabel: "FTE headcount" },
  { key: "payingCustomers", label: "Paying customers", p25: 18, p50: 45, p75: 90, p90: 180, unit: "", format: v => `${v} logos`, signalCategory: "growth", signalId: "paid_customer_count", signalLabel: "Paid customers" },
];

const INVESTOR_BENCHMARK_METRICS: MetricDef[] = [
  { key: "invPortfolioCount", label: "Portfolio companies", p25: 5, p50: 15, p75: 30, p90: 55, unit: "", format: v => `${v} companies`, signalCategory: "strategic", signalId: "key_opportunities", signalLabel: "Key opportunities" },
  { key: "invActiveDeals", label: "Active pipeline", p25: 3, p50: 8, p75: 18, p90: 35, unit: "", format: v => `${v} deals`, signalCategory: "fundraising", signalId: "investor_intros_needed", signalLabel: "Investor intros wanted" },
  { key: "invDealsClosed", label: "Deals closed (12mo)", p25: 2, p50: 5, p75: 10, p90: 18, unit: "", format: v => `${v} deals`, signalCategory: "growth", signalId: "new_logos_count", signalLabel: "New logos" },
  { key: "invMedianGrowth", label: "Median portfolio growth", p25: 20, p50: 45, p75: 80, p90: 120, unit: "%", format: v => `${v}%`, signalCategory: "growth", signalId: "arr_growth_yoy_pct", signalLabel: "ARR growth (YoY)" },
  { key: "invFollowOnRate", label: "Follow-on rate", p25: 15, p50: 30, p75: 50, p90: 65, unit: "%", format: v => `${v}%`, signalCategory: "fundraising", signalId: "current_round_committed_amount_usd", signalLabel: "Committed so far" },
  { key: "invAum", label: "AUM", p25: 25000000, p50: 75000000, p75: 200000000, p90: 500000000, unit: "usd", format: formatUsd, signalCategory: "finance", signalId: "capital_raised_total_usd", signalLabel: "Total capital raised" },
];

const CAT_STYLE: Record<InsightCat, { color: string; icon: string; suggested?: boolean }> = {
  Intelligence: { color: "#2BB8A0", icon: "◎" },
  Initiative: { color: "#00B48A", icon: "↗", suggested: true },
  Playbook: { color: "#D4924A", icon: "▤", suggested: true },
};

function buildMetricInsights(m: MetricDef, val: number, cohort: string): InsightCard[] {
  const norm = normalizeForCohort(m, val);
  const displayVal = formatMetricDisplay(m, val);
  const tier = perfTierForMetric(m, val);
  const gap = Math.max(0, Math.round(m.p75 - norm));

  const copies: Record<string, Record<PerfTier, { cat: InsightCat; title: string; body: string }>> = {
    arrGrowth: {
      top10: { cat: "Intelligence", title: `${displayVal} ARR growth — top 10%`, body: `Exceptional velocity for ${cohort}. Fuel flags this as a fundraise-ready signal in your cohort report.` },
      top25: { cat: "Intelligence", title: `${displayVal} ARR growth — top quartile`, body: `Above P75 for ${cohort}. Momentum is compounding — Fuel will track decay risk if growth slips.` },
      above: { cat: "Initiative", title: `Push ARR growth past ${m.p75}%`, body: `At ${displayVal}, you're above median but ${gap}pts from top quartile. Fuel drafted a demand acceleration initiative.` },
      below: { cat: "Initiative", title: `Unlock ${m.p75}% ARR growth`, body: `${displayVal} sits below median for ${cohort}. Fuel identified 2 levers in your GTM motion to close the gap.` },
      weak: { cat: "Playbook", title: "Growth recovery playbook", body: `${displayVal} YoY growth needs a reset. Fuel queued a 5-step playbook used by peers who recovered from sub-P25 growth.` },
    },
    nrr: {
      top10: { cat: "Intelligence", title: `${displayVal} NRR — expansion engine`, body: `Best-in-class retention for ${cohort}. Fuel will monitor contraction risk account-by-account.` },
      top25: { cat: "Intelligence", title: `${displayVal} NRR — top quartile`, body: `Strong expansion motion. Your net retention outperforms 75% of similar-stage companies.` },
      above: { cat: "Initiative", title: `Close the gap to ${m.p75}% NRR`, body: `At ${displayVal}, expansion is working but room remains. Fuel drafted a 3-step upsell motion.` },
      below: { cat: "Initiative", title: `Recover NRR to ${m.p75}%`, body: `${displayVal} NRR trails the cohort median. Fuel flagged 3 accounts with highest expansion potential.` },
      weak: { cat: "Playbook", title: "NRR recovery playbook", body: `At ${displayVal}, churn is eating growth. Fuel queued the logo-to-expansion playbook peers used to regain P50.` },
    },
    grossMargin: {
      top10: { cat: "Intelligence", title: `${displayVal} gross margin — elite`, body: `Top-decile unit economics for ${cohort}. Fuel links this to burn efficiency in your runway model.` },
      top25: { cat: "Intelligence", title: `${displayVal} gross margin — top quartile`, body: `Healthy margins give you room to invest. Beats 74% of companies at your stage.` },
      above: { cat: "Initiative", title: `Reach ${m.p75}% gross margin`, body: `${displayVal} is solid — ${gap}pts from top quartile. Fuel surfaced COGS levers from similar FinTech operators.` },
      below: { cat: "Playbook", title: "Margin improvement playbook", body: `${displayVal} compresses runway flexibility. Fuel queued a 4-step cost-of-delivery review.` },
      weak: { cat: "Playbook", title: "Unit economics reset", body: `At ${displayVal}, margin structure needs attention before scaling spend. Playbook tailored to ${cohort}.` },
    },
    logoRetention: {
      top10: { cat: "Intelligence", title: `${displayVal} logo retention — sticky`, body: `Customers are staying. Top 10% retention for ${cohort} — a durable moat signal.` },
      top25: { cat: "Intelligence", title: `${displayVal} logo retention — strong`, body: `Above P75. Fuel will alert if logo churn trends above 8% quarterly.` },
      above: { cat: "Initiative", title: `Push retention to ${m.p75}%`, body: `At ${displayVal}, you're retaining well but not yet top quartile. Fuel drafted a health-score initiative.` },
      below: { cat: "Initiative", title: `Stop logo churn at ${displayVal}`, body: `Below median for ${cohort}. Fuel identified onboarding and support gaps as likely drivers.` },
      weak: { cat: "Playbook", title: "Logo retention recovery", body: `${displayVal} retention is a growth leak. 4-step playbook — peers recovered ~6pts in 90 days.` },
    },
    monthlyBurn: {
      top10: { cat: "Intelligence", title: `${displayVal}/mo burn — capital efficient`, body: `Leanest burn in your cohort band. Fuel models extended runway at current growth.` },
      top25: { cat: "Intelligence", title: `${displayVal}/mo burn — disciplined`, body: `Below P25 burn for ${cohort}. Efficient spend profile — room to invest in growth.` },
      above: { cat: "Initiative", title: `Trim burn toward ${formatUsd(m.p50)}/mo`, body: `At ${displayVal}, burn is elevated vs median. Fuel found 3 operational levers without cutting growth.` },
      below: { cat: "Initiative", title: `Extend runway — burn at ${displayVal}`, body: `Above median burn. Fuel drafted a burn review tied to your cash position.` },
      weak: { cat: "Playbook", title: "Runway extension playbook", body: `${displayVal}/mo burn compresses options. 5-step playbook to cut 15% without hitting growth.` },
    },
    cashOnHand: {
      top10: { cat: "Intelligence", title: `${displayVal} cash — well capitalized`, body: `Top-decile cash position for ${cohort}. Fuel stress-tests runway under downside scenarios.` },
      top25: { cat: "Intelligence", title: `${displayVal} cash — strong buffer`, body: `Above P75 cash on hand. Comfortable runway to execute on initiatives.` },
      above: { cat: "Initiative", title: `Optimize ${displayVal} deployment`, body: `Solid cash position. Fuel recommends allocating toward highest-ROI growth bets.` },
      below: { cat: "Initiative", title: `Stretch ${displayVal} further`, body: `Below median cash for ${cohort}. Fuel linked burn and growth to model runway extension.` },
      weak: { cat: "Playbook", title: "Cash preservation playbook", body: `${displayVal} limits strategic optionality. Fuel queued fundraising-prep and burn triage steps.` },
    },
    headcount: {
      top10: { cat: "Intelligence", title: `${displayVal} — lean & scaling`, body: `High ARR-per-FTE efficiency for ${cohort}. Fuel tracks when ratio starts to slip.` },
      top25: { cat: "Intelligence", title: `${displayVal} — efficient team`, body: `Above-median productivity per head. Hiring plan aligned to growth stage.` },
      above: { cat: "Initiative", title: `Right-size from ${displayVal}`, body: `Team size is workable. Fuel flagged roles that unlock the next growth tier.` },
      below: { cat: "Initiative", title: `Scale thoughtfully from ${displayVal}`, body: `Below median headcount — capacity may cap growth. Fuel drafted a hiring sequence.` },
      weak: { cat: "Playbook", title: "Team scaling playbook", body: `At ${displayVal}, bandwidth is the bottleneck. Playbook for staged hiring without breaking burn.` },
    },
    payingCustomers: {
      top10: { cat: "Intelligence", title: `${displayVal} — distribution advantage`, body: `Top 10% logo count for ${cohort}. Fuel monitors CAC payback as you scale.` },
      top25: { cat: "Intelligence", title: `${displayVal} — strong traction`, body: `Above P75 customer count. Social proof and case studies are compounding.` },
      above: { cat: "Initiative", title: `Hit ${m.p75} paying customers`, body: `At ${displayVal}, you're past median. Fuel drafted a demand playbook for the next ${Math.max(0, m.p75 - norm)} logos.` },
      below: { cat: "Initiative", title: `Grow from ${displayVal} to ${m.p50} logos`, body: `Below median traction for ${cohort}. Fuel identified your funnel bottleneck.` },
      weak: { cat: "Playbook", title: "First 50 customers playbook", body: `${displayVal} — early traction needs a repeatable motion. 6-step playbook from peer companies.` },
    },
    invPortfolioCount: {
      top10: { cat: "Intelligence", title: `${displayVal} — diversified portfolio`, body: `Top-decile portfolio breadth for ${cohort}. Fuel tracks concentration risk across holdings.` },
      top25: { cat: "Intelligence", title: `${displayVal} — strong portfolio scale`, body: `Above P75 for peer funds. Portfolio coverage supports diversified deal sourcing.` },
      above: { cat: "Initiative", title: `Grow portfolio toward ${m.p75} companies`, body: `At ${displayVal}, you're past median. Fuel surfaced ${Math.max(0, m.p75 - norm)} thesis-matched suggestions.` },
      below: { cat: "Initiative", title: `Expand from ${displayVal} holdings`, body: `Below median portfolio size for ${cohort}. Fuel queued smart company suggestions in your sectors.` },
      weak: { cat: "Playbook", title: "Portfolio build playbook", body: `${displayVal} — early portfolio needs systematic sourcing. 5-step playbook from peer funds.` },
    },
    invActiveDeals: {
      top10: { cat: "Intelligence", title: `${displayVal} — deep pipeline`, body: `Top 10% active deal flow for ${cohort}. Fuel monitors stage velocity and conversion.` },
      top25: { cat: "Intelligence", title: `${displayVal} — healthy pipeline`, body: `Above P75 active deals. Strong sourcing engine — Fuel tracks diligence bottlenecks.` },
      above: { cat: "Initiative", title: `Push pipeline to ${m.p75} active deals`, body: `At ${displayVal}, deal flow is solid. Fuel drafted sourcing plays to fill the top of funnel.` },
      below: { cat: "Initiative", title: `Grow pipeline from ${displayVal}`, body: `Below median active deals for ${cohort}. Fuel AI can suggest companies matching your thesis.` },
      weak: { cat: "Playbook", title: "Deal sourcing playbook", body: `${displayVal} active deals limits optionality. Fuel queued a 4-step sourcing playbook.` },
    },
    invDealsClosed: {
      top10: { cat: "Intelligence", title: `${displayVal} — high conviction`, body: `Top-decile close rate for ${cohort}. Fuel links this to portfolio momentum signals.` },
      top25: { cat: "Intelligence", title: `${displayVal} — strong close velocity`, body: `Above P75 deals closed. Deployment pace outperforms peer funds at your stage.` },
      above: { cat: "Initiative", title: `Accelerate toward ${m.p75} closes/yr`, body: `At ${displayVal}, you're deploying steadily. Fuel flagged 3 deals nearing term sheet.` },
      below: { cat: "Initiative", title: `Increase closes from ${displayVal}`, body: `Below median close rate for ${cohort}. Fuel drafted a pipeline conversion initiative.` },
      weak: { cat: "Playbook", title: "Deployment acceleration playbook", body: `${displayVal} closes — room to deploy. Playbook for faster diligence-to-close cycles.` },
    },
    invMedianGrowth: {
      top10: { cat: "Intelligence", title: `${displayVal} median growth — outperforming`, body: `Portfolio companies growing faster than 90% of ${cohort} peers. Fuel flags breakout candidates.` },
      top25: { cat: "Intelligence", title: `${displayVal} — top quartile portfolio growth`, body: `Strong median ARR growth across holdings. Value creation thesis is working.` },
      above: { cat: "Initiative", title: `Push median growth past ${m.p75}%`, body: `At ${displayVal}, portfolio is healthy. Fuel drafted initiatives for underperforming holdings.` },
      below: { cat: "Initiative", title: `Lift portfolio growth from ${displayVal}`, body: `Below median growth for ${cohort}. Fuel identified 2 portfolio companies needing support.` },
      weak: { cat: "Playbook", title: "Portfolio value creation playbook", body: `${displayVal} median growth needs attention. 5-step playbook for portfolio acceleration.` },
    },
    invFollowOnRate: {
      top10: { cat: "Intelligence", title: `${displayVal} follow-on rate — high conviction`, body: `Top 10% follow-on rate for ${cohort}. Strong signal of portfolio confidence.` },
      top25: { cat: "Intelligence", title: `${displayVal} — disciplined follow-ons`, body: `Above P75 follow-on rate. Capital allocation aligned to winners.` },
      above: { cat: "Initiative", title: `Reach ${m.p75}% follow-on rate`, body: `At ${displayVal}, follow-on discipline is solid. Fuel models reserve allocation scenarios.` },
      below: { cat: "Initiative", title: `Improve follow-ons from ${displayVal}`, body: `Below median follow-on rate. Fuel flagged portfolio companies ready for next round.` },
      weak: { cat: "Playbook", title: "Follow-on strategy playbook", body: `${displayVal} follow-on rate — reserves may be under-deployed. Playbook for conviction-based follow-ons.` },
    },
    invAum: {
      top10: { cat: "Intelligence", title: `${displayVal} AUM — top tier`, body: `Top-decile fund size for ${cohort}. Fuel benchmarks deployment pace against peer funds.` },
      top25: { cat: "Intelligence", title: `${displayVal} — well capitalized`, body: `Above P75 AUM. Strong capacity for follow-ons and new deals.` },
      above: { cat: "Initiative", title: `Deploy ${displayVal} strategically`, body: `Solid AUM position. Fuel recommends sector-weighted deployment based on your thesis.` },
      below: { cat: "Initiative", title: `Maximize ${displayVal} deployment`, body: `Below median AUM for ${cohort}. Fuel linked pipeline velocity to capital efficiency.` },
      weak: { cat: "Playbook", title: "Fundraising prep playbook", body: `${displayVal} AUM limits deployment. Fuel queued fundraising signals and LP narrative drafts.` },
    },
  };

  const tierCopy = copies[m.key]?.[tier];
  const intelligenceCopy = tierCopy?.cat === "Intelligence"
    ? { title: tierCopy.title, body: tierCopy.body }
    : {
      title: `${displayVal} ${m.label} — ${TIER_POSITION[tier]}`,
      body: `Generated from ${m.signalLabel} in ${m.signalCategory} — benchmarked against ${cohort}.`,
    };

  const intelligenceId = `${m.key}-intelligence`;
  const intelligenceStyle = CAT_STYLE.Intelligence;
  const cards: InsightCard[] = [{
    id: intelligenceId,
    cat: "Intelligence",
    color: intelligenceStyle.color,
    icon: intelligenceStyle.icon,
    title: intelligenceCopy.title,
    body: intelligenceCopy.body,
    metricLabel: m.label,
    displayVal,
    signalCategory: m.signalCategory,
    signalId: m.signalId,
    signalLabel: m.signalLabel,
  }];

  if (tierCopy && tierCopy.cat !== "Intelligence") {
    const actionStyle = CAT_STYLE[tierCopy.cat];
    cards.push({
      id: `${m.key}-${tierCopy.cat.toLowerCase()}`,
      cat: tierCopy.cat,
      color: actionStyle.color,
      icon: actionStyle.icon,
      title: tierCopy.title,
      body: tierCopy.body,
      metricLabel: m.label,
      displayVal,
      signalCategory: m.signalCategory,
      signalId: m.signalId,
      signalLabel: m.signalLabel,
      linkedIntelligenceId: intelligenceId,
      linkedIntelligenceTitle: intelligenceCopy.title,
    });
  }

  return cards;
}

function buildInsightStack(answers: Partial<Answers>, cohort: string, variant: "company" | "investor" = "company"): InsightCard[] {
  const metrics = variant === "investor" ? INVESTOR_BENCHMARK_METRICS : BENCHMARK_METRICS;
  return metrics.flatMap(m => {
    const raw = answers[m.key];
    if (!raw?.trim()) return [];
    const val = parseMetricVal(raw);
    if (val === null) return [];
    return buildMetricInsights(m, val, cohort);
  });
}

interface BenchmarkMetricGroup {
  metricKey: string;
  metricLabel: string;
  position: string;
  nextStep: string;
  fuelActions: string;
  cards: InsightCard[];
}

function buildMetricGroups(answers: Partial<Answers>, cohort: string, variant: "company" | "investor" = "company"): BenchmarkMetricGroup[] {
  const metrics = variant === "investor" ? INVESTOR_BENCHMARK_METRICS : BENCHMARK_METRICS;
  return metrics.flatMap(m => {
    const raw = answers[m.key];
    if (!raw?.trim()) return [];
    const val = parseMetricVal(raw);
    if (val === null) return [];
    const tier = perfTierForMetric(m, val);
    const displayVal = formatMetricDisplay(m, val);
    const cards = buildMetricInsights(m, val, cohort);
    const nextStep = variant === "company"
      ? (FOUNDER_NEXT_STEPS[m.key]?.[tier] ?? "Decide what to prioritize next — Fuel will draft the right move.")
      : "Use this signal to decide what to prioritize in your portfolio next.";
    return [{
      metricKey: m.key,
      metricLabel: m.label,
      position: `${displayVal} on ${m.label.toLowerCase()} — ${TIER_POSITION[tier]} in your cohort`,
      nextStep,
      fuelActions: fuelActionLine(cards),
      cards,
    }];
  });
}

function BenchmarkEmptyState({ variant = "company" }: { variant?: "company" | "investor" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ textAlign: "center", padding: "28px 12px" }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 48, height: 48, borderRadius: 12, margin: "0 auto 16px",
          background: "linear-gradient(135deg, #E8F8F3, #D4EDE6)",
          border: "1px solid #B8E8D8",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
        }}
      >
        ✦
      </motion.div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2B26", marginBottom: 6 }}>Enter a number to begin</div>
      <div style={{ fontSize: 12, color: "#8A9E96", lineHeight: 1.65, maxWidth: 280, margin: "0 auto" }}>
        {variant === "investor"
          ? "Each metric first generates intelligence in its signal category — then suggested initiatives and playbooks link back to that signal."
          : "The graph shows where you sit. Fuel suggests what to do next — intelligence, initiatives, and playbooks to improve."}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        {(["Intelligence", "Initiative", "Playbook"] as InsightCat[]).map(cat => (
          <span key={cat} style={{
            fontSize: 10, fontWeight: 600, color: CAT_STYLE[cat].color,
            background: `${CAT_STYLE[cat].color}12`, border: `1px solid ${CAT_STYLE[cat].color}28`,
            borderRadius: 20, padding: "4px 11px",
          }}>
            {CAT_STYLE[cat].icon} {cat}{CAT_STYLE[cat].suggested ? " · suggested" : ""}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function InsightCardCompact({ card }: { card: InsightCard }) {
  const isLinkedChild = Boolean(card.linkedIntelligenceId);
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${card.color}33`,
      borderRadius: 12,
      padding: isLinkedChild ? "10px 12px 10px 18px" : "12px 14px",
      marginBottom: 8,
      borderLeft: isLinkedChild ? `2px solid ${card.color}44` : undefined,
      boxShadow: "0 2px 8px rgba(8,40,32,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: card.color, textTransform: "uppercase" }}>
          {card.icon} {card.cat}{CAT_STYLE[card.cat].suggested ? " · suggested" : ""}
        </span>
        <span style={{ fontSize: 9, color: "#8A9E96" }}>{card.metricLabel} · {card.displayVal}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1A2B26", marginBottom: 4, lineHeight: 1.35 }}>{card.title}</div>
      <div style={{ fontSize: 11, color: "#8A9E96", lineHeight: 1.55 }}>{card.body}</div>
    </div>
  );
}

function BenchmarkProgressPanel({ filled, total, companyName }: { filled: number; total: number; companyName: string }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  return (
    <MotionShell accent="#2BB8A0">
      <FuelProductCard title={companyName} subtitle="Benchmark · cohort position">
        <div style={{ textAlign: "center", padding: "20px 8px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#2BB8A0", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
            Enter all metrics to begin
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1A2B26", marginBottom: 6 }}>{filled} / {total}</div>
          <div style={{ fontSize: 12, color: "#8A9E96", lineHeight: 1.6, maxWidth: 260, margin: "0 auto 20px" }}>
            The graph on the left shows where you sit. Once every metric is in, Fuel generates your action plan here.
          </div>
          <div style={{ height: 6, background: "#E8F0ED", borderRadius: 3, overflow: "hidden", maxWidth: 240, margin: "0 auto" }}>
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              style={{ height: "100%", background: "linear-gradient(90deg, #2BB8A0, #00B48A)", borderRadius: 3 }}
            />
          </div>
        </div>
      </FuelProductCard>
    </MotionShell>
  );
}

function BenchmarkGeneratingPanel({ companyName }: { companyName: string }) {
  return (
    <MotionShell accent="#2BB8A0">
      <FuelProductCard title={companyName} subtitle="Generating your benchmark summary">
        <div style={{ textAlign: "center", padding: "32px 12px" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
            style={{
              width: 44, height: 44, borderRadius: "50%", margin: "0 auto 20px",
              border: "3px solid #E8F0ED", borderTopColor: "#2BB8A0",
            }}
          />
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A2B26", marginBottom: 8 }}>Building your action plan…</div>
          <div style={{ fontSize: 12, color: "#8A9E96", lineHeight: 1.65, maxWidth: 280, margin: "0 auto" }}>
            Fuel is turning your cohort position into intelligence, suggested initiatives, and playbooks to improve.
          </div>
        </div>
      </FuelProductCard>
    </MotionShell>
  );
}

export function BenchmarkMotion({
  answers, cohortLabel, companyName = "Your company", variant = "company",
  allMetricsFilled = false, filledCount = 0, totalCount = 8,
  isGenerating = false, summaryReady = false,
}: {
  answers: Partial<Answers>; cohortLabel?: string; companyName?: string; variant?: "company" | "investor";
  allMetricsFilled?: boolean; filledCount?: number; totalCount?: number;
  isGenerating?: boolean; summaryReady?: boolean;
}) {
  const cohort = cohortLabel || (variant === "investor" ? "Seed VC · US" : "FinTech SaaS · Seed");
  const metrics = variant === "investor" ? INVESTOR_BENCHMARK_METRICS : BENCHMARK_METRICS;
  const metricGroups = useMemo(() => buildMetricGroups(answers, cohort, variant), [answers, cohort, variant]);
  const cards = useMemo(() => metricGroups.flatMap(g => g.cards), [metricGroups]);
  const [scene, setScene] = useState(0);
  const scenes = 3;

  const initiativeCards = useMemo(() => cards.filter(c => c.cat === "Initiative"), [cards]);
  const intelligenceCards = useMemo(() => cards.filter(c => c.cat === "Intelligence"), [cards]);
  const playbookCards = useMemo(() => cards.filter(c => c.cat === "Playbook"), [cards]);

  useEffect(() => {
    if (variant !== "company" || !summaryReady) return;
    setScene(0);
    const t = setInterval(() => setScene(s => (s + 1) % scenes), 4000);
    return () => clearInterval(t);
  }, [summaryReady, variant, scenes]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevAnswersRef = useRef<Partial<Answers>>({});
  const didMountRef = useRef(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    intelligence: cards.filter(c => c.cat === "Intelligence").length,
    initiative: cards.filter(c => c.cat === "Initiative").length,
    playbook: cards.filter(c => c.cat === "Playbook").length,
  }), [cards]);

  useEffect(() => {
    if (variant === "company") return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      prevAnswersRef.current = { ...answers };
      return;
    }

    let changedId: string | null = null;
    for (const m of metrics) {
      const prev = prevAnswersRef.current[m.key] ?? "";
      const curr = answers[m.key] ?? "";
      if (curr !== prev && curr.trim() && parseMetricVal(curr) !== null) {
        changedId = m.key;
      }
    }
    prevAnswersRef.current = { ...answers };

    if (!changedId) return;
    setHighlightId(`${changedId}-intelligence`);

    const scrollToCard = () => {
      const el = cardRefs.current[`${changedId}-intelligence`];
      const container = scrollRef.current;
      if (!el || !container) return;
      const top = el.offsetTop - container.offsetTop;
      container.scrollTo({ top: Math.max(0, top - 8), behavior: "smooth" });
    };

    requestAnimationFrame(() => requestAnimationFrame(scrollToCard));
  }, [answers, metrics, variant]);

  if (variant === "company") {
    if (!allMetricsFilled) {
      return <BenchmarkProgressPanel filled={filledCount} total={totalCount} companyName={companyName} />;
    }
    if (isGenerating) {
      return <BenchmarkGeneratingPanel companyName={companyName} />;
    }
    if (summaryReady) {
      return (
        <MotionShell accent="#2BB8A0">
          <FuelProductCard title={companyName} subtitle="Where you sit → what to run next">
            <AnimatePresence mode="wait">
              {scene === 0 && (
                <motion.div key="summary" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#2BB8A0", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Here's how to think about what to do next
                  </div>
                  <div style={{ fontSize: 12, color: "#8A9E96", lineHeight: 1.6, marginBottom: 14 }}>
                    Your cohort position across {metricGroups.length} metrics — and the moves Fuel recommends to improve.
                  </div>
                  <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 2 }}>
                    {metricGroups.map((group, i) => (
                      <motion.div
                        key={group.metricKey}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.35 }}
                        style={{
                          background: "#F4FAF8", border: "1px solid rgba(43,184,160,0.2)",
                          borderRadius: 10, padding: "10px 12px", marginBottom: 8,
                        }}
                      >
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#2BB8A0", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>
                          {group.metricLabel}
                        </div>
                        <div style={{ fontSize: 11, color: "#5A7A70", lineHeight: 1.45, marginBottom: 5 }}>{group.position}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1A2B26", lineHeight: 1.45 }}>{group.nextStep}</div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
              {scene === 1 && (
                <motion.div key="initiatives" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#00B48A", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Suggested initiatives · from your benchmarks
                  </div>
                  {initiativeCards.length > 0 ? initiativeCards.map(card => (
                    <InsightCardCompact key={card.id} card={card} />
                  )) : (
                    <div style={{ fontSize: 12, color: "#8A9E96", lineHeight: 1.6, padding: "12px 0" }}>
                      No initiatives needed — your metrics are at or above cohort median across the board.
                    </div>
                  )}
                </motion.div>
              )}
              {scene === 2 && (
                <motion.div key="intel-playbooks" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#2BB8A0", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Intelligence & playbooks
                  </div>
                  <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 2 }}>
                    {intelligenceCards.map(card => <InsightCardCompact key={card.id} card={card} />)}
                    {playbookCards.map(card => <InsightCardCompact key={card.id} card={card} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <SceneDots count={scenes} active={scene} />
          </FuelProductCard>
        </MotionShell>
      );
    }
    return <BenchmarkGeneratingPanel companyName={companyName} />;
  }

  // Investor / fallback: scrollable insight list
  return (
    <MotionShell accent="#2BB8A0">
      <style>{`
        .of-insight-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .of-insight-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ marginBottom: 14 }}>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 11, fontWeight: 700, color: "#2BB8A0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {cards.length > 0
              ? (variant === "company" ? "Here's how to think about what to do next" : `Fuel generated ${cards.length} insight${cards.length > 1 ? "s" : ""}`)
              : "What Fuel generates"}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ fontSize: 16, fontWeight: 800, color: "#1A2B26", marginTop: 4 }}>
            {companyName} · {variant === "investor" ? "Portfolio benchmarks · Deal suggestions · Fuel AI" : "Where you sit → what to run next"}
          </motion.div>
          {cards.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {counts.intelligence > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: "#2BB8A0" }}>{counts.intelligence} intelligence</span>}
              {counts.initiative > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: "#00B48A" }}>{counts.initiative} suggested initiative{counts.initiative > 1 ? "s" : ""}</span>}
              {counts.playbook > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: "#D4924A" }}>{counts.playbook} suggested playbook{counts.playbook > 1 ? "s" : ""}</span>}
            </motion.div>
          )}
        </div>

        <div
          ref={scrollRef}
          className="of-insight-scroll"
          style={{
            maxHeight: 380,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingBottom: 4,
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {cards.length === 0 ? (
              <BenchmarkEmptyState key="empty" variant={variant} />
            ) : (
              metricGroups.map((group, gi) => (
                <React.Fragment key={group.metricKey}>
                  {variant === "company" && (
                    <motion.div
                      key={`${group.metricKey}-summary`}
                      ref={(el) => { cardRefs.current[`${group.metricKey}-summary`] = el; }}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: gi * 0.05, ease: EASE_OUT }}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        background: "linear-gradient(135deg, #F4FAF8 0%, #fff 100%)",
                        border: "1px solid rgba(43,184,160,0.28)",
                        borderRadius: 14,
                        padding: "14px 16px",
                        boxShadow: "0 8px 24px rgba(8,40,32,0.06)",
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#2BB8A0", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>
                        {group.metricLabel}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#5A7A70", lineHeight: 1.5, marginBottom: 8 }}>
                        {group.position}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1A2B26", lineHeight: 1.45, marginBottom: group.fuelActions ? 8 : 0 }}>
                        {group.nextStep}
                      </div>
                      {group.fuelActions && (
                        <div style={{ fontSize: 11, color: "#8A9E96", lineHeight: 1.55 }}>
                          {group.fuelActions}
                        </div>
                      )}
                    </motion.div>
                  )}
                  {group.cards.map((card, i) => {
                const isHighlighted = card.id === highlightId || card.linkedIntelligenceId === highlightId;
                const isLinkedChild = Boolean(card.linkedIntelligenceId);
                return (
                <motion.div
                  key={card.id}
                  ref={(el) => { cardRefs.current[card.id] = el; }}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94, height: 0 }}
                  transition={{ duration: 0.45, delay: Math.min(gi * 0.05 + i * 0.04, 0.2), ease: EASE_OUT }}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#fff",
                    border: `1px solid ${isHighlighted ? card.color + "66" : card.color + "33"}`,
                    borderRadius: 14,
                    padding: isLinkedChild ? "12px 16px 14px 22px" : "14px 16px",
                    boxShadow: isHighlighted ? `0 10px 28px ${card.color}22` : "0 8px 24px rgba(8,40,32,0.07)",
                    borderLeft: isLinkedChild ? `2px solid ${card.color}44` : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: `${card.color}18`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, color: card.color, fontWeight: 800,
                      }}>
                        {card.icon}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: card.color, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                        {card.cat}{CAT_STYLE[card.cat].suggested ? " · suggested" : ""}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 600, color: "#284256",
                        background: "#F1F3F6", border: "1px solid #E4E8EC",
                        borderRadius: 4, padding: "2px 7px",
                        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                        textTransform: "lowercase",
                      }}>
                        {card.signalCategory}
                      </span>
                    </div>
                    <motion.span
                      key={card.displayVal}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={EASE_SPRING}
                      style={{
                        fontSize: 10, fontWeight: 700, color: "#5A7A70",
                        background: "#F4F8F6", border: "1px solid #E0EBE6",
                        borderRadius: 8, padding: "2px 8px",
                      }}
                    >
                      {card.metricLabel} · {card.displayVal}
                    </motion.span>
                  </div>
                  {card.linkedIntelligenceTitle && (
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: 6,
                      marginBottom: 8, padding: "6px 8px",
                      background: "#F4FAF8", borderRadius: 8, border: "1px solid #D4EDE6",
                    }}>
                      <span style={{ fontSize: 10, color: "#2BB8A0", fontWeight: 800, flexShrink: 0 }}>◎</span>
                      <span style={{ fontSize: 10, color: "#5A7A70", lineHeight: 1.45 }}>
                        Linked to intelligence · <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', color: "#284256" }}>{card.signalId}</span>
                        <span style={{ color: "#8A9E96" }}> — {card.linkedIntelligenceTitle}</span>
                      </span>
                    </div>
                  )}
                  <motion.div
                    key={`${card.id}-${card.title}`}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ fontSize: 13, fontWeight: 800, color: "#1A2B26", marginBottom: 5, lineHeight: 1.35 }}
                  >
                    {card.title}
                  </motion.div>
                  <motion.div
                    key={`${card.id}-${card.body}`}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, delay: 0.05 }}
                    style={{ fontSize: 11.5, color: "#8A9E96", lineHeight: 1.6 }}
                  >
                    {card.body}
                  </motion.div>
                </motion.div>
              );
              })}
                </React.Fragment>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionShell>
  );
}
