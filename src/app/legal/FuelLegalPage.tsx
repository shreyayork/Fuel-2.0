import React, { useEffect, useMemo } from "react";
import { FUEL_SUPPORT_EMAIL } from "../FuelHelpFaq";
import { FuelMarketingFooter, FuelMarketingHeader } from "../marketing/FuelMarketingChrome";
import "../marketing/marketing.css";
import {
  getLegalDocument,
  LEGAL_DOCUMENTS,
  type LegalDocId,
} from "./legalContent";
import "./legal.css";

function LegalDocumentBody({ doc }: { doc: LegalDocId }) {
  const active = useMemo(() => getLegalDocument(doc), [doc]);

  return (
    <>
      <header className="mkt-legal-head">
        <span className="mkt-kicker is-left">Legal</span>
        <h1 id="fuel-legal-title">{active.title}</h1>
        <p className="mkt-legal-dek">{active.description}</p>
        <p className="mkt-legal-updated">Last updated {active.lastUpdated}</p>
      </header>

      <nav className="mkt-legal-toc" aria-label="On this page">
        {active.sections.map(section => (
          <a key={section.id} href={`#legal-${active.id}-${section.id}`}>
            {section.title}
          </a>
        ))}
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
  onGetStarted,
  onOpenLegal,
  onFaq,
}: {
  doc: LegalDocId;
  onDocChange: (doc: LegalDocId) => void;
  onBack?: () => void;
  variant?: "workspace" | "marketing";
  onSignIn?: () => void;
  onGetStarted?: () => void;
  onOpenLegal?: (doc: LegalDocId) => void;
  onFaq?: () => void;
}) {
  const active = useMemo(() => getLegalDocument(doc), [doc]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [doc]);

  if (variant === "marketing") {
    return (
      <main className="mkt-root">
        <FuelMarketingHeader
          onSignIn={onSignIn ?? onBack ?? (() => undefined)}
          onGetStarted={onGetStarted ?? onSignIn ?? onBack ?? (() => undefined)}
          onBrandClick={onBack}
        />

        <div className="mkt-legal-page">
          <LegalDocumentBody doc={doc} />
        </div>

        <FuelMarketingFooter
          onSignIn={onSignIn ?? onBack ?? (() => undefined)}
          onOpenLegal={onOpenLegal}
          onFaq={onFaq ?? onBack}
        />
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
