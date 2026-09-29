import {
  DETAIL_QUESTION_BY_ID,
  DETAIL_QUESTION_LABEL,
  isOtherSpecifyOption,
  parseMultiSelectAnswer,
} from "./detail-question-catalog";
import { isUnknownAnswer } from "@/lib/onboard/unknown-answer";

/** Ported from Design/src/app/ScorecardV2.tsx DETAIL_ANSWER_SCORES */
export const DETAIL_ANSWER_SCORES: Record<string, Record<string, number>> = {
  dev_product_stage: {
    "Idea — not yet in development": 42,
    "In active development": 58,
    "Built — not yet launched": 66,
    "Launched — early users or customers": 78,
    "Launched — scaling usage or revenue": 90,
  },
  dev_product_type: {
    "SaaS Platform": 78,
    "AI Application": 82,
    "AI Infrastructure": 84,
    Marketplace: 70,
    "Developer Platform / API": 82,
    "Mobile App": 72,
    "Hardware / IoT": 66,
    Other: 62,
    // Legacy labels
    "SaaS / web app": 78,
    "API or developer platform": 82,
  },
  dev_delivery_constraint: {
    "Planning and prioritization": 50,
    "Capacity and hiring": 46,
    "Quality and reliability": 58,
    "Technical debt / Architecture": 44,
  },
  dev_primary_customer: {
    "End user and buyer are the same role": 82,
    "User and buyer are different": 74,
    "Still validating who the real buyer is": 48,
    "Building for multiple segments — no focus yet": 38,
  },
  dev_launch_timeline: {
    "Already live — no fixed date": 80,
    "Within 3 months": 72,
    "3–6 months": 66,
    "6–12 months": 58,
    "No target date yet": 42,
  },
  dev_build_model: {
    "In-house engineering team": 86,
    "Founders building internally": 68,
    "Offshore or hybrid team": 62,
    "Contract dev / agency": 48,
    "Not building yet — manual or services first": 36,
  },
  dev_engineering_size: {
    "11+ engineers": 90,
    "4–10 engineers": 78,
    "1–3 engineers": 58,
    "No engineers (founders only)": 42,
  },
  dev_ship_cadence: {
    "CI/CD with staged rollout": 92,
    "Regular releases (e.g. weekly / biweekly)": 82,
    "Ad hoc — no regular cadence": 38,
    "Not shipping yet": 30,
  },
  dev_ai_role: {
    "AI is our core product": 86,
    "AI powers major features": 72,
    "AI improves internal operations": 64,
    Experimenting: 58,
    "No AI today": 54,
    // Legacy labels
    "Core to the product": 86,
    "Important feature": 72,
    Exploring: 58,
    "Not applicable": 54,
  },
  dev_compliance: {
    "Already certified": 92,
    "In progress": 78,
    "On roadmap (e.g. SOC 2, ISO)": 62,
    "Not yet": 48,
  },
  dev_prioritization: {
    "Data/Usage Analytics": 86,
    "Customer Interviews": 78,
    "Sales/Founder Intuition": 52,
    "Ad-hoc / No formal process": 38,
  },
  dev_feature_debt_split: {
    "Mostly New Features (80/20)": 82,
    "Balanced (70/30)": 72,
    "Heavy focus on Tech Debt/Bugs (50/50 or less)": 48,
  },
  dev_eng_bottleneck: {
    "Planning and prioritization": 50,
    "Code review / quality gates": 54,
    "QA and testing": 52,
    "Deployments and incidents": 48,
    "Hiring and capacity": 46,
    "Technical debt / architecture": 44,
  },
  dev_six_month_impact: {
    "Ship product faster": 70,
    "Improve product quality": 74,
    "Reduce engineering costs": 62,
    "Hire engineering talent": 68,
    "Implement AI": 72,
    "Improve product strategy": 76,
    "Modernize architecture": 66,
    "Prepare for enterprise customers": 78,
  },
  mkt_sales_motion: {
    "Product-led": 86,
    "Sales-led": 78,
    "Founder-led": 52,
    "Not yet defined": 36,
    "Other": 40,
    "Other (Please specify)": 40, // legacy answers
    // Legacy
    "Not yet": 36,
  },
  mkt_funnel_gap: {
    "Not enough awareness": 58,
    "Not enough qualified pipeline": 52,
    "Too few opportunities convert": 50,
    "Customers aren't expanding or renewing": 44,
    Unsure: 48,
    // Legacy funnel stages
    Awareness: 58,
    Conversion: 50,
    Retention: 44,
  },
  mkt_icp_clarity: {
    "Documented and shared - Written ICP the team uses for targeting and qualification": 92,
    "Clear in founder's head - We know who fits, but it's not written or enforced yet": 62,
    "Still a hypothesis - Early signal from customers, but not validated": 48,
    "Not defined yet - Selling broadly or still figuring out who fits": 38,
    // Legacy split options
    "Documented and shared": 92,
    "Written ICP the team uses for targeting and qualification": 90,
    "Clear in founder's head": 62,
    "We know who fits, but it's not written or enforced yet": 56,
    "Still a hypothesis": 48,
    "Early signal from customers, but not validated": 52,
    "Not defined yet": 38,
    "Selling broadly or still figuring out who fits": 34,
  },
  mkt_revenue_tracking: {
    "CRM with a defined sales process": 88,
    "CRM but informal process": 68,
    "Spreadsheet or lightweight tracking": 48,
    "No systematic pipeline yet": 30,
  },
  mkt_deal_size: {
    "Over $100K": 86,
    "$25K–$100K": 78,
    "$5K–$25K": 68,
    "Under $5K": 58,
    "Not sure yet": 44,
  },
  mkt_pricing_model: {
    "Flat subscription": 78,
    "Usage-based": 82,
    "Tiered / per seat": 76,
    "Hybrid (Recurring + One-time)": 80,
    "One-time purchase / license": 70,
    "Still figuring out": 40,
    Hybrid: 80,
  },
  mkt_demand_source: {
    "Inbound / content": 78,
    "Product-led / self-serve": 82,
    "Outbound sales": 72,
    "Partners / channel": 76,
    "Paid acquisition": 64,
    "Mix of channels": 70,
    "Still figuring out": 40,
  },
  mkt_sales_team: {
    "Larger sales org (6+)": 90,
    "Small team (2–5 in sales)": 82,
    "Founder + 1 AE or SDR": 68,
    "Founder only": 52,
    "No sales hire yet": 36,
  },
  mkt_marketing_capacity: {
    "Small marketing team (2+)": 88,
    "1 marketing generalist": 76,
    "Agency or fractional support": 70,
    "No dedicated marketing — founders or sales cover it": 48,
    "Not applicable yet": 40,
  },
  mkt_cac_payback: {
    "CAC / Payback / LTV": 88,
    "Pipeline created": 78,
    "Qualified leads": 68,
    "Website traffic": 52,
    "We don't have consistent metrics": 34,
    // Legacy
    "Yes — tracked regularly": 88,
    "Rough estimate only": 58,
    "Not yet": 34,
  },
  mkt_competitive_pressure: {
    "Low — category is early or we lead": 82,
    "Moderate — several credible alternatives": 62,
    "High — crowded market, price or feature pressure": 44,
    "Not sure yet": 48,
  },
  mkt_gtm_constraint: {
    "Lead generation and pipeline": 50,
    "Sales capacity and hiring": 48,
    "Pricing and positioning": 54,
    "Sales and marketing alignment": 52,
    "Everything is well optimized": 88,
    Other: 56,
    "Other (please specify)": 56, // legacy
  },
  mkt_deal_stall: {
    "Before first meeting / demo": 48,
    "After demo — no decision": 52,
    "Late stage — legal, security, procurement": 58,
    "Pricing or budget": 54,
    "Not enough pipeline to tell": 42,
  },
  mkt_gtm_priority: {
    "Generate more pipeline": 70,
    "Improve conversion rates": 74,
    "Increase deal size": 72,
    "Expand into enterprise": 76,
    "Improve customer retention": 78,
    "Build a repeatable GTM engine": 82,
  },
  mkt_pipeline_definitions: {
    "Yes, documented and shared — We have written criteria that the team uses.":
      90,
    "Informal / Shared understanding — We have a general idea of what these terms mean, but it's not documented or strictly enforced.":
      58,
    "Not defined yet — We don't use these definitions or are still figuring out our pipeline stages.":
      36,
  },
  rev_runway: {
    "Over 18 months": 90,
    "12–18 months": 78,
    "6–12 months": 58,
    "Under 6 months": 34,
  },
  rev_finance_management: {
    "Dedicated finance leader": 90,
    "Outsourced finance/accounting": 72,
    "Founder manages finances": 46,
    "Minimal financial processes": 30,
    // Legacy
    "Accounting software with regular close": 90,
    "Spreadsheet + accountant or bookkeeper": 68,
    "Founder-managed / informal": 46,
    "Not set up yet": 30,
  },
  rev_capital_priority: {
    "Actively fundraising": 74,
    "Open to investor introductions": 80,
    "Focused on extending runway / reaching profitability": 72,
    "Not focused on capital right now": 68,
  },
  rev_twelve_month_goal: {
    "Scale growth with current capital": 82,
    "Extend runway / reach profitability": 76,
    "Raise next round": 70,
    "Explore strategic options (M&A, partnerships)": 68,
    "Not sure yet": 44,
  },
  rev_ops_challenge: {
    "Finance & reporting": 54,
    "Hiring & people": 52,
    "Legal & compliance": 50,
    "Internal operations": 56,
    "Strategic planning": 58,
    Unsure: 44,
  },
  rev_unit_economics: {
    "Real-time / Automated": 92,
    "Monthly / Spreadsheet-based": 68,
    "Rough manual estimates": 48,
    "Not yet": 32,
  },
  rev_forecast: {
    "Yes, monthly rolling forecast": 90,
    "Yes, static annual budget": 72,
    "No, we track historicals only": 40,
  },
  rev_due_diligence: {
    "Ready today": 90,
    "Mostly prepared": 76,
    "Some work needed": 54,
    "Significant work needed": 36,
  },
  rev_operating_mode: {
    "Balanced growth and efficiency": 82,
    "Growth-first": 74,
    "Efficiency / path to profitability": 76,
  },
  rev_hiring_plans: {
    "Selective hires only": 78,
    "Hiring aggressively": 72,
    "Hiring freeze / defer": 58,
    "Not sure yet": 44,
  },
  rev_board_reporting: {
    "Quarterly board / investor reporting": 86,
    "Monthly updates": 82,
    "Ad hoc only": 48,
    "No investors or board yet": 40,
  },
  rev_segment_economics: {
    "Yes — tracked by segment": 88,
    "Partially — some segments only": 62,
    "Not yet — single blended view": 44,
    "Not applicable — pre-revenue": 54,
  },
  rev_raise_needs: {
    "All of the above": 82,
    "Metrics and data room": 78,
    "Investor narrative and deck": 72,
    Introductions: 70,
    "Financial model and use of funds": 74,
    "Process and timeline discipline": 68,
  },
};

