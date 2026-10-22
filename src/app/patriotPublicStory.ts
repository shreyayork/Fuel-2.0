export const PATRIOT_PUBLIC_POSTS = [
  { date: "Oct 12, 2026", title: "Tax implications of employees relocating to a different state", href: "https://www.patriotsoftware.com/blog/payroll/tax-implications-employees-relocating-different-state/" },
  { date: "Oct 9, 2026", title: "Can you still file your own payroll taxes if you use software?", href: "https://www.patriotsoftware.com/blog/payroll/can-you-still-file-your-own-payroll-taxes-if-you-use-software/" },
  { date: "Oct 8, 2026", title: "What does a bookkeeper do for a small business?", href: "https://www.patriotsoftware.com/blog/accounting/what-does-a-bookkeeper-do-for-a-small-business/" },
  { date: "Oct 5, 2026", title: "Use payroll reconciliation to record your books accurately", href: "https://www.patriotsoftware.com/blog/accounting/payroll-reconciliation/" },
  { date: "Oct 2, 2026", title: "Payroll for lawn care businesses", href: "https://www.patriotsoftware.com/blog/payroll/payroll-for-lawn-care-businesses/" },
];

export const PATRIOT_PUBLIC_SOURCES = [
  { label: "Homepage", detail: "patriotsoftware.com", href: "https://www.patriotsoftware.com/" },
  { label: "About", detail: "Company story", href: "https://www.patriotsoftware.com/about-us/" },
  { label: "Payroll", detail: "Product page", href: "https://www.patriotsoftware.com/payroll-software/" },
  { label: "Feed", detail: "Latest posts", href: "https://www.patriotsoftware.com/feed/" },
];

export const PATRIOT_PUBLIC_STATS = [
  { value: "80,000+", label: "Customers" },
  { value: "$35 billion+", label: "Payroll processed" },
  { value: "Under 3 min", label: "Average payroll run" },
];

export const PATRIOT_PUBLIC_QUOTE = {
  text: "We've got your back.",
  source: "Team Patriot, closing the about page",
};

export const PATRIOT_PUBLIC_HEADLINE = "The payroll company that kept itself private";

export const PATRIOT_PUBLIC_LEAD = "Patriot Software — Patriot Pay on Fuel — sells America's accounting and payroll for employers who want Thursday payroll finished before the coffee cools.";

export const PATRIOT_PUBLIC_OPENING_PARA = "On the public site the company calls itself America's Accounting and Payroll. Payroll and accounting share one login; you can buy one product and add the other later. The pitch is blunt: finish a run in under three minutes, online, with nothing to download and no contract that outlasts the month.";

export const PATRIOT_PUBLIC_OPENING_CALLOUT = {
  title: "Promise on the homepage",
  body: "Under three minutes per payroll run · month-to-month · U.S. employers from first hire to about 500 people",
};

export const PATRIOT_PUBLIC_OPENING_BULLETS = [
  "Multi-state workers, seasonal crews, and year-end tax prep are first-class problems",
  "Accountants who run payroll for many clients are part of the audience, not an afterthought",
];

export const PATRIOT_PUBLIC_PRIVATE_TILES = [
  { value: "1986", label: "Founded", hint: "Started in a factory basement; four years before a real paycheck" },
  { value: "2016", label: "Stayed private", hint: "IPO stopped late; other businesses sold to fund Patriot" },
  { value: "Today", label: "Control", hint: "Profitable, debt-free, majority founder-owned per the about page" },
];

export const PATRIOT_PUBLIC_PRIVATE_PARAS = [
  "Mike Kappel tells the origin as a founder's long bet. Patriot was the fifth company — harder and more expensive than the first four combined — and the about page is explicit that staying independent mattered more than a listing.",
  "In 2016 an IPO was lined up and stopped late. Patriot sold other businesses it had run for decades, raised from accredited investors over years, and kept majority ownership. The story they publish now: profitable, debt-free, and obsessed with American customers rather than exit timing.",
];

export const PATRIOT_PUBLIC_PRICING_TILES = [
  { value: "$17", label: "Payroll base / mo", hint: "+ $4 per worker actually paid that month" },
  { value: "$20", label: "Accounting / mo", hint: "Optional — same login as payroll" },
  { value: "$12", label: "Extra state / mo", hint: "Full Service payroll in all 50 states" },
];

export const PATRIOT_PUBLIC_PRODUCTS_INTRO = "Payroll leads the site; accounting is optional under the same login. Full Service payroll files taxes in all fifty states — each extra state is $12 per month — while basic payroll keeps owners who still want to see every number.";

