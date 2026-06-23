import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./PatriotPayJourney.css";
import ConnectorsPage from "./IntegrationSetupPage.tsx";
import "./credits/credits.css";
import {
  CreditProvider,
  CreditIndicator,
  CreditBlockBanner,
  CreditToastHost,
  UpgradeModal,
  useCredits,
  useCreditsOptional,
} from "./credits";
import { totalRemaining, dailyRemaining, monthlyRemainingRatio } from "./credits/creditLogic";
import type { CreditSnapshot } from "./credits/types";
import ScorecardV2 from "./ScorecardV2";

const TOUR_TAKEN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const tracks = [
  {
    id: "rd",
    icon: "⚙",
    iconBg: "rgba(63,224,164,0.12)",
    iconColor: "#3DD68C",
    name: "Development",
    sub: "R&D · Engineering, AI, UX, QA, DevOps",
    health: "green",
    healthLabel: "On Track",
    fill: 82,
    stat: { label: "Active since", val: "Feb 2024" },
    team: [
      { initials: "JL", bg: "linear-gradient(135deg,#3DD68C,#1E7A4A)", color: "#080C09", name: "Jake L.", role: "Lead Engineer", alloc: "100%" },
      { initials: "RK", bg: "linear-gradient(135deg,#D4924A,#7A4E20)", color: "#080C09", name: "Ryan K.", role: "QA Engineer", alloc: "75%" },
      { initials: "PH", bg: "linear-gradient(135deg,#8B76D4,#5040A4)", color: "#fff", name: "Pierre H.", role: "DevOps", alloc: "50%" },
      { initials: "AM", bg: "linear-gradient(135deg,#2BB8A0,#1A6A64)", color: "#080C09", name: "Amy M.", role: "UX Designer", alloc: "50%" },
    ],
    milestones: [
      { pct: 10, label: "Architecture scoped", done: true },
      { pct: 24, label: "MVP deployed to beta", done: true },
      { pct: 36, label: "UX sprint 1 complete", done: true },
      { pct: 50, label: "UX sprint 2 — flow redesign", done: true },
      { pct: 63, label: "PostgreSQL migration", done: true },
      { pct: 74, label: "Patient Billing Agent launched", done: true },
      { pct: 82, label: "QA regression suite · 4 envs", done: true },
    ],
    chips: [
      { label: "MVP build", color: "#3DD68C" },
      { label: "AI Agent", color: "#3DD68C" },
      { label: "Postgres migration", color: "#3DD68C" },
      { label: "QA suite live", color: "#3DD68C" },
      { label: "Operator Thread — in progress", color: "#D4924A" },
    ],
  },
  {
    id: "gtm",
    icon: "↗",
    iconBg: "rgba(229,181,68,0.12)",
    iconColor: "#D4924A",
    name: "Marketing",
    sub: "Marketing · Website, SEO, CRM, outreach, brand",
    health: "amber",
    healthLabel: "Needs Attention",
    fill: 52,
    stat: { label: "Active since", val: "Oct 2023" },
    team: [
      { initials: "SG", bg: "linear-gradient(135deg,#F97316,#B34E0A)", color: "#fff", name: "Shreya G.", role: "Account Lead", alloc: "25%" },
      { initials: "AM", bg: "linear-gradient(135deg,#2BB8A0,#1A6A64)", color: "#080C09", name: "Amy M.", role: "UX Designer", alloc: "50%" },
    ],
    milestones: [
      { pct: 12, label: "ICP defined", done: true },
      { pct: 26, label: "patriotpay.com launched", done: true },
      { pct: 38, label: "Outreach sequences live", done: true },
      { pct: 52, label: "First 12 customers signed", done: true },
    ],
    chips: [
      { label: "Website live", color: "#3DD68C" },
      { label: "Outreach sequences", color: "#3DD68C" },
      { label: "12 customers", color: "#3DD68C" },
      { label: "No repeatable GTM motion", color: "#D4924A" },
      { label: "SEO not started", color: "#E56B6B" },
    ],
  },
  {
    id: "revops",
    icon: "◎",
    iconBg: "rgba(167,139,250,0.12)",
    iconColor: "#8B76D4",
    name: "Revenue Operations",
    sub: "RevOps · CRM, pipeline, attribution, analytics",
    health: "amber",
    healthLabel: "In Progress",
    fill: 38,
    stat: { label: "Active since", val: "Nov 2024" },
    team: [
      { initials: "SG", bg: "linear-gradient(135deg,#F97316,#B34E0A)", color: "#fff", name: "Shreya G.", role: "Account Lead", alloc: "25%" },
    ],
    milestones: [
      { pct: 14, label: "HubSpot configured", done: true },
      { pct: 28, label: "Deal pipeline built", done: true },
      { pct: 38, label: "CAC tracking — partial", done: false },
    ],
    chips: [
      { label: "HubSpot live", color: "#3DD68C" },
      { label: "Pipeline built", color: "#3DD68C" },
      { label: "CAC tracking partial", color: "#D4924A" },
      { label: "Attribution not set up", color: "#E56B6B" },
    ],
  },
  {
    id: "ga",
    icon: "◈",
    iconBg: "rgba(107,117,112,0.1)",
    iconColor: "#6B7570",
    name: "Financial Advisory",
    sub: "G&A · FP&A, accounting, fundraising prep, corporate strategy",
    health: "grey",
    healthLabel: "Not Started",
    fill: 0,
    stat: { label: "Status", val: "Available" },
    team: [],
    milestones: [],
    chips: [
      { label: "Books not formalised", color: "#D4924A" },
      { label: "No forecast model", color: "#D4924A" },
      { label: "Growth planning window approaching", color: "#E56B6B" },
    ],
  },
];

const trackUpdates = {
  rd: {
    jira: [
      { type: "done", text: "Operator Thread Module — spec finalised and approved", date: "Nov 6" },
      { type: "open", text: "Operator Thread Module — build in progress (sprint 3)", date: "Nov 8" },
      { type: "done", text: "PostgreSQL migration complete · 35% infra cost reduction", date: "Oct 22" },
      { type: "done", text: "Patient Billing Agent v1 launched to all 12 customers", date: "Nov 10" },
      { type: "open", text: "Performance test suite · 2 flaky tests to fix", date: "Nov 7" },
    ],
    notes: [
      { type: "note", text: "Matt flagged operator handoff as top priority for Nov sprint", date: "Nov 4" },
      { type: "note", text: "Jake confirmed Postgres migration unblocked mobile feature work", date: "Oct 23" },
      { type: "note", text: "QA review: all critical paths passing · 2 edge cases open", date: "Nov 1" },
    ],
  },
  gtm: {
    jira: [
      { type: "done", text: "patriotpay.com homepage and product page shipped", date: "Oct 15" },
      { type: "done", text: "3 outreach sequences live — Practice Manager, Billing Lead, Owner", date: "Oct 28" },
      { type: "open", text: "SEO audit not yet scheduled · keyword strategy pending", date: "—" },
      { type: "open", text: "Blog content plan — draft in review", date: "Nov 3" },
    ],
    notes: [
      { type: "note", text: "Shreya: GTM motion still reliant on direct outreach — no inbound yet", date: "Nov 5" },
      { type: "note", text: "First customer from outreach sequence signed — Willow Creek Practice", date: "Oct 30" },
      { type: "note", text: "Matt wants to explore LinkedIn paid ads in Q1", date: "Nov 4" },
    ],
  },
  revops: {
    jira: [
      { type: "done", text: "HubSpot workspace configured · deal stages set up", date: "Nov 1" },
      { type: "done", text: "Contact records imported from outreach sequences", date: "Nov 2" },
      { type: "open", text: "CAC tracking — LinkedIn pixel not connected", date: "Nov 8" },
      { type: "open", text: "Revenue attribution model — not yet built", date: "—" },
    ],
    notes: [
      { type: "note", text: "Shreya: CAC currently estimated at $380 from direct sales only", date: "Nov 6" },
      { type: "note", text: "HubSpot pipeline shows 7 active deals in proposal stage", date: "Nov 7" },
    ],
  },
  ga: {
    jira: [
      { type: "open", text: "Books not yet formalised — basic P&L only from founder", date: "—" },
      { type: "open", text: "No monthly close process in place", date: "—" },
      { type: "open", text: "Financial model for growth planning not built", date: "—" },
    ],
    notes: [
      { type: "note", text: "Growth planning conversations likely Q2 2025 — 6 months to get financials decision-ready", date: "Nov 5" },
      { type: "note", text: "Shreya: flagged G&A gap to Matt — intro to York Finance team suggested", date: "Nov 6" },
    ],
  },
};

const suggestionMessages = {
  ga: {
    text: (
      <>
        <strong>Financial Advisory not started.</strong> With a growth planning window approaching, now is the right time to formalise your books, build a forecast model, and make your operating plan decision-ready.
      </>
    ),
    btn: "Explore G&A packages",
  },
  gtm: {
    text: (
      <>
        <strong>GTM motion not repeatable yet.</strong> You have customers but no scalable acquisition engine. SEO and RevOps are the next unlock.
      </>
    ),
    btn: "Explore GTM packages",
  },
  revops: {
    text: (
      <>
        <strong>RevOps attribution incomplete.</strong> CAC and channel attribution need finishing before GTM spend can be optimised.
      </>
    ),
    btn: "Explore RevOps packages",
  },
};

const milestoneInsights = {
  rd: {
    "Architecture scoped": {
      update: "Your core product architecture is scoped and ready for build sequencing.",
      playbook: "Technical Architecture Readiness Review",
      next: "Use this to validate integration points before the next build milestone.",
    },
    "MVP deployed to beta": {
      update: "Your MVP is in beta, so feedback can now be tied directly to roadmap priorities.",
      playbook: "Beta Feedback Prioritization",
      next: "Turn early usage patterns into the next release plan.",
      playbooks: [
        {
          title: "Beta Feedback Prioritization",
          next: "Turn early usage patterns into the next release plan.",
        },
        {
          title: "Activation Signal Review",
          next: "Compare onboarding events, drop-offs, and qualitative feedback before the next sprint.",
        },
        {
          title: "Roadmap Triage Sprint",
          next: "Separate quick fixes, product gaps, and strategic bets into a release-ready backlog.",
        },
      ],
    },
    "UX sprint 1 complete": {
      update: "The first UX sprint is complete and core flows are ready for refinement.",
      playbook: "Workflow Friction Review",
      next: "Identify where users slow down before the next design sprint.",
    },
    "UX sprint 2 — flow redesign": {
      update: "The redesigned flow is ready to support cleaner handoff into engineering.",
      playbook: "Design-to-Development Handoff",
      next: "Confirm accepted states, edge cases, and approval notes before build.",
    },
    "PostgreSQL migration": {
      update: "The database migration is complete and infrastructure risk is lower.",
      playbook: "Scale Readiness Check",
      next: "Review performance, observability, and backup confidence before expansion.",
    },
    "Patient Billing Agent launched": {
      update: "The billing agent is live, giving your team a production workflow to measure.",
      playbook: "Launch Signal Review",
      next: "Use adoption and support signals to define the next product iteration.",
    },
    "QA regression suite · 4 envs": {
      update: "Regression coverage is live across environments, improving release confidence.",
      playbook: "Release Readiness Playbook",
      next: "Use Pulse quality signals to decide what is ready to ship next.",
    },
  },
  gtm: {
    "ICP defined": {
      update: "Your ideal customer profile is defined and ready to guide campaigns.",
      playbook: "ICP Validation Sprint",
      next: "Test the ICP against real outreach and conversion signals.",
    },
    "patriotpay.com launched": {
      update: "Your website is live and can now become the center of demand capture.",
      playbook: "Website Conversion Review",
      next: "Review page intent, conversion paths, and analytics coverage.",
    },
    "Outreach sequences live": {
      update: "Outbound sequences are live and early response quality can be measured.",
      playbook: "Outbound Performance Review",
      next: "Compare messaging, personas, and reply quality before scaling volume.",
    },
    "First 12 customers signed": {
      update: "Your first customer base is in place, giving you stronger proof points.",
      playbook: "Repeatable GTM Motion",
      next: "Use customer patterns to shape the next scalable acquisition channel.",
    },
  },
  revops: {
    "HubSpot configured": {
      update: "Your CRM foundation is configured and ready for cleaner operating cadence.",
      playbook: "CRM Hygiene Review",
      next: "Confirm lifecycle stages, ownership, and required fields before reporting.",
    },
    "Deal pipeline built": {
      update: "Your deal pipeline is structured enough to track sales movement.",
      playbook: "Pipeline Operating Rhythm",
      next: "Use stage movement and conversion gaps to guide weekly review.",
    },
    "CAC tracking — partial": {
      update: "CAC tracking has started, but attribution still needs completion.",
      playbook: "Attribution Completion Plan",
      next: "Connect spend, source, and deal data before increasing GTM investment.",
    },
  },
};

function getMilestoneInsight(track, milestone) {
  const trackInsights = milestoneInsights[track.id] || {};
  return trackInsights[milestone.label] || {
    update: milestone.done
      ? `You completed "${milestone.label}" and moved this track forward.`
      : `"${milestone.label}" is the next milestone to unlock more progress.`,
    playbook: milestone.done ? `${track.name} Next-Level Review` : `${track.name} Activation Plan`,
    next: milestone.done
      ? "Review what changed, what worked, and what should be prioritized next."
      : "Use this to clarify owners, blockers, and the path to completion.",
  };
}

function getMilestonePlaybooks(insight) {
  return insight.playbooks || [{ title: insight.playbook, next: insight.next }];
}

const marketingDetail = {
  dashboardUrl: "https://gtm.york.ie/patriot-pay/marketing-dashboard",
  updatedAt: "Last 90 days",
  headline: "Traffic and organic search are improving, while paid conversion efficiency needs attention.",
  summary:
    "Your dashboard shows stronger GA4 traffic, improving Search Console visibility, and healthy LinkedIn engagement. Google Ads is driving activity, but paid conversions and CPA should stay visible because spend is increasing while conversion movement is softer.",
  metrics: [
    { label: "Sessions", value: "24.3K", change: "+7.8%", tone: "green" },
    { label: "Users", value: "18.1K", change: "+8%", tone: "green" },
    { label: "Organic clicks", value: "312K", change: "+10%", tone: "green" },
    { label: "Google Ads spend", value: "$28.4K", change: "+11%", tone: "amber" },
    { label: "Paid conversions", value: "87", change: "-3%", tone: "red" },
    { label: "LinkedIn engagement", value: "3.4%", change: "+0.6%", tone: "green" },
  ],
  highlights: [
    { source: "GA4 traffic", text: "Sessions and users are both up for the current period." },
    { source: "Search Console", text: "Organic clicks improved and average position moved in the right direction." },
    { source: "LinkedIn organic", text: "Post impressions and engagement rate are improving." },
  ],
  watchItems: [
    { source: "Google Ads", text: "Paid conversions are slightly down while spend is up." },
    { source: "Query explorer", text: "Quick-win query opportunities need content follow-through." },
    { source: "SEO compounding", text: "Branded visibility is building, but non-branded growth still needs work." },
  ],
  channelMix: [
    { label: "Organic", value: 50, color: "#9AAFD0" },
    { label: "Direct", value: 23, color: "#8FC5B7" },
    { label: "Paid", value: 18, color: "#D8B77D" },
    { label: "Social", value: 6, color: "#C99582" },
    { label: "Referral", value: 3, color: "#8B76D4" },
  ],
  acquisitionFunnel: [
    { label: "Landing page", value: 100, detail: "10.4K users" },
    { label: "Product view", value: 62, detail: "6.2K users" },
    { label: "Signup started", value: 38, detail: "3.9K users" },
    { label: "Signup completed", value: 24, detail: "2.5K users" },
    { label: "Conversion", value: 8, detail: "844 users" },
  ],
  opportunities: [
    { label: "Post-to-engineering queries", source: "Query explorer", note: "High-intent SEO topic showing quick-win potential in the query dashboard." },
    { label: "Billing recovery landing page", source: "Google Ads", note: "Paid traffic is present, but conversion movement suggests the page should be reviewed." },
    { label: "LinkedIn posting cadence", source: "LinkedIn organic", note: "Engagement is healthy; continued cadence can support channel growth." },
  ],
};

const integrationOptions = [
  {
    id: "launchpad",
    name: "Launchpad",
    productType: "York IE product",
    tag: "Design approvals",
    icon: "✦",
    color: "#3DD68C",
    price: 149,
    description: "Create and approve product screens, then bring decision-ready design context into Fuel.",
    bullets: ["Approval workflow", "Preview links", "Client-ready handoff"],
    featured: true,
  },
  {
    id: "pulse",
    name: "Pulse",
    productType: "York IE product",
    tag: "Code quality",
    icon: "◆",
    color: "#2BB8A0",
    price: 199,
    description: "Turn engineering activity into simple quality, stability, and release-readiness signals.",
    bullets: ["Quality summaries", "Stability signals", "Release confidence"],
    featured: true,
  },
  {
    id: "jira",
    name: "Jira",
    productType: "Project management",
    tag: "Roadmap",
    icon: "▣",
    color: "#60A5FA",
    price: 89,
    description: "Pull roadmap items, sprint status, release notes, and engineering ownership into Fuel.",
    bullets: ["Roadmap status", "Sprint context", "Release notes"],
  },
  {
    id: "linear",
    name: "Linear",
    productType: "Project management",
    tag: "Issue tracking",
    icon: "▱",
    color: "#D4924A",
    price: 89,
    description: "Connect Linear issues for teams that run product delivery outside Jira.",
    bullets: ["Issue status", "Team ownership", "Planning signals"],
  },
];

const marketingIntegrationOptions = [
  {
    id: "ga4",
    name: "Google Analytics",
    productType: "Analytics",
    tag: "Traffic analytics",
    icon: "GA",
    color: "#F59E0B",
    price: 79,
    description: "Bring sessions, users, engagement, channel mix, and acquisition funnel data into Fuel.",
    bullets: ["Traffic overview", "Channel mix", "Acquisition funnel"],
  },
  {
    id: "google-ads",
    name: "Google Ads",
    productType: "Paid media",
    tag: "Campaign performance",
    icon: "Ads",
    color: "#60A5FA",
    price: 99,
    description: "Track paid search spend, CPA, conversions, campaign performance, and lead funnel movement.",
    bullets: ["Spend", "CPA", "Conversions"],
  },
  {
    id: "meta",
    name: "Meta",
    productType: "Paid social",
    tag: "Facebook and Instagram",
    icon: "M",
    color: "#818CF8",
    price: 89,
    description: "Connect Facebook and Instagram campaign data for paid social reach, traffic, and conversion signals.",
    bullets: ["Facebook", "Instagram", "Paid social"],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    productType: "Social",
    tag: "Organic and paid",
    icon: "in",
    color: "#38BDF8",
    price: 89,
    description: "Show LinkedIn engagement, impressions, follower growth, and campaign activity in the Marketing snapshot.",
    bullets: ["Engagement", "Impressions", "Followers"],
  },
  {
    id: "semrush",
    name: "Semrush",
    productType: "SEO",
    tag: "Keyword and backlink data",
    icon: "S",
    color: "#FB7185",
    price: 109,
    description: "Surface keyword movement, authority signals, backlinks, and SEO opportunities from Semrush.",
    bullets: ["Keywords", "Backlinks", "Authority"],
  },
  {
    id: "search-console",
    name: "Search Console",
    productType: "Organic search",
    tag: "Google search visibility",
    icon: "SC",
    color: "#3DD68C",
    price: 69,
    description: "Pull organic clicks, impressions, CTR, ranking movement, and query opportunities from Google Search Console.",
    bullets: ["Clicks", "Queries", "CTR"],
  },
];

const gtmDashboardAccessOption = {
  id: "gtm-dashboard",
  name: "York IE GTM Dashboard",
  productType: "York IE service",
  tag: "Managed marketing reporting",
  icon: "Y",
  color: "#3DD68C",
  price: 0,
  description: "Request access to the York IE-managed GTM dashboard that already combines traffic, paid media, SEO, and social signals.",
  bullets: ["Managed setup", "Dashboard access", "York IE support"],
  featured: true,
};

const yorkJourneyPaths = [
  { label: "Development", detail: "Turn roadmap, design, QA, and release activity into signals and playbooks.", icon: "⚙" },
  { label: "Marketing", detail: "Summarize traffic, paid media, SEO, and social into growth actions.", icon: "↗" },
  { label: "RevOps", detail: "Connect CRM, pipeline, attribution, and CAC signals into operating rhythm.", icon: "◎" },
  { label: "FinOps", detail: "Build forecast, runway, board reporting, and decision-ready finance foundations.", icon: "◈" },
  { label: "Success", detail: "Compare your operating cadence with durable startup benchmarks.", icon: "◆" },
];

const yorkServiceBundles = [
  { title: "Build the product engine", focus: "Development + Launchpad + Pulse", detail: "For teams that need clearer delivery cadence, quality visibility, and release readiness." },
  { title: "Create demand momentum", focus: "Marketing + GTM Dashboard", detail: "For teams that need a cleaner view of acquisition, SEO, paid media, and channel performance." },
  { title: "Tighten revenue operations", focus: "RevOps + CRM + attribution", detail: "For teams that need pipeline hygiene, CAC tracking, and GTM operating visibility." },
  { title: "Prepare for scale decisions", focus: "FinOps + forecasting + board reporting", detail: "For teams that need financial clarity before hiring, fundraising, or strategic planning." },
];

const journeyIntegrationGroups = [
  { id: "development", label: "Development", options: integrationOptions },
  { id: "marketing", label: "Marketing", options: marketingIntegrationOptions },
  {
    id: "revops",
    label: "RevOps",
    options: [
      { id: "hubspot", name: "HubSpot", productType: "CRM", tag: "Pipeline", icon: "H", color: "#F97316", price: 99, description: "Connect CRM, deal stages, pipeline hygiene, and attribution signals.", bullets: ["Pipeline", "CRM", "Attribution"] },
      { id: "salesforce", name: "Salesforce", productType: "CRM", tag: "Sales data", icon: "SF", color: "#38BDF8", price: 119, description: "Bring Salesforce account, opportunity, and sales motion data into Fuel.", bullets: ["Accounts", "Opportunities", "Forecast"] },
    ],
  },
  {
    id: "finops",
    label: "FinOps",
    options: [
      { id: "quickbooks", name: "QuickBooks", productType: "Finance", tag: "Accounting", icon: "QB", color: "#3DD68C", price: 89, description: "Connect accounting data for financial visibility and operating cadence.", bullets: ["Accounting", "P&L", "Cash"] },
      { id: "stripe", name: "Stripe", productType: "Payments", tag: "Revenue", icon: "$", color: "#8B76D4", price: 79, description: "Bring payment, subscription, and revenue movement into your operating view.", bullets: ["Payments", "MRR", "Revenue"] },
    ],
  },
];

const developmentDetail = {
  designApproved: true,
  launchpadUrl: "https://launchpad.york.ie/patriot-pay/operator-thread-v2",
  roadmap: [
    {
      key: "PP-128",
      title: "Operator Thread Module",
      status: "In development",
      category: "active",
      owner: "Jake L.",
      due: "Nov 15",
      summary: "Build operator handoff threads so care teams can resolve billing exceptions without leaving patriotpay.",
    },
    {
      key: "PP-141",
      title: "Patient Billing Agent QA",
      status: "Ready for regression",
      category: "active",
      owner: "Ryan K.",
      due: "Nov 12",
      summary: "Run regression coverage across eligibility checks, payment plans, and failed claim recovery flows.",
    },
    {
      key: "PP-149",
      title: "Mobile Intake Flow",
      status: "Queued",
      category: "future",
      owner: "Amy M.",
      due: "Nov 22",
      summary: "Prepare responsive intake screens after the Launchpad-approved design system update lands.",
    },
    {
      key: "PP-118",
      title: "PostgreSQL migration",
      status: "Closed",
      category: "closed",
      owner: "Pierre H.",
      due: "Oct 22",
      summary: "Completed data migration that reduced infrastructure cost and unblocked mobile feature work.",
    },
    {
      key: "PP-160",
      title: "Self-serve analytics dashboard",
      status: "Parking lot",
      category: "future",
      owner: "York team",
      due: "Planning",
      summary: "Future planning item for customer-facing usage analytics once core billing workflows stabilize.",
    },
  ],
  pulse: {
    project: "patriotpay",
    range: "May 12 to May 19",
    dimensions: [
      {
        label: "Quality",
        score: 85,
        tone: "green",
        metric: "Bug issue closure",
        value: "98",
        clientNote: "Code review is trending healthy. Recent comments are mostly polish and edge-case coverage, with no critical quality concerns.",
        highlights: [
          { task: "Patient Billing Agent QA", type: "Positive", note: "Regression notes show critical paths passing across eligibility and payment plan flows." },
          { task: "Operator Thread Module", type: "Watch", note: "Review requested clearer error states before handoff." },
        ],
      },
      {
        label: "Stability",
        score: 47,
        tone: "amber",
        metric: "Incident volume",
        value: "44",
        clientNote: "Stability needs attention before release. The team is watching intermittent failures and keeping scope contained.",
        highlights: [
          { task: "Regression suite", type: "Open", note: "Two flaky tests remain in non-critical paths and are being isolated this sprint." },
          { task: "PostgreSQL migration", type: "Improved", note: "Migration reduced infrastructure load, but monitoring remains active." },
        ],
      },
      {
        label: "Speed",
        score: 0,
        tone: "red",
        metric: "Lead time",
        value: "0",
        clientNote: "Speed is intentionally conservative this week because the team is holding work behind approval and regression gates.",
        highlights: [
          { task: "Mobile Intake Flow", type: "Queued", note: "Ready to pick up after Launchpad-approved design updates are absorbed." },
          { task: "Operator Thread Module", type: "Dependency", note: "Final handoff build waits on the remaining QA pass." },
        ],
      },
      {
        label: "AI Leverage",
        score: 46,
        tone: "amber",
        metric: "Prompt quality score",
        value: "61",
        clientNote: "AI usage is present but still maturing. The next improvement is reusable prompts for QA summaries and release notes.",
        highlights: [
          { task: "QA summaries", type: "Opportunity", note: "Pulse can summarize test outcomes into shareable updates." },
          { task: "Release prep", type: "Opportunity", note: "Reusable prompts can reduce manual status-writing work." },
        ],
      },
    ],
    checks: [
      { label: "Review coverage", value: "94%", tone: "green" },
      { label: "Flaky tests", value: "2 open", tone: "amber" },
      { label: "Critical findings", value: "0", tone: "green" },
      { label: "Release risk", value: "Medium", tone: "amber" },
    ],
    insight: "Pulse is flagging stability and speed as the two areas to watch before your next release.",
  },
  sdlc: [
    { label: "Research", source: "Fuel intelligence", status: "Done", tone: "done", note: "Problem and buyer workflow validated." },
    { label: "Design", source: "Launchpad", status: "Approved", tone: "done", note: "Client approved the operator thread design." },
    { label: "Development", source: "Jira", status: "Active", tone: "active", note: "Build can proceed because design is approved." },
    { label: "Quality", source: "Pulse", status: "Monitoring", tone: "active", note: "Quality is healthy, stability needs attention." },
    { label: "Release", source: "York team", status: "Next", tone: "next", note: "Ship after regression and your team’s sign-off." },
  ],
};

