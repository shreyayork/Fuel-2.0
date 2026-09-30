import React, { useEffect, useRef, useState } from "react";
import { FuelIcon, type FuelIconName } from "../icons";
import type { LegalDocId } from "../legal/legalContent";
import { FuelMarketingFaq } from "./FuelMarketingFaq";
import { FuelMarketingFooter, FuelMarketingHeader } from "./FuelMarketingChrome";
import { FuelMark, YorkMark } from "./FuelMark";
import "./marketing.css";

const TYPED = "Move your company forward";
const LETTER_DELAY_S = 0.045;

const HOW = [
  {
    n: "01",
    title: "Understand the landscape",
    body: "Follow the market trends, competitive moves, and company developments shaping your business, investment pipeline, or portfolio.",
  },
  {
    n: "02",
    title: "Put performance in context",
    body: "Use relevant peer benchmarks to understand company strengths, spot gaps, and ask better questions about the path ahead.",
  },
  {
    n: "03",
    title: "Identify where to focus",
    body: "Define strategic priorities for your company, identify businesses to explore in your pipeline, or pinpoint where a portfolio company needs support.",
  },
  {
    n: "04",
    title: "Turn insight into action",
    body: "Translate company priorities into cross-functional initiatives with clear ownership, milestones, and measures of success. Give support a specific purpose and a way to track progress.",
  },
  {
    n: "05",
    title: "Follow progress over time",
    body: "Review execution alongside business performance. Keep company strategy informed by results and maintain visibility into developments across your pipeline and portfolio.",
  },
];

const START: { n: string; title: string; body: string; icon: FuelIconName }[] = [
  {
    n: "01",
    title: "Choose your focus",
    body: "Start with your own company, your investment pipeline, or your portfolio.",
    icon: "strategic",
  },
  {
    n: "02",
    title: "Bring the context together",
    body: "Build a picture of the companies and markets that matter to you.",
    icon: "layoutGrid",
  },
  {
    n: "03",
    title: "Find your next move",
    body: "Explore insights and benchmarks to identify a strategic priority, a company to investigate, or an opportunity to help.",
    icon: "investors",
  },
];

const FEATURES: { label: string; icon: FuelIconName; ring: "outer" | "inner" }[] = [
  { label: "Benchmarks", icon: "benchmarks", ring: "outer" },
  { label: "Intelligence", icon: "sparkles", ring: "outer" },
  { label: "Initiatives", icon: "initiatives", ring: "outer" },
  { label: "Ask Fuel", icon: "wand", ring: "outer" },
  { label: "Playbooks", icon: "playbooks", ring: "outer" },
  { label: "Data room", icon: "file", ring: "outer" },
  { label: "Research", icon: "search", ring: "inner" },
  { label: "Portfolio", icon: "portfolios", ring: "inner" },
  { label: "Pitch deck", icon: "boardReporting", ring: "inner" },
  { label: "Scorecard", icon: "gauge", ring: "inner" },
];

const COHORT_P50 = 42;

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) setInView(true);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

function Aurora() {
  return (
    <div className="mkt-aurora" aria-hidden="true">
      <div className="mkt-aurora-a" />
      <div className="mkt-aurora-b" />
      <div className="mkt-aurora-c" />
      <div className="mkt-aurora-grid" />
      <div className="mkt-aurora-noise" />
    </div>
  );
}

function scrollToId(id: string) {
  const node = document.getElementById(id);
  if (!node) return;
  const top = node.getBoundingClientRect().top + window.scrollY - 76;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function HowIcon({ n }: { n: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (n === "01") {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.5 1.5" />
      </svg>
    );
  }
  if (n === "02") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M5 19V10M12 19V5M19 19v-7" />
      </svg>
    );
  }
  if (n === "03") {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  if (n === "04") {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d="M4 16l5-5 3 3 8-8" />
      <path d="M14 6h6v6" />
    </svg>
  );
}

