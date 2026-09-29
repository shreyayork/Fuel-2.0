"use client";

import { useEffect, useState } from "react";
import type { FullSummaryPayload } from "@/lib/overview/full-summary-types";
import {
  initiativeDueMeta,
  initiativeStatusMeta,
  pillarCoverageMeta,
  sortInitiativesForPillar,
} from "@/lib/overview/full-summary-assemble";
import { fetchFullSummary } from "@/lib/overview/client";
import { OverviewBriefSkeleton } from "./OverviewSkeletons";
import { ScorecardBreadcrumb } from "./ScorecardBreadcrumb";
import { overviewCategoryStyle, useOverviewTheme } from "./overview-theme";
import type { CSSProperties } from "react";

export function OverviewFullSummaryPage({
  companyUuid,
  companyName,
  highlightRefId = null,
  onClose,
}: {
  companyUuid: string;
  companyName: string;
  highlightRefId?: number | null;
  onClose: () => void;
}) {
  const t = useOverviewTheme();
  const [data, setData] = useState<FullSummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchFullSummary(companyUuid, companyName)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load brief.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyUuid, companyName]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (highlightRefId == null || !data) return;
    const el = document.getElementById(`wiki-ref-${highlightRefId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightRefId, data]);

  useEffect(() => {
    const onBeforePrint = () => {
      document.body.classList.add("fuel-print-brief");
    };
    const onAfterPrint = () => {
      document.body.classList.remove("fuel-print-brief");
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      document.body.classList.remove("fuel-print-brief");
    };
  }, []);

  const scrollToRef = (id: number) => {
    document.getElementById(`wiki-ref-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  if (loading && !data) {
    return (
      <OverviewBriefSkeleton companyName={companyName} onClose={onClose} />
    );
  }

  if (error && !data) {
    return (
      <div className="sc-investor-brief sc-wiki-full-page">
        <div className="sc-investor-brief-chrome">
          <ScorecardBreadcrumb
            onOverview={onClose}
            current={`About ${companyName}`}
          />
        </div>
        <p className="sc-investor-brief-empty">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const {
    profileMeta,
    productDescription,
    topPriorities,
    biggestRisk,
    publicDataCorrections,
    snapshotRows,
    analysis,
    analysisStatus,
    operatingGroups,
    initiatives,
    documents,
    references,
    categories,
  } = data;

  const hasCompanyFacts = Boolean(
    profileMeta.sector ||
      profileMeta.headquarters ||
      profileMeta.employees ||
      profileMeta.domain,
  );
  const hasAboutSection = Boolean(
    productDescription ||
      topPriorities ||
      biggestRisk ||
      publicDataCorrections ||
      hasCompanyFacts,
  );

  const now = new Date();
  const focusAreas = analysis?.areasToWatch ?? [];
  const standCopy =
    analysisStatus === "error"
      ? ["Analysis unavailable — refresh or try again later."]
      : analysis?.cohortPosition.paragraphs ?? [];

  return (
    <div className="sc-investor-brief sc-wiki-full-page">
      <div className="sc-investor-brief-chrome">
        <ScorecardBreadcrumb
          onOverview={onClose}
          current={`About ${data.companyName}`}
        />
      </div>

      <div className="sc-investor-brief-document">
      <header className="sc-investor-brief-masthead">
        <div className="sc-investor-brief-masthead-brand">
          <span className="sc-investor-brief-logo" aria-hidden="true">
          {(companyName.trim().charAt(0) || "?").toUpperCase()}
          </span>
          <div>
          <strong>{companyName}</strong>
          </div>
        </div>
        <div className="sc-investor-brief-masthead-meta">
          <strong>{data.reportDate}</strong>
        </div>
      </header>

      {hasAboutSection ? (
        <section className="sc-investor-brief-block">
          <h3 className="sc-investor-brief-h3">About</h3>
          {productDescription ? (
            <p className="sc-investor-brief-body">{productDescription}</p>
          ) : null}
          {topPriorities ? (
            <div className="sc-investor-brief-profile-field">
              <p className="sc-investor-brief-analysis-label">Top priorities</p>
              <p className="sc-investor-brief-body">{topPriorities}</p>
            </div>
          ) : null}
          {biggestRisk ? (
            <div className="sc-investor-brief-profile-field">
              <p className="sc-investor-brief-analysis-label">Biggest risk</p>
              <p className="sc-investor-brief-body">{biggestRisk}</p>
            </div>
          ) : null}
          {publicDataCorrections ? (
            <div className="sc-investor-brief-profile-field">
              <p className="sc-investor-brief-analysis-label">Public data corrections</p>
              <p className="sc-investor-brief-body">{publicDataCorrections}</p>
            </div>
          ) : null}
          {hasCompanyFacts ? (
            <dl className="sc-investor-brief-facts">
              {profileMeta.sector ? (
                <>
                  <dt>Sector</dt>
                  <dd>{profileMeta.sector}</dd>
                </>
              ) : null}
              {profileMeta.headquarters ? (
                <>
                  <dt>Headquarters</dt>
                  <dd>{profileMeta.headquarters}</dd>
                </>
              ) : null}
              {profileMeta.employees ? (
                <>
                  <dt>Team size</dt>
                  <dd>{profileMeta.employees}</dd>
                </>
              ) : null}
              {profileMeta.domain ? (
                <>
                  <dt>Domain</dt>
                  <dd>{profileMeta.domain}</dd>
                </>
              ) : null}
            </dl>
          ) : null}
        </section>
      ) : null}

      <section className="sc-investor-brief-block">
        <h3 className="sc-investor-brief-h3">Snapshot</h3>
        {snapshotRows.length === 0 ? (
          <p className="sc-investor-brief-empty">No metrics logged for this period.</p>
        ) : (
          <>
            <div className="sc-investor-brief-table-wrap">
              <table className="sc-investor-brief-table">
                <thead>
                  <tr>
                    <th scope="col">Metric</th>
                    <th scope="col">You</th>
                    <th scope="col">Cohort p50</th>
                    <th scope="col">p25</th>
                    <th scope="col">p75</th>
                    <th scope="col">p90</th>
                    <th scope="col">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.label}</td>
                      <td>
                        <strong
                          className="sc-investor-brief-you"
                          style={{ color: row.colour }}
                        >
                          {row.you}
                        </strong>
                      </td>
                      <td>{row.p50}</td>
                      <td>{row.p25}</td>
                      <td>{row.p75}</td>
                      <td>{row.p90}</td>
                      <td>
                        <span
                          className={`sc-investor-brief-band sc-investor-brief-band--${row.tier}`}
                        >
                          {row.isStrong ? (
                            <span className="sc-investor-brief-check" aria-hidden="true">
                              ✓
                            </span>
                          ) : null}
                          {row.band}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="sc-investor-brief-cohort-note">
              Peer cohort: {data.cohortLabel}. Values from the latest private
              benchmark submission.
            </p>
          </>
        )}
      </section>

      {snapshotRows.length > 0 ? (
        <section className="sc-investor-brief-block">
          <h3 className="sc-investor-brief-h3">Cohort position</h3>
          <p className="sc-investor-brief-analysis-label">Fuel analysis</p>
          {analysisStatus === "loading" || (loading && !analysis) ? (
            <div className="sc-investor-brief-body" aria-busy="true">
              <p className="sc-investor-brief-empty">Generating analysis…</p>
            </div>
          ) : (
            standCopy.map((paragraph, index) => (
              <p className="sc-investor-brief-body" key={`stand-${index}`}>
                {paragraph}
              </p>
            ))
          )}
        </section>
      ) : null}

      {snapshotRows.length > 0 &&
      (focusAreas.length > 0 || analysisStatus === "loading") ? (
        <section className="sc-investor-brief-block">
          <h3 className="sc-investor-brief-h3">Areas to watch</h3>
          <p className="sc-investor-brief-analysis-label">Fuel analysis</p>
          {focusAreas.length === 0 ? (
            <p className="sc-investor-brief-empty">Generating analysis…</p>
          ) : (
            <div className="sc-investor-brief-table-wrap">
              <table className="sc-investor-brief-table sc-investor-brief-notes-table">
                <thead>
                  <tr>
                    <th scope="col">Area</th>
                    <th scope="col">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {focusAreas.map((area) => (
                    <tr key={area.title}>
                      <td>{area.title}</td>
                      <td>{area.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {data.cashOnHand || data.monthlyBurn || data.runwayMonths != null ? (
        <section className="sc-investor-brief-block">
          <h3 className="sc-investor-brief-h3">Capital &amp; runway</h3>
          <dl className="sc-investor-brief-facts">
            {data.cashOnHand ? (
              <>
                <dt>Cash on hand</dt>
                <dd style={{ color: data.cashOnHand.colour }}>
                  {data.cashOnHand.display}
                </dd>
              </>
            ) : null}
            {data.monthlyBurn ? (
              <>
                <dt>Monthly net burn</dt>
                <dd style={{ color: data.monthlyBurn.colour }}>
                  {data.monthlyBurn.display}
                </dd>
              </>
            ) : null}
            {data.runwayMonths != null ? (
              <>
                <dt>Runway</dt>
                <dd>~{data.runwayMonths} mo</dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}

      {operatingGroups.length > 0 ? (
        <section className="sc-investor-brief-block sc-investor-brief-ops-block">
          <h3 className="sc-investor-brief-h3">Operating profile</h3>
          <p className="sc-investor-brief-source-note">
            From stored onboarding and View details answers only — not generated
            metrics.
          </p>
          <div className="sc-investor-brief-ops">
            {operatingGroups.map((group) => (
              <div key={group.id} className="sc-investor-brief-ops-group">
                <h4>{group.label}</h4>
                <div className="sc-investor-brief-ops-grid">
                  {group.rows.map((row) => (
                    <div key={row.id} className="sc-investor-brief-ops-item">
                      <span className="sc-investor-brief-ops-label">{row.label}</span>
                      <p className="sc-investor-brief-ops-value">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="sc-investor-brief-block sc-investor-brief-initiatives">
        <h3 className="sc-investor-brief-h3">Initiatives roadmap</h3>
        <p className="sc-investor-brief-source-note">
          Strategic pillars with active work ordered by target date. Suggested
          scorecard ideas are not listed here.
        </p>

        <div className="overview-panel sc-investor-brief-roadmap-board">
          <div className="sc-investor-brief-roadmap-legend" aria-label="Coverage legend">
            <span className="sc-investor-brief-roadmap-legend-item is-blind">
              Blind spot
            </span>
            <span className="sc-investor-brief-roadmap-legend-item is-thin">
              Thin coverage
            </span>
            <span className="sc-investor-brief-roadmap-legend-item is-healthy">
              Healthy
            </span>
          </div>
          <div className="sc-investor-brief-roadmap">
            <div className="sc-investor-brief-roadmap-topline" aria-hidden="true" />
            {categories.map((cat) => {
              const pillarInits = sortInitiativesForPillar(
                initiatives.filter((item) => item.pillar === cat.categoryId),
              );
              const coverage = pillarCoverageMeta(pillarInits.length);
              const pillarStyle = overviewCategoryStyle(cat.categoryId, t);
              return (
                <div
                  key={cat.categoryId}
                  className="sc-investor-brief-pillar-col"
                  style={
                    {
                      "--pillar-col": pillarStyle.accent,
                      "--pillar-col-dim": pillarStyle.dim,
                      "--pillar-col-border": pillarStyle.border,
                    } as CSSProperties
                  }
                >
                  <div className="sc-investor-brief-pillar-cap" aria-hidden="true">
                    <span className="sc-investor-brief-pillar-dot" />
                    <span className="sc-investor-brief-pillar-drop" />
                  </div>

                  <article className="sc-investor-brief-pillar-card">
                    <span className="sc-investor-brief-pillar-title-pill">
                      {cat.fullLabel}
                    </span>
                    <p className="sc-investor-brief-pillar-card-desc">{cat.definition}</p>
                    <div className="sc-investor-brief-pillar-card-meta">
                      <strong className="sc-investor-brief-pillar-count">
                        {pillarInits.length}
                      </strong>
                      <span
                        className={`sc-investor-brief-pillar-coverage is-${coverage.tone}`}
                      >
                        {coverage.label}
                      </span>
                    </div>
                    <div className="sc-investor-brief-pillar-card-footer">
                      <span className="sc-investor-brief-pillar-tag">{cat.label}</span>
                    </div>
                  </article>

                  <div
                    className={`sc-investor-brief-pillar-stack${
                      pillarInits.length === 0 ? " is-empty" : ""
                    }`}
                  >
                    {pillarInits.length === 0 ? (
                      <div className="sc-investor-brief-pillar-empty">
                        <strong>No initiatives</strong>
                        <span>Blind spot on this pillar.</span>
                      </div>
                    ) : (
                      <ol className="sc-investor-brief-roadmap-timeline">
                        {pillarInits.map((init) => {
                          const status = initiativeStatusMeta(init.status);
                          const dueMeta = initiativeDueMeta(init.due, now);
                          const hasDue = Boolean(init.due?.trim());
                          return (
                            <li key={init.id} className="sc-investor-brief-roadmap-item">
                              <div
                                className={`sc-investor-brief-roadmap-due-row${
                                  hasDue ? "" : " is-undated"
                                }`}
                              >
                                <time className="sc-investor-brief-roadmap-due-pill">
                                  {dueMeta.period}
                                </time>
                                {dueMeta.context ? (
                                  <span className="sc-investor-brief-roadmap-due-context">
                                    {dueMeta.context}
                                  </span>
                                ) : null}
                              </div>
                              <article
                                className={`sc-investor-brief-init-card is-${status.tone}`}
                              >
                                <strong>{init.title}</strong>
                                <div className="sc-investor-brief-init-tags">
                                  <span
                                    className={`sc-investor-brief-init-status is-${status.tone}`}
                                  >
                                    {status.label}
                                  </span>
                                  <span className="sc-investor-brief-init-pillar-tag">
                                    {cat.label}
                                  </span>
                                </div>
                                {init.description ? <p>{init.description}</p> : null}
                                <div className="sc-investor-brief-init-footer">
                                  <em>{init.owner?.trim() || "Unassigned"}</em>
                                </div>
                              </article>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="sc-investor-brief-block sc-investor-brief-sources">
        <h3 className="sc-investor-brief-h3">Sources</h3>
        {documents.length > 0 ? (
          <ul className="sc-investor-brief-docs">
            {documents.map((doc) => (
              <li key={doc.typeId}>
                <em>{doc.typeLabel}</em>
                <strong>{doc.name}</strong>
              </li>
            ))}
          </ul>
        ) : null}
        {references.length > 0 ? (
          <ol className="sc-investor-brief-refs">
            {references.map((reference) => (
              <li
                key={reference.id}
                id={`wiki-ref-${reference.id}`}
                className={highlightRefId === reference.id ? "is-highlighted" : ""}
              >
                <button
                  type="button"
                  className="sc-investor-brief-ref-btn"
                  onClick={() => scrollToRef(reference.id)}
                >
                  <strong>
                    [{reference.id}] {reference.label}
                  </strong>
                </button>
                <span>{reference.detail}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="sc-investor-brief-empty">No numbered references yet.</p>
        )}
      </section>
      </div>
    </div>
  );
}
