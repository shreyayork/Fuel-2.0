import React, { useEffect, useState } from "react";
import arrowRight from "./landing-assets/arrow-right.svg";
import logoMarkFooter from "./landing-assets/logo-mark-footer.svg";
import logoMarkFooterMask from "./landing-assets/logo-mark-footer-mask.svg";
import logoMarkHeader from "./landing-assets/logo-mark-header.svg";
import logoMarkHero from "./landing-assets/logo-mark-hero.svg";
import logoMarkMask from "./landing-assets/logo-mark-mask.svg";
import logoTagline from "./landing-assets/logo-tagline.svg";
import logoTaglineFooter from "./landing-assets/logo-tagline-footer.svg";
import logoWordFooter from "./landing-assets/logo-word-footer.svg";
import logoWordFooterMask from "./landing-assets/logo-word-footer-mask.svg";
import logoWordHeader from "./landing-assets/logo-word-header.svg";
import logoWordHero from "./landing-assets/logo-word-hero.svg";
import logoWordMask from "./landing-assets/logo-word-mask.svg";
import type { LegalDocId } from "../legal/legalContent";

const CONTACT_URL = "https://york.ie";

export type LandingSectionId = "platform" | "who-its-for" | "how-fuel-works";

const SECTIONS: { id: LandingSectionId; label: string }[] = [
  { id: "who-its-for", label: "Who it's for" },
  { id: "platform", label: "Platform" },
  { id: "how-fuel-works", label: "How it works" },
];

export function FuelLogo({ tone }: { tone: "dark" | "light" | "footer" }) {
  const footer = tone === "footer";
  const mark = footer ? logoMarkFooter : tone === "light" ? logoMarkHeader : logoMarkHero;
  const word = footer ? logoWordFooter : tone === "light" ? logoWordHeader : logoWordHero;
  return (
    <span className={`fl-logo${footer ? " is-footer" : ""}`} role="img" aria-label="York IE Fuel Platform">
      <span
        className="fl-logo-mark"
        style={{ maskImage: `url("${footer ? logoMarkFooterMask : logoMarkMask}")`, WebkitMaskImage: `url("${footer ? logoMarkFooterMask : logoMarkMask}")` }}
      >
        <img alt="" src={mark} />
      </span>
      <span
        className="fl-logo-word"
        style={{ maskImage: `url("${footer ? logoWordFooterMask : logoWordMask}")`, WebkitMaskImage: `url("${footer ? logoWordFooterMask : logoWordMask}")` }}
      >
        <img alt="" src={word} />
      </span>
      <span className="fl-logo-tagline">
        <img alt="" src={footer ? logoTaglineFooter : logoTagline} />
      </span>
    </span>
  );
}

export function useHeroFloatingNav(heroRef: React.RefObject<HTMLElement | null>) {
  const [floating, setFloating] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFloating(!entry.isIntersecting),
      { rootMargin: "-120px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroRef]);

  return floating;
}

export function LandingNav({
  variant,
  active,
  interactive = true,
  reveal = false,
  onSignIn,
  onHome,
  onCompanies,
  onSection,
}: {
  variant: "top" | "float";
  active?: "companies";
  interactive?: boolean;
  reveal?: boolean;
  onSignIn: () => void;
  onHome: () => void;
  onCompanies: () => void;
  onSection: (id: LandingSectionId) => void;
}) {
  const [open, setOpen] = useState(false);
  const tabIndex = interactive ? 0 : -1;
  const revealClass = reveal ? " fl-reveal" : "";
  const close = () => setOpen(false);

  return (
    <nav className={`fl-nav is-${variant}${open ? " is-open" : ""}`} aria-label="Fuel">
      <button
        type="button"
        className={`fl-brand${revealClass}`}
        onClick={() => { close(); onHome(); }}
        tabIndex={tabIndex}
      >
        <FuelLogo tone={variant === "float" ? "light" : "dark"} />
      </button>
      <button
        type="button"
        className="fl-menu-toggle"
        aria-expanded={open}
        aria-controls={variant === "top" ? "fl-menu-top" : "fl-menu-float"}
        tabIndex={tabIndex}
        onClick={() => setOpen(value => !value)}
      >
        {open ? "Close" : "Menu"}
      </button>
      <div className="fl-menu" id={variant === "top" ? "fl-menu-top" : "fl-menu-float"}>
        {SECTIONS.map(section => (
          <button
            key={section.id}
            type="button"
            className={revealClass.trim() || undefined}
            tabIndex={tabIndex}
            onClick={() => { close(); onSection(section.id); }}
          >
            {section.label}
          </button>
        ))}
        <button
          type="button"
          className={`${active === "companies" ? "is-current" : ""}${revealClass}`.trim() || undefined}
          aria-current={active === "companies" ? "page" : undefined}
          tabIndex={tabIndex}
          onClick={() => { close(); onCompanies(); }}
        >
          Companies
        </button>
        <a href={CONTACT_URL} target="_blank" rel="noreferrer" tabIndex={tabIndex} className={revealClass.trim() || undefined}>
          Contact Us <span aria-hidden="true">↗</span>
        </a>
      </div>
      <button type="button" className={`fl-nav-login${revealClass}`} onClick={onSignIn} tabIndex={tabIndex}>
        <span>Fuel Login</span>
        <img alt="" src={arrowRight} width={20} height={20} />
      </button>
    </nav>
  );
}

export function LandingFooter({
  onHome,
  onOpenLegal,
}: {
  onHome: () => void;
  onOpenLegal?: (doc: LegalDocId) => void;
}) {
  return (
    <footer className="fl-footer">
      <button type="button" className="fl-brand fl-footer-brand fl-reveal" onClick={onHome}>
        <FuelLogo tone="footer" />
      </button>
      <div className="fl-footer-links">
        <button type="button" className="fl-reveal" onClick={() => onOpenLegal?.("terms")}>Terms of Service</button>
        <button type="button" className="fl-reveal" onClick={() => onOpenLegal?.("privacy")}>Privacy Policy</button>
        <button type="button" className="fl-reveal" onClick={() => onOpenLegal?.("payment")}>Payment &amp; Credit Terms</button>
      </div>
      <p className="fl-footer-copy fl-reveal">©Copyright 2026. Fuel by York.IE. All rights reserved.</p>
    </footer>
  );
}