const roadmapSignals = {
  "PP-128": {
    launchpadUrl: "https://launchpad.york.ie/patriot-pay/operator-thread-v2",
    designTitle: "Operator Thread workflow",
    designSummary: "Approved design covers handoff threads, exception states, and the billing-team review path.",
    approvalText: "Client approved this workflow, so the engineering build is active.",
    designs: [
      { title: "Operator handoff dashboard", status: "Approved", owner: "Amy M.", updated: "Nov 6", note: "Primary thread list, assignment state, and exception triage reviewed with your team." },
      { title: "Exception detail drawer", status: "Approved", owner: "Amy M.", updated: "Nov 7", note: "Expanded patient billing context and internal comments approved for build." },
      { title: "Empty and error states", status: "Pending QA copy", owner: "Jake L.", updated: "Nov 8", note: "Visual pattern approved; microcopy needs one more internal pass." },
    ],
    releaseNote: {
      label: "Staging release note",
      title: "Operator Thread Module ready for staging",
      date: "Nov 15",
      body: "Introduces guided operator handoff threads for billing exceptions, including clearer queue states, internal assignment context, and QA-reviewed edge-case messaging.",
      bullets: ["Approved Launchpad workflow is reflected in the build.", "Pulse shows healthy review confidence with two stability watch items.", "Release remains staged until final regression sign-off."],
    },
    pulse: {
      dimensions: [
        { label: "Quality", score: 86, tone: "green", metric: "Review confidence", value: "High" },
        { label: "Stability", score: 62, tone: "amber", metric: "Open risks", value: "2" },
        { label: "Speed", score: 54, tone: "amber", metric: "Cycle health", value: "On pace" },
        { label: "AI Leverage", score: 48, tone: "amber", metric: "QA summary use", value: "Partial" },
      ],
      checks: [
        { label: "Review coverage", value: "91%", tone: "green" },
        { label: "Flaky tests", value: "1 open", tone: "amber" },
        { label: "Critical findings", value: "0", tone: "green" },
        { label: "Release risk", value: "Medium", tone: "amber" },
      ],
      insight: "Pulse shows good review confidence for Operator Thread, with stability still watched around handoff edge cases.",
      signals: [
        { category: "Quality", message: "Review confidence is high after error-state comments were addressed.", period: "Nov 8", confidence: "88%" },
        { category: "Stability", message: "One flaky handoff test remains open in a non-critical path.", period: "Nov 7", confidence: "71%" },
        { category: "AI Leverage", message: "QA summary prompt can convert test notes into shareable updates.", period: "Nov 6", confidence: "64%" },
      ],
    },
  },
  "PP-141": {
    launchpadUrl: "https://launchpad.york.ie/patriot-pay/billing-agent-qa",
    designTitle: "Billing Agent QA states",
    designSummary: "Approved QA view clarifies success, failure, and manual-review states for patient billing workflows.",
    approvalText: "Design is approved; remaining work is regression validation before release.",
    designs: [
      { title: "Billing Agent success states", status: "Approved", owner: "Amy M.", updated: "Nov 4", note: "Client approved success and confirmation messaging." },
      { title: "Manual review queue", status: "Approved", owner: "Ryan K.", updated: "Nov 5", note: "QA-ready flow for flagged patient billing items." },
      { title: "Failed claim recovery", status: "Revision requested", owner: "Amy M.", updated: "Nov 8", note: "Client asked for simpler language around retry timing." },
    ],
    releaseNote: {
      label: "QA release note",
      title: "Billing Agent QA package in regression",
      date: "Nov 12",
      body: "Packages the latest QA state updates for patient billing flows so the York team can review release readiness before your rollout.",
      bullets: ["Critical flows are passing in regression.", "Two flaky non-critical paths remain under review.", "Client-facing release note is pending QA sign-off."],
    },
    pulse: {
      dimensions: [
        { label: "Quality", score: 91, tone: "green", metric: "Test clarity", value: "Strong" },
        { label: "Stability", score: 58, tone: "amber", metric: "Flaky paths", value: "2" },
        { label: "Speed", score: 44, tone: "amber", metric: "QA throughput", value: "Steady" },
        { label: "AI Leverage", score: 61, tone: "amber", metric: "Summary quality", value: "Good" },
      ],
      checks: [
        { label: "Review coverage", value: "96%", tone: "green" },
        { label: "Flaky tests", value: "2 open", tone: "amber" },
        { label: "Critical findings", value: "0", tone: "green" },
        { label: "Release risk", value: "Low-med", tone: "amber" },
      ],
      insight: "Pulse is positive on quality for Billing Agent QA, while the shareable note stays focused on the two flaky test paths.",
      signals: [
        { category: "Quality", message: "Regression notes show critical paths passing across billing states.", period: "Nov 8", confidence: "92%" },
        { category: "Stability", message: "Two flaky tests are isolated to recovery edge cases.", period: "Nov 7", confidence: "69%" },
        { category: "Speed", message: "QA throughput is steady while release waits on sign-off.", period: "Nov 6", confidence: "74%" },
      ],
    },
  },
  "PP-149": {
    launchpadUrl: "https://launchpad.york.ie/patriot-pay/mobile-intake",
    designTitle: "Mobile intake flow",
    designSummary: "Approved mobile intake concept is ready, but engineering has not started until active sprint capacity opens.",
    approvalText: "Design is approved and queued; development can start once the current build clears QA.",
    designs: [
      { title: "Mobile intake start", status: "Approved", owner: "Amy M.", updated: "Nov 3", note: "Client approved initial mobile intake concept." },
      { title: "Eligibility question flow", status: "Approved", owner: "Amy M.", updated: "Nov 4", note: "Conditional question path is ready for engineering." },
      { title: "Payment plan handoff", status: "Queued", owner: "Jake L.", updated: "Nov 8", note: "Design approved but engineering has not started." },
    ],
    pulse: {
      dimensions: [
        { label: "Quality", score: 74, tone: "green", metric: "Spec readiness", value: "Ready" },
        { label: "Stability", score: 70, tone: "green", metric: "Known risks", value: "Low" },
        { label: "Speed", score: 18, tone: "red", metric: "Start status", value: "Queued" },
        { label: "AI Leverage", score: 42, tone: "amber", metric: "Prompt reuse", value: "TBD" },
      ],
      checks: [
        { label: "Review coverage", value: "Pending", tone: "amber" },
        { label: "Flaky tests", value: "N/A", tone: "green" },
        { label: "Critical findings", value: "0", tone: "green" },
        { label: "Release risk", value: "Not started", tone: "amber" },
      ],
      insight: "Pulse treats Mobile Intake as approved but not yet active, so the main visible signal is queue status rather than code risk.",
      signals: [
        { category: "Quality", message: "Spec readiness is strong because Launchpad flows are approved.", period: "Nov 8", confidence: "81%" },
        { category: "Speed", message: "Work is intentionally queued behind active regression work.", period: "Nov 8", confidence: "76%" },
        { category: "AI Leverage", message: "Prompt reuse will be defined once implementation starts.", period: "Next sprint", confidence: "52%" },
      ],
    },
  },
  "PP-118": {
    launchpadUrl: "https://launchpad.york.ie/patriot-pay/postgres-migration",
    designTitle: "Migration readiness plan",
    designSummary: "Completed technical plan for the PostgreSQL migration, including rollout checkpoints and recovery steps.",
    approvalText: "This roadmap item is closed and the work has already shipped.",
    designs: [
      { title: "Migration rollout plan", status: "Approved", owner: "Pierre H.", updated: "Oct 18", note: "Rollout path, validation checkpoints, and fallback handling were approved before release." },
      { title: "Infrastructure cost view", status: "Approved", owner: "Jake L.", updated: "Oct 21", note: "Cost impact summary was reviewed after migration completion." },
    ],
    releaseNote: {
      label: "Released",
      title: "PostgreSQL migration complete",
      date: "Oct 22",
      body: "Completed the database migration that reduced infrastructure cost and created a cleaner foundation for upcoming product work.",
      bullets: ["Infrastructure cost reduced by 35%.", "Migration completed with no customer-facing downtime.", "Mobile intake work is now unblocked by the new data layer."],
    },
    pulse: {
      dimensions: [
        { label: "Quality", score: 92, tone: "green", metric: "Release quality", value: "Strong" },
        { label: "Stability", score: 88, tone: "green", metric: "Rollback events", value: "0" },
        { label: "Speed", score: 76, tone: "green", metric: "Delivery", value: "Complete" },
        { label: "AI Leverage", score: 54, tone: "amber", metric: "Summary use", value: "Partial" },
      ],
      checks: [
        { label: "Review coverage", value: "98%", tone: "green" },
        { label: "Flaky tests", value: "0", tone: "green" },
        { label: "Critical findings", value: "0", tone: "green" },
        { label: "Release risk", value: "Closed", tone: "green" },
      ],
      insight: "Pulse shows this migration closed cleanly, with no production instability after release.",
      signals: [
        { category: "Quality", message: "Release review completed with no critical findings.", period: "Oct 22", confidence: "94%" },
        { category: "Stability", message: "No rollback events or customer-facing incidents were reported.", period: "Oct 23", confidence: "91%" },
        { category: "Speed", message: "Delivery finished within the planned release window.", period: "Oct 22", confidence: "84%" },
      ],
    },
  },
  "PP-160": {
    launchpadUrl: "https://launchpad.york.ie/patriot-pay/analytics-dashboard",
    designTitle: "Analytics dashboard concept",
    designSummary: "Future planning concept for customer-facing usage and billing performance analytics.",
    approvalText: "This is in the parking lot for future planning and is not ready for development yet.",
    designs: [
      { title: "Analytics dashboard concept", status: "Parking lot", owner: "York team", updated: "Nov 8", note: "Early concept only; discovery will continue after active billing workflow work stabilizes." },
    ],
    pulse: {
      dimensions: [
        { label: "Quality", score: 38, tone: "amber", metric: "Definition", value: "Early" },
        { label: "Stability", score: 34, tone: "amber", metric: "Known risks", value: "Unknown" },
        { label: "Speed", score: 8, tone: "red", metric: "Start status", value: "Parking lot" },
        { label: "AI Leverage", score: 28, tone: "amber", metric: "Discovery", value: "TBD" },
      ],
      checks: [
        { label: "Review coverage", value: "N/A", tone: "amber" },
        { label: "Flaky tests", value: "N/A", tone: "green" },
        { label: "Critical findings", value: "N/A", tone: "green" },
        { label: "Release risk", value: "Future", tone: "amber" },
      ],
      insight: "Pulse marks this as future planning because engineering has not started and requirements are still being shaped.",
      signals: [
        { category: "Quality", message: "Discovery is early, so quality is based on definition readiness rather than code.", period: "Future", confidence: "58%" },
        { category: "Speed", message: "No sprint capacity is assigned yet.", period: "Future", confidence: "72%" },
      ],
    },
  },
};

function updateTypeLabel(type) {
  if (type === "done") return "Done";
  if (type === "open") return "Open";
  return "Note";
}

const roadmapCategoryLabels = {
  active: "Active",
  closed: "Closed",
  future: "Parking lot",
};

const roadmapStatusFilters = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "closed", label: "Closed" },
  { id: "future", label: "Future" },
];

