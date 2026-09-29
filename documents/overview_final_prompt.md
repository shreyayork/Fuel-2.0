========== Bedrock Overview Request ==========
Timestamp: 2026-09-18T20:01:13.677Z
Request ID: 54e9e992-37d3-4d1c-8c48-0f8d22c7b8f1
Company ID: cat_ec4eba4c-64c4-488e-b870-fc18205409ed
Account ID: acct_3205f702-ef5a-4aaf-8086-105cb5505f94
User ID: [redacted-email]
Model: us.anthropic.claude-haiku-4-5-20251001-v1:0

System prompt sent to Bedrock:
You are Fuel AI, an advisor for startup founders. Generate a comprehensive operating overview from company profile, category answers, and benchmark metrics.

INPUT.company is the structured company profile (name, product, industry, HQ, stage, additional context). Ground the overview in that identity. INPUT.founderNarrative is optional founder-provided operating context. INPUT.cohortKey is the peer set for metrics only — do not let it override the company's actual product or industry.

INPUT.answers contains only known founder answers keyed by question id. Resolve each key via INPUT.detail_question_catalog (id → prompt, label, options, multi, category_id) — never invent question meaning from the id alone. INPUT.unknown_question_ids lists question ids the founder explicitly marked "I don't know / NA" — treat those as missing evidence (not inventable facts). Prefer gap-filling recommendations for those fields when relevant. Unanswered fields simply omit from INPUT.answers.

Return structured JSON via the record_overview tool with:
- advisor: summary (founder perspective). signal_tags and recommended_actions are computed server-side — do not include them.
- categories: exactly 3 (dev=R&D, mkt=GTM, rev=G&A) with focus_narrative, insight (omit strengths/weaknesses — those are computed server-side)
- intelligence: 0-15 items when evidence supports it (0 is fine if benchmarks are empty/sparse). Each MUST include signal_id copied exactly from INPUT.signal_catalog[].id (never invent), category_id (dev|mkt|rev), text, and optional highlight. Set evidence_source to profile when grounded in INPUT.company / profile_* answers, form when grounded in track detail answers, document when grounded in INPUT.active_documents; omit it for logged INPUT.benchmark metrics (server labels Benchmark). Never invent "Unknown"/"N/A" highlights — omit signals whose INPUT.benchmark value is null. Title/type are overwritten server-side from the catalog — prefer matching the catalog label. If no catalog signal fits, omit that candidate.
- suggested_initiatives: 2-3 per category. Each MUST include a specific title (never "Initiative"), description, benefit (2-4 short bullets, one per line, on the value of completing the initiative), category_id (dev|mkt|rev), cadence (one-time|recurring), milestones (2-4 items; never []), york_help, and tagged_intelligence_types (all related intelligence types/signal ids; empty array if none — untagged generated intelligence is not saved). Each milestone needs { title, due_date?, checked: false }. Nested york_help catalog rules are appended at runtime — do not duplicate them here.
- suggested_playbooks: 3-6 items. Each MUST use playbook_slug copied exactly from INPUT.playbook_catalog[].slug (never invent). Include category_id as exactly one of: dev, mkt, rev. Prefer 1-2 playbooks per category.
- journey_stage: current stage label

Use plain founder-friendly language. Ground advice in cohort benchmarks when provided.

