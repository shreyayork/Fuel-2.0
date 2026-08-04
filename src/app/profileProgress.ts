import {
  BENCHMARK_REWARD_CREDITS,
  computeCreditBalance,
  computeEarnedCredits,
  PROFILE_MODULE_REWARDS,
  PROFILE_TOTAL_CREDITS,
  remainingEarnableCredits,
  type EarnedProfileCredits,
  type ProfileModuleId,
} from "./profileCredits";
import {
  countSectionAnswers,
  DETAIL_SECTIONS,
  getVisibleQuestions,
  hasMandatoryProfileAnswers,
  MANDATORY_PROFILE_QUESTION_IDS,
  type DetailAnswers,
} from "./trackQuestions";

/** Meaningful answers required to unlock module credits and early report. */
export const MIN_MODULE_ANSWERS_FOR_UNLOCK = 2;

/** Benchmark metric fields required for early unlock. */
export const MIN_BENCHMARK_METRICS_FOR_UNLOCK = 2;

export type WorkspaceModuleStatus = "not_started" | "in_progress" | "insight_ready" | "complete";

export type ReportReadiness = "none" | "early" | "complete";

export type WorkspaceModuleProgressRow = {
  id: ProfileModuleId | "benchmark";
  label: string;
  status: WorkspaceModuleStatus;
  answered: number;
  total: number;
  percent: number;
  credits: number;
  creditsEarned: boolean;
};

export type WorkspaceProgressSummary = {
  overallPercent: number;
  modulesCompleted: number;
  modulesPartial: number;
  modulesNotStarted: number;
  modulesTotal: number;
  creditsEarned: number;
  creditsRemaining: number;
  creditBalance: number;
  reportReadiness: ReportReadiness;
  modules: WorkspaceModuleProgressRow[];
  insightReadyCount: number;
};

const PROFILE_MODULE_ORDER: ProfileModuleId[] = ["company", "dev", "gtm", "rev"];

const MODULE_LABELS: Record<ProfileModuleId | "benchmark", string> = {
  company: "Complete Profile",
  dev: "R&D",
  gtm: "GTM",
  rev: "G&A",
  benchmark: "Benchmark",
};

export function moduleDetailSectionForModule(moduleId: ProfileModuleId) {
  const sectionId = moduleId === "company" ? "profile" : moduleId === "gtm" ? "mkt" : moduleId;
  return DETAIL_SECTIONS.find(section => section.id === sectionId);
}

export function countModuleAnswers(moduleId: ProfileModuleId, answers: DetailAnswers): number {
  const section = moduleDetailSectionForModule(moduleId);
  if (!section) return 0;
  return countSectionAnswers(section, answers);
}

export function isModuleInsightReady(moduleId: ProfileModuleId, answers: DetailAnswers): boolean {
  if (moduleId === "company") {
    return hasMandatoryProfileAnswers(answers);
  }
  return countModuleAnswers(moduleId, answers) >= MIN_MODULE_ANSWERS_FOR_UNLOCK;
}

export function minAnswersRequiredForModule(moduleId: ProfileModuleId): number {
  return moduleId === "company" ? MANDATORY_PROFILE_QUESTION_IDS.length : MIN_MODULE_ANSWERS_FOR_UNLOCK;
}

export function isModuleFullyComplete(moduleId: ProfileModuleId, answers: DetailAnswers): boolean {
  const section = moduleDetailSectionForModule(moduleId);
  if (!section) return false;
  const total = getVisibleQuestions(section, answers).length;
  const answered = countSectionAnswers(section, answers);
  return total > 0 && answered >= total;
}

export function getModuleWorkspaceStatus(
  moduleId: ProfileModuleId,
  answers: DetailAnswers,
): WorkspaceModuleStatus {
  const answered = countModuleAnswers(moduleId, answers);
  if (answered === 0) return "not_started";
  if (isModuleFullyComplete(moduleId, answers)) return "complete";
  if (isModuleInsightReady(moduleId, answers)) return "insight_ready";
  return "in_progress";
}

export function workspaceStatusLabel(status: WorkspaceModuleStatus): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "insight_ready":
      return "Early insights";
    case "in_progress":
      return "In progress";
    default:
      return "Not started";
  }
}

export function computeReportReadiness(
  answers: DetailAnswers,
  benchmarkFilled: number,
  benchmarkTotal: number,
): ReportReadiness {
  const profileModules = PROFILE_MODULE_ORDER.map(id => getModuleWorkspaceStatus(id, answers));
  const benchmarkStatus: WorkspaceModuleStatus = benchmarkFilled === 0
    ? "not_started"
    : benchmarkFilled >= benchmarkTotal
      ? "complete"
      : benchmarkFilled >= MIN_BENCHMARK_METRICS_FOR_UNLOCK
        ? "insight_ready"
        : "in_progress";

  const allStatuses = [...profileModules, benchmarkStatus];
  if (allStatuses.every(status => status === "complete")) return "complete";
  if (allStatuses.some(status => status === "insight_ready" || status === "complete")) return "early";
  return "none";
}

