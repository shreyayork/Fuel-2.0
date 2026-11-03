import React, { useState } from "react";
import { FuelIcon, type FuelIconName } from "../icons.tsx";
import {
  FOUNDER_VIEW_BRIEF,
  FOUNDER_VIEW_COMPANY,
  FOUNDER_VIEW_EVIDENCE,
  FOUNDER_VIEW_IN_MOTION,
  FOUNDER_VIEW_KEY_METRICS,
  FOUNDER_VIEW_NEXT_STEP,
  FOUNDER_VIEW_TRACK_BANNER,
  FOUNDER_VIEW_TRACK_GAPS,
  FOUNDER_VIEW_TRACKS,
  type FounderViewTrack,
  type FounderViewTrackId,
  type FounderViewWorkspaceTab,
} from "./founderViewData.ts";

type NewDesignHandlers = {
  embedded?: boolean;
  onOpenTrack?: (trackId: FounderViewTrackId) => void;
  onOpenBrief?: () => void;
  onAddDetails?: () => void;
  onAskFuel?: () => void;
  onViewProfile?: () => void;
  onOpenWorkspaceTab?: (tab: FounderViewWorkspaceTab) => void;
};

const TRACK_ICONS: Record<FounderViewTrackId, FuelIconName> = {
  rd: "development",
  gtm: "gtm",
  ga: "finance",
};

const TRACK_TITLES: Record<FounderViewTrackId, string> = {
  rd: "R&D",
  gtm: "Go-to-Market",
  ga: "G&A",
};

function statusToneCss(status: FounderViewTrack["status"] | "watch") {
  if (status === "good") return "var(--status-good, #12b886)";
  if (status === "bad") return "var(--status-bad, #e05c5c)";
  return "var(--status-watch, #f5a623)";
}

function ScoreRing({
  score,
  status,
  size = 88,
  stroke = 6,
}: {
  score: number;
  status: FounderViewTrack["status"];
  size?: number;
  stroke?: number;
}) {
  const tone = statusToneCss(status);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div
      className="fvx-ring"
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Score ${score} of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--fv-score-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <strong style={{ color: tone }}>
        {score}
        <em>/100</em>
      </strong>
    </div>
  );
}

