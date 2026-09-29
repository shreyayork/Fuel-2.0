"use client";

import type { ReactNode } from "react";

/** Design ScorecardV2 breadcrumb — Overview / current page. */
export function ScorecardBreadcrumb({
  onOverview,
  current,
  endAction,
}: {
  onOverview: () => void;
  current: string;
  endAction?: ReactNode;
}) {
  return (
    <div className="sc-scorecard-breadcrumb-row">
      <nav className="sc-scorecard-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="sc-scorecard-breadcrumb-link" onClick={onOverview}>
          Overview
        </button>
        <span className="sc-scorecard-breadcrumb-sep" aria-hidden="true">
          /
        </span>
        <span className="sc-scorecard-breadcrumb-current" aria-current="page">
          {current}
        </span>
      </nav>
      {endAction ? <div className="sc-scorecard-breadcrumb-actions">{endAction}</div> : null}
    </div>
  );
}
