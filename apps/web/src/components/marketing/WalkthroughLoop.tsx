"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Scripted product walkthrough that loops below the fold. Three scenes
 * approximating real agent output:
 *   1. Profiling — the enrichment pipeline ticks through tool calls
 *   2. Benchmark — percentile bars sweep in as cohort data resolves
 *   3. Assessment — playbook run with a streaming recommendation
 *
 * No live inference happens pre-auth; the animations are deterministic
 * timelines. They mirror the same chrome the agent drawer renders inside
 * the app so the marketing → product transition feels seamless.
 */
type Scene = "profile" | "benchmark" | "assessment";
const SCENES: Scene[] = ["profile", "benchmark", "assessment"];
const SCENE_DURATION_MS = 7_200;

export function WalkthroughLoop() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SCENES.length);
    }, SCENE_DURATION_MS);
    return () => clearInterval(id);
  }, []);

  const scene = SCENES[index];

  return (
    <section
      style={{
        padding: "32px 32px 96px",
        maxWidth: 1180,
        margin: "0 auto",
      }}
    >
      <SectionEyebrow>What the AI does on your behalf</SectionEyebrow>
      <h2
        style={{
          margin: "10px auto 36px",
          textAlign: "center",
          fontSize: 28,
          letterSpacing: -0.3,
          fontWeight: 600,
          color: "#F4F6F8",
          maxWidth: 680,
        }}
      >
        From cold sign-up to a benchmarked diagnosis in one session.
      </h2>

      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(23,38,50,0.85) 0%, rgba(15,26,36,0.85) 100%)",
          border: "1px solid rgba(38,57,71,0.9)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow:
            "0 30px 80px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset",
        }}
      >
        <TerminalChrome scene={scene} />
        <div style={{ position: "relative", padding: "24px 28px 28px", minHeight: 380 }}>
          <AnimatePresence mode="wait">
            {scene === "profile" && <ProfileScene key="profile" />}
            {scene === "benchmark" && <BenchmarkScene key="benchmark" />}
            {scene === "assessment" && <AssessmentScene key="assessment" />}
          </AnimatePresence>
        </div>
        <SceneDots active={index} count={SCENES.length} />
      </div>
    </section>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "#00B48A",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

/** Fake macOS-window chrome with the live scene title baked in. */
function TerminalChrome({ scene }: { scene: Scene }) {
  const titleByScene: Record<Scene, string> = {
    profile: "agent · profiling acme.com",
    benchmark: "agent · running kpi-benchmark",
    assessment: "agent · running sales-revops-assessment",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderBottom: "1px solid rgba(38,57,71,0.9)",
        background: "rgba(15,26,36,0.6)",
      }}
    >
      <span style={dotStyle("#FF6B5B")} />
      <span style={dotStyle("#ECD67F")} />
      <span style={dotStyle("#00B48A")} />
      <span
        style={{
          marginLeft: 12,
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          fontSize: 11.5,
          color: "#8A99A6",
        }}
      >
        {titleByScene[scene]}
      </span>
    </div>
  );
}
function dotStyle(color: string): React.CSSProperties {
  return {
    width: 11,
    height: 11,
    borderRadius: 999,
    background: color,
    boxShadow: `0 0 0 1px rgba(0,0,0,0.25), 0 0 12px ${color}40`,
    display: "inline-block",
  };
}

/* ---------------------------- Scene 1: Profile --------------------------- */

function ProfileScene() {
  const steps = [
    { skill: "scrapeWebsiteMarkdown", arg: "https://acme.com", out: "title · meta · 11,800 chars" },
    { skill: "detectTechStack", arg: "acme.com", out: "React · Stripe · Segment · Datadog" },
    { skill: "searchCompanies", arg: "acme.com", out: "1 match · b2b_saas · seed" },
    { skill: "getCohortBenchmarks", arg: "b2b_saas:seed:us", out: "11 metrics · n=124" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <PromptLine>
        Profile acme.com from its public footprint. Identify the peer cohort.
      </PromptLine>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          fontSize: 13,
          color: "#CBD3DB",
        }}
      >
        {steps.map((s, i) => (
          <motion.div
            key={s.skill}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.85, duration: 0.4 }}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(0,180,138,0.05)",
              border: "1px solid rgba(0,180,138,0.12)",
            }}
          >
            <span style={{ color: "#00B48A" }}>↳</span>
            <span>
              <span style={{ color: "#F4F6F8" }}>{s.skill}</span>
              <span style={{ color: "#596876" }}>({s.arg})</span>
            </span>
            <ToolStatus delay={0.5 + i * 0.85 + 0.5} label={s.out} />
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + steps.length * 0.85 + 0.3, duration: 0.5 }}
          style={{
            marginTop: 8,
            padding: "12px 14px",
            background: "rgba(63,116,178,0.10)",
            border: "1px solid rgba(63,116,178,0.30)",
            borderRadius: 8,
            color: "#CBD3DB",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "#A6E6D2" }}>Profile ready.</strong> Acme is a
          B2B SaaS company at the seed stage based in NYC. Peer cohort
          identified — sample of 124 companies for benchmarking.
        </motion.div>
      </div>
    </motion.div>
  );
}

