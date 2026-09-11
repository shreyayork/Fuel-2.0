import React, { createContext, useContext, useState } from "react";
import { FuelIcon } from "./icons";

export const FUEL_SUPPORT_EMAIL = "support@york.ie";

export type HelpFaqGoTo =
  | "overview"
  | "intelligence"
  | "initiatives"
  | "data-room"
  | "ask-fuel"
  | "account"
  | "account-integrations"
  | "account-billing"
  | "investor-portfolios"
  | "investor-pipeline"
  | "investor-watchlists";

type HelpFaqNav = (dest: HelpFaqGoTo) => void;

const HelpFaqNavContext = createContext<HelpFaqNav | null>(null);

function Shortcut({ to, children }: { to: HelpFaqGoTo; children: React.ReactNode }) {
  const go = useContext(HelpFaqNavContext);
  if (!go) return <>{children}</>;
  return (
    <button type="button" className="fuel-help-shortcut" onClick={() => go(to)}>
      {children}
    </button>
  );
}

export type HelpFaqPoint = {
  label: React.ReactNode;
  body: React.ReactNode;
};

export type HelpFaqItem = {
  id: string;
  question: string;
  /** Opening line — the direct answer on its own. */
  answer: React.ReactNode;
  /** Scannable detail. Each point leads with a label so founders can skim. */
  points?: HelpFaqPoint[];
  /** Closing aside — where to click, or the caveat worth knowing. */
  footnote?: React.ReactNode;
};

function SupportEmailLink() {
  return (
    <a className="fuel-help-mail" href={`mailto:${FUEL_SUPPORT_EMAIL}`}>
      {FUEL_SUPPORT_EMAIL}
    </a>
  );
}

