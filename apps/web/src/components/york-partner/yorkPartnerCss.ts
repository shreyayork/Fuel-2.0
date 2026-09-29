import { accentGradient, SIGNAL, type Theme } from "@/lib/theme";

/** York partner rail styles — ported from Design PatriotPayJourney.css. */
export function yorkPartnerCss(t: Theme): string {
  const isLight = t.mode === "editorial";
  const panel = t.panel;
  const panelBorder = t.rule;
  const muted = t.muted;
  const strong = t.ink;
  const accent = t.accent;
  const railBg = isLight ? "#f7f8fa" : "rgba(10, 20, 28, 0.45)";
  const railBorder = isLight ? "#e8eaed" : panelBorder;
  const railAccent = isLight ? "#12b886" : accent;
  const leadColor = isLight ? "#5b6b7c" : muted;
  const headlineColor = isLight ? "#1a2332" : strong;
  const kickerColor = isLight ? "#0fa678" : accent;
  const overviewBg = isLight ? "#ffffff" : panel;
  const menuHover = isLight ? "rgba(26, 35, 50, 0.06)" : "rgba(255, 255, 255, 0.06)";
  const openBriefGradient = accentGradient(SIGNAL);
  const openBriefHoverGradient = `linear-gradient(135deg, ${SIGNAL.accent} 0%, ${SIGNAL.warn} 72%)`;
  const openBriefInk = "#0a1a12";

  return `
.ask-ai-btn.york-rail-cta {
  align-items: center;
  background: ${openBriefGradient};
  border: none;
  border-radius: 999px;
  color: ${openBriefInk};
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  gap: 6px;
  line-height: 1.2;
  padding: 8px 14px;
  text-decoration: none;
  white-space: nowrap;
}
.ask-ai-btn.york-rail-cta:hover {
  background: ${openBriefHoverGradient};
}

.sidebar-york-nudge.york-rail,
.york-rail--sidebar {
  background: ${railBg};
  border: 1px solid ${railBorder};
  border-radius: 10px;
  box-shadow: inset 3px 0 0 ${railAccent};
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 10px 11px;
  text-align: left;
}

.york-rail-top {
  align-items: center;
  display: flex;
  justify-content: space-between;
  min-height: 18px;
}

.york-rail-kicker {
  color: ${kickerColor};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.york-rail-lead {
  color: ${leadColor};
  font-size: 11px;
  font-style: normal;
  font-weight: 500;
  line-height: 1.35;
  margin: 0;
}

.york-rail-headline {
  color: ${headlineColor};
  font-size: 12.5px;
  font-weight: 650;
  line-height: 1.35;
  margin: 0;
}

.york-rail-cta {
  align-self: flex-start;
  flex-shrink: 0;
  margin-top: 2px;
  text-decoration: none;
  white-space: nowrap;
}

.york-overview-suggest {
  margin: 0;
}

.sc-overview-tracks-glance > .york-overview-suggest {
  margin-top: -6px;
}

.york-rail--overview {
  align-items: center;
  background: ${overviewBg};
  border: 1px solid ${railBorder};
  border-radius: 10px;
  display: grid;
  gap: 12px;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  padding: 12px 14px;
  position: relative;
}

.york-rail--overview .york-rail-mark {
  align-items: center;
  background: ${isLight ? "rgba(18, 184, 134, 0.1)" : "rgba(0, 180, 138, 0.14)"};
  border: 1px solid ${isLight ? "rgba(18, 184, 134, 0.3)" : "rgba(0, 180, 138, 0.35)"};
  border-radius: 8px;
  color: ${kickerColor};
  display: inline-flex;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  height: 36px;
  justify-content: center;
  letter-spacing: 0.04em;
  width: 36px;
}

.york-rail--overview .york-rail-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.york-rail--overview .york-rail-kicker {
  letter-spacing: 0.05em;
}

.york-rail--overview .york-rail-headline {
  font-size: 13.5px;
  font-style: normal;
}

.york-rail--overview .york-rail-lead {
  font-size: 12px;
  font-style: normal;
}

.york-rail--overview .york-rail-cta {
  align-self: center;
}

.york-rail--overview .york-card-menu {
  flex-shrink: 0;
}

.york-rail--detail,
.york-nudge--detail.york-rail {
  background: ${railBg};
  border: 1px solid ${railBorder};
  border-radius: 10px;
  box-shadow: inset 3px 0 0 ${railAccent};
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
  padding: 11px 12px 12px;
  text-align: left;
}

.york-rail--detail .york-rail-lead,
.york-rail--detail .york-rail-headline {
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  display: -webkit-box;
  overflow: hidden;
}

.york-rail--detail .york-rail-headline {
  font-size: 13px;
}

.york-rail--detail .york-rail-cta {
  margin-top: 4px;
}

.york-card-menu {
  position: relative;
}

.york-card-menu-trigger {
  background: transparent;
  border: none;
  border-radius: 6px;
  color: ${muted};
  cursor: pointer;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  padding: 2px 6px;
}

.york-card-menu-trigger:hover {
  background: ${menuHover};
  color: ${strong};
}

.york-card-menu-panel {
  background: ${panel};
  border: 1px solid ${panelBorder};
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, ${isLight ? "0.12" : "0.28"});
  display: flex;
  flex-direction: column;
  min-width: 168px;
  padding: 6px;
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 5;
}

.york-card-menu-panel button {
  background: transparent;
  border: none;
  border-radius: 8px;
  color: ${strong};
  cursor: pointer;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 8px 10px;
  text-align: left;
}

.york-card-menu-panel button:hover {
  background: ${menuHover};
}

@media (max-width: 720px) {
  .york-rail--overview {
    align-items: start;
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
  }
  .york-rail--overview .york-rail-cta {
    grid-column: 2;
    justify-self: start;
  }
  .york-rail--overview .york-card-menu {
    grid-column: 3;
    grid-row: 1;
  }
}
`;
}
