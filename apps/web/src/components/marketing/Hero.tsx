"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TokenStream } from "./TokenStream";
import {
  marketingChip,
  marketingGradientText,
  marketingPrimaryCta,
  marketingSecondaryCta,
  marketingTheme as t,
} from "./styles";

/**
 * Cinematic brand-first hero: oversized Fuel mark, streamed headline,
 * CTAs, then an edge-to-edge product canvas as the visual plane.
 */
export function Hero() {
  const [streamDone, setStreamDone] = useState(false);
  /** Reveal supporting copy even if the stream is slow / interrupted. */
  const [copyReady, setCopyReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setCopyReady(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  const showCopy = streamDone || copyReady;

  return (
    <section
      className="mkt-hero"
      style={{
        position: "relative",
        padding: "clamp(36px, 7vw, 64px) 0 0",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 var(--gutter)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mkt-hero-eyebrow"
          style={{ ...marketingChip(), marginBottom: 24 }}
        >
          <PulseDot />
          <span>Live · SaaS founder data marketplace</span>
        </motion.div>

        <h1
          style={{
            fontSize: "var(--fs-h1)",
            lineHeight: 1.05,
            fontWeight: 600,
            letterSpacing: -1.6,
            margin: 0,
            maxWidth: 900,
            marginInline: "auto",
            color: t.ink,
          }}
        >
          <span style={{ display: "block", color: t.inkSoft, fontWeight: 500 }}>
            The
          </span>
          <TokenStream
            text="AI Operating System"
            startDelayMs={320}
            baseTokenMs={38}
            tokenJitterMs={22}
            onDone={() => setStreamDone(true)}
            style={{
              display: "inline-block",
              ...marketingGradientText(),
            }}
          />
          <span style={{ display: "block" }}>for Growth-Stage SaaS.</span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: showCopy ? 1 : 0, y: showCopy ? 0 : 12 }}
          transition={{ duration: 0.5 }}
          style={{
            marginTop: 22,
            fontSize: "clamp(1.05rem, 0.98rem + 0.35vw, 1.2rem)",
            lineHeight: 1.55,
            color: t.inkSoft,
            maxWidth: "48ch",
            marginInline: "auto",
          }}
        >
          Peer-cohort benchmarks, live signals, and an AI chief of staff —
          insight to action in under a minute.
        </motion.p>

        <motion.div
          className="mkt-hero-ctas"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: showCopy ? 1 : 0, y: showCopy ? 0 : 14 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          style={{
            marginTop: 30,
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <MagneticCta
            href={`/sign-in?next=${encodeURIComponent("/onboard?cta=benchmark")}`}
            primary
          >
            Benchmark My Company
          </MagneticCta>
          <MagneticCta
            href={`/sign-in?next=${encodeURIComponent("/onboard?cta=pitch-deck")}`}
          >
            Evaluate My Pitch Deck
          </MagneticCta>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: showCopy ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{
            marginTop: 14,
            marginBottom: 0,
            fontSize: "clamp(11px, 2.8vw, 13px)",
            color: t.muted,
            fontFamily: t.mono,
            letterSpacing: 0.2,
            lineHeight: 1.4,
            paddingInline: 4,
          }}
        >
          work email · 60 seconds · no demo call
        </motion.p>
      </div>

      <HeroCanvas visible={showCopy} />
    </section>
  );
}

/** Edge-to-edge product plane — dominant visual under the copy. */
function HeroCanvas({ visible }: { visible: boolean }) {
  return (
    <motion.div
      className="mkt-hero-stage"
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 48 }}
      transition={{ duration: 0.85, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
      style={{
        marginTop: "clamp(36px, 6vw, 56px)",
        padding: "0 var(--gutter)",
        maxWidth: 1200,
        marginInline: "auto",
        position: "relative",
      }}
    >
      {/* Glow under canvas */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "10%",
          right: "10%",
          bottom: -10,
          height: 120,
          background: `radial-gradient(ellipse at center, ${t.accent}40 0%, transparent 70%)`,
          filter: "blur(24px)",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: "22px 22px 0 0",
          border: `1px solid ${t.borderSubtle}`,
          borderBottom: "none",
          background: `linear-gradient(180deg, ${t.panel} 0%, ${t.panelInner} 100%)`,
          boxShadow: `
            0 0 0 1px ${t.borderFaint} inset,
            0 -30px 100px ${t.accent}1F,
            0 50px 120px rgba(0,0,0,0.55)
          `,
          overflow: "hidden",
          minHeight: "min(380px, 52vh)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            borderBottom: `1px solid ${t.borderSubtle}`,
            background: `linear-gradient(180deg, ${t.shell}, ${t.panelInner}CC)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={dot(t.negative)} />
            <span style={dot(t.warn)} />
            <span style={dot(t.accent)} />
            <span
              style={{
                marginLeft: 10,
                fontFamily: t.mono,
                fontSize: 12,
                color: t.muted,
              }}
            >
              fuel.app / benchmarks / acme
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontFamily: t.mono,
              color: t.accent,
              padding: "4px 10px",
              borderRadius: 999,
              border: `1px solid ${t.accent}55`,
              background: t.accentSoft,
            }}
          >
            live
          </span>
        </div>

        <div
          className="mkt-hero-stage-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "200px minmax(0, 1fr) 220px",
            minHeight: 320,
          }}
        >
          <aside
            style={{
              borderRight: `1px solid ${t.borderSubtle}`,
              padding: "16px 12px",
              background: `${t.shell}B3`,
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: t.mono,
                color: t.mutedSoft,
                letterSpacing: 1,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              Workspace
            </div>
            {["Portfolio", "Benchmarks", "Playbooks", "Signals", "People"].map(
              (label, i) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    marginBottom: 4,
                    fontSize: 13,
                    fontWeight: i === 1 ? 600 : 500,
                    color: i === 1 ? t.ink : t.muted,
                    background:
                      i === 1
                        ? `linear-gradient(90deg, ${t.accent}33, ${t.accent}0A)`
                        : "transparent",
                    border:
                      i === 1
                        ? `1px solid ${t.accent}40`
                        : "1px solid transparent",
                    boxShadow: i === 1 ? `0 0 20px ${t.accent}22` : undefined,
                  }}
                >
                  {label}
                </div>
              ),
            )}
          </aside>

          <div style={{ padding: "22px 24px 40px", textAlign: "left" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 6,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: t.mono,
                    fontSize: 11,
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                    color: t.accent,
                    marginBottom: 6,
                  }}
                >
                  Peer cohort · B2B SaaS · Seed
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    color: t.ink,
                    letterSpacing: -0.4,
                  }}
                >
                  Where you sit vs. the median
                </div>
              </div>
              <div
                style={{
                  fontFamily: t.mono,
                  fontSize: 28,
                  fontWeight: 600,
                  color: t.warn,
                  letterSpacing: -1,
                }}
              >
                p78
              </div>
            </div>

            {[
              { label: "ARR growth YoY", you: 78, tone: t.accent },
              { label: "Net revenue retention", you: 64, tone: t.warn },
              { label: "Burn multiple", you: 34, tone: t.negative },
            ].map((row, i) => (
              <div key={row.label} style={{ marginTop: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 7,
                    fontSize: 13,
                    color: t.inkSoft,
                  }}
                >
                  <span>{row.label}</span>
                  <span style={{ fontFamily: t.mono, color: t.muted }}>
                    {row.you}th
                  </span>
                </div>
                <div
                  style={{
                    height: 9,
                    borderRadius: 999,
                    background: t.ruleSoft,
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: visible ? `${row.you}%` : 0 }}
                    transition={{
                      delay: 0.4 + i * 0.16,
                      duration: 0.9,
                      ease: [0.22, 0.61, 0.36, 1],
                    }}
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${row.tone}, ${t.warn})`,
                      boxShadow: `0 0 18px ${row.tone}88`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <aside
            className="mkt-hero-stage-aside"
            style={{
              borderLeft: `1px solid ${t.borderSubtle}`,
              padding: "18px 14px",
              background: `${t.panelInner}CC`,
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: t.mono,
                color: t.mutedSoft,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Agent
            </div>
            {[
              "Profiled acme.com",
              "Matched cohort n=124",
              "Queued Finance Assessment",
            ].map((line, i) => (
              <motion.div
                key={line}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : 8 }}
                transition={{ delay: 0.7 + i * 0.2, duration: 0.4 }}
                style={{
                  padding: "10px 11px",
                  borderRadius: 10,
                  marginBottom: 8,
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: t.inkSoft,
                  background: `${t.accent}12`,
                  border: `1px solid ${t.accent}28`,
                }}
              >
                <span style={{ color: t.accent, marginRight: 6 }}>↳</span>
                {line}
              </motion.div>
            ))}
          </aside>
        </div>

        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "42%",
            background: `linear-gradient(to bottom, transparent, ${t.bg})`,
            pointerEvents: "none",
          }}
        />
      </div>
    </motion.div>
  );
}

function dot(color: string): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: color,
    display: "inline-block",
    flexShrink: 0,
  };
}

