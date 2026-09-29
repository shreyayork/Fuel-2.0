"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  visibleTourSteps,
  type WorkspaceTourStep,
  type WorkspaceTourTab,
} from "@/lib/workspace-tour/constants";
import {
  clearedCompletionPrefs,
  completedTourPrefs,
  EMPTY_TOUR_PREFS,
  mergeWorkspaceTourPrefs,
  shouldHideTourPrompt,
  snoozedTourPrefs,
  wasTourTakenRecently,
  type WorkspaceTourPrefs,
} from "@/lib/workspace-tour/tour-prefs";
import {
  clearLegacyTourLocalStorage,
  fetchWorkspaceTourPrefs,
  isFirstWorkspaceSessionMarked,
  markFirstWorkspaceSession,
  patchWorkspaceTourPrefs,
} from "@/lib/workspace-tour/storage";
import { stripOnboardingParamsFromUrl } from "@/lib/workspace-tour/url-params";

type SetTabFn = (tab: WorkspaceTourTab) => void;

interface CompanyTourBinding {
  setTab: SetTabFn;
  /** True when claimed-company overview (Fuel AI advisor target exists). */
  includeAiAdvisor: boolean;
  /** True when Intelligence tour includes Add source / Log intelligence. */
  includeIntelligenceActions: boolean;
}

interface WorkspaceTourContextValue {
  tourOpen: boolean;
  tourStep: number;
  showTourPrompt: boolean;
  showTourButton: boolean;
  showTourPromptSkeleton: boolean;
  overviewBuildActive: boolean;
  showTourCoachmark: boolean;
  /** Post-onboarding first workspace visit (entry banner / tip gate). */
  isFirstWorkspaceSession: boolean;
  activeTarget: string | null;
  steps: WorkspaceTourStep[];
  registerCompanyTour: (binding: CompanyTourBinding) => void;
  unregisterCompanyTour: () => void;
  updateCompanyTourOptions: (
    opts: Partial<
      Pick<
        CompanyTourBinding,
        "includeAiAdvisor" | "includeIntelligenceActions"
      >
    >,
  ) => void;
  setOverviewBuildActive: (active: boolean) => void;
  notifyOverviewReady: () => void;
  startTour: (opts?: { skipTabSync?: boolean }) => void;
  closeTour: () => void;
  skipTour: () => void;
  dismissTourPrompt: () => void;
  dismissTourCoachmark: () => void;
  nextStep: () => void;
  previousStep: () => void;
}

const WorkspaceTourContext = createContext<WorkspaceTourContextValue | null>(null);

function useWorkspaceTourContext(): WorkspaceTourContextValue {
  const ctx = useContext(WorkspaceTourContext);
  if (!ctx) {
    throw new Error("useWorkspaceTour must be used within WorkspaceTourProvider");
  }
  return ctx;
}

/**
 * Reads `?tour=` from the URL after company registration. Kept in its own
 * component so only this subtree suspends — page content must not be a
 * descendant of a suspending useSearchParams() boundary.
 */
function WorkspaceTourUrlSync() {
  const searchParams = useSearchParams();
  const {
    companyRegistered,
    initHandledRef,
    onCompanyPage,
    prefsReady,
    tourPrefs,
    setShowTourPrompt,
    setFirstWorkspaceSession,
  } = useWorkspaceTourInternals();

  useEffect(() => {
    if (!onCompanyPage || !companyRegistered || !prefsReady || initHandledRef.current) return;

    const tourParam = searchParams?.get("tour");
    const isFirstSession =
      searchParams?.get("first") === "1" || isFirstWorkspaceSessionMarked();
    if (!tourParam && !isFirstSession) return;

    initHandledRef.current = true;
    stripOnboardingParamsFromUrl();

    if (isFirstSession) {
      markFirstWorkspaceSession();
      setFirstWorkspaceSession(true);
    }

    // Explicit soft-prompt deep link only. First-session Overview waits until
    // the advisor is ready so tour step 2 can highlight a real target.
    if (tourParam === "prompt" && !shouldHideTourPrompt(tourPrefs)) {
      setShowTourPrompt(true);
    }
  }, [
    companyRegistered,
    initHandledRef,
    onCompanyPage,
    prefsReady,
    searchParams,
    setFirstWorkspaceSession,
    setShowTourPrompt,
    tourPrefs,
  ]);

  return null;
}

