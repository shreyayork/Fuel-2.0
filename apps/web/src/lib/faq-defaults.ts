import type { FaqPoint } from "@/db/schema";

/**
 * Design-library source: `Fuel-2.0/src/app/FuelHelpFaq.tsx` → `FUEL_HELP_FAQ`.
 *
 * Shortcuts in the design are in-app nav callbacks (not URLs). Mapped to Fuel
 * app routes where a stable href exists. Company tabs use
 * `/company/{{company_id}}?tab=…` — Help resolves `{{company_id}}` at render.
 *
 * Route map:
 *   account              → /account
 *   account-integrations → /account/integrations
 *   account-billing      → /account/billing
 *   investor-portfolios  → /portfolio
 *   investor-pipeline    → /pipeline
 *   investor-watchlists  → /watchlists
 *   initiatives          → /initiatives  (account-level) or
 *                          /company/{{company_id}}?tab=initiatives
 *   overview             → /company/{{company_id}}?tab=overview
 *   intelligence         → /company/{{company_id}}?tab=intelligence
 *   data-room            → /company/{{company_id}}?tab=dataroom
 *   mailto               → mailto:support@york.ie
 *
 * Ask Fuel action link: `[Ask Fuel](action:ask-fuel)` — opens drawer on Help.
 */
export const DEFAULT_FAQ_SEED: Array<{
  id: string;
  question: string;
  answer: string;
  points: FaqPoint[];
  footnote?: string | null;
  sortOrder: number;
}> = [
  {
    id: "faq_what-is-fuel",
    sortOrder: 10,
    question: "What is Fuel?",
    answer:
      "York IE’s operating platform for startups. It takes your profile, benchmarks, documents, and signals and turns them into an honest read on how the business is doing.",
    points: [
      {
        label: "[Overview](/company/{{company_id}}?tab=overview)",
        body: "A scorecard across product and engineering, go-to-market, and finance and operations.",
      },
      {
        label: "[Intelligence](/company/{{company_id}}?tab=intelligence)",
        body: "Every number Fuel knows, on one timeline with sources and history.",
      },
      {
        label: "[Initiatives](/initiatives)",
        body: "Gaps turned into tracked work with owners and milestones.",
      },
      {
        label: "[Ask Fuel](action:ask-fuel)",
        body: "An AI advisor that answers against your own numbers.",
      },
    ],
  },
  {
    id: "faq_how-fuel-helps",
    sortOrder: 20,
    question: "How does Fuel help me grow?",
    answer:
      "It gives you the outside view most founders never get, then turns it into work. The loop is four steps.",
    points: [
      {
        label: "See where you stand",
        body: "Benchmark against real companies at your stage, so you learn whether your growth, retention, and burn are genuinely strong or only look that way in isolation.",
      },
      {
        label: "Find what’s holding you back",
        body: "[Overview](/company/{{company_id}}?tab=overview) scores each track out of 100 and names the one or two gaps that matter right now.",
      },
      {
        label: "Fix it",
        body: "Turn a gap into a tracked [initiative](/initiatives), or run a playbook in [Ask Fuel](action:ask-fuel) when you need a deeper read first.",
      },
      {
        label: "Prove it moved",
        body: "[Intelligence](/company/{{company_id}}?tab=intelligence) keeps the history, so next quarter you can see the number change instead of guessing.",
      },
    ],
  },
  {
    id: "faq_getting-started",
    sortOrder: 30,
    question: "How do I get started?",
    answer: "Onboarding takes a few minutes and asks for enough context to build your first benchmark.",
    points: [
      {
        label: "Everyone",
        body: "Your org type (Product or Investment), your role, and company context.",
      },
      {
        label: "Product companies",
        body: "Also walk Development, GTM, RevOps, and benchmarking.",
      },
      { label: "Investment firms", body: "Cover portfolio preferences instead." },
    ],
    footnote:
      "Every section you finish adds credits and sharpens your scores on [Overview](/company/{{company_id}}?tab=overview).",
  },
  {
    id: "faq_overview",
    sortOrder: 40,
    question: "What’s on Overview?",
    answer: "One screen that answers “how is the business actually doing?”",
    points: [
      {
        label: "Track scores",
        body: "R&D, GTM, and G&A each scored out of 100, with the strengths and gaps behind the number.",
      },
      {
        label: "Recommended Actions",
        body: "Ranked by what matters now, not a generic checklist.",
      },
      {
        label: "Fuel AI summary",
        body: "The same read in plain language — open [Ask Fuel](action:ask-fuel) to go deeper.",
      },
    ],
    footnote: "Scores sharpen as you complete profile modules and submit benchmarks. Open [Overview](/company/{{company_id}}?tab=overview).",
  },
  {
    id: "faq_benchmarks",
    sortOrder: 50,
    question: "How do benchmarks work, and what do I learn?",
    answer:
      "You enter your headline numbers and Fuel places you against the peer cohort for your stage, business model, and region.",
    points: [
      {
        label: "What you enter",
        body: "Annual recurring revenue, growth, net revenue retention, gross margin, burn, Rule of 40, and cash on hand.",
      },
      {
        label: "What you see",
        body: "The band your peers sit in and exactly where you land inside it — so “is 120% growth good?” gets a specific answer instead of a guess.",
      },
      {
        label: "What it unlocks",
        body: "Feeds [Intelligence](/company/{{company_id}}?tab=intelligence), sharpens your track scores on [Overview](/company/{{company_id}}?tab=overview), and earns 50 credits the first time.",
      },
    ],
    footnote: "Your numbers stay in your workspace.",
  },
  {
    id: "faq_intelligence",
    sortOrder: 60,
    question: "What does Intelligence actually do?",
    answer:
      "It’s your operating history — every number Fuel knows about the business, on one timeline. Open [Intelligence](/company/{{company_id}}?tab=intelligence).",
    points: [
      {
        label: "Twelve categories",
        body: "Growth, Retention, Efficiency, Finance, Fundraising, Go-to-market, Product, Team, Strategic, Customer Success, Board Reporting, and Vendor Stack.",
      },
      {
        label: "Every row carries",
        body: "A value, the period it belongs to, the sources behind it, and every earlier reading.",
      },
      {
        label: "Why it matters",
        body: "You can tell whether a number is moving or stuck, trace any figure before it goes in a board deck, and your [Overview](/company/{{company_id}}?tab=overview) scores read from these same rows.",
      },
      {
        label: "Where signals come from",
        body: "Benchmark submissions, onboarding answers, and document uploads — or add your own with Add source or Log intelligence on the [Intelligence](/company/{{company_id}}?tab=intelligence) tab.",
      },
    ],
  },
  {
    id: "faq_playbooks",
    sortOrder: 70,
    question: "What are Playbooks?",
    answer:
      "York IE’s operator playbooks, run against your company instead of a blank page — the structured reviews an advisor would otherwise walk you through.",
    points: [
      {
        label: "Founder",
        body: "Generate Intelligence Brief, KPI Benchmark, and Pitch Deck Evaluation.",
      },
      {
        label: "Function assessments",
        body: "Finance, marketing, product and engineering, and revenue operations.",
      },
      { label: "Growth", body: "Retention Deep Dive and GTM Economics Review." },
      {
        label: "Capital and market",
        body: "Fundraising Readiness, Board Update Draft, and Competitive Landscape Scan.",
      },
    ],
    footnote:
      "Each one reads your profile, benchmarks, and documents, so what comes back is about your business. Run one from the Playbooks chip in [Ask Fuel](action:ask-fuel), or Run playbook → on any track in [Overview](/company/{{company_id}}?tab=overview).",
  },
  {
    id: "faq_initiatives",
    sortOrder: 80,
    question: "How do I manage initiatives?",
    answer:
      "Initiatives are how a gap becomes work someone actually does. Open [Initiatives](/initiatives).",
    points: [
      {
        label: "Where they come from",
        body: "Fuel suggests them from your scorecard and your intelligence brief — add the ones worth doing, or write your own with + New initiative.",
      },
      {
        label: "What each one holds",
        body: "A track (R&D, GTM, or G&A) and topic, a description, the people assigned, any advisors you attach, and a target quarter.",
      },
      {
        label: "How you track progress",
        body: "A milestone checklist, plus intelligence linked as a baseline and a current reading — so progress is the number moving, not a status update.",
      },
      {
        label: "How the tab is organised",
        body: "Active and Completed stay separate, with Fuel’s suggestions in their own drawer.",
      },
    ],
  },
  {
    id: "faq_how-credits-work",
    sortOrder: 90,
    question: "How do credits work?",
    answer: "Credits are how you spend Fuel. You earn them by setting up, then spend them on AI work.",
    points: [
      {
        label: "How you earn",
        body: "50 credits each for your company profile, product and engineering, go-to-market, finance and operations, and your first full benchmark — 250 in total.",
      },
      {
        label: "What they buy",
        body: "[Ask Fuel](action:ask-fuel) chat, document uploads, source generation, and playbook runs.",
      },
      {
        label: "Where to check",
        body: "Your balance sits in the sidebar, next to your name. Usage and plan live in [Account → Billing](/account/billing).",
      },
    ],
  },
  {
    id: "faq_credits",
    sortOrder: 100,
    question: "What are profile credits vs monthly credits?",
    answer: "Two pools that both spend the same way.",
    points: [
      {
        label: "Profile credits",
        body: "The 250 you earn from setup. They stay until you use them.",
      },
      {
        label: "Monthly credits",
        body: "The allowance that comes with your plan — 250 on Free, 2,000 on Pro — refreshed each month.",
      },
    ],
    footnote:
      "Fuel spends monthly credits first, so earned and topped-up credits are still there when you need them. Manage the plan in [Account → Billing](/account/billing).",
  },
  {
    id: "faq_credits-run-out",
    sortOrder: 110,
    question: "What happens when I run out of credits?",
    answer: "[Ask Fuel](action:ask-fuel), uploads, and playbooks pause until you have room again.",
    points: [
      {
        label: "Daily cap reached",
        body: "Free pauses for the rest of the day; Pro resets in about 6 hours.",
      },
      {
        label: "Monthly pool empty",
        body: "Upgrade, or buy a top-up pack from the credits menu in [Account → Billing](/account/billing).",
      },
    ],
    footnote: "Billing question? Email the team at [support@york.ie](mailto:support@york.ie).",
  },
  {
    id: "faq_ask-fuel",
    sortOrder: 120,
    question: "What can Ask Fuel AI do?",
    answer:
      "An advisor you can question at any hour without booking a call, running against this company’s live benchmark and signal data. Open [Ask Fuel](action:ask-fuel).",
    points: [
      {
        label: "Generate a brief",
        body: "A signal-driven read on the state of the business.",
      },
      { label: "Run any playbook", body: "The same catalog as the Playbooks chip." },
      {
        label: "Dig into a number",
        body: "Ask follow-ups about anything on your [Overview](/company/{{company_id}}?tab=overview) scorecard.",
      },
      {
        label: "Score a pitch deck",
        body: "Upload it and have it rated against the rubric investors use.",
      },
    ],
    footnote:
      "Anything you upload is saved to the [Data Room](/company/{{company_id}}?tab=dataroom).",
  },
  {
    id: "faq_data-room",
    sortOrder: 130,
    question: "What is the Data Room?",
    answer:
      "A private place for pitch decks, notes, models, and similar files — one latest file per type. Open the [Data Room](/company/{{company_id}}?tab=dataroom).",
    points: [
      {
        label: "Uploads feed Intelligence",
        body: "A document you drop in becomes numbers Fuel can reason about in [Intelligence](/company/{{company_id}}?tab=intelligence).",
      },
      {
        label: "You control access",
        body: "Investors have to request it, and your files stay gated until you grant it.",
      },
    ],
  },
  {
    id: "faq_integrations",
    sortOrder: 140,
    question: "How do integrations help?",
    answer:
      "Integrations pull the conversations already happening around the company into Fuel, so you don’t have to re-type them. Link them from [Account settings](/account/integrations).",
    points: [
      { label: "Available now", body: "HubSpot, Slack, and Granola." },
      {
        label: "What we fetch",
        body: "Messages, emails, and notes from those places — meeting summaries from Granola, channel context from Slack, emails and CRM activity from HubSpot.",
      },
      {
        label: "If you’re an investor",
        body: "HubSpot also brings in deal pipelines so you can manage stages, next steps, and coverage in [Pipeline](/pipeline) instead of jumping back to the CRM.",
      },
      {
        label: "What happens next",
        body: "Each note lands in Sources on [Intelligence](/company/{{company_id}}?tab=intelligence). Fuel turns it into Intelligence, then suggests new work on [Initiatives](/initiatives).",
      },
    ],
    footnote:
      "A broader catalog covers tools across product and engineering, marketing, revenue operations, and finance operations as you grow. Open [Account → Integrations](/account/integrations).",
  },
  {
    id: "faq_account",
    sortOrder: 150,
    question: "Where do I manage account and billing?",
    answer: "Open [Account settings](/account) from the sidebar user menu.",
    points: [
      {
        label: "Workspace",
        body: "Profile, users, teams, and [integrations](/account/integrations).",
      },
      {
        label: "Usage and billing",
        body: "Credit usage, your plan, and developer settings — start at [Billing](/account/billing).",
      },
      { label: "Preferences", body: "Appearance and log out." },
    ],
  },
  {
    id: "faq_investor-vs-founder",
    sortOrder: 160,
    question: "How does investor mode differ from founder mode?",
    answer: "Choosing Investment during onboarding changes where you land and what you can see.",
    points: [
      {
        label: "Where you land",
        body: "[Portfolios](/portfolio), [Pipeline](/pipeline), and [Watchlists](/watchlists) instead of the founder [Overview](/company/{{company_id}}?tab=overview).",
      },
      {
        label: "What you can open",
        body: "Company workspaces, and you can request [Data Room](/company/{{company_id}}?tab=dataroom) access.",
      },
      {
        label: "What stays private",
        body: "Founder-uploaded files are gated until access is granted.",
      },
    ],
  },
  {
    id: "faq_contact-team",
    sortOrder: 170,
    question: "How do I reach the Fuel team?",
    answer:
      "Email [support@york.ie](mailto:support@york.ie) for product questions, billing, access, or anything this page doesn’t cover. Someone on the York IE team will get back to you.",
    points: [],
  },
];

/** Fixed ids owned by the design-library seed (safe to refresh). */
export const DEFAULT_FAQ_SEED_IDS = DEFAULT_FAQ_SEED.map((r) => r.id);

export const FAQ_SEED_CURATOR = "system@york.ie";
