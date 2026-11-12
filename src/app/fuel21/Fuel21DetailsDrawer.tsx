import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OnboardingBenchmarkInput } from "../PatriotPayJourney.tsx";
import {
  DetailsDrawer,
  drawerStepIndexForId,
  loadDetailAnswers,
  saveDetailAnswers,
  type DrawerStepId,
  type ScorecardBenchmarkContext,
} from "../ScorecardV2.tsx";
import type { DetailAnswers, DetailSectionId } from "../trackQuestions.ts";
import "../PatriotPayJourney.css";
import "./fuel21-details-drawer-stack.css";
import "./fuel21-companion-drawer.css";
import { Fuel21CompanionBenchHost } from "./Fuel21CompanionBenchHost.tsx";
import type { Fuel21ActionDrawerId, Fuel21ActionDrawerLive } from "./Fuel21ActionDrawer.tsx";
import type { Fuel21CompanionBenchPanel } from "./fuel21CompanionDrawer.ts";

export type { Fuel21ActionDrawerId };

export type Fuel21DrawerSection = DetailSectionId | "benchmark";

export type Fuel21DrawerRequest = {
  key: number;
  target: Fuel21DrawerSection | "companion-context" | Fuel21ActionDrawerId | "close";
};

export const FUEL21_DRAWER_TRACK_MAP = {
  rd: "dev",
  gtm: "mkt",
  ga: "rev",
} as const satisfies Record<"rd" | "gtm" | "ga", DetailSectionId>;

type Fuel21DetailsDrawerContextValue = {
  openDrawer: (section: Fuel21DrawerSection) => void;
  openContextDrawer: () => void;
  openActionDrawer: (id: Fuel21ActionDrawerId) => void;
  closeSidePanels: () => void;
};

const Fuel21DetailsDrawerContext = createContext<Fuel21DetailsDrawerContextValue | null>(null);

const EMPTY_BENCHMARK: OnboardingBenchmarkInput = {
  arr: "",
  arrGrowth: "",
  nrr: "",
  logoRetention: "",
  grossMargin: "",
  cacPayback: "",
  burnMultiple: "",
  ruleOf40: "",
  monthlyBurn: "",
  cashOnHand: "",
  headcount: "",
  payingCustomers: "",
};

const EMPTY_BENCHMARK_CONTEXT: ScorecardBenchmarkContext = {
  notableCustomers: "",
  notableHires: "",
  biggestChallenges: "",
  otherUpdates: "",
  openToIntros: false,
};

function saveStoredQuarter(key: string) {
  try {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3) + 1;
    window.localStorage.setItem(key, `${now.getFullYear()}-Q${q}`);
  } catch {
    /* ignore */
  }
}

