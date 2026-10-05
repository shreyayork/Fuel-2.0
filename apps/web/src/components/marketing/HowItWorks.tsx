"use client";

import { motion } from "framer-motion";
import {
  marketingEyebrow,
  marketingPanel,
  marketingTheme as t,
} from "./styles";

const STEPS = [
  {
    n: "01",
    title: "Sign up with your work email",
    body: "Domain verification is instant. Your KPIs count toward the global benchmark dataset — no demo call, no sales theater.",
  },
  {
    n: "02",
    title: "Watch the AI profile your company",
    body: "The agent scrapes your footprint, detects stack and stage, and slots you into a peer cohort. Confirm or correct in under a minute.",
  },
  {
    n: "03",
    title: "Run your first playbook same session",
    body: "Benchmark metrics, evaluate a deck, or pick from the library. Every artifact stays in your workspace for next quarter.",
  },
];

export function HowItWorks() {
  return (
    <section
      style={{
        padding: "0 var(--gutter) var(--section-y)",
        maxWidth: 1200,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          ...marketingEyebrow(),
          marginBottom: 14,
          textAlign: "center",
        }}
      >
        How it works
      </div>
      <h2
        style={{
          margin: 0,
          textAlign: "center",
          fontSize: "var(--fs-h2)",
          letterSpacing: -0.5,
          fontWeight: 600,
          color: t.ink,
          marginBottom: "clamp(32px, 6vw, 52px)",
          maxWidth: 680,
          marginInline: "auto",
          lineHeight: 1.18,
        }}
      >
        Cold sign-up to benchmarked insight in about a minute.
      </h2>

      <div
        className="mkt-how-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 16,
          position: "relative",
        }}
      >
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{
              delay: i * 0.1,
              duration: 0.55,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            style={marketingPanel({
              padding: "clamp(24px, 4vw, 30px)",
              minWidth: 0,
              background: `
                radial-gradient(120% 80% at 0% 0%, ${t.accent}18 0%, transparent 55%),
                linear-gradient(165deg, ${t.panel}F5 0%, ${t.panelInner} 100%)
              `,
            })}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontFamily: t.mono,
                  fontSize: "clamp(42px, 7vw, 56px)",
                  fontWeight: 600,
                  letterSpacing: -2.5,
                  lineHeight: 1,
                  background: `linear-gradient(180deg, ${t.accent}66, ${t.accent}14)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {s.n}
              </span>
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: `1px solid ${t.accent}55`,
                  background: t.accentSoft,
                  color: t.accent,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: t.mono,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {i + 1}
              </span>
            </div>
            <h3
              style={{
                margin: 0,
                marginBottom: 10,
                fontSize: "var(--fs-h3)",
                color: t.ink,
                fontWeight: 600,
                letterSpacing: -0.25,
                lineHeight: 1.28,
              }}
            >
              {s.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                color: t.inkSoft,
                lineHeight: 1.6,
              }}
            >
              {s.body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
