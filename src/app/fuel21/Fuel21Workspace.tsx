import { useEffect, useState } from "react";
import { Fuel21Shell } from "./Fuel21Shell.tsx";
import { DashboardPage } from "./DashboardPage.tsx";
import { ContextEnginePage } from "./ContextEnginePage.tsx";
import { RdAnalysisPage } from "./RdAnalysisPage.tsx";
import { PlaceholderPage } from "./PlaceholderPage.tsx";
import type { NavId } from "./demoData.ts";
import "./fuel21.css";

const THEME_KEY = "fuel-ui-theme";

function readTheme(): "dark" | "light" {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

function readInitialPage(): NavId {
  if (typeof window === "undefined") return "dashboard";
  const hash = window.location.hash.replace(/^#\/?/, "");
  const map: Record<string, NavId> = {
    dashboard: "dashboard",
    rd: "rd",
    "r-and-d": "rd",
    gtm: "gtm",
    ga: "ga",
    "g-and-a": "ga",
    context: "context",
    "context-engine": "context",
    initiatives: "initiatives",
    intelligence: "intelligence",
    "data-room": "data-room",
    advisors: "advisors",
    investors: "investors",
  };
  return map[hash] ?? "dashboard";
}

export default function Fuel21Workspace({
  onLogOut,
}: {
  onLogOut?: () => void;
}) {
  const [theme, setTheme] = useState<"dark" | "light">(() => readTheme());
  const [page, setPage] = useState<NavId>(() => readInitialPage());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const slug =
      page === "rd"
        ? "rd"
        : page === "ga"
          ? "ga"
          : page === "context"
            ? "context-engine"
            : page;
    const next = `#/${slug}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [page]);

  // Keep logout available for shell extension without unused-var lint noise.
  void onLogOut;

  return (
    <Fuel21Shell
      theme={theme}
      page={page}
      onNavigate={setPage}
      onToggleTheme={() => setTheme(t => (t === "dark" ? "light" : "dark"))}
    >
      {page === "dashboard" ? <DashboardPage onNavigate={setPage} /> : null}
      {page === "context" ? <ContextEnginePage /> : null}
      {page === "rd" ? <RdAnalysisPage onNavigate={setPage} /> : null}
      {page !== "dashboard" && page !== "context" && page !== "rd" ? (
        <PlaceholderPage page={page} />
      ) : null}
    </Fuel21Shell>
  );
}