INPUT:
{
  "companyName": "York IE",
  "company": {
    "name": "York IE",
    "domain": "york.ie",
    "website": "https://york.ie",
    "linkedin": "https://www.linkedin.com/company/york-ie",
    "industry": "Investment Firm",
    "businessModel": "Product",
    "founded": "2013",
    "employees": "50",
    "headquarters": "test, Badakhshan, Afghanistan",
    "productDescription": "Investment and operating firm combining capital, services, and partnerships to build and scale technology companies."
  },
  "cohortKey": "b2b_saas:seed:us",
  "answers": {
    "profile_city": "test",
    "profile_state": "Badakhshan",
    "profile_country": "Afghanistan",
    "profile_website": "https://york.ie",
    "profile_headcount": "50",
    "dev_launch_timeline": "3–6 months",
    "dev_build_model": "Contract dev / agency",
    "dev_engineering_size": "4–10 engineers",
    "dev_ship_cadence": "CI/CD with staged rollout",
    "dev_ai_role": "AI improves internal operations",
    "dev_compliance": "In progress",
    "dev_prioritization": "Sales/Founder Intuition",
    "dev_eng_bottleneck": "QA and testing",
    "dev_feature_debt_split": "Heavy focus on Tech Debt/Bugs (50/50 or less)",
    "dev_six_month_impact": "Improve product quality · Implement AI",
    "mkt_pricing_model": "Flat subscription",
    "mkt_deal_size": "Under $5K",
    "mkt_demand_source": "Inbound / content",
    "mkt_sales_team": "Founder only",
    "mkt_cac_payback": "CAC / Payback / LTV",
    "mkt_contract_length": "Monthly",
    "mkt_competitive_pressure": "Moderate — several credible alternatives",
    "mkt_gtm_constraint": "Sales and marketing alignment",
    "mkt_deal_stall": "Pricing or budget",
    "mkt_gtm_priority": "Expand into enterprise",
    "mkt_mql_sql_visibility": "Rough estimate only",
    "mkt_pricing_governance": "Informal / Manual process",
    "mkt_cross_functional_slas": "Informal / Verbal agreements",
    "rev_twelve_month_goal": "Scale growth with current capital",
    "rev_ops_challenge": "Internal operations",
    "rev_unit_economics": "Rough manual estimates",
    "rev_forecast": "Yes, static annual budget",
    "rev_due_diligence": "Ready today",
    "rev_operating_mode": "Balanced growth and efficiency",
    "rev_hiring_plans": "Hiring aggressively",
    "rev_board_reporting": "No investors or board yet",
    "rev_segment_economics": "Yes — tracked by segment",
    "rev_raise_needs": "Investor narrative and deck",
    "profile_product_description": "Investment and operating firm combining capital, services, and partnerships to build and scale technology companies.",
    "profile_company": "York IE",
    "profile_industry": "Investment Firm",
    "profile_founded": "2013",
    "profile_linkedin": "https://www.linkedin.com/company/york-ie",
    "dev_product_type": "AI Infrastructure",
    "rev_runway": "Over 18 months",
    "dev_product_stage": "Built — not yet launched",
    "dev_delivery_constraint": "Quality and reliability",
    "dev_primary_customer": "Building for multiple segments — no focus yet",
    "mkt_sales_motion": "Not yet defined",
    "rev_finance_management": "Founder manages finances",
    "mkt_pipeline_definitions": "Informal / Shared understanding — We have a general idea of what these terms mean, but it's not documented or strictly enforced.",
    "rev_capital_priority": "Open to investor introductions",
    "mkt_funnel_gap": "Customers aren't expanding or renewing",
    "mkt_icp_clarity": "Documented and shared - Written ICP the team uses for targeting and qualification",
    "mkt_revenue_tracking": "CRM with a defined sales process",
    "mkt_marketing_capacity": "No dedicated marketing — founders or sales cover it"
  },
  "unknown_question_ids": [],
  "benchmark": {
    "arr_usd": 1500009,
    "arr_growth_yoy_pct": 105,
    "nrr_pct": 155,
    "logo_retention_pct": 122,
    "gross_margin_pct": 75,
    "monthly_burn_usd": 2000,
    "cash_on_hand_usd": 5000000,
    "fte_count": 50,
    "paid_customer_count": 500
  },
  "profileCompletionPct": 69,
  "active_intelligence": [
    {
      "id": "ci_8023a356-b514-4722-b28c-72b8b5272458",
      "type": "growth",
      "title": "ARR",
      "highlight": "$1.5M ARR",
      "category": "growth",
      "documentVersionId": null
    }
  ],
  "active_documents": [],
  "playbook_catalog": [
    {
      "slug": "finance-assessment",
      "title": "Finance Assessment",
      "description": "Diagnose capital efficiency, runway, gross margin, and reporting maturity. Propose 3 initiatives to extend runway and tighten financial controls.",
      "category": "Founder",
      "category_id": null
    },
    {
      "slug": "kpi-benchmark",
      "title": "KPI Benchmark",
      "description": "Confirm your headline metrics in the Edit Benchmark sidebar, compare against your peer cohort's p25/p50/p75/p90 bands, and surface the 1-2 areas where you're most off-pace.",
      "category": "Founder",
      "category_id": null
    },
    {
      "slug": "marketing-assessment",
      "title": "Marketing Assessment",
      "description": "Diagnose top-of-funnel + brand + lifecycle — pipeline contribution, channel mix, content velocity, retention — and propose 3 initiatives.",
      "category": "Founder",
      "category_id": null
    },
    {
      "slug": "pitch-deck-evaluation",
      "title": "Pitch Deck Evaluation",
      "description": "Extract text from an uploaded pitch deck and evaluate it against a structured rubric — problem, market, traction, team, ask, narrative quality.",
      "category": "Founder",
      "category_id": null
    },
    {
      "slug": "product-engineering-assessment",
      "title": "Product & Engineering Assessment",
      "description": "Diagnose product velocity, engineering maturity, and roadmap discipline. Propose 3 initiatives to improve throughput and quality.",
      "category": "Founder",
      "category_id": null
    },
    {
      "slug": "sales-revops-assessment",
      "title": "Sales & RevOps Assessment",
      "description": "Diagnose where revenue execution is leaking — pipeline coverage, conversion, CAC payback, segmentation, tooling — and propose 3 initiatives.",
      "category": "Founder",
      "category_id": null
    },
    {
      "slug": "annual-planning-framework",
      "title": "Annual Planning Framework",
      "description": "Six-week process to build an annual plan with top-down targets, bottoms-up roll-up, reconciliation, and board-ready output. Tight enough to actually finish before Q1.",
      "category": "G&A",
      "category_id": "rev"
    },
    {
      "slug": "board-deck-template",
      "title": "Board Deck Template",
      "description": "Standard quarterly board deck — state of the business, KPIs, asks, strategic discussion.",
      "category": "G&A",
      "category_id": "rev"
    },
    {
      "slug": "founder-check-in",
      "title": "Founder 1:1 Structure",
      "description": "Recurring check-in between portfolio operator and founder. Focused, action-oriented, 30 min.",
      "category": "G&A",
      "category_id": "rev"
    },
    {
      "slug": "fpa-monthly-cadence",
      "title": "FP&A Monthly Cadence",
      "description": "Close → reporting → forecast → action loop that runs monthly in a week or less. Built for $5M–$50M ARR companies before they hire a dedicated FP&A lead.",
      "category": "G&A",
      "category_id": "rev"
    },
    {
      "slug": "hiring-plan-allocation",
      "title": "Hiring Plan Allocation",
      "description": "Pressure-test a hiring plan against revenue capacity + cash runway. Identifies roles that should be deferred, consolidated, or accelerated.",
      "category": "G&A",
      "category_id": "rev"
    },
    {
      "slug": "investor-update-template",
      "title": "Monthly Investor Update Template",
      "description": "A tight, honest monthly founder update that keeps investors informed without becoming a second board deck. Optimized for action-ability (asks you actually need).",
      "category": "G&A",
      "category_id": "rev"
    },
    {
      "slug": "brand-messaging-refresh",
      "title": "Brand Messaging Refresh",
      "description": "Structured brand + messaging rework: positioning, category framing, persona messaging, and narrative arc for exec, AE, and content. Built from Obviously Awesome / April Dunford methodology.",
      "category": "GTM",
      "category_id": "mkt"
    },
    {
      "slug": "churn-reduction-plan",
      "title": "Churn Reduction Plan",
      "description": "Root-cause the top 5 churn drivers, then design intervention campaigns + product changes ranked by NRR impact. Targets first-90-day save rate and executive-sponsor program.",
      "category": "GTM",
      "category_id": "mkt"
    },
    {
      "slug": "customer-success-playbook",
      "title": "Customer Success Playbook",
      "description": "Design or refresh the CS function. Segmentation, engagement motion, health scoring, and expansion-ownership model tied to NRR and GRR targets.",
      "category": "GTM",
      "category_id": "mkt"
    },
    {
      "slug": "demand-generation-plan",
      "title": "Demand Generation Plan",
      "description": "Build a repeatable pipeline engine. Channel mix, content cadence, MQL definition, and a 90-day launch plan tied to target funnel coverage.",
      "category": "GTM",
      "category_id": "mkt"
    },
    {
      "slug": "icp-definition-workshop",
      "title": "ICP Definition Workshop",
      "description": "2-hour exercise to nail down the ideal customer profile — firmographics, psychographics, triggering events.",
      "category": "GTM",
      "category_id": "mkt"
    },
    {
      "slug": "pipeline-review",
      "title": "Pipeline Review",
      "description": "Monthly sales hygiene — stuck deals, slipping deals, forecast accuracy, coaching moments.",
      "category": "GTM",
      "category_id": "mkt"
    },
    {
      "slug": "pricing-packaging-review",
      "title": "Pricing & Packaging Review",
      "description": "Structured audit of pricing model, tier structure, and add-on strategy against ICP willingness-to-pay and competitive set. Produces revenue-impact-ranked changes.",
      "category": "GTM",
      "category_id": "mkt"
    },
    {
      "slug": "revops-audit",
      "title": "RevOps Audit",
      "description": "Baseline the company's RevOps function — CRM hygiene, forecasting cadence, territory + quota design, and data flow between marketing, sales, and CS.",
      "category": "GTM",
      "category_id": "mkt"
    },
    {
      "slug": "website-conversion-audit",
      "title": "Website Conversion Audit",
      "description": "Audit the marketing site for ICP alignment, messaging, and conversion paths. Identifies the 10 highest-impact changes to lift demo and signup rates.",
      "category": "GTM",
      "category_id": "mkt"
    },
    {
      "slug": "full-diligence-checklist",
      "title": "Full Diligence Checklist",
      "description": "Comprehensive DD across team, market, product, GTM, financials, legal. Typically ~2 weeks.",
      "category": "Investing",
      "category_id": null
    },
    {
      "slug": "initial-deal-screen",
      "title": "Initial Deal Screen",
      "description": "30-minute go/no-go framework for a fresh inbound. Covers thesis fit, stage, signals, red flags.",
      "category": "Investing",
      "category_id": null
    },
    {
      "slug": "portfolio-company-qbr",
      "title": "Portfolio Company Quarterly Business Review",
      "description": "A quarterly deep-dive with a portfolio company covering progress vs. plan, signals, initiative execution, and next-quarter commits. Produces an artifact the investor + founder can both reference.",
      "category": "Investing",
      "category_id": null
    },
    {
      "slug": "thesis-fit-screen",
      "title": "Thesis Fit Screen",
      "description": "Audit-ready thesis-match report for a new investment opportunity. Orchestrates fuel-data, private context, Crunchbase, LinkedIn (company + founders), and website scraping to score the deal against York's eight thesis criteria — with a scorecard at the top and cited evidence below.",
      "category": "Investing",
      "category_id": null
    },
    {
      "slug": "value-creation-plan-100days",
      "title": "Value Creation Plan — First 100 Days",
      "description": "Post-investment 100-day plan: install the operating cadence, prioritize the 3 biggest value-creation initiatives, and align founder + investor on leading indicators.",
      "category": "Investing",
      "category_id": null
    },
    {
      "slug": "value-creation-report",
      "title": "Value Creation Report",
      "description": "State-of-the-operating-thesis report — runs on a single company for a deep audit, or on a portfolio / watchlist to aggregate signals, initiatives, and value-creation themes across every holding. Pulls observations, initiatives, context, and benchmarks; groups initiatives by thesis theme; surfaces high-level patterns and outliers.",
      "category": "Investing",
      "category_id": null
    },
    {
      "slug": "portfolio-benchmark-trends",
      "title": "Portfolio Benchmark Trends Report",
      "description": "Pull every company in a named portfolio, overlay the latest quarterly metrics against the best-fit cohort benchmarks, and surface winners, laggards, and structural themes (growth vs. efficiency, burn, retention).",
      "category": "Portfolio",
      "category_id": null
    },
    {
      "slug": "ai-readiness-assessment",
      "title": "AI Readiness Assessment",
      "description": "Classify the company's AI posture (AI-Native / AI-Enabled / AI-Interested / Non-AI), identify the highest-ROI AI product + ops bets, and lay out a 6-month rollout plan.",
      "category": "R&D",
      "category_id": "dev"
    },
    {
      "slug": "cloud-cost-optimization",
      "title": "Cloud Cost Optimization",
      "description": "Line-by-line review of cloud spend against ARR and workload shape. Identifies the 5-10 biggest waste items and a realistic savings plan.",
      "category": "R&D",
      "category_id": "dev"
    },
    {
      "slug": "data-platform-blueprint",
      "title": "Data Platform Blueprint",
      "description": "Lay out a pragmatic data stack for a B2B SaaS company based on current ARR, team size, and analytics needs. Avoids over-tooling at seed and under-tooling at Series B.",
      "category": "R&D",
      "category_id": "dev"
    },
    {
      "slug": "engineering-velocity-audit",
      "title": "Engineering Velocity Audit",
      "description": "Diagnose why shipping is slowing — bottlenecks in planning, review, deploy, or incident cycles — and produce a 30/60/90 plan to regain throughput.",
      "category": "R&D",
      "category_id": "dev"
    },
    {
      "slug": "hiring-scorecard-engineering",
      "title": "Hiring Scorecard: Engineering",
      "description": "Structured scorecard template for engineering hires — same questions, same rubric, every candidate.",
      "category": "R&D",
      "category_id": "dev"
    },
    {
      "slug": "product-launch-framework",
      "title": "Product Launch Framework",
      "description": "Pre / during / post launch checklist so launches actually land.",
      "category": "R&D",
      "category_id": "dev"
    },
    {
      "slug": "qa-automation-rollout",
      "title": "QA Automation Rollout",
      "description": "Move from \"test it in staging\" to a real QA program. Phase-by-phase plan covering unit, integration, E2E, load, and pre-production gates.",
      "category": "R&D",
      "category_id": "dev"
    },
    {
      "slug": "security-posture-review",
      "title": "Security Posture Review",
      "description": "Baseline the company's security maturity across identity, data, code, and compliance. Output: gap assessment against SOC 2 / ISO, prioritized remediations, certification readiness.",
      "category": "R&D",
      "category_id": "dev"
    },
    {
      "slug": "tech-due-diligence",
      "title": "Tech Due Diligence",
      "description": "A 1-2 week code, infra, and engineering-org review for an investment target or pre-acquisition. Produces a red/yellow/green rollup covering architecture, security, scalability, debt, and team.",
      "category": "R&D",
      "category_id": "dev"
    }
  ],
  "signal_catalog": [
    {
      "id": "met_rule_of_40_flag",
      "label": "Meets Rule of 40",
      "category": "board_reporting",
      "kind": "boolean",
      "unit": null,
      "description": null
    },
    {
      "id": "breakeven_achieved_flag",
      "label": "EBITDA-breakeven reached",
      "category": "board_reporting",
      "kind": "boolean",
      "unit": null,
      "description": null
    },
    {
      "id": "forecast_optimism_index",
      "label": "Forecast optimism",
      "category": "board_reporting",
      "kind": "quantitative",
      "unit": "pct",
      "description": "Planned growth / prior-period actuals; > 1.0 = optimistic forecasting history."
    },
    {
      "id": "other_updates",
      "label": "Other updates (period)",
      "category": "board_reporting",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "quarter_challenges",
      "label": "Challenges (period)",
      "category": "board_reporting",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "csm_book_of_business_usd",
      "label": "CSM book of business",
      "category": "customer_success",
      "kind": "quantitative",
      "unit": "usd",
      "description": "ARR per CSM. ~$1.2M SMB / $1.6M MM / $2.5M enterprise."
    },
    {
      "id": "customer_segment_mix_pct",
      "label": "ARR by customer segment",
      "category": "customer_success",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "geographic_arr_mix_pct",
      "label": "ARR by geography",
      "category": "customer_success",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "cac_payback_months",
      "label": "CAC payback",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "months",
      "description": null
    },
    {
      "id": "fully_loaded_cac_payback_months",
      "label": "Fully-loaded CAC payback",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "months",
      "description": "S&M / (new logo + expansion ARR) × gross margin × 12."
    },
    {
      "id": "new_only_cac_payback_months",
      "label": "New-only CAC payback",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "months",
      "description": null
    },
    {
      "id": "new_cac_ratio",
      "label": "New customer CAC ratio",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "ratio",
      "description": "S&M / new logo ARR. Median ~2.0x."
    },
    {
      "id": "blended_cac_ratio",
      "label": "Blended CAC ratio",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "ratio",
      "description": "S&M / (new logo + expansion ARR). Median ~1.4x."
    },
    {
      "id": "expansion_cac_ratio",
      "label": "Expansion CAC ratio",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "ratio",
      "description": null
    },
    {
      "id": "burn_multiple",
      "label": "Burn multiple",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "ratio",
      "description": "Net burn / net new ARR. Lower is better."
    },
    {
      "id": "rule_of_40_pct",
      "label": "Rule of 40",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "pct",
      "description": "Growth rate + FCF margin."
    },
    {
      "id": "gross_magic_number",
      "label": "Gross magic number",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "ratio",
      "description": "(New logo + upsell ARR) / S&M. >0.75 is invest-more territory."
    },
    {
      "id": "net_magic_number",
      "label": "Net magic number",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "ratio",
      "description": null
    },
    {
      "id": "gross_margin_pct",
      "label": "Gross margin (blended)",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "gross_margin_subscription_pct",
      "label": "Subscription gross margin",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "pct",
      "description": "Subscription revenue less subscription COGS. SaaS ceiling ~80%."
    },
    {
      "id": "gross_margin_services_pct",
      "label": "Services gross margin",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "ltv_cac_ratio",
      "label": "LTV / CAC",
      "category": "efficiency",
      "kind": "quantitative",
      "unit": "ratio",
      "description": null
    },
    {
      "id": "cash_on_hand_usd",
      "label": "Cash on hand",
      "category": "finance",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "monthly_burn_usd",
      "label": "Monthly net burn",
      "category": "finance",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "runway_months",
      "label": "Runway",
      "category": "finance",
      "kind": "quantitative",
      "unit": "months",
      "description": null
    },
    {
      "id": "ebitda_margin_pct",
      "label": "EBITDA margin",
      "category": "finance",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "fcf_margin_pct",
      "label": "Free cash flow margin",
      "category": "finance",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "sm_pct_revenue",
      "label": "S&M % of revenue",
      "category": "finance",
      "kind": "quantitative",
      "unit": "pct",
      "description": "Fully-loaded sales & marketing as share of revenue. Private median ~37%."
    },
    {
      "id": "rd_pct_revenue",
      "label": "R&D % of revenue",
      "category": "finance",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "ga_pct_revenue",
      "label": "G&A % of revenue",
      "category": "finance",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "revenue_mix_subscription_pct",
      "label": "Subscription revenue share",
      "category": "finance",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "revenue_mix_services_pct",
      "label": "Services revenue share",
      "category": "finance",
      "kind": "quantitative",
      "unit": "pct",
      "description": ">15-20% drags blended gross margin."
    },
    {
      "id": "arr_to_capital_raised_ratio",
      "label": "ARR : capital raised",
      "category": "finance",
      "kind": "quantitative",
      "unit": "ratio",
      "description": "End-of-period ARR / lifetime capital raised. ≥1.0 means ARR exceeds invested capital."
    },
    {
      "id": "capital_raised_total_usd",
      "label": "Total capital raised",
      "category": "finance",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "actively_fundraising",
      "label": "Actively fundraising",
      "category": "fundraising",
      "kind": "boolean",
      "unit": null,
      "description": null
    },
    {
      "id": "current_round_stage",
      "label": "Round stage",
      "category": "fundraising",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "current_round_type",
      "label": "Round type",
      "category": "fundraising",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "current_round_target_amount_usd",
      "label": "Target round size",
      "category": "fundraising",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "current_round_committed_amount_usd",
      "label": "Committed so far",
      "category": "fundraising",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "current_round_target_pre_money_usd",
      "label": "Target pre-money",
      "category": "fundraising",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "current_round_target_post_money_usd",
      "label": "Target post-money",
      "category": "fundraising",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "current_round_valuation_cap_usd",
      "label": "Valuation cap",
      "category": "fundraising",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "current_round_discount_pct",
      "label": "Discount",
      "category": "fundraising",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "current_round_lead_investor",
      "label": "Lead investor",
      "category": "fundraising",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "current_round_target_investors",
      "label": "Target investors",
      "category": "fundraising",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "current_round_target_close_date",
      "label": "Target close date",
      "category": "fundraising",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "fundraise_timing",
      "label": "Fundraise timing",
      "category": "fundraising",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "investor_intros_needed",
      "label": "Investor intros wanted",
      "category": "fundraising",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "last_round_pre_money_valuation_usd",
      "label": "Pre-money at last round",
      "category": "fundraising",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "last_round_ev_arr_multiple",
      "label": "EV / ARR multiple at last round",
      "category": "fundraising",
      "kind": "quantitative",
      "unit": "ratio",
      "description": "Pre-money / ARR. 2024-25 median ~11-13x for SaaS."
    },
    {
      "id": "months_since_last_round",
      "label": "Months since last round",
      "category": "fundraising",
      "kind": "quantitative",
      "unit": "months",
      "description": null
    },
    {
      "id": "open_to_investor_intros",
      "label": "Open to investor intros",
      "category": "fundraising",
      "kind": "boolean",
      "unit": null,
      "description": null
    },
    {
      "id": "arr_usd",
      "label": "ARR",
      "category": "growth",
      "kind": "quantitative",
      "unit": "usd",
      "description": "Annualized recurring revenue in USD."
    },
    {
      "id": "arr_growth_yoy_pct",
      "label": "ARR growth (YoY)",
      "category": "growth",
      "kind": "quantitative",
      "unit": "pct",
      "description": "Year-over-year ARR growth."
    },
    {
      "id": "arr_growth_qoq_pct",
      "label": "ARR growth (QoQ)",
      "category": "growth",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "arr_growth_planned_pct",
      "label": "Planned ARR growth",
      "category": "growth",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "growth_endurance_pct",
      "label": "Growth endurance",
      "category": "growth",
      "kind": "quantitative",
      "unit": "pct",
      "description": "Current-year growth rate / prior-year growth rate. Benchmark ~65% in 2025."
    },
    {
      "id": "mrr_usd",
      "label": "MRR",
      "category": "growth",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "new_arr_usd",
      "label": "New ARR (total)",
      "category": "growth",
      "kind": "quantitative",
      "unit": "usd",
      "description": "New logo + expansion ARR booked in period."
    },
    {
      "id": "new_logo_arr_usd",
      "label": "New logo ARR",
      "category": "growth",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "expansion_arr_usd",
      "label": "Expansion ARR",
      "category": "growth",
      "kind": "quantitative",
      "unit": "usd",
      "description": "Upsell + cross-sell + seat/usage expansion from existing customers."
    },
    {
      "id": "expansion_arr_share_pct",
      "label": "Expansion ARR share",
      "category": "growth",
      "kind": "quantitative",
      "unit": "pct",
      "description": "Expansion ARR / (new logo + expansion). Typical 40% median, >50% for >$50M ARR companies."
    },
    {
      "id": "new_logos_count",
      "label": "New logos",
      "category": "growth",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "paid_customer_count",
      "label": "Paid customers",
      "category": "growth",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "churned_logos_count",
      "label": "Churned logos",
      "category": "growth",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "go_to_market_motion",
      "label": "Primary GTM motion",
      "category": "gtm",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "pricing_model",
      "label": "Pricing model",
      "category": "gtm",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "primary_contract_length_months",
      "label": "Primary contract length",
      "category": "gtm",
      "kind": "quantitative",
      "unit": "months",
      "description": "Modal contract length offered. 67% of private SaaS are 1-year."
    },
    {
      "id": "acv_usd",
      "label": "ACV",
      "category": "gtm",
      "kind": "quantitative",
      "unit": "usd",
      "description": "Annual contract value — ARR / number of customers."
    },
    {
      "id": "average_deal_size_usd",
      "label": "Average deal size",
      "category": "gtm",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "sales_cycle_days",
      "label": "Sales cycle length",
      "category": "gtm",
      "kind": "quantitative",
      "unit": "days",
      "description": null
    },
    {
      "id": "pipeline_coverage_ratio",
      "label": "Pipeline coverage",
      "category": "gtm",
      "kind": "quantitative",
      "unit": "ratio",
      "description": null
    },
    {
      "id": "win_rate_pct",
      "label": "Win rate",
      "category": "gtm",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "ae_quota_usd",
      "label": "AE quota (fully-ramped)",
      "category": "gtm",
      "kind": "quantitative",
      "unit": "usd",
      "description": "Median fully-ramped AE quota. ~$800K benchmark."
    },
    {
      "id": "ae_productivity_usd",
      "label": "AE productivity (new ARR / AE)",
      "category": "gtm",
      "kind": "quantitative",
      "unit": "usd",
      "description": null
    },
    {
      "id": "quota_attainment_pct",
      "label": "Quota attainment rate",
      "category": "gtm",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "channel_challenges",
      "label": "Channel / GTM challenges",
      "category": "gtm",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "competitive_pressure",
      "label": "Competitive pressure",
      "category": "gtm",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "notable_customers",
      "label": "Notable customers (period)",
      "category": "gtm",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "dau_count",
      "label": "Daily active users",
      "category": "product",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "mau_count",
      "label": "Monthly active users",
      "category": "product",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "dau_mau_ratio",
      "label": "DAU / MAU stickiness",
      "category": "product",
      "kind": "quantitative",
      "unit": "ratio",
      "description": null
    },
    {
      "id": "feature_adoption_pct",
      "label": "Feature adoption",
      "category": "product",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "nps_score",
      "label": "NPS",
      "category": "product",
      "kind": "quantitative",
      "unit": "score",
      "description": null
    },
    {
      "id": "product_portfolio_breadth_count",
      "label": "Product portfolio breadth",
      "category": "product",
      "kind": "quantitative",
      "unit": "count",
      "description": "Number of distinct products / SKUs available for cross-sell. Driver of NRR."
    },
    {
      "id": "ai_selection_category",
      "label": "AI classification",
      "category": "product",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "ai_monetization_status",
      "label": "AI monetization status",
      "category": "product",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "ai_spend_change_pct",
      "label": "AI spend change (YoY)",
      "category": "product",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "nrr_pct",
      "label": "Net revenue retention",
      "category": "retention",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "grr_pct",
      "label": "Gross revenue retention",
      "category": "retention",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "logo_retention_pct",
      "label": "Logo retention",
      "category": "retention",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "churn_rate_pct",
      "label": "Churn rate",
      "category": "retention",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "gross_arr_churn_pct",
      "label": "Gross ARR churn",
      "category": "retention",
      "kind": "quantitative",
      "unit": "pct",
      "description": "Churned ARR / starting ARR; the lost-customer component of GRR."
    },
    {
      "id": "arr_downsell_pct",
      "label": "ARR downsell rate",
      "category": "retention",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "upsell_arr_pct",
      "label": "Upsell / expansion rate",
      "category": "retention",
      "kind": "quantitative",
      "unit": "pct",
      "description": null
    },
    {
      "id": "nrr_calculation_basis",
      "label": "NRR calculation basis",
      "category": "retention",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "key_risks",
      "label": "Key risks",
      "category": "strategic",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "key_opportunities",
      "label": "Key opportunities",
      "category": "strategic",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "competitive_moat",
      "label": "Competitive moat",
      "category": "strategic",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "market_shifts",
      "label": "Market shifts",
      "category": "strategic",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "sector_category",
      "label": "Software sector",
      "category": "strategic",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "financing_source",
      "label": "Financing source",
      "category": "strategic",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "fte_count",
      "label": "FTE headcount",
      "category": "team",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "arr_per_fte_usd",
      "label": "ARR per FTE",
      "category": "team",
      "kind": "quantitative",
      "unit": "usd",
      "description": "Capital-efficient scale indicator. Median ~$182K; rises to $240K+ past $50M ARR."
    },
    {
      "id": "engineering_headcount",
      "label": "Engineering headcount",
      "category": "team",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "sales_headcount",
      "label": "Sales headcount",
      "category": "team",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "ae_headcount",
      "label": "AE headcount",
      "category": "team",
      "kind": "quantitative",
      "unit": "count",
      "description": "Count of quota-carrying account executives."
    },
    {
      "id": "sdr_bdr_headcount",
      "label": "SDR/BDR headcount",
      "category": "team",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "csm_headcount",
      "label": "CSM headcount",
      "category": "team",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "exec_churn_count",
      "label": "Executive departures",
      "category": "team",
      "kind": "quantitative",
      "unit": "count",
      "description": null
    },
    {
      "id": "hiring_needs",
      "label": "Hiring needs",
      "category": "team",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "hiring_challenges",
      "label": "Hiring challenges",
      "category": "team",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "culture_concerns",
      "label": "Culture concerns",
      "category": "team",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "notable_hires",
      "label": "Notable hires (period)",
      "category": "team",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "banking_partner",
      "label": "Banking partner",
      "category": "vendor_stack",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "legal_counsel",
      "label": "Legal counsel",
      "category": "vendor_stack",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "cloud_provider",
      "label": "Cloud provider",
      "category": "vendor_stack",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "cap_table_platform",
      "label": "Cap table platform",
      "category": "vendor_stack",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "do_insurance_provider",
      "label": "D&O insurance provider",
      "category": "vendor_stack",
      "kind": "qualitative",
      "unit": null,
      "description": null
    },
    {
      "id": "crm_platform",
      "label": "CRM platform",
      "category": "vendor_stack",
      "kind": "qualitative",
      "unit": null,
      "description": null
    }
  ],
  "detail_question_catalog": [
    {
      "id": "profile_company",
      "prompt": "Company",
      "label": "Company",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_product_description",
      "prompt": "What they do",
      "label": "Product description",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_industry",
      "prompt": "Industry",
      "label": "Industry",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_founded",
      "prompt": "Founded",
      "label": "Founded",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_city",
      "prompt": "City",
      "label": "City",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_state",
      "prompt": "State / region",
      "label": "State / region",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_country",
      "prompt": "Country",
      "label": "Country",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_website",
      "prompt": "Website",
      "label": "Website",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_linkedin",
      "prompt": "LinkedIn",
      "label": "LinkedIn",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_headcount",
      "prompt": "Headcount (full-time employees)",
      "label": "Headcount",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_funding_rounds",
      "prompt": "Funding rounds",
      "label": "Funding rounds",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_additional_context",
      "prompt": "Additional context",
      "label": "Additional context",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_top_priorities",
      "prompt": "Top 3 priorities this quarter",
      "label": "Top priorities",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_public_data_wrong",
      "prompt": "Anything public data gets wrong about your business?",
      "label": "Public data corrections",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "profile_biggest_risk",
      "prompt": "Biggest risk you're managing right now",
      "label": "Biggest risk",
      "category_id": "profile",
      "kind": "text",
      "multi": false,
      "allow_unknown": false
    },
    {
      "id": "dev_product_stage",
      "prompt": "Where is your product today?",
      "label": "Product stage",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Idea — not yet in development",
        "In active development",
        "Built — not yet launched",
        "Launched — early users or customers",
        "Launched — scaling usage or revenue"
      ]
    },
    {
      "id": "dev_product_type",
      "prompt": "What type of product are you building?",
      "label": "Product type",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": false,
      "options": [
        "SaaS Platform",
        "AI Application",
        "AI Infrastructure",
        "Marketplace",
        "Developer Platform / API",
        "Mobile App",
        "Hardware / IoT",
        "Other"
      ]
    },
    {
      "id": "dev_delivery_constraint",
      "prompt": "What is the primary constraint slowing down your product delivery?",
      "label": "Delivery constraint",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Planning and prioritization",
        "Capacity and hiring",
        "Quality and reliability",
        "Technical debt / Architecture"
      ]
    },
    {
      "id": "dev_primary_customer",
      "prompt": "Who is your primary customer for the product you're building?",
      "label": "Primary customer",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "End user and buyer are the same role",
        "User and buyer are different",
        "Still validating who the real buyer is",
        "Building for multiple segments — no focus yet"
      ]
    },
    {
      "id": "dev_launch_timeline",
      "prompt": "What is your target launch or next major release date?",
      "label": "Launch timeline",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": false,
      "options": [
        "Already live — no fixed date",
        "Within 3 months",
        "3–6 months",
        "6–12 months",
        "No target date yet"
      ]
    },
    {
      "id": "dev_build_model",
      "prompt": "How is the product being built?",
      "label": "Build model",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Founders building internally",
        "In-house engineering team",
        "Contract dev / agency",
        "Offshore or hybrid team",
        "Not building yet — manual or services first"
      ]
    },
    {
      "id": "dev_engineering_size",
      "prompt": "What is your current engineering team size?",
      "label": "Engineering size",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "No engineers (founders only)",
        "1–3 engineers",
        "4–10 engineers",
        "11+ engineers"
      ]
    },
    {
      "id": "dev_ship_cadence",
      "prompt": "How do you ship releases today?",
      "label": "Ship cadence",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Ad hoc — no regular cadence",
        "Regular releases (e.g. weekly / biweekly)",
        "CI/CD with staged rollout",
        "Not shipping yet"
      ]
    },
    {
      "id": "dev_ai_role",
      "prompt": "How is AI being used in your product?",
      "label": "AI role",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "AI is our core product",
        "AI powers major features",
        "AI improves internal operations",
        "Experimenting",
        "No AI today"
      ]
    },
    {
      "id": "dev_compliance",
      "prompt": "Do you need compliance or security certifications for enterprise sales?",
      "label": "Compliance",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Not yet",
        "On roadmap (e.g. SOC 2, ISO)",
        "In progress",
        "Already certified"
      ]
    },
    {
      "id": "dev_prioritization",
      "prompt": "How do you prioritize what to build next?",
      "label": "Prioritization",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Data/Usage Analytics",
        "Customer Interviews",
        "Sales/Founder Intuition",
        "Ad-hoc / No formal process"
      ]
    },
    {
      "id": "dev_eng_bottleneck",
      "prompt": "What is your biggest engineering bottleneck right now?",
      "label": "Engineering bottleneck",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Planning and prioritization",
        "Code review / quality gates",
        "QA and testing",
        "Deployments and incidents",
        "Hiring and capacity",
        "Technical debt / architecture"
      ]
    },
    {
      "id": "dev_feature_debt_split",
      "prompt": "What percentage of engineering time is spent on new features vs. bugs/tech debt?",
      "label": "Feature vs debt split",
      "category_id": "dev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Mostly New Features (80/20)",
        "Balanced (70/30)",
        "Heavy focus on Tech Debt/Bugs (50/50 or less)"
      ]
    },
    {
      "id": "dev_six_month_impact",
      "prompt": "Which of these would create the biggest impact for your company over the next six months?",
      "label": "Six-month impact",
      "category_id": "dev",
      "kind": "choice",
      "multi": true,
      "allow_unknown": true,
      "options": [
        "Ship product faster",
        "Improve product quality",
        "Reduce engineering costs",
        "Hire engineering talent",
        "Implement AI",
        "Improve product strategy",
        "Modernize architecture",
        "Prepare for enterprise customers"
      ],
      "subtitle": "Select all that apply"
    },
    {
      "id": "mkt_sales_motion",
      "prompt": "What is your primary go-to-market motion?",
      "label": "GTM motion",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Sales-led",
        "Product-led",
        "Founder-led",
        "Not yet defined",
        "Other (Please specify)"
      ]
    },
    {
      "id": "mkt_funnel_gap",
      "prompt": "Where is your biggest growth bottleneck today?",
      "label": "Growth bottleneck",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Not enough awareness",
        "Not enough qualified pipeline",
        "Too few opportunities convert",
        "Customers aren't expanding or renewing",
        "Unsure"
      ]
    },
    {
      "id": "mkt_icp_clarity",
      "prompt": "How clear is your ideal customer profile, including who buys and why?",
      "label": "ICP clarity",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Documented and shared - Written ICP the team uses for targeting and qualification",
        "Clear in founder's head - We know who fits, but it's not written or enforced yet",
        "Still a hypothesis - Early signal from customers, but not validated",
        "Not defined yet - Selling broadly or still figuring out who fits"
      ]
    },
    {
      "id": "mkt_revenue_tracking",
      "prompt": "How do you track and close revenue today?",
      "label": "Revenue tracking",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "CRM with a defined sales process",
        "CRM but informal process",
        "Spreadsheet or lightweight tracking",
        "No systematic pipeline yet"
      ]
    },
    {
      "id": "mkt_pricing_model",
      "prompt": "What is your primary pricing model?",
      "label": "Pricing model",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": false,
      "options": [
        "Flat subscription",
        "Usage-based",
        "Tiered / per seat",
        "Hybrid (Recurring + One-time)",
        "One-time purchase / license",
        "Still figuring out"
      ]
    },
    {
      "id": "mkt_deal_size",
      "prompt": "What is your typical deal size (ARR or one-time value)?",
      "label": "Deal size",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Under $5K",
        "$5K–$25K",
        "$25K–$100K",
        "Over $100K",
        "Not sure yet"
      ]
    },
    {
      "id": "mkt_demand_source",
      "prompt": "What is your primary demand source today?",
      "label": "Demand source",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": false,
      "options": [
        "Inbound / content",
        "Paid acquisition",
        "Outbound sales",
        "Product-led / self-serve",
        "Partners / channel",
        "Mix of channels",
        "Still figuring out"
      ]
    },
    {
      "id": "mkt_sales_team",
      "prompt": "What is the current size of your sales team?",
      "label": "Sales team",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": false,
      "options": [
        "Founder only",
        "Founder + 1 AE or SDR",
        "Small team (2–5 in sales)",
        "Larger sales org (6+)",
        "No sales hire yet"
      ]
    },
    {
      "id": "mkt_marketing_capacity",
      "prompt": "What is your current marketing capacity?",
      "label": "Marketing capacity",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "No dedicated marketing — founders or sales cover it",
        "1 marketing generalist",
        "Small marketing team (2+)",
        "Agency or fractional support",
        "Not applicable yet"
      ]
    },
    {
      "id": "mkt_cac_payback",
      "prompt": "How do you measure marketing success today?",
      "label": "Marketing success metrics",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "CAC / Payback / LTV",
        "Pipeline created",
        "Qualified leads",
        "Website traffic",
        "We don't have consistent metrics"
      ]
    },
    {
      "id": "mkt_contract_length",
      "prompt": "What is your primary contract length?",
      "label": "Contract length",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Monthly",
        "Annual",
        "Multi-year",
        "Mix",
        "Not applicable yet"
      ]
    },
    {
      "id": "mkt_competitive_pressure",
      "prompt": "How would you describe your current competitive pressure?",
      "label": "Competitive pressure",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": false,
      "options": [
        "Low — category is early or we lead",
        "Moderate — several credible alternatives",
        "High — crowded market, price or feature pressure",
        "Not sure yet"
      ]
    },
    {
      "id": "mkt_gtm_constraint",
      "prompt": "What is the primary constraint slowing down your sales and marketing momentum?",
      "label": "GTM constraint",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Lead generation and pipeline",
        "Sales capacity and hiring",
        "Pricing and positioning",
        "Sales and marketing alignment",
        "Everything is well optimized",
        "Other (please specify)"
      ]
    },
    {
      "id": "mkt_deal_stall",
      "prompt": "Where do your deals most often stall?",
      "label": "Deal stall point",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Before first meeting / demo",
        "After demo — no decision",
        "Late stage — legal, security, procurement",
        "Pricing or budget",
        "Not enough pipeline to tell"
      ]
    },
    {
      "id": "mkt_gtm_priority",
      "prompt": "What is your biggest GTM priority over the next 12 months?",
      "label": "GTM priority",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Generate more pipeline",
        "Improve conversion rates",
        "Increase deal size",
        "Expand into enterprise",
        "Improve customer retention",
        "Build a repeatable GTM engine"
      ]
    },
    {
      "id": "mkt_pipeline_definitions",
      "prompt": "Do you have defined pipeline definitions for MQL, SQL, and SAL?",
      "label": "Pipeline definitions",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Yes, documented and shared — We have written criteria that the team uses.",
        "Informal / Shared understanding — We have a general idea of what these terms mean, but it's not documented or strictly enforced.",
        "Not defined yet — We don't use these definitions or are still figuring out our pipeline stages."
      ]
    },
    {
      "id": "mkt_mql_sql_visibility",
      "prompt": "Do you have conversion visibility from MQL to SQL?",
      "label": "MQL→SQL visibility",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Yes, we track this regularly",
        "Rough estimate only",
        "Not tracking this currently"
      ]
    },
    {
      "id": "mkt_pricing_governance",
      "prompt": "Do you have pricing and discounting governance in place?",
      "label": "Pricing governance",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Yes, structured process/tool in place",
        "Informal / Manual process",
        "No specific process yet"
      ]
    },
    {
      "id": "mkt_cross_functional_slas",
      "prompt": "Are there defined SLAs between Marketing/SDR and AE teams?",
      "label": "Cross-functional SLAs",
      "category_id": "mkt",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Yes, defined and tracked",
        "Informal / Verbal agreements",
        "No, we don't have these agreements"
      ]
    },
    {
      "id": "rev_runway",
      "prompt": "How long is your current runway?",
      "label": "Runway",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Under 6 months",
        "6–12 months",
        "12–18 months",
        "Over 18 months"
      ]
    },
    {
      "id": "rev_finance_management",
      "prompt": "How mature is your finance operation today?",
      "label": "Finance management",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Dedicated finance leader",
        "Outsourced finance/accounting",
        "Founder manages finances",
        "Minimal financial processes"
      ]
    },
    {
      "id": "rev_capital_priority",
      "prompt": "What is your near-term capital and reporting priority?",
      "label": "Capital priority",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Actively fundraising",
        "Open to investor introductions",
        "Focused on extending runway / reaching profitability",
        "Not focused on capital right now"
      ]
    },
    {
      "id": "rev_twelve_month_goal",
      "prompt": "What are you optimizing for in the next 12 months?",
      "label": "12-month goal",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Raise next round",
        "Extend runway / reach profitability",
        "Scale growth with current capital",
        "Explore strategic options (M&A, partnerships)",
        "Not sure yet"
      ]
    },
    {
      "id": "rev_ops_challenge",
      "prompt": "What operational area creates the biggest challenge today?",
      "label": "Ops challenge",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Finance & reporting",
        "Hiring & people",
        "Legal & compliance",
        "Internal operations",
        "Strategic planning",
        "Unsure"
      ]
    },
    {
      "id": "rev_unit_economics",
      "prompt": "How do you track your unit economics?",
      "label": "Unit economics",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Real-time / Automated",
        "Monthly / Spreadsheet-based",
        "Rough manual estimates",
        "Not yet"
      ]
    },
    {
      "id": "rev_forecast",
      "prompt": "Do you update a forward-looking financial forecast regularly?",
      "label": "Forecast",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Yes, monthly rolling forecast",
        "Yes, static annual budget",
        "No, we track historicals only"
      ]
    },
    {
      "id": "rev_due_diligence",
      "prompt": "How prepared are you for investor due diligence today?",
      "label": "Due diligence readiness",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Ready today",
        "Mostly prepared",
        "Some work needed",
        "Significant work needed"
      ]
    },
    {
      "id": "rev_operating_mode",
      "prompt": "What is your current operating mode?",
      "label": "Operating mode",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Growth-first",
        "Balanced growth and efficiency",
        "Efficiency / path to profitability"
      ]
    },
    {
      "id": "rev_hiring_plans",
      "prompt": "What are your hiring plans for the next 6 months?",
      "label": "Hiring plans",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Hiring aggressively",
        "Selective hires only",
        "Hiring freeze / defer",
        "Not sure yet"
      ]
    },
    {
      "id": "rev_board_reporting",
      "prompt": "What is your Board and investor reporting cadence?",
      "label": "Board reporting",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Monthly updates",
        "Quarterly board / investor reporting",
        "Ad hoc only",
        "No investors or board yet"
      ]
    },
    {
      "id": "rev_segment_economics",
      "prompt": "Do you know your revenue or cost by customer segment?",
      "label": "Segment economics",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Yes — tracked by segment",
        "Partially — some segments only",
        "Not yet — single blended view",
        "Not applicable — pre-revenue"
      ]
    },
    {
      "id": "rev_raise_needs",
      "prompt": "What do you need most for your capital raise?",
      "label": "Raise needs",
      "category_id": "rev",
      "kind": "choice",
      "multi": false,
      "allow_unknown": true,
      "options": [
        "Investor narrative and deck",
        "Metrics and data room",
        "Introductions",
        "Financial model and use of funds",
        "Process and timeline discipline",
        "All of the above"
      ]
    }
  ],
  "as_of_date": "09-18-2026",
  "as_of_iso": "2026-09-18"
}