function PulseDot() {
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        width: 8,
        height: 8,
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes fuel-pulse-dot {
          0% { transform: scale(1); opacity: 0.85; }
          70% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: t.accent,
          borderRadius: 999,
          opacity: 0.55,
          animation: "fuel-pulse-dot 2s ease-out infinite",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: t.accent,
          borderRadius: 999,
        }}
      />
    </span>
  );
}

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
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setTranslate({
        x: (e.clientX - (rect.left + rect.width / 2)) * 0.14,
        y: (e.clientY - (rect.top + rect.height / 2)) * 0.14,
      });
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
        ...(primary ? marketingPrimaryCta() : marketingSecondaryCta()),
        transform: `translate3d(${translate.x}px, ${translate.y}px, 0)`,
        transition:
          "transform 220ms cubic-bezier(0.22,0.61,0.36,1), box-shadow 220ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {primary ? (
        <>
          <style>{`
            @keyframes fuel-shimmer-sweep {
              0% { transform: translateX(-120%); }
              55% { transform: translateX(180%); }
              100% { transform: translateX(180%); }
            }
          `}</style>
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              width: "42%",
              background: `linear-gradient(90deg, transparent, ${t.ink}55, transparent)`,
              animation: "fuel-shimmer-sweep 4.2s ease-in-out 1.2s infinite",
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
          fontFamily: t.mono,
          fontSize: 13,
          opacity: primary ? 0.9 : 0.55,
        }}
      >
        →
      </span>
    </a>
  );
}
