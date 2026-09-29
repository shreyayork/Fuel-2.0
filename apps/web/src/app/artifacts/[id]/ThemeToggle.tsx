"use client";

import { useEffect, useState } from "react";

type Mode = "editorial" | "signal";
const STORAGE_KEY = "fuel:theme";

/**
 * Reads the platform's theme (same localStorage key the app shell uses) and
 * applies it to the artifact page via `data-theme` on <html>. Also renders
 * a sun/moon toggle in the top bar.
 *
 * Print CSS always forces light regardless of screen mode — dark-background
 * PDFs are useless on paper and wasteful on toner.
 */
export function ThemeToggle() {
  // Default to "signal" (dark) to match the app shell's default — server
  // renders light, then we flip on mount if the user prefers dark.
  const [mode, setMode] = useState<Mode>("editorial");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const initial = stored === "editorial" || stored === "signal" ? stored : "signal";
      setMode(initial);
      document.documentElement.dataset.theme = initial;
    } catch {
      // localStorage blocked — stay on the SSR default.
    }
  }, []);

  const apply = (next: Mode) => {
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.dataset.theme = next;
    } catch {
      // non-fatal — toggle still works in-memory
    }
  };

  const btn = (active: boolean): React.CSSProperties => ({
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    background: active ? "var(--artifact-ink)" : "transparent",
    color: active ? "var(--artifact-bg)" : "var(--artifact-muted)",
    border: "1px solid var(--artifact-rule)",
    cursor: "pointer",
    fontFamily: "Inter, system-ui, sans-serif",
  });

  return (
    <div
      className="no-print"
      style={{
        display: "inline-flex",
        borderRadius: 6,
        overflow: "hidden",
        border: "1px solid var(--artifact-rule)",
        marginRight: 10,
      }}
      aria-label="Color mode"
    >
      <button
        type="button"
        onClick={() => apply("editorial")}
        title="Light mode"
        style={{ ...btn(mode === "editorial"), borderRight: "none", borderTop: "none", borderLeft: "none", borderBottom: "none" }}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => apply("signal")}
        title="Dark mode"
        style={{ ...btn(mode === "signal"), borderTop: "none", borderRight: "none", borderBottom: "none", borderLeft: "1px solid var(--artifact-rule)" }}
      >
        Dark
      </button>
    </div>
  );
}
