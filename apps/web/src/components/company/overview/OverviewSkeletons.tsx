"use client";

import { MagicShimmer } from "@/components/ai/MagicShimmer";
import { CATEGORY_META, type OverviewCategoryId } from "@/lib/overview/constants";
import { useOverviewTheme } from "./overview-theme";
import { ScorecardBreadcrumb } from "./ScorecardBreadcrumb";

function Skel({
  width = "100%",
  height = 12,
  rounded = 6,
  className,
}: {
  width?: string | number;
  height?: number;
  rounded?: number;
  className?: string;
}) {
  const t = useOverviewTheme();
  return (
    <span className={className} style={{ display: "inline-flex", maxWidth: "100%" }}>
      <MagicShimmer width={width} height={height} rounded={rounded} theme={t} />
    </span>
  );
}

function AdvisorPanelSkeleton({
  companyName,
  metaLabel,
}: {
  companyName: string;
  /** Toggle meta — Design uses "Building…" until advisor unlocks. */
  metaLabel?: string;
}) {
  return (
    <div className="sc-adv-featured-wrap sc-overview-advisor-wrap" aria-hidden>
      <div className="sc-adv-featured-border" />
      <div className="sc-adv-featured-toggle sc-overview-advisor-toggle sc-skel-toggle">
        <span className="sc-adv-featured-toggle-label">✦ Fuel AI · Advisor</span>
        <span className="sc-adv-featured-toggle-meta">{metaLabel ?? companyName}</span>
        <span className="sc-adv-featured-chev" aria-hidden>
          ▾
        </span>
      </div>
      <div className="sc-adv-featured sc-adv-featured-split">
        <div className="sc-adv-featured-brief-col">
          <section className="sc-adv-focus">
            <div className="sc-adv-rec-title">Prominent focus tracks</div>
            <div className="sc-adv-focus-grid">
              {[0, 1, 2].map((i) => (
                <div key={i} className="sc-adv-focus-card sc-skel-focus-card">
                  <div className="sc-adv-focus-card-copy">
                    <Skel width="72%" height={13} />
                    <Skel width="88%" height={10} />
                  </div>
                  <div className="sc-skel-ring sc-skel-focus-ring" />
                </div>
              ))}
            </div>
          </section>
          <div className="sc-adv">
            <div className="sc-adv-rec-title">Summary</div>
            <div className="sc-skel-stack">
              <Skel height={14} width="96%" />
              <Skel height={14} width="88%" />
              <Skel height={14} width="72%" />
            </div>
          </div>
        </div>
        <div className="sc-adv-featured-rec-col">
          <div className="sc-adv-rec-title">Recommended Actions</div>
          <ol className="sc-adv-rec-list">
            {[0, 1, 2].map((i) => (
              <li key={i} className="sc-adv-rec-item sc-skel-rec-item">
                <span className="sc-adv-rec-num sc-skel-rec-num">{i + 1}</span>
                <div className="sc-adv-rec-body">
                  <Skel height={13} width="78%" />
                  <Skel height={11} width="92%" />
                </div>
                <Skel width={72} height={28} rounded={8} />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function GlanceRowSkeleton({ label }: { label?: string }) {
  return (
    <article
      className="sc-glance-row sc-glance-row--track sc-glance-row--ref sc-skel-glance-row sc-glance-row-skeleton"
      aria-hidden
    >
      <div className="sc-glance-header-bar">
        <div className="sc-glance-header-bar-start">
          <div className="sc-glance-meta-badges">
            <Skel width={96} height={24} rounded={999} />
            <Skel width={140} height={24} rounded={999} />
            <Skel width={104} height={24} rounded={999} />
          </div>
        </div>
        <div className="sc-glance-header-bar-end">
          <Skel width={120} height={12} />
          <Skel width={148} height={12} />
        </div>
      </div>
      <div className="sc-glance-track-body">
        <div className="sc-glance-track-lead">
          <div className="sc-skel-ring" />
          <div className="sc-glance-track-lead-copy">
            {label ? (
              <h3 className="sc-glance-track-title-link">{label}</h3>
            ) : (
              <Skel width="55%" height={16} />
            )}
            <div className="sc-skel-stack">
              <Skel height={12} width="94%" />
              <Skel height={12} width="78%" />
            </div>
          </div>
        </div>
        <div className="sc-glance-track-mid">
          <Skel width={88} height={10} />
          <div className="sc-skel-stack sc-skel-stack-tight">
            <Skel height={14} width="80%" />
            <Skel height={14} width="64%" />
          </div>
        </div>
        <div className="sc-glance-track-improve sc-glance-track-improve-panel">
          <Skel width={110} height={10} />
          <div className="sc-skel-stack sc-skel-stack-tight">
            <Skel height={14} width="72%" />
            <Skel height={14} width="58%" />
          </div>
        </div>
      </div>
    </article>
  );
}

export { AdvisorPanelSkeleton, GlanceRowSkeleton };

/** Full-page company brief placeholder while `/overview/full-summary` resolves. */
export function OverviewBriefSkeleton({
  companyName,
  onClose,
}: {
  companyName: string;
  onClose: () => void;
}) {
  return (
    <div
      className="sc-investor-brief sc-wiki-full-page sc-investor-brief-skeleton"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={`Loading brief for ${companyName}`}
    >
      <div className="sc-investor-brief-chrome">
        <ScorecardBreadcrumb
          onOverview={onClose}
          current={`About ${companyName}`}
        />
      </div>

      <header className="sc-investor-brief-masthead" aria-hidden>
        <div className="sc-investor-brief-masthead-brand">
          <span className="sc-investor-brief-logo" aria-hidden="true">
            {(companyName.trim().charAt(0) || "?").toUpperCase()}
          </span>
          <div>
            <strong>{companyName}</strong>
            
          </div>
        </div>
        <div className="sc-investor-brief-masthead-meta">
          <Skel width={88} height={12} />
        </div>
      </header>

      <section className="sc-investor-brief-block" aria-hidden>
        <h3 className="sc-investor-brief-h3">About</h3>
        <div className="sc-skel-stack">
          <Skel height={14} width="94%" />
          <Skel height={14} width="88%" />
          <Skel height={14} width="72%" />
        </div>
        <div className="sc-investor-brief-skel-facts">
          <Skel width={72} height={10} />
          <Skel width={140} height={12} />
          <Skel width={96} height={10} />
          <Skel width={120} height={12} />
        </div>
      </section>

      <section className="sc-investor-brief-block" aria-hidden>
        <h3 className="sc-investor-brief-h3">Snapshot</h3>
        <div className="sc-investor-brief-skel-table">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="sc-investor-brief-skel-table-row">
              <Skel width="22%" height={12} />
              <Skel width="12%" height={12} />
              <Skel width="12%" height={12} />
              <Skel width="10%" height={12} />
              <Skel width="10%" height={12} />
              <Skel width="10%" height={12} />
              <Skel width="16%" height={12} />
            </div>
          ))}
        </div>
      </section>

      <section className="sc-investor-brief-block" aria-hidden>
        <h3 className="sc-investor-brief-h3">Cohort position</h3>
        <p className="sc-investor-brief-analysis-label">Fuel analysis</p>
        <div className="sc-skel-stack">
          <Skel height={13} width="96%" />
          <Skel height={13} width="90%" />
          <Skel height={13} width="78%" />
          <Skel height={13} width="84%" />
          <Skel height={13} width="64%" />
        </div>
      </section>

      <section className="sc-investor-brief-block" aria-hidden>
        <h3 className="sc-investor-brief-h3">Areas to watch</h3>
        <p className="sc-investor-brief-analysis-label">Fuel analysis</p>
        <div className="sc-skel-stack">
          <Skel height={36} width="100%" rounded={8} />
          <Skel height={36} width="100%" rounded={8} />
        </div>
      </section>

      <section className="sc-investor-brief-block" aria-hidden>
        <h3 className="sc-investor-brief-h3">Initiatives roadmap</h3>
        <div className="sc-investor-brief-skel-roadmap">
          {[0, 1, 2].map((col) => (
            <div key={col} className="sc-investor-brief-skel-pillar">
              <Skel height={88} width="100%" rounded={10} />
              <div className="sc-skel-stack sc-skel-stack-tight">
                <Skel height={48} width="100%" rounded={8} />
                <Skel height={48} width="100%" rounded={8} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Category / track detail placeholder while the category API resolves. */
export function CategoryDetailSkeleton({
  categoryId,
  onBack,
}: {
  categoryId: OverviewCategoryId;
  onBack: () => void;
}) {
  const meta = CATEGORY_META[categoryId];

  return (
    <div
      className="sc-category-detail sc-detail-dashboard"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={`Loading ${meta.label} track`}
    >
      <ScorecardBreadcrumb
        onOverview={onBack}
        current={`${meta.label} · ${meta.fullLabel}`}
      />

      <article className="sc-glance-row sc-glance-row-detail sc-detail-hero-widget" aria-hidden>
        <div className="sc-glance-header-bar">
          <div className="sc-glance-header-bar-start">
            <div className="sc-glance-meta-badges">
              <Skel width={96} height={24} rounded={999} />
              <Skel width={140} height={24} rounded={999} />
              <Skel width={104} height={24} rounded={999} />
            </div>
          </div>
          <div className="sc-glance-header-bar-end">
            <Skel width={120} height={12} />
            <Skel width={148} height={12} />
          </div>
        </div>
        <div className="sc-detail-hero">
          <div className="sc-detail-hero-main">
            <div className="sc-skel-ring sc-skel-ring-lg" />
            <div className="sc-glance-copy">
              <Skel width="36%" height={18} />
              <div className="sc-skel-stack">
                <Skel height={12} width="90%" />
                <Skel height={12} width="70%" />
                <Skel height={12} width="55%" />
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="sc-detail-widgets-grid" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sc-detail-widget sc-detail-widget--span-6">
            <div className="sc-detail-widget-head">
              <Skel width={110} height={11} />
              <Skel width={64} height={10} />
            </div>
            <div className="sc-detail-widget-body">
              <div className="sc-skel-stack">
                <Skel height={12} width="88%" />
                <Skel height={12} width="74%" />
                <Skel height={12} width="62%" />
                <Skel height={36} width="100%" rounded={8} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
