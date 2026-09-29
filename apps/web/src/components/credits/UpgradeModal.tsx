"use client";

import { useEffect, useState } from "react";
import {
  BILLING_POLICY,
  proIncludes,
  PRO_TAGLINE,
  PRO_UPGRADE_HEADERS,
  TOP_UP_FOOTNOTE,
  annualPerMonth,
  formatAnnualSavingsLabel,
  formatUsd,
  proFromPriceLabel,
  proPriceFrame,
} from "@/lib/credits/constants";
import { resolveStrikePriceUsd } from "@/lib/credits/admin-price-display";
import {
  cancelSubscription,
  changeBillingCycle,
  openBillingPortal,
  resumeSubscription,
  validateCheckoutPromotion,
} from "@/lib/credits/client";
import {
  daysUntilPeriodEnd,
  formatDaysRemaining,
  formatPeriodEndLabel,
} from "@/lib/credits/logic";
import { useTheme } from "../ThemeContext";
import { useCredits } from "./CreditProvider";
import { CreditButtonLabel } from "./CreditButtonLabel";
import {
  creditBillingCurrentPlan,
  creditBillingGrid,
  creditBillingLabel,
  creditBillingNewPricing,
  creditBillingOption,
  creditBillingPrice,
  creditBillingPriceStruck,
  creditBillingRecommended,
  creditBillingSub,
  creditBillingYouPay,
  creditGhostButton,
  creditGrandfatherBanner,
  creditGrandfatherBannerTitle,
  creditGrandfatherCompare,
  creditGrandfatherCompareItem,
  creditGrandfatherCompareValue,
  creditPrimaryButton,
  creditTopUpBadgeDiscount,
  creditTopUpBadgePopular,
  creditTopUpBadges,
  creditTopUpBlurb,
  creditTopUpCredits,
  creditTopUpGate,
  creditTopUpGrid,
  creditTopUpMeta,
  creditTopUpOption,
  creditTopUpOptionHead,
  creditTopUpOptionTitle,
  creditTopUpPrice,
  creditUpgradeFootnote,
  creditUpgradeIncludes,
  creditUpgradeLink,
  creditUpgradeModal,
  creditUpgradeOverlay,
  creditUpgradeSubtitle,
  creditUpgradeTab,
  creditUpgradeTabs,
  creditUpgradeTagline,
  creditUpgradeTitle,
} from "./styles";

type UpgradePendingAction =
  | "pro-checkout"
  | "promo-apply"
  | "manage-billing"
  | "cancel"
  | "resume"
  | "topup"
  | null;

function CatalogStrikePrice({
  listUsd,
  finalUsd,
  suffix,
  priceStyle,
  struckStyle,
}: {
  listUsd: number | null | undefined;
  finalUsd: number;
  suffix: string;
  priceStyle: React.CSSProperties;
  struckStyle: React.CSSProperties;
}) {
  const strike = resolveStrikePriceUsd(listUsd, finalUsd);
  return (
    <div>
      {strike.showStrike ? (
        <span style={struckStyle}>{formatUsd(strike.listCents / 100)}</span>
      ) : null}
      <strong style={priceStyle}>{formatUsd(finalUsd)}</strong>
      <span>{suffix}</span>
    </div>
  );
}

function TopUpStrikePrice({
  listPrice,
  price,
  priceStyle,
  struckStyle,
}: {
  listPrice: number | undefined;
  price: number;
  priceStyle: React.CSSProperties;
  struckStyle: React.CSSProperties;
}) {
  const strike = resolveStrikePriceUsd(listPrice, price);
  if (strike.showStrike) {
    return (
      <span style={priceStyle}>
        <span style={struckStyle}>{formatUsd(strike.listCents / 100)}</span>
        {formatUsd(price)}
      </span>
    );
  }
  return <span style={priceStyle}>{formatUsd(price)}</span>;
}

