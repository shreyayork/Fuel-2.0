export const PATRIOT_PUBLIC_POSTS = [
  {
    date: "Oct 13, 2026",
    title: "Tax implications of employees relocating to a different state",
    excerpt: "What employers need to know when a team member crosses state lines.",
    href: "https://www.patriotsoftware.com/blog/payroll/tax-implications-employees-relocating-different-state/",
  },
  {
    date: "Oct 9, 2026",
    title: "Can you still file your own payroll taxes if you use software?",
    excerpt: "A practical guide to responsibility, software, and filing.",
    href: "https://www.patriotsoftware.com/blog/payroll/can-you-still-file-your-own-payroll-taxes-if-you-use-software/",
  },
  {
    date: "Oct 8, 2026",
    title: "What does a bookkeeper do for a small business?",
    excerpt: "The records, reporting, and support a bookkeeper provides.",
    href: "https://www.patriotsoftware.com/blog/accounting/what-does-a-bookkeeper-do-for-a-small-business/",
  },
  {
    date: "Oct 5, 2026",
    title: "Use payroll reconciliation to record your books accurately",
    excerpt: "A step-by-step process for cleaner payroll accounting.",
    href: "https://www.patriotsoftware.com/blog/accounting/payroll-reconciliation/",
  },
];

export const PATRIOT_PUBLIC_COMPANY_SITE = "https://www.patriotsoftware.com/";

export const PATRIOT_PUBLIC_STATS = [
  { value: "80,000+", label: "Customers" },
  { value: "$35B+", label: "Payroll processed" },
  { value: "Under 3 min", label: "Average payroll run" },
];

export const PATRIOT_PUBLIC_HERO_TAGLINE = "The payroll company that kept itself private";

export const PATRIOT_PUBLIC_AT_A_GLANCE = [
  { label: "Headquarters", value: "Canton, Ohio" },
  { label: "Founded", value: "1986" },
  { label: "Ownership", value: "Privately held" },
];

export const PATRIOT_PUBLIC_MEET_DEK =
  "America's accounting and payroll platform for small employers—built to finish a run in under three minutes, without a contract that outlasts the month.";

export const PATRIOT_PUBLIC_COMPANY_LEAD =
  "Patriot Software—Patriot Pay on Fuel—serves America's accounting and payroll needs for employers who want Thursday payroll finished before the coffee cools.";

export const PATRIOT_PUBLIC_OPENING_PARA =
  "The public site, the company calls itself America's Accounting and Payroll. Payroll and accounting share one login; customers can buy one product and add the other later. The pitch is blunt: finish a run in under three minutes, online, with nothing to download and no contract that outlasts the month.";

export const PATRIOT_PUBLIC_OPENING_FUEL_PERSPECTIVE =
  "Under three minutes per payroll run. Month-to-month. U.S. employers from first hire to about 500 people.";

export const PATRIOT_PUBLIC_PRIVATE_TILES = [
  { value: "1986", label: "Founded", hint: "Started in a factory basement" },
  { value: "2016", label: "Stayed private", hint: "IPO stopped late; other businesses sold" },
  { value: "Today", label: "Control", hint: "Profitable, debt-free, majority founder-owned" },
];

export const PATRIOT_PUBLIC_PRIVATE_PARAS = [
  "Mike Kappel tells the origin as a founder's long bet. Patriot was the fifth company—harder and more expensive than the first four combined—and the about page is explicit that staying independent mattered more than a listing.",
  "In 2016 an IPO was lined up and stopped late. Patriot sold other businesses it had run for decades, raised from accredited investors over years, and kept majority ownership. The story they publish now: profitable, debt-free, and obsessed with American customers rather than exit timing.",
];

export const PATRIOT_PUBLIC_OWNERSHIP_FUEL_PERSPECTIVE =
  "Public profile copy stays narrative; private benchmark tables belong in the workspace brief unless you choose to publish them fully.";

export const PATRIOT_PUBLIC_PRICING_TILES = [
  { value: "$17", label: "Payroll base / mo", hint: "$4 per worker actually paid that month" },
  { value: "$20", label: "Accounting / mo", hint: "Optional—same login as payroll" },
  { value: "$12", label: "Extra state / mo", hint: "Full Service payroll in all 50 states" },
];

