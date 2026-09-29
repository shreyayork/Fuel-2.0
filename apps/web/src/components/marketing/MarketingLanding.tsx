import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { Hero } from "./Hero";
import { WalkthroughLoop } from "./WalkthroughLoop";
import { TeaserWidget } from "./TeaserWidget";
import { HowItWorks } from "./HowItWorks";
import { FinalCta } from "./FinalCta";
import { MarketingFooter } from "./Footer";

/**
 * Top-level marketing landing. Dark, polished, founder-facing. Force the
 * `signal` palette via inline styles — root layout is theme-agnostic.
 *
 * Composition lives in distinct components so each section can iterate
 * without hauling the rest. Order is deliberate: Hero (token-streamed
 * headline + dual CTAs), WalkthroughLoop (3 scripted agent scenes),
 * TeaserWidget (one cached cohort stat, generates curiosity),
 * HowItWorks (3-step explainer), Footer.
 */
export function MarketingLanding() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top, #142535 0%, #0F1A24 45%, #0B141C 100%)",
        color: "#F4F6F8",
        fontFamily: "Inter, -apple-system, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <MarketingHeader />
      <Hero />
      <WalkthroughLoop />
      <TeaserWidget />
      <HowItWorks />
      <FinalCta />
      <MarketingFooter />
    </main>
  );
}

function MarketingHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "saturate(140%) blur(10px)",
        WebkitBackdropFilter: "saturate(140%) blur(10px)",
        background: "rgba(15, 26, 36, 0.72)",
        borderBottom: "1px solid rgba(38, 57, 71, 0.55)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <BrandMark size={26} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Link
            href="/sign-in"
            style={{
              color: "#CBD3DB",
              fontSize: 14,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Sign in
          </Link>
          <Link
            href="/sign-in?next=/onboard?cta=benchmark"
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #00B48A 0%, #00A07B 100%)",
              color: "#0F1A24",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #00B48A",
              boxShadow:
                "0 4px 14px rgba(0,180,138,0.30), 0 1px 0 rgba(255,255,255,0.10) inset",
            }}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
