"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  blockRemainingMs,
  getBarTone,
  getPopoverState,
  getUpgradeReason,
  isGenerationBlocked,
  monthlyRemainingRatio,
  totalRemaining,
} from "@/lib/credits/logic";
import { PRO_TAGLINE, DEFAULT_PRO_PLAN } from "@/lib/credits/constants";
import { DEFAULT_FREE_MONTHLY_LIMIT, EMPTY_SNAPSHOT_EARN } from "@/lib/credits/profile-modules";
import type {
  ActionCostRow,
  CreditActionType,
  CreditSnapshot,
  ProPlanDto,
  SubscribedBilling,
  TopUpPackDto,
  UpgradeReason,
} from "@/lib/credits/types";
import {
  fetchActionCosts,
  fetchCreditSnapshot,
  fetchProPlan,
  fetchSubscribedBilling,
  fetchTopUpPacks,
  markMonthlyLowToastShown,
  postTryAction,
  reconcileCreditsAfterCheckout,
  startSubscriptionCheckout,
  startTopUpCheckout,
} from "@/lib/credits/client";

export type CreditToast = {
  id: string;
  message: string;
  /** Show “see costs” control (hover = unit costs; click opens popover). */
  seeCosts?: boolean;
};

type UpgradeModalTab = "pro" | "topup";

type CreditContextValue = {
  snapshot: CreditSnapshot | null;
  actionCosts: ActionCostRow[];
  topUpPacks: TopUpPackDto[];
  proPlan: ProPlanDto;
  subscribedBilling: SubscribedBilling | null;
  loading: boolean;
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
  tryAction: (action: CreditActionType, onSuccess: () => void) => Promise<void>;
  generationBlocked: boolean;
  popoverState: ReturnType<typeof getPopoverState>;
  blockCountdownMs: number;
  toast: CreditToast | null;
  dismissToast: () => void;
  completeProUpgrade: (
    billingCycle: "monthly" | "annual",
    promotionCode?: string,
  ) => Promise<void>;
  completeTopUp: (packSlug: string) => Promise<void>;
  clearJustUnblocked: () => void;
  refreshSnapshot: () => Promise<void>;
};

const EMPTY_SNAPSHOT: CreditSnapshot = {
  plan: "free",
  billingCycle: null,
  cancelAtPeriodEnd: false,
  periodEndsAt: null,
  monthlyUsed: 0,
  monthlyLimit: DEFAULT_FREE_MONTHLY_LIMIT,
  dailyUsed: 0,
  dailyLimit: 75,
  topUpBalance: 0,
  blockUntil: null,
  monthlyResetLabel: "—",
  justUnblocked: false,
  monthlyLowToastShown: false,
  stats: { signals: 0, docs: 0, messages: 0 },
  catalogFlow: "founder",
  ...EMPTY_SNAPSHOT_EARN,
};

const CreditContext = createContext<CreditContextValue | null>(null);

let toastSeq = 0;

export type InitialCredits = {
  snapshot: CreditSnapshot;
  actionCosts: ActionCostRow[];
  topUpPacks: TopUpPackDto[];
  proPlan: ProPlanDto;
  subscribedBilling: SubscribedBilling | null;
};

function isCheckoutReturn(): boolean {
  if (typeof window === "undefined") return false;
  const checkout = new URLSearchParams(window.location.search).get("checkout");
  return checkout === "success" || checkout === "topup_success";
}

function clearCheckoutQueryParam(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("checkout")) return;
  params.delete("checkout");
  const qs = params.toString();
  window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

