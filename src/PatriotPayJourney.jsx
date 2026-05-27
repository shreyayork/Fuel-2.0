import { useEffect, useMemo, useState } from "react";
import "./PatriotPayJourney.css";

const tracks = [
  {
    id: "rd",
    icon: "⚙",
    iconBg: "rgba(63,224,164,0.12)",
    iconColor: "#3FE0A4",
    name: "Development",
    sub: "R&D · Engineering, AI, UX, QA, DevOps",
    health: "green",
    healthLabel: "On Track",
    fill: 82,
    stat: { label: "Active since", val: "Feb 2024" },
    team: [
      { initials: "JL", bg: "linear-gradient(135deg,#3FE0A4,#2A8A64)", color: "#0A0E0C", name: "Jake L.", role: "Lead Engineer", alloc: "100%" },
      { initials: "RK", bg: "linear-gradient(135deg,#E5B544,#A07A20)", color: "#0A0E0C", name: "Ryan K.", role: "QA Engineer", alloc: "75%" },
      { initials: "PH", bg: "linear-gradient(135deg,#A78BFA,#6D4AC4)", color: "#fff", name: "Pierre H.", role: "DevOps", alloc: "50%" },
      { initials: "AM", bg: "linear-gradient(135deg,#4DD4C7,#2A7A74)", color: "#0A0E0C", name: "Amy M.", role: "UX Designer", alloc: "50%" },
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
      { label: "MVP build", color: "#3FE0A4" },
      { label: "AI Agent", color: "#3FE0A4" },
      { label: "Postgres migration", color: "#3FE0A4" },
      { label: "QA suite live", color: "#3FE0A4" },
      { label: "Operator Thread — in progress", color: "#E5B544" },
    ],
  },
  {
    id: "gtm",
    icon: "↗",
    iconBg: "rgba(229,181,68,0.12)",
    iconColor: "#E5B544",
    name: "Marketing",
    sub: "Marketing · Website, SEO, CRM, outreach, brand",
    health: "amber",
    healthLabel: "Needs Attention",
    fill: 52,
    stat: { label: "Active since", val: "Oct 2023" },
    team: [
      { initials: "SG", bg: "linear-gradient(135deg,#F97316,#B34E0A)", color: "#fff", name: "Shreya G.", role: "Account Lead", alloc: "25%" },
      { initials: "AM", bg: "linear-gradient(135deg,#4DD4C7,#2A7A74)", color: "#0A0E0C", name: "Amy M.", role: "UX Designer", alloc: "50%" },
    ],
    milestones: [
      { pct: 12, label: "ICP defined", done: true },
      { pct: 26, label: "patriotpay.com launched", done: true },
      { pct: 38, label: "Outreach sequences live", done: true },
      { pct: 52, label: "First 12 customers signed", done: true },
    ],
    chips: [
      { label: "Website live", color: "#3FE0A4" },
      { label: "Outreach sequences", color: "#3FE0A4" },
      { label: "12 customers", color: "#3FE0A4" },
      { label: "No repeatable GTM motion", color: "#E5B544" },
      { label: "SEO not started", color: "#E56B6B" },
    ],
  },
  {
    id: "revops",
    icon: "◎",
    iconBg: "rgba(167,139,250,0.12)",
    iconColor: "#A78BFA",
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
      { label: "HubSpot live", color: "#3FE0A4" },
      { label: "Pipeline built", color: "#3FE0A4" },
      { label: "CAC tracking partial", color: "#E5B544" },
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
      { label: "Books not formalised", color: "#E5B544" },
      { label: "No forecast model", color: "#E5B544" },
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
    { label: "Referral", value: 3, color: "#A78BFA" },
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
    color: "#3FE0A4",
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
    color: "#4DD4C7",
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
    color: "#E5B544",
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
    color: "#3FE0A4",
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
  color: "#3FE0A4",
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
      { id: "quickbooks", name: "QuickBooks", productType: "Finance", tag: "Accounting", icon: "QB", color: "#3FE0A4", price: 89, description: "Connect accounting data for financial visibility and operating cadence.", bullets: ["Accounting", "P&L", "Cash"] },
      { id: "stripe", name: "Stripe", productType: "Payments", tag: "Revenue", icon: "$", color: "#A78BFA", price: 79, description: "Bring payment, subscription, and revenue movement into your operating view.", bullets: ["Payments", "MRR", "Revenue"] },
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
      summary: "Build operator handoff threads so care teams can resolve billing exceptions without leaving Patriot Pay.",
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
    project: "Patriot Pay",
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
    { label: "Research", source: "Fuel signals", status: "Done", tone: "done", note: "Problem and buyer workflow validated." },
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

function DevelopmentDetailPage({ onBack }) {
  const canStartDevelopment = developmentDetail.designApproved;
  const developmentTrack = tracks.find((track) => track.id === "rd");
  const [activeRoadmapKey, setActiveRoadmapKey] = useState(developmentDetail.roadmap[0].key);
  const [activePulseDimension, setActivePulseDimension] = useState(developmentDetail.pulse.dimensions[0].label);
  const [activeDesignIndex, setActiveDesignIndex] = useState(0);
  const [openDesignNote, setOpenDesignNote] = useState(false);
  const [openQualityWeek, setOpenQualityWeek] = useState(null);
  const [roadmapSearch, setRoadmapSearch] = useState("");
  const [roadmapStatusFilter, setRoadmapStatusFilter] = useState("active");
  const [activeDevTab, setActiveDevTab] = useState("overview");
  const [openReleaseNoteKey, setOpenReleaseNoteKey] = useState(null);
  const [releaseNoteOrigin, setReleaseNoteOrigin] = useState("origin-top");
  const [releaseNoteClosing, setReleaseNoteClosing] = useState(false);
  const activeRoadmap = developmentDetail.roadmap.find((item) => item.key === activeRoadmapKey) || developmentDetail.roadmap[0];
  const activeSignal = roadmapSignals[activeRoadmap.key] || roadmapSignals[developmentDetail.roadmap[0].key];
  const pulse = activeSignal.pulse || developmentDetail.pulse;
  const activePulse = pulse.dimensions.find((dimension) => dimension.label === activePulseDimension) || pulse.dimensions[0];
  const activePulseDetails = developmentDetail.pulse.dimensions.find((dimension) => dimension.label === activePulse.label);
  const activePulseNote = activePulse.clientNote || activePulseDetails?.clientNote || "Pulse is showing a shareable summary for this work item.";
  const activePulseHighlights = activePulse.highlights || activePulseDetails?.highlights || [];
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
      { week: "Nov 4-8", quality: 86, stability: 62, speed: 54, risk: "Medium", summary: "Review quality is healthy. Stability still has one non-critical flaky handoff test, but no blocker is present for staging." },
      { week: "Oct 28-Nov 1", quality: 82, stability: 58, speed: 49, risk: "Medium", summary: "The team resolved core handoff review comments and kept build scope contained around exception flows." },
      { week: "Oct 21-25", quality: 78, stability: 55, speed: 46, risk: "Medium", summary: "Early implementation carried more review churn while the handoff model was being finalized." },
      { week: "Oct 14-18", quality: 74, stability: 60, speed: 42, risk: "Low-med", summary: "Architecture was stable, but implementation velocity was intentionally slower while design approval completed." },
      { week: "Oct 7-11", quality: 70, stability: 57, speed: 38, risk: "Medium", summary: "Initial engineering discovery surfaced edge cases around assignment ownership and billing queue states." },
    ],
    "PP-141": [
      { week: "Nov 4-8", quality: 91, stability: 58, speed: 44, risk: "Low-med", summary: "QA quality is strong and critical paths are passing. Two flaky edge-case tests remain under review." },
      { week: "Oct 28-Nov 1", quality: 88, stability: 54, speed: 47, risk: "Medium", summary: "Regression coverage improved after billing state updates were clarified in Launchpad." },
      { week: "Oct 21-25", quality: 84, stability: 52, speed: 43, risk: "Medium", summary: "Manual review queue changes introduced some test instability, now isolated to non-critical flows." },
      { week: "Oct 14-18", quality: 80, stability: 57, speed: 40, risk: "Medium", summary: "QA scope expanded to include failed claim recovery, slowing throughput temporarily." },
      { week: "Oct 7-11", quality: 76, stability: 61, speed: 39, risk: "Low-med", summary: "Baseline test suite was set up with no critical quality issues identified." },
    ],
    "PP-149": [
      { week: "Nov 4-8", quality: 74, stability: 70, speed: 18, risk: "Not started", summary: "Design is ready, but code quality is not yet meaningful because engineering has not started." },
      { week: "Oct 28-Nov 1", quality: 70, stability: 68, speed: 16, risk: "Queued", summary: "Spec readiness improved after mobile intake flow approval, while implementation stayed queued." },
      { week: "Oct 21-25", quality: 66, stability: 64, speed: 15, risk: "Queued", summary: "Engineering reviewed feasibility but deferred build work behind active regression priorities." },
      { week: "Oct 14-18", quality: 62, stability: 61, speed: 12, risk: "Queued", summary: "Early technical notes show low known risk, pending sprint allocation." },
      { week: "Oct 7-11", quality: 58, stability: 58, speed: 10, risk: "Queued", summary: "Mobile intake remained in discovery, with no production code changes yet." },
    ],
    "PP-118": [
      { week: "Oct 21-25", quality: 92, stability: 88, speed: 76, risk: "Closed", summary: "Migration closed cleanly with no customer-facing downtime and no rollback events." },
      { week: "Oct 14-18", quality: 88, stability: 82, speed: 68, risk: "Low", summary: "Release checks were completed before the cutover window." },
      { week: "Oct 7-11", quality: 84, stability: 78, speed: 62, risk: "Low-med", summary: "Dry-run validation reduced the main migration risks before release." },
    ],
    "PP-160": [
      { week: "Nov 4-8", quality: 38, stability: 34, speed: 8, risk: "Future", summary: "Analytics dashboard is parked for future planning; requirements are still being shaped." },
      { week: "Oct 28-Nov 1", quality: 34, stability: 30, speed: 8, risk: "Future", summary: "No engineering sprint capacity is assigned yet." },
    ],
  };
  const qualityWeeks = qualityWeeksByRoadmap[activeRoadmap.key] || qualityWeeksByRoadmap["PP-128"];
  const selectedQualityWeek = openQualityWeek || qualityWeeks[0];
  const overviewUpdates = [
    { source: "Launchpad", title: "Operator Thread workflow approved", date: "Nov 8", detail: "Client approved the core workflow; only small copy polish remains." },
    { source: "Pulse", title: "Quality remains healthy", date: "Nov 8", detail: "Review confidence is strong, with stability as the main watch area." },
    { source: "Jira", title: "Billing Agent QA moved to regression", date: "Nov 7", detail: "Critical paths are passing while two non-critical flaky tests are isolated." },
    { source: "Release", title: "Operator Thread staging note drafted", date: "Nov 6", detail: "Release note is ready for internal review before your rollout." },
    { source: "Team", title: "Mobile Intake remains queued", date: "Nov 5", detail: "Design is approved, but implementation waits for sprint capacity." },
  ];
  const valueStages = ["Foundation", "Acceleration", "Scale", "Optimization"];

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
    setActivePulseDimension((current) => {
      const nextPulse = roadmapSignals[itemKey]?.pulse;
      return nextPulse?.dimensions.some((dimension) => dimension.label === current)
        ? current
        : nextPulse?.dimensions[0]?.label || developmentDetail.pulse.dimensions[0].label;
    });
  }

  return (
    <div className="development-page">
      <div className="detail-page-header">
        <button className="back-btn" onClick={onBack}>‹ Back to journey</button>
        <div className="detail-title-row">
          <div>
            <div className="detail-eyebrow">Development · York Services</div>
            <div className="detail-title">Latest Development Updates</div>
            <div className="detail-subtitle">Roadmap, Pulse quality signals, and Launchpad design approval for Patriot Pay.</div>
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
          { id: "roadmap", label: "Roadmap", sub: "Jira" },
          { id: "design", label: "Design Studio", sub: "Launchpad" },
          { id: "quality", label: "Code Quality", sub: "Pulse" },
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
                  <span>{index + 1}</span>
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
                <div className="overview-update" key={`${update.source}-${update.title}`}>
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
            <strong>Code Quality</strong>
          </div>
          <div className={`quality-workspace ${openQualityWeek ? "with-sidebar" : ""}`}>
            <div className="quality-main-area">
              <div className="quality-ai-summary">
                <div>
                  <span>AI summary · {activeRoadmap.title}</span>
                  <p>{pulse.insight}</p>
                </div>
                <strong>{Math.round(pulse.dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / pulse.dimensions.length)}</strong>
              </div>
              <div className="pulse-dimensions">
                {pulse.dimensions.map((dimension) => (
                  <button
                    className={`pulse-dimension ${dimension.tone} ${activePulseDimension === dimension.label ? "active" : ""}`}
                    key={dimension.label}
                    onClick={() => setActivePulseDimension(dimension.label)}
                  >
                    <div className="pulse-dimension-top">
                      <span>{dimension.label}</span>
                      <strong>{dimension.score}</strong>
                    </div>
                    <div className="pulse-meter">
                      <span style={{ width: `${Math.max(dimension.score, 6)}%` }}></span>
                    </div>
                    <div className="pulse-metric">
                      <span>{dimension.metric}</span>
                      <strong>{dimension.value}</strong>
                    </div>
                  </button>
                ))}
              </div>
              <div className="quality-week-card-list">
                {qualityWeeks.map((week) => (
                  <button
                    className={`quality-week-card release-plan-card ${openQualityWeek?.week === week.week ? "active" : ""}`}
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
                <div className="quality-sidebar-grid">
                  <div>
                    <span>Quality</span>
                    <strong>{selectedQualityWeek.quality}</strong>
                  </div>
                  <div>
                    <span>Stability</span>
                    <strong>{selectedQualityWeek.stability}</strong>
                  </div>
                  <div>
                    <span>Speed</span>
                    <strong>{selectedQualityWeek.speed}</strong>
                  </div>
                  <div>
                    <span>Risk</span>
                    <strong>{selectedQualityWeek.risk}</strong>
                  </div>
                </div>
                <div className="quality-sidebar-chart">
                  <span>Week trend</span>
                  <svg viewBox="0 0 260 120" role="img" aria-label="Weekly Pulse trend">
                    <polyline className="trend-line quality" points={`10,${110 - selectedQualityWeek.quality} 90,${100 - selectedQualityWeek.quality + 8} 170,${112 - selectedQualityWeek.stability} 250,${110 - selectedQualityWeek.speed}`} />
                    <polyline className="trend-line stability" points={`10,${110 - selectedQualityWeek.stability} 90,${106 - selectedQualityWeek.stability} 170,${110 - selectedQualityWeek.stability + 5} 250,${108 - selectedQualityWeek.stability}`} />
                    <polyline className="trend-line speed" points={`10,${110 - selectedQualityWeek.speed} 90,${112 - selectedQualityWeek.speed} 170,${106 - selectedQualityWeek.speed} 250,${110 - selectedQualityWeek.speed + 4}`} />
                    <circle cx="10" cy={110 - selectedQualityWeek.quality} r="3" />
                    <circle cx="90" cy={100 - selectedQualityWeek.quality + 8} r="3" />
                    <circle cx="170" cy={112 - selectedQualityWeek.stability} r="3" />
                    <circle cx="250" cy={110 - selectedQualityWeek.speed} r="3" />
                  </svg>
                  <div className="quality-chart-legend">
                    <span>Quality</span>
                    <span>Stability</span>
                    <span>Speed</span>
                  </div>
                </div>
                <div className="quality-diagnosis-block">
                  <span>AI diagnosis</span>
                  <p>
                    {selectedQualityWeek.quality >= 85
                      ? "Quality is strong enough for shareable reporting."
                      : "Quality is acceptable, but the team should keep review notes visible before release."}
                    {" "}
                    {selectedQualityWeek.stability < 60
                      ? "Stability is the main watch area for this week."
                      : "Stability is not showing major release blockers."}
                  </p>
                </div>
                <div className="quality-diagnosis-block">
                  <span>Recommended next step</span>
                  <p>
                    {selectedQualityWeek.risk === "Not started" || selectedQualityWeek.risk === "Queued"
                      ? "Keep this item queued until active engineering capacity opens."
                      : "Keep QA notes concise and shareable, then confirm release readiness with the York engineering owner."}
                  </p>
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
              <span>Your Journey starts here</span>
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
        <div className="bar-container">
          <div className={`bar-fill ${track.health}`} style={{ width: barsAnimated ? `${track.fill}%` : "0%" }} />
          {track.milestones.map((milestone) => (
            <div className="tick" key={milestone.label} style={{ left: `${milestone.pct}%` }}>
              <div className={`tick-dot ${milestone.done ? "done" : "amber"}`} />
              <div className="tick-label">{milestone.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="milestone-chips">
        {track.chips.map((chip) => (
          <span className="milestone-chip" key={chip.label}>
            <span className="chip-dot" style={{ background: chip.color }} />
            {chip.label}
          </span>
        ))}
      </div>

      <div className="track-updates">
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
      </div>
    </div>
  );
}

export default function PatriotPayJourney() {
  const [openTracks, setOpenTracks] = useState(() => new Set());
  const [openDropdown, setOpenDropdown] = useState(null);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [activePage, setActivePage] = useState("journey");
  const [developmentIntegrations, setDevelopmentIntegrations] = useState(null);
  const [marketingIntegrations, setMarketingIntegrations] = useState(null);
  const [journeyStarted, setJourneyStarted] = useState(false);

  const suggestion = useMemo(() => {
    const weakest = tracks.find((track) => track.health === "grey") || tracks.find((track) => track.health === "amber");
    return weakest ? suggestionMessages[weakest.id] : null;
  }, []);

  const displayTracks = useMemo(() => tracks.map((track) => {
    if (track.id === "rd" && !developmentIntegrations) {
      return {
        ...track,
        health: "grey",
        healthLabel: "Integration Needed",
        fill: 0,
        stat: { label: "Status", val: "Connect tools" },
        team: [],
        milestones: [],
        emptyText: "Connect integrations to unlock Development progress",
        chips: [
          { label: "Launchpad available", color: "#3FE0A4" },
          { label: "Pulse available", color: "#4DD4C7" },
        { label: "Analysis + playbooks", color: "#E5B544" },
        ],
      };
    }

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
          { label: "GTM dashboard access", color: "#3FE0A4" },
          { label: "Google Analytics", color: "#F59E0B" },
          { label: "Ads, SEO, social", color: "#E5B544" },
        ],
      };
    }

    return track;
  }), [developmentIntegrations, marketingIntegrations]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBarsAnimated(true);
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    function closeDropdown(event) {
      if (!event.target.closest(".t-more")) {
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
    if (page === "development" && !developmentIntegrations) {
      setActivePage("development-setup");
      return;
    }
    if (page === "marketing" && !marketingIntegrations) {
      setActivePage("marketing-setup");
      return;
    }
    setActivePage(page);
  }

  function saveJourneyIntegrations(selectedIds) {
    const selected = new Set(selectedIds);
    const developmentSelected = integrationOptions.some((option) => selected.has(option.id));
    const marketingSelected = marketingIntegrationOptions.some((option) => selected.has(option.id));

    setJourneyStarted(true);

    if (developmentSelected) {
      setDevelopmentIntegrations({
        customerType: "fuel",
        integrations: integrationOptions.filter((option) => selected.has(option.id)).map((option) => option.id),
      });
    }

    if (marketingSelected) {
      setMarketingIntegrations({
        customerType: "fuel",
        integrations: marketingIntegrationOptions.filter((option) => selected.has(option.id)).map((option) => option.id),
      });
    }
  }

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
          <div className="recent-item active">
            <div className="recent-favicon" style={{ background: "#1E4D8C", color: "#fff" }}>
              P
            </div>
            Patriot Pay
          </div>
          <div className="recent-item">
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
        <div className="sidebar-foot">
          <div style={{ fontSize: "12px", color: "var(--text-3)" }}>SG</div>
          <div style={{ fontSize: "11px", color: "var(--text-3)", lineHeight: 1.2 }}>
            <div style={{ color: "var(--text-2)", fontSize: "12.5px" }}>Shreya Gokani</div>
            <div>shreya.g@york.ie</div>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="breadcrumb">
            Fuel <span style={{ margin: "0 5px", color: "var(--text-4)" }}>/</span>
            <span className="current">Company</span>
          </div>
          <div className="topbar-right">
            <div className="search-box">
              <span style={{ fontSize: "12px", opacity: 0.6 }}>⌕</span> Search companies...
            </div>
            <button className="ask-ai-btn">✦ Ask Fuel AI</button>
            <span style={{ fontSize: "12px", color: "var(--text-3)" }}>Q4 '25 · Nov 8</span>
          </div>
        </div>

        <div className="company-header">
          <div className="company-card">
            <div className="company-logo">P</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
                <div className="company-name">Patriot Pay</div>
                <span className="badge">York IE partner</span>
              </div>
              <div className="company-meta">
                <span>Engaged Feb 2024</span>
                <span className="dot" />
                <span>Healthcare · Patient Billing · Seed</span>
                <span className="dot" />
                <span>9 months active</span>
              </div>
            </div>
            <div className="header-actions">
              <button className="header-btn">Playbooks ▾</button>
              <button className="header-btn primary">≡ Generate brief</button>
            </div>
          </div>
        </div>

        <div className="tabs">
          <div className="tab">Overview</div>
          <div className="tab">Signals</div>
          <div className="tab">Context Feed</div>
          <div className="tab">
            Initiatives <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "4px" }}>2</span>
          </div>
          <div className="tab">
            Research <span style={{ fontSize: "11px", color: "var(--text-3)", marginLeft: "4px" }}>1</span>
          </div>
          <div className="tab">Data Room</div>
          <div className="tab active">Your Journey</div>
        </div>

        <div className="content">
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
            <DevelopmentDetailPage onBack={() => setActivePage("journey")} />
          ) : activePage === "marketing" ? (
            <MarketingDetailPage onBack={() => setActivePage("journey")} />
          ) : !journeyStarted && !developmentIntegrations && !marketingIntegrations ? (
            <JourneyEmptyState onConnectIntegrations={saveJourneyIntegrations} />
          ) : (
            <>
              <div className="journey-header">
                <div>
                  <div className="journey-title">Your York Engagement</div>
                  <div className="journey-sub">Health and milestones across active service tracks · hover bars to explore milestones</div>
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

              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "6px 22px 8px" }}>
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
          )}
        </div>
      </div>
    </div>
  );
}