export const PATRIOT_PUBLIC_PAYROLL_BULLETS = [
  "Deductions, W-2s, employee portal and app, PTO accrual, and one-click auto payroll",
  "HR center alerts when federal, state, or local rules change",
];

export const PATRIOT_PUBLIC_FULL_SERVICE_PARA = "Full Service collects, files, and deposits federal, state, and most local taxes. Direct deposit is included, not bolted on. Partners named on the site cover retirement (Vestwell), workers' comp (ERGO NEXT), and health (SimplyInsured).";

export const PATRIOT_PUBLIC_MARKET_PARAS = [
  "The payroll page draws a hard line: software for companies whose people work in the United States. Inside that line the same product is meant to fit a first hire or a switch mid-year, with free setup if Patriot enters employees and year-to-date pay.",
  "October blog posts use seasonal employers — lawn care crews, thin January payrolls — to show what the product has to survive without selling an industry SKU.",
];

export const PATRIOT_PUBLIC_FEED_BULLETS = [
  "Oct 12 — Employee moves to another state and tax implications",
  "Oct 9 — Can you still file payroll taxes yourself if you use software?",
  "Oct 8 — What a bookkeeper does for a small business",
  "Oct 5 — Payroll reconciliation and year-end checklist",
  "Oct 2 — Payroll patterns for seasonal lawn-care crews",
];

export const PATRIOT_PUBLIC_WAGER_PARA = "Patriot's wager is a small monthly price for software that stays out of the way — and retention through U.S.-based support included on every tier, SOC 2 Type II, and sign-in that asks for more than a password.";

export const PATRIOT_PUBLIC_CLOSE_LINE = "The about page ends on a private, profitable company still owned by the people who chose not to go public — and a line plainer than a mission statement.";

export const PATRIOT_PUBLIC_DEK = "America's accounting and payroll for small employers — built to finish a run in under three minutes, without a contract that outlasts the month.";

export const PATRIOT_PUBLIC_BLOG_MARKER = "brief-paper-public-blog-v6";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bulletList(items: string[], className = "brief-paper-blog-bullets"): string {
  const body = items.map(item => `<li>${esc(item)}</li>`).join("");
  return `<ul class="${className}">${body}</ul>`;
}

function numberTiles(
  tiles: { value: string; label: string; hint?: string }[],
  className = "brief-paper-blog-tiles",
): string {
  return `<div class="${className}" role="list">${tiles.map(tile => (
    `<div class="brief-paper-blog-tile" role="listitem">`
    + `<span class="brief-paper-blog-tile-value">${esc(tile.value)}</span>`
    + `<span class="brief-paper-blog-tile-label">${esc(tile.label)}</span>`
    + (tile.hint ? `<span class="brief-paper-blog-tile-hint">${esc(tile.hint)}</span>` : "")
    + `</div>`
  )).join("")}</div>`;
}

function para(text: string, className?: string): string {
  const klass = className ? ` class="${className}"` : "";
  return `<p${klass}>${esc(text)}</p>`;
}

function callout(tone: "mint" | "amber" | "slate", title: string, body: string): string {
  return `<aside class="brief-paper-blog-callout brief-paper-blog-callout--${tone}"><strong>${esc(title)}</strong><p>${esc(body)}</p></aside>`;
}

function sectionHtml(title: string, body: string): string {
  return `<section class="brief-paper-blog-section"><h2>${esc(title)}</h2>${body}</section>`;
}

function subsectionHtml(title: string, body: string): string {
  return `<div class="brief-paper-blog-subsection"><h3>${esc(title)}</h3>${body}</div>`;
}

function timelineList(items: string[]): string {
  const body = items.map(item => {
    const [date, ...rest] = item.split(" — ");
    const title = rest.join(" — ") || item;
    return `<li><span class="brief-paper-blog-timeline-date">${esc(date)}</span><span>${esc(title)}</span></li>`;
  }).join("");
  return `<ul class="brief-paper-blog-timeline">${body}</ul>`;
}

