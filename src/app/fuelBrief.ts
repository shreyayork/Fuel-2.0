// ─── Fuel AI — Intelligence Brief generator + playbook catalog ────────────────
// Deterministic, signal-driven brief built from a company's benchmark inputs.
// Mirrors the structure of a real Fuel intelligence brief (state of business,
// traction, efficiency & finance, fundraising, risks, opportunities, initiatives).

import type { BenchmarkFormValues } from "./PatriotPayJourney";

export type BriefFlag = "good" | "warn" | "crit" | "neutral";

export type BriefRow = { metric: string; value: string; note: string; flag: BriefFlag };
export type BriefBullet = { text: string };
export type BriefRisk = { title: string; signal: string; text: string; flag: BriefFlag };
export type BriefInitiative = {
  priority: "high" | "med" | "low";
  title: string;
  text: string;
  kind: string;
  duration: string;
  signals: string;
};

export type Brief = {
  generatedAtLabel: string;
  metaLine: string;
  stateOfBusiness: string;
  dataQualityFlag: string | null;
  traction: { rows: BriefRow[]; bullets: BriefBullet[] };
  finance: { rows: BriefRow[]; bullets: BriefBullet[] };
  fundraising: BriefBullet[];
  risks: BriefRisk[];
  opportunities: BriefRisk[];
  initiatives: BriefInitiative[];
  // condensed form for the advisor card
  summary: { headline: string; points: { flag: BriefFlag; text: string }[] };
};

// ─── Playbook catalog ─────────────────────────────────────────────────────────
export type Playbook = {
  id: string;
  name: string;
  category: string;        // section header (FOUNDER, FUNCTION, GROWTH …)
  kind: string;            // small label after the name (Assessment, Brief …)
  description: string;
  marquee?: boolean;       // the headline "Generate brief" action
};

export const PLAYBOOKS: Playbook[] = [
  { id: "intel-brief", name: "Generate Intelligence Brief", category: "Founder", kind: "Brief", marquee: true,
    description: "Full signal-driven brief — state of business, traction, finance, risks, opportunities, and suggested initiatives in one pass." },
  { id: "kpi-benchmark", name: "KPI Benchmark", category: "Founder", kind: "Assessment",
    description: "Confirm your headline metrics in a guided wizard, compare against your peer cohort's p25/p50/p75/p90 bands, and surface the 1-2 areas where you're most off-pace." },
  { id: "pitch-deck-eval", name: "Pitch Deck Evaluation", category: "Founder", kind: "Assessment",
    description: "Extract text from an uploaded pitch deck and evaluate it against a structured rubric — problem, market, traction, team, ask, narrative quality." },
  { id: "finance-assessment", name: "Finance Assessment", category: "Function Assessment", kind: "Function Assessment",
    description: "Diagnose capital efficiency, runway, gross margin, and reporting maturity. Propose 3 initiatives to extend runway and tighten financial controls." },
  { id: "marketing-assessment", name: "Marketing Assessment", category: "Function Assessment", kind: "Function Assessment",
    description: "Diagnose top-of-funnel + brand + lifecycle — pipeline contribution, channel mix, content velocity, retention — and propose 3 initiatives." },
  { id: "product-eng-assessment", name: "Product & Engineering Assessment", category: "Function Assessment", kind: "Function Assessment",
    description: "Diagnose product velocity, engineering maturity, and roadmap discipline. Propose 3 initiatives to improve throughput and quality." },
  { id: "revops-assessment", name: "RevOps Assessment", category: "Function Assessment", kind: "Function Assessment",
    description: "Audit pipeline hygiene, forecast accuracy, and billing operations. Surface where revenue is leaking and propose a tightened RevOps motion." },
  { id: "retention-deep-dive", name: "Retention Deep Dive", category: "Growth", kind: "Analysis",
    description: "Decompose logo and net revenue retention by cohort, isolate churn drivers, and build a save/renewal playbook with quantified upside." },
  { id: "gtm-economics", name: "GTM Economics Review", category: "Growth", kind: "Analysis",
    description: "Pressure-test CAC payback, channel ROI, and sales-cycle efficiency to redesign a lower-CAC acquisition path." },
  { id: "fundraise-readiness", name: "Fundraising Readiness", category: "Capital", kind: "Assessment",
    description: "Stress-test cash position, model bridge scenarios, and assemble the metrics narrative investors will probe before your next raise." },
  { id: "competitor-scan", name: "Competitive Landscape Scan", category: "Market", kind: "Research",
    description: "Map the competitive set, positioning gaps, and pricing posture in your category, with a defensibility read for the board." },
  { id: "board-update", name: "Board Update Draft", category: "Capital", kind: "Draft",
    description: "Assemble a tight, metrics-led board update from the latest signals — wins, risks, asks, and the numbers that matter." },
];

