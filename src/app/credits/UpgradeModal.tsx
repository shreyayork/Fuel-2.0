import React, { useState } from "react";
import { TOP_UP_OPTIONS } from "./constants";
import { useCredits } from "./CreditProvider";
import type { UpgradeReason } from "./types";

const PRO_HEADERS: Record<UpgradeReason, string> = {
  monthlyEmpty: "You've used all your credits this month. Pro gives you 16× more.",
  dailyBlocked: "Tired of waiting 24 hours? Pro resets in 6 hours.",
  runningLow: "You're running low. Pro gives you 4,000 credits every month.",
  healthy: "Get more from Fuel every month.",
};

const PRO_INCLUDES = [
  "4,000 credits per month (16× more than Free)",
  "Daily limit resets in 6 hours not 24",
  "All document types",
  "Resets automatically every month",
  "400 daily credits (8× more per day)",
];

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
  const [topUpId, setTopUpId] = useState("builder");

  if (!upgradeOpen) return null;

  const selectedTopUp = TOP_UP_OPTIONS.find(option => option.id === topUpId) ?? TOP_UP_OPTIONS[1];
  const isFree = snapshot.plan === "free";

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
            <h3 style={{ color: "#F2F5F2", fontSize: 18, fontWeight: 800, lineHeight: 1.35, margin: "0 0 14px" }}>
              {PRO_HEADERS[upgradeReason]}
            </h3>
            <ul style={{ color: "#B8C9C0", fontSize: 12.5, lineHeight: 1.55, margin: "0 0 16px", paddingLeft: 18 }}>
              {PRO_INCLUDES.map(item => <li key={item} style={{ marginBottom: 4 }}>{item}</li>)}
            </ul>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                style={{
                  background: billingCycle === "monthly" ? "rgba(0,180,138,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${billingCycle === "monthly" ? "rgba(0,180,138,0.35)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 8,
                  color: "#F2F5F2",
                  cursor: "pointer",
                  font: "inherit",
                  padding: 10,
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 10, opacity: 0.8, textTransform: "uppercase" }}>Monthly</div>
                <strong style={{ fontSize: 20 }}>$30</strong><span>/ mo</span>
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                style={{
                  background: billingCycle === "annual" ? "rgba(0,180,138,0.14)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${billingCycle === "annual" ? "rgba(0,180,138,0.4)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 8,
                  color: "#F2F5F2",
                  cursor: "pointer",
                  font: "inherit",
                  padding: 10,
                  position: "relative",
                  textAlign: "left",
                }}
              >
                <span style={{
                  background: "linear-gradient(135deg, #00B48A, #ECD67F)",
                  borderRadius: 999,
                  color: "#0a1a12",
                  fontSize: 8,
                  fontWeight: 900,
                  left: 8,
                  padding: "2px 6px",
                  position: "absolute",
                  top: -8,
                }}>
                  Recommended
                </span>
                <div style={{ fontSize: 10, opacity: 0.8, textTransform: "uppercase" }}>Annual</div>
                <strong style={{ fontSize: 20 }}>$300</strong><span>/ yr</span>
                <div style={{ color: "#8FE8D2", fontSize: 11, marginTop: 2 }}>$25/mo · 2 months free</div>
              </button>
            </div>
            <button type="button" className="credit-btn-primary" style={{ width: "100%" }} onClick={completeProUpgrade}>
              Start Pro · {billingCycle === "annual" ? "$300/yr" : "$30/mo"}
            </button>
            <p style={{ color: "#556878", fontSize: 11, margin: "10px 0 0", textAlign: "center" }}>
              Powered by Stripe · cancel anytime
            </p>
          </>
        ) : (
          <>
            {isFree ? (
              <p style={{ color: "#8FA99A", fontSize: 13, lineHeight: 1.55, margin: "0 0 14px" }}>
                Top-ups are available on Pro.{" "}
                <button type="button" className="profile-usage-upgrade-link" onClick={() => setUpgradeTab("pro")}>
                  Upgrade to Pro →
                </button>
              </p>
            ) : (
              <>
                <div className="credit-topup-grid" style={{ marginBottom: 14 }}>
                  {TOP_UP_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      className={`credit-topup-option${topUpId === option.id ? " selected" : ""}`}
                      onClick={() => setTopUpId(option.id)}
                    >
                      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
                        <strong style={{ color: "#F2F5F2" }}>{option.label}</strong>
                        {option.popular ? (
                          <span style={{ color: "#8FE8D2", fontSize: 10, fontWeight: 800 }}>Most popular</span>
                        ) : null}
                      </div>
                      <div style={{ color: "#8FE8D2", fontSize: 14, fontWeight: 800, margin: "4px 0" }}>
                        {option.credits.toLocaleString()} credits · ${option.price}
                      </div>
                      <div style={{ color: "#6F8798", fontSize: 11 }}>{option.blurb}</div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="credit-btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => completeTopUp(selectedTopUp.credits)}
                >
                  Top up · ${selectedTopUp.price}
                </button>
                <p style={{ color: "#556878", fontSize: 11, margin: "10px 0 0", textAlign: "center" }}>
                  Powered by Stripe · added instantly
                </p>
              </>
            )}
          </>
        )}

        <button type="button" className="credit-btn-ghost" style={{ marginTop: 12, width: "100%" }} onClick={closeUpgrade}>
          Close
        </button>
      </div>
    </div>
  );
}