export function CreditProvider({
  children,
  initialCredits = null,
}: {
  children: ReactNode;
  initialCredits?: InitialCredits | null;
}) {
  const [snapshot, setSnapshot] = useState<CreditSnapshot | null>(
    initialCredits?.snapshot ?? null,
  );
  const [actionCosts, setActionCosts] = useState<ActionCostRow[]>(
    initialCredits?.actionCosts ?? [],
  );
  const [topUpPacks, setTopUpPacks] = useState<TopUpPackDto[]>(
    initialCredits?.topUpPacks ?? [],
  );
  const [proPlan, setProPlan] = useState<ProPlanDto>(
    initialCredits?.proPlan ?? DEFAULT_PRO_PLAN,
  );
  const [subscribedBilling, setSubscribedBilling] = useState<SubscribedBilling | null>(
    initialCredits?.subscribedBilling ?? null,
  );
  const [loading, setLoading] = useState(() => !initialCredits?.snapshot);
  const [now, setNow] = useState(() => Date.now());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTab, setUpgradeTab] = useState<UpgradeModalTab>("pro");
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>("healthy");
  const [toast, setToast] = useState<CreditToast | null>(null);
  const prevBlockedRef = useRef(false);

  const activeSnapshot = snapshot ?? EMPTY_SNAPSHOT;

  const refreshSnapshot = useCallback(async () => {
    const [next, billing] = await Promise.all([
      fetchCreditSnapshot(),
      fetchSubscribedBilling(),
    ]);
    setSnapshot(next);
    setSubscribedBilling(billing);
  }, []);

  const checkoutInitRef = useRef(false);

  useLayoutEffect(() => {
    if (!isCheckoutReturn() || checkoutInitRef.current) return;
    checkoutInitRef.current = true;
    setLoading(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const checkout = isCheckoutReturn()
        ? new URLSearchParams(window.location.search).get("checkout")
        : null;

      if (checkout === "success" || checkout === "topup_success") {
        setToast({
          id: checkout === "success" ? `pro-${++toastSeq}` : `topup-${++toastSeq}`,
          message:
            checkout === "success"
              ? `Welcome to Pro — ${PRO_TAGLINE}`
              : "Credits added to your account.",
        });

        try {
          const reconciled = await reconcileCreditsAfterCheckout();
          if (!cancelled) {
            if (reconciled) {
              setSnapshot(reconciled);
            } else {
              const next = await fetchCreditSnapshot();
              if (!cancelled) setSnapshot(next);
            }
            clearCheckoutQueryParam();
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (initialCredits?.snapshot) {
        setLoading(false);
        try {
          const next = await fetchCreditSnapshot();
          if (!cancelled) setSnapshot(next);
        } catch {
          // Keep server-rendered snapshot when background refresh fails.
        }
        return;
      }

      try {
        const [snap, costs, packs, plan, billing] = await Promise.all([
          fetchCreditSnapshot(),
          fetchActionCosts(),
          fetchTopUpPacks(),
          fetchProPlan(),
          fetchSubscribedBilling(),
        ]);
        if (!cancelled) {
          setSnapshot(snap);
          setActionCosts(costs);
          setTopUpPacks(packs);
          setProPlan(plan);
          setSubscribedBilling(billing);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialCredits]);

  useEffect(() => {
    const onRefresh = () => {
      void refreshSnapshot();
    };
    const onSnapshot = (event: Event) => {
      const detail = (event as CustomEvent<CreditSnapshot>).detail;
      if (detail) setSnapshot(detail);
    };
    // After Stripe Dashboard edits (period / cancel date), webhook updates DB;
    // pull fresh snapshot when the tab is focused again — no Stripe polling.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshSnapshot();
    };
    window.addEventListener("fuel:credits-refresh", onRefresh);
    window.addEventListener("fuel:credits-snapshot", onSnapshot);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.removeEventListener("fuel:credits-refresh", onRefresh);
      window.removeEventListener("fuel:credits-snapshot", onSnapshot);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const blocked = isGenerationBlocked(activeSnapshot, now);
    if (prevBlockedRef.current && !blocked && activeSnapshot.justUnblocked) {
      setToast({
        id: `unblock-${++toastSeq}`,
        message:
          activeSnapshot.plan === "pro"
            ? "Pro daily credits restored — you can upload or add context again."
            : "Credits restored — you can upload or add context again.",
        seeCosts: true,
      });
    }
    prevBlockedRef.current = blocked;
  }, [activeSnapshot, now]);

  useEffect(() => {
    const ratio = monthlyRemainingRatio(activeSnapshot);
    if (
      ratio <= 0.1 &&
      !activeSnapshot.monthlyLowToastShown &&
      totalRemaining(activeSnapshot) > 0 &&
      snapshot
    ) {
      setSnapshot((current) =>
        current ? { ...current, monthlyLowToastShown: true } : current,
      );
      void markMonthlyLowToastShown();
      setToast({
        id: `low-${++toastSeq}`,
        message: `Running low — ${totalRemaining(activeSnapshot)} credits left this month.`,
        seeCosts: true,
      });
    }
  }, [activeSnapshot, snapshot]);

  const barTone = getBarTone(activeSnapshot, now);
  const barFill = monthlyRemainingRatio(activeSnapshot);
  const popoverState = getPopoverState(activeSnapshot, now);
  const generationBlocked = isGenerationBlocked(activeSnapshot, now);
  const blockCountdownMs = blockRemainingMs(activeSnapshot, now);

  const openUpgrade = useCallback(
    (tab: UpgradeModalTab = "pro", reason?: UpgradeReason) => {
      setUpgradeTab(tab);
      setUpgradeReason(reason ?? getUpgradeReason(activeSnapshot, Date.now()));
      setUpgradeOpen(true);
      setPopoverOpen(false);
    },
    [activeSnapshot],
  );

  const tryAction = useCallback(
    async (action: CreditActionType, onSuccess: () => void) => {
      const result = await postTryAction(action);
      setSnapshot(result.snapshot);
      if (!result.allowed) {
        setPopoverOpen(true);
        return;
      }
      onSuccess();
    },
    [],
  );

  const completeProUpgrade = useCallback(
    async (billingCycle: "monthly" | "annual", promotionCode?: string) => {
      const url = await startSubscriptionCheckout(billingCycle, promotionCode);
      window.location.href = url;
    },
    [],
  );

  const completeTopUp = useCallback(async (packSlug: string) => {
    const url = await startTopUpCheckout(packSlug);
    window.location.href = url;
  }, []);

  const value = useMemo<CreditContextValue>(
    () => ({
      snapshot,
      actionCosts,
      topUpPacks,
      proPlan,
      subscribedBilling,
      loading,
      now,
      barTone,
      barFill,
      popoverOpen,
      setPopoverOpen,
      togglePopover: () => setPopoverOpen((current) => !current),
      upgradeOpen,
      upgradeTab,
      upgradeReason,
      openUpgrade,
      closeUpgrade: () => setUpgradeOpen(false),
      setUpgradeTab,
      tryAction,
      generationBlocked,
      popoverState,
      blockCountdownMs,
      toast,
      dismissToast: () => setToast(null),
      completeProUpgrade,
      completeTopUp,
      clearJustUnblocked: () =>
        setSnapshot((current) =>
          current ? { ...current, justUnblocked: false } : current,
        ),
      refreshSnapshot,
    }),
    [
      snapshot,
      actionCosts,
      topUpPacks,
      proPlan,
      subscribedBilling,
      loading,
      now,
      barTone,
      barFill,
      popoverOpen,
      upgradeOpen,
      upgradeTab,
      upgradeReason,
      openUpgrade,
      tryAction,
      generationBlocked,
      popoverState,
      blockCountdownMs,
      toast,
      completeProUpgrade,
      completeTopUp,
      refreshSnapshot,
    ],
  );

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
