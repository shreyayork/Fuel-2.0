import React, { useEffect, useMemo, useState } from "react";
import { FUEL_SUPPORT_EMAIL } from "../FuelHelpFaq";
import { LandingFooter, LandingNav, type LandingSectionId } from "../marketing/landingNav";
import "../marketing/landing.css";
import "../marketing/marketing.css";
import {
  getLegalDocument,
  LEGAL_DOCUMENTS,
  type LegalDocId,
} from "./legalContent";
import "./legal.css";

function LegalDocumentBody({ doc }: { doc: LegalDocId }) {
  const active = useMemo(() => getLegalDocument(doc), [doc]);

  const jumpTo = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <>
      <header className="mkt-legal-head">
        <span className="mkt-kicker is-left">Legal</span>
        <h1 id="fuel-legal-title">{active.title}</h1>
        <p className="mkt-legal-dek">{active.description}</p>
        <p className="mkt-legal-updated">Last updated {active.lastUpdated}</p>
      </header>

      <nav className="mkt-legal-toc" aria-label="On this page">
        <p className="mkt-legal-toc-label">On this page</p>
        <div className="mkt-legal-toc-links">
          {active.sections.map(section => {
            const id = `legal-${active.id}-${section.id}`;
            return (
              <a key={section.id} href={`#${id}`} onClick={event => jumpTo(event, id)}>
                {section.title}
              </a>
            );
          })}
        </div>
      </nav>

      <article className="mkt-legal-article">
        {active.sections.map(section => (
          <section
            key={section.id}
            id={`legal-${active.id}-${section.id}`}
            className="mkt-legal-section"
          >
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {section.bullets?.length ? (
              <ul>
                {section.bullets.map((bullet, index) => (
                  <li key={index}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <p className="mkt-legal-contact">
          Questions about these terms? Email{" "}
          <a href={`mailto:${FUEL_SUPPORT_EMAIL}`}>{FUEL_SUPPORT_EMAIL}</a>.
        </p>
      </article>
    </>
  );
}

export function FuelLegalPage({
  doc,
  onDocChange,
  onBack,
  variant = "workspace",
  onSignIn,
  onOpenLegal,
  onHome,
  onCompanies,
  onSection,
}: {
  doc: LegalDocId;
  onDocChange: (doc: LegalDocId) => void;
  onBack?: () => void;
  variant?: "workspace" | "marketing";
  onSignIn?: () => void;
  onGetStarted?: () => void;
  onOpenLegal?: (doc: LegalDocId) => void;
  onFaq?: () => void;
  onHome?: () => void;
  onCompanies?: () => void;
  onSection?: (id: LandingSectionId) => void;
}) {
  const active = useMemo(() => getLegalDocument(doc), [doc]);
  const [floatingNav, setFloatingNav] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [doc]);

  useEffect(() => {
    if (variant !== "marketing") return;
    const onScroll = () => setFloatingNav(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  if (variant === "marketing") {
    const goHome = onHome ?? onBack ?? (() => undefined);
    const navProps = {
      onSignIn: onSignIn ?? goHome,
      onHome: goHome,
      onCompanies: onCompanies ?? goHome,
      onSection: onSection ?? (() => goHome()),
    };
    return (
      <main className="fl-root fl-legal">
        <div className={`fl-float-nav${floatingNav ? " is-visible" : ""}`} aria-hidden={!floatingNav}>
          <LandingNav variant="float" interactive={floatingNav} {...navProps} />
        </div>
        <header className="fl-story-nav">
          <LandingNav variant="top" {...navProps} />
        </header>
        <div className="mkt-legal-page">
          <LegalDocumentBody doc={doc} />
        </div>
        <LandingFooter onHome={goHome} onOpenLegal={onOpenLegal} />
      </main>
    );
  }

  return (
    <section className="fuel-legal-page" aria-labelledby="fuel-legal-title">
      {onBack ? (
        <div className="fuel-legal-toolbar">
          <button type="button" className="fuel-legal-back" onClick={onBack}>
            ← Back
          </button>
        </div>
      ) : null}

      <header className="fuel-legal-head">
        <span className="fuel-legal-eyebrow">Legal</span>
        <h1 id="fuel-legal-title">{active.title}</h1>
        <p>{active.description}</p>
        <p className="fuel-legal-updated">Last updated {active.lastUpdated}</p>
      </header>

      <div className="fuel-legal-layout">
        <nav className="fuel-legal-nav overview-panel" aria-label="Legal documents">
          <p className="fuel-legal-nav-label">Documents</p>
          <ul>
            {LEGAL_DOCUMENTS.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === doc ? "is-active" : ""}
                  aria-current={item.id === doc ? "page" : undefined}
                  onClick={() => onDocChange(item.id)}
                >
                  <span className="fuel-legal-nav-title">{item.shortTitle}</span>
                  <span className="fuel-legal-nav-desc">{item.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <article className="fuel-legal-body overview-panel">
          <nav className="fuel-legal-toc" aria-label="On this page">
            <p className="fuel-legal-toc-label">On this page</p>
            <ol>
              {active.sections.map(section => (
                <li key={section.id}>
                  <a href={`#legal-${active.id}-${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="fuel-legal-sections">
            {active.sections.map(section => (
              <section
                key={section.id}
                id={`legal-${active.id}-${section.id}`}
                className="fuel-legal-section"
              >
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                {section.bullets?.length ? (
                  <ul>
                    {section.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <footer className="fuel-legal-foot">
            Questions about these terms? Email{" "}
            <a href={`mailto:${FUEL_SUPPORT_EMAIL}`}>{FUEL_SUPPORT_EMAIL}</a>.
          </footer>
        </article>
      </div>
    </section>
  );
}

export function FuelLegalFooterLinks({
  onOpen,
  className,
}: {
  onOpen: (doc: LegalDocId) => void;
  className?: string;
}) {
  return (
    <div className={className ? `fuel-legal-footer-links ${className}` : "fuel-legal-footer-links"}>
      <button type="button" onClick={() => onOpen("terms")}>Terms of Service</button>
      <span aria-hidden="true">·</span>
      <button type="button" onClick={() => onOpen("privacy")}>Privacy Policy</button>
      <span aria-hidden="true">·</span>
      <button type="button" onClick={() => onOpen("payment")}>Payment &amp; Credit Terms</button>
    </div>
  );
}
