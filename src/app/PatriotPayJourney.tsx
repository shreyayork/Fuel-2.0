import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SIGNAL_CATALOG, SIGNAL_CATALOG_BY_KEY, SIGNAL_CATEGORY_KEYS } from "./signalCatalog";
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
import { dailyRemaining, totalRemaining } from "./credits/creditLogic";
import {
  BENCHMARK_REWARD_CREDITS,
  EMPTY_EARNED_PROFILE_CREDITS,
  getModuleReward,
  loadEarnedProfileCredits,
  INTELLIGENCE_SOURCES_REWARD_CREDITS,
  markModuleEarned,
  markModulesEarned,
  PROFILE_MODULE_EARNABLE_TOTAL,
  remainingBenchmarkRewardCredits,
  remainingIntelligenceRewardCredits,
  sumModuleRewards,
  tryMarkBenchmarkEarned,
  tryMarkIntelligenceSourcesEarned,
  hasSeenProfileCreditRewardToast,
  markProfileCreditRewardToastSeen,
  type EarnedProfileCredits,
  type ProfileCreditReward,
  type ProfileModuleId,
} from "./profileCredits";
import { ProfileCreditRewardToast } from "./ProfileCreditRewardToast";
import {
  ProfileCompletionPrompt,
} from "./ProfileCompletionPrompt";
import {
  isFounderProfilePromptSurface,
  isProfileCompletionPromptDue,
  markProfileCompletionPromptDismissed,
  shouldGateFounderProfilePrompt,
} from "./profileCompletionPromptStorage";
import { UnifiedProfileDrawer } from "./UnifiedProfileDrawer";
import { CompanyProfilePage, type CompanyProfileSnapshot, type ProfilePreviewTab } from "./CompanyProfilePreview";
import {
  BENCHMARK_PERIOD,
  CompleteBenchmarkDrawer,
  EMPTY_BENCHMARK_FORM,
  type BenchmarkFormValues,
} from "./UnifiedBenchmarkDrawer";
import ScorecardV2, {
  type OverviewBuildPhase,
  BenchmarkEditDrawer,
  dismissRecActionsTip,
  isRecActionsTipDismissed,
  isRecActionsTipPending,
  markRecActionsTipPending,
  OVERVIEW_ALL_BUILT_PHASES,
  profileModuleToBuildPhase,
  resetRecActionsTipForOnboarding,
} from "./ScorecardV2";
import { hasCompletedOnboardingTracks, mapOnboardingToDetailAnswers, ORGANIZATION_TYPES } from "./OnboardingFlow.tsx";
import { AskFuelChatDrawer } from "./AskFuelChat.tsx";
import { FuelHelpFaqPage } from "./FuelHelpFaq.tsx";
import { SkipLink } from "./a11y/SkipLink";
import { TopbarCompanySearch } from "./a11y/TopbarCompanySearch";
import { useDialogA11y } from "./a11y/useDialogA11y";
import { drawerPanelPointerProps, useScrimPointerClose } from "./drawerScrim";
import { PLAYBOOKS, PLAYBOOK_COUNT, type Brief, type Playbook } from "./fuelBrief";
import { AccountSettings } from "./account/AccountSettings.tsx";
import {
  AccountSettingsNavProvider,
  accountTabLabel,
  type AccountSettingsTab,
} from "./account/AccountSettingsNav.tsx";
import {
  resolveYorkOfferForInitiative,
  YORK_COMMON_OFFER,
  type YorkServiceOffer,
} from "./yorkIeUpsell";
import { isYorkOfferDismissed } from "./yorkDismiss";
import { isReloadLandingActive, saveActivePage } from "./workspaceSession";
import { YorkPartnerNudge } from "./YorkPartnerNudge";
import InvestorDashboard, { type InvestorDashboardSection } from "./investor/InvestorDashboard.tsx";
import {
  INVESTOR_PORTFOLIO,
  SUGGESTED_FOUNDERS,
  buildPortfolioCompanyView,
  formatGrowthRate,
  formatMoic,
  formatUsdCompact,
  investorCompanyToSelected,
  pickCompanyLogoAssetUrl,
  resolveCompanyLogoUrl,
} from "./investor/investorData.ts";
import type { InvestorCompanyRef, PortfolioCompanyView } from "./investor/investorData.ts";
import { getCompanyLogoColors } from "./companyLogoColors";
import {
  buildThirdPartyPublicIntelligence,
  getThirdPartyContextFeed,
  getThirdPartyOverview,
  type ThirdPartyOverviewRecord,
} from "./thirdPartyOverviewData";
import {
  dismissCrunchbaseProfileNotice,
  isCrunchbaseProfileNoticeDismissed,
} from "./crunchbaseProfileNoticeStorage";
import { ConnectorIcon, FuelIcon, type FuelIconName } from "./icons";
import { applyFuelTheme, readFuelTheme, type FuelTheme } from "./fuelTheme";
import {
  buildYearOptions,
  filterIntelligenceByDate,
  getIntelligenceDateRange,
  INTELLIGENCE_DATE_PRESETS,
  matchesIntelligenceSearch,
  MONTH_OPTIONS,
  type IntelligenceCustomRange,
  type IntelligenceDatePreset,
} from "./intelligenceFilters";
import {
  countSectionAnswers,
  DETAIL_QUESTION_LABEL,
  DETAIL_SECTIONS,
  getVisibleQuestions,
  hasProfileBasicsStarted,
  type DetailAnswers,
} from "./trackQuestions.ts";
import { loadDetailAnswers } from "./profileDetailsStorage.ts";

const TOUR_TAKEN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const tracks = [
  {
    id: "rd",
    icon: "development" as FuelIconName,
    iconBg: "rgba(18, 184, 134, 0.12)",
    iconColor: "var(--btn-primary-bg)",
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
      { label: "MVP build", color: "var(--btn-primary-bg)" },
      { label: "AI Agent", color: "var(--btn-primary-bg)" },
      { label: "Postgres migration", color: "var(--btn-primary-bg)" },
      { label: "QA suite live", color: "var(--btn-primary-bg)" },
      { label: "Operator Thread — in progress", color: "#D4924A" },
    ],
  },
  {
    id: "gtm",
    icon: "gtm" as FuelIconName,
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
      { label: "Website live", color: "var(--btn-primary-bg)" },
      { label: "Outreach sequences", color: "var(--btn-primary-bg)" },
      { label: "12 customers", color: "var(--btn-primary-bg)" },
      { label: "No repeatable GTM motion", color: "#D4924A" },
      { label: "SEO not started", color: "#E56B6B" },
    ],
  },
  {
    id: "revops",
    icon: "revops" as FuelIconName,
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
      { label: "HubSpot live", color: "var(--btn-primary-bg)" },
      { label: "Pipeline built", color: "var(--btn-primary-bg)" },
      { label: "CAC tracking partial", color: "#D4924A" },
      { label: "Attribution not set up", color: "#E56B6B" },
    ],
  },
  {
    id: "ga",
    icon: "finops" as FuelIconName,
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
    color: "var(--btn-primary-bg)",
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
    color: "#00B48A",
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
    color: "var(--btn-primary-bg)",
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
  color: "var(--btn-primary-bg)",
  price: 0,
  description: "Request access to the York IE-managed GTM dashboard that already combines traffic, paid media, SEO, and social signals.",
  bullets: ["Managed setup", "Dashboard access", "York IE support"],
  featured: true,
};