function TeamAvatars({ team, trackId, openDropdown, setOpenDropdown }) {
  if (!team.length) {
    return (
      <span style={{ fontSize: "11px", color: "var(--text-4)", fontStyle: "italic" }}>
        No team assigned
      </span>
    );
  }

  const show = team.slice(0, 2);
  const rest = team.slice(2);
  const moreText = rest.length > 0 ? `+${rest.length}` : "···";

  return (
    <div className="track-team">
      {show.map((member) => (
        <div
          className="t-avatar"
          key={member.name}
          title={member.name}
          style={{ background: member.bg, color: member.color }}
        >
          {member.initials}
        </div>
      ))}
      <div
        className="t-more"
        id={`more-${trackId}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpenDropdown((current) => (current === trackId ? null : trackId));
        }}
      >
        {moreText}
        <div className={`t-dropdown ${openDropdown === trackId ? "open" : ""}`} id={`drop-${trackId}`}>
          {team.map((member) => (
            <div className="t-drop-row" key={`${trackId}-${member.name}`}>
              <div className="t-drop-avatar" style={{ background: member.bg, color: member.color }}>
                {member.initials}
              </div>
              <div>
                <div className="t-drop-name">{member.name}</div>
                <div className="t-drop-role">{member.role}</div>
              </div>
              <div className="t-drop-alloc">{member.alloc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourceAllocation({ track }) {
  const [resourcesOpen, setResourcesOpen] = useState(false);

  if (!track?.team?.length) return null;

  const show = track.team.slice(0, 2);
  const rest = track.team.slice(2);
  const moreText = rest.length > 0 ? `+${rest.length}` : "···";
  const resourceTitle = track.team.map((member) => `${member.name} · ${member.role} · ${member.alloc}`).join("\n");

  return (
    <div className="detail-resource-team" title={resourceTitle} aria-label="Allocated resources">
      <div className="track-team">
        {show.map((member) => (
          <div
            className="t-avatar"
            key={`${track.id}-${member.name}`}
            title={`${member.name} · ${member.role} · ${member.alloc}`}
            style={{ background: member.bg, color: member.color }}
          >
            {member.initials}
          </div>
        ))}
        <div
          className="t-more"
          title={resourceTitle}
          onClick={(event) => {
            event.stopPropagation();
            setResourcesOpen((current) => !current);
          }}
        >
          {moreText}
          <div className={`t-dropdown ${resourcesOpen ? "open" : ""}`}>
            {track.team.map((member) => (
              <div className="t-drop-row" key={`${track.id}-detail-${member.name}`}>
                <div className="t-drop-avatar" style={{ background: member.bg, color: member.color }}>
                  {member.initials}
                </div>
                <div>
                  <div className="t-drop-name">{member.name}</div>
                  <div className="t-drop-role">{member.role}</div>
                </div>
                <div className="t-drop-alloc">{member.alloc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationSetupPage({
  onBack,
  onSave,
  mode = "development",
  options = integrationOptions,
  defaultSelected = ["launchpad", "pulse", "jira"],
}) {
  const [customerType, setCustomerType] = useState("york");
  const [selectedIntegrations, setSelectedIntegrations] = useState(() => new Set(defaultSelected));
  const isMarketing = mode === "marketing";
  const isYorkCustomer = customerType === "york";
  const visibleOptions = isMarketing && isYorkCustomer ? [gtmDashboardAccessOption] : options;
  const selectedVisibleOptions = visibleOptions.filter((integration) => selectedIntegrations.has(integration.id));
  const selectedCount = selectedVisibleOptions.length;
  const selectedTotal = visibleOptions.reduce((sum, integration) => (
    selectedIntegrations.has(integration.id) ? sum + integration.price : sum
  ), 0);
  const yorkProducts = visibleOptions.filter((integration) => integration.featured);
  const externalConnectors = visibleOptions.filter((integration) => !integration.featured);
  const primaryOptions = yorkProducts.length ? yorkProducts : visibleOptions;
  const secondaryOptions = yorkProducts.length ? externalConnectors : [];
  const previewOptions = isMarketing && isYorkCustomer ? marketingIntegrationOptions.slice(0, 4) : visibleOptions.slice(0, 4);
  const setupCopy = isMarketing
    ? {
      eyebrow: "Marketing setup",
      title: "Choose how Fuel connects your marketing data",
      subtitle: "No Marketing snapshot is shown until GTM dashboard access or marketing data sources are connected.",
      heroTitle: "Your Marketing view starts after Fuel knows where traffic, paid, social, and SEO data should come from.",
      heroBody: "York IE customers can request GTM dashboard access. Fuel-only customers can connect individual marketing sources as paid add-ons.",
      unlockTitle: "What unlocks after setup",
      unlockBody: "Traffic summaries, paid media performance, organic search trends, channel mix, and recommended next actions.",
      primaryLabel: isYorkCustomer ? "York IE access" : "Marketing connectors",
      primaryTitle: isYorkCustomer ? "Request your managed GTM dashboard" : "Select your marketing data sources",
      primaryHint: isYorkCustomer ? "York IE customers can request access to the managed GTM dashboard." : "Choose the channels you want Fuel to summarize.",
      secondaryLabel: "Additional connectors",
      secondaryTitle: "Connect more marketing systems",
      secondaryHint: "Add more sources as your marketing stack expands.",
      selectedLabel: "selected for Marketing",
      saveYork: "Request GTM dashboard access",
      saveFuel: "Save marketing connectors",
    }
    : {
      eyebrow: "Development setup",
      title: "Choose how Fuel connects your product workflow",
      subtitle: "No development lifecycle intelligence is shown until at least one delivery integration is connected.",
      heroTitle: "Fuel turns your development lifecycle into analysis, signals, and playbooks.",
      heroBody: "Connect Launchpad, Pulse, Jira, or Linear so Fuel can summarize what changed, identify risk, show release readiness, and recommend playbooks based on your product delivery activity.",
      unlockTitle: "What unlocks after setup",
      unlockBody: "Detailed analysis, lifecycle signals, release readiness, design approvals, quality summaries, and recommended playbooks.",
      primaryLabel: "York IE products",
      primaryTitle: "Built to power your Journey view",
      primaryHint: isYorkCustomer ? "Included as setup requests for York IE services customers." : "Available as Fuel product subscriptions.",
      secondaryLabel: "External connectors",
      secondaryTitle: "Connect the systems your team already uses",
      secondaryHint: "Use Jira or Linear to bring roadmap, sprint, and issue signals into Fuel.",
      selectedLabel: "selected for Development",
      saveYork: "Submit setup request",
      saveFuel: "Save selected integrations",
    };

  function toggleIntegration(integrationId) {
    setSelectedIntegrations((current) => {
      const next = new Set(current);
      if (next.has(integrationId)) {
        next.delete(integrationId);
      } else {
        next.add(integrationId);
      }
      return next;
    });
  }

  function chooseCustomerType(type) {
    setCustomerType(type);
    if (isMarketing) {
      setSelectedIntegrations(new Set(type === "york" ? ["gtm-dashboard"] : options.slice(0, 3).map((integration) => integration.id)));
    }
  }

  function renderMarketplaceCard(integration, compact = false) {
    const selected = selectedIntegrations.has(integration.id);

    return (
      <button
        className={`marketplace-app-card ${compact ? "compact" : ""} ${selected ? "selected" : ""}`}
        key={integration.id}
        onClick={() => toggleIntegration(integration.id)}
      >
        <div className="marketplace-card-art">
          <div className="integration-logo" style={{ background: `${integration.color}22`, color: integration.color }}>
            {integration.icon}
          </div>
          <div className={`integration-check ${selected ? "selected" : ""}`}>{selected ? "✓" : "+"}</div>
        </div>
        <div className="marketplace-card-body">
          <span>{integration.productType}</span>
          <strong>{integration.name}</strong>
          <p>{integration.description}</p>
          {!compact ? (
            <div className="marketplace-tags">
              {integration.bullets.map((bullet) => <em key={`${integration.id}-${bullet}`}>{bullet}</em>)}
            </div>
          ) : null}
        </div>
        <div className="marketplace-card-footer">
          <span>{isYorkCustomer ? "Request setup" : `$${integration.price}/mo`}</span>
          <strong>{selected ? "Selected" : "Add"}</strong>
        </div>
      </button>
    );
  }

  return (
    <div className="integration-page">
      <section className="marketplace-top">
        <div className="marketplace-topbar">
          <button className="marketplace-back" onClick={onBack}>‹ Back</button>
          <div>
            <h2>Marketplace</h2>
            <div className="marketplace-tabs">
              <span className="active">Recommended</span>
              <span>{isMarketing ? "Marketing" : "Development"}</span>
              <span>York IE products</span>
              <span>Connectors</span>
            </div>
          </div>
          <div className="marketplace-top-actions">
            <div className="marketplace-search">Search integrations</div>
            <div className="customer-mini-toggle" aria-label="York IE customer">
              <span>York IE customer?</span>
              <button
                className={isYorkCustomer ? "active" : ""}
                onClick={() => chooseCustomerType("york")}
              >
                Yes
              </button>
              <button
                className={!isYorkCustomer ? "active" : ""}
                onClick={() => chooseCustomerType("fuel")}
              >
                No
              </button>
            </div>
          </div>
        </div>

        <div className="marketplace-hero-banner">
          <div>
            <span>{setupCopy.eyebrow}</span>
            <strong>{setupCopy.heroTitle}</strong>
            <p>{setupCopy.heroBody}</p>
          </div>
          <div className="marketplace-hero-preview">
            {previewOptions.map((integration) => (
              <div key={`preview-${integration.id}`} style={{ color: integration.color }}>
                {integration.icon}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketplace-section">
        <div className="marketplace-section-head">
          <div>
            <span>{setupCopy.primaryLabel}</span>
            <strong>{setupCopy.primaryTitle}</strong>
          </div>
          <p>{setupCopy.primaryHint}</p>
        </div>
        <div className={`marketplace-card-row ${primaryOptions.length <= 2 ? "featured" : ""}`}>
          {primaryOptions.map((integration) => renderMarketplaceCard(integration))}
        </div>
      </section>

      {secondaryOptions.length ? (
      <section className="marketplace-section">
        <div className="marketplace-section-head">
          <div>
            <span>{setupCopy.secondaryLabel}</span>
            <strong>{setupCopy.secondaryTitle}</strong>
          </div>
          <p>{setupCopy.secondaryHint}</p>
        </div>
        <div className="marketplace-card-row">
          {secondaryOptions.map((integration) => renderMarketplaceCard(integration, true))}
        </div>
      </section>
      ) : null}

      <section className="marketplace-save-bar">
        <div>
          <span>{selectedCount ? `${selectedCount} ${setupCopy.selectedLabel}` : "No integrations selected"}</span>
          <strong>{isYorkCustomer ? "Connector fee: $0" : `Estimated add-ons: $${selectedTotal}/mo`}</strong>
          {selectedCount ? (
            <p>
              {selectedVisibleOptions.map((integration) => integration.name)
                .join(" + ")}
            </p>
          ) : null}
        </div>
        <button
          className="integration-save-btn"
          disabled={!selectedCount}
          onClick={() => onSave({
            customerType,
            integrations: selectedVisibleOptions.map((integration) => integration.id),
            total: isYorkCustomer ? 0 : selectedTotal,
          })}
        >
          {isYorkCustomer ? setupCopy.saveYork : setupCopy.saveFuel}
        </button>
      </section>
    </div>
  );
}

function ManualDevelopmentWizard({ data, onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(data);
  const steps = ["Dates", "Milestones", "Team"];

  function initialsFromName(name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "TM";
  }

  function updateMilestone(index, key, value) {
    setDraft((current) => ({
      ...current,
      milestones: current.milestones.map((milestone, milestoneIndex) => (
        milestoneIndex === index ? { ...milestone, [key]: value } : milestone
      )),
    }));
  }

  function updateTeam(index, key, value) {
    setDraft((current) => ({
      ...current,
      team: current.team.map((member, memberIndex) => (
        memberIndex === index
          ? { ...member, [key]: value, initials: key === "name" ? initialsFromName(value) : member.initials }
          : member
      )),
    }));
  }

  return (
    <div className="manual-modal-backdrop">
      <div className="manual-modal" role="dialog" aria-modal="true" aria-label="Edit development tracking">
        <div className="manual-modal-head">
          <div>
            <span>Manual tracking</span>
            <strong>Edit development plan</strong>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="manual-wizard-steps">
          {steps.map((label, index) => (
            <button className={step === index ? "active" : ""} key={label} onClick={() => setStep(index)}>
              {index + 1}. {label}
            </button>
          ))}
        </div>

        {step === 0 ? (
          <div className="manual-form-grid">
            <label>
              <span>Start date</span>
              <input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} />
            </label>
            <label>
              <span>MVP release</span>
              <input type="date" value={draft.mvpDate} onChange={(event) => setDraft({ ...draft, mvpDate: event.target.value })} />
            </label>
            <label>
              <span>End date / final release</span>
              <input type="date" value={draft.releaseDate} onChange={(event) => setDraft({ ...draft, releaseDate: event.target.value })} />
            </label>
            <label>
              <span>Progress</span>
              <input type="number" min="0" max="100" value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value) })} />
            </label>
            <label className="wide">
              <span>Summary</span>
              <textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="manual-list-editor">
            {draft.milestones.map((milestone, index) => (
              <div className="manual-editor-card" key={`milestone-${index}`}>
                <label>
                  <span>Milestone</span>
                  <input value={milestone.label} onChange={(event) => updateMilestone(index, "label", event.target.value)} />
                </label>
                <label>
                  <span>Progress</span>
                  <input type="number" min="0" max="100" value={milestone.progress} onChange={(event) => updateMilestone(index, "progress", Number(event.target.value))} />
                </label>
                <label>
                  <span>Milestone date</span>
                  <input type="date" value={milestone.date || ""} onChange={(event) => updateMilestone(index, "date", event.target.value)} />
                </label>
                <label className="wide">
                  <span>Comment</span>
                  <textarea value={milestone.comment} onChange={(event) => updateMilestone(index, "comment", event.target.value)} />
                </label>
              </div>
            ))}
            <button
              className="manual-add-row"
              onClick={() => setDraft((current) => ({
                ...current,
                milestones: [...current.milestones, { label: "New milestone", progress: 0, date: current.mvpDate, comment: "Add a short update." }],
              }))}
            >
              + Add milestone
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="manual-list-editor">
            {draft.team.map((member, index) => (
              <div className="manual-editor-card team" key={`member-${index}`}>
                <label>
                  <span>Name</span>
                  <input value={member.name} onChange={(event) => updateTeam(index, "name", event.target.value)} />
                </label>
                <label>
                  <span>Role</span>
                  <input value={member.role} onChange={(event) => updateTeam(index, "role", event.target.value)} />
                </label>
                <label>
                  <span>Allocation</span>
                  <input value={member.alloc} onChange={(event) => updateTeam(index, "alloc", event.target.value)} />
                </label>
              </div>
            ))}
            <button
              className="manual-add-row"
              onClick={() => setDraft((current) => ({
                ...current,
                team: [
                  ...current.team,
                  {
                    initials: "TM",
                    bg: "linear-gradient(135deg,#8B76D4,#5040A4)",
                    color: "#fff",
                    name: "Team Member",
                    role: "Role",
                    alloc: "50%",
                  },
                ],
              }))}
            >
              + Add team member
            </button>
          </div>
        ) : null}

        <div className="manual-modal-actions">
          <button className="journey-soft-btn" onClick={onClose}>Cancel</button>
          {step > 0 ? <button className="journey-soft-btn" onClick={() => setStep(step - 1)}>Back</button> : null}
          {step < steps.length - 1 ? (
            <button className="journey-primary-btn" onClick={() => setStep(step + 1)}>Next</button>
          ) : (
            <button className="journey-primary-btn" onClick={() => onSave(draft)}>Save plan</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ManualDevelopmentSummary({ data, onBack, onEdit }) {
  return (
    <div className="development-page">
      <div className="detail-page-header">
        <button className="back-btn" onClick={onBack}>‹ Back to journey</button>
        <div className="detail-title-row">
          <div>
            <div className="detail-eyebrow">Development · Manual tracking</div>
            <div className="detail-title">Development Summary</div>
            <div className="detail-subtitle">Milestones, dates, team, and progress are maintained manually.</div>
          </div>
          <button className="manual-edit-btn" onClick={onEdit}>Edit plan</button>
        </div>
      </div>

      <section className="manual-summary-panel">
        <div className="manual-summary-hero">
          <div>
            <span>Action plan</span>
            <h3>MVP release is targeted for {data.mvpDate}, with final release on {data.releaseDate}</h3>
            <p>{data.summary}</p>
          </div>
          <div className="manual-progress-card">
            <strong>{data.progress}%</strong>
            <span>defined progress</span>
          </div>
        </div>

        <div className="manual-summary-grid">
          <div className="manual-card large">
            <span>Milestones</span>
            {data.milestones.length ? data.milestones.map((milestone) => (
              <div className="manual-milestone-row" key={milestone.label}>
                <div>
                  <strong>{milestone.label}</strong>
                  <p>{milestone.date ? `${milestone.date} · ` : ""}{milestone.comment}</p>
                </div>
                <em>{milestone.progress}%</em>
              </div>
            )) : <p className="manual-empty-copy">No milestones added yet. Use Edit plan to add milestone comments and progress.</p>}
          </div>
          <div className="manual-card">
            <span>Team</span>
            {data.team.length ? data.team.map((member) => (
              <div className="manual-team-row" key={member.name}>
                <div className="t-drop-avatar" style={{ background: member.bg, color: member.color }}>{member.initials}</div>
                <div>
                  <strong>{member.name}</strong>
                  <p>{member.role} · {member.alloc}</p>
                </div>
              </div>
            )) : <p className="manual-empty-copy">No team members defined yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function DevelopmentDetailPage({ onBack }) {
  const canStartDevelopment = developmentDetail.designApproved;
  const developmentTrack = tracks.find((track) => track.id === "rd");
  type QualityWeek = {
    week: string;
    quality: number;
    stability: number;
    speed: number;
    aiLeverage: number;
    risk: string;
    summary: string;
  };
  const [activeRoadmapKey, setActiveRoadmapKey] = useState(developmentDetail.roadmap[0].key);
  const [activeDesignIndex, setActiveDesignIndex] = useState(0);
  const [openDesignNote, setOpenDesignNote] = useState(false);
  const [openQualityWeek, setOpenQualityWeek] = useState<QualityWeek | null>(null);
  const [roadmapSearch, setRoadmapSearch] = useState("");
  const [roadmapStatusFilter, setRoadmapStatusFilter] = useState("active");
  const [activeDevTab, setActiveDevTab] = useState("overview");
  const [openReleaseNoteKey, setOpenReleaseNoteKey] = useState<string | null>(null);
  const [releaseNoteOrigin, setReleaseNoteOrigin] = useState("origin-top");
  const [releaseNoteClosing, setReleaseNoteClosing] = useState(false);
  const [mvpTargetDate, setMvpTargetDate] = useState("2025-07-20");
  const [targetReleaseDate, setTargetReleaseDate] = useState("2025-08-05");
  const activeRoadmap = developmentDetail.roadmap.find((item) => item.key === activeRoadmapKey) || developmentDetail.roadmap[0];
  const activeSignal = roadmapSignals[activeRoadmap.key] || roadmapSignals[developmentDetail.roadmap[0].key];
  const activeDesigns = activeSignal.designs || [];
  const activeDesign = activeDesigns[activeDesignIndex] || activeDesigns[0];
  const openReleaseSignal = openReleaseNoteKey ? roadmapSignals[openReleaseNoteKey] : null;
  const openReleaseRoadmap = openReleaseNoteKey ? developmentDetail.roadmap.find((item) => item.key === openReleaseNoteKey) : null;
  const roadmapStatusCounts = roadmapStatusFilters.reduce((counts, filter) => {
    counts[filter.id] = filter.id === "all"
      ? developmentDetail.roadmap.length
      : developmentDetail.roadmap.filter((item) => item.category === filter.id).length;
    return counts;
  }, {});
  const roadmapCategorySort = { active: 0, closed: 1, future: 2 };
  const filteredRoadmap = developmentDetail.roadmap
    .filter((item) => {
      const search = roadmapSearch.trim().toLowerCase();
      const matchesStatus = roadmapStatusFilter === "all" || item.category === roadmapStatusFilter;
      if (!matchesStatus) return false;
      if (!search) return true;
      return [item.key, item.title, item.status, item.owner, item.due, item.summary].some((value) => value.toLowerCase().includes(search));
    })
    .sort((a, b) => {
      const categoryDiff = roadmapCategorySort[a.category] - roadmapCategorySort[b.category];
      if (categoryDiff !== 0) return categoryDiff;
      return developmentDetail.roadmap.indexOf(a) - developmentDetail.roadmap.indexOf(b);
    });
  const roadmapVersions = ["1.0.6", "1.0.5", "1.0.4"];
  const qualityWeeksByRoadmap = {
    "PP-128": [
      { week: "Nov 4-8", quality: 86, stability: 62, speed: 54, aiLeverage: 64, risk: "Medium", summary: "Review quality is healthy. Stability still has one non-critical flaky handoff test, but no blocker is present for staging." },
      { week: "Oct 28-Nov 1", quality: 82, stability: 58, speed: 49, aiLeverage: 60, risk: "Medium", summary: "The team resolved core handoff review comments and kept build scope contained around exception flows." },
      { week: "Oct 21-25", quality: 78, stability: 55, speed: 46, aiLeverage: 56, risk: "Medium", summary: "Early implementation carried more review churn while the handoff model was being finalized." },
      { week: "Oct 14-18", quality: 74, stability: 60, speed: 42, aiLeverage: 52, risk: "Low-med", summary: "Architecture was stable, but implementation velocity was intentionally slower while design approval completed." },
      { week: "Oct 7-11", quality: 70, stability: 57, speed: 38, aiLeverage: 48, risk: "Medium", summary: "Initial engineering discovery surfaced edge cases around assignment ownership and billing queue states." },
    ],
    "PP-141": [
      { week: "Nov 4-8", quality: 91, stability: 58, speed: 44, aiLeverage: 61, risk: "Low-med", summary: "QA quality is strong and critical paths are passing. Two flaky edge-case tests remain under review." },
      { week: "Oct 28-Nov 1", quality: 88, stability: 54, speed: 47, aiLeverage: 58, risk: "Medium", summary: "Regression coverage improved after billing state updates were clarified in Launchpad." },
      { week: "Oct 21-25", quality: 84, stability: 52, speed: 43, aiLeverage: 54, risk: "Medium", summary: "Manual review queue changes introduced some test instability, now isolated to non-critical flows." },
      { week: "Oct 14-18", quality: 80, stability: 57, speed: 40, aiLeverage: 50, risk: "Medium", summary: "QA scope expanded to include failed claim recovery, slowing throughput temporarily." },
      { week: "Oct 7-11", quality: 76, stability: 61, speed: 39, aiLeverage: 46, risk: "Low-med", summary: "Baseline test suite was set up with no critical quality issues identified." },
    ],
    "PP-149": [
      { week: "Nov 4-8", quality: 74, stability: 70, speed: 18, aiLeverage: 42, risk: "Not started", summary: "Design is ready, but code quality is not yet meaningful because engineering has not started." },
      { week: "Oct 28-Nov 1", quality: 70, stability: 68, speed: 16, aiLeverage: 38, risk: "Queued", summary: "Spec readiness improved after mobile intake flow approval, while implementation stayed queued." },
      { week: "Oct 21-25", quality: 66, stability: 64, speed: 15, aiLeverage: 34, risk: "Queued", summary: "Engineering reviewed feasibility but deferred build work behind active regression priorities." },
      { week: "Oct 14-18", quality: 62, stability: 61, speed: 12, aiLeverage: 30, risk: "Queued", summary: "Early technical notes show low known risk, pending sprint allocation." },
      { week: "Oct 7-11", quality: 58, stability: 58, speed: 10, aiLeverage: 28, risk: "Queued", summary: "Mobile intake remained in discovery, with no production code changes yet." },
    ],
    "PP-118": [
      { week: "Oct 21-25", quality: 92, stability: 88, speed: 76, aiLeverage: 54, risk: "Closed", summary: "Migration closed cleanly with no customer-facing downtime and no rollback events." },
      { week: "Oct 14-18", quality: 88, stability: 82, speed: 68, aiLeverage: 50, risk: "Low", summary: "Release checks were completed before the cutover window." },
      { week: "Oct 7-11", quality: 84, stability: 78, speed: 62, aiLeverage: 46, risk: "Low-med", summary: "Dry-run validation reduced the main migration risks before release." },
    ],
    "PP-160": [
      { week: "Nov 4-8", quality: 38, stability: 34, speed: 8, aiLeverage: 28, risk: "Future", summary: "Analytics dashboard is parked for future planning; requirements are still being shaped." },
      { week: "Oct 28-Nov 1", quality: 34, stability: 30, speed: 8, aiLeverage: 24, risk: "Future", summary: "No engineering sprint capacity is assigned yet." },
    ],
  };
  const qualityWeeks = qualityWeeksByRoadmap[activeRoadmap.key] || qualityWeeksByRoadmap["PP-128"];
  const selectedQualityWeek = openQualityWeek || qualityWeeks[0];
  const selectedQualityWeekIndex = qualityWeeks.findIndex((week) => week.week === selectedQualityWeek.week);
  const previousQualityWeek = qualityWeeks[selectedQualityWeekIndex + 1] || selectedQualityWeek;
  const qualityChartWeeks = [...qualityWeeks].reverse();
  const qualityChartMetrics = [
    { key: "quality", label: "Quality" },
    { key: "stability", label: "Stability" },
    { key: "aiLeverage", label: "AI Leverage" },
    { key: "speed", label: "Speed" },
  ];
  const qualityChartPoints = (metric: keyof Pick<QualityWeek, "quality" | "stability" | "speed" | "aiLeverage">) => {
    const count = Math.max(qualityChartWeeks.length - 1, 1);
    return qualityChartWeeks
      .map((week, index) => {
        const x = 56 + (index * 640) / count;
        const y = 204 - week[metric] * 1.6;
        return `${x},${y}`;
      })
      .join(" ");
  };
  const qualityParameterDetails = [
    {
      key: "quality",
      label: "Quality",
      score: selectedQualityWeek.quality,
      previousScore: previousQualityWeek.quality,
      text: "The quality score reflects review confidence, QA readiness, and whether implementation notes are clear enough to support release decisions. Recent checks show quality is healthy, with review comments and regression notes moving toward shareable release reporting.",
    },
    {
      key: "stability",
      label: "Stability",
      score: selectedQualityWeek.stability,
      previousScore: previousQualityWeek.stability,
      text: "The stability score tracks flaky paths, incident risk, rollback exposure, and whether known issues are contained. Stability remains the main watch area when intermittent failures or non-critical edge cases need to be isolated before release.",
    },
    {
      key: "speed",
      label: "Speed",
      score: selectedQualityWeek.speed,
      previousScore: previousQualityWeek.speed,
      text: "The speed score measures delivery momentum, review throughput, and how quickly work is moving from approved design into engineering and QA. Lower speed usually means scope is intentionally queued or slowed by release-readiness checks.",
    },
    {
      key: "ai",
      label: "AI Leverage",
      score: selectedQualityWeek.aiLeverage,
      previousScore: previousQualityWeek.aiLeverage,
      text: "The AI Leverage score captures how effectively the team is using AI to summarize QA notes, reuse prompts, generate release-ready updates, and turn execution context into useful operating signals.",
    },
  ];
  const overviewUpdates = [
    { source: "Launchpad", title: "Operator Thread workflow approved", date: "Nov 8", detail: "Client approved the core workflow; only small copy polish remains." },
    { source: "Pulse", title: "Quality remains healthy", date: "Nov 8", detail: "Review confidence is strong, with stability as the main watch area." },
    { source: "Jira", title: "Billing Agent QA moved to regression", date: "Nov 7", detail: "Critical paths are passing while two non-critical flaky tests are isolated." },
    { source: "Release", title: "Operator Thread staging note drafted", date: "Nov 6", detail: "Release note is ready for internal review before your rollout." },
    { source: "Team", title: "Mobile Intake remains queued", date: "Nov 5", detail: "Design is approved, but implementation waits for sprint capacity." },
  ];
  const valueStages = ["Foundation", "Acceleration", "Scale", "Optimization"];
  const releaseHighlights = [
    "Release timeline is aligned with the client and reviewed weekly.",
    "Current sprint work is active, with priority refinements being addressed.",
    "Design review is complete for the next release milestone.",
  ];

  function closeReleaseNote() {
    setReleaseNoteClosing(true);
    window.setTimeout(() => {
      setOpenReleaseNoteKey(null);
      setReleaseNoteClosing(false);
    }, 180);
  }

  function toggleReleaseNote(itemKey, index) {
    if (openReleaseNoteKey === itemKey && !releaseNoteClosing) {
      closeReleaseNote();
      return;
    }

    const origin = index === 0 ? "origin-top" : index === filteredRoadmap.length - 1 ? "origin-bottom" : "origin-middle";
    setReleaseNoteOrigin(origin);
    setReleaseNoteClosing(false);
    setOpenReleaseNoteKey(itemKey);
  }

  function selectRoadmap(itemKey) {
    setActiveRoadmapKey(itemKey);
    setActiveDesignIndex(0);
    setOpenDesignNote(false);
    setOpenQualityWeek(null);
  }

  return (
    <div className="development-page">
      <div className="detail-page-header">
        <button className="back-btn" onClick={onBack}>‹ Back to journey</button>
        <div className="detail-title-row">
          <div>
            <div className="detail-eyebrow">Development · York Services</div>
            <div className="detail-title">Latest Development Updates</div>
            <div className="detail-subtitle">Roadmap, Pulse quality signals, and Launchpad design approval for patriotpay.</div>
          </div>
          <div className="detail-title-actions">
            <ResourceAllocation track={developmentTrack} />
            <div className={`dev-gate-pill ${canStartDevelopment ? "approved" : "blocked"}`}>
              {canStartDevelopment ? "Design approved · Development active" : "Waiting on Launchpad approval"}
            </div>
          </div>
        </div>
      </div>

      <div className="dev-tabs">
        {[
          { id: "overview", label: "Overview", sub: "Project" },
          { id: "roadmap", label: "Roadmap", sub: "Strategic" },
          { id: "design", label: "Design Studio", sub: "Launchpad" },
          { id: "quality", label: "Execution Health", sub: "Pulse" },
        ].map((tab) => (
          <button
            className={`dev-tab-btn ${activeDevTab === tab.id ? "active" : ""}`}
            key={tab.id}
            onClick={() => setActiveDevTab(tab.id)}
          >
            <span>{tab.sub}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="dev-tab-panel">
        {activeDevTab === "overview" ? (
          <section className="dev-panel overview-panel">
            <div className="overview-hero">
              <div>
                <span>AI summary · Value Creation Engine</span>
                <h3>You are moving from Acceleration toward Scale</h3>
                <p>Together, we have helped turn your product delivery from founder-led execution into a more repeatable system: approved Launchpad designs are flowing into Jira, Pulse is tracking quality week by week, and release notes are becoming ready to share. The next maturity unlock is proving this delivery cadence can support repeatable growth, whether or not fundraising is the immediate goal.</p>
              </div>
              <div className="overview-score">
                <strong>Stage 2</strong>
                <span>Acceleration</span>
              </div>
            </div>
            <div className="maturity-road">
              {valueStages.map((stage, index) => (
                <div className={`maturity-step ${index < 2 ? "done" : index === 2 ? "current" : ""}`} key={stage}>
                  <span data-step={index + 1}>{index + 1}</span>
                  <strong>{stage}</strong>
                </div>
              ))}
            </div>
            <div className="overview-grid">
              <div className="overview-card">
                <span>What you achieved</span>
                <strong>Reliable delivery</strong>
                <p>Roadmap, design, QA, and release readiness are connected in one operating rhythm.</p>
              </div>
              <div className="overview-card">
                <span>Investment signal</span>
                <strong>Improving</strong>
                <p>Cleaner product cadence and quality tracking make your growth story easier to explain.</p>
              </div>
              <div className="overview-card">
                <span>Market category</span>
                <strong>Healthcare billing</strong>
                <p>Market study should focus on patient billing automation and practice workflow ROI.</p>
              </div>
            </div>
            <div className="overview-timeline">
              <div className="panel-heading">
                <span>Latest Updates</span>
                <strong>Top 5</strong>
              </div>
              {overviewUpdates.map((update) => (
                <div className="overview-update" key={`${update.source}-${update.title}`} style={{ paddingLeft: "12px", paddingRight: "12px" }}>
                  <div className="overview-dot"></div>
                  <div>
                    <span>{update.source} · {update.date}</span>
                    <strong>{update.title}</strong>
                    <p>{update.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeDevTab === "roadmap" ? (
          <section className="dev-panel roadmap-panel roadmap-panel-full">
          <div className="roadmap-strategy-summary">
            <div className="roadmap-strategy-main">
              <span>Action plan</span>
              <h3>MVP release is targeted for 20 Jul, with final release following on 05 Aug</h3>
              <div className="ai-release-summary">
                <span>Summary</span>
                {releaseHighlights.map((highlight) => (
                  <p key={highlight}>{highlight}</p>
                ))}
              </div>
            </div>
            <div className="roadmap-date-card">
              <label>
                <span>MVP release</span>
                <input
                  type="date"
                  value={mvpTargetDate}
                  onChange={(event) => setMvpTargetDate(event.target.value)}
                />
              </label>
              <label>
                <span>Final release</span>
                <input
                  type="date"
                  value={targetReleaseDate}
                  onChange={(event) => setTargetReleaseDate(event.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="panel-heading">
            <span>Jira Module</span>
            <strong>Project Roadmap</strong>
          </div>
          <div className="roadmap-toolbar">
            <div className="roadmap-search">
              <span>⌕</span>
              <input
                value={roadmapSearch}
                onChange={(event) => setRoadmapSearch(event.target.value)}
                placeholder="Search"
              />
            </div>
            <div className="roadmap-filter-bar" aria-label="Roadmap status filter">
              {roadmapStatusFilters.map((filter) => (
                <button
                  className={`roadmap-filter-chip ${filter.id} ${roadmapStatusFilter === filter.id ? "selected" : ""}`}
                  key={filter.id}
                  onClick={() => {
                    setRoadmapStatusFilter(filter.id);
                    setOpenReleaseNoteKey(null);
                    setReleaseNoteClosing(false);
                  }}
                >
                  <span>{filter.label}</span>
                  <strong>{roadmapStatusCounts[filter.id]}</strong>
                </button>
              ))}
            </div>
          </div>
          <div className="release-roadmap-board">
            <div className="release-roadmap-head">
              <span>Planned roadmap</span>
              <span>Version</span>
              <span>Release readiness</span>
            </div>
            <div className="release-roadmap-rows">
              {filteredRoadmap.map((item, index) => {
                const itemSignal = roadmapSignals[item.key];
                const itemReleaseNote = itemSignal?.releaseNote;
                const avgPulse = Math.round(
                  (itemSignal?.pulse?.dimensions || []).reduce((sum, dimension) => sum + dimension.score, 0) /
                  (itemSignal?.pulse?.dimensions || []).length,
                ) || 0;
                const releaseText = item.category === "closed"
                  ? "Released and closed"
                  : item.category === "future"
                    ? "Future planning"
                    : item.status === "Ready for regression"
                      ? "QA sign-off pending"
                      : "Build in progress";
                const designStatus = item.category === "future"
                  ? "Concept only"
                  : item.category === "closed"
                    ? "Approved · shipped"
                    : item.status === "Queued"
                      ? "Approved · queued"
                      : "Approved";
                return (
                  <div className={`release-roadmap-row category-${item.category}`} key={item.key}>
                    <button
                      className={`roadmap-card release-plan-card category-${item.category} ${activeRoadmapKey === item.key ? "active" : ""}`}
                      onClick={() => {
                        selectRoadmap(item.key);
                      }}
                    >
                      <div className="release-card-date">{item.due}</div>
                      <div className="roadmap-top">
                        <span className="roadmap-key">{item.key}</span>
                        <div className="roadmap-tags">
                          <span className={`roadmap-category-pill ${item.category}`}>
                            {roadmapCategoryLabels[item.category]}
                          </span>
                          <span className={`roadmap-status ${item.category}`}>{item.status}</span>
                        </div>
                      </div>
                      <div className="roadmap-title">{item.title}</div>
                      <div className="roadmap-summary">{item.summary}</div>
                      <div className="release-card-actions">
                        <span
                          className="action-chip"
                          data-tooltip="Number of meaningful Jira updates for this roadmap item."
                        >
                          <strong>{index + 2}</strong> Jira updates <i>?</i>
                        </span>
                        <span
                          className="action-chip approved"
                          data-tooltip="Launchpad design approval status. Click to view the design tab."
                          onClick={(event) => {
                            event.stopPropagation();
                            selectRoadmap(item.key);
                            setActiveDevTab("design");
                          }}
                        >
                          <strong>✓</strong> {designStatus} <i>?</i>
                        </span>
                        <span
                          className={`action-chip ${avgPulse >= 70 ? "healthy" : avgPulse >= 45 ? "watch" : "risk"}`}
                          data-tooltip="Pulse quality health for this roadmap item. Click to view code quality."
                          onClick={(event) => {
                            event.stopPropagation();
                            selectRoadmap(item.key);
                            setActiveDevTab("quality");
                          }}
                        >
                          <strong>{avgPulse}</strong> Pulse <i>?</i>
                        </span>
                      </div>
                    </button>
                    <div className={`release-version-rail category-${item.category}`}>
                      <span className="release-dot"></span>
                      <strong>{roadmapVersions[index] || `1.0.${3 - index}`}</strong>
                    </div>
                    <div
                      className={`release-readiness-card category-${item.category} ${activeRoadmapKey === item.key ? "active" : ""}`}
                      onClick={() => selectRoadmap(item.key)}
                    >
                      <span>{roadmapSignals[item.key]?.designTitle || "Launchpad design"}</span>
                      <strong>{releaseText}</strong>
                      <p>{item.owner} · {item.due}</p>
                      {itemReleaseNote ? (
                        <button
                          className="release-note-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectRoadmap(item.key);
                            toggleReleaseNote(item.key, index);
                          }}
                        >
                          {openReleaseNoteKey === item.key ? "Hide release note" : "View release note"}
                        </button>
                      ) : (
                        <div className="release-note-unavailable">Release note not available yet</div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!filteredRoadmap.length ? (
                <div className="roadmap-empty">No roadmap items match this view.</div>
              ) : null}
            </div>
            {openReleaseSignal?.releaseNote ? (
              <aside className={`release-note-panel ${releaseNoteOrigin} ${releaseNoteClosing ? "closing" : ""}`}>
                <button className="release-note-close" onClick={closeReleaseNote}>×</button>
                <span>{openReleaseRoadmap?.key} · {openReleaseSignal.releaseNote.date}</span>
                <h3>{openReleaseSignal.releaseNote.title}</h3>
                <p>{openReleaseSignal.releaseNote.body}</p>
                <div className="release-note-list">
                  {openReleaseSignal.releaseNote.bullets.map((bullet) => (
                    <div key={bullet}>{bullet}</div>
                  ))}
                </div>
              </aside>
            ) : null}
          </div>
        </section>
        ) : null}

        {activeDevTab === "design" ? (
          <section className="dev-panel launchpad-panel">
          <div className="panel-heading">
            <span>Launchpad</span>
            <strong>Design Studio</strong>
          </div>
          <div className="design-hero">
            <div>
              <span>{activeRoadmap.key}</span>
              <h3>{activeSignal.designTitle}</h3>
              <p>{activeSignal.designSummary}</p>
            </div>
            <div className="design-hero-status">
              <strong>{(activeSignal.designs || []).filter((design) => design.status === "Approved").length}/{(activeSignal.designs || []).length}</strong>
              <span>approved</span>
            </div>
          </div>
          <div className={`design-tab-layout ${openDesignNote ? "with-sidebar" : ""}`}>
            <div className="design-tab-list">
              {(activeSignal.designs || []).map((design, index) => (
                <button
                  className={`design-entry release-plan-card ${activeDesignIndex === index ? "active" : ""} ${design.status === "Approved" ? "approved" : design.status === "Revision requested" ? "revision" : "queued"}`}
                  key={design.title}
                  onClick={() => {
                    setActiveDesignIndex(index);
                    setOpenDesignNote(false);
                  }}
                >
                  <div className="release-card-date">{design.updated}</div>
                  <div className="roadmap-top">
                    <span className="roadmap-key">DES-{index + 1}</span>
                    <span className="roadmap-status">{design.status}</span>
                  </div>
                  <div className="roadmap-title">{design.title}</div>
                  <div className="roadmap-summary">{design.note}</div>
                  <div className="release-card-actions">
                    <span className="action-chip"><strong>{design.owner}</strong> Owner</span>
                    <span className={`action-chip ${design.status === "Approved" ? "healthy" : "watch"}`}>
                      <strong>{design.status === "Approved" ? "✓" : "!"}</strong> {design.status}
                    </span>
                    <span className="action-chip approved"><strong>{design.updated}</strong> Updated</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="design-preview-shell">
              <div className="launchpad-top-link">
                <span>Launchpad design</span>
                <a href={activeSignal.launchpadUrl} target="_blank" rel="noreferrer">Open Launchpad ↗</a>
              </div>
              <div className={`launchpad-preview elevated design-preview-variant-${activeDesignIndex}`}>
                <div className="preview-toolbar">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="preview-body">
                  <div className="preview-sidebar"></div>
                  <div className="preview-main">
                    <div className="preview-design-label">{activeDesign?.title || activeSignal.designTitle}</div>
                    <div className="preview-line wide"></div>
                    <div className="preview-line"></div>
                    <div className="preview-cards">
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="design-preview-caption">
                <span>{activeDesign?.status || "Pending"}</span>
                <strong>{activeDesign?.title || activeSignal.designTitle}</strong>
                <p>{activeDesign?.note || activeSignal.designSummary}</p>
                <button onClick={() => setOpenDesignNote(true)}>View design note</button>
              </div>
            </div>
            {openDesignNote && activeDesign ? (
              <aside className="design-note-panel">
                <button className="release-note-close" onClick={() => setOpenDesignNote(false)}>×</button>
                <span>{activeRoadmap.key} · {activeDesign.updated}</span>
                <h3>{activeDesign.title}</h3>
                <p>{activeDesign.note}</p>
                <div className="release-note-list">
                  <div>Approval: {activeDesign.status}</div>
                  <div>Owner: {activeDesign.owner}</div>
                  <div>Release: {activeRoadmap.title}</div>
                </div>
              </aside>
            ) : null}
          </div>
        </section>
        ) : null}

        {activeDevTab === "quality" ? (
          <section className="dev-panel pulse-panel">
          <div className="panel-heading">
            <span>Pulse</span>
            <strong>Execution Health</strong>
          </div>
          <div className={`quality-workspace ${openQualityWeek ? "with-sidebar" : ""}`}>
            <div className="quality-main-area">
              <div className="quality-global-chart">
                <div className="quality-band-legend">
                  <span className="green">Green (65-100)</span>
                  <span className="yellow">Yellow (40-64)</span>
                  <span className="red">Red (0-39)</span>
                  <div className="quality-chart-toggle">
                    <button className="active">Chart</button>
                    <button>Table</button>
                </div>
              </div>
                <div className="quality-global-chart-head">
                  <div>
                    <span>Execution Health trend</span>
                    <strong>All listed weeks · all parameters</strong>
                    </div>
                  <p>Compare Quality, Stability, AI Leverage, and Speed across the weekly tiles below.</p>
                    </div>
                <svg viewBox="0 0 760 250" role="img" aria-label="Execution Health trend across all listed weeks">
                  <rect className="quality-band green" x="56" y="44" width="640" height="56" />
                  <rect className="quality-band yellow" x="56" y="100" width="640" height="40" />
                  <rect className="quality-band red" x="56" y="140" width="640" height="64" />
                  {[100, 75, 50, 25, 0].map((tick) => (
                    <g key={tick}>
                      <text className="quality-axis-label" x="48" y={208 - tick * 1.6}>{tick}</text>
                      <line className="quality-grid-line" x1="56" y1={204 - tick * 1.6} x2="696" y2={204 - tick * 1.6} />
                    </g>
                  ))}
                  <text className="quality-band-label green" x="708" y="61">Green</text>
                  <text className="quality-band-label yellow" x="708" y="125">Yellow</text>
                  <text className="quality-band-label red" x="708" y="164">Red</text>
                  {qualityChartMetrics.map((metric) => (
                    <polyline
                      key={metric.key}
                      className={`trend-line ${metric.key === "aiLeverage" ? "ai" : metric.key}`}
                      points={qualityChartPoints(metric.key as keyof Pick<QualityWeek, "quality" | "stability" | "speed" | "aiLeverage">)}
                    />
                  ))}
                  {qualityChartWeeks.map((week, index) => {
                    const count = Math.max(qualityChartWeeks.length - 1, 1);
                    const x = 56 + (index * 640) / count;
                    return (
                      <g key={week.week}>
                        <line className="quality-week-line" x1={x} y1="44" x2={x} y2="204" />
                        <circle className="quality" cx={x} cy={204 - week.quality * 1.6} r="5" />
                        <circle className="stability" cx={x} cy={204 - week.stability * 1.6} r="5" />
                        <circle className="ai" cx={x} cy={204 - week.aiLeverage * 1.6} r="5" />
                        <circle className="speed" cx={x} cy={204 - week.speed * 1.6} r="5" />
                        <text className="quality-week-label" x={x} y="232">{week.week}</text>
                      </g>
                    );
                  })}
                </svg>
                <div className="quality-chart-legend">
                  {qualityChartMetrics.map((metric) => (
                    <span className={metric.key === "aiLeverage" ? "ai" : metric.key} key={metric.key}>{metric.label}</span>
                  ))}
                </div>
              </div>
              <div className="quality-week-card-list">
                {qualityWeeks.map((week, index) => (
                  <button
                    className={`quality-week-card release-plan-card ${index === 0 ? "featured" : ""} ${openQualityWeek?.week === week.week ? "active" : ""}`}
                    key={week.week}
                    onClick={() => setOpenQualityWeek(week)}
                  >
                    <div className="release-card-date">{week.week}</div>
                    <div className="roadmap-top">
                      <span className="roadmap-key">PULSE</span>
                      <span className="roadmap-status">{week.risk}</span>
                    </div>
                    <div className="roadmap-title">Weekly quality review</div>
                    <div className="roadmap-summary">{week.summary}</div>
                    <div className="release-card-actions">
                      <span className="action-chip healthy"><strong>{week.quality}</strong> Quality</span>
                      <span className={week.stability < 60 ? "action-chip watch" : "action-chip healthy"}><strong>{week.stability}</strong> Stability</span>
                      <span className={week.aiLeverage < 45 ? "action-chip watch" : "action-chip healthy"}><strong>{week.aiLeverage}</strong> AI Leverage</span>
                      <span className={week.speed < 35 ? "action-chip risk" : "action-chip watch"}><strong>{week.speed}</strong> Speed</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {openQualityWeek ? (
              <aside className="quality-summary-panel">
                <button className="release-note-close" onClick={() => setOpenQualityWeek(null)}>×</button>
                <span>{activeRoadmap.key} · {selectedQualityWeek.week}</span>
                <h3>Weekly quality summary</h3>
                <p>{selectedQualityWeek.summary}</p>
                <div className="quality-parameter-detail-grid">
                  {qualityParameterDetails.map((detail) => {
                    const delta = detail.score - detail.previousScore;
                    return (
                      <div className="quality-parameter-detail" key={detail.key}>
                        <div className="quality-parameter-detail-head">
                          <span className={detail.key}>{detail.label}</span>
                          <strong>
                            {detail.score}
                            {delta !== 0 ? (
                              <em className={delta > 0 ? "up" : "down"}>
                                {delta > 0 ? "↗" : "↘"} {Math.abs(delta)}
                              </em>
                            ) : null}
                          </strong>
                  </div>
                        <p>{detail.text}</p>
                  </div>
                    );
                  })}
                </div>
              </aside>
            ) : null}
          </div>
        </section>
        ) : null}

      </div>
    </div>
  );
}

function MarketingDetailPage({ onBack }) {
  const marketingTrack = tracks.find((track) => track.id === "gtm");

  return (
    <div className="marketing-page">
      <div className="detail-page-header">
        <button className="back-btn" onClick={onBack}>‹ Back to journey</button>
        <div className="detail-title-row">
          <div>
            <div className="detail-eyebrow">Marketing · York Services</div>
            <div className="detail-title">Marketing Performance Summary</div>
            <div className="detail-subtitle">A focused view of what is working, what needs attention, and where the full dashboard lives.</div>
          </div>
          <div className="detail-title-actions">
            <ResourceAllocation track={marketingTrack} />
            <a className="marketing-dashboard-link" href={marketingDetail.dashboardUrl} target="_blank" rel="noreferrer">
              Open full dashboard ↗
            </a>
          </div>
        </div>
      </div>

      <section className="marketing-hero">
        <div className="marketing-summary-copy">
          <span>Marketing Snapshot · {marketingDetail.updatedAt}</span>
          <h2>{marketingDetail.headline}</h2>
          <p>{marketingDetail.summary}</p>
        </div>
        <div className="marketing-snapshot-card">
          <div className="marketing-snapshot-group">
            <span>What improved</span>
            {marketingDetail.highlights.map((item) => (
              <div className="marketing-snapshot-row good" key={`${item.source}-${item.text}`}>
                <strong>{item.source}</strong>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
          <div className="marketing-snapshot-group">
            <span>Needs attention</span>
            {marketingDetail.watchItems.map((item) => (
              <div className="marketing-snapshot-row watch" key={`${item.source}-${item.text}`}>
                <strong>{item.source}</strong>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-metric-grid">
        {marketingDetail.metrics.map((metric) => (
          <div className="marketing-metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em className={metric.tone}>{metric.change}</em>
          </div>
        ))}
      </section>

      <section className="marketing-dashboard-grid">
        <div className="marketing-panel wide">
          <div className="panel-heading compact">
            <span>Acquisition funnel</span>
            <strong>Where visitors progress or drop</strong>
          </div>
          <div className="marketing-funnel">
            {marketingDetail.acquisitionFunnel.map((step) => (
              <div className="marketing-funnel-row" key={step.label}>
                <div>
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </div>
                <div className="marketing-funnel-track">
                  <span style={{ width: `${step.value}%` }}></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="marketing-panel">
          <div className="panel-heading compact">
            <span>Channel mix</span>
            <strong>Current demand sources</strong>
          </div>
          <div className="marketing-channel-list">
            {marketingDetail.channelMix.map((channel) => (
              <div className="marketing-channel-row" key={channel.label}>
                <div>
                  <span style={{ background: channel.color }}></span>
                  {channel.label}
                </div>
                <strong>{channel.value}%</strong>
                <div className="marketing-channel-bar">
                  <span style={{ width: `${channel.value}%`, background: channel.color }}></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="marketing-panel">
          <div className="panel-heading compact">
            <span>Dashboard signals</span>
            <strong>Items to review next</strong>
          </div>
          <div className="marketing-opportunity-list">
            {marketingDetail.opportunities.map((opportunity) => (
              <div className="marketing-opportunity" key={opportunity.label}>
                <div>
                  <strong>{opportunity.label}</strong>
                  <p>{opportunity.note}</p>
                </div>
                <span>{opportunity.source}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function JourneyEmptyState({ onConnectIntegrations }) {
  const [view, setView] = useState("story");
  const [marketplaceMode, setMarketplaceMode] = useState("category");
  const [selectedIntegrations, setSelectedIntegrations] = useState(() => new Set(["launchpad", "pulse", "ga4"]));
  const allIntegrations = journeyIntegrationGroups.flatMap((group) => group.options.map((option) => ({ ...option, group: group.label })));
  const selectedCount = selectedIntegrations.size;
  const wizardSteps = [
    { id: "story", label: "Map your path" },
    { id: "services", label: "Choose support" },
    { id: "integrations", label: "Connect systems" },
  ];

  function toggleIntegration(id) {
    setSelectedIntegrations((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderMiniCard(option) {
    const selected = selectedIntegrations.has(option.id);

    return (
      <button className={`journey-mini-integration ${selected ? "selected" : ""}`} key={option.id} onClick={() => toggleIntegration(option.id)}>
        <div className="journey-mini-icon" style={{ color: option.color }}>{option.icon}</div>
        <div>
          <span>{option.productType || option.group}</span>
          <strong>{option.name}</strong>
          <p>{option.description}</p>
        </div>
        <em>{selected ? "✓" : "+"}</em>
      </button>
    );
  }

  return (
    <div className="journey-empty">
      <div className="journey-wizard">
        {wizardSteps.map((step, index) => (
          <button className={`journey-wizard-step ${view === step.id ? "active" : ""}`} key={step.id} onClick={() => setView(step.id)}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
          </button>
        ))}
      </div>

      {view === "story" ? (
        <>
          <section className="journey-empty-hero">
            <div>
              <span>Scorecard starts here</span>
              <h2>York IE helps turn startup activity into an operating system for durable growth.</h2>
              <p>Start with services and playbooks from York IE, or connect your own systems so Fuel can summarize signals across your business.</p>
              <div className="journey-empty-actions">
                <button className="journey-primary-btn" onClick={() => setView("services")}>Explore how York can help</button>
                <button className="journey-soft-btn" onClick={() => setView("integrations")}>I’ll connect my tools for now</button>
              </div>
            </div>
            <div className="journey-orbit" aria-label="York IE journey infographic">
              <div className="journey-orbit-core">
                <span>Fuel</span>
                <strong>AI signals</strong>
              </div>
              {yorkJourneyPaths.map((path, index) => (
                <div className={`journey-orbit-node node-${index + 1}`} key={path.label}>
                  <em>{path.icon}</em>
                  <strong>{path.label}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="journey-comparison-strip">
            <div>
              <span>Before</span>
              <strong>Scattered updates</strong>
              <p>Roadmap, marketing, CRM, and finance signals stay in separate tools.</p>
            </div>
            <div>
              <span>After</span>
              <strong>Guided operating rhythm</strong>
              <p>Signals become analysis, playbooks, service recommendations, and clearer next steps.</p>
            </div>
          </section>
          <section className="journey-roadmap-wrap" aria-label="York IE journey roadmap">
            <div className="journey-roadmap-heading">
              <span>How York IE can pave your Journey</span>
              <strong>One connected operating path across the areas that matter most.</strong>
            </div>
            <div className="journey-roadmap-path">
              <div className="journey-roadmap-line" />
              {yorkJourneyPaths.map((path, index) => (
                <div className={`journey-roadmap-stop stop-${index + 1}`} key={path.label} style={{ animationDelay: `${index * 0.08}s` }}>
                  <div className="journey-roadmap-marker">
                    <span>{path.icon}</span>
                  </div>
                  <div className="journey-roadmap-card">
                    <strong>{path.label}</strong>
                    <p>{path.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {view === "services" ? (
        <section className="journey-services">
          <div className="journey-services-hero">
            <div>
              <span>York IE services</span>
              <h2>Pick the chapter where York IE can move you faster.</h2>
              <p>Each bundle turns work already happening in your company into clearer decisions, cleaner execution, and stronger investor-ready operating rhythm.</p>
            </div>
            <div className="journey-impact-graphic">
              {["Assess", "Build", "Measure", "Scale"].map((step, index) => (
                <div key={step}>
                  <em>{index + 1}</em>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="journey-bundle-grid">
            {yorkServiceBundles.map((bundle, index) => (
              <div className="journey-bundle-card" key={bundle.title} style={{ animationDelay: `${index * 0.07}s` }}>
                <div className="journey-bundle-art">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <i />
                </div>
                <span>{bundle.focus}</span>
                <strong>{bundle.title}</strong>
                <p>{bundle.detail}</p>
                <button>Contact us</button>
              </div>
            ))}
          </div>
          <div className="journey-service-footer">
            <button className="journey-soft-btn" onClick={() => setView("story")}>Back to overview</button>
            <button className="journey-primary-btn" onClick={() => setView("integrations")}>I’ll connect tools first</button>
          </div>
        </section>
      ) : null}

      {view === "integrations" ? (
        <section className="journey-integration-market">
          <div className="journey-integrations-hero">
            <div>
              <span>Self-serve integrations</span>
              <h2>Connect the systems you already use and let Fuel turn activity into signals.</h2>
              <p>Start with a few trusted sources. Fuel can organize development, marketing, revenue, and finance activity into your Journey.</p>
              <div className="journey-market-toggle">
                <button className={marketplaceMode === "category" ? "active" : ""} onClick={() => setMarketplaceMode("category")}>By category</button>
                <button className={marketplaceMode === "all" ? "active" : ""} onClick={() => setMarketplaceMode("all")}>All integrations</button>
              </div>
            </div>
            <div className="journey-connect-graphic" aria-label="Integration signal graphic">
              <div className="connect-source-stack">
                <span>Jira</span>
                <span>GA4</span>
                <span>CRM</span>
                <span>Finance</span>
              </div>
              <div className="connect-flow-lines">
                <i />
                <i />
                <i />
              </div>
              <div className="connect-fuel-card">
                <span>Fuel</span>
                <strong>{selectedCount} selected</strong>
                <em>Signals + playbooks</em>
                <div className="connect-spark-bars">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </div>
          {marketplaceMode === "category" ? (
            journeyIntegrationGroups.map((group) => (
              <div className="journey-integration-group" key={group.id}>
                <h3>{group.label}</h3>
                <div className="journey-mini-grid">{group.options.map(renderMiniCard)}</div>
              </div>
            ))
          ) : (
            <div className="journey-mini-grid all">{allIntegrations.map(renderMiniCard)}</div>
          )}
          <div className="marketplace-save-bar">
            <div>
              <span>{selectedCount ? `${selectedCount} selected` : "No integrations selected"}</span>
              <strong>Start Journey with connected data sources</strong>
            </div>
            <button className="integration-save-btn" disabled={!selectedCount} onClick={() => onConnectIntegrations(selectedIntegrations)}>Save integrations</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TrackRow({ track, index, isOpen, onToggle, onOpenDetail, barsAnimated, openDropdown, setOpenDropdown }) {
  const updates = trackUpdates[track.id];
  const [activeMilestone, setActiveMilestone] = useState(null);
  const activeMilestoneDetails = track.milestones.find((milestone) => milestone.label === activeMilestone);
  const activeMilestoneInsight = activeMilestoneDetails ? getMilestoneInsight(track, activeMilestoneDetails) : null;
  const activeMilestonePlaybooks = activeMilestoneInsight ? getMilestonePlaybooks(activeMilestoneInsight) : [];
  const activeMilestoneLeft = activeMilestoneDetails
    ? `${Math.min(Math.max(activeMilestoneDetails.pct, 18), 76)}%`
    : "50%";
  const milestonePopupId = `milestone-popup-${track.id}`;

  useEffect(() => {
    if (!activeMilestone) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") setActiveMilestone(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeMilestone]);

  return (
    <div className={`track ${isOpen ? "open" : ""}`} data-id={track.id} style={{ animationDelay: `${index * 0.08}s` }}>
      <div
        className="track-header"
        onClick={() => {
          if (track.id === "rd") {
            onOpenDetail("development");
            return;
          }
          if (track.id === "gtm") {
            onOpenDetail("marketing");
            return;
          }
          onToggle(track.id);
        }}
      >
        <div className="track-left">
          <div className="track-icon" style={{ background: track.iconBg, color: track.iconColor }}>
            {track.icon}
          </div>
          <div>
            <div className="track-name">
              {track.name} <span className="track-expand-icon">›</span>
            </div>
            <div className="track-sub">{track.sub}</div>
          </div>
        </div>
        <div className="track-right">
          <TeamAvatars
            team={track.team}
            trackId={track.id}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
          />
          <div style={{ width: "1px", height: "18px", background: "var(--border)", margin: "0 8px" }} />
          <div className="track-stat">
            <span>{track.stat.label}</span>&nbsp;<strong>{track.stat.val}</strong>
          </div>
          <div className={`track-health ${track.health}`}>{track.healthLabel}</div>
        </div>
      </div>

      {track.fill === 0 ? (
        <div className="bar-not-started">
          <span>{track.emptyText || "Not yet started · available to engage"}</span>
        </div>
      ) : (
        <div className={`bar-container ${track.manual ? "manual" : ""}`}>
          <div className={`bar-fill ${track.health}`} style={{ width: barsAnimated ? `${track.fill}%` : "0%" }} />
          {track.milestones.map((milestone) => {
            const isMilestoneActive = activeMilestone === milestone.label;

            return (
              <div
                className={`tick ${isMilestoneActive ? "active" : ""}`}
                key={milestone.label}
                style={{ left: `${milestone.pct}%` }}
                role="button"
                tabIndex={0}
                aria-label={`${milestone.label} milestone details`}
                aria-haspopup="dialog"
                aria-expanded={isMilestoneActive}
                aria-controls={isMilestoneActive ? milestonePopupId : undefined}
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveMilestone(current => current === milestone.label ? null : milestone.label);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    setActiveMilestone(current => current === milestone.label ? null : milestone.label);
                  }
                }}
              >
                <span className={`tick-dot ${milestone.done ? "done" : "amber"}`} />
                <span className="tick-label">{milestone.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {activeMilestoneDetails && activeMilestoneInsight ? (
        <>
          <div className="milestone-popup-scrim" />
          <div
            id={milestonePopupId}
            className="milestone-popup"
            style={{ left: activeMilestoneLeft }}
            role="dialog"
            aria-modal="false"
            aria-labelledby={`${milestonePopupId}-title`}
          >
            <div className="milestone-popup-header">
              <span className={`milestone-popup-status ${activeMilestoneDetails.done ? "done" : "next"}`}>
                {activeMilestoneDetails.done ? "Milestone achieved" : "Next milestone"}
              </span>
              <button
                className="milestone-popup-close"
                type="button"
                aria-label="Close milestone details"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveMilestone(null);
                }}
              >
                ×
              </button>
            </div>
            <h3 id={`${milestonePopupId}-title`}>{activeMilestoneDetails.label}</h3>
            <p className="milestone-popup-summary">{activeMilestoneInsight.update}</p>
            <div className="milestone-popup-section">
              <span>Suggested playbooks</span>
              <div className="milestone-playbook-list">
                {activeMilestonePlaybooks.map((playbook, playbookIndex) => (
                  <div className="milestone-playbook-item" key={playbook.title}>
                    <div className="milestone-playbook-number">{playbookIndex + 1}</div>
                    <div>
                      <strong>{playbook.title}</strong>
                      <p>{playbook.next}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="milestone-chips">
        {track.chips.map((chip) => (
          <span className="milestone-chip" key={chip.label}>
            <span className="chip-dot" style={{ background: chip.color }} />
            {chip.label}
          </span>
        ))}
      </div>

      <div className="track-updates">
        {track.manual ? (
          <div className="updates-inner">
            <div>
              <div className="updates-col-label">⬡ Manual milestones</div>
              {track.milestones.map((milestone) => (
                <div className="update-row" key={`${track.id}-manual-${milestone.label}`}>
                  <span className={`update-type ${milestone.done ? "done" : "open"}`}>{milestone.done ? "Done" : "Open"}</span>
                  <span>{milestone.label}</span>
                  <span className="update-date">{milestone.date || `${milestone.progress ?? milestone.pct}%`}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="updates-col-label">◈ Summary</div>
              <div className="update-row">
                <span className="update-type note">Manual</span>
                <span>Progress and team are maintained from the edit plan wizard.</span>
                <span className="update-date">Live</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="updates-inner">
            <div>
              <div className="updates-col-label">⬡ Work items</div>
              {updates.jira.map((row) => (
                <div className="update-row" key={`${track.id}-jira-${row.text}`}>
                  <span className={`update-type ${row.type}`}>{updateTypeLabel(row.type)}</span>
                  <span>{row.text}</span>
                  <span className="update-date">{row.date}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="updates-col-label">◈ Notes & updates</div>
              {updates.notes.map((row) => (
                <div className="update-row" key={`${track.id}-note-${row.text}`}>
                  <span className="update-type note">Note</span>
                  <span>{row.text}</span>
                  <span className="update-date">{row.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type IntelligenceSource = {
  id: string;
  title: string;
  description: string;
  system: string;
  sourceType: string;
  meta: string;
  date: string;
  snippet?: string;
  ref?: string;
};

type IntelligenceItem = {
  id: string;
  type: string;
  text: string;
  highlight: string;
  date: string;
  age: string;
  title: string;
  confidence?: string;
  sources: IntelligenceSource[];
  updatedAtMs?: number;
};

const DATA_ROOM_DOCUMENT_TYPES = [
  { id: "pitch_deck", label: "Pitch deck" },
  { id: "investor_notes", label: "Investor notes" },
  { id: "investment_memo", label: "Investment memo" },
  { id: "board_deck", label: "Board deck" },
  { id: "financial_model", label: "Financial model" },
  { id: "cap_table", label: "Cap table" },
  { id: "product_roadmap", label: "Product roadmap" },
  { id: "customer_contract", label: "Customer contract" },
  { id: "due_diligence", label: "Due diligence pack" },
  { id: "custom", label: "Custom document" },
] as const;

type DataRoomDocumentTypeId = typeof DATA_ROOM_DOCUMENT_TYPES[number]["id"];

type DataRoomFileRecord = {
  id: string;
  name: string;
  typeId: string;
  typeLabel: string;
  format: string;
  uploadedAt: string;
  uploadedAtMs: number;
  source: string;
  intelligenceCount: number;
  intelligenceIds: string[];
  downloadUrl?: string;
};

type DataRoomDocumentSlot = {
  typeId: string;
  typeLabel: string;
  current: DataRoomFileRecord | null;
  history: DataRoomFileRecord[];
};

/** @deprecated Use DataRoomFileRecord — kept for benchmark row compatibility */
type DataRoomFile = {
  id: string;
  name: string;
  type: "pitch_deck" | "benchmark";
  format: string;
  uploadedAt: string;
  source: string;
  intelligenceCount: number;
  intelligenceIds: string[];
};

function slugifyDocumentLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "document";
}

function createInitialDocumentSlots(): DataRoomDocumentSlot[] {
  return DATA_ROOM_DOCUMENT_TYPES
    .filter(type => type.id !== "custom")
    .map(type => ({
      typeId: type.id,
      typeLabel: type.label,
      current: null,
      history: [],
    }));
}

function getDocumentTypeLabel(typeId: string, fallback?: string) {
  const predefined = DATA_ROOM_DOCUMENT_TYPES.find(type => type.id === typeId);
  if (predefined) return predefined.label;
  if (typeId.startsWith("custom:")) return fallback || typeId.slice(7).replace(/-/g, " ");
  return fallback || typeId;
}

function getDisplayDocumentSlots(slots: DataRoomDocumentSlot[]) {
  const predefined = DATA_ROOM_DOCUMENT_TYPES
    .filter(type => type.id !== "custom")
    .map(type => slots.find(slot => slot.typeId === type.id) || {
      typeId: type.id,
      typeLabel: type.label,
      current: null,
      history: [],
    });
  const custom = slots.filter(slot => slot.typeId.startsWith("custom:"));
  return [...predefined, ...custom];
}

function countActiveDocuments(slots: DataRoomDocumentSlot[]) {
  return getDisplayDocumentSlots(slots).filter(slot => slot.current).length;
}

function upsertDocumentSlot(
  slots: DataRoomDocumentSlot[],
  params: {
    typeId: string;
    typeLabel: string;
    file: File;
    source: string;
    intelligenceIds: string[];
    intelligenceCount: number;
  },
): DataRoomDocumentSlot[] {
  const record: DataRoomFileRecord = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: params.file.name,
    typeId: params.typeId,
    typeLabel: params.typeLabel,
    format: getFileFormat(params.file.name),
    uploadedAt: new Date().toLocaleString("en-US"),
    uploadedAtMs: Date.now(),
    source: params.source,
    intelligenceCount: params.intelligenceCount,
    intelligenceIds: params.intelligenceIds,
    downloadUrl: URL.createObjectURL(params.file),
  };

  const slotIndex = slots.findIndex(slot => slot.typeId === params.typeId);
  if (slotIndex >= 0) {
    const slot = slots[slotIndex];
    if (slot.current?.downloadUrl) URL.revokeObjectURL(slot.current.downloadUrl);
    const updated: DataRoomDocumentSlot = {
      ...slot,
      typeLabel: params.typeLabel,
      current: record,
      history: slot.current ? [slot.current, ...slot.history] : slot.history,
    };
    return slots.map((entry, index) => (index === slotIndex ? updated : entry));
  }

  return [...slots, { typeId: params.typeId, typeLabel: params.typeLabel, current: record, history: [] }];
}

function getFileFormat(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "file";
  if (extension === "pdf") return "PDF";
  if (extension === "ppt" || extension === "pptx") return "PowerPoint";
  if (extension === "doc" || extension === "docx") return "Word";
  if (extension === "xls" || extension === "xlsx") return "Excel";
  if (extension === "csv") return "CSV";
  if (extension === "txt" || extension === "md") return "Text";
  return extension.toUpperCase();
}

function createDocumentIntelligence(typeId: string, typeLabel: string, fileName: string): IntelligenceItem[] {
  const uploadedAt = new Date().toLocaleDateString("en-US");
  const docSource: IntelligenceSource = {
    id: `src-doc-${Date.now()}`,
    title: fileName,
    description: `${typeLabel} stored in the private data room and parsed for intelligence generation.`,
    system: typeId,
    sourceType: typeId,
    meta: "Private · Data Room",
    date: uploadedAt,
    snippet: `Parsed from ${typeLabel.toLowerCase()} — fundraising, GTM, product, and operating signals extracted for Fuel intelligence.`,
    ref: `private:${typeId}:${fileName}`,
  };

  const templates: Record<string, { type: string; text: string; highlight: string; title: string }[]> = {
    pitch_deck: [
      { type: "fundraising", text: "Active Seed raise", highlight: "$4.2M raised · $1.5M extension target", title: "Deck positions the company for a Seed extension with enterprise pipeline momentum." },
      { type: "gtm", text: "Enterprise GTM focus", highlight: "Workshop-led onboarding · 3 enterprise pilots", title: "Sales motion emphasizes customer discovery workshops before standardized rollout." },
      { type: "product", text: "Platform roadmap", highlight: "Customer portal and AI reporting on H2 roadmap", title: "Product slides highlight portal standardization to reduce bespoke implementations." },
    ],
    investor_notes: [
      { type: "fundraising", text: "Investor feedback", highlight: "Strong product narrative · clarify CAC payback", title: "Notes highlight investor interest with questions on GTM efficiency and retention proof." },
      { type: "strategic", text: "Positioning gap", highlight: "Differentiate vs legacy billing incumbents", title: "Investors want sharper category framing before the next raise conversation." },
    ],
    investment_memo: [
      { type: "fundraising", text: "Memo thesis", highlight: "Large TAM · underpenetrated mid-market", title: "Memo frames the opportunity as workflow consolidation in a fragmented buyer segment." },
      { type: "finance", text: "Unit economics", highlight: "Payback improving · expansion potential", title: "Financial narrative ties retention expansion to margin improvement over 18 months." },
    ],
    board_deck: [
      { type: "strategic", text: "Board priorities", highlight: "Hit $1M ARR · reduce implementation time", title: "Board deck centers on revenue milestone and delivery efficiency for the next two quarters." },
      { type: "team", text: "Org plan", highlight: "2 GTM hires · 1 senior engineer", title: "Hiring plan weighted toward repeatable enterprise sales and platform stability." },
    ],
    financial_model: [
      { type: "finance", text: "Forecast update", highlight: "Base case 2.1x ARR growth · 18mo runway", title: "Model assumes steady enterprise expansion with controlled burn through year end." },
      { type: "efficiency", text: "Burn profile", highlight: "Burn multiple improving in H2", title: "Efficiency metrics suggest GTM spend converts better after onboarding changes." },
    ],
    cap_table: [
      { type: "fundraising", text: "Ownership snapshot", highlight: "Founders 62% · Seed investors 28%", title: "Cap table supports a clean extension round without heavy dilution pressure." },
    ],
    product_roadmap: [
      { type: "product", text: "Roadmap focus", highlight: "Portal v2 · AI reporting · billing automation", title: "Roadmap prioritizes self-serve workflows that reduce services-heavy implementations." },
    ],
    customer_contract: [
      { type: "gtm", text: "Contract pattern", highlight: "Multi-year enterprise · expansion clause", title: "Contract structure supports land-and-expand with built-in upsell triggers." },
    ],
    due_diligence: [
      { type: "strategic", text: "Diligence themes", highlight: "Security review · revenue quality · churn", title: "Diligence pack focuses on enterprise readiness and retention durability." },
    ],
  };

  const baseKey = typeId.startsWith("custom:") ? "custom" : typeId;
  const rows = templates[baseKey] || templates.pitch_deck;
  const createdAtMs = Date.now();

  return rows.map((row, index) => ({
    id: `intel-doc-${typeId}-${createdAtMs + index}`,
    type: row.type,
    text: row.text,
    highlight: row.highlight,
    date: "2026-q2",
    age: "Just now",
    title: row.title,
    confidence: `${84 - index * 2}%`,
    sources: [docSource],
    updatedAtMs: createdAtMs,
  }));
}

function inferIntelligenceTypeFromDocument(typeId: string): string {
  const baseKey = typeId.startsWith("custom:") ? "custom" : typeId;
  const typeMap: Record<string, string> = {
    pitch_deck: "fundraising",
    investor_notes: "fundraising",
    investment_memo: "fundraising",
    cap_table: "fundraising",
    board_deck: "strategic",
    financial_model: "finance",
    product_roadmap: "product",
    customer_contract: "gtm",
    due_diligence: "strategic",
    custom: "strategic",
  };
  return typeMap[baseKey] || "strategic";
}

function createSourceIntelligence({
  title,
  description,
  document,
}: {
  title: string;
  description: string;
  document?: { typeId: string; typeLabel: string; fileName: string };
}): IntelligenceItem {
  const now = Date.now();
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const documentContext = document ? `${document.typeLabel} · ${document.fileName}` : "";
  const sourceDescription = [trimmedDescription, documentContext].filter(Boolean).join(" · ")
    || (document ? `${document.typeLabel} attached as source context.` : "Manually added source context for intelligence generation.");

  const sources: IntelligenceSource[] = [{
    id: `src-manual-${now}`,
    title: trimmedTitle,
    description: sourceDescription,
    system: document ? document.typeId : "manual",
    sourceType: document ? document.typeId : "private_note",
    meta: document ? `Private · ${document.typeLabel}` : "shreya.g@york.ie",
    date: new Date().toLocaleDateString("en-US"),
    snippet: trimmedDescription || documentContext || trimmedTitle,
    ref: document ? `private:${document.typeId}:${document.fileName}` : `manual:note:${now}`,
  }];

  const highlight = trimmedDescription || documentContext || "Manual source entry";

  return {
    id: `intel-manual-${now}`,
    type: document ? inferIntelligenceTypeFromDocument(document.typeId) : "strategic",
    text: trimmedTitle,
    highlight,
    date: "2026-q2",
    age: "Just now",
    title: trimmedDescription || trimmedTitle,
    confidence: document ? "78%" : "72%",
    sources,
    updatedAtMs: now,
  };
}

type IntelligenceFocus = {
  ids: string[];
  label: string;
};

type BenchmarkFormValues = {
  headcount: string;
  paidCustomers: string;
  arr: string;
  arrGrowth: string;
  nrr: string;
  logoRetention: string;
  grossMargin: string;
  cacPayback: string;
  burnMultiple: string;
  ruleOf40: string;
  cashOnHand: string;
  monthlyBurn: string;
  openToIntros: boolean;
  notableCustomers: string;
  notableHires: string;
  otherUpdates: string;
  biggestChallenges: string;
};

type BenchmarkSubmission = {
  period: string;
  submittedAt: string;
  submittedAtMs: number;
  summary: { arr: string; nrr: string; burnMultiple: string };
  rows: { metric: string; value: string; bot25: string; median: string; top25: string }[];
  intelligenceIds: string[];
  formValues: BenchmarkFormValues;
};

const BENCHMARK_PERIOD = "2026-Q2";

const BENCHMARK_TIMELINE_FILTERS = ["All", "efficiency", "finance", "fundraising", "growth", "retention", "team"] as const;

const WIZARD_DEFAULT_BENCHMARK: BenchmarkFormValues = {
  headcount: "100",
  paidCustomers: "9990",
  arr: "1000",
  arrGrowth: "10",
  nrr: "10",
  logoRetention: "10",
  grossMargin: "100",
  cacPayback: "100",
  burnMultiple: "200",
  ruleOf40: "20",
  cashOnHand: "200",
  monthlyBurn: "200",
  openToIntros: false,
  notableCustomers: "",
  notableHires: "",
  otherUpdates: "",
  biggestChallenges: "",
};

const EMPTY_BENCHMARK_FORM: BenchmarkFormValues = {
  headcount: "",
  paidCustomers: "",
  arr: "",
  arrGrowth: "",
  nrr: "",
  logoRetention: "",
  grossMargin: "",
  cacPayback: "",
  burnMultiple: "",
  ruleOf40: "",
  cashOnHand: "",
  monthlyBurn: "",
  openToIntros: false,
  notableCustomers: "",
  notableHires: "",
  otherUpdates: "",
  biggestChallenges: "",
};

export type OnboardingBenchmarkInput = {
  arr: string;
  arrGrowth: string;
  nrr: string;
  logoRetention: string;
  monthlyBurn: string;
  cashOnHand: string;
  grossMargin: string;
  headcount: string;
  payingCustomers: string;
};

function toBenchmarkFormValues(onboarding: OnboardingBenchmarkInput): BenchmarkFormValues {
  return {
    ...EMPTY_BENCHMARK_FORM,
    arr: onboarding.arr,
    arrGrowth: onboarding.arrGrowth,
    nrr: onboarding.nrr,
    logoRetention: onboarding.logoRetention,
    monthlyBurn: onboarding.monthlyBurn,
    cashOnHand: onboarding.cashOnHand,
    grossMargin: onboarding.grossMargin,
    headcount: onboarding.headcount,
    paidCustomers: onboarding.payingCustomers,
  };
}

function formValuesToOnboardingBenchmark(form: BenchmarkFormValues): OnboardingBenchmarkInput {
  return {
    arr: form.arr,
    arrGrowth: form.arrGrowth,
    nrr: form.nrr,
    logoRetention: form.logoRetention,
    monthlyBurn: form.monthlyBurn,
    cashOnHand: form.cashOnHand,
    grossMargin: form.grossMargin,
    headcount: form.headcount,
    payingCustomers: form.paidCustomers,
  };
}

const BENCHMARK_COHORT_ROWS = [
  { key: "arr", metric: "ARR", bot25: "$150K", median: "$500K", top25: "$1.2M" },
  { key: "arrGrowth", metric: "ARR growth (YoY)", bot25: "120%", median: "200%", top25: "350%" },
  { key: "nrr", metric: "NRR", bot25: "95%", median: "108%", top25: "125%" },
  { key: "logoRetention", metric: "Logo retention", bot25: "80%", median: "88%", top25: "93%" },
  { key: "grossMargin", metric: "Gross margin", bot25: "55%", median: "72%", top25: "82%" },
  { key: "cacPayback", metric: "CAC payback", bot25: "10mo", median: "16mo", top25: "26mo" },
  { key: "burnMultiple", metric: "Burn multiple", bot25: "1.3", median: "2.1", top25: "3.4" },
  { key: "ruleOf40", metric: "Rule of 40", bot25: "—", median: "—", top25: "—" },
  { key: "cashOnHand", metric: "Cash on hand", bot25: "$500K", median: "$1.5M", top25: "$3.0M" },
  { key: "monthlyBurn", metric: "Monthly burn", bot25: "$40K", median: "$80K", top25: "$180K" },
  { key: "paidCustomers", metric: "Paid customers", bot25: "10", median: "40", top25: "150" },
  { key: "headcount", metric: "FTE headcount", bot25: "6", median: "12", top25: "22" },
] as const;

const BENCHMARK_FIELD_COHORT: Record<string, { bot25: string; median: string; top25: string; top10: string }> = {
  headcount: { bot25: "6", median: "11", top25: "22", top10: "45" },
  paidCustomers: { bot25: "10", median: "48", top25: "150", top10: "500" },
  arr: { bot25: "$250K", median: "$500K", top25: "$1.2M", top10: "$2.5M" },
  arrGrowth: { bot25: "120%", median: "180%", top25: "350%", top10: "450%" },
  nrr: { bot25: "95%", median: "105%", top25: "125%", top10: "145%" },
  logoRetention: { bot25: "75%", median: "85%", top25: "93%", top10: "97%" },
  grossMargin: { bot25: "55%", median: "72%", top25: "82%", top10: "88%" },
  cacPayback: { bot25: "30.0m", median: "16.0m", top25: "10.0m", top10: "6.0m" },
  burnMultiple: { bot25: "3.50x", median: "2.10x", top25: "1.40x", top10: "0.50x" },
  ruleOf40: { bot25: "—", median: "—", top25: "—", top10: "—" },
  cashOnHand: { bot25: "$500K", median: "$1.3M", top25: "$3.0M", top10: "$6.0M" },
  monthlyBurn: { bot25: "$50K", median: "$100K", top25: "$200K", top10: "$350K" },
};

function formatRelativeAge(timestampMs: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestampMs) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D AGO`;
}

function getIntelligenceUpdatedAtMs(item: IntelligenceItem, benchmarkSubmittedAtMs?: number | null) {
  if (item.updatedAtMs) return item.updatedAtMs;
  if (item.id.startsWith("intel-bench-") && benchmarkSubmittedAtMs) return benchmarkSubmittedAtMs;
  const stampedId = item.id.match(/-(\d{10,})(?:-\d+)?$/);
  if (stampedId) return Number(stampedId[1]);
  return 0;
}

function formatBenchmarkValue(key: string, raw: string) {
  const value = raw.trim();
  if (!value) return "—";
  if (["arr", "cashOnHand", "monthlyBurn"].includes(key)) {
    if (value.startsWith("$")) return value;
    const num = Number(value.replace(/,/g, ""));
    if (Number.isNaN(num)) return value;
    if (num >= 1000) return `$${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
    return `$${value}`;
  }
  if (["arrGrowth", "nrr", "logoRetention", "grossMargin", "ruleOf40"].includes(key)) {
    return value.endsWith("%") ? value : `${value}%`;
  }
  if (key === "cacPayback") return value.endsWith("mo") ? value : `${value}mo`;
  if (key === "burnMultiple") return value.endsWith("x") ? value : `${value}x`;
  return value;
}

function createBenchmarkIntelligence(values: BenchmarkFormValues, period = BENCHMARK_PERIOD) {
  const submittedAtMs = Date.now();
  const benchmarkSource: IntelligenceSource = {
    id: `src-benchmark-${period.toLowerCase()}`,
    title: `Private benchmark · ${period}`,
    description: "Quarterly private benchmark submission used to overlay Patriot Pay on the cohort distribution.",
    system: "benchmark",
    sourceType: "private_benchmark",
    meta: "Private · Quarterly submission",
    date: new Date(submittedAtMs).toLocaleDateString("en-US"),
    snippet: "Logged through Update this period and stamped to the quarter for tracking changes over time.",
    ref: `private:benchmark:${period.toLowerCase()}`,
  };

  const specs: { key: keyof BenchmarkFormValues; type: string; label: string; format?: (v: string) => string; always?: boolean }[] = [
    { key: "openToIntros", type: "fundraising", label: "Open to investor intros", format: (v) => (v === "true" ? "Yes" : "No"), always: true },
    { key: "arr", type: "growth", label: "ARR", format: (v) => formatBenchmarkValue("arr", v) },
    { key: "logoRetention", type: "retention", label: "Logo retention", format: (v) => formatBenchmarkValue("logoRetention", v) },
    { key: "grossMargin", type: "efficiency", label: "Gross margin (blended)", format: (v) => formatBenchmarkValue("grossMargin", v) },
    { key: "cashOnHand", type: "finance", label: "Cash on hand", format: (v) => formatBenchmarkValue("cashOnHand", v) },
    { key: "monthlyBurn", type: "finance", label: "Monthly net burn", format: (v) => formatBenchmarkValue("monthlyBurn", v) },
    { key: "headcount", type: "team", label: "FTE headcount", format: (v) => v.trim() },
    { key: "arrGrowth", type: "growth", label: "ARR growth (YoY)", format: (v) => formatBenchmarkValue("arrGrowth", v) },
    { key: "cacPayback", type: "efficiency", label: "CAC payback", format: (v) => formatBenchmarkValue("cacPayback", v) },
    { key: "burnMultiple", type: "efficiency", label: "Burn multiple", format: (v) => formatBenchmarkValue("burnMultiple", v) },
    { key: "ruleOf40", type: "efficiency", label: "Rule of 40", format: (v) => formatBenchmarkValue("ruleOf40", v) },
    { key: "nrr", type: "retention", label: "Net revenue retention", format: (v) => formatBenchmarkValue("nrr", v) },
    { key: "paidCustomers", type: "growth", label: "Paid customers", format: (v) => v.trim() },
  ];

  const items: IntelligenceItem[] = specs
    .filter(spec => spec.always || String(values[spec.key]).trim())
    .map(spec => {
      const raw = spec.key === "openToIntros" ? String(values.openToIntros) : String(values[spec.key]);
      const formatted = spec.format!(raw);
      return {
        id: `intel-bench-${spec.key}`,
        type: spec.type,
        text: spec.label,
        highlight: formatted,
        date: period.toLowerCase(),
        age: formatRelativeAge(submittedAtMs),
        title: `${spec.label}: ${formatted}`,
        confidence: "Submitted",
        sources: [benchmarkSource],
        updatedAtMs: submittedAtMs,
      };
    });

  const rows = BENCHMARK_COHORT_ROWS.map(row => ({
    metric: row.metric,
    value: formatBenchmarkValue(row.key, String(values[row.key as keyof BenchmarkFormValues] || "")),
    bot25: row.bot25,
    median: row.median,
    top25: row.top25,
  }));

  const submission: BenchmarkSubmission = {
    period,
    submittedAt: formatRelativeAge(submittedAtMs),
    submittedAtMs,
    summary: {
      arr: formatBenchmarkValue("arr", values.arr),
      nrr: formatBenchmarkValue("nrr", values.nrr),
      burnMultiple: formatBenchmarkValue("burnMultiple", values.burnMultiple),
    },
    rows,
    intelligenceIds: items.map(item => item.id),
    formValues: values,
  };

  return { items, submission };
}

function BenchmarkMetricField({
  label,
  cohortKey,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  cohortKey: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const cohort = BENCHMARK_FIELD_COHORT[cohortKey];
    return (
    <label className="log-private-metric">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {cohort ? (
        <div className="log-private-metric-cohort">
          <div className="signals-bar"><b /><i /></div>
          <div className="signals-benchmark-scale">
            <span>Bot 25% ({cohort.bot25})</span>
            <span>Median ({cohort.median})</span>
            <span>Top 25% ({cohort.top25})</span>
            <span>Top 10% ({cohort.top10})</span>
          </div>
        </div>
      ) : (
        <em className="log-private-no-cohort">no cohort data</em>
      )}
    </label>
  );
}

function LogPrivateDataPage({
  onBack,
  onSubmit,
  initialValues = EMPTY_BENCHMARK_FORM,
}: {
  onBack: () => void;
  onSubmit: (values: BenchmarkFormValues) => void;
  initialValues?: BenchmarkFormValues;
}) {
  const [values, setValues] = useState(initialValues);
  const update = (key: keyof BenchmarkFormValues, next: string | boolean) => {
    setValues(previous => ({ ...previous, [key]: next }));
  };

  return (
    <section className="log-private-data-page">
      <button type="button" className="profile-wizard-back" onClick={onBack}>← Back</button>
      <div className="log-private-data-head">
          <div>
          <span>Private benchmark</span>
          <h2>Log private data · 2026-Q2</h2>
        </div>
            <label className="signals-cohort-select">
          cohort
          <select defaultValue="b2b_saas:seed:us">
            <option value="b2b_saas:seed:us">b2b_saas · seed · us</option>
          </select>
        </label>
      </div>

      <div className="log-private-sections">
        <section className="log-private-section">
          <h3>Scale</h3>
          <div className="log-private-grid">
            <BenchmarkMetricField label="Headcount (FTE)" cohortKey="headcount" value={values.headcount} onChange={(v) => update("headcount", v)} placeholder="100" />
            <BenchmarkMetricField label="Paid customers" cohortKey="paidCustomers" value={values.paidCustomers} onChange={(v) => update("paidCustomers", v)} placeholder="9990" />
            <BenchmarkMetricField label="ARR USD" cohortKey="arr" value={values.arr} onChange={(v) => update("arr", v)} placeholder="1200" />
          </div>
        </section>

        <section className="log-private-section">
          <h3>Growth</h3>
          <BenchmarkMetricField label="ARR growth YoY %" cohortKey="arrGrowth" value={values.arrGrowth} onChange={(v) => update("arrGrowth", v)} placeholder="10" />
        </section>

        <section className="log-private-section">
          <h3>Retention</h3>
          <div className="log-private-grid two">
            <BenchmarkMetricField label="Net revenue retention %" cohortKey="nrr" value={values.nrr} onChange={(v) => update("nrr", v)} placeholder="10" />
            <BenchmarkMetricField label="Logo retention %" cohortKey="logoRetention" value={values.logoRetention} onChange={(v) => update("logoRetention", v)} placeholder="10" />
          </div>
        </section>

        <section className="log-private-section">
          <h3>Efficiency</h3>
          <div className="log-private-grid two">
            <BenchmarkMetricField label="Gross margin %" cohortKey="grossMargin" value={values.grossMargin} onChange={(v) => update("grossMargin", v)} placeholder="100" />
            <BenchmarkMetricField label="CAC payback months" cohortKey="cacPayback" value={values.cacPayback} onChange={(v) => update("cacPayback", v)} placeholder="100" />
            <BenchmarkMetricField label="Burn multiple" cohortKey="burnMultiple" value={values.burnMultiple} onChange={(v) => update("burnMultiple", v)} placeholder="200" />
            <BenchmarkMetricField label="Rule of 40 %" cohortKey="ruleOf40" value={values.ruleOf40} onChange={(v) => update("ruleOf40", v)} placeholder="20" />
          </div>
        </section>

        <section className="log-private-section">
          <h3>Capital</h3>
          <div className="log-private-grid two">
            <BenchmarkMetricField label="Cash on hand USD" cohortKey="cashOnHand" value={values.cashOnHand} onChange={(v) => update("cashOnHand", v)} placeholder="200" />
            <BenchmarkMetricField label="Monthly burn USD" cohortKey="monthlyBurn" value={values.monthlyBurn} onChange={(v) => update("monthlyBurn", v)} placeholder="200" />
          </div>
        </section>

        <section className="log-private-section">
          <h3>Narrative</h3>
          <div className="log-private-narrative">
            <label><span>Notable customer wins</span><textarea value={values.notableCustomers} onChange={(e) => update("notableCustomers", e.target.value)} rows={2} /></label>
            <label><span>Notable hires</span><textarea value={values.notableHires} onChange={(e) => update("notableHires", e.target.value)} rows={2} /></label>
            <label><span>Other updates worth surfacing</span><textarea value={values.otherUpdates} onChange={(e) => update("otherUpdates", e.target.value)} rows={2} /></label>
            <label><span>Biggest challenges</span><textarea value={values.biggestChallenges} onChange={(e) => update("biggestChallenges", e.target.value)} rows={2} /></label>
          </div>
        </section>
      </div>

      <div className="log-private-footer">
        <label className="log-private-intros">
          <input type="checkbox" checked={values.openToIntros} onChange={(e) => update("openToIntros", e.target.checked)} />
          Open to investor intros this quarter
        </label>
        <div className="log-private-footer-actions">
          <button type="button" className="wizard-link">Save draft</button>
          <button type="button" className="wizard-primary" onClick={() => onSubmit(values)}>Submit for 2026-Q2</button>
        </div>
      </div>
    </section>
  );
}

function formatBenchmarkSummaryValue(key: string, raw: string) {
  const formatted = formatBenchmarkValue(key, raw);
  if (key === "burnMultiple") return formatted.replace(/x$/i, "");
  return formatted;
}

function formatBenchmarkTableValue(metric: string, value: string) {
  if (metric === "Burn multiple") return value.replace(/x$/i, "");
  return value;
}

function QuarterlySubmissionPanel({
  submission,
  onEdit,
  highlight = false,
}: {
  submission: BenchmarkSubmission;
  onEdit: () => void;
  highlight?: boolean;
}) {
  return (
    <div className={`quarterly-submission-panel${highlight ? " blink-once" : ""}`}>
      <div className="quarterly-submission-head">
        <div className="quarterly-submission-title-row">
          <strong>Quarterly submission · {submission.period}</strong>
          <span className="quarterly-submission-summary">
            ARR: <b>{submission.summary.arr}</b>
            {" · "}
            NRR: <b>{submission.summary.nrr}</b>
            {" · "}
            Burn multiple: <b>{formatBenchmarkSummaryValue("burnMultiple", submission.formValues.burnMultiple)}</b>
          </span>
        </div>
        <em>Submitted · {submission.submittedAt}</em>
      </div>
      <div className="quarterly-submission-table">
        <div className="quarterly-submission-row head">
          <span>Metric</span>
          <span>Value</span>
          <span>Bot 25%</span>
          <span>Median</span>
          <span>Top 25%</span>
        </div>
        {submission.rows.map(row => (
          <div className="quarterly-submission-row" key={row.metric}>
            <span className="quarterly-submission-metric">{row.metric}</span>
            <strong>{formatBenchmarkTableValue(row.metric, row.value)}</strong>
            <span>{row.bot25}</span>
            <span>{row.median}</span>
            <span>{row.top25}</span>
          </div>
        ))}
      </div>
      <div className="quarterly-submission-foot">
        <span>cohort · b2b_saas:seed:us</span>
        <button type="button" onClick={onEdit}>Edit</button>
      </div>
    </div>
  );
}

function IntelligenceProvenanceSidebar({
  item,
  onClose,
}: {
  item: IntelligenceItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button className="context-sidebar-scrim" aria-label="Close intelligence provenance" onClick={onClose} />
      <aside className="intelligence-provenance-sidebar">
        <div className="provenance-head">
          <strong>Intelligence provenance</strong>
          <button type="button" onClick={onClose}>Close · Esc</button>
        </div>
        <div className="provenance-body">
          <span className="provenance-type">{item.type}</span>
          <h2>{item.text}</h2>
          <p className="provenance-highlight">{item.highlight}</p>
          <div className="provenance-meta-line">
            <time>{item.date}</time>
            {item.confidence ? <span>confidence {item.confidence}</span> : null}
          </div>

          <div className="provenance-snippet-section">
            <span>Supporting snippet</span>
            <blockquote>{item.title}</blockquote>
          </div>

          {item.sources.length > 0 ? (
            <div className="provenance-sources">
              <span className="provenance-sources-label">
                {item.sources.length} source{item.sources.length > 1 ? "s" : ""}
              </span>
              {item.sources.map((source, index) => (
                <div className="provenance-source-block" key={source.id}>
                  <div className="provenance-source-head">
                    <span>
                      Source{item.sources.length > 1 ? ` ${index + 1}` : ""} · {source.system}
                    </span>
                    <span>{source.meta}</span>
                  </div>
                  <div className="provenance-source-title-row">
                    <strong>{source.title}</strong>
                    <time>{source.date}</time>
                  </div>
                  <p className="provenance-source-desc">{source.description}</p>
                  {source.ref ? <code>{source.sourceType} · {source.ref}</code> : null}
                  {source.snippet ? (
                    <blockquote className="provenance-source-snippet">{source.snippet}</blockquote>
                  ) : null}
                  <div className="provenance-source-actions">
                    <button type="button">Show content</button>
                    <button type="button">Open in Private tab →</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="provenance-no-sources">
              <span>No linked sources</span>
              <p>This intelligence was inferred from profile and benchmark context only.</p>
            </div>
          )}

          <div className="provenance-extraction">
            <span>Extraction</span>
            <dl>
              <div><dt>model</dt><dd>us.anthropic.claude-haiku-4-5-20251001-v1:0</dd></div>
              <div><dt>tokens</dt><dd>6453 in · 152 out</dd></div>
              <div><dt>when</dt><dd>12/05/2026, 19:46:23</dd></div>
              <div><dt>run id</dt><dd>arun_8dbc9b8d-65b7-4796-ae8d-fa7ba9e8a321</dd></div>
            </dl>
          </div>
        </div>
      </aside>
    </>
  );
}

function DocumentHistorySidebar({
  slot,
  onClose,
}: {
  slot: DataRoomDocumentSlot;
  onClose: () => void;
}) {
  const versions = slot.current ? [slot.current, ...slot.history] : slot.history;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button className="context-sidebar-scrim" aria-label="Close document history" onClick={onClose} />
      <aside className="document-history-sidebar">
        <div className="provenance-head">
          <div>
            <span className="document-history-sidebar-label">Document history</span>
            <strong>{slot.typeLabel}</strong>
          </div>
          <button type="button" onClick={onClose}>Close · Esc</button>
        </div>
        <div className="document-history-sidebar-body">
          {versions.length ? (
            versions.map((version, index) => (
              <div className="document-history-sidebar-item" key={version.id}>
                <div className="document-history-sidebar-item-head">
                  <span>{index === 0 ? "Latest" : "Archived"}</span>
                  <time>{version.uploadedAt}</time>
                </div>
                <strong>{version.name}</strong>
                <div className="document-history-sidebar-meta">
                  <span>{version.format}</span>
                  <span>{version.source}</span>
                </div>
                {version.intelligenceCount > 0 ? (
                  <p>{version.intelligenceCount} intelligence item{version.intelligenceCount === 1 ? "" : "s"} generated</p>
                ) : null}
                {version.downloadUrl ? (
                  <a className="document-history-download" href={version.downloadUrl} download={version.name}>
                    Download
                  </a>
                ) : null}
              </div>
            ))
          ) : (
            <div className="document-history-sidebar-empty">
              <strong>No uploads yet</strong>
              <p>Previous versions will appear here when you replace this document type.</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function DocumentHistoryButton({
  slot,
  onOpen,
}: {
  slot: DataRoomDocumentSlot;
  onOpen: (slot: DataRoomDocumentSlot) => void;
}) {
  const versions = slot.current ? [slot.current, ...slot.history] : slot.history;
  if (!versions.length) return null;

  return (
    <button
      type="button"
      className="document-history-btn"
      aria-label={`View history for ${slot.typeLabel}`}
      title="Document history"
      onClick={() => onOpen(slot)}
    >
      ⧗
    </button>
  );
}

function DocumentRowActions({
  slot,
  processingTypeId = null,
  onUpload,
  onOpenHistory,
}: {
  slot: DataRoomDocumentSlot;
  processingTypeId?: string | null;
  onUpload: (typeId: string, typeLabel: string, file: File) => void;
  onOpenHistory: (slot: DataRoomDocumentSlot) => void;
}) {
  return (
    <div className="data-room-actions-cell">
      <DocumentRowUploadButton
        slot={slot}
        processingTypeId={processingTypeId}
        onUpload={onUpload}
      />
      <DocumentHistoryButton slot={slot} onOpen={onOpenHistory} />
    </div>
  );
}

function DocumentUploadDropdown({
  processingTypeId = null,
  onUpload,
  scope = "all",
  documentSlots,
  inline = false,
  attachedFileName,
}: {
  processingTypeId?: string | null;
  onUpload: (typeId: string, typeLabel: string, file: File) => void;
  scope?: "all" | "custom-only";
  documentSlots?: DataRoomDocumentSlot[];
  inline?: boolean;
  attachedFileName?: string;
}) {
  const credits = useCreditsOptional();
  const creditBlocked = credits?.generationBlocked ?? false;
  const [open, setOpen] = React.useState(false);
  const [customLabel, setCustomLabel] = React.useState("");
  const [pendingType, setPendingType] = React.useState<{ typeId: string; typeLabel: string } | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isProcessing = Boolean(processingTypeId);
  const isCustomOnly = scope === "custom-only";
  const activeCount = documentSlots ? countActiveDocuments(documentSlots) : 0;
  const customSlots = documentSlots?.filter(slot => slot.typeId.startsWith("custom:") && slot.current) ?? [];

  const getSlotForType = (typeId: string) => documentSlots?.find(slot => slot.typeId === typeId);

  const beginUpload = (typeId: string, typeLabel: string) => {
    if (typeId === "custom" && !customLabel.trim()) return;
    const resolvedTypeId = typeId === "custom" ? `custom:${slugifyDocumentLabel(customLabel.trim())}` : typeId;
    const resolvedLabel = typeId === "custom" ? customLabel.trim() : typeLabel;
    setPendingType({ typeId: resolvedTypeId, typeLabel: resolvedLabel });
    setOpen(false);
    window.setTimeout(() => inputRef.current?.click(), 0);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !pendingType) return;
    onUpload(pendingType.typeId, pendingType.typeLabel, file);
    setPendingType(null);
    setCustomLabel("");
    event.target.value = "";
  };

  const renderTriggerLabel = () => {
    if (isProcessing) return inline ? "Processing…" : "Processing document…";
    if (isCustomOnly) return "Add custom document ▾";
    if (inline && attachedFileName) return "Change document ▾";
    if (inline) return "Document ▾";
    if (activeCount > 0) return `Upload document · ${activeCount} ▾`;
    return "Upload document ▾";
  };

  const renderOption = (typeId: string, label: string) => {
    const slot = getSlotForType(typeId);
    const hasFile = Boolean(slot?.current);

    return (
      <button
        type="button"
        key={typeId}
        className={`document-upload-option${hasFile ? " is-uploaded" : ""}`}
        onClick={() => beginUpload(typeId, label)}
      >
        <span>{label}</span>
        {hasFile ? <span className="document-upload-option-status">on file</span> : null}
      </button>
    );
  };

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number; minWidth: number } | null>(null);

  const updateMenuPosition = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const menuWidth = inline ? 260 : 240;
    const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = 280;
    const top = spaceBelow >= estimatedHeight + 12
      ? rect.bottom + 8
      : Math.max(12, rect.top - estimatedHeight - 8);

    setMenuPosition({
      top,
      left,
      minWidth: Math.max(rect.width, menuWidth),
    });
  }, [inline]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const renderMenuContent = () => {
    if (isCustomOnly) {
      return (
        <div className="document-upload-custom">
          <span>
            Custom document
            {customSlots.length ? <em className="document-upload-section-count">{customSlots.length} on file</em> : null}
          </span>
          <input
            type="text"
            value={customLabel}
            placeholder="Document type name"
            onChange={(event) => setCustomLabel(event.target.value)}
          />
          <button
            type="button"
            disabled={!customLabel.trim()}
            onClick={() => beginUpload("custom", customLabel.trim())}
          >
            Choose file
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="document-upload-menu-head">Attach a document</div>
        {DATA_ROOM_DOCUMENT_TYPES.filter(type => type.id !== "custom").map(type => renderOption(type.id, type.label))}
        {customSlots.map(slot => renderOption(slot.typeId, slot.typeLabel))}
        <div className="document-upload-custom">
          <span>
            Custom document
            {customSlots.length ? <em className="document-upload-section-count">{customSlots.length} on file</em> : null}
          </span>
          <input
            type="text"
            value={customLabel}
            placeholder="Document type name"
            onChange={(event) => setCustomLabel(event.target.value)}
          />
          <button
            type="button"
            disabled={!customLabel.trim()}
            onClick={() => beginUpload("custom", customLabel.trim())}
          >
            Choose file
          </button>
        </div>
      </>
    );
  };

  const menu = open && menuPosition ? (
    <div
      ref={menuRef}
      className={`document-upload-menu document-upload-menu-floating${inline ? " document-upload-menu-inline" : ""}`}
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        minWidth: menuPosition.minWidth,
      }}
    >
      {renderMenuContent()}
    </div>
  ) : null;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
        disabled={isProcessing}
        onChange={handleFileChange}
      />
      <div
        ref={wrapRef}
        className={`document-upload-wrap${isCustomOnly ? " document-upload-wrap-custom-only" : ""}${inline ? " document-upload-wrap-inline" : ""}${open ? " is-open" : ""}`}
      >
        <button
          type="button"
          className={`${inline ? "document-upload-trigger-inline" : isCustomOnly ? "data-room-add-custom-btn" : "signals-private-btn secondary"} document-upload-trigger${isProcessing ? " processing" : ""}${open ? " is-open" : ""}${creditBlocked ? " credit-action-disabled" : ""}`}
          disabled={isProcessing}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => {
            if (creditBlocked) {
              credits?.setPopoverOpen(true);
              return;
            }
            setOpen(current => !current);
          }}
        >
          {renderTriggerLabel()}
        </button>
      </div>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}

function DocumentRowUploadButton({
  slot,
  processingTypeId = null,
  onUpload,
}: {
  slot: DataRoomDocumentSlot;
  processingTypeId?: string | null;
  onUpload: (typeId: string, typeLabel: string, file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isProcessing = processingTypeId === slot.typeId;
  const isBusy = Boolean(processingTypeId);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.md"
        disabled={isBusy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          onUpload(slot.typeId, slot.typeLabel, file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        className={`data-room-upload-btn${isProcessing ? " processing" : ""}`}
        aria-label={slot.current ? `Replace ${slot.typeLabel}` : `Upload ${slot.typeLabel}`}
        title={slot.current ? `Replace ${slot.typeLabel}` : `Upload ${slot.typeLabel}`}
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
      >
        {isProcessing ? "…" : "↑"}
      </button>
    </>
  );
}

function PrivateDataCompactStrip({
  onUpdatePeriod,
}: {
  onUpdatePeriod: () => void;
}) {
  return (
    <div className="signals-private-strip">
      <div className="signals-private-strip-main">
        <div className="signals-private-strip-meta">
          <span className="signals-private-strip-label">Private data · 2026-Q2</span>
          <span className="signals-private-strip-badge">submitted</span>
        </div>
        <label className="signals-cohort-select signals-private-strip-cohort">
              cohort
              <select defaultValue="b2b_saas:seed:us">
                <option value="b2b_saas:growth:us">B2B Saas · Growth · US · n=94</option>
                <option value="b2b_saas:seed:us">B2B Saas · Seed · US · n=147</option>
                <option value="b2b_saas:series_a:us">B2B Saas · Series A · US · n=203</option>
                <option value="dev_tools:series_a:us">Dev Tools · Series A · US · n=41</option>
              </select>
            </label>
          </div>
      <div className="signals-private-strip-actions">
        <button type="button" className="signals-private-btn primary" onClick={onUpdatePeriod}>
          Update this period
        </button>
        </div>
    </div>
  );
}

function DataRoomPage({
  documentSlots,
  processingDocumentTypeId = null,
  onUploadDocument,
  onViewIntelligence,
  onOpenDocumentHistory,
}: {
  documentSlots: DataRoomDocumentSlot[];
  processingDocumentTypeId?: string | null;
  onUploadDocument: (typeId: string, typeLabel: string, file: File) => void;
  onViewIntelligence: (record: DataRoomFileRecord) => void;
  onOpenDocumentHistory: (slot: DataRoomDocumentSlot) => void;
}) {
  const displaySlots = getDisplayDocumentSlots(documentSlots);
  const activeCount = countActiveDocuments(documentSlots);

  return (
    <section className="data-room-page">
      <div className="data-room-head">
        <div>
          <span>Private documents</span>
          <h2>Data Room</h2>
          <p>
            Pitch decks, investor notes, financial models, and other private files Fuel uses to generate intelligence.
            One latest file per type — add custom types from the dropdown when you need more.
          </p>
          </div>
        <div className="data-room-head-actions">
          <DocumentUploadDropdown
            documentSlots={documentSlots}
            processingTypeId={processingDocumentTypeId}
            onUpload={onUploadDocument}
            scope="custom-only"
          />
          <em>{activeCount} active · {displaySlots.length} types</em>
                </div>
                </div>
      <div className="data-room-list">
        <div className="data-room-row data-room-row-head">
          <span>Type</span>
          <span>Latest file</span>
          <span>Format</span>
          <span>Uploaded</span>
          <span>Intelligence</span>
          <span>Actions</span>
        </div>
        {displaySlots.map(slot => (
          <div className={`data-room-row${slot.typeId.startsWith("custom:") ? " data-room-row-custom" : ""}`} key={slot.typeId}>
            <strong>{slot.typeLabel}</strong>
            <span className="data-room-latest">{slot.current?.name || "—"}</span>
            <span>{slot.current?.format || "—"}</span>
            <span>{slot.current?.uploadedAt || "—"}</span>
            <span className="data-room-intelligence">
              {slot.current && slot.current.intelligenceCount > 0 ? (
                <button
                  type="button"
                  className="data-room-intelligence-link"
                  onClick={() => onViewIntelligence(slot.current!)}
                >
                  {slot.current.intelligenceCount} generated →
                </button>
              ) : "—"}
            </span>
            <DocumentRowActions
              slot={slot}
              processingTypeId={processingDocumentTypeId}
              onUpload={onUploadDocument}
              onOpenHistory={onOpenDocumentHistory}
            />
              </div>
            ))}
          </div>
    </section>
  );
}

function SignalsPage({
  isProfileComplete,
  onLogBenchmarkData,
  onUpdatePeriod,
  onLinkConnectors,
  documentSlots,
  processingDocumentTypeId = null,
  onUploadDocument,
  onPersistSourceDocument,
  onOpenDataRoom,
  intelligenceItems,
  setIntelligenceItems,
  intelligenceFocus = null,
  onClearIntelligenceFocus,
  benchmarkSubmission = null,
  onEditBenchmark,
  benchmarkBlinkIds = [],
  activeTourTarget,
}: {
  isProfileComplete: boolean;
  onLogBenchmarkData: () => void;
  onUpdatePeriod: () => void;
  onLinkConnectors: () => void;
  documentSlots: DataRoomDocumentSlot[];
  processingDocumentTypeId?: string | null;
  onUploadDocument: (typeId: string, typeLabel: string, file: File) => void;
  onPersistSourceDocument?: (typeId: string, typeLabel: string, file: File, intelligenceIds: string[]) => void;
  onOpenDataRoom: () => void;
  intelligenceItems: IntelligenceItem[];
  setIntelligenceItems: React.Dispatch<React.SetStateAction<IntelligenceItem[]>>;
  intelligenceFocus?: IntelligenceFocus | null;
  onClearIntelligenceFocus?: () => void;
  benchmarkSubmission?: BenchmarkSubmission | null;
  onEditBenchmark?: () => void;
  benchmarkBlinkIds?: string[];
  activeTourTarget?: string;
}) {
  const timelinePanelRef = useRef<HTMLDivElement>(null);
  const [selectedIntelligenceId, setSelectedIntelligenceId] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logSignalType, setLogSignalType] = useState("");
  const [logPeriod, setLogPeriod] = useState("2026-q2");
  const [logValue, setLogValue] = useState("");
  const [logNote, setLogNote] = useState("");
  const [documentNotice, setDocumentNotice] = useState<string | null>(null);
  const [blinkingIntelligenceIds, setBlinkingIntelligenceIds] = useState<string[]>([]);
  const [activeTimelineFilter, setActiveTimelineFilter] = useState("All");
  const intelligenceFocusActive = Boolean(intelligenceFocus?.ids.length);
  const timelineFilters = isProfileComplete
    ? BENCHMARK_TIMELINE_FILTERS
    : (["All", "fundraising", "gtm", "product", "strategic", "team"] as const);
  const visibleIntelligenceItems = useMemo(
    () => {
      const scoped = intelligenceFocusActive
        ? intelligenceItems.filter(item => intelligenceFocus!.ids.includes(item.id))
        : intelligenceItems;
      if (activeTimelineFilter === "All") return scoped;
      return scoped.filter(item => item.type === activeTimelineFilter);
    },
    [activeTimelineFilter, intelligenceFocus, intelligenceFocusActive, intelligenceItems],
  );
  const benchmarkIntelligenceItems = useMemo(
    () => visibleIntelligenceItems.filter(item => item.id.startsWith("intel-bench-")),
    [visibleIntelligenceItems],
  );
  const otherIntelligenceItems = useMemo(
    () => visibleIntelligenceItems.filter(item => !item.id.startsWith("intel-bench-")),
    [visibleIntelligenceItems],
  );
  const showQuarterlySubmission = Boolean(
    benchmarkSubmission
    && !intelligenceFocusActive
    && benchmarkIntelligenceItems.length > 0,
  );
  type TimelineBlock =
    | { kind: "benchmark"; updatedAtMs: number; items: IntelligenceItem[]; submission: BenchmarkSubmission }
    | { kind: "intelligence"; updatedAtMs: number; item: IntelligenceItem };

  const timelineBlocks = useMemo(() => {
    const blocks: TimelineBlock[] = [];

    if (showQuarterlySubmission && benchmarkSubmission && benchmarkIntelligenceItems.length > 0) {
      blocks.push({
        kind: "benchmark",
        updatedAtMs: benchmarkSubmission.submittedAtMs,
        items: benchmarkIntelligenceItems,
        submission: benchmarkSubmission,
      });
    }

    otherIntelligenceItems.forEach(item => {
      blocks.push({
        kind: "intelligence",
        updatedAtMs: getIntelligenceUpdatedAtMs(item, benchmarkSubmission?.submittedAtMs),
        item,
      });
    });

    return blocks.sort((left, right) => right.updatedAtMs - left.updatedAtMs);
  }, [
    benchmarkIntelligenceItems,
    benchmarkSubmission,
    otherIntelligenceItems,
    showQuarterlySubmission,
  ]);
  const showIntelligenceTimeline = isProfileComplete
    || intelligenceFocusActive
    || Boolean(benchmarkSubmission)
    || intelligenceItems.some(item => !item.id.startsWith("intel-bench-"));
  const selectedIntelligence = intelligenceItems.find(item => item.id === selectedIntelligenceId) || null;

  useEffect(() => {
    if (!intelligenceFocus?.ids.length) return;
    setBlinkingIntelligenceIds(intelligenceFocus.ids);
    const blinkTimer = window.setTimeout(() => setBlinkingIntelligenceIds([]), 900);
    const scrollTimer = window.setTimeout(() => {
      timelinePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(scrollTimer);
    };
  }, [intelligenceFocus]);

  useEffect(() => {
    if (!benchmarkBlinkIds.length) return;
    setBlinkingIntelligenceIds(benchmarkBlinkIds);
    const blinkTimer = window.setTimeout(() => setBlinkingIntelligenceIds([]), 900);
    const scrollTimer = window.setTimeout(() => {
      timelinePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(scrollTimer);
    };
  }, [benchmarkBlinkIds]);
  const logSignalOptions = [
    "Fundraising",
    "GTM",
    "Product",
    "Strategic",
    "Team",
    "Finance",
    "Growth",
    "Retention",
    "Efficiency",
  ];

  const handleRemoveIntelligence = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (id.startsWith("intel-bench-")) return;
    setIntelligenceItems(previous => previous.filter(item => item.id !== id));
    if (selectedIntelligenceId === id) setSelectedIntelligenceId(null);
  };

  const handleIntelligenceGenerated = (item: IntelligenceItem) => {
    setIntelligenceItems(previous => [item, ...previous]);
    setSelectedIntelligenceId(null);
    setBlinkingIntelligenceIds([item.id]);
    window.setTimeout(() => setBlinkingIntelligenceIds([]), 1200);
    window.setTimeout(() => {
      const row = timelinePanelRef.current?.querySelector(`[data-intelligence-id="${item.id}"]`);
      row?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const resetLogForm = () => {
    setLogSignalType("");
    setLogPeriod("2026-q2");
    setLogValue("");
    setLogNote("");
  };

  const handleLogIntelligence = () => {
    if (!logSignalType || !logValue.trim()) return;
    const type = logSignalType.toLowerCase();
    handleIntelligenceGenerated({
      id: `intel-log-${Date.now()}`,
      type,
      text: logSignalType,
      highlight: logValue.trim(),
      date: logPeriod,
      age: "Just now",
      title: logNote.trim() || logValue.trim(),
      confidence: "Manual",
      sources: [],
      updatedAtMs: Date.now(),
    });
    resetLogForm();
    setShowLogForm(false);
  };

  const handleDocumentUpload = (typeId: string, typeLabel: string, file: File) => {
    setDocumentNotice(`${typeLabel} uploaded · parsing and generating intelligence…`);
    onUploadDocument(typeId, typeLabel, file);
  };

  const prevProcessingRef = useRef<string | null>(processingDocumentTypeId);
  useEffect(() => {
    if (prevProcessingRef.current && !processingDocumentTypeId && documentNotice?.includes("parsing")) {
      const activeCount = countActiveDocuments(documentSlots);
      setDocumentNotice(
        activeCount > 0
          ? `Document confirmed · intelligence generated. View all ${activeCount} file${activeCount === 1 ? "" : "s"} in Data Room →`
          : null,
      );
    }
    prevProcessingRef.current = processingDocumentTypeId;
  }, [documentNotice, documentSlots, processingDocumentTypeId]);

  const documentNoticeBanner = documentNotice ? (
    <div className="pitch-deck-confirm-banner">
      <span>{documentNotice}</span>
      <div className="pitch-deck-confirm-actions">
        {documentNotice.includes("Data Room") ? (
          <button type="button" onClick={onOpenDataRoom}>Open Data Room</button>
        ) : null}
        <button type="button" aria-label="Dismiss" onClick={() => setDocumentNotice(null)}>×</button>
          </div>
          </div>
  ) : null;

  const benchmarkRows = [
    { label: "ARR", values: ["Bot 25% $150k", "Median $500k", "Top 25% $1.2M", "Top 10% $2.5M"] },
    { label: "CAC payback", hint: "lower is better", values: ["Bot 25% 10.0mo", "Median 16.0mo", "Top 25% 26.0mo", "Top 10% 42.0mo"] },
    { label: "Burn multiple", hint: "lower is better", values: ["Bot 25% 1.30x", "Median 2.10x", "Top 25% 3.40x", "Top 10% 5.50x"] },
    { label: "Headcount (FTE)", values: ["Bot 25% 6", "Median 12", "Top 25% 22", "Top 10% 40"] },
    { label: "Paid customers", values: ["Bot 25% 10", "Median 40", "Top 25% 150", "Top 10% 500"] },
    { label: "Cash on hand", values: ["Bot 25% $500k", "Median $1.5M", "Top 25% $3.0M", "Top 10% $6.0M"] },
    { label: "Monthly burn", hint: "lower is better", values: ["Bot 25% $40k", "Median $80k", "Top 25% $180k", "Top 10% $350k"] },
    { label: "ARR growth YoY", values: ["Bot 25% 120%", "Median 200%", "Top 25% 350%", "Top 10% 600%"] },
    { label: "Gross margin", values: ["Bot 25% 55%", "Median 72%", "Top 25% 82%", "Top 10% 88%"] },
    { label: "Net revenue retention", values: ["Bot 25% 95%", "Median 108%", "Top 25% 125%", "Top 10% 145%"] },
    { label: "Logo retention", values: ["Bot 25% 80%", "Median 88%", "Top 25% 93%", "Top 10% 97%"] },
  ];

  const renderTimelineRow = (row: IntelligenceItem) => {
    const isBenchmarkRow = row.id.startsWith("intel-bench-");
    return (
      <div
        className={`signals-timeline-row${isBenchmarkRow ? " signals-timeline-row-benchmark" : ""}${selectedIntelligenceId === row.id ? " selected" : ""}${blinkingIntelligenceIds.includes(row.id) || benchmarkBlinkIds.includes(row.id) ? " blink-once" : ""}`}
        key={row.id}
        data-intelligence-id={row.id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedIntelligenceId(row.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSelectedIntelligenceId(row.id);
          }
        }}
      >
                <span className="signals-row-type">{row.type}</span>
        {isBenchmarkRow ? (
          <div className="signals-row-benchmark-main">
            <strong>{row.text}</strong>
            <span className="signals-row-value">{row.highlight}</span>
            <time>{row.date}</time>
          </div>
        ) : (
                <div className="signals-row-content">
                  <div className="signals-row-primary">
                    <strong>{row.text}</strong>
                    <time>{row.date}</time>
                    {row.confidence ? <small>conf {row.confidence}</small> : null}
                  </div>
                  <p>{row.highlight}</p>
                </div>
        )}
                <div className="signals-row-meta">
          {!isBenchmarkRow && row.sources.length > 0 ? (
            <span className="signals-source-ref">
              {row.sources.length} source{row.sources.length > 1 ? "s" : ""}
            </span>
          ) : null}
                  <span className="signals-row-age">{row.age}</span>
          {!isBenchmarkRow ? (
            <button
              type="button"
              className="signals-row-dismiss"
              aria-label="Remove intelligence"
              onClick={(event) => handleRemoveIntelligence(row.id, event)}
            >
              ×
            </button>
          ) : (
            <button
              type="button"
              className="signals-row-dismiss muted"
              aria-label="Benchmark intelligence"
              tabIndex={-1}
              onClick={(event) => event.stopPropagation()}
            >
              ×
            </button>
          )}
                </div>
              </div>
    );
  };

  const intelligenceTimelinePanel = (
    <div className="signals-timeline-panel" ref={timelinePanelRef}>
      {intelligenceFocusActive ? (
        <div className="pitch-deck-confirm-banner intelligence-focus-banner">
          <span>
            Showing {visibleIntelligenceItems.length} intelligence item{visibleIntelligenceItems.length === 1 ? "" : "s"} from{" "}
            <strong>{intelligenceFocus!.label}</strong>
          </span>
          <div className="pitch-deck-confirm-actions">
            <button type="button" onClick={() => onClearIntelligenceFocus?.()}>Show all intelligence</button>
          </div>
              </div>
      ) : null}
      <div className="signals-timeline-head">
        <strong>Intelligence timeline</strong>
        {!showLogForm && isProfileComplete && !intelligenceFocusActive ? (
          <button
            type="button"
            className="signals-log-intelligence-btn"
            onClick={() => setShowLogForm(true)}
          >
            + Log intelligence
          </button>
        ) : (
          <em className="signals-timeline-event-count">{visibleIntelligenceItems.length} events</em>
        )}
      </div>
      <div className="signals-filter-row">
        {intelligenceFocusActive ? (
          <>
            <span className="active">From pitch deck</span>
            <em>{visibleIntelligenceItems.length} events</em>
          </>
        ) : (
          <>
            {timelineFilters.map(filter => (
              <button
                type="button"
                className={activeTimelineFilter === filter ? "active" : ""}
                key={filter}
                onClick={() => setActiveTimelineFilter(filter)}
              >
                {filter}
              </button>
            ))}
            {showLogForm ? (
              <button
                type="button"
                className="signals-log-cancel"
                onClick={() => {
                  setShowLogForm(false);
                  resetLogForm();
                }}
              >
                Cancel
              </button>
            ) : (
              <em>{visibleIntelligenceItems.length} events</em>
            )}
          </>
        )}
          </div>
      {showLogForm && isProfileComplete && !intelligenceFocusActive ? (
        <div className="signals-log-form-row">
          <select
            value={logSignalType}
            onChange={(event) => setLogSignalType(event.target.value)}
          >
            <option value="">Pick a category...</option>
            {logSignalOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <input
            type="text"
            value={logPeriod}
            onChange={(event) => setLogPeriod(event.target.value)}
            aria-label="Period"
          />
          <input
            type="text"
            value={logValue}
            onChange={(event) => setLogValue(event.target.value)}
            placeholder="Value (free text)"
          />
          <input
            type="text"
            value={logNote}
            onChange={(event) => setLogNote(event.target.value)}
            placeholder="Note (optional)"
          />
          <button
            type="button"
            className="signals-log-submit"
            disabled={!logSignalType || !logValue.trim()}
            onClick={handleLogIntelligence}
          >
            Log
          </button>
        </div>
      ) : null}
      <div className="signals-timeline-list">
        {timelineBlocks.map((block) => {
          if (block.kind === "benchmark") {
            const benchmarkBlinking = block.items.some(item => (
              blinkingIntelligenceIds.includes(item.id) || benchmarkBlinkIds.includes(item.id)
            ));
            return (
              <React.Fragment key={`benchmark-${block.submission.submittedAtMs}`}>
                {block.items.map(renderTimelineRow)}
                <QuarterlySubmissionPanel
                  submission={block.submission}
                  onEdit={onEditBenchmark || (() => undefined)}
                  highlight={benchmarkBlinking}
                />
              </React.Fragment>
            );
          }
          return renderTimelineRow(block.item);
        })}
      </div>
      {isProfileComplete && !benchmarkSubmission ? (
        <div className="signals-footnote">
          Overlay uses <span>b2b_saas:seed:us</span>. Explore all cohorts on <a>Benchmarks</a>.
        </div>
      ) : null}
    </div>
  );

  if (isProfileComplete) {
    return (
      <section className="signals-screenshot-page">
        <CreditBlockBanner />
        <PrivateDataCompactStrip onUpdatePeriod={onUpdatePeriod} />

        {documentNoticeBanner}

        <ContextFeedPage
          onOpenConnectors={onLinkConnectors}
          onIntelligenceGenerated={handleIntelligenceGenerated}
          documentSlots={documentSlots}
          onPersistSourceDocument={onPersistSourceDocument}
          highlightAddSource={activeTourTarget === "add-source"}
        />

        {intelligenceTimelinePanel}

        <SourcesConnectorsUpsell onOpenConnectors={onLinkConnectors} />

        {selectedIntelligence ? (
          <IntelligenceProvenanceSidebar
            item={selectedIntelligence}
            onClose={() => setSelectedIntelligenceId(null)}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className="signals-screenshot-page">
      <div className="signals-private-panel">
        <div className="signals-private-panel-copy">
          <h2>See how Patriot Pay stacks up against peers</h2>
          <p>
            Below is what the <strong>B2B Saas · Seed · US</strong> looks like across the distribution — bottom 25%,
            median, top 25%, top 10%. Log ARR, NRR, burn, headcount, challenges, or anything else you know about Patriot
            Pay to overlay them on this distribution — it&apos;s private to your account and stamps the quarter so you
            can track changes over time.
          </p>
          <label className="signals-cohort-select">
            cohort
            <select defaultValue="b2b_saas:seed:us">
              <option value="b2b_saas:growth:us">B2B Saas · Growth · US · n=94</option>
              <option value="b2b_saas:seed:us">B2B Saas · Seed · US · n=147</option>
              <option value="b2b_saas:series_a:us">B2B Saas · Series A · US · n=203</option>
              <option value="dev_tools:series_a:us">Dev Tools · Series A · US · n=41</option>
            </select>
          </label>
        </div>
        <div className="signals-private-actions">
          <button type="button" className="signals-private-btn primary" onClick={onLogBenchmarkData}>
            Log benchmark data →
          </button>
        </div>
      </div>

      {documentNoticeBanner}

      <div className="signals-benchmark-panel">
        <div className="signals-panel-heading">
          <span>Cohort benchmarks · 2026-Q2</span>
          <em>No overlay yet — finish profile to place patriotpay on these bars</em>
        </div>
        <div className="signals-benchmark-grid">
          {benchmarkRows.map((row) => (
            <div className="signals-benchmark-item" key={row.label}>
              <div className="signals-benchmark-title">
                {row.label}
                {row.hint ? <span>{row.hint}</span> : null}
              </div>
              <div className="signals-bar"><b /><i /></div>
              <div className="signals-benchmark-scale">
                {row.values.map(value => <span key={value}>{value}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ContextFeedPage
        onOpenConnectors={onLinkConnectors}
        onIntelligenceGenerated={handleIntelligenceGenerated}
        documentSlots={documentSlots}
        processingDocumentTypeId={processingDocumentTypeId}
        onPersistSourceDocument={onPersistSourceDocument}
        highlightAddSource={activeTourTarget === "add-source"}
      />

      {showIntelligenceTimeline ? intelligenceTimelinePanel : null}

      <SourcesConnectorsUpsell onOpenConnectors={onLinkConnectors} />

      {selectedIntelligence ? (
        <IntelligenceProvenanceSidebar
          item={selectedIntelligence}
          onClose={() => setSelectedIntelligenceId(null)}
        />
      ) : null}
    </section>
  );
}

function FinishProfileWizard({ onBack, onSubmitBenchmark }: { onBack: () => void; onSubmitBenchmark: () => void }) {
  const [stage, setStage] = useState("profile");
  const [benchmarkStep, setBenchmarkStep] = useState(0);
  const benchmarkSteps = [
    {
      title: "Revenue + retention",
      subtitle: "The headline number every benchmark band keys off. ARR in USD, growth + retention in %.",
      fields: ["ARR (annualized)", "ARR growth, YoY", "Net revenue retention", "Logo retention (annual)"],
    },
    {
      title: "Capital efficiency",
      subtitle: "Burn, runway, gross margin — how much fuel you have and how efficiently it converts.",
      fields: ["Monthly burn (net)", "Cash on hand", "Gross margin"],
    },
    {
      title: "Team + customers",
      subtitle: "Size of the org and your paying-customer count.",
      fields: ["Headcount (FTEs)", "Paying customers"],
    },
    {
      title: "Anything worth flagging?",
      subtitle: "Optional context that helps Fuel interpret the numbers.",
      fields: ["Notable customers", "Current challenges"],
      textarea: true,
    },
  ];
  const currentBenchmark = benchmarkSteps[benchmarkStep];
  const businessModels = ["SaaS / Software product", "Services / Consultancy", "Investment firm", "Operating + investment firm", "Other"];

  if (stage === "profile") {
    return (
      <section className="finish-profile-shell">
        <button className="profile-wizard-back" onClick={onBack}>← Back to Intelligence</button>
        <div className="finish-profile-card">
          <span>Profile ready</span>
          <h2>You're from Patriot Pay.</h2>
          <p>Confirm your profile so Fuel can match you to the right peer cohort and generate relevant intelligence from day one.</p>

          <label>
            <em>Company</em>
            <input defaultValue="Patriot Pay" />
          </label>
          <label>
            <em>What they do</em>
            <textarea defaultValue="Healthcare payments company helping practices modernize patient billing, collections, and revenue operations." />
          </label>
          <div className="wizard-section-label">Business model</div>
          <div className="business-model-grid">
            {businessModels.map(model => (
              <button className={model === "Operating + investment firm" ? "active" : ""} key={model}>
                <strong>{model}</strong>
                <small>{model === "Operating + investment firm" ? "Both operating revenue and portfolio / investments." : "Fuel will tailor benchmarks and intelligence to this model."}</small>
              </button>
            ))}
          </div>
          <div className="profile-field-grid">
            <label><em>Industry</em><input defaultValue="Healthcare payments" /></label>
            <label><em>Founded</em><input placeholder="2021" /></label>
            <label><em>City</em><input defaultValue="Boston" /></label>
            <label><em>State / region</em><input defaultValue="MA" /></label>
            <label><em>Country</em><input defaultValue="United States" /></label>
            <label><em>Website</em><input defaultValue="https://patriotpay.com" /></label>
          </div>
          <label>
            <em>LinkedIn</em>
            <input placeholder="https://www.linkedin.com/company/patriotpay" />
          </label>
          <div className="verified-domain-note">We'll link patriotpay.com to your Fuel profile. Teammates can create their own profiles for the same company.</div>
          <button className="wizard-primary" onClick={() => setStage("benchmark")}>Create my profile</button>
        </div>

        <aside className="agent-worklog-card">
          <span>Agent worklog</span>
          <p>Everything Fuel read to build this profile.</p>
          {["Scanned homepage", "Detected company category", "Reading details into a profile", "Identified peer cohort"].map(item => (
            <div className="agent-worklog-row" key={item}><i />{item}</div>
          ))}
        </aside>
      </section>
    );
  }

  if (stage === "review") {
    return (
      <section className="benchmark-wizard-shell">
        <button className="profile-wizard-back" onClick={onBack}>← Back to Intelligence</button>
        <WizardRail activeStep={4} />
        <div className="benchmark-card">
          <span>Step 5 of 5 · Review</span>
          <h2>Review and submit your benchmark.</h2>
          <p>Submitting locks these numbers in for Patriot Pay · 2026-Q2 and contributes them to the verified cohort dataset.</p>
          {["Revenue + retention", "Capital efficiency", "Team + customers", "Anything worth flagging"].map(group => (
            <div className="benchmark-review-group" key={group}>
              <strong>{group}</strong>
              <div><span>Key numbers</span><em>You edited</em></div>
              <div><span>Context</span><em>Needs your review</em></div>
            </div>
          ))}
          <div className="benchmark-actions">
            <button className="wizard-primary" onClick={() => setStage("results")}>Submit benchmark</button>
            <button className="wizard-link" onClick={() => setStage("benchmark")}>Back to edit</button>
          </div>
        </div>
        <BenchmarkGuide verifiedCount="9 of 11 fields verified" />
      </section>
    );
  }

  if (stage === "results") {
    const journeyStages = [
      { stage: "Stage 1", title: "Idea", detail: "Problem identified", done: true },
      { stage: "Stage 2", title: "Pre-Product", detail: "Building MVP", active: true },
      { stage: "Stage 3", title: "Pre-Revenue", detail: "MVP live · first users" },
      { stage: "Stage 4", title: "Early Revenue", detail: "Paying customers" },
      { stage: "Stage 5", title: "Product-Market Fit", detail: "Repeatable growth" },
      { stage: "Stage 6", title: "Scaling", detail: "Rapid expansion" },
      { stage: "Stage 7", title: "Market Leader", detail: "Category dominance" },
    ];
    const kpiGroups = [
      {
        group: "GTM",
        sub: "Revenue + retention",
        rows: [
          { label: "ARR", values: "p25 $150K · p50 $500K · p75 $1.2M · p90 $2.5M", start: 6, end: 48, marker: 20 },
          { label: "ARR growth, YoY", values: "p25 120% · p50 200% · p75 350% · p90 600%", start: 20, end: 58, marker: 34 },
          { label: "Net revenue retention", values: "p25 95% · p50 108% · p75 125% · p90 145%", start: 66, end: 84, marker: 75 },
        ],
      },
      {
        group: "R&D",
        sub: "Engineering + product",
        rows: [
          { label: "Headcount", values: "p25 6 · p50 12 · p75 22 · p90 40", start: 15, end: 55, marker: 30 },
          { label: "Product maturity", values: "MVP build active · profile context ready", start: 18, end: 62, marker: 42 },
        ],
      },
      {
        group: "G&A",
        sub: "Capital + efficiency",
        rows: [
          { label: "Cash on hand", values: "p25 $500K · p50 $1.5M · p75 $3.0M · p90 $6.0M", start: 22, end: 50, marker: 31 },
          { label: "Monthly burn", values: "p25 $40K · p50 $80K · p75 $180K · p90 $350K", start: 12, end: 52, marker: 29 },
          { label: "Gross margin", values: "p25 55% · p50 72% · p75 82% · p90 88%", start: 64, end: 92, marker: 73 },
        ],
      },
    ];

    return (
      <section className="benchmark-wizard-shell generated-benchmark-shell">
        <button className="profile-wizard-back" onClick={onBack}>← Back to Intelligence</button>
        <div className="generated-benchmark-card">
          <div className="generated-stage-card">
            <span>Your startup journey</span>
            <div className="generated-stage-head">
              <h2>Currently at <b>Pre-Product.</b></h2>
              <em>AI estimate · from profile signal</em>
            </div>
            <div className="generated-stage-grid">
              {journeyStages.map(item => (
                <div className={`${item.active ? "active" : ""} ${item.done ? "done" : ""}`} key={item.stage}>
                  {item.done ? <i>✓</i> : null}
                  <span>{item.stage}</span>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
            <p className="generated-helper">We inferred this from your confirmed profile and benchmark inputs.</p>
          </div>

          <div className="generated-kpi-card">
            <div className="generated-kpi-head">
              <div>
                <span>KPI snapshot</span>
                <h2>How your cohort performs across R&D, GTM, and G&A.</h2>
              </div>
              <button onClick={() => setStage("benchmark")} aria-label="Edit benchmark numbers">✎</button>
            </div>
            <div className="generated-cohort-pill">Cohort · b2b saas · seed · US · n=147</div>
            <p className="generated-helper">Cohort distribution shown below. Fuel uses this benchmark to generate stronger intelligence.</p>
            <div className="generated-kpi-list">
              {kpiGroups.map(group => (
                <div className="generated-kpi-group" key={group.group}>
                  <div>
                    <strong>{group.group}</strong>
                    <small>{group.sub}</small>
                  </div>
                  <div className="generated-kpi-rows">
                    {group.rows.map(row => (
                      <div className="generated-kpi-row" key={row.label}>
                        <div className="generated-kpi-row-head">
                          <span>{row.label}</span>
                          <em>{row.values}</em>
                        </div>
                        <div className="generated-kpi-bar">
                          <b style={{ left: `${row.start}%`, width: `${Math.max(4, row.end - row.start)}%` }} />
                          <i style={{ left: `${row.marker}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="generated-benchmark-note">
            <strong>Your benchmark is now ready.</strong> Fuel can use this intelligence to recommend playbooks and identify
            the highest-leverage initiatives for your next stage.
          </div>
          <div className="benchmark-actions">
            <button className="wizard-primary" onClick={onSubmitBenchmark}>Generate intelligence</button>
            <button className="wizard-link" onClick={() => setStage("benchmark")}>Edit benchmark</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="benchmark-wizard-shell">
      <button className="profile-wizard-back" onClick={onBack}>← Back to Intelligence</button>
      <WizardRail activeStep={benchmarkStep} />
      <div className="benchmark-card">
        <span>Step {benchmarkStep + 1} of 5 · KPI benchmark</span>
        <h2>{currentBenchmark.title}</h2>
        <p>{currentBenchmark.subtitle}</p>
        <div className="benchmark-tailor-note">
          Tailored for Patriot Pay. Confirm or add the numbers you know; untouched fields stay flagged for review.
        </div>
        {currentBenchmark.fields.map((field, index) => (
          <label className="benchmark-field" key={field}>
            <em>{field} <b>{index === 0 && benchmarkStep < 3 ? "Needs your input" : "Optional"}</b></em>
            {currentBenchmark.textarea ? <textarea placeholder={field === "Notable customers" ? "e.g. landed Stripe and Notion in the last quarter" : "Anything that materially shapes the numbers above"} /> : <input placeholder={benchmarkStep < 2 ? "$" : "50"} />}
          </label>
        ))}
        <div className="benchmark-actions">
          {benchmarkStep > 0 ? <button className="wizard-link" onClick={() => setBenchmarkStep(step => step - 1)}>← Back</button> : null}
          <button
            className="wizard-primary"
            onClick={() => benchmarkStep === benchmarkSteps.length - 1 ? setStage("review") : setBenchmarkStep(step => step + 1)}
          >
            {benchmarkStep === benchmarkSteps.length - 1 ? "Review →" : "Next →"}
          </button>
        </div>
      </div>
      <BenchmarkGuide verifiedCount={`${benchmarkStep * 2 + 1} of 11 fields verified`} />
    </section>
  );
}

function WizardRail({ activeStep }: { activeStep: number }) {
  const steps = ["Revenue + retention", "Capital efficiency", "Team + customers", "Anything worth flagging?", "Review & submit"];
  return (
    <aside className="wizard-rail">
      <span>Steps</span>
      {steps.map((step, index) => (
        <div className={index === activeStep ? "active" : index < activeStep ? "done" : ""} key={step}>
          <i>{index < activeStep ? "✓" : index + 1}</i>
          {step}
        </div>
      ))}
    </aside>
  );
}

function BenchmarkGuide({ verifiedCount }: { verifiedCount: string }) {
  return (
    <aside className="benchmark-guide">
      <span>Fuel guidance</span>
      <strong>{verifiedCount}</strong>
      <p>Confirm each number Fuel can verify. Fresh submissions sharpen the bands for everyone.</p>
      <div><b>Verified domain</b><em>Your input</em></div>
    </aside>
  );
}

function TourPromptBanner({ onStartTour, onDismiss }: { onStartTour: () => void; onDismiss: () => void }) {
  return (
    <div className="tour-prompt-banner">
      <div>
        <span>New workspace tour</span>
        <strong>Want a quick walkthrough of Fuel?</strong>
        <p>
          See how Overview, Intelligence, Initiatives, and Playbooks work together now that your profile is set up.
        </p>
      </div>
      <div className="tour-prompt-actions">
        <button onClick={onStartTour}>Take tour</button>
        <button className="secondary" onClick={onDismiss}>Maybe later</button>
      </div>
    </div>
  );
}

function InitiativesPage() {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <section className="initiatives-page">
      <div className="initiatives-head">
        <div>
          <h2>Initiatives</h2>
          <p>Continuous and one-time work the operating team is running with this company.</p>
        </div>
        {isCreating ? (
          <button className="initiatives-secondary-btn" onClick={() => setIsCreating(false)}>Cancel</button>
        ) : (
          <button className="initiatives-primary-btn" onClick={() => setIsCreating(true)}>+ New initiative</button>
        )}
      </div>

      {isCreating ? (
        <div className="initiative-form-card">
          <div className="initiative-form-row">
            <input placeholder="Initiative name (e.g. Enterprise GTM retool)" />
            <select defaultValue="continuous">
              <option value="continuous">Continuous</option>
              <option value="one-time">One-time</option>
            </select>
            <select defaultValue="gtm">
              <option value="gtm">GTM</option>
              <option value="product">Product</option>
              <option value="finance">Finance</option>
              <option value="ops">Ops</option>
            </select>
          </div>
          <textarea placeholder="What's the goal and why now? (optional)" />
          <div className="initiative-form-row">
            <input placeholder="Owner email (defaults to you)" />
            <input placeholder="Due (e.g. 2026-q3)" />
          </div>
          <div className="initiative-form-actions">
            <button className="initiatives-primary-btn">Create initiative</button>
            <button className="initiatives-secondary-btn" onClick={() => setIsCreating(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="initiatives-empty-card">
          <strong>No initiatives yet</strong>
          <p>
            Start one manually with <span>+ New initiative</span>, or let Fuel generate suggested initiatives from Intelligence
            once the company profile and context are complete.
          </p>
        </div>
      )}

      <div className="initiatives-signal-note">
        <span>Generated from Intelligence</span>
        <p>
          When Fuel has enough profile, benchmark, and context data, intelligence patterns can become recommended initiatives
          for GTM, product, finance, and operating priorities.
        </p>
      </div>
    </section>
  );
}

function OverviewPage({
  activeTourTarget,
  profileComplete,
  onEditProfile,
  company,
}: {
  activeTourTarget?: string;
  profileComplete: boolean;
  onEditProfile: () => void;
  company: { displayName: string; domain: string; headquarters: string; employees: string; linkedin: string };
}) {
  const stats = [
    { label: "Total funding", value: profileComplete ? "$4.2M" : "-", hint: profileComplete ? "Seed stage" : "Finish profile", missing: !profileComplete },
    { label: "Funding rounds", value: profileComplete ? "2" : "-", hint: profileComplete ? "Latest: Seed" : "Finish profile", missing: !profileComplete },
    { label: "Last funding", value: profileComplete ? "Feb 2024" : "-", hint: profileComplete ? "York IE partner" : "Finish profile", missing: !profileComplete },
    { label: "Founded", value: "2021", hint: profileComplete ? "4 yrs active" : "From public source", missing: false },
  ];
  const details = [
    { label: "Headquarters", value: profileComplete ? company.headquarters : "-", missing: !profileComplete },
    { label: "Employees", value: profileComplete ? company.employees : "-", missing: !profileComplete },
    { label: "Founded", value: "2021", missing: false },
    { label: "LinkedIn", value: profileComplete ? company.linkedin : "-", missing: !profileComplete },
    { label: "Keywords", value: "patient billing · healthcare payments · revenue cycle · AI agent · SMB practices", missing: false },
  ];
  const rounds = [
    { date: "Feb 2024", round: "Seed", amount: "$4.2M", investors: "York IE, Angels" },
    { date: "Aug 2022", round: "Pre-seed", amount: "$750K", investors: "Founder network" },
  ];
  const similarCompanies = ["Cedar", "Inbox Health", "Rivet Health", "PayZen", "Finpay"];
  const dataSources = [
    ["Website", "public"],
    ["LinkedIn", "company profile"],
    ["Crunchbase", "funding"],
    ["York IE", "customer context"],
  ];

  return (
    <section className="overview-tour-page">
      {!profileComplete ? (
        <div className="overview-finish-profile-panel">
          <div>
            <span>Profile setup required</span>
            <h3>Finish your profile to unlock Fuel recommendations</h3>
            <p>
              The more complete your company data is, the better Fuel can identify intelligence, recommend initiatives, suggest the right playbooks, and generate useful operating context for {company.displayName}.
            </p>
          </div>
          <button
            className={`signals-finish-profile-action ${activeTourTarget === "finish-profile" ? "tour-highlight" : ""}`}
            data-tour-target={activeTourTarget === "finish-profile" ? "finish-profile" : undefined}
            onClick={onEditProfile}
          >
            Finish profile
          </button>
        </div>
      ) : null}
      <div className="overview-metric-grid">
        {stats.map(stat => (
          <div className={`overview-metric-card ${stat.missing ? "missing" : ""}`} key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <em>{stat.hint}</em>
          </div>
        ))}
      </div>

      <div className="overview-layout-grid">
        <div className="overview-main-column">
          <div className="overview-panel">
            <div className="overview-panel-head">
              <span>About</span>
              <button onClick={onEditProfile}>Edit profile →</button>
            </div>
            <p>
              Patriot Pay is a healthcare payments company helping medical practices modernize patient billing, collections,
              and revenue operations through workflow automation and AI-assisted billing support.
            </p>
          </div>

          <div className="overview-panel">
            <span>Company Details</span>
            <div className="overview-detail-list">
              {details.map((item) => (
                <div className={`overview-detail-row ${item.missing ? "missing" : ""}`} key={item.label}>
                  <em>{item.label}</em>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="overview-panel">
            <div className="overview-panel-head">
              <span>Funding Rounds</span>
              <em>2 rounds</em>
            </div>
            <div className="overview-funding-table">
              <div className="overview-funding-header">
                <span>Date</span>
                <span>Round</span>
                <span>Amount</span>
                <span>Investors</span>
              </div>
              {rounds.map(round => (
                <div className="overview-funding-row" key={`${round.date}-${round.round}`}>
                  <span>{round.date}</span>
                  <span>{round.round}</span>
                  <span>{round.amount}</span>
                  <span>{round.investors}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`overview-panel ${activeTourTarget === "signals" ? "tour-highlight" : ""}`}>
            <span>Recent Intelligence</span>
            <p>
              Detailed generated intelligence will appear after Patriot Pay finishes the profile and benchmark setup. Manual
              intelligence can still be logged from Intelligence.
            </p>
          </div>

          <div className={`overview-panel ${activeTourTarget === "initiatives" ? "tour-highlight" : ""}`}>
            <div className="overview-panel-head">
              <span>Initiatives</span>
              <button>Manage initiatives →</button>
            </div>
            <p>
              Initiatives will be recommended from benchmark gaps, York IE project context, and generated intelligence once
              setup is complete.
            </p>
          </div>
        </div>

        <aside className="overview-side-column">
          <div className={`overview-panel ${activeTourTarget === "context" ? "tour-highlight" : ""}`}>
            <span>Context</span>
            <p>
              No additional context sources connected yet. Add meeting notes, CRM activity, LinkedIn posts, or York IE
              updates to make Fuel's intelligence more specific.
            </p>
          </div>

          <div className="overview-panel">
            <span>Similar Companies</span>
            <div className="overview-company-list">
              {similarCompanies.map(company => (
                <div key={company}>{company}</div>
              ))}
            </div>
          </div>

          <div className="overview-panel">
            <span>Data Sources</span>
            <div className="overview-source-list">
              {dataSources.map(([source, type]) => (
                <div key={source}>
                  <strong>{source}</strong>
                  <em>{type}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="overview-panel">
            <span>Playbooks</span>
            <p>
              Playbooks are runbooks Fuel AI executes against the company using signal context and benchmarks. Pick one
              from the catalog to produce an artifact you can act on, such as diligence, pricing reviews, audits, or
              planning frameworks.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function GuidedTourOverlay({ step, total, title, text, highlightTarget, onNext, onPrevious, onSkip }: {
  step: number;
  total: number;
  title: string;
  text: string;
  highlightTarget?: string;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}) {
  const [popoverStyle, setPopoverStyle] = useState({});

  useEffect(() => {
    function positionPopover() {
      const highlighted = highlightTarget
        ? document.querySelector(`[data-tour-target="${highlightTarget}"]`)
        : document.querySelector(".tour-highlight");
      if (!highlighted) {
        setPopoverStyle({});
        return;
      }

      highlighted.scrollIntoView({ block: "center", behavior: "smooth" });

      const rect = highlighted.getBoundingClientRect();
      const popoverWidth = 306;
      const popoverHeight = 200;
      const pageMargin = 24;
      const gap = 16;
      const left = Math.min(
        Math.max(rect.left, pageMargin),
        window.innerWidth - popoverWidth - pageMargin,
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeAbove = spaceBelow < popoverHeight + gap + pageMargin;
      const top = placeAbove
        ? Math.max(pageMargin, rect.top - popoverHeight - gap)
        : rect.bottom + gap;

      setPopoverStyle({
        left,
        right: "auto",
        top,
      });
    }

    positionPopover();
    const frame = window.requestAnimationFrame(positionPopover);
    const retry = window.setTimeout(positionPopover, 120);
    const retryLate = window.setTimeout(positionPopover, 320);
    window.addEventListener("resize", positionPopover);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
      window.clearTimeout(retryLate);
      window.removeEventListener("resize", positionPopover);
    };
  }, [step, highlightTarget]);

  return (
    <div className="guided-tour-overlay">
      <div className="guided-tour-backdrop" />
      <div className="guided-tour-popover" style={popoverStyle}>
        <div className="guided-tour-step-count">Step {step + 1} of {total}</div>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="guided-tour-controls">
          <button className="secondary" onClick={onSkip}>Skip</button>
          <div>
            <button className="secondary" onClick={onPrevious} disabled={step === 0}>Previous</button>
            <button onClick={onNext}>{step === total - 1 ? "Finish" : "Next"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalsLoadingPage() {
  return (
    <section className="signals-loading-page">
      <div className="signals-loading-card">
        <div className="signals-loading-orb">
          <span />
          <span />
          <span />
        </div>
        <span>Generating intelligence</span>
        <h2>Generating intelligence based on your profile</h2>
        <p>
          Fuel is combining your company profile, York account context, and benchmark cohort to prepare the first
          intelligence view for patriotpay.
        </p>
        <div className="signals-loading-steps">
          <div><i />Reading company profile</div>
          <div><i />Linking York account context</div>
          <div><i />Preparing benchmark and intelligence timeline</div>
        </div>
      </div>
    </section>
  );
}

const UPSELL_CONNECTORS = [
  { id: "google-meet", name: "Google Meet", icon: "GM", color: "#00AC47" },
  { id: "zoom", name: "Zoom", icon: "Z", color: "#2D8CFF", logoSrc: "/source-logos/zoom.svg" },
  { id: "linkedin", name: "LinkedIn", icon: "in", color: "#0A66C2" },
  { id: "salesforce-context", name: "Salesforce", icon: "SF", color: "#00A1E0" },
  { id: "gmail", name: "Gmail", icon: "Gm", color: "#EA4335" },
];

function SourcesConnectorsUpsell({ onOpenConnectors }: { onOpenConnectors: () => void }) {
  return (
    <div className="signals-connectors-upsell">
      <div className="sources-upsell">
        <div className="sources-header-copy sources-upsell-copy">
          <span>Connectors</span>
          <strong>Connect more sources</strong>
          <p>Link CRM, meetings, and email for richer intelligence generation.</p>
        </div>
        <div className="source-connector-strip">
          {UPSELL_CONNECTORS.map(connector => (
            <button
              key={connector.id}
              type="button"
              className="source-connector-chip"
              title={`Connect ${connector.name}`}
              aria-label={`Connect ${connector.name}`}
              onClick={onOpenConnectors}
            >
              <span className="source-connector-logo" style={{ background: connector.color + "22", color: connector.color }}>
                {connector.logoSrc ? <img src={connector.logoSrc} alt="" /> : connector.icon}
              </span>
              <span className="source-connector-name">{connector.name}</span>
              <span className="source-connector-add" aria-hidden="true">+</span>
            </button>
          ))}
          <button type="button" className="source-all-connectors" onClick={onOpenConnectors}>All connectors</button>
        </div>
      </div>
    </div>
  );
}

function ContextFeedPage({
  onOpenConnectors,
  onIntelligenceGenerated,
  documentSlots,
  processingDocumentTypeId = null,
  onPersistSourceDocument,
  highlightAddSource = false,
}: {
  onOpenConnectors: () => void;
  onIntelligenceGenerated?: (item: IntelligenceItem) => void;
  documentSlots?: DataRoomDocumentSlot[];
  processingDocumentTypeId?: string | null;
  onPersistSourceDocument?: (typeId: string, typeLabel: string, file: File, intelligenceIds: string[]) => void;
  highlightAddSource?: boolean;
}) {
  const { tryAction, generationBlocked, setPopoverOpen } = useCredits();
  type ContextConnector = {
    id: string;
    name: string;
    type: string;
    category: string;
    icon: string;
    color: string;
    logoSrc?: string;
    status: string;
    description: string;
    sources: string[];
    tone?: string;
    includedLabel?: string;
  };
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<ContextConnector | null>(null);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceDescription, setSourceDescription] = useState("");
  const [attachedDocument, setAttachedDocument] = useState<{ typeId: string; typeLabel: string; file: File } | null>(null);
  const [signalsGenerated, setSignalsGenerated] = useState(false);
  const contextConnectors: ContextConnector[] = [
    {
      id: "google-analytics",
      name: "Google Analytics",
      type: "Web analytics",
      category: "Analytics",
      icon: "GA",
      color: "#F9AB00",
      logoSrc: "/source-logos/google-analytics.svg",
      status: "Connected",
      description: "Use traffic, source mix, conversion, and funnel behavior as source context for market and GTM intelligence.",
      sources: ["traffic", "channels", "conversions"],
      tone: "connected",
    },
    {
      id: "semrush",
      name: "Semrush",
      type: "SEO intelligence",
      category: "Marketing",
      icon: "S",
      color: "#FF642D",
      logoSrc: "/source-logos/semrush.svg",
      status: "Connected",
      description: "Bring keyword movement, competitors, backlinks, and search visibility into Sources for GTM intelligence.",
      sources: ["keywords", "competitors", "backlinks"],
      tone: "connected",
    },
    {
      id: "granola",
      name: "Granola",
      type: "Meeting notes",
      category: "Meetings",
      icon: "G",
      color: "#ECD67F",
      status: "Connected",
      description: "Pull structured meeting notes and decisions into Fuel so customer asks, blockers, and investor feedback become signal context.",
      sources: ["transcripts", "decisions", "follow-ups"],
      tone: "connected",
    },
    {
      id: "google-meet",
      name: "Google Meet",
      type: "Meetings",
      category: "Meetings",
      icon: "GM",
      color: "#00AC47",
      includedLabel: "Included in context package",
      status: "Connect",
      description: "Bring sales calls, roadmap reviews, and weekly check-ins into Sources for richer GTM and product intelligence.",
      sources: ["calendar", "recordings", "attendees"],
    },
    {
      id: "zoom",
      name: "Zoom",
      type: "Meetings",
      category: "Meetings",
      icon: "Z",
      color: "#2D8CFF",
      logoSrc: "/source-logos/zoom.svg",
      includedLabel: "Included in context package",
      status: "Connect",
      description: "Use Zoom conversations to identify repeated objections, expansion signals, stakeholder requests, and team commitments.",
      sources: ["recordings", "transcripts", "topics"],
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      type: "Social signal",
      category: "Social",
      icon: "in",
      color: "#0A66C2",
      includedLabel: "Included in context package",
      status: "Connect",
      description: "Track founder posts, company announcements, hiring signals, investor engagement, and market narrative shifts.",
      sources: ["posts", "engagement", "company updates"],
    },
    {
      id: "hubspot",
      name: "HubSpot",
      type: "CRM activity",
      category: "CRM",
      icon: "H",
      color: "#FF7A59",
      logoSrc: "/source-logos/hubspot.svg",
      status: "Connected",
      description: "Sync emails, notes, lifecycle movement, and deal activity to give Fuel context behind growth and retention signals.",
      sources: ["emails", "notes", "deals"],
      tone: "connected",
    },
    {
      id: "salesforce-context",
      name: "Salesforce",
      type: "CRM activity",
      category: "CRM",
      icon: "SF",
      color: "#00A1E0",
      includedLabel: "Included in context package",
      status: "Connect",
      description: "Bring account notes, opportunity movement, and activity history into the context layer behind revenue signals.",
      sources: ["opportunities", "activities", "accounts"],
    },
    {
      id: "gmail",
      name: "Gmail",
      type: "Email context",
      category: "Email",
      icon: "Gm",
      color: "#EA4335",
      includedLabel: "Included in context package",
      status: "Connect",
      description: "Use customer and investor email threads to understand commitments, asks, blockers, and follow-up signals.",
      sources: ["threads", "contacts", "follow-ups"],
    },
    {
      id: "outlook",
      name: "Outlook",
      type: "Email context",
      category: "Email",
      icon: "O",
      color: "#0078D4",
      includedLabel: "Included in context package",
      status: "Connect",
      description: "Connect Microsoft email and calendar context to enrich meetings, stakeholder activity, and GTM signals.",
      sources: ["email", "calendar", "attendees"],
    },
  ];
  const connectorFields = {
    "google-meet": [
      { label: "Google Workspace domain", placeholder: "patriotpay.com" },
      { label: "Admin email", placeholder: "admin@patriotpay.com" },
      { label: "OAuth client ID", placeholder: "Paste OAuth client ID" },
      { label: "OAuth client secret", placeholder: "Paste OAuth client secret", secret: true },
    ],
    zoom: [
      { label: "Zoom account ID", placeholder: "Account ID" },
      { label: "Client ID", placeholder: "Server-to-server OAuth client ID" },
      { label: "Client secret", placeholder: "Client secret", secret: true },
      { label: "Webhook secret token", placeholder: "Webhook secret token", secret: true },
    ],
    linkedin: [
      { label: "Company page URL", placeholder: "https://www.linkedin.com/company/patriotpay" },
      { label: "LinkedIn organization ID", placeholder: "Organization ID" },
      { label: "Access token", placeholder: "OAuth access token", secret: true },
      { label: "Refresh token", placeholder: "OAuth refresh token", secret: true },
    ],
    granola: [
      { label: "Workspace email", placeholder: "team@patriotpay.com" },
      { label: "API key", placeholder: "Granola API key", secret: true },
    ],
    hubspot: [
      { label: "HubSpot portal ID", placeholder: "Portal ID" },
      { label: "Private app access token", placeholder: "Access token", secret: true },
    ],
    "salesforce-context": [
      { label: "Salesforce instance URL", placeholder: "https://yourcompany.my.salesforce.com" },
      { label: "Client ID", placeholder: "Connected app client ID" },
      { label: "Client secret", placeholder: "Connected app client secret", secret: true },
      { label: "Refresh token", placeholder: "OAuth refresh token", secret: true },
    ],
    gmail: [
      { label: "Google Workspace domain", placeholder: "patriotpay.com" },
      { label: "Admin email", placeholder: "admin@patriotpay.com" },
      { label: "OAuth client ID", placeholder: "Paste OAuth client ID" },
      { label: "OAuth client secret", placeholder: "Paste OAuth client secret", secret: true },
    ],
    outlook: [
      { label: "Microsoft tenant ID", placeholder: "Tenant ID" },
      { label: "Client ID", placeholder: "Azure app client ID" },
      { label: "Client secret", placeholder: "Azure app client secret", secret: true },
      { label: "Mailbox scope", placeholder: "sales@patriotpay.com or domain-wide" },
    ],
  };
  const recommendedConnectors = contextConnectors.filter(connector => connector.tone !== "connected");
  const activeConnector = selectedConnector || recommendedConnectors[0];

  const startAddSource = () => {
    setShowSourceForm(true);
    setSignalsGenerated(false);
    setSourceTitle("");
    setSourceDescription("");
    setAttachedDocument(null);
  };

  const cancelAddSource = () => {
    setShowSourceForm(false);
    setSourceTitle("");
    setSourceDescription("");
    setAttachedDocument(null);
  };

  const handleAttachDocument = (typeId: string, typeLabel: string, file: File) => {
    setAttachedDocument({ typeId, typeLabel, file });
  };

  const handleGenerateIntelligence = () => {
    if (!sourceTitle.trim()) return;
    tryAction("generateSource", () => {
      const item = createSourceIntelligence({
        title: sourceTitle,
        description: sourceDescription,
        document: attachedDocument
          ? {
              typeId: attachedDocument.typeId,
              typeLabel: attachedDocument.typeLabel,
              fileName: attachedDocument.file.name,
            }
          : undefined,
      });
      onIntelligenceGenerated?.(item);
      if (attachedDocument && onPersistSourceDocument) {
        onPersistSourceDocument(
          attachedDocument.typeId,
          attachedDocument.typeLabel,
          attachedDocument.file,
          [item.id],
        );
      }
      setSignalsGenerated(true);
      setShowSourceForm(false);
      setSourceTitle("");
      setSourceDescription("");
      setAttachedDocument(null);
    });
  };

  return (
    <section className="context-feed-page">
      <div className="sources-panel">
        <div className="sources-header">
          <div className="sources-header-copy">
            <span>Sources</span>
            <strong>Auto-generate sources from connected context</strong>
            <p>Capture notes, connector activity, and meetings — then turn them into intelligence.</p>
      </div>
          <div className="sources-header-actions">
            {showSourceForm ? (
              <>
                <button type="button" className="ghost" onClick={cancelAddSource}>Cancel</button>
            <button
                  type="button"
                  className={`primary${generationBlocked ? " credit-action-disabled" : ""}`}
                  disabled={!sourceTitle.trim() || signalsGenerated}
                  onClick={() => {
                    if (generationBlocked) {
                      setPopoverOpen(true);
                      return;
                    }
                    handleGenerateIntelligence();
                  }}
                >
                  {signalsGenerated ? "Generated" : "Generate intelligence"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={highlightAddSource ? "tour-highlight" : ""}
                  data-tour-target={highlightAddSource ? "add-source" : undefined}
                  onClick={startAddSource}
                >
                  + Add a source
                </button>
              </>
            )}
              </div>
                </div>

        {showSourceForm ? (
          <div className="source-add-form">
            <label className="source-add-form-title-label">
              <span>Title</span>
              <div className="source-add-form-title-row">
                <input
                  type="text"
                  value={sourceTitle}
                  onChange={(event) => setSourceTitle(event.target.value)}
                  placeholder="e.g. Q3 enterprise pipeline risk"
                  autoFocus
                />
                {onPersistSourceDocument ? (
                  <DocumentUploadDropdown
                    inline
                    documentSlots={documentSlots}
                    onUpload={handleAttachDocument}
                    attachedFileName={attachedDocument?.file.name}
                  />
                ) : null}
                </div>
            </label>
            {attachedDocument ? (
              <div className="source-attached-document">
                <span>
                  <strong>{attachedDocument.typeLabel}</strong>
                  <em>{attachedDocument.file.name}</em>
                  </span>
                <button type="button" onClick={() => setAttachedDocument(null)}>Remove</button>
                </div>
            ) : null}
            <label>
              <span>Description</span>
              <textarea
                value={sourceDescription}
                onChange={(event) => setSourceDescription(event.target.value)}
                placeholder="What should Fuel extract from this source?"
                rows={2}
              />
            </label>
              </div>
        ) : null}

      </div>

      {connectorsOpen ? (
        <>
          <button
            className="context-sidebar-scrim"
            aria-label="Close connector setup"
            onClick={() => setConnectorsOpen(false)}
          />
          <div className="context-connector-sidebar">
            <div className="context-sidebar-head">
              <div>
                <span>{activeConnector?.type}</span>
                <strong>Connect {activeConnector?.name}</strong>
              </div>
              <button onClick={() => setConnectorsOpen(false)}>×</button>
            </div>
            <div className="context-setup-form">
              <div className="context-drawer-connector-head">
                <div style={{ background: activeConnector?.color + "22", color: activeConnector?.color }}>
                  {activeConnector?.icon}
                </div>
                <p>{activeConnector?.description}</p>
              </div>
              {(connectorFields[activeConnector?.id] || []).map(field => (
                <label key={field.label}>
                  <span>{field.label}</span>
                  <input type={field.secret ? "password" : "text"} placeholder={field.placeholder} />
                </label>
              ))}
              <div className="context-form-actions">
                <button>Save connection</button>
                <button className="secondary" onClick={() => setConnectorsOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function ProfileUsagePanel({
  snapshot,
  userName,
  userEmail,
  onClose,
  onUpgrade,
  onTopUp,
}: {
  snapshot: CreditSnapshot;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onUpgrade: () => void;
  onTopUp?: () => void;
}) {
  const remaining = totalRemaining(snapshot);
  const usedPercent = Math.round((1 - monthlyRemainingRatio(snapshot)) * 100);
  const dailyLeft = dailyRemaining(snapshot);

  return (
    <div className="profile-usage-panel" role="dialog" aria-label="Profile and credits">
      <div className="profile-usage-head">
        <div>
          <strong>{userName}</strong>
          <span>{userEmail}</span>
        </div>
        <button type="button" className="profile-usage-close" aria-label="Close profile menu" onClick={onClose}>×</button>
      </div>
      {snapshot.plan === "free" ? (
        <>
          <p className="profile-usage-advisor-copy">An AI advisor that doesn&apos;t take percentage points of your company.</p>
          <button type="button" className="profile-usage-upgrade-link" onClick={onUpgrade}>
            Go Pro · from $25/mo →
          </button>
        </>
      ) : onTopUp ? (
        <button type="button" className="profile-usage-upgrade-link" onClick={onTopUp}>
          Top up credits →
        </button>
      ) : null}
      <div className="profile-usage-plan">
        <span className={`profile-usage-plan-badge ${snapshot.plan}`}>{snapshot.plan === "pro" ? "Pro" : "Free"}</span>
        <em>Resets {snapshot.monthlyResetLabel}</em>
          </div>
      <div className="profile-usage-section">
        <div className="profile-usage-section-head">
          <span>Credits this month</span>
          <strong>{remaining.toLocaleString()} left</strong>
                  </div>
        <div className="profile-usage-meter" aria-hidden="true">
          <span
            className={`profile-usage-meter-fill${remaining <= snapshot.monthlyLimit * 0.1 ? " low" : ""}`}
            style={{ width: `${Math.max(4, Math.round(monthlyRemainingRatio(snapshot) * 100))}%` }}
          />
                </div>
        <p className="profile-usage-status">{dailyLeft} daily credits left today · {usedPercent}% used</p>
              </div>
      <div className="profile-usage-breakdown">
        <span className="profile-usage-breakdown-label">This month</span>
        <div className="profile-usage-breakdown-row"><span>Signals</span><strong>{snapshot.stats.signals}</strong></div>
        <div className="profile-usage-breakdown-row"><span>Docs</span><strong>{snapshot.stats.docs}</strong></div>
        <div className="profile-usage-breakdown-row"><span>AI messages</span><strong>{snapshot.stats.messages}</strong></div>
          </div>
    </div>
  );
}

function AskFuelAiButton() {
  const { snapshot, tryAction, generationBlocked, setPopoverOpen } = useCredits();
  const remaining = totalRemaining(snapshot);
  const dailyLeft = dailyRemaining(snapshot);

  return (
    <button
      className={`ask-ai-btn${generationBlocked ? " credit-action-disabled" : ""}`}
      title={`${remaining} credits · ${dailyLeft} daily left`}
      onClick={() => {
        if (generationBlocked) {
          setPopoverOpen(true);
          return;
        }
        tryAction("aiChat", () => undefined);
      }}
    >
      ✦ Ask Fuel AI
    </button>
  );
}

function SidebarProfileFooter({
  profileMenuOpen,
  setProfileMenuOpen,
  profileMenuRef,
}: {
  profileMenuOpen: boolean;
  setProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { snapshot, openUpgrade } = useCredits();

  return (
    <>
      <CreditIndicator />
      <div className="sidebar-foot-wrap" ref={profileMenuRef}>
        {profileMenuOpen ? (
          <ProfileUsagePanel
            snapshot={snapshot}
            userName="Shreya Gokani"
            userEmail="shreya.g@york.ie"
            onClose={() => setProfileMenuOpen(false)}
            onUpgrade={() => {
              setProfileMenuOpen(false);
              openUpgrade("pro");
            }}
            onTopUp={() => {
              setProfileMenuOpen(false);
              openUpgrade("topup");
            }}
          />
      ) : null}
        <button
          type="button"
          className={`sidebar-foot${profileMenuOpen ? " open" : ""}`}
          aria-expanded={profileMenuOpen}
          aria-label="Open profile and usage"
          onClick={() => setProfileMenuOpen(current => !current)}
        >
          <div className="sidebar-foot-avatar">SG</div>
          <div className="sidebar-foot-copy">
            <div className="sidebar-foot-name">
              Shreya Gokani
              {snapshot.plan === "free" ? <span className="credit-inline-badge">Free</span> : (
                <span className="credit-plan-badge pro" style={{ marginLeft: 6, fontSize: 9, padding: "2px 6px" }}>Pro</span>
              )}
            </div>
            <div className="sidebar-foot-email">shreya.g@york.ie</div>
          </div>
        </button>
      </div>
    </>
  );
}

export default function PatriotPayJourney({
  initialPage = "journey",
  initialBenchmark = null,
}: {
  initialPage?: string;
  initialBenchmark?: OnboardingBenchmarkInput | null;
}) {
  return (
    <CreditProvider>
      <PatriotPayJourneyInner initialPage={initialPage} initialBenchmark={initialBenchmark} />
      <UpgradeModal />
      <CreditToastHost />
    </CreditProvider>
  );
}

function PatriotPayJourneyInner({
  initialPage = "journey",
  initialBenchmark = null,
}: {
  initialPage?: string;
  initialBenchmark?: OnboardingBenchmarkInput | null;
}) {
  const startsWithTour = initialPage === "guided-tour";
  const startsWithTourAfterSignals = initialPage === "signals-loading-tour";
  const startsWithOverview = initialPage === "overview-loading";
  const [openTracks, setOpenTracks] = useState(() => new Set());
  const [openDropdown, setOpenDropdown] = useState(null);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [activePage, setActivePage] = useState(startsWithTour ? "overview" : (startsWithTourAfterSignals || startsWithOverview) ? "signals-loading" : initialPage);
  const [tourOpen, setTourOpen] = useState(startsWithTour);
  const [tourStep, setTourStep] = useState(0);
  const [developmentIntegrations, setDevelopmentIntegrations] = useState({ integrations: [] });
  const [marketingIntegrations, setMarketingIntegrations] = useState(true);
  const [profileComplete, setProfileComplete] = useState(initialPage === "signals-loading" || startsWithTourAfterSignals || startsWithOverview);
  const [documentSlots, setDocumentSlots] = useState<DataRoomDocumentSlot[]>(createInitialDocumentSlots);
  const [processingDocumentTypeId, setProcessingDocumentTypeId] = useState<string | null>(null);
  const [documentHistorySlot, setDocumentHistorySlot] = useState<DataRoomDocumentSlot | null>(null);
  const initialBenchmarkSeed = initialBenchmark ? createBenchmarkIntelligence(toBenchmarkFormValues(initialBenchmark)) : null;
  const [intelligenceItems, setIntelligenceItems] = useState<IntelligenceItem[]>(
    () => initialBenchmarkSeed?.items ?? [],
  );
  const [intelligenceFocus, setIntelligenceFocus] = useState<IntelligenceFocus | null>(null);
  const [benchmarkSubmission, setBenchmarkSubmission] = useState<BenchmarkSubmission | null>(
    () => initialBenchmarkSeed?.submission ?? null,
  );
  const [benchmarkBlinkIds, setBenchmarkBlinkIds] = useState<string[]>([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { tryAction } = useCredits();
  const handleDocumentUpload = (typeId: string, typeLabel: string, file: File, source: string) => {
    tryAction("docUpload", () => {
      setProcessingDocumentTypeId(typeId);
      window.setTimeout(() => {
        const generatedItems = createDocumentIntelligence(typeId, typeLabel, file.name);
        const generatedIds = generatedItems.map(item => item.id);
        setIntelligenceItems(previous => [...generatedItems, ...previous]);
        setBenchmarkBlinkIds(generatedIds);
        window.setTimeout(() => setBenchmarkBlinkIds([]), 900);
        setDocumentSlots(previous => upsertDocumentSlot(previous, {
          typeId,
          typeLabel,
          file,
          source,
          intelligenceIds: generatedIds,
          intelligenceCount: generatedItems.length,
        }));
        setProcessingDocumentTypeId(null);
      }, 1400);
    });
  };
  const persistSourceDocument = (
    typeId: string,
    typeLabel: string,
    file: File,
    intelligenceIds: string[],
    source = "Intelligence · Source upload",
  ) => {
    setDocumentSlots(previous => upsertDocumentSlot(previous, {
      typeId,
      typeLabel,
      file,
      source,
      intelligenceIds,
      intelligenceCount: intelligenceIds.length,
    }));
  };
  const applyBenchmarkSubmission = (values: BenchmarkFormValues) => {
    const { items, submission } = createBenchmarkIntelligence(values);
    setIntelligenceItems(previous => {
      const nonBenchmark = previous.filter(item => !item.id.startsWith("intel-bench-"));
      return [...items, ...nonBenchmark];
    });
    setBenchmarkSubmission(submission);
    setBenchmarkBlinkIds(submission.intelligenceIds);
    window.setTimeout(() => setBenchmarkBlinkIds([]), 900);
  };
  const handleBenchmarkSubmit = (values: BenchmarkFormValues) => {
    applyBenchmarkSubmission(values);
    setActivePage("signals");
  };
  const handleViewIntelligenceFromDataRoom = (record: DataRoomFileRecord) => {
    if (!record.intelligenceIds.length) return;
    setIntelligenceFocus({ ids: record.intelligenceIds, label: record.name });
    setActivePage("signals");
  };
  const [selectedCompany, setSelectedCompany] = useState({
    id: "patriotpay",
    name: "patriotpay",
    displayName: "Patriot Pay",
    domain: "patriotpay.com",
    logo: "P",
    logoBg: "#1E4D8C",
    meta: "Healthcare · Patient Billing · Seed",
    headquarters: "Boston, MA, US",
    employees: "11-50",
    linkedin: "linkedin.com/company/patriotpay",
  });
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const [tourTaken, setTourTaken] = useState(() => {
    try {
      const lastTakenAt = Number(window.localStorage.getItem("fuelWorkspaceTourTakenAt") || 0);
      return lastTakenAt > 0 && Date.now() - lastTakenAt < TOUR_TAKEN_COOLDOWN_MS;
    } catch {
      return false;
    }
  });
  const isProfileWizard = activePage === "profile-wizard" || activePage === "benchmark-form";
  const tourSteps = [
    {
      page: "overview",
      target: "overview",
      title: "Overview",
      text: "This is the company home base. Use it to review the company snapshot, key details, funding history, related companies, and data sources Fuel has on file.",
    },
    {
      page: "signals",
      target: "signals",
      title: "Intelligence",
      text: "The Intelligence tab combines sources, evidence, benchmarks, and generated insights so you can see what Fuel used and what it produced.",
    },
    {
      page: "signals",
      target: "add-source",
      title: "Add a source",
      text: "Add notes, upload a document, or capture context here — then generate intelligence from it. This is where manual sources and private uploads enter the timeline.",
    },
    {
      page: "data-room",
      target: "data-room",
      title: "Data Room",
      text: "The Data Room stores pitch decks, investor notes, models, and other private files. Fuel uses them as evidence behind intelligence and benchmarks.",
    },
    {
      page: "initiatives",
      target: "initiatives",
      title: "Initiatives",
      text: "The Initiatives tab turns insights into action. This is where recommended work, priorities, and growth projects can be managed.",
    },
    {
      page: "overview",
      target: "playbooks",
      title: "Playbooks",
      text: "The Playbooks button opens runbooks Fuel AI can execute against the company using signal context and benchmarks, producing artifacts like diligence, pricing reviews, audits, and planning frameworks.",
    },
    {
      page: "overview",
      target: "finish-profile",
      title: "Finish profile",
      text: "Before Fuel can generate detailed signals, complete the company profile and add the required context. You can still log a signal manually at any time.",
    },
  ];

  const suggestion = useMemo(() => {
    const weakest = tracks.find((track) => track.health === "grey") || tracks.find((track) => track.health === "amber");
    return weakest ? suggestionMessages[weakest.id] : null;
  }, []);

  const displayTracks = useMemo(() => tracks.map((track) => {
    if (track.id === "gtm" && !marketingIntegrations) {
      return {
        ...track,
        health: "grey",
        healthLabel: "Integration Needed",
        fill: 0,
        stat: { label: "Status", val: "Connect sources" },
        team: [],
        milestones: [],
        emptyText: "Connect marketing sources to unlock Marketing snapshot",
        chips: [
          { label: "GTM dashboard access", color: "#3DD68C" },
          { label: "Google Analytics", color: "#F59E0B" },
          { label: "Ads, SEO, social", color: "#D4924A" },
        ],
      };
    }

    return track;
  }), [marketingIntegrations]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBarsAnimated(true);
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (activePage !== "signals-loading") return;

    const timer = window.setTimeout(() => {
      if (startsWithOverview) {
        setActivePage("scorecard-v2");
        return;
      }
      if (startsWithTourAfterSignals) {
        setActivePage("signals");
        setShowTourPrompt(true);
        return;
      }
      setActivePage("signals");
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activePage, startsWithTourAfterSignals, startsWithOverview]);

  useEffect(() => {
    function closeDropdown(event) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".t-more")) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("click", closeDropdown);

    return () => {
      document.removeEventListener("click", closeDropdown);
    };
  }, []);

  function toggleTrack(id) {
    setOpenTracks((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openDetailPage(page) {
    if (page === "marketing" && !marketingIntegrations) {
      setActivePage("marketing-setup");
      return;
    }
    setActivePage(page);
  }

  function setTourIndex(index) {
    const nextIndex = Math.max(0, Math.min(index, tourSteps.length - 1));
    setTourStep(nextIndex);
    setActivePage(tourSteps[nextIndex].page);
  }

  function startTour() {
    setShowTourPrompt(false);
    setTourOpen(true);
    setTourIndex(0);
  }

  function dismissTourPrompt() {
    setShowTourPrompt(false);
    try {
      window.localStorage.setItem("fuelTourPromptSnoozedUntil", String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {
      // Ignore storage failures in preview/demo environments.
    }
  }

  function closeTour(completed = false) {
    setTourOpen(false);
    if (completed) {
      setTourTaken(true);
      try {
        window.localStorage.setItem("fuelWorkspaceTourTakenAt", String(Date.now()));
        window.localStorage.setItem("fuelWorkspaceTourTaken", "true");
      } catch {
        // Ignore storage failures in preview/demo environments.
      }
    }
    if (startsWithTour) {
      setActivePage("overview");
    }
  }

  function skipTour() {
    closeTour(false);
    setTourTaken(false);
    try {
      window.localStorage.removeItem("fuelWorkspaceTourTakenAt");
      window.localStorage.removeItem("fuelWorkspaceTourTaken");
    } catch {
      // Ignore storage failures in preview/demo environments.
    }
  }

  function nextTourStep() {
    const lastTourStep = profileComplete ? tourSteps.length - 2 : tourSteps.length - 1;
    if (tourStep >= lastTourStep) {
      closeTour(true);
      return;
    }
    setTourIndex(tourStep + 1);
  }

  function previousTourStep() {
    setTourIndex(tourStep - 1);
  }

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [profileMenuOpen]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">Y</div>
          <div>
            <div className="brand-name">YORK·IE</div>
            <div className="brand-sub">FUEL 2.0</div>
          </div>
        </div>
        <div className="account-card">
          <div className="account-avatar">M</div>
          <div className="account-name">My Account</div>
        </div>
        <div className="nav-section">
          <div className="nav-label">Research</div>
          <div className="nav-item">⊟ Watchlists</div>
          <div className="nav-item">
            ▦ Pipeline <span className="nav-count">0</span>
          </div>
        </div>
        <div className="nav-section">
          <div className="nav-label">Portfolio</div>
          <div className="nav-item">▢ Portfolios</div>
        </div>
        <div className="nav-section">
          <div className="nav-label">Value creation</div>
          <div className="nav-item">
            ↗ Initiatives <span className="nav-count">0</span>
          </div>
          <div className="nav-item">▥ Benchmarks</div>
          <div className="nav-item">▤ Playbooks</div>
        </div>
        <div className="nav-section">
          <div className="nav-label">Integrations</div>
          <div className="nav-item" style={{ cursor: "pointer" }} onClick={() => setActivePage("connectors")}>
            ⟳ Connectors <span className="nav-count">13</span>
          </div>
        </div>
        <div className="nav-section">
          <div className="nav-label">Network</div>
          <div className="nav-item">
            ◉ Advisors <span className="nav-count">32</span>
          </div>
          <div className="nav-item">
            ⚉ Service providers <span className="nav-count">0</span>
          </div>
          <div className="nav-item">
            ↗ Investors <span className="nav-count">0</span>
          </div>
        </div>
        <div className="nav-section">
          <div className="nav-label">Recently viewed</div>
            <div
              className={`recent-item ${selectedCompany.id === "patriotpay" ? "active" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setSelectedCompany({
                  id: "patriotpay",
                  name: "patriotpay",
                  displayName: "Patriot Pay",
                  domain: "patriotpay.com",
                  logo: "P",
                  logoBg: "#1E4D8C",
                  meta: "Healthcare · Patient Billing · Seed",
                  headquarters: "Boston, MA, US",
                  employees: "11-50",
                  linkedin: "linkedin.com/company/patriotpay",
                });
                setActivePage("journey");
              }}
            >
            <div className="recent-favicon" style={{ background: "#1E4D8C", color: "#fff" }}>
              P
            </div>
            patriotpay
          </div>
          <div
            className={`recent-item ${selectedCompany.id === "operator-ai" ? "active" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => {
              setSelectedCompany({
                id: "operator-ai",
                name: "Operator AI",
                displayName: "Operator AI",
                domain: "operator.ai",
                logo: "O",
                logoBg: "#5B3A8C",
                meta: "AI Operations · Workflow Automation · Seed",
                headquarters: "New York, NY, US",
                employees: "11-50",
                linkedin: "linkedin.com/company/operator-ai",
              });
              setProfileComplete(true);
              setActivePage("overview");
            }}
          >
            <div className="recent-favicon" style={{ background: "#5B3A8C", color: "#fff" }}>
              O
            </div>
            Operator AI
          </div>
          <div className="recent-item">
            <div className="recent-favicon" style={{ background: "#8C5B3A", color: "#fff" }}>
              S
            </div>
            Sync Sports
          </div>
          <div className="recent-item">
            <div className="recent-favicon" style={{ background: "#3A8C5B", color: "#fff" }}>
              W
            </div>
            Winrate
          </div>
        </div>
        <SidebarProfileFooter
          profileMenuOpen={profileMenuOpen}
          setProfileMenuOpen={setProfileMenuOpen}
          profileMenuRef={profileMenuRef}
        />
      </aside>

      <div className="main">
        {activePage === "connectors" ? (
          <ConnectorsPage onComplete={() => setActivePage("journey")} embedded />
        ) : (<><div className="topbar">
          <div className="breadcrumb">
            Fuel <span style={{ margin: "0 5px", color: "var(--text-4)" }}>/</span>
            <span className="current">Company</span>
          </div>
          <div className="topbar-right">
            <div className="search-box">
              <span style={{ fontSize: "12px", opacity: 0.6 }}>⌕</span> Search companies...
            </div>
            <AskFuelAiButton />
            {!isProfileWizard && !tourTaken ? (
              <button className="header-btn" onClick={startTour}>Tour</button>
            ) : null}
            <span style={{ fontSize: "12px", color: "var(--text-3)" }}>Q4 '25 · Nov 8</span>
          </div>
        </div>

        {!isProfileWizard ? <div className="company-header">
          <div className="company-card">
            <div className="company-logo" style={{ background: selectedCompany.logoBg }}>{selectedCompany.logo}</div>
            <div className="company-identity">
              <div className="company-name-row">
                <div className="company-name">{selectedCompany.displayName}</div>
                <span className="badge">{selectedCompany.domain}</span>
              </div>
              <div className="company-meta">
                <span>Engaged Feb 2024</span>
                <span className="dot" />
                <span>{selectedCompany.meta}</span>
                <span className="dot" />
                <span>9 months active</span>
              </div>
            </div>
            <div className="header-actions">
              <button
                type="button"
                className={`company-overview-chip${activePage === "overview" ? " active" : ""}${tourOpen && tourSteps[tourStep].target === "overview" ? " tour-highlight" : ""}`}
                data-tour-target={tourOpen && tourSteps[tourStep].target === "overview" ? "overview" : undefined}
                onClick={() => setActivePage("overview")}
              >
                <span className="company-overview-chip-dot" /                >
                  Profile
                </button>
              <button className={`header-btn ${tourOpen && tourSteps[tourStep].target === "playbooks" ? "tour-highlight" : ""}`} data-tour-target={tourOpen && tourSteps[tourStep].target === "playbooks" ? "playbooks" : undefined}>Playbooks ▾</button>
              <button className="header-btn primary">≡ Generate brief</button>
            </div>
          </div>
        </div> : null}

        {!isProfileWizard ? <div className="tabs">
          <div className={`tab ${activePage === "scorecard-v2" ? "active" : ""}`} onClick={() => setActivePage("scorecard-v2")}>Overview</div>
          <div className={`tab ${activePage === "signals" || activePage === "context-feed" ? "active" : ""} ${tourOpen && tourSteps[tourStep].target === "signals" ? "tour-highlight" : ""}`} data-tour-target={tourOpen && tourSteps[tourStep].target === "signals" ? "signals" : undefined} onClick={() => setActivePage("signals")}>Intelligence</div>
          <div
            className={`tab ${activePage === "initiatives" ? "active" : ""} ${tourOpen && tourSteps[tourStep].target === "initiatives" ? "tour-highlight" : ""}`}
            data-tour-target={tourOpen && tourSteps[tourStep].target === "initiatives" ? "initiatives" : undefined}
            onClick={() => setActivePage("initiatives")}
          >
            Initiatives <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "4px" }}>2</span>
          </div>
          <div className="tab">
            Research <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "4px" }}>1</span>
          </div>
          <div
            className={`tab ${activePage === "data-room" ? "active" : ""} ${tourOpen && tourSteps[tourStep].target === "data-room" ? "tour-highlight" : ""}`}
            data-tour-target={tourOpen && tourSteps[tourStep].target === "data-room" ? "data-room" : undefined}
            onClick={() => setActivePage("data-room")}
          >
            Data Room
            {countActiveDocuments(documentSlots) > 0 ? (
              <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "4px" }}>{countActiveDocuments(documentSlots)}</span>
            ) : null}
          </div>
          <div className={`tab ${activePage === "journey" ? "active" : ""}`} onClick={() => setActivePage("journey")}>Scorecard</div>
        </div> : null}

        {!isProfileWizard && showTourPrompt ? (
          <TourPromptBanner
            onStartTour={startTour}
            onDismiss={dismissTourPrompt}
          />
        ) : null}

        <div className={`content ${isProfileWizard ? "profile-wizard-content" : ""}`}>
          {activePage === "development-setup" ? (
            <IntegrationSetupPage
              onBack={() => setActivePage("journey")}
              onSave={(setup) => {
                setDevelopmentIntegrations(setup);
                setActivePage("development");
              }}
            />
          ) : activePage === "marketing-setup" ? (
            <IntegrationSetupPage
              mode="marketing"
              options={marketingIntegrationOptions}
              defaultSelected={["gtm-dashboard"]}
              onBack={() => setActivePage("journey")}
              onSave={(setup) => {
                setMarketingIntegrations(setup);
                setActivePage("marketing");
              }}
            />
          ) : activePage === "development" ? (
            <DevelopmentDetailPage
              onBack={() => setActivePage("journey")}
            />
          ) : activePage === "marketing" ? (
            <MarketingDetailPage onBack={() => setActivePage("journey")} />
          ) : activePage === "signals-loading" ? (
            <SignalsLoadingPage />
          ) : activePage === "signals" ? (
            <SignalsPage
              isProfileComplete={profileComplete}
              onLogBenchmarkData={() => setActivePage("profile-wizard")}
              onUpdatePeriod={() => setActivePage("benchmark-form")}
              onLinkConnectors={() => setActivePage("connectors")}
              documentSlots={documentSlots}
              processingDocumentTypeId={processingDocumentTypeId}
              onUploadDocument={(typeId, typeLabel, file) => handleDocumentUpload(typeId, typeLabel, file, "Intelligence · Private upload")}
              onPersistSourceDocument={(typeId, typeLabel, file, intelligenceIds) => (
                persistSourceDocument(typeId, typeLabel, file, intelligenceIds, "Intelligence · Source upload")
              )}
              onOpenDataRoom={() => setActivePage("data-room")}
              intelligenceItems={intelligenceItems}
              setIntelligenceItems={setIntelligenceItems}
              intelligenceFocus={intelligenceFocus}
              onClearIntelligenceFocus={() => setIntelligenceFocus(null)}
              benchmarkSubmission={benchmarkSubmission}
              onEditBenchmark={() => setActivePage("benchmark-form")}
              benchmarkBlinkIds={benchmarkBlinkIds}
              activeTourTarget={tourOpen ? tourSteps[tourStep].target : undefined}
            />
          ) : activePage === "benchmark-form" ? (
            <LogPrivateDataPage
              onBack={() => setActivePage("signals")}
              onSubmit={handleBenchmarkSubmit}
              initialValues={benchmarkSubmission?.formValues || EMPTY_BENCHMARK_FORM}
            />
          ) : activePage === "profile-wizard" ? (
            <FinishProfileWizard
              onBack={() => setActivePage("signals")}
              onSubmitBenchmark={() => {
                applyBenchmarkSubmission(WIZARD_DEFAULT_BENCHMARK);
                setProfileComplete(true);
                setActivePage("signals-loading");
              }}
            />
          ) : activePage === "overview" ? (
            <OverviewPage
              activeTourTarget={tourOpen ? tourSteps[tourStep].target : undefined}
              profileComplete={profileComplete}
              onEditProfile={() => setActivePage("profile-wizard")}
              company={selectedCompany}
            />
          ) : activePage === "context-feed" ? (
            <SignalsPage
              isProfileComplete={profileComplete}
              onLogBenchmarkData={() => setActivePage("profile-wizard")}
              onUpdatePeriod={() => setActivePage("benchmark-form")}
              onLinkConnectors={() => setActivePage("connectors")}
              documentSlots={documentSlots}
              processingDocumentTypeId={processingDocumentTypeId}
              onUploadDocument={(typeId, typeLabel, file) => handleDocumentUpload(typeId, typeLabel, file, "Intelligence · Private upload")}
              onPersistSourceDocument={(typeId, typeLabel, file, intelligenceIds) => (
                persistSourceDocument(typeId, typeLabel, file, intelligenceIds, "Intelligence · Source upload")
              )}
              onOpenDataRoom={() => setActivePage("data-room")}
              intelligenceItems={intelligenceItems}
              setIntelligenceItems={setIntelligenceItems}
              intelligenceFocus={intelligenceFocus}
              onClearIntelligenceFocus={() => setIntelligenceFocus(null)}
              benchmarkSubmission={benchmarkSubmission}
              onEditBenchmark={() => setActivePage("benchmark-form")}
              benchmarkBlinkIds={benchmarkBlinkIds}
              activeTourTarget={tourOpen ? tourSteps[tourStep].target : undefined}
            />
          ) : activePage === "initiatives" ? (
            <InitiativesPage />
          ) : activePage === "data-room" ? (
            <DataRoomPage
              documentSlots={documentSlots}
              processingDocumentTypeId={processingDocumentTypeId}
              onUploadDocument={(typeId, typeLabel, file) => handleDocumentUpload(typeId, typeLabel, file, "Data Room · Private upload")}
              onViewIntelligence={handleViewIntelligenceFromDataRoom}
              onOpenDocumentHistory={setDocumentHistorySlot}
            />
          ) : activePage === "scorecard-v2" ? (
            <ScorecardV2
              benchmark={formValuesToOnboardingBenchmark(
                benchmarkSubmission?.formValues ?? (initialBenchmark ? toBenchmarkFormValues(initialBenchmark) : WIZARD_DEFAULT_BENCHMARK),
              )}
              cohortLabel={selectedCompany.meta}
              companyName={selectedCompany.displayName}
              journeyStage="Early Revenue"
              documentSlots={documentSlots.map(slot => ({
                typeId: slot.typeId,
                typeLabel: slot.typeLabel,
                current: slot.current ? { name: slot.current.name } : null,
              }))}
              onUploadPitchDeck={() => setActivePage("data-room")}
              onOpenIntelligence={() => setActivePage("signals")}
              onOpenInitiatives={() => setActivePage("initiatives")}
              onGenerateInitiative={() => setActivePage("initiatives")}
            />
          ) : activePage === "journey" ? (
            <>
              <div className="journey-header">
                <div>
                  <div className="journey-title">Scorecard</div>
                  <div className="journey-sub">Health and milestones across active service tracks · click milestones for details</div>
                </div>
                <div className="journey-stage-card">
                  <div className="journey-stage-mini">
                    <span>Foundation</span>
                    <strong>Acceleration</strong>
                    <span>Scale</span>
                    <span>Optimization</span>
                  </div>
                </div>
              </div>

              <div style={{ background: "#1F3140", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "6px 22px 8px" }}>
                <div className="tracks" id="tracks">
                  {displayTracks.map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={index}
                      isOpen={openTracks.has(track.id)}
                      onToggle={toggleTrack}
                      onOpenDetail={openDetailPage}
                      barsAnimated={barsAnimated}
                      openDropdown={openDropdown}
                      setOpenDropdown={setOpenDropdown}
                    />
                  ))}
                </div>
              </div>

              {suggestion ? (
                <div id="suggestion">
                  <div className="suggestion-card">
                    <div className="suggestion-text">{suggestion.text}</div>
                    <button className="suggestion-btn">{suggestion.btn} →</button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        </>)}
      </div>
      {tourOpen ? (
        <GuidedTourOverlay
          step={tourStep}
          total={profileComplete ? tourSteps.length - 1 : tourSteps.length}
          title={tourSteps[tourStep].title}
          text={tourSteps[tourStep].text}
          highlightTarget={tourSteps[tourStep].target}
          onNext={nextTourStep}
          onPrevious={previousTourStep}
          onSkip={skipTour}
        />
      ) : null}
      {documentHistorySlot ? (
        <DocumentHistorySidebar
          slot={documentHistorySlot}
          onClose={() => setDocumentHistorySlot(null)}
        />
      ) : null}
    </div>
  );
}