export const PLAYBOOK_COUNT = 35; // catalog size shown in search placeholder

// ─── Number helpers ───────────────────────────────────────────────────────────
function num(s: string | undefined): number | null {
  if (s == null) return null;
  const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function fmtUsd(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n / 1e6 >= 10 ? 0 : 1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
function rawUsd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
// values that look like they're missing a $K/$M scale qualifier
function scaledGuess(n: number): string {
  const g = n * 1000;
  return g >= 1e6 ? `$${(g / 1e6).toFixed(1)}M` : `$${(g / 1e3).toFixed(0)}K`;
}
function pct(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}%`;
}

// ─── Generator ────────────────────────────────────────────────────────────────
export function generateBrief(b: BenchmarkFormValues, companyName: string): Brief {
  const arr = num(b.arr);
  const growth = num(b.arrGrowth);
  const nrr = num(b.nrr);
  const logo = num(b.logoRetention);
  const margin = num(b.grossMargin);
  const cac = num(b.cacPayback);
  const burnX = num(b.burnMultiple);
  const r40 = num(b.ruleOf40);
  const cash = num(b.cashOnHand);
  const burn = num(b.monthlyBurn);
  const customers = num(b.paidCustomers);
  const fte = num(b.headcount);

  const now = new Date();
  const generatedAtLabel = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const period = `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;

  // unit-scale anomaly detection
  const arrSuspect = arr != null && arr < 50_000;
  const cashSuspect = cash != null && cash < 5_000;
  const burnSuspect = burn != null && burn < 5_000;
  const suspects: string[] = [];
  if (arrSuspect) suspects.push(`ARR = ${rawUsd(arr!)}`);
  if (cashSuspect) suspects.push(`cash on hand = ${rawUsd(cash!)}`);
  if (burnSuspect) suspects.push(`monthly burn = ${rawUsd(burn!)}`);
  const dataQualityFlag = suspects.length
    ? `Several metrics (${suspects.join("; ")}) appear to be missing unit-scale context (likely $K or $M). The operating team should verify and resubmit these values before downstream decisions are made.`
    : null;

  const arrValue = arrSuspect ? `${rawUsd(arr!)} (likely ${scaledGuess(arr!)} — verify units)` : (arr != null ? fmtUsd(arr) : "—");
  const cashValue = cashSuspect ? `${rawUsd(cash!)} (likely ${scaledGuess(cash!)} — verify units)` : (cash != null ? fmtUsd(cash) : "—");
  const burnValue = burnSuspect ? `${rawUsd(burn!)} (likely ${scaledGuess(burn!)} — verify units)` : (burn != null ? fmtUsd(burn) : "—");

  const metaLine = `Period: ${period} · Stage: Early-growth${fte != null ? ` · ${fte} FTEs` : ""}${cash != null ? ` · ${cashValue} cash` : ""}`;

  // State of business
  const retentionWeak = (logo != null && logo < 80) || (nrr != null && nrr < 100);
  const growthWeak = growth != null && growth < 22;
  const stateOfBusiness = [
    `${companyName} reports ${arrValue} ARR and ${customers != null ? customers.toLocaleString() : "—"} paying customers as of ${period}.`,
    growthWeak
      ? ` Growth is slow at ${growth != null ? pct(growth) : "—"} YoY and ${retentionWeak ? `retention is critically low (logo ${logo != null ? pct(logo) : "—"}, NRR ${nrr != null ? pct(nrr) : "—"}), both acute risks to the durability of the business model.` : "warrants a closer look against cohort pace."}`
      : ` Growth of ${growth != null ? pct(growth) : "—"} YoY is broadly in line with cohort expectations.`,
    fte != null && burn != null ? ` The company runs ${fte} FTEs at ${burnValue} reported monthly burn.` : "",
  ].join("");

  // ─── Traction ───────────────────────────────────────────────────────────────
  const tractionRows: BriefRow[] = [
    { metric: "ARR", value: arrValue, note: arr != null && arr < 2_100_000 ? "Below p25 ($2.1M)" : "At or above p25", flag: arr != null && arr < 2_100_000 ? "crit" : "good" },
    { metric: "ARR Growth (YoY)", value: growth != null ? pct(growth) : "—", note: growthWeak ? "Well below p25 (22%); cohort median 41%" : "Tracking cohort median (41%)", flag: growthWeak ? "crit" : "good" },
    { metric: "Paying Customers", value: customers != null ? customers.toLocaleString() : "—", note: "No direct benchmark", flag: "neutral" },
  ];
  const acv = arr != null && customers != null && customers > 0 ? arr / customers : null;
  const tractionBullets: BriefBullet[] = [
    { text: arr != null && arr < 2_100_000 ? "ARR is sub-p25 against cohort — the business is tracking below the bottom quartile for comparable-stage companies." : "ARR is at or above the cohort bottom quartile." },
    { text: growthWeak ? `YoY growth of ${growth != null ? pct(growth) : "—"} is less than half the p25 threshold of 22%, placing the company in the bottom decile of the growth cohort.` : `YoY growth of ${growth != null ? pct(growth) : "—"} is competitive within the cohort.` },
  ];
  if (acv != null && acv < 5) {
    tractionBullets.push({ text: `A customer count of ${customers!.toLocaleString()} against ${arrValue} ARR implies an extremely low ACV (~$${acv.toFixed(2)}/customer) — almost certainly a unit or data-entry issue.` });
  }

  // ─── Efficiency & Finance ─────────────────────────────────────────────────────
  const runwayMonths = cash != null && burn != null && burn > 0 ? cash / burn : null;
  const financeRows: BriefRow[] = [
    { metric: "Gross Margin", value: margin != null ? pct(margin) : "—", note: margin != null && margin >= 80 ? "Exceptional (if accurate)" : margin != null && margin >= 60 ? "Healthy" : "Below cohort", flag: margin != null && margin >= 80 ? "good" : margin != null && margin >= 60 ? "neutral" : "warn" },
    { metric: "CAC Payback", value: cac != null ? `${cac} months` : "—", note: cac != null && cac > 24 ? `Critical — ~${(cac / 12).toFixed(1)} years` : cac != null ? "Within range" : "—", flag: cac != null && cac > 24 ? "crit" : "good" },
    { metric: "Burn Multiple", value: burnX != null ? `${burnX}x` : "—", note: burnX != null && burnX > 3 ? "Critical — far outside healthy <2x" : burnX != null ? "Acceptable" : "—", flag: burnX != null && burnX > 3 ? "crit" : "good" },
    { metric: "Rule of 40", value: r40 != null ? pct(r40) : "—", note: r40 != null && r40 < 40 ? "Below 40 threshold" : "At or above 40", flag: r40 != null && r40 < 40 ? "warn" : "good" },
    { metric: "Monthly Net Burn", value: burnValue, note: "—", flag: "neutral" },
    { metric: "Cash on Hand", value: cashValue, note: "—", flag: "neutral" },
    { metric: "Implied Runway", value: runwayMonths != null ? `~${runwayMonths.toFixed(0)} month${runwayMonths >= 2 ? "s" : ""} (at face value)` : "—", note: runwayMonths != null && runwayMonths < 6 ? "Critical if values are literal" : "—", flag: runwayMonths != null && runwayMonths < 6 ? "crit" : "good" },
  ];
  const financeBullets: BriefBullet[] = [];
  if (burnX != null && burnX > 3) financeBullets.push({ text: `Burn multiple of ${burnX}x is severely outside any reasonable range — healthy peers sit below 2x. This reflects either the ARR unit issue or a genuine capital-efficiency crisis.` });
  if (cac != null && cac > 24) financeBullets.push({ text: `CAC payback of ${cac} months signals the GTM motion is not working at current economics; acquisition cost is far outpacing revenue recovery.` });
  if (r40 != null && r40 < 40) financeBullets.push({ text: `Rule of 40 at ${pct(r40)} confirms the growth + margin combination is underperforming, even crediting the reported gross margin.` });

  // ─── Fundraising ──────────────────────────────────────────────────────────────
  const fundraising: BriefBullet[] = [
    { text: `Open to investor intros: ${b.openToIntros ? "Yes" : "No"}.` },
    { text: b.openToIntros
      ? "Founder is open to intros — York IE can begin warm investor matching against the current metrics narrative."
      : "No active raise signals captured. Given runway concerns, this section warrants an urgent founder conversation." },
  ];

  // ─── Risks ─────────────────────────────────────────────────────────────────────
  const risks: BriefRisk[] = [];
  if (retentionWeak) risks.push({ title: "Retention collapse", signal: "retention", flag: "crit",
    text: `Logo retention at ${logo != null ? pct(logo) : "—"} and NRR at ${nrr != null ? pct(nrr) : "—"} are severe. A healthy SaaS/AI business sits at 90%+ logo retention and 100%+ NRR; these figures suggest near-total churn or a fundamental PMF problem.` });
  if (growthWeak) risks.push({ title: "Growth stagnation", signal: "growth", flag: "crit",
    text: `${growth != null ? pct(growth) : "—"} YoY growth puts the company deep below cohort p25 (22%). At this rate it will not reach scale without a meaningful GTM reset.` });
  if (burnX != null && burnX > 3) risks.push({ title: "Capital efficiency crisis", signal: "efficiency", flag: "crit",
    text: `Burn multiple of ${burnX}x means capital is being consumed with minimal ARR return. Combined with a short implied runway, this is the most urgent near-term threat.` });
  if (dataQualityFlag) risks.push({ title: "Unit / data integrity risk", signal: "finance", flag: "warn",
    text: "Multiple metrics appear to be missing scale qualifiers ($K / $M). Decisions made on unchecked data create material blind spots for the board and operating team." });
  if (!b.openToIntros) risks.push({ title: "No investor intro appetite", signal: "fundraising", flag: "warn",
    text: "With potential runway constraints, being closed to investor intros limits optionality at a vulnerable moment." });

  // ─── Opportunities ──────────────────────────────────────────────────────────────
  const opportunities: BriefRisk[] = [];
  if (margin != null && margin >= 80) opportunities.push({ title: "Gross margin profile", signal: "efficiency", flag: "good",
    text: `A reported ${pct(margin)} gross margin (if accurate) is exceptional and, if validated, is a strong narrative anchor for the next fundraise and enterprise pricing conversations.` });
  if (customers != null && customers >= 1000) opportunities.push({ title: "Large customer base", signal: "growth", flag: "good",
    text: `${customers.toLocaleString()} paying customers is a significant installed base. Even at low ACV, this is a major expansion-revenue opportunity if upsell/cross-sell motions can be activated.` });
  opportunities.push({ title: "Underpenetrated market", signal: "market", flag: "neutral",
    text: "A niche category with real defensibility; the differentiation angle opens enterprise and consortium sales channels if positioning is sharpened." });

  // ─── Suggested initiatives ───────────────────────────────────────────────────────
  const initiatives: BriefInitiative[] = [];
  if (dataQualityFlag) initiatives.push({ priority: "high", title: "Metrics Audit & Resubmission",
    text: "Immediately reconcile ARR, cash, burn, and customer-count units with the finance team so accurate data underpins all decisions; current values cannot be actioned with confidence.",
    kind: "One-time", duration: "1–2 weeks", signals: "finance · growth" });
  if (retentionWeak) initiatives.push({ priority: "high", title: "Churn Forensics & Retention Recovery",
    text: "Run an emergency customer-cohort analysis to identify root causes of churn (product gaps, onboarding failure, ICP mismatch) and build a structured save/renewal playbook.",
    kind: "One-time", duration: "4–6 weeks", signals: "retention" });
  if (cac != null && cac > 24) initiatives.push({ priority: "med", title: "GTM Economics Reset",
    text: "Audit channel spend, ICP fit, and sales cycle to redesign a lower-CAC acquisition path; current CAC payback indicates the motion is deeply uneconomic.",
    kind: "Continuous", duration: "Initial sprint 6–8 weeks", signals: "efficiency" });
  if (customers != null && customers >= 1000) initiatives.push({ priority: "med", title: "Expansion Revenue Motion (Land & Expand)",
    text: "Build a structured upsell/expansion playbook to drive NRR above 100%; even modest ARPU expansion across the base would materially change the ARR trajectory.",
    kind: "Continuous", duration: "60-day setup + ongoing", signals: "growth · retention" });
  initiatives.push({ priority: "low", title: "Fundraising Readiness Assessment",
    text: "Engage the board now to stress-test cash position, model bridge scenarios, and determine whether investor-intro posture should shift; waiting until runway is critical limits leverage.",
    kind: "One-time", duration: "2–3 weeks", signals: "fundraising · finance" });

  // ─── Condensed summary for advisor card ───────────────────────────────────────────
  const summaryPoints: { flag: BriefFlag; text: string }[] = [];
  if (risks[0]) summaryPoints.push({ flag: risks[0].flag, text: `${risks[0].title}: ${risks[0].text.split(/(?<=\.)\s/)[0]}` });
  if (risks[1]) summaryPoints.push({ flag: risks[1].flag, text: `${risks[1].title}: ${risks[1].text.split(/(?<=\.)\s/)[0]}` });
  if (initiatives[0]) summaryPoints.push({ flag: "neutral", text: `Top initiative — ${initiatives[0].title}.` });

  const headline = retentionWeak || growthWeak
    ? `${companyName} is tracking below cohort on the metrics that matter most. ${risks.length} risk${risks.length > 1 ? "s" : ""} flagged, ${initiatives.length} initiatives proposed.`
    : `${companyName} is broadly on cohort pace. ${initiatives.length} initiatives proposed to push ahead.`;

  return {
    generatedAtLabel,
    metaLine,
    stateOfBusiness,
    dataQualityFlag,
    traction: { rows: tractionRows, bullets: tractionBullets },
    finance: { rows: financeRows, bullets: financeBullets },
    fundraising,
    risks,
    opportunities,
    initiatives,
    summary: { headline, points: summaryPoints },
  };
}