const yorkJourneyPaths = [
  { label: "Development", detail: "Turn roadmap, design, QA, and release activity into signals and playbooks.", icon: "development" as FuelIconName },
  { label: "Marketing", detail: "Summarize traffic, paid media, SEO, and social into growth actions.", icon: "gtm" as FuelIconName },
  { label: "RevOps", detail: "Connect CRM, pipeline, attribution, and CAC signals into operating rhythm.", icon: "revops" as FuelIconName },
  { label: "FinOps", detail: "Build forecast, runway, board reporting, and decision-ready finance foundations.", icon: "finops" as FuelIconName },
  { label: "Success", detail: "Compare your operating cadence with durable startup benchmarks.", icon: "success" as FuelIconName },
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
      { id: "quickbooks", name: "QuickBooks", productType: "Finance", tag: "Accounting", icon: "QB", color: "var(--btn-primary-bg)", price: 89, description: "Connect accounting data for financial visibility and operating cadence.", bullets: ["Accounting", "P&L", "Cash"] },
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
            <ConnectorIcon name={integration.id} size={22} />
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
                <ConnectorIcon name={integration.id} size={18} />
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
          <button type="button" onClick={onClose} aria-label="Close manual tracking dialog">×</button>
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
  /*
   * Assumption: "Launch Queue message" maps to Development Overview launch-queue
   * messaging — what is waiting to ship, why it is blocked, and the next action.
   * Preview mock only; live Jira/Pulse sync belongs in backend lock.
   */
  type LaunchQueueStatus = "ready" | "blocked" | "waiting";
  type LaunchQueueItem = {
    id: string;
    roadmapKey: string;
    source: string;
    date: string;
    title: string;
    status: LaunchQueueStatus;
    message: string;
    nextAction: string;
    owner: string;
  };
  const launchQueueItems: LaunchQueueItem[] = [
    {
      id: "lq-operator-thread",
      roadmapKey: "PP-128",
      source: "Release",
      date: "Nov 8",
      title: "Operator Thread staging note ready for review",
      status: "ready",
      message:
        "Staging release note is drafted for Patriot Pay Operator Thread. Critical paths are green; share the note with York before the rollout window.",
      nextAction: "Open the release note and confirm client-facing wording",
      owner: "Pierre H.",
    },
    {
      id: "lq-billing-agent",
      roadmapKey: "PP-141",
      source: "Pulse",
      date: "Nov 8",
      title: "Billing Agent QA blocked on flaky recovery paths",
      status: "blocked",
      message:
        "Regression is passing on patient billing happy paths, but two flaky recovery tests are still open. Do not promote until those are isolated or waived.",
      nextAction: "Review stability watch items in Execution Health",
      owner: "QA · Pulse",
    },
    {
      id: "lq-mobile-intake",
      roadmapKey: "PP-149",
      source: "Team",
      date: "Nov 5",
      title: "Mobile Intake waiting on sprint capacity",
      status: "waiting",
      message:
        "Launchpad design is approved. Implementation is intentionally queued behind active regression so Operator Thread can clear staging first.",
      nextAction: "Keep queued until PP-128 clears QA sign-off",
      owner: "Eng capacity",
    },
    {
      id: "lq-design-polish",
      roadmapKey: "PP-128",
      source: "Launchpad",
      date: "Nov 8",
      title: "Operator Thread copy polish before client share",
      status: "ready",
      message:
        "Core workflow is approved. Only small label and empty-state copy remain before the design package is client-ready.",
      nextAction: "Open Design Studio and finish remaining copy notes",
      owner: "Design",
    },
    {
      id: "lq-analytics-future",
      roadmapKey: "PP-160",
      source: "Jira",
      date: "Nov 4",
      title: "Analytics dashboard held in future planning",
      status: "waiting",
      message:
        "No sprint is assigned. Keep this out of the launch queue until requirements and owners are locked.",
      nextAction: "Park until post-MVP roadmap review",
      owner: "Product",
    },
  ];
  const [launchQueueFilter, setLaunchQueueFilter] = useState<"all" | LaunchQueueStatus>("all");
  const [selectedLaunchQueueId, setSelectedLaunchQueueId] = useState(launchQueueItems[0].id);
  const [acknowledgedLaunchIds, setAcknowledgedLaunchIds] = useState<string[]>([]);
  const filteredLaunchQueue = launchQueueItems.filter(
    (item) => launchQueueFilter === "all" || item.status === launchQueueFilter,
  );
  const selectedLaunchQueue =
    filteredLaunchQueue.find((item) => item.id === selectedLaunchQueueId) ||
    filteredLaunchQueue[0] ||
    null;
  const launchQueueCounts = {
    all: launchQueueItems.length,
    ready: launchQueueItems.filter((item) => item.status === "ready").length,
    blocked: launchQueueItems.filter((item) => item.status === "blocked").length,
    waiting: launchQueueItems.filter((item) => item.status === "waiting").length,
  };
  const launchQueueStatusLabel: Record<LaunchQueueStatus, string> = {
    ready: "Ready to share",
    blocked: "Blocked",
    waiting: "Waiting",
  };
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
            <div className="detail-subtitle">Launch queue, roadmap, Pulse quality, and Launchpad design approval for Patriot Pay.</div>
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
            <div className="launch-queue" aria-label="Launch queue">
              <div className="panel-heading launch-queue-heading">
                <span>Launch queue</span>
                <strong>{launchQueueCounts.ready} ready · {launchQueueCounts.blocked} blocked</strong>
              </div>
              <p className="launch-queue-lede">
                Messages for what is waiting to ship on Patriot Pay — status, blocker, and the next owner action.
              </p>
              <div className="launch-queue-filters" role="tablist" aria-label="Launch queue status">
                {(
                  [
                    { id: "all" as const, label: "All" },
                    { id: "ready" as const, label: "Ready" },
                    { id: "blocked" as const, label: "Blocked" },
                    { id: "waiting" as const, label: "Waiting" },
                  ]
                ).map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    role="tab"
                    aria-selected={launchQueueFilter === filter.id}
                    className={`launch-queue-filter ${launchQueueFilter === filter.id ? "selected" : ""}`}
                    onClick={() => {
                      setLaunchQueueFilter(filter.id);
                      const next = launchQueueItems.find(
                        (item) => filter.id === "all" || item.status === filter.id,
                      );
                      if (next) setSelectedLaunchQueueId(next.id);
                    }}
                  >
                    <span>{filter.label}</span>
                    <strong>{launchQueueCounts[filter.id]}</strong>
                  </button>
                ))}
              </div>
              <div className={`launch-queue-layout ${selectedLaunchQueue ? "with-detail" : ""}`}>
                <ul className="launch-queue-list" role="listbox" aria-label="Queued launch messages">
                  {filteredLaunchQueue.length === 0 ? (
                    <li className="launch-queue-empty">
                      No launch messages in this view. Switch filter or clear blockers on active roadmap items.
                    </li>
                  ) : (
                    filteredLaunchQueue.map((item) => {
                      const isSelected = selectedLaunchQueue?.id === item.id;
                      const isAcked = acknowledgedLaunchIds.includes(item.id);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={`launch-queue-item status-${item.status} ${isSelected ? "active" : ""} ${isAcked ? "acked" : ""}`}
                            onClick={() => {
                              setSelectedLaunchQueueId(item.id);
                              setActiveRoadmapKey(item.roadmapKey);
                            }}
                          >
                            <div className="launch-queue-item-top">
                              <span className={`launch-queue-status status-${item.status}`}>
                                {launchQueueStatusLabel[item.status]}
                              </span>
                              <span className="launch-queue-meta">
                                {item.source} · {item.date}
                                {isAcked ? " · Seen" : ""}
                              </span>
                            </div>
                            <strong>{item.title}</strong>
                            <p>{item.message}</p>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
                {selectedLaunchQueue ? (
                  <aside className="launch-queue-detail" aria-live="polite">
                    <span>
                      {selectedLaunchQueue.roadmapKey} · {selectedLaunchQueue.source} · {selectedLaunchQueue.date}
                    </span>
                    <h3>{selectedLaunchQueue.title}</h3>
                    <p className="launch-queue-detail-message">{selectedLaunchQueue.message}</p>
                    <div className="launch-queue-next">
                      <span>Next action</span>
                      <strong>{selectedLaunchQueue.nextAction}</strong>
                      <p>Owner: {selectedLaunchQueue.owner}</p>
                    </div>
                    <div className="launch-queue-detail-actions">
                      <button
                        type="button"
                        className="launch-queue-primary"
                        onClick={() => {
                          setActiveRoadmapKey(selectedLaunchQueue.roadmapKey);
                          if (selectedLaunchQueue.status === "blocked") {
                            setActiveDevTab("quality");
                          } else if (selectedLaunchQueue.id === "lq-design-polish") {
                            setActiveDevTab("design");
                          } else if (selectedLaunchQueue.status === "ready") {
                            setActiveDevTab("roadmap");
                            setOpenReleaseNoteKey(selectedLaunchQueue.roadmapKey);
                          } else {
                            setActiveDevTab("roadmap");
                          }
                        }}
                      >
                        {selectedLaunchQueue.status === "blocked"
                          ? "Open Execution Health"
                          : selectedLaunchQueue.id === "lq-design-polish"
                            ? "Open Design Studio"
                            : selectedLaunchQueue.status === "ready"
                              ? "View release note"
                              : "Open Roadmap"}
                      </button>
                      <button
                        type="button"
                        className="launch-queue-secondary"
                        disabled={acknowledgedLaunchIds.includes(selectedLaunchQueue.id)}
                        onClick={() => {
                          setAcknowledgedLaunchIds((prev) =>
                            prev.includes(selectedLaunchQueue.id)
                              ? prev
                              : [...prev, selectedLaunchQueue.id],
                          );
                        }}
                      >
                        {acknowledgedLaunchIds.includes(selectedLaunchQueue.id)
                          ? "Marked as seen"
                          : "Mark as seen"}
                      </button>
                    </div>
                  </aside>
                ) : null}
              </div>
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
                <button type="button" className="release-note-close" onClick={closeReleaseNote} aria-label="Close release note">×</button>
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
                <button type="button" className="release-note-close" onClick={() => setOpenDesignNote(false)} aria-label="Close design note">×</button>
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
                <button type="button" className="release-note-close" onClick={() => setOpenQualityWeek(null)} aria-label="Close quality week note">×</button>
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
        <div className="journey-mini-icon" style={{ color: option.color }}>
          <ConnectorIcon name={option.id} size={16} />
        </div>
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
                  <em><FuelIcon name={path.icon} size={14} /></em>
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
                    <span><FuelIcon name={path.icon} size={14} /></span>
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
            <FuelIcon name={track.icon} size={16} />
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
  /** Signal name within the category — e.g. "ARR", "Burn multiple". Used for subcategory grouping. */
  subtype?: string;
  text: string;
  highlight: string;
  date: string;
  age: string;
  title: string;
  confidence?: string;
  sources: IntelligenceSource[];
  updatedAtMs?: number;
};

type SourceQueueStatus = "awaiting_generation" | "saved";

type PendingSource = {
  id: string;
  title: string;
  description: string;
  kind: "note" | "document";
  document?: { typeId: string; typeLabel: string; fileName: string };
  addedAtMs: number;
  addedAtLabel: string;
  status: SourceQueueStatus;
  intelligenceGenerated?: boolean;
  intelligenceIds?: string[];
  emptyReason?: string;
  processedAtLabel?: string;
};

function inferMainCategoryFromSource(
  title: string,
  description: string,
  document?: { typeId: string; typeLabel: string; fileName?: string },
): string {
  if (document?.typeId) return inferIntelligenceTypeFromDocument(document.typeId);

  const blob = `${title} ${description}`.toLowerCase();
  if (/fundrais|investor|pitch|deck|raise|seed|series [abc]|dilution|cap table/.test(blob)) {
    return "fundraising";
  }
  if (/gtm|pipeline|sales|outbound|icp|marketing|customer|deal|crm|revenue|conversion|pricing/.test(blob)) {
    return "gtm";
  }
  if (/r&d|product|roadmap|engineering|ship|qa|technical|architecture|release|sprint|design/.test(blob)) {
    return "product";
  }
  if (/g&a|finance|burn|runway|cash|hiring|ops|headcount|payroll|budget|efficiency/.test(blob)) {
    return "finance";
  }
  return "strategic";
}

const SOURCE_CATEGORY_COPY: Record<string, { text: string; label: string }> = {
  fundraising: { text: "Fundraising signal", label: "Fundraising" },
  gtm: { text: "GTM signal", label: "Go to market" },
  product: { text: "Product signal", label: "Product" },
  finance: { text: "Finance signal", label: "Finance / G&A" },
  strategic: { text: "Strategic signal", label: "Strategy" },
};

function evaluateSourceIntelligenceGeneration({
  title,
  description,
  document,
}: {
  title: string;
  description: string;
  document?: { typeId: string; typeLabel: string; fileName: string };
}): { item: IntelligenceItem | null; emptyReason?: string; category?: string } {
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const category = inferMainCategoryFromSource(trimmedTitle, trimmedDescription, document);

  if (!trimmedTitle) {
    return {
      item: null,
      emptyReason: "Source saved without a title, so no intelligence was generated.",
      category,
    };
  }

  if (/no.?signal|empty source|blank doc/i.test(`${trimmedTitle} ${trimmedDescription}`)) {
    return {
      item: null,
      emptyReason: "Fuel reviewed this source but nothing met the confidence threshold for timeline intelligence.",
      category,
    };
  }

  return {
    item: createSourceIntelligence({
      title: trimmedTitle,
      description: trimmedDescription,
      document,
      category,
    }),
    category,
  };
}

function getPendingSources(
  manualPending: PendingSource[],
  documentSlots: DataRoomDocumentSlot[],
): PendingSource[] {
  const documentPending = getActiveDocumentSlots(documentSlots)
    .filter(slot => slot.current)
    .map(slot => ({
      id: `pending-doc-${slot.typeId}`,
      title: slot.current!.name,
      description: slot.typeLabel,
      kind: "document" as const,
      document: {
        typeId: slot.typeId,
        typeLabel: slot.typeLabel,
        fileName: slot.current!.name,
      },
      addedAtMs: slot.current!.uploadedAtMs,
      addedAtLabel: slot.current!.uploadedAt,
      status: slot.current!.generationAttemptedAtMs ? "saved" as const : "awaiting_generation" as const,
      intelligenceGenerated: slot.current!.intelligenceCount > 0,
      intelligenceIds: slot.current!.intelligenceIds,
      emptyReason: slot.current!.emptyReason,
      processedAtLabel: slot.current!.generationAttemptedAtMs
        ? new Date(slot.current!.generationAttemptedAtMs).toLocaleString("en-US")
        : undefined,
    }));

  const manualDocumentTypeIds = new Set(
    manualPending
      .map(source => source.document?.typeId)
      .filter((typeId): typeId is string => Boolean(typeId)),
  );

  return [
    ...manualPending,
    ...documentPending.filter(source => !manualDocumentTypeIds.has(source.document!.typeId)),
  ].sort((left, right) => right.addedAtMs - left.addedAtMs);
}

type SourceIntelligenceMeta = {
  count: number;
  ids: string[];
  status: "awaiting" | "generated" | "empty";
};

function getSourceIntelligenceMeta(
  source: PendingSource,
  documentSlots: DataRoomDocumentSlot[],
): SourceIntelligenceMeta {
  if (source.status === "awaiting_generation") {
    return { count: 0, ids: [], status: "awaiting" };
  }

  let ids = source.intelligenceIds ?? [];
  if (source.kind === "document" && source.document) {
    const slot = documentSlots.find(entry => entry.typeId === source.document!.typeId);
    if (slot?.current) {
      ids = slot.current.intelligenceIds;
    }
  }

  if (ids.length > 0) {
    return { count: ids.length, ids, status: "generated" };
  }

  return {
    count: 0,
    ids: [],
    status: source.intelligenceGenerated === false || source.emptyReason ? "empty" : "awaiting",
  };
}

function attachIntelligenceToDocumentSlot(
  slots: DataRoomDocumentSlot[],
  typeId: string,
  intelligenceId: string,
): DataRoomDocumentSlot[] {
  return slots.map(slot => {
    if (slot.typeId !== typeId || !slot.current) return slot;
    const intelligenceIds = slot.current.intelligenceIds.includes(intelligenceId)
      ? slot.current.intelligenceIds
      : [intelligenceId, ...slot.current.intelligenceIds];
    return {
      ...slot,
      current: {
        ...slot.current,
        intelligenceIds,
        intelligenceCount: intelligenceIds.length,
        generationAttemptedAtMs: Date.now(),
        emptyReason: undefined,
      },
    };
  });
}

function markDocumentSourceWithoutIntelligence(
  slots: DataRoomDocumentSlot[],
  typeId: string,
  emptyReason: string,
): DataRoomDocumentSlot[] {
  return slots.map(slot => {
    if (slot.typeId !== typeId || !slot.current) return slot;
    return {
      ...slot,
      current: {
        ...slot.current,
        intelligenceIds: [],
        intelligenceCount: 0,
        generationAttemptedAtMs: Date.now(),
        emptyReason,
      },
    };
  });
}

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
  generationAttemptedAtMs?: number;
  emptyReason?: string;
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
  return [];
}

function getDocumentTypeLabel(typeId: string, fallback?: string) {
  const predefined = DATA_ROOM_DOCUMENT_TYPES.find(type => type.id === typeId);
  if (predefined) return predefined.label;
  if (typeId.startsWith("custom:")) return fallback || typeId.slice(7).replace(/-/g, " ");
  return fallback || typeId;
}

function getActiveDocumentSlots(slots: DataRoomDocumentSlot[]) {
  return slots.filter(slot => slot.current);
}

function countActiveDocuments(slots: DataRoomDocumentSlot[]) {
  return getActiveDocumentSlots(slots).length;
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

function clearDocumentSlotCurrent(slots: DataRoomDocumentSlot[], typeId: string): DataRoomDocumentSlot[] {
  return slots
    .map(slot => {
      if (slot.typeId !== typeId) return slot;
      if (slot.current?.downloadUrl) URL.revokeObjectURL(slot.current.downloadUrl);
      return {
        ...slot,
        current: null,
        history: slot.current ? [slot.current, ...slot.history] : slot.history,
      };
    })
    .filter(slot => slot.current != null || slot.history.length > 0);
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

  // Every entry maps to an exact catalog signal: type = category key, subtype = signal name.
  const templates: Record<string, { type: string; subtype: string; highlight: string; title: string }[]> = {
    pitch_deck: [
      { type: "fundraising", subtype: "Round stage", highlight: "Seed extension · $1.5M target", title: "Deck positions the company for a Seed extension with enterprise pipeline momentum." },
      { type: "gtm", subtype: "Primary GTM motion", highlight: "Workshop-led onboarding · 3 enterprise pilots", title: "Sales motion emphasizes customer discovery workshops before standardized rollout." },
    ],
    investor_notes: [
      { type: "fundraising", subtype: "Fundraise timing", highlight: "Active raise · Q3 2026 target close", title: "Notes highlight investor interest with questions on GTM efficiency and retention proof." },
      { type: "strategic", subtype: "Competitive moat", highlight: "Vertical workflow depth vs legacy billing", title: "Investors want sharper category framing before the next raise conversation." },
    ],
    investment_memo: [
      { type: "fundraising", subtype: "Target round size", highlight: "$4.2M Seed · large TAM · underpenetrated mid-market", title: "Memo frames the opportunity as workflow consolidation in a fragmented buyer segment." },
      { type: "finance", subtype: "ARR : capital raised", highlight: "Payback improving · expansion potential", title: "Financial narrative ties retention expansion to margin improvement over 18 months." },
    ],
    board_deck: [
      { type: "board_reporting", subtype: "Other updates (period)", highlight: "Hit $1M ARR · reduce implementation time", title: "Board deck centers on revenue milestone and delivery efficiency for the next two quarters." },
      { type: "team", subtype: "Hiring needs", highlight: "2 GTM hires · 1 senior engineer", title: "Hiring plan weighted toward repeatable enterprise sales and platform stability." },
    ],
    financial_model: [
      { type: "finance", subtype: "Runway", highlight: "18 months · base case", title: "Model assumes steady enterprise expansion with controlled burn through year end." },
      { type: "efficiency", subtype: "Burn multiple", highlight: "Improving in H2", title: "Efficiency metrics suggest GTM spend converts better after onboarding changes." },
    ],
    cap_table: [
      { type: "fundraising", subtype: "Pre-money at last round", highlight: "Founders 62% · Seed investors 28%", title: "Cap table supports a clean extension round without heavy dilution pressure." },
    ],
    product_roadmap: [
      { type: "product", subtype: "AI classification", highlight: "Portal v2 · AI reporting · billing automation", title: "Roadmap prioritizes self-serve workflows that reduce services-heavy implementations." },
    ],
    customer_contract: [
      { type: "gtm", subtype: "Primary contract length", highlight: "Multi-year enterprise · expansion clause", title: "Contract structure supports land-and-expand with built-in upsell triggers." },
    ],
    due_diligence: [
      { type: "strategic", subtype: "Key risks", highlight: "Security review · revenue quality · churn", title: "Diligence pack focuses on enterprise readiness and retention durability." },
    ],
  };

  const baseKey = typeId.startsWith("custom:") ? "custom" : typeId;
  const rows = templates[baseKey] || templates.pitch_deck;
  const createdAtMs = Date.now();

  return rows.map((row, index) => ({
    id: `intel-doc-${typeId}-${createdAtMs + index}`,
    type: row.type,
    subtype: row.subtype,
    text: row.subtype,
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
  category,
}: {
  title: string;
  description: string;
  document?: { typeId: string; typeLabel: string; fileName: string };
  category?: string;
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

  // Prefer catalog mapping from document type; for notes use inferred category → a real catalog signal.
  const docSignalMap: Record<string, { type: string; subtype: string }> = {
    pitch_deck: { type: "fundraising", subtype: "Round stage" },
    investor_notes: { type: "fundraising", subtype: "Fundraise timing" },
    investment_memo: { type: "fundraising", subtype: "Target round size" },
    cap_table: { type: "fundraising", subtype: "Pre-money at last round" },
    board_deck: { type: "board_reporting", subtype: "Other updates (period)" },
    financial_model: { type: "finance", subtype: "Runway" },
    product_roadmap: { type: "product", subtype: "AI classification" },
    customer_contract: { type: "gtm", subtype: "Primary contract length" },
    due_diligence: { type: "strategic", subtype: "Key risks" },
  };
  const noteCategorySignal: Record<string, { type: string; subtype: string }> = {
    fundraising: { type: "fundraising", subtype: "Fundraise timing" },
    gtm: { type: "gtm", subtype: "Channel / GTM challenges" },
    product: { type: "product", subtype: "AI classification" },
    finance: { type: "finance", subtype: "Runway" },
    strategic: { type: "strategic", subtype: "Key opportunities" },
  };
  const baseDocKey = document ? (document.typeId.startsWith("custom:") ? "custom" : document.typeId) : null;
  const catalogHint = baseDocKey
    ? (docSignalMap[baseDocKey] ?? { type: "strategic", subtype: "Key opportunities" })
    : (noteCategorySignal[category ?? "strategic"] ?? { type: "strategic", subtype: "Key opportunities" });

  return {
    id: `intel-manual-${now}`,
    type: catalogHint.type,
    subtype: catalogHint.subtype,
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

type BenchmarkSubmission = {
  period: string;
  submittedAt: string;
  submittedAtMs: number;
  summary: { arr: string; nrr: string; burnMultiple: string };
  rows: { metric: string; value: string; bot25: string; median: string; top25: string }[];
  intelligenceIds: string[];
  formValues: BenchmarkFormValues;
};

function formatBenchmarkPeriodLabel(period: string): string {
  const match = period.trim().match(/^(\d{4})-Q([1-4])$/i);
  if (match) return `Q${match[2]} ${match[1]}`;
  return period;
}

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

export type OnboardingBenchmarkInput = {
  arr: string;
  arrGrowth: string;
  nrr: string;
  logoRetention: string;
  monthlyBurn: string;
  cashOnHand: string;
  grossMargin: string;
  cacPayback: string;
  burnMultiple: string;
  ruleOf40: string;
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
    cacPayback: onboarding.cacPayback,
    burnMultiple: onboarding.burnMultiple,
    ruleOf40: onboarding.ruleOf40,
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
    cacPayback: form.cacPayback,
    burnMultiple: form.burnMultiple,
    ruleOf40: form.ruleOf40,
    headcount: form.headcount,
    payingCustomers: form.paidCustomers,
  };
}

const BENCHMARK_METRIC_FORM_KEYS: (keyof BenchmarkFormValues)[] = [
  "headcount",
  "paidCustomers",
  "arr",
  "arrGrowth",
  "nrr",
  "logoRetention",
  "grossMargin",
  "cacPayback",
  "burnMultiple",
  "ruleOf40",
  "cashOnHand",
  "monthlyBurn",
];

function parseBenchmarkMetricValue(raw: string): number | null {
  const cleaned = raw.replace(/[$,%x,\s]/gi, "").replace(/mo(nths?)?$/i, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function hasFilledBenchmarkMetric(form: BenchmarkFormValues): boolean {
  return BENCHMARK_METRIC_FORM_KEYS.some(key => parseBenchmarkMetricValue(String(form[key] ?? "")) != null);
}

function mergeBenchmarkFormValues(
  base: BenchmarkFormValues,
  overlay: Partial<BenchmarkFormValues>,
): BenchmarkFormValues {
  const next = { ...base };
  (Object.keys(overlay) as (keyof BenchmarkFormValues)[]).forEach(key => {
    if (key === "openToIntros") {
      if (overlay.openToIntros != null) next.openToIntros = overlay.openToIntros;
      return;
    }
    const value = String(overlay[key] ?? "").trim();
    if (value) next[key] = value;
  });
  return next;
}

/** Onboarding + quarterly log + in-app edits — later sources win per field. */
function resolveBenchmarkFormValues(
  submission: BenchmarkSubmission | null | undefined,
  initial: OnboardingBenchmarkInput | null | undefined,
): BenchmarkFormValues {
  let merged = { ...EMPTY_BENCHMARK_FORM };
  if (initial) {
    merged = mergeBenchmarkFormValues(merged, toBenchmarkFormValues(initial));
  }
  if (submission?.formValues) {
    merged = mergeBenchmarkFormValues(merged, submission.formValues);
  }
  return merged;
}

function createInitialBenchmarkSeed(initial: OnboardingBenchmarkInput | null | undefined) {
  if (!initial) return null;
  const form = toBenchmarkFormValues(initial);
  if (!hasFilledBenchmarkMetric(form)) return null;
  return createBenchmarkIntelligence(form);
}

/** Seed Intelligence from onboarding profile + track answers even when metrics are skipped. */
function formFieldSourceSystem(fieldId: string): string {
  if (fieldId.startsWith("dev_")) return "R&D";
  if (fieldId.startsWith("mkt_")) return "GTM";
  if (fieldId.startsWith("rev_")) return "G&A";
  if (fieldId.startsWith("profile")) return "Profile";
  return "Company profile";
}

function formFieldSourceLabel(fieldId: string, fallback: string): string {
  return DETAIL_QUESTION_LABEL[fieldId] ?? fallback;
}

function createFormFieldIntelligenceSource(
  fieldId: string,
  fieldLabel: string,
  value: string,
  now: number,
  contactMailto?: string,
): IntelligenceSource {
  return {
    id: `src-field-${fieldId}`,
    title: fieldLabel,
    description: value,
    system: formFieldSourceSystem(fieldId),
    sourceType: "form_field",
    meta: "Private · Profile form",
    date: new Date(now).toLocaleDateString("en-US"),
    snippet: `${fieldLabel}: ${value}`,
    ref: contactMailto ?? `form:${fieldId}`,
  };
}

function createOnboardingIntelligence(
  answers: import("./OnboardingFlow.tsx").OnboardingFlowAnswers | null | undefined,
): IntelligenceItem[] {
  if (!answers) return [];

  const now = Date.now();

  // Only emit intelligence for answers that map to a named catalog signal.
  // type = catalog category key, subtype = exact signal name in that category.
  const specs: { id: string; fieldId: string; type: string; subtype: string; value: string }[] = [
    {
      id: "sales-motion",
      fieldId: "mkt_sales_motion",
      type: "gtm",
      subtype: "Primary GTM motion",
      value: answers.mkt_sales_motion ?? "",
    },
    {
      id: "funnel-gap",
      fieldId: "mkt_funnel_gap",
      type: "gtm",
      subtype: "Channel / GTM challenges",
      value: answers.mkt_funnel_gap ?? "",
    },
    {
      id: "icp-clarity",
      fieldId: "mkt_icp_clarity",
      type: "gtm",
      subtype: "Competitive pressure",
      value: answers.mkt_icp_clarity ?? "",
    },
    {
      id: "runway",
      fieldId: "rev_runway",
      type: "finance",
      subtype: "Runway",
      value: answers.rev_runway ?? "",
    },
    {
      id: "capital-priority",
      fieldId: "rev_capital_priority",
      type: "fundraising",
      subtype: "Actively fundraising",
      value: answers.rev_capital_priority ?? "",
    },
    {
      id: "software-sector",
      fieldId: "profile_product_description",
      type: "strategic",
      subtype: "Software sector",
      value: answers.profileProductDescription ?? "",
    },
  ];

  return specs
    .filter(spec => spec.value.trim())
    .map(spec => {
      const value = spec.value.trim();
      return {
        id: `intel-onboard-${spec.id}`,
        type: spec.type,
        subtype: spec.subtype,
        text: spec.subtype,
        highlight: value,
        date: BENCHMARK_PERIOD.toLowerCase(),
        age: formatRelativeAge(now),
        title: `${spec.subtype}: ${value}`,
        confidence: "Submitted",
        sources: [createFormFieldIntelligenceSource(spec.fieldId, spec.subtype, value, now)],
        updatedAtMs: now,
      };
    });
}

function createInitialIntelligenceSeed(
  initialBenchmark: OnboardingBenchmarkInput | null | undefined,
  onboardingAnswers: import("./OnboardingFlow.tsx").OnboardingFlowAnswers | null | undefined,
) {
  const benchmarkSeed = createInitialBenchmarkSeed(initialBenchmark);
  const onboardingItems = createOnboardingIntelligence(onboardingAnswers);
  return {
    // Intelligence = operating signals only. York IE reach-out lives in the sidebar, not the feed.
    items: [...(benchmarkSeed?.items ?? []), ...onboardingItems],
    submission: benchmarkSeed?.submission ?? null,
  };
}

const BENCHMARK_SUBMISSION_STORAGE_KEY = "fuel-benchmark-submission";

function loadStoredBenchmarkSubmission(): BenchmarkSubmission | null {
  try {
    const raw = window.localStorage.getItem(BENCHMARK_SUBMISSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BenchmarkSubmission;
    return parsed?.formValues ? parsed : null;
  } catch {
    return null;
  }
}

function saveStoredBenchmarkSubmission(submission: BenchmarkSubmission) {
  try {
    window.localStorage.setItem(BENCHMARK_SUBMISSION_STORAGE_KEY, JSON.stringify(submission));
  } catch {
    // Ignore storage failures in preview/demo environments.
  }
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
        subtype: spec.label,
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

function formatBenchmarkSummaryValue(key: string, raw: string) {
  const formatted = formatBenchmarkValue(key, raw);
  if (key === "burnMultiple") return formatted.replace(/x$/i, "");
  return formatted;
}

function formatProvenanceCategory(type: string): string {
  const fromCatalog = SIGNAL_CATALOG_BY_KEY[type]?.label;
  if (fromCatalog) return fromCatalog;
  if (!type) return "Signal";
  return type
    .split(/[_-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isRedundantProvenanceNote(item: IntelligenceItem, signalLabel: string): boolean {
  const note = (item.title || "").trim();
  if (!note) return true;
  const value = (item.highlight || "").trim();
  const signal = signalLabel.trim();
  const normalized = note.toLowerCase();
  if (value && normalized === value.toLowerCase()) return true;
  if (signal && value && normalized === `${signal}: ${value}`.toLowerCase()) return true;
  if (signal && normalized === signal.toLowerCase()) return true;
  return false;
}

function IntelligenceProvenanceSidebar({
  item,
  siblingItems = [],
  onClose,
}: {
  item: IntelligenceItem;
  siblingItems?: IntelligenceItem[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isYorkUpsell = item.id.startsWith("intel-york-");
  const signalLabel = item.subtype || item.text;
  const categoryLabel = formatProvenanceCategory(item.type);
  const hasHistory = siblingItems.length > 1;
  const showNote = !isYorkUpsell && !isRedundantProvenanceNote(item, signalLabel);
  const sourceCount = item.sources.length;

  return (
    <>
      <button className="context-sidebar-scrim" aria-label="Close signal detail" onClick={onClose} />
      <aside className="intelligence-provenance-sidebar">
        <div className="provenance-head">
          <strong>Signal detail</strong>
          <button type="button" onClick={onClose}>Close · Esc</button>
        </div>
        <div className="provenance-body">
          <section className="provenance-summary">
            <span className="provenance-category">{categoryLabel}</span>
            <h2 className="provenance-signal-name">{signalLabel}</h2>
            {item.highlight ? (
              <p className="provenance-value">{item.highlight}</p>
            ) : null}
            <dl className="provenance-facts">
              <div>
                <dt>Period</dt>
                <dd><time dateTime={item.date}>{formatBenchmarkPeriodLabel(item.date)}</time></dd>
              </div>
              {item.confidence ? (
                <div>
                  <dt>Confidence</dt>
                  <dd>{item.confidence}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {showNote ? (
            <section className="provenance-section">
              <h3 className="provenance-section-title">Note</h3>
              <div className="provenance-note-well">
                <p className="provenance-note">{item.title}</p>
              </div>
            </section>
          ) : null}

          <section className="provenance-section">
            <h3 className="provenance-section-title">
              {sourceCount > 0
                ? `${sourceCount} source${sourceCount === 1 ? "" : "s"}`
                : "Sources"}
            </h3>
            {sourceCount > 0 ? (
              <div className="provenance-sources">
                {item.sources.map((source) => {
                  const isFormField = source.sourceType === "form_field";
                  return (
                    <article className="provenance-source-block" key={source.id}>
                      <div className="provenance-source-title-row">
                        <strong>{source.title}</strong>
                        <time>{source.date}</time>
                      </div>
                      <p className="provenance-source-kind">
                        {isFormField ? `Form field · ${source.system}` : source.meta || source.system}
                      </p>
                      {source.description ? (
                        <p className="provenance-source-desc">
                          {isFormField ? (
                            <>Answered: <strong>{source.description}</strong></>
                          ) : (
                            source.description
                          )}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="provenance-empty-well">
                <p className="provenance-empty">
                  No linked sources. This value came from profile or benchmark context.
                </p>
              </div>
            )}
          </section>

          {hasHistory ? (
            <section className="provenance-section provenance-history-section">
              <h3 className="provenance-section-title">
                History · {siblingItems.length}
              </h3>
              <div className="provenance-history-list">
                {siblingItems.map((entry) => {
                  const isCurrent = entry.id === item.id;
                  return (
                    <div
                      key={entry.id}
                      className={`provenance-history-entry${isCurrent ? " is-current" : ""}`}
                    >
                      <p className="provenance-history-value">
                        {entry.highlight || entry.text}
                      </p>
                      <div className="provenance-history-meta">
                        {isCurrent ? (
                          <span className="provenance-history-current-badge">Current</span>
                        ) : null}
                        <time className="provenance-history-date" dateTime={entry.date}>
                          {formatBenchmarkPeriodLabel(entry.date)}
                        </time>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
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
          className={`${inline ? "document-upload-trigger-inline" : isCustomOnly ? "data-room-add-custom-btn" : "initiatives-secondary-btn"} document-upload-trigger${isProcessing ? " processing" : ""}${open ? " is-open" : ""}${creditBlocked ? " credit-action-disabled" : ""}`}
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

const SIGNALS_COHORT_OPTIONS = [
  { value: "b2b_saas:growth:us", label: "B2B SaaS · Growth · US", n: 94 },
  { value: "b2b_saas:seed:us", label: "B2B SaaS · Seed · US", n: 147 },
  { value: "b2b_saas:series_a:us", label: "B2B SaaS · Series A · US", n: 203 },
  { value: "dev_tools:series_a:us", label: "Dev Tools · Series A · US", n: 41 },
] as const;

function SignalsCohortSelect({
  value,
  onChange,
  id = "signals-cohort",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  return (
    <label className="signals-cohort-field" htmlFor={id}>
      <span className="visually-hidden">Peer cohort</span>
      <select
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-label="Peer cohort"
      >
        {SIGNALS_COHORT_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label} · n={option.n}
          </option>
        ))}
      </select>
    </label>
  );
}

function getInvestorVisibleIntelligence(
  companyIntelligence: IntelligenceItem[],
  investorIntelligence: IntelligenceItem[],
): IntelligenceItem[] {
  const benchmarkItems = companyIntelligence.filter(item => item.id.startsWith("intel-bench-"));
  return [...benchmarkItems, ...investorIntelligence];
}

const FOUNDER_CLAIMED_COMPANY_ID = "patriotpay";

const FOUNDER_COMPANY = {
  id: "patriotpay",
  name: "patriotpay",
  displayName: "Patriot Pay",
  domain: "patriotpay.com",
  logo: "P",
  logoBg: "#1E4D8C",
  logoUrl: "/company-logos/patriot-pay.svg",
  meta: "Healthcare · Patient Billing · Seed",
  headquarters: "Boston, MA, US",
  employees: "11-50",
  linkedin: "linkedin.com/company/patriotpay",
  onFuel: true,
};

function buildFounderNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "founder";
  if (localPart === "founders" || localPart === "founder" || localPart === "team") {
    return "Founding team";
  }
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function buildCompanyProfileSnapshot(company: PortfolioCompanyView): CompanyProfileSnapshot {
  const email = company.founderEmail ?? `founders@${company.domain}`;
  return {
    logo: company.logo,
    logoBg: company.logoBg,
    logoUrl: resolveCompanyLogoUrl(company),
    domain: company.domain,
    meta: company.meta,
    stage: company.stage,
    sector: company.sector,
    health: company.health,
    onFuel: company.onFuel,
    headquarters: company.headquarters,
    employees: company.employees,
    invested: company.invested,
    estimatedValueLabel: formatUsdCompact(company.estimatedValue),
    moicLabel: formatMoic(company.moic),
    ownership: company.ownership,
    arr: company.arr,
    arrGrowthLabel: formatGrowthRate(company.arrGrowthQoQ),
    runway: company.runway,
    nrrLabel: `${company.nrr}%`,
    investedAt: company.investedAt,
    lastUpdate: company.lastUpdate,
    daysSinceBenchmark: company.daysSinceBenchmark,
    redFlags: company.redFlags.map(flag => flag.label),
    strugglingAreas: company.strugglingAreas,
    founderName: buildFounderNameFromEmail(email),
    founderTitle: "Co-founder & CEO",
    founderEmail: email,
    founderLinkedin: company.linkedin,
  };
}

function resolveCompanyProfileSnapshot(companyId: string): CompanyProfileSnapshot | null {
  const portfolio = INVESTOR_PORTFOLIO.find(item => item.id === companyId);
  if (!portfolio) return null;
  return buildCompanyProfileSnapshot(buildPortfolioCompanyView(portfolio));
}

function hasInvestorWorkspaceOnCompany(
  companyId: string,
  intelligenceByCompany: Record<string, IntelligenceItem[]>,
  initiativesByCompany: Record<string, { id: string; title: string; description: string }[]>,
  benchmarkByCompany: Record<string, BenchmarkSubmission | null | undefined>,
  workspaceStarted: Record<string, boolean> = {},
): boolean {
  if (workspaceStarted[companyId]) return true;
  const investorIntel = (intelligenceByCompany[companyId] ?? []).filter(item => !item.id.startsWith("intel-bench-"));
  if (investorIntel.length > 0) return true;
  if ((initiativesByCompany[companyId]?.length ?? 0) > 0) return true;
  if (benchmarkByCompany[companyId]) return true;
  return false;
}

function canAccessPersonalOverview({
  isInvestor,
  companyId,
  intelligenceByCompany,
  initiativesByCompany,
  benchmarkByCompany,
}: {
  isInvestor: boolean;
  companyId: string;
  intelligenceByCompany: Record<string, IntelligenceItem[]>;
  initiativesByCompany: Record<string, { id: string; title: string; description: string }[]>;
  benchmarkByCompany: Record<string, BenchmarkSubmission | null | undefined>;
  workspaceStarted?: Record<string, boolean>;
}): boolean {
  if (!isInvestor) {
    return companyId === FOUNDER_CLAIMED_COMPANY_ID;
  }
  if (companyId === FOUNDER_CLAIMED_COMPANY_ID) return false;
  return hasInvestorWorkspaceOnCompany(
    companyId,
    intelligenceByCompany,
    initiativesByCompany,
    benchmarkByCompany,
    workspaceStarted,
  );
}

function getInvestorCompanyIntelligence(
  investorIntelligence: IntelligenceItem[],
  investorBenchmark: BenchmarkSubmission | null | undefined,
): IntelligenceItem[] {
  if (!investorBenchmark) return investorIntelligence;
  const benchmarkItems = createBenchmarkIntelligence(investorBenchmark.formValues).items;
  return [...benchmarkItems, ...investorIntelligence.filter(item => !item.id.startsWith("intel-bench-"))];
}

function isInvestorOwnedIntelligence(item: IntelligenceItem) {
  return item.id.startsWith("intel-investor-");
}

function DataRoomInvestorGate({
  companyName,
  requested,
  onRequestAccess,
}: {
  companyName: string;
  requested: boolean;
  onRequestAccess: () => void;
}) {
  return (
    <section className="data-room-page">
      <div className="data-room-head">
        <div>
          <h2>Data Room</h2>
          <p>
            Pitch decks, investor notes, financial models, and other private files. {companyName}&apos;s
            shared room stays private to the founding team until access is granted.
          </p>
        </div>
      </div>
      <div className="data-room-card data-room-investor-gate">
        <div className="data-room-card-icon" aria-hidden="true">📁</div>
        <strong>Data room access restricted</strong>
        <p>
          You can still view benchmarks, run playbooks, and build your own intelligence on this company.
          Founder-uploaded decks, models, and cap tables require an explicit access grant.
        </p>
        <button type="button" className={requested ? "is-sent" : ""} onClick={onRequestAccess} disabled={requested}>
          {requested ? "Access request sent" : "Request data room access"}
        </button>
      </div>
    </section>
  );
}

function DataRoomPage({
  documentSlots,
  processingDocumentTypeId = null,
  onUploadDocument,
  onViewIntelligence,
  onOpenDocumentHistory,
  investorMode = false,
  investorAccessRequested = false,
  companyName = "This company",
  onRequestDataRoomAccess,
}: {
  documentSlots: DataRoomDocumentSlot[];
  processingDocumentTypeId?: string | null;
  onUploadDocument: (typeId: string, typeLabel: string, file: File) => void;
  onViewIntelligence: (record: DataRoomFileRecord) => void;
  onOpenDocumentHistory: (slot: DataRoomDocumentSlot) => void;
  investorMode?: boolean;
  investorAccessRequested?: boolean;
  companyName?: string;
  onRequestDataRoomAccess?: () => void;
}) {
  if (investorMode) {
    return (
      <DataRoomInvestorGate
        companyName={companyName}
        requested={investorAccessRequested}
        onRequestAccess={() => onRequestDataRoomAccess?.()}
      />
    );
  }

  const activeSlots = getActiveDocumentSlots(documentSlots);
  const activeCount = activeSlots.length;

  return (
    <section className="data-room-page">
      <div className="data-room-head">
        <div>
          <h2>Data Room</h2>
          <p>
            Pitch decks, investor notes, financial models, and other private files Fuel uses to generate intelligence.
            One latest file per type.
          </p>
        </div>
        <div className="data-room-head-actions">
          <DocumentUploadDropdown
            documentSlots={documentSlots}
            processingTypeId={processingDocumentTypeId}
            onUpload={onUploadDocument}
          />
        </div>
      </div>
      {activeCount === 0 ? (
        <div className="data-room-card data-room-empty">
          <div className="data-room-card-icon" aria-hidden="true">📄</div>
          <strong>No documents yet</strong>
          <p>
            Choose a document type from <span>Upload document</span> — the same list as Intelligence — to add your first file.
          </p>
        </div>
      ) : (
        <div className="data-room-list">
          <div className="data-room-row data-room-row-head">
            <span>Type</span>
            <span>Latest file</span>
            <span>Format</span>
            <span>Uploaded</span>
            <span>Intelligence</span>
            <span>Actions</span>
          </div>
          {activeSlots.map(slot => (
            <div
              className={`data-room-row${slot.typeId.startsWith("custom:") ? " data-room-row-custom" : ""}`}
              key={slot.typeId}
            >
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
                ) : slot.current ? (
                  <span className={`data-room-intelligence-pending${slot.current.generationAttemptedAtMs ? " data-room-intelligence-empty" : ""}`}>
                    {slot.current.generationAttemptedAtMs ? "No intelligence identified" : "Awaiting generation"}
                  </span>
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
      )}
    </section>
  );
}



function SourceDetailSidebar({
  source,
  intelligenceMeta,
  linkedIntelligence,
  onClose,
  onGenerate,
  onDismiss,
  onViewIntelligence,
  onSelectIntelligence,
}: {
  source: PendingSource;
  intelligenceMeta: SourceIntelligenceMeta;
  linkedIntelligence: IntelligenceItem[];
  onClose: () => void;
  onGenerate?: () => void;
  onDismiss?: () => void;
  onViewIntelligence?: () => void;
  onSelectIntelligence?: (id: string) => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const typeLabel = source.kind === "document"
    ? source.document?.typeLabel || "Document"
    : "Private note";
  const statusLabel = intelligenceMeta.status === "awaiting"
    ? "Awaiting generation"
    : intelligenceMeta.status === "generated"
      ? "Intelligence generated"
      : "No intelligence extracted";

  return (
    <>
      <button className="context-sidebar-scrim" aria-label="Close source detail" onClick={onClose} />
      <aside className="document-history-sidebar source-detail-sidebar">
        <div className="provenance-head">
          <div>
            <span className="document-history-sidebar-label">Source detail</span>
            <strong>{source.title}</strong>
          </div>
          <button type="button" onClick={onClose}>Close · Esc</button>
        </div>
        <div className="document-history-sidebar-body">
          <div className="source-detail-sidebar-section">
            <span className="source-detail-sidebar-label">Type</span>
            <strong>{typeLabel}</strong>
          </div>
          <div className="source-detail-sidebar-section">
            <span className="source-detail-sidebar-label">Status</span>
            <strong>{statusLabel}</strong>
            {source.emptyReason ? <p>{source.emptyReason}</p> : null}
          </div>
          {source.description ? (
            <div className="source-detail-sidebar-section">
              <span className="source-detail-sidebar-label">Context</span>
              <p>{source.description}</p>
            </div>
          ) : null}
          <div className="source-detail-sidebar-meta">
            <span>Added {source.addedAtLabel}</span>
            {source.processedAtLabel ? <span>Processed {source.processedAtLabel}</span> : null}
          </div>
          {linkedIntelligence.length > 0 ? (
            <div className="source-detail-sidebar-intelligence">
              <span className="source-detail-sidebar-label">
                {linkedIntelligence.length} intelligence item{linkedIntelligence.length === 1 ? "" : "s"} generated
              </span>
              {linkedIntelligence.map(item => (
                <button
                  type="button"
                  className="source-detail-intelligence-link"
                  key={item.id}
                  onClick={() => onSelectIntelligence?.(item.id)}
                >
                  <strong>{item.text}</strong>
                  <span>{item.type} · {item.date}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="source-detail-sidebar-actions">
            {intelligenceMeta.status === "awaiting" && onGenerate ? (
              <button type="button" className="signals-pending-generate" onClick={onGenerate}>
                Generate intelligence
              </button>
            ) : null}
            {intelligenceMeta.count > 0 && onViewIntelligence ? (
              <button type="button" className="data-room-intelligence-link" onClick={onViewIntelligence}>
                View {intelligenceMeta.count} in timeline →
              </button>
            ) : null}
            {source.kind === "note" && onDismiss ? (
              <button type="button" className="signals-pending-dismiss" onClick={onDismiss}>
                Remove source
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}

function SourcesListPanel({
  sources,
  documentSlots,
  onSelectSource,
  onGenerateFromPending,
  onDismissPendingSource,
  onFocusIntelligence,
}: {
  sources: PendingSource[];
  documentSlots: DataRoomDocumentSlot[];
  onSelectSource: (sourceId: string) => void;
  onGenerateFromPending?: (pendingId: string) => void;
  onDismissPendingSource?: (pendingId: string) => void;
  onFocusIntelligence?: (focus: IntelligenceFocus) => void;
}) {
  if (!sources.length) {
    return (
      <div className="signals-sources-panel">
        <div className="signals-sources-head">
          <strong>Sources</strong>
          <em>0 sources</em>
        </div>
        <div className="signals-intel-empty">
          <strong>No sources yet</strong>
          <p>Add a source above to start building context for intelligence generation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="signals-sources-panel">
      <div className="signals-sources-head">
        <strong>Sources</strong>
        <em>{sources.length} source{sources.length === 1 ? "" : "s"}</em>
      </div>
      <div className="data-room-list signals-sources-list">
        <div className="data-room-row data-room-row-head signals-sources-row">
          <span>Source</span>
          <span>Type</span>
          <span>Added</span>
          <span>Intelligence</span>
          <span>Actions</span>
        </div>
        {sources.map(source => {
          const meta = getSourceIntelligenceMeta(source, documentSlots);
          const typeLabel = source.kind === "document"
            ? source.document?.typeLabel || "Document"
            : "Private note";

          return (
            <div
              className="data-room-row signals-sources-row signals-sources-row-clickable"
              key={source.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSource(source.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectSource(source.id);
                }
              }}
            >
              <strong className="data-room-latest">{source.title}</strong>
              <span>{typeLabel}</span>
              <span>{source.addedAtLabel}</span>
              <span className="data-room-intelligence">
                {meta.status === "generated" ? (
                  <button
                    type="button"
                    className="data-room-intelligence-link"
                    onClick={(event) => {
                      event.stopPropagation();
                      onFocusIntelligence?.({ ids: meta.ids, label: source.title });
                    }}
                  >
                    {meta.count} generated →
                  </button>
                ) : meta.status === "empty" ? (
                  <span className="data-room-intelligence-pending data-room-intelligence-empty">
                    0
                  </span>
                ) : (
                  <span className="data-room-intelligence-pending">Awaiting generation</span>
                )}
              </span>
              <span className="signals-sources-row-actions" onClick={event => event.stopPropagation()}>
                {source.kind === "note" ? (
                  <button
                    type="button"
                    className="signals-pending-dismiss"
                    onClick={() => onDismissPendingSource?.(source.id)}
                  >
                    Remove
                  </button>
                ) : null}
                {meta.status === "awaiting" ? (
                  <button
                    type="button"
                    className="signals-pending-generate"
                    onClick={() => onGenerateFromPending?.(source.id)}
                  >
                    Generate
                  </button>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Single subtype row: latest value + history/source counts ────────────────
function SubtypeRow({
  subtypeKey,
  categoryLabel,
  items,
  blinkingIds,
  renderTimelineRow,
  onSelectItem,
}: {
  subtypeKey: string;
  categoryLabel: string;
  items: IntelligenceItem[];
  blinkingIds: string[];
  renderTimelineRow: (item: IntelligenceItem) => React.ReactNode;
  onSelectItem?: (id: string) => void;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const latest = items[0];
  const history = items.slice(1);
  const isBlink = blinkingIds.includes(latest.id);
  const sourceCount = latest.sources?.length ?? 0;
  const isEmptyCopy = latest.highlight.trim().toLowerCase().startsWith("no ")
    || latest.highlight.length > 48;

  return (
    <div className={`intel-signal-row${isBlink ? " blink-once" : ""}`}>
      <div
        className="intel-signal-latest"
        role="button"
        tabIndex={0}
        onClick={() => onSelectItem?.(latest.id)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectItem?.(latest.id); } }}
      >
        <div className="intel-signal-title">
          <span className="intel-signal-category">{categoryLabel}</span>
          <span className="intel-signal-name">{subtypeKey}</span>
        </div>
        <strong className={`intel-signal-value${isEmptyCopy ? " is-empty-copy" : ""}`}>{latest.highlight}</strong>
        <time className="intel-signal-period" dateTime={latest.date}>
          {formatBenchmarkPeriodLabel(latest.date)}
        </time>
        <div className={`intel-signal-meta-slot${sourceCount > 0 || history.length > 0 ? "" : " is-empty"}`}>
          {sourceCount > 0 ? (
            <span
              className="intel-signal-meta-chip intel-signal-meta-chip--sources"
              title={`${sourceCount} linked source${sourceCount === 1 ? "" : "s"}`}
              aria-label={`${sourceCount} source${sourceCount === 1 ? "" : "s"}`}
            >
              <span className="intel-signal-meta-label">Sources</span>
              <span className="intel-signal-meta-count">{sourceCount}</span>
            </span>
          ) : null}
          {history.length > 0 ? (
            <button
              type="button"
              className={`intel-signal-meta-chip intel-signal-meta-chip--history${historyOpen ? " is-open" : ""}`}
              onClick={e => { e.stopPropagation(); setHistoryOpen(o => !o); }}
              aria-expanded={historyOpen}
              title={`${history.length} earlier entr${history.length === 1 ? "y" : "ies"}`}
            >
              <span className="intel-signal-meta-label">History</span>
              <span className="intel-signal-meta-count">{history.length}</span>
              <span className="intel-signal-meta-chevron" aria-hidden="true">{historyOpen ? "▴" : "▾"}</span>
            </button>
          ) : null}
        </div>
      </div>
      {historyOpen ? (
        <div className="intel-signal-history">
          {history.map(item => renderTimelineRow(item))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Intelligence category panel (flat body — category chosen via tabs) ───────
function IntelligenceCategoryPanel({
  categoryKey,
  items,
  blinkingIds,
  onSelectItem,
  renderTimelineRow,
}: {
  categoryKey: string;
  items: IntelligenceItem[];
  blinkingIds: string[];
  onSelectItem: (id: string) => void;
  renderTimelineRow: (item: IntelligenceItem) => React.ReactNode;
}) {
  const categoryLabel = SIGNAL_CATALOG_BY_KEY[categoryKey]?.label ?? categoryKey;

  const subtypeGroups = useMemo(() => {
    const map = new Map<string, IntelligenceItem[]>();
    for (const item of items) {
      const key = item.subtype || item.text || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    map.forEach(group => group.sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0)));
    return [...map.entries()];
  }, [items]);

  return (
    <div className="intel-cat-panel">
      {subtypeGroups.map(([subtypeKey, grp]) => (
        <SubtypeRow
          key={subtypeKey}
          subtypeKey={subtypeKey}
          categoryLabel={categoryLabel}
          items={grp}
          blinkingIds={blinkingIds}
          renderTimelineRow={renderTimelineRow}
          onSelectItem={onSelectItem}
        />
      ))}
    </div>
  );
}

// ─── Inline sources section (replaces the Sources tab) ───────────────────────
function SourcesDrawer({
  sources,
  documentSlots,
  onClose,
  onSelectSource,
  onGenerateFromPending,
  onDismissPendingSource,
  onFocusIntelligence,
}: {
  sources: PendingSource[];
  documentSlots: DataRoomDocumentSlot[];
  onClose: () => void;
  onSelectSource: (id: string) => void;
  onGenerateFromPending?: (id: string) => void;
  onDismissPendingSource?: (id: string) => void;
  onFocusIntelligence?: (focus: IntelligenceFocus) => void;
}) {
  const handleScrimPointerDown = useScrimPointerClose(onClose);

  return (
    <div className="bench-drawer-scrim" onPointerDown={handleScrimPointerDown} role="presentation">
      <aside className="bench-drawer" {...drawerPanelPointerProps()} role="dialog" aria-label="Sources">
        <header className="bench-drawer-head">
          <div>
            <h2 className="bench-drawer-title">Sources</h2>
            <p className="bench-drawer-sub">Notes and documents that feed intelligence. Notes are reference-only; documents can generate intelligence.</p>
          </div>
          <button type="button" className="bench-drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="bench-drawer-body">
          {sources.length === 0 ? (
            <p style={{ color: "var(--text-3)", fontSize: 13 }}>No sources added yet.</p>
          ) : (
            <div className="sources-drawer-list">
              {sources.map(source => {
                const meta = getSourceIntelligenceMeta(source, documentSlots);
                const isNote = source.kind === "note";
                const hasIntel = meta.status === "generated" && meta.count > 0;
                const canGenerate = !isNote && meta.status === "awaiting";
                return (
                  <div
                    key={source.id}
                    className="sources-drawer-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => { onSelectSource(source.id); onClose(); }}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectSource(source.id); onClose(); } }}
                  >
                    <span className={`sources-drawer-kind${isNote ? " note" : " doc"}`}>{isNote ? "Note" : "Doc"}</span>
                    <div className="sources-drawer-info">
                      <strong className="sources-drawer-title">{source.title}</strong>
                      <span className="sources-drawer-meta">{source.addedAtLabel}</span>
                    </div>
                    <div className="sources-drawer-action" onClick={e => e.stopPropagation()}>
                      {hasIntel ? (
                        <button
                          type="button"
                          className="sources-drawer-intel-link"
                          onClick={() => { onFocusIntelligence?.({ ids: meta.ids, label: source.title }); onClose(); }}
                        >
                          {meta.count} signal{meta.count === 1 ? "" : "s"} →
                        </button>
                      ) : isNote ? (
                        <span className="sources-drawer-ref-badge">Reference only</span>
                      ) : canGenerate ? (
                        <button
                          type="button"
                          className="sources-drawer-generate"
                          onClick={() => onGenerateFromPending?.(source.id)}
                        >
                          Extract →
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="sources-drawer-remove"
                        aria-label="Remove source"
                        onClick={() => onDismissPendingSource?.(source.id)}
                      >×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function LogIntelligenceDrawer({
  onLog,
  onClose,
}: {
  onLog: (item: IntelligenceItem) => void;
  onClose: () => void;
}) {
  const submitRef = useRef<(() => void) | null>(null);
  const handleScrimPointerDown = useScrimPointerClose(onClose);

  return (
    <div className="bench-drawer-scrim" onPointerDown={handleScrimPointerDown} role="presentation">
      <aside className="bench-drawer" {...drawerPanelPointerProps()} role="dialog" aria-label="Log intelligence">
        <header className="bench-drawer-head">
          <div>
            <h2 className="bench-drawer-title">Log intelligence</h2>
            <p className="bench-drawer-sub">Record a metric value against a catalog signal. Select the signal and enter the value — it will appear in your intelligence timeline.</p>
          </div>
          <button type="button" className="bench-drawer-x" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="bench-drawer-body">
          <IntelligenceLogForm
            onLog={onLog}
            onCancel={onClose}
            hideActions
            submitRef={submitRef}
          />
        </div>
        <footer className="bench-drawer-actions">
          <button type="button" className="bench-drawer-cancel" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="bench-drawer-save"
            onClick={() => submitRef.current?.()}
          >
            Log intelligence
          </button>
        </footer>
      </aside>
    </div>
  );
}

function SignalsPage({
  isProfileComplete,
  onLogBenchmarkData,
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
  onFocusIntelligence,
  benchmarkSubmission = null,
  benchmarkBlinkIds = [],
  activeTourTarget,
  manualPendingSources = [],
  onGenerateFromPending,
  onDismissPendingSource,
  onAttemptSourceGeneration,
  benchmark,
  companyName = "This company",
  onBenchmarkChange,
}: {
  isProfileComplete: boolean;
  onLogBenchmarkData: () => void;
  onUpdatePeriod?: () => void;
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
  onFocusIntelligence?: (focus: IntelligenceFocus) => void;
  benchmarkSubmission?: BenchmarkSubmission | null;
  benchmarkBlinkIds?: string[];
  activeTourTarget?: string;
  manualPendingSources?: PendingSource[];
  onGenerateFromPending?: (pendingId: string) => void;
  onDismissPendingSource?: (pendingId: string) => void;
  onAttemptSourceGeneration?: (params: {
    title: string;
    description: string;
    document?: { typeId: string; typeLabel: string; file: File };
    documentMeta?: { typeId: string; typeLabel: string; fileName: string };
    pendingId?: string;
  }) => void;
  benchmark: OnboardingBenchmarkInput;
  companyName?: string;
  onBenchmarkChange?: (benchmark: OnboardingBenchmarkInput) => void;
}) {
  const timelinePanelRef = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(), []);
  const [selectedIntelligenceId, setSelectedIntelligenceId] = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showSourcesDrawer, setShowSourcesDrawer] = useState(false);
  const [documentNotice, setDocumentNotice] = useState<string | null>(null);
  const [blinkingIntelligenceIds, setBlinkingIntelligenceIds] = useState<string[]>([]);
  const [activeTimelineFilter, setActiveTimelineFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<IntelligenceDatePreset>("current-quarter");
  const [customRange, setCustomRange] = useState<IntelligenceCustomRange>({
    startMonth: now.getMonth(),
    startYear: now.getFullYear(),
    endMonth: now.getMonth(),
    endYear: now.getFullYear(),
  });
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sourceFormOpen, setSourceFormOpen] = useState(false);
  const [editBenchmarkOpen, setEditBenchmarkOpen] = useState(false);
  const [cohortValue, setCohortValue] = useState<string>("b2b_saas:seed:us");
  const intelligenceFocusActive = Boolean(intelligenceFocus?.ids.length);
  const openBenchmarkDrawer = () => setEditBenchmarkOpen(true);
  // Same parent categories + order as the Log intelligence signal dropdown.
  const timelineFilters = useMemo(
    () => ["All", ...SIGNAL_CATEGORY_KEYS] as const,
    [],
  );
  const yearOptions = useMemo(() => buildYearOptions(now), [now]);

  const scopedIntelligenceItems = useMemo(
    () => {
      const withoutPartnerAds = intelligenceItems.filter(item => !item.id.startsWith("intel-york-"));
      return intelligenceFocusActive
        ? withoutPartnerAds.filter(item => intelligenceFocus!.ids.includes(item.id))
        : withoutPartnerAds;
    },
    [intelligenceFocus, intelligenceFocusActive, intelligenceItems],
  );

  const typeFilteredItems = useMemo(() => {
    if (activeTimelineFilter === "All") return scopedIntelligenceItems;
    return scopedIntelligenceItems.filter(item => item.type === activeTimelineFilter);
  }, [activeTimelineFilter, scopedIntelligenceItems]);

  const searchFilteredItems = useMemo(
    () => typeFilteredItems.filter(item => matchesIntelligenceSearch(item, searchQuery)),
    [searchQuery, typeFilteredItems],
  );

  const dateRange = useMemo(
    () => getIntelligenceDateRange(datePreset, customRange, now),
    [customRange, datePreset, now],
  );

  const resolveUpdatedAt = useCallback(
    (item: IntelligenceItem) => getIntelligenceUpdatedAtMs(item, benchmarkSubmission?.submittedAtMs),
    [benchmarkSubmission?.submittedAtMs],
  );

  const filteredIntelligenceItems = useMemo(
    () => filterIntelligenceByDate(searchFilteredItems, dateRange.start, dateRange.end, resolveUpdatedAt),
    [dateRange, resolveUpdatedAt, searchFilteredItems],
  );


  const visibleIntelligenceItems = filteredIntelligenceItems;
  const pendingSources = useMemo(
    () => getPendingSources(manualPendingSources, documentSlots),
    [documentSlots, manualPendingSources],
  );
  const filtersActive = Boolean(
    searchQuery.trim()
    || activeTimelineFilter !== "All"
    || datePreset !== "current-quarter",
  );
  const showIntelligenceTimeline = true;
  const selectedIntelligence = intelligenceItems.find(item => item.id === selectedIntelligenceId) || null;

  // All items with the same category + signal as the selected item, sorted latest→oldest
  const selectedIntelligenceHistory = useMemo(() => {
    if (!selectedIntelligence) return [];
    const signalKey = selectedIntelligence.subtype || selectedIntelligence.text;
    return intelligenceItems
      .filter(item =>
        item.type === selectedIntelligence.type &&
        (item.subtype || item.text) === signalKey
      )
      .sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
  }, [selectedIntelligence, intelligenceItems]);

  const selectedSource = pendingSources.find(source => source.id === selectedSourceId) || null;
  const selectedSourceMeta = selectedSource
    ? getSourceIntelligenceMeta(selectedSource, documentSlots)
    : null;
  const selectedSourceIntelligence = selectedSourceMeta
    ? intelligenceItems.filter(item => selectedSourceMeta.ids.includes(item.id))
    : [];
  const cohortMeta = SIGNALS_COHORT_OPTIONS.find(option => option.value === cohortValue)
    ?? SIGNALS_COHORT_OPTIONS[1];

  useEffect(() => {
    if (!intelligenceFocus?.ids.length) return;
    setSelectedSourceId(null);
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

  const renderTimelineRow = (row: IntelligenceItem) => {
    const isBenchmarkRow = row.id.startsWith("intel-bench-");
    return (
      <div
        className={`signals-timeline-row${isBenchmarkRow ? " signals-timeline-row-benchmark" : ""}${selectedIntelligenceId === row.id ? " selected" : ""}${blinkingIntelligenceIds.includes(row.id) || benchmarkBlinkIds.includes(row.id) ? " blink-once" : ""}`}
        key={row.id}
        data-intelligence-id={row.id}
        role="button"
        tabIndex={0}
        onClick={() => { setSelectedIntelligenceId(row.id); setSelectedSourceId(null); }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSelectedIntelligenceId(row.id);
            setSelectedSourceId(null);
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
              {`${row.sources.length} source${row.sources.length > 1 ? "s" : ""}`}
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

  // Derived directly from SIGNAL_CATALOG — the single source of truth.
  const CATEGORY_META = useMemo(() => {
    const meta: Record<string, { label: string; icon: string }> = {};
    SIGNAL_CATALOG.forEach(cat => { meta[cat.key] = { label: cat.label, icon: cat.icon }; });
    return meta;
  }, []);

  // Valid catalog signal names per category key, for subtype validation.
  const CATALOG_SIGNAL_SET = useMemo(() => {
    const map = new Map<string, Set<string>>();
    SIGNAL_CATALOG.forEach(cat => {
      map.set(cat.key, new Set(cat.signals.map(s => s.name)));
    });
    return map;
  }, []);

  // Group items by type. Only catalog-valid category keys are included.
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, IntelligenceItem[]>();
    filteredIntelligenceItems.forEach(item => {
      const catKey = item.type;
      if (!catKey || !CATALOG_SIGNAL_SET.has(catKey)) return;
      const validSignals = CATALOG_SIGNAL_SET.get(catKey)!;
      const subtypeKey = item.subtype || item.text;
      if (subtypeKey && !validSignals.has(subtypeKey)) return;
      if (!groups.has(catKey)) groups.set(catKey, []);
      groups.get(catKey)!.push(item);
    });
    const catalogOrder = SIGNAL_CATALOG.map(c => c.key);
    return [...groups.entries()].sort(
      ([a], [b]) => catalogOrder.indexOf(a) - catalogOrder.indexOf(b)
    );
  }, [filteredIntelligenceItems, CATALOG_SIGNAL_SET]);

  const categoryTabOptions = useMemo(
    () => timelineFilters.map(filter => ({
      id: filter,
      label: filter === "All" ? "All" : (CATEGORY_META[filter]?.label ?? filter),
    })),
    [CATEGORY_META, timelineFilters],
  );

  const intelligenceTimelinePanel = (
    <div className="signals-board-panel" ref={timelinePanelRef}>
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

      {!intelligenceFocusActive ? (
        <div className="intel-category-tabs" role="tablist" aria-label="Intelligence categories">
          {categoryTabOptions.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTimelineFilter === tab.id}
              className={`intel-category-tab${activeTimelineFilter === tab.id ? " is-active" : ""}`}
              onClick={() => setActiveTimelineFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {!intelligenceFocusActive ? (
        <div className="signals-intel-toolbar">
          <label className="signals-intel-search">
            <span className="signals-intel-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search signals…"
              aria-label="Search intelligence"
            />
          </label>

          <div className="signals-intel-toolbar-right">
            <select
              className="signals-intel-toolbar-select"
              value={datePreset}
              onChange={event => setDatePreset(event.target.value as IntelligenceDatePreset)}
              aria-label="Date range"
            >
              {INTELLIGENCE_DATE_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>

            <button
              type="button"
              className={`intel-sources-toolbar-btn${showSourcesDrawer ? " is-active" : ""}`}
              onClick={() => setShowSourcesDrawer(o => !o)}
            >
              Sources
              <span className="intel-sources-toolbar-count">{pendingSources.length}</span>
            </button>
          </div>
        </div>
      ) : null}

      {filteredIntelligenceItems.length > 0 ? (
        <div className="intel-category-feed">
          {categoryGroups.map(([categoryKey, items]) => (
            <IntelligenceCategoryPanel
              key={categoryKey}
              categoryKey={categoryKey}
              items={items}
              blinkingIds={[...blinkingIntelligenceIds, ...benchmarkBlinkIds]}
              onSelectItem={(id) => { setSelectedIntelligenceId(id); setSelectedSourceId(null); }}
              renderTimelineRow={renderTimelineRow}
            />
          ))}
        </div>
      ) : (
        <div className="signals-intel-empty">
          {filtersActive ? (
            <>
              <strong>No intelligence matches these filters</strong>
              <p>Try widening the date range, clearing search, or switching the category.</p>
            </>
          ) : (
            <>
              <strong>No intelligence yet</strong>
              <p>Add a source or log intelligence to start building your timeline.</p>
            </>
          )}
        </div>
      )}

      {isProfileComplete && !benchmarkSubmission ? (
        <div className="signals-footnote">
          Overlay uses <span>{cohortMeta.label}</span>. Finish private data to place your company on the cohort.
        </div>
      ) : null}
    </div>
  );

  if (isProfileComplete) {
    return (
      <section className="signals-page">
        <CreditBlockBanner />

        <div className="signals-page-head">
          <div>
            <h2>Intelligence</h2>
            <p>Metrics from benchmarks, sources, and logged context — private to your account.</p>
          </div>
          {!intelligenceFocusActive ? (
            <div className="signals-page-head-actions">
              <button
                type="button"
                className={`initiatives-secondary-btn${activeTourTarget === "add-source" ? " tour-highlight" : ""}`}
                data-tour-target={activeTourTarget === "add-source" ? "add-source" : undefined}
                onClick={() => setSourceFormOpen(true)}
              >
                Add source
              </button>
              <button
                type="button"
                className={`initiatives-secondary-btn${activeTourTarget === "log-intelligence" ? " tour-highlight" : ""}`}
                data-tour-target={activeTourTarget === "log-intelligence" ? "log-intelligence" : undefined}
                onClick={() => setShowLogForm(true)}
              >
                Log intelligence
              </button>
              <button type="button" className="initiatives-secondary-btn" onClick={openBenchmarkDrawer}>
                Update benchmark
              </button>
            </div>
          ) : null}
        </div>

        {documentNoticeBanner}

        {intelligenceTimelinePanel}

        <ContextFeedPage
          onOpenConnectors={onLinkConnectors}
          onIntelligenceGenerated={handleIntelligenceGenerated}
          onAttemptSourceGeneration={onAttemptSourceGeneration}
          documentSlots={documentSlots}
          onPersistSourceDocument={onPersistSourceDocument}
          sourceFormOpen={sourceFormOpen}
          onSourceFormOpenChange={setSourceFormOpen}
        />

        {selectedIntelligence ? (
          <IntelligenceProvenanceSidebar
            item={selectedIntelligence}
            siblingItems={selectedIntelligenceHistory}
            onClose={() => setSelectedIntelligenceId(null)}
          />
        ) : null}

        {selectedSource && selectedSourceMeta ? (
          <SourceDetailSidebar
            source={selectedSource}
            intelligenceMeta={selectedSourceMeta}
            linkedIntelligence={selectedSourceIntelligence}
            onClose={() => setSelectedSourceId(null)}
            onGenerate={() => onGenerateFromPending?.(selectedSource.id)}
            onDismiss={() => {
              onDismissPendingSource?.(selectedSource.id);
              setSelectedSourceId(null);
            }}
            onViewIntelligence={() => {
              onFocusIntelligence?.({ ids: selectedSourceMeta.ids, label: selectedSource.title });
              setSelectedSourceId(null);
            }}
            onSelectIntelligence={(id) => {
              setSelectedSourceId(null);
              setSelectedIntelligenceId(id);
            }}
          />
        ) : null}

        {showLogForm ? (
          <LogIntelligenceDrawer
            onLog={item => { handleIntelligenceGenerated(item); setShowLogForm(false); }}
            onClose={() => setShowLogForm(false)}
          />
        ) : null}

        {showSourcesDrawer ? (
          <SourcesDrawer
            sources={pendingSources}
            documentSlots={documentSlots}
            onClose={() => setShowSourcesDrawer(false)}
            onSelectSource={(id) => { setSelectedSourceId(id); setSelectedIntelligenceId(null); }}
            onGenerateFromPending={onGenerateFromPending}
            onDismissPendingSource={onDismissPendingSource}
            onFocusIntelligence={onFocusIntelligence}
          />
        ) : null}

        <BenchmarkEditDrawer
          open={editBenchmarkOpen}
          onClose={() => setEditBenchmarkOpen(false)}
          benchmark={benchmark}
          companyName={companyName}
          onSave={next => {
            onBenchmarkChange?.(next);
          }}
        />
      </section>
    );
  }

  return (
    <section className="signals-page">
      <div className="signals-page-head">
        <div>
          <h2>Intelligence</h2>
          <p>
            You can add intelligence manually now. Complete your profile to earn more credits and give Fuel better company context.
          </p>
        </div>
        <div className="signals-page-head-actions">
          {activeTourTarget === "add-source" || activeTourTarget === "log-intelligence" ? (
            <>
              <button
                type="button"
                className={`initiatives-secondary-btn${activeTourTarget === "add-source" ? " tour-highlight" : ""}`}
                data-tour-target={activeTourTarget === "add-source" ? "add-source" : undefined}
                onClick={() => setSourceFormOpen(true)}
              >
                Add source
              </button>
              <button
                type="button"
                className={`initiatives-secondary-btn${activeTourTarget === "log-intelligence" ? " tour-highlight" : ""}`}
                data-tour-target={activeTourTarget === "log-intelligence" ? "log-intelligence" : undefined}
                onClick={() => setShowLogForm(true)}
              >
                Log intelligence
              </button>
            </>
          ) : (
            <button type="button" className="initiatives-primary-btn" onClick={onLogBenchmarkData}>
              Complete profile
            </button>
          )}
        </div>
      </div>

      {documentNoticeBanner}

      <article className="overview-panel signals-gate-panel">
        <div className="overview-panel-head">
          <div>
            <span>Better results with a full profile</span>
            <strong>This page is open. Completing your profile adds context and credits so Fuel can run stronger intelligence.</strong>
          </div>
        </div>
        <p>
          Choose a cohort, then log ARR, retention, burn, and headcount. Fuel places your numbers on the distribution
          and builds intelligence from what you submit. A fuller profile improves those insights and expands your credits.
        </p>
        <div className="signals-gate-controls">
          <SignalsCohortSelect value={cohortValue} onChange={setCohortValue} id="signals-cohort-gate" />
          <button type="button" className="initiatives-primary-btn" onClick={onLogBenchmarkData}>
            Log benchmark data →
          </button>
        </div>
      </article>

      <ContextFeedPage
        onOpenConnectors={onLinkConnectors}
        onIntelligenceGenerated={handleIntelligenceGenerated}
        onAttemptSourceGeneration={onAttemptSourceGeneration}
        documentSlots={documentSlots}
        processingDocumentTypeId={processingDocumentTypeId}
        onPersistSourceDocument={onPersistSourceDocument}
        sourceFormOpen={sourceFormOpen}
        onSourceFormOpenChange={setSourceFormOpen}
      />

      {showIntelligenceTimeline ? intelligenceTimelinePanel : null}

      {selectedIntelligence ? (
        <IntelligenceProvenanceSidebar
          item={selectedIntelligence}
          siblingItems={selectedIntelligenceHistory}
          onClose={() => setSelectedIntelligenceId(null)}
        />
      ) : null}

      {showSourcesDrawer ? (
        <SourcesDrawer
          sources={pendingSources}
          documentSlots={documentSlots}
          onClose={() => setShowSourcesDrawer(false)}
          onSelectSource={(id) => { setSelectedSourceId(id); setSelectedIntelligenceId(null); }}
          onGenerateFromPending={onGenerateFromPending}
          onDismissPendingSource={onDismissPendingSource}
          onFocusIntelligence={onFocusIntelligence}
        />
      ) : null}
    </section>
  );
}

type ProfileDrawerSection = ProfileModuleId | "bench";

/** Right-rail complete-profile popup — 30% viewport width, full height. Task surface: no illustration. */
function CompleteProfileDrawer({
  open,
  companyName,
  companyKey,
  initialSection = "company",
  initialAnswers,
  onClose,
  onComplete,
  onModuleEarned,
  onModuleSaved,
  onModuleProgress,
  onModuleCreditReward,
  onAnswersChange,
  earnedProfileCredits,
  reloadLandingActive = false,
  drawerResetKey = 0,
  onSaved,
}: {
  open: boolean;
  companyName: string;
  companyKey?: string;
  initialSection?: ProfileDrawerSection;
  initialAnswers?: DetailAnswers;
  onClose: () => void;
  onComplete: (completedModules: ProfileModuleId[]) => void;
  onModuleEarned?: (earned: EarnedProfileCredits) => void;
  onModuleSaved?: (module: ProfileModuleId, answers: DetailAnswers) => void;
  onModuleProgress?: (module: ProfileModuleId, answers: DetailAnswers) => void;
  onModuleCreditReward?: (reward: import("./profileCredits").ProfileCreditReward) => void;
  onAnswersChange?: () => void;
  earnedProfileCredits?: EarnedProfileCredits;
  reloadLandingActive?: boolean;
  drawerResetKey?: number;
  onSaved?: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const requestCloseRef = useRef<() => void>(() => {});
  useDialogA11y(open, dialogRef, () => requestCloseRef.current());
  const handleScrimPointerDown = useScrimPointerClose(() => requestCloseRef.current(), open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="profile-complete-drawer-scrim"
      onPointerDown={handleScrimPointerDown}
      role="presentation"
    >
      <aside
        ref={dialogRef}
        className="profile-complete-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-complete-drawer-title"
        {...drawerPanelPointerProps()}
      >
        <h2 id="profile-complete-drawer-title" className="sr-only">Complete your profile</h2>
        <div className="profile-complete-drawer-body">
          <UnifiedProfileDrawer
            key={`${companyKey ?? companyName}-${initialSection}-drawer-${drawerResetKey}`}
            embedded
            companyName={companyName}
            companyKey={companyKey ?? companyName}
            initialSection={initialSection}
            initialAnswers={reloadLandingActive ? undefined : initialAnswers}
            earnedProfileCredits={earnedProfileCredits}
            reloadLandingActive={reloadLandingActive}
            onClose={onClose}
            onModuleEarned={onModuleEarned}
            onModuleSaved={onModuleSaved}
            onModuleProgress={onModuleProgress}
            onModuleCreditReward={onModuleCreditReward}
            onAnswersChange={onAnswersChange}
            onBindRequestClose={(requestClose) => {
              requestCloseRef.current = requestClose;
            }}
            onComplete={(completedModules) => {
              onComplete(completedModules);
            }}
            onSaveClose={onSaved}
          />
        </div>
      </aside>
    </div>,
    document.body,
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
      <p>Confirm each number Fuel can verify. Newer submissions keep peer ranges more accurate for everyone.</p>
      <div><b>Verified domain</b><em>Your input</em></div>
    </aside>
  );
}

function TourPromptBanner({
  onStartTour,
  onDismiss,
  building = false,
  reloadLanding = false,
}: {
  onStartTour: () => void;
  onDismiss: () => void;
  building?: boolean;
  reloadLanding?: boolean;
}) {
  return (
    <div className={`tour-prompt-banner${building ? " is-building" : ""}`} role="status">
      <div>
        <span>{building ? "Building intelligence" : "Workspace tour"}</span>
        <strong>
          {building
            ? "Take a quick tour while Fuel builds your workspace"
            : reloadLanding
              ? "Want a quick walkthrough of your workspace?"
              : "Want a quick walkthrough of Fuel?"}
        </strong>
        <p>
          {building
            ? "Overview scores, Intelligence, and Initiatives are being prepared from your onboarding. Explore the product now — you do not need to wait."
            : reloadLanding
              ? "See how the 5 modules, credits, and workspace dashboard work together — then start entering data to generate your report."
              : "See how Workspace, Overview, Intelligence, Initiatives, and Data Room work together now that your profile is set up."}
        </p>
      </div>
      <div className="tour-prompt-actions">
        <button type="button" onClick={onStartTour}>Start tour</button>
        <button type="button" className="secondary" onClick={onDismiss}>
          {building ? "Skip for now" : "Maybe later"}
        </button>
      </div>
    </div>
  );
}

const INTELLIGENCE_QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

function currentIntelligencePeriod(now = new Date()): string {
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-q${quarter}`;
}

function parseIntelligencePeriod(period?: string): { quarter: string; year: string } {
  if (!period) return { quarter: "", year: "" };
  const normalized = period.trim().toUpperCase().replace(/\s+/g, "");
  const yearFirst = normalized.match(/^(20\d{2})-?Q([1-4])$/);
  if (yearFirst) return { quarter: `Q${yearFirst[2]}`, year: yearFirst[1] };
  const quarterFirst = normalized.match(/^Q([1-4])-?(20\d{2})$/);
  if (quarterFirst) return { quarter: `Q${quarterFirst[1]}`, year: quarterFirst[2] };
  return { quarter: "", year: "" };
}

function formatIntelligencePeriod(quarter: string, year: string): string {
  const q = quarter.trim().toUpperCase().replace(/^Q/, "");
  return `${year}-q${q}`.toLowerCase();
}

function normalizeIntelligencePeriod(period?: string): string {
  const parsed = parseIntelligencePeriod(period);
  if (parsed.quarter && parsed.year) {
    return formatIntelligencePeriod(parsed.quarter, parsed.year);
  }
  return currentIntelligencePeriod();
}

function intelligencePeriodYearOptions(preferredYear?: string, now = new Date()): number[] {
  const current = now.getFullYear();
  const years = [current - 2, current - 1, current, current + 1];
  const preferred = preferredYear ? Number(preferredYear) : NaN;
  if (Number.isFinite(preferred) && !years.includes(preferred)) {
    years.push(preferred);
    years.sort((a, b) => a - b);
  }
  return years;
}

function IntelligenceLogForm({
  onLog,
  onCancel,
  submitLabel = "Log intelligence",
  defaultPeriod = currentIntelligencePeriod(),
  hideActions = false,
  hidePeriod = false,
  progressMarker,
  sourceMode = "catalog",
  existingItems = [],
  submitRef,
}: {
  onLog: (item: IntelligenceItem) => void;
  onCancel: () => void;
  submitLabel?: string;
  defaultPeriod?: string;
  hideActions?: boolean;
  hidePeriod?: boolean;
  /** Initiative progress: Baseline / Current — shown as "Mark as". */
  progressMarker?: {
    value: "baseline" | "current";
    onChange: (role: "baseline" | "current") => void;
  };
  /** catalog = pick from signal catalog; existing = pick already-logged intelligence. */
  sourceMode?: "catalog" | "existing";
  existingItems?: IntelligenceItem[];
  submitRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const [categoryKey, setCategoryKey] = useState("");
  const [signalName, setSignalName] = useState("");
  const [existingId, setExistingId] = useState("");
  const [period, setPeriod] = useState(() => normalizeIntelligencePeriod(defaultPeriod));
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  const periodParts = parseIntelligencePeriod(period);
  const periodYears = intelligencePeriodYearOptions(periodParts.year);
  const selectedExisting = existingItems.find(item => item.id === existingId) || null;

  const reset = () => {
    setCategoryKey("");
    setSignalName("");
    setExistingId("");
    setPeriod(normalizeIntelligencePeriod(defaultPeriod));
    setValue("");
    setNote("");
  };

  const canSubmit = sourceMode === "existing"
    ? Boolean(existingId && selectedExisting)
    : Boolean(
      categoryKey
      && signalName
      && value.trim()
      && (hidePeriod || (periodParts.quarter && periodParts.year)),
    );

  const doSubmit = () => {
    if (!canSubmit) return;

    if (sourceMode === "existing" && selectedExisting) {
      onLog({
        ...selectedExisting,
        highlight: value.trim() || selectedExisting.highlight,
        title: note.trim() || selectedExisting.title || selectedExisting.text,
      });
      reset();
      return;
    }

    const date = hidePeriod
      ? normalizeIntelligencePeriod(defaultPeriod)
      : formatIntelligencePeriod(periodParts.quarter, periodParts.year);
    onLog({
      id: `intel-log-${Date.now()}`,
      type: categoryKey,
      subtype: signalName,
      text: signalName,
      highlight: value.trim(),
      date,
      age: "Just now",
      title: note.trim() || `${signalName}: ${value.trim()}`,
      confidence: "Manual",
      sources: [],
      updatedAtMs: Date.now(),
    });
    reset();
  };

  if (submitRef) submitRef.current = doSubmit;

  const selectExisting = (id: string) => {
    setExistingId(id);
    const item = existingItems.find(entry => entry.id === id);
    if (!item) {
      setValue("");
      setNote("");
      return;
    }
    setValue(item.highlight || "");
    const signalLabel = item.subtype || item.text;
    const title = item.title?.trim() || "";
    const redundant = !title
      || title === signalLabel
      || title === `${signalLabel}: ${item.highlight}`
      || title === item.highlight;
    setNote(redundant ? "" : title);
  };

  return (
    <div className={`signals-log-form${progressMarker ? " signals-log-form--initiative" : ""}`}>
      <div className="signals-log-form-row">
        {progressMarker ? (
          <div className="signals-log-field signals-log-field--marker">
            <label className="signals-log-label">Mark as</label>
            <select
              className="signals-log-select"
              value={progressMarker.value}
              aria-label="Mark as baseline or current"
              onChange={event => {
                const next = event.target.value;
                if (next === "baseline" || next === "current") progressMarker.onChange(next);
              }}
            >
              <option value="baseline">Baseline</option>
              <option value="current">Current</option>
            </select>
          </div>
        ) : null}

        {sourceMode === "existing" ? (
          <div className="signals-log-field signals-log-field--signal">
            <label className="signals-log-label">Intelligence</label>
            <select
              className="signals-log-select"
              value={existingId}
              onChange={event => selectExisting(event.target.value)}
            >
              <option value="">Pick logged intelligence…</option>
              {existingItems.map(intel => (
                <option key={intel.id} value={intel.id}>
                  {(intel.subtype || intel.text)}
                  {intel.highlight ? ` · ${intel.highlight}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="signals-log-field signals-log-field--signal">
            <label className="signals-log-label">Signal</label>
            <select
              className="signals-log-select"
              value={categoryKey && signalName ? `${categoryKey}::${signalName}` : ""}
              onChange={e => {
                const val = e.target.value;
                if (!val) { setCategoryKey(""); setSignalName(""); return; }
                const [cat, sig] = val.split("::");
                setCategoryKey(cat);
                setSignalName(sig);
              }}
            >
              <option value="">Select a signal…</option>
              {SIGNAL_CATALOG.map(cat => (
                <optgroup key={cat.key} label={cat.label}>
                  {cat.signals.map(sig => (
                    <option key={sig.name} value={`${cat.key}::${sig.name}`}>
                      {sig.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        <div className="signals-log-field signals-log-field--value">
          <label className="signals-log-label">Value</label>
          <input
            className="signals-log-input"
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="e.g. 2.4M"
            readOnly={sourceMode === "existing" && !existingId}
          />
        </div>

        {!hidePeriod ? (
          <div className="signals-log-field signals-log-field--period">
            <label className="signals-log-label">Period</label>
            <div className="signals-log-period-selects">
              <select
                className="signals-log-select"
                value={periodParts.quarter}
                aria-label="Period quarter"
                onChange={e => {
                  setPeriod(formatIntelligencePeriod(
                    e.target.value,
                    periodParts.year || String(periodYears[periodYears.length - 2] ?? periodYears[0]),
                  ));
                }}
              >
                {INTELLIGENCE_QUARTERS.map(quarter => (
                  <option key={quarter} value={quarter}>{quarter}</option>
                ))}
              </select>
              <select
                className="signals-log-select"
                value={periodParts.year}
                aria-label="Period year"
                onChange={e => {
                  setPeriod(formatIntelligencePeriod(
                    periodParts.quarter || "Q1",
                    e.target.value,
                  ));
                }}
              >
                {periodYears.map(year => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </div>

      <div className="signals-log-form-row signals-log-form-row--note">
        <div className="signals-log-field signals-log-field--full">
          <label className="signals-log-label">Note <span className="signals-log-optional">(optional)</span></label>
          <input
            className="signals-log-input"
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Context or commentary…"
            readOnly={sourceMode === "existing" && !existingId}
          />
        </div>
      </div>

      {!hideActions ? (
        <div className="signals-log-form-actions">
          <button type="button" className="signals-log-cancel" onClick={() => { reset(); onCancel(); }}>
            Cancel
          </button>
          <button type="button" className="signals-log-submit" disabled={!canSubmit} onClick={doSubmit}>
            {submitLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}


type InitiativePillar = "dev" | "mkt" | "rev";
type InitiativeKind = "continuous" | "one-time";
type InitiativeStatus = "Suggested" | "Active" | "Completed";
type InitiativeProgressRole = "baseline" | "current";

/**
 * Initiative taxonomy — same pattern as Intelligence signal logging:
 * one dropdown, optgroups by track (R&D / GTM / G&A), options = work themes.
 * Pillar stays the York / scorecard join key.
 */
type InitiativeTopic = {
  id: string;
  label: string;
};

const INITIATIVE_PILLAR_ORDER: InitiativePillar[] = ["dev", "mkt", "rev"];

const INITIATIVE_TOPIC_CATALOG: Record<InitiativePillar, InitiativeTopic[]> = {
  // Broad buckets — security, infra, QA, design, etc. all fit under these.
  dev: [
    { id: "product-eng", label: "Product & engineering" },
    { id: "quality-security", label: "Quality, security & reliability" },
    { id: "roadmap", label: "Roadmap & delivery" },
  ],
  mkt: [
    { id: "acquisition", label: "Acquisition & demand" },
    { id: "sales-retention", label: "Sales & retention" },
    { id: "revops", label: "RevOps & systems" },
  ],
  rev: [
    { id: "finance-ops", label: "Finance & ops" },
    { id: "fundraising", label: "Fundraising" },
    { id: "people", label: "Hiring & team" },
  ],
};

function initiativeTaxonomyValue(pillar: InitiativePillar, topicId?: string): string {
  return `${pillar}::${normalizeInitiativeTopic(pillar, topicId)}`;
}

function parseInitiativeTaxonomyValue(value: string): { pillar: InitiativePillar; topic: string } | null {
  const [pillarRaw, topicRaw] = value.split("::");
  if (pillarRaw !== "dev" && pillarRaw !== "mkt" && pillarRaw !== "rev") return null;
  if (!topicRaw) return null;
  return { pillar: pillarRaw, topic: normalizeInitiativeTopic(pillarRaw, topicRaw) };
}

function defaultInitiativeTopic(pillar: InitiativePillar): string {
  return INITIATIVE_TOPIC_CATALOG[pillar][0]?.id ?? "product-eng";
}

function initiativeTopicLabel(pillar: InitiativePillar, topicId?: string): string {
  const topics = INITIATIVE_TOPIC_CATALOG[pillar];
  const match = topics.find(t => t.id === topicId);
  return match?.label ?? topics[0]?.label ?? "Topic";
}

function normalizeInitiativeTopic(pillar: InitiativePillar, topicId?: string): string {
  const topics = INITIATIVE_TOPIC_CATALOG[pillar];
  if (topicId && topics.some(t => t.id === topicId)) return topicId;
  return defaultInitiativeTopic(pillar);
}

type InitiativeListStatus = "Active" | "Completed";

function normalizeInitiativeStatus(status?: string): InitiativeStatus {
  const value = (status ?? "Active").trim().toLowerCase();
  if (value === "suggested" || value === "draft") return "Suggested";
  if (value === "completed" || value === "done") return "Completed";
  if (value === "paused") return "Active";
  return "Active";
}

function normalizeInitiativeListStatus(status?: string): InitiativeListStatus {
  return normalizeInitiativeStatus(status) === "Completed" ? "Completed" : "Active";
}

type InitiativeMilestone = {
  id: string;
  title: string;
  due?: string;
  done: boolean;
  /** Short annotation under the milestone — Jira/Asana checklist description pattern. */
  note?: string;
};

type InitiativeIntelligenceLink = {
  id: string;
  role: InitiativeProgressRole;
  intelligenceId: string;
  title: string;
  highlight: string;
  type: string;
  date: string;
};

type InitiativeAdvisor = {
  id: string;
  name: string;
  title?: string;
};

type InitiativeRecord = {
  id: string;
  title: string;
  description: string;
  pillar: InitiativePillar;
  /** Work theme under pillar — like Intelligence signal under category. */
  topic: string;
  kind: InitiativeKind;
  status: InitiativeStatus;
  /** @deprecated Prefer assignees — kept for summary compatibility. */
  owner: string;
  assignees: string[];
  advisors: InitiativeAdvisor[];
  due?: string;
  milestones: InitiativeMilestone[];
  intelligenceLinks: InitiativeIntelligenceLink[];
};

const DEFAULT_INITIATIVE_ASSIGNEE = "Shreya G";
const DEFAULT_INITIATIVE_OWNER = DEFAULT_INITIATIVE_ASSIGNEE;

const INITIATIVE_TEAM_SUGGESTIONS = [
  "Shreya G",
  "Matt L.",
  "Priya R.",
  "Jess K.",
  "Dana T.",
  "Jake S.",
  "Ryan K.",
  "Amy M.",
];

const INITIATIVE_ADVISOR_DIRECTORY: InitiativeAdvisor[] = [
  { id: "adv-matt", name: "Matt L.", title: "Operating partner" },
  { id: "adv-priya", name: "Priya R.", title: "Go to market advisor" },
  { id: "adv-jess", name: "Jess K.", title: "Product advisor" },
  { id: "adv-ryan", name: "Ryan K.", title: "Finance advisor" },
  { id: "adv-amy", name: "Amy M.", title: "Growth advisor" },
];

const INITIATIVE_QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

function initiativeDueYearOptions(now = new Date()): number[] {
  const start = now.getFullYear();
  return [start, start + 1, start + 2, start + 3];
}

function parseInitiativeDue(due?: string): { quarter: string; year: string } {
  if (!due) return { quarter: "", year: "" };
  const normalized = due.trim().toUpperCase().replace(/\s+/g, "");
  const yearFirst = normalized.match(/^(20\d{2})-?Q([1-4])$/);
  if (yearFirst) return { quarter: `Q${yearFirst[2]}`, year: yearFirst[1] };
  const quarterFirst = normalized.match(/^Q([1-4])-?(20\d{2})$/);
  if (quarterFirst) return { quarter: `Q${quarterFirst[1]}`, year: quarterFirst[2] };
  return { quarter: "", year: "" };
}

function formatInitiativeDue(quarter: string, year: string): string | undefined {
  if (!quarter || !year) return undefined;
  return `${year}-${quarter}`;
}

function displayInitiativeDue(due?: string): string {
  const parsed = parseInitiativeDue(due);
  if (parsed.quarter && parsed.year) return `${parsed.quarter} ${parsed.year}`;
  return due?.trim() || "—";
}

function isoToDisplayDate(value?: string): string {
  if (!value) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[2]}/${match[3]}/${match[1]}`;
}

/** Normalize stored due (ISO or MM/DD/YYYY) to `YYYY-MM-DD` for `<input type="date">`. */
function toMilestoneDateInputValue(value?: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[1]}-${match[2]}`;
}

function isValidMilestoneIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Prefer MM/DD/YYYY when persisting from a date input (ISO → display). */
function milestoneDueFromDateInput(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (isValidMilestoneIsoDate(trimmed)) return isoToDisplayDate(trimmed);
  return undefined;
}

function normalizeAssignees(owner?: string, assignees?: string[]): string[] {
  if (assignees?.length) {
    return Array.from(new Set(assignees.map(name => name.trim()).filter(Boolean)));
  }
  const raw = owner?.trim();
  if (!raw) return [DEFAULT_INITIATIVE_ASSIGNEE];
  if (raw.includes("@")) return [DEFAULT_INITIATIVE_ASSIGNEE];
  return [raw];
}

function initiativePillarLabel(pillar: InitiativePillar): string {
  return pillar === "dev" ? "R&D" : pillar === "mkt" ? "GTM" : "G&A";
}

function initiativeKindLabel(kind: InitiativeKind): string {
  return kind === "continuous" ? "Continuous" : "One-time";
}

function buildDefaultMilestones(title: string, pillar: InitiativePillar): InitiativeMilestone[] {
  const stamp = Date.now();
  const shortTitle = title.trim() || "initiative";
  return [
    { id: `ms-${stamp}-1`, title: `Define scope for ${shortTitle}`, done: false },
    { id: `ms-${stamp}-2`, title: `Execute first ${initiativePillarLabel(pillar)} workstream`, done: false },
    { id: `ms-${stamp}-3`, title: "Review progress vs target intelligence", done: false },
  ];
}

function nextProgressRole(links: InitiativeIntelligenceLink[]): InitiativeProgressRole {
  const roles: InitiativeProgressRole[] = ["baseline", "current"];
  return roles.find(role => !links.some(link => link.role === role)) ?? "current";
}

/** Checklist row with optional inline annotation (Jira/Asana: muted line under title, edit on demand). */
function InitiativeMilestoneRow({
  milestone,
  onToggle,
  onRemove,
  onNoteChange,
  onSave,
}: {
  milestone: InitiativeMilestone;
  onToggle: () => void;
  onRemove: () => void;
  onNoteChange: (note?: string) => void;
  onSave: (patch: { title: string; due?: string }) => void;
}) {
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(milestone.note ?? "");
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(milestone.title);
  const [dueDraft, setDueDraft] = useState(() => toMilestoneDateInputValue(milestone.due));
  const noteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const skipCommitRef = useRef(false);
  const noteText = milestone.note?.trim() ?? "";
  const dueLabel = milestone.due ? isoToDisplayDate(milestone.due) : "No due date";
  const canSaveEdit = Boolean(titleDraft.trim())
    && (!dueDraft || isValidMilestoneIsoDate(dueDraft));

  useEffect(() => {
    if (!noteEditing) setNoteDraft(milestone.note ?? "");
  }, [milestone.note, noteEditing]);

  useEffect(() => {
    if (!editing) {
      setTitleDraft(milestone.title);
      setDueDraft(toMilestoneDateInputValue(milestone.due));
    }
  }, [milestone.title, milestone.due, editing]);

  useEffect(() => {
    if (!noteEditing) return;
    noteInputRef.current?.focus();
    const el = noteInputRef.current;
    if (el) {
      el.selectionStart = el.value.length;
      el.selectionEnd = el.value.length;
    }
  }, [noteEditing]);

  useEffect(() => {
    if (!editing) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [editing]);

  const commitNote = () => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      return;
    }
    const next = noteDraft.trim();
    onNoteChange(next || undefined);
    setNoteEditing(false);
  };

  const cancelNote = () => {
    skipCommitRef.current = true;
    setNoteDraft(milestone.note ?? "");
    setNoteEditing(false);
  };

  const startEdit = () => {
    setTitleDraft(milestone.title);
    setDueDraft(toMilestoneDateInputValue(milestone.due));
    setEditing(true);
  };

  const commitEdit = () => {
    const nextTitle = titleDraft.trim();
    if (!nextTitle || (dueDraft && !isValidMilestoneIsoDate(dueDraft))) return;
    onSave({ title: nextTitle, due: milestoneDueFromDateInput(dueDraft) });
    setEditing(false);
  };

  const cancelEdit = () => {
    setTitleDraft(milestone.title);
    setDueDraft(toMilestoneDateInputValue(milestone.due));
    setEditing(false);
  };

  return (
    <div className={`initiative-milestone-item${milestone.done ? " is-done" : ""}${editing ? " is-editing" : ""}`}>
      <div className="initiative-milestone-row">
        <button
          type="button"
          className={`initiative-milestone-check${milestone.done ? " is-done" : ""}`}
          aria-label={milestone.done ? "Mark incomplete" : "Mark complete"}
          onClick={onToggle}
        >
          {milestone.done ? "✓" : ""}
        </button>

        {editing ? (
          <div className="initiative-milestone-edit">
            <div className="initiative-milestone-edit-fields">
              <label className="initiative-milestone-edit-field initiative-milestone-edit-field--title">
                <span>Milestone</span>
                <input
                  ref={titleInputRef}
                  className="initiative-milestone-title-input"
                  type="text"
                  value={titleDraft}
                  aria-label="Milestone title"
                  onChange={event => setTitleDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelEdit();
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      commitEdit();
                    }
                  }}
                />
              </label>
              <label className="initiative-milestone-edit-field initiative-milestone-edit-field--due">
                <span>Due date</span>
                <input
                  className="initiative-milestone-date-input"
                  type="date"
                  value={dueDraft}
                  aria-label="Milestone due date"
                  onChange={event => setDueDraft(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelEdit();
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      commitEdit();
                    }
                  }}
                />
              </label>
            </div>
            <div className="initiative-milestone-edit-actions">
              <button
                type="button"
                className="initiatives-secondary-btn initiative-card-mini-btn"
                onClick={cancelEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="initiatives-primary-btn initiative-card-mini-btn"
                disabled={!canSaveEdit}
                onClick={commitEdit}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="initiative-milestone-main">
              <button
                type="button"
                className={`initiative-milestone-title${milestone.done ? " is-done" : ""}`}
                onClick={startEdit}
              >
                {milestone.title}
              </button>
              {noteEditing ? (
                <div className="initiative-milestone-note-edit">
                  <textarea
                    ref={noteInputRef}
                    className="initiative-milestone-note-input"
                    value={noteDraft}
                    rows={2}
                    maxLength={280}
                    placeholder="Add a short note…"
                    aria-label={`Note for ${milestone.title}`}
                    onChange={event => setNoteDraft(event.target.value)}
                    onBlur={commitNote}
                    onKeyDown={event => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelNote();
                      } else if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        commitNote();
                      }
                    }}
                  />
                  <span className="initiative-milestone-note-hint">Enter to save · Esc to cancel</span>
                </div>
              ) : noteText ? (
                <button
                  type="button"
                  className="initiative-milestone-note"
                  onClick={() => setNoteEditing(true)}
                >
                  {noteText}
                </button>
              ) : (
                <button
                  type="button"
                  className="initiative-milestone-note-add"
                  onClick={() => setNoteEditing(true)}
                >
                  + Note
                </button>
              )}
            </div>
            <span className={`initiative-milestone-due${milestone.due ? "" : " is-empty"}`}>
              {dueLabel}
            </span>
            <button
              type="button"
              className="initiative-milestone-edit-btn"
              aria-label={`Edit ${milestone.title}`}
              title="Edit milestone"
              onClick={startEdit}
            >
              ✎
            </button>
            <button
              type="button"
              className="initiative-milestone-remove"
              aria-label="Remove milestone"
              onClick={onRemove}
            >
              ×
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function emptyInitiativeDraft(): InitiativeRecord {
  const assignees = [DEFAULT_INITIATIVE_ASSIGNEE];
  const pillar: InitiativePillar = "mkt";
  return {
    id: `draft-${Date.now()}`,
    title: "",
    description: "",
    pillar,
    topic: defaultInitiativeTopic(pillar),
    kind: "continuous",
    status: "Active",
    assignees,
    owner: assignees[0],
    advisors: [],
    due: undefined,
    milestones: [],
    intelligenceLinks: [],
  };
}

function InitiativeDetailDrawer({
  item,
  mode = "edit",
  availableIntelligence,
  yorkOffer = null,
  onClose,
  onPatch,
  onDelete,
  onCreate,
  onLogIntelligence,
  onStatusTabChange,
}: {
  item: InitiativeRecord;
  mode?: "edit" | "create";
  availableIntelligence: IntelligenceItem[];
  yorkOffer?: YorkServiceOffer | null;
  onClose: () => void;
  onPatch: (patch: Partial<InitiativeRecord>) => void;
  onDelete?: () => void;
  onCreate?: () => void;
  onLogIntelligence?: (item: IntelligenceItem) => void;
  onStatusTabChange: (status: InitiativeListStatus) => void;
}) {
  const isCreate = mode === "create";
  const status = normalizeInitiativeStatus(item.status);
  const assignees = normalizeAssignees(item.owner, item.assignees);
  const advisors = item.advisors ?? [];
  const milestonesDone = item.milestones.filter(m => m.done).length;
  const milestonesTotal = item.milestones.length;
  const milestonesPct = milestonesTotal > 0 ? Math.round((milestonesDone / milestonesTotal) * 100) : 0;
  const roleOrder: InitiativeProgressRole[] = ["baseline", "current"];

  const [milestoneDraft, setMilestoneDraft] = useState({ title: "", due: "" });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [intelPanel, setIntelPanel] = useState<"log" | "link" | null>(null);
  const [linkDraft, setLinkDraft] = useState<{
    role: InitiativeProgressRole;
    intelligenceId: string;
  }>({
    role: nextProgressRole(item.intelligenceLinks),
    intelligenceId: "",
  });
  const [advisorDraftId, setAdvisorDraftId] = useState("");
  const [showAdvisorForm, setShowAdvisorForm] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(isCreate);
  const [yorkNudgeHidden, setYorkNudgeHidden] = useState(
    () => !yorkOffer || isYorkOfferDismissed(yorkOffer.id),
  );

  useEffect(() => {
    setYorkNudgeHidden(!yorkOffer || isYorkOfferDismissed(yorkOffer.id));
  }, [yorkOffer?.id]);

  const availableAdvisors = INITIATIVE_ADVISOR_DIRECTORY.filter(
    advisor => !advisors.some(linked => linked.id === advisor.id),
  );

  const listStatus: InitiativeListStatus = status === "Completed" ? "Completed" : "Active";
  const canCreate = item.title.trim().length > 0;
  const handleScrimPointerDown = useScrimPointerClose(onClose);

  const setListStatus = (nextStatus: InitiativeListStatus) => {
    onPatch({ status: nextStatus });
    onStatusTabChange(nextStatus);
  };

  const attachIntelligence = (
    logged: IntelligenceItem,
    role: InitiativeProgressRole,
  ) => {
    const withoutRole = item.intelligenceLinks.filter(link => link.role !== role);
    onPatch({
      intelligenceLinks: [
        ...withoutRole,
        {
          id: `ilink-${Date.now()}`,
          role,
          intelligenceId: logged.id,
          title: logged.title || logged.text,
          highlight: logged.highlight,
          type: logged.type,
          date: logged.date,
        },
      ],
    });
  };

  const resetLinkDraft = (links: InitiativeIntelligenceLink[] = item.intelligenceLinks) => {
    setLinkDraft({
      role: nextProgressRole(links),
      intelligenceId: "",
    });
  };

  const addMilestone = () => {
    if (!milestoneDraft.title.trim()) return;
    const dueRaw = milestoneDraft.due.trim();
    if (dueRaw && !isValidMilestoneIsoDate(dueRaw)) return;
    onPatch({
      milestones: [
        ...item.milestones,
        {
          id: `ms-${Date.now()}`,
          title: milestoneDraft.title.trim(),
          due: milestoneDueFromDateInput(dueRaw),
          done: false,
        },
      ],
    });
    setMilestoneDraft({ title: "", due: "" });
    setShowMilestoneForm(false);
  };

  return (
    <div className="bench-drawer-scrim" onPointerDown={handleScrimPointerDown} role="presentation">
      <aside
        className={`bench-drawer initiative-drawer${isCreate ? " initiative-create-drawer" : ""}`}
        {...drawerPanelPointerProps()}
        role="dialog"
        aria-label={isCreate ? "New initiative" : (item.title || "Initiative")}
      >
        <header className="bench-drawer-head initiative-drawer-head">
          <div className="initiative-drawer-head-copy">
            <div className="initiative-drawer-eyebrow">Initiative</div>
            <h2 className="bench-drawer-title">
              {isCreate ? "New initiative" : (item.title || "Untitled initiative")}
            </h2>
            <p className="bench-drawer-sub">
              {isCreate
                ? "Name the work, assign owners, link advisors, and set milestones before you create."
                : (
                  <>
                    {initiativeKindLabel(item.kind)}
                    {" · "}
                    {initiativePillarLabel(item.pillar)}
                    {" · "}
                    {initiativeTopicLabel(item.pillar, item.topic)}
                    {" · "}
                    {displayInitiativeDue(item.due)}
                  </>
                )}
            </p>
          </div>
          <div className="initiative-drawer-head-actions">
            <div className="initiative-drawer-status" role="group" aria-label="Status">
              <button
                type="button"
                className={`initiative-drawer-status-btn${listStatus === "Active" ? " is-active" : ""}`}
                aria-pressed={listStatus === "Active"}
                onClick={() => setListStatus("Active")}
              >
                Active
              </button>
              <button
                type="button"
                className={`initiative-drawer-status-btn${listStatus === "Completed" ? " is-active" : ""}`}
                aria-pressed={listStatus === "Completed"}
                onClick={() => setListStatus("Completed")}
              >
                Completed
              </button>
            </div>
            {!isCreate && onDelete ? (
              <button
                type="button"
                className="initiative-drawer-delete"
                onClick={onDelete}
              >
                Delete
              </button>
            ) : null}
            <button type="button" className="bench-drawer-x" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </header>

        <div className="initiative-drawer-progress">
          <div className="initiative-drawer-progress-meta">
            <span>Milestone progress</span>
            <strong>
              {milestonesTotal === 0
                ? "No milestones yet"
                : `${milestonesDone} of ${milestonesTotal} done`}
            </strong>
          </div>
          <div
            className="initiative-drawer-progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={milestonesPct}
            aria-label="Milestone completion"
          >
            <div className="initiative-drawer-progress-bar" style={{ width: `${milestonesPct}%` }} />
          </div>
        </div>

        <div className="bench-drawer-body initiative-drawer-body">
          <div className="initiative-card-section initiative-card-section--details">
            <div className="initiative-card-section-head">
              <span className="initiative-card-section-label">Details</span>
              {!isCreate ? (
                <button
                  type="button"
                  className="initiative-edit-btn"
                  onClick={() => setIsEditingDetails(previous => !previous)}
                >
                  {isEditingDetails ? "Done" : "Edit details"}
                </button>
              ) : null}
            </div>

            {isEditingDetails ? (
              <div className="initiative-form-card initiative-edit-form">
                <div className="initiative-form-row">
                  <input
                    value={item.title}
                    onChange={event => onPatch({ title: event.target.value })}
                    placeholder="Initiative name"
                    autoFocus={isCreate}
                  />
                  <select
                    value={item.kind}
                    onChange={event => onPatch({ kind: event.target.value as InitiativeKind })}
                    aria-label="Kind"
                  >
                    <option value="continuous">Continuous</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
                <div className="initiative-form-row initiative-form-row--taxonomy">
                  <label className="initiative-taxonomy-field">
                    <span>Category</span>
                    <select
                      value={initiativeTaxonomyValue(item.pillar, item.topic)}
                      onChange={event => {
                        const parsed = parseInitiativeTaxonomyValue(event.target.value);
                        if (!parsed) return;
                        onPatch({ pillar: parsed.pillar, topic: parsed.topic });
                      }}
                    >
                      {INITIATIVE_PILLAR_ORDER.map(pillar => (
                        <optgroup key={pillar} label={initiativePillarLabel(pillar)}>
                          {INITIATIVE_TOPIC_CATALOG[pillar].map(topic => (
                            <option key={topic.id} value={`${pillar}::${topic.id}`}>
                              {topic.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </div>
                <textarea
                  value={item.description}
                  onChange={event => onPatch({ description: event.target.value })}
                  placeholder="What's the goal and why now? (optional)"
                />
                <div className="initiative-form-row initiative-form-row--owner">
                  <InitiativeAssigneesField
                    assignees={assignees}
                    onChange={next => onPatch({ assignees: next })}
                  />
                  <InitiativeDueQuarterField
                    due={item.due}
                    onChange={next => onPatch({ due: next })}
                  />
                </div>
              </div>
            ) : (
              <div className="initiative-view-details">
                {item.description.trim() ? (
                  <p className="initiative-card-description">{item.description}</p>
                ) : (
                  <p className="initiative-card-section-empty">No description yet.</p>
                )}
                <dl className="initiative-view-meta">
                  <div>
                    <dt>Kind</dt>
                    <dd>{initiativeKindLabel(item.kind)}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>
                      {initiativePillarLabel(item.pillar)}
                      {" · "}
                      {initiativeTopicLabel(item.pillar, item.topic)}
                    </dd>
                  </div>
                  <div>
                    <dt>Owner</dt>
                    <dd>{assignees.length ? assignees.join(", ") : "—"}</dd>
                  </div>
                  <div>
                    <dt>Target</dt>
                    <dd>{displayInitiativeDue(item.due)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          <div className="initiative-card-section">
            <div className="initiative-card-section-head">
              <span className="initiative-card-section-label">Milestones</span>
              <div className="initiative-card-section-actions">
                {showMilestoneForm ? (
                  <button
                    type="button"
                    className="initiatives-secondary-btn initiative-card-mini-btn"
                    onClick={() => {
                      setShowMilestoneForm(false);
                      setMilestoneDraft({ title: "", due: "" });
                    }}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    className="initiatives-secondary-btn initiative-card-mini-btn"
                    onClick={() => setShowMilestoneForm(true)}
                  >
                    + Add milestone
                  </button>
                )}
              </div>
            </div>
            <div className="initiative-milestones">
              {item.milestones.length === 0 ? (
                <p className="initiative-card-section-empty">No milestones yet.</p>
              ) : (
                item.milestones.map(milestone => (
                  <InitiativeMilestoneRow
                    key={milestone.id}
                    milestone={milestone}
                    onToggle={() => onPatch({
                      milestones: item.milestones.map(entry => (
                        entry.id === milestone.id ? { ...entry, done: !entry.done } : entry
                      )),
                    })}
                    onRemove={() => onPatch({
                      milestones: item.milestones.filter(entry => entry.id !== milestone.id),
                    })}
                    onSave={({ title, due }) => onPatch({
                      milestones: item.milestones.map(entry => (
                        entry.id === milestone.id ? { ...entry, title, due } : entry
                      )),
                    })}
                    onNoteChange={note => onPatch({
                      milestones: item.milestones.map(entry => (
                        entry.id === milestone.id ? { ...entry, note } : entry
                      )),
                    })}
                  />
                ))
              )}
            </div>
            {showMilestoneForm ? (
              <div className="initiative-milestone-form">
                <div className="initiative-milestone-form-fields">
                  <label className="initiative-milestone-form-field initiative-milestone-form-field--title">
                    <span>Milestone</span>
                    <input
                      value={milestoneDraft.title}
                      onChange={event => setMilestoneDraft(previous => ({
                        ...previous,
                        title: event.target.value,
                      }))}
                      placeholder="What needs to get done?"
                    />
                  </label>
                  <label className="initiative-milestone-form-field initiative-milestone-form-field--due">
                    <span>Due date</span>
                    <input
                      type="date"
                      value={milestoneDraft.due}
                      onChange={event => setMilestoneDraft(previous => ({
                        ...previous,
                        due: event.target.value,
                      }))}
                      aria-label="Milestone due date"
                    />
                  </label>
                </div>
                <div className="initiative-milestone-form-actions">
                  <button
                    type="button"
                    className="initiatives-secondary-btn initiative-card-mini-btn"
                    onClick={() => {
                      setShowMilestoneForm(false);
                      setMilestoneDraft({ title: "", due: "" });
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="initiatives-primary-btn initiative-card-mini-btn"
                    onClick={addMilestone}
                    disabled={
                      !milestoneDraft.title.trim()
                      || Boolean(milestoneDraft.due && !isValidMilestoneIsoDate(milestoneDraft.due))
                    }
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {!isCreate && yorkOffer && !yorkNudgeHidden ? (
            <div className="initiative-card-section initiative-york-help-wrap">
              <YorkPartnerNudge
                offer={yorkOffer}
                variant="initiative"
                firstName="Shreya"
                initiativeTitle={item.title}
                topicLabel={initiativeTopicLabel(item.pillar, item.topic)}
                milestones={item.milestones.map(milestone => ({ title: milestone.title }))}
                cta="Talk to York IE"
                onDismissed={() => setYorkNudgeHidden(true)}
              />
            </div>
          ) : null}

          <div className="initiative-card-section">
            <div className="initiative-card-section-head">
              <span className="initiative-card-section-label">Advisors</span>
              <div className="initiative-card-section-actions">
                {showAdvisorForm ? (
                  <button
                    type="button"
                    className="initiatives-secondary-btn initiative-card-mini-btn"
                    onClick={() => {
                      setShowAdvisorForm(false);
                      setAdvisorDraftId("");
                    }}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    className="initiatives-secondary-btn initiative-card-mini-btn"
                    onClick={() => setShowAdvisorForm(true)}
                  >
                    + Link advisor
                  </button>
                )}
              </div>
            </div>
            <p className="initiative-card-section-hint">
              Link an advisor so this work has a named coach — someone who can challenge the plan, unblock milestones, and keep you honest when progress stalls.
            </p>
            {advisors.length > 0 ? (
              <div className="initiative-advisor-list">
                {advisors.map(advisor => (
                  <div key={advisor.id} className="initiative-advisor-row">
                    <div className="initiative-advisor-copy">
                      <strong>{advisor.name}</strong>
                      {advisor.title ? <em>{advisor.title}</em> : null}
                    </div>
                    <button
                      type="button"
                      className="initiative-milestone-remove"
                      aria-label={`Remove ${advisor.name}`}
                      onClick={() => onPatch({
                        advisors: advisors.filter(entry => entry.id !== advisor.id),
                      })}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="initiative-card-section-empty">No advisors linked yet.</p>
            )}
            {showAdvisorForm ? (
              <div className="initiative-link-advisor-row">
                <select
                  value={advisorDraftId}
                  aria-label="Advisor"
                  onChange={event => setAdvisorDraftId(event.target.value)}
                >
                  <option value="">Pick an advisor…</option>
                  {availableAdvisors.map(advisor => (
                    <option key={advisor.id} value={advisor.id}>
                      {advisor.name}{advisor.title ? ` · ${advisor.title}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="initiatives-primary-btn"
                  disabled={!advisorDraftId}
                  onClick={() => {
                    const selected = INITIATIVE_ADVISOR_DIRECTORY.find(advisor => advisor.id === advisorDraftId);
                    if (!selected) return;
                    onPatch({ advisors: [...advisors, selected] });
                    setAdvisorDraftId("");
                    setShowAdvisorForm(false);
                  }}
                >
                  Link
                </button>
              </div>
            ) : null}
          </div>

          <div className="initiative-card-section">
            <div className="initiative-card-section-head">
              <span className="initiative-card-section-label">Progress — baseline · current</span>
              <div className="initiative-card-section-actions">
                <button
                  type="button"
                  className="initiatives-secondary-btn initiative-card-mini-btn"
                  onClick={() => {
                    if (intelPanel === "log") {
                      setIntelPanel(null);
                      return;
                    }
                    resetLinkDraft();
                    setIntelPanel("log");
                  }}
                >
                  + Log intelligence
                </button>
                <button
                  type="button"
                  className="initiatives-secondary-btn initiative-card-mini-btn"
                  onClick={() => {
                    if (intelPanel === "link") {
                      setIntelPanel(null);
                      return;
                    }
                    resetLinkDraft();
                    setIntelPanel("link");
                  }}
                >
                  + Link intelligence
                </button>
              </div>
            </div>

            {item.intelligenceLinks.some(link => link.role === "baseline" || link.role === "current") ? (
              <div className="initiative-intel-links">
                {roleOrder.map(role => {
                  const link = item.intelligenceLinks.find(entry => entry.role === role);
                  if (!link) return null;
                  return (
                    <div key={link.id} className="initiative-intel-link-row">
                      <span className="initiative-intel-role">{role}</span>
                      <div className="initiative-intel-link-copy">
                        <strong>{link.title}</strong>
                        <em>
                          {link.type}
                          {link.highlight ? ` · ${link.highlight}` : ""}
                        </em>
                      </div>
                      <button
                        type="button"
                        className="initiative-milestone-remove"
                        aria-label={`Remove ${role} intelligence`}
                        onClick={() => onPatch({
                          intelligenceLinks: item.intelligenceLinks.filter(entry => entry.id !== link.id),
                        })}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="initiative-card-progress-empty">
                No intelligence tracked yet. Log or link a baseline and a current reading so progress can be narrated from the timeline.
              </div>
            )}

            {intelPanel === "log" ? (
              <IntelligenceLogForm
                hidePeriod
                progressMarker={{
                  value: linkDraft.role,
                  onChange: role => setLinkDraft(previous => ({ ...previous, role })),
                }}
                submitLabel="Log intelligence"
                onCancel={() => setIntelPanel(null)}
                onLog={logged => {
                  onLogIntelligence?.(logged);
                  attachIntelligence(logged, linkDraft.role);
                  setIntelPanel(null);
                  resetLinkDraft();
                }}
              />
            ) : null}

            {intelPanel === "link" ? (
              <IntelligenceLogForm
                hidePeriod
                sourceMode="existing"
                existingItems={availableIntelligence}
                progressMarker={{
                  value: linkDraft.role,
                  onChange: role => setLinkDraft(previous => ({ ...previous, role })),
                }}
                submitLabel="Link intelligence"
                onCancel={() => setIntelPanel(null)}
                onLog={logged => {
                  attachIntelligence(logged, linkDraft.role);
                  setIntelPanel(null);
                  resetLinkDraft();
                }}
              />
            ) : null}
          </div>
        </div>

        <footer className="bench-drawer-actions">
          <button type="button" className="bench-drawer-cancel" onClick={onClose}>
            {isCreate ? "Cancel" : "Close"}
          </button>
          {isCreate ? (
            <button
              type="button"
              className="bench-drawer-save"
              onClick={onCreate}
              disabled={!canCreate}
            >
              Create initiative
            </button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}

function createInitiativeRecord(input: {
  id?: string;
  title: string;
  description?: string;
  pillar?: InitiativePillar;
  topic?: string;
  kind?: InitiativeKind;
  status?: InitiativeStatus;
  owner?: string;
  assignees?: string[];
  advisors?: InitiativeAdvisor[];
  due?: string;
}): InitiativeRecord {
  const title = input.title.trim();
  const pillar = input.pillar ?? "mkt";
  const assignees = normalizeAssignees(input.owner, input.assignees);
  return {
    id: input.id ?? `init-${Date.now()}`,
    title,
    description: input.description?.trim() ?? "",
    pillar,
    topic: normalizeInitiativeTopic(pillar, input.topic),
    kind: input.kind ?? "continuous",
    status: normalizeInitiativeStatus(input.status ?? "Active"),
    assignees,
    owner: assignees[0] ?? DEFAULT_INITIATIVE_ASSIGNEE,
    advisors: input.advisors ?? [],
    due: input.due?.trim() || undefined,
    milestones: buildDefaultMilestones(title, pillar),
    intelligenceLinks: [],
  };
}

function buildDefaultRecommendedInitiatives(): InitiativeRecord[] {
  return [
    createInitiativeRecord({
      id: "rec-gtm-icp",
      title: "Tighten ICP messaging for enterprise deals",
      description: "Rewrite homepage and outbound copy around the highest-converting ICP segment from recent intel.",
      pillar: "mkt",
      topic: "icp",
      status: "Suggested",
    }),
    createInitiativeRecord({
      id: "rec-dev-scale",
      title: "Run a scale-readiness checklist",
      description: "Audit ship cadence, critical debt, and on-call coverage before the next hiring wave.",
      pillar: "dev",
      topic: "planning",
      status: "Suggested",
    }),
    createInitiativeRecord({
      id: "rec-rev-runway",
      title: "Build a 6-month cash runway plan",
      description: "Model burn scenarios and decide which G&A levers to pull if pipeline slips a quarter.",
      pillar: "rev",
      topic: "runway",
      status: "Suggested",
    }),
  ];
}

/** Active or completed initiatives only — excludes suggested recommendations. */
function countWorkspaceInitiatives(items: InitiativeRecord[]): number {
  return items.filter(item => normalizeInitiativeStatus(item.status) !== "Suggested").length;
}

function TabCount({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span className="tab-count" aria-label={`${count} ${label}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function InitiativeAssigneesField({
  assignees,
  onChange,
}: {
  assignees: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const suggestions = INITIATIVE_TEAM_SUGGESTIONS.filter(
    name => !assignees.some(a => a.toLowerCase() === name.toLowerCase())
      && name.toLowerCase().includes(draft.trim().toLowerCase()),
  ).slice(0, 6);

  const commitName = (raw: string) => {
    const name = raw.trim().replace(/,$/, "");
    if (!name) return;
    if (assignees.some(a => a.toLowerCase() === name.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...assignees, name]);
    setDraft("");
  };

  return (
    <div className="initiative-assignees-field">
      <span className="initiative-field-label">Owner</span>
      <div className="initiative-assignees-box">
        {assignees.map(name => (
          <span key={name} className="initiative-assignee-chip">
            {name}
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={() => onChange(assignees.filter(entry => entry !== name))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitName(draft);
            } else if (event.key === "Backspace" && !draft && assignees.length) {
              onChange(assignees.slice(0, -1));
            }
          }}
          onBlur={() => { if (draft.trim()) commitName(draft); }}
          placeholder={assignees.length ? "Add another name" : "Add a name"}
          aria-label="Owner"
        />
      </div>
      {draft.trim() && suggestions.length > 0 ? (
        <div className="initiative-assignee-suggestions" role="listbox">
          {suggestions.map(name => (
            <button key={name} type="button" onMouseDown={event => event.preventDefault()} onClick={() => commitName(name)}>
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InitiativeDueQuarterField({
  due,
  onChange,
}: {
  due?: string;
  onChange: (next?: string) => void;
}) {
  const parsed = parseInitiativeDue(due);
  const years = initiativeDueYearOptions();

  return (
    <div className="initiative-due-field">
      <span className="initiative-field-label">Due</span>
      <div className="initiative-due-selects">
        <select
          value={parsed.quarter}
          aria-label="Due quarter"
          onChange={event => onChange(formatInitiativeDue(event.target.value, parsed.year || String(years[0])))}
        >
          <option value="">Quarter</option>
          {INITIATIVE_QUARTERS.map(quarter => (
            <option key={quarter} value={quarter}>{quarter}</option>
          ))}
        </select>
        <select
          value={parsed.year}
          aria-label="Due year"
          onChange={event => onChange(formatInitiativeDue(parsed.quarter || "Q1", event.target.value))}
        >
          <option value="">Year</option>
          {years.map(year => (
            <option key={year} value={String(year)}>{year}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function InitiativesPage({
  investorMode = false,
  items = [],
  focusInitiativeId = null,
  availableIntelligence = [],
  yorkAnswers = null,
  onCreate,
  onUpdate,
  onDelete,
  onLogIntelligence,
  onClearFocus,
}: {
  investorMode?: boolean;
  items?: InitiativeRecord[];
  focusInitiativeId?: string | null;
  availableIntelligence?: IntelligenceItem[];
  yorkAnswers?: Record<string, string | undefined | null> | null;
  onCreate?: (initiative: InitiativeRecord) => void;
  onUpdate?: (initiative: InitiativeRecord) => void;
  onDelete?: (id: string) => void;
  onLogIntelligence?: (item: IntelligenceItem) => void;
  onClearFocus?: () => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [statusTab, setStatusTab] = useState<InitiativeListStatus>("Active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestedOpen, setSuggestedOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<InitiativeRecord | null>(null);

  // One-shot focus from toasts / "View initiative" — consume so tab revisits don't reopen the drawer.
  useEffect(() => {
    if (!focusInitiativeId) return;
    const focused = items.find(item => item.id === focusInitiativeId);
    if (!focused || normalizeInitiativeStatus(focused.status) === "Suggested") {
      onClearFocus?.();
      return;
    }
    setStatusTab(normalizeInitiativeListStatus(focused.status));
    setSelectedId(focusInitiativeId);
    onClearFocus?.();
  }, [focusInitiativeId, items, onClearFocus]);

  const statusCounts = useMemo(() => {
    const counts: Record<InitiativeListStatus, number> = {
      Active: 0,
      Completed: 0,
    };
    items.forEach(item => {
      const status = normalizeInitiativeStatus(item.status);
      if (status === "Suggested") return;
      counts[status] += 1;
    });
    return counts;
  }, [items]);

  const recommendedItems = useMemo(
    () => items.filter(item => normalizeInitiativeStatus(item.status) === "Suggested"),
    [items],
  );

  const visibleItems = useMemo(
    () => items.filter(item => (
      normalizeInitiativeStatus(item.status) !== "Suggested"
      && normalizeInitiativeListStatus(item.status) === statusTab
    )),
    [items, statusTab],
  );

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    const found = items.find(item => item.id === selectedId);
    if (!found || normalizeInitiativeStatus(found.status) === "Suggested") return null;
    return found;
  }, [items, selectedId]);

  const resetCreateForm = () => {
    setCreateDraft(null);
    setIsCreating(false);
  };

  const openCreateForm = () => {
    setSuggestedOpen(false);
    setSelectedId(null);
    setCreateDraft(emptyInitiativeDraft());
    setIsCreating(true);
  };

  const patchCreateDraft = (patch: Partial<InitiativeRecord>) => {
    setCreateDraft(previous => {
      if (!previous) return previous;
      const nextAssignees = normalizeAssignees(
        patch.owner ?? previous.owner,
        patch.assignees ?? previous.assignees,
      );
      const pillar = patch.pillar ?? previous.pillar;
      const topic = normalizeInitiativeTopic(
        pillar,
        patch.topic ?? (patch.pillar && patch.pillar !== previous.pillar ? undefined : previous.topic),
      );
      return {
        ...previous,
        ...patch,
        pillar,
        topic,
        assignees: nextAssignees,
        owner: nextAssignees[0] ?? DEFAULT_INITIATIVE_ASSIGNEE,
        advisors: patch.advisors ?? previous.advisors ?? [],
      };
    });
  };

  const handleCreate = () => {
    if (!createDraft?.title.trim()) return;
    const title = createDraft.title.trim();
    const pillar = createDraft.pillar;
    const topic = normalizeInitiativeTopic(pillar, createDraft.topic);
    const milestones = createDraft.milestones.length > 0
      ? createDraft.milestones
      : buildDefaultMilestones(title, pillar);
    const created: InitiativeRecord = {
      ...createDraft,
      id: `init-${Date.now()}`,
      title,
      description: createDraft.description.trim(),
      pillar,
      topic,
      status: normalizeInitiativeStatus(createDraft.status),
      milestones,
      due: createDraft.due?.trim() || undefined,
    };
    onCreate?.(created);
    setStatusTab(normalizeInitiativeListStatus(created.status));
    setSelectedId(created.id);
    resetCreateForm();
  };

  const patchInitiative = (id: string, patch: Partial<InitiativeRecord>) => {
    const current = items.find(item => item.id === id);
    if (!current || !onUpdate) return;
    const nextAssignees = normalizeAssignees(
      patch.owner ?? current.owner,
      patch.assignees ?? current.assignees,
    );
    const pillar = patch.pillar ?? current.pillar;
    const topic = normalizeInitiativeTopic(
      pillar,
      patch.topic ?? (patch.pillar && patch.pillar !== current.pillar ? undefined : current.topic),
    );
    onUpdate({
      ...current,
      ...patch,
      pillar,
      topic,
      assignees: nextAssignees,
      owner: nextAssignees[0] ?? DEFAULT_INITIATIVE_ASSIGNEE,
      advisors: patch.advisors ?? current.advisors ?? [],
    });
  };

  const acceptRecommendation = (item: InitiativeRecord) => {
    patchInitiative(item.id, { status: "Active" });
    setStatusTab("Active");
    setSuggestedOpen(false);
    resetCreateForm();
    setSelectedId(item.id);
  };

  const dismissRecommendation = (id: string) => {
    onDelete?.(id);
    if (selectedId === id) setSelectedId(null);
  };

  const closeDrawer = () => {
    setSelectedId(null);
    onClearFocus?.();
  };
  const showSuggested = !investorMode && recommendedItems.length > 0;

  return (
    <section className="initiatives-page">
      <div className="initiatives-head">
        <div>
          <h2>Initiatives</h2>
          <p>
            {investorMode
              ? "Your private initiatives on this company — not visible to the founding team or other investors."
              : "Continuous + one-time work the operating team is running with this company."}
          </p>
        </div>
        <div className="initiatives-head-actions">
          {showSuggested ? (
            <button
              type="button"
              className="initiatives-secondary-btn"
              onClick={() => {
                resetCreateForm();
                setSelectedId(null);
                setSuggestedOpen(true);
              }}
            >
              Suggested <em>{recommendedItems.length}</em>
            </button>
          ) : null}
          <button
            type="button"
            className="initiatives-primary-btn"
            onClick={openCreateForm}
          >
            + New initiative
          </button>
        </div>
      </div>

      <div className="initiatives-status-toggle" role="tablist" aria-label="Initiative status">
        {(["Active", "Completed"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={statusTab === tab}
            className={`initiatives-status-toggle-btn${statusTab === tab ? " is-active" : ""}`}
            onClick={() => {
              setStatusTab(tab);
              resetCreateForm();
            }}
          >
            {tab}
            <em>{statusCounts[tab]}</em>
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <div className="initiatives-empty-card">
          <strong>{statusTab === "Completed" ? "No completed initiatives" : "No active initiatives"}</strong>
          <p>
            {statusTab === "Completed"
              ? "Mark an active initiative Completed when the work ships."
              : showSuggested
                ? "Start from a scorecard suggestion, or create one with + New initiative."
                : investorMode
                  ? <>Create diligence or value-creation work with <span>+ New initiative</span> — kept private to your account.</>
                  : <>Start one with <span>+ New initiative</span>, or add ideas from a track detail page.</>}
          </p>
          {statusTab === "Active" && showSuggested ? (
            <button
              type="button"
              className="initiatives-primary-btn"
              onClick={() => {
                resetCreateForm();
                setSuggestedOpen(true);
              }}
            >
              View suggested · {recommendedItems.length}
            </button>
          ) : null}
        </div>
      ) : null}

      {visibleItems.length > 0 ? (
        <div className="initiatives-list">
          {visibleItems.map(item => {
            const status = normalizeInitiativeStatus(item.status);
            const selected = selectedId === item.id;
            const assignees = normalizeAssignees(item.owner, item.assignees);
            const milestonesDone = item.milestones.filter(m => m.done).length;
            const milestonesTotal = item.milestones.length;
            return (
              <article key={item.id} className={`initiative-card${selected ? " is-selected" : ""}`}>
                <button
                  type="button"
                  className="initiative-card-summary"
                  onClick={() => {
                    resetCreateForm();
                    setSuggestedOpen(false);
                    setSelectedId(item.id);
                  }}
                  aria-pressed={selected}
                >
                  <div className="initiative-card-summary-main">
                    <strong>{item.title}</strong>
                    <div className="initiative-card-meta">
                      <span className={`initiative-status initiative-status--${status.toLowerCase()}`}>
                        {status}
                      </span>
                      <em>
                        {initiativeKindLabel(item.kind)}
                        {" · "}
                        {initiativePillarLabel(item.pillar)}
                        {" · "}
                        {initiativeTopicLabel(item.pillar, item.topic)}
                        {" · "}
                        {assignees.join(", ")}
                        {milestonesTotal > 0
                          ? ` · ${milestonesDone}/${milestonesTotal} milestones`
                          : ""}
                      </em>
                    </div>
                  </div>
                  <span className="initiative-card-open-hint" aria-hidden="true">Open</span>
                </button>
              </article>
            );
          })}
        </div>
      ) : null}

      {isCreating && createDraft ? (
        <InitiativeDetailDrawer
          key={createDraft.id}
          mode="create"
          item={createDraft}
          availableIntelligence={availableIntelligence}
          onClose={resetCreateForm}
          onPatch={patchCreateDraft}
          onCreate={handleCreate}
          onLogIntelligence={onLogIntelligence}
          onStatusTabChange={setStatusTab}
        />
      ) : null}

      {suggestedOpen && showSuggested ? (
        <div className="bench-drawer-scrim" onClick={() => setSuggestedOpen(false)}>
          <aside
            className="bench-drawer initiative-suggested-drawer"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-label="Suggested initiatives"
          >
            <header className="bench-drawer-head">
              <div>
                <div className="initiative-drawer-eyebrow">From your scorecard</div>
                <h2 className="bench-drawer-title">Suggested</h2>
                <p className="bench-drawer-sub">
                  Add one to Active to track it, or dismiss ideas you don’t need.
                </p>
              </div>
              <button
                type="button"
                className="bench-drawer-x"
                onClick={() => setSuggestedOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </header>
            <div className="bench-drawer-body initiative-suggested-drawer-body">
              <ul className="initiatives-suggested-list">
                {recommendedItems.map(item => (
                  <li key={item.id} className="initiatives-suggested-row">
                    <div className="initiatives-suggested-copy">
                      <strong>{item.title}</strong>
                      <span>
                        {initiativePillarLabel(item.pillar)}
                        {" · "}
                        {initiativeTopicLabel(item.pillar, item.topic)}
                        {item.description.trim() ? ` · ${item.description}` : ""}
                      </span>
                    </div>
                    <div className="initiatives-suggested-actions">
                      <button
                        type="button"
                        className="initiatives-primary-btn"
                        onClick={() => acceptRecommendation(item)}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="initiatives-secondary-btn"
                        onClick={() => dismissRecommendation(item.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <footer className="bench-drawer-actions">
              <button type="button" className="bench-drawer-cancel" onClick={() => setSuggestedOpen(false)}>
                Close
              </button>
            </footer>
          </aside>
        </div>
      ) : null}

      {selectedItem ? (
        <InitiativeDetailDrawer
          key={selectedItem.id}
          item={selectedItem}
          availableIntelligence={availableIntelligence}
          yorkOffer={resolveYorkOfferForInitiative(selectedItem, yorkAnswers)}
          onClose={closeDrawer}
          onPatch={patch => patchInitiative(selectedItem.id, patch)}
          onDelete={() => {
            onDelete?.(selectedItem.id);
            closeDrawer();
          }}
          onLogIntelligence={onLogIntelligence}
          onStatusTabChange={setStatusTab}
        />
      ) : null}
    </section>
  );
}

type ThirdPartyOverviewCompany = {
  id: string;
  displayName: string;
  domain: string;
  headquarters: string;
  employees: string;
  linkedin: string;
  meta: string;
};

function CompanyBrandMark({
  company,
  className = "company-logo",
  size = 48,
}: {
  company: {
    id?: string;
    displayName: string;
    domain?: string;
    logo?: string;
    logoBg?: string;
    logoUrl?: string;
  };
  className?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const logoUrl = resolveCompanyLogoUrl({
    id: company.id,
    displayName: company.displayName,
    domain: company.domain || "",
    logoUrl: company.logoUrl,
  });
  const fallback = getCompanyLogoColors(company.displayName || company.logo);

  if (!failed) {
    return (
      <div className={`${className} company-logo--photo`} aria-hidden="true">
        <img
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      data-letter={fallback.letter.toLowerCase()}
      style={{ background: fallback.bg, color: fallback.fg }}
      aria-hidden="true"
    >
      {fallback.letter}
    </div>
  );
}

function FundingCumulativeSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 120;
  const height = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="overview-funding-spark" aria-hidden="true">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke="var(--fuel-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
      <em>Cumulative raised</em>
    </div>
  );
}

function resolveThirdPartyOverview(
  company: ThirdPartyOverviewCompany,
): ThirdPartyOverviewRecord | null {
  return getThirdPartyOverview(company.id);
}

function CrunchbasePublicProfileNotice({
  companyKey,
  onDismissed,
}: {
  companyKey: string;
  onDismissed?: () => void;
}) {
  const [dismissed, setDismissed] = useState(() => isCrunchbaseProfileNoticeDismissed(companyKey));

  useEffect(() => {
    setDismissed(isCrunchbaseProfileNoticeDismissed(companyKey));
  }, [companyKey]);

  if (dismissed) return null;

  return (
    <div className="crunchbase-profile-notice" role="status">
      <div className="crunchbase-profile-notice-copy">
        <span>Public company data</span>
        <strong>
          This profile is derived from Crunchbase data. You can view it as public information, but you can&apos;t edit this data here.
        </strong>
      </div>
      <button
        type="button"
        className="crunchbase-profile-notice-dismiss"
        aria-label="Dismiss Crunchbase notice"
        onClick={() => {
          dismissCrunchbaseProfileNotice(companyKey);
          setDismissed(true);
          onDismissed?.();
        }}
      >
        ×
      </button>
    </div>
  );
}

function ThirdPartyCompanyOverview({
  company,
  onOpenInitiatives,
  showCrunchbaseNotice = false,
}: {
  company: ThirdPartyOverviewCompany;
  onOpenInitiatives?: () => void;
  showCrunchbaseNotice?: boolean;
}) {
  const record = resolveThirdPartyOverview(company);
  const headquarters = record?.headquarters || company.headquarters || "—";
  const employees = record?.employees || company.employees || "—";
  const sectors = record?.sectors?.length
    ? record.sectors
    : company.meta.split("·").map(part => part.trim()).filter(Boolean);
  const keywords = record?.keywords ?? [];
  const keywordTotal = record?.keywordTotal ?? keywords.length;
  const keywordExtra = Math.max(keywordTotal - keywords.length, 0);
  const rounds = record?.rounds ?? [];
  const news = record?.news ?? [];
  const similarCompanies = record?.similarCompanies ?? [];
  const dataSources = record?.dataSources ?? [
    { name: "fuel-data", detail: "external company profile" },
  ];
  const publicLinks = record?.publicLinks ?? [];
  const advisorPoolTotal = record?.advisorPoolTotal ?? 0;

  const stats = [
    { label: "Total funding", value: record?.totalFunding ?? null, hint: null as string | null },
    { label: "Funding rounds", value: record?.fundingRoundsCount ?? null, hint: null },
    { label: "Last round", value: record?.lastRound ?? null, hint: record?.lastRoundHint ?? null },
    { label: "Founded", value: record?.founded ?? null, hint: record?.foundedHint ?? null },
  ];

  return (
    <section className="overview-tour-page third-party-overview" aria-label={`${company.displayName} overview`}>
      {showCrunchbaseNotice ? (
        <CrunchbasePublicProfileNotice companyKey={company.id} />
      ) : null}
      <div className="overview-metric-grid">
        {stats.map(stat => (
          <div className={`overview-metric-card${!stat.value ? " is-empty" : ""}`} key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value ?? "—"}</strong>
            {stat.hint ? <em>{stat.hint}</em> : !stat.value ? <em>Not on record</em> : null}
          </div>
        ))}
      </div>

      <div className="overview-layout-grid">
        <div className="overview-main-column">
          <div className="overview-panel">
            <span>About</span>
            {record?.about ? (
              <p>{record.about}</p>
            ) : (
              <p className="overview-empty-copy">No company description on record.</p>
            )}
          </div>

          <div className="overview-panel">
            <span>Company Details</span>
            <div className="overview-detail-list">
              <div className="overview-detail-row">
                <em>Headquarters</em>
                <strong>{headquarters}</strong>
              </div>
              <div className="overview-detail-row">
                <em>Employees</em>
                <strong>{employees}</strong>
              </div>
              <div className="overview-detail-row">
                <em>Founded</em>
                <strong>
                  {record?.founded
                    ? `${record.founded}${record.foundedHint ? ` · ${record.foundedHint}` : ""}`
                    : "—"}
                </strong>
              </div>
              <div className="overview-detail-row overview-detail-row-tags">
                <em>Sectors</em>
                <div className="overview-tag-list">
                  {sectors.length
                    ? sectors.map(tag => <span className="overview-tag" key={tag}>{tag}</span>)
                    : <strong>—</strong>}
                </div>
              </div>
              <div className="overview-detail-row overview-detail-row-tags">
                <em>Keywords{keywordTotal ? ` (${keywordTotal})` : ""}</em>
                <div className="overview-tag-list">
                  {keywords.length ? (
                    <>
                      {keywords.map(tag => <span className="overview-tag" key={tag}>{tag}</span>)}
                      {keywordExtra > 0 ? (
                        <span className="overview-tag overview-tag-more">+{keywordExtra} more</span>
                      ) : null}
                    </>
                  ) : (
                    <strong>—</strong>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="overview-panel">
            <div className="overview-panel-head overview-panel-head-funding">
              <span>Funding Rounds</span>
              {record?.cumulativeRaisedMm?.length ? (
                <FundingCumulativeSparkline values={record.cumulativeRaisedMm} />
              ) : rounds.length ? (
                <em>{rounds.length} round{rounds.length === 1 ? "" : "s"}</em>
              ) : null}
            </div>
            {rounds.length ? (
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
                    <span className="overview-funding-investors">
                      {round.investors.map((investor, index) => (
                        <Fragment key={investor}>
                          {index > 0 ? ", " : null}
                          <span className="overview-investor-link">{investor}</span>
                        </Fragment>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="overview-empty-copy">No funding rounds on record.</p>
            )}
          </div>

          <div className="overview-panel">
            <div className="overview-panel-head">
              <span>Recent News</span>
              {news.length ? <em>See all news</em> : null}
            </div>
            {news.length ? (
              <div className="overview-news-list">
                {news.map(item => (
                  <div className="overview-news-row" key={item.title}>
                    <strong>{item.title}</strong>
                    <em>{item.source} · {item.when}</em>
                  </div>
                ))}
              </div>
            ) : (
              <p className="overview-empty-copy">No recent news on record.</p>
            )}
          </div>

          <div className="overview-panel">
            <div className="overview-panel-head">
              <span>Advisors on active initiatives</span>
              {onOpenInitiatives ? (
                <button type="button" onClick={onOpenInitiatives}>Manage initiatives →</button>
              ) : null}
            </div>
            <p className="overview-empty-copy">No advisors linked to any initiative yet.</p>
            <div className="overview-advisor-pool">
              Advisor pool: <strong>{advisorPoolTotal} Total</strong>
              <em>View-only list</em>
            </div>
          </div>
        </div>

        <aside className="overview-side-column">
          <div className="overview-panel">
            <span>Links</span>
            {publicLinks.length ? (
              <div className="overview-link-list">
                {publicLinks.map(link => (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            ) : (
              <p className="overview-empty-copy">No public links on record.</p>
            )}
          </div>

          <div className="overview-panel">
            <span>Similar Companies</span>
            {similarCompanies.length ? (
              <div className="overview-company-list overview-company-list-rich">
                {similarCompanies.map(item => (
                  <div key={item.name}>
                    <span className="overview-company-logo overview-company-logo--photo">
                      <img
                        src={pickCompanyLogoAssetUrl(`${item.name}-similar`)}
                        alt=""
                        loading="lazy"
                      />
                    </span>
                    <strong>{item.name}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="overview-empty-copy">No similar companies on record.</p>
            )}
          </div>

          <div className="overview-panel">
            <span>Data Sources</span>
            <div className="overview-source-list">
              {dataSources.map(source => (
                <div key={source.name}>
                  <strong>
                    {source.name}
                    {source.badge ? <span className="overview-source-badge">{source.badge}</span> : null}
                  </strong>
                  <em>{source.detail}</em>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ThirdPartyResearchEmpty({
  companyName,
  onGenerateBrief,
}: {
  companyName: string;
  onGenerateBrief?: () => void;
}) {
  return (
    <section className="overview-tour-page third-party-research-empty" aria-label={`${companyName} research`}>
      <div className="overview-panel overview-research-empty-card">
        <strong>No research yet</strong>
        <p>
          {onGenerateBrief
            ? "Click Generate brief at the top of the page to produce a signal-driven briefing. Playbook runs, diligence reports, and other AI research artifacts also land here — they're account-wide and visible to every member."
            : "Playbook runs, diligence reports, and other AI research artifacts land here when available."}
        </p>
      </div>
    </section>
  );
}

function ThirdPartyContextFeed({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [query, setQuery] = useState("");
  const items = useMemo(
    () => getThirdPartyContextFeed(companyId, companyName),
    [companyId, companyName],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(item => (
      item.title.toLowerCase().includes(needle)
      || item.description.toLowerCase().includes(needle)
      || item.source.toLowerCase().includes(needle)
    ));
  }, [items, query]);

  return (
    <section className="context-feed-page third-party-context-feed" aria-label={`${companyName} context feed`}>
      <div className="signals-page-head">
        <div>
          <h2>Context Feed</h2>
          <p>Public market updates and sourced context for {companyName} — view only on third-party profiles.</p>
        </div>
      </div>

      <div className="context-feed-toolbar">
        <label className="signals-intel-search">
          <span className="signals-intel-search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search context…"
            aria-label="Search context feed"
          />
        </label>
        <div className="context-feed-filter-chips" role="tablist" aria-label="Context filters">
          <button type="button" className="intel-category-tab is-active" role="tab" aria-selected="true">
            All items
          </button>
        </div>
      </div>

      {filtered.length ? (
        <div className="context-feed-card-list">
          {filtered.map(item => (
            <article className="context-feed-card" key={item.id}>
              <div className="context-feed-card-thumb" aria-hidden="true">
                <img src={pickCompanyLogoAssetUrl(item.logoSeed)} alt="" loading="lazy" />
              </div>
              <div className="context-feed-card-body">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <div className="context-feed-card-meta">
                  <span>{item.source}</span>
                  <span aria-hidden="true">·</span>
                  <span>{item.when}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="signals-intel-empty">
          <strong>No context matches</strong>
          <p>Try a different search term.</p>
        </div>
      )}
    </section>
  );
}

function OverviewPage({
  activeTourTarget,
  profileComplete,
  onEditProfile,
  onManageInitiatives,
  company,
  visitorMode = false,
}: {
  activeTourTarget?: string;
  profileComplete: boolean;
  onEditProfile: () => void;
  onManageInitiatives?: () => void;
  company: { displayName: string; domain: string; headquarters: string; employees: string; linkedin: string };
  visitorMode?: boolean;
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
      {!visitorMode && !profileComplete ? (
        <div className="overview-finish-profile-panel">
          <div>
            <span>Complete profile for better AI</span>
            <h3>Intelligence, Initiatives, and Data Room are already open.</h3>
            <p>
              Finish company details and track answers for {company.displayName} to earn more credits and help Fuel deliver sharper intelligence and initiatives.
            </p>
          </div>
          <button
            className={`signals-finish-profile-action ${activeTourTarget === "finish-profile" ? "tour-highlight" : ""}`}
            data-tour-target={activeTourTarget === "finish-profile" ? "finish-profile" : undefined}
            onClick={onEditProfile}
          >
            Complete profile
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
              {!visitorMode ? (
                <button type="button" onClick={onEditProfile}>Edit profile →</button>
              ) : null}
            </div>
            <p>
              {company.displayName} is a healthcare payments company helping medical practices modernize patient billing, collections,
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
              {visitorMode
                ? `Generated intelligence from ${company.displayName}'s team is private. Add your own sources in Intelligence to build a personal view — your overview unlocks separately.`
                : `Detailed generated intelligence will appear after ${company.displayName} finishes the profile and benchmark setup. Manual intelligence can still be logged from Intelligence.`}
            </p>
          </div>

          <div className={`overview-panel ${activeTourTarget === "initiatives" ? "tour-highlight" : ""}`}>
            <div className="overview-panel-head">
              <span>Initiatives</span>
              {onManageInitiatives ? (
                <button type="button" onClick={onManageInitiatives}>Manage initiatives →</button>
              ) : null}
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
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [backdropStyle, setBackdropStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    function layoutTourChrome() {
      const highlighted = highlightTarget
        ? document.querySelector(`[data-tour-target="${highlightTarget}"]`)
        : document.querySelector(".tour-highlight");
      if (!highlighted) {
        setPopoverStyle({});
        setBackdropStyle({});
        return;
      }

      highlighted.scrollIntoView({ block: "nearest", behavior: "smooth" });

      const rect = highlighted.getBoundingClientRect();
      /* Match tour ring (~3px + ~8px glow) so the cutout doesn’t clip the border */
      const pad = 12;
      const hole = {
        left: Math.max(0, rect.left - pad),
        top: Math.max(0, rect.top - pad),
        right: Math.min(window.innerWidth, rect.right + pad),
        bottom: Math.min(window.innerHeight, rect.bottom + pad),
      };
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Full-viewport dim with a rectangular cutout so parents' overflow never clips the veil
      setBackdropStyle({
        clipPath: `polygon(evenodd, 0px 0px, ${vw}px 0px, ${vw}px ${vh}px, 0px ${vh}px, 0px 0px, ${hole.left}px ${hole.top}px, ${hole.left}px ${hole.bottom}px, ${hole.right}px ${hole.bottom}px, ${hole.right}px ${hole.top}px, ${hole.left}px ${hole.top}px)`,
      });

      const popoverWidth = 306;
      const popoverHeight = 200;
      const pageMargin = 24;
      const gap = 16;
      const spaceRight = vw - hole.right;
      const spaceLeft = hole.left;
      const spaceBelow = vh - hole.bottom;
      const spaceAbove = hole.top;

      let left: number;
      let top: number;

      // Prefer beside the target when there's room; otherwise below/above — never under the hole
      if (spaceRight >= popoverWidth + gap + pageMargin) {
        left = hole.right + gap;
        top = Math.min(Math.max(pageMargin, hole.top), vh - popoverHeight - pageMargin);
      } else if (spaceLeft >= popoverWidth + gap + pageMargin) {
        left = hole.left - popoverWidth - gap;
        top = Math.min(Math.max(pageMargin, hole.top), vh - popoverHeight - pageMargin);
      } else if (spaceBelow >= popoverHeight + gap + pageMargin) {
        left = Math.min(
          Math.max(pageMargin, hole.left),
          vw - popoverWidth - pageMargin,
        );
        top = hole.bottom + gap;
      } else if (spaceAbove >= popoverHeight + gap + pageMargin) {
        left = Math.min(
          Math.max(pageMargin, hole.left),
          vw - popoverWidth - pageMargin,
        );
        top = hole.top - popoverHeight - gap;
      } else {
        left = vw - popoverWidth - pageMargin;
        top = Math.min(Math.max(pageMargin, hole.bottom + gap), vh - popoverHeight - pageMargin);
      }

      setPopoverStyle({
        left,
        right: "auto",
        top,
      });
    }

    layoutTourChrome();
    const frame = window.requestAnimationFrame(layoutTourChrome);
    const retry = window.setTimeout(layoutTourChrome, 120);
    const retryLate = window.setTimeout(layoutTourChrome, 320);
    window.addEventListener("resize", layoutTourChrome);
    window.addEventListener("scroll", layoutTourChrome, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
      window.clearTimeout(retryLate);
      window.removeEventListener("resize", layoutTourChrome);
      window.removeEventListener("scroll", layoutTourChrome, true);
    };
  }, [step, highlightTarget]);

  return (
    <div className="guided-tour-overlay">
      <div className="guided-tour-backdrop" style={backdropStyle} />
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
        <span>Preparing your workspace</span>
        <h2>Building Overview, Intelligence, and Initiatives</h2>
        <p>
          Fuel is combining your onboarding answers, company profile, and cohort context. Next we will open a short
          product tour so you can learn the tabs while that work finishes in the background.
        </p>
        <div className="signals-loading-steps">
          <div><i />Reading onboarding answers</div>
          <div><i />Scoring R&amp;D · GTM · G&amp;A</div>
          <div><i />Drafting first intelligence</div>
          <div><i />Preparing initiative suggestions</div>
        </div>
      </div>
    </section>
  );
}

function ContextFeedPage({
  onOpenConnectors,
  onIntelligenceGenerated,
  onAttemptSourceGeneration,
  documentSlots,
  processingDocumentTypeId = null,
  onPersistSourceDocument,
  sourceFormOpen,
  onSourceFormOpenChange,
}: {
  onOpenConnectors: () => void;
  onIntelligenceGenerated?: (item: IntelligenceItem) => void;
  onAttemptSourceGeneration?: (params: {
    title: string;
    description: string;
    document?: { typeId: string; typeLabel: string; file: File };
    pendingId?: string;
  }) => void;
  documentSlots?: DataRoomDocumentSlot[];
  processingDocumentTypeId?: string | null;
  onPersistSourceDocument?: (typeId: string, typeLabel: string, file: File, intelligenceIds: string[]) => void;
  sourceFormOpen?: boolean;
  onSourceFormOpenChange?: (open: boolean) => void;
}) {
  const { tryAction } = useCredits();
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
  const [internalShowSourceForm, setInternalShowSourceForm] = useState(false);
  const sourceFormControlled = onSourceFormOpenChange != null;
  const showSourceForm = sourceFormControlled ? Boolean(sourceFormOpen) : internalShowSourceForm;
  const setShowSourceForm = (open: boolean) => {
    if (sourceFormControlled) onSourceFormOpenChange(open);
    else setInternalShowSourceForm(open);
  };
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceDescription, setSourceDescription] = useState("");
  const [attachedDocument, setAttachedDocument] = useState<{ typeId: string; typeLabel: string; file: File } | null>(null);
  const lastSourceFormOpenRef = useRef(false);

  useEffect(() => {
    if (showSourceForm && !lastSourceFormOpenRef.current) {
      setSourceTitle("");
      setSourceDescription("");
      setAttachedDocument(null);
    }
    lastSourceFormOpenRef.current = showSourceForm;
  }, [showSourceForm]);

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

  const resetSourceForm = () => {
    setSourceTitle("");
    setSourceDescription("");
    setAttachedDocument(null);
  };

  const cancelAddSource = () => {
    setShowSourceForm(false);
    resetSourceForm();
  };
  const handleSourceFormScrimPointerDown = useScrimPointerClose(cancelAddSource, showSourceForm);

  const handleAttachDocument = (typeId: string, typeLabel: string, file: File) => {
    setAttachedDocument({ typeId, typeLabel, file });
  };

  const handleAddSource = () => {
    if (!sourceTitle.trim()) return;

    if (onAttemptSourceGeneration) {
      onAttemptSourceGeneration({
        title: sourceTitle,
        description: sourceDescription,
        document: attachedDocument
          ? {
              typeId: attachedDocument.typeId,
              typeLabel: attachedDocument.typeLabel,
              file: attachedDocument.file,
            }
          : undefined,
      });
      setShowSourceForm(false);
      resetSourceForm();
      return;
    }

    tryAction("generateSource", () => {
      const document = attachedDocument
        ? {
            typeId: attachedDocument.typeId,
            typeLabel: attachedDocument.typeLabel,
            fileName: attachedDocument.file.name,
          }
        : undefined;
      const result = evaluateSourceIntelligenceGeneration({
        title: sourceTitle,
        description: sourceDescription,
        document,
      });
      if (result.item) onIntelligenceGenerated?.(result.item);
      if (attachedDocument && onPersistSourceDocument) {
        onPersistSourceDocument(
          attachedDocument.typeId,
          attachedDocument.typeLabel,
          attachedDocument.file,
          result.item ? [result.item.id] : [],
        );
      }
      setShowSourceForm(false);
      resetSourceForm();
    });
  };

  return (
    <>
      {showSourceForm ? (
        <div className="bench-drawer-scrim" onPointerDown={handleSourceFormScrimPointerDown} role="presentation">
          <aside
            className="bench-drawer add-sources-drawer"
            {...drawerPanelPointerProps()}
            role="dialog"
            aria-label="Add source"
          >
            <header className="bench-drawer-head">
              <div>
                <div className="add-sources-eyebrow">Sources</div>
                <h2 className="bench-drawer-title">Add a source</h2>
                <p className="bench-drawer-sub">
                  Capture notes, documents, and context — then turn them into intelligence.
                </p>
              </div>
              <div className="add-sources-actions">
                <button type="button" className="bench-drawer-cancel" onClick={cancelAddSource}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="bench-drawer-save"
                  disabled={!sourceTitle.trim()}
                  onClick={handleAddSource}
                >
                  Add source
                </button>
              </div>
            </header>

            <div className="bench-drawer-body">
              <div className="bench-field">
                <label className="bench-field-label" htmlFor="context-source-title">Title</label>
                <div className="add-sources-title-row">
                  <input
                    id="context-source-title"
                    className="bench-field-input"
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
              </div>

              {attachedDocument ? (
                <div className="source-attached-document">
                  <span>
                    <strong>{attachedDocument.typeLabel}</strong>
                    <em>{attachedDocument.file.name}</em>
                  </span>
                  <button type="button" onClick={() => setAttachedDocument(null)}>Remove</button>
                </div>
              ) : null}

              <div className="bench-field">
                <label className="bench-field-label" htmlFor="context-source-description">Description</label>
                <textarea
                  id="context-source-description"
                  className="bench-field-input add-sources-textarea"
                  value={sourceDescription}
                  onChange={(event) => setSourceDescription(event.target.value)}
                  placeholder="What should Fuel extract from this source?"
                  rows={6}
                />
              </div>
            </div>
          </aside>
        </div>
      ) : null}

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
              <button type="button" onClick={() => setConnectorsOpen(false)} aria-label="Close connector setup">×</button>
            </div>
            <div className="context-setup-form">
              <div className="context-drawer-connector-head">
                <div style={{ background: activeConnector?.color + "22", color: activeConnector?.color }}>
                  <ConnectorIcon name={activeConnector?.id ?? "connectors"} size={18} />
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
    </>
  );
}

function AskFuelAiButton({ onOpen }: { onOpen: () => void }) {
  const { snapshot, generationBlocked, setPopoverOpen } = useCredits();
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
        onOpen();
      }}
    >
      ✦ Ask Fuel AI
    </button>
  );
}

function AiActionsMenu({
  companyName,
  tourActive,
  tourHighlightItem,
  onRunPlaybook,
  onGenerateBrief,
}: {
  companyName: string;
  tourActive?: boolean;
  tourHighlightItem?: "playbooks" | "brief";
  onRunPlaybook?: (pb: Playbook) => void;
  onGenerateBrief?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const closeTimer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const scheduleClose = () => {
    if (tourActive) return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => { setOpen(false); }, 220);
  };
  const closeAll = () => { setOpen(false); setShowPicker(false); setSearch(""); };

  useEffect(() => {
    if (tourActive) {
      cancelClose();
      setOpen(true);
      setShowPicker(false);
      setSearch("");
      return;
    }
    setOpen(false);
    setShowPicker(false);
  }, [tourActive]);

  useEffect(() => {
    if (!showPicker) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeAll();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showPicker]);

  const q = search.toLowerCase();
  const filtered = PLAYBOOKS.filter(p =>
    !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
  );
  const grouped: Record<string, Playbook[]> = {};
  filtered.forEach(p => { (grouped[p.category] ||= []).push(p); });
  const menuOpen = open || Boolean(tourActive);
  const highlightPlaybooks = tourHighlightItem === "playbooks";
  const highlightBrief = tourHighlightItem === "brief";

  return (
    <div
      className={`ai-actions-menu${tourActive ? " is-tour-open" : ""}`}
      ref={wrapRef}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={() => { if (!showPicker) scheduleClose(); }}
    >
      <button
        type="button"
        className="header-btn ai-menu-trigger"
        title="AI Actions"
        onClick={() => setOpen(v => !v)}
      >
        ✦
      </button>
      {menuOpen ? (
        <div className="ai-actions-dropdown">
          <button
            type="button"
            className={`ai-dropdown-item has-submenu${showPicker ? " active" : ""}${highlightPlaybooks ? " tour-highlight" : ""}`}
            data-tour-target={highlightPlaybooks ? "ai-actions-playbooks" : undefined}
            onClick={() => setShowPicker(v => !v)}
          >
            <span>▤ Playbooks</span>
            <span className="ai-submenu-caret">▸</span>
          </button>
          <button
            type="button"
            className={`ai-dropdown-item${highlightBrief ? " tour-highlight" : ""}`}
            data-tour-target={highlightBrief ? "ai-actions-brief" : undefined}
            onClick={() => { onGenerateBrief?.(); closeAll(); }}
          >
            ≡ Generate brief
          </button>
        </div>
      ) : null}
      {showPicker ? (
        <div className="ai-pb-panel">
          <input
            className="afc-pb-search"
            autoFocus
            placeholder={`Search ${PLAYBOOK_COUNT} playbooks…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="afc-pb-list">
            {Object.keys(grouped).length === 0 ? (
              <div className="afc-pb-none">No playbooks match “{search}”.</div>
            ) : Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="afc-pb-group">
                <div className="afc-pb-cat">{cat.toUpperCase()}</div>
                {items.map(pb => (
                  <button key={pb.id} type="button" className="afc-pb-item" onClick={() => { onRunPlaybook?.(pb); closeAll(); }}>
                    <div className="afc-pb-item-head">
                      <span className="afc-pb-name">{pb.name}</span>
                      <span className="afc-pb-kind"> · {pb.kind}</span>
                    </div>
                    <div className="afc-pb-desc">{pb.description}</div>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="afc-pb-foot">
            <span>Click to run against {companyName}</span>
            <span className="afc-pb-catalog">Full catalog →</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SidebarYorkReachOut({
  ready,
}: {
  /** Only after Overview finishes loading — not during / right after onboarding build. */
  ready: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => isYorkOfferDismissed(YORK_COMMON_OFFER.id));

  useEffect(() => {
    if (!ready) {
      setVisible(false);
      return;
    }
    // Brief settle after Overview is ready so the rail doesn’t compete with first paint.
    const timer = window.setTimeout(() => setVisible(true), 2800);
    return () => window.clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    setDismissed(isYorkOfferDismissed(YORK_COMMON_OFFER.id));
  }, []);

  if (!visible || dismissed) return null;

  return (
    <YorkPartnerNudge
      offer={YORK_COMMON_OFFER}
      variant="sidebar"
      className="sidebar-york-nudge"
      firstName="Shreya"
      cta="Talk to York IE"
      onDismissed={() => setDismissed(true)}
    />
  );
}

function SidebarMenuIcon({ name }: { name: FuelIconName }) {
  return (
    <span className="sidebar-user-menu-icon" aria-hidden="true">
      <FuelIcon name={name} size={16} />
    </span>
  );
}

function SidebarNavItem({
  icon,
  label,
  count,
  active = false,
  onClick,
  interactive = false,
}: {
  icon: FuelIconName;
  label: string;
  count?: string | number;
  active?: boolean;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const clickable = interactive || Boolean(onClick);
  return (
    <div
      className={`nav-item${active ? " is-active" : ""}`}
      style={clickable ? { cursor: "pointer" } : undefined}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? label : `${label} (unavailable)`}
      aria-current={active ? "page" : undefined}
      aria-disabled={!clickable ? true : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <span className="nav-item-icon">
        <FuelIcon name={icon} size={15} />
      </span>
      <span>{label}</span>
      {count != null ? <span className="nav-count">{count}</span> : null}
    </div>
  );
}

function SidebarProfileFooter({
  onOpenAccountSettings,
  onOpenHelp,
  onLogout,
  yorkUpsellReady = false,
  profileComplete = true,
  userFullName = "Shreya Gokani",
  userEmail = "shreya.g@york.ie",
  earnedProfileCredits,
}: {
  onOpenAccountSettings: (tab?: AccountSettingsTab) => void;
  onOpenHelp?: () => void;
  onLogout?: () => void;
  yorkUpsellReady?: boolean;
  /** Hide York help + credit balance until profile completion. */
  profileComplete?: boolean;
  userFullName?: string;
  userEmail?: string;
  earnedProfileCredits?: EarnedProfileCredits;
}) {
  const { snapshot } = useCredits();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<FuelTheme>(() => readFuelTheme());
  const wrapRef = useRef<HTMLDivElement>(null);
  const initials = userFullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "SG";

  useEffect(() => {
    applyFuelTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="sidebar-footer">
      {profileComplete ? <SidebarYorkReachOut ready={yorkUpsellReady} /> : null}
      <CreditIndicator earnedProfileCredits={earnedProfileCredits} />
      <div className="sidebar-foot-wrap" ref={wrapRef}>
        {menuOpen ? (
          <div className="sidebar-user-menu" role="menu" aria-label="User menu">
            <div className="sidebar-user-menu-head">
              <strong>{userFullName}</strong>
              <span>{userEmail}</span>
            </div>

            <div className="sidebar-user-menu-list">
              <button
                type="button"
                role="menuitem"
                className="sidebar-user-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAccountSettings("profile");
                }}
              >
                <SidebarMenuIcon name="account" />
                <span className="sidebar-user-menu-label">Account settings</span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="sidebar-user-menu-item"
                onClick={toggleTheme}
              >
                <SidebarMenuIcon name={theme === "dark" ? "appearanceLight" : "appearanceDark"} />
                <span className="sidebar-user-menu-label">Appearance</span>
                <span className="sidebar-user-menu-meta">
                  {theme === "dark" ? "Dark" : "Light"}
                </span>
              </button>
            </div>

            <div className="sidebar-user-menu-divider" role="separator" />

            <div className="sidebar-user-menu-list">
              <button
                type="button"
                role="menuitem"
                className="sidebar-user-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenHelp?.();
                }}
              >
                <SidebarMenuIcon name="help" />
                <span className="sidebar-user-menu-label">Help / FAQ</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="sidebar-user-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout?.();
                }}
              >
                <SidebarMenuIcon name="logout" />
                <span className="sidebar-user-menu-label">Log out</span>
              </button>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className={`sidebar-foot${menuOpen ? " open" : ""}`}
          aria-label="Open user menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen(open => !open)}
        >
          <div className="sidebar-foot-avatar">{initials}</div>
          <div className="sidebar-foot-copy">
            <div className="sidebar-foot-name">
              {userFullName}
              {snapshot.plan === "free" ? <span className="credit-inline-badge">Free</span> : (
                <span className="credit-plan-badge pro" style={{ marginLeft: 6, fontSize: 9, padding: "2px 6px" }}>Pro</span>
              )}
            </div>
            <div className="sidebar-foot-email">{userEmail}</div>
          </div>
        </button>
      </div>
    </div>
  );
}

export default function PatriotPayJourney({
  initialPage = "journey",
  initialBenchmark = null,
  initialOnboardingAnswers = null,
  persona = "founder",
  onLogout,
}: {
  initialPage?: string;
  initialBenchmark?: OnboardingBenchmarkInput | null;
  initialOnboardingAnswers?: import("./OnboardingFlow.tsx").OnboardingFlowAnswers | null;
  persona?: "founder" | "investor";
  onLogout?: () => void;
}) {
  return (
    <CreditProvider>
      <PatriotPayJourneyInner
        initialPage={initialPage}
        initialBenchmark={initialBenchmark}
        initialOnboardingAnswers={initialOnboardingAnswers}
        persona={persona}
        onLogout={onLogout}
      />
      <UpgradeModal />
      <CreditToastHost />
    </CreditProvider>
  );
}

function PatriotPayJourneyInner({
  initialPage = "journey",
  initialBenchmark = null,
  initialOnboardingAnswers = null,
  persona = "founder",
  onLogout,
}: {
  initialPage?: string;
  initialBenchmark?: OnboardingBenchmarkInput | null;
  initialOnboardingAnswers?: import("./OnboardingFlow.tsx").OnboardingFlowAnswers | null;
  persona?: "founder" | "investor";
  onLogout?: () => void;
}) {
  const [reloadLandingActive, setReloadLandingActive] = useState(() => isReloadLandingActive());

  const isInvestorPersona = persona === "investor";
  const startsWithTour = initialPage === "guided-tour";
  const startsWithOverviewBuilding =
    initialPage === "overview-building" || initialPage === "signals-loading-tour";
  const startsWithOverview = initialPage === "overview-loading";
  const startsWithScorecard = initialPage === "scorecard-v2";
  const startsWithInvestorShell =
    initialPage === "investor-home"
    || initialPage === "investor-portfolios"
    || initialPage === "investor-pipeline"
    || initialPage === "investor-watchlists";
  const resolveInitialActivePage = () => {
    if (initialPage === "investor-home" || initialPage === "investor-portfolios") return "investor-portfolios";
    if (persona !== "investor" && isProfileCompletionPromptDue("patriotpay", initialOnboardingAnswers)) {
      return "scorecard-v2";
    }
    if (startsWithTour) return "overview";
    if (startsWithScorecard || startsWithOverviewBuilding) return "scorecard-v2";
    if (startsWithOverview) return "signals-loading";
    return initialPage;
  };
  const [openTracks, setOpenTracks] = useState(() => new Set());
  const [openDropdown, setOpenDropdown] = useState(null);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [activePage, setActivePage] = useState(resolveInitialActivePage);
  /** My Company: explicit public/Crunchbase profile mode (third-party is always public). */
  const [viewingPublicCompanyProfile, setViewingPublicCompanyProfile] = useState(false);
  const [tourOpen, setTourOpen] = useState(() => startsWithTour);
  const [tourStep, setTourStep] = useState(0);
  const [tourCompleteSignal, setTourCompleteSignal] = useState(0);
  const [developmentIntegrations, setDevelopmentIntegrations] = useState({ integrations: [] });
  const [marketingIntegrations, setMarketingIntegrations] = useState(true);
  const shortOnboardingIncomplete = startsWithOverviewBuilding
    && !hasCompletedOnboardingTracks(initialOnboardingAnswers);
  const [profileComplete, setProfileComplete] = useState(
    () => {
      if (initialOnboardingAnswers && (startsWithOverviewBuilding || startsWithScorecard)) {
        const seed = mapOnboardingToDetailAnswers(initialOnboardingAnswers) as DetailAnswers;
        return hasCompletedOnboardingTracks(initialOnboardingAnswers)
          || hasProfileBasicsStarted(seed);
      }
      if (shortOnboardingIncomplete) return false;
      return (
        initialPage === "signals-loading"
        || startsWithOverview
        || startsWithInvestorShell
        || Boolean(initialOnboardingAnswers?.profileSetupComplete)
      );
    },
  );
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profilePreviewTab, setProfilePreviewTab] = useState<ProfilePreviewTab>("overview");
  const profilePreviewReturnPageRef = useRef("scorecard-v2");
  const editProfileFromPreviewRef = useRef(false);
  const editBenchmarkFromPreviewRef = useRef(false);
  const [benchmarkDrawerOpen, setBenchmarkDrawerOpen] = useState(false);
  const [benchmarkDrawerElevated, setBenchmarkDrawerElevated] = useState(false);
  const [benchmarkEditRequestKey, setBenchmarkEditRequestKey] = useState(0);
  const [benchmarkEditSide, setBenchmarkEditSide] = useState<"left" | "right">("right");
  const [profileDrawerSection, setProfileDrawerSection] = useState<ProfileDrawerSection>("company");
  const [profileDrawerResetKey, setProfileDrawerResetKey] = useState(0);
  const initialFounderProfilePromptDue = persona !== "investor"
    && isProfileCompletionPromptDue("patriotpay", initialOnboardingAnswers);
  const [profileCompletionPromptOpen, setProfileCompletionPromptOpen] = useState(
    () => initialFounderProfilePromptDue && isFounderProfilePromptSurface(resolveInitialActivePage()),
  );
  const [profileDetailsSyncKey, setProfileDetailsSyncKey] = useState(0);
  const [earnedProfileCredits, setEarnedProfileCredits] = useState(() =>
    loadEarnedProfileCredits(FOUNDER_COMPANY.id),
  );
  const [profileCreditReward, setProfileCreditReward] = useState<ProfileCreditReward | null>(null);
  const profileDrawerInitialAnswers = useMemo(
    () => (initialOnboardingAnswers ? mapOnboardingToDetailAnswers(initialOnboardingAnswers) : undefined),
    [initialOnboardingAnswers],
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const creditToastCompanyKeyRef = useRef(FOUNDER_COMPANY.id);
  const showProfileCreditReward = useCallback((reward: ProfileCreditReward | null) => {
    // Only the first dashboard-benchmark-card save may celebrate; modules/sources stay silent.
    if (!reward || reward.amount <= 0 || reward.kind !== "benchmark") return;
    const companyKey = creditToastCompanyKeyRef.current;
    if (hasSeenProfileCreditRewardToast(companyKey)) return;
    markProfileCreditRewardToastSeen(companyKey);
    setProfileCreditReward(reward);
  }, []);
  const openBenchmarkDrawer = useCallback(() => {
    // Company profile metrics are editable for own company; third-party allows private investor benchmark only.
    window.requestAnimationFrame(() => {
      setBenchmarkDrawerOpen(true);
    });
  }, []);
  const openProfileDrawer = useCallback((section: ProfileDrawerSection = "company") => {
    if (section === "bench") {
      openBenchmarkDrawer();
      return;
    }
    // Defer open so the opening click does not land on the scrim and close the drawer.
    window.requestAnimationFrame(() => {
      setProfileDrawerSection(section);
      setProfileDrawerOpen(true);
    });
  }, [openBenchmarkDrawer]);

  const openProfilePreview = useCallback((tab: ProfilePreviewTab = "overview") => {
    profilePreviewReturnPageRef.current = activePage;
    setProfilePreviewTab(tab);
    setProfileDrawerOpen(false);
    setBenchmarkDrawerOpen(false);
    editProfileFromPreviewRef.current = false;
    editBenchmarkFromPreviewRef.current = false;
    setViewingPublicCompanyProfile(false);
    setActivePage("company-profile");
  }, [activePage]);

  const openCompanyProfileFor = useCallback((company: InvestorCompanyRef, tab: ProfilePreviewTab = "overview") => {
    setSelectedCompany(investorCompanyToSelected(company));
    setProfilePreviewTab(tab);
    profilePreviewReturnPageRef.current = activePage;
    setProfileDrawerOpen(false);
    setBenchmarkDrawerOpen(false);
    setBenchmarkDrawerElevated(false);
    editProfileFromPreviewRef.current = false;
    editBenchmarkFromPreviewRef.current = false;
    setViewingPublicCompanyProfile(false);
    setActivePage("company-profile");
  }, [activePage]);

  const closeCompanyProfilePage = useCallback(() => {
    const returnPage = profilePreviewReturnPageRef.current;
    setProfileDrawerOpen(false);
    setBenchmarkDrawerOpen(false);
    editProfileFromPreviewRef.current = false;
    editBenchmarkFromPreviewRef.current = false;
    setActivePage(returnPage === "company-profile" ? "scorecard-v2" : returnPage);
  }, []);

  const reopenProfilePreviewAfterBenchmark = useCallback(() => {
    if (!editBenchmarkFromPreviewRef.current) return;
    editBenchmarkFromPreviewRef.current = false;
    setProfileDetailsSyncKey(key => key + 1);
    window.requestAnimationFrame(() => {
      setActivePage("company-profile");
    });
  }, []);

  const closeBenchmarkDrawer = useCallback(() => {
    setBenchmarkDrawerOpen(false);
    setBenchmarkDrawerElevated(false);
    reopenProfilePreviewAfterBenchmark();
  }, [reopenProfilePreviewAfterBenchmark]);

  const handleBenchmarkEditClosedFromPreview = useCallback(() => {
    setBenchmarkEditSide("right");
    reopenProfilePreviewAfterBenchmark();
  }, [reopenProfilePreviewAfterBenchmark]);

  const handleEditBenchmarkFromPreview = useCallback(() => {
    editBenchmarkFromPreviewRef.current = true;
    setProfileDrawerOpen(false);
    setBenchmarkEditSide("right");

    if (activePage === "scorecard-v2") {
      window.requestAnimationFrame(() => {
        setBenchmarkEditRequestKey(key => key + 1);
      });
      return;
    }

    setBenchmarkDrawerElevated(true);
    window.requestAnimationFrame(() => {
      setBenchmarkDrawerOpen(true);
    });
  }, [activePage]);

  const handleEditProfileFromPreview = useCallback((section: ProfileDrawerSection = "company") => {
    if (section === "bench") {
      handleEditBenchmarkFromPreview();
      return;
    }
    editProfileFromPreviewRef.current = true;
    openProfileDrawer(section);
  }, [handleEditBenchmarkFromPreview, openProfileDrawer]);

  const handleProfileSavedFromPreview = useCallback(() => {
    setProfileDetailsSyncKey(key => key + 1);
    if (!editProfileFromPreviewRef.current) return;
    editProfileFromPreviewRef.current = false;
  }, []);

  const syncProfileCompleteFromStorage = useCallback((companyId: string) => {
    const answers = loadDetailAnswers(companyId);
    const profileSection = DETAIL_SECTIONS.find(section => section.id === "profile");
    if (!profileSection) return;
    const total = getVisibleQuestions(profileSection, answers).length;
    const answered = countSectionAnswers(profileSection, answers);
    if (total > 0 && answered >= total) {
      setProfileComplete(true);
    }
  }, []);

  const startOverviewBuild = useCallback((
    fromPhase: OverviewBuildPhase = "summary",
    mode: "full" | "single" = "single",
  ) => {
    overviewBuildModeRef.current = mode;
    overviewBuildTargetPhaseRef.current = fromPhase;
    setOverviewBuildRun(run => run + 1);
    setOverviewBuildActive(true);
    setOverviewBuildPhase(fromPhase);
    setHeaderTourEnabled(false);
    setActivePage("scorecard-v2");
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activePage]);

  useEffect(() => {
    saveActivePage(activePage, persona);
  }, [activePage, persona]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  const [accountTab, setAccountTab] = useState<AccountSettingsTab>("profile");
  const [documentSlots, setDocumentSlots] = useState<DataRoomDocumentSlot[]>(createInitialDocumentSlots);
  const [processingDocumentTypeId, setProcessingDocumentTypeId] = useState<string | null>(null);
  const [documentHistorySlot, setDocumentHistorySlot] = useState<DataRoomDocumentSlot | null>(null);
  const initialIntelligenceSeed = createInitialIntelligenceSeed(initialBenchmark, initialOnboardingAnswers);
  const [intelligenceItems, setIntelligenceItems] = useState<IntelligenceItem[]>(
    () => initialIntelligenceSeed.items.filter(item => !item.id.startsWith("intel-york-")),
  );
  const [manualPendingSources, setManualPendingSources] = useState<PendingSource[]>([]);
  const [investorIntelligenceByCompany, setInvestorIntelligenceByCompany] = useState<Record<string, IntelligenceItem[]>>({});
  const [investorInitiativesByCompany, setInvestorInitiativesByCompany] = useState<Record<string, InitiativeRecord[]>>({});
  const [founderInitiatives, setFounderInitiatives] = useState<InitiativeRecord[]>(() =>
    buildDefaultRecommendedInitiatives(),
  );
  const [focusInitiativeId, setFocusInitiativeId] = useState<string | null>(null);
  const [investorBenchmarkByCompany, setInvestorBenchmarkByCompany] = useState<Record<string, BenchmarkSubmission | null>>({});
  const [investorOverviewIntroCompanyId, setInvestorOverviewIntroCompanyId] = useState<string | null>(null);
  const [investorWorkspaceStarted, setInvestorWorkspaceStarted] = useState<Record<string, boolean>>({});
  const [dataRoomAccessRequests, setDataRoomAccessRequests] = useState<Record<string, boolean>>({});
  const [selectedCompany, setSelectedCompany] = useState(() => {
    const companyName = initialOnboardingAnswers?.profileCompany?.trim();
    if (!companyName || companyName === FOUNDER_COMPANY.displayName) return FOUNDER_COMPANY;
    const next = {
      ...FOUNDER_COMPANY,
      displayName: companyName,
      domain: companyName.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com",
      logo: companyName[0]?.toUpperCase() ?? "C",
    };
    return {
      ...next,
      logoUrl: resolveCompanyLogoUrl(next),
    };
  });
  creditToastCompanyKeyRef.current = selectedCompany.id;
  const [intelligenceFocus, setIntelligenceFocus] = useState<IntelligenceFocus | null>(null);
  const [benchmarkSubmission, setBenchmarkSubmission] = useState<BenchmarkSubmission | null>(() =>
    loadStoredBenchmarkSubmission() ?? initialIntelligenceSeed.submission,
  );
  useEffect(() => {
    setEarnedProfileCredits(loadEarnedProfileCredits(selectedCompany.id));
  }, [selectedCompany.id]);

  useEffect(() => {
    syncProfileCompleteFromStorage(selectedCompany.id);
  }, [selectedCompany.id, syncProfileCompleteFromStorage]);

  const dismissProfileCompletionPrompt = useCallback(() => {
    markProfileCompletionPromptDismissed(selectedCompany.id);
    setProfileCompletionPromptOpen(false);
  }, [selectedCompany.id]);

  const completeProfileFromPrompt = useCallback(() => {
    setProfileCompletionPromptOpen(false);
    openProfileDrawer("company");
  }, [openProfileDrawer]);

  const handleProfileModuleSaved = useCallback((
    module: ProfileModuleId,
    _answers: DetailAnswers,
  ) => {
    setProfileDetailsSyncKey(key => key + 1);
    syncProfileCompleteFromStorage(selectedCompany.id);
    startOverviewBuild(profileModuleToBuildPhase(module), "single");
  }, [selectedCompany.id, startOverviewBuild, syncProfileCompleteFromStorage]);

  const handleProfileModuleProgress = useCallback((
    _module: ProfileModuleId,
    _answers: DetailAnswers,
  ) => {
    setProfileDetailsSyncKey(key => key + 1);
    syncProfileCompleteFromStorage(selectedCompany.id);
  }, [selectedCompany.id, syncProfileCompleteFromStorage]);

  const [benchmarkBlinkIds, setBenchmarkBlinkIds] = useState<string[]>([]);
  const [askFuelOpen, setAskFuelOpen] = useState(false);
  const openAccountSettings = useCallback((tab: AccountSettingsTab = "profile") => {
    setAccountTab(tab);
    setActivePage("account");
  }, []);
  const openMyCompanyProfile = useCallback(() => {
    openCompanyProfileFor(FOUNDER_COMPANY, "overview");
  }, [openCompanyProfileFor]);
  const openInvestorPortfolios = useCallback(() => {
    setActivePage("investor-portfolios");
  }, []);
  const openAccountHome = useCallback(() => {
    if (isInvestorPersona) openInvestorPortfolios();
    else openMyCompanyProfile();
  }, [isInvestorPersona, openInvestorPortfolios, openMyCompanyProfile]);
  const [generatedBrief, setGeneratedBrief] = useState<Brief | null>(null);
  const [lastPlaybook, setLastPlaybook] = useState<{ name: string; kind: string; description: string; category: string } | null>(null);
  const [pendingPlaybook, setPendingPlaybook] = useState<Playbook | null>(null);
  const [playbookFocusSignal, setPlaybookFocusSignal] = useState(0);
  const [briefFocusSignal, setBriefFocusSignal] = useState(0);
  const [askFuelBenchmarkSubmitSignal, setAskFuelBenchmarkSubmitSignal] = useState(0);
  const { tryAction } = useCredits();
  const isOnCompanyWorkspace = activePage !== "investor-home"
    && activePage !== "investor-portfolios"
    && activePage !== "investor-pipeline"
    && activePage !== "investor-watchlists"
    && activePage !== "account"
    && activePage !== "connectors";
  const isClaimedFounderCompany = !isInvestorPersona && selectedCompany.id === FOUNDER_CLAIMED_COMPANY_ID;
  /** Ownership source of truth for company profile editability. */
  const isOwnCompany = isClaimedFounderCompany;
  const isInvestorCompanyView = isInvestorPersona && isOnCompanyWorkspace;
  const usesPerCompanyWorkspace = isOnCompanyWorkspace && !isClaimedFounderCompany;
  /** Public Crunchbase-style profile (third-party always; My Company when explicitly opened). */
  const showPublicCompanyProfile = usesPerCompanyWorkspace || (isOwnCompany && viewingPublicCompanyProfile);

  useEffect(() => {
    setViewingPublicCompanyProfile(false);
  }, [selectedCompany.id]);

  const requestEditBenchmarkFromPreview = useCallback(() => {
    if (!isOwnCompany) return;
    handleEditBenchmarkFromPreview();
  }, [handleEditBenchmarkFromPreview, isOwnCompany]);

  const requestEditProfileFromPreview = useCallback((section: ProfileDrawerSection = "company") => {
    if (!isOwnCompany) return;
    handleEditProfileFromPreview(section);
  }, [handleEditProfileFromPreview, isOwnCompany]);

  useEffect(() => {
    if (isOwnCompany) return;
    // Never leave company-profile edit UI open on a third-party company.
    // Private investor benchmark on third-party companies remains allowed.
    setProfileDrawerOpen(false);
    editProfileFromPreviewRef.current = false;
  }, [isOwnCompany, selectedCompany.id]);

  useEffect(() => {
    if (isOwnCompany || usesPerCompanyWorkspace) return;
    setBenchmarkDrawerOpen(false);
    setBenchmarkDrawerElevated(false);
    editBenchmarkFromPreviewRef.current = false;
  }, [isOwnCompany, usesPerCompanyWorkspace, selectedCompany.id]);

  const markInvestorWorkspaceStarted = useCallback((companyId: string) => {
    if (!usesPerCompanyWorkspace && companyId === FOUNDER_CLAIMED_COMPANY_ID) return;
    if (isInvestorPersona && companyId === FOUNDER_CLAIMED_COMPANY_ID) return;
    setInvestorWorkspaceStarted(previous => (
      previous[companyId] ? previous : { ...previous, [companyId]: true }
    ));
  }, [isInvestorPersona, usesPerCompanyWorkspace]);
  const tryUnlockInvestorOverview = useCallback((companyId: string) => {
    if (isInvestorPersona && companyId === FOUNDER_CLAIMED_COMPANY_ID) return;
    if (!isInvestorPersona && companyId === FOUNDER_CLAIMED_COMPANY_ID) return;
    const hadWorkspace = hasInvestorWorkspaceOnCompany(
      companyId,
      investorIntelligenceByCompany,
      investorInitiativesByCompany,
      investorBenchmarkByCompany,
      investorWorkspaceStarted,
    );
    markInvestorWorkspaceStarted(companyId);
    if (!hadWorkspace) {
      setInvestorOverviewIntroCompanyId(companyId);
      setActivePage("scorecard-v2");
    }
  }, [
    investorBenchmarkByCompany,
    investorInitiativesByCompany,
    investorIntelligenceByCompany,
    investorWorkspaceStarted,
    isInvestorPersona,
    markInvestorWorkspaceStarted,
  ]);
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
        const { earned } = tryMarkIntelligenceSourcesEarned(selectedCompany.id);
        setEarnedProfileCredits(earned);
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
    const { earned } = tryMarkIntelligenceSourcesEarned(selectedCompany.id);
    setEarnedProfileCredits(earned);
  };
  const applySourceGenerationResult = useCallback(({
    title,
    description,
    document,
    documentFile,
    pendingId,
    result,
  }: {
    title: string;
    description: string;
    document?: { typeId: string; typeLabel: string; fileName: string };
    documentFile?: File;
    pendingId?: string;
    result: { item: IntelligenceItem | null; emptyReason?: string };
  }) => {
    const processedAtMs = Date.now();
    const processedAtLabel = new Date(processedAtMs).toLocaleString("en-US");

    if (result.item) {
      const hadInvestorWorkspace = usesPerCompanyWorkspace
        ? hasInvestorWorkspaceOnCompany(
            selectedCompany.id,
            investorIntelligenceByCompany,
            investorInitiativesByCompany,
            investorBenchmarkByCompany,
            investorWorkspaceStarted,
          )
        : false;
      const item = usesPerCompanyWorkspace
        ? { ...result.item, id: `intel-investor-${selectedCompany.id}-${processedAtMs}` }
        : result.item;

      if (usesPerCompanyWorkspace) {
        setInvestorIntelligenceByCompany(previous => ({
          ...previous,
          [selectedCompany.id]: [item, ...(previous[selectedCompany.id] ?? [])],
        }));
        if (!hadInvestorWorkspace) {
          markInvestorWorkspaceStarted(selectedCompany.id);
          setInvestorOverviewIntroCompanyId(selectedCompany.id);
          setActivePage("scorecard-v2");
        }
      } else {
        setIntelligenceItems(previous => [item, ...previous]);
        setBenchmarkBlinkIds([item.id]);
        window.setTimeout(() => setBenchmarkBlinkIds([]), 900);
      }

      if (document && !usesPerCompanyWorkspace) {
        if (documentFile) {
          persistSourceDocument(
            document.typeId,
            document.typeLabel,
            documentFile,
            [item.id],
            "Intelligence · Source upload",
          );
        } else {
          setDocumentSlots(previous => attachIntelligenceToDocumentSlot(
            previous,
            document.typeId,
            item.id,
          ));
        }
      }

      // Always keep the source in Sources (notes + docs), matching import design.
      if (pendingId) {
        setManualPendingSources(previous => {
          const nextEntry: PendingSource = {
            id: pendingId,
            title: title.trim(),
            description: description.trim(),
            kind: document ? "document" : "note",
            document: document
              ? { typeId: document.typeId, typeLabel: document.typeLabel, fileName: document.fileName }
              : undefined,
            addedAtMs: processedAtMs,
            addedAtLabel: processedAtLabel,
            processedAtLabel,
            status: "saved",
            intelligenceGenerated: true,
            intelligenceIds: [item.id],
          };
          const exists = previous.some(source => source.id === pendingId);
          if (exists) {
            return previous.map(source => (source.id === pendingId
              ? {
                  ...source,
                  status: "saved",
                  intelligenceGenerated: true,
                  intelligenceIds: [item.id],
                  processedAtLabel,
                  emptyReason: undefined,
                }
              : source));
          }
          return [nextEntry, ...previous];
        });
      } else if (!document) {
        setManualPendingSources(previous => [{
          id: `source-note-${processedAtMs}`,
          title: title.trim(),
          description: description.trim(),
          kind: "note",
          addedAtMs: processedAtMs,
          addedAtLabel: processedAtLabel,
          processedAtLabel,
          status: "saved",
          intelligenceGenerated: true,
          intelligenceIds: [item.id],
        }, ...previous]);
      }
      return;
    }

    if (pendingId) {
      setManualPendingSources(previous => {
        const exists = previous.some(source => source.id === pendingId);
        if (exists) {
          return previous.map(source => (
            source.id === pendingId
              ? {
                  ...source,
                  status: "saved",
                  intelligenceGenerated: false,
                  intelligenceIds: [],
                  emptyReason: result.emptyReason || "No intelligence identified from this source.",
                  processedAtLabel,
                }
              : source
          ));
        }
        return [{
          id: pendingId,
          title: title.trim(),
          description: description.trim(),
          kind: document ? "document" : "note",
          document: document
            ? { typeId: document.typeId, typeLabel: document.typeLabel, fileName: document.fileName }
            : undefined,
          addedAtMs: processedAtMs,
          addedAtLabel: processedAtLabel,
          processedAtLabel,
          status: "saved",
          intelligenceGenerated: false,
          intelligenceIds: [],
          emptyReason: result.emptyReason || "No intelligence identified from this source.",
        }, ...previous];
      });
    }

    if (document) {
      setDocumentSlots(previous => markDocumentSourceWithoutIntelligence(
        previous,
        document.typeId,
        result.emptyReason || "No intelligence identified from this source.",
      ));
    }

    if (!pendingId && !document) {
      setManualPendingSources(previous => [{
        id: `source-note-${processedAtMs}`,
        title: title.trim(),
        description: description.trim(),
        kind: "note",
        addedAtMs: processedAtMs,
        addedAtLabel: processedAtLabel,
        processedAtLabel,
        status: "saved",
        intelligenceGenerated: false,
        intelligenceIds: [],
        emptyReason: result.emptyReason,
      }, ...previous]);
    }
  }, [usesPerCompanyWorkspace, selectedCompany.id, investorIntelligenceByCompany, investorInitiativesByCompany, investorBenchmarkByCompany, investorWorkspaceStarted, markInvestorWorkspaceStarted]);
  const handleAttemptSourceGeneration = useCallback((params: {
    title: string;
    description: string;
    document?: { typeId: string; typeLabel: string; file: File };
    documentMeta?: { typeId: string; typeLabel: string; fileName: string };
    pendingId?: string;
  }) => {
    const sourceAddedAtMs = Date.now();
    const sourceAddedAtLabel = new Date(sourceAddedAtMs).toLocaleString("en-US");
    const documentForEval = params.document
      ? {
          typeId: params.document.typeId,
          typeLabel: params.document.typeLabel,
          fileName: params.document.file.name,
        }
      : params.documentMeta;
    // Always assign an id so Sources count updates for notes and documents (import design).
    const sourceId = params.pendingId
      ?? (params.document
        ? `source-doc-${params.document.typeId}-${sourceAddedAtMs}`
        : `source-note-${sourceAddedAtMs}`);

    // Register in Sources immediately — intelligence may stay at 0.
    if (!params.pendingId) {
      setManualPendingSources(previous => [{
        id: sourceId,
        title: params.title.trim() || (params.document?.file.name ?? "Untitled source"),
        description: params.description.trim(),
        kind: params.document ? "document" : "note",
        document: documentForEval,
        addedAtMs: sourceAddedAtMs,
        addedAtLabel: sourceAddedAtLabel,
        processedAtLabel: sourceAddedAtLabel,
        status: "saved",
        intelligenceGenerated: false,
        intelligenceIds: [],
      }, ...previous.filter(source => source.id !== sourceId)]);
    }

    if (params.document && !params.pendingId) {
      persistSourceDocument(
        params.document.typeId,
        params.document.typeLabel,
        params.document.file,
        [],
        "Intelligence · Source added",
      );
    }

    const applyResult = (result: { item: IntelligenceItem | null; emptyReason?: string }) => {
      applySourceGenerationResult({
        title: params.title,
        description: params.description,
        document: documentForEval,
        documentFile: params.document?.file,
        pendingId: sourceId,
        result,
      });
    };

    let generated = false;
    tryAction("generateSource", () => {
      generated = true;
      applyResult(evaluateSourceIntelligenceGeneration({
        title: params.title,
        description: params.description,
        document: documentForEval,
      }));
    });

    if (!generated) {
      applyResult({
        item: null,
        emptyReason: "Source saved. Generate intelligence when you have enough credits.",
      });
    }
  }, [applySourceGenerationResult, tryAction]);
  const handleGenerateFromPending = (pendingId: string) => {
    const pending = getPendingSources(manualPendingSources, documentSlots).find(source => source.id === pendingId);
    if (!pending) return;

    handleAttemptSourceGeneration({
      title: pending.title,
      description: pending.kind === "document" ? "" : pending.description,
      pendingId,
      documentMeta: pending.document,
    });
  };
  const handleDismissPendingSource = (pendingId: string) => {
    setManualPendingSources(previous => previous.filter(source => source.id !== pendingId));
  };
  const investorScopedIntelligence = useMemo(() => {
    if (!usesPerCompanyWorkspace) return intelligenceItems;
    const privateItems = getInvestorCompanyIntelligence(
      investorIntelligenceByCompany[selectedCompany.id] ?? [],
      investorBenchmarkByCompany[selectedCompany.id],
    );
    const publicSeed = buildThirdPartyPublicIntelligence(
      selectedCompany.id,
      selectedCompany.displayName,
    ).map((row): IntelligenceItem => ({
      id: row.id,
      type: row.type,
      subtype: row.subtype,
      text: row.text,
      highlight: row.highlight,
      date: row.date,
      age: row.age,
      title: row.title,
      sources: [{
        id: `src-public-${row.id}`,
        title: "fuel-data",
        description: "External company profile",
        system: "fuel-data",
        sourceType: "public",
        meta: "Public",
        date: row.date,
      }],
      updatedAtMs: Date.now(),
    }));
    const privateKeys = new Set(
      privateItems.map(item => `${item.type}::${item.subtype || item.text}`),
    );
    const mergedPublic = publicSeed.filter(
      item => !privateKeys.has(`${item.type}::${item.subtype || item.text}`),
    );
    return [...privateItems, ...mergedPublic];
  }, [
    intelligenceItems,
    investorBenchmarkByCompany,
    investorIntelligenceByCompany,
    usesPerCompanyWorkspace,
    selectedCompany.id,
    selectedCompany.displayName,
  ]);
  const setScopedIntelligenceItems = useCallback((
    updater: React.SetStateAction<IntelligenceItem[]>,
  ) => {
    if (!usesPerCompanyWorkspace) {
      setIntelligenceItems(updater);
      return;
    }
    setInvestorIntelligenceByCompany(previous => {
      const current = getInvestorCompanyIntelligence(
        previous[selectedCompany.id] ?? [],
        investorBenchmarkByCompany[selectedCompany.id],
      );
      const next = typeof updater === "function" ? updater(current) : updater;
      const investorItems = next
        .filter(item => (
          !item.id.startsWith("intel-bench-")
          && !item.id.startsWith("intel-public-")
        ))
        .map(item => (
          isInvestorOwnedIntelligence(item)
            ? item
            : { ...item, id: `intel-investor-${selectedCompany.id}-${item.id}` }
        ));
      return { ...previous, [selectedCompany.id]: investorItems };
    });
  }, [investorBenchmarkByCompany, usesPerCompanyWorkspace, selectedCompany.id]);
  const openInvestorCompany = useCallback((company: InvestorCompanyRef) => {
    setSelectedCompany(investorCompanyToSelected(company));
    setProfileComplete(true);
    setProfileDrawerOpen(false);
    setBenchmarkDrawerOpen(false);
    setBenchmarkDrawerElevated(false);
    editProfileFromPreviewRef.current = false;
    editBenchmarkFromPreviewRef.current = false;
    setViewingPublicCompanyProfile(false);
    // Overview tab — third-party company public profile (view-only).
    setActivePage("scorecard-v2");
  }, []);

  const openPublicCompanyProfile = useCallback(() => {
    setViewingPublicCompanyProfile(true);
    setActivePage("scorecard-v2");
  }, []);

  const exitPublicCompanyProfile = useCallback(() => {
    setViewingPublicCompanyProfile(false);
    setActivePage("scorecard-v2");
  }, []);

  const openRecentCompany = useCallback((companyId: string) => {
    const company = INVESTOR_PORTFOLIO.find(item => item.id === companyId)
      ?? SUGGESTED_FOUNDERS.find(item => item.id === companyId);
    if (!company) return;
    // Own company stays editable workspace; all others open the third-party workspace (view-only company data).
    openInvestorCompany(company);
  }, [openInvestorCompany]);

  const openInvestorCompanyProfile = useCallback((company: PortfolioCompanyView) => {
    // Portfolio "View Profile" → full third-party company workspace (same as Recently Viewed).
    openInvestorCompany(company);
  }, [openInvestorCompany]);

  const recentCompanies = useMemo(() => {
    const ids = ["swiggy", "operator-ai", "sync-sports", "winrate"];
    return ids
      .map(id => INVESTOR_PORTFOLIO.find(item => item.id === id) ?? SUGGESTED_FOUNDERS.find(item => item.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, []);

  const fundName = initialOnboardingAnswers?.profileCompany || "Your fund";
  const applyBenchmarkSubmission = (values: BenchmarkFormValues, forCompanyId?: string) => {
    const { items, submission } = createBenchmarkIntelligence(values);
    const usePerCompany = Boolean(
      forCompanyId && (isInvestorPersona || forCompanyId !== FOUNDER_CLAIMED_COMPANY_ID),
    );
    if (usePerCompany && forCompanyId) {
      const hadWorkspace = hasInvestorWorkspaceOnCompany(
        forCompanyId,
        investorIntelligenceByCompany,
        investorInitiativesByCompany,
        investorBenchmarkByCompany,
        investorWorkspaceStarted,
      );
      setInvestorBenchmarkByCompany(previous => ({ ...previous, [forCompanyId]: submission }));
      setInvestorIntelligenceByCompany(previous => ({
        ...previous,
        [forCompanyId]: [...items, ...(previous[forCompanyId] ?? []).filter(item => !item.id.startsWith("intel-bench-"))],
      }));
      if (!hadWorkspace) {
        markInvestorWorkspaceStarted(forCompanyId);
        setInvestorOverviewIntroCompanyId(forCompanyId);
        setActivePage("scorecard-v2");
      }
      return;
    }
    setIntelligenceItems(previous => {
      const nonBenchmark = previous.filter(item => !item.id.startsWith("intel-bench-"));
      return [...items, ...nonBenchmark];
    });
    setBenchmarkSubmission(submission);
    saveStoredBenchmarkSubmission(submission);
    setBenchmarkBlinkIds(submission.intelligenceIds);
    window.setTimeout(() => setBenchmarkBlinkIds([]), 900);
  };
  const handleBenchmarkSubmit = (values: BenchmarkFormValues) => {
    if (usesPerCompanyWorkspace) {
      applyBenchmarkSubmission(values, selectedCompany.id);
    } else {
      applyBenchmarkSubmission(values);
    }
    const { earned } = tryMarkBenchmarkEarned(selectedCompany.id);
    setEarnedProfileCredits(earned);
    setProfileDetailsSyncKey(key => key + 1);
    startOverviewBuild("summary", "single");
    if (askFuelOpen) {
      setAskFuelBenchmarkSubmitSignal(signal => signal + 1);
    }
  };
  const handleViewIntelligenceFromDataRoom = (record: DataRoomFileRecord) => {
    if (!record.intelligenceIds.length) return;
    setIntelligenceFocus({ ids: record.intelligenceIds, label: record.name });
    setActivePage("signals");
  };
  const [showTourPrompt, setShowTourPrompt] = useState(() => {
    if (!reloadLandingActive) return false;
    return true;
  });
  const [headerTourEnabled, setHeaderTourEnabled] = useState(() => {
    if (reloadLandingActive) return false;
    return !startsWithOverviewBuilding;
  });
  const [showTourCoachmark, setShowTourCoachmark] = useState(false);
  const [tourTaken, setTourTaken] = useState(() => {
    try {
      const lastTakenAt = Number(window.localStorage.getItem("fuelWorkspaceTourTakenAt") || 0);
      return lastTakenAt > 0 && Date.now() - lastTakenAt < TOUR_TAKEN_COOLDOWN_MS;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isInvestorPersona) return;
    if (!isProfileCompletionPromptDue(selectedCompany.id, initialOnboardingAnswers)) return;
    if (activePage === "scorecard-v2") return;
    if (activePage === "company-profile" || activePage === "signals-loading" || activePage === "overview") {
      setActivePage("scorecard-v2");
    }
  }, [
    activePage,
    initialOnboardingAnswers,
    isInvestorPersona,
    selectedCompany.id,
  ]);

  useEffect(() => {
    if (isInvestorPersona) {
      setProfileCompletionPromptOpen(false);
      return;
    }
    if (!isFounderProfilePromptSurface(activePage)) {
      setProfileCompletionPromptOpen(false);
      return;
    }
    if (!isProfileCompletionPromptDue(selectedCompany.id, initialOnboardingAnswers)) {
      setProfileCompletionPromptOpen(false);
      return;
    }
    setProfileCompletionPromptOpen(true);
  }, [
    activePage,
    initialOnboardingAnswers,
    isInvestorPersona,
    profileDetailsSyncKey,
    selectedCompany.id,
  ]);

  const profilePromptBlocking = shouldGateFounderProfilePrompt(
    persona,
    selectedCompany.id,
    activePage,
    initialOnboardingAnswers,
  ) && profileCompletionPromptOpen;

  const coreTourSteps = [
    {
      page: "scorecard-v2",
      target: "tab-workspace",
      title: "Module-first",
      text: "Your home dashboard for profile completion, module progress, credits, and onboarding — start here after setup.",
    },
    {
      page: "scorecard-v2",
      target: "workspace-profile-card",
      title: "Complete Profile",
      text: "Track overall profile completion, remaining steps, and credits. Use Resume Profile to continue where you left off.",
    },
    {
      page: "scorecard-v2",
      target: "workspace-module-rd",
      title: "R&D progress",
      text: "Finish R&D context to sharpen product signals, benchmarks, and technical readiness scores.",
    },
    {
      page: "scorecard-v2",
      target: "workspace-module-gtm",
      title: "GTM progress",
      text: "Add go to market context — motion, ICP, and pipeline — to unlock revenue benchmarks and pipeline health.",
    },
    {
      page: "scorecard-v2",
      target: "workspace-module-ga",
      title: "G&A progress",
      text: "Capture runway, finance, and capital priorities to improve burn, runway, and finance readiness analysis.",
    },
    {
      page: "scorecard-v2",
      target: "workspace-module-benchmark",
      title: "Benchmark",
      text: "Submit cohort metrics for peer comparisons. Benchmark credits are earned on first submission.",
    },
    {
      page: "scorecard-v2",
      target: "workspace-connectors",
      title: "Connectors",
      text: "Connect HubSpot or Granola to enrich your profile and unlock deeper AI insights — same connectors as the rest of your workspace.",
    },
    {
      page: "account",
      target: "account-settings",
      title: "Settings",
      text: "Manage account settings, appearance, integrations, and your Fuel profile from Account settings.",
    },
    {
      page: "scorecard-v2",
      target: "main-navigation",
      title: "Navigation",
      text: "Move between Overview, Intelligence, Initiatives, Data Room, and Research from the main tabs.",
    },
    {
      page: "scorecard-v2",
      target: "workspace-credits",
      title: "Credits",
      text: "Earn up to 200 credits across Complete Profile, R&D, GTM, G&A, and Benchmark — each section awards 40 credits.",
    },
    {
      page: "scorecard-v2",
      target: "category-dev",
      title: "Scoring",
      text: "Track scores appear in the Progress Feed on the New overview tab as profile modules and benchmarks fill in.",
    },
    {
      page: "scorecard-v2",
      target: "tab-overview",
      title: "Overview",
      text: "The New overview tab shows R&D, GTM, and G&A track scores, the Fuel AI advisor, and company snapshot as context is processed.",
    },
    {
      page: "scorecard-v2",
      target: "ai-advisor",
      title: "Fuel AI advisor",
      text: "The advisor highlights what matters across tracks and points you to details, sources, and initiatives. Open About for the full company summary when you are ready.",
    },
    {
      page: "scorecard-v2",
      target: "recommended-actions",
      title: "Recommended Actions",
      text: "Start here after onboarding. Update benchmarks and fill track details — each action sharpens your scores and what Fuel recommends next.",
    },
    {
      page: "signals",
      target: "signals",
      title: "Intelligence",
      text: "Intelligence groups benchmarks, uploads, and logged signals by category — open any row for provenance and history. Fuel is still assembling the first set from onboarding in the background.",
    },
    {
      page: "signals",
      target: "add-source",
      title: "Add a source",
      text: "Use Add source to attach a note or document and generate intelligence without waiting on connectors.",
    },
    {
      page: "signals",
      target: "log-intelligence",
      title: "Log intelligence",
      text: "Use Log intelligence to capture a catalog signal — ARR, burn, retention, and more — so it lands in the feed with history.",
    },
    {
      page: "initiatives",
      target: "initiatives",
      title: "Initiatives",
      text: "Turn insights into active work. Suggested initiatives from each track can be added here, tracked with milestones, and linked to progress intelligence.",
    },
    {
      page: "data-room",
      target: "data-room",
      title: "Data Room",
      text: "Store decks, notes, and models privately. Uploads feed Intelligence and stay in your workspace.",
    },
    {
      page: "scorecard-v2",
      target: "ask-fuel-ai",
      title: "Ask Fuel AI",
      text: "Chat with Fuel about this company — dig into scores, ask what matters next, and explore the story behind the data.",
    },
    {
      page: "scorecard-v2",
      target: "ai-actions-playbooks",
      title: "Playbooks",
      text: "Open ✦ then Playbooks for structured runbooks — diligence, pricing, audits, and planning frameworks run against this company’s context.",
    },
    {
      page: "scorecard-v2",
      target: "ai-actions-brief",
      title: "Generate brief",
      text: "Generate brief opens Ask Fuel AI and drafts your company overview in chat so you can read it, ask follow-ups, and refine it there.",
    },
  ] as const;
  const tourSteps = profileComplete
    ? [...coreTourSteps]
    : [
        ...coreTourSteps,
        {
          page: "overview",
          target: "finish-profile",
          title: "Finish profile",
          text: "Complete your company profile and track details so Fuel can improve scores, intelligence, and initiative suggestions.",
        },
      ];
  const [overviewBuildActive, setOverviewBuildActive] = useState(startsWithOverviewBuilding);
  const [overviewBuildPhase, setOverviewBuildPhase] = useState<OverviewBuildPhase | null>(
    startsWithOverviewBuilding ? "summary" : null,
  );
  const [overviewBuildRun, setOverviewBuildRun] = useState(0);
  const overviewBuildModeRef = useRef<"full" | "single">(
    startsWithOverviewBuilding ? "full" : "single",
  );
  const overviewBuildTargetPhaseRef = useRef<OverviewBuildPhase>("summary");
  const [overviewBuiltPhases, setOverviewBuiltPhases] = useState<Set<OverviewBuildPhase>>(() => {
    try {
      const raw = window.localStorage.getItem(`fuel-overview-built-${selectedCompany.id}`);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as OverviewBuildPhase[]);
    } catch {
      return new Set();
    }
  });

  const persistOverviewBuiltPhases = useCallback((phases: Set<OverviewBuildPhase>) => {
    try {
      window.localStorage.setItem(
        `fuel-overview-built-${selectedCompany.id}`,
        JSON.stringify([...phases]),
      );
    } catch {
      /* ignore storage failures */
    }
  }, [selectedCompany.id]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`fuel-overview-built-${selectedCompany.id}`);
      setOverviewBuiltPhases(raw ? new Set(JSON.parse(raw) as OverviewBuildPhase[]) : new Set());
    } catch {
      setOverviewBuiltPhases(new Set());
    }
  }, [selectedCompany.id]);
  const [recActionsTipOpen, setRecActionsTipOpen] = useState(false);
  /** True once this post-onboarding Overview build hit "ready" — tip may show even after the ready bar is dismissed. */
  const overviewContentReadyRef = useRef(false);

  useEffect(() => {
    if (tourOpen) return;
    if (tourTaken && !reloadLandingActive) return;
    if (profileCompletionPromptOpen) return;
    /** After "Maybe later", header Tour chip is shown — do not re-open the banner (module-first reload). */
    if (headerTourEnabled) return;
    if (!reloadLandingActive) {
      try {
        const snoozedUntil = Number(window.localStorage.getItem("fuelTourPromptSnoozedUntil") || 0);
        if (Date.now() < snoozedUntil) return;
      } catch {
        /* ignore storage failures */
      }
    }
    const building = Boolean(overviewBuildPhase && overviewBuildPhase !== "ready");
    const ready = profileComplete && (overviewBuildPhase === "ready" || overviewBuildPhase == null);
    if (reloadLandingActive || ready || building) {
      setShowTourPrompt(true);
    }
  }, [profileComplete, overviewBuildPhase, tourTaken, tourOpen, reloadLandingActive, headerTourEnabled, profileCompletionPromptOpen]);

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
        emptyText: "Connect marketing sources to see your Marketing snapshot",
        chips: [
          { label: "GTM dashboard access", color: "var(--btn-primary-bg)" },
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
        startOverviewBuild("summary", "full");
        return;
      }
      setActivePage("signals");
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activePage, startsWithOverview]);

  useEffect(() => {
    if (!overviewBuildActive) return;
    // Fresh build — tip must wait until Overview is fully ready.
    overviewContentReadyRef.current = false;
    setRecActionsTipOpen(false);
    resetRecActionsTipForOnboarding(selectedCompany.displayName);
  }, [overviewBuildActive, overviewBuildRun, selectedCompany.displayName]);

  useEffect(() => {
    if (!overviewBuildActive) return;

    const mode = overviewBuildModeRef.current;
    const targetPhase = overviewBuildTargetPhaseRef.current;
    const timers = mode === "full"
      ? [
          window.setTimeout(() => setOverviewBuildPhase("dev"), 4000),
          window.setTimeout(() => setOverviewBuildPhase("mkt"), 14000),
          window.setTimeout(() => setOverviewBuildPhase("rev"), 26000),
          window.setTimeout(() => setOverviewBuildPhase("suggestions"), 36000),
          window.setTimeout(() => setOverviewBuildPhase("ready"), 44000),
          window.setTimeout(() => {
            const allBuilt = new Set<OverviewBuildPhase>(OVERVIEW_ALL_BUILT_PHASES);
            setOverviewBuiltPhases(allBuilt);
            persistOverviewBuiltPhases(allBuilt);
            setOverviewBuildPhase(null);
            setOverviewBuildActive(false);
          }, 46000),
        ]
      : [
          window.setTimeout(() => {
            setOverviewBuiltPhases(prev => {
              const next = new Set(prev);
              next.add(targetPhase);
              if (next.has("dev") && next.has("mkt") && next.has("rev")) {
                next.add("suggestions");
              }
              persistOverviewBuiltPhases(next);
              return next;
            });
            setOverviewBuildPhase(null);
            setOverviewBuildActive(false);
          }, 4000),
        ];

    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [overviewBuildActive, overviewBuildRun, persistOverviewBuiltPhases]);

  // Queue tip only when Overview content is fully ready on the New tab — not Workspace.
  useEffect(() => {
    if (overviewBuildPhase !== "ready") return;
    overviewContentReadyRef.current = true;
    setOverviewBuildActive(false);
    if (isRecActionsTipDismissed(selectedCompany.displayName)) return;
    markRecActionsTipPending(selectedCompany.displayName);
  }, [overviewBuildPhase, selectedCompany.displayName]);

  // Returning to Overview after ready: show tip again if not yet dismissed.
  useEffect(() => {
    if (activePage !== "scorecard-v2") return;
    if (!overviewContentReadyRef.current) return;
    if (isRecActionsTipDismissed(selectedCompany.displayName)) return;
    if (!isRecActionsTipPending(selectedCompany.displayName)) return;
    setRecActionsTipOpen(true);
  }, [activePage, selectedCompany.displayName]);

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
    setShowTourCoachmark(false);
    setHeaderTourEnabled(true);
    setTourOpen(true);
    setTourStep(0);
    setActivePage("scorecard-v2");
    setTourIndex(0);
  }

  function dismissTourPrompt() {
    setShowTourPrompt(false);
    setHeaderTourEnabled(true);
    setShowTourCoachmark(true);
    if (reloadLandingActive) return;
    try {
      window.localStorage.setItem("fuelTourPromptSnoozedUntil", String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {
      // Ignore storage failures in preview/demo environments.
    }
  }

  function skipOverviewReadyPrompt() {
    setOverviewBuildPhase(null);
    setOverviewBuildActive(false);
    setTourTaken(false);
    setHeaderTourEnabled(true);
    setShowTourCoachmark(true);
  }

  function closeTour(completed = false) {
    setTourOpen(false);
    if (completed) {
      setTourTaken(true);
      setActivePage("scorecard-v2");
      setAskFuelOpen(false);
      setAccountTab("profile");
      setTourCompleteSignal(signal => signal + 1);
      window.scrollTo(0, 0);
      try {
        window.localStorage.setItem("fuelWorkspaceTourTakenAt", String(Date.now()));
        window.localStorage.setItem("fuelWorkspaceTourTaken", "true");
      } catch {
        // Ignore storage failures in preview/demo environments.
      }
      return;
    }
    if (startsWithTour || startsWithOverviewBuilding) {
      setActivePage("scorecard-v2");
    }
  }

  function skipTour() {
    closeTour(false);
    setTourTaken(false);
    setHeaderTourEnabled(true);
    setShowTourCoachmark(true);
    try {
      window.localStorage.removeItem("fuelWorkspaceTourTakenAt");
      window.localStorage.removeItem("fuelWorkspaceTourTaken");
    } catch {
      // Ignore storage failures in preview/demo environments.
    }
  }

  function nextTourStep() {
    const lastTourStep = tourSteps.length - 1;
    if (tourStep >= lastTourStep) {
      closeTour(true);
      return;
    }
    setTourIndex(tourStep + 1);
  }

  function previousTourStep() {
    setTourIndex(tourStep - 1);
  }

  const isAccountPage = activePage === "account";
  const isHelpPage = activePage === "help";
  const isCompanyProfilePage = activePage === "company-profile";
  const isInvestorShellPage = activePage === "investor-home"
    || activePage === "investor-portfolios"
    || activePage === "investor-pipeline"
    || activePage === "investor-watchlists";
  const investorDashboardSection: InvestorDashboardSection =
    activePage === "investor-pipeline" ? "pipeline"
      : activePage === "investor-watchlists" ? "watchlists"
        : "portfolios"; // home dashboard hidden — portfolios is the investor landing
  const breadcrumbLabel = isAccountPage
    ? `Account · ${accountTabLabel(accountTab)}`
    : isHelpPage
      ? "Help & FAQ"
    : isCompanyProfilePage
      ? `${selectedCompany.displayName} profile`
    : activePage === "investor-portfolios" || activePage === "investor-home" ? "Portfolios"
      : activePage === "investor-pipeline" ? "Pipeline"
        : activePage === "investor-watchlists" ? "Watchlists"
          : isInvestorShellPage
            ? "Portfolios"
            : "Company";

  const founderBenchmarkForm = useMemo(
    () => reloadLandingActive
      ? EMPTY_BENCHMARK_FORM
      : resolveBenchmarkFormValues(benchmarkSubmission, initialBenchmark),
    [benchmarkSubmission, initialBenchmark, reloadLandingActive],
  );
  const investorBenchmarkForm = useMemo(
    () => resolveBenchmarkFormValues(investorBenchmarkByCompany[selectedCompany.id], null),
    [investorBenchmarkByCompany, selectedCompany.id],
  );
  const scorecardBenchmarkForm = usesPerCompanyWorkspace ? investorBenchmarkForm : founderBenchmarkForm;
  const scorecardBenchmark = useMemo(
    () => formValuesToOnboardingBenchmark(scorecardBenchmarkForm),
    [scorecardBenchmarkForm],
  );
  const scorecardBenchmarkPeriod = usesPerCompanyWorkspace
    ? investorBenchmarkByCompany[selectedCompany.id]?.period
    : benchmarkSubmission?.period;

  /** Tour chip in the top bar — same entry point across all overview designs. */
  const effectiveTourTaken = tourTaken && !reloadLandingActive;

  const workspaceInitiativesCount = useMemo(() => {
    const items = usesPerCompanyWorkspace
      ? investorInitiativesByCompany[selectedCompany.id] ?? []
      : founderInitiatives;
    return countWorkspaceInitiatives(items);
  }, [usesPerCompanyWorkspace, investorInitiativesByCompany, selectedCompany.id, founderInitiatives]);

  const dataRoomCount = useMemo(
    () => (usesPerCompanyWorkspace ? 0 : countActiveDocuments(documentSlots)),
    [usesPerCompanyWorkspace, documentSlots],
  );

  const intelligenceTabCount = useMemo(
    () => investorScopedIntelligence.length,
    [investorScopedIntelligence],
  );

  const contextFeedTabCount = useMemo(() => {
    if (showPublicCompanyProfile) {
      return getThirdPartyContextFeed(selectedCompany.id, selectedCompany.displayName).length;
    }
    return getPendingSources(manualPendingSources, documentSlots).length;
  }, [
    showPublicCompanyProfile,
    selectedCompany.id,
    selectedCompany.displayName,
    manualPendingSources,
    documentSlots,
  ]);

  const researchTabCount = useMemo(() => {
    if (showPublicCompanyProfile) return 0;
    // Research surfaces funding + company facts once the profile has content.
    return profileComplete ? 2 : 0;
  }, [showPublicCompanyProfile, profileComplete]);

  const mobileNavToggleButton = (
    <button
      type="button"
      className="mobile-nav-toggle"
      aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={mobileNavOpen}
      onClick={() => setMobileNavOpen(open => !open)}
    >
      <span className="mobile-nav-toggle-icon" aria-hidden="true">
        <span />
      </span>
    </button>
  );

  return (
    <AccountSettingsNavProvider openAccountSettings={openAccountSettings}>
    <SkipLink />
    <div className={`app${mobileNavOpen ? " is-mobile-nav-open" : ""}${profilePromptBlocking ? " is-profile-prompt-gated" : ""}`}>
      <button
        type="button"
        className="mobile-nav-scrim"
        aria-label="Close navigation"
        onClick={() => setMobileNavOpen(false)}
      />
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="brand">
          <div className="brand-logo" aria-hidden="true">Y</div>
          <div>
            <div className="brand-name">YORK·IE</div>
            <div className="brand-sub">FUEL 2.0</div>
          </div>
        </div>
        <div
          className="account-card"
          onClick={openAccountHome}
          role="button"
          tabIndex={0}
          aria-label="Open My Account"
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openAccountHome();
            }
          }}
        >
          <div className="account-avatar">M</div>
          <div className="account-name">My Account</div>
        </div>
        <nav className="sidebar-nav" aria-label="Primary">
        <div className="nav-section">
          <div className="nav-label">{isInvestorPersona ? "Fund" : "Research"}</div>
          <SidebarNavItem
            icon="watchlists"
            label="Watchlists"
            active={activePage === "investor-watchlists"}
            interactive={isInvestorPersona}
            onClick={isInvestorPersona ? () => setActivePage("investor-watchlists") : undefined}
          />
          <SidebarNavItem
            icon="pipeline"
            label="Pipeline"
            count={isInvestorPersona ? "13" : "0"}
            active={activePage === "investor-pipeline"}
            interactive={isInvestorPersona}
            onClick={isInvestorPersona ? () => setActivePage("investor-pipeline") : undefined}
          />
        </div>
        <div className="nav-section">
          <div className="nav-label">Portfolio</div>
          <SidebarNavItem
            icon="portfolios"
            label="Portfolios"
            count={isInvestorPersona ? "3" : undefined}
            active={activePage === "investor-portfolios"}
            interactive={isInvestorPersona}
            onClick={isInvestorPersona ? () => setActivePage("investor-portfolios") : undefined}
          />
        </div>
        <div className="nav-section">
          <div className="nav-label">Value creation</div>
          <SidebarNavItem icon="initiatives" label="Initiatives" count="0" />
          <SidebarNavItem icon="benchmarks" label="Benchmarks" />
          <SidebarNavItem icon="playbooks" label="Playbooks" />
        </div>
        <div className="nav-section">
          <div className="nav-label">Integrations</div>
          <SidebarNavItem
            icon="connectors"
            label="Connectors"
            count="13"
            onClick={() => setActivePage("connectors")}
          />
        </div>
        <div className="nav-section">
          <div className="nav-label">Network</div>
          <SidebarNavItem icon="advisors" label="Advisors" count="32" />
          <SidebarNavItem icon="serviceProviders" label="Service providers" count="0" />
          <SidebarNavItem icon="investors" label="Investors" count="0" />
        </div>
        <div className="nav-section">
          <div className="nav-label">Recently viewed</div>
          {recentCompanies.map(company => (
            <div
              key={company.id}
              className={`recent-item${selectedCompany.id === company.id && !isInvestorShellPage ? " active" : ""}`}
              style={{ cursor: "pointer" }}
              role="button"
              tabIndex={0}
              aria-label={`Open ${company.displayName}`}
              aria-current={selectedCompany.id === company.id && !isInvestorShellPage ? "page" : undefined}
              onClick={() => openRecentCompany(company.id)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openRecentCompany(company.id);
                }
              }}
            >
              <CompanyBrandMark company={company} className="recent-favicon" size={14} />
              {company.displayName}
            </div>
          ))}
        </div>
        </nav>
        <SidebarProfileFooter
          onOpenAccountSettings={openAccountSettings}
          onOpenHelp={() => setActivePage("help")}
          onLogout={onLogout}
          yorkUpsellReady={profileComplete && (overviewBuildPhase == null || overviewBuildPhase === "ready")}
          profileComplete={profileComplete}
          earnedProfileCredits={earnedProfileCredits}
          userFullName={initialOnboardingAnswers?.userFullName?.trim() || "Shreya Gokani"}
          userEmail={
            initialOnboardingAnswers?.userFullName
              ? `${initialOnboardingAnswers.userFullName.trim().toLowerCase().replace(/\s+/g, ".")}@york.ie`
              : "shreya.g@york.ie"
          }
        />
      </aside>

      <main id="main" className="main" tabIndex={-1}>
        {activePage === "connectors" ? (
          <div
            className={tourOpen && tourSteps[tourStep].target === "connectors-page" ? "tour-highlight" : undefined}
            data-tour-target={tourOpen && tourSteps[tourStep].target === "connectors-page" ? "connectors-page" : undefined}
          >
            <ConnectorsPage onComplete={() => setActivePage("journey")} embedded />
          </div>
        ) : activePage === "company-profile" ? (
          <>
            <div className="topbar">
              <div className="topbar-left">
                {mobileNavToggleButton}
                <nav className="breadcrumb" aria-label="Breadcrumb">
                  <span>Fuel</span>
                  <span aria-hidden="true" style={{ margin: "0 5px", color: "var(--text-4)" }}>/</span>
                  <span className="current" aria-current="page">{breadcrumbLabel}</span>
                </nav>
                <h1 className="sr-only">{breadcrumbLabel}</h1>
              </div>
              <div className="topbar-right">
                <TopbarCompanySearch />
                <AskFuelAiButton onOpen={() => { setBriefFocusSignal(0); setAskFuelOpen(true); }} />
              </div>
            </div>
            <div className="content content--profile-page">
              <CompanyProfilePage
                key={`company-profile-${selectedCompany.id}-${isOwnCompany ? "own" : "readonly"}`}
                companyName={selectedCompany.displayName}
                companyKey={selectedCompany.id}
                onboardingAnswers={isOwnCompany ? initialOnboardingAnswers : null}
                reloadLandingActive={reloadLandingActive}
                userFullName={isOwnCompany ? (initialOnboardingAnswers?.userFullName?.trim() || "Shreya Gokani") : undefined}
                userRole={isOwnCompany ? initialOnboardingAnswers?.userRole : undefined}
                userEmail={
                  isOwnCompany
                    ? (initialOnboardingAnswers?.userFullName
                      ? `${initialOnboardingAnswers.userFullName.trim().toLowerCase().replace(/\s+/g, ".")}@york.ie`
                      : "shreya.g@york.ie")
                    : undefined
                }
                syncKey={profileDetailsSyncKey}
                benchmarkValues={isOwnCompany ? scorecardBenchmarkForm : investorBenchmarkForm}
                benchmarkEarned={isOwnCompany
                  ? Boolean(earnedProfileCredits.benchmark && earnedProfileCredits.benchmarkViaSubmit)
                  : false}
                cohortLabel={selectedCompany.meta}
                companyMeta={selectedCompany.meta}
                companyDomain={selectedCompany.domain}
                profileSnapshot={resolveCompanyProfileSnapshot(selectedCompany.id)}
                initialTab={profilePreviewTab}
                canEdit={isOwnCompany}
                onBack={closeCompanyProfilePage}
                onEditProfile={requestEditProfileFromPreview}
                onEditBenchmark={requestEditBenchmarkFromPreview}
              />
            </div>
          </>
        ) : activePage === "account" ? (
          <>
            <div className="topbar">
              <div className="topbar-left">
                {mobileNavToggleButton}
                <nav className="breadcrumb" aria-label="Breadcrumb">
                  <span>Fuel</span>
                  <span aria-hidden="true" style={{ margin: "0 5px", color: "var(--text-4)" }}>/</span>
                  <span className="current" aria-current="page">{breadcrumbLabel}</span>
                </nav>
                <h1 className="sr-only">{breadcrumbLabel}</h1>
              </div>
              <div className="topbar-right">
                <TopbarCompanySearch />
                <AskFuelAiButton onOpen={() => { setBriefFocusSignal(0); setAskFuelOpen(true); }} />
              </div>
            </div>
            <div
              className={`content${tourOpen && tourSteps[tourStep].target === "account-settings" ? " tour-highlight" : ""}`}
              data-tour-target={tourOpen && tourSteps[tourStep].target === "account-settings" ? "account-settings" : undefined}
            >
              <AccountSettings tab={accountTab} onTabChange={setAccountTab} onLogout={onLogout} />
            </div>
          </>
        ) : activePage === "help" ? (
          <>
            <div className="topbar">
              <div className="topbar-left">
                {mobileNavToggleButton}
                <nav className="breadcrumb" aria-label="Breadcrumb">
                  <span>Fuel</span>
                  <span aria-hidden="true" style={{ margin: "0 5px", color: "var(--text-4)" }}>/</span>
                  <span className="current" aria-current="page">{breadcrumbLabel}</span>
                </nav>
                <h1 className="sr-only">{breadcrumbLabel}</h1>
              </div>
              <div className="topbar-right">
                <TopbarCompanySearch />
                <AskFuelAiButton onOpen={() => { setBriefFocusSignal(0); setAskFuelOpen(true); }} />
              </div>
            </div>
            <div className="content">
              <FuelHelpFaqPage
                onBack={() => setActivePage(isInvestorPersona ? "investor-portfolios" : "scorecard-v2")}
              />
            </div>
          </>
        ) : (<><div className={`topbar${showTourCoachmark ? " has-tour-coachmark" : ""}`}>
          <div className="topbar-left">
            {mobileNavToggleButton}
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span>Fuel</span>
              <span aria-hidden="true" style={{ margin: "0 5px", color: "var(--text-4)" }}>/</span>
              <span className="current" aria-current="page">{breadcrumbLabel}</span>
            </nav>
            <h1 className="sr-only">{breadcrumbLabel}</h1>
          </div>
          <div className="topbar-right">
            <TopbarCompanySearch />
            <span
              data-tour-target="ask-fuel-ai"
              className={tourOpen && tourSteps[tourStep].target === "ask-fuel-ai" ? "tour-highlight" : undefined}
              style={{ display: "inline-flex" }}
            >
              <AskFuelAiButton onOpen={() => { setBriefFocusSignal(0); setAskFuelOpen(true); }} />
            </span>
            {!effectiveTourTaken && headerTourEnabled ? (
              <div className={`header-tour-wrap${showTourCoachmark ? " is-coachmark" : ""}`}>
                <button
                  type="button"
                  className={`header-btn header-tour-btn${showTourCoachmark ? " is-pointed" : ""}`}
                  data-tour-target="header-tour"
                  onClick={startTour}
                >
                  <span className="header-tour-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 3.5v2.2M8 10.3V12.5M3.5 8h2.2M10.3 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
                    </svg>
                  </span>
                  Tour
                </button>
                {showTourCoachmark ? (
                  <div className="header-tour-coachmark" role="status">
                    <span className="header-tour-coachmark-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 3.5v2.2M8 10.3V12.5M3.5 8h2.2M10.3 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="8" cy="8" r="1.6" fill="currentColor" />
                      </svg>
                    </span>
                    <p>You can click here later to take a tour of the platform.</p>
                    <button type="button" onClick={() => setShowTourCoachmark(false)}>OK</button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <span style={{ fontSize: "12px", color: "var(--text-3)" }}>Q4 '25 · Nov 8</span>
          </div>
        </div>

        {!isInvestorShellPage ? <div className="company-header">
          <div className={`company-card${showPublicCompanyProfile ? " is-external" : ""}`}>
            <div
              className="company-identity-block"
            >
              <CompanyBrandMark company={selectedCompany} className="company-logo" size={48} />
              <div className="company-identity">
                <div className="company-name-row">
                  <div className="company-name">{selectedCompany.displayName}</div>
                  {showPublicCompanyProfile ? (
                    <>
                      <span className="company-industry-tag">
                        {selectedCompany.meta.split("·")[0]?.trim() || "Company"}
                      </span>
                      <a
                        className="company-domain-link"
                        href={`https://${selectedCompany.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedCompany.domain}
                      </a>
                    </>
                  ) : (
                    <span className="badge">{selectedCompany.domain}</span>
                  )}
                </div>
                <div className="company-meta">
                  {showPublicCompanyProfile ? (
                    <span>
                      {isOwnCompany
                        ? "Public profile — sourced from Crunchbase"
                        : "External company — sourced from fuel-data"}
                    </span>
                  ) : (
                    <>
                      <span>Engaged Feb 2024</span>
                      <span className="dot" />
                      <span>{selectedCompany.meta}</span>
                      <span className="dot" />
                      <span>9 months active</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="header-actions">
              {isOwnCompany && !viewingPublicCompanyProfile ? (
                <button
                  type="button"
                  className="initiatives-secondary-btn"
                  onClick={openPublicCompanyProfile}
                >
                  <FuelIcon name="publicProfile" size={14} />
                  View Public Profile
                </button>
              ) : null}
              {isOwnCompany && viewingPublicCompanyProfile ? (
                <button
                  type="button"
                  className="initiatives-secondary-btn"
                  onClick={exitPublicCompanyProfile}
                >
                  Back to Product
                </button>
              ) : null}
              {usesPerCompanyWorkspace ? (
                <button type="button" className="company-add-list-btn">
                  + Add to list
                </button>
              ) : null}
              <AiActionsMenu
                companyName={selectedCompany.displayName}
                tourActive={
                  tourOpen
                  && (tourSteps[tourStep].target === "ai-actions-playbooks"
                    || tourSteps[tourStep].target === "ai-actions-brief")
                }
                tourHighlightItem={
                  tourOpen && tourSteps[tourStep].target === "ai-actions-playbooks"
                    ? "playbooks"
                    : tourOpen && tourSteps[tourStep].target === "ai-actions-brief"
                      ? "brief"
                      : undefined
                }
                onRunPlaybook={(pb) => {
                  setLastPlaybook({ name: pb.name, kind: pb.kind, description: pb.description, category: pb.category });
                  setPendingPlaybook(pb);
                  setPlaybookFocusSignal(s => s + 1);
                  setAskFuelOpen(true);
                }}
                onGenerateBrief={() => {
                  setBriefFocusSignal(s => s + 1);
                  setAskFuelOpen(true);
                }}
              />
            </div>
          </div>
        </div> : null}

        {!isInvestorShellPage ? <div
          className={`tabs${tourOpen && tourSteps[tourStep].target === "main-navigation" ? " tour-highlight" : ""}`}
          data-tour-target={tourOpen && tourSteps[tourStep].target === "main-navigation" ? "main-navigation" : undefined}
        >
          <div className={`tab ${activePage === "scorecard-v2" ? "active" : ""} ${tourOpen && tourSteps[tourStep].target === "tab-overview" ? "tour-highlight" : ""}`} data-tour-target={tourOpen && tourSteps[tourStep].target === "tab-overview" ? "tab-overview" : undefined} onClick={() => setActivePage("scorecard-v2")}>Overview</div>
          <div
            className={`tab ${activePage === "signals" ? "active" : ""} ${tourOpen && tourSteps[tourStep].target === "signals" ? "tour-highlight" : ""}`}
            data-tour-target={tourOpen && tourSteps[tourStep].target === "signals" ? "signals" : undefined}
            title={!profileComplete ? "Complete your profile for better intelligence and more credits" : undefined}
            onClick={() => setActivePage("signals")}
          >
            Intelligence
            <TabCount count={intelligenceTabCount} label="intelligence items" />
          </div>
          <div
            className={`tab ${activePage === "context-feed" ? "active" : ""}`}
            title={!profileComplete ? "Complete your profile for better intelligence and more credits" : undefined}
            onClick={() => setActivePage("context-feed")}
          >
            Context Feed
            <TabCount count={contextFeedTabCount} label="context sources" />
          </div>
          <div
            className={`tab ${activePage === "initiatives" ? "active" : ""} ${tourOpen && tourSteps[tourStep].target === "initiatives" ? "tour-highlight" : ""}`}
            data-tour-target={tourOpen && tourSteps[tourStep].target === "initiatives" ? "initiatives" : undefined}
            title={!profileComplete ? "Complete your profile for better intelligence and more credits" : undefined}
            onClick={() => {
              setFocusInitiativeId(null);
              setActivePage("initiatives");
            }}
          >
            Initiatives
            <TabCount count={workspaceInitiativesCount} label="initiatives" />
          </div>
          <div
            className={`tab ${activePage === "overview" ? "active" : ""}`}
            onClick={() => setActivePage("overview")}
          >
            Research
            <TabCount count={researchTabCount} label="research records" />
          </div>
          <div
            className={`tab ${activePage === "data-room" ? "active" : ""} ${tourOpen && tourSteps[tourStep].target === "data-room" ? "tour-highlight" : ""}`}
            data-tour-target={tourOpen && tourSteps[tourStep].target === "data-room" ? "data-room" : undefined}
            onClick={() => setActivePage("data-room")}
          >
            Data Room
            <TabCount count={dataRoomCount} label="documents" />
          </div>
        </div> : null}

        {showTourPrompt ? (
          <TourPromptBanner
            onStartTour={startTour}
            onDismiss={dismissTourPrompt}
            building={Boolean(overviewBuildPhase && overviewBuildPhase !== "ready")}
            reloadLanding={reloadLandingActive}
          />
        ) : null}

        {overviewBuildPhase
          && overviewBuildPhase !== "ready"
          && activePage !== "scorecard-v2"
          && !usesPerCompanyWorkspace ? (
          <div className="intel-building-banner" role="status">
            <span>Building Overview</span>
            <strong>Fuel is still generating scores and advisor context.</strong>
            <em>Other tabs stay usable — Overview updates when ready.</em>
          </div>
        ) : null}

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
            <DevelopmentDetailPage
              onBack={() => setActivePage("journey")}
            />
          ) : activePage === "marketing" ? (
            <MarketingDetailPage onBack={() => setActivePage("journey")} />
          ) : isInvestorShellPage ? (
            <InvestorDashboard
              fundName={fundName}
              section={investorDashboardSection}
              hubspotConnected={Boolean(initialOnboardingAnswers?.hubspotConnected)}
              onOpenCompany={openInvestorCompany}
              onOpenCompanyProfile={openInvestorCompanyProfile}
              onOpenAccount={() => openAccountSettings("overview")}
              onNavigateSection={(next) => {
                setActivePage(
                  next === "portfolios" ? "investor-portfolios"
                    : next === "pipeline" ? "investor-pipeline"
                      : "investor-watchlists",
                );
              }}
            />
          ) : activePage === "signals-loading" ? (
            <SignalsLoadingPage />
          ) : activePage === "signals" ? (
            <SignalsPage
              isProfileComplete={profileComplete}
              onLogBenchmarkData={openBenchmarkDrawer}
              onLinkConnectors={() => setActivePage("connectors")}
              documentSlots={usesPerCompanyWorkspace ? [] : documentSlots}
              processingDocumentTypeId={usesPerCompanyWorkspace ? null : processingDocumentTypeId}
              onUploadDocument={(typeId, typeLabel, file) => {
                if (usesPerCompanyWorkspace) return;
                handleDocumentUpload(typeId, typeLabel, file, "Intelligence · Private upload");
              }}
              onPersistSourceDocument={(typeId, typeLabel, file, intelligenceIds) => {
                if (usesPerCompanyWorkspace) return;
                persistSourceDocument(typeId, typeLabel, file, intelligenceIds, "Intelligence · Source upload");
              }}
              onOpenDataRoom={() => setActivePage("data-room")}
              intelligenceItems={investorScopedIntelligence}
              setIntelligenceItems={setScopedIntelligenceItems}
              intelligenceFocus={intelligenceFocus}
              onClearIntelligenceFocus={() => setIntelligenceFocus(null)}
              onFocusIntelligence={setIntelligenceFocus}
              benchmarkSubmission={benchmarkSubmission}
              benchmark={scorecardBenchmark}
              companyName={selectedCompany.displayName}
              onBenchmarkChange={(next) => {
                applyBenchmarkSubmission(toBenchmarkFormValues(next));
              }}
              benchmarkBlinkIds={benchmarkBlinkIds}
              activeTourTarget={tourOpen ? tourSteps[tourStep].target : undefined}
              manualPendingSources={manualPendingSources}
              onGenerateFromPending={handleGenerateFromPending}
              onDismissPendingSource={handleDismissPendingSource}
              onAttemptSourceGeneration={handleAttemptSourceGeneration}
            />
          ) : activePage === "overview" ? (
            showPublicCompanyProfile ? (
              <ThirdPartyResearchEmpty
                companyName={selectedCompany.displayName}
                onGenerateBrief={() => {
                  setBriefFocusSignal(s => s + 1);
                  setAskFuelOpen(true);
                }}
              />
            ) : (
              <OverviewPage
                activeTourTarget={tourOpen ? tourSteps[tourStep].target : undefined}
                profileComplete={profileComplete}
                onEditProfile={() => {
                  if (!isOwnCompany) return;
                  openProfileDrawer("company");
                }}
                onManageInitiatives={() => {
                  setFocusInitiativeId(null);
                  setActivePage("initiatives");
                }}
                company={selectedCompany}
                visitorMode={false}
              />
            )
          ) : activePage === "context-feed" ? (
            showPublicCompanyProfile ? (
              <ThirdPartyContextFeed
                companyId={selectedCompany.id}
                companyName={selectedCompany.displayName}
              />
            ) : (
            <SignalsPage
              isProfileComplete={profileComplete}
              onLogBenchmarkData={openBenchmarkDrawer}
              onLinkConnectors={() => setActivePage("connectors")}
              documentSlots={documentSlots}
              processingDocumentTypeId={processingDocumentTypeId}
              onUploadDocument={(typeId, typeLabel, file) => handleDocumentUpload(typeId, typeLabel, file, "Intelligence · Private upload")}
              onPersistSourceDocument={(typeId, typeLabel, file, intelligenceIds) => (
                persistSourceDocument(typeId, typeLabel, file, intelligenceIds, "Intelligence · Source upload")
              )}
              onOpenDataRoom={() => setActivePage("data-room")}
              intelligenceItems={investorScopedIntelligence}
              setIntelligenceItems={setScopedIntelligenceItems}
              intelligenceFocus={intelligenceFocus}
              onClearIntelligenceFocus={() => setIntelligenceFocus(null)}
              onFocusIntelligence={setIntelligenceFocus}
              benchmarkSubmission={benchmarkSubmission}
              benchmark={scorecardBenchmark}
              companyName={selectedCompany.displayName}
              onBenchmarkChange={(next) => {
                applyBenchmarkSubmission(toBenchmarkFormValues(next));
              }}
              benchmarkBlinkIds={benchmarkBlinkIds}
              activeTourTarget={tourOpen ? tourSteps[tourStep].target : undefined}
              manualPendingSources={manualPendingSources}
              onGenerateFromPending={handleGenerateFromPending}
              onDismissPendingSource={handleDismissPendingSource}
              onAttemptSourceGeneration={handleAttemptSourceGeneration}
            />
            )
          ) : activePage === "initiatives" ? (
            <InitiativesPage
              investorMode={usesPerCompanyWorkspace}
              items={usesPerCompanyWorkspace
                ? investorInitiativesByCompany[selectedCompany.id] ?? []
                : founderInitiatives}
              focusInitiativeId={focusInitiativeId}
              onClearFocus={() => setFocusInitiativeId(null)}
              availableIntelligence={investorScopedIntelligence}
              yorkAnswers={initialOnboardingAnswers}
              onLogIntelligence={item => {
                setScopedIntelligenceItems(previous => [item, ...previous]);
              }}
              onCreate={initiative => {
                if (usesPerCompanyWorkspace) {
                  setInvestorInitiativesByCompany(previous => ({
                    ...previous,
                    [selectedCompany.id]: [...(previous[selectedCompany.id] ?? []), initiative],
                  }));
                } else {
                  setFounderInitiatives(previous => [...previous, initiative]);
                }
                setFocusInitiativeId(initiative.id);
              }}
              onUpdate={initiative => {
                if (usesPerCompanyWorkspace) {
                  setInvestorInitiativesByCompany(previous => ({
                    ...previous,
                    [selectedCompany.id]: (previous[selectedCompany.id] ?? []).map(item => (
                      item.id === initiative.id ? initiative : item
                    )),
                  }));
                } else {
                  setFounderInitiatives(previous => previous.map(item => (
                    item.id === initiative.id ? initiative : item
                  )));
                }
              }}
              onDelete={id => {
                if (usesPerCompanyWorkspace) {
                  setInvestorInitiativesByCompany(previous => ({
                    ...previous,
                    [selectedCompany.id]: (previous[selectedCompany.id] ?? []).filter(item => item.id !== id),
                  }));
                } else {
                  setFounderInitiatives(previous => previous.filter(item => item.id !== id));
                }
                if (focusInitiativeId === id) setFocusInitiativeId(null);
              }}
            />
          ) : activePage === "data-room" ? (
            <DataRoomPage
              documentSlots={documentSlots}
              processingDocumentTypeId={processingDocumentTypeId}
              onUploadDocument={(typeId, typeLabel, file) => handleDocumentUpload(typeId, typeLabel, file, "Data Room · Private upload")}
              onViewIntelligence={handleViewIntelligenceFromDataRoom}
              onOpenDocumentHistory={setDocumentHistorySlot}
              investorMode={usesPerCompanyWorkspace}
              investorAccessRequested={Boolean(dataRoomAccessRequests[selectedCompany.id])}
              companyName={selectedCompany.displayName}
              onRequestDataRoomAccess={() => setDataRoomAccessRequests(previous => ({
                ...previous,
                [selectedCompany.id]: true,
              }))}
            />
          ) : activePage === "scorecard-v2" ? (
            showPublicCompanyProfile ? (
              <ThirdPartyCompanyOverview
                company={selectedCompany}
                showCrunchbaseNotice={isOwnCompany && viewingPublicCompanyProfile}
                onOpenInitiatives={() => {
                  setFocusInitiativeId(null);
                  setActivePage("initiatives");
                }}
              />
            ) : (
            <ScorecardV2
              benchmark={scorecardBenchmark}
              onBenchmarkChange={(next) => {
                applyBenchmarkSubmission(toBenchmarkFormValues(next));
              }}
              onBenchmarkSaved={() => {
                setProfileDetailsSyncKey(key => key + 1);
                startOverviewBuild("summary", "single");
              }}
              onBenchmarkEarlyUnlock={() => {
                const { earned } = tryMarkBenchmarkEarned(selectedCompany.id);
                setEarnedProfileCredits(earned);
                setProfileDetailsSyncKey(key => key + 1);
                startOverviewBuild("summary", "single");
              }}
              cohortLabel={selectedCompany.meta}
              companyName={selectedCompany.displayName}
              journeyStage="Early Revenue"
              intelligenceItems={investorScopedIntelligence.map(item => ({
                id: item.id,
                type: item.type,
                text: item.text,
                title: item.title,
                highlight: item.highlight,
              }))}
              profileMeta={{
                sector: selectedCompany.meta,
                employees: selectedCompany.employees,
                headquarters: selectedCompany.headquarters,
                domain: selectedCompany.domain,
              }}
              benchmarkContext={
                usesPerCompanyWorkspace
                  ? (investorBenchmarkByCompany[selectedCompany.id]
                    ? {
                        notableCustomers: investorBenchmarkByCompany[selectedCompany.id]!.formValues.notableCustomers,
                        notableHires: investorBenchmarkByCompany[selectedCompany.id]!.formValues.notableHires,
                        biggestChallenges: investorBenchmarkByCompany[selectedCompany.id]!.formValues.biggestChallenges,
                        otherUpdates: investorBenchmarkByCompany[selectedCompany.id]!.formValues.otherUpdates,
                        openToIntros: investorBenchmarkByCompany[selectedCompany.id]!.formValues.openToIntros,
                      }
                    : undefined)
                  : (benchmarkSubmission ? {
                      notableCustomers: benchmarkSubmission.formValues.notableCustomers,
                      notableHires: benchmarkSubmission.formValues.notableHires,
                      biggestChallenges: benchmarkSubmission.formValues.biggestChallenges,
                      otherUpdates: benchmarkSubmission.formValues.otherUpdates,
                      openToIntros: benchmarkSubmission.formValues.openToIntros,
                    } : undefined)
              }
              documentSlots={usesPerCompanyWorkspace ? [] : documentSlots.map(slot => ({
                typeId: slot.typeId,
                typeLabel: slot.typeLabel,
                current: slot.current ? { name: slot.current.name } : null,
              }))}
              efficiencyExtras={(() => {
                if (!hasFilledBenchmarkMetric(scorecardBenchmarkForm) && !scorecardBenchmarkPeriod) return undefined;
                return {
                  cacPayback: scorecardBenchmarkForm.cacPayback,
                  burnMultiple: scorecardBenchmarkForm.burnMultiple,
                  period: scorecardBenchmarkPeriod ?? BENCHMARK_PERIOD,
                };
              })()}
              activeInitiatives={(usesPerCompanyWorkspace
                ? investorInitiativesByCompany[selectedCompany.id] ?? []
                : founderInitiatives
              ).map(item => ({
                id: item.id,
                title: item.title,
                description: item.description,
                pillar: item.pillar,
                status: item.status,
                due: item.due,
                owner: item.owner,
                progress: 0,
              }))}
              onAddInitiative={(initiative) => {
                const next = createInitiativeRecord({
                  id: initiative.id,
                  title: initiative.title,
                  description: initiative.description,
                  pillar: initiative.pillar ?? "mkt",
                  kind: "continuous",
                  status: "Active",
                  assignees: [DEFAULT_INITIATIVE_ASSIGNEE],
                });
                if (usesPerCompanyWorkspace) {
                  setInvestorInitiativesByCompany(previous => {
                    const existing = previous[selectedCompany.id] ?? [];
                    if (existing.some(item => item.title.trim().toLowerCase() === next.title.trim().toLowerCase())) {
                      return previous;
                    }
                    return {
                      ...previous,
                      [selectedCompany.id]: [...existing, next],
                    };
                  });
                } else {
                  setFounderInitiatives(previous => (
                    previous.some(item => item.title.trim().toLowerCase() === next.title.trim().toLowerCase())
                      ? previous
                      : [...previous, next]
                  ));
                }
              }}
              onViewInitiative={(id) => {
                setFocusInitiativeId(id);
                setActivePage("initiatives");
              }}
              onUploadPitchDeck={() => setActivePage("data-room")}
              onOpenIntelligence={() => {
                if (!profileComplete) {
                  setActivePage("scorecard-v2");
                  return;
                }
                setActivePage("signals");
              }}
              onOpenInitiatives={() => {
                if (!profileComplete) {
                  setActivePage("scorecard-v2");
                  return;
                }
                setActivePage("initiatives");
              }}
              onGenerateInitiative={() => {
                if (!profileComplete) {
                  setActivePage("scorecard-v2");
                  return;
                }
                setActivePage("initiatives");
              }}
              onRunPlaybook={() => {
                if (!profileComplete) {
                  setActivePage("scorecard-v2");
                  return;
                }
                setPlaybookFocusSignal(s => s + 1);
                setAskFuelOpen(true);
              }}
              onAddSources={() => {
                if (!profileComplete) {
                  openBenchmarkDrawer();
                  return;
                }
                setActivePage("signals");
              }}
              onAddDetails={() => setActivePage("scorecard-v2")}
              onboardingAnswers={usesPerCompanyWorkspace ? null : initialOnboardingAnswers}
              isProfileComplete={profileComplete}
              userFirstName={(initialOnboardingAnswers?.userFullName || "there").trim().split(/\s+/)[0]}
              onStartProfileCompletion={(section) => {
                if (!isOwnCompany) return;
                openProfileDrawer(section ?? "company");
              }}
              onOpenProfileDetails={(section) => {
                if (!isOwnCompany) return;
                if (section === "dev" || section === "mkt" || section === "rev") {
                  const moduleMap = { dev: "dev", mkt: "gtm", rev: "rev" } as const;
                  openProfileDrawer(moduleMap[section]);
                  return;
                }
                openProfileDrawer(section === "company" ? "company" : "company");
              }}
              profileDetailsSyncKey={profileDetailsSyncKey}
              profileDrawerOpen={profileDrawerOpen}
              reloadLandingActive={reloadLandingActive}
              tourCompleteSignal={tourCompleteSignal}
              benchmarkEditRequestKey={benchmarkEditRequestKey}
              benchmarkEditSide={benchmarkEditSide}
              onBenchmarkEditClosed={handleBenchmarkEditClosedFromPreview}
              onOpenProfilePreview={openProfilePreview}
              onLandingContentRestore={() => {
                setReloadLandingActive(false);
                setShowTourPrompt(false);
                setHeaderTourEnabled(true);
                startOverviewBuild("summary", "full");
              }}
              earnedProfileCredits={earnedProfileCredits}
              companyKey={selectedCompany.id}
              onProfileCreditsChange={setEarnedProfileCredits}
              onProfileCreditReward={showProfileCreditReward}
              brief={generatedBrief}
              lastPlaybook={lastPlaybook}
              onDismissPlaybook={() => setLastPlaybook(null)}
              onViewBrief={() => { setBriefFocusSignal(s => s + 1); setAskFuelOpen(true); }}
              onAskFuel={() => { setBriefFocusSignal(0); setAskFuelOpen(true); }}
              activeTourTarget={tourOpen ? tourSteps[tourStep].target : undefined}
              workspaceIntroOpen={investorOverviewIntroCompanyId === selectedCompany.id}
              onDismissWorkspaceIntro={() => setInvestorOverviewIntroCompanyId(null)}
              onWorkspaceActivity={() => tryUnlockInvestorOverview(selectedCompany.id)}
              privateWorkspaceLabel={usesPerCompanyWorkspace ? "Your private workspace" : undefined}
              overviewBuildPhase={overviewBuildPhase}
              overviewBuiltPhases={overviewBuiltPhases}
              overviewBuildActive={overviewBuildActive}
              recActionsTipOpen={recActionsTipOpen}
              onDismissRecActionsTip={() => {
                dismissRecActionsTip(selectedCompany.displayName);
                setRecActionsTipOpen(false);
              }}
              onStartOptionalTour={
                !effectiveTourTaken
                  ? () => {
                      setOverviewBuildPhase(null);
                      setOverviewBuildActive(false);
                      setHeaderTourEnabled(true);
                      startTour();
                    }
                  : undefined
              }
              onDismissOverviewReady={skipOverviewReadyPrompt}
            />
            )
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

              <div style={{ background: "var(--surface-3)", border: "1px solid var(--panel-border)", borderRadius: "10px", padding: "6px 22px 8px" }}>
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
      </main>
      {tourOpen ? (
        <GuidedTourOverlay
          step={tourStep}
          total={tourSteps.length}
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
      <AskFuelChatDrawer
        open={askFuelOpen}
        onClose={() => setAskFuelOpen(false)}
        companyName={selectedCompany.displayName}
        benchmark={scorecardBenchmarkForm}
        hasBenchmark={hasFilledBenchmarkMetric(scorecardBenchmarkForm)}
        onOpenBenchmark={() => {
          setBenchmarkDrawerElevated(true);
          window.requestAnimationFrame(() => {
            setBenchmarkDrawerOpen(true);
          });
        }}
        pitchDeck={(() => {
          const current = documentSlots.find(slot => slot.typeId === "pitch_deck")?.current;
          if (!current) return null;
          return {
            id: current.id,
            name: current.name,
            format: current.format,
            uploadedAt: current.uploadedAt,
            downloadUrl: current.downloadUrl,
          };
        })()}
        pitchDeckUploading={processingDocumentTypeId === "pitch_deck"}
        onUploadPitchDeck={(file) => {
          // Store in Data Room without auto-extracting or credit toast — Generate intelligence runs on submit.
          setProcessingDocumentTypeId("pitch_deck");
          window.setTimeout(() => {
            setDocumentSlots(previous => upsertDocumentSlot(previous, {
              typeId: "pitch_deck",
              typeLabel: "Pitch deck",
              file,
              source: "Ask Fuel AI · Pitch deck upload",
              intelligenceIds: [],
              intelligenceCount: 0,
            }));
            setProcessingDocumentTypeId(null);
          }, 900);
        }}
        onDiscardPitchDeck={() => {
          setDocumentSlots(previous => clearDocumentSlotCurrent(previous, "pitch_deck"));
        }}
        onGeneratePitchDeckIntelligence={() => {
          handleGenerateFromPending("pending-doc-pitch_deck");
        }}
        onOpenDataRoom={() => {
          setAskFuelOpen(false);
          setActivePage("data-room");
        }}
        onBriefGenerated={setGeneratedBrief}
        onViewInitiatives={() => { setAskFuelOpen(false); setActivePage("initiatives"); }}
        focusBriefSignal={briefFocusSignal}
        focusPlaybook={pendingPlaybook}
        focusPlaybookSignal={playbookFocusSignal}
        benchmarkSubmitSignal={askFuelBenchmarkSubmitSignal}
      />
      <CompleteBenchmarkDrawer
        open={benchmarkDrawerOpen && (isOwnCompany || usesPerCompanyWorkspace)}
        companyName={selectedCompany.displayName}
        companyKey={selectedCompany.id}
        initialValues={scorecardBenchmarkForm}
        earnedProfileCredits={earnedProfileCredits}
        elevatedScrim={benchmarkDrawerElevated}
        onClose={closeBenchmarkDrawer}
        onSaveDraft={values => {
          if (!isOwnCompany && !usesPerCompanyWorkspace) return;
          if (usesPerCompanyWorkspace) applyBenchmarkSubmission(values, selectedCompany.id);
          else applyBenchmarkSubmission(values);
        }}
        onSubmit={(values) => {
          if (!isOwnCompany && !usesPerCompanyWorkspace) return;
          handleBenchmarkSubmit(values);
        }}
      />
      <ProfileCompletionPrompt
        open={profileCompletionPromptOpen}
        earnedProfileCredits={earnedProfileCredits}
        onCompleteProfile={completeProfileFromPrompt}
        onContinue={dismissProfileCompletionPrompt}
      />
      <CompleteProfileDrawer
        open={profileDrawerOpen && isOwnCompany}
        companyName={selectedCompany.displayName}
        companyKey={isOwnCompany ? selectedCompany.id : FOUNDER_CLAIMED_COMPANY_ID}
        initialSection={profileDrawerSection}
        initialAnswers={profileDrawerInitialAnswers}
        reloadLandingActive={reloadLandingActive}
        drawerResetKey={profileDrawerResetKey}
        onClose={() => {
          setProfileDrawerOpen(false);
          setProfileDetailsSyncKey(key => key + 1);
          editProfileFromPreviewRef.current = false;
        }}
        onSaved={handleProfileSavedFromPreview}
        onAnswersChange={() => {
          if (!isOwnCompany) return;
          setProfileDetailsSyncKey(key => key + 1);
        }}
        onModuleSaved={handleProfileModuleSaved}
        onModuleProgress={handleProfileModuleProgress}
        onModuleEarned={(earned) => {
          if (!isOwnCompany) return;
          setEarnedProfileCredits(earned);
        }}
        earnedProfileCredits={earnedProfileCredits}
        onComplete={(completedModules) => {
          if (!isOwnCompany) return;
          setEarnedProfileCredits(markModulesEarned(completedModules, selectedCompany.id));
          setProfileComplete(true);
          setProfileDrawerOpen(false);
          handleProfileSavedFromPreview();
        }}
      />
      {profileCreditReward ? (
        <ProfileCreditRewardToast
          reward={profileCreditReward}
          onDismiss={() => setProfileCreditReward(null)}
        />
      ) : null}
    </div>
    </AccountSettingsNavProvider>
  );
}
