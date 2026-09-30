import React, { useState } from "react";
import {
  PRO_TAGLINE,
  PRO_UPGRADE_HEADERS,
  TOP_UP_FOOTNOTE,
} from "./constants";
import { getProIncludes, getProPlan, getProPriceFrame, getTopUpOptions, useCreditCatalog } from "./creditCatalog";
import { LegalDocLink } from "../legal/LegalNavContext";
import { useCredits } from "./CreditProvider";

function UpgradeLegalFootnote() {
  return (
    <p className="credit-upgrade-footnote credit-upgrade-legal">
      By continuing you agree to the{" "}
      <LegalDocLink doc="payment">Payment &amp; Credit Terms</LegalDocLink>
      {" "}and{" "}
      <LegalDocLink doc="terms">Terms of Service</LegalDocLink>.
    </p>
  );
}

export function UpgradeModal() {
  const {
    upgradeOpen,
    upgradeTab,
    upgradeReason,
    snapshot,
    closeUpgrade,
    setUpgradeTab,
    completeProUpgrade,
    completeTopUp,
  } = useCredits();
  useCreditCatalog();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const topUps = getTopUpOptions();
  const [topUpId, setTopUpId] = useState(() => topUps.find(pack => pack.popular)?.id ?? topUps[0]?.id ?? "");

  if (!upgradeOpen) return null;

  const selectedTopUp = topUps.find(option => option.id === topUpId) ?? topUps[0];
  const isFree = snapshot.plan === "free";
  const pro = getProPlan();
  const feeMonthly = pro.feeMonthly ?? 30;
  const feeYearly = pro.feeYearly ?? 300;
  const yearlyMonthly = Math.round(feeYearly / 12);
  const includes = getProIncludes();
  const priceFrame = getProPriceFrame();

  return (
    <div className="credit-upgrade-overlay" onClick={closeUpgrade}>
      <div className="credit-upgrade-modal" onClick={event => event.stopPropagation()} role="dialog" aria-label="Upgrade">
        <div className="credit-upgrade-tabs">
          <button type="button" className={upgradeTab === "pro" ? "active" : ""} onClick={() => setUpgradeTab("pro")}>
            Upgrade to Pro
          </button>
          <button type="button" className={upgradeTab === "topup" ? "active" : ""} onClick={() => setUpgradeTab("topup")}>
            Top up credits
          </button>
        </div>

        {upgradeTab === "pro" ? (
          <>
            <p className="credit-upgrade-tagline">{PRO_TAGLINE}</p>
            <h3 className="credit-upgrade-title">{PRO_UPGRADE_HEADERS[upgradeReason]}</h3>
            <p className="credit-upgrade-subtitle">{priceFrame}</p>
            <ul className="credit-upgrade-includes">
              {includes.map(item => <li key={item}>{item}</li>)}
            </ul>
            <div className="credit-billing-grid">
              <button
                type="button"
                className={`credit-billing-option${billingCycle === "monthly" ? " selected" : ""}`}
                onClick={() => setBillingCycle("monthly")}
              >
                <div className="credit-billing-label">Monthly</div>
                <strong className="credit-billing-price">${feeMonthly}</strong><span>/ mo</span>
              </button>
              <button
                type="button"
                className={`credit-billing-option recommended${billingCycle === "annual" ? " selected" : ""}`}
                onClick={() => setBillingCycle("annual")}
              >
                <span className="credit-billing-recommended">Recommended</span>
                <div className="credit-billing-label">Annual</div>
                <strong className="credit-billing-price">${feeYearly}</strong><span>/ yr</span>
                <div className="credit-billing-sub">${yearlyMonthly}/mo · 2 months free</div>
              </button>
            </div>
            <button type="button" className="credit-btn-primary credit-upgrade-cta" onClick={completeProUpgrade}>
              Start your AI advisor · {billingCycle === "annual" ? `$${yearlyMonthly}/mo billed yearly` : `$${feeMonthly}/mo`}
            </button>
            <p className="credit-upgrade-footnote">Powered by Stripe · cancel anytime · no equity, no advisory fees</p>
            <UpgradeLegalFootnote />
          </>
        ) : (
          <>
            {isFree ? (
              <p className="credit-topup-gate">
                Top-ups unlock on Pro — your always-on AI advisor, from ${yearlyMonthly}/mo.{" "}
                <button type="button" className="profile-usage-upgrade-link" onClick={() => setUpgradeTab("pro")}>
                  See Pro pricing
                </button>
              </p>
            ) : (
              <>
                <div className="credit-topup-grid">
                  {topUps.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`credit-topup-option${topUpId === option.id ? " selected" : ""}`}
                      onClick={() => setTopUpId(option.id)}
                    >
                      <div className="credit-topup-option-head">
                        <strong>{option.label}</strong>
                        <div className="credit-topup-option-badges">
                          {option.popular ? (
                            <span className="credit-topup-badge popular">Most popular</span>
                          ) : null}
                          {option.discount ? (
                            <span className="credit-topup-badge discount">{option.discount}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="credit-topup-option-meta">
                        <span className="credit-topup-option-credits">{option.credits.toLocaleString()} credits</span>
                        <span className="credit-topup-option-price">${option.price}</span>
                      </div>
                      <p className="credit-topup-option-blurb">{option.blurb}</p>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="credit-btn-primary credit-upgrade-cta"
                  onClick={() => selectedTopUp && completeTopUp(selectedTopUp.credits)}
                >
                  Top up · {selectedTopUp?.label} · ${selectedTopUp?.price}
                </button>
                <p className="credit-upgrade-footnote">{TOP_UP_FOOTNOTE}</p>
                <UpgradeLegalFootnote />
              </>
            )}
          </>
        )}

        <button type="button" className="credit-btn-ghost credit-upgrade-close" onClick={closeUpgrade}>
          Close
        </button>
      </div>
    </div>
  );
}
