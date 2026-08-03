import React, { useRef, useState } from "react";
import { handleTabListKeyDown } from "../a11y/tabListKeyboard";
import { useDialogA11y } from "../a11y/useDialogA11y";
import {
  PRO_INCLUDES,
  PRO_PRICE_FRAME,
  PRO_TAGLINE,
  PRO_UPGRADE_HEADERS,
  TOP_UP_FOOTNOTE,
  TOP_UP_OPTIONS,
} from "./constants";
import { useCredits } from "./CreditProvider";

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

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [topUpId, setTopUpId] = useState("growth");
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogA11y(upgradeOpen, dialogRef, closeUpgrade);

  if (!upgradeOpen) return null;

  const selectedTopUp = TOP_UP_OPTIONS.find(option => option.id === topUpId) ?? TOP_UP_OPTIONS[2];
  const isFree = snapshot.plan === "free";

  return (
    <div className="credit-upgrade-overlay" onClick={closeUpgrade} role="presentation">
      <div
        ref={dialogRef}
        className="credit-upgrade-modal"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Upgrade Fuel plan"
      >
        <div className="credit-upgrade-tabs" role="tablist" aria-label="Upgrade options">
          <button
            type="button"
            id="tab-pro"
            role="tab"
            aria-selected={upgradeTab === "pro"}
            aria-controls="upgrade-panel-pro"
            className={upgradeTab === "pro" ? "active" : ""}
            onClick={() => setUpgradeTab("pro")}
            onKeyDown={event => handleTabListKeyDown(event, ["pro", "topup"], upgradeTab, setUpgradeTab)}
          >
            Upgrade to Pro
          </button>
          <button
            type="button"
            id="tab-topup"
            role="tab"
            aria-selected={upgradeTab === "topup"}
            aria-controls="upgrade-panel-topup"
            className={upgradeTab === "topup" ? "active" : ""}
            onClick={() => setUpgradeTab("topup")}
            onKeyDown={event => handleTabListKeyDown(event, ["pro", "topup"], upgradeTab, setUpgradeTab)}
          >
            Top up credits
          </button>
        </div>

        {upgradeTab === "pro" ? (
          <div id="upgrade-panel-pro" role="tabpanel" aria-labelledby="tab-pro">
            <p className="credit-upgrade-tagline">{PRO_TAGLINE}</p>
            <h3 className="credit-upgrade-title">{PRO_UPGRADE_HEADERS[upgradeReason]}</h3>
            <p className="credit-upgrade-subtitle">{PRO_PRICE_FRAME}</p>
            <ul className="credit-upgrade-includes">
              {PRO_INCLUDES.map(item => <li key={item}>{item}</li>)}
            </ul>
            <div className="credit-billing-grid">
              <button
                type="button"
                className={`credit-billing-option${billingCycle === "monthly" ? " selected" : ""}`}
                onClick={() => setBillingCycle("monthly")}
              >
                <div className="credit-billing-label">Monthly</div>
                <strong className="credit-billing-price">$30</strong><span>/ mo</span>
              </button>
              <button
                type="button"
                className={`credit-billing-option recommended${billingCycle === "annual" ? " selected" : ""}`}
                onClick={() => setBillingCycle("annual")}
              >
                <span className="credit-billing-recommended">Recommended</span>
                <div className="credit-billing-label">Annual</div>
                <strong className="credit-billing-price">$300</strong><span>/ yr</span>
                <div className="credit-billing-sub">$25/mo · 2 months free</div>
              </button>
            </div>
            <button type="button" className="credit-btn-primary credit-upgrade-cta" onClick={completeProUpgrade}>
              Start your AI advisor · {billingCycle === "annual" ? "$25/mo billed yearly" : "$30/mo"}
            </button>
            <p className="credit-upgrade-footnote">Powered by Stripe · cancel anytime · no equity, no advisory fees</p>
          </div>
        ) : (
          <div id="upgrade-panel-topup" role="tabpanel" aria-labelledby="tab-topup">
            {isFree ? (
              <p className="credit-topup-gate">
                Top-ups unlock on Pro — your always-on AI advisor, from $25/mo.{" "}
                <button type="button" className="profile-usage-upgrade-link" onClick={() => setUpgradeTab("pro")}>
                  See Pro pricing
                </button>
              </p>
            ) : (
              <>
                <div className="credit-topup-grid">
                  {TOP_UP_OPTIONS.map(option => (
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
                  onClick={() => completeTopUp(selectedTopUp.credits)}
                >
                  Top up · {selectedTopUp.label} · ${selectedTopUp.price}
                </button>
                <p className="credit-upgrade-footnote">{TOP_UP_FOOTNOTE}</p>
              </>
            )}
          </div>
        )}

        <button type="button" className="credit-btn-ghost credit-upgrade-close" onClick={closeUpgrade}>
          Close
        </button>
      </div>
    </div>
  );
}
