import { accentGradient, SIGNAL, type Theme } from "@/lib/theme";
import {
  OVERVIEW_THEME,
  overviewAccentLine,
  overviewBorder,
  overviewBorderStrong,
} from "./overviewTokens";

/**
 * Overview stylesheet expressed in TypeScript (replaces overview-scorecard.css).
 * CSS custom properties are bound from Design scorecard tokens (PatriotPayJourney).
 */
export function overviewScorecardCss(t: Theme = OVERVIEW_THEME): string {
  const isLight = t.mode === "editorial";
  const divider = isLight ? overviewBorder(t) : "rgba(255, 255, 255, 0.09)";
  const featuredBg = isLight
    ? `var(--surface-2)`
    : `radial-gradient(ellipse 90% 70% at 50% 115%, rgba(61, 214, 140, 0.18), transparent 55%),
    linear-gradient(135deg, rgba(63, 224, 164, 0.08) 0%, rgba(63, 224, 164, 0.02) 42%, transparent 72%),
    var(--surface-2)`;
  const ringFallback = isLight ? "rgba(18, 184, 134, 0.12)" : "rgba(63,224,164,0.10)";
  // Design `.ask-ai-btn` (fuleDesign / PatriotPayJourney) — York teal → gold.
  const openBriefGradient = accentGradient(SIGNAL);
  const openBriefHoverGradient = `linear-gradient(135deg, ${SIGNAL.accent} 0%, ${SIGNAL.warn} 72%)`;
  const openBriefInk = "#0a1a12";

  return `
.fuel-overview.scorecard-v2,
.fuel-overview {
  --bg: ${t.bg};
  --bg-main: ${t.bg};
  --surface-1: ${t.bg};
  --surface-2: ${t.panel};
  --surface-3: ${t.panelAlt};
  --text-1: ${t.ink};
  --text-2: ${t.inkSoft};
  --text-3: ${t.muted};
  --text-4: ${t.mutedSoft};
  --accent: ${t.accent};
  --accent-line: ${overviewAccentLine(t)};
  --accent-dim: ${t.accentTint};
  --border: ${overviewBorder(t)};
  --border-strong: ${overviewBorderStrong(t)};
  --panel-border: ${overviewBorder(t)};
  --fuel-accent: ${t.accent};
  --fuel-side-panel-width: 720px;
  --status-good: #12b886;
  --status-watch: #F5A623;
  --status-bad: #E05C5C;
  --status-good-dim: ${isLight ? "rgba(18, 184, 134, 0.1)" : "rgba(18, 184, 134, 0.14)"};
  --status-watch-dim: ${isLight ? "rgba(245, 166, 35, 0.1)" : "rgba(245, 166, 35, 0.14)"};
  --status-bad-dim: ${isLight ? "rgba(224, 92, 92, 0.1)" : "rgba(224, 92, 92, 0.14)"};
  --status-good-line: ${isLight ? "rgba(18, 184, 134, 0.28)" : "rgba(18, 184, 134, 0.32)"};
  --status-watch-line: ${isLight ? "rgba(245, 166, 35, 0.28)" : "rgba(245, 166, 35, 0.32)"};
  --status-bad-line: ${isLight ? "rgba(224, 92, 92, 0.28)" : "rgba(224, 92, 92, 0.32)"};
  --panel: ${t.panel};
  --panel-body: var(--text-2);
  --panel-muted: var(--text-3);
  --panel-strong: var(--text-1);
  --panel-inset: ${isLight ? "#ffffff" : "rgba(10, 20, 28, 0.35)"};
  --btn-primary-bg: ${isLight ? t.ink : t.accent};
  --btn-primary-text: ${isLight ? "#ffffff" : "#042018"};
  --btn-primary-border: ${isLight ? t.ink : t.accent};
  color-scheme: ${isLight ? "light" : "dark"};
  font-family: ${t.sans};
}

/* Ported from Design/src/app/PatriotPayJourney.css — Overview / ScorecardV2 surfaces */
.fuel-overview.scorecard-v2 {
  display: flex;
  flex-direction: column;
  gap: 40px;
  color: var(--text-1);
  font-family: inherit;
}

.fuel-overview .sc-overview-page-link {
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  color: var(--text-1);
  cursor: pointer;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 8px 14px;
  transition: background 0.14s, border-color 0.14s, color 0.14s;
  white-space: nowrap;
}

.fuel-overview .sc-overview-page-link:hover {
  background: rgba(61, 214, 140, 0.08);
  border-color: var(--accent-line);
  color: var(--accent);
}

.scorecard-v2 {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.scorecard-v2 > .sc-overview-advisor-wrap {
  margin-bottom: 0;
}

.sc-overview-advisor-wrap:not(.is-collapsed) .sc-adv-featured-toggle {
  border-bottom: 1px solid ${divider};
}

.sc-overview-advisor-wrap .sc-adv-featured-toggle {
  padding: 16px 28px;
}

.sc-overview-advisor-wrap .sc-adv-featured-brief-col,
.sc-overview-advisor-wrap .sc-adv-featured-rec-col {
  padding: 22px 28px;
}

.sc-overview-advisor-toggle {
  align-items: flex-start;
  gap: 12px 14px;
}

.sc-overview-tracks {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ─── Featured (full-width) Fuel AI Advisor card on top of Overview ─── */
.sc-adv-featured-wrap {
  position: relative;
  margin: 0 0 22px;
  border-radius: 14px;
  padding: 2px;                /* thickness of the animated gradient ring */
  background: ${ringFallback};   /* faint static ring fallback */
  isolation: isolate;
  overflow: hidden;
  ${isLight ? "box-shadow: 0 1px 2px rgba(26, 35, 50, 0.04);" : ""}
}

/* A thin bright slice of mint that rotates around the perimeter. The slice
   is tight (~40°) so it reads as a traveling band on the border rather than
   a radar sweep over the whole card. The inner toggle/card sits at z-index 1
   and covers the center, so only the 2px ring shows the rotating gradient. */
.sc-adv-featured-border {
  position: absolute;
  /* make it a big square so the rotated gradient covers the wrap fully */
  top: 50%;
  left: 50%;
  width: 200%;
  aspect-ratio: 1;
  transform-origin: center;
  translate: -50% -50%;
  background: conic-gradient(
    from 0deg,
    rgba(63,224,164,0)    0deg,
    rgba(63,224,164,0)   300deg,
    rgba(63,224,164,1)   340deg,
    rgba(63,224,164,0)   360deg
  );
  animation: scAdvSpin 9s linear infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes scAdvSpin {
  to { transform: rotate(360deg); }
}

/* Inner card surfaces sit ABOVE the rotating gradient so they mask all but
   the 2px ring */
.sc-adv-featured-toggle {
  position: relative;
  z-index: 1;
  align-items: center;
  background: var(--surface-2);
  border: 0;
  border-radius: 12px 12px 0 0;
  color: var(--text-1);
  cursor: pointer;
  display: flex;
  flex-wrap: wrap;
  font: inherit;
  gap: 12px;
  justify-content: flex-start;
  padding: 14px 22px;
  text-align: left;
  width: 100%;
  transition: background 0.15s;
}

.sc-adv-featured-wrap.is-collapsed .sc-adv-featured-toggle {
  border-radius: 12px;
}

.sc-adv-featured-toggle:hover { background: var(--surface-3); }

.sc-adv-featured-toggle-label {
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.sc-adv-featured-toggle-meta {
  color: var(--text-3);
  font-size: 11px;
  margin-left: 2px;
}

.sc-adv-featured-chev {
  align-items: center;
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--text-1);
  display: inline-flex;
  flex-shrink: 0;
  font-size: 14px;
  height: 28px;
  justify-content: center;
  line-height: 1;
  margin-left: auto;
  transition: background 0.15s, color 0.15s, transform 0.2s;
  width: 28px;
}

.sc-adv-featured-toggle:hover .sc-adv-featured-chev {
  background: rgba(63,224,164,0.15);
  color: var(--accent);
}

.sc-adv-featured-wrap.is-collapsed .sc-adv-featured-chev {
  transform: rotate(-90deg);
}

.sc-adv-featured {
  position: relative;
  z-index: 1;
}

/* Two-column split: brief on left, recommended actions on right */
.sc-adv-featured.sc-adv-featured-split {
  background: ${featuredBg};
  border-radius: 0 0 12px 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  gap: 0;
  padding: 0;
}
.sc-adv-featured-brief-col {
  min-width: 0;
  padding: 18px 20px;
}
.sc-adv-featured-brief-col > .fb-card,
.sc-adv-featured-brief-col > .sc-adv {
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 0;
}
.sc-adv-featured-brief-col > .sc-adv > .sc-adv-head { display: none; }
.sc-adv-featured-rec-col {
  border-left: 1px solid ${divider};
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 18px 20px;
}
.sc-adv-rec-spotlight {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.sc-adv-rec-title {
  color: var(--text-3);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.sc-adv-rec-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.sc-adv-rec-item {
  align-items: flex-start;
  display: grid;
  gap: 12px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
}
.sc-adv-rec-num {
  align-items: center;
  background: var(--accent-dim);
  border: 1px solid var(--accent-line);
  border-radius: 50%;
  color: var(--accent);
  display: inline-flex;
  font-size: 11.5px;
  font-weight: 700;
  height: 24px;
  justify-content: center;
  line-height: 1;
  width: 24px;
}
.sc-adv-rec-num.is-done {
  background: rgba(61, 214, 140, 0.18);
  border-color: rgba(61, 214, 140, 0.48);
  color: var(--accent);
}
.sc-adv-rec-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.sc-adv-rec-name {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}
.sc-adv-rec-sub {
  color: var(--text-3);
  font-size: 11.5px;
  line-height: 1.4;
  margin: 0;
}
.sc-adv-rec-cta {
  align-self: center;
  background: transparent;
  border: 0;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 0;
  white-space: nowrap;
}
.sc-adv-rec-cta:hover { text-decoration: underline; }
.sc-adv-rec-cta.is-disabled,
.sc-adv-rec-cta:disabled {
  color: var(--text-3);
  cursor: not-allowed;
  opacity: 0.55;
  text-decoration: none;
  pointer-events: none;
}
.sc-adv-rec-cta.is-disabled:hover,
.sc-adv-rec-cta:disabled:hover { text-decoration: none; }

@media (max-width: 1080px) {
  .sc-adv-featured.sc-adv-featured-split { grid-template-columns: 1fr; }
  .sc-adv-featured-rec-col { border-left: 0; border-top: 1px solid rgba(255, 255, 255, 0.09); }
}

.sc-adv-featured > .sc-adv,
.sc-adv-featured.sc-playbook-card,
.sc-adv-featured > .fb-card {
  position: relative;
  top: auto !important;
  width: 100%;
  border: 0 !important;
  border-radius: 0 0 12px 12px !important;
  box-shadow: none !important;
  /* Two stacked backgrounds: a tinted mint wash on top, OPAQUE surface-2
     underneath. The opaque bottom layer is what blocks the rotating gradient
     from bleeding through and creating the radar look. */
  background:
    linear-gradient(135deg, rgba(63,224,164,0.10) 0%, rgba(63,224,164,0.02) 38%, rgba(63,224,164,0) 100%),
    var(--surface-2) !important;
  padding: 20px 26px 22px !important;
}

/* Toggle replaces each inner card's own head — hide the duplicate */
.sc-adv-featured > .sc-adv > .sc-adv-head,
.sc-adv-featured.sc-playbook-card > .sc-playbook-head,
.sc-adv-featured > .fb-card > .fb-card-head,
.sc-adv-featured-brief-col > .fb-card > .fb-card-head {
  display: none;
}

/* In split view the brief card also drops its bottom "View in details" CTA
   because it lives inline with the title above. */
.sc-adv-featured-brief-col > .fb-card > .fb-card-cta { display: none; }
.sc-adv-featured-brief-col > .fb-card > .fb-card-points { border-top: 0; padding-top: 0; }

.sc-adv-featured .sc-adv-bullets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px 22px;
}

.sc-adv-featured .sc-adv-summary {
  font-size: 14px;
  max-width: 880px;
}

.sc-adv-featured-brief-col > .sc-adv > .sc-adv-rec-title {
  margin: 0 0 12px;
}

.sc-adv-featured-brief-col > .sc-adv > .sc-adv-rec-title + .sc-adv-summary {
  margin-top: 0;
}

.sc-adv-focus {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 0 4px;
}

.sc-adv-focus-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sc-adv-focus-card {
  align-items: center;
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: inherit;
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 76px;
  padding: 10px 12px;
  text-align: left;
  transition: border-color 0.14s, box-shadow 0.14s, transform 0.14s;
}

.sc-adv-focus-card:hover,
.sc-adv-focus-card:focus-visible {
  box-shadow: 0 1px 6px color-mix(in srgb, var(--sc-focus-accent, var(--accent)) 16%, transparent);
  outline: none;
  transform: translateY(-1px);
}

.sc-adv-focus-card.is-good {
  --sc-focus-accent: var(--status-good);
  background: var(--status-good-dim);
  border-color: var(--status-good-line);
}

.sc-adv-focus-card.is-watch {
  --sc-focus-accent: var(--status-watch);
  background: var(--status-watch-dim);
  border-color: var(--status-watch-line);
}

.sc-adv-focus-card.is-bad {
  --sc-focus-accent: var(--status-bad);
  background: var(--status-bad-dim);
  border-color: var(--status-bad-line);
}

.sc-adv-focus-card-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sc-adv-focus-card-title {
  color: var(--text-1);
  display: -webkit-box;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.sc-adv-focus-card-meta {
  color: var(--text-3);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-adv-focus-ring {
  height: 44px;
  position: relative;
  width: 44px;
  flex-shrink: 0;
}

.sc-adv-focus-ring svg {
  display: block;
}

.sc-adv-focus-ring-track {
  stroke: color-mix(in srgb, var(--sc-focus-accent, var(--accent)) 22%, var(--surface-2));
}

.sc-adv-focus-ring-progress {
  stroke: var(--sc-focus-accent, var(--accent));
}

.sc-adv-focus-ring-label {
  align-items: center;
  color: var(--text-1);
  display: flex;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  inset: 0;
  justify-content: center;
  letter-spacing: -0.02em;
  position: absolute;
}

.sc-adv-focus + .sc-adv {
  border-top: 1px solid ${divider};
  margin-top: 14px;
  padding-top: 16px;
}

.sc-adv-brief-link {
  background: none;
  border: 0;
  color: var(--text-1);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  margin: 4px 0 0;
  padding: 0;
  text-align: left;
  text-decoration: none;
}

.sc-adv-brief-link:hover,
.sc-adv-brief-link:focus-visible {
  color: var(--accent);
  outline: none;
  text-decoration: underline;
}

@media (max-width: 860px) {
  .sc-adv-focus-grid { grid-template-columns: 1fr; }
}

.sc-cat-header-btn {
  align-items: center;
  background: transparent;
  border: 1px solid var(--border-strong, rgba(255,255,255,0.14));
  border-radius: 8px;
  color: var(--text-1);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  gap: 6px;
  line-height: 1;
  padding: 8px 12px;
  transition: background 0.14s, border-color 0.14s, color 0.14s;
  white-space: nowrap;
}
.sc-cat-header-btn:hover {
  background: ${isLight ? "var(--status-good-dim)" : "rgba(63,214,140,0.08)"};
  border-color: ${isLight ? "var(--status-good-line)" : "var(--accent-line, rgba(63,214,140,0.4))"};
  color: ${isLight ? "var(--status-good)" : "var(--accent)"};
}

.sc-cat-tone-strong { color: ${isLight ? "var(--status-good)" : "#3FE0A4"}; }
.sc-cat-tone-above  { color: ${isLight ? "var(--status-good)" : "#3FE0A4"}; }
.sc-cat-tone-watch  { color: ${isLight ? "var(--status-watch)" : "#E5B544"}; }
.sc-cat-tone-weak   { color: ${isLight ? "var(--status-bad)" : "#e38a8a"}; }

.sc-cat-sw-col-wrap {
  border-left: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  padding-left: 24px;
}
@media (max-width: 1080px) {
  .sc-cat-sw-col-wrap { border-left: 0; padding-left: 0; }
}
.sc-cat-sw-block { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.sc-cat-sw-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.sc-cat-sw-list {
  color: var(--text-2);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12.5px;
  list-style: disc;
  margin: 0;
  padding: 0 0 0 1.15em;
}
.sc-cat-sw-list li {
  display: list-item;
  padding-left: 0.15em;
}
.sc-cat-sw-list li strong { color: var(--text-1); display: block; font-weight: 600; }
.sc-cat-sw-list li em     { color: var(--text-3); display: block; font-style: normal; font-size: 11.5px; margin-top: 2px; }
.sc-cat-sw-empty { color: var(--text-3); font-size: 12px; font-style: italic; margin: 0; }

.sc-adv-summary {
  color: var(--text-1);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 16px;
}

.sc-adv-summary strong { color: var(--accent); font-weight: 700; }

.sc-adv-bullets {
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding-top: 15px;
}

.sc-adv-bullet { display: flex; gap: 10px; }

.sc-adv-bullet-dot {
  border-radius: 50%;
  flex-shrink: 0;
  height: 7px;
  margin-top: 6px;
  width: 7px;
}

.sc-adv-bullet-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }

.sc-adv-bullet-cat {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.sc-adv-bullet-text { color: var(--text-2); font-size: 12.5px; line-height: 1.5; }

/* Advisor — derived-from-details section */
.sc-adv-derived {
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 13px;
  margin-top: 16px;
  padding-top: 15px;
}

.sc-overview-tracks-glance {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 4px;
}

.sc-glance-row {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  padding: 12px 22px 20px;
  scroll-margin-top: 24px;
  transition: border-color 0.14s, background 0.14s;
}

.sc-glance-row:hover {
  background: ${isLight ? "#ffffff" : "var(--surface-3)"};
  border-color: ${isLight ? "#d5d9de" : "var(--border-strong)"};
}

.sc-glance-row.sc-glance-row--ref:hover {
  background: ${isLight ? "var(--panel)" : "var(--surface-2)"};
  border-color: ${isLight ? "var(--border-strong)" : "rgba(255, 255, 255, 0.16)"};
}

.sc-glance-row:focus-visible {
  outline: 2px solid var(--accent-line);
  outline-offset: 2px;
}

.sc-glance-layout {
  align-items: start;
  display: grid;
  gap: 0 12px;
  grid-template-columns: minmax(0, 1fr) minmax(200px, 30%);
  padding-top: 4px;
}

.sc-glance-brief-col {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  padding-right: 4px;
}

.sc-glance-insights-wrap {
  border-left: 1px solid ${divider};
  display: grid;
  gap: 8px 12px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-width: 0;
  padding-left: 14px;
}

.sc-glance-strength-col,
.sc-glance-needs-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sc-glance-needs-col {
  border-left: 1px solid ${divider};
  padding-left: 10px;
}

.sc-glance-header-bar {
  align-items: center;
  border-bottom: 1px solid ${divider};
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  justify-content: space-between;
  margin: 0 0 20px;
  padding: 0 0 16px;
  width: 100%;
}

.sc-glance-header-bar-start {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sc-glance-header-bar-links {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sc-glance-header-bar-end {
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px 12px;
  justify-content: flex-end;
  margin-left: auto;
}

.sc-glance-header-bar-hint {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.45;
  margin: 0;
  text-align: right;
  white-space: nowrap;
}

/* Track cards — 3-column glance layout (Design ScorecardV2 sc-glance-row--ref) */
.sc-glance-meta-badges {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sc-glance-meta-badge {
  appearance: none;
  background: ${isLight ? "#f4f6f8" : "var(--panel-inset)"};
  border: 1px solid ${isLight ? "#e4e8ec" : "var(--panel-border)"};
  border-radius: 999px;
  color: var(--text-2);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  padding: 6px 12px;
  transition: background 0.14s, border-color 0.14s, color 0.14s;
  white-space: nowrap;
}

.sc-glance-meta-badge:hover {
  border-color: color-mix(in srgb, var(--fuel-accent, #00B48A) 35%, var(--panel-border));
  color: var(--text-1);
}

.sc-glance-row.sc-glance-row--ref {
  align-items: stretch;
  background: ${isLight ? "var(--panel)" : "var(--surface-2)"};
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

.sc-glance-row--ref > .sc-glance-header-bar {
  align-items: center;
  background: color-mix(in srgb, var(--text-1) 2%, transparent);
  border-bottom: 1px solid var(--panel-border);
  margin: 0;
  padding: 14px 22px;
}

.sc-glance-row--ref .sc-glance-header-bar-end {
  align-items: center;
  flex-direction: row;
  gap: 12px;
}

.sc-glance-header-bar-answered {
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
}

.sc-glance-header-bar .sc-glance-details-link {
  appearance: none;
  background: none;
  border: none;
  color: var(--fuel-accent, #00B48A);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 0;
  white-space: nowrap;
}

.sc-glance-header-bar .sc-glance-details-link:hover {
  text-decoration: underline;
}

.sc-glance-header-bar .sc-glance-details-link:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--accent-line);
  outline-offset: 2px;
}

.sc-glance-row--ref .sc-glance-track-body {
  align-items: stretch;
  display: grid;
  gap: 0;
  grid-template-columns: minmax(300px, 1.15fr) minmax(220px, 1fr) minmax(240px, 0.95fr);
  min-height: 188px;
}

.sc-glance-row--ref .sc-glance-track-lead {
  align-items: flex-start;
  border-right: 1px solid var(--panel-border);
  display: flex;
  flex-direction: row;
  gap: 16px;
  justify-content: flex-start;
  min-width: 0;
  padding: 30px 20px 22px;
}

.sc-glance-row--ref .sc-glance-track-lead-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  min-width: 0;
  padding-top: 4px;
}

.sc-glance-row--ref .sc-glance-track-title-link {
  color: var(--text-1);
  display: block;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
  margin: 0;
  overflow-wrap: break-word;
}

.sc-glance-row--ref .sc-glance-track-focus {
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  color: var(--text-2);
  display: -webkit-box;
  font-size: 12.5px;
  line-height: 1.5;
  margin: 0;
  overflow: hidden;
  overflow-wrap: break-word;
  white-space: normal;
}

.sc-glance-row--ref .sc-glance-track-focus.is-truncated {
  cursor: help;
}

.sc-glance-row--ref .sc-glance-track-focus:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--accent-line);
  outline-offset: 2px;
}

.sc-glance-row--ref .sc-glance-ring-wrap--ref {
  flex-shrink: 0;
  height: auto;
  padding-top: 4px;
  width: 88px;
}

.sc-glance-row--ref .sc-glance-ring-wrap--ref .sc-glance-ring-trigger,
.sc-glance-row--ref .sc-glance-ring-wrap--ref .sc-glance-ring-svg-wrap {
  height: 88px;
  width: 88px;
}

.sc-glance-row--ref .sc-glance-ring-wrap--ref .sc-glance-ring-label strong {
  font-size: 22px;
}

.sc-glance-row--ref .sc-glance-ring-status {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.2;
  margin-top: 6px;
  max-width: 88px;
  text-align: center;
}

.sc-glance-row--ref .sc-glance-track-mid {
  border-right: 1px solid var(--panel-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: flex-start;
  min-width: 0;
  padding: 30px 20px 22px;
}

.sc-glance-row--ref .sc-glance-track-improve-panel {
  background: var(--status-watch-dim);
  border-left: 1px solid var(--status-watch-line);
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: flex-start;
  min-width: 0;
  padding: 30px 20px 22px;
}

.sc-glance-row--ref .sc-glance-track-improve-panel .sc-glance-insight-block.is-compact {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.sc-glance-row--ref .sc-glance-insight-block.is-compact .sc-cat-sw-list {
  gap: 8px;
  list-style: none;
  padding-left: 0;
}

.sc-glance-row--ref .sc-glance-insight-block.is-compact .sc-cat-sw-list li {
  align-items: flex-start;
  column-gap: 8px;
  display: grid;
  grid-template-columns: 6px minmax(0, 1fr);
  list-style: none;
  padding-left: 0;
}

.sc-glance-row--ref .sc-glance-insight-block.is-compact .sc-cat-sw-list li::before {
  background: var(--status-good);
  border-radius: 999px;
  content: "";
  grid-row: 1 / span 2;
  height: 6px;
  margin-top: 6px;
  width: 6px;
}

.sc-glance-row--ref .sc-glance-track-improve-panel .sc-glance-insight-block.is-compact .sc-cat-sw-list li::before {
  background: var(--status-watch);
}

.sc-glance-row--ref .sc-glance-insight-label.sc-cat-tone-strong {
  color: var(--status-good);
}

.sc-glance-row--ref .sc-glance-track-improve-panel .sc-glance-insight-label.sc-cat-tone-weak {
  color: var(--status-watch);
}

.sc-glance-row--ref .sc-glance-insight-block.is-compact .sc-cat-sw-list li strong {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  grid-column: 2;
  line-height: 1.35;
}

.sc-glance-row--ref .sc-glance-insight-block.is-compact .sc-cat-sw-list li em {
  display: none;
}

.sc-glance-row--ref .sc-glance-insight-block.is-compact .sc-cat-sw-list li.is-locked-blur {
  filter: blur(4px);
  opacity: 0.5;
  pointer-events: none;
  user-select: none;
}

.sc-glance-insight-more-count {
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  margin: 8px 0 0;
}

.sc-glance-row--ref .sc-glance-insight-more-count {
  padding-left: 14px;
}

.sc-glance-complete-profile-btn {
  align-items: center;
  align-self: stretch;
  background: ${isLight ? "var(--panel)" : "var(--surface-2)"};
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  color: var(--text-2);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  gap: 8px;
  justify-content: center;
  margin-top: auto;
  padding: 10px 14px;
  transition: border-color 0.14s, color 0.14s;
  width: 100%;
}

.sc-glance-complete-profile-btn:hover {
  border-color: var(--fuel-accent, #00B48A);
  color: var(--text-1);
}

.sc-glance-complete-profile-btn:focus-visible {
  outline: 2px solid var(--accent-line);
  outline-offset: 2px;
}

.sc-glance-insights-col {
  border-left: 1px solid ${divider};
  display: flex;
  flex-direction: column;
  gap: 18px;
  justify-content: center;
  min-width: 0;
  padding-left: 28px;
}

.sc-glance-insight-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sc-glance-insight-block.is-compact {
  gap: 8px;
}

.sc-glance-insight-block.is-compact .sc-glance-insight-label {
  font-size: 10.5px;
  letter-spacing: 0.08em;
  line-height: 1.3;
}

.sc-glance-insight-block.is-compact .sc-cat-sw-list {
  font-size: 11.5px;
  gap: 12px;
  padding-left: 1.05em;
}

.sc-glance-insight-block.is-compact .sc-cat-sw-list li {
  padding-bottom: 2px;
}

.sc-glance-insight-block.is-compact .sc-cat-sw-list li strong {
  display: block;
  font-size: 11.5px;
  line-height: 1.45;
  margin-bottom: 4px;
}

.sc-glance-insight-block.is-compact .sc-cat-sw-list li em {
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  display: -webkit-box;
  font-size: 10px;
  line-height: 1.5;
  margin-top: 0;
  overflow: hidden;
}

.sc-glance-insight-block.is-compact .sc-cat-sw-list li.sc-cat-sw-more strong {
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
}

.sc-glance-insight-block.is-compact .sc-cat-sw-empty {
  font-size: 11px;
  line-height: 1.4;
}

.sc-glance-insight-more-btn {
  align-self: flex-start;
  background: none;
  border: 0;
  color: var(--accent, #3dd68c);
  cursor: pointer;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.4;
  padding: 0;
  transition: color 0.14s, opacity 0.14s;
}

.sc-glance-insight-more-btn:hover {
  color: ${isLight ? "var(--status-good)" : "#3fe0a4"};
  opacity: 1;
}

.sc-glance-insight-more-btn span {
  color: inherit;
  display: inline-block;
  margin-left: 2px;
}

.sc-glance-insight-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
${
  isLight
    ? `
.sc-glance-insight-label,
.sc-glance-insight-label.sc-cat-tone-strong,
.sc-glance-insight-label.sc-cat-tone-weak,
.sc-glance-insight-label.sc-cat-tone-above,
.sc-glance-insight-label.sc-cat-tone-watch {
  background: transparent;
  border: 0;
  color: #6b7c8c;
  font-weight: 650;
  letter-spacing: 0.07em;
}

.sc-glance-ring-status {
  font-weight: 600;
}

.sc-glance-ring circle:first-of-type {
  stroke: #e8eaed;
}

.sc-glance-ring-label strong {
  font-weight: 700;
}
`
    : ""
}

.sc-glance-insight-text {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.sc-glance-actions-title {
  color: var(--text-3);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

/* legacy — kept for reference if action list returns */
.sc-glance-action-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.sc-glance-action-item {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) auto;
}

.sc-glance-action-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sc-glance-action-body strong {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.sc-glance-action-body p {
  color: var(--text-3);
  font-size: 11.5px;
  line-height: 1.45;
  margin: 0;
}

.sc-glance-ring-wrap--lead {
  align-self: flex-start;
  border: 0;
  min-width: 88px;
  padding: 0;
}

.sc-glance-ring-wrap--lead .sc-glance-ring-status {
  font-size: 11px;
  /* Fixed width so two-word labels (Around Median, Needs Attention) wrap like Design */
  max-width: 88px;
  width: 88px;
}

.sc-glance-ring-wrap--lead .sc-glance-ring-svg-wrap {
  height: 88px;
  width: 88px;
}

.sc-glance-ring-wrap--lead .sc-glance-ring-label strong {
  font-size: 30px;
}

.sc-glance-ring-trigger {
  cursor: pointer;
  position: relative;
  transition: opacity 0.14s;
}

.sc-glance-ring-trigger:hover,
.sc-glance-ring-trigger.is-open {
  opacity: 1;
}

.sc-glance-ring-trigger:focus-visible {
  border-radius: 999px;
  outline: 2px solid var(--accent-line);
  outline-offset: 3px;
}

/* Track-health score breakdown popover (Design ScoreHealthPopover) */
.sc-cat-popover {
  background: var(--surface-1, #0E1A26);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.55);
  color: var(--text-1);
  left: 0;
  padding: 14px 16px;
  position: absolute;
  top: calc(100% + 12px);
  width: 340px;
  z-index: 40;
}
.sc-cat-popover::before {
  border: 6px solid transparent;
  border-bottom-color: var(--border-strong, rgba(255, 255, 255, 0.14));
  content: "";
  left: var(--sc-pop-arrow-x, 54px);
  position: absolute;
  top: -12px;
  transform: translateX(-50%);
}
.sc-cat-pop-head {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.sc-cat-pop-eyebrow {
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.sc-cat-pop-score {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.sc-cat-pop-score i {
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  opacity: 0.6;
}
.sc-cat-pop-explain {
  color: var(--text-3);
  font-size: 11.5px;
  line-height: 1.5;
  margin: 0 0 10px;
}
.sc-cat-pop-state {
  color: var(--text-3);
  font-size: 12px;
  margin: 0 0 10px;
}
.sc-cat-pop-state.is-error {
  color: var(--status-bad, #e38a8a);
}
.sc-cat-pop-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.sc-cat-pop-rows-stacked {
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 2px;
}
.sc-cat-pop-block {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
}
.sc-cat-pop-block.is-top-priority {
  border-color: rgba(201, 95, 95, 0.35);
  box-shadow: inset 3px 0 0 rgba(201, 95, 95, 0.55);
}
.sc-cat-pop-block-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.sc-cat-pop-source {
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  text-transform: uppercase;
}
.sc-cat-pop-source.is-benchmark {
  background: var(--status-watch-dim);
  color: var(--status-watch);
}
.sc-cat-pop-source.is-profile,
.sc-cat-pop-source.is-detail {
  background: var(--status-good-dim);
  color: var(--status-good);
}
.sc-cat-pop-block-weight {
  color: var(--text-3);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.sc-cat-pop-block-title {
  color: var(--text-1);
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 3px;
}
.sc-cat-pop-block-meta {
  align-items: baseline;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin-bottom: 4px;
}
.sc-cat-pop-block-val {
  color: var(--text-2);
  flex: 1;
  font-size: 11px;
  line-height: 1.4;
  min-width: 0;
}
.sc-cat-pop-block-score {
  flex-shrink: 0;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.sc-cat-pop-impact {
  color: var(--text-3);
  font-size: 10.5px;
  line-height: 1.45;
  margin: 0;
}
.sc-cat-pop-total {
  align-items: baseline;
  border-top: 1px solid var(--border);
  color: var(--text-2);
  display: flex;
  font-size: 11.5px;
  gap: 8px;
  justify-content: flex-end;
  margin-bottom: 8px;
  padding-top: 8px;
}
.sc-cat-pop-total strong {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.sc-cat-pop-total-note {
  color: var(--text-3);
  font-size: 10px;
}
.sc-cat-pop-foot {
  border-top: 1px solid var(--border);
  color: var(--text-3);
  display: flex;
  font-size: 11px;
  justify-content: space-between;
  padding-top: 8px;
}
.sc-cat-pop-conf {
  font-weight: 700;
}

.sc-glance-ring-trigger .sc-glance-score-popover {
  left: auto;
  right: 0;
  top: calc(100% + 10px);
  width: min(380px, calc(100vw - 48px));
  z-index: 50;
}

.sc-glance-ring-trigger .sc-glance-score-popover.is-fixed {
  z-index: 1000;
}

.sc-glance-score-popover.is-fixed {
  display: flex;
  flex-direction: column;
  max-height: min(480px, calc(100vh - 24px));
  overflow: hidden;
}

.sc-glance-score-popover.is-fixed .sc-cat-pop-rows-stacked {
  flex: 1 1 auto;
  max-height: min(320px, calc(100vh - 210px));
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.sc-glance-score-popover.is-fixed .sc-cat-pop-explain,
.sc-glance-score-popover.is-fixed .sc-cat-pop-state {
  flex-shrink: 0;
}

.sc-glance-score-popover.is-fixed .sc-cat-pop-head,
.sc-glance-score-popover.is-fixed .sc-cat-pop-total,
.sc-glance-score-popover.is-fixed .sc-cat-pop-foot {
  flex-shrink: 0;
}

.sc-glance-ring-trigger .sc-glance-score-popover.is-above {
  top: auto;
  bottom: calc(100% + 10px);
}

.sc-glance-score-popover.is-fixed.is-above::before {
  border-bottom-color: transparent;
  border-top-color: var(--border-strong, rgba(255, 255, 255, 0.14));
  bottom: -12px;
  left: var(--sc-pop-arrow-x, 44px);
  top: auto;
  transform: translateX(-50%);
}

.sc-glance-ring-trigger .sc-glance-score-popover.is-above::before {
  border-bottom-color: transparent;
  border-top-color: var(--border-strong, rgba(255, 255, 255, 0.14));
  bottom: -12px;
  top: auto;
}

.sc-glance-ring-trigger .sc-glance-score-popover::before {
  left: auto;
  right: 38px;
  transform: none;
}

.sc-glance-score-popover.is-fixed::before {
  left: var(--sc-pop-arrow-x, 44px);
  right: auto;
  transform: translateX(-50%);
}

.sc-glance-ring-svg-wrap {
  height: 76px;
  position: relative;
  width: 76px;
}

.sc-glance-ring {
  display: block;
}

.sc-glance-ring-label {
  align-items: center;
  display: flex;
  inset: 0;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
  position: absolute;
}

.sc-glance-ring-label strong {
  font-size: 26px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
}

.sc-glance-ring-label span {
  display: none;
}

.sc-glance-ring-status {
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.25;
  max-width: 88px;
  text-align: center;
}

.sc-glance-id {
  align-items: flex-start;
  display: flex;
  gap: 22px;
  min-width: 0;
}

.sc-glance-ring-wrap {
  align-items: center;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 6px;
}

.sc-glance-icon {
  align-items: center;
  border: 1px solid;
  border-radius: 8px;
  display: flex;
  flex-shrink: 0;
  font-size: 14px;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.sc-glance-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding-top: 2px;
}

.sc-glance-name {
  align-items: baseline;
  color: var(--text-1);
  display: flex;
  flex-wrap: wrap;
  font-size: 15px;
  font-weight: 700;
  gap: 0;
  letter-spacing: -0.01em;
  line-height: 1.35;
  margin: 0;
}

.sc-glance-name-sep {
  color: var(--text-3);
  font-weight: 700;
  margin: 0 7px;
}

.sc-glance-name-arrow {
  color: var(--text-3);
  font-weight: 700;
  margin-left: 8px;
  transition: color 0.14s, transform 0.14s;
}

.sc-glance-row:hover .sc-glance-name-arrow {
  color: var(--accent);
  transform: translateX(2px);
}

.sc-glance-metrics {
  color: var(--text-3);
  font-size: 12.5px;
  line-height: 1.55;
  margin: 0;
}

.sc-glance-focus {
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-2);
  display: -webkit-box;
  /* Match Fuel AI advisor summary (.sc-adv-featured .sc-adv-summary) */
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  max-width: none;
  overflow: hidden;
}

.sc-glance-details-btn.is-priority {
  border-color: ${isLight ? "var(--border-strong)" : "rgba(61, 214, 140, 0.45)"};
  color: ${isLight ? "var(--text-1)" : "var(--accent)"};
  font-weight: ${isLight ? "500" : "600"};
}

.sc-glance-details-btn.is-priority:hover {
  background: ${isLight ? "rgba(18, 184, 134, 0.08)" : "rgba(63, 214, 140, 0.08)"};
  border-color: var(--accent-line);
  color: var(--accent);
}

.sc-glance-answers-btn {
  align-self: flex-start;
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-2);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  padding: 6px 10px;
  transition: background 0.14s, border-color 0.14s, color 0.14s;
}

.sc-glance-answers-btn:hover {
  background: rgba(61, 214, 140, 0.08);
  border-color: var(--accent-line);
  color: var(--accent);
}

.sc-glance-answers-btn-meta {
  color: var(--text-3);
  font-weight: 500;
}

.sc-glance-answers-btn.is-empty {
  border-color: rgba(212, 168, 106, 0.35);
}

.sc-glance-answers-btn.is-almost {
  border-color: rgba(61, 214, 140, 0.35);
}

.sc-glance-answers-btn.is-complete {
  border-color: rgba(61, 214, 140, 0.22);
  color: var(--text-3);
}

.sc-glance-answers-btn.is-complete:hover {
  color: var(--accent);
}

.sc-glance-bar-head {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  margin-top: 12px;
}

@media (max-width: 1080px) {
  .sc-glance-layout {
    gap: 12px 10px;
    grid-template-areas:
      "brief"
      "insights";
    grid-template-columns: minmax(0, 1fr);
  }

  .sc-glance-brief-col {
    grid-area: brief;
    padding-right: 0;
  }

  .sc-glance-insights-wrap {
    border-left: 0;
    border-top: 1px solid ${divider};
    grid-area: insights;
    max-width: none;
    padding-left: 0;
    padding-top: 12px;
    width: 100%;
  }

  .sc-adv-featured.sc-adv-featured-split {
    grid-template-columns: 1fr;
  }

  .sc-adv-featured-rec-col {
    border-left: 0;
    border-top: 1px solid ${divider};
  }
}

@media (max-width: 1100px) {
  .sc-glance-row--ref .sc-glance-track-body {
    grid-template-columns: 1fr 1fr;
  }

  .sc-glance-row--ref .sc-glance-track-improve-panel {
    border-left: 0;
    border-top: 1px solid var(--status-watch-line);
    grid-column: 1 / -1;
  }
}

@media (max-width: 960px) {
  .sc-glance-row.sc-glance-row--ref {
    padding: 0;
  }

  .sc-glance-row--ref .sc-glance-track-body {
    grid-template-columns: 1fr;
  }

  .sc-glance-row--ref .sc-glance-track-lead,
  .sc-glance-row--ref .sc-glance-track-mid {
    border-right: 0;
    border-bottom: 1px solid var(--panel-border);
  }

  .sc-glance-row--ref > .sc-glance-header-bar {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .sc-glance-row--ref .sc-glance-header-bar-start,
  .sc-glance-row--ref .sc-glance-meta-badges {
    min-width: 0;
    width: 100%;
  }

  .sc-glance-row--ref .sc-glance-header-bar-end {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
    margin-left: 0;
    width: 100%;
  }

  .sc-glance-header-bar-answered,
  .sc-glance-header-bar .sc-glance-details-link {
    white-space: normal;
  }

  .sc-glance-meta-badges {
    justify-content: flex-start;
    max-width: none;
  }
}

/* ─── Category detail dashboard ─── */
.sc-cat-tone-above {
  color: ${isLight ? "var(--status-good)" : "#3fe0a4"};
}

.sc-cat-tone-watch {
  color: ${isLight ? "var(--status-watch)" : "#e5b544"};
}

.sc-cat-tone-weak {
  color: ${isLight ? "var(--status-bad)" : "#e38a8a"};
}

.sc-category-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sc-detail-dashboard {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.sc-category-detail-back {
  align-self: flex-start;
}

.sc-glance-row-detail {
  cursor: default;
}

.sc-glance-row-detail:hover {
  background: ${isLight ? "#ffffff" : "var(--surface-2)"};
  border-color: ${isLight ? "#e8eaed" : "var(--border)"};
  transform: none;
}

.sc-detail-hero-widget {
  margin: 0;
}

.sc-detail-hero {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  justify-content: space-between;
  padding: 0 22px 20px;
}

.sc-detail-hero-main {
  align-items: flex-start;
  display: flex;
  flex: 1 1 320px;
  gap: 16px;
  min-width: 0;
}

.sc-detail-context {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.5;
  margin: 8px 0 0;
}

.sc-glance-name-static .sc-glance-name-arrow {
  display: none;
}

.sc-detail-widget {
  background: var(--surface-2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px 18px;
  scroll-margin-top: 24px;
}

.sc-detail-widget-head {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  justify-content: space-between;
}

.sc-detail-widget-head-main {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  min-width: 0;
}

.sc-detail-widget-head-action {
  flex-shrink: 0;
}

.sc-detail-widget-head-link {
  background: transparent;
  border: 0;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 0;
  white-space: nowrap;
}

.sc-detail-widget-head-link:hover {
  text-decoration: underline;
}

.sc-detail-widget-title {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.sc-detail-widget-meta {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 500;
}

.sc-detail-widget-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.sc-detail-widget-foot {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin-top: 2px;
  padding-top: 10px;
}

.sc-detail-widgets-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.sc-detail-widget--span-6 {
  grid-column: span 6;
}

.sc-detail-widget--span-8 {
  grid-column: span 8;
}

.sc-detail-widget--span-12 {
  grid-column: span 12;
}

.sc-detail-playbook-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sc-detail-form-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sc-detail-form-row {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 10px;
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 12px;
  text-align: left;
  width: 100%;
}

.sc-detail-form-row.is-missing,
.sc-detail-form-row.is-concern,
.sc-detail-form-row.is-watch {
  background: transparent;
  border-color: var(--border);
}

.sc-detail-form-label {
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.35;
  text-transform: none;
}

.sc-detail-form-value {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.sc-detail-insights-action {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sc-detail-insights-section-label {
  color: var(--text-3);
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.sc-detail-insights-strip,
.sc-detail-strengths-strip {
  min-width: 0;
}

.sc-detail-strength-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sc-detail-strength-chip,
.sc-detail-insight-chip {
  align-items: center;
  background: var(--status-good-dim);
  border: 1px solid var(--status-good-line);
  border-radius: 999px;
  color: var(--status-good);
  display: inline-flex;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.2;
  max-width: min(260px, 100%);
  padding: 7px 12px;
  position: relative;
  text-transform: none;
}

.sc-detail-insight-chip-label {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-detail-insight-chip {
  cursor: help;
  outline: none;
}

.sc-detail-insight-chip.is-weak {
  background: var(--status-bad-dim);
  border-color: var(--status-bad-line);
  color: var(--status-bad);
}

.sc-category-detail-more {
  align-self: flex-start;
  margin-top: 2px;
}

.sc-category-detail-tab-link {
  align-self: flex-start;
  background: transparent;
  border: 0;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 0;
}

.sc-category-detail-tab-link:hover {
  text-decoration: underline;
}

.scorecard-drill-back-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-2);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 5px 12px;
  transition: border-color 0.14s, color 0.14s;
}

.scorecard-drill-back-btn:hover {
  border-color: var(--text-3);
  color: var(--text-1);
}

.scorecard-drill-intel {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.scorecard-drill-intel-row {
  align-items: center;
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 12px;
  padding: 11px 16px;
}

.scorecard-drill-intel-row.sc-detail-intel-btn {
  background: transparent;
  border-left: 0;
  border-right: 0;
  border-top: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background 0.12s ease;
  width: 100%;
}

.scorecard-drill-intel-row.sc-detail-intel-btn:hover,
.scorecard-drill-intel-row.sc-detail-intel-btn:focus-visible {
  background: var(--surface-3);
  outline: none;
}

.scorecard-drill-intel-row.sc-detail-intel-btn.is-selected {
  background: var(--accent-dim);
}

.scorecard-drill-intel-row:last-child {
  border-bottom: none;
}

.scorecard-drill-intel-cat {
  color: var(--accent);
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  width: 80px;
}

.scorecard-drill-intel-text {
  color: var(--text-1);
  flex: 1;
  font-size: 13px;
}

.scorecard-drill-pb-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  font: inherit;
  overflow: hidden;
  padding: 0;
  text-align: left;
  text-decoration: none;
  transition: border-color 0.14s, box-shadow 0.14s;
  width: 100%;
}

.scorecard-drill-pb-card:hover {
  border-color: var(--cat-col, var(--accent-line));
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
}

.scorecard-drill-pb-track-strip {
  border-radius: 0;
  flex-shrink: 0;
  opacity: 0.65;
  width: 3px;
}

.scorecard-drill-pb-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  padding: 14px 15px;
}

.scorecard-drill-pb-title {
  color: var(--text-1);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.scorecard-drill-pb-desc {
  color: var(--text-3);
  flex: 1;
  font-size: 11px;
  line-height: 1.4;
}

.scorecard-drill-pb-cta {
  font-size: 11px;
  font-weight: 600;
  margin-top: 3px;
}

.scorecard-drill-init-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 4px;
}

.scorecard-drill-init-row {
  align-items: flex-start;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-left: 3px solid var(--init-col, var(--accent));
  border-radius: 8px;
  display: flex;
  gap: 14px;
  padding: 14px 16px;
}

.scorecard-drill-init-title {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 4px;
}

.sc-detail-init-new-label {
  align-items: center;
  background: var(--accent-dim);
  border: 1px solid var(--accent-line);
  border-radius: 999px;
  color: var(--accent);
  display: inline-flex;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  margin-left: 8px;
  padding: 3px 7px;
  text-transform: uppercase;
  vertical-align: middle;
}

.scorecard-drill-init-desc {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.5;
}

.scorecard-drill-init-btn {
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-2);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  padding: 5px 12px;
  white-space: nowrap;
}

.scorecard-drill-init-btn:hover {
  border-color: var(--accent-line);
  color: var(--accent);
}

@media (max-width: 960px) {
  .sc-detail-widget--span-6,
  .sc-detail-widget--span-8 {
    grid-column: span 12;
  }
}

/* ─── Category detail dashboard spacing (Design PatriotPayJourney.css) ─── */
.sc-detail-dashboard .sc-scorecard-breadcrumb-row {
  margin-bottom: 2px;
}

.sc-detail-dashboard .sc-category-detail-back {
  margin-bottom: 2px;
}

.sc-detail-dashboard .sc-detail-hero-widget.sc-glance-row {
  padding: 14px 24px 26px;
}

.sc-detail-dashboard .sc-glance-header-bar {
  gap: 14px 18px;
  margin-bottom: 24px;
  padding-bottom: 18px;
}

.sc-detail-dashboard .sc-detail-hero {
  gap: 20px 32px;
  padding: 0 2px 4px;
}

.sc-detail-dashboard .sc-detail-hero-main {
  gap: 20px;
}

.sc-detail-dashboard .sc-glance-copy {
  gap: 14px;
}

.sc-detail-dashboard .sc-detail-context {
  margin-top: 10px;
}

.sc-detail-dashboard .sc-detail-widgets-grid {
  gap: 20px;
}

.sc-detail-dashboard .sc-detail-widget {
  gap: 14px;
  padding: 18px 20px 20px;
}

.sc-detail-dashboard .sc-detail-widget-body {
  gap: 14px;
}

.sc-detail-dashboard .sc-detail-insights-action {
  gap: 22px;
}

.sc-detail-dashboard .sc-detail-init-stack {
  gap: 14px;
}

.sc-detail-dashboard .sc-detail-context-panel {
  gap: 20px;
  margin-top: 0;
  padding: 22px 24px 24px;
}

.sc-detail-dashboard .sc-detail-context-head {
  padding-bottom: 18px;
}

.sc-detail-dashboard .sc-detail-context-split {
  gap: 24px 28px;
}

.sc-detail-dashboard .scorecard-drill-intel-row {
  padding: 13px 16px;
}

.sc-detail-dashboard .sc-detail-playbook-stack {
  gap: 12px;
}

.sc-detail-insights-action {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sc-detail-insights-section-label {
  color: var(--text-3);
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.sc-detail-insights-strip,
.sc-detail-strengths-strip {
  min-width: 0;
}

.sc-detail-strength-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sc-detail-strength-chip,
.sc-detail-insight-chip {
  align-items: center;
  background: var(--status-good-dim);
  border: 1px solid var(--status-good-line);
  border-radius: 999px;
  color: var(--status-good);
  display: inline-flex;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.2;
  max-width: min(260px, 100%);
  padding: 7px 12px;
  position: relative;
  text-transform: none;
}

.sc-detail-insight-chip-label {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sc-detail-insight-chip {
  cursor: help;
  outline: none;
}

.sc-detail-insight-chip.is-weak {
  background: var(--status-bad-dim);
  border-color: var(--status-bad-line);
  color: var(--status-bad);
}

.sc-detail-insight-chip:hover,
.sc-detail-insight-chip:focus-visible {
  border-color: var(--status-good);
  z-index: 5;
}

.sc-detail-insight-chip.is-weak:hover,
.sc-detail-insight-chip.is-weak:focus-visible {
  border-color: var(--status-bad);
}

.sc-detail-insight-tip {
  background: ${isLight ? "#1a2332" : "var(--panel)"};
  border: 1px solid ${isLight ? "rgba(26, 35, 50, 0.9)" : "var(--panel-border)"};
  border-radius: 10px;
  bottom: calc(100% + 8px);
  box-shadow: ${isLight ? "0 8px 24px rgba(26, 35, 50, 0.18)" : "0 8px 24px rgba(0, 0, 0, 0.35)"};
  color: ${isLight ? "#ffffff" : "var(--text-1)"};
  display: none;
  left: 0;
  max-width: min(280px, 70vw);
  min-width: 180px;
  padding: 10px 12px;
  pointer-events: none;
  position: absolute;
  white-space: normal;
  width: max-content;
  z-index: 20;
}

.sc-detail-insight-tip strong {
  color: ${isLight ? "#ffffff" : "var(--text-1)"};
  display: block;
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0;
  margin-bottom: 4px;
  text-transform: none;
}

.sc-detail-insight-tip em {
  color: ${isLight ? "rgba(255, 255, 255, 0.82)" : "var(--panel-body)"};
  display: block;
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: 1.45;
}

.sc-detail-insight-chip:hover .sc-detail-insight-tip,
.sc-detail-insight-chip:focus-visible .sc-detail-insight-tip {
  display: block;
}

.sc-detail-insights-empty {
  margin: 0 0 4px;
}

.scorecard-drill-init-body {
  flex: 1;
  min-width: 0;
}

.sc-detail-init-preview-btn {
  appearance: none;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: block;
  font: inherit;
  padding: 0;
  text-align: left;
  width: 100%;
}

.sc-detail-init-preview-btn:hover .scorecard-drill-init-title,
.sc-detail-init-preview-btn:focus-visible .scorecard-drill-init-title {
  color: var(--accent);
}

.sc-detail-init-preview-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

.sc-detail-init-milestones {
  color: var(--text-3);
  display: flex;
  flex-direction: column;
  font-size: 11.5px;
  gap: 4px;
  list-style: disc;
  margin: 8px 0 0;
  padding: 0 0 0 1.1em;
}

.sc-detail-init-milestones li {
  line-height: 1.35;
}

.sc-detail-init-reason-label {
  color: var(--text-3);
  font-weight: 600;
}

.sc-detail-init-seg {
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  gap: 16px;
  margin-bottom: 2px;
}

.sc-detail-init-seg-btn {
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--text-3);
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: -1px;
  padding: 0 0 8px;
  text-transform: uppercase;
  transition: border-color 0.14s, color 0.14s;
}

.sc-detail-init-seg-btn.is-active {
  border-bottom-color: var(--accent);
  color: var(--text-1);
}

.sc-detail-init-seg-btn.has-recs:not(.is-active) {
  color: rgb(155, 212, 188);
}

.sc-detail-init-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sc-detail-init-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sc-detail-init-group-label {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sc-detail-init-empty {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.45;
  margin: 0;
}

/* Your inputs context panel — Design PatriotPayJourney.css */
.sc-detail-context-panel {
  background: ${isLight ? "#ffffff" : "var(--panel)"};
  border: 1px solid ${isLight ? "#e8eaed" : "var(--panel-border)"};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 4px;
  padding: 20px 22px 22px;
  ${isLight ? "box-shadow: 0 1px 2px rgba(26, 35, 50, 0.03);" : ""}
}

.sc-detail-context-head {
  border-bottom: 1px solid ${isLight ? "#e8eaed" : "var(--border)"};
  padding-bottom: 14px;
}

.sc-detail-context-title {
  color: ${isLight ? "#6b7c8c" : "var(--text-2)"};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.sc-detail-context-sub {
  color: ${isLight ? "#6b7c8c" : "var(--text-3)"};
  font-size: 12px;
  line-height: 1.45;
  margin: 0;
  max-width: 52em;
}

.sc-detail-context-split {
  align-items: stretch;
  display: grid;
  gap: 20px 24px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sc-detail-context-form-block,
.sc-detail-context-bench-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.sc-detail-context-form-block {
  border-right: 1px solid ${isLight ? "#e8eaed" : "var(--border)"};
  padding-right: 24px;
}

.sc-detail-context-bench-block {
  padding-left: 2px;
}

.sc-detail-context-col-head {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  justify-content: space-between;
}

.sc-detail-context-col-head-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sc-detail-context-col-label {
  color: ${isLight ? "#1a2332" : "var(--text-1)"};
  font-size: 12px;
  font-weight: 600;
}

.sc-detail-context-col-meta {
  color: ${isLight ? "#6b7c8c" : "var(--text-3)"};
  font-size: 11px;
}

.sc-detail-context-col-btn {
  background: ${isLight ? "#ffffff" : "transparent"};
  border-color: ${isLight ? "#e8eaed" : "var(--border-strong)"};
  color: ${isLight ? "#5b6b7c" : "var(--text-2)"};
  flex-shrink: 0;
  font-size: 12px;
  padding: 6px 12px;
}

.sc-detail-context-col-btn:hover {
  background: ${isLight ? "var(--status-good-dim)" : "rgba(63,214,140,0.08)"};
  border-color: ${isLight ? "var(--status-good-line)" : "var(--accent-line)"};
  color: ${isLight ? "var(--status-good)" : "var(--accent)"};
}

.sc-detail-form-widget {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sc-detail-form-section-label {
  color: ${isLight ? "#6b7c8c" : "var(--text-3)"};
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.sc-detail-form-flagged {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sc-detail-form-flagged-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sc-detail-form-row {
  background: transparent;
  border: 1px solid ${isLight ? "#e8eaed" : "var(--border)"};
  border-radius: 10px;
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 12px;
  text-align: left;
  width: 100%;
}

.sc-detail-form-row.is-missing,
.sc-detail-form-row.is-concern,
.sc-detail-form-row.is-watch {
  background: transparent;
  border-color: ${isLight ? "#e8eaed" : "var(--border)"};
}

.sc-detail-form-row-head {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  justify-content: space-between;
}

.sc-detail-form-label {
  color: ${isLight ? "#5b6b7c" : "var(--text-2)"};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.35;
  text-transform: none;
}

.sc-detail-form-flag,
.sc-detail-form-flag.is-missing {
  background: var(--status-bad-dim);
  border: 1px solid var(--status-bad-line);
  border-radius: 999px;
  color: var(--status-bad);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  padding: 3px 8px;
  white-space: nowrap;
}

.sc-detail-form-flag.is-concern,
.sc-detail-form-flag.is-watch {
  background: var(--status-watch-dim);
  border-color: var(--status-watch-line);
  color: var(--status-watch);
}

.sc-detail-form-value {
  color: ${isLight ? "#1a2332" : "var(--text-1)"};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.sc-detail-form-ok-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sc-detail-form-ok-grid {
  display: grid;
  gap: 0;
  grid-template-columns: 1fr;
}

.sc-detail-form-ok-row {
  align-items: baseline;
  border-bottom: 1px solid ${isLight ? "#e8eaed" : "var(--border)"};
  display: grid;
  gap: 8px 12px;
  grid-template-columns: minmax(120px, 42%) 1fr;
  padding: 9px 0;
}

.sc-detail-form-ok-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.sc-detail-form-ok-label {
  color: ${isLight ? "#5b6b7c" : "var(--text-2)"};
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}

.sc-detail-form-ok-value {
  color: ${isLight ? "#1a2332" : "var(--text-1)"};
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.45;
  text-align: right;
}

.sc-detail-bench-gap-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sc-detail-bench-row {
  background: transparent;
  border: 1px solid ${isLight ? "#e8eaed" : "var(--border)"};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
}

.sc-detail-bench-row.is-gap {
  gap: 0;
  padding: 14px 14px 13px;
}

.sc-detail-bench-row.is-empty {
  opacity: 0.72;
}

.sc-detail-bench-row-head {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  justify-content: space-between;
}

.sc-detail-bench-label {
  color: ${isLight ? "#6b7c8c" : "var(--text-3)"};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.sc-detail-bench-meta {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sc-detail-bench-val {
  color: ${isLight ? "#1a2332" : "var(--text-1)"};
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.sc-detail-bench-pill {
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 2px 8px;
  text-transform: none;
}

.sc-detail-bench-pill.is-missing {
  background: var(--status-bad-dim);
  border-color: var(--status-bad-line);
  color: var(--status-bad);
}

.sc-detail-bench-ok {
  background: transparent;
  border: 1px solid ${isLight ? "#e8eaed" : "var(--border)"};
  border-radius: 10px;
  color: ${isLight ? "#5b6b7c" : "var(--text-3)"};
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
  padding: 14px 16px;
}

@media (max-width: 900px) {
  .sc-detail-context-split {
    grid-template-columns: 1fr;
  }

  .sc-detail-context-form-block {
    border-right: 0;
    border-bottom: 1px solid ${isLight ? "#e8eaed" : "var(--border)"};
    padding-right: 0;
    padding-bottom: 20px;
  }
}

/* ─── Edit benchmark drawer — pixel-matched to Design/PatriotPayJourney.css ─── */

@keyframes bench-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes bench-slide-in {
  from { transform: translateX(40px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.bench-bar-track {
  position: relative;
  height: 4px;
  background: var(--surface-3);
  border-radius: 2px;
}

.bench-bar-band {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(61, 214, 140, 0.28);
  border-radius: 2px;
}

.bench-bar-tick-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(61, 214, 140, 0.3);
}

.bench-bar-tick-line.is-strong {
  background: rgba(61, 214, 140, 0.45);
}

.bench-bar-dot {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  background: var(--accent);
  border: 2px solid var(--bg);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 8px rgba(63, 224, 164, 0.5);
  transition: left 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  z-index: 2;
  pointer-events: none;
}

.bench-bar-ticks {
  position: relative;
  height: 18px;
  margin-top: 10px;
}

.bench-bar-ticks span {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  color: var(--text-3);
  font-size: 10.5px;
  line-height: 1.2;
  white-space: nowrap;
}

@media (max-width: 480px) {

  .bench-bar-ticks span {
    font-size: 9.5px;
  }
}

/* ─── Add Intelligence Sources drawer (Design PatriotPayJourney.css) ─── */

/* ─── Overview / category loading skeletons ─── */
.sc-skel-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  width: 100%;
}

.sc-skel-stack-tight {
  gap: 6px;
  margin-top: 8px;
}

.sc-skel-focus-card {
  cursor: default;
  min-height: 76px;
  pointer-events: none;
}

.sc-skel-focus-card:hover,
.sc-skel-focus-card:focus-visible {
  box-shadow: none;
  transform: none;
}

.sc-skel-focus-ring {
  border-radius: 50%;
  flex-shrink: 0;
  height: 44px;
  width: 44px;
}

.sc-skel-toggle {
  cursor: default;
  pointer-events: none;
}

.sc-skel-rec-item {
  align-items: center;
}

.sc-skel-rec-num {
  opacity: 0.45;
}

.sc-skel-glance-row {
  cursor: default;
  pointer-events: none;
}

.sc-glance-row-skeleton {
  cursor: default;
  pointer-events: none;
}

.sc-glance-row-skeleton .sc-glance-copy {
  gap: 8px;
}

.sc-glance-row-skeleton .sc-glance-track-lead-copy {
  gap: 8px;
}

/* Open brief — full-page loading skeleton */
.sc-investor-brief-skeleton .sc-investor-brief-skel-facts {
  display: grid;
  gap: 8px 24px;
  grid-template-columns: auto 1fr;
  margin-top: 16px;
  max-width: 420px;
}

.sc-investor-brief-skel-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.sc-investor-brief-skel-table-row {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  width: 100%;
}

.sc-investor-brief-skel-roadmap {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 14px;
}

.sc-investor-brief-skel-pillar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

@media (max-width: 900px) {
  .sc-investor-brief-skel-roadmap {
    grid-template-columns: 1fr;
  }
}

.sc-skel-glance-row:hover {
  background: var(--surface-2);
  border-color: var(--border);
}

.sc-skel-ring {
  background: ${isLight ? "rgba(18, 184, 134, 0.06)" : "rgba(255, 255, 255, 0.06)"};
  border: 3px solid ${isLight ? "rgba(18, 184, 134, 0.16)" : "rgba(255, 255, 255, 0.1)"};
  border-radius: 50%;
  border-top-color: ${isLight ? "var(--status-good)" : "rgba(61, 214, 140, 0.45)"};
  box-sizing: border-box;
  flex-shrink: 0;
  height: 88px;
  width: 88px;
  animation: sc-skel-ring-pulse 1.35s ease-in-out infinite;
}

.sc-skel-ring-lg {
  height: 88px;
  width: 88px;
}

@keyframes sc-skel-ring-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.sc-overview-generating {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Overview build panel — Design PatriotPayJourney.css .sc-overview-build* + .overview-panel */
.overview-panel {
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  padding: 22px 24px;
}

.sc-overview-build {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 4px;
}

.sc-overview-build-top {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.sc-overview-build-eyebrow {
  color: var(--accent);
  display: block;
  font-size: 9.5px;
  font-weight: 900;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.sc-overview-build-title {
  color: var(--text-1);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 6px;
}

.sc-overview-build-copy {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  max-width: 640px;
}

.sc-overview-build-progress {
  background: ${isLight ? "var(--surface-3)" : "rgba(38, 57, 71, 0.85)"};
  border-radius: 999px;
  height: 4px;
  overflow: hidden;
}

.sc-overview-build-progress-fill {
  background: linear-gradient(90deg, ${t.accent}8C, ${t.accent});
  border-radius: inherit;
  height: 100%;
  position: relative;
  transition: width 0.6s ease;
}

/* Soft shimmer so a long stage still reads as “loading”, not stuck. */
.sc-overview-build-progress-fill.is-loading::after {
  animation: scOverviewBuildShimmer 1.6s ease-in-out infinite;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  bottom: 0;
  content: "";
  left: 0;
  position: absolute;
  top: 0;
  width: 45%;
}

.sc-overview-build-active {
  align-items: center;
  background: ${isLight ? "var(--surface-3)" : "rgba(10, 20, 28, 0.45)"};
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  display: flex;
  gap: 12px;
  min-height: 52px;
  padding: 12px 14px;
}

.sc-overview-build-pulse {
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 0 0 ${t.accent}73;
  flex-shrink: 0;
  height: 10px;
  width: 10px;
  animation: scOverviewBuildPulse 1.4s ease-out infinite;
}

.sc-overview-build-active-copy {
  min-width: 0;
}

.sc-overview-build-active-copy strong {
  color: var(--text-1);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}

@keyframes scOverviewBuildPulse {
  0% { box-shadow: 0 0 0 0 ${t.accent}73; }
  70% { box-shadow: 0 0 0 10px ${t.accent}00; }
  100% { box-shadow: 0 0 0 0 ${t.accent}00; }
}

@keyframes scOverviewBuildShimmer {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(280%); }
}

@media (max-width: 720px) {
  .sc-overview-build-top {
    align-items: stretch;
    flex-direction: column;
  }
}

/* Summary title row + wiki actions (Design ScorecardV2) */
.sc-adv-rec-title-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  margin: 0 0 12px;
}

.sc-adv-rec-title-row .sc-adv-rec-title {
  margin: 0;
}

.sc-wiki-source-count {
  color: var(--text-3);
  font-family: ${t.mono};
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sc-wiki-expand-btn {
  margin-left: auto;
  white-space: nowrap;
}

/* Design: .ask-ai-btn + .sc-wiki-expand-btn.ask-ai-btn (teal → gold CTA) */
.sc-wiki-expand-btn.ask-ai-btn {
  align-items: center;
  background: ${openBriefGradient};
  border: none;
  border-radius: 7px;
  color: ${openBriefInk};
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  gap: 7px;
  letter-spacing: 0;
  padding: 6px 11px;
  text-transform: none;
}

.sc-wiki-expand-btn.ask-ai-btn:hover {
  background: ${openBriefHoverGradient};
  border: none;
  color: ${openBriefInk};
  opacity: 0.92;
}

.sc-wiki-summary-compact {
  line-height: 1.6;
}

.sc-wiki-summary-overlay {
  align-items: flex-start;
  background: ${isLight ? "rgba(26, 35, 50, 0.28)" : "color-mix(in srgb, var(--bg) 72%, transparent)"};
  display: flex;
  inset: 0;
  justify-content: center;
  overflow: auto;
  padding: 24px;
  position: fixed;
  z-index: 1200;
}

.sc-wiki-summary-panel {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: ${isLight ? "0 16px 40px rgba(26, 35, 50, 0.12)" : "0 24px 64px rgba(0, 0, 0, 0.35)"};
  max-width: 720px;
  width: 100%;
}

.sc-wiki-summary-head {
  align-items: flex-start;
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 20px 24px 16px;
}

.sc-wiki-summary-eyebrow {
  color: var(--accent);
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.sc-wiki-summary-head h2 {
  color: var(--text-1);
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 6px 0 0;
}

.sc-wiki-summary-head p {
  color: var(--text-3);
  font-size: 12.5px;
  margin: 6px 0 0;
}

.sc-wiki-summary-close {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-2);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  height: 32px;
  line-height: 1;
  width: 32px;
}

.sc-wiki-summary-close:hover {
  background: var(--surface-3);
  color: var(--text-1);
}

.sc-wiki-summary-body {
  color: var(--text-1);
  font-size: 14px;
  line-height: 1.65;
  padding: 20px 24px 24px;
}

.sc-wiki-summary-body p {
  margin: 0 0 14px;
}

.sc-wiki-summary-meta {
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 12px;
  margin-top: 8px;
  padding-top: 14px;
}

/* Full summary / investor brief — Design PatriotPayJourney.css */
.sc-scorecard-breadcrumb-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  justify-content: space-between;
  width: 100%;
}

.sc-scorecard-breadcrumb {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.sc-scorecard-breadcrumb-link {
  background: transparent;
  border: 0;
  color: ${isLight ? "var(--status-good)" : "var(--fuel-accent)"};
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  padding: 0;
}

.sc-scorecard-breadcrumb-link:hover {
  text-decoration: underline;
}

.sc-scorecard-breadcrumb-sep {
  color: var(--panel-muted);
  font-size: 13px;
}

.sc-scorecard-breadcrumb-current {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.sc-scorecard-breadcrumb-actions {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.sc-investor-brief {
  color: var(--text-1);
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: none;
  padding-bottom: 32px;
  width: 100%;
}

.sc-investor-brief-document {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
}

.sc-investor-brief-chrome {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.sc-investor-brief-print {
  background: var(--btn-primary-bg);
  border: 1px solid var(--btn-primary-border);
  border-radius: 8px;
  color: var(--btn-primary-text);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 14px;
}

.sc-investor-brief-print:hover {
  filter: brightness(1.05);
}

.sc-investor-brief-masthead {
  align-items: flex-start;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 18px 22px;
}

.sc-investor-brief-masthead-brand {
  align-items: center;
  display: flex;
  gap: 12px;
}

.sc-investor-brief-logo {
  align-items: center;
  background: var(--accent-dim);
  border: 1px solid var(--accent-line);
  border-radius: 8px;
  color: var(--fuel-accent);
  display: inline-flex;
  font-size: 14px;
  font-weight: 800;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.sc-investor-brief-masthead-brand strong,
.sc-investor-brief-masthead-meta strong {
  color: var(--text-1);
  display: block;
  font-size: 13px;
  font-weight: 800;
}

.sc-investor-brief-masthead-brand em,
.sc-investor-brief-masthead-meta em {
  color: var(--panel-muted);
  display: block;
  font-size: 12px;
  font-style: normal;
  margin-top: 2px;
}

.sc-investor-brief-masthead-meta {
  text-align: right;
}

.sc-investor-brief-page-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sc-investor-brief-title {
  color: var(--text-1);
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin: 0;
}

.sc-investor-brief-block {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 22px;
}

.sc-investor-brief-h3 {
  color: var(--text-1);
  font-size: 16px;
  font-weight: 800;
  margin: 0;
}

.sc-investor-brief-analysis-label {
  color: var(--panel-muted);
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  margin: -4px 0 0;
  text-transform: uppercase;
}

.sc-investor-brief-body {
  color: var(--panel-body);
  font-size: 14px;
  line-height: 1.65;
  margin: 0;
  max-width: none;
  width: 100%;
}

.sc-investor-brief-profile-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sc-investor-brief-profile-field .sc-investor-brief-analysis-label {
  margin: 0;
}

.sc-investor-brief-profile-field .sc-investor-brief-body {
  margin: 0;
}

.sc-investor-brief-source-note {
  color: var(--panel-muted);
  font-size: 12px;
  line-height: 1.45;
  margin: -4px 0 0;
}

.sc-investor-brief-empty {
  color: var(--panel-muted);
  font-size: 13px;
  margin: 0;
}

.sc-investor-brief-facts {
  display: grid;
  gap: 8px 20px;
  grid-template-columns: minmax(120px, 180px) minmax(0, 1fr);
  margin: 0;
}

.sc-investor-brief-facts dt {
  color: var(--panel-muted);
  font-size: 12px;
  font-weight: 700;
}

.sc-investor-brief-facts dd {
  color: var(--text-1);
  font-size: 13px;
  line-height: 1.45;
  margin: 0;
}

.sc-investor-brief-table-wrap {
  overflow-x: auto;
}

.sc-investor-brief-table {
  border-collapse: collapse;
  min-width: 720px;
  width: 100%;
}

.sc-investor-brief-table th,
.sc-investor-brief-table td {
  border-bottom: 1px solid var(--panel-border);
  font-size: 13px;
  padding: 12px 10px;
  text-align: left;
  vertical-align: middle;
}

.sc-investor-brief-table th {
  color: var(--panel-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: none;
}

.sc-investor-brief-table td {
  color: var(--panel-body);
}

.sc-investor-brief-table td:first-child {
  color: var(--text-1);
  font-weight: 600;
}

.sc-investor-brief-you {
  font-weight: 800;
}

.sc-investor-brief-band {
  align-items: center;
  color: var(--panel-body);
  display: inline-flex;
  gap: 6px;
  white-space: nowrap;
}

.sc-investor-brief-band--top,
.sc-investor-brief-band--upper {
  color: var(--status-good);
}

.sc-investor-brief-band--lower,
.sc-investor-brief-band--bottom {
  color: var(--status-bad);
}

.sc-investor-brief-band--mid {
  color: var(--status-watch);
}

.sc-investor-brief-check {
  color: var(--status-good);
  font-size: 12px;
  font-weight: 800;
}

.sc-investor-brief-cohort-note {
  color: var(--panel-muted);
  font-size: 12px;
  margin: 0;
}

.sc-investor-brief-focus {
  display: flex;
  flex-direction: column;
  gap: 14px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.sc-investor-brief-focus li {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sc-investor-brief-focus strong {
  color: var(--text-1);
  font-size: 14px;
  font-weight: 800;
}

.sc-investor-brief-focus span {
  color: var(--panel-body);
  font-size: 13.5px;
  line-height: 1.6;
  max-width: none;
  width: 100%;
}

.sc-investor-brief-notes-table {
  min-width: 0;
}

.sc-investor-brief-initiatives {
  gap: 16px;
}

.sc-investor-brief-roadmap-board {
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-x: auto;
  padding: 20px 22px 24px;
}

/* Avoid double panel chrome when roadmap sits inside a brief section */
.sc-investor-brief-block .sc-investor-brief-roadmap-board.overview-panel {
  --roadmap-board-bg: var(--panel-inset);
  background: var(--panel-inset);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: 16px 18px 20px;
}

.sc-investor-brief-block .sc-investor-brief-roadmap {
  --roadmap-board-bg: var(--panel-inset);
}

.sc-investor-brief-roadmap-legend {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  justify-content: flex-start;
}

.sc-investor-brief-roadmap-legend-item {
  align-items: center;
  color: var(--panel-muted);
  display: inline-flex;
  font-size: 10.5px;
  font-weight: 800;
  gap: 7px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sc-investor-brief-roadmap-legend-item::before {
  border-radius: 50%;
  content: "";
  height: 8px;
  width: 8px;
}

.sc-investor-brief-roadmap-legend-item.is-blind::before {
  background: var(--status-bad);
}

.sc-investor-brief-roadmap-legend-item.is-thin::before {
  background: var(--status-watch);
}

.sc-investor-brief-roadmap-legend-item.is-healthy::before {
  background: var(--status-good);
}

.sc-investor-brief-roadmap {
  --pillar-col-w: 300px;
  --pillar-gap: 20px;
  --roadmap-board-bg: var(--panel);
  display: grid;
  gap: var(--pillar-gap);
  grid-template-columns: repeat(3, var(--pillar-col-w));
  justify-content: start;
  margin-inline: 0;
  max-width: 100%;
  padding-top: 10px;
  position: relative;
  width: max-content;
}

.sc-investor-brief-roadmap-topline {
  background: var(--panel-border);
  height: 1px;
  left: calc(var(--pillar-col-w) / 2);
  pointer-events: none;
  position: absolute;
  top: 16px;
  width: calc(2 * (var(--pillar-col-w) + var(--pillar-gap)));
  z-index: 0;
}

.sc-investor-brief-pillar-col {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: var(--pillar-col-w);
  min-width: 0;
  position: relative;
  width: 100%;
  z-index: 1;
}

.sc-investor-brief-pillar-cap {
  align-items: center;
  display: flex;
  flex-direction: column;
}

.sc-investor-brief-pillar-dot {
  background: var(--pillar-col, var(--fuel-accent));
  border: 3px solid var(--roadmap-board-bg, var(--panel));
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--pillar-col, var(--fuel-accent));
  height: 12px;
  width: 12px;
  z-index: 2;
}

.sc-investor-brief-pillar-drop {
  background: var(--panel-border);
  height: 14px;
  width: 2px;
}

.sc-investor-brief-pillar-card {
  background: var(--panel-inset);
  border: 1px solid var(--panel-border);
  border-top: 3px solid var(--status-good);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  width: 100%;
}

.sc-investor-brief-pillar-title-pill {
  align-self: flex-start;
  background: transparent;
  border: 0;
  border-radius: 0;
  color: var(--text-1);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.35;
  max-width: 100%;
  padding: 0;
}

.sc-investor-brief-pillar-card-desc {
  color: var(--panel-body);
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.sc-investor-brief-pillar-card-meta {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.sc-investor-brief-pillar-count {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.sc-investor-brief-pillar-coverage {
  border: 1px solid var(--panel-border);
  border-radius: 4px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  text-transform: uppercase;
  white-space: nowrap;
}

.sc-investor-brief-pillar-coverage.is-blind {
  background: var(--status-bad-dim);
  border: 1px solid var(--status-bad-line);
  color: var(--status-bad);
}

.sc-investor-brief-pillar-coverage.is-thin {
  background: var(--status-watch-dim);
  border: 1px solid var(--status-watch-line);
  color: var(--status-watch);
}

.sc-investor-brief-pillar-coverage.is-healthy {
  background: var(--status-good-dim);
  border: 1px solid var(--status-good-line);
  color: var(--status-good);
}

.sc-investor-brief-pillar-card-footer {
  border-top: 1px solid var(--panel-border);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 12px;
}

.sc-investor-brief-pillar-tag {
  background: var(--status-good-dim);
  border: 1px solid var(--status-good-line);
  border-radius: 4px;
  color: var(--status-good);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  text-transform: uppercase;
}

.sc-investor-brief-pillar-stack {
  align-items: center;
  display: flex;
  flex-direction: column;
  padding-top: 4px;
  position: relative;
  width: 100%;
}

.sc-investor-brief-pillar-stack::before {
  background: var(--panel-border);
  bottom: 8px;
  content: "";
  left: 50%;
  pointer-events: none;
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  width: 2px;
  z-index: 0;
}

.sc-investor-brief-pillar-stack.is-empty::before {
  bottom: auto;
  height: 18px;
}

.sc-investor-brief-pillar-empty {
  align-items: center;
  background: var(--panel-inset);
  border: 1px dashed var(--panel-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 14px;
  padding: 22px 16px;
  position: relative;
  text-align: center;
  width: 100%;
  z-index: 1;
}

.sc-investor-brief-pillar-empty strong {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.sc-investor-brief-pillar-empty span {
  color: var(--panel-muted);
  font-size: 12px;
}

.sc-investor-brief-roadmap-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
  width: 100%;
  z-index: 1;
}

.sc-investor-brief-roadmap-item {
  align-items: stretch;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  position: relative;
  width: 100%;
  z-index: 1;
}

.sc-investor-brief-roadmap-due-row {
  align-items: center;
  align-self: center;
  background: var(--roadmap-board-bg, var(--panel));
  display: inline-flex;
  gap: 8px;
  justify-content: center;
  padding: 2px 6px;
  position: relative;
  z-index: 2;
}

.sc-investor-brief-roadmap-due-row.is-undated {
  align-self: flex-start;
  justify-content: flex-start;
  padding-left: 0;
}

.sc-investor-brief-roadmap-due-pill {
  background: rgba(138, 153, 166, 0.16);
  border: 1px solid rgba(138, 153, 166, 0.28);
  border-radius: 999px;
  color: var(--panel-body);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  white-space: nowrap;
}

.sc-investor-brief-roadmap-due-row.is-undated .sc-investor-brief-roadmap-due-pill {
  background: transparent;
  border: 0;
  color: var(--panel-muted);
  font-weight: 600;
  padding: 0;
}

.sc-investor-brief-roadmap-due-context {
  color: var(--panel-muted);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.sc-investor-brief-init-card {
  background: var(--panel-inset);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  position: relative;
  width: 100%;
  z-index: 2;
}

.sc-investor-brief-init-card.is-done {
  background: color-mix(in srgb, var(--status-good) 12%, var(--panel-inset));
  border-color: var(--status-good-line);
}

.sc-investor-brief-init-card.is-paused,
.sc-investor-brief-init-card.is-suggested {
  background: color-mix(in srgb, var(--status-watch) 12%, var(--panel-inset));
  border-color: var(--status-watch-line);
}

.sc-investor-brief-init-card > strong {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.35;
}

.sc-investor-brief-init-card.is-done > strong {
  color: var(--text-1);
}

.sc-investor-brief-init-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sc-investor-brief-init-status,
.sc-investor-brief-init-pillar-tag {
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  text-transform: uppercase;
  white-space: nowrap;
}

.sc-investor-brief-init-status.is-active {
  background: var(--status-good-dim);
  border-color: var(--status-good-line);
  color: var(--status-good);
}

.sc-investor-brief-init-status.is-done {
  background: var(--status-good-dim);
  border-color: var(--status-good-line);
  color: var(--status-good);
}

.sc-investor-brief-init-status.is-suggested,
.sc-investor-brief-init-status.is-paused {
  background: var(--status-watch-dim);
  border-color: var(--status-watch-line);
  color: var(--status-watch);
}

.sc-investor-brief-init-pillar-tag {
  background: var(--status-good-dim);
  border-color: var(--status-good-line);
  color: var(--status-good);
}

.sc-investor-brief-init-card p {
  color: var(--panel-body);
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.sc-investor-brief-init-footer {
  align-items: center;
  border-top: 1px solid var(--panel-border);
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding-top: 8px;
}

.sc-investor-brief-init-footer em,
.sc-investor-brief-init-footer b {
  color: var(--panel-muted);
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
}

.sc-investor-brief-panel {
  margin: 0;
  padding: 22px 24px;
}

.sc-investor-brief-panel .overview-panel-head {
  margin-bottom: 14px;
}

.sc-investor-brief-panel .overview-panel-head h4 {
  color: var(--text-1);
  font-size: 14px;
  font-weight: 800;
  margin: 0;
}

.sc-investor-brief-init-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Light theme: cohesive slate pillars + roadmap (readable, not rainbow) */

@media (max-width: 1040px) {
  .sc-investor-brief-roadmap {
    grid-template-columns: repeat(2, minmax(0, var(--pillar-col-w)));
    width: 100%;
  }

  .sc-investor-brief-roadmap-topline {
    display: none;
  }
}

@media (max-width: 700px) {
  .sc-investor-brief-roadmap {
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
  }

  .sc-investor-brief-pillar-col {
    max-width: var(--pillar-col-w);
  }

  .sc-investor-brief-roadmap-due-row {
    flex-wrap: wrap;
  }
}

.sc-investor-brief-ops-block {
  container-name: brief-ops;
  container-type: inline-size;
}

.sc-investor-brief-ops {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sc-investor-brief-ops-group {
  background: var(--panel-inset);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  min-width: 0;
  padding: 14px 16px;
}

.sc-investor-brief-ops-group h4 {
  color: var(--fuel-accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  margin: 0 0 12px;
  text-transform: uppercase;
}

.sc-investor-brief-ops-grid {
  display: grid;
  gap: 12px 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sc-investor-brief-ops-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.sc-investor-brief-ops-label {
  color: var(--panel-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
}

.sc-investor-brief-ops-value {
  color: var(--panel-body);
  font-size: 13px;
  line-height: 1.45;
  margin: 0;
}

@container brief-ops (min-width: 900px) {
  .sc-investor-brief-ops-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.sc-investor-brief-intel,
.sc-investor-brief-docs {
  display: flex;
  flex-direction: column;
  gap: 12px;
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
}

.sc-investor-brief-intel li,
.sc-investor-brief-docs li {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sc-investor-brief-intel em,
.sc-investor-brief-docs em {
  color: var(--panel-muted);
  font-size: 10.5px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sc-investor-brief-intel strong,
.sc-investor-brief-docs strong {
  color: var(--text-1);
  font-size: 13.5px;
  font-weight: 700;
}

.sc-investor-brief-intel span {
  color: var(--panel-body);
  font-size: 13px;
  line-height: 1.5;
}

.sc-investor-brief-refs {
  color: var(--panel-body);
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 8px 0 0;
  padding-left: 18px;
}

.sc-investor-brief-refs li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sc-investor-brief-refs li.is-highlighted {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border-radius: 6px;
  margin-left: -8px;
  padding: 8px;
}

.sc-investor-brief-ref-btn {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 0;
  text-align: left;
}

.sc-investor-brief-ref-btn strong {
  color: var(--text-1);
  font-size: 13px;
}

.sc-investor-brief-refs span {
  color: var(--panel-muted);
  font-size: 12.5px;
  line-height: 1.45;
}

@media print {
  @page {
    margin: 0.55in;
  }

  html,
  body {
    background: #fff !important;
    color: #111 !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* Hide app shell; print only brief document (masthead → Sources). */
  body.fuel-print-brief aside {
    display: none !important;
  }

  body.fuel-print-brief > div {
    background: #fff !important;
    display: block !important;
    grid-template-columns: none !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    padding-right: 0 !important;
  }

  body.fuel-print-brief main {
    display: block !important;
    height: auto !important;
    max-width: 100% !important;
    min-height: 0 !important;
    overflow: visible !important;
    padding: 0 !important;
    width: 100% !important;
  }

  body.fuel-print-brief main > :not(:last-child) {
    display: none !important;
  }

  body.fuel-print-brief .company-page-chrome,
  body.fuel-print-brief .sc-investor-brief-chrome,
  body.fuel-print-brief .sc-investor-brief-print,
  body.fuel-print-brief .scorecard-drill-back-btn {
    display: none !important;
  }

  body.fuel-print-brief .fuel-overview,
  body.fuel-print-brief .sc-investor-brief,
  body.fuel-print-brief .sc-investor-brief-document {
    color: #111;
    display: flex !important;
    flex-direction: column;
    gap: 20px;
    height: auto !important;
    max-width: 100% !important;
    overflow: visible !important;
    padding: 0 !important;
    position: static !important;
    width: 100% !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body.fuel-print-brief .sc-investor-brief-document,
  body.fuel-print-brief .sc-investor-brief-document * {
    max-width: 100% !important;
    overflow: visible !important;
  }

  body.fuel-print-brief .sc-investor-brief-body,
  body.fuel-print-brief .sc-investor-brief-refs span,
  body.fuel-print-brief .sc-investor-brief-refs strong,
  body.fuel-print-brief .sc-investor-brief-ops-value {
    overflow-wrap: anywhere;
    white-space: normal !important;
    word-break: break-word;
  }

  /* Keep compact blocks together; allow tall Initiatives + Sources to paginate. */
  body.fuel-print-brief .sc-investor-brief-masthead,
  body.fuel-print-brief
    .sc-investor-brief-block:not(.sc-investor-brief-sources):not(
      .sc-investor-brief-initiatives
    ),
  body.fuel-print-brief .sc-investor-brief-ops-group,
  body.fuel-print-brief .sc-investor-brief-pillar-card,
  body.fuel-print-brief .sc-investor-brief-init-card,
  body.fuel-print-brief .sc-investor-brief-docs li {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  body.fuel-print-brief .sc-investor-brief-sources,
  body.fuel-print-brief .sc-investor-brief-initiatives {
    break-inside: auto;
    page-break-inside: auto;
  }

  body.fuel-print-brief .sc-investor-brief-sources > .sc-investor-brief-h3,
  body.fuel-print-brief .sc-investor-brief-initiatives > .sc-investor-brief-h3 {
    break-after: avoid;
    page-break-after: avoid;
  }

  body.fuel-print-brief .sc-investor-brief-refs li {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  body.fuel-print-brief .sc-investor-brief-table-wrap {
    break-inside: auto;
    overflow: visible !important;
  }

  body.fuel-print-brief .sc-investor-brief-table {
    width: 100% !important;
  }

  body.fuel-print-brief .sc-investor-brief-table thead {
    display: table-header-group;
  }

  body.fuel-print-brief .sc-investor-brief-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /*
   * Initiatives roadmap is a screen-first horizontal board (fixed 300px
   * columns + max-content width + overflow-x). In print that layout clips
   * off-page and leaves a mostly blank section — fit the page instead.
   */
  body.fuel-print-brief .sc-investor-brief-roadmap-board {
    overflow: visible !important;
    padding: 12px 0 0;
    width: 100% !important;
  }

  body.fuel-print-brief .sc-investor-brief-block .sc-investor-brief-roadmap-board.overview-panel {
    padding: 12px 14px 16px;
  }

  body.fuel-print-brief .sc-investor-brief-roadmap {
    --pillar-col-w: auto;
    --pillar-gap: 14px;
    break-inside: auto;
    display: grid !important;
    gap: var(--pillar-gap);
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    justify-content: stretch;
    max-width: 100% !important;
    page-break-inside: auto;
    width: 100% !important;
  }

  body.fuel-print-brief .sc-investor-brief-roadmap-topline {
    display: none !important;
  }

  body.fuel-print-brief .sc-investor-brief-pillar-col {
    break-inside: auto;
    max-width: none !important;
    page-break-inside: auto;
    width: 100% !important;
  }

  body.fuel-print-brief .sc-investor-brief-roadmap-item {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  body.fuel-print-brief .sc-investor-brief-ref-btn {
    background: none !important;
    border: 0 !important;
    color: inherit !important;
    cursor: default !important;
    padding: 0 !important;
  }
}

/* Legacy wiki-full helpers kept for any remaining summary cards */
.sc-wiki-full-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: auto;
}

.sc-wiki-full-page.sc-detail-dashboard {
  gap: 28px;
  padding-bottom: 12px;
}

.sc-wiki-full-hero {
  margin-bottom: 0;
  padding: 20px 24px 24px;
}

.sc-wiki-full-hero-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.sc-wiki-full-hero .sc-wiki-summary-eyebrow {
  margin-bottom: 2px;
}

.sc-wiki-full-hero .scorecard-drill-hero-title {
  font-size: 22px;
  margin-bottom: 0;
}

.sc-wiki-full-hero .scorecard-drill-hero-sub {
  margin-bottom: 8px;
  max-width: 720px;
}

.sc-wiki-full-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  margin-top: 6px;
}

.sc-wiki-full-meta-chip {
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 132px;
  padding: 12px 14px;
}

.sc-wiki-full-meta-chip span {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sc-wiki-full-meta-chip strong {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.sc-wiki-full-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 2px 8px;
}

.sc-wiki-full-lede {
  border-bottom: none;
  color: var(--text-1);
  font-size: 15px;
  line-height: 1.7;
  margin: 0;
  max-width: 820px;
  padding: 4px 4px 8px;
}

.sc-wiki-full-section {
  margin-bottom: 0;
}

.sc-wiki-full-section.sc-detail-widget {
  gap: 16px;
  padding: 22px 24px 26px;
}

.sc-wiki-full-section.sc-detail-widget .sc-detail-widget-title {
  margin: 0;
}

.sc-wiki-full-section-lead {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
  margin: -4px 0 6px;
  max-width: 720px;
}

.sc-wiki-full-kpi-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sc-wiki-full-kpi {
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
}

.sc-wiki-full-kpi span {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sc-wiki-full-kpi strong {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.sc-wiki-full-kpi em {
  color: var(--text-3);
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
}

.sc-wiki-full-metrics-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sc-wiki-full-tracks {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sc-wiki-full-track {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px 20px;
}

.sc-wiki-full-track-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
}

.sc-wiki-full-track-head span {
  color: var(--text-1);
  font-size: 12px;
  font-weight: 800;
}

.sc-wiki-full-track-head em {
  color: var(--text-3);
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sc-wiki-full-track strong {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 700;
}

.sc-wiki-full-track p {
  color: var(--text-2);
  flex: 1;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.sc-wiki-full-track-meta {
  color: var(--text-3);
  display: flex;
  font-size: 10px;
  font-weight: 700;
  gap: 12px;
  letter-spacing: 0.04em;
  margin-top: 6px;
  text-transform: uppercase;
}

.sc-wiki-brief-exec-copy {
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.7;
  margin: 0;
  max-width: 820px;
}

.sc-wiki-track-score-row {
  align-items: flex-start;
  display: flex;
  gap: 16px;
}

.sc-wiki-track-score {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  min-width: 48px;
}

.sc-wiki-track-title {
  color: var(--text-1);
  display: block;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
}

.sc-wiki-track-narrative {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.sc-wiki-track-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.sc-wiki-metric-pill {
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: grid;
  gap: 4px;
  grid-template-columns: 1fr auto;
  padding: 10px 12px;
}

.sc-wiki-metric-pill span {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 700;
  grid-column: 1 / -1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sc-wiki-metric-pill strong {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 700;
}

.sc-wiki-metric-pill em {
  color: var(--text-3);
  font-size: 10px;
  font-style: normal;
  font-weight: 600;
  justify-self: end;
}

.sc-wiki-track-bullets {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
}

.sc-wiki-track-bullets li {
  color: var(--text-2);
  font-size: 12.5px;
  line-height: 1.5;
  padding-left: 14px;
  position: relative;
}

.sc-wiki-track-bullets li::before {
  content: "•";
  left: 0;
  position: absolute;
}

.sc-wiki-track-bullets--strength li::before {
  color: var(--accent);
}

.sc-wiki-track-bullets--risk li::before {
  color: var(--status-watch);
}

.sc-wiki-analysis-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sc-wiki-analysis-block {
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  padding: 16px 18px;
}

.sc-wiki-analysis-block h3 {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  margin: 0 0 10px;
  text-transform: uppercase;
}

.sc-wiki-analysis-block p {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.65;
  margin: 0;
  max-width: 820px;
}

.sc-wiki-intel-detail {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.5;
  margin: 6px 0 0;
}

.sc-wiki-full-answers {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sc-wiki-full-answer-group h3 {
  color: var(--text-2);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  margin: 0 0 10px;
  text-transform: uppercase;
}

.sc-wiki-full-answer-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.sc-wiki-full-answer-tile {
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
}

.sc-wiki-full-answer-tile--wide {
  grid-column: 1 / -1;
}

.sc-wiki-full-answer-tile span {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sc-wiki-full-answer-tile strong {
  color: var(--text-1);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.45;
}

.sc-wiki-full-section.sc-wiki-summary-section p {
  color: var(--text-2);
  font-size: 13.5px;
  line-height: 1.7;
  margin: 0 0 14px;
  max-width: 820px;
}

.sc-wiki-full-section.sc-wiki-summary-section p:last-child {
  margin-bottom: 0;
}

.sc-wiki-full-intel-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sc-wiki-full-intel-card {
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
}

.sc-wiki-full-intel-card span {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sc-wiki-full-intel-card strong {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
}

.sc-wiki-full-intel-card em {
  color: var(--text-3);
  font-size: 10px;
  font-style: normal;
  font-weight: 600;
}

.sc-wiki-full-docs {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.sc-wiki-full-doc {
  background: var(--surface-3);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
}

.sc-wiki-full-doc span {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sc-wiki-full-doc strong {
  color: var(--text-1);
  font-size: 12.5px;
  font-weight: 600;
}

.sc-wiki-full-references {
  border-top: none;
  margin-top: 0;
  padding-top: 0;
}

.sc-wiki-full-references .sc-detail-widget-title {
  margin-bottom: 4px;
}

.sc-wiki-full-references ol {
  gap: 10px;
}

@media (max-width: 900px) {
  .sc-wiki-full-kpi-grid,
  .sc-wiki-full-metrics-grid,
  .sc-wiki-full-intel-grid {
    grid-template-columns: 1fr;
  }

  .sc-wiki-full-meta-row {
    gap: 8px;
  }

  .sc-wiki-full-meta-chip {
    flex: 1 1 calc(50% - 8px);
    min-width: 0;
  }
}

${isLight ? `
.fuel-overview .sc-adv-featured-toggle:hover {
  background: #f8fafc;
}

.fuel-overview .sc-glance-row,
.fuel-overview .sc-cat {
  box-shadow: 0 1px 2px rgba(26, 35, 50, 0.03);
}

/* Full summary / investor brief — light theme overrides */
.fuel-overview .sc-investor-brief-masthead,
.fuel-overview .sc-investor-brief-block {
  background: var(--surface-2);
  border-color: var(--border);
  box-shadow: 0 1px 2px rgba(26, 35, 50, 0.03);
}

.fuel-overview .sc-investor-brief-h3 {
  color: var(--text-1);
}

.fuel-overview .sc-investor-brief-source-note,
.fuel-overview .sc-investor-brief-analysis-label,
.fuel-overview .sc-investor-brief-empty,
.fuel-overview .sc-investor-brief-cohort-note {
  color: var(--text-3);
}

.fuel-overview .sc-investor-brief-ops-group {
  background: var(--panel-inset);
  border-color: var(--border);
}

.fuel-overview .sc-investor-brief-ops-group h4 {
  color: var(--status-good);
}

.fuel-overview .sc-investor-brief-ops-label {
  color: var(--text-3);
}

.fuel-overview .sc-investor-brief-ops-value {
  color: var(--text-1);
}

.fuel-overview .sc-investor-brief-block .sc-investor-brief-roadmap-board.overview-panel {
  --roadmap-board-bg: var(--surface-2);
  background: var(--surface-2);
  border-color: var(--border);
}

.fuel-overview .sc-investor-brief-block .sc-investor-brief-roadmap {
  --roadmap-board-bg: var(--surface-2);
}

.fuel-overview .sc-investor-brief-roadmap-topline,
.fuel-overview .sc-investor-brief-pillar-drop,
.fuel-overview .sc-investor-brief-pillar-stack::before {
  background: var(--border);
}

.fuel-overview .sc-investor-brief-pillar-dot {
  background: color-mix(in srgb, var(--pillar-col) 42%, var(--text-1));
  border-color: var(--surface-2);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--pillar-col) 30%, var(--text-1));
}

