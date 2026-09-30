import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  applyDeduction,
  blockRemainingMs,
  canAfford,
  createDefaultSnapshot,
  freeMonthlyLimitFromEarned,
  getBarTone,
  getPopoverState,
  getUpgradeReason,
  isDailyBlocked,
  isGenerationBlocked,
  monthlyRemainingRatio,
  totalRemaining,
} from "./creditLogic";
import { createDemoProSnapshot, isDemoCreditMode } from "./demoFlow";
import { PRO_TAGLINE } from "./constants";
import { getActiveCreditAudience, getPlanLimits, setActiveCreditAudience, subscribeCreditCatalog, type CreditAudience } from "./creditCatalog";
import type { CreditActionType, CreditSnapshot, UpgradeReason } from "./types";
import { computeEarnedCredits, loadEarnedProfileCredits } from "../profileCredits";

export type CreditToast = {
  id: string;
  message: string;
};

type UpgradeModalTab = "pro" | "topup";

type CreditContextValue = {
  audience: CreditAudience;
  snapshot: CreditSnapshot;
  now: number;
  barTone: "teal" | "amber" | "red";
  barFill: number;
  popoverOpen: boolean;
  setPopoverOpen: (open: boolean) => void;
  togglePopover: () => void;
  upgradeOpen: boolean;
  upgradeTab: UpgradeModalTab;
  upgradeReason: UpgradeReason;
  openUpgrade: (tab?: UpgradeModalTab, reason?: UpgradeReason) => void;
  closeUpgrade: () => void;
  setUpgradeTab: (tab: UpgradeModalTab) => void;
  tryAction: (action: CreditActionType, onSuccess: () => void) => void;
  deductSilent: (action: CreditActionType) => void;
  generationBlocked: boolean;
  popoverState: ReturnType<typeof getPopoverState>;
  blockCountdownMs: number;
  toast: CreditToast | null;
  dismissToast: () => void;
  completeProUpgrade: () => void;
  completeTopUp: (credits: number) => void;
  /** Founder Free: monthly limit is credits earned from profile. Investor Free: full Super Admin pool. */
  syncFreeEarnedAllowance: (earnedCredits: number) => void;
  clearJustUnblocked: () => void;
};

const CreditContext = createContext<CreditContextValue | null>(null);

let toastSeq = 0;

