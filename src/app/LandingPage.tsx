import { useMemo, useState } from "react";
import "./landing.css";

type LandingPageProps = {
  onSignIn: () => void;
};

const VERTICALS = ["B2B SaaS", "FinTech", "HealthTech", "DevTools", "AI / ML"] as const;
const STAGES = ["Pre-seed", "Seed", "Series A", "Series B+"] as const;

const COHORT_MEDIAN: Record<(typeof VERTICALS)[number], Record<(typeof STAGES)[number], string>> = {
  "B2B SaaS": { "Pre-seed": "140%", Seed: "200%", "Series A": "120%", "Series B+": "65%" },
  FinTech: { "Pre-seed": "110%", Seed: "175%", "Series A": "95%", "Series B+": "55%" },
  HealthTech: { "Pre-seed": "100%", Seed: "160%", "Series A": "90%", "Series B+": "50%" },
  DevTools: { "Pre-seed": "150%", Seed: "220%", "Series A": "130%", "Series B+": "70%" },
  "AI / ML": { "Pre-seed": "180%", Seed: "250%", "Series A": "145%", "Series B+": "80%" },
};

const MOCK_SLIDES = [
  {
    chrome: "agent — running sales impact assessment",
    lead: "Diagnose where revenue execution is leaking. Prepare statistics.",
    tags: ["net revenue retention", "pipeline coverage", "b2b payouts"],
    items: [
      { title: "net revenue retention", meta: "97 clients · top 50%" },
      { title: "customer acquisition", meta: "5 quarters tracked" },
      { title: "pre-cohort benchmarks", meta: "pipeline leverage · LTV payback" },
    ],
    rec: "Reprioritize segmentation by ICP",
  },
  {
    chrome: "agent — running product readiness scan",
    lead: "Map delivery risk against peer cohort ship cadence.",
    tags: ["release cadence", "qa coverage", "tech debt"],
    items: [
      { title: "release cadence", meta: "biweekly · above median" },
      { title: "qa coverage", meta: "72% critical paths" },
      { title: "architecture debt", meta: "2 blockers flagged" },
    ],
    rec: "Protect ship cadence before next hire wave",
  },
  {
    chrome: "agent — running finance snapshot",
    lead: "Pressure-test runway and burn against Seed peers.",
    tags: ["runway", "burn multiple", "rule of 40"],
    items: [
      { title: "cash runway", meta: "18 months · healthy" },
      { title: "burn multiple", meta: "1.6× · top quartile" },
      { title: "rule of 40", meta: "36 · around median" },
    ],
    rec: "Keep hiring gated to forecast checkpoints",
  },
] as const;

const HOW_STEPS = [
  {
    n: "01",
    title: "Sign up with your work email",
    body: "We verify the domain instantly so your KPI submissions count toward the global benchmark dataset. No demo call, no sales motion.",
  },
  {
    n: "02",
    title: "Watch the AI profile your company",
    body: "Our agent runs against your domain — scrapes the homepage, detects your stack, identifies your peer cohort. You confirm or correct in under a minute.",
  },
  {
    n: "03",
    title: "Run your first playbook in the same session",
    body: "Benchmark your metrics, evaluate your deck, or pull from the library. Every artifact lives in your workspace forever, retrievable next quarter.",
  },
] as const;