export function UpgradeModal() {
  const t = useTheme();
  const {
    upgradeOpen,
    upgradeTab,
    upgradeReason,
    snapshot,
    topUpPacks,
    proPlan,
    subscribedBilling,
    closeUpgrade,
    setUpgradeTab,
    completeProUpgrade,
    completeTopUp,
    refreshSnapshot,
  } = useCredits();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [topUpSlug, setTopUpSlug] = useState("growth");
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoOk, setPromoOk] = useState(false);
  const [pendingAction, setPendingAction] = useState<UpgradePendingAction>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const submitting = pendingAction !== null;

  const isPro = snapshot?.plan === "pro";
  const activeCycle = snapshot?.billingCycle ?? null;
  const cancelPending = Boolean(snapshot?.cancelAtPeriodEnd);
  const daysLeft =
    cancelPending && snapshot
      ? daysUntilPeriodEnd(snapshot.periodEndsAt)
      : null;
  const cancelEndLabel =
    cancelPending && snapshot
      ? formatPeriodEndLabel(snapshot.periodEndsAt)
      : null;

  const catalogMonthly = proPlan.monthlyPrice;
  const catalogAnnual = proPlan.annualPrice;
  const catalogMonthlyCents = Math.round(catalogMonthly * 100);
  const catalogAnnualCents = Math.round(catalogAnnual * 100);
  const subscribedAmount =
    subscribedBilling != null ? subscribedBilling.amountCents / 100 : null;

  const onLegacyMonthly =
    isPro &&
    activeCycle === "monthly" &&
    subscribedBilling?.interval === "month" &&
    subscribedBilling.amountCents !== catalogMonthlyCents;
  const onLegacyAnnual =
    isPro &&
    activeCycle === "annual" &&
    subscribedBilling?.interval === "year" &&
    subscribedBilling.amountCents !== catalogAnnualCents;
  const isGrandfathered = onLegacyMonthly || onLegacyAnnual;

  const monthlyDisplay =
    isPro &&
    activeCycle === "monthly" &&
    subscribedBilling?.interval === "month"
      ? subscribedBilling.amountCents / 100
      : catalogMonthly;
  const annualDisplay =
    isPro &&
    activeCycle === "annual" &&
    subscribedBilling?.interval === "year"
      ? subscribedBilling.amountCents / 100
      : catalogAnnual;

  const monthlyShowsNewPricing = isGrandfathered && activeCycle !== "monthly";
  const annualShowsNewPricing = isGrandfathered && activeCycle !== "annual";

  useEffect(() => {
    if (!upgradeOpen || !isPro) return;
    void refreshSnapshot();
  }, [upgradeOpen, isPro, refreshSnapshot]);

  useEffect(() => {
    if (!upgradeOpen || !snapshot) return;
    setStatusMessage(null);
    if (snapshot.plan === "pro" && snapshot.billingCycle) {
      setBillingCycle(snapshot.billingCycle);
    }
  }, [upgradeOpen, snapshot]);

  if (!upgradeOpen || !snapshot) return null;

  const selectedTopUp =
    topUpPacks.find((option) => option.slug === topUpSlug) ??
    topUpPacks.find((option) => option.popular) ??
    topUpPacks[0];
  const isFree = snapshot.plan === "free";
  const selectingCurrentPlan = isPro && activeCycle === billingCycle;
  const switchingCycle = isPro && activeCycle != null && activeCycle !== billingCycle;
  const yearlyToMonthly = switchingCycle && activeCycle === "annual" && billingCycle === "monthly";
  const monthlyToYearly = switchingCycle && activeCycle === "monthly" && billingCycle === "annual";

  const annualSavingsLabel = formatAnnualSavingsLabel(catalogMonthly, annualDisplay);
  const annualPerMonthSub = `${formatUsd(annualPerMonth(annualDisplay))}/mo`;
  const annualBillingSub = annualSavingsLabel
    ? `${annualPerMonthSub} · ${annualSavingsLabel}`
    : annualPerMonthSub;

  const onApplyPromo = async () => {
    const code = promoCode.trim();
    if (!code) {
      setPromoError("Enter a coupon code.");
      setPromoOk(false);
      return;
    }
    setPendingAction("promo-apply");
    setPromoError(null);
    setPromoOk(false);
    try {
      const check = await validateCheckoutPromotion(code, billingCycle);
      if (!check.ok) {
        setPromoError(check.message);
        return;
      }
      setPromoOk(true);
    } catch {
      setPromoError("Unable to validate coupon. Try again.");
    } finally {
      setPendingAction(null);
    }
  };

  const onProCheckout = async () => {
    if (selectingCurrentPlan) return;
    setPendingAction("pro-checkout");
    setStatusMessage(null);
    setPromoError(null);
    try {
      if (switchingCycle) {
        const code = promoCode.trim();
        if (code) {
          const check = await validateCheckoutPromotion(code, billingCycle);
          if (!check.ok) {
            setPromoError(check.message);
            setPromoOk(false);
            setPendingAction(null);
            return;
          }
        }
        const result = await changeBillingCycle(
          billingCycle,
          code || undefined,
        );
        if (result.applied === "payment_required") {
          window.location.href = result.url;
          return;
        }
        await refreshSnapshot();
        setStatusMessage(
          result.applied === "immediate"
            ? BILLING_POLICY.monthlyToYearly
            : BILLING_POLICY.yearlyToMonthly,
        );
        void result.snapshot;
        setPendingAction(null);
        return;
      }
      const code = promoCode.trim();
      if (code) {
        const check = await validateCheckoutPromotion(code, billingCycle);
        if (!check.ok) {
          setPromoError(check.message);
          setPromoOk(false);
          setPendingAction(null);
          return;
        }
      }
      await completeProUpgrade(billingCycle, code || undefined);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update plan.";
      if (/coupon|expired|inactive|eligible|already been used|not valid/i.test(message)) {
        setPromoError(message);
        setPromoOk(false);
      } else {
        setStatusMessage("Unable to update plan. Try again or open billing portal.");
      }
      setPendingAction(null);
    }
  };

  const onManageBilling = async () => {
    setPendingAction("manage-billing");
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch {
      setPendingAction(null);
      setStatusMessage("Billing portal unavailable.");
    }
  };

  const onCancel = async () => {
    setPendingAction("cancel");
    setStatusMessage(null);
    try {
      await cancelSubscription();
      await refreshSnapshot();
      setStatusMessage(
        activeCycle === "annual"
          ? BILLING_POLICY.annualCancel
          : BILLING_POLICY.cancelNoRefund,
      );
    } catch {
      setStatusMessage("Unable to cancel. Try again or contact support.");
    } finally {
      setPendingAction(null);
    }
  };

  const onResume = async () => {
    setPendingAction("resume");
    setStatusMessage(null);
    try {
      await resumeSubscription();
      await refreshSnapshot();
      setStatusMessage("Cancellation withdrawn — Pro renews as scheduled.");
    } catch {
      setStatusMessage("Unable to resume subscription.");
    } finally {
      setPendingAction(null);
    }
  };

  const onTopUpCheckout = async () => {
    if (!selectedTopUp) return;
    setPendingAction("topup");
    try {
      await completeTopUp(selectedTopUp.slug);
    } catch {
      setPendingAction(null);
    }
  };

  const proCheckoutLabel = switchingCycle
    ? yearlyToMonthly
      ? "Switch to monthly after annual term"
      : monthlyToYearly
        ? "Continue to Stripe payment · annual"
        : "Update plan"
    : billingCycle === "annual"
      ? `Start your AI advisor · ${formatUsd(annualPerMonth(proPlan.annualPrice))}/mo billed yearly`
      : `Start your AI advisor · ${formatUsd(proPlan.monthlyPrice)}/mo`;

  const proCheckoutLoadingLabel = switchingCycle
    ? monthlyToYearly
      ? "Opening Stripe payment…"
      : "Updating plan…"
    : "Redirecting to checkout…";

  return (
    <div style={creditUpgradeOverlay(t)} onClick={closeUpgrade}>
      <div
        style={creditUpgradeModal(t)}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Upgrade"
      >
        <div style={creditUpgradeTabs()}>
          <button
            type="button"
            style={creditUpgradeTab(t, upgradeTab === "pro")}
            disabled={submitting}
            onClick={() => setUpgradeTab("pro")}
          >
            {isPro ? "Your Pro plan" : "Upgrade to Pro"}
          </button>
          <button
            type="button"
            style={creditUpgradeTab(t, upgradeTab === "topup")}
            disabled={submitting}
            onClick={() => setUpgradeTab("topup")}
          >
            Top up credits
          </button>
        </div>

        {upgradeTab === "pro" ? (
          <>
            <p style={creditUpgradeTagline(t)}>{PRO_TAGLINE}</p>
            <h3 style={creditUpgradeTitle(t)}>
              {isPro
                ? cancelPending
                  ? "Pro ending at period close"
                  : "You're on Pro"
                : PRO_UPGRADE_HEADERS[upgradeReason]}
            </h3>
            <p style={creditUpgradeSubtitle(t)}>
              {isPro
                ? cancelPending
                  ? `Cancelled · ${formatDaysRemaining(daysLeft)} of Pro left · after ${cancelEndLabel} you move to Free. No prorated refund.`
                  : isGrandfathered
                    ? "Pro pricing updated — you are grandfathered at your current rate."
                    : activeCycle === "annual"
                      ? "Annual billing active — cancel keeps the rest of the year; no unused-month credit."
                      : activeCycle === "monthly"
                        ? "Monthly billing active — cancel keeps Pro until period end; no refund for unused days."
                        : "Pro is active — manage or cancel below."
                : proPriceFrame(proPlan)}
            </p>
            <ul style={creditUpgradeIncludes(t)}>
              {proIncludes(proPlan).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            {isGrandfathered && subscribedAmount != null ? (
              <div style={creditGrandfatherBanner(t)} role="status">
                <div style={creditGrandfatherBannerTitle(t)}>Pricing update</div>
                <div>
                  New Pro catalog is{" "}
                  <strong style={{ color: t.ink }}>
                    {formatUsd(catalogMonthly)}/mo
                  </strong>{" "}
                  or{" "}
                  <strong style={{ color: t.ink }}>
                    {formatUsd(catalogAnnual)}/yr
                  </strong>
                  . You keep your current rate below until you change plan.
                </div>
                <div style={creditGrandfatherCompare()}>
                  <div style={creditGrandfatherCompareItem(t)}>
                    You pay now{" "}
                    <span style={creditGrandfatherCompareValue(t)}>
                      {formatUsd(subscribedAmount)}
                      {subscribedBilling?.interval === "year" ? "/yr." : "/mo."}
                    </span>
                  </div>
                  <div style={creditGrandfatherCompareItem(t)}>
                    New catalog for your cycle{" "}
                    <span style={creditGrandfatherCompareValue(t)}>
                      {subscribedBilling?.interval === "year"
                        ? `${formatUsd(catalogAnnual)}/yr`
                        : `${formatUsd(catalogMonthly)}/mo`}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div style={creditBillingGrid()}>
              <button
                type="button"
                style={creditBillingOption(t, billingCycle === "monthly")}
                disabled={submitting}
                onClick={() => setBillingCycle("monthly")}
              >
                {activeCycle === "monthly" ? (
                  <span style={creditBillingCurrentPlan(t)}>Current plan</span>
                ) : monthlyShowsNewPricing ? (
                  <span style={creditBillingNewPricing(t)}>If you switch</span>
                ) : null}
                <div style={creditBillingLabel()}>Monthly</div>
                {onLegacyMonthly ? (
                  <>
                    <div style={creditBillingYouPay(t)}>You pay</div>
                    <div>
                      <span style={creditBillingPriceStruck(t)}>
                        {formatUsd(catalogMonthly)}
                      </span>
                      <strong style={creditBillingPrice()}>{formatUsd(monthlyDisplay)}</strong>
                      <span>/ mo</span>
                    </div>
                    <div style={creditBillingSub(t)}>Locked in at your rate</div>
                  </>
                ) : (
                  <>
                    {monthlyShowsNewPricing ? (
                      <div style={creditBillingYouPay(t)}>New rate</div>
                    ) : null}
                    <CatalogStrikePrice
                      listUsd={proPlan.monthlyListPrice}
                      finalUsd={monthlyDisplay}
                      suffix="/ mo"
                      priceStyle={creditBillingPrice()}
                      struckStyle={creditBillingPriceStruck(t)}
                    />
                  </>
                )}
              </button>
              <button
                type="button"
                style={creditBillingOption(t, billingCycle === "annual")}
                disabled={submitting}
                onClick={() => setBillingCycle("annual")}
              >
                {activeCycle === "annual" ? (
                  <span style={creditBillingCurrentPlan(t)}>Current plan</span>
                ) : annualShowsNewPricing ? (
                  <span style={creditBillingNewPricing(t)}>If you switch</span>
                ) : activeCycle ? null : (
                  <span style={creditBillingRecommended(t)}>Recommended</span>
                )}
                <div style={creditBillingLabel()}>Annual</div>
                {onLegacyAnnual ? (
                  <>
                    <div style={creditBillingYouPay(t)}>You pay</div>
                    <div>
                      <span style={creditBillingPriceStruck(t)}>
                        {formatUsd(catalogAnnual)}
                      </span>
                      <strong style={creditBillingPrice()}>{formatUsd(annualDisplay)}</strong>
                      <span>/ yr</span>
                    </div>
                    <div style={creditBillingSub(t)}>Locked in at your rate</div>
                  </>
                ) : (
                  <>
                    {annualShowsNewPricing ? (
                      <div style={creditBillingYouPay(t)}>New rate</div>
                    ) : null}
                    <CatalogStrikePrice
                      listUsd={proPlan.annualListPrice}
                      finalUsd={annualDisplay}
                      suffix="/ yr"
                      priceStyle={creditBillingPrice()}
                      struckStyle={creditBillingPriceStruck(t)}
                    />
                    <div style={creditBillingSub(t)}>
                      {annualBillingSub}
                    </div>
                  </>
                )}
              </button>
            </div>

            {isGrandfathered ? (
              <p style={creditUpgradeFootnote(t)}>{BILLING_POLICY.grandfatherKeepRate}</p>
            ) : null}

            {yearlyToMonthly ? (
              <p style={creditUpgradeFootnote(t)}>{BILLING_POLICY.yearlyToMonthly}</p>
            ) : null}
            {monthlyToYearly ? (
              <p style={creditUpgradeFootnote(t)}>{BILLING_POLICY.monthlyToYearly}</p>
            ) : null}

            {/* Coupon always available on plan selection (free upgrade + cycle switch). */}
            <label
              style={{
                display: "grid",
                gap: 6,
                marginTop: 12,
                fontFamily: t.sans,
                fontSize: 12,
                color: t.muted,
              }}
            >
              Coupon code (optional)
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <input
                  type="text"
                  value={promoCode}
                  disabled={submitting}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="e.g. FUEL1-AB12CD34"
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoError(null);
                    setPromoOk(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void onApplyPromo();
                    }
                  }}
                  style={{
                    padding: "10px 12px",
                    background: t.panelAlt,
                    color: t.ink,
                    border: `1px solid ${promoError ? t.warn : promoOk ? t.accent : t.rule}`,
                    borderRadius: 6,
                    fontFamily: t.mono,
                    fontSize: 13,
                    flex: 1,
                    minWidth: 0,
                  }}
                />
                <button
                  type="button"
                  disabled={submitting || !promoCode.trim()}
                  onClick={() => void onApplyPromo()}
                  style={creditGhostButton(t, {
                    cursor: submitting ? "wait" : "pointer",
                    opacity:
                      submitting && pendingAction !== "promo-apply" ? 0.7 : 1,
                    padding: "10px 14px",
                    whiteSpace: "nowrap",
                  })}
                >
                  <CreditButtonLabel
                    t={t}
                    variant="ghost"
                    loading={pendingAction === "promo-apply"}
                  >
                    {pendingAction === "promo-apply" ? "Checking…" : "Apply"}
                  </CreditButtonLabel>
                </button>
              </div>
              {promoError ? (
                <span style={{ color: t.warn, fontSize: 12, fontFamily: t.sans }}>
                  {promoError}
                </span>
              ) : null}
              {promoOk && !promoError ? (
                <span style={{ color: t.accent, fontSize: 12, fontFamily: t.sans }}>
                  {switchingCycle
                    ? "Coupon validated — apply it at your next Checkout if prompted."
                    : "Coupon applied — discount will show at Checkout."}
                </span>
              ) : null}
            </label>

            {selectingCurrentPlan ? (
              <button
                type="button"
                style={creditPrimaryButton(t, {
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting && pendingAction !== "manage-billing" ? 0.7 : 1,
                  width: "100%",
                  marginTop: 12,
                })}
                disabled={submitting}
                aria-busy={pendingAction === "manage-billing"}
                onClick={() => void onManageBilling()}
              >
                <CreditButtonLabel
                  t={t}
                  loading={pendingAction === "manage-billing"}
                >
                  {pendingAction === "manage-billing"
                    ? "Opening billing portal…"
                    : "Manage payment method"}
                </CreditButtonLabel>
              </button>
            ) : (
              <button
                type="button"
                style={creditPrimaryButton(t, {
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting && pendingAction !== "pro-checkout" ? 0.7 : 1,
                  width: "100%",
                  marginTop: 12,
                })}
                disabled={submitting}
                aria-busy={pendingAction === "pro-checkout"}
                onClick={() => void onProCheckout()}
              >
                <CreditButtonLabel t={t} loading={pendingAction === "pro-checkout"}>
                  {pendingAction === "pro-checkout" ? proCheckoutLoadingLabel : proCheckoutLabel}
                </CreditButtonLabel>
              </button>
            )}

            {isPro ? (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {cancelPending ? (
                  <button
                    type="button"
                    style={creditGhostButton(t, {
                      cursor: submitting ? "wait" : "pointer",
                      opacity: submitting && pendingAction !== "resume" ? 0.7 : 1,
                      width: "100%",
                    })}
                    disabled={submitting}
                    aria-busy={pendingAction === "resume"}
                    onClick={() => void onResume()}
                  >
                    <CreditButtonLabel
                      t={t}
                      variant="ghost"
                      loading={pendingAction === "resume"}
                    >
                      {pendingAction === "resume"
                        ? "Withdrawing cancellation…"
                        : "Keep Pro · withdraw cancel"}
                    </CreditButtonLabel>
                  </button>
                ) : (
                  <button
                    type="button"
                    style={creditGhostButton(t, {
                      cursor: submitting ? "wait" : "pointer",
                      opacity: submitting && pendingAction !== "cancel" ? 0.7 : 1,
                      width: "100%",
                    })}
                    disabled={submitting}
                    aria-busy={pendingAction === "cancel"}
                    onClick={() => void onCancel()}
                  >
                    <CreditButtonLabel
                      t={t}
                      variant="ghost"
                      loading={pendingAction === "cancel"}
                    >
                      {pendingAction === "cancel" ? "Cancelling…" : "Cancel subscription"}
                    </CreditButtonLabel>
                  </button>
                )}
                <p style={creditUpgradeFootnote(t)}>
                  {activeCycle === "annual"
                    ? BILLING_POLICY.annualCancel
                    : BILLING_POLICY.cancelNoRefund}{" "}
                  {BILLING_POLICY.billingError}
                </p>
              </div>
            ) : (
              <p style={creditUpgradeFootnote(t)}>
                Powered by Stripe · cancel anytime · no equity, no advisory fees
              </p>
            )}
            {statusMessage ? (
              <p style={{ ...creditUpgradeFootnote(t), color: t.inkSoft }}>{statusMessage}</p>
            ) : null}
          </>
        ) : (
          <>
            {isFree ? (
              <p style={creditTopUpGate(t)}>
                Top-ups unlock on Pro — your always-on AI advisor, {proFromPriceLabel(proPlan)}.{" "}
                <button
                  type="button"
                  style={creditUpgradeLink(t)}
                  onClick={() => setUpgradeTab("pro")}
                >
                  See Pro pricing
                </button>
              </p>
            ) : (
              <>
                <div style={creditTopUpGrid()}>
                  {topUpPacks.map((option) => (
                    <button
                      key={option.slug}
                      type="button"
                      style={creditTopUpOption(t, topUpSlug === option.slug)}
                      onClick={() => setTopUpSlug(option.slug)}
                    >
                      <div style={creditTopUpOptionHead()}>
                        <strong style={creditTopUpOptionTitle(t)}>{option.label}</strong>
                        <div style={creditTopUpBadges()}>
                          {option.popular ? (
                            <span style={creditTopUpBadgePopular(t)}>Most popular</span>
                          ) : null}
                          {option.discount ? (
                            <span style={creditTopUpBadgeDiscount(t)}>{option.discount}</span>
                          ) : null}
                        </div>
                      </div>
                      <div style={creditTopUpMeta()}>
                        <span style={creditTopUpCredits(t)}>
                          {option.credits.toLocaleString()} credits
                        </span>
                        <TopUpStrikePrice
                          listPrice={option.listPrice}
                          price={option.price}
                          priceStyle={creditTopUpPrice(t)}
                          struckStyle={creditBillingPriceStruck(t)}
                        />
                      </div>
                      <p style={creditTopUpBlurb(t)}>{option.blurb}</p>
                    </button>
                  ))}
                </div>
                {selectedTopUp ? (
                  <button
                    type="button"
                    style={creditPrimaryButton(t, {
                      cursor: submitting ? "wait" : "pointer",
                      opacity: submitting && pendingAction !== "topup" ? 0.7 : 1,
                      width: "100%",
                    })}
                    disabled={submitting}
                    aria-busy={pendingAction === "topup"}
                    onClick={() => void onTopUpCheckout()}
                  >
                    <CreditButtonLabel t={t} loading={pendingAction === "topup"}>
                      {pendingAction === "topup"
                        ? "Redirecting to checkout…"
                        : `Top up · ${selectedTopUp.label} · $${selectedTopUp.price}`}
                    </CreditButtonLabel>
                  </button>
                ) : null}
                <p style={creditUpgradeFootnote(t)}>{TOP_UP_FOOTNOTE}</p>
              </>
            )}
          </>
        )}

        <button
          type="button"
          style={creditGhostButton(t, { marginTop: 12, width: "100%" })}
          onClick={closeUpgrade}
        >
          Close
        </button>
      </div>
    </div>
  );
}
