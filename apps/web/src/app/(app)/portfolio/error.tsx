"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { THEMES } from "@/lib/theme";

/**
 * Segment boundary for /portfolio — avoids raw RSC digest payloads
 * (e.g. DuplicateWatchlistNameError during claim/ensure race).
 */
export default function PortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = THEMES.editorial;

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        fontFamily: t.sans,
        color: t.ink,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 10px",
            letterSpacing: "-0.02em",
          }}
        >
          Couldn&apos;t load Portfolios
        </h1>
        <p
          style={{
            fontSize: 14,
            color: t.muted,
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          Something went wrong while building or loading your lists. Try again
          — if a portfolio was already created, it should show up after refresh.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            background: t.accent,
            color: t.bg,
            border: "none",
            borderRadius: 6,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: t.sans,
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