export function CreditProvider({
  children,
  audience = "founder",
}: {
  children: React.ReactNode;
  audience?: CreditAudience;
}) {
  const [snapshot, setSnapshot] = useState<CreditSnapshot>(() => {
    setActiveCreditAudience(audience);
    return createDefaultSnapshot("free", computeEarnedCredits(loadEarnedProfileCredits("patriotpay")));
  });
  const [now, setNow] = useState(() => Date.now());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTab, setUpgradeTab] = useState<UpgradeModalTab>("pro");
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>("healthy");
  const [toast, setToast] = useState<CreditToast | null>(null);
  const prevBlockedRef = useRef(isGenerationBlocked(snapshot));
  const audienceReadyRef = useRef(false);

  useEffect(() => {
    setActiveCreditAudience(audience);
    if (!audienceReadyRef.current) {
      audienceReadyRef.current = true;
      return;
    }
    setSnapshot(createDefaultSnapshot("free", computeEarnedCredits(loadEarnedProfileCredits("patriotpay"))));
  }, [audience]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => subscribeCreditCatalog(() => {
    const limits = getPlanLimits();
    setSnapshot(current => {
      if (current.plan === "pro") {
        return { ...current, monthlyLimit: limits.pro.monthly, dailyLimit: limits.pro.daily };
      }
      if (getActiveCreditAudience() === "investor") {
        return { ...current, monthlyLimit: limits.free.monthly, dailyLimit: limits.free.daily };
      }
      return { ...current, dailyLimit: limits.free.daily };
    });
  }), []);

  useEffect(() => {
    const wasBlocked = prevBlockedRef.current;
    const blocked = isGenerationBlocked(snapshot, now);

    if (wasBlocked && !blocked) {
      if (isDemoCreditMode()) {
        setSnapshot(current => {
          const next = current.plan === "pro" ? createDemoProSnapshot() : createDefaultSnapshot("free");
          setToast({
            id: `unblock-${++toastSeq}`,
            message: current.plan === "pro"
              ? "Pro daily credits restored — you can upload or add context again."
              : "Credits restored — you can upload or add context again.",
          });
          return next;
        });
      } else if (snapshot.dailyUsed >= snapshot.dailyLimit) {
        setSnapshot(current => ({ ...current, justUnblocked: true, dailyUsed: 0, blockUntil: null }));
      }
    }

    prevBlockedRef.current = blocked;
  }, [now, snapshot]);

  useEffect(() => {
    const ratio = monthlyRemainingRatio(snapshot);
    if (ratio <= 0.1 && !snapshot.monthlyLowToastShown && totalRemaining(snapshot) > 0) {
      setSnapshot(current => ({ ...current, monthlyLowToastShown: true }));
      setToast({
        id: `low-${++toastSeq}`,
        message: `Running low — ${totalRemaining(snapshot)} credits left this month.`,
      });
    }
  }, [snapshot]);

  const barTone = getBarTone(snapshot, now);
  const barFill = monthlyRemainingRatio(snapshot);
  const popoverState = getPopoverState(snapshot, now);
  const generationBlocked = isGenerationBlocked(snapshot, now);
  const blockCountdownMs = blockRemainingMs(snapshot, now);

  const openUpgrade = useCallback((tab: UpgradeModalTab = "pro", reason?: UpgradeReason) => {
    setUpgradeTab(tab);
    setUpgradeReason(reason ?? getUpgradeReason(snapshot, Date.now()));
    setUpgradeOpen(true);
    setPopoverOpen(false);
  }, [snapshot]);

  const showBlockedPopover = useCallback(() => {
    setPopoverOpen(true);
  }, []);

  const tryAction = useCallback((action: CreditActionType, onSuccess: () => void) => {
    if (isGenerationBlocked(snapshot, now) || !canAfford(snapshot, action, now)) {
      showBlockedPopover();
      return;
    }
    setSnapshot(current => applyDeduction(current, action, Date.now()));
    onSuccess();
  }, [now, showBlockedPopover, snapshot]);

  const deductSilent = useCallback((action: CreditActionType) => {
    setSnapshot(current => {
      if (isGenerationBlocked(current, Date.now()) || !canAfford(current, action, Date.now())) {
        return current;
      }
      return applyDeduction(current, action, Date.now());
    });
  }, []);

  const completeProUpgrade = useCallback(() => {
    const next = isDemoCreditMode()
      ? createDemoProSnapshot()
      : {
        plan: "pro" as const,
        monthlyUsed: 0,
        monthlyLimit: getPlanLimits().pro.monthly,
        dailyUsed: 0,
        dailyLimit: getPlanLimits().pro.daily,
        topUpBalance: 0,
        blockUntil: null,
        monthlyResetLabel: "Apr 1",
        justUnblocked: false,
        monthlyLowToastShown: false,
        stats: snapshot.stats,
      };
    setSnapshot(next);
    setUpgradeOpen(false);
    setToast({
      id: `pro-${++toastSeq}`,
      message: isDemoCreditMode()
        ? "Welcome to Pro — your AI advisor is live. No equity. No retainer."
        : `Welcome to Pro — ${PRO_TAGLINE}`,
    });
  }, [snapshot.stats]);

  const syncFreeEarnedAllowance = useCallback((earnedCredits: number) => {
    setSnapshot(current => {
      if (current.plan !== "free") return current;
      if (getActiveCreditAudience() === "investor") {
        const pool = getPlanLimits().free.monthly;
        if (current.monthlyLimit === pool) return current;
        return { ...current, monthlyLimit: pool };
      }
      const nextLimit = freeMonthlyLimitFromEarned(earnedCredits);
      if (current.monthlyLimit === nextLimit) return current;
      return { ...current, monthlyLimit: nextLimit };
    });
  }, []);

  const completeTopUp = useCallback((credits: number) => {
    const purchasedAt = Date.now();
    setSnapshot(current => {
      const wasDailyBlocked = current.plan === "pro" && isDailyBlocked(current, purchasedAt);
      const next = {
        ...current,
        topUpBalance: current.topUpBalance + credits,
        ...(wasDailyBlocked
          ? { dailyUsed: 0, blockUntil: null, justUnblocked: true }
          : {}),
      };
      const remaining = totalRemaining(next);
      window.setTimeout(() => {
        setToast({
          id: `topup-${++toastSeq}`,
          message: wasDailyBlocked
            ? `${credits.toLocaleString()} credits added. You're unblocked — fresh day, full ${current.dailyLimit} credits.`
            : `${credits.toLocaleString()} credits added. You now have ${remaining.toLocaleString()} credits available.`,
        });
      }, 0);
      return next;
    });
    setUpgradeOpen(false);
  }, []);

  const value = useMemo<CreditContextValue>(() => ({
    audience,
    snapshot,
    now,
    barTone,
    barFill,
    popoverOpen,
    setPopoverOpen,
    togglePopover: () => setPopoverOpen(current => !current),
    upgradeOpen,
    upgradeTab,
    upgradeReason,
    openUpgrade,
    closeUpgrade: () => setUpgradeOpen(false),
    setUpgradeTab,
    tryAction,
    deductSilent,
    generationBlocked,
    popoverState,
    blockCountdownMs,
    toast,
    dismissToast: () => setToast(null),
    completeProUpgrade,
    completeTopUp,
    syncFreeEarnedAllowance,
    clearJustUnblocked: () => setSnapshot(current => ({ ...current, justUnblocked: false })),
  }), [
    audience,
    barFill,
    barTone,
    blockCountdownMs,
    completeProUpgrade,
    completeTopUp,
    syncFreeEarnedAllowance,
    deductSilent,
    generationBlocked,
    openUpgrade,
    popoverOpen,
    popoverState,
    snapshot,
    now,
    toast,
    tryAction,
    upgradeOpen,
    upgradeReason,
    upgradeTab,
  ]);

  return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
}

export function useCredits() {
  const ctx = useContext(CreditContext);
  if (!ctx) throw new Error("useCredits must be used within CreditProvider");
  return ctx;
}

export function useCreditsOptional() {
  return useContext(CreditContext);
}
