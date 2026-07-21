/**
 * York IE services upsell — rules keyed to exact Fuel answer strings.
 * Every offer is produced by switch/case on a known field + option value.
 * Negative / gap answers fire offers; detail views always get at least a track default.
 */

export type YorkOfferTrack = "rd" | "gtm" | "ga";

export type YorkServiceOffer = {
  /** Stable id for switch/dedupe — e.g. york-ga-books-founder */
  id: string;
  track: YorkOfferTrack;
  pillar: "dev" | "mkt" | "rev";
  /** Answer field that fired this offer */
  triggerField: string;
  /** Exact option string that fired this offer */
  triggerValue: string;
  headline: string;
  /** One-line pitch tied to the trigger answer */
  pitch: string;
  /** Concrete services York IE will deliver */
  howWeHelp: string[];
  ctaLabel: string;
  contactSubject: string;
};

/** Answers bag — onboarding + detail drawer fields we key off. */
export type YorkUpsellAnswers = Record<string, string | undefined | null>;

const CONTACT_EMAIL = "growth@york.ie";

export function yorkContactMailto(offer: YorkServiceOffer): string {
  const subject = encodeURIComponent(offer.contactSubject);
  const body = encodeURIComponent(
    [
      `Hi York IE,`,
      ``,
      `I'm reaching out about: ${offer.headline}`,
      ``,
      `Context from Fuel: ${offer.triggerField} = "${offer.triggerValue}"`,
      ``,
      offer.pitch,
      ``,
      `Looking forward to talking.`,
    ].join("\n"),
  );
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function offer(
  partial: Omit<YorkServiceOffer, "ctaLabel"> & { ctaLabel?: string },
): YorkServiceOffer {
  return {
    ctaLabel: partial.ctaLabel ?? "Talk to York IE →",
    ...partial,
  };
}

function pushUnique(out: YorkServiceOffer[], next: YorkServiceOffer | null | undefined) {
  if (!next) return;
  if (out.some(o => o.id === next.id)) return;
  out.push(next);
}

/** R&D — collect every matching negative / gap answer. */
function collectRdOffers(answers: YorkUpsellAnswers): YorkServiceOffer[] {
  const out: YorkServiceOffer[] = [];

  const constraint = answers.dev_delivery_constraint?.trim() ?? "";
  switch (constraint) {
    case "Capacity and hiring":
      pushUnique(out, offer({
        id: "york-rd-capacity",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_delivery_constraint",
        triggerValue: constraint,
        headline: "York IE product squad — ship without waiting on the next hire",
        pitch:
          "You flagged capacity and hiring as the delivery constraint. York IE embeds senior design + engineering so roadmap work continues while you hire.",
        howWeHelp: [
          "Product design (flows, UI, design system)",
          "Full-stack feature delivery against your backlog",
          "Launchpad + Pulse for delivery visibility",
        ],
        contactSubject: "York IE · Product capacity (design + engineering)",
      }));
      break;
    case "Quality and reliability":
      pushUnique(out, offer({
        id: "york-rd-quality",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_delivery_constraint",
        triggerValue: constraint,
        headline: "York IE quality pod — stabilize what you ship",
        pitch:
          "You named quality and reliability as the bottleneck. York IE runs QA, release hardening, and Pulse health so customers feel a stable product.",
        howWeHelp: [
          "Regression + release QA cadence",
          "Incident triage and reliability fixes",
          "Pulse weekly execution health",
        ],
        contactSubject: "York IE · Quality & reliability",
      }));
      break;
    case "Technical debt / Architecture":
      pushUnique(out, offer({
        id: "york-rd-architecture",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_delivery_constraint",
        triggerValue: constraint,
        headline: "York IE architecture rescue — unstick the platform",
        pitch:
          "You called out technical debt / architecture. York IE senior engineers restructure the critical path so feature work stops fighting the codebase.",
        howWeHelp: [
          "Architecture review and target design",
          "Debt burn-down sprints on the highest-risk modules",
          "Handoff docs your team can own after",
        ],
        contactSubject: "York IE · Architecture & tech debt",
      }));
      break;
    case "Planning and prioritization":
      pushUnique(out, offer({
        id: "york-rd-planning",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_delivery_constraint",
        triggerValue: constraint,
        headline: "York IE product ops — turn priorities into a shippable plan",
        pitch:
          "You said planning and prioritization is the constraint. York IE runs roadmap facilitation, sprint design, and delivery cadence with your founders.",
        howWeHelp: [
          "Roadmap and sprint planning with founders",
          "Scope cuts that protect the wedge",
          "Delivery rituals your team can keep",
        ],
        contactSubject: "York IE · Product planning",
      }));
      break;
    default:
      break;
  }

  const stage = answers.dev_product_stage?.trim() ?? "";
  switch (stage) {
    case "Idea — not yet in development":
      pushUnique(out, offer({
        id: "york-rd-idea",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_product_stage",
        triggerValue: stage,
        headline: "York IE discovery → design — validate before you build",
        pitch:
          "You're still at idea stage. York IE runs discovery, UX, and a scoped MVP plan so you don't burn months on the wrong build.",
        howWeHelp: [
          "Customer discovery and wedge definition",
          "UX flows and clickable prototype",
          "MVP build plan with cost and timeline",
        ],
        contactSubject: "York IE · Discovery & product design",
      }));
      break;
    case "In active development":
      pushUnique(out, offer({
        id: "york-rd-building",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_product_stage",
        triggerValue: stage,
        headline: "York IE embedded build — design + engineering in your sprint",
        pitch:
          "You're in active development. York IE plugs in design and engineering capacity so the next release doesn't slip on bandwidth.",
        howWeHelp: [
          "UI/UX paired with engineering",
          "Feature delivery against your current sprint",
          "Launchpad visibility for stakeholders",
        ],
        contactSubject: "York IE · Embedded product build",
      }));
      break;
    case "Built — not yet launched":
      pushUnique(out, offer({
        id: "york-rd-prelaunch",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_product_stage",
        triggerValue: stage,
        headline: "York IE launch pack — polish, harden, go live",
        pitch:
          "You've built but haven't launched. York IE finishes UX polish, QA, and launch readiness so go-live isn't a scramble.",
        howWeHelp: [
          "Pre-launch UX polish on core flows",
          "Release QA and rollback plan",
          "Launch checklist with owners and dates",
        ],
        contactSubject: "York IE · Pre-launch polish",
      }));
      break;
    case "Launched — early users or customers":
      pushUnique(out, offer({
        id: "york-rd-early",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_product_stage",
        triggerValue: stage,
        headline: "York IE product iteration — turn early usage into the next release",
        pitch:
          "You're live with early users. York IE runs feedback → design → ship loops so activation and retention improve every sprint.",
        howWeHelp: [
          "Usage + interview synthesis into backlog",
          "Rapid UX/engineering iteration",
          "Activation and onboarding fixes",
        ],
        contactSubject: "York IE · Post-launch product iteration",
      }));
      break;
    default:
      break;
  }

  const buildModel = answers.dev_build_model?.trim() ?? "";
  switch (buildModel) {
    case "Founders building internally":
    case "Contract dev / agency":
    case "Offshore or hybrid team":
    case "Not building yet — manual or services first":
      pushUnique(out, offer({
        id: "york-rd-build-model",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_build_model",
        triggerValue: buildModel,
        headline: "York IE as your product bench — senior builders, not a black-box agency",
        pitch: `Your build model is "${buildModel}". York IE embeds accountable design + engineering that works like an extension of the founding team.`,
        howWeHelp: [
          "Named pod (design + eng) on your stack",
          "Shared roadmap and weekly demos",
          "Knowledge transfer — no lock-in theater",
        ],
        contactSubject: "York IE · Product bench partnership",
      }));
      break;
    default:
      break;
  }

  const engSize = answers.dev_engineering_size?.trim() ?? "";
  switch (engSize) {
    case "No engineers (founders only)":
    case "1–3 engineers":
      pushUnique(out, offer({
        id: "york-rd-eng-size",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_engineering_size",
        triggerValue: engSize,
        headline: "York IE engineering capacity — multiply a small product team",
        pitch: `Engineering size is "${engSize}". York IE adds senior design + build capacity so roadmap velocity isn't capped by headcount.`,
        howWeHelp: [
          "Embedded engineers on your stack",
          "Design support for the same squad",
          "Delivery cadence with Launchpad",
        ],
        contactSubject: "York IE · Engineering capacity",
      }));
      break;
    default:
      break;
  }

  const ship = answers.dev_ship_cadence?.trim() ?? "";
  switch (ship) {
    case "Ad hoc — no regular cadence":
    case "Not shipping yet":
      pushUnique(out, offer({
        id: "york-rd-ship-cadence",
        track: "rd",
        pillar: "dev",
        triggerField: "dev_ship_cadence",
        triggerValue: ship,
        headline: "York IE delivery rhythm — from ad hoc to a real release cadence",
        pitch: `Ship cadence is "${ship}". York IE installs sprint/release rituals, QA gates, and Pulse so shipping becomes predictable.`,
        howWeHelp: [
          "Release train design",
          "QA and deploy checklist",
          "Weekly Pulse health for stakeholders",
        ],
        contactSubject: "York IE · Shipping cadence",
      }));
      break;
    default:
      break;
  }

  const bottleneck = answers.dev_eng_bottleneck?.trim() ?? "";
  if (
    bottleneck.includes("Hiring and capacity")
    || bottleneck.includes("Technical debt / architecture")
    || bottleneck.includes("QA and testing")
    || bottleneck.includes("Planning and prioritization")
  ) {
    pushUnique(out, offer({
      id: "york-rd-bottleneck",
      track: "rd",
      pillar: "dev",
      triggerField: "dev_eng_bottleneck",
      triggerValue: bottleneck,
      headline: "York IE unblocks your engineering bottleneck",
      pitch: `You flagged engineering bottlenecks: ${bottleneck}. York IE puts senior builders on the exact constraint slowing the team.`,
      howWeHelp: [
        "Targeted capacity on the named bottleneck",
        "Design + eng pairing where needed",
        "Handoff so the team keeps the gains",
      ],
      contactSubject: "York IE · Engineering bottleneck",
    }));
  }

  return out;
}

/** GTM — collect every matching negative / gap answer. */
function collectGtmOffers(answers: YorkUpsellAnswers): YorkServiceOffer[] {
  const out: YorkServiceOffer[] = [];

  const funnel = answers.mkt_funnel_gap?.trim() ?? "";
  switch (funnel) {
    case "Awareness":
      pushUnique(out, offer({
        id: "york-gtm-awareness",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_funnel_gap",
        triggerValue: funnel,
        headline: "York IE demand engine — website, content, and social that create pipeline",
        pitch:
          "You said the funnel breaks at Awareness. York IE builds the site, content, SEO, and social system that puts the right buyers in motion.",
        howWeHelp: [
          "Website messaging and conversion-ready pages",
          "Content + SEO + LinkedIn/social cadence",
          "Paid and organic channel plan tied to ICP",
        ],
        contactSubject: "York IE · GTM awareness (web + social + content)",
      }));
      break;
    case "Conversion":
      pushUnique(out, offer({
        id: "york-gtm-conversion",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_funnel_gap",
        triggerValue: funnel,
        headline: "York IE conversion system — demos, pages, and sales process that close",
        pitch:
          "You said the funnel breaks at Conversion. York IE fixes landing pages, demo narrative, and RevOps so interest becomes revenue.",
        howWeHelp: [
          "Landing page + CRO on high-intent paths",
          "Demo / sales narrative for founder or AE-led deals",
          "CRM stages and handoff definitions",
        ],
        contactSubject: "York IE · GTM conversion + RevOps",
      }));
      break;
    case "Retention":
      pushUnique(out, offer({
        id: "york-gtm-retention",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_funnel_gap",
        triggerValue: funnel,
        headline: "York IE retention & expansion GTM — keep and grow what you already won",
        pitch:
          "You said the funnel breaks at Retention. York IE builds lifecycle messaging, expansion plays, and customer marketing that lift NRR.",
        howWeHelp: [
          "Onboarding and lifecycle email/in-app programs",
          "Expansion / upsell playbooks",
          "Customer marketing and case study engine",
        ],
        contactSubject: "York IE · Retention & expansion GTM",
      }));
      break;
    default:
      break;
  }

  const tracking = answers.mkt_revenue_tracking?.trim() ?? "";
  switch (tracking) {
    case "No systematic pipeline yet":
    case "Spreadsheet or lightweight tracking":
      pushUnique(out, offer({
        id: "york-gtm-revops",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_revenue_tracking",
        triggerValue: tracking,
        headline: "York IE RevOps install — CRM, pipeline, and forecast you can trust",
        pitch: `You're on "${tracking}". York IE stands up HubSpot/CRM hygiene, stage definitions, and reporting so GTM decisions stop living in a sheet.`,
        howWeHelp: [
          "CRM setup or cleanup with defined stages",
          "Pipeline hygiene and forecast views",
          "Attribution basics for spend decisions",
        ],
        contactSubject: "York IE · RevOps & CRM",
      }));
      break;
    case "CRM but informal process":
      pushUnique(out, offer({
        id: "york-gtm-revops-process",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_revenue_tracking",
        triggerValue: tracking,
        headline: "York IE RevOps discipline — turn informal CRM into a sales process",
        pitch:
          "You have a CRM but an informal process. York IE documents stages, SLAs, and dashboards so forecast and coaching finally work.",
        howWeHelp: [
          "Written stage criteria and exit rules",
          "AE/SDR operating cadence",
          "Manager dashboards for pipeline risk",
        ],
        contactSubject: "York IE · RevOps process",
      }));
      break;
    default:
      break;
  }

  const icp = answers.mkt_icp_clarity?.trim() ?? "";
  switch (icp) {
    case "Still a hypothesis":
    case "Early signal from customers, but not validated":
    case "Not defined yet":
    case "Selling broadly or still figuring out who fits":
    case "Clear in founder's head":
    case "We know who fits, but it's not written or enforced yet":
      pushUnique(out, offer({
        id: "york-gtm-icp",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_icp_clarity",
        triggerValue: icp,
        headline: "York IE ICP + messaging — stop selling to everyone",
        pitch: `ICP status: "${icp}". York IE runs ICP definition, messaging, and website/outbound copy so every channel talks to one buyer.`,
        howWeHelp: [
          "ICP workshop with win/loss evidence",
          "Homepage and outbound messaging rewrite",
          "Qualification checklist for the team",
        ],
        contactSubject: "York IE · ICP & messaging",
      }));
      break;
    default:
      break;
  }

  const motion = answers.mkt_sales_motion?.trim() ?? "";
  switch (motion) {
    case "Founder-led":
    case "Not yet":
      pushUnique(out, offer({
        id: "york-gtm-founder",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_sales_motion",
        triggerValue: motion,
        headline: "York IE founder-led GTM — a system that scales past the founder calendar",
        pitch: `Sales motion is "${motion}". York IE builds website, outbound, and light RevOps so pipeline isn't only what you personally book.`,
        howWeHelp: [
          "Founder-led outbound + inbound playbook",
          "Website and social that generate meetings",
          "Simple CRM so handoff to first AE is clean",
        ],
        contactSubject: "York IE · Founder-led GTM",
      }));
      break;
    case "Sales-led":
      pushUnique(out, offer({
        id: "york-gtm-sales-led",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_sales_motion",
        triggerValue: motion,
        headline: "York IE sales-led GTM — demand + RevOps behind the AE motion",
        pitch:
          "You're sales-led. York IE fills the top of funnel (web, content, social) and tightens RevOps so AEs aren't hunting in the dark.",
        howWeHelp: [
          "Demand gen (web, content, paid/social)",
          "Sales collateral and demo narrative",
          "Pipeline RevOps and forecast hygiene",
        ],
        contactSubject: "York IE · Sales-led GTM",
      }));
      break;
    case "Product-led":
      pushUnique(out, offer({
        id: "york-gtm-plg",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_sales_motion",
        triggerValue: motion,
        headline: "York IE PLG growth — activation, website, and conversion loops",
        pitch:
          "You're product-led. York IE owns growth surface area — site, onboarding messaging, and conversion analytics — so self-serve actually converts.",
        howWeHelp: [
          "PLG website and signup conversion",
          "Activation messaging and lifecycle",
          "Growth experiments with clear owners",
        ],
        contactSubject: "York IE · Product-led growth",
      }));
      break;
    default:
      break;
  }

  const mktCapacity = answers.mkt_marketing_capacity?.trim() ?? "";
  switch (mktCapacity) {
    case "No dedicated marketing — founders or sales cover it":
      pushUnique(out, offer({
        id: "york-gtm-marketing-pod",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_marketing_capacity",
        triggerValue: mktCapacity,
        headline: "York IE marketing pod — your fractional GTM team",
        pitch:
          "There's no dedicated marketing. York IE runs website, social, content, and campaigns as an embedded pod so founders stop doing it at midnight.",
        howWeHelp: [
          "Weekly content + social + site updates",
          "Campaign planning tied to pipeline goals",
          "Reporting founders can act on",
        ],
        contactSubject: "York IE · Marketing pod",
      }));
      break;
    default:
      break;
  }

  const dealStall = answers.mkt_deal_stall?.trim() ?? "";
  switch (dealStall) {
    case "Before first meeting / demo":
    case "After demo — no decision":
    case "Pricing or budget":
    case "Not enough pipeline to tell":
      pushUnique(out, offer({
        id: "york-gtm-deal-stall",
        track: "gtm",
        pillar: "mkt",
        triggerField: "mkt_deal_stall",
        triggerValue: dealStall,
        headline: "York IE sales enablement — fix where deals die",
        pitch: `Deals stall at "${dealStall}". York IE rewrites narrative, collateral, and process at that exact stage so more opportunities convert.`,
        howWeHelp: [
          "Stage-specific talk tracks and decks",
          "Website/landing support for that moment",
          "CRM stage criteria that match reality",
        ],
        contactSubject: "York IE · Deal stall fix",
      }));
      break;
    default:
      break;
  }

  const pipelineDefs = answers.mkt_pipeline_definitions?.trim() ?? "";
  if (pipelineDefs.startsWith("Not defined yet") || pipelineDefs.startsWith("Informal")) {
    pushUnique(out, offer({
      id: "york-gtm-pipeline-defs",
      track: "gtm",
      pillar: "mkt",
      triggerField: "mkt_pipeline_definitions",
      triggerValue: pipelineDefs,
      headline: "York IE RevOps — define pipeline stages the team will actually use",
      pitch: `Pipeline definitions are "${pipelineDefs}". York IE writes stage criteria, CRM setup, and coaching so forecast stops being fiction.`,
      howWeHelp: [
        "Documented MQL/SQL/opportunity criteria",
        "CRM configuration to match",
        "Manager dashboard for stage hygiene",
      ],
      contactSubject: "York IE · Pipeline definitions",
    }));
  }

  return out;
}

/** G&A — collect every matching negative / gap answer. */
function collectGaOffers(answers: YorkUpsellAnswers): YorkServiceOffer[] {
  const out: YorkServiceOffer[] = [];

  const books = answers.rev_finance_management?.trim() ?? "";
  switch (books) {
    case "Not set up yet":
      pushUnique(out, offer({
        id: "york-ga-books-none",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_finance_management",
        triggerValue: books,
        headline: "York IE bookkeeping — stand up the books the right way",
        pitch:
          "Finance isn't set up yet. York IE installs bookkeeping, chart of accounts, and a monthly close so you stop flying blind on cash.",
        howWeHelp: [
          "Bookkeeping setup (QuickBooks / equivalent)",
          "Monthly close and P&L you can trust",
          "Cash and burn visibility for founders",
        ],
        contactSubject: "York IE · Bookkeeping setup",
      }));
      break;
    case "Founder-managed / informal":
      pushUnique(out, offer({
        id: "york-ga-books-founder",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_finance_management",
        triggerValue: books,
        headline: "York IE bookkeeping — take finance off the founder's plate",
        pitch:
          "Finance is founder-managed and informal. York IE owns bookkeeping and monthly close so you get hours back and numbers you can defend.",
        howWeHelp: [
          "Ongoing bookkeeping and reconciliations",
          "Monthly close package",
          "Burn, runway, and basic board pack",
        ],
        contactSubject: "York IE · Founder bookkeeping takeover",
      }));
      break;
    case "Spreadsheet + accountant or bookkeeper":
      pushUnique(out, offer({
        id: "york-ga-books-upgrade",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_finance_management",
        triggerValue: books,
        headline: "York IE FinOps — upgrade spreadsheets into an operating finance system",
        pitch:
          "You're on spreadsheet + bookkeeper. York IE formalizes close, forecast, and reporting so finance supports hiring and fundraising decisions.",
        howWeHelp: [
          "Close process and reporting calendar",
          "Rolling forecast model",
          "Investor / board-ready financial package",
        ],
        contactSubject: "York IE · FinOps upgrade",
      }));
      break;
    default:
      break;
  }

  const runway = answers.rev_runway?.trim() ?? "";
  switch (runway) {
    case "Under 6 months":
      pushUnique(out, offer({
        id: "york-ga-runway-critical",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_runway",
        triggerValue: runway,
        headline: "York IE runway war room — cash plan in weeks, not quarters",
        pitch:
          "Runway is under 6 months. York IE builds a cash plan, cost levers, and fundraising/bridge narrative with urgency.",
        howWeHelp: [
          "13-week cash forecast",
          "Cost and hiring lever map",
          "Bridge / raise package if needed",
        ],
        contactSubject: "York IE · Critical runway plan",
      }));
      break;
    case "6–12 months":
      pushUnique(out, offer({
        id: "york-ga-runway-tight",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_runway",
        triggerValue: runway,
        headline: "York IE FinOps — extend runway with a real operating plan",
        pitch:
          "Runway is 6–12 months. York IE installs bookkeeping discipline, forecast, and board reporting before the next squeeze.",
        howWeHelp: [
          "Monthly close and burn tracking",
          "Scenario forecast (base / downside)",
          "Operating plan tied to cash",
        ],
        contactSubject: "York IE · Runway FinOps",
      }));
      break;
    default:
      break;
  }

  const capital = answers.rev_capital_priority?.trim() ?? "";
  switch (capital) {
    case "Actively fundraising":
      pushUnique(out, offer({
        id: "york-ga-fundraising",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_capital_priority",
        triggerValue: capital,
        headline: "York IE fundraising readiness — metrics, narrative, and data room",
        pitch:
          "You're actively fundraising. York IE prepares financials, narrative, and data-room discipline so investor conversations don't stall on messy numbers.",
        howWeHelp: [
          "Clean financial package and model",
          "Investor narrative tied to benchmarks",
          "Data room and process support",
        ],
        contactSubject: "York IE · Fundraising readiness",
      }));
      break;
    case "Open to investor introductions":
      pushUnique(out, offer({
        id: "york-ga-intros",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_capital_priority",
        triggerValue: capital,
        headline: "York IE intro-ready package — be ready when the right check appears",
        pitch:
          "You're open to intros. York IE gets books, metrics, and story tight so a warm intro can convert.",
        howWeHelp: [
          "Benchmark-backed metric narrative",
          "Bookkeeping and close hygiene",
          "One-pager + deck support",
        ],
        contactSubject: "York IE · Intro-ready finance",
      }));
      break;
    case "Focused on extending runway / reaching profitability":
      pushUnique(out, offer({
        id: "york-ga-profitability",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_capital_priority",
        triggerValue: capital,
        headline: "York IE path-to-profit FinOps — every dollar accounted for",
        pitch:
          "Priority is extending runway / profitability. York IE runs bookkeeping, forecast, and cost discipline so the plan is real.",
        howWeHelp: [
          "Bookkeeping and monthly close",
          "Unit economics and burn tracking",
          "Profitability plan with owners",
        ],
        contactSubject: "York IE · Profitability FinOps",
      }));
      break;
    default:
      break;
  }

  const forecast = answers.rev_forecast?.trim() ?? "";
  switch (forecast) {
    case "No, we track historicals only":
      pushUnique(out, offer({
        id: "york-ga-forecast",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_forecast",
        triggerValue: forecast,
        headline: "York IE forecasting — stop steering from the rear-view mirror",
        pitch:
          "You only track historicals. York IE builds a rolling forecast and close process so hiring and spend decisions look forward.",
        howWeHelp: [
          "Monthly rolling forecast",
          "Close calendar feeding the model",
          "Board / investor reporting rhythm",
        ],
        contactSubject: "York IE · Forecasting",
      }));
      break;
    default:
      break;
  }

  const unitEcon = answers.rev_unit_economics?.trim() ?? "";
  switch (unitEcon) {
    case "Not yet":
    case "Rough manual estimates":
      pushUnique(out, offer({
        id: "york-ga-unit-econ",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_unit_economics",
        triggerValue: unitEcon,
        headline: "York IE unit economics — know what each dollar of growth costs",
        pitch: `Unit economics are "${unitEcon}". York IE builds the model and monthly tracking so pricing, CAC, and burn decisions are grounded.`,
        howWeHelp: [
          "Unit economics model (CAC, payback, contribution)",
          "Monthly refresh process",
          "Tie-out to bookkeeping close",
        ],
        contactSubject: "York IE · Unit economics",
      }));
      break;
    default:
      break;
  }

  const capTable = answers.rev_cap_table?.trim() ?? "";
  switch (capTable) {
    case "Not managed yet":
    case "Spreadsheet-based":
      pushUnique(out, offer({
        id: "york-ga-cap-table",
        track: "ga",
        pillar: "rev",
        triggerField: "rev_cap_table",
        triggerValue: capTable,
        headline: "York IE finance hygiene — cap table and books ready for diligence",
        pitch: `Cap table is "${capTable}". York IE tightens equity records alongside bookkeeping so a raise or board cycle doesn't scramble.`,
        howWeHelp: [
          "Cap table cleanup guidance",
          "Bookkeeping aligned to ownership reality",
          "Diligence-ready finance pack",
        ],
        contactSubject: "York IE · Cap table & books",
      }));
      break;
    default:
      break;
  }

  return out;
}

/** Always-on track partnership when viewing a detail page with no specific match. */
function defaultOfferForPillar(pillar: "dev" | "mkt" | "rev"): YorkServiceOffer {
  switch (pillar) {
    case "dev":
      return offer({
        id: "york-rd-default",
        track: "rd",
        pillar: "dev",
        triggerField: "pillar",
        triggerValue: "R&D",
        headline: "York IE product partnership — design and engineering that ships with you",
        pitch:
          "York IE embeds product design and development capacity so R&D isn't blocked by hiring timelines or agency handoffs.",
        howWeHelp: [
          "Product design and UX",
          "Full-stack engineering delivery",
          "Launchpad + Pulse for visibility",
        ],
        contactSubject: "York IE · R&D product partnership",
      });
    case "mkt":
      return offer({
        id: "york-gtm-default",
        track: "gtm",
        pillar: "mkt",
        triggerField: "pillar",
        triggerValue: "GTM",
        headline: "York IE GTM partnership — website, demand, social, and RevOps",
        pitch:
          "York IE runs go-to-market execution — site, content, social, and revenue ops — so pipeline isn't only founder hustle.",
        howWeHelp: [
          "Website and messaging",
          "Demand gen, content, and social",
          "CRM / RevOps hygiene",
        ],
        contactSubject: "York IE · GTM partnership",
      });
    case "rev":
      return offer({
        id: "york-ga-default",
        track: "ga",
        pillar: "rev",
        triggerField: "pillar",
        triggerValue: "G&A",
        headline: "York IE FinOps partnership — bookkeeping and operating finance",
        pitch:
          "York IE owns bookkeeping, close, and forecast so G&A becomes a control system — not a monthly scramble.",
        howWeHelp: [
          "Bookkeeping and monthly close",
          "Cash, burn, and runway tracking",
          "Board / investor-ready packages",
        ],
        contactSubject: "York IE · G&A FinOps partnership",
      });
  }
}

function collectAllAnswerOffers(answers: YorkUpsellAnswers): YorkServiceOffer[] {
  return [
    ...collectRdOffers(answers),
    ...collectGtmOffers(answers),
    ...collectGaOffers(answers),
  ];
}

/**
 * Answer-triggered offers for Intelligence — one per track (first match wins)
 * so any negative answer in that track surfaces York IE without flooding the timeline.
 */
export function resolveYorkServiceOffers(answers: YorkUpsellAnswers | null | undefined): YorkServiceOffer[] {
  if (!answers) return [];
  const seen = new Set<YorkOfferTrack>();
  const out: YorkServiceOffer[] = [];
  for (const next of collectAllAnswerOffers(answers)) {
    if (seen.has(next.track)) continue;
    seen.add(next.track);
    out.push(next);
  }
  return out;
}

/**
 * Offers for a track detail / initiative pillar.
 * Prefer every answer-triggered match; if none, still return the track default so we always upsell.
 */
export function resolveYorkOffersForPillar(
  pillar: "dev" | "mkt" | "rev",
  answers: YorkUpsellAnswers | null | undefined,
): YorkServiceOffer[] {
  const matched = answers
    ? collectAllAnswerOffers(answers).filter(o => o.pillar === pillar)
    : [];
  if (matched.length > 0) return matched;
  return [defaultOfferForPillar(pillar)];
}

/** Best single offer for an initiative pillar (answer match, else track default). */
export function resolveYorkOfferForPillar(
  pillar: "dev" | "mkt" | "rev",
  answers: YorkUpsellAnswers | null | undefined,
): YorkServiceOffer | null {
  return resolveYorkOffersForPillar(pillar, answers)[0] ?? null;
}

/**
 * Initiative / Intelligence — pillar (category) only.
 * Do not score free-typed title or description text.
 */
export function resolveYorkOfferForInitiative(
  initiative: { pillar: "dev" | "mkt" | "rev" },
  answers: YorkUpsellAnswers | null | undefined,
): YorkServiceOffer | null {
  return resolveYorkOfferForPillar(initiative.pillar, answers);
}

/** Category-scoped line for initiatives / intelligence (no free-text NLP). */
export function yorkNudgeMessageForPillar(
  pillar: "dev" | "mkt" | "rev",
  offer: YorkServiceOffer,
  maxLen = 72,
): string {
  const cat = pillar === "dev" ? "R&D" : pillar === "mkt" ? "GTM" : "G&A";
  const tailored = `Move ${cat} work forward with York IE`;
  if (tailored.length <= maxLen) return tailored;
  return yorkNudgeMessage(offer, maxLen);
}

/** @deprecated Prefer yorkNudgeMessageForPillar — kept for call-site compatibility. */
export function yorkNudgeMessageForInitiative(
  initiative: { pillar?: "dev" | "mkt" | "rev"; title?: string },
  offer: YorkServiceOffer,
  maxLen = 72,
): string {
  if (initiative.pillar) return yorkNudgeMessageForPillar(initiative.pillar, offer, maxLen);
  return yorkNudgeMessage(offer, maxLen);
}

/**
 * Track detail — personalize from that screen’s “Needs improvement” labels only
 * (structured insights for the open category), not free-form chat text.
 */
export function yorkNudgeMessageForTrackGaps(
  gaps: Array<{ label: string }>,
  offer: YorkServiceOffer,
  maxLen = 88,
): string {
  const labels = gaps
    .map(g => g.label.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2);
  if (!labels.length) return yorkNudgeMessage(offer, maxLen);

  const gapBit = labels.length === 1 ? labels[0] : `${labels[0]} and ${labels[1]}`;
  const tailored = `York IE can help close the gap on ${gapBit}`;
  if (tailored.length <= maxLen) return tailored;
  return `${tailored.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

/** Shared partner offer for left sidebar + Overview (one common message). */
export const YORK_COMMON_OFFER: YorkServiceOffer = offer({
  id: "york-common-partner",
  track: "rd",
  pillar: "dev",
  triggerField: "placement",
  triggerValue: "common",
  headline: "York IE — operating partner for founders",
  pitch:
    "York IE pairs with founders on product, go-to-market, and finance — scoped to what Fuel already surfaced.",
  howWeHelp: [
    "Web / product build",
    "Full GTM and RevOps",
    "Books and finance ops",
  ],
  contactSubject: "York IE · Talk from Fuel",
  ctaLabel: "Talk to York IE",
});

/** Soft personal opener for LinkedIn-style sidebar / Overview cards. */
export function yorkCommonLead(firstName?: string): string {
  const name = firstName?.trim();
  if (name) return `${name}, turn Fuel gaps into a plan you can ship`;
  return "Turn Fuel gaps into a plan you can ship";
}

export function yorkCommonHeadline(): string {
  return "Hands-on help across R&D, GTM, and finance";
}

/**
 * Best single offer for sidebar when a field gate fires; Overview always uses the common card.
 */
export function resolveYorkPartnerOfferForSurface(
  answers: YorkUpsellAnswers | null | undefined,
): YorkServiceOffer {
  const ranked = resolveYorkServiceOffers(answers);
  return ranked[0] ?? YORK_COMMON_OFFER;
}

/**
 * Overview / sidebar — company-wide copy (never a single-track gap like “ship cadence on R&D”).
 * Track-detail / initiative keep yorkPersonalizedPartnerCopy for category-scoped lines.
 */
export function yorkOverviewPartnerCopy(opts: {
  firstName?: string;
  weakTrackLabels?: string[];
}): { lead: string; headline: string } {
  const name = opts.firstName?.trim();
  const tracks = (opts.weakTrackLabels ?? []).filter(Boolean).slice(0, 3);
  const headline = yorkCommonHeadline();

  if (tracks.length >= 3 && name) {
    return {
      lead: `${name}, Fuel sees gaps across ${tracks[0]}, ${tracks[1]}, and ${tracks[2]}`,
      headline,
    };
  }
  if (tracks.length === 2 && name) {
    return {
      lead: `${name}, Fuel sees gaps on ${tracks[0]} and ${tracks[1]}`,
      headline,
    };
  }
  if (tracks.length === 1 && name) {
    return {
      lead: `${name}, Fuel flagged work on ${tracks[0]} — York IE helps across R&D, GTM, and finance`,
      headline,
    };
  }
  return { lead: yorkCommonLead(name), headline };
}

/**
 * Compact, intriguing copy grounded in structured Fuel data
 * (offer trigger + optional “needs improvement” labels) — not free-text NLP.
 * Use for track detail / initiatives only — not Overview.
 */
export function yorkPersonalizedPartnerCopy(opts: {
  firstName?: string;
  offer: YorkServiceOffer;
  gapLabels?: string[];
  weakTrackLabels?: string[];
}): { lead: string; headline: string } {
  const name = opts.firstName?.trim();
  const track = trackLabel(opts.offer.track);
  const gap = opts.gapLabels?.map(g => g.replace(/\s+/g, " ").trim()).filter(Boolean)[0];
  const weakTracks = (opts.weakTrackLabels ?? []).filter(Boolean).slice(0, 2);
  const outcome = yorkNudgeMessage(opts.offer, 72);

  let lead: string;
  if (gap && name) {
    lead = `${name}, Fuel flagged “${gap}” on ${track}`;
  } else if (gap) {
    lead = `Fuel flagged “${gap}” on ${track}`;
  } else if (weakTracks.length === 2 && name) {
    lead = `${name}, ${weakTracks[0]} and ${weakTracks[1]} need a closer look`;
  } else if (weakTracks.length === 1 && name) {
    lead = `${name}, your ${weakTracks[0]} track is asking for help`;
  } else if (name) {
    lead = `${name}, your ${track} answers point to a clear next move`;
  } else {
    lead = `Your ${track} answers point to a clear next move`;
  }

  return { lead, headline: outcome };
}

export function trackLabel(track: YorkOfferTrack): string {
  switch (track) {
    case "rd":
      return "R&D";
    case "gtm":
      return "GTM";
    case "ga":
      return "G&A";
    default:
      return track;
  }
}

/** Outcome half of "York IE X — outcome" headlines. */
export function yorkOfferOutcomeTitle(offer: YorkServiceOffer): string {
  const dash = offer.headline.indexOf(" — ");
  if (dash >= 0) return offer.headline.slice(dash + 3).trim();
  return offer.headline.replace(/^York IE\s+/i, "").trim();
}

/**
 * Marketing/sales copy for the compact nudge — buyer outcome + how we help.
 * Written to sell the engagement, not dump an internal service checklist.
 */
const YORK_NUDGE_COPY: Record<string, { headline: string; summary: string }> = {
  "york-rd-capacity": {
    headline: "Ship the roadmap without waiting on the next hire",
    summary: "York IE embeds senior design and engineering so feature work keeps moving while you recruit — same backlog, faster throughput.",
  },
  "york-rd-quality": {
    headline: "Stabilize what customers already feel",
    summary: "York IE runs release QA, reliability fixes, and a weekly health rhythm so quality stops being the reason deals stall.",
  },
  "york-rd-architecture": {
    headline: "Unstick the platform so features stop fighting the codebase",
    summary: "York IE senior engineers redesign the critical path and burn down the debt that is slowing every release.",
  },
  "york-rd-planning": {
    headline: "Turn priorities into a plan the team can actually ship",
    summary: "York IE facilitates roadmap and sprint design with founders — clear cuts, named owners, and a cadence that sticks.",
  },
  "york-rd-idea": {
    headline: "Validate the wedge before you burn months building",
    summary: "York IE runs discovery, UX, and a scoped MVP plan so you invest in the right product — not the first idea on the whiteboard.",
  },
  "york-rd-building": {
    headline: "Add design and engineering that plugs into your sprint",
    summary: "York IE embeds a product pod on your stack so the next release is not blocked by bandwidth.",
  },
  "york-rd-prelaunch": {
    headline: "Polish, harden, and go live without a scramble",
    summary: "York IE finishes core UX, release QA, and a launch checklist with owners so go-live is controlled — not heroic.",
  },
  "york-rd-early": {
    headline: "Turn early usage into the next release customers feel",
    summary: "York IE runs feedback-to-ship loops on activation and retention so every sprint compounds product-market fit.",
  },
  "york-rd-build-model": {
    headline: "A product bench that works like an extension of your team",
    summary: "York IE puts a named design and engineering pod on your roadmap with weekly demos — accountable delivery, not a black-box agency.",
  },
  "york-rd-eng-size": {
    headline: "Multiply a small product team without a hiring pause",
    summary: "York IE adds senior builders on your stack so roadmap velocity is not capped by headcount.",
  },
  "york-rd-ship-cadence": {
    headline: "Replace ad hoc releases with a cadence buyers can trust",
    summary: "York IE installs sprint and release rituals, QA gates, and stakeholder visibility so shipping becomes predictable.",
  },
  "york-rd-bottleneck": {
    headline: "Put senior builders on the constraint slowing the team",
    summary: "York IE targets the exact engineering bottleneck you flagged — capacity, quality, debt, or planning — and hands the gains back to your team.",
  },
  "york-rd-default": {
    headline: "Product design and engineering that ships with you",
    summary: "York IE embeds senior practitioners on R&D so delivery is not blocked by hiring timelines or agency handoffs.",
  },
  "york-gtm-awareness": {
    headline: "Fill the top of funnel with buyers who actually fit",
    summary: "York IE builds the website, content, SEO, and social system that puts the right ICP in motion — not vanity traffic.",
  },
  "york-gtm-conversion": {
    headline: "Turn interest into closed revenue",
    summary: "York IE tightens landing pages, demo narrative, and sales process so pipeline stops dying between meeting and signature.",
  },
  "york-gtm-retention": {
    headline: "Keep and grow the revenue you already won",
    summary: "York IE builds lifecycle messaging and expansion plays that lift retention and net revenue — not just new logos.",
  },
  "york-gtm-revops": {
    headline: "A CRM and pipeline you can forecast from",
    summary: "York IE stands up stage definitions, hygiene, and reporting so GTM decisions leave the spreadsheet and enter the operating system.",
  },
  "york-gtm-revops-process": {
    headline: "Turn informal CRM into a sales process that scales",
    summary: "York IE documents stage criteria, operating cadence, and manager dashboards so forecast and coaching finally work.",
  },
  "york-gtm-icp": {
    headline: "Stop selling to everyone — own one buyer",
    summary: "York IE defines ICP, rewrites messaging, and installs qualification so every channel talks to the same customer.",
  },
  "york-gtm-founder": {
    headline: "Build a GTM system that outgrows the founder calendar",
    summary: "York IE installs outbound, inbound, and light RevOps so pipeline is not only what you personally book.",
  },
  "york-gtm-sales-led": {
    headline: "Feed your AEs with demand and clean RevOps",
    summary: "York IE runs website, content, and social demand while tightening pipeline hygiene so sales is not hunting in the dark.",
  },
  "york-gtm-plg": {
    headline: "Make self-serve convert — not just sign up",
    summary: "York IE owns growth surface area: site, onboarding messaging, and conversion loops tied to activation.",
  },
  "york-gtm-marketing-pod": {
    headline: "A fractional marketing team that hits pipeline goals",
    summary: "York IE runs website, social, content, and campaigns as an embedded pod so founders stop doing GTM at midnight.",
  },
  "york-gtm-deal-stall": {
    headline: "Fix the exact stage where deals die",
    summary: "York IE rewrites talk tracks, collateral, and process at the stall point — before demo, after demo, or at pricing — so more opportunities convert.",
  },
  "york-gtm-pipeline-defs": {
    headline: "Pipeline stages the team will actually use",
    summary: "York IE writes MQL/SQL criteria, configures CRM to match, and coaches managers so forecast stops being fiction.",
  },
  "york-gtm-default": {
    headline: "Website, demand, and RevOps behind your growth motion",
    summary: "York IE runs go-to-market execution so pipeline is not only founder hustle — site, content, social, and revenue ops in one pod.",
  },
  "york-ga-books-none": {
    headline: "Stand up books you can defend with investors",
    summary: "York IE installs bookkeeping, chart of accounts, and a monthly close so cash and burn are visible from day one.",
  },
  "york-ga-books-founder": {
    headline: "Take finance off the founder’s plate",
    summary: "York IE owns bookkeeping and monthly close so you get hours back and numbers you can put in front of a board.",
  },
  "york-ga-books-upgrade": {
    headline: "Upgrade spreadsheets into operating finance",
    summary: "York IE formalizes close, forecast, and board reporting so hiring and fundraising decisions are grounded in real numbers.",
  },
  "york-ga-runway-critical": {
    headline: "A cash plan in weeks — not quarters",
    summary: "York IE builds a 13-week cash forecast, cost levers, and bridge narrative when runway is tight.",
  },
  "york-ga-runway-tight": {
    headline: "Extend runway with a real operating plan",
    summary: "York IE installs burn tracking, scenario forecast, and close discipline before the next cash squeeze.",
  },
  "york-ga-fundraising": {
    headline: "Show up to the raise with metrics that hold up",
    summary: "York IE prepares financials, narrative, and data-room discipline so investor conversations do not stall on messy numbers.",
  },
  "york-ga-intros": {
    headline: "Be intro-ready when the right check appears",
    summary: "York IE tightens books, metrics, and story so a warm investor intro can convert.",
  },
  "york-ga-profitability": {
    headline: "A path to profit with every dollar accounted for",
    summary: "York IE runs bookkeeping, unit economics, and cost discipline so the profitability plan is real — not aspirational.",
  },
  "york-ga-forecast": {
    headline: "Stop steering from the rear-view mirror",
    summary: "York IE builds a rolling forecast fed by a real close so hiring and spend decisions look forward.",
  },
  "york-ga-unit-econ": {
    headline: "Know what each dollar of growth actually costs",
    summary: "York IE builds CAC, payback, and contribution tracking tied to the books so pricing and burn decisions are grounded.",
  },
  "york-ga-cap-table": {
    headline: "Cap table and books ready for diligence",
    summary: "York IE cleans equity records alongside bookkeeping so a raise or board cycle does not scramble.",
  },
  "york-ga-default": {
    headline: "Bookkeeping and FinOps that board members trust",
    summary: "York IE owns close, cash, and forecast so G&A becomes a control system — not a monthly scramble.",
  },
  "york-common-partner": {
    headline: "Hands-on help across R&D, GTM, and finance",
    summary:
      "York IE partners with founders on web/product build, full GTM, RevOps, and books — scoped to your Fuel scorecard.",
  },
};

/**
 * One scannable buyer-outcome line for the compact partner nudge.
 */
export function yorkNudgeMessage(offer: YorkServiceOffer, maxLen = 64): string {
  const raw = (YORK_NUDGE_COPY[offer.id]?.headline
    || yorkOfferOutcomeTitle(offer)
    || offer.howWeHelp[0]
    || offer.headline).replace(/\s+/g, " ").trim();
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

/**
 * Full sales summary under the outcome — one clear sentence, not a truncated checklist.
 */
export function yorkNudgeSummary(offer: YorkServiceOffer): string {
  const curated = YORK_NUDGE_COPY[offer.id]?.summary?.trim();
  const clean = (text: string) => text.replace(/\s+/g, " ").trim();
  if (curated) return clean(curated);

  const helps = offer.howWeHelp.map(s => s.trim()).filter(Boolean).slice(0, 3);
  if (!helps.length) {
    return clean(offer.pitch);
  }
  if (helps.length === 1) {
    return clean(`York IE delivers ${helps[0].replace(/^\w/, c => c.toLowerCase())} so this gap moves this quarter.`);
  }
  if (helps.length === 2) {
    return clean(`York IE delivers ${helps[0].toLowerCase()} and ${helps[1].toLowerCase()}.`);
  }
  return clean(`York IE delivers ${helps[0].toLowerCase()}, ${helps[1].toLowerCase()}, and ${helps[2].toLowerCase()}.`);
}