export const PATRIOT_PUBLIC_PRODUCTS_INTRO =
  "Payroll leads the site; accounting is optional under the same login. Full Service payroll files taxes in all fifty states—each extra state is $12 per month—while basic payroll keeps owners who still want to see every number.";

export const PATRIOT_PUBLIC_FULL_SERVICE_PARA =
  "Full Service collects, files, and deposits federal, state, and most local taxes. Direct deposit is included, not bolted on. Partners named on the site cover retirement, workers' comp, HR and health benefits.";

export const PATRIOT_PUBLIC_MARKET_PARAS = [
  "The payroll page draws a hard line: software for companies whose people work in the United States. Inside that line the same product is meant to fit a first hire or a switch mid-year, with free setup if Patriot enters employees and year-to-date pay.",
  "October blog posts use seasonal employers—lawn care crews, then January payrolls—to show what the product has to survive without selling an industry SKU.",
];

export const PATRIOT_PUBLIC_WAGER_PARA =
  "Patriot's wager is a small monthly price for software that stays out of the way—and retention through U.S.-based support included on every tier, SOC 2 Type II, and sign-in that asks for more than a password.";

export const PATRIOT_PUBLIC_WAGER_FUEL_PERSPECTIVE =
  "We've got your back. Team Patriot, closing the about page.";

export const PATRIOT_PUBLIC_BLOG_MARKER = "brief-paper-public-blog-v12";

/** True when stored HTML matches the Figma Make company profile shell. */
export function isCurrentPatriotPublicHtml(html: string): boolean {
  return (
    html.includes(PATRIOT_PUBLIC_BLOG_MARKER)
    && html.includes("brief-paper-company-profile--make")
    && html.includes("brief-paper-cp-fuel-body")
    && html.includes('aria-label="Profile chapters"')
  );
}

