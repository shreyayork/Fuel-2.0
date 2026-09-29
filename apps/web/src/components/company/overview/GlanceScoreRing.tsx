"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type Ref,
} from "react";
import * as Sentry from "@sentry/nextjs";
import type { OverviewApiResponse, ScoreContributor } from "@/lib/overview/types";
import { ScoreContributorSchema } from "@/lib/overview/types";
import {
  BENCHMARK_WEIGHT,
  DETAIL_WEIGHT,
  PROFILE_WEIGHT,
} from "@/lib/overview/constants";
import { fetchScoreBreakdown } from "@/lib/overview/client";
import { overviewScoreTierColor } from "./overview-theme";

const SOURCE_LABELS: Record<ScoreContributor["source"], string> = {
  benchmark: "Benchmark",
  profile: "Profile",
  detail: "Answers",
};

function formatScoreShare(n: number): string {
  return n.toFixed(2);
}

function contributorTone(score: number): "strong" | "watch" | "weak" {
  if (score >= 72) return "strong";
  if (score >= 50) return "watch";
  return "weak";
}

function confidenceTone(level: string): "strong" | "watch" | "weak" {
  const normalized = level.trim().toLowerCase();
  if (normalized === "high") return "strong";
  if (normalized === "medium") return "watch";
  return "weak";
}