/* --------------------------- Scene 2: Benchmark -------------------------- */

function BenchmarkScene() {
  const metrics = [
    { label: "ARR growth, YoY", pct: 78, band: "Top quartile", you: "168%", median: "92%" },
    { label: "Net revenue retention", pct: 56, band: "Above median", you: "112%", median: "108%" },
    { label: "Burn multiple", pct: 28, band: "Below median", you: "2.4×", median: "1.7×" },
    { label: "Gross margin", pct: 64, band: "Above median", you: "74%", median: "70%" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <PromptLine>
        Run the KPI Benchmark playbook against acme.com&apos;s latest metrics.
      </PromptLine>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.45 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr auto auto",
                alignItems: "baseline",
                gap: 16,
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                fontSize: 13,
                color: "#CBD3DB",
                marginBottom: 6,
              }}
            >
              <span style={{ color: "#F4F6F8", fontFamily: "Inter, system-ui, sans-serif" }}>
                {m.label}
              </span>
              <span style={{ color: "#596876" }}>
                you <span style={{ color: "#F4F6F8" }}>{m.you}</span> · p50{" "}
                <span style={{ color: "#CBD3DB" }}>{m.median}</span>
              </span>
              <span
                style={{
                  color:
                    m.pct >= 70 ? "#00B48A" : m.pct >= 40 ? "#ECD67F" : "#FF6B5B",
                  fontWeight: 600,
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontSize: 12,
                  letterSpacing: 0.2,
                }}
              >
                {m.band}
              </span>
            </div>
            <PercentileTrack pct={m.pct} delay={0.3 + i * 0.45 + 0.15} />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + metrics.length * 0.45 + 0.4, duration: 0.5 }}
        style={{
          marginTop: 20,
          padding: "12px 14px",
          background: "rgba(255,107,91,0.08)",
          border: "1px solid rgba(255,107,91,0.30)",
          borderRadius: 8,
          color: "#CBD3DB",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "#FFB7AD" }}>Suggested next.</strong> Burn
        multiple is your weakest band. Run the{" "}
        <span style={{ color: "#A6E6D2" }}>Finance Assessment</span> to
        diagnose efficiency leaks.
      </motion.div>
    </motion.div>
  );
}

