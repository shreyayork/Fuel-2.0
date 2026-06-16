import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  applyDeduction,
  blockRemainingMs,
  canAfford,
  createDefaultSnapshot,
  getBarTone,
  getPopoverState,
  getUpgradeReason,
  isDailyBlocked,
  isGenerationBlocked,
  isMonthlyEmpty,
  monthlyRemainingRatio,
  totalRemaining,
} from "./creditLogic";
import { buildDemoSnapshot } from "./demoPresets";
import type { CreditActionType, CreditSnapshot, DemoPresetId, UpgradeReason } from "./types";

export type CreditToast = {
  id: string;
  message: string;
};

type UpgradeModalTab = "pro" | "topup";

type CreditContextValue = {
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
  applyDemoPreset: (preset: DemoPresetId) => void;
  clearJustUnblocked: () => void;
};

const CreditContext = createContext<CreditContextValue | null>(null);

let toastSeq = 0;

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<CreditSnapshot>(() => createDefaultSnapshot("free"));
  const [now, setNow] = useState(() => Date.now());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTab, setUpgradeTab] = useState<UpgradeModalTab>("pro");
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>("healthy");
  const [toast, setToast] = useState<CreditToast | null>(null);
  const prevBlockedRef = useRef(isDailyBlocked(snapshot));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const wasBlocked = prevBlockedRef.current;
    const blocked = isDailyBlocked(snapshot, now);
    if (wasBlocked && !blocked && snapshot.dailyUsed >= snapshot.dailyLimit) {
      setSnapshot(current => ({ ...current, justUnblocked: true, dailyUsed: 0, blockUntil: null }));
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
    setSnapshot({
      plan: "pro",
      monthlyUsed: 0,
      monthlyLimit: 4000,
      dailyUsed: 0,
      dailyLimit: 400,
      topUpBalance: 0,
      blockUntil: null,
      monthlyResetLabel: "Apr 1",
      justUnblocked: false,
      monthlyLowToastShown: false,
      stats: snapshot.stats,
    });
    setUpgradeOpen(false);
    setToast({ id: `pro-${++toastSeq}`, message: "Welcome to Pro. You have 4,000 credits this month." });
  }, [snapshot.stats]);

  const completeTopUp = useCallback((credits: number) => {
    setSnapshot(current => {
      const next = { ...current, topUpBalance: current.topUpBalance + credits };
      const remaining = totalRemaining(next);
      window.setTimeout(() => {
        setToast({
          id: `topup-${++toastSeq}`,
          message: `${credits.toLocaleString()} credits added. You now have ${remaining.toLocaleString()} credits this month.`,
        });
      }, 0);
      return next;
    });
    setUpgradeOpen(false);
  }, []);

  const applyDemoPreset = useCallback((preset: DemoPresetId) => {
    const next = buildDemoSnapshot(preset, Date.now());
    setSnapshot(next);
    setPopoverOpen(false);
    setUpgradeOpen(false);
    if (preset === "pro-after-top-up") {
      setToast({
        id: `demo-topup-${++toastSeq}`,
        message: "800 credits added. You now have 800 credits this month.",
      });
    } else {
      setToast(null);
    }
  }, []);

  const value = useMemo<CreditContextValue>(() => ({
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
    applyDemoPreset,
    clearJustUnblocked: () => setSnapshot(current => ({ ...current, justUnblocked: false })),
  }), [
    applyDemoPreset,
    barFill,
    barTone,
    blockCountdownMs,
    completeProUpgrade,
    completeTopUp,
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
