import React from "react";
import type { LegalDocId } from "../legal/legalContent";
import { FuelLegalFooterLinks } from "../legal/FuelLegalPage";
import { FuelMark } from "./FuelMark";

export function FuelMarketingHeader({
  onSignIn,
  onGetStarted,
  onBrandClick,
}: {
  onSignIn: () => void;
  onGetStarted: () => void;
  onBrandClick?: () => void;
}) {
  return (
    <header className="mkt-banner">
      <div className="mkt-banner-inner">
        <button
          type="button"
          className="mkt-brand"
          onClick={onBrandClick ?? (() => window.scrollTo({ top: 0, behavior: "smooth" }))}
        >
          <FuelMark />
        </button>
        <div className="mkt-nav-actions">
          <button type="button" className="mkt-link" onClick={onSignIn}>
            Sign in
          </button>
          <button type="button" className="mkt-cta mkt-cta-sm" onClick={onGetStarted}>
            Get started
          </button>
        </div>
      </div>
    </header>
  );
}

export function FuelMarketingFooter({
  onSignIn,
  onOpenLegal,
  onFaq,
}: {
  onSignIn: () => void;
  onOpenLegal?: (doc: LegalDocId) => void;
  onFaq?: () => void;
}) {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-inner">
        <button type="button" className="mkt-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <FuelMark size={22} />
        </button>
        <div className="mkt-footer-meta">
          <div className="mkt-footer-links">
            <button type="button" onClick={onSignIn}>Sign in</button>
            {onFaq ? (
              <button type="button" onClick={onFaq}>FAQ</button>
            ) : (
              <a href="#faq">FAQ</a>
            )}
            <a href="https://york.ie" target="_blank" rel="noreferrer">York IE</a>
            <span>© 2026</span>
          </div>
          {onOpenLegal ? (
            <FuelLegalFooterLinks onOpen={onOpenLegal} className="mkt-footer-legal fuel-legal-footer-links" />
          ) : null}
        </div>
      </div>
    </footer>
  );
}
