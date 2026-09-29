"use client";

/**
 * Fuel brand mark — three ascending bars + a floating spark. Strategic read:
 * the bars suggest data accumulating + an implicit "F", the spark
 * represents intelligence synthesizing on top. Idle: gentle pulse. Busy:
 * sequential bar ignition + spark traversal. Designed to be recognizable at
 * 14px and scale cleanly to 64px+.
 */

export function FuelMark({
  size = 22,
  busy = false,
  accent = "#00B48A",
  warm = "#ECD67F",
  deep = "#284256",
}: {
  size?: number;
  busy?: boolean;
  accent?: string;
  warm?: string;
  deep?: string;
}) {
  const id = useId();
  return (
    <>
      <style jsx>{`
        .fuel-mark { overflow: visible; display: block; }
        .fuel-mark .bar {
          transform-origin: 0 50%;
          transform: scaleX(1);
          opacity: 0.55;
        }
        .fuel-mark .b1 { opacity: 0.9; }
        .fuel-mark .b2 { opacity: 0.7; }
        .fuel-mark .b3 { opacity: 0.5; }

        .fuel-mark.busy .bar { animation: fuel-bar-ignite 1.8s ease-in-out infinite; }
        .fuel-mark.busy .b1 { animation-delay: 0s; }
        .fuel-mark.busy .b2 { animation-delay: 0.18s; }
        .fuel-mark.busy .b3 { animation-delay: 0.36s; }
        @keyframes fuel-bar-ignite {
          0%, 100% { opacity: 0.4; transform: scaleX(1); }
          45%      { opacity: 1;   transform: scaleX(1.04); }
        }

        .fuel-mark .spark {
          transform-origin: 50% 50%;
          opacity: 0.85;
        }
        .fuel-mark.busy .spark {
          animation: fuel-spark-float 2.6s ease-in-out infinite;
        }
        @keyframes fuel-spark-float {
          0%   { transform: translate(0, 0) scale(1);    opacity: 0.6; }
          40%  { transform: translate(-1px, -2px) scale(1.25); opacity: 1; }
          70%  { transform: translate(1px, 0px) scale(0.9); opacity: 0.9; }
          100% { transform: translate(0, 0) scale(1);    opacity: 0.6; }
        }

        .fuel-mark:not(.busy) .spark { animation: fuel-spark-idle 3.6s ease-in-out infinite; }
        @keyframes fuel-spark-idle {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50%      { transform: scale(1.12); opacity: 1; }
        }

        /* Subtle glow under the whole mark while busy */
        .fuel-mark.busy .glow {
          opacity: 0.55;
          animation: fuel-glow 2.2s ease-in-out infinite;
        }
        @keyframes fuel-glow {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 0.7; }
        }
      `}</style>
      <svg
        className={`fuel-mark ${busy ? "busy" : ""}`}
        width={size}
        height={size}
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor={warm} />
          </linearGradient>
          <radialGradient id={`${id}-glow`} cx="50%" cy="70%" r="70%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-spark`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={warm} />
            <stop offset="60%" stopColor={accent} />
            <stop offset="100%" stopColor={deep} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft glow underneath (visible only while busy) */}
        <circle
          className="glow"
          cx="16"
          cy="20"
          r="14"
          fill={`url(#${id}-glow)`}
          opacity="0"
        />

        {/* Ascending bars — implicit F, read as "data rising into synthesis" */}
        <rect
          className="bar b1"
          x="4"
          y="22"
          width="22"
          height="3"
          rx="1.5"
          fill={`url(#${id}-bar)`}
        />
        <rect
          className="bar b2"
          x="4"
          y="15"
          width="16"
          height="3"
          rx="1.5"
          fill={`url(#${id}-bar)`}
        />
        <rect
          className="bar b3"
          x="4"
          y="8"
          width="10"
          height="3"
          rx="1.5"
          fill={`url(#${id}-bar)`}
        />

        {/* Spark — the "intelligence" synthesized on top of the data */}
        <circle
          className="spark"
          cx="23"
          cy="9.5"
          r="3.2"
          fill={`url(#${id}-spark)`}
        />
      </svg>
    </>
  );
}

// Inline tiny useId polyfill wrapping React's, to keep this file self-contained.
import { useId as reactUseId } from "react";
function useId(): string {
  const raw = reactUseId();
  // Replace colons which aren't legal inside SVG ids in some renderers.
  return raw.replace(/:/g, "_");
}