.fuel-overview .sc-investor-brief-pillar-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-top: 3px solid var(--status-good);
  box-shadow: 0 1px 2px rgba(26, 35, 50, 0.04);
  cursor: default;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.fuel-overview .sc-investor-brief-pillar-card:hover {
  border-color: var(--border-strong);
  border-top-color: var(--status-good);
  box-shadow: 0 8px 22px rgba(26, 35, 50, 0.08);
  transform: translateY(-1px);
}

.fuel-overview .sc-investor-brief-pillar-title-pill {
  color: var(--text-1);
  font-weight: 650;
}

.fuel-overview .sc-investor-brief-pillar-card-desc {
  color: var(--text-2);
}

.fuel-overview .sc-investor-brief-pillar-count {
  color: var(--text-1);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.fuel-overview .sc-investor-brief-pillar-coverage {
  font-weight: 650;
}

.fuel-overview .sc-investor-brief-pillar-coverage.is-blind {
  background: var(--status-bad-dim);
  border-color: var(--status-bad-line);
  color: var(--status-bad);
}

.fuel-overview .sc-investor-brief-pillar-coverage.is-thin {
  background: var(--status-watch-dim);
  border-color: var(--status-watch-line);
  color: var(--status-watch);
}

.fuel-overview .sc-investor-brief-pillar-coverage.is-healthy {
  background: var(--status-good-dim);
  border-color: var(--status-good-line);
  color: var(--status-good);
}

.fuel-overview .sc-investor-brief-pillar-tag,
.fuel-overview .sc-investor-brief-init-pillar-tag {
  background: var(--status-good-dim);
  border: 1px solid var(--status-good-line);
  color: var(--status-good);
  font-weight: 600;
}

.fuel-overview .sc-investor-brief-pillar-empty {
  background: var(--surface-3);
  border-color: var(--border-strong);
}

.fuel-overview .sc-investor-brief-pillar-empty strong {
  color: var(--text-1);
}

.fuel-overview .sc-investor-brief-pillar-empty span {
  color: var(--text-3);
}

.fuel-overview .sc-investor-brief-roadmap-due-pill {
  background: var(--surface-3);
  border-color: var(--border);
  color: var(--text-2);
  font-weight: 600;
}

.fuel-overview .sc-investor-brief-init-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  box-shadow: 0 1px 2px rgba(26, 35, 50, 0.03);
  cursor: default;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.fuel-overview .sc-investor-brief-init-card:hover {
  border-color: var(--border-strong);
  box-shadow: 0 6px 18px rgba(26, 35, 50, 0.07);
  transform: translateY(-1px);
}

.fuel-overview .sc-investor-brief-init-card.is-done {
  background: var(--surface-2);
  border-color: var(--status-good-line);
}

.fuel-overview .sc-investor-brief-init-card.is-paused,
.fuel-overview .sc-investor-brief-init-card.is-suggested {
  background: var(--surface-2);
  border-color: var(--status-watch-line);
}

.fuel-overview .sc-investor-brief-init-status,
.fuel-overview .sc-investor-brief-init-pillar-tag {
  font-weight: 600;
}

.fuel-overview .sc-investor-brief-init-status.is-active,
.fuel-overview .sc-investor-brief-init-status.is-done {
  background: var(--status-good-dim);
  border-color: var(--status-good-line);
  color: var(--status-good);
}

.fuel-overview .sc-investor-brief-init-status.is-suggested,
.fuel-overview .sc-investor-brief-init-status.is-paused {
  background: var(--status-watch-dim);
  border-color: var(--status-watch-line);
  color: var(--status-watch);
}

.fuel-overview .sc-investor-brief-roadmap-legend-item {
  color: var(--text-3);
  font-weight: 650;
}

.fuel-overview .sc-investor-brief-roadmap-legend-item.is-blind::before {
  background: var(--status-bad);
}

.fuel-overview .sc-investor-brief-roadmap-legend-item.is-thin::before {
  background: var(--status-watch);
}

.fuel-overview .sc-investor-brief-roadmap-legend-item.is-healthy::before {
  background: var(--status-good);
}

` : ""}

.fuel-overview .sc-workspace-modules-panel {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px 20px;
}
.fuel-overview .sc-workspace-modules-panel-head {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}
.fuel-overview .sc-workspace-modules-panel-head-main {
  flex: 1;
  min-width: 0;
}
.fuel-overview .sc-workspace-modules-panel-head h3 {
  color: var(--text-1);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin: 0 0 4px;
}
.fuel-overview .sc-workspace-modules-panel-head p {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}
.fuel-overview .sc-workspace-module-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
.fuel-overview .sc-workspace-module-card {
  align-items: stretch;
  background: var(--panel);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font: inherit;
  gap: 8px;
  min-height: 148px;
  padding: 14px 12px 12px;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}
.fuel-overview .sc-workspace-module-card:hover,
.fuel-overview .sc-workspace-module-card:focus-visible {
  background: var(--surface-2);
  border-color: var(--border-strong);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16);
  outline: none;
}
.fuel-overview .sc-workspace-module-card-head {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}
.fuel-overview .sc-workspace-module-card-icon {
  align-items: center;
  background: var(--surface-2);
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  color: var(--text-2);
  display: inline-flex;
  font-size: 14px;
  height: 28px;
  justify-content: center;
  width: 28px;
}
.fuel-overview .sc-workspace-module-card-pct {
  align-items: flex-end;
  color: var(--text-2);
  display: flex;
  flex-direction: column;
  font-size: 10px;
  font-weight: 700;
  gap: 1px;
  line-height: 1.1;
  margin-left: auto;
  text-align: right;
  white-space: nowrap;
}
.fuel-overview .sc-workspace-module-card-pct strong {
  color: var(--text-1);
  font-size: 12px;
  font-weight: 800;
}
.fuel-overview .sc-workspace-module-card-pct em {
  color: var(--text-3);
  font-size: 9px;
  font-style: normal;
  font-weight: 600;
}
.fuel-overview .sc-workspace-module-card.is-complete .sc-workspace-module-card-pct strong {
  color: var(--status-good);
}
.fuel-overview .sc-workspace-module-card-title {
  color: var(--text-1);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  margin: 0;
}
.fuel-overview .sc-workspace-module-card-desc {
  color: var(--text-3);
  flex: 1;
  font-size: 10px;
  line-height: 1.4;
  margin: 0;
}
.fuel-overview .sc-workspace-module-card-foot {
  align-items: center;
  border-top: 1px solid var(--panel-border);
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
}
.fuel-overview .sc-workspace-module-card-status {
  border-radius: 4px;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  padding: 3px 7px;
  white-space: nowrap;
}
.fuel-overview .sc-workspace-module-card-status.is-idle {
  background: var(--surface-2);
  color: var(--text-3);
}
.fuel-overview .sc-workspace-module-card-status.is-building {
  background: var(--status-watch-dim);
  color: var(--status-watch);
}
.fuel-overview .sc-workspace-module-card-status.is-complete {
  background: var(--status-good-dim);
  color: var(--status-good);
}
.fuel-overview .sc-workspace-module-card-credits {
  color: var(--text-2);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.fuel-overview .sc-workspace-module-card-credits.is-earned {
  color: var(--status-good);
}
.fuel-overview .sc-workspace-module-card-cta {
  color: var(--text-2);
  font-size: 11px;
  font-weight: 700;
  margin-left: auto;
  white-space: nowrap;
}
.fuel-overview .sc-workspace-module-card:hover .sc-workspace-module-card-cta {
  color: var(--text-1);
}
.fuel-overview .sc-workspace-module-card.is-building {
  border-color: color-mix(in srgb, var(--status-watch) 35%, var(--panel-border));
}
@media (max-width: 1100px) {
  .fuel-overview .sc-workspace-module-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 700px) {
  .fuel-overview .sc-workspace-module-grid {
    grid-template-columns: 1fr;
  }
  .fuel-overview .sc-workspace-module-card {
    min-height: 128px;
  }
}
.fuel-overview .sc-glance-lock {
  position: relative;
}
.fuel-overview .sc-glance-lock-cta {
  position: absolute;
  inset: auto 12px 12px auto;
  z-index: 2;
  border: 1px solid var(--panel-border);
  background: var(--panel);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.fuel-overview .sc-glance-insights-wrap {
  filter: none;
}

`;
}
