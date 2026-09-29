"use client";

import { useEffect, useState } from "react";

/**
 * Renders a string as if an LLM were streaming it — bursts of 1–3
 * characters at a time, slight variance in cadence to feel organic, with
 * a steady cursor blinking at the trailing edge until completion.
 *
 * Strictly cosmetic: the full string is decided up front, no actual
 * inference. Designed for the hero headline where "AI Operating System"
 * should feel generated rather than statically baked.
 */
export function TokenStream({
  text,
  startDelayMs = 280,
  baseTokenMs = 40,
  tokenJitterMs = 60,
  burstSize = 2,
  onDone,
  className,
  style,
}: {
  text: string;
  /** Wait this long before the first character lands. */
  startDelayMs?: number;
  /** Average ms between bursts. */
  baseTokenMs?: number;
  /** ± random jitter applied to each step. */
  tokenJitterMs?: number;
  /** How many characters land per burst on average. */
  burstSize?: number;
  onDone?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [chars, setChars] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delay: number, fn: () => void) => {
      timer = setTimeout(() => {
        if (!cancelled) fn();
      }, delay);
    };

    const step = (i: number) => {
      if (i >= text.length) {
        setDone(true);
        onDone?.();
        return;
      }
      // Bursty token cadence: 1..(burstSize*2-1) chars per tick, with
      // pauses near sentence breaks for natural rhythm.
      const burst = Math.max(1, Math.round(Math.random() * (burstSize * 2 - 1)));
      const next = Math.min(i + burst, text.length);
      setChars(next);
      const lastChar = text[next - 1];
      const pauseAfterPunct = /[.,—–:;]/.test(lastChar) ? 180 : 0;
      const jitter = (Math.random() - 0.5) * 2 * tokenJitterMs;
      schedule(Math.max(8, baseTokenMs + jitter + pauseAfterPunct), () => step(next));
    };

    schedule(startDelayMs, () => step(0));

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // Intentionally not reactive to text changes — once mounted, ride it out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span className={className} style={style}>
      <style>{`
        @keyframes fuel-caret-blink {
          0%, 49%   { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
      <span>{text.slice(0, chars)}</span>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: "0.55ch",
          height: "1em",
          marginLeft: "0.06em",
          verticalAlign: "-0.12em",
          background: "#00B48A",
          opacity: done ? 0 : 1,
          animation: done
            ? undefined
            : "fuel-caret-blink 1.0s steps(1, end) infinite",
          transition: "opacity 280ms ease 200ms",
        }}
      />
    </span>
  );
}
