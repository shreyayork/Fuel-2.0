"use client";

import { motion } from "framer-motion";
import {
  marketingEyebrow,
  marketingGradientText,
  marketingPanel,
  marketingPrimaryCta,
  marketingTheme as t,
} from "./styles";

/**
 * Final conversion band — framed panel over the page atmosphere.
 */
export function FinalCta() {
  return (
    <section
      className="mkt-final"
      style={{
        position: "relative",
        padding: "0 var(--gutter) var(--section-y)",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        style={marketingPanel({
          maxWidth: 920,
          margin: "0 auto",
          padding: "clamp(40px, 7vw, 72px) clamp(24px, 5vw, 48px)",
          background: `
            radial-gradient(90% 80% at 50% 0%, ${t.accent}2E 0%, transparent 55%),
            radial-gradient(70% 60% at 100% 100%, ${t.warn}1A 0%, transparent 50%),
            linear-gradient(165deg, ${t.panel}F5 0%, ${t.panelInner} 100%)
          `,
        })}
      >
        <div style={{ ...marketingEyebrow(), marginBottom: 16 }}>
          Ready when you are
        </div>

        <h2
          style={{
            fontSize: "var(--fs-h2)",
            lineHeight: 1.12,
            fontWeight: 600,
            letterSpacing: -0.8,
            margin: 0,
            color: t.ink,
          }}
        >
          Build your workspace in{" "}
          <span style={marketingGradientText()}>under a minute</span>.
        </h2>

        <p
          style={{
            marginTop: 16,
            fontSize: "var(--fs-body)",
            lineHeight: 1.55,
            color: t.inkSoft,
            maxWidth: "48ch",
            marginInline: "auto",
          }}
        >
          Sign in with your work email. We&apos;ll profile your company, slot
          you into your peer cohort, and queue your first benchmark.
        </p>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <a
            href={`/sign-in?mode=signup&next=${encodeURIComponent("/onboard?cta=benchmark")}`}
            style={marketingPrimaryCta()}
          >
            <style>{`
              @keyframes fuel-cta-shimmer {
                0% { transform: translateX(-120%); }
                60% { transform: translateX(180%); }
                100% { transform: translateX(180%); }
              }
            `}</style>
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "40%",
                height: "100%",
                background: `linear-gradient(90deg, transparent, ${t.ink}55, transparent)`,
                animation: "fuel-cta-shimmer 4.5s ease-in-out 1.5s infinite",
                pointerEvents: "none",
                mixBlendMode: "overlay",
              }}
            />
            <span style={{ position: "relative" }}>Create your workspace</span>
            <span
              aria-hidden
              style={{
                position: "relative",
                fontFamily: t.mono,
                fontSize: 14,
                opacity: 0.9,
              }}
            >
              →
            </span>
          </a>
        </div>

        <p
          style={{
            marginTop: 16,
            marginBottom: 0,
            fontSize: 13,
            color: t.muted,
            fontFamily: t.mono,
            letterSpacing: 0.3,
          }}
        >
          work email · 60 seconds · no demo call · cancel anytime
        </p>
      </motion.div>
    </section>
  );
}
