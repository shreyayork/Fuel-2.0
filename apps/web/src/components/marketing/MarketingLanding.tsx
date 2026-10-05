import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { Hero } from "./Hero";
import { WalkthroughLoop } from "./WalkthroughLoop";
import { TeaserWidget } from "./TeaserWidget";
import { HowItWorks } from "./HowItWorks";
import { FinalCta } from "./FinalCta";
import { MarketingFooter } from "./Footer";
import { marketingResponsiveCss } from "./responsiveCss";
import {
  marketingAtmosphereCss,
  marketingGetStartedLink,
  marketingHeaderBar,
  marketingHeaderInner,
  marketingPageShell,
  marketingTheme as t,
} from "./styles";

/**
 * Public marketing landing — cinematic SIGNAL atmosphere + product-led hero.
 */
export function MarketingLanding() {
  return (
    <main style={marketingPageShell()}>
      <style
        dangerouslySetInnerHTML={{
          __html: `${marketingAtmosphereCss()}${marketingResponsiveCss()}`,
        }}
      />
      <div className="mkt-atmosphere" aria-hidden>
        <div className="mkt-atmosphere__base" />
        <div className="mkt-atmosphere__beam" />
        <div className="mkt-atmosphere__grid" />
        <div className="mkt-atmosphere__grain" />
      </div>
      <div className="mkt-content">
        <MarketingHeader />
        <Hero />
        <TrustStrip />
        <WalkthroughLoop />
        <TeaserWidget />
        <HowItWorks />
        <FinalCta />
        <MarketingFooter />
      </div>
    </main>
  );
}

function MarketingHeader() {
  return (
    <header style={marketingHeaderBar()}>
      <div className="mkt-header-inner" style={marketingHeaderInner()}>
        <Link
          href="/"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <BrandMark
            size={26}
            color={t.accent}
            ink={t.ink}
            muted={t.mutedSoft}
            fontFamily={t.sans}
          />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Link
            href={`/sign-in?next=${encodeURIComponent("/onboard")}`}
            style={{
              color: t.inkSoft,
              fontSize: 14,
              textDecoration: "none",
              fontWeight: 500,
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              paddingInline: 4,
            }}
          >
            Sign in
          </Link>
          <Link
            className="mkt-header-cta"
            href={`/sign-in?mode=signup&next=${encodeURIComponent("/onboard?cta=benchmark")}`}
            style={marketingGetStartedLink()}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function TrustStrip() {
  const items = [
    "Peer cohorts",
    "Live signals",
    "AI playbooks",
    "York IE portfolio DNA",
  ];
  return (
    <div
      style={{
        padding: "28px var(--gutter) 8px",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px 28px",
          padding: "18px 0",
          borderTop: `1px solid ${t.borderSubtle}`,
          borderBottom: `1px solid ${t.borderSubtle}`,
        }}
      >
        {items.map((label) => (
          <span
            key={label}
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 0.4,
              color: t.muted,
              fontFamily: t.mono,
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