COMPANY PROFILE RULES:
- INPUT.company is the source of truth for identity: name, productDescription, industry, headquarters, stage, businessModel, additionalContext.
- Ground advisor.summary, category insights, and initiatives in INPUT.company. Name the real product and sector.
- Do not invent a different company type (e.g. do not call an investment or operating firm a B2B SaaS platform).
- INPUT.cohortKey is the peer set for metric comparison only — it must not override INPUT.company.industry or productDescription.
- Use INPUT.company.additionalContext and INPUT.founderNarrative as founder-provided operating context, not as license to invent facts.

PLAYBOOK RULES:
- You MUST return suggested_playbooks with 3-6 items.
- Each item needs playbook_slug, reason, and category_id (exactly one of: dev, mkt, rev).
- playbook_slug MUST be copied exactly from INPUT.playbook_catalog[].slug — never invent slugs.
- Prefer 1-2 playbooks per category_id.

INTELLIGENCE RULES:
- Return intelligence only when evidence supports it (0 items is fine when INPUT.benchmark is empty or sparse — fewer high-quality items beat inventing placeholders).
- Every item MUST include signal_id copied exactly from INPUT.signal_catalog[].id — never invent signal ids.
- Each item also needs category_id (dev|mkt|rev), text (why it matters), and optional highlight (key number/fact).
- Set evidence_source from the INPUT that actually supports the item: INPUT.company / profile_* answers → profile; track detail answers → form; INPUT.active_documents → document. Omit evidence_source when the item is a logged INPUT.benchmark metric (server labels it Benchmark).
- At most one intelligence item per signal_id. Prefer catalog signals that match concrete evidence in INPUT.
- Never invent highlights like "Unknown", "N/A", or "I don't know". If a metric is null/missing in INPUT.benchmark, omit that signal entirely.
- For quantitative catalog signals that map to INPUT.benchmark keys, only include the signal when that value is non-null.
- If no catalog signal fits a candidate, omit it.

