import { Settings2 } from "lucide-react";
import { type NavId } from "./demoData.ts";
import { DashboardV2 } from "./DashboardV2.tsx";
import "./dashboard-craft.css";
import "./dashboard-v2.css";

export function DashboardPage({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  return (
    <div className="f21-page f21-dashboard f21-dashboard-v2-page">
      {/* Executive Page Header */}
      <header className="f21-page-head f21-v2-page-head">
        <div className="f21-v2-head-titles">
          <h1 className="f21-v2-main-title">Executive Dashboard</h1>
          <p className="f21-lede">Your company performance, cohort benchmarks & strategic roadmap.</p>
        </div>

        <div className="f21-page-actions">
          <button type="button" className="f21-btn f21-btn-secondary">
            <Settings2 size={14} strokeWidth={2.2} aria-hidden="true" />
            Add/update benchmarks
          </button>
        </div>
      </header>

      {/* Primary Executive Dashboard V2 */}
      <DashboardV2 onNavigate={onNavigate} />
    </div>
  );
}