function scoreTableLookup(
  table: Record<string, number>,
  answer: string,
): number {
  const direct = table[answer];
  if (direct !== undefined) return direct;
  for (const key of Object.keys(table)) {
    if (
      isOtherSpecifyOption(key) &&
      (answer === key || answer.startsWith(`${key}:`))
    ) {
      return table[key]!;
    }
  }
  return 58;
}

export function scoreForAnswer(
  questionId: string,
  answer: string | null | undefined,
): number | null {
  if (!answer?.trim()) return null;
  // Explicit "I don't know / NA" — treat as unanswered for scoring.
  if (isUnknownAnswer(answer.trim())) return null;
  const table = DETAIL_ANSWER_SCORES[questionId];
  if (!table) return 58;

  const q = DETAIL_QUESTION_BY_ID[questionId];
  // Multi-select: score each option and take the worst (minimum).
  if (q?.multi) {
    const parts = parseMultiSelectAnswer(answer);
    if (parts.length === 0) return null;
    const scores = parts.map((part) => scoreTableLookup(table, part));
    return Math.min(...scores);
  }

  return scoreTableLookup(table, answer.trim());
}

export function toneForScore(
  score: number | null,
): "ok" | "watch" | "concern" | "missing" {
  if (score === null) return "missing";
  if (score >= 72) return "ok";
  if (score >= 58) return "watch";
  return "concern";
}

export function flagForTone(tone: ReturnType<typeof toneForScore>): string | null {
  if (tone === "missing") return "Missing";
  if (tone === "concern") return "Needs attention";
  if (tone === "watch") return "Watch";
  return null;
}

export function scoreAnswerRow(
  questionId: string,
  answer: string | null | undefined,
): {
  score: number | null;
  tone: ReturnType<typeof toneForScore>;
  flag: string | null;
  label: string;
} {
  const q = DETAIL_QUESTION_BY_ID[questionId];
  const score = scoreForAnswer(questionId, answer);
  const tone = toneForScore(score);
  return {
    score,
    tone,
    flag: flagForTone(tone),
    label: DETAIL_QUESTION_LABEL[questionId] ?? q?.prompt ?? questionId,
  };
}
