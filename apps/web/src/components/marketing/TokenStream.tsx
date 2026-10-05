"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { marketingTheme as t } from "./styles";

/**
 * Renders a string as if an LLM were streaming it — bursts of characters
 * with a trailing caret. Gradient / clip styles must live on the same
 * element that holds the visible characters (`background-clip: text`
 * breaks across nested transparent fills).
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
  startDelayMs?: number;
  baseTokenMs?: number;
  tokenJitterMs?: number;
  burstSize?: number;
  onDone?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const [chars, setChars] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setChars(text.length);
      setDone(true);
      onDone?.();
      return;
    }

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
    <span
      className={className}
      style={{
        display: "inline-block",
        position: "relative",
      }}
    >
      {/* Invisible sizer — full string so the line never collapses mid-stream */}
      <span aria-hidden style={{ visibility: "hidden", display: "inline-block" }}>
        {text}
      </span>
      <span
        style={{
          ...style,
          position: "absolute",
          left: 0,
          top: 0,
          whiteSpace: "nowrap",
        }}
      >
        {text.slice(0, chars)}
        {!done ? (
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: "0.55ch",
              height: "0.85em",
              marginLeft: "0.06em",
              verticalAlign: "-0.08em",
              borderRadius: 1,
              // Solid accent — gradient clip would hide a zero-width caret
              background: t.accent,
              WebkitTextFillColor: t.accent,
              animation: "fuel-caret-blink 1s steps(1, end) infinite",
            }}
          />
        ) : null}
      </span>
    </span>
  );
}