export function buildWorkspaceProgressSummary(
  answers: DetailAnswers,
  earned: EarnedProfileCredits | undefined,
  benchmarkFilled: number,
  benchmarkTotal: number,
): WorkspaceProgressSummary {
  const earnedState = earned ?? { modules: [], benchmark: false, intelligenceSources: false };

  const profileRows: WorkspaceModuleProgressRow[] = PROFILE_MODULE_ORDER.map(moduleId => {
    const section = moduleDetailSectionForModule(moduleId);
    const total = section ? getVisibleQuestions(section, answers).length : 0;
    const answered = countModuleAnswers(moduleId, answers);
    const status = getModuleWorkspaceStatus(moduleId, answers);
    return {
      id: moduleId,
      label: MODULE_LABELS[moduleId],
      status,
      answered,
      total,
      percent: total > 0 ? Math.round((answered / total) * 100) : 0,
      credits: PROFILE_MODULE_REWARDS[moduleId],
      creditsEarned: earnedState.modules.includes(moduleId),
    };
  });

  const benchmarkEarned = Boolean(earnedState.benchmark && earnedState.benchmarkViaSubmit);
  const benchmarkRow: WorkspaceModuleProgressRow = {
    id: "benchmark",
    label: MODULE_LABELS.benchmark,
    status: benchmarkFilled === 0
      ? "not_started"
      : benchmarkFilled >= benchmarkTotal
        ? "complete"
        : benchmarkFilled >= MIN_BENCHMARK_METRICS_FOR_UNLOCK
          ? "insight_ready"
          : "in_progress",
    answered: benchmarkFilled,
    total: benchmarkTotal,
    percent: benchmarkTotal > 0 ? Math.round((benchmarkFilled / benchmarkTotal) * 100) : 0,
    credits: BENCHMARK_REWARD_CREDITS,
    creditsEarned: benchmarkEarned,
  };

  const modules = [...profileRows, benchmarkRow];
  const modulesCompleted = modules.filter(row => row.status === "complete").length;
  const modulesPartial = modules.filter(row => row.status === "in_progress" || row.status === "insight_ready").length;
  const modulesNotStarted = modules.filter(row => row.status === "not_started").length;
  const insightReadyCount = modules.filter(row => row.status === "insight_ready" || row.status === "complete").length;

  const answeredTotal = modules.reduce((sum, row) => sum + row.answered, 0);
  const questionTotal = modules.reduce((sum, row) => sum + row.total, 0);
  const overallPercent = questionTotal > 0
    ? Math.min(99, Math.round((answeredTotal / questionTotal) * 100))
    : 0;

  return {
    overallPercent,
    modulesCompleted,
    modulesPartial,
    modulesNotStarted,
    modulesTotal: modules.length,
    creditsEarned: computeEarnedCredits(earnedState),
    creditsRemaining: remainingEarnableCredits(earnedState),
    creditBalance: computeCreditBalance(earnedState),
    reportReadiness: computeReportReadiness(answers, benchmarkFilled, benchmarkTotal),
    modules,
    insightReadyCount,
  };
}

export function buildProgressReminderMessage(summary: WorkspaceProgressSummary): string {
  const { overallPercent, modulesCompleted, modulesNotStarted, creditsRemaining, reportReadiness } = summary;

  if (reportReadiness === "complete") {
    return "Your report reflects everything you've shared. Keep benchmarks current as metrics change.";
  }

  if (reportReadiness === "early") {
    if (modulesNotStarted > 0 && creditsRemaining > 0) {
      return `Your early report is ready from what you've shared so far. You're ${overallPercent}% complete — finish the remaining modules to unlock deeper insights, sharper recommendations, and ${creditsRemaining} more credits.`;
    }
    return "Your early report is ready based on available information. Completing the remaining questions will improve accuracy and depth.";
  }

  if (modulesCompleted > 0) {
    return `You're ${overallPercent}% complete. Answer a few more questions in any module to unlock your first early report and credits.`;
  }

  return "Complete the 3 required profile questions to unlock credits and your first early report.";
}

export function moduleCreditsHeadline(module: ProfileModuleId): string {
  switch (module) {
    case "company":
      return "Profile credits unlocked";
    case "dev":
      return "R&D credits unlocked";
    case "gtm":
      return "GTM credits unlocked";
    case "rev":
      return "G&A credits unlocked";
    default:
      return "Credits unlocked";
  }
}

export function moduleCreditsMessage(module: ProfileModuleId): string {
  switch (module) {
    case "company":
      return "Fuel matched your company context — your early report is building.";
    case "dev":
      return "Product signals are in — R&D insights will sharpen in your report.";
    case "gtm":
      return "GTM context saved — pipeline and motion insights are updating.";
    case "rev":
      return "Finance context saved — runway and capital insights are updating.";
    default:
      return "Your workspace intelligence just got stronger.";
  }
}

export function formatCreditSummary(balance: number): string {
  return `${balance} of ${PROFILE_TOTAL_CREDITS} intelligence credits`;
}
