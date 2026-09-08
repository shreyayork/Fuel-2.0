import React, { useState } from "react";
import { FuelIcon } from "./icons";

export type HelpFaqItem = {
  id: string;
  question: string;
  answer: string;
};

/** Platform FAQ generated from current Fuel founder / investor UI surfaces. */
export const FUEL_HELP_FAQ: HelpFaqItem[] = [
  {
    id: "what-is-fuel",
    question: "What is Fuel?",
    answer:
      "Fuel is York IE’s operating platform for startups. It turns your company profile, benchmarks, documents, and signals into an Overview scorecard, Intelligence feed, initiatives, and AI guidance.",
  },
  {
    id: "getting-started",
    question: "How do I get started?",
    answer:
      "Onboarding asks for your org type (Product, Service / Agency, or Investment), role, and company context. Product companies also walk Development, GTM, RevOps, and benchmarking; investment firms cover portfolio preferences.",
  },
  {
    id: "overview",
    question: "What’s on Overview?",
    answer:
      "Overview is your scorecard home: R&D, GTM, and G&A track scores, Recommended Actions, Fuel AI, and progress as you complete profile modules and benchmarks.",
  },
  {
    id: "credits",
    question: "What are profile credits vs monthly credits?",
    answer:
      "Profile credits unlock intelligence as you complete Company, R&D, GTM, G&A, and your first Benchmark (start with 50; earn up to 200 more). Monthly credits power AI actions like chat, uploads, source generation, and playbook runs.",
  },
  {
    id: "intelligence",
    question: "What is Intelligence?",
    answer:
      "Intelligence is the operating-signal feed from benchmarks, uploads, and logged metrics. You can Add source or Log intelligence, then open a row for provenance and history.",
  },
  {
    id: "ask-fuel",
    question: "What can Ask Fuel AI do?",
    answer:
      "Ask Fuel chats against this company’s live benchmark and signal data. Generate a signal-driven brief, browse playbooks, ask follow-ups, or upload a pitch deck for evaluation (also saved to Data Room).",
  },
  {
    id: "benchmarks",
    question: "How do benchmarks work?",
    answer:
      "Enter headline metrics (ARR, NRR, burn, Rule of 40, and more) and compare against peer cohort bands. Submitting sharpens intelligence and can earn profile credits; numbers stay in your workspace.",
  },
  {
    id: "initiatives-playbooks",
    question: "What are Initiatives and Playbooks?",
    answer:
      "Initiatives are actionable work Fuel suggests from tracks and briefs—you can add them and track milestones. Playbooks are structured runs (brief, KPI benchmark, assessments, fundraising readiness, board update, and more) against company context.",
  },
  {
    id: "data-room",
    question: "What is the Data Room?",
    answer:
      "A private place for pitch decks, notes, models, and similar files—one latest file per type. Uploads feed Intelligence, and founders control access.",
  },
  {
    id: "connectors",
    question: "Which connectors can I use?",
    answer:
      "From Overview and Account → Connectors you can link HubSpot and Granola. The broader integrations catalog also covers tools across Development, Marketing, RevOps, and FinOps.",
  },
  {
    id: "account",
    question: "Where do I manage account and billing?",
    answer:
      "Open Account settings from the sidebar user menu for profile, users, teams, connectors, usage, developer settings, and billing—plus appearance and log out.",
  },
  {
    id: "investor-vs-founder",
    question: "How does investor mode differ from founder mode?",
    answer:
      "Choosing Investment lands you on Portfolios (plus Pipeline and Watchlists) instead of founder Overview. You can open company workspaces and request Data Room access; founder-uploaded files stay gated until granted.",
  },
];

export function FuelHelpFaqPage({ onBack }: { onBack?: () => void }) {
  const [openId, setOpenId] = useState<string | null>(FUEL_HELP_FAQ[0]?.id ?? null);

  return (
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
              {expanded ? <div className="fuel-help-a">{item.answer}</div> : null}
            </div>
          );
        })}
      </div>

      <footer className="fuel-help-page-foot">
        Still stuck? Reach York IE from the sidebar help card when your profile is complete.
      </footer>
    </section>
  );
}