function formatUpdatedLabel(iso: string | null | undefined): string {
  if (!iso) return "recently";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "recently";
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function computeGlancePopoverLayout(
  rect: DOMRect,
  popoverW: number,
  popoverH: number,
): { style: CSSProperties; placement: "above" | "below" } {
  const gap = 10;
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(popoverW, Math.max(220, vw - margin * 2));
  const maxH = Math.min(480, vh - margin * 2);
  const measuredH = popoverH > 0 ? popoverH : Math.min(360, maxH);
  const effectiveH = Math.min(measuredH, maxH);

  const spaceBelow = vh - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;
  const placeAbove = spaceBelow < Math.min(effectiveH, 280) && spaceAbove >= spaceBelow;

  let top = placeAbove ? rect.top - gap - effectiveH : rect.bottom + gap;
  top = Math.max(margin, Math.min(top, vh - effectiveH - margin));

  let left = rect.left;
  if (left + width > vw - margin) {
    left = rect.right - width;
  }
  left = Math.max(margin, Math.min(left, vw - margin - width));

  const triggerCenterX = rect.left + rect.width / 2;
  const arrowX = Math.min(Math.max(triggerCenterX - left, 18), width - 18);

  return {
    placement: placeAbove ? "above" : "below",
    style: {
      position: "fixed",
      top,
      left,
      right: "auto",
      bottom: "auto",
      width,
      maxHeight: maxH,
      zIndex: 1000,
      ["--sc-pop-arrow-x" as string]: `${arrowX}px`,
    },
  };
}

function ScoreHealthPopover({
  label,
  score,
  barColour,
  confidenceLevel,
  contributors,
  updatedLabel,
  loadState,
  errorMessage,
  onClickStop,
  popoverRef,
  popoverStyle,
  placement = "below",
}: {
  label: string;
  score: number;
  barColour: string;
  confidenceLevel: string;
  contributors: ScoreContributor[];
  updatedLabel: string;
  loadState: "loading" | "ready" | "error";
  errorMessage: string | null;
  onClickStop?: (e: ReactMouseEvent) => void;
  popoverRef?: Ref<HTMLDivElement>;
  popoverStyle?: CSSProperties;
  placement?: "above" | "below";
}) {
  const weightSum = Math.round(contributors.reduce((s, c) => s + c.weight, 0) * 10) / 10;
  const contribSum = Math.round(contributors.reduce((s, c) => s + c.contribution, 0) * 10) / 10;
  const confTone = confidenceTone(confidenceLevel);

  return (
    <div
      ref={popoverRef}
      className={`sc-cat-popover sc-glance-score-popover is-fixed${placement === "above" ? " is-above" : ""}`}
      style={popoverStyle}
      role="dialog"
      aria-label={`Track health breakdown for ${label}`}
      onClick={onClickStop ?? ((e) => e.stopPropagation())}
    >
      <div className="sc-cat-pop-head">
        <span className="sc-cat-pop-eyebrow">Track health · {label}</span>
        <strong className="sc-cat-pop-score" style={{ color: barColour }}>
          {score}
          <i>/100</i>
        </strong>
      </div>
      <p className="sc-cat-pop-explain">
        Weighted from benchmark metrics ({BENCHMARK_WEIGHT}%), company profile ({PROFILE_WEIGHT}
        %), and your {label} answers ({DETAIL_WEIGHT}%). Sorted by what pulls founders down most.
      </p>

      {loadState === "loading" ? (
        <p className="sc-cat-pop-state">Loading score breakdown…</p>
      ) : null}
      {loadState === "error" ? (
        <p className="sc-cat-pop-state is-error" role="alert">
          {errorMessage ?? "Could not load score breakdown."}
        </p>
      ) : null}
      {loadState === "ready" && contributors.length === 0 ? (
        <p className="sc-cat-pop-state">No contributor details yet for this track.</p>
      ) : null}

      {loadState === "ready" && contributors.length > 0 ? (
        <>
          <div className="sc-cat-pop-rows sc-cat-pop-rows-stacked">
            {contributors.map((c, i) => (
              <div
                key={c.id}
                className={`sc-cat-pop-block sc-cat-pop-tone-${contributorTone(c.score)}${
                  i === 0 && c.score < 55 ? " is-top-priority" : ""
                }`}
              >
                <div className="sc-cat-pop-block-head">
                  <span className={`sc-cat-pop-source is-${c.source}`}>{SOURCE_LABELS[c.source]}</span>
                  <span className="sc-cat-pop-block-weight">
                    {formatScoreShare(c.weight)}% · +{formatScoreShare(c.contribution)} pts
                  </span>
                </div>
                <div className="sc-cat-pop-block-title">{c.label}</div>
                <div className="sc-cat-pop-block-meta">
                  <span className="sc-cat-pop-block-val">{c.display}</span>
                  <strong className={`sc-cat-pop-block-score sc-cat-tone-${contributorTone(c.score)}`}>
                    {c.score}
                  </strong>
                </div>
                <p className="sc-cat-pop-impact">{c.impact}</p>
              </div>
            ))}
          </div>
          <div className="sc-cat-pop-total">
            <span>Weighted total</span>
            <strong style={{ color: barColour }}>
              {contribSum} / 100
            </strong>
            <span className="sc-cat-pop-total-note">({weightSum}% inputs)</span>
          </div>
        </>
      ) : null}

      <div className="sc-cat-pop-foot">
        <span>
          Confidence ·{" "}
          <strong className={`sc-cat-pop-conf sc-cat-tone-${confTone}`}>{confidenceLevel}</strong>
        </span>
        <span>Updated {updatedLabel}</span>
      </div>
    </div>
  );
}

export function GlanceScoreRing({
  category,
  score,
  isOpen,
  onToggle,
  companyUuid,
  updatedAt,
  className,
}: {
  category: OverviewApiResponse["categories"][0];
  score: number;
  isOpen: boolean;
  onToggle: () => void;
  companyUuid: string;
  updatedAt?: string | null;
  className?: string;
}) {
  const ringColor = overviewScoreTierColor(score);
  const size = 88;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>();
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [contributors, setContributors] = useState<ScoreContributor[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadState("loading");
    setErrorMessage(null);
    void fetchScoreBreakdown(companyUuid, category.categoryId)
      .then((payload) => {
        if (cancelled) return;
        const rows = (payload.contributors ?? []).flatMap((item) => {
          const parsed = ScoreContributorSchema.safeParse(item);
          return parsed.success ? [parsed.data] : [];
        });
        setContributors(rows);
        setLoadState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        Sentry.captureException(err);
        setContributors([]);
        setLoadState("error");
        setErrorMessage("Could not load score breakdown.");
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, companyUuid, category.categoryId]);

  const positionPopover = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const popoverW = Math.min(380, window.innerWidth - 24);
    const popoverH = popoverRef.current?.offsetHeight ?? 0;
    const next = computeGlancePopoverLayout(rect, popoverW, popoverH);
    setPlacement(next.placement);
    setPopoverStyle(next.style);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPopoverStyle(undefined);
      setPlacement("below");
      return;
    }
    positionPopover();
    const frame = window.requestAnimationFrame(() => {
      positionPopover();
      window.requestAnimationFrame(positionPopover);
    });
    const onResize = () => positionPopover();
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen, positionPopover, contributors.length, loadState, score]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && popoverRef.current?.contains(target)) return;
      onToggle();
    };
    window.addEventListener("scroll", closeOnScroll, true);

    const onDocPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      onToggle();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggle();
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onToggle]);

  const togglePopover = (e: ReactMouseEvent | ReactKeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle();
  };

  const popoverNode = isOpen ? (
    <ScoreHealthPopover
      label={category.label}
      score={score}
      barColour={ringColor}
      confidenceLevel={category.confidenceLevel || "Low"}
      contributors={contributors}
      updatedLabel={formatUpdatedLabel(updatedAt)}
      loadState={loadState}
      errorMessage={errorMessage}
      popoverRef={popoverRef}
      popoverStyle={
        popoverStyle ?? {
          position: "fixed",
          top: 0,
          left: -9999,
          visibility: "hidden",
          pointerEvents: "none",
          width: Math.min(380, typeof window !== "undefined" ? window.innerWidth - 24 : 380),
        }
      }
      placement={placement}
      onClickStop={(e) => e.stopPropagation()}
    />
  ) : null;

  return (
    <div className={`sc-glance-ring-wrap ${className ?? "sc-glance-ring-wrap--lead"}`}>
      <div
        ref={triggerRef}
        className={`sc-glance-ring-trigger${isOpen ? " is-open" : ""}`}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={`Track health ${score}, ${category.statusLabel}. Click to ${
          isOpen ? "hide" : "show"
        } score breakdown.`}
        title="Click for score breakdown"
        onClick={togglePopover}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") togglePopover(e);
        }}
      >
        <div
          className="sc-glance-ring-svg-wrap"
          role="meter"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="sc-glance-ring" aria-hidden>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--surface-3)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          <div className="sc-glance-ring-label">
            <strong style={{ color: ringColor }}>{score}</strong>
          </div>
        </div>
        {popoverNode}
      </div>
      {/* Outside trigger so wrap gap: 6px applies — Design ScorecardV2 GlanceScoreRing */}
      <span className="sc-glance-ring-status" style={{ color: ringColor }}>
        {category.statusLabel.trim().split(/\s+/).map((word, i) => (
          <Fragment key={`${word}-${i}`}>
            {i > 0 ? <br /> : null}
            {word}
          </Fragment>
        ))}
      </span>
    </div>
  );
}