type WorkspaceTourInternals = {
  companyRegistered: boolean;
  initHandledRef: MutableRefObject<boolean>;
  onCompanyPage: boolean;
  prefsReady: boolean;
  tourPrefs: WorkspaceTourPrefs;
  setShowTourPrompt: (value: boolean) => void;
  setFirstWorkspaceSession: (value: boolean) => void;
};

const WorkspaceTourInternalsContext = createContext<WorkspaceTourInternals | null>(null);

function useWorkspaceTourInternals(): WorkspaceTourInternals {
  const ctx = useContext(WorkspaceTourInternalsContext);
  if (!ctx) {
    throw new Error("WorkspaceTourUrlSync used outside WorkspaceTourProvider");
  }
  return ctx;
}

function WorkspaceTourStateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bindingRef = useRef<CompanyTourBinding | null>(null);
  const tourRegistrationCountRef = useRef(0);
  const initHandledRef = useRef(false);
  const overviewReadyNotifiedRef = useRef(false);

  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const [companyRegistered, setCompanyRegistered] = useState(false);
  const [isFirstWorkspaceSession, setIsFirstWorkspaceSession] = useState(false);
  const [overviewBuildActive, setOverviewBuildActive] = useState(false);
  const [overviewReadyDismissed, setOverviewReadyDismissed] = useState(false);
  const [showTourCoachmark, setShowTourCoachmark] = useState(false);
  /** Design `headerTourEnabled` — Tour stays in chrome after coachmark OK. */
  const [headerTourEnabled, setHeaderTourEnabled] = useState(false);
  const [tourPrefs, setTourPrefs] = useState<WorkspaceTourPrefs>(EMPTY_TOUR_PREFS);
  const [prefsReady, setPrefsReady] = useState(false);
  const [overviewContentReady, setOverviewContentReady] = useState(false);

  const onCompanyPage = (pathname ?? "").startsWith("/company/");
  const [steps, setSteps] = useState<WorkspaceTourStep[]>(() => visibleTourSteps());
  const tourOpenRef = useRef(tourOpen);
  tourOpenRef.current = tourOpen;

  useEffect(() => {
    if (!onCompanyPage) return;
    let cancelled = false;
    clearLegacyTourLocalStorage();
    void (async () => {
      const prefs = await fetchWorkspaceTourPrefs();
      if (cancelled) return;
      setTourPrefs(prefs);
      setPrefsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [onCompanyPage]);

  const persistTourPrefs = useCallback((patch: Partial<WorkspaceTourPrefs>) => {
    setTourPrefs((prev) => mergeWorkspaceTourPrefs(prev, patch));
    void patchWorkspaceTourPrefs(patch);
  }, []);

  const applyStepsForBinding = useCallback((binding: CompanyTourBinding | null) => {
    setSteps(
      visibleTourSteps({
        includeAiAdvisor: binding?.includeAiAdvisor ?? false,
        includeIntelligenceActions: binding?.includeIntelligenceActions ?? false,
      }),
    );
  }, []);

  const setTourIndex = useCallback(
    (index: number, stepList: WorkspaceTourStep[] = steps) => {
      const bounded = Math.max(0, Math.min(index, stepList.length - 1));
      setTourStep(bounded);
      const step = stepList[bounded];
      if (step) bindingRef.current?.setTab(step.tab);
    },
    [steps],
  );

  const startTour = useCallback(
    (opts?: { skipTabSync?: boolean }) => {
      const nextSteps = visibleTourSteps({
        includeAiAdvisor: bindingRef.current?.includeAiAdvisor ?? false,
        includeIntelligenceActions: bindingRef.current?.includeIntelligenceActions ?? false,
      });
      setSteps(nextSteps);
      setShowTourPrompt(false);
      setShowTourCoachmark(false);
      setHeaderTourEnabled(true);
      setOverviewReadyDismissed(true);
      setTourOpen(true);
      if (opts?.skipTabSync) {
        setTourStep(0);
      } else {
        setTourIndex(0, nextSteps);
      }
    },
    [setTourIndex],
  );

  const closeTour = useCallback(() => {
    setTourOpen(false);
  }, []);

  const skipTour = useCallback(() => {
    persistTourPrefs(clearedCompletionPrefs());
    closeTour();
  }, [closeTour, persistTourPrefs]);

  const finishTour = useCallback(() => {
    persistTourPrefs(completedTourPrefs());
    setHeaderTourEnabled(false);
    closeTour();
    bindingRef.current?.setTab("overview");
  }, [closeTour, persistTourPrefs]);

  const dismissTourPrompt = useCallback(() => {
    setShowTourPrompt(false);
    setOverviewReadyDismissed(true);
    // Match design skipOverviewReadyPrompt: enable header Tour + coachmark;
    // clear recent-completion so Tour stays after coachmark OK.
    persistTourPrefs({
      ...snoozedTourPrefs(),
      ...clearedCompletionPrefs(),
    });
    setHeaderTourEnabled(true);
    setShowTourCoachmark(true);
  }, [persistTourPrefs]);

  const dismissTourCoachmark = useCallback(() => {
    // OK only closes tip — Tour button stays (headerTourEnabled).
    setShowTourCoachmark(false);
  }, []);

  const notifyOverviewReady = useCallback(() => {
    if (overviewReadyDismissed) return;
    // Wait until first-session is known — do not consume the signal yet, or a
    // ready-before-URL-sync race permanently suppresses the entry banner.
    if (!isFirstWorkspaceSession) return;
    setOverviewContentReady(true);
  }, [isFirstWorkspaceSession, overviewReadyDismissed]);

  useEffect(() => {
    if (
      !overviewContentReady ||
      !prefsReady ||
      overviewReadyDismissed ||
      overviewReadyNotifiedRef.current
    ) {
      return;
    }
    overviewReadyNotifiedRef.current = true;
    // Advisor/content ready — interactive Start tour prompt replaces shimmer.
    if (!shouldHideTourPrompt(tourPrefs)) {
      setShowTourPrompt(true);
    }
  }, [overviewContentReady, overviewReadyDismissed, prefsReady, tourPrefs]);

  const nextStep = useCallback(() => {
    if (tourStep >= steps.length - 1) {
      finishTour();
      return;
    }
    setTourIndex(tourStep + 1);
  }, [finishTour, setTourIndex, steps.length, tourStep]);

  const previousStep = useCallback(() => {
    if (tourStep <= 0) return;
    setTourIndex(tourStep - 1);
  }, [setTourIndex, tourStep]);

  const registerCompanyTour = useCallback(
    (binding: CompanyTourBinding) => {
      bindingRef.current = binding;
      tourRegistrationCountRef.current += 1;
      setCompanyRegistered(tourRegistrationCountRef.current > 0);
      // Keep step list aligned with the mounted company before Tour is clicked.
      if (!tourOpenRef.current) applyStepsForBinding(binding);
    },
    [applyStepsForBinding],
  );

  const updateCompanyTourOptions = useCallback(
    (
      opts: Partial<
        Pick<
          CompanyTourBinding,
          "includeAiAdvisor" | "includeIntelligenceActions"
        >
      >,
    ) => {
      const current = bindingRef.current;
      if (!current) return;
      const next: CompanyTourBinding = {
        ...current,
        ...opts,
      };
      bindingRef.current = next;
      if (!tourOpenRef.current) applyStepsForBinding(next);
    },
    [applyStepsForBinding],
  );

  const unregisterCompanyTour = useCallback(() => {
    bindingRef.current = null;
    tourRegistrationCountRef.current = Math.max(0, tourRegistrationCountRef.current - 1);
    setCompanyRegistered(tourRegistrationCountRef.current > 0);
  }, []);

  useEffect(() => {
    if (!onCompanyPage) {
      initHandledRef.current = false;
      overviewReadyNotifiedRef.current = false;
      tourRegistrationCountRef.current = 0;
      setCompanyRegistered(false);
      setTourOpen(false);
      setShowTourPrompt(false);
      setTourStep(0);
      setOverviewBuildActive(false);
      setOverviewReadyDismissed(false);
      setShowTourCoachmark(false);
      setHeaderTourEnabled(false);
      setIsFirstWorkspaceSession(false);
      setOverviewContentReady(false);
      setTourPrefs(EMPTY_TOUR_PREFS);
      setPrefsReady(false);
    }
  }, [onCompanyPage]);

  useEffect(() => {
    if (!tourOpen) return;
    if (tourStep <= steps.length - 1) return;
    setTourStep(Math.max(0, steps.length - 1));
  }, [steps.length, tourOpen, tourStep]);

  const activeTarget = tourOpen ? (steps[tourStep]?.target ?? null) : null;

  const showTourPromptSkeleton =
    isFirstWorkspaceSession &&
    overviewBuildActive &&
    !showTourPrompt &&
    !tourOpen &&
    !overviewReadyDismissed;

  const showTourButton =
    onCompanyPage &&
    companyRegistered &&
    prefsReady &&
    !tourOpen &&
    !showTourPrompt &&
    !showTourPromptSkeleton &&
    (headerTourEnabled || !wasTourTakenRecently(tourPrefs));

  const value = useMemo<WorkspaceTourContextValue>(
    () => ({
      tourOpen,
      tourStep,
      showTourPrompt,
      showTourButton,
      showTourPromptSkeleton,
      overviewBuildActive,
      showTourCoachmark,
      isFirstWorkspaceSession,
      activeTarget,
      steps,
      registerCompanyTour,
      unregisterCompanyTour,
      updateCompanyTourOptions,
      setOverviewBuildActive,
      notifyOverviewReady,
      startTour,
      closeTour,
      skipTour,
      dismissTourPrompt,
      dismissTourCoachmark,
      nextStep,
      previousStep,
    }),
    [
      activeTarget,
      closeTour,
      dismissTourCoachmark,
      dismissTourPrompt,
      nextStep,
      notifyOverviewReady,
      overviewBuildActive,
      previousStep,
      registerCompanyTour,
      showTourButton,
      showTourCoachmark,
      showTourPrompt,
      showTourPromptSkeleton,
      isFirstWorkspaceSession,
      skipTour,
      startTour,
      steps,
      tourOpen,
      tourStep,
      unregisterCompanyTour,
      updateCompanyTourOptions,
    ],
  );

  const internals = useMemo<WorkspaceTourInternals>(
    () => ({
      companyRegistered,
      initHandledRef,
      onCompanyPage,
      prefsReady,
      tourPrefs,
      setShowTourPrompt,
      setFirstWorkspaceSession: setIsFirstWorkspaceSession,
    }),
    [companyRegistered, onCompanyPage, prefsReady, tourPrefs],
  );

  return (
    <WorkspaceTourInternalsContext.Provider value={internals}>
      <WorkspaceTourContext.Provider value={value}>
        <Suspense fallback={null}>
          <WorkspaceTourUrlSync />
        </Suspense>
        {children}
      </WorkspaceTourContext.Provider>
    </WorkspaceTourInternalsContext.Provider>
  );
}

export function WorkspaceTourProvider({ children }: { children: ReactNode }) {
  return <WorkspaceTourStateProvider>{children}</WorkspaceTourStateProvider>;
}

export function useWorkspaceTour(): WorkspaceTourContextValue {
  return useWorkspaceTourContext();
}

export function useWorkspaceTourOptional(): WorkspaceTourContextValue | null {
  return useContext(WorkspaceTourContext);
}
