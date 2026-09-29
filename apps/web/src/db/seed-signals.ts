// Shared between the Next app and the migrations Lambda — no "server-only"
// so Drizzle CLI / tsx / Lambda can all import this.
import { and, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { signals } from "./schema";

type SignalSeed = {
  id: string;
  label: string;
  category: string;
  kind: "quantitative" | "qualitative" | "boolean";
  unit?: string;
  invertedGood?: boolean;
  description?: string;
  extractionHint?: string;
  displayOrder: number;
};

/**
 * The curated global catalog seeded on every migration-lambda invocation.
 * Add rows here (they're idempotent upserts on id + scope=global). To edit
 * a row after it's been seeded, bump an obvious field — label / description
 * / extraction_hint are re-applied on every run.
 */
const SIGNAL_SEEDS: SignalSeed[] = [
  // Growth
  { id: "arr_usd",                  label: "ARR",                              category: "growth",      kind: "quantitative", unit: "usd",    displayOrder: 10,  description: "Annualized recurring revenue in USD.", extractionHint: "Accept 'ARR', 'annual recurring revenue'. Convert 'K'/'M' suffixes." },
  { id: "arr_growth_yoy_pct",       label: "ARR growth (YoY)",                 category: "growth",      kind: "quantitative", unit: "pct",    displayOrder: 20,  description: "Year-over-year ARR growth." },
  { id: "arr_growth_qoq_pct",       label: "ARR growth (QoQ)",                 category: "growth",      kind: "quantitative", unit: "pct",    displayOrder: 30 },
  { id: "arr_growth_planned_pct",   label: "Planned ARR growth",               category: "growth",      kind: "quantitative", unit: "pct",    displayOrder: 35,  extractionHint: "Forward-looking plan for next year's ARR growth — captured separately from actuals." },
  { id: "growth_endurance_pct",     label: "Growth endurance",                 category: "growth",      kind: "quantitative", unit: "pct",    displayOrder: 40,  description: "Current-year growth rate / prior-year growth rate. Benchmark ~65% in 2025." },
  { id: "mrr_usd",                  label: "MRR",                              category: "growth",      kind: "quantitative", unit: "usd",    displayOrder: 45 },
  { id: "new_arr_usd",              label: "New ARR (total)",                  category: "growth",      kind: "quantitative", unit: "usd",    displayOrder: 50,  description: "New logo + expansion ARR booked in period." },
  { id: "new_logo_arr_usd",         label: "New logo ARR",                     category: "growth",      kind: "quantitative", unit: "usd",    displayOrder: 55 },
  { id: "expansion_arr_usd",        label: "Expansion ARR",                    category: "growth",      kind: "quantitative", unit: "usd",    displayOrder: 60,  description: "Upsell + cross-sell + seat/usage expansion from existing customers." },
  { id: "expansion_arr_share_pct",  label: "Expansion ARR share",              category: "growth",      kind: "quantitative", unit: "pct",    displayOrder: 65,  description: "Expansion ARR / (new logo + expansion). Typical 40% median, >50% for >$50M ARR companies." },
  { id: "new_logos_count",          label: "New logos",                        category: "growth",      kind: "quantitative", unit: "count",  displayOrder: 70 },
  { id: "paid_customer_count",      label: "Paid customers",                   category: "growth",      kind: "quantitative", unit: "count",  displayOrder: 80 },
  { id: "churned_logos_count",      label: "Churned logos",                    category: "growth",      kind: "quantitative", unit: "count",  invertedGood: true, displayOrder: 85 },

  // Retention
  { id: "nrr_pct",                  label: "Net revenue retention",            category: "retention",   kind: "quantitative", unit: "pct",    displayOrder: 100 },
  { id: "grr_pct",                  label: "Gross revenue retention",          category: "retention",   kind: "quantitative", unit: "pct",    displayOrder: 110 },
  { id: "logo_retention_pct",       label: "Logo retention",                   category: "retention",   kind: "quantitative", unit: "pct",    displayOrder: 120 },
  { id: "churn_rate_pct",           label: "Churn rate",                       category: "retention",   kind: "quantitative", unit: "pct",    invertedGood: true, displayOrder: 130 },
  { id: "gross_arr_churn_pct",      label: "Gross ARR churn",                  category: "retention",   kind: "quantitative", unit: "pct",    invertedGood: true, displayOrder: 140, description: "Churned ARR / starting ARR; the lost-customer component of GRR." },
  { id: "arr_downsell_pct",         label: "ARR downsell rate",                category: "retention",   kind: "quantitative", unit: "pct",    invertedGood: true, displayOrder: 150 },
  { id: "upsell_arr_pct",           label: "Upsell / expansion rate",          category: "retention",   kind: "quantitative", unit: "pct",    displayOrder: 160 },
  { id: "nrr_calculation_basis",    label: "NRR calculation basis",            category: "retention",   kind: "qualitative",                  displayOrder: 170, extractionHint: "How NRR is calculated — cohort vs period, YoY vs TTM, look-back window. Matters for apples-to-apples with usage pricing." },

  // Efficiency
  { id: "cac_payback_months",       label: "CAC payback",                      category: "efficiency",  kind: "quantitative", unit: "months", invertedGood: true, displayOrder: 200 },
  { id: "fully_loaded_cac_payback_months", label: "Fully-loaded CAC payback",  category: "efficiency",  kind: "quantitative", unit: "months", invertedGood: true, displayOrder: 205, description: "S&M / (new logo + expansion ARR) × gross margin × 12." },
  { id: "new_only_cac_payback_months", label: "New-only CAC payback",          category: "efficiency",  kind: "quantitative", unit: "months", invertedGood: true, displayOrder: 210 },
  { id: "new_cac_ratio",            label: "New customer CAC ratio",           category: "efficiency",  kind: "quantitative", unit: "ratio",  invertedGood: true, displayOrder: 215, description: "S&M / new logo ARR. Median ~2.0x." },
  { id: "blended_cac_ratio",        label: "Blended CAC ratio",                category: "efficiency",  kind: "quantitative", unit: "ratio",  invertedGood: true, displayOrder: 220, description: "S&M / (new logo + expansion ARR). Median ~1.4x." },
  { id: "expansion_cac_ratio",      label: "Expansion CAC ratio",              category: "efficiency",  kind: "quantitative", unit: "ratio",  invertedGood: true, displayOrder: 225 },
  { id: "burn_multiple",            label: "Burn multiple",                    category: "efficiency",  kind: "quantitative", unit: "ratio",  invertedGood: true, displayOrder: 230, description: "Net burn / net new ARR. Lower is better." },
  { id: "rule_of_40_pct",           label: "Rule of 40",                       category: "efficiency",  kind: "quantitative", unit: "pct",    displayOrder: 240, description: "Growth rate + FCF margin." },
  { id: "gross_magic_number",       label: "Gross magic number",               category: "efficiency",  kind: "quantitative", unit: "ratio",  displayOrder: 245, description: "(New logo + upsell ARR) / S&M. >0.75 is invest-more territory." },
  { id: "net_magic_number",         label: "Net magic number",                 category: "efficiency",  kind: "quantitative", unit: "ratio",  displayOrder: 250 },
  { id: "gross_margin_pct",         label: "Gross margin (blended)",           category: "efficiency",  kind: "quantitative", unit: "pct",    displayOrder: 255 },
  { id: "gross_margin_subscription_pct", label: "Subscription gross margin",   category: "efficiency",  kind: "quantitative", unit: "pct",    displayOrder: 260, description: "Subscription revenue less subscription COGS. SaaS ceiling ~80%." },
  { id: "gross_margin_services_pct", label: "Services gross margin",           category: "efficiency",  kind: "quantitative", unit: "pct",    displayOrder: 265 },
  { id: "ltv_cac_ratio",            label: "LTV / CAC",                        category: "efficiency",  kind: "quantitative", unit: "ratio",  displayOrder: 270 },

  // Finance
  { id: "cash_on_hand_usd",         label: "Cash on hand",                     category: "finance",     kind: "quantitative", unit: "usd",    displayOrder: 300 },
  { id: "monthly_burn_usd",         label: "Monthly net burn",                 category: "finance",     kind: "quantitative", unit: "usd",    invertedGood: true, displayOrder: 310 },
  { id: "runway_months",            label: "Runway",                           category: "finance",     kind: "quantitative", unit: "months", displayOrder: 320 },
  { id: "ebitda_margin_pct",        label: "EBITDA margin",                    category: "finance",     kind: "quantitative", unit: "pct",    displayOrder: 330 },
  { id: "fcf_margin_pct",           label: "Free cash flow margin",            category: "finance",     kind: "quantitative", unit: "pct",    displayOrder: 340 },
  { id: "sm_pct_revenue",           label: "S&M % of revenue",                 category: "finance",     kind: "quantitative", unit: "pct",    displayOrder: 350, description: "Fully-loaded sales & marketing as share of revenue. Private median ~37%." },
  { id: "rd_pct_revenue",           label: "R&D % of revenue",                 category: "finance",     kind: "quantitative", unit: "pct",    displayOrder: 360 },
  { id: "ga_pct_revenue",           label: "G&A % of revenue",                 category: "finance",     kind: "quantitative", unit: "pct",    displayOrder: 370 },
  { id: "revenue_mix_subscription_pct", label: "Subscription revenue share",   category: "finance",     kind: "quantitative", unit: "pct",    displayOrder: 380 },
  { id: "revenue_mix_services_pct", label: "Services revenue share",           category: "finance",     kind: "quantitative", unit: "pct",    displayOrder: 385, description: ">15-20% drags blended gross margin." },
  { id: "arr_to_capital_raised_ratio", label: "ARR : capital raised",          category: "finance",     kind: "quantitative", unit: "ratio",  displayOrder: 390, description: "End-of-period ARR / lifetime capital raised. ≥1.0 means ARR exceeds invested capital." },
  { id: "capital_raised_total_usd", label: "Total capital raised",             category: "finance",     kind: "quantitative", unit: "usd",    displayOrder: 395 },

  // Team
  { id: "fte_count",                label: "FTE headcount",                    category: "team",        kind: "quantitative", unit: "count",  displayOrder: 400 },
  { id: "arr_per_fte_usd",          label: "ARR per FTE",                      category: "team",        kind: "quantitative", unit: "usd",    displayOrder: 405, description: "Capital-efficient scale indicator. Median ~$182K; rises to $240K+ past $50M ARR." },
  { id: "engineering_headcount",    label: "Engineering headcount",            category: "team",        kind: "quantitative", unit: "count",  displayOrder: 410 },
  { id: "sales_headcount",          label: "Sales headcount",                  category: "team",        kind: "quantitative", unit: "count",  displayOrder: 420 },
  { id: "ae_headcount",             label: "AE headcount",                     category: "team",        kind: "quantitative", unit: "count",  displayOrder: 425, description: "Count of quota-carrying account executives." },
  { id: "sdr_bdr_headcount",        label: "SDR/BDR headcount",                category: "team",        kind: "quantitative", unit: "count",  displayOrder: 430 },
  { id: "csm_headcount",            label: "CSM headcount",                    category: "team",        kind: "quantitative", unit: "count",  displayOrder: 435 },
  { id: "exec_churn_count",         label: "Executive departures",             category: "team",        kind: "quantitative", unit: "count",  invertedGood: true, displayOrder: 440 },
  { id: "hiring_needs",             label: "Hiring needs",                     category: "team",        kind: "qualitative",                  displayOrder: 450, extractionHint: "Capture specific roles the company needs ('CRO', 'Head of Product', etc)." },
  { id: "hiring_challenges",        label: "Hiring challenges",                category: "team",        kind: "qualitative",                  displayOrder: 460, extractionHint: "Any statement about difficulty attracting / retaining talent." },
  { id: "culture_concerns",         label: "Culture concerns",                 category: "team",        kind: "qualitative",                  displayOrder: 470 },

  // GTM
  { id: "go_to_market_motion",      label: "Primary GTM motion",               category: "gtm",         kind: "qualitative",                  displayOrder: 500, extractionHint: "Product-led, Sales-led, or Hybrid (product + sales)." },
  { id: "pricing_model",            label: "Pricing model",                    category: "gtm",         kind: "qualitative",                  displayOrder: 505, extractionHint: "Subscription / Usage-based / Subscription+Usage / Outcome-based / Sub+Outcome." },
  { id: "primary_contract_length_months", label: "Primary contract length",    category: "gtm",         kind: "quantitative", unit: "months", displayOrder: 510, description: "Modal contract length offered. 67% of private SaaS are 1-year." },
  { id: "acv_usd",                  label: "ACV",                              category: "gtm",         kind: "quantitative", unit: "usd",    displayOrder: 515, description: "Annual contract value — ARR / number of customers." },
  { id: "average_deal_size_usd",    label: "Average deal size",                category: "gtm",         kind: "quantitative", unit: "usd",    displayOrder: 520 },
  { id: "sales_cycle_days",         label: "Sales cycle length",               category: "gtm",         kind: "quantitative", unit: "days",   invertedGood: true, displayOrder: 525 },
  { id: "pipeline_coverage_ratio",  label: "Pipeline coverage",                category: "gtm",         kind: "quantitative", unit: "ratio",  displayOrder: 530 },
  { id: "win_rate_pct",             label: "Win rate",                         category: "gtm",         kind: "quantitative", unit: "pct",    displayOrder: 535 },
  { id: "ae_quota_usd",             label: "AE quota (fully-ramped)",          category: "gtm",         kind: "quantitative", unit: "usd",    displayOrder: 540, description: "Median fully-ramped AE quota. ~$800K benchmark." },
  { id: "ae_productivity_usd",      label: "AE productivity (new ARR / AE)",   category: "gtm",         kind: "quantitative", unit: "usd",    displayOrder: 545 },
  { id: "quota_attainment_pct",     label: "Quota attainment rate",            category: "gtm",         kind: "quantitative", unit: "pct",    displayOrder: 550 },
  { id: "channel_challenges",       label: "Channel / GTM challenges",         category: "gtm",         kind: "qualitative",                  displayOrder: 560 },
  { id: "competitive_pressure",     label: "Competitive pressure",             category: "gtm",         kind: "qualitative",                  displayOrder: 570, extractionHint: "Which competitors are showing up in deals, pricing pressure, product comparisons." },

  // Customer success
  { id: "csm_book_of_business_usd", label: "CSM book of business",             category: "customer_success", kind: "quantitative", unit: "usd", displayOrder: 600, description: "ARR per CSM. ~$1.2M SMB / $1.6M MM / $2.5M enterprise." },
  { id: "customer_segment_mix_pct", label: "ARR by customer segment",          category: "customer_success", kind: "qualitative",              displayOrder: 610, extractionHint: "% of ARR from Enterprise / Mid-Market / SMB / VSB / Consumer." },
  { id: "geographic_arr_mix_pct",   label: "ARR by geography",                 category: "customer_success", kind: "qualitative",              displayOrder: 620 },

  // Product
  { id: "dau_count",                label: "Daily active users",               category: "product",     kind: "quantitative", unit: "count",  displayOrder: 700 },
  { id: "mau_count",                label: "Monthly active users",             category: "product",     kind: "quantitative", unit: "count",  displayOrder: 710 },
  { id: "dau_mau_ratio",            label: "DAU / MAU stickiness",             category: "product",     kind: "quantitative", unit: "ratio",  displayOrder: 720 },
  { id: "feature_adoption_pct",     label: "Feature adoption",                 category: "product",     kind: "quantitative", unit: "pct",    displayOrder: 730 },
  { id: "nps_score",                label: "NPS",                              category: "product",     kind: "quantitative", unit: "score",  displayOrder: 740 },
  { id: "product_portfolio_breadth_count", label: "Product portfolio breadth", category: "product",     kind: "quantitative", unit: "count",  displayOrder: 750, description: "Number of distinct products / SKUs available for cross-sell. Driver of NRR." },
  { id: "ai_selection_category",    label: "AI classification",                category: "product",     kind: "qualitative",                  displayOrder: 760, extractionHint: "Self-classification: AI-Native, AI-Enabled, AI-Interested, or Non-AI." },
  { id: "ai_monetization_status",   label: "AI monetization status",           category: "product",     kind: "qualitative",                  displayOrder: 770, extractionHint: "Currently monetizing / testing monetization / not monetizing AI features." },
  { id: "ai_spend_change_pct",      label: "AI spend change (YoY)",            category: "product",     kind: "quantitative", unit: "pct",    displayOrder: 780 },

  // Fundraising — is the company raising now?
  { id: "actively_fundraising",     label: "Actively fundraising",             category: "fundraising", kind: "boolean",                      displayOrder: 800, extractionHint: "True when the company is currently raising a round. Triggers: 'we're raising', 'we opened the round', 'closing soon', 'still raising', 'back out fundraising'. Don't set true from 'we just closed' (past) or 'we'll raise next year' (future-only)." },

  // Fundraising — current (in-flight) round
  { id: "current_round_stage",      label: "Round stage",                      category: "fundraising", kind: "qualitative",                  displayOrder: 805, extractionHint: "The stage of the round currently being raised — Pre-seed / Seed / Series A / Series B / Series C / Series D+ / Growth / Mezzanine / Bridge. Only set when actively_fundraising is true. DO NOT infer the stage from 'last round was a Seed, so they must be raising a Series A' — that's a guess. Only set when the text EXPLICITLY names the stage of the round being raised right now (e.g. 'raising a Series A', 'this is a Seed extension', 'pre-seed SAFE'). If it just says 'raising X' with a dollar amount and no stage label, OMIT this signal." },
  { id: "current_round_type",       label: "Round type",                       category: "fundraising", kind: "qualitative",                  displayOrder: 810, extractionHint: "Instrument type for the round being raised — SAFE / Priced equity / Convertible note / Bridge / Venture debt / Extension / Tranche. Only set when actively_fundraising is true. Only emit when the text explicitly names the instrument (e.g. 'SAFE with $X cap', 'priced round', 'convertible note'). A stated pre/post valuation alone does NOT imply 'priced equity' — many SAFEs quote caps. If unclear, OMIT." },
  { id: "current_round_target_amount_usd", label: "Target round size",         category: "fundraising", kind: "quantitative", unit: "usd",    displayOrder: 815, extractionHint: "Target amount being raised ('raising $5M on a SAFE', 'looking to close $25M Series B'). Convert K/M/B suffixes. Only set when actively_fundraising is true." },
  { id: "current_round_committed_amount_usd", label: "Committed so far",       category: "fundraising", kind: "quantitative", unit: "usd",    displayOrder: 820, extractionHint: "Amount soft-circled / signed / closed so far in the current round ('$3M of $5M soft-circled', 'first close of $10M completed'). Only set when actively_fundraising is true." },
  { id: "current_round_target_pre_money_usd", label: "Target pre-money",       category: "fundraising", kind: "quantitative", unit: "usd",    displayOrder: 825, extractionHint: "Target pre-money valuation for the round being raised. Convert K/M/B. Only set for Priced equity rounds." },
  { id: "current_round_target_post_money_usd", label: "Target post-money",     category: "fundraising", kind: "quantitative", unit: "usd",    displayOrder: 830, extractionHint: "Target post-money valuation for the round being raised. If only pre-money is stated, derive as pre + target size. Only set for Priced equity rounds." },
  { id: "current_round_valuation_cap_usd", label: "Valuation cap",             category: "fundraising", kind: "quantitative", unit: "usd",    displayOrder: 835, extractionHint: "Valuation cap on a SAFE or convertible note. Only set when current_round_type is SAFE / Convertible note." },
  { id: "current_round_discount_pct", label: "Discount",                       category: "fundraising", kind: "quantitative", unit: "pct",    displayOrder: 840, extractionHint: "Discount rate on a SAFE or convertible note ('20% discount to next round'). Only set when current_round_type is SAFE / Convertible note." },
  { id: "current_round_lead_investor", label: "Lead investor",                 category: "fundraising", kind: "qualitative",                  displayOrder: 845, extractionHint: "Name of the committed LEAD investor for the round being raised. Text must explicitly identify them as leading or setting the terms (e.g. 'Acme Ventures is leading', 'led by X', 'term sheet from X as lead'). Existing investors following on at pro-rata ('Amplify going in at pro rata', 'Founders Fund doing their pro rata') are NOT leads — omit in that case. If no lead is named as such, OMIT." },
  { id: "current_round_target_investors", label: "Target investors",           category: "fundraising", kind: "qualitative",                  displayOrder: 850, extractionHint: "Comma-separated list of funds / angels being pitched for the current round. May overlap with investor_intros_needed. Keep names only; no commentary." },
  { id: "current_round_target_close_date", label: "Target close date",         category: "fundraising", kind: "qualitative",                  displayOrder: 855, extractionHint: "Target close date or window for the current round ('end of Q2 2026', 'by September', 'next 6 weeks'). Only set when actively_fundraising is true." },

  // Fundraising — intent / support
  { id: "fundraise_timing",         label: "Fundraise timing",                 category: "fundraising", kind: "qualitative",                  displayOrder: 860, extractionHint: "When they PLAN to raise (future-looking). 'Next 6 months', 'not for 12-18mo', 'after hitting $5M ARR'. Don't use when actively_fundraising — use current_round_target_close_date for in-flight rounds." },
  { id: "investor_intros_needed",   label: "Investor intros wanted",           category: "fundraising", kind: "qualitative",                  displayOrder: 865, extractionHint: "Specific funds, partners, or angels the founder is asking York for intros to. Names / firms only." },

  // Fundraising — last (closed) round
  { id: "last_round_pre_money_valuation_usd", label: "Pre-money at last round", category: "fundraising", kind: "quantitative", unit: "usd",  displayOrder: 870 },
  { id: "last_round_ev_arr_multiple", label: "EV / ARR multiple at last round", category: "fundraising", kind: "quantitative", unit: "ratio", displayOrder: 875, description: "Pre-money / ARR. 2024-25 median ~11-13x for SaaS." },
  { id: "months_since_last_round",  label: "Months since last round",          category: "fundraising", kind: "quantitative", unit: "months", displayOrder: 880 },

  // Strategic
  { id: "key_risks",                label: "Key risks",                        category: "strategic",   kind: "qualitative",                  displayOrder: 900 },
  { id: "key_opportunities",        label: "Key opportunities",                category: "strategic",   kind: "qualitative",                  displayOrder: 910 },
  { id: "competitive_moat",         label: "Competitive moat",                 category: "strategic",   kind: "qualitative",                  displayOrder: 920 },
  { id: "market_shifts",            label: "Market shifts",                    category: "strategic",   kind: "qualitative",                  displayOrder: 930 },
  { id: "sector_category",          label: "Software sector",                  category: "strategic",   kind: "qualitative",                  displayOrder: 940, extractionHint: "Horizontal App / Vertical App / Infra & Security / Fintech / Cybersecurity / eCommerce / AI-Native." },
  { id: "financing_source",         label: "Financing source",                 category: "strategic",   kind: "qualitative",                  displayOrder: 950, extractionHint: "Bootstrapped / Angel / VC / PE / Public / Debt." },

  // Board reporting
  { id: "met_rule_of_40_flag",      label: "Meets Rule of 40",                 category: "board_reporting", kind: "boolean",                  displayOrder: 1000 },
  { id: "breakeven_achieved_flag",  label: "EBITDA-breakeven reached",         category: "board_reporting", kind: "boolean",                  displayOrder: 1010 },
  { id: "forecast_optimism_index",  label: "Forecast optimism",                category: "board_reporting", kind: "quantitative", unit: "pct", displayOrder: 1020, description: "Planned growth / prior-period actuals; > 1.0 = optimistic forecasting history." },

  // Quarterly update narrative + flags — fanned out from portfolio_updates
  // so the same signal_observations backing the email-extracted feed is the
  // single source of truth for the quarterly survey too. Ordered high so
  // they fall after the core benchmarkable metrics in default sort.
  { id: "notable_customers",        label: "Notable customers (period)",       category: "gtm",         kind: "qualitative",                  displayOrder: 1100, extractionHint: "Logos worth flagging from the quarter — either recent wins or the anchor accounts." },
  { id: "notable_hires",            label: "Notable hires (period)",           category: "team",        kind: "qualitative",                  displayOrder: 1110, extractionHint: "Senior hires or executive signings the founder highlights as the quarter's wins." },
  { id: "other_updates",            label: "Other updates (period)",           category: "board_reporting", kind: "qualitative",              displayOrder: 1120, extractionHint: "Free-form quarter narrative that doesn't fit the structured fields. Keep short." },
  { id: "quarter_challenges",       label: "Challenges (period)",              category: "board_reporting", kind: "qualitative",              displayOrder: 1130, extractionHint: "Founder's stated challenges for the quarter. Distinct from hiring_challenges / channel_challenges — this is the catch-all narrative." },

  // Vendor stack — captured on the quarterly survey, useful for cross-
  // portfolio tooling / procurement patterns. Each one is a qualitative
  // signal carrying the vendor name (or brief description).
  { id: "banking_partner",          label: "Banking partner",                  category: "vendor_stack", kind: "qualitative",                 displayOrder: 1200 },
  { id: "legal_counsel",            label: "Legal counsel",                    category: "vendor_stack", kind: "qualitative",                 displayOrder: 1210 },
  { id: "cloud_provider",           label: "Cloud provider",                   category: "vendor_stack", kind: "qualitative",                 displayOrder: 1220, extractionHint: "AWS / GCP / Azure / Hetzner / on-prem, etc." },
  { id: "cap_table_platform",       label: "Cap table platform",               category: "vendor_stack", kind: "qualitative",                 displayOrder: 1230, extractionHint: "Carta / Pulley / AngelList / shared-doc." },
  { id: "do_insurance_provider",    label: "D&O insurance provider",           category: "vendor_stack", kind: "qualitative",                 displayOrder: 1240 },
  { id: "crm_platform",             label: "CRM platform",                     category: "vendor_stack", kind: "qualitative",                 displayOrder: 1250, extractionHint: "HubSpot / Salesforce / Attio / Copper / none." },

  // Operator opt-in for investor intros — boolean lets the portfolio view
  // filter to "who said yes when we asked".
  { id: "open_to_investor_intros",  label: "Open to investor intros",          category: "fundraising", kind: "boolean",                      displayOrder: 1300 },
];

export async function seedSignalCatalog(
  db: NodePgDatabase<Record<string, unknown>>,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;
  for (const s of SIGNAL_SEEDS) {
    const existing = await db
      .select({ id: signals.id })
      .from(signals)
      .where(and(eq(signals.id, s.id), eq(signals.scope, "global"), isNull(signals.accountId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(signals).values({
        id: s.id,
        label: s.label,
        description: s.description ?? null,
        extractionHint: s.extractionHint ?? null,
        kind: s.kind,
        unit: s.unit ?? null,
        category: s.category,
        invertedGood: s.invertedGood ?? false,
        scope: "global",
        accountId: null,
        displayOrder: s.displayOrder,
      });
      inserted++;
    } else {
      // Re-apply mutable fields so edits in this file land without manual SQL.
      await db
        .update(signals)
        .set({
          label: s.label,
          description: s.description ?? null,
          extractionHint: s.extractionHint ?? null,
          kind: s.kind,
          unit: s.unit ?? null,
          category: s.category,
          invertedGood: s.invertedGood ?? false,
          displayOrder: s.displayOrder,
          updatedAt: new Date(),
        })
        .where(and(eq(signals.id, s.id), eq(signals.scope, "global")));
      updated++;
    }
  }
  return { inserted, updated };
}
