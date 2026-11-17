import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LegalDocId } from "../legal/legalContent";
import arrowRight from "./landing-assets/arrow-right.svg";
import browserGreen from "./landing-assets/browser-green.svg";
import browserRed from "./landing-assets/browser-red.svg";
import browserYellow from "./landing-assets/browser-yellow.svg";
import cardGlow from "./landing-assets/card-glow.svg";
import checkDone from "./landing-assets/check-done.svg";
import chevronDown from "./landing-assets/chevron-down.svg";
import heroIconBottom from "./landing-assets/hero-icon-bottom.svg";
import heroIconLeft from "./landing-assets/hero-icon-left.svg";
import heroIconTopLeft from "./landing-assets/hero-icon-top-left.svg";
import heroIconTopRight from "./landing-assets/hero-icon-top-right.svg";
import heroOverlay from "./landing-assets/hero-overlay.svg";
import heroOverlayRotated from "./landing-assets/hero-overlay-rotated.svg";
import heroSparkles from "./landing-assets/hero-sparkles.svg";
import iconBuilding from "./landing-assets/icon-building.svg";
import iconFounderTile from "./landing-assets/icon-founder-tile.svg";
import iconInvestor from "./landing-assets/icon-investor.svg";
import liveDot from "./landing-assets/live-dot.svg";
import patternDemo from "./landing-assets/pattern-demo.svg";
import patternMaskDemo from "./landing-assets/pattern-mask-demo.svg";
import patternMaskSteps from "./landing-assets/pattern-mask-steps.svg";
import patternSteps from "./landing-assets/pattern-steps.svg";
import trendingUp from "./landing-assets/trending-up.svg";
import valueIconBenchmark from "./landing-assets/value-icon-benchmark.svg";
import valueIconPlaybooks from "./landing-assets/value-icon-playbooks.svg";
import valueIconScorecard from "./landing-assets/value-icon-scorecard.svg";
import { LandingFooter, LandingNav, useHeroFloatingNav } from "./landingNav";
import "./landing.css";

const VALUE_POINTS = [
  { icon: valueIconScorecard, text: "Scorecard across product, go-to-market, and finance" },
  { icon: valueIconBenchmark, text: "Peer performance benchmarks. See lower, typical, above-average, and top results" },
  { icon: valueIconPlaybooks, text: "Turn your questions into tailored playbooks and actionable initiatives" },
];

