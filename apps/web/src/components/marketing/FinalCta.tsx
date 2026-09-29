"use client";

import { motion } from "framer-motion";
import { AuroraBackground } from "./AuroraBackground";

/**
 * Final conversion CTA — sits between HowItWorks and the footer. The
 * landing page has now done its job (positioned the product, shown the
 * agent in motion, hinted at cohort data); this is the last impression
 * before the user drops out, so it asks plainly for the action.
 *
 * Mirrors the hero's aesthetic: aurora backdrop, gradient on the verb,
 * generous breathing room.
 */
export function FinalCta() {
  return (
    <section
      style={{
        position: "relative",
        padding: "96px 0 96px",
        textAlign: "center",
        overflow: "hidden",
        borderTop: "1px solid rgba(31,49,64,0.65)",
      }}
    >
      <AuroraBackground />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 760,
          margin: "0 auto",
          padding: "0 32px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#00B48A",
            marginBottom: 18,
          }}
        >
          Ready when you are
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.06, ease: "easeOut" }}
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            lineHeight: 1.1,
            fontWeight: 600,
            letterSpacing: -0.8,
            margin: 0,
            color: "#F4F6F8",
          }}
        >
          Build your workspace in{" "}
          <span
            style={{
              background:
                "linear-gradient(120deg, #00B48A 0%, #6FD3B7 35%, #ECD67F 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            under a minute
          </span>
          .
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.14, ease: "easeOut" }}
          style={{
            marginTop: 18,
            fontSize: 17,
            lineHeight: 1.55,
            color: "#CBD3DB",
            maxWidth: 540,
            marginInline: "auto",
          }}
        >
          Sign in with your work email. We&apos;ll profile your company,
          slot you into your peer cohort, and queue your first benchmark
          before you finish your coffee.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.22, ease: "easeOut" }}
          style={{
            marginTop: 32,
            display: "flex",
            justifyContent: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <a
            href="/sign-in?next=/onboard?cta=benchmark&mode=signup"
            style={{
              position: "relative",
              padding: "15px 28px",
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 600,
              textDecoration: "none",
              background: "linear-gradient(135deg, #00B48A 0%, #00A07B 100%)",
              color: "#0F1A24",
              border: "1px solid #00B48A",
              boxShadow:
                "0 12px 32px rgba(0,180,138,0.40), 0 2px 0 rgba(255,255,255,0.14) inset",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <style>{`
              @keyframes fuel-cta-shimmer {
                0%   { transform: translateX(-120%); }
                60%  { transform: translateX(180%);  }
                100% { transform: translateX(180%);  }
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
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.40) 50%, transparent 100%)",
                transform: "translateX(-120%)",
                animation: "fuel-cta-shimmer 4.5s ease-in-out 2s infinite",
                pointerEvents: "none",
                mixBlendMode: "overlay",
              }}
            />
            <span style={{ position: "relative" }}>Create your workspace</span>
            <span
              aria-hidden
              style={{
                position: "relative",
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                fontSize: 14,
                opacity: 0.85,
              }}
            >
              →
            </span>
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.36 }}
          style={{
            marginTop: 18,
            fontSize: 13,
            color: "#8A99A6",
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            letterSpacing: 0.3,
          }}
        >
          work email · ~60 seconds · no demo call · cancel anytime
        </motion.p>
      </div>
    </section>
  );
}
