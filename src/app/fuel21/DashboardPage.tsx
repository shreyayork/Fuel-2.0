import { Settings2 } from "lucide-react";
import { DashboardV2, type DashboardV2Actions } from "./DashboardV2.tsx";
import { dashboardGreetingLine } from "./fuel21Greeting.ts";
import "./dashboard-craft.css";
import "./dashboard-v2.css";
import "./dashboard-overview-bridge.css";
import "./dashboard-list-panels.css";
import "../PatriotPayJourney.css";

export function DashboardPage({
  userName,
  onUpdateBenchmarks,
  ...actions
}: DashboardV2Actions & {
  userName: string;
  onUpdateBenchmarks: () => void;
}) {
  return (
    <div className="f21-page f21-dashboard f21-dashboard-v2-page">
      <header className="f21-page-head">
        <div>
          <h1>{dashboardGreetingLine(userName)}</h1>
          <p className="f21-lede">Your company performance, cohort benchmarks, and strategic roadmap.</p>
        </div>

        <div className="f21-page-actions">
          <button type="button" className="f21-btn f21-btn-secondary" onClick={onUpdateBenchmarks}>
            <Settings2 size={14} strokeWidth={2.2} aria-hidden="true" />
            Add/update benchmarks
          </button>
        </div>
      </header>

      <DashboardV2 {...actions} />
    </div>
  );
}