DETAIL QUESTION RULES:
- INPUT.detail_question_catalog maps every answer key to its prompt, label, options, multi flag, and category_id.
- When interpreting INPUT.answers, look up the question by id in that catalog — do not guess meaning from the id string alone.
- For multi: true answers, values may be delimiter-joined selections; treat each selected option as evidence.
- Prefer options/prompts from the catalog when referencing founder answers in narratives and recommendations.

INITIATIVE RULES:
- You MUST return suggested_initiatives with 2-3 items per category (dev, mkt, rev) — prioritise the highest-leverage 1–3 overall when evidence is thin.
- Each item MUST include: title (specific, actionable, never the word "Initiative" alone), description, benefit, category_id (dev|mkt|rev), cadence (one-time|recurring), milestones, york_help.
- milestones MUST be an array of 2-4 objects with shape { "title": string, "due_date": "MM-DD-YYYY", "checked": false }. Never return "milestones": [].
- Today is INPUT.as_of_date (09-18-2026, ISO 2026-09-18). Every milestone due_date MUST be on or after that date — never invent prior-year or past dates (e.g. do not use 2025 when today is 2026).
- Stagger due_dates forward across milestones (roughly +1 to +3 months apart) so the sequence is actionable from today.
- Milestone titles are concrete execution steps (e.g. "Map ICP disqualify criteria", "Pilot new outbound sequence on 25 accounts"), not the initiative title itself.
- Titles should read like work the operating team can run (e.g. "Tighten ICP qualification", "Cut burn via cloud rightsizing").
- Ground suggestions in INPUT.active_intelligence, INPUT.active_documents, benchmark gaps, and profile completeness. Prefer gap areas and important document-only findings before strengths.
- Tag every related intelligence item: set tagged_intelligence_types to all matching types or signal ids from INPUT.active_intelligence[].type / generated intelligence. Multiple tags are expected when several insights motivate the same initiative.
- If no intelligence is related, set tagged_intelligence_types to [] (or tagged_intelligence_type to null). Untagged generated intelligence will not be saved.
- When an uploaded document contains an important initiative but no matching intelligence type exists, still suggest the initiative, leave tagged_intelligence_types empty, and include source_documents with title (and id from INPUT.active_documents when possible).
- Include benefit as 2–4 short bullets (one per line) stating the value of completing this initiative — why it helps the company. Do not mention AI, prompts, or Fuel internals. Prefer priority "high" for the top leverage items.