/** Platform FAQ generated from current Fuel founder / investor UI surfaces. */
export const FUEL_HELP_FAQ: HelpFaqItem[] = [
  {
    id: "what-is-fuel",
    question: "What is Fuel?",
    answer:
      "York IE’s operating platform for startups. It takes your profile, benchmarks, documents, and signals and turns them into an honest read on how the business is doing.",
    points: [
      { label: <Shortcut to="overview">Overview</Shortcut>, body: "A scorecard across product and engineering, go-to-market, and finance and operations." },
      { label: <Shortcut to="intelligence">Intelligence</Shortcut>, body: "Every number Fuel knows, on one timeline with sources and history." },
      { label: <Shortcut to="initiatives">Initiatives</Shortcut>, body: "Gaps turned into tracked work with owners and milestones." },
      { label: <Shortcut to="ask-fuel">Ask Fuel</Shortcut>, body: "An AI advisor that answers against your own numbers." },
    ],
  },
  {
    id: "how-fuel-helps",
    question: "How does Fuel help me grow?",
    answer:
      "It gives you the outside view most founders never get, then turns it into work. The loop is four steps.",
    points: [
      { label: "See where you stand", body: "Benchmark against real companies at your stage, so you learn whether your growth, retention, and burn are genuinely strong or only look that way in isolation." },
      { label: "Find what’s holding you back", body: <><Shortcut to="overview">Overview</Shortcut> scores each track out of 100 and names the one or two gaps that matter right now.</> },
      { label: "Fix it", body: <>Turn a gap into a tracked <Shortcut to="initiatives">initiative</Shortcut>, or run a playbook in <Shortcut to="ask-fuel">Ask Fuel</Shortcut> when you need a deeper read first.</> },
      { label: "Prove it moved", body: <><Shortcut to="intelligence">Intelligence</Shortcut> keeps the history, so next quarter you can see the number change instead of guessing.</> },
    ],
  },
  {
    id: "getting-started",
    question: "How do I get started?",
    answer: "Onboarding takes a few minutes and asks for enough context to build your first benchmark.",
    points: [
      { label: "Everyone", body: "Your org type (Product, Service / Agency, or Investment), your role, and company context." },
      { label: "Product companies", body: "Also walk Development, GTM, RevOps, and benchmarking." },
      { label: "Investment firms", body: "Cover portfolio preferences instead." },
    ],
    footnote: <>Every section you finish adds credits and sharpens your scores on <Shortcut to="overview">Overview</Shortcut>.</>,
  },
  {
    id: "overview",
    question: "What’s on Overview?",
    answer: "One screen that answers “how is the business actually doing?”",
    points: [
      { label: "Track scores", body: "R&D, GTM, and G&A each scored out of 100, with the strengths and gaps behind the number." },
      { label: "Recommended Actions", body: "Ranked by what matters now, not a generic checklist." },
      { label: "Fuel AI summary", body: <>The same read in plain language — open <Shortcut to="ask-fuel">Ask Fuel</Shortcut> to go deeper.</> },
    ],
    footnote: <>Scores sharpen as you complete profile modules and submit benchmarks. Open <Shortcut to="overview">Overview</Shortcut>.</>,
  },
  {
    id: "benchmarks",
    question: "How do benchmarks work, and what do I learn?",
    answer:
      "You enter your headline numbers and Fuel places you against the peer cohort for your stage, business model, and region.",
    points: [
      { label: "What you enter", body: "Annual recurring revenue, growth, net revenue retention, gross margin, burn, Rule of 40, and cash on hand." },
      { label: "What you see", body: "The band your peers sit in and exactly where you land inside it — so “is 120% growth good?” gets a specific answer instead of a guess." },
      { label: "What it unlocks", body: <>Feeds <Shortcut to="intelligence">Intelligence</Shortcut>, sharpens your track scores on <Shortcut to="overview">Overview</Shortcut>, and earns 50 credits the first time.</> },
    ],
    footnote: "Your numbers stay in your workspace.",
  },
  {
    id: "intelligence",
    question: "What does Intelligence actually do?",
    answer: <>It’s your operating history — every number Fuel knows about the business, on one timeline. Open <Shortcut to="intelligence">Intelligence</Shortcut>.</>,
    points: [
      { label: "Twelve categories", body: "Growth, Retention, Efficiency, Finance, Fundraising, Go-to-market, Product, Team, Strategic, Customer Success, Board Reporting, and Vendor Stack." },
      { label: "Every row carries", body: "A value, the period it belongs to, the sources behind it, and every earlier reading." },
      { label: "Why it matters", body: <>You can tell whether a number is moving or stuck, trace any figure before it goes in a board deck, and your <Shortcut to="overview">Overview</Shortcut> scores read from these same rows.</> },
      { label: "Where signals come from", body: <>Benchmark submissions, onboarding answers, and document uploads — or add your own with Add source or Log intelligence on the <Shortcut to="intelligence">Intelligence</Shortcut> tab.</> },
    ],
  },
  {
    id: "playbooks",
    question: "What are Playbooks?",
    answer:
      "York IE’s operator playbooks, run against your company instead of a blank page — the structured reviews an advisor would otherwise walk you through.",
    points: [
      { label: "Founder", body: "Generate Intelligence Brief, KPI Benchmark, and Pitch Deck Evaluation." },
      { label: "Function assessments", body: "Finance, marketing, product and engineering, and revenue operations." },
      { label: "Growth", body: "Retention Deep Dive and GTM Economics Review." },
      { label: "Capital and market", body: "Fundraising Readiness, Board Update Draft, and Competitive Landscape Scan." },
    ],
    footnote: (
      <>
        Each one reads your profile, benchmarks, and documents, so what comes back is about your business. Run one from the Playbooks chip in <Shortcut to="ask-fuel">Ask Fuel</Shortcut>, or Run playbook → on any track in <Shortcut to="overview">Overview</Shortcut>.
      </>
    ),
  },
  {
    id: "initiatives",
    question: "How do I manage initiatives?",
    answer: <>Initiatives are how a gap becomes work someone actually does. Open <Shortcut to="initiatives">Initiatives</Shortcut>.</>,
    points: [
      { label: "Where they come from", body: <>Fuel suggests them from your scorecard and your intelligence brief — add the ones worth doing, or write your own with + New initiative.</> },
      { label: "What each one holds", body: "A track (R&D, GTM, or G&A) and topic, a description, the people assigned, any advisors you attach, and a target quarter." },
      { label: "How you track progress", body: <>A milestone checklist, plus <Shortcut to="intelligence">intelligence</Shortcut> linked as a baseline and a current reading — so progress is the number moving, not a status update.</> },
      { label: "How the tab is organised", body: "Active and Completed stay separate, with Fuel’s suggestions in their own drawer." },
    ],
  },
  {
    id: "how-credits-work",
    question: "How do credits work?",
    answer: "Credits are how you spend Fuel. You earn them by setting up, then spend them on AI work.",
    points: [
      { label: "How you earn", body: "50 credits each for your company profile, product and engineering, go-to-market, finance and operations, and your first full benchmark — 250 in total." },
      { label: "What they buy", body: <><Shortcut to="ask-fuel">Ask Fuel</Shortcut> chat, document uploads, source generation, and playbook runs.</> },
      { label: "Where to check", body: <>Your balance sits in the sidebar, next to your name. Usage and plan live in <Shortcut to="account-billing">Account → Billing</Shortcut>.</> },
    ],
  },
  {
    id: "credits",
    question: "What are profile credits vs monthly credits?",
    answer: "Two pools that both spend the same way.",
    points: [
      { label: "Profile credits", body: "The 250 you earn from setup. They stay until you use them." },
      { label: "Monthly credits", body: "The allowance that comes with your plan — 250 on Free, 2,000 on Pro — refreshed each month." },
    ],
    footnote: <>Fuel spends monthly credits first, so earned and topped-up credits are still there when you need them. Manage the plan in <Shortcut to="account-billing">Account → Billing</Shortcut>.</>,
  },
  {
    id: "credits-run-out",
    question: "What happens when I run out of credits?",
    answer: <><Shortcut to="ask-fuel">Ask Fuel</Shortcut>, uploads, and playbooks pause until you have room again.</>,
    points: [
      { label: "Daily cap reached", body: "Free pauses for the rest of the day; Pro resets in about 6 hours." },
      { label: "Monthly pool empty", body: <>Upgrade, or buy a top-up pack from the credits menu in <Shortcut to="account-billing">Account → Billing</Shortcut>.</> },
    ],
    footnote: (
      <>
        Billing question? Email the team at <SupportEmailLink />.
      </>
    ),
  },
  {
    id: "ask-fuel",
    question: "What can Ask Fuel AI do?",
    answer:
      <>An advisor you can question at any hour without booking a call, running against this company’s live benchmark and signal data. Open <Shortcut to="ask-fuel">Ask Fuel</Shortcut>.</>,
    points: [
      { label: "Generate a brief", body: "A signal-driven read on the state of the business." },
      { label: "Run any playbook", body: "The same catalog as the Playbooks chip." },
      { label: "Dig into a number", body: <>Ask follow-ups about anything on your <Shortcut to="overview">Overview</Shortcut> scorecard.</> },
      { label: "Score a pitch deck", body: "Upload it and have it rated against the rubric investors use." },
    ],
    footnote: <>Anything you upload is saved to the <Shortcut to="data-room">Data Room</Shortcut>.</>,
  },
  {
    id: "data-room",
    question: "What is the Data Room?",
    answer: <>A private place for pitch decks, notes, models, and similar files — one latest file per type. Open the <Shortcut to="data-room">Data Room</Shortcut>.</>,
    points: [
      { label: "Uploads feed Intelligence", body: <>A document you drop in becomes numbers Fuel can reason about in <Shortcut to="intelligence">Intelligence</Shortcut>.</> },
      { label: "You control access", body: "Investors have to request it, and your files stay gated until you grant it." },
    ],
  },
  {
    id: "integrations",
    question: "How do integrations help?",
    answer: (
      <>
        Integrations pull the conversations already happening around the company into Fuel, so you don’t have to re-type them. Link them from <Shortcut to="account-integrations">Account settings</Shortcut>.
      </>
    ),
    points: [
      { label: "Available now", body: "HubSpot, Slack, and Granola." },
      { label: "What we fetch", body: "Messages, emails, and notes from those places — meeting summaries from Granola, channel context from Slack, emails and CRM activity from HubSpot." },
      { label: "If you’re an investor", body: <>HubSpot also brings in deal pipelines so you can manage stages, next steps, and coverage in <Shortcut to="investor-pipeline">Pipeline</Shortcut> instead of jumping back to the CRM.</> },
      { label: "What happens next", body: <>Each note lands in Sources on <Shortcut to="intelligence">Intelligence</Shortcut>. Fuel turns it into Intelligence, then suggests new work on <Shortcut to="initiatives">Initiatives</Shortcut>.</> },
    ],
    footnote: <>A broader catalog covers tools across product and engineering, marketing, revenue operations, and finance operations as you grow. Open <Shortcut to="account-integrations">Account → Integrations</Shortcut>.</>,
  },
  {
    id: "account",
    question: "Where do I manage account and billing?",
    answer: <>Open <Shortcut to="account">Account settings</Shortcut> from the sidebar user menu.</>,
    points: [
      { label: "Workspace", body: <>Profile, users, teams, and <Shortcut to="account-integrations">integrations</Shortcut>.</> },
      { label: "Usage and billing", body: <>Credit usage, your plan, and developer settings — start at <Shortcut to="account-billing">Billing</Shortcut>.</> },
      { label: "Preferences", body: "Appearance and log out." },
    ],
  },
  {
    id: "investor-vs-founder",
    question: "How does investor mode differ from founder mode?",
    answer: "Choosing Investment during onboarding changes where you land and what you can see.",
    points: [
      { label: "Where you land", body: <><Shortcut to="investor-portfolios">Portfolios</Shortcut>, <Shortcut to="investor-pipeline">Pipeline</Shortcut>, and <Shortcut to="investor-watchlists">Watchlists</Shortcut> instead of the founder <Shortcut to="overview">Overview</Shortcut>.</> },
      { label: "What you can open", body: <>Company workspaces, and you can request <Shortcut to="data-room">Data Room</Shortcut> access.</> },
      { label: "What stays private", body: "Founder-uploaded files are gated until access is granted." },
    ],
  },
  {
    id: "contact-team",
    question: "How do I reach the Fuel team?",
    answer: (
      <>
        Email <SupportEmailLink /> for product questions, billing, access, or anything this page doesn’t cover. Someone on the York IE team will get back to you.
      </>
    ),
  },
];