function KeyMetrics({ onAddDetails }: { onAddDetails?: () => void }) {
  return (
    <section className="fvx-metrics overview-panel" aria-label="Key metrics">
      <header className="fvx-section-head">
        <div>
          <span className="fvx-eyebrow">Performance</span>
          <h2>Key metrics</h2>
          <p>vs FinTech · Seed cohort</p>
        </div>
        <button type="button" className="fvx-ghost-btn" onClick={onAddDetails}>
          Update benchmark
        </button>
      </header>
      <div className="fvx-metric-grid">
        {FOUNDER_VIEW_KEY_METRICS.map((metric, index) => (
          <article
            key={metric.id}
            className={`fvx-metric-card${metric.missing ? " is-missing" : ""}`}
            style={{ ["--fvx-i" as string]: index }}
          >
            <span className="fvx-metric-label">{metric.label}</span>
            <strong className="fvx-metric-value">{metric.value}</strong>
            <em className="fvx-metric-cohort">{metric.cohort}</em>
            {!metric.missing && metric.percentile != null ? (
              <span className="fvx-metric-bar" aria-hidden="true">
                <i style={{ width: `${metric.percentile}%` }} />
              </span>
            ) : (
              <span className="fvx-metric-bar is-empty" aria-hidden="true">
                <i style={{ width: "0%" }} />
              </span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function BriefAndNext({
  onOpenBrief,
  onAddDetails,
}: {
  onOpenBrief?: () => void;
  onAddDetails?: () => void;
}) {
  const [cash, setCash] = useState("");
  const [burn, setBurn] = useState("");

  return (
    <section className="fvx-insight" aria-label="Brief and next step">
      <article className="fvx-brief overview-panel">
        <div className="fvx-brief-top">
          <span className="fvx-eyebrow">{FOUNDER_VIEW_BRIEF.title}</span>
          <span className="fvx-brief-mark" aria-hidden="true">
            ”
          </span>
        </div>
        <p className="fvx-brief-body">{FOUNDER_VIEW_BRIEF.body}</p>
        <div className="fvx-brief-foot">
          <button type="button" className="fvx-text-link" onClick={onOpenBrief}>
            {FOUNDER_VIEW_BRIEF.cta}
            <FuelIcon name="arrowUpRight" size={14} strokeWidth={2} />
          </button>
          <div className="fvx-source-pills">
            {FOUNDER_VIEW_BRIEF.sources.map(source => (
              <span key={source.id}>{source.label}</span>
            ))}
          </div>
        </div>
      </article>

      <article className="fvx-next overview-panel">
        <div className="fvx-next-badge">2 min</div>
        <span className="fvx-eyebrow">{FOUNDER_VIEW_NEXT_STEP.title}</span>
        <h3>{FOUNDER_VIEW_NEXT_STEP.headline}</h3>
        <p className="fvx-next-lede">Unlock a sharper G&A score with two finance inputs.</p>
        <div className="fvx-next-fields">
          <label>
            <span>{FOUNDER_VIEW_NEXT_STEP.fields[0].label}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder={FOUNDER_VIEW_NEXT_STEP.fields[0].placeholder}
              value={cash}
              onChange={event => setCash(event.target.value)}
            />
          </label>
          <label>
            <span>{FOUNDER_VIEW_NEXT_STEP.fields[1].label}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder={FOUNDER_VIEW_NEXT_STEP.fields[1].placeholder}
              value={burn}
              onChange={event => setBurn(event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="founder-view-btn founder-view-btn-primary fvx-next-cta"
          onClick={onAddDetails}
        >
          {FOUNDER_VIEW_NEXT_STEP.cta}
        </button>
      </article>
    </section>
  );
}

function BenchmarkByTrack({
  onOpenTrack,
  onAddDetails,
}: {
  onOpenTrack?: (trackId: FounderViewTrackId) => void;
  onAddDetails?: () => void;
}) {
  return (
    <section className="fvx-benchmark overview-panel" aria-label="Benchmark by track">
      <header className="fvx-section-head">
        <div>
          <span className="fvx-eyebrow">Scorecard</span>
          <h2>Benchmark by track</h2>
          <p>Score by function · add missing inputs to improve</p>
        </div>
      </header>

      <div className="fvx-track-grid">
        {FOUNDER_VIEW_TRACKS.map((track, index) => {
          const gaps = FOUNDER_VIEW_TRACK_GAPS[track.id];
          return (
            <article
              key={track.id}
              className={`fvx-track-card is-${track.status}`}
              style={{ ["--fvx-i" as string]: index }}
            >
              <header className="fvx-track-head">
                <span className="fvx-track-name">
                  <span className="fvx-track-icon">
                    <FuelIcon name={TRACK_ICONS[track.id]} size={15} strokeWidth={1.75} />
                  </span>
                  {TRACK_TITLES[track.id]}
                </span>
                <button
                  type="button"
                  className="fvx-icon-link"
                  onClick={() => onOpenTrack?.(track.id)}
                  aria-label={`Open ${TRACK_TITLES[track.id]}`}
                >
                  <FuelIcon name="arrowUpRight" size={15} strokeWidth={2} />
                </button>
              </header>

              <div className="fvx-track-body">
                <div className="fvx-track-score-row">
                  <ScoreRing score={track.score} status={track.status} />
                  <div className="fvx-track-score-copy">
                    <em className="fvx-track-status">{track.statusLabel}</em>
                    <p>Updates as profile fills</p>
                  </div>
                </div>

                <div className="fvx-track-gaps-head">Needs input</div>
                <ul className="fvx-track-gaps">
                  {gaps.map(gap => (
                    <li key={gap.id}>
                      <span>{gap.label}</span>
                      <button type="button" className="fvx-add-chip" onClick={onAddDetails}>
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      <div className="fvx-track-banner">
        <div className="fvx-track-banner-copy">
          <span className="fvx-eyebrow">York IE suggestion</span>
          <p>{FOUNDER_VIEW_TRACK_BANNER.text}</p>
        </div>
        <button type="button" className="founder-view-btn founder-view-btn-primary">
          {FOUNDER_VIEW_TRACK_BANNER.cta}
        </button>
      </div>
    </section>
  );
}

function MotionAndEvidence({
  onOpenWorkspaceTab,
}: {
  onOpenWorkspaceTab?: (tab: FounderViewWorkspaceTab) => void;
}) {
  return (
    <section className="fvx-lower" aria-label="In motion and evidence">
      <article className="fvx-motion overview-panel">
        <header className="fvx-section-head">
          <div>
            <span className="fvx-eyebrow">Initiatives</span>
            <h2>{FOUNDER_VIEW_IN_MOTION.title}</h2>
          </div>
          <button
            type="button"
            className="fvx-text-link"
            onClick={() => onOpenWorkspaceTab?.("initiatives")}
          >
            {FOUNDER_VIEW_IN_MOTION.viewAll}
            <FuelIcon name="arrowUpRight" size={13} strokeWidth={2} />
          </button>
        </header>
        <ul>
          {FOUNDER_VIEW_IN_MOTION.items.map((item, index) => (
            <li key={item.id}>
              <button type="button" onClick={() => onOpenWorkspaceTab?.("initiatives")}>
                <span className="fvx-motion-idx">{String(index + 1).padStart(2, "0")}</span>
                <span className="fvx-motion-copy">
                  <strong>{item.title}</strong>
                  <em>{item.impact}</em>
                </span>
                <span className="fvx-motion-progress">{item.progress}</span>
              </button>
            </li>
          ))}
        </ul>
      </article>

      <article className="fvx-evidence overview-panel">
        <header className="fvx-section-head">
          <div>
            <span className="fvx-eyebrow">Data room</span>
            <h2>{FOUNDER_VIEW_EVIDENCE.title}</h2>
          </div>
          <button
            type="button"
            className="fvx-text-link"
            onClick={() => onOpenWorkspaceTab?.("data-room")}
          >
            {FOUNDER_VIEW_EVIDENCE.viewAll}
            <FuelIcon name="arrowUpRight" size={13} strokeWidth={2} />
          </button>
        </header>
        <ul>
          {FOUNDER_VIEW_EVIDENCE.items.map(item => (
            <li key={item.id} className={item.action === "Upload" ? "is-missing" : undefined}>
              <button type="button" onClick={() => onOpenWorkspaceTab?.("data-room")}>
                <span className="fvx-evidence-icon">
                  <FuelIcon name="file" size={16} strokeWidth={1.75} />
                </span>
                <span className="fvx-evidence-copy">
                  <strong>{item.title}</strong>
                  <em>{item.meta}</em>
                </span>
                <span className={item.action === "Upload" ? "fvx-add-chip" : "fvx-text-link"}>
                  {item.action}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

function OverviewBody({
  onOpenTrack,
  onOpenBrief,
  onAddDetails,
  onOpenWorkspaceTab,
}: Pick<NewDesignHandlers, "onOpenTrack" | "onOpenBrief" | "onAddDetails" | "onOpenWorkspaceTab">) {
  return (
    <div className="fvx">
      <KeyMetrics onAddDetails={onAddDetails} />
      <BriefAndNext onOpenBrief={onOpenBrief} onAddDetails={onAddDetails} />
      <BenchmarkByTrack onOpenTrack={onOpenTrack} onAddDetails={onAddDetails} />
      <MotionAndEvidence onOpenWorkspaceTab={onOpenWorkspaceTab} />
    </div>
  );
}

export function FounderViewNewDesign({
  embedded = false,
  onOpenTrack,
  onOpenBrief,
  onAddDetails,
  onAskFuel,
  onViewProfile,
  onOpenWorkspaceTab,
}: NewDesignHandlers) {
  if (embedded) {
    return (
      <div className="fv-pro fv-pro--embedded" aria-label="Overview — new design">
        <OverviewBody
          onOpenTrack={onOpenTrack}
          onOpenBrief={onOpenBrief}
          onAddDetails={onAddDetails}
          onOpenWorkspaceTab={onOpenWorkspaceTab}
        />
      </div>
    );
  }

  return (
    <div className="fv-pro" aria-label="Overview — new design">
      <div className="fv-pro-topbar">
        <div className="fv-pro-crumb">
          Companies / <em>{FOUNDER_VIEW_COMPANY.name}</em>
        </div>
        <div className="fv-pro-topbar-actions">
          <span className="fv-pro-search" role="search">
            <FuelIcon name="search" size={14} strokeWidth={1.9} />
            Search companies
          </span>
          <button
            type="button"
            className="founder-view-btn founder-view-btn-primary"
            onClick={onAskFuel}
          >
            Ask Fuel AI
          </button>
        </div>
      </div>

      <section className="fv-pro-company overview-panel" aria-label="Company header">
        <div className="fv-pro-company-main">
          <span className="fv-pro-avatar" aria-hidden="true">
            {FOUNDER_VIEW_COMPANY.initials}
          </span>
          <div>
            <h1>
              {FOUNDER_VIEW_COMPANY.name}
              <a
                className="fv-pro-domain"
                href={`https://${FOUNDER_VIEW_COMPANY.domain}`}
                target="_blank"
                rel="noreferrer"
              >
                {FOUNDER_VIEW_COMPANY.domain}
              </a>
            </h1>
            <p>{FOUNDER_VIEW_COMPANY.meta}</p>
            <p className="fv-pro-cohort">{FOUNDER_VIEW_COMPANY.cohort}</p>
          </div>
        </div>
        <button
          type="button"
          className="founder-view-btn founder-view-btn-ghost"
          onClick={onViewProfile}
        >
          View public profile
        </button>
      </section>

      <div className="fv-pro-tabs" role="tablist" aria-label="Company workspace">
        {[
          { label: "Overview", count: null },
          { label: "Initiatives", count: 3 },
          { label: "Evidence", count: 4 },
          { label: "Research", count: 1 },
        ].map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={index === 0}
            tabIndex={index === 0 ? 0 : -1}
          >
            {tab.label}
            {tab.count != null ? <em>{tab.count}</em> : null}
          </button>
        ))}
      </div>

      <OverviewBody
        onOpenTrack={onOpenTrack}
        onOpenBrief={onOpenBrief}
        onAddDetails={onAddDetails}
        onOpenWorkspaceTab={onOpenWorkspaceTab}
      />
    </div>
  );
}