HOW YORK IE CAN HELP (required on every initiative; authoritative — ignore any earlier one-bullet-per-milestone instructions):
- Include york_help nested on that initiative (not a separate top-level list): { section_title: "How York IE can help", bullets: [{ title, primary_service, help, track }], cta_label: "Talk to the York IE team" }.
- Suggest 1–2 services maximum. Never more.
- Only reference services from the York IE catalog below. Do not invent, paraphrase, or suggest services not on the list.
- Match services to initiative category_id: R&D (dev) → R&D services only; GTM (mkt) → GTM services only; G&A (rev) → G&A services only.
- primary_service = exact catalog service name (e.g. "Product Strategy"). NEVER use track codes (rd, gtm, ga), category ids (dev, mkt, rev), or labels (R&D, GTM, G&A) as primary_service. This is grounding metadata, not the heading.
- title is the VISIBLE HEADING: a short founder-facing title for how York IE can help with THIS initiative, grounded in the initiative title and milestones. Never rd, gtm, ga, R&D, GTM, or G&A.
- help is the body: take one approved outcome for that primary_service from the catalog and refine it into a personalised response to this initiative and its milestones. Stay faithful to the approved outcome — do not invent a different service, metrics, customers, funding, pricing, equity, or timelines.
- track is metadata only (not shown as the title): rd if category_id is dev, gtm if mkt, ga if rev. Do not put track in title or primary_service.
- Ground the service choice in the initiative title, description, milestones, and category.
- Do not mention AI, prompts, or Fuel internals in title or help text.
- cta_label always "Talk to the York IE team". Do not put the URL in help text.
York IE services + approved outcomes. Copy primary_service from the name in quotes. For help, start from a help: line and refine it to this initiative and its milestones. Never set title or primary_service to rd, gtm, ga, R&D, GTM, or G&A.
- R&D (category_id=dev, track=rd):
  primary_service: "Product Strategy"
    approved outcome: "Clear prioritization frameworks that reduce unnecessary development work"
    approved outcome: "Roadmap planning, architecture guidance, and product-market alignment"
  primary_service: "AI Transformation"
    approved outcome: "End-to-end AI strategy, adoption, and implementation embedded into your product and workflows"
    approved outcome: "AI features built into your product that differentiate it and drive customer retention"
  primary_service: "AI, ML & Data Science"
    approved outcome: "Custom ML models, LLMs, RAG pipelines, NLP, and Generative AI features built for production"
  primary_service: "Full Lifecycle Software Development"
    approved outcome: "MVP builds, feature delivery, modernization, and integrations with full-stack engineering support"
    approved outcome: "Accelerate roadmap execution and deliver MVPs and new features faster to capture revenue sooner"
  primary_service: "QA Engineering & Automation"
    approved outcome: "Automated test suites, release process design, and quality frameworks that reduce bugs and downtime"
  primary_service: "DevOps"
    approved outcome: "CI/CD pipelines, cloud infrastructure, serverless architecture, and infrastructure-as-code"
  primary_service: "UX Design"
    approved outcome: "Research, wireframing, prototyping, and high-fidelity design across web, mobile, and hybrid environments"
  primary_service: "BI & Data Engineering"
    approved outcome: "Data lakes, ETL pipelines, analytics dashboards, and business intelligence infrastructure"
  primary_service: "Technical Assessment"
    approved outcome: "Fast, rigorous evaluations of software architecture, code quality, security posture, and engineering processes"
  primary_service: "Tech Due Diligence"
    approved outcome: "Pre-acquisition technical assessment, architecture review, code quality analysis, and risk reporting"
  primary_service: "Mobile Apps"
    approved outcome: "Native and hybrid iOS and Android applications, React Native, and cross-platform development"
- GTM (category_id=mkt, track=gtm):
  primary_service: "Marketing Strategy"
    approved outcome: "ICP and segmentation grounded in customer and pipeline data"
    approved outcome: "Integrated channel strategy with clear priorities and ownership"
    approved outcome: "Marketing investments aligned to pipeline and revenue goals"
  primary_service: "Sales & RevOps Strategy"
    approved outcome: "GTM motion mapped to your business stage — product-led, sales-led, or hybrid"
  primary_service: "Revenue Operations"
    approved outcome: "Aligned sales, marketing, and customer success teams optimizing revenue generation"
    approved outcome: "Streamlined processes, clear reporting, and optimized technology across the revenue team"
  primary_service: "CRM Architecture & Administration"
    approved outcome: "CRM configured for how your sales motion actually works, with clean data and accurate forecasting"
  primary_service: "Content Strategy & SEO"
    approved outcome: "Organic growth engine built on keyword strategy, pillar content, and a production workflow that runs consistently"
  primary_service: "Paid Media & Demand Generation"
    approved outcome: "Paid channels, landing pages, and attribution infrastructure so pipeline is predictable and CAC is controlled"
  primary_service: "Website Development & Optimization"
    approved outcome: "B2B SaaS websites built for conversion — turning visits into qualified pipeline"
  primary_service: "Email & Marketing Automation"
    approved outcome: "Automated nurture sequences and lifecycle campaigns that convert without manual effort"
  primary_service: "GTM Automation & AI"
    approved outcome: "AI agents deployed across GTM workflows to compound output without adding headcount"
  primary_service: "GTM Systems Assessments"
    approved outcome: "Structured audit of current GTM strategy, tools, and integrations with a prioritized action plan"
- G&A (category_id=rev, track=ga):
  primary_service: "Accounting & Bookkeeping"
    approved outcome: "Reliable month-end closes delivered on schedule with accurate, audit-ready financials"
    approved outcome: "Clean books, documented processes, and reliable controls ready for fundraising and diligence"
  primary_service: "Financial Reporting"
    approved outcome: "Consistent, trusted view of financial performance for leadership and investors every month"
  primary_service: "FP&A and Strategic Finance"
    approved outcome: "Rolling forecast and financial model that turns raw numbers into decisions"
    approved outcome: "Investor-grade financial models, dashboards, and materials for capital raises and board reporting"
  primary_service: "Operational Finance Support"
    approved outcome: "Foundational accounting and financial planning with strategic insights for confident decision-making"
  primary_service: "Fundraising Prep"
    approved outcome: "Investor-ready financial model, data room, and narrative aligned for diligence and capital raises"
  primary_service: "Corporate Strategy"
    approved outcome: "Annual operating plan tied to real books, with OKRs connected to business outcomes"

User Prompt:
Generate the complete overview for this company. Use the record_overview tool.

Parameters:
temperature: 0.2
maxTokens: 16384
topP: default
toolChoice: record_overview
==============================================
 GET /api/credits/snapshot 200 in 3368ms
 GET /api/credits/subscribed-billing 200 in 3382ms
 ○ Compiling /api/company/[uuid]/overview ...
 ✓ Compiled /api/company/[uuid]/overview in 832ms (7608 modules)
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 1881ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 48ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 1358ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 55ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 92ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 84ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 66ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 66ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 65ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 76ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 76ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 56ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 54ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 61ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 58ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 62ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 53ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 56ms
 GET /api/company/cat_ec4eba4c-64c4-488e-b870-fc18205409ed/overview 200 in 63ms
========== Bedrock Overview Response ==========
Timestamp: 2026-09-18T20:02:11.200Z
Request ID: 54e9e992-37d3-4d1c-8c48-0f8d22c7b8f1
Company ID: cat_ec4eba4c-64c4-488e-b870-fc18205409ed
Account ID: acct_3205f702-ef5a-4aaf-8086-105cb5505f94
Model: us.anthropic.claude-haiku-4-5-20251001-v1:0
Bedrock latency: 57.51s
Stop reason: tool_use
Tokens: in=25643 out=6894 total=32537