export function FuelHelpFaqPage({
  onBack,
  onGoTo,
}: {
  onBack?: () => void;
  onGoTo?: HelpFaqNav;
}) {
  const [openId, setOpenId] = useState<string | null>(FUEL_HELP_FAQ[0]?.id ?? null);

  return (
    <HelpFaqNavContext.Provider value={onGoTo ?? null}>
      <section className="fuel-help-page" aria-labelledby="fuel-help-page-title">
        {onBack ? (
          <div className="fuel-help-page-toolbar">
            <button type="button" className="fuel-help-back" onClick={onBack}>
              ← Back
            </button>
          </div>
        ) : null}

        <header className="fuel-help-page-head">
          <span className="fuel-help-eyebrow">Support</span>
          <h1 id="fuel-help-page-title">Help &amp; FAQ</h1>
          <p>Quick answers about Fuel’s workspace, AI, benchmarks, and account tools.</p>
        </header>

        <div className="fuel-help-page-grid">
          {FUEL_HELP_FAQ.map(item => {
            const expanded = openId === item.id;
            return (
              <div key={item.id} className={`fuel-help-item${expanded ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="fuel-help-q"
                  aria-expanded={expanded}
                  onClick={() => setOpenId(expanded ? null : item.id)}
                >
                  <span>{item.question}</span>
                  <FuelIcon name="chevronDown" size={16} className="fuel-help-caret" />
                </button>
                {expanded ? (
                  <div className="fuel-help-a">
                    <p className="fuel-help-lead">{item.answer}</p>
                    {item.points ? (
                      <ul className="fuel-help-points">
                        {item.points.map((point, index) => (
                          <li key={index}>
                            <span className="fuel-help-point-label">{point.label}</span>
                            {" — "}
                            {point.body}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {item.footnote ? <p className="fuel-help-note">{item.footnote}</p> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <footer className="fuel-help-page-foot">
          Still stuck? Email the team at <SupportEmailLink />.
        </footer>
      </section>
    </HelpFaqNavContext.Provider>
  );
}
