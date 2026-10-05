/**
 * Injected once on the marketing landing — phone/tablet + portrait ↔ landscape.
 * Driven by CSS media queries only (no JS layout on orientationchange).
 * Aligns with responsive-mobile-tablet skill §4–§8.
 */
export function marketingResponsiveCss(): string {
  return `
/* —— Shared baselines —— */
@keyframes fuel-caret-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.mkt-hero,
.mkt-walkthrough-body,
.mkt-teaser-card,
.mkt-how-grid,
.mkt-final,
.mkt-hero-stage {
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 900px) {
  .mkt-hero-stage-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }
  .mkt-hero-stage-grid > aside:first-child,
  .mkt-hero-stage-aside {
    display: none !important;
  }
}

@media (min-width: 901px) and (max-width: 1100px) {
  .mkt-hero-stage-grid {
    grid-template-columns: 170px minmax(0, 1fr) !important;
  }
  .mkt-hero-stage-aside {
    display: none !important;
  }
}

.mkt-header-inner {
  padding-inline: max(var(--gutter), var(--safe-left)) max(var(--gutter), var(--safe-right)) !important;
}

.mkt-hero h1 {
  font-size: var(--fs-h1) !important;
  line-height: 1.12 !important;
}

.mkt-hero-ctas a,
.mkt-final a,
.mkt-header-cta {
  min-height: var(--fuel-touch-min) !important;
}

.mkt-how-grid > * {
  min-width: 0;
}

/* Walkthrough dense rows — stack below ~560 */
@media (max-width: 560px) {
  .mkt-tool-row {
    grid-template-columns: auto minmax(0, 1fr) !important;
    gap: 8px !important;
  }
  .mkt-tool-row .mkt-tool-status {
    grid-column: 2;
    justify-self: start;
  }
  .mkt-metric-row {
    grid-template-columns: 1fr !important;
    gap: 4px !important;
  }
}

/* —— Phone (< 768): stacked sections, full-width CTAs —— */
@media (max-width: 767px) {
  .mkt-hero {
    min-height: auto !important;
    padding-top: clamp(48px, 10vw, 80px) !important;
    padding-bottom: clamp(40px, 8vw, 64px) !important;
  }
  .mkt-hero-eyebrow {
    font-size: 12px !important;
    margin-bottom: 20px !important;
  }
  .mkt-hero p {
    font-size: var(--fs-body) !important;
    max-width: 65ch !important;
  }
  .mkt-hero-ctas {
    flex-direction: column !important;
    align-items: stretch !important;
    width: 100% !important;
    max-width: 360px !important;
    margin-inline: auto !important;
    gap: 12px !important;
  }
  .mkt-hero-ctas a {
    width: 100% !important;
    justify-content: center !important;
    white-space: normal !important;
  }
  .mkt-walkthrough-body {
    min-height: 280px !important;
    padding: 16px !important;
  }
  .mkt-teaser-card {
    grid-template-columns: 1fr !important;
    padding: 20px !important;
    gap: 20px !important;
  }
  .mkt-how-grid {
    grid-template-columns: 1fr !important;
  }
  .mkt-how-grid p {
    text-align: left !important;
  }
  .mkt-final {
    padding-block: var(--section-y) !important;
  }
  .mkt-final a {
    width: min(100%, 360px) !important;
    justify-content: center !important;
  }
  .mkt-header-cta {
    padding-inline: 12px !important;
    font-size: 13px !important;
  }
}

/* —— Phone landscape (wide + short): compact, CTAs in row, 2-up grids —— */
@media (orientation: landscape) and (max-height: 500px) {
  .mkt-header-inner {
    padding-block: 8px !important;
  }
  .mkt-hero {
    min-height: auto !important;
    padding-block: 24px !important;
  }
  .mkt-hero h1 {
    font-size: var(--fs-h1) !important;
  }
  .mkt-hero-ctas {
    flex-direction: row !important;
    flex-wrap: wrap !important;
    justify-content: center !important;
    max-width: none !important;
  }
  .mkt-hero-ctas a {
    width: auto !important;
    min-width: min(200px, 100%) !important;
    flex: 1 1 200px;
  }
  .mkt-walkthrough-body {
    min-height: min(220px, 50vh) !important;
    padding: 12px 16px !important;
  }
  .mkt-teaser-card {
    grid-template-columns: 1fr 1fr !important;
    padding: 16px 20px !important;
    gap: 16px !important;
  }
  .mkt-how-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  .mkt-how-grid > * {
    padding: 16px !important;
  }
  .mkt-final {
    padding-block: 40px !important;
  }
}

/* —— Wider landscape phones / small tablets in landscape —— */
@media (min-width: 640px) and (max-width: 1023px) and (orientation: landscape) and (min-height: 501px) {
  .mkt-hero-ctas {
    flex-direction: row !important;
    justify-content: center !important;
  }
  .mkt-teaser-card {
    grid-template-columns: 1.1fr 0.9fr !important;
  }
  .mkt-how-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
  .mkt-how-grid > * {
    padding: 18px !important;
  }
}

/* —— Tablet portrait: intentional 2-column layouts (not stretched phone) —— */
@media (min-width: 768px) and (max-width: 1023px) and (orientation: portrait) {
  .mkt-hero-ctas {
    flex-direction: row !important;
    justify-content: center !important;
    max-width: none !important;
  }
  .mkt-hero-ctas a {
    width: auto !important;
    min-width: 220px !important;
  }
  .mkt-teaser-card {
    grid-template-columns: 1fr 1fr !important;
    padding: 28px !important;
    gap: 28px !important;
  }
  .mkt-how-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    max-width: none !important;
  }
  /* Third how-it-works card spans full width under the pair */
  .mkt-how-grid > *:last-child:nth-child(odd) {
    grid-column: 1 / -1;
    max-width: 560px;
    margin-inline: auto;
    width: 100%;
  }
}

/* Hover effects only on fine pointers (skill §4.4) */
@media (hover: hover) and (pointer: fine) {
  .mkt-hero-ctas a {
    will-change: transform;
  }
}

@media (pointer: coarse) {
  .mkt-hero-ctas a,
  .mkt-final a,
  .mkt-header-cta {
    min-height: 48px !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mkt-hero *,
  .mkt-walkthrough-body *,
  .mkt-teaser-card *,
  .mkt-how-grid * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
}
