import { useEffect, useState } from "react";
import { Fuel21Shell } from "./Fuel21Shell.tsx";
import { DashboardPage } from "./DashboardPage.tsx";
import { ContextEnginePage } from "./ContextEnginePage.tsx";
import { RdAnalysisPage } from "./RdAnalysisPage.tsx";
import type { NavId } from "./demoData.ts";
import "./fuel21.css";

const THEME_KEY = "fuel21-theme";

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
  document.documentElement.setAttribute("data-f21-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}

function readInitialPage(): NavId {
  if (typeof window === "undefined") return "dashboard";
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (hash === "rd" || hash === "r-and-d") return "rd";
  if (hash === "context" || hash === "context-engine") return "context";
  return "dashboard";
}

/** Standalone mockup app: Dashboard, Context Engine, R&D only. */
export default function Fuel21Workspace() {
  const [theme, setTheme] = useState<"dark" | "light">(() => readTheme());
  const [page, setPage] = useState<NavId>(() => readInitialPage());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => setPage(readInitialPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const slug = page === "context" ? "context-engine" : page;
    const next = `#/${slug}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", `/${next}`);
    }
  }, [page]);

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
    </Fuel21Shell>
  );
}