Raw output:
{
  "stopReason": "tool_use",
  "usage": {
    "inputTokens": 25643,
    "outputTokens": 6894,
    "totalTokens": 32537,
    "cacheReadInputTokens": 0,
    "cacheWriteInputTokens": 0
  },
  "content": [
    {
      "toolUse": {
        "toolUseId": "tooluse_oOdE9Ida5SEl32PaNAFgJ6",
        "name": "record_overview",
        "input": {
          "advisor": {
            "summary": "York IE is an investment and operating firm founded in 2013 that combines capital, services, and partnerships to build and scale technology companies. With 50 employees, $1.5M ARR, and strong unit economics (155% NRR, 122% logo retention), the company is in a growth phase but faces critical operational challenges. The founder is managing finances, sales is founder-led only, and the product (AI Infrastructure) is built but not yet launched. The biggest near-term priorities are: (1) launching the AI Infrastructure product within 3–6 months with quality and reliability as the primary constraint, (2) defining and executing a repeatable GTM motion to move beyond founder-led sales, and (3) building financial and operational rigor to support aggressive hiring and potential fundraising. With over 18 months of runway and $5M cash on hand, York IE has the capital to invest in these areas, but must move quickly to convert product readiness into revenue and establish scalable go-to-market and operating processes."
          },
          "categories": [
            {
              "category_id": "dev",
              "focus_narrative": "York IE is building an AI Infrastructure product currently in the 'built but not yet launched' stage, targeting a 3–6 month launch window. The engineering team (4–10 engineers) is using contract dev/agency model with CI/CD and staged rollout capability. Quality and reliability are the primary delivery constraint, with QA and testing identified as the biggest bottleneck. The team is splitting effort 50/50 between new features and tech debt/bugs, indicating a mature approach to product quality. AI is core to the product, and the six-month impact priorities include shipping faster, improving quality, and implementing AI. The primary challenge is moving from 'built' to 'launched' while maintaining the quality bar needed for enterprise customers. Compliance is in progress (SOC 2, ISO likely on the roadmap). Prioritization is currently founder/sales-driven rather than data-driven, which will need to shift as the product scales."
            },
            {
              "category_id": "mkt",
              "focus_narrative": "York IE has a documented ICP and is tracking revenue through a CRM with a defined sales process, but GTM execution is severely constrained: the sales team is founder-only, deal size is under $5K, and the sales motion is not yet defined. Demand is primarily inbound/content-driven, which is a strength, but the company is not yet converting that into a repeatable, scalable motion. Pricing is flat subscription with monthly contracts, creating flexibility but also pricing governance gaps (informal/manual process). The biggest GTM constraint is sales and marketing alignment, and the primary growth bottleneck is customer expansion and renewal (funnel gap: 'Customers aren't expanding or renewing'). The competitive pressure is moderate. The 12-month GTM priority is to expand into enterprise, which requires a shift from founder-led, inbound-only motion to a more structured, multi-channel approach. Marketing capacity is minimal (no dedicated marketing), and pipeline definitions are informal. This is the highest-leverage area for near-term growth acceleration."
            },
            {
              "category_id": "rev",
              "focus_narrative": "York IE is in a balanced growth and efficiency mode with aggressive hiring plans over the next 6 months. The company has strong financial position (over 18 months runway, $5M cash, $1.5M ARR, 75% gross margin), but financial operations are founder-managed with rough manual estimates for unit economics and a static annual budget (not a rolling forecast). There is no board or investor yet, but the founder is open to investor introductions and needs investor narrative and deck for a potential raise. The biggest operational challenge is internal operations (not finance or hiring specifically, but the broader execution and process maturity). Due diligence readiness is 'ready today,' which is a strength. Segment economics are tracked by segment, which is good. The 12-month goal is to scale growth with current capital, and the biggest near-term need is to professionalize financial reporting, forecasting, and operating cadence to support both aggressive hiring and potential fundraising. The company is not actively fundraising but is open to it, suggesting a 'prove-out' phase where strong metrics and operational discipline will unlock capital."
            }
          ],
          "intelligence": [
            {
              "signal_id": "arr_usd",
              "category_id": "rev",
              "title": "ARR",
              "highlight": "$1.5M ARR",
              "text": "Strong revenue base for a company at the product-launch stage. Provides capital efficiency and validates early market demand, though the founder-led sales motion limits near-term scaling.",
              "evidence_source": "profile"
            },
            {
              "signal_id": "arr_growth_yoy_pct",
              "category_id": "rev",
              "title": "ARR growth (YoY)",
              "highlight": "105% YoY growth",
              "text": "Doubling year-over-year demonstrates strong product-market fit and market demand. This growth rate is well above typical SaaS benchmarks and validates the inbound/content-driven demand motion.",
              "evidence_source": "profile"
            },
            {
              "signal_id": "nrr_pct",
              "category_id": "mkt",
              "title": "Net revenue retention",
              "highlight": "155% NRR",
              "text": "Exceptional expansion and retention signal. Customers are expanding significantly, indicating strong product value and willingness to pay more. This is a major competitive advantage and should be a centerpiece of GTM narrative.",
              "evidence_source": "profile"
            },
            {
              "signal_id": "logo_retention_pct",
              "category_id": "mkt",
              "title": "Logo retention",
              "highlight": "122% logo retention",
              "text": "Strong logo retention above 100% indicates net-negative churn and expansion-driven growth. Combined with 155% NRR, this shows both customer stickiness and expansion momentum.",
              "evidence_source": "profile"
            },
            {
              "signal_id": "gross_margin_pct",
              "category_id": "rev",
              "title": "Gross margin (blended)",
              "highlight": "75% gross margin",
              "text": "Healthy gross margin for a SaaS/AI Infrastructure company. Provides capital efficiency and room to invest in sales, marketing, and R&D without sacrificing unit economics.",
              "evidence_source": "profile"
            },
            {
              "signal_id": "cash_on_hand_usd",
              "category_id": "rev",
              "title": "Cash on hand",
              "highlight": "$5M cash",
              "text": "Strong cash position provides runway for product launch, GTM scaling, and aggressive hiring without immediate fundraising pressure. Enables strategic investment in team and infrastructure.",
              "evidence_source": "profile"
            },
            {
              "signal_id": "monthly_burn_usd",
              "category_id": "rev",
              "title": "Monthly net burn",
              "highlight": "$2K monthly burn",
              "text": "Minimal monthly burn relative to ARR ($1.5M / 12 = $125K MRR) indicates the company is nearly cash-flow positive or already positive. This is exceptional for a company at the product-launch stage and provides significant strategic flexibility.",
              "evidence_source": "profile"
            },
            {
              "signal_id": "fte_count",
              "category_id": "rev",
              "title": "FTE headcount",
              "highlight": "50 FTEs",
              "text": "Lean team relative to ARR ($1.5M / 50 = $30K ARR per FTE, well below typical benchmarks of $180K+). Suggests significant room for revenue growth with current headcount, or that the team is heavily weighted toward services/operations rather than revenue-generating functions.",
              "evidence_source": "profile"
            },
            {
              "signal_id": "paid_customer_count",
              "category_id": "mkt",
              "title": "Paid customers",
              "highlight": "500 paid customers",
              "text": "Large customer base at low deal size (under $5K) indicates a product-led or self-serve motion is working. Average deal size is ~$3K, which is typical for SMB/mid-market SaaS. Expansion opportunity lies in moving upmarket and increasing deal size.",
              "evidence_source": "profile"
            },
            {
              "signal_id": "dev_product_stage",
              "category_id": "dev",
              "title": "Product stage",
              "highlight": "Built — not yet launched",
              "text": "Product is complete and ready for launch within 3–6 months. This is a critical inflection point: the company must execute a clean launch with quality and reliability as the primary constraint, then immediately shift focus to GTM and customer acquisition.",
              "evidence_source": "form"
            },
            {
              "signal_id": "dev_delivery_constraint",
              "category_id": "dev",
              "title": "Delivery constraint",
              "highlight": "Quality and reliability",
              "text": "Quality is the primary constraint, not capacity or planning. This suggests the team is well-organized but is taking time to ensure the product meets enterprise standards. Aligns with the 50/50 feature/debt split and QA bottleneck.",
              "evidence_source": "form"
            },
            {
              "signal_id": "dev_eng_bottleneck",
              "category_id": "dev",
              "title": "Engineering bottleneck",
              "highlight": "QA and testing",
              "text": "QA and testing is the biggest bottleneck, not hiring or architecture. This is a process and tooling problem, not a headcount problem. Investing in QA automation and testing infrastructure will unlock faster shipping.",
              "evidence_source": "form"
            },
            {
              "signal_id": "mkt_sales_motion",
              "category_id": "mkt",
              "title": "GTM motion",
              "highlight": "Not yet defined",
              "text": "Sales motion is undefined despite having 500 customers and $1.5M ARR. This is a major gap: the company is growing inbound but has no repeatable, scalable sales process. Defining and operationalizing the GTM motion is the highest-leverage initiative for the next 12 months.",
              "evidence_source": "form"
            },
            {
              "signal_id": "mkt_gtm_constraint",
              "category_id": "mkt",
              "title": "GTM constraint",
              "highlight": "Sales and marketing alignment",
              "text": "Sales and marketing alignment is the primary constraint, not lead generation or pricing. This suggests the company has inbound demand but lacks the operational rigor to convert it efficiently. Requires defining pipeline stages, SLAs, and shared metrics.",
              "evidence_source": "form"
            },
            {
              "signal_id": "mkt_funnel_gap",
              "category_id": "mkt",
              "title": "Growth bottleneck",
              "highlight": "Customers aren't expanding or renewing",
              "text": "Despite 155% NRR and 122% logo retention, the founder identifies expansion/renewal as the biggest growth bottleneck. This suggests the company is losing customers at the low end while expanding at the high end, or that expansion is not systematic. Requires a customer success and expansion strategy.",
              "evidence_source": "form"
            },
            {
              "signal_id": "rev_finance_management",
              "category_id": "rev",
              "title": "Finance management",
              "highlight": "Founder manages finances",
              "text": "Founder is managing all finance operations. While this is typical at early stage, it creates a bottleneck for scaling and fundraising. Needs to transition to outsourced accounting and a dedicated finance lead or FP&A resource.",
              "evidence_source": "form"
            }
          ],
          "suggested_initiatives": [
            {
              "title": "Launch AI Infrastructure product with quality gates and staged rollout",
              "description": "Execute a disciplined product launch within the 3–6 month window with a focus on quality and reliability. Establish pre-launch quality gates (automated testing, security review, performance benchmarks), define staged rollout phases (beta → early access → general availability), and create a launch communication plan tied to GTM priorities. This is the critical inflection point: a successful launch unlocks GTM motion and customer acquisition.",
              "benefit": "Ship a production-ready product that meets enterprise standards\nReduce post-launch bugs and support burden\nCreate momentum for GTM and sales motion\nDe-risk the transition from 'built' to 'revenue-generating'",
              "category_id": "dev",
              "cadence": "one-time",
              "milestones": [
                {
                  "title": "Define launch quality gates and acceptance criteria",
                  "due_date": "10-16-2026",
                  "checked": false
                },
                {
                  "title": "Implement QA automation for core product flows (unit, integration, E2E)",
                  "due_date": "11-30-2026",
                  "checked": false
                },
                {
                  "title": "Execute beta launch with 20–50 early access customers",
                  "due_date": "01-15-2027",
                  "checked": false
                },
                {
                  "title": "General availability launch with full GTM support",
                  "due_date": "03-15-2027",
                  "checked": false
                }
              ],
              "york_help": {
                "section_title": "How York IE can help",
                "bullets": [
                  {
                    "title": "QA automation and launch readiness",
                    "primary_service": "QA Engineering & Automation",
                    "help": "We'll design and implement automated test suites covering unit, integration, and end-to-end flows, plus establish a release process and quality gates that reduce bugs and downtime. This will unblock your QA bottleneck and enable faster, more confident shipping into your staged rollout phases.",
                    "track": "rd"
                  },
                  {
                    "title": "Product launch strategy and roadmap alignment",
                    "primary_service": "Product Strategy",
                    "help": "We'll help you prioritize launch features, define the staged rollout phases, and align the product roadmap with your GTM motion so the launch creates immediate sales momentum. This ensures your launch isn't just a technical event but a business inflection point.",
                    "track": "rd"
                  }
                ],
                "cta_label": "Talk to the York IE team"
              },
              "tagged_intelligence_types": [
                "dev_product_stage",
                "dev_delivery_constraint",
                "dev_eng_bottleneck"
              ],
              "priority": "high"
            },
            {
              "title": "Define and operationalize repeatable GTM motion (sales-led + inbound hybrid)",
              "description": "Move from founder-led, ad-hoc sales to a repeatable, scalable GTM engine. Define the sales motion (sales-led for enterprise, product-led for SMB), establish pipeline stages and SLAs between marketing and sales, create a sales playbook with qualification criteria and discovery process, and hire or contract the first dedicated AE. This is the highest-leverage initiative for revenue acceleration and enterprise expansion.",
              "benefit": "Shift from founder-dependent to scalable sales motion\nIncrease deal size and enterprise pipeline\nAlign marketing and sales on pipeline definitions and SLAs\nCreate a repeatable process that new AEs can follow",
              "category_id": "mkt",
              "cadence": "one-time",
              "milestones": [
                {
                  "title": "Document ICP, buyer personas, and disqualify criteria for SMB vs. enterprise",
                  "due_date": "10-23-2026",
                  "checked": false
                },
                {
                  "title": "Define sales motion, pipeline stages, and marketing/sales SLAs",
                  "due_date": "11-15-2026",
                  "checked": false
                },
                {
                  "title": "Build sales playbook (discovery, qualification, objection handling, close)",
                  "due_date": "12-15-2026",
                  "checked": false
                },
                {
                  "title": "Hire first dedicated AE and onboard to playbook",
                  "due_date": "02-15-2027",
                  "checked": false
                }
              ],
              "york_help": {
                "section_title": "How York IE can help",
                "bullets": [
                  {
                    "title": "GTM motion design and sales strategy",
                    "primary_service": "Sales & RevOps Strategy",
                    "help": "We'll map your GTM motion to your business stage — hybrid sales-led for enterprise and product-led for SMB — and design the sales playbook, qualification criteria, and discovery process. This gives your first AE a repeatable framework and removes founder dependency.",
                    "track": "gtm"
                  },
                  {
                    "title": "Revenue operations and pipeline alignment",
                    "primary_service": "Revenue Operations",
                    "help": "We'll establish aligned sales, marketing, and customer success processes with clear pipeline definitions, SLAs, and reporting. This ensures marketing and sales are working toward the same goals and you have visibility into what's working.",
                    "track": "gtm"
                  }
                ],
                "cta_label": "Talk to the York IE team"
              },
              "tagged_intelligence_types": [
                "mkt_sales_motion",
                "mkt_gtm_constraint",
                "mkt_funnel_gap"
              ],
              "priority": "high"
            },
            {
              "title": "Build customer success and expansion playbook to drive NRR growth",
              "description": "Systematize customer expansion and retention to capitalize on the 155% NRR and 122% logo retention. Design a customer success function with segmentation (SMB self-serve, mid-market CSM-led, enterprise executive sponsor), define expansion triggers and upsell motions, create health scoring and at-risk intervention playbooks, and establish expansion ownership and metrics. This converts the strong retention signal into predictable, scalable expansion revenue.",
              "benefit": "Systematize expansion revenue and reduce ad-hoc upsells\nReduce churn and improve customer lifetime value\nCreate a repeatable playbook for new CSMs to follow\nIncrease predictability of NRR and expansion ARR",
              "category_id": "mkt",
              "cadence": "recurring",
              "milestones": [
                {
                  "title": "Segment customer base by size and expansion potential; define CSM book of business",
                  "due_date": "10-30-2026",
                  "checked": false
                },
                {
                  "title": "Design health scoring model and at-risk intervention playbook",
                  "due_date": "11-30-2026",
                  "checked": false
                },
                {
                  "title": "Define expansion triggers, upsell motions, and expansion ownership model",
                  "due_date": "12-30-2026",
                  "checked": false
                },
                {
                  "title": "Hire or contract first dedicated CSM and onboard to playbook",
                  "due_date": "02-15-2027",
                  "checked": false
                }
              ],
              "york_help": {
                "section_title": "How York IE can help",
                "bullets": [
                  {
                    "title": "Customer success strategy and expansion playbook",
                    "primary_service": "Revenue Operations",
                    "help": "We'll design your customer success function with segmentation, health scoring, and expansion ownership tied to your NRR and GRR targets. This turns your 155% NRR into a systematic, scalable expansion engine.",
                    "track": "gtm"
                  }
                ],
                "cta_label": "Talk to the York IE team"
              },
              "tagged_intelligence_types": [
                "nrr_pct",
                "logo_retention_pct",
                "mkt_funnel_gap"
              ],
              "priority": "high"
            },
            {
              "title": "Establish financial forecasting and operating cadence for scaling and fundraising",
              "description": "Transition from founder-managed, static budgets to a professional financial operating rhythm. Implement a rolling 12-month forecast updated monthly, establish a monthly close and reporting cadence, define unit economics dashboards (CAC, LTV, payback, burn multiple), and create a board/investor reporting template. This provides the financial rigor needed to support aggressive hiring, make confident capital allocation decisions, and prepare for fundraising.",
              "benefit": "Move from static budget to dynamic, rolling forecast\nGain visibility into unit economics and capital efficiency\nPrepare investor-ready financial materials and data room\nEnable confident hiring and capital allocation decisions",
              "category_id": "rev",
              "cadence": "recurring",
              "milestones": [
                {
                  "title": "Build 12-month rolling forecast model with revenue, expense, and cash flow drivers",
                  "due_date": "10-31-2026",
                  "checked": false
                },
                {
                  "title": "Establish monthly close process and financial reporting dashboard",
                  "due_date": "11-30-2026",
                  "checked": false
                },
                {
                  "title": "Define unit economics KPIs (CAC, LTV, payback, burn multiple, Rule of 40)",
                  "due_date": "12-15-2026",
                  "checked": false
                },
                {
                  "title": "Create board/investor reporting template and run first monthly update",
                  "due_date": "01-31-2027",
                  "checked": false
                }
              ],
              "york_help": {
                "section_title": "How York IE can help",
                "bullets": [
                  {
                    "title": "FP&A and financial forecasting for scaling",
                    "primary_service": "FP&A and Strategic Finance",
                    "help": "We'll build a rolling 12-month forecast and financial model that turns raw numbers into decisions. This gives you investor-grade materials for capital raises and board reporting, plus the visibility to make confident hiring and capital allocation calls.",
                    "track": "ga"
                  },
                  {
                    "title": "Monthly financial close and reporting",
                    "primary_service": "Financial Reporting",
                    "help": "We'll establish a reliable month-end close and reporting cadence so you have a consistent, trusted view of financial performance every month. This is foundational for both internal decision-making and external fundraising.",
                    "track": "ga"
                  }
                ],
                "cta_label": "Talk to the York IE team"
              },
              "tagged_intelligence_types": [
                "rev_finance_management",
                "cash_on_hand_usd",
                "monthly_burn_usd"
              ],
              "priority": "high"
            },
            {
              "title": "Pressure-test hiring plan against runway and revenue capacity",
              "description": "The company is planning aggressive hiring over the next 6 months, but needs to validate that the hiring plan is aligned with revenue growth, cash runway, and capital efficiency targets. Conduct a bottoms-up hiring plan review by function (engineering, sales, CS, ops), model the impact on burn and runway, and identify roles that should be deferred, consolidated, or accelerated based on revenue capacity and strategic priorities.",
              "benefit": "Ensure hiring plan is aligned with revenue growth and runway\nIdentify roles that should be deferred or consolidated\nMaintain capital efficiency and extend runway\nMake confident hiring decisions with full financial visibility",
              "category_id": "rev",
              "cadence": "one-time",
              "milestones": [
                {
                  "title": "Map current hiring plan by function and timeline",
                  "due_date": "10-15-2026",
                  "checked": false
                },
                {
                  "title": "Model hiring impact on burn, runway, and ARR per FTE",
                  "due_date": "11-15-2026",
                  "checked": false
                },
                {
                  "title": "Identify roles to defer, consolidate, or accelerate based on revenue capacity",
                  "due_date": "12-01-2026",
                  "checked": false
                }
              ],
              "york_help": {
                "section_title": "How York IE can help",
                "bullets": [
                  {
                    "title": "Hiring plan validation and capital efficiency",
                    "primary_service": "FP&A and Strategic Finance",
                    "help": "We'll pressure-test your hiring plan against revenue capacity, cash runway, and capital efficiency targets. This identifies roles that should be deferred, consolidated, or accelerated so you can hire with confidence and maintain your strong unit economics.",
                    "track": "ga"
                  }
                ],
                "cta_label": "Talk to the York IE team"
              },
              "tagged_intelligence_types": [
                "fte_count",
                "cash_on_hand_usd",
                "arr_per_fte_usd"
              ],
              "priority": "medium"
            }
          ],
          "suggested_playbooks": [
            {
              "playbook_slug": "product-launch-framework",
              "category_id": "dev",
              "reason": "York IE's AI Infrastructure product is built but not yet launched (3–6 month target). This playbook provides a pre/during/post launch checklist to ensure the launch lands with quality and creates GTM momentum."
            },
            {
              "playbook_slug": "qa-automation-rollout",
              "category_id": "dev",
              "reason": "QA and testing is the identified engineering bottleneck. This playbook provides a phase-by-phase plan to move from manual testing to automated QA (unit, integration, E2E, load), which will unblock faster shipping and improve product quality."
            },
            {
              "playbook_slug": "sales-revops-assessment",
              "category_id": "mkt",
              "reason": "Sales motion is undefined, sales team is founder-only, and GTM constraint is sales/marketing alignment. This playbook diagnoses where revenue execution is leaking and proposes 3 initiatives to build a repeatable GTM engine."
            },
            {
              "playbook_slug": "customer-success-playbook",
              "category_id": "mkt",
              "reason": "Despite 155% NRR and 122% logo retention, the founder identifies expansion/renewal as the biggest growth bottleneck. This playbook designs the CS function with segmentation, health scoring, and expansion ownership tied to NRR targets."
            },
            {
              "playbook_slug": "fpa-monthly-cadence",
              "category_id": "rev",
              "reason": "Founder is managing finances with rough manual estimates and static annual budget. This playbook establishes a monthly close → reporting → forecast → action loop built for $5M–$50M ARR companies, providing the financial rigor needed for scaling and fundraising."
            },
            {
              "playbook_slug": "hiring-plan-allocation",
              "category_id": "rev",
              "reason": "Company is planning aggressive hiring over 6 months but needs to validate alignment with revenue capacity and runway. This playbook pressure-tests the hiring plan and identifies roles to defer, consolidate, or accelerate."
            }
          ],
          "journey_stage": {
            "label": "Product Launch & GTM Definition",
            "description": "York IE is at a critical inflection point: the AI Infrastructure product is built and ready to launch within 3–6 months, but the company lacks a repeatable GTM motion and scalable sales process. The next 6 months will determine whether the company can convert product readiness into revenue growth and establish the operational rigor needed to scale. Key priorities: (1) execute a disciplined product launch with quality gates, (2) define and operationalize a repeatable GTM motion, (3) systematize customer success and expansion, and (4) establish financial forecasting and operating cadence for scaling and fundraising."
          }
        },
        "type": "tool_use"
      }
    }
  ]
}