const STEPS = [
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

/** Bar geometry as a percent of the track, taken from the Figma benchmark card. */
const BENCHMARKS = [
  {
    label: "ARR Growth (YoY)",
    rank: "~P10",
    value: "10%",
    median: "Median 42%",
    fill: 6.6,
    range: [14.6, 82.2],
    medianAt: 31.8,
    ticks: ["P25 18%", "P50 42%", "P75 80%", "P90 140%"],
  },
  {
    label: "Net Revenue Retention",
    rank: "~P5",
    value: "10%",
    median: "Median 108%",
    fill: 6.3,
    range: [7.8, 82.2],
    medianAt: 43.2,
    ticks: ["P25 88%", "P50 108%", "P75 118%", "P90 130%"],
  },
  {
    label: "Gross Margin",
    rank: "~P95",
    value: "100%",
    median: "Median 61%",
    fill: 74,
    range: [35.3, 60.5],
    medianAt: 44.9,
    ticks: ["P25 48%", "P50 61%", "P75 74%", "P90 82%"],
  },
];

const DEMO = {
  founder: {
    title: "For Founders",
    body: "Turn insight into focused initiatives. Compare conversion with peers, uncover gaps with market and competitive context, and align sales and marketing around clear priorities. Track progress through conversion and pipeline quality.",
    capabilities: [
      "Peer benchmarking",
      "Pipeline quality tracking",
      "Competitive context",
      "Sales & marketing alignment",
      "Growth priorities",
      "Pipeline quality tracking",
    ],
  },
  investor: {
    title: "For Investors",
    body: "Turn company visibility into informed attention. Follow developments across companies in your pipeline and portfolio, use market signals and benchmarks to see where to dig deeper, and follow the progress of the priorities you help support.",
    capabilities: [
      "Pipeline monitoring",
      "Portfolio benchmarks",
      "Market signals",
      "Company conversation prep",
      "Support priorities",
      "Progress tracking",
    ],
  },
} as const;

type DemoAudience = keyof typeof DEMO;

/** Matches the Fuel site's bar ease, cubic-bezier(0.22, 1, 0.36, 1). */
function benchEase(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let low = 0;
  let high = 1;
  for (let step = 0; step < 14; step += 1) {
    const mid = (low + high) / 2;
    const rest = 1 - mid;
    const x = 3 * rest * rest * mid * 0.22 + 3 * rest * mid * mid * 0.36 + mid * mid * mid;
    if (x < t) low = mid;
    else high = mid;
  }
  const at = (low + high) / 2;
  const rest = 1 - at;
  return 3 * rest * rest * at + 3 * rest * at * at + at * at * at;
}

function BenchValue({ target, active, delay }: { target: number; active: boolean; delay: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      return;
    }
    const duration = 900;
    const begin = performance.now() + delay;
    let frame = 0;
    const tick = (now: number) => {
      const progress = benchEase(Math.min(1, Math.max(0, (now - begin) / duration)));
      setShown(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, delay, target]);

  return <strong>{shown}%</strong>;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Renders fixed-size Figma artwork and scales it down to fit narrower containers. */
function ScaledBox({ width, height, className, children }: { width: number; height: number; className?: string; children: React.ReactNode }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setScale(Math.min(1, frame.clientWidth / width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={frameRef} className={`fl-scaled${className ? ` ${className}` : ""}`} style={{ maxWidth: width, height: height * scale }}>
      <div className="fl-scaled-inner" style={{ width, height, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  variant = "deep",
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "deep" | "bright" | "nav";
  className?: string;
}) {
  return (
    <button type="button" className={`fl-btn is-${variant}${className ? ` ${className}` : ""}`} onClick={onClick}>
      <span>{children}</span>
      <img alt="" src={arrowRight} width={24} height={24} />
    </button>
  );
}

export function HeroGraphic() {
  return (
    <ScaledBox width={500} height={500} className="fl-hero-graphic fl-reveal">
      <div className="fl-graphic" aria-hidden="true">
        <span className="fl-graphic-cell" style={{ left: 167, top: 167 }} />
        <img className="fl-graphic-overlay" alt="" src={heroOverlay} />
        <img className="fl-graphic-overlay is-rotated" alt="" src={heroOverlayRotated} />
        <span className="fl-graphic-core">
          <span className="fl-fuel-type">
            <span className="fl-fuel-reserve">FUEL</span>
            <span className="fl-fuel-clip">FUEL</span>
          </span>
        </span>
        <span className="fl-graphic-cell fl-spot is-scorecard" style={{ left: 0, top: 250 }} />
        <img className="fl-graphic-icon fl-spot is-scorecard" alt="" src={heroIconLeft} style={{ left: 31, top: 282, width: 20, height: 20 }} />
        <span className="fl-graphic-cell fl-spot is-growth" style={{ left: 83, top: 83 }} />
        <img className="fl-graphic-icon fl-spot is-growth" alt="" src={heroIconTopLeft} style={{ left: 113, top: 113, width: 24, height: 24 }} />
        <span className="fl-graphic-cell fl-spot is-calendar" style={{ left: 334, top: 83 }} />
        <img className="fl-graphic-icon fl-spot is-calendar" alt="" src={heroIconTopRight} style={{ left: 364, top: 113, width: 24, height: 24 }} />
        <span className="fl-graphic-cell fl-spot is-portfolio" style={{ left: 83, top: 417 }} />
        <span className="fl-graphic-icon-frame fl-spot is-portfolio" style={{ left: 113, top: 447 }}>
          <img alt="" src={heroIconBottom} />
        </span>
        <span className="fl-graphic-cell fl-spot is-sparkles" style={{ left: 250, top: 334 }} />
        <img className="fl-graphic-icon fl-spot is-sparkles" alt="" src={heroSparkles} style={{ left: 281, top: 365, width: 22, height: 22 }} />
      </div>
    </ScaledBox>
  );
}

function SectionPattern({ pattern, mask, height }: { pattern: string; mask: string; height: number }) {
  return (
    <div className="fl-pattern" style={{ height }} aria-hidden="true">
      <img
        alt=""
        src={pattern}
        style={{
          maskImage: `url("${mask}")`,
          WebkitMaskImage: `url("${mask}")`,
          maskSize: `1440px ${height}px`,
          WebkitMaskSize: `1440px ${height}px`,
        }}
      />
    </div>
  );
}

function DashboardMockup() {
  return (
    <ScaledBox width={560} height={420} className="fl-mock-frame">
      <div className="fl-mock" aria-hidden="true">
        <div className="fl-mock-metrics">
          {[0, 1, 2].map(index => (
            <span key={index}>
              <i />
            </span>
          ))}
        </div>
        <div className="fl-mock-chart">
          {[187, 139, 91, 43].map(top => (
            <span key={top} className="fl-mock-grid" style={{ top }} />
          ))}
          <span className="fl-mock-bar" style={{ left: 299, top: 38, height: 171, background: "rgba(0, 180, 138, 0.8)" }} />
          <span className="fl-mock-bar" style={{ left: 231, top: 76, height: 133, background: "#25e2b0" }} />
          <span className="fl-mock-bar" style={{ left: 163, top: 133, height: 76, background: "#63f2c7" }} />
          <span className="fl-mock-bar" style={{ left: 95, top: 114, height: 95, background: "#a0fada" }} />
          <span className="fl-mock-bar" style={{ left: 27, top: 152, height: 57, background: "#a0fada" }} />
          <div className="fl-mock-stat">
            <p>Monthly Growth</p>
            <div>
              <strong>+24.8%</strong>
              <span className="fl-mock-trend">
                <img alt="" src={trendingUp} />
              </span>
            </div>
          </div>
        </div>
        <div className="fl-mock-head">
          <span />
          <span />
        </div>
        <div className="fl-mock-sidebar">
          <span className="fl-skel" style={{ width: 80, height: 12 }} />
          <div className="fl-mock-nav">
            <span className="fl-skel is-active" style={{ width: 108, height: 24 }} />
            <span className="fl-skel" style={{ width: 88 }} />
            <span className="fl-skel" style={{ width: 96 }} />
            <span className="fl-skel" style={{ width: 72 }} />
            <span className="fl-skel" style={{ width: 84 }} />
          </div>
          <span className="fl-mock-divider" />
          <span className="fl-mock-avatar" />
          <span className="fl-mock-account" />
        </div>
        <div className="fl-mock-browser">
          <img alt="" src={browserRed} width={8} height={8} />
          <img alt="" src={browserYellow} width={8} height={8} />
          <img alt="" src={browserGreen} width={8} height={8} />
          <div className="fl-mock-address">
            <span />
          </div>
        </div>
      </div>
    </ScaledBox>
  );
}

export default function FuelLanding({
  onSignIn,
  onGetStarted,
  onOpenLegal,
  onOpenCompanies,
}: {
  onSignIn: () => void;
  onGetStarted: () => void;
  onOpenLegal?: (doc: LegalDocId) => void;
  onOpenCompanies: () => void;
}) {
  const heroRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const stepsRef = useRef<HTMLElement | null>(null);
  const stepRowRef = useRef<HTMLOListElement | null>(null);
  const floatingNav = useHeroFloatingNav(heroRef);
  const [audience, setAudience] = useState<DemoAudience>("founder");
  const [vertical, setVertical] = useState("b2b_saas");
  const [benchLive, setBenchLive] = useState(false);
  const benchRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState("seed");
  const demo = DEMO[audience];

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = [...root.querySelectorAll<HTMLElement>(".fl-reveal")];
    const revealed = new Set<HTMLElement>();
    const show = (list: HTMLElement[]) => {
      const ordered = [...list].sort((a, b) => (a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      ordered.forEach((el, index) => {
        el.style.animationDelay = `${index * 100}ms`;
        el.dataset.reveal = "in";
        revealed.add(el);
      });
    };
    const group = (list: HTMLElement[]) => {
      const groups = new Map<HTMLElement, HTMLElement[]>();
      list.forEach(el => {
        const section = (el.closest("section, footer") as HTMLElement | null) ?? root;
        const bucket = groups.get(section) ?? [];
        bucket.push(el);
        groups.set(section, bucket);
      });
      groups.forEach(show);
    };
    const seen = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight - 32 && rect.bottom > 32 && rect.left < window.innerWidth && rect.right > 0;
    };
    const stepRow = root.querySelector<HTMLElement>(".fl-step-row");
    const stepCards = items.filter(el => el.classList.contains("fl-step-card"));
    const inView = (el: HTMLElement) => seen(el.classList.contains("fl-step-card") && stepRow ? stepRow : el);

    root.classList.add("is-motion");
    group(items.filter(inView));

    const observer = new IntersectionObserver(
      entries => {
        const hit = new Set(entries.filter(entry => entry.isIntersecting).map(entry => entry.target as HTMLElement));
        const fresh = items.filter(el => !revealed.has(el) && hit.has(el));
        if (fresh.some(el => el.classList.contains("fl-step-card"))) fresh.push(...stepCards.filter(el => !revealed.has(el) && !fresh.includes(el)));
        fresh.forEach(el => observer.unobserve(el));
        group(fresh);
      },
      { rootMargin: "0px 0px -48px 0px", threshold: 0 },
    );
    items.forEach(el => {
      if (!revealed.has(el)) observer.observe(el);
    });
    return () => {
      observer.disconnect();
      root.classList.remove("is-motion");
    };
  }, []);

  useLayoutEffect(() => {
    const section = stepsRef.current;
    const row = stepRowRef.current;
    const pin = section?.querySelector<HTMLElement>(".fl-steps-pin");
    if (!section || !row || !pin) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let distance = 0;

    const release = () => {
      distance = 0;
      section.classList.remove("is-slider");
      section.style.height = "";
      pin.style.position = "";
      pin.style.top = "";
      pin.style.left = "";
      pin.style.right = "";
      pin.style.width = "";
      row.style.transform = "";
    };

    const measure = () => {
      row.style.transform = "translate3d(0,0,0)";
      section.classList.add("is-slider");
      distance = Math.max(0, row.scrollWidth - window.innerWidth);
      if (distance <= 0) {
        release();
        return;
      }
      pin.style.position = "absolute";
      pin.style.left = "0";
      pin.style.right = "0";
      pin.style.width = "100%";
      pin.style.top = "0";
      section.style.height = `${pin.offsetHeight + distance}px`;
      place();
    };

    const place = () => {
      if (distance <= 0) return;
      const start = section.getBoundingClientRect().top + window.scrollY;
      const traveled = Math.min(distance, Math.max(0, window.scrollY - start));
      pin.style.left = "0";
      pin.style.right = "0";
      pin.style.width = "100%";
      if (traveled <= 0) {
        pin.style.position = "absolute";
        pin.style.top = "0";
      } else if (traveled >= distance) {
        pin.style.position = "absolute";
        pin.style.top = `${distance}px`;
      } else {
        pin.style.position = "fixed";
        pin.style.top = "0";
      }
      row.style.transform = `translate3d(${-traveled}px,0,0)`;
    };

    measure();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", measure);
      release();
    };
  }, []);

  useEffect(() => {
    const board = benchRef.current;
    if (!board) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBenchLive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setBenchLive(true);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  const openDemo = (next: DemoAudience) => {
    setAudience(next);
    scrollToId("product-demo");
  };

  return (
    <main className="fl-root" ref={rootRef}>
      <div className={`fl-float-nav${floatingNav ? " is-visible" : ""}`} aria-hidden={!floatingNav}>
        <LandingNav
          variant="float"
          interactive={floatingNav}
          onSignIn={onSignIn}
          onHome={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          onCompanies={onOpenCompanies}
          onSection={scrollToId}
        />
      </div>

      <section className="fl-hero" ref={heroRef}>
        <LandingNav
          variant="top"
          reveal
          onSignIn={onSignIn}
          onHome={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          onCompanies={onOpenCompanies}
          onSection={scrollToId}
        />

        <div className="fl-hero-content">
          <div className="fl-hero-copy">
            <div className="fl-hero-headline">
              <h1 className="fl-reveal">
                Build your strategy.
                <br />
                Focus your team.
                <span>Move your company forward</span>
              </h1>
              <p className="fl-reveal">
                For the people building companies—and those backing them.
                <br />
                Fuel brings market intelligence, benchmarking, planning, and execution into one AI-powered workspace.
              </p>
            </div>
            <PrimaryButton className="fl-reveal" onClick={onGetStarted}>Get Started with Fuel</PrimaryButton>
          </div>
          <HeroGraphic />
        </div>
      </section>

      <section className="fl-section is-white fl-audience" id="who-its-for">
        <header className="fl-section-head">
          <p className="fl-eyebrow fl-reveal">Who it’s for</p>
          <h2 className="fl-reveal">
            Different perspectives. <span className="is-green">A shared ambition.</span>
          </h2>
        </header>
        <div className="fl-audience-cards">
          <article className="fl-audience-card fl-reveal is-up">
            <img alt="" src={iconBuilding} width={56} height={56} />
            <div className="fl-audience-text">
              <div>
                <p className="fl-card-eyebrow">For founders and operators</p>
                <h3>Build with clarity. Execute with purpose.</h3>
              </div>
              <p>
                Ground your strategy in market and competitive intelligence. Understand how you compare with peers, focus your team on the right initiatives, and track progress against your business goals.
              </p>
            </div>
            <PrimaryButton variant="bright" onClick={() => openDemo("founder")}>Explore Fuel for Builders</PrimaryButton>
          </article>
          <article className="fl-audience-card fl-reveal is-up">
            <img alt="" src={iconInvestor} width={56} height={56} />
            <div className="fl-audience-text">
              <div>
                <p className="fl-card-eyebrow">For investors</p>
                <h3>See the opportunity. Support the growth.</h3>
              </div>
              <p>
                Monitor companies across your investment pipeline and portfolio. Follow market developments, put company performance in context, and identify where your attention and support could make the greatest difference.
              </p>
            </div>
            <PrimaryButton variant="bright" onClick={() => openDemo("investor")}>Explore Fuel for Investors</PrimaryButton>
          </article>
        </div>
      </section>

      <section className="fl-section is-dark fl-value" id="platform">
        <div className="fl-value-copy">
          <div>
            <p className="fl-eyebrow is-mint fl-reveal">The value</p>
            <h2 className="fl-reveal">
              <span className="is-white">A clearer view of</span>
              <br />
              <span className="is-gold">what comes next.</span>
            </h2>
          </div>
          <div className="fl-value-body">
            <p className="fl-reveal">
              Better decisions start with understanding the company and the market around it. Fuel connects external intelligence with company performance and strategic priorities. Founders and operators can see where to focus their teams. Investors can see which companies warrant a closer look and where portfolio companies could benefit from support.
            </p>
            <p className="fl-reveal">Together, those perspectives help turn insight into meaningful progress.</p>
          </div>
        </div>
        <ul className="fl-value-points">
          {VALUE_POINTS.map(point => (
            <li key={point.text} className="fl-reveal is-up">
              <img alt="" src={point.icon} width={32} height={32} />
              <p>{point.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="fl-section is-white fl-steps" id="how-fuel-works" ref={stepsRef}>
        <div className="fl-steps-pin">
        <SectionPattern pattern={patternSteps} mask={patternMaskSteps} height={653} />
        <header className="fl-section-head is-narrow">
          <p className="fl-eyebrow fl-reveal">How Fuel works</p>
          <h2 className="fl-reveal">
            From understanding the <span className="is-green">opportunity to moving it forward.</span>
          </h2>
        </header>
        <div className="fl-step-viewport">
        <ol className="fl-step-row" ref={stepRowRef}>
          {STEPS.map(step => (
            <li key={step.n} className="fl-step-card fl-reveal is-up">
              <div className="fl-step-index">
                <span>Step</span>
                <strong>{step.n}</strong>
              </div>
              <div className="fl-step-text">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        </div>
        </div>
      </section>

      <section className="fl-section is-dark fl-bench" id="benchmarks">
        <header className="fl-section-head">
          <p className="fl-eyebrow is-mint fl-reveal">Benchmarking preview</p>
          <h2 className="is-white fl-reveal">
            Understand where a <span className="is-gold">company stands</span>
            <br />
            and what that could mean.
          </h2>
        </header>
        <div className="fl-bench-layout">
          <div className="fl-bench-board fl-reveal is-up" ref={benchRef}>
            <div className="fl-bench-top">
              <div className="fl-bench-row">
                <p className="fl-bench-kicker">Benchmark Report</p>
                <span className="fl-bench-live">
                  <img alt="" src={liveDot} width={6} height={6} />
                  Live Cohort
                </span>
              </div>
              <div className="fl-bench-row">
                <div className="fl-bench-company">
                  <span className="fl-bench-avatar">A</span>
                  <div>
                    <strong>Acme Corp</strong>
                    <span>SaaS · $10–50M ARR · Series B</span>
                  </div>
                </div>
                <div className="fl-bench-legend">
                  <span>
                    <i className="is-you" />
                    Your company
                  </span>
                  <span>
                    <i className="is-range" />
                    Peer cohort range
                  </span>
                </div>
              </div>
            </div>
            <span className="fl-bench-rule" />
            <div className={`fl-bench-metrics${benchLive ? " is-live" : ""}`}>
              {BENCHMARKS.map((metric, index) => (
                <div key={metric.label} className="fl-bench-metric" style={{ ["--fl-i" as string]: index }}>
                  <div className="fl-bench-row">
                    <p className="fl-bench-label">{metric.label}</p>
                    <span className="fl-bench-chip">{metric.rank}</span>
                  </div>
                  <div className="fl-bench-value">
                    <BenchValue target={Number(metric.value.replace("%", ""))} active={benchLive} delay={index * 80} />
                    <span className="fl-bench-chip">{metric.median}</span>
                  </div>
                  <div className="fl-bench-track">
                    <span className="fl-bench-fill" style={{ width: `${metric.fill}%` }} />
                    <span className="fl-bench-range" style={{ left: `${metric.range[0]}%`, width: `${metric.range[1] - metric.range[0]}%` }} />
                    <span className="fl-bench-tick" style={{ left: `${metric.range[0]}%` }} />
                    <span className="fl-bench-tick" style={{ left: `${metric.range[1]}%` }} />
                    <span className="fl-bench-tick is-median" style={{ left: `${metric.medianAt}%` }} />
                  </div>
                  <div className="fl-bench-ticks">
                    {metric.ticks.map(tick => (
                      <span key={tick}>{tick}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="fl-bench-filters">
            <div className="fl-bench-fields">
              <label className="fl-select fl-reveal">
                <span>Vertical</span>
                <span className="fl-select-control">
                  <select value={vertical} onChange={event => setVertical(event.target.value)}>
                    <option value="b2b_saas">B2B SaaS</option>
                    <option value="dev_tools">Developer Tools</option>
                  </select>
                  <img alt="" src={chevronDown} width={18} height={18} />
                </span>
              </label>
              <label className="fl-select fl-reveal">
                <span>Stage</span>
                <span className="fl-select-control">
                  <select value={stage} onChange={event => setStage(event.target.value)}>
                    <option value="seed">Seed</option>
                    <option value="series_a">Series A</option>
                    <option value="growth">Growth</option>
                  </select>
                  <img alt="" src={chevronDown} width={18} height={18} />
                </span>
              </label>
            </div>
            <PrimaryButton className="is-block fl-reveal" onClick={onGetStarted}>Explore Company Benchmark</PrimaryButton>
          </div>
        </div>
      </section>

      <section className="fl-section is-white fl-demo" id="product-demo">
        <SectionPattern pattern={patternDemo} mask={patternMaskDemo} height={907} />
        <header className="fl-section-head">
          <p className="fl-eyebrow fl-reveal">Product demonstration</p>
          <h2 className="fl-reveal">
            See what <span className="is-green">Fuel makes possible.</span>
          </h2>
        </header>
        <div className="fl-demo-body">
          <div className="fl-demo-tabs fl-reveal" role="tablist" aria-label="Product demonstration">
            {(["founder", "investor"] as const).map(id => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={audience === id}
                className={audience === id ? "is-active" : undefined}
                onClick={() => setAudience(id)}
              >
                {id === "founder" ? "Founder" : "Investor"}
              </button>
            ))}
          </div>
          <div className="fl-demo-card fl-reveal is-up" role="tabpanel">
            <img className="fl-demo-glow" alt="" src={cardGlow} aria-hidden="true" />
            <div className="fl-demo-details">
              <span className="fl-demo-icon">
                <img alt="" src={iconFounderTile} width={32} height={32} />
              </span>
              <div className="fl-demo-description" key={audience}>
                <h3>{demo.title}</h3>
                <p>{demo.body}</p>
              </div>
              <ul className="fl-demo-capabilities" key={`${audience}-capabilities`}>
                {demo.capabilities.map((capability, index) => (
                  <li key={`${capability}-${index}`}>
                    <img alt="" src={checkDone} width={24} height={24} />
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
            </div>
            <DashboardMockup />
          </div>
        </div>
      </section>

      <LandingFooter onHome={() => window.scrollTo({ top: 0, behavior: "smooth" })} onOpenLegal={onOpenLegal} />
    </main>
  );
}