const PATRIOT_LOGO_SRC = "https://bulk-kiwi-86535553.figma.site/assets/5bfb0.svg";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function para(text: string, className?: string): string {
  const klass = className ? ` class="${className}"` : "";
  return `<p${klass}>${esc(text)}</p>`;
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

function fuelPerspective(body: string, tone: "navy" | "paper" = "paper"): string {
  const toneClass = tone === "navy" ? " brief-paper-cp-fuel-perspective--navy" : "";
  return (
    `<blockquote class="brief-paper-cp-fuel-perspective${toneClass}">`
    + `<span class="brief-paper-cp-fuel-label">THE FUEL PERSPECTIVE</span>`
    + `<p class="brief-paper-cp-fuel-body">${esc(body)}</p>`
    + `</blockquote>`
  );
}

function profileSection(
  id: string,
  index: string,
  kicker: string,
  title: string,
  body: string,
  extraClass = "",
): string {
  const klass = extraClass ? ` ${extraClass}` : "";
  const kickerInner = index
    ? (
      `<span class="brief-paper-cp-index">${esc(index)}</span>`
      + `<span class="brief-paper-cp-kicker-rule" aria-hidden="true"></span>`
      + `<span class="brief-paper-cp-kicker-text">${esc(kicker)}</span>`
    )
    : `<span class="brief-paper-cp-kicker-text">${esc(kicker)}</span>`;
  const kickerClass = index ? "brief-paper-cp-kicker" : "brief-paper-cp-kicker brief-paper-cp-kicker--solo";
  return (
    `<section class="brief-paper-cp-section brief-paper-blog-section${klass}" id="${esc(id)}">`
    + `<div class="brief-paper-cp-section-head">`
    + `<p class="${kickerClass}">${kickerInner}</p>`
    + `<h2>${esc(title)}</h2>`
    + `</div>`
    + `<div class="brief-paper-cp-section-body">${body}</div>`
    + `</section>`
  );
}

function navLink(
  id: string,
  index: string,
  label: string,
  variant: "chapter" | "overview" | "updates" = "chapter",
): string {
  if (variant === "overview") {
    return (
      `<a class="brief-paper-cp-nav-link brief-paper-cp-nav-link--overview" href="#${esc(id)}">`
      + `${esc(label)}`
      + `</a>`
    );
  }
  if (variant === "updates") {
    return (
      `<a class="brief-paper-cp-nav-link brief-paper-cp-nav-link--updates" href="#${esc(id)}">`
      + `${esc(label)}`
      + `</a>`
    );
  }
  return (
    `<a class="brief-paper-cp-nav-link" href="#${esc(id)}">`
    + `<span class="brief-paper-cp-nav-index">${esc(index)}</span>`
    + `<span class="brief-paper-cp-nav-label">${esc(label)}</span>`
    + `</a>`
  );
}

function glanceAsideItem(label: string, value: string): string {
  return (
    `<div>`
    + `<dt class="brief-paper-cp-glance-label">${esc(label)}</dt>`
    + `<dd class="brief-paper-cp-glance-value">${esc(value)}</dd>`
    + `</div>`
  );
}

const PATRIOT_VERIFIED_ICON = (
  `<svg class="brief-paper-cp-verified-icon" aria-hidden="true" viewBox="0 0 20 20" fill="none">`
  + `<path d="m10 2 6 2.5v5c0 4-6 8-6 8s-6-4-6-8v-5L10 2Z" stroke="currentColor"></path>`
  + `<path d="m7 9 2 2 4-4" stroke="currentColor"></path>`
  + `</svg>`
);

export function buildPatriotPublicPaperHtml(): string {
  const stats = PATRIOT_PUBLIC_STATS.map(stat => (
    `<div class="brief-paper-cp-stat">`
    + `<dt class="brief-paper-cp-stat-value">${esc(stat.value)}</dt>`
    + `<dd class="brief-paper-cp-stat-label">${esc(stat.label)}</dd>`
    + `</div>`
  )).join("");

  const glance = PATRIOT_PUBLIC_AT_A_GLANCE.map(row => glanceAsideItem(row.label, row.value)).join("");

  const nav = [
    navLink("overview", "", "Company overview", "overview"),
    navLink("company", "01", "Three minutes, then back to the work"),
    navLink("ownership", "02", "Staying private was the decision"),
    navLink("product", "03", "Two products, and permission to buy only one"),
    navLink("market", "04", "A market with a border"),
    navLink("wager", "05", "A plain mission can be a strategy"),
    navLink("signals", "", "Latest updates ↗", "updates"),
  ].join("");

  const tagRow = PATRIOT_PUBLIC_AT_A_GLANCE.map(row => (
    `<span class="brief-paper-cp-tag">${esc(row.value)}</span>`
  )).join("");

  const overviewBody = [
    `<p class="brief-paper-cp-lede">${esc(PATRIOT_PUBLIC_MEET_DEK)}</p>`,
    `<div class="brief-paper-cp-tag-row" role="list">${tagRow}</div>`,
  ].join("");

  const companyBody = [
    para(PATRIOT_PUBLIC_COMPANY_LEAD),
    para(PATRIOT_PUBLIC_OPENING_PARA),
    fuelPerspective(PATRIOT_PUBLIC_OPENING_FUEL_PERSPECTIVE, "navy"),
  ].join("");

  const ownershipBody = [
    ...PATRIOT_PUBLIC_PRIVATE_PARAS.map(text => para(text)),
    numberTiles(PATRIOT_PUBLIC_PRIVATE_TILES, "brief-paper-blog-tiles brief-paper-cp-milestones"),
    fuelPerspective(PATRIOT_PUBLIC_OWNERSHIP_FUEL_PERSPECTIVE),
  ].join("");

  const productBody = [
    para(PATRIOT_PUBLIC_PRODUCTS_INTRO),
    para(PATRIOT_PUBLIC_FULL_SERVICE_PARA),
    numberTiles(PATRIOT_PUBLIC_PRICING_TILES, "brief-paper-blog-tiles brief-paper-cp-pricing"),
  ].join("");

  const marketBody = PATRIOT_PUBLIC_MARKET_PARAS.map(text => para(text)).join("");

  const wagerBody = [
    para(PATRIOT_PUBLIC_WAGER_PARA),
    fuelPerspective(PATRIOT_PUBLIC_WAGER_FUEL_PERSPECTIVE),
  ].join("");

  const posts = PATRIOT_PUBLIC_POSTS.map(post => (
    `<a class="brief-paper-cp-post-card" href="${esc(post.href)}" rel="noopener noreferrer">`
    + `<time datetime="">${esc(post.date)}</time>`
    + `<h3 class="brief-paper-cp-post-title">${esc(post.title)}</h3>`
    + `<p class="brief-paper-cp-post-excerpt">${esc(post.excerpt)}</p>`
    + `</a>`
  )).join("");

  const signalsBody = [
    `<p class="brief-paper-cp-section-intro">Recent stories and perspectives from Patriot Pay.</p>`,
    `<div class="brief-paper-cp-post-grid">${posts}</div>`,
  ].join("");

  const main = [
    profileSection("overview", "", "The big picture", "Meet Patriot Pay.", overviewBody, "brief-paper-cp-section--intro"),
    profileSection("company", "01", "The company", "Three minutes, then back to the work", companyBody),
    profileSection("ownership", "02", "Ownership", "Staying private was the decision", ownershipBody),
    profileSection("product", "03", "Product", "Two products, and permission to buy only one", productBody),
    profileSection("market", "04", "Market", "A market with a border", marketBody),
    profileSection("wager", "05", "The wager", "A plain mission can be a strategy", wagerBody),
    profileSection("signals", "", "The latest signals", "From the company", signalsBody),
  ].join("");

  return [
    `<article class="brief-paper-public-blog brief-paper-company-profile brief-paper-company-profile--make ${PATRIOT_PUBLIC_BLOG_MARKER}">`,
    `<header class="brief-paper-cp-hero">`,
    `<div class="brief-paper-cp-hero-glow" aria-hidden="true"></div>`,
    `<div class="brief-paper-cp-hero-inner">`,
    `<div class="brief-paper-cp-hero-main">`,
    `<p class="brief-paper-cp-eyebrow">Fuel company profile</p>`,
    `<h1 class="brief-paper-cp-title">`,
    `<span class="brief-paper-cp-title-row">`,
    `<span class="brief-paper-cp-logo-wrap">`,
    `<img class="brief-paper-cp-logo-img" src="${PATRIOT_LOGO_SRC}" alt="" width="80" height="80" loading="lazy" />`,
    `</span>`,
    `<span class="brief-paper-cp-name">Patriot Pay</span>`,
    `</span>`,
    `</h1>`,
    `<p class="brief-paper-cp-tagline">${esc(PATRIOT_PUBLIC_HERO_TAGLINE)}</p>`,
    `<div class="brief-paper-cp-hero-actions">`,
    `<span class="brief-paper-cp-verified">${PATRIOT_VERIFIED_ICON}Verified by Fuel</span>`,
    `<a class="brief-paper-cp-hero-website" href="${esc(PATRIOT_PUBLIC_COMPANY_SITE)}" rel="noopener noreferrer">Company website ↗</a>`,
    `</div>`,
    `</div>`,
    `<div class="brief-paper-cp-glance brief-paper-cp-glance--aside">`,
    `<p class="brief-paper-cp-glance-title">At a glance</p>`,
    `<dl class="brief-paper-cp-glance-dl">${glance}</dl>`,
    `</div>`,
    `</div>`,
    `</header>`,
    `<section class="brief-paper-cp-stats-wrap" aria-label="Company at a glance">`,
    `<dl class="brief-paper-cp-stats-bar">${stats}</dl>`,
    `</section>`,
    `<div class="brief-paper-cp-body">`,
    `<aside class="brief-paper-cp-sidebar">`,
    `<span class="brief-paper-cp-nav-title">Explore the story</span>`,
    `<nav class="brief-paper-cp-nav" aria-label="Profile chapters">${nav}</nav>`,
    `<div class="brief-paper-cp-sidebar-card">`,
    `<strong class="brief-paper-cp-sidebar-name">Patriot Pay</strong>`,
    `<p class="brief-paper-cp-sidebar-meta">Canton, Ohio · Founded 1986 · Privately held</p>`,
    `<a class="brief-paper-cp-website-link" href="${esc(PATRIOT_PUBLIC_COMPANY_SITE)}" rel="noopener noreferrer">Visit company website ↗</a>`,
    `</div>`,
    `</aside>`,
    `<div class="brief-paper-cp-main brief-paper-blog-main">${main}</div>`,
    `</div>`,
    `</article>`,
  ].join("");
}

export function isPatriotPayName(companyName: string): boolean {
  return companyName.trim().toLowerCase() === "patriot pay";
}
