import React from "react";
import { FuelIcon, type FuelIconName } from "../icons.tsx";
import {
  FOUNDER_VIEW_COMPANY,
  FOUNDER_VIEW_NEXT_ACTION,
  FOUNDER_VIEW_PULSE,
  FOUNDER_VIEW_READ,
  FOUNDER_VIEW_SETUP,
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

const SETUP_ICONS: Record<string, FuelIconName> = {
  company: "company",
  rd: "development",
  gtm: "gtm",
  ga: "finance",
  benchmark: "benchmarks",
};

const FEED_ICONS: Record<FounderViewWorkspaceTab, FuelIconName> = {
  intelligence: "pulse",
  initiatives: "initiatives",
  research: "playbooks",
  "data-room": "file",
};

function statusToneCss(status: FounderViewTrack["status"] | "watch") {
  if (status === "good") return "var(--status-good, #12b886)";
  if (status === "bad") return "var(--status-bad, #e05c5c)";
  return "var(--status-watch, #f5a623)";
}

function ScoreRing({
  score,
  status,
  size,
  stroke,
  label,
}: {
  score: number;
  status: FounderViewTrack["status"] | "watch";
  size: number;
  stroke: number;
  label: string;
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
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--fv-score-track, #e8eaed)"
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
      <strong style={{ color: tone }}>{score}</strong>
    </div>
  );
}

function peerDeltaLabel(track: FounderViewTrack) {
  const delta = track.score - track.peerAverage;
  if (Math.abs(delta) <= 3) return `Near median ${track.peerAverage}`;
  if (delta < 0) return `${Math.abs(delta)} behind median`;
  return `${delta} ahead of median`;
}

function buildWorkspaceFeed() {
  const { intelligence, initiatives, dataRoom, research } = FOUNDER_VIEW_PULSE;
  return [
    {
      id: "intel-0",
      tab: intelligence.tab,
      source: intelligence.title,
      title: intelligence.items[0].title,
      meta: intelligence.items[0].meta,
    },
    {
      id: "init-0",
      tab: initiatives.tab,
      source: initiatives.title,
      title: initiatives.items[0].title,
      meta: initiatives.items[0].meta,
      progress: initiatives.items[0].progress,
    },
    {
      id: "data-0",
      tab: dataRoom.tab,
      source: dataRoom.title,
      title: dataRoom.items[1].title,
      meta: dataRoom.items[1].meta,
    },
    {
      id: "research-0",
      tab: research.tab,
      source: research.title,
      title: research.items[0].title,
      meta: research.items[0].meta,
    },
  ] as const;
}

function VerdictBand({
  onOpenTrack,
}: {
  onOpenTrack?: (trackId: FounderViewTrackId) => void;
}) {
  return (
    <section className="fvx-verdict overview-panel" aria-label="Scorecard verdict">
      <header className="fvx-verdict-head">
        <span className="fvx-eyebrow">Scorecard</span>
        <p className="fvx-cohort">{FOUNDER_VIEW_COMPANY.cohort}</p>
      </header>

      <div className="fvx-verdict-body">
        <div className="fvx-hero">
          <ScoreRing
            score={FOUNDER_VIEW_COMPANY.compositeScore}
            status="watch"
            size={96}
            stroke={6.5}
            label={`Overall score ${FOUNDER_VIEW_COMPANY.compositeScore} of 100`}
          />
          <div className="fvx-hero-copy">
            <span className="fvx-tier">{FOUNDER_VIEW_COMPANY.compositeStatus}</span>
            <p>{FOUNDER_VIEW_COMPANY.compositeVerdict}</p>
          </div>
        </div>

        <div className="fvx-tracks" role="list">
          {FOUNDER_VIEW_TRACKS.map(track => (
            <button
              key={track.id}
              type="button"
              role="listitem"
              className={`fvx-track is-${track.status}`}
              onClick={() => onOpenTrack?.(track.id)}
            >
              <ScoreRing
                score={track.score}
                status={track.status}
                size={48}
                stroke={4}
                label={`${track.label} score ${track.score}`}
              />
              <span className="fvx-track-copy">
                <span className="fvx-track-top">
                  <span className="fvx-track-label">
                    <FuelIcon name={TRACK_ICONS[track.id]} size={13} strokeWidth={1.75} />
                    {track.label}
                  </span>
                  <em className="fvx-track-status">{track.statusLabel}</em>
                </span>
                <span className="fvx-track-peer">
                  <span>{peerDeltaLabel(track)}</span>
                  <span className="fvx-peer-bar" aria-hidden="true">
                    <i
                      className="fvx-peer-med"
                      style={{ left: `${Math.min(96, Math.max(4, track.peerAverage))}%` }}
                    />
                    <i
                      className="fvx-peer-you"
                      style={{
                        left: `${Math.min(96, Math.max(4, track.score))}%`,
                        background: statusToneCss(track.status),
                      }}
                    />
                  </span>
                </span>
              </span>
              <FuelIcon name="arrowUpRight" size={14} strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      <div className="fvx-gaps">
        <span className="fvx-eyebrow">Biggest gaps</span>
        <ul>
          {FOUNDER_VIEW_TRACKS.map((track, index) => (
            <li key={`${track.id}-gap`}>
              <button type="button" onClick={() => onOpenTrack?.(track.id)}>
                <span className="fvx-gap-idx">{String(index + 1).padStart(2, "0")}</span>
                <span className="fvx-gap-copy">
                  <span className="fvx-gap-track">{track.label}</span>
                  <strong>{track.topGap}</strong>
                </span>
                <FuelIcon name="arrowUpRight" size={14} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function BriefSplit({
  onOpenBrief,
  onAddDetails,
}: {
  onOpenBrief?: () => void;
  onAddDetails?: () => void;
}) {
  return (
    <section className="fvx-split" aria-label="Brief and next step">
      <article className="fvx-brief overview-panel">
        <header>
          <span className="fvx-eyebrow">Fuel AI brief</span>
          <button type="button" className="fvx-ghost-btn" onClick={onOpenBrief}>
            Open brief
          </button>
        </header>
        <h3>{FOUNDER_VIEW_READ.headline}</h3>
        <ul>
          {FOUNDER_VIEW_READ.takeaways.slice(0, 2).map(item => (
            <li key={item.title}>
              <span className="fvx-brief-tag">{item.impact}</span>
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="fvx-next overview-panel">
        <span className="fvx-eyebrow">Do next</span>
        <h3>{FOUNDER_VIEW_NEXT_ACTION.title}</h3>
        <p className="fvx-next-meta">
          <span>{FOUNDER_VIEW_NEXT_ACTION.track}</span>
          <span aria-hidden="true">·</span>
          <span>{FOUNDER_VIEW_NEXT_ACTION.timeEstimate}</span>
        </p>
        <p className="fvx-next-desc">{FOUNDER_VIEW_NEXT_ACTION.description}</p>
        <button
          type="button"
          className="founder-view-btn founder-view-btn-primary"
          onClick={onAddDetails}
        >
          Add details
        </button>
      </article>
    </section>
  );
}

function WorkspaceFeed({
  onOpenWorkspaceTab,
}: {
  onOpenWorkspaceTab?: (tab: FounderViewWorkspaceTab) => void;
}) {
  const feed = buildWorkspaceFeed();

  return (
    <section className="fvx-feed overview-panel" aria-label="Across the workspace">
      <header>
        <span className="fvx-eyebrow">Workspace</span>
        <h3>Latest from every tab</h3>
      </header>
      <ul>
        {feed.map(item => (
          <li key={item.id}>
            <button type="button" onClick={() => onOpenWorkspaceTab?.(item.tab)}>
              <span className="fvx-feed-source">
                <FuelIcon name={FEED_ICONS[item.tab]} size={14} strokeWidth={1.85} />
                {item.source}
              </span>
              <span className="fvx-feed-body">
                <strong>{item.title}</strong>
                <em>{item.meta}</em>
                {"progress" in item && typeof item.progress === "number" ? (
                  <span className="fvx-bar" aria-hidden="true">
                    <i style={{ width: `${item.progress}%` }} />
                  </span>
                ) : null}
              </span>
              <FuelIcon name="arrowUpRight" size={14} strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SetupStrip({ onAddDetails }: { onAddDetails?: () => void }) {
  return (
    <section className="fvx-setup overview-panel" aria-label="Your 5 modules">
      <header>
        <div>
          <span className="fvx-eyebrow">Context</span>
          <h3>{FOUNDER_VIEW_SETUP.title}</h3>
        </div>
        <button type="button" className="fvx-ghost-btn" onClick={onAddDetails}>
          {FOUNDER_VIEW_SETUP.skipLabel}
        </button>
      </header>
      <div className="fvx-setup-grid">
        {FOUNDER_VIEW_SETUP.modules.map(module => {
          const pct = Math.round((module.answered / module.total) * 100);
          const complete = module.status === "complete";
          return (
            <button
              key={module.id}
              type="button"
              className={complete ? "is-complete" : undefined}
              onClick={onAddDetails}
            >
              <span className="fvx-setup-top">
                <span>
                  <FuelIcon name={SETUP_ICONS[module.id] ?? "file"} size={13} strokeWidth={1.85} />
                  {module.name}
                </span>
                <em>
                  {module.answered}/{module.total}
                </em>
              </span>
              <span className="fvx-bar" aria-hidden="true">
                <i style={{ width: `${pct}%` }} />
              </span>
            </button>
          );
        })}
      </div>
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
      <VerdictBand onOpenTrack={onOpenTrack} />
      <BriefSplit onOpenBrief={onOpenBrief} onAddDetails={onAddDetails} />
      <div className="fvx-lower">
        <WorkspaceFeed onOpenWorkspaceTab={onOpenWorkspaceTab} />
        <SetupStrip onAddDetails={onAddDetails} />
      </div>
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
          Fuel / <em>Company</em>
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
          View profile
        </button>
      </section>

      <div className="fv-pro-tabs" role="tablist" aria-label="Company workspace">
        {["Overview", "Intelligence", "Initiatives", "Research", "Data room"].map((tab, index) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={index === 0}
            tabIndex={index === 0 ? 0 : -1}
          >
            {tab}
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