export default function LandingPage({ onSignIn }: LandingPageProps) {
  const [vertical, setVertical] = useState<(typeof VERTICALS)[number]>("B2B SaaS");
  const [stage, setStage] = useState<(typeof STAGES)[number]>("Seed");
  const [mockSlide, setMockSlide] = useState(0);
  const median = useMemo(() => COHORT_MEDIAN[vertical][stage], [vertical, stage]);
  const slide = MOCK_SLIDES[mockSlide];

  return (
    <div className="lp">
      <div className="lp-grid" aria-hidden="true" />
      <div className="lp-glow lp-glow-a" aria-hidden="true" />
      <div className="lp-glow lp-glow-b" aria-hidden="true" />

      <header className="lp-nav">
        <div className="lp-nav-inner">
          <a className="lp-brand" href="#top" onClick={e => e.preventDefault()}>
            <span className="lp-brand-mark" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 1.5c2.2 2.6 3.4 4.7 3.4 6.7A3.4 3.4 0 1 1 5.6 8.2C5.6 6.2 6.8 4.1 9 1.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="lp-brand-name">Fuel</span>
            <span className="lp-brand-by">by York IE</span>
          </a>
          <div className="lp-nav-actions">
            <button type="button" className="lp-link" onClick={onSignIn}>Sign in</button>
            <button type="button" className="lp-btn lp-btn-primary lp-btn-sm" onClick={onSignIn}>
              Get started
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* 1 — Hero */}
        <section className="lp-hero">
          <div className="lp-eyebrow-pill">
            <span className="lp-eyebrow-dot" aria-hidden="true" />
            New: Launch an all-in-one workspace for SaaS founders
          </div>
          <h1 className="lp-hero-title">
            <span className="lp-hero-line">The</span>
            <span className="lp-hero-line lp-grad">AI Operating System</span>
            <span className="lp-hero-line">for Growth-Stage SaaS.</span>
          </h1>
          <p className="lp-hero-sub">
            Real-time signals, peer-cohort benchmarks, and an AI chief of staff that helps founders
            move from insight to action.
          </p>
          <div className="lp-hero-ctas">
            <button type="button" className="lp-btn lp-btn-primary lp-btn-glow" onClick={onSignIn}>
              Benchmark My Company <span aria-hidden="true">→</span>
            </button>
            <button type="button" className="lp-btn lp-btn-ghost" onClick={onSignIn}>
              Evaluate My Pitch Deck <span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="lp-micro">work email · 60 seconds · no demo call · cancel anytime</p>
        </section>

        {/* 2 — What the AI does */}
        <section className="lp-section lp-ai">
          <p className="lp-kicker">What the AI does on your behalf</p>
          <h2 className="lp-section-title">From cold sign-up to a benchmarked diagnosis in one session.</h2>

          <div className="lp-mock">
            <div className="lp-mock-chrome">
              <div className="lp-mock-dots" aria-hidden="true"><span /><span /><span /></div>
              <code className="lp-mock-path">{slide.chrome}</code>
            </div>
            <div className="lp-mock-body">
              <p className="lp-mock-lead">– {slide.lead}</p>
              <div className="lp-mock-tags">
                {slide.tags.map((tag, i) => (
                  <span key={tag}>
                    {i > 0 ? <i aria-hidden="true">·</i> : null}
                    {tag}
                  </span>
                ))}
              </div>
              <ul className="lp-mock-list">
                {slide.items.map(item => (
                  <li key={item.title}>
                    <span className="lp-check" aria-hidden="true">✓</span>
                    <div>
                      <strong>{item.title}</strong>
                      <em>{item.meta}</em>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="lp-mock-rec">
                <span>Top recommendation</span>
                <strong>{slide.rec}</strong>
              </div>
            </div>
            <div className="lp-dots" role="tablist" aria-label="Product preview slides">
              {MOCK_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={mockSlide === i}
                  className={mockSlide === i ? "is-on" : undefined}
                  onClick={() => setMockSlide(i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 3 — Cohort preview */}
        <section className="lp-section">
          <div className="lp-cohort-panel">
            <div className="lp-cohort-grid">
              <div className="lp-cohort-copy">
                <p className="lp-kicker">Cohort preview</p>
                <h2 className="lp-section-title">See where the median company in your stage sits.</h2>
                <p className="lp-body">
                  Pick your vertical and stage. We&apos;ll surface the cohort&apos;s median ARR growth —
                  sign in to compare your own numbers and see all four percentile bands.
                </p>
                <div className="lp-filters">
                  <label className="lp-field">
                    <span>Vertical</span>
                    <select value={vertical} onChange={e => setVertical(e.target.value as typeof vertical)}>
                      {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </label>
                  <label className="lp-field">
                    <span>Stage</span>
                    <select value={stage} onChange={e => setStage(e.target.value as typeof stage)}>
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              <div className="lp-cohort-card">
                <span className="lp-cohort-label">Median ARR growth · cohort {vertical.split(" ")[0]}</span>
                <strong className="lp-cohort-value">{median}</strong>
                <em className="lp-cohort-note">Jan &apos;21 — current (Q2 &apos;24)</em>
              </div>
            </div>
          </div>
        </section>

        {/* 4 — How it works */}
        <section className="lp-section lp-how">
          <p className="lp-kicker">How it works</p>
          <h2 className="lp-section-title">From cold sign-up to your first benchmarked insight in about a minute.</h2>
          <div className="lp-how-grid">
            {HOW_STEPS.map(step => (
              <article key={step.n} className="lp-how-card">
                <span className="lp-step-pill">Step {step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 5 — Final CTA */}
        <section className="lp-section lp-final">
          <p className="lp-kicker">Ready when you are</p>
          <h2 className="lp-section-title lp-final-title">
            <span className="lp-hero-line">Build your workspace in</span>
            <span className="lp-hero-line lp-grad">under a minute.</span>
          </h2>
          <p className="lp-body lp-final-body">
            Sign in with your work email. We&apos;ll profile your company, slot you into your peer cohort,
            and queue your first benchmark before you finish your coffee.
          </p>
          <button type="button" className="lp-btn lp-btn-primary lp-btn-glow" onClick={onSignIn}>
            Create your workspace <span aria-hidden="true">→</span>
          </button>
          <p className="lp-micro">work email · 60 seconds · no demo call · cancel anytime</p>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-brand lp-brand-foot">
            <span className="lp-brand-mark" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 1.5c2.2 2.6 3.4 4.7 3.4 6.7A3.4 3.4 0 1 1 5.6 8.2C5.6 6.2 6.8 4.1 9 1.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="lp-brand-name">Fuel</span>
            <span className="lp-brand-by">BY YORK IE</span>
          </div>
          <div className="lp-footer-links">
            <button type="button" className="lp-link" onClick={onSignIn}>Sign in</button>
            <a className="lp-link" href="#top" onClick={e => e.preventDefault()}>Terms</a>
            <a className="lp-link" href="#top" onClick={e => e.preventDefault()}>Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
