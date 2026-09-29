"use client";

import { useCreditsOptional } from "@/components/credits/CreditProvider";
import {
  DETAIL_SECTIONS,
  type DetailDrawerStep,
} from "@/lib/overview/detail-question-catalog";
import { type ProfileModuleId } from "@/lib/credits/profile-modules";

type ModuleId = "profile" | "dev" | "mkt" | "rev" | "benchmark";

const sectionIcon = (id: string, fallback: string) =>
  DETAIL_SECTIONS.find((s) => s.id === id)?.icon ?? fallback;

const MODULES: Array<{
  id: ModuleId;
  step: DetailDrawerStep;
  title: string;
  footer: string;
  icon: string;
}> = [
  {
    id: "profile",
    step: "profile",
    title: "Complete Profile",
    footer: "Company · Industry · Location · Headcount · Context",
    icon: sectionIcon("profile", "◆"),
  },
  { id: "dev", step: "dev", title: "R&D", footer: "Stage · Type · Constraint", icon: sectionIcon("dev", "⚙") },
  { id: "mkt", step: "mkt", title: "GTM", footer: "Motion · ICP · Pipeline", icon: sectionIcon("mkt", "↗") },
  { id: "rev", step: "rev", title: "G&A", footer: "Runway · Finance · Capital", icon: sectionIcon("rev", "◎") },
  { id: "benchmark", step: "benchmark", title: "Benchmark", footer: "Metrics · Cohort · Peer scores", icon: "▦" },
];

const moduleRewardId = (id: Exclude<ModuleId, "benchmark">): ProfileModuleId =>
  id === "profile" ? "company" : id === "mkt" ? "gtm" : id;

export function OverviewModulesPanel({
  answeredByModule,
  onSelect,
}: {
  answeredByModule: Record<ModuleId, { answered: number; total: number }>;
  onSelect: (step: DetailDrawerStep) => void;
}) {
  const credits = useCreditsOptional();
  const snapshot = credits?.snapshot;
  if (!snapshot || snapshot.plan !== "free") return null;
  if (snapshot.remainingEarnable <= 0) return null;
  const reward = snapshot.creditsPerBlock;

  return (
    <section className="sc-workspace-modules-panel" aria-label="5 modules to complete">
      <div className="sc-workspace-modules-panel-head">
        <div className="sc-workspace-modules-panel-head-main">
          <h3>Your 5 modules</h3>
          <p>Open any module to add or update the context Fuel uses across your Overview.</p>
        </div>
      </div>
      <div className="sc-workspace-module-grid">
        {MODULES.map((module) => {
          const counts = answeredByModule[module.id] ?? { answered: 0, total: 0 };
          const complete = counts.total > 0 && counts.answered >= counts.total;
          const started = counts.answered > 0;
          const cardStatus = complete ? "complete" : started ? "building" : "idle";
          const statusLabel = complete ? "Complete" : started ? "In progress" : "Not started";
          const cta = complete ? "Review" : started ? "Continue" : "Start";
          const creditsEarned =
            module.id === "benchmark"
              ? snapshot.benchmarkEarned
              : snapshot.profileModules.includes(moduleRewardId(module.id));

          return (
            <button
              key={module.id}
              type="button"
              className={`sc-workspace-module-card is-${cardStatus}`}
              onClick={() => onSelect(module.step)}
            >
              <div className="sc-workspace-module-card-head">
                <span className="sc-workspace-module-card-icon" aria-hidden>
                  {module.icon}
                </span>
                <span
                  className="sc-workspace-module-card-pct"
                  aria-label={`${counts.answered} of ${counts.total} questions answered`}
                >
                  <strong>
                    {counts.answered}/{counts.total}
                  </strong>
                  <em>answered</em>
                </span>
              </div>
              <h4 className="sc-workspace-module-card-title">{module.title}</h4>
              <p className="sc-workspace-module-card-desc">{module.footer}</p>
              <div className="sc-workspace-module-card-foot">
                <span className={`sc-workspace-module-card-status is-${cardStatus}`}>{statusLabel}</span>
                <span className={`sc-workspace-module-card-credits${creditsEarned ? " is-earned" : ""}`}>
                  {creditsEarned ? `+${reward} unlocked` : `Get +${reward}`}
                </span>
                <span className="sc-workspace-module-card-cta">{cta} →</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
