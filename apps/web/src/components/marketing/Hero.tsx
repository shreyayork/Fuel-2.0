"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AuroraBackground } from "./AuroraBackground";
import { TokenStream } from "./TokenStream";

/**
 * Hero band. Aurora backdrop + token-streamed headline + magnetic CTAs.
 *
 * The headline plays out in two stages so the page feels like it's being
 * generated as you land: the eyebrow + first subhead line fade in, the
 * main headline streams character-by-character with a blinking caret,
 * then the CTAs and metrics row land together once the stream completes.
 */
export function Hero() {
  const [streamDone, setStreamDone] = useState(false);

  return (
    <section
      style={{
        position: "relative",
        padding: "120px 0 96px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <AuroraBackground />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 32px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px 6px 8px",
            borderRadius: 999,
            border: "1px solid rgba(0,180,138,0.30)",
            background: "rgba(0,180,138,0.06)",
            color: "#A6E6D2",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 0.3,
            marginBottom: 28,
            fontFamily: "Inter, -apple-system, system-ui, sans-serif",
          }}
        >
          <PulseDot />
          <span>Live · agent-driven workspace for SaaS founders</span>
        </motion.div>

        <h1
          style={{
            fontSize: "clamp(40px, 6.4vw, 76px)",
            lineHeight: 1.04,
            fontWeight: 600,
            letterSpacing: -1.2,
            margin: 0,
            maxWidth: 960,
            marginInline: "auto",
            color: "#F4F6F8",
          }}
        >
          <span style={{ display: "block" }}>The </span>
          <span
            style={{
              display: "inline-block",
              background:
                "linear-gradient(120deg, #00B48A 0%, #6FD3B7 35%, #ECD67F 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            <TokenStream
              text="AI Operating System"
              startDelayMs={420}
              baseTokenMs={42}
              tokenJitterMs={28}
              onDone={() => setStreamDone(true)}
            />
          </span>
          <span style={{ display: "block" }}>for Growth-Stage SaaS.</span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: streamDone ? 1 : 0, y: streamDone ? 0 : 12 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{
            marginTop: 28,
            fontSize: 18,
            lineHeight: 1.55,
            color: "#CBD3DB",
            maxWidth: 640,
            marginInline: "auto",
          }}
        >
          Real-time signals, peer-cohort benchmarks, and an AI chief of staff
          that helps founders move from insight to action.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: streamDone ? 1 : 0, y: streamDone ? 0 : 14 }}
          transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
          style={{
            marginTop: 40,
            display: "flex",
            gap: 14,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <MagneticCta href="/sign-in?next=/onboard?cta=benchmark" primary>
            Benchmark My Company
          </MagneticCta>
          <MagneticCta href="/sign-in?next=/onboard?cta=pitch-deck">
            Evaluate My Pitch Deck
          </MagneticCta>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: streamDone ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.32 }}
          style={{
            marginTop: 22,
            fontSize: 13,
            color: "#8A99A6",
            fontFamily: "JetBrains Mono, ui-monospace, monospace",
            letterSpacing: 0.3,
          }}
        >
          work email · ~60 seconds to first insight · no demo call
        </motion.div>
      </div>
    </section>
  );
}

/** Small pulsing dot — "live" indicator in the eyebrow chip. */
function PulseDot() {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        width: 8,
        height: 8,
        display: "inline-block",
      }}
    >
      <style>{`
        @keyframes fuel-pulse-dot {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(2.4); opacity: 0;   }
          100% { transform: scale(2.4); opacity: 0;   }
        }
      `}</style>
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: "#00B48A",
          borderRadius: 999,
          opacity: 0.55,
          animation: "fuel-pulse-dot 2s ease-out infinite",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: "#00B48A",
          borderRadius: 999,
        }}
      />
    </span>
  );
}

/**
 * CTA with a magnetic-hover effect (button center subtly chases the
 * cursor) + a shimmer-sweep behind the label every few seconds on the
 * primary button. Less is more — the effects only fire on hover/focus so
 * resting state stays clean.
 */
function MagneticCta({
  href,
  primary,
  children,
}: {
  href: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      // Pull strength tapers off — gentle, not goofy.
      setTranslate({ x: dx * 0.18, y: dy * 0.18 });
    };
    const onLeave = () => setTranslate({ x: 0, y: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <a
      ref={ref}
      href={href}
      style={{
        position: "relative",
        padding: "14px 24px",
        borderRadius: 999,
        fontSize: 15,
        fontWeight: 600,
        textDecoration: "none",
        background: primary
          ? "linear-gradient(135deg, #00B48A 0%, #00A07B 100%)"
          : "transparent",
        color: primary ? "#0F1A24" : "#F4F6F8",
        border: primary ? "1px solid #00B48A" : "1px solid #2E4456",
        boxShadow: primary
          ? "0 8px 28px rgba(0,180,138,0.32), 0 2px 0 rgba(255,255,255,0.10) inset"
          : "0 2px 0 rgba(255,255,255,0.04) inset",
        transform: `translate3d(${translate.x}px, ${translate.y}px, 0)`,
        transition: "transform 220ms cubic-bezier(0.22,0.61,0.36,1), box-shadow 220ms ease, background 220ms ease",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
        willChange: "transform",
      }}
      onMouseEnter={(e) => {
        if (primary) {
          e.currentTarget.style.boxShadow =
            "0 12px 36px rgba(0,180,138,0.45), 0 2px 0 rgba(255,255,255,0.16) inset";
        } else {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.borderColor = "#3E5668";
        }
      }}
      onMouseLeave={(e) => {
        if (primary) {
          e.currentTarget.style.boxShadow =
            "0 8px 28px rgba(0,180,138,0.32), 0 2px 0 rgba(255,255,255,0.10) inset";
        } else {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "#2E4456";
        }
      }}
    >
      {primary ? (
        <>
          <style>{`
            @keyframes fuel-shimmer-sweep {
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
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
              transform: "translateX(-120%)",
              animation: "fuel-shimmer-sweep 4.5s ease-in-out 1.5s infinite",
              pointerEvents: "none",
              mixBlendMode: "overlay",
            }}
          />
        </>
      ) : null}
      <span style={{ position: "relative" }}>{children}</span>
      <span
        aria-hidden
        style={{
          position: "relative",
          fontFamily: "JetBrains Mono, ui-monospace, monospace",
          fontSize: 13,
          opacity: primary ? 0.85 : 0.55,
        }}
      >
        →
      </span>
    </a>
  );
}