export function Fuel21DetailsDrawerProvider({
  children,
  companyName = "Patriot Pay",
  benchmark,
  benchmarkContext: benchmarkContextProp,
  onBenchmarkChange,
  live,
  onOpenContextEngine,
  request = null,
  elevate = false,
  onDetailsDrawerClosed,
}: {
  children: ReactNode;
  /** Raise the details drawer above Ask Fuel AI. */
  elevate?: boolean;
  onDetailsDrawerClosed?: (saved: boolean) => void;
  /** Host-driven open/close; a new key applies the target once. */
  request?: Fuel21DrawerRequest | null;
  companyName?: string;
  /** Host-owned benchmark; when omitted the drawer keeps local values. */
  benchmark?: OnboardingBenchmarkInput;
  benchmarkContext?: ScorecardBenchmarkContext;
  onBenchmarkChange?: (next: OnboardingBenchmarkInput, context: ScorecardBenchmarkContext) => void;
  live?: Fuel21ActionDrawerLive;
  onOpenContextEngine?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [benchPanel, setBenchPanel] = useState<Fuel21CompanionBenchPanel | null>(null);
  const [drawerStep, setDrawerStep] = useState(0);
  const [detailAnswers, setDetailAnswers] = useState<DetailAnswers>(() =>
    loadDetailAnswers(companyName),
  );
  const [localBenchmark, setLocalBenchmark] = useState<OnboardingBenchmarkInput>(EMPTY_BENCHMARK);
  const benchmarkValues = benchmark ?? localBenchmark;
  const benchmarkContext = benchmarkContextProp ?? EMPTY_BENCHMARK_CONTEXT;

  const displayCompanyName = useMemo(
    () => detailAnswers.profile_company?.trim() || companyName,
    [companyName, detailAnswers.profile_company],
  );

  const closeBench = useCallback(() => setBenchPanel(null), []);

  const closeSidePanels = useCallback(() => {
    setOpen(false);
    setBenchPanel(null);
  }, []);

  const openDrawer = useCallback((section: Fuel21DrawerSection) => {
    setBenchPanel(null);
    setDrawerStep(drawerStepIndexForId(section as DrawerStepId));
    setOpen(true);
  }, []);

  const selectDetail = useCallback(
    (qid: string, value: string) => {
      setDetailAnswers(prev => {
        const next = { ...prev };
        if (value) next[qid] = value;
        else delete next[qid];
        saveDetailAnswers(companyName, next);
        return next;
      });
    },
    [companyName],
  );

  const persistDrawerBenchmark = useCallback(
    (next: OnboardingBenchmarkInput, context: ScorecardBenchmarkContext, commit = false) => {
      if (onBenchmarkChange) {
        if (commit) onBenchmarkChange(next, context);
      } else {
        setLocalBenchmark(next);
      }
      if (!commit) return;
      saveStoredQuarter(`fuel-benchmark-q-${displayCompanyName}`);
    },
    [displayCompanyName, onBenchmarkChange],
  );

  const openContextDrawer = useCallback(() => {
    setOpen(false);
    setBenchPanel("context");
  }, []);

  const openActionDrawer = useCallback((id: Fuel21ActionDrawerId) => {
    setOpen(false);
    setBenchPanel(id);
  }, []);

  useEffect(() => {
    if (!request) return;
    const { target } = request;
    if (target === "close") closeSidePanels();
    else if (target === "companion-context") openContextDrawer();
    else if (target === "intelligence" || target === "initiatives" || target === "dataroom") openActionDrawer(target);
    else openDrawer(target);
    // Only a new request key should reopen a panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.key]);

  const ctx = useMemo(
    () => ({ openDrawer, openContextDrawer, openActionDrawer, closeSidePanels }),
    [openDrawer, openContextDrawer, openActionDrawer, closeSidePanels],
  );

  return (
    <Fuel21DetailsDrawerContext.Provider value={ctx}>
      {children}
      {open ? (
        <DetailsDrawer
          companyName={displayCompanyName}
          answers={detailAnswers}
          initialStep={drawerStep}
          benchmark={benchmarkValues}
          benchmarkContext={benchmarkContext}
          onBenchmarkChange={persistDrawerBenchmark}
          creditRewardVisible={false}
          onSelect={selectDetail}
          elevate={elevate}
          onSaveClose={() => {
            setOpen(false);
            saveStoredQuarter(`fuel-details-q-${displayCompanyName}`);
            onDetailsDrawerClosed?.(true);
          }}
          onClose={() => {
            setOpen(false);
            onDetailsDrawerClosed?.(false);
          }}
        />
      ) : null}
      <Fuel21CompanionBenchHost
        activePanel={benchPanel}
        onClose={closeBench}
        onOpenContextEngine={onOpenContextEngine}
        live={live}
      />
    </Fuel21DetailsDrawerContext.Provider>
  );
}

export function useFuel21DetailsDrawer(): Fuel21DetailsDrawerContextValue {
  const ctx = useContext(Fuel21DetailsDrawerContext);
  if (!ctx) {
    throw new Error("useFuel21DetailsDrawer must be used within Fuel21DetailsDrawerProvider");
  }
  return ctx;
}