Parsed result:
{
  "advisor": {
    "summary": "York IE is an investment and operating firm founded in 2013 that combines capital, services, and partnerships to build and scale technology companies. With 50 employees, $1.5M ARR, and strong unit economics (155% NRR, 122% logo retention), the company is in a growth phase but faces critical operational challenges. The founder is managing finances, sales is founder-led only, and the product (AI Infrastructure) is built but not yet launched. The biggest near-term priorities are: (1) launching the AI Infrastructure product within 3–6 months with quality and reliability as the primary constraint, (2) defining and executing a repeatable GTM motion to move beyond founder-led sales, and (3) building financial and operational rigor to support aggressive hiring and potential fundraising. With over 18 months of runway and $5M cash on hand, York IE has the capital to invest in these areas, but must move quickly to convert product readiness into revenue and establish scalable go-to-market and operating processes.",
    "signal_tags": [],
    "recommended_actions": []
  },
  "categories": [
    {
      "id": "dev",
      "label": "R&D",
      "full_label": "Research and Development",
      "focus_narrative": "York IE is building an AI Infrastructure product currently in the 'built but not yet launched' stage, targeting a 3–6 month launch window. The engineering team (4–10 engineers) is using contract dev/agency model with CI/CD and staged rollout capability. Quality and reliability are the primary delivery constraint, with QA and testing identified as the biggest bottleneck. The team is splitting effort 50/50 between new features and tech debt/bugs, indicating a mature approach to product quality. AI is core to the product, and the six-month impact priorities include shipping faster, improving quality, and implementing AI. The primary challenge is moving from 'built' to 'launched' while maintaining the quality bar needed for enterprise customers. Compliance is in progress (SOC 2, ISO likely on the roadmap). Prioritization is currently founder/sales-driven rather than data-driven, which will need to shift as the product scales.",
      "insight": "",
      "strengths": [],
      "weaknesses": [],
      "benchmark_chips": [],
      "stats": []
    },
    {
      "id": "mkt",
      "label": "GTM",
      "full_label": "Go to Market",
      "focus_narrative": "York IE has a documented ICP and is tracking revenue through a CRM with a defined sales process, but GTM execution is severely constrained: the sales team is founder-only, deal size is under $5K, and the sales motion is not yet defined. Demand is primarily inbound/content-driven, which is a strength, but the company is not yet converting that into a repeatable, scalable motion. Pricing is flat subscription with monthly contracts, creating flexibility but also pricing governance gaps (informal/manual process). The biggest GTM constraint is sales and marketing alignment, and the primary growth bottleneck is customer expansion and renewal (funnel gap: 'Customers aren't expanding or renewing'). The competitive pressure is moderate. The 12-month GTM priority is to expand into enterprise, which requires a shift from founder-led, inbound-only motion to a more structured, multi-channel approach. Marketing capacity is minimal (no dedicated marketing), and pipeline definitions are informal. This is the highest-leverage area for near-term growth acceleration.",
      "insight": "",
      "strengths": [],
      "weaknesses": [],
      "benchmark_chips": [],
      "stats": []
    },
    {
      "id": "rev",
      "label": "G&A",
      "full_label": "General and Administrative",
      "focus_narrative": "York IE is in a balanced growth and efficiency mode with aggressive hiring plans over the next 6 months. The company has strong financial position (over 18 months runway, $5M cash, $1.5M ARR, 75% gross margin), but financial operations are founder-managed with rough manual estimates for unit economics and a static annual budget (not a rolling forecast). There is no board or investor yet, but the founder is open to investor introductions and needs investor narrative and deck for a potential raise. The biggest operational challenge is internal operations (not finance or hiring specifically, but the broader execution and process maturity). Due diligence readiness is 'ready today,' which is a strength. Segment economics are tracked by segment, which is good. The 12-month goal is to scale growth with current capital, and the biggest near-term need is to professionalize financial reporting, forecasting, and operating cadence to support both aggressive hiring and potential fundraising. The company is not actively fundraising but is open to it, suggesting a 'prove-out' phase where strong metrics and operational discipline will unlock capital.",
      "insight": "",
      "strengths": [],
      "weaknesses": [],
      "benchmark_chips": [],
      "stats": []
    }
  ],
  "intelligence": [
    {
      "signal_id": "arr_usd",
      "type": "growth",
      "title": "ARR",
      "text": "Strong revenue base for a company at the product-launch stage. Provides capital efficiency and validates early market demand, though the founder-led sales motion limits near-term scaling.",
      "highlight": "$1.5M ARR",
      "category_id": "rev",
      "source": "overview_generation",
      "signal_category": "growth",
      "evidence_source": "profile"
    },
    {
      "signal_id": "arr_growth_yoy_pct",
      "type": "growth",
      "title": "ARR growth (YoY)",
      "text": "Doubling year-over-year demonstrates strong product-market fit and market demand. This growth rate is well above typical SaaS benchmarks and validates the inbound/content-driven demand motion.",
      "highlight": "105% YoY growth",
      "category_id": "rev",
      "source": "overview_generation",
      "signal_category": "growth",
      "evidence_source": "profile"
    },
    {
      "signal_id": "nrr_pct",
      "type": "retention",
      "title": "Net revenue retention",
      "text": "Exceptional expansion and retention signal. Customers are expanding significantly, indicating strong product value and willingness to pay more. This is a major competitive advantage and should be a centerpiece of GTM narrative.",
      "highlight": "155% NRR",
      "category_id": "mkt",
      "source": "overview_generation",
      "signal_category": "retention",
      "evidence_source": "profile"
    },
    {
      "signal_id": "logo_retention_pct",
      "type": "retention",
      "title": "Logo retention",
      "text": "Strong logo retention above 100% indicates net-negative churn and expansion-driven growth. Combined with 155% NRR, this shows both customer stickiness and expansion momentum.",
      "highlight": "122% logo retention",
      "category_id": "mkt",
      "source": "overview_generation",
      "signal_category": "retention",
      "evidence_source": "profile"
    },
    {
      "signal_id": "gross_margin_pct",
      "type": "efficiency",
      "title": "Gross margin (blended)",
      "text": "Healthy gross margin for a SaaS/AI Infrastructure company. Provides capital efficiency and room to invest in sales, marketing, and R&D without sacrificing unit economics.",
      "highlight": "75% gross margin",
      "category_id": "rev",
      "source": "overview_generation",
      "signal_category": "efficiency",
      "evidence_source": "profile"
    },
    {
      "signal_id": "cash_on_hand_usd",
      "type": "finance",
      "title": "Cash on hand",
      "text": "Strong cash position provides runway for product launch, GTM scaling, and aggressive hiring without immediate fundraising pressure. Enables strategic investment in team and infrastructure.",
      "highlight": "$5M cash",
      "category_id": "rev",
      "source": "overview_generation",
      "signal_category": "finance",
      "evidence_source": "profile"
    },
    {
      "signal_id": "monthly_burn_usd",
      "type": "finance",
      "title": "Monthly net burn",
      "text": "Minimal monthly burn relative to ARR ($1.5M / 12 = $125K MRR) indicates the company is nearly cash-flow positive or already positive. This is exceptional for a company at the product-launch stage and provides significant strategic flexibility.",
      "highlight": "$2K monthly burn",
      "category_id": "rev",
      "source": "overview_generation",
      "signal_category": "finance",
      "evidence_source": "profile"
    },
    {
      "signal_id": "fte_count",
      "type": "team",
      "title": "FTE headcount",
      "text": "Lean team relative to ARR ($1.5M / 50 = $30K ARR per FTE, well below typical benchmarks of $180K+). Suggests significant room for revenue growth with current headcount, or that the team is heavily weighted toward services/operations rather than revenue-generating functions.",
      "highlight": "50 FTEs",
      "category_id": "rev",
      "source": "overview_generation",
      "signal_category": "team",
      "evidence_source": "profile"
    },
    {
      "signal_id": "paid_customer_count",
      "type": "growth",
      "title": "Paid customers",
      "text": "Large customer base at low deal size (under $5K) indicates a product-led or self-serve motion is working. Average deal size is ~$3K, which is typical for SMB/mid-market SaaS. Expansion opportunity lies in moving upmarket and increasing deal size.",
      "highlight": "500 paid customers",
      "category_id": "mkt",
      "source": "overview_generation",
      "signal_category": "growth",
      "evidence_source": "profile"
    }
  ],
  "suggested_initiatives": [
    {
      "title": "Launch AI Infrastructure product with quality gates and staged rollout",
      "description": "Execute a disciplined product launch within the 3–6 month window with a focus on quality and reliability. Establish pre-launch quality gates (automated testing, security review, performance benchmarks), define staged rollout phases (beta → early access → general availability), and create a launch communication plan tied to GTM priorities. This is the critical inflection point: a successful launch unlocks GTM motion and customer acquisition.",
      "category": "product",
      "category_id": "dev",
      "cadence": "one-time",
      "status": "draft",
      "tagged_intelligence_type": "dev_product_stage",
      "tagged_intelligence_types": [
        "dev_product_stage",
        "dev_delivery_constraint",
        "dev_eng_bottleneck"
      ],
      "benefit": "Ship a production-ready product that meets enterprise standards\nReduce post-launch bugs and support burden\nCreate momentum for GTM and sales motion\nDe-risk the transition from 'built' to 'revenue-generating'",
      "priority": "high",
      "milestones": [
        {
          "title": "Define launch quality gates and acceptance criteria",
          "due_date": "10-16-2026",
          "checked": false
        },
        {
          "title": "Implement QA automation for core product flows (unit, integration, E2E)",
          "due_date": "11-30-2026",
          "checked": false
        },
        {
          "title": "Execute beta launch with 20–50 early access customers",
          "due_date": "01-15-2027",
          "checked": false
        },
        {
          "title": "General availability launch with full GTM support",
          "due_date": "03-15-2027",
          "checked": false
        }
      ],
      "york_help": {
        "section_title": "How York IE can help",
        "bullets": [
          {
            "title": "QA automation and launch readiness",
            "milestone": "QA automation and launch readiness",
            "help": "We'll design and implement automated test suites covering unit, integration, and end-to-end flows, plus establish a release process and quality gates that reduce bugs and downtime. This will unblock your QA bottleneck and enable faster, more confident shipping into your staged rollout phases.",
            "primary_service": "QA Engineering & Automation",
            "track": "rd"
          },
          {
            "title": "Product launch strategy and roadmap alignment",
            "milestone": "Product launch strategy and roadmap alignment",
            "help": "We'll help you prioritize launch features, define the staged rollout phases, and align the product roadmap with your GTM motion so the launch creates immediate sales momentum. This ensures your launch isn't just a technical event but a business inflection point.",
            "primary_service": "Product Strategy",
            "track": "rd"
          }
        ],
        "cta_label": "Talk to the York IE team"
      }
    },
    {
      "title": "Define and operationalize repeatable GTM motion (sales-led + inbound hybrid)",
      "description": "Move from founder-led, ad-hoc sales to a repeatable, scalable GTM engine. Define the sales motion (sales-led for enterprise, product-led for SMB), establish pipeline stages and SLAs between marketing and sales, create a sales playbook with qualification criteria and discovery process, and hire or contract the first dedicated AE. This is the highest-leverage initiative for revenue acceleration and enterprise expansion.",
      "category": "gtm",
      "category_id": "mkt",
      "cadence": "one-time",
      "status": "draft",
      "tagged_intelligence_type": "mkt_sales_motion",
      "tagged_intelligence_types": [
        "mkt_sales_motion",
        "mkt_gtm_constraint",
        "mkt_funnel_gap"
      ],
      "benefit": "Shift from founder-dependent to scalable sales motion\nIncrease deal size and enterprise pipeline\nAlign marketing and sales on pipeline definitions and SLAs\nCreate a repeatable process that new AEs can follow",
      "priority": "high",
      "milestones": [
        {
          "title": "Document ICP, buyer personas, and disqualify criteria for SMB vs. enterprise",
          "due_date": "10-23-2026",
          "checked": false
        },
        {
          "title": "Define sales motion, pipeline stages, and marketing/sales SLAs",
          "due_date": "11-15-2026",
          "checked": false
        },
        {
          "title": "Build sales playbook (discovery, qualification, objection handling, close)",
          "due_date": "12-15-2026",
          "checked": false
        },
        {
          "title": "Hire first dedicated AE and onboard to playbook",
          "due_date": "02-15-2027",
          "checked": false
        }
      ],
      "york_help": {
        "section_title": "How York IE can help",
        "bullets": [
          {
            "title": "GTM motion design and sales strategy",
            "milestone": "GTM motion design and sales strategy",
            "help": "We'll map your GTM motion to your business stage — hybrid sales-led for enterprise and product-led for SMB — and design the sales playbook, qualification criteria, and discovery process. This gives your first AE a repeatable framework and removes founder dependency.",
            "primary_service": "Sales & RevOps Strategy",
            "track": "gtm"
          },
          {
            "title": "Revenue operations and pipeline alignment",
            "milestone": "Revenue operations and pipeline alignment",
            "help": "We'll establish aligned sales, marketing, and customer success processes with clear pipeline definitions, SLAs, and reporting. This ensures marketing and sales are working toward the same goals and you have visibility into what's working.",
            "primary_service": "Revenue Operations",
            "track": "gtm"
          }
        ],
        "cta_label": "Talk to the York IE team"
      }
    },
    {
      "title": "Build customer success and expansion playbook to drive NRR growth",
      "description": "Systematize customer expansion and retention to capitalize on the 155% NRR and 122% logo retention. Design a customer success function with segmentation (SMB self-serve, mid-market CSM-led, enterprise executive sponsor), define expansion triggers and upsell motions, create health scoring and at-risk intervention playbooks, and establish expansion ownership and metrics. This converts the strong retention signal into predictable, scalable expansion revenue.",
      "category": "gtm",
      "category_id": "mkt",
      "cadence": "recurring",
      "status": "draft",
      "tagged_intelligence_type": "nrr_pct",
      "tagged_intelligence_types": [
        "nrr_pct",
        "logo_retention_pct",
        "mkt_funnel_gap"
      ],
      "benefit": "Systematize expansion revenue and reduce ad-hoc upsells\nReduce churn and improve customer lifetime value\nCreate a repeatable playbook for new CSMs to follow\nIncrease predictability of NRR and expansion ARR",
      "priority": "high",
      "milestones": [
        {
          "title": "Segment customer base by size and expansion potential; define CSM book of business",
          "due_date": "10-30-2026",
          "checked": false
        },
        {
          "title": "Design health scoring model and at-risk intervention playbook",
          "due_date": "11-30-2026",
          "checked": false
        },
        {
          "title": "Define expansion triggers, upsell motions, and expansion ownership model",
          "due_date": "12-30-2026",
          "checked": false
        },
        {
          "title": "Hire or contract first dedicated CSM and onboard to playbook",
          "due_date": "02-15-2027",
          "checked": false
        }
      ],
      "york_help": {
        "section_title": "How York IE can help",
        "bullets": [
          {
            "title": "Customer success strategy and expansion playbook",
            "milestone": "Customer success strategy and expansion playbook",
            "help": "We'll design your customer success function with segmentation, health scoring, and expansion ownership tied to your NRR and GRR targets. This turns your 155% NRR into a systematic, scalable expansion engine.",
            "primary_service": "Revenue Operations",
            "track": "gtm"
          }
        ],
        "cta_label": "Talk to the York IE team"
      }
    },
    {
      "title": "Establish financial forecasting and operating cadence for scaling and fundraising",
      "description": "Transition from founder-managed, static budgets to a professional financial operating rhythm. Implement a rolling 12-month forecast updated monthly, establish a monthly close and reporting cadence, define unit economics dashboards (CAC, LTV, payback, burn multiple), and create a board/investor reporting template. This provides the financial rigor needed to support aggressive hiring, make confident capital allocation decisions, and prepare for fundraising.",
      "category": "finance",
      "category_id": "rev",
      "cadence": "recurring",
      "status": "draft",
      "tagged_intelligence_type": "rev_finance_management",
      "tagged_intelligence_types": [
        "rev_finance_management",
        "cash_on_hand_usd",
        "monthly_burn_usd"
      ],
      "benefit": "Move from static budget to dynamic, rolling forecast\nGain visibility into unit economics and capital efficiency\nPrepare investor-ready financial materials and data room\nEnable confident hiring and capital allocation decisions",
      "priority": "high",
      "milestones": [
        {
          "title": "Build 12-month rolling forecast model with revenue, expense, and cash flow drivers",
          "due_date": "10-31-2026",
          "checked": false
        },
        {
          "title": "Establish monthly close process and financial reporting dashboard",
          "due_date": "11-30-2026",
          "checked": false
        },
        {
          "title": "Define unit economics KPIs (CAC, LTV, payback, burn multiple, Rule of 40)",
          "due_date": "12-15-2026",
          "checked": false
        },
        {
          "title": "Create board/investor reporting template and run first monthly update",
          "due_date": "01-31-2027",
          "checked": false
        }
      ],
      "york_help": {
        "section_title": "How York IE can help",
        "bullets": [
          {
            "title": "FP&A and financial forecasting for scaling",
            "milestone": "FP&A and financial forecasting for scaling",
            "help": "We'll build a rolling 12-month forecast and financial model that turns raw numbers into decisions. This gives you investor-grade materials for capital raises and board reporting, plus the visibility to make confident hiring and capital allocation calls.",
            "primary_service": "FP&A and Strategic Finance",
            "track": "ga"
          },
          {
            "title": "Monthly financial close and reporting",
            "milestone": "Monthly financial close and reporting",
            "help": "We'll establish a reliable month-end close and reporting cadence so you have a consistent, trusted view of financial performance every month. This is foundational for both internal decision-making and external fundraising.",
            "primary_service": "Financial Reporting",
            "track": "ga"
          }
        ],
        "cta_label": "Talk to the York IE team"
      }
    },
    {
      "title": "Pressure-test hiring plan against runway and revenue capacity",
      "description": "The company is planning aggressive hiring over the next 6 months, but needs to validate that the hiring plan is aligned with revenue growth, cash runway, and capital efficiency targets. Conduct a bottoms-up hiring plan review by function (engineering, sales, CS, ops), model the impact on burn and runway, and identify roles that should be deferred, consolidated, or accelerated based on revenue capacity and strategic priorities.",
      "category": "finance",
      "category_id": "rev",
      "cadence": "one-time",
      "status": "draft",
      "tagged_intelligence_type": "fte_count",
      "tagged_intelligence_types": [
        "fte_count",
        "cash_on_hand_usd",
        "arr_per_fte_usd"
      ],
      "benefit": "Ensure hiring plan is aligned with revenue growth and runway\nIdentify roles that should be deferred or consolidated\nMaintain capital efficiency and extend runway\nMake confident hiring decisions with full financial visibility",
      "priority": "medium",
      "milestones": [
        {
          "title": "Map current hiring plan by function and timeline",
          "due_date": "10-15-2026",
          "checked": false
        },
        {
          "title": "Model hiring impact on burn, runway, and ARR per FTE",
          "due_date": "11-15-2026",
          "checked": false
        },
        {
          "title": "Identify roles to defer, consolidate, or accelerate based on revenue capacity",
          "due_date": "12-01-2026",
          "checked": false
        }
      ],
      "york_help": {
        "section_title": "How York IE can help",
        "bullets": [
          {
            "title": "Hiring plan validation and capital efficiency",
            "milestone": "Hiring plan validation and capital efficiency",
            "help": "We'll pressure-test your hiring plan against revenue capacity, cash runway, and capital efficiency targets. This identifies roles that should be deferred, consolidated, or accelerated so you can hire with confidence and maintain your strong unit economics.",
            "primary_service": "FP&A and Strategic Finance",
            "track": "ga"
          }
        ],
        "cta_label": "Talk to the York IE team"
      }
    }
  ],
  "suggested_playbooks": [
    {
      "playbook_slug": "product-launch-framework",
      "reason": "York IE's AI Infrastructure product is built but not yet launched (3–6 month target). This playbook provides a pre/during/post launch checklist to ensure the launch lands with quality and creates GTM momentum.",
      "category_id": "dev"
    },
    {
      "playbook_slug": "qa-automation-rollout",
      "reason": "QA and testing is the identified engineering bottleneck. This playbook provides a phase-by-phase plan to move from manual testing to automated QA (unit, integration, E2E, load), which will unblock faster shipping and improve product quality.",
      "category_id": "dev"
    },
    {
      "playbook_slug": "sales-revops-assessment",
      "reason": "Sales motion is undefined, sales team is founder-only, and GTM constraint is sales/marketing alignment. This playbook diagnoses where revenue execution is leaking and proposes 3 initiatives to build a repeatable GTM engine.",
      "category_id": "mkt"
    },
    {
      "playbook_slug": "customer-success-playbook",
      "reason": "Despite 155% NRR and 122% logo retention, the founder identifies expansion/renewal as the biggest growth bottleneck. This playbook designs the CS function with segmentation, health scoring, and expansion ownership tied to NRR targets.",
      "category_id": "mkt"
    },
    {
      "playbook_slug": "fpa-monthly-cadence",
      "reason": "Founder is managing finances with rough manual estimates and static annual budget. This playbook establishes a monthly close → reporting → forecast → action loop built for $5M–$50M ARR companies, providing the financial rigor needed for scaling and fundraising.",
      "category_id": "rev"
    },
    {
      "playbook_slug": "hiring-plan-allocation",
      "reason": "Company is planning aggressive hiring over 6 months but needs to validate alignment with revenue capacity and runway. This playbook pressure-tests the hiring plan and identifies roles to defer, consolidate, or accelerate.",
      "category_id": "rev"
    }
  ],
  "journey_stage": {
    "current": "Product Launch & GTM Definition",
    "label": "Product Launch & GTM Definition"
  }
}
===============================================
========== Overview Generation ==========
Request Started: 2026-09-18T20:01:13.634Z
runId: 54e9e992-37d3-4d1c-8c48-0f8d22c7b8f1
companyUuid: cat_ec4eba4c-64c4-488e-b870-fc18205409ed
accountId: acct_3205f702-ef5a-4aaf-8086-105cb5505f94
source: internal_worker
status: ok
Database Fetch: 40ms
Bedrock Request: 57.51s
Bedrock Response Processing: 3ms
Database Save: 65ms
Total API Time: 57.64s
=========================================