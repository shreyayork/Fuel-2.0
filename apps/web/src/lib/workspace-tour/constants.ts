export const TOUR_TAKEN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** sessionStorage — survives `?first=1` strip within the same tab session. */
export const TOUR_FIRST_SESSION_KEY = "fuelWorkspaceTourFirstSession";

export type WorkspaceTourTarget =
  | "overview"
  | "ai-advisor"
  | "recommended-actions"
  | "intelligence"
  | "add-source"
  | "log-intelligence"
  | "initiatives"
  | "dataroom"
  | "ask-fuel-ai"
  | "ai-actions-playbooks"
  | "ai-actions-brief"
  | "integrations";

export type WorkspaceTourTab = "overview" | "intelligence" | "initiatives" | "dataroom";

const TAB_TOUR_TARGETS = new Set<string>(["overview", "intelligence", "initiatives", "dataroom"]);

export function isTabTourTarget(target: string | null | undefined): target is WorkspaceTourTab {
  return target != null && TAB_TOUR_TARGETS.has(target);
}

/**
 * Targets that live on the founder Overview landing (advisor / actions).
 * Category detail and full-summary views unmount these nodes — tour must return home first.
 */
const OVERVIEW_LANDING_TOUR_TARGETS = new Set<string>([
  "ai-advisor",
  "recommended-actions",
]);

export function isOverviewLandingTourTarget(
  target: string | null | undefined,
): boolean {
  return target != null && OVERVIEW_LANDING_TOUR_TARGETS.has(target);
}

export interface WorkspaceTourStep {
  tab: WorkspaceTourTab;
  target: WorkspaceTourTarget;
  title: string;
  description: string;
}

/** Core walkthrough — 12 steps. */
export const WORKSPACE_TOUR_STEPS: WorkspaceTourStep[] = [
  {
    tab: "overview",
    target: "overview",
    title: "Overview",
    description:
      "This is your operating home. R&D, GTM, and G&A track scores, the Fuel AI advisor, and company snapshot live here — they fill in as onboarding context finishes processing.",
  },
  {
    tab: "overview",
    target: "ai-advisor",
    title: "Fuel AI advisor",
    description:
      "The advisor highlights what matters across tracks and points you to details, sources, and initiatives. Open About for the full company summary when you are ready.",
  },
  {
    tab: "overview",
    target: "recommended-actions",
    title: "Recommended Actions",
    description:
      "Start here after onboarding. Update benchmarks, review intelligence sources, and fill track details — each action sharpens your scores and what Fuel recommends next.",
  },
  {
    tab: "intelligence",
    target: "intelligence",
    title: "Intelligence",
    description:
      "Intelligence groups benchmarks, uploads, and logged signals by category — open any row for provenance and history. Fuel is still assembling the first set from onboarding in the background.",
  },
  {
    tab: "intelligence",
    target: "add-source",
    title: "Add a source",
    description:
      "Use Add source to attach a note or document and generate intelligence without waiting on connectors.",
  },
  {
    tab: "intelligence",
    target: "log-intelligence",
    title: "Log intelligence",
    description:
      "Use Log intelligence to capture a catalog signal — ARR, burn, retention, and more — so it lands in the feed with history.",
  },
  {
    tab: "initiatives",
    target: "initiatives",
    title: "Initiatives",
    description:
      "Turn insights into active work. Suggested initiatives from each track can be added here, tracked with milestones, and linked to progress intelligence.",
  },
  {
    tab: "dataroom",
    target: "dataroom",
    title: "Data Room",
    description:
      "Store decks, notes, and models privately. Uploads feed Intelligence and stay in your workspace.",
  },
  {
    tab: "overview",
    target: "ask-fuel-ai",
    title: "Ask Fuel AI",
    description:
      "Chat with Fuel about this company — dig into scores, ask what matters next, and explore the story behind the data.",
  },
  {
    tab: "overview",
    target: "ai-actions-playbooks",
    title: "Playbooks",
    description:
      "Open ✦ then Playbooks for structured runbooks — diligence, pricing, audits, and planning frameworks run against this company’s context.",
  },
  {
    tab: "overview",
    target: "ai-actions-brief",
    title: "Generate brief",
    description:
      "Generate brief opens Ask Fuel AI and drafts your company overview in chat so you can read it, ask follow-ups, and refine it there.",
  },
  {
    tab: "overview",
    target: "integrations",
    title: "Integrations",
    description:
      "Open your profile menu and choose Integrations to connect HubSpot, Granola, or Slack — live sources that feed Intelligence without waiting on manual uploads.",
  },
];

/** Targets that only exist on the claimed-company (founder) overview. */
const FOUNDER_OVERVIEW_TARGETS = new Set<WorkspaceTourTarget>([
  "ai-advisor",
  "recommended-actions",
]);

/**
 * Header actions on Intelligence (Add source / Log intelligence).
 * Always present in the UI — not gated on benchmark numbers.
 */
const INTELLIGENCE_ACTION_TARGETS = new Set<WorkspaceTourTarget>([
  "add-source",
  "log-intelligence",
]);

export type VisibleTourStepsOptions = {
  /**
   * Fuel AI advisor + Recommended Actions exist only on the claimed-company
   * (founder home) overview. Omit those steps when viewing any other company.
   */
  includeAiAdvisor?: boolean;
  /**
   * Add source + Log intelligence tour targets. Prefer true — CTAs always
   * render on Intelligence regardless of benchmark data.
   */
  includeIntelligenceActions?: boolean;
};

export function visibleTourSteps(
  options: VisibleTourStepsOptions = {},
): WorkspaceTourStep[] {
  const includeAiAdvisor = options.includeAiAdvisor ?? true;
  const includeIntelligenceActions = options.includeIntelligenceActions ?? true;

  let steps = WORKSPACE_TOUR_STEPS;
  if (!includeAiAdvisor) {
    // Claimed-company only: advisor cards + Data Room tab.
    steps = steps.filter(
      (step) =>
        !FOUNDER_OVERVIEW_TARGETS.has(step.target) && step.target !== "dataroom",
    );
  }
  if (!includeIntelligenceActions) {
    steps = steps.filter((step) => !INTELLIGENCE_ACTION_TARGETS.has(step.target));
  }
  return steps;
}