function PercentileTrack({ pct, delay }: { pct: number; delay: number }) {
  const fill =
    pct >= 70 ? "#00B48A" : pct >= 40 ? "#ECD67F" : "#FF6B5B";
  return (
    <div
      style={{
        height: 10,
        borderRadius: 5,
        background: "#0B141C",
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(38,57,71,0.7)",
      }}
    >
      {/* Quartile ticks */}
      {[25, 50, 75].map((p) => (
        <span
          key={p}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${p}%`,
            width: 1,
            background: "rgba(244,246,248,0.08)",
          }}
        />
      ))}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ delay, duration: 1.0, ease: [0.22, 0.61, 0.36, 1] }}
        style={{
          height: "100%",
          background: `linear-gradient(90deg, ${fill}80 0%, ${fill} 100%)`,
          boxShadow: `0 0 18px ${fill}80`,
        }}
      />
      {/* Position marker */}
      <motion.div
        initial={{ left: 0, opacity: 0 }}
        animate={{ left: `${pct}%`, opacity: 1 }}
        transition={{ delay: delay + 0.4, duration: 0.7, ease: "easeOut" }}
        style={{
          position: "absolute",
          top: -3,
          width: 4,
          height: 16,
          marginLeft: -2,
          background: "#F4F6F8",
          borderRadius: 2,
          boxShadow: "0 0 10px rgba(244,246,248,0.6)",
        }}
      />
    </div>
  );
}

/* -------------------------- Scene 3: Assessment -------------------------- */

function AssessmentScene() {
  const toolCalls = [
    { skill: "getCompanyObservations", out: "47 signals · last 90d" },
    { skill: "listPortfolioUpdates", out: "4 quarters" },
    { skill: "getCohortBenchmarks", out: "pipeline coverage · CAC payback" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <PromptLine>
        Diagnose where revenue execution is leaking. Propose 3 initiatives.
      </PromptLine>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 18,
        }}
      >
        {toolCalls.map((t, i) => (
          <motion.div
            key={t.skill}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.4, duration: 0.35 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
              fontSize: 12.5,
              color: "#CBD3DB",
            }}
          >
            <ToolStatus delay={0.2 + i * 0.4 + 0.3} label="" iconOnly />
            <span style={{ color: "#F4F6F8" }}>{t.skill}</span>
            <span style={{ color: "#596876" }}>·</span>
            <span style={{ color: "#8A99A6" }}>{t.out}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7, duration: 0.5 }}
        style={{
          padding: "16px 18px",
          background:
            "linear-gradient(180deg, rgba(0,180,138,0.10) 0%, rgba(0,180,138,0.04) 100%)",
          border: "1px solid rgba(0,180,138,0.30)",
          borderRadius: 10,
          color: "#CBD3DB",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        <div
          style={{
            color: "#A6E6D2",
            fontSize: 12,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          Top recommendation
        </div>
        <StreamingLine
          text="Rebuild outbound segmentation by ICP — current coverage is 1.4× target vs. cohort median 2.6×. Owner: VP Sales. Target: 30 days."
          startDelayMs={1850}
        />
      </motion.div>
    </motion.div>
  );
}

function StreamingLine({
  text,
  startDelayMs,
}: {
  text: string;
  startDelayMs: number;
}) {
  const [chars, setChars] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const start = setTimeout(() => {
      const iv = setInterval(() => {
        setChars((c) => {
          if (c >= text.length) {
            clearInterval(iv);
            return c;
          }
          return Math.min(text.length, c + Math.ceil(Math.random() * 3));
        });
      }, 35);
      if (cancelled) clearInterval(iv);
    }, startDelayMs);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [text, startDelayMs]);
  return (
    <span>
      {text.slice(0, chars)}
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: "0.5ch",
          height: "1em",
          background: "#00B48A",
          marginLeft: 2,
          verticalAlign: "-0.15em",
          opacity: chars >= text.length ? 0 : 1,
          animation:
            chars >= text.length
              ? undefined
              : "fuel-caret-blink 1s steps(1) infinite",
        }}
      />
    </span>
  );
}

/* ----------------------------- Shared chrome ----------------------------- */

function PromptLine({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        marginBottom: 16,
        paddingBottom: 14,
        borderBottom: "1px dashed rgba(38,57,71,0.7)",
      }}
    >
      <span
        style={{
          color: "#00B48A",
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          fontSize: 13,
          lineHeight: 1.6,
          flexShrink: 0,
        }}
      >
        ▸
      </span>
      <span
        style={{
          color: "#F4F6F8",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 14,
          lineHeight: 1.55,
        }}
      >
        {children}
      </span>
    </div>
  );
}

function ToolStatus({
  delay,
  label,
  iconOnly,
}: {
  delay: number;
  label: string;
  iconOnly?: boolean;
}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), Math.max(0, delay * 1000));
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: done ? "#A6E6D2" : "#596876",
      }}
    >
      {!iconOnly ? <span>{done ? label : "running"}</span> : null}
      {done ? (
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: "#00B48A",
            color: "#0F1A24",
            fontSize: 10,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✓
        </span>
      ) : (
        <span
          aria-hidden
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            border: "2px solid #00B48A",
            borderTopColor: "transparent",
            display: "inline-block",
            animation: "fuel-spin 0.9s linear infinite",
          }}
        >
          <style>{`@keyframes fuel-spin { to { transform: rotate(360deg); } }`}</style>
        </span>
      )}
    </span>
  );
}

function SceneDots({ active, count }: { active: number; count: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 6,
        padding: "0 0 16px",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            width: i === active ? 18 : 6,
            height: 6,
            borderRadius: 3,
            background: i === active ? "#00B48A" : "#263947",
            transition: "width 280ms ease, background 280ms ease",
          }}
        />
      ))}
    </div>
  );
}
