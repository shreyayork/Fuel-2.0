import { useEffect, useMemo, useState } from "react";
import { loadPublishedBriefByToken } from "./briefDocStorage";
import "./briefDocEditor.css";

type Appearance = "dark" | "light";

function readFuelTheme(): Appearance {
  const current = document.documentElement.getAttribute("data-theme");
  if (current === "light" || current === "dark") return current;
  try {
    const stored = localStorage.getItem("fuel-ui-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyFuelTheme(theme: Appearance) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("fuel-ui-theme", theme);
  } catch {
    /* ignore */
  }
}

export function BriefSharePage({ token }: { token: string }) {
  const record = useMemo(() => loadPublishedBriefByToken(token), [token]);
  const [theme, setTheme] = useState<Appearance>(() => readFuelTheme());

  useEffect(() => {
    applyFuelTheme(theme);
  }, [theme]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previousTitle = document.title;
    document.title = record
      ? `${record.companyName} · ${record.audience === "investor" ? "Investor brief" : "Public profile"}`
      : "Brief unavailable";
    return () => {
      document.body.style.overflow = previous;
      document.title = previousTitle;
    };
  }, [record]);

  if (!record) {
    return (
      <div className="brief-share-missing">
        <h1>This link is not available</h1>
        <p>The brief was unpublished, or the link is wrong.</p>
      </div>
    );
  }

  const versionLabel = record.audience === "investor" ? "Investor brief" : "Public profile";

  return (
    <div className="brief-doc-screen" role="document" aria-label={`${record.companyName} ${versionLabel}`}>
      <header className="brief-doc-bar">
        <div className="brief-doc-identity">
          <div>
            <strong>{record.companyName}</strong>
            <p>{versionLabel}</p>
          </div>
        </div>
        <div className="brief-doc-controls">
          <div className="brief-doc-theme" role="group" aria-label="Appearance">
            <button type="button" aria-pressed={theme === "dark"} className={theme === "dark" ? "is-active" : undefined} onClick={() => setTheme("dark")}>Dark</button>
            <button type="button" aria-pressed={theme === "light"} className={theme === "light" ? "is-active" : undefined} onClick={() => setTheme("light")}>Light</button>
          </div>
        </div>
      </header>
      <div className="brief-doc-canvas">
        <div className="brief-paper" dangerouslySetInnerHTML={{ __html: record.html }} />
      </div>
    </div>
  );
}