function HowFuelWorks({ onGetStarted }: { onGetStarted: () => void }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const copy = copyRef.current;
    if (!section || !copy) return;

    const place = () => {
      if (window.matchMedia("(max-width: 900px)").matches) {
        copy.style.top = "";
        copy.style.transform = "";
        return;
      }
      const copyH = copy.offsetHeight;
      const viewH = window.innerHeight;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - viewH;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(travel, 0));
      const progress = travel > 0 ? scrolled / travel : 0;
      const center = Math.max(88, (viewH - copyH) / 2);
      const driftSpan = Math.min(36, Math.max(travel, 0) * 0.2);
      const drift = (progress - 0.5) * driftSpan;
      copy.style.top = `${center}px`;
      copy.style.transform = `translateY(${drift}px)`;
    };

    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, []);

  return (
    <section className="mkt-section mkt-how-section is-shade" id="how-fuel-works" ref={sectionRef}>
      <div className="mkt-how">
        <div className="mkt-how-sticky" ref={copyRef}>
          <div className="mkt-kicker is-left">How Fuel works</div>
          <h2>
            <span>From understanding the opportunity</span>
            to moving it forward.
          </h2>
        </div>
        <div className="mkt-how-cards">
          {HOW.map(step => (
            <article key={step.n} className="mkt-how-card">
              <span className="mkt-how-icon">
                <HowIcon n={step.n} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
          <button type="button" className="mkt-how-start" onClick={onGetStarted}>
            <span className="mkt-how-start-kicker">Get started</span>
            <strong>Get Started with Fuel</strong>
            <p>Start with your own company, your investment pipeline, or your portfolio.</p>
            <span className="mkt-how-start-go">Continue <span aria-hidden="true">→</span></span>
          </button>
        </div>
      </div>
    </section>
  );
}

function OrbitRing({
  features,
  radius,
  duration,
  reverse,
  offset = 0,
}: {
  features: typeof FEATURES;
  radius: number;
  duration: string;
  reverse?: boolean;
  offset?: number;
}) {
  return (
    <div
      className={`mkt-orbit-ring${reverse ? " is-reverse" : ""}`}
      style={{ ["--orbit-duration" as string]: duration, ["--orbit-size" as string]: `${radius * 2}px` }}
    >
      {features.map((feature, index) => {
        const angle = offset + (360 / features.length) * index;
        return (
          <div
            key={feature.label}
            className="mkt-orbit-slot"
            style={{ ["--a" as string]: `${angle}deg`, ["--r" as string]: `${radius}px` }}
          >
            <div className="mkt-orbit-counter">
              <div className="mkt-orbit-upright">
                <div className="mkt-orbit-tile">
                  <FuelIcon name={feature.icon} size={14} />
                  <span>{feature.label}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CHAT_QUESTION = "Review my pitch deck";
const CHAT_ROWS = [
  { label: "Problem", score: "18", note: "Clear and specific." },
  { label: "Market", score: "15", note: "Name the peers." },
  { label: "Traction", score: "12", note: "Put the number next to the cohort." },
  { label: "Ask", score: "14", note: "Use of funds is thin." },
];

function FuelChatDemo() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [typed, setTyped] = useState(0);
  const [sent, setSent] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [reply, setReply] = useState(false);
  const [rows, setRows] = useState(0);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setReduceMotion(true);
    setTyped(CHAT_QUESTION.length);
    setSent(true);
    setReply(true);
    setRows(CHAT_ROWS.length);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      entries => setInView(entries.some(entry => entry.isIntersecting)),
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    let alive = true;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(() => {
        if (alive) fn();
      }, ms));
    };
    const run = () => {
      setTyped(0);
      setSent(false);
      setThinking(false);
      setReply(false);
      setRows(0);
      const typeStart = 420;
      for (let i = 1; i <= CHAT_QUESTION.length; i += 1) {
        later(typeStart + i * 42, () => setTyped(i));
      }
      const typedDone = typeStart + CHAT_QUESTION.length * 42;
      later(typedDone + 320, () => {
        setSent(true);
        setThinking(true);
      });
      later(typedDone + 1200, () => {
        setThinking(false);
        setReply(true);
      });
      CHAT_ROWS.forEach((_, index) => {
        later(typedDone + 1450 + index * 240, () => setRows(index + 1));
      });
      later(typedDone + 1450 + CHAT_ROWS.length * 240 + 3200, run);
    };
    run();
    return () => {
      alive = false;
      timers.forEach(id => window.clearTimeout(id));
    };
  }, [inView, reduceMotion]);

  return (
    <div className="mkt-chat" ref={rootRef} aria-label="Ask Fuel reviewing a pitch deck">
      <div className="mkt-chat-bar">
        <YorkMark size={16} />
        <span>Ask Fuel</span>
        <span className="mkt-chat-live">Live</span>
      </div>
      <div className="mkt-chat-thread">
        {sent ? <div className="mkt-chat-user">{CHAT_QUESTION}</div> : null}
        {thinking ? (
          <div className="mkt-chat-thinking" aria-hidden="true">
            <span /><span /><span />
          </div>
        ) : null}
        {reply ? (
          <div className="mkt-chat-reply">
            <div className="mkt-chat-reply-kicker">Pitch deck evaluation</div>
            <strong>Investor-ready score: 74/100</strong>
            <p>Problem is sharp. Traction still needs the peer comparison before this goes out.</p>
            <div className="mkt-chat-rows">
              {CHAT_ROWS.slice(0, rows).map(row => (
                <div key={row.label} className="mkt-chat-row">
                  <span>{row.label}</span>
                  <strong>{row.score}</strong>
                  <em>{row.note}</em>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="mkt-chat-compose">
        {sent ? (
          <span className="mkt-caret" />
        ) : (
          <span className="mkt-chat-draft">
            {CHAT_QUESTION.slice(0, typed)}
            <span className="mkt-caret" />
          </span>
        )}
      </div>
    </div>
  );
}

function FeatureOrbit() {
  const outer = FEATURES.filter(feature => feature.ring === "outer");
  const inner = FEATURES.filter(feature => feature.ring === "inner");
  return (
    <div className="mkt-orbit-fit">
    <div className="mkt-orbit" role="img" aria-label="Fuel features: Benchmarks, Intelligence, Initiatives, Ask Fuel, Playbooks, Data room, Research, Portfolio, Pitch deck, and Scorecard">
      <OrbitRing features={outer} radius={196} duration="52s" />
      <OrbitRing features={inner} radius={112} duration="36s" reverse offset={45} />
      <div className="mkt-orbit-core">
        <span>Features</span>
      </div>
    </div>
    </div>
  );
}

export default function FuelLanding({
  onSignIn,
  onGetStarted,
  onOpenLegal,
}: {
  onSignIn: () => void;
  onGetStarted: () => void;
  onOpenLegal?: (doc: LegalDocId) => void;
}) {
  const typedDoneAt = 0.28 + TYPED.length * LETTER_DELAY_S;
  const close = useInView<HTMLDivElement>();
  const [typedCount, setTypedCount] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [vertical, setVertical] = useState("b2b_saas");
  const [stage, setStage] = useState("seed");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setReduceMotion(true);
      setTypedCount(TYPED.length);
      return;
    }
    const start = window.setTimeout(() => setTypedCount(1), 280);
    return () => window.clearTimeout(start);
  }, []);

  useEffect(() => {
    if (reduceMotion || typedCount === 0 || typedCount >= TYPED.length) return;
    const tick = window.setTimeout(() => setTypedCount(count => count + 1), LETTER_DELAY_S * 1000);
    return () => window.clearTimeout(tick);
  }, [reduceMotion, typedCount]);

  return (
    <main className="mkt-root">
      <FuelMarketingHeader onSignIn={onSignIn} onGetStarted={onGetStarted} />

      <section className="mkt-hero">
        <Aurora />
        <div className="mkt-hero-inner">
          <div className="mkt-live mkt-rise" style={{ animationDelay: "0s" }}>
            <span className="mkt-live-dot" aria-hidden="true">
              <span />
              <span />
            </span>
            <span>For founders, operators, and investors</span>
          </div>

          <h1>
            <span className="mkt-h1-line mkt-rise" style={{ animationDelay: reduceMotion ? "0s" : "0.15s" }}>
              Build your strategy.
            </span>
            <span className="mkt-h1-line mkt-rise" style={{ animationDelay: reduceMotion ? "0s" : "0.3s" }}>
              Focus your team.
            </span>
            <span className="mkt-h1-line">
              <span className="mkt-h1-typed">
                <span className="mkt-h1-gradient">
                  {(reduceMotion ? TYPED : TYPED.slice(0, typedCount)).replaceAll(" ", "\u00a0")}
                </span>
                {typedCount > 0 && typedCount < TYPED.length && !reduceMotion ? (
                  <span className="mkt-caret" aria-hidden="true" />
                ) : null}
              </span>
            </span>
          </h1>

          <p className="mkt-hero-kicker mkt-rise" style={{ animationDelay: `${typedDoneAt + 0.15}s` }}>
            For the people building companies—and those backing them.
          </p>
          <p className="mkt-hero-lede mkt-rise" style={{ animationDelay: `${typedDoneAt + 0.3}s` }}>
            Fuel brings market intelligence, benchmarking, planning, and execution into one AI-powered workspace. Build and execute your company’s strategy, or monitor your investment pipeline and portfolio—with the context to know where to focus and how to help companies move forward.
          </p>

          <div className="mkt-hero-ctas mkt-rise" style={{ animationDelay: `${typedDoneAt + 0.45}s` }}>
            <button type="button" className="mkt-cta mkt-cta-lg" onClick={onGetStarted}>
              <span className="mkt-shimmer" aria-hidden="true" />
              <span>Get Started with Fuel</span>
              <span className="mkt-arrow">→</span>
            </button>
            <button type="button" className="mkt-ghost-cta" onClick={() => scrollToId("how-fuel-works")}>
              <span>See How Fuel Works</span>
              <span className="mkt-arrow is-muted">→</span>
            </button>
          </div>
        </div>
      </section>

      <section className="mkt-section is-shade" id="who-its-for">
        <div className="mkt-kicker">Who it’s for</div>
        <h2 className="mkt-section-title is-lg">Different perspectives. A shared ambition.</h2>
        <div className="mkt-split is-plain">
          <article className="mkt-panel-card" id="for-builders">
            <div className="mkt-kicker is-left">For founders and operators</div>
            <h3>Build with clarity. Execute with purpose.</h3>
            <p>
              Ground your strategy in market and competitive intelligence. Understand how you compare with peers, focus your team on the right initiatives, and track progress against your business goals.
            </p>
            <button type="button" className="mkt-card-link" onClick={() => scrollToId("for-builders-demo")}>
              Explore Fuel for Builders <span aria-hidden="true">→</span>
            </button>
          </article>
          <article className="mkt-panel-card" id="for-investors">
            <div className="mkt-kicker is-left">For investors</div>
            <h3>See the opportunity. Support the growth.</h3>
            <p>
              Monitor companies across your investment pipeline and portfolio. Follow market developments, put company performance in context, and identify where your attention and support could make the greatest difference.
            </p>
            <button type="button" className="mkt-card-link" onClick={() => scrollToId("for-investors-demo")}>
              Explore Fuel for Investors <span aria-hidden="true">→</span>
            </button>
          </article>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-kicker">The value</div>
        <h2 className="mkt-section-title is-lg">A clearer view of what comes next.</h2>
        <div className="mkt-prose">
          <p>Better decisions start with understanding the company and the market around it.</p>
          <p>
            Fuel connects external intelligence with company performance and strategic priorities. Founders and operators can see where to focus their teams. Investors can see which companies warrant a closer look and where portfolio companies could benefit from support.
          </p>
          <p>Together, those perspectives help turn insight into meaningful progress.</p>
        </div>
        <ul className="mkt-value-points">
          <li><span className="mkt-check">✓</span><span>Scorecard across product, go-to-market, and finance</span></li>
          <li>
            <span className="mkt-check">✓</span>
            <span>Peer-cohort benchmarks<span className="mkt-value-sub">p25 / p50 / p75 / p90</span></span>
          </li>
          <li><span className="mkt-check">✓</span><span>Ask Fuel — playbooks and pitch deck evaluation against your numbers</span></li>
        </ul>
      </section>

      <HowFuelWorks onGetStarted={onGetStarted} />

      <section className="mkt-section is-wash" id="benchmarks">
        <div className="mkt-kicker">Benchmarking preview</div>
        <h2 className="mkt-section-title is-lg">Understand where a company stands—and what that could mean.</h2>
        <p className="mkt-benchmark-lede">
          Compare company performance with relevant peers by market and stage. Bring context to your growth targets, investment research, and conversations about where to improve.
        </p>
        <div className="mkt-benchmark-board">
          <div className="mkt-benchmark-side">
            <span>p25</span>
            <strong>18%</strong>
          </div>
          <div className="mkt-benchmark-main">
            <span>Median ARR growth · cohort p50</span>
            <strong>{COHORT_P50}%</strong>
          </div>
          <div className="mkt-benchmark-side">
            <span>p90</span>
            <strong>140%</strong>
          </div>
        </div>
        <div className="mkt-benchmark-controls">
          <div className="mkt-cohort-fields">
            <label>
              Vertical
              <select value={vertical} onChange={event => setVertical(event.target.value)}>
                <option value="b2b_saas">B2B SaaS</option>
                <option value="dev_tools">Developer Tools</option>
              </select>
            </label>
            <label>
              Stage
              <select value={stage} onChange={event => setStage(event.target.value)}>
                <option value="seed">Seed</option>
                <option value="series_a">Series A</option>
                <option value="growth">Growth</option>
              </select>
            </label>
          </div>
          <button type="button" className="mkt-cta mkt-cta-lg" onClick={onGetStarted}>
            <span>Explore Company Benchmarks</span>
            <span className="mkt-arrow">→</span>
          </button>
        </div>
      </section>

      <section className="mkt-section is-shade" id="product-demo">
        <header className="mkt-demo-head">
          <div className="mkt-kicker is-left">Product demonstration</div>
          <h2>See what Fuel makes possible.</h2>
        </header>
        <div className="mkt-demo-grid">
          <article className="mkt-story" id="for-builders-demo">
            <div className="mkt-demo-index">01</div>
            <div className="mkt-kicker is-left">For founders and operators</div>
            <h3>Turn a performance gap into a focused initiative.</h3>
            <p>
              Compare your sales conversion rate with peers. Use market and competitive context to investigate the gap, align sales and marketing around a response, and track the initiative alongside changes in conversion and pipeline quality.
            </p>
          </article>
          <article className="mkt-story" id="for-investors-demo">
            <div className="mkt-demo-index">02</div>
            <div className="mkt-kicker is-left">For investors</div>
            <h3>Turn company visibility into informed attention.</h3>
            <p>
              Follow developments across companies in your pipeline and portfolio. Use market signals and benchmarks to identify where to dig deeper, prepare for company conversations, and follow the progress of priorities you’re helping support.
            </p>
          </article>
        </div>
      </section>

      <section className="mkt-section is-wash">
        <div className="mkt-ai">
          <div className="mkt-ai-copy">
            <div className="mkt-kicker is-left">AI support</div>
            <h2>More context. Less manual work.</h2>
            <p>
              Fuel’s AI helps synthesize market developments, interpret benchmarks, and guide next steps—giving you more time to make decisions and work with the people moving companies forward.
            </p>
            <p>
              Whether you’re setting company priorities or reviewing your portfolio, bring the relevant intelligence into focus without piecing the story together manually.
            </p>
          </div>
          <FuelChatDemo />
        </div>
      </section>

      <section className="mkt-section mkt-section-last is-shade" id="getting-started">
        <div className="mkt-start">
          <FeatureOrbit />
          <div className="mkt-start-copy">
            <div className="mkt-kicker is-left">Getting started</div>
            <h2>
              <span>Start with the companies</span>
              you’re moving forward.
            </h2>
            <div className="mkt-start-cards">
            {START.map(step => (
              <article key={step.n} className="mkt-start-card">
                <div className="mkt-start-card-head">
                  <h3>{step.title}</h3>
                  <span className="mkt-start-card-icon">
                    <FuelIcon name={step.icon} size={16} />
                  </span>
                </div>
                <p>{step.body}</p>
              </article>
            ))}
            </div>
          </div>
        </div>
      </section>

      <FuelMarketingFaq />

      <section className="mkt-close">
        <Aurora />
        <div className={`mkt-close-inner${close.inView ? " is-in" : ""}`} ref={close.ref}>
          <h2>
            Build with vision. <span>Execute with conviction.</span>
          </h2>
          <p>Bring intelligence, strategy, and progress into view—with Fuel AI supporting your next move.</p>
          <button type="button" className="mkt-cta mkt-cta-lg" onClick={onGetStarted}>
            <span className="mkt-shimmer" aria-hidden="true" />
            <span>Get Started with Fuel</span>
            <span className="mkt-arrow">→</span>
          </button>
        </div>
      </section>

      <FuelMarketingFooter onSignIn={onSignIn} onOpenLegal={onOpenLegal} />
    </main>
  );
}