export function buildPatriotPublicPaperHtml(reportDate = "Oct 16, 2026"): string {
  const openingBody = [
    `<p class="brief-paper-lead">${esc(PATRIOT_PUBLIC_LEAD)}</p>`,
    para(PATRIOT_PUBLIC_OPENING_PARA),
    callout("mint", PATRIOT_PUBLIC_OPENING_CALLOUT.title, PATRIOT_PUBLIC_OPENING_CALLOUT.body),
    bulletList(PATRIOT_PUBLIC_OPENING_BULLETS),
  ].join("");
  const stats = PATRIOT_PUBLIC_STATS.map(stat => (
    `<div class="brief-paper-blog-stat"><span class="brief-paper-blog-stat-value">${esc(stat.value)}</span><span class="brief-paper-blog-stat-label">${esc(stat.label)}</span></div>`
  )).join("");
  const sections = [
    sectionHtml("Staying private was the decision", [
      numberTiles(PATRIOT_PUBLIC_PRIVATE_TILES),
      ...PATRIOT_PUBLIC_PRIVATE_PARAS.map(text => para(text)),
      callout("amber", "Why it matters on Fuel", "Public profile copy stays narrative; private benchmark tables belong in the workspace brief unless you embed them with / → Templates."),
    ].join("")),
    sectionHtml("Two products, and permission to buy only one", [
      para(PATRIOT_PUBLIC_PRODUCTS_INTRO),
      numberTiles(PATRIOT_PUBLIC_PRICING_TILES),
      subsectionHtml("Basic payroll", bulletList(PATRIOT_PUBLIC_PAYROLL_BULLETS)),
      para(PATRIOT_PUBLIC_FULL_SERVICE_PARA),
      `<p class="brief-paper-blog-note">No payroll run in a quiet month → no per-worker fee. Thirty-day trial, then half off for three months.</p>`,
    ].join("")),
    sectionHtml("A market with a border", PATRIOT_PUBLIC_MARKET_PARAS.map(text => para(text)).join("")),
    sectionHtml("What they are publishing now", [
      para("The October 2026 feed is not a launch calendar — it is year-end operations in public: multi-state tax, filing choices, bookkeepers, reconciliation, seasonal crews."),
      timelineList(PATRIOT_PUBLIC_FEED_BULLETS),
    ].join("")),
  ].join("");
  const posts = PATRIOT_PUBLIC_POSTS.map(post => (
    `<a class="brief-paper-blog-post-card" href="${esc(post.href)}" rel="noopener noreferrer"><time datetime="">${esc(post.date)}</time><span class="brief-paper-blog-post-title">${esc(post.title)}</span></a>`
  )).join("");
  return [
    `<article class="brief-paper-public-blog ${PATRIOT_PUBLIC_BLOG_MARKER}">`,
    `<header class="brief-paper-blog-hero">`,
    `<div class="brief-paper-blog-hero-cover" aria-hidden="true"></div>`,
    `<div class="brief-paper-blog-hero-inner">`,
    `<p class="brief-paper-blog-eyebrow">Patriot Pay · Fuel company profile</p>`,
    `<h1>${esc(PATRIOT_PUBLIC_HEADLINE)}</h1>`,
    `<p class="brief-paper-blog-dek">${esc(PATRIOT_PUBLIC_DEK)}</p>`,
    `<div class="brief-paper-blog-meta"><span>${esc(reportDate)}</span><span class="brief-paper-blog-meta-dot" aria-hidden="true">·</span><span>6 min read</span><span class="brief-paper-blog-meta-dot" aria-hidden="true">·</span><span>Updated from public sources</span></div>`,
    `</div></header>`,
    `<div class="brief-paper-blog-shell">`,
    `<div class="brief-paper-blog-stats" role="list">${stats}</div>`,
    `<div class="brief-paper-blog-main">`,
    sectionHtml("Three minutes, then back to the work", openingBody),
    sections,
    `<blockquote class="brief-paper-blog-pull"><p>${esc(PATRIOT_PUBLIC_QUOTE.text)}</p><footer>${esc(PATRIOT_PUBLIC_QUOTE.source)}</footer></blockquote>`,
    sectionHtml("The wager", [
      para(PATRIOT_PUBLIC_WAGER_PARA),
      callout("slate", "We've got your back.", PATRIOT_PUBLIC_QUOTE.source),
      `<p class="brief-paper-blog-note">${esc(PATRIOT_PUBLIC_CLOSE_LINE)}</p>`,
    ].join("")),
    `</div>`,
    `<section class="brief-paper-blog-related"><div class="brief-paper-blog-related-head"><h2>From the public blog</h2><p>Recent posts that shape how Patriot shows up in market.</p></div><div class="brief-paper-blog-post-grid">${posts}</div></section>`,
    `</div></article>`,
  ].join("");
}

export function isPatriotPayName(companyName: string): boolean {
  return companyName.trim().toLowerCase() === "patriot pay";
}
