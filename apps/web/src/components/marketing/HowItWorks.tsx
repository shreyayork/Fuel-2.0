"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    title: "Sign up with your work email",
    body: "We verify the domain instantly so your KPI submissions count toward the global benchmark dataset. No demo call, no sales motion.",
  },
  {
    n: "02",
    title: "Watch the AI profile your company",
    body: "Live agent runs against your domain — scrapes the homepage, detects your stack, identifies your peer cohort. You confirm or correct in under a minute.",
  },
  {
    n: "03",
    title: "Run your first playbook in the same session",
    body: "Benchmark your metrics, evaluate your deck, or pick from the library. Every artifact lives in your workspace forever, retrievable next quarter.",
  },
];

export function HowItWorks() {
  return (
    <section
      style={{
        padding: "0 32px 120px",
        maxWidth: 1180,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#00B48A",
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
          fontSize: 34,
          letterSpacing: -0.4,
          fontWeight: 600,
          color: "#F4F6F8",
          marginBottom: 56,
          maxWidth: 760,
          marginInline: "auto",
          lineHeight: 1.15,
        }}
      >
        From cold sign-up to your first benchmarked insight in about a minute.
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 20,
        }}
      >
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: i * 0.12, duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
            style={{
              position: "relative",
              background:
                "linear-gradient(180deg, rgba(23,38,50,0.85) 0%, rgba(15,26,36,0.85) 100%)",
              border: "1px solid rgba(38,57,71,0.95)",
              borderRadius: 16,
              padding: 28,
              overflow: "hidden",
            }}
          >
            {/* Top-edge accent line */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(0,180,138,0.5), transparent)",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontFamily: "JetBrains Mono, ui-monospace, monospace",
                  color: "#00B48A",
                  fontSize: 13,
                  letterSpacing: 1,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "rgba(0,180,138,0.10)",
                  border: "1px solid rgba(0,180,138,0.25)",
                }}
              >
                STEP {s.n}
              </span>
            </div>
            <h3
              style={{
                margin: 0,
                marginBottom: 10,
                fontSize: 19,
                color: "#F4F6F8",
                fontWeight: 600,
                letterSpacing: -0.2,
                lineHeight: 1.3,
              }}
            >
              {s.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 14.5,
                color: "#CBD3DB",
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
