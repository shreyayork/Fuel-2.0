"use client";

const MIN_TRACK_ANSWERS_TO_UNLOCK_INSIGHTS = 3;

/** Design ScorecardV2 — premium placeholders while track insights are locked. */
const PREMIUM_INSIGHTS: Record<string, string[]> = {
  "R&D": ["Competitive benchmark", "Build vs buy analysis", "Peer R&D comparison", "Investor readiness"],
  GTM: ["Ideal customer clarity", "Revenue benchmark", "Market position", "Growth opportunities"],
  "G&A": ["Burn multiple benchmark", "Runway comparison", "Finance maturity", "Capital efficiency"],
};

export function areTrackInsightsLocked(
  detailAnsweredCount: number,
  profileUnlocked = false,
): boolean {
  if (detailAnsweredCount >= MIN_TRACK_ANSWERS_TO_UNLOCK_INSIGHTS) return false;
  if (profileUnlocked) return false;
  return true;
}

function premiumRows(trackLabel: string, limit: number): Array<{ id: string; label: string; detail: string }> {
  const premium = PREMIUM_INSIGHTS[trackLabel] ?? PREMIUM_INSIGHTS["R&D"] ?? [];
  return premium.slice(0, limit).map((label, i) => ({
    id: `premium-${i}`,
    label,
    detail: "Unlocks with profile",
  }));
}

export function TrackInsightPanel({
  tone,
  title,
  items,
  empty,
  compact = false,
  moreCount = 0,
}: {
  tone: "strong" | "weak";
  title: string;
  items: Array<{ id: string; label: string; detail: string }>;
  empty: string;
  compact?: boolean;
  /** Remaining items beyond the preview — shown as “+3 more”. */
  moreCount?: number;
}) {
  return (
    <div className={`sc-glance-insight-block${compact ? " is-compact" : ""}`}>
      <span className={`sc-glance-insight-label sc-cat-tone-${tone}`}>{title}</span>
      {items.length > 0 ? (
        <ul className="sc-cat-sw-list">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sc-cat-sw-empty">{empty}</p>
      )}
      {moreCount > 0 ? <p className="sc-glance-insight-more-count">+{moreCount} more</p> : null}
    </div>
  );
}

/** Needs-improvement column — Design TopImprovementsPreview. */
export function TopImprovementsPreview({
  trackLabel,
  items,
  insightsLocked,
  onCompleteProfile,
  limit = 3,
  moreCount = 0,
}: {
  trackLabel: string;
  items: Array<{ id: string; label: string; detail: string }>;
  insightsLocked: boolean;
  onCompleteProfile?: () => void;
  limit?: number;
  moreCount?: number;
}) {
  const rows =
    items.length > 0 ? items.slice(0, limit) : insightsLocked ? premiumRows(trackLabel, limit) : [];

  return (
    <div className="sc-glance-insight-block is-compact">
      <span className="sc-glance-insight-label sc-cat-tone-weak">Needs improvement</span>
      {rows.length > 0 ? (
        <ul className="sc-cat-sw-list">
          {rows.map((item, index) => (
            <li
              key={item.id}
              className={insightsLocked && index >= 1 ? "is-locked-blur" : undefined}
              aria-hidden={insightsLocked && index >= 1 ? true : undefined}
            >
              <strong>{item.label}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sc-cat-sw-empty">Complete track details to surface improvements.</p>
      )}
      {moreCount > 0 ? <p className="sc-glance-insight-more-count">+{moreCount} more</p> : null}
      {insightsLocked ? (
        <button
          type="button"
          className="sc-glance-complete-profile-btn"
          onClick={(e) => {
            e.stopPropagation();
            onCompleteProfile?.();
          }}
        >
          <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden="true">
            <rect x="1" y="5.5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M3 5.5V3.8a2.5 2.5 0 0 1 5 0V5.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          Complete profile to unlock
        </button>
      ) : null}
    </div>
  );
}
