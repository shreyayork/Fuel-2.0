import { useEffect, useMemo, useRef, useState } from "react";
import type { BriefPublishRecord } from "../briefDocStorage";
import { listPublishedBriefs } from "../briefDocStorage";
import type { LegalDocId } from "../legal/legalContent";
import { HeroGraphic } from "./FuelLanding";
import { LandingFooter, LandingNav, useHeroFloatingNav, type LandingSectionId } from "./landingNav";
import "./landing.css";

type CompanyCard = {
  token: string;
  name: string;
  location: string;
  tagline: string;
  founded: string;
  ownership: string;
  logo: string;
};

function fieldValue(doc: Document, label: string): string {
  const wanted = label.toLowerCase();
  const nodes = doc.querySelectorAll("dt, th, td");
  for (const node of nodes) {
    if (node.textContent?.trim().toLowerCase() !== wanted) continue;
    const value = node.nextElementSibling?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (value) return value;
  }
  return "";
}

function profileLogo(doc: Document, name: string): string {
  const fromProfile = doc.querySelector(".brief-paper-cp-logo-img")?.getAttribute("src")?.trim() || "";
  const isCompanyLogo = (/^https:\/\//.test(fromProfile) || fromProfile.startsWith("/company-logos/"))
    && !fromProfile.includes("/assets/5bfb0.svg");
  if (isCompanyLogo) return fromProfile;
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug ? `/company-logos/${slug}.svg` : "";
}

function CompanyLogo({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className="fl-co-logo is-letter" aria-hidden="true">{name.slice(0, 1)}</span>;
  }
  return (
    <span className="fl-co-logo">
      <img src={src} alt="" onError={() => setFailed(true)} />
    </span>
  );
}

function companyCard(record: BriefPublishRecord): CompanyCard {
  const doc = new DOMParser().parseFromString(`<div>${record.html}</div>`, "text/html");
  const tagline = doc.querySelector(".brief-paper-cp-tagline")?.textContent?.replace(/\s+/g, " ").trim()
    || doc.querySelector("section p")?.textContent?.replace(/\s+/g, " ").trim()
    || "";
  const meta = (doc.querySelector(".brief-paper-cp-sidebar-meta")?.textContent || "")
    .split("·")
    .map(part => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const foundedFromMeta = meta.find(part => /^founded\b/i.test(part))?.replace(/^founded\s+/i, "") ?? "";
  const locationFromMeta = meta.find(part => !/^founded\b/i.test(part) && !/held|owned|private|public/i.test(part)) ?? "";
  const ownershipFromMeta = meta.find(part => /held|owned|private|public/i.test(part) && !/^founded\b/i.test(part)) ?? "";
  return {
    token: record.token,
    name: record.companyName,
    location: fieldValue(doc, "Headquarters") || fieldValue(doc, "Location") || locationFromMeta,
    tagline,
    founded: fieldValue(doc, "Founded") || foundedFromMeta,
    ownership: fieldValue(doc, "Ownership") || ownershipFromMeta,
    logo: profileLogo(doc, record.companyName),
  };
}

function factsLine(card: CompanyCard): string {
  const parts = [
    card.founded ? `Founded ${card.founded}` : "",
    card.ownership,
  ].filter(Boolean);
  return parts.join(" · ");
}

const PILLARS = [
  {
    title: "The business",
    body: "Understand what a company does, who it serves, and the problem it solves.",
    icon: "business",
  },
  {
    title: "The context",
    body: "Put the company story in perspective with key facts and business milestones.",
    icon: "context",
  },
  {
    title: "The momentum",
    body: "Explore recent company updates and the ideas shaping what comes next.",
    icon: "momentum",
  },
] as const;

function PillarIcon({ name }: { name: (typeof PILLARS)[number]["icon"] }) {
  if (name === "context") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 10v7l4 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "momentum") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 6l1.6 5.2L23 13l-5.4 1.8L16 20l-1.6-5.2L9 13l5.4-1.8L16 6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M24 18l.8 2.4L27 21l-2.2.8L24 24l-.8-2.2L21 21l2.2-.6L24 18Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 26V14M12 26V10M18 26V16M24 26V8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function FuelCompanies({
  onSignIn,
  onOpenLegal,
  onOpenStory,
  onHome,
  onSection,
}: {
  onSignIn: () => void;
  onOpenLegal?: (doc: LegalDocId) => void;
  onOpenStory: (token: string) => void;
  onHome: () => void;
  onSection: (id: LandingSectionId) => void;
}) {
  const heroRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const floatingNav = useHeroFloatingNav(heroRef);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<BriefPublishRecord[]>(() => listPublishedBriefs("public"));

  useEffect(() => {
    const refresh = () => setRecords(listPublishedBriefs("public"));
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = [...root.querySelectorAll<HTMLElement>(".fl-reveal")];
    const revealed = new Set<HTMLElement>();
    const show = (list: HTMLElement[]) => {
      const ordered = [...list].sort((a, b) => (a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      ordered.forEach((el, index) => {
        el.style.animationDelay = `${index * 100}ms`;
        el.dataset.reveal = "in";
        revealed.add(el);
      });
    };
    const seen = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight - 32 && rect.bottom > 32;
    };
    root.classList.add("is-motion");
    const groups = new Map<HTMLElement, HTMLElement[]>();
    items.filter(seen).forEach(el => {
      const section = (el.closest("section, footer") as HTMLElement | null) ?? root;
      const bucket = groups.get(section) ?? [];
      bucket.push(el);
      groups.set(section, bucket);
    });
    groups.forEach(show);
    const observer = new IntersectionObserver(entries => {
      const hit = entries.filter(entry => entry.isIntersecting).map(entry => entry.target as HTMLElement);
      const fresh = items.filter(el => !revealed.has(el) && hit.includes(el));
      if (!fresh.length) return;
      fresh.forEach(el => observer.unobserve(el));
      const next = new Map<HTMLElement, HTMLElement[]>();
      fresh.forEach(el => {
        const section = (el.closest("section, footer") as HTMLElement | null) ?? root;
        const bucket = next.get(section) ?? [];
        bucket.push(el);
        next.set(section, bucket);
      });
      next.forEach(show);
    }, { rootMargin: "0px 0px -48px 0px", threshold: 0 });
    items.forEach(el => {
      if (!revealed.has(el)) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [records.length]);

  const cards = useMemo(() => records.map(companyCard), [records]);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? cards.filter(card => [card.name, card.location, card.tagline, card.ownership].join(" ").toLowerCase().includes(needle))
    : cards;
  const countLabel = `${cards.length} ${cards.length === 1 ? "company" : "companies"}`;
  const rangeLabel = visible.length
    ? `1–${visible.length} of ${visible.length} ${visible.length === 1 ? "company" : "companies"}`
    : `0 of ${cards.length} ${cards.length === 1 ? "company" : "companies"}`;

  const navProps = {
    onSignIn,
    onHome,
    onCompanies: () => document.getElementById("company-directory")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    onSection,
    active: "companies" as const,
  };

  return (
    <main className="fl-root fl-companies" ref={rootRef}>
      <div className={`fl-float-nav${floatingNav ? " is-visible" : ""}`} aria-hidden={!floatingNav}>
        <LandingNav variant="float" interactive={floatingNav} {...navProps} />
      </div>

      <section className="fl-hero fl-co-hero" ref={heroRef}>
        <LandingNav variant="top" reveal {...navProps} />
        <div className="fl-hero-content">
          <div className="fl-hero-copy">
            <div className="fl-hero-headline">
              <p className="fl-eyebrow is-mint fl-reveal">Fuel company intelligence</p>
              <h1 className="fl-reveal">
                Discover the companies.
                <span>Understand their stories.</span>
              </h1>
              <p className="fl-reveal">
                Go beyond the company name. Explore the businesses, ideas, and people moving markets forward—with the context to see what matters.
              </p>
            </div>
            <button
              type="button"
              className="fl-nav-login fl-reveal"
              onClick={() => document.getElementById("company-directory")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <span>Explore companies</span>
              <span aria-hidden="true">↓</span>
            </button>
          </div>
          <HeroGraphic />
        </div>
      </section>

      <section className="fl-section is-white fl-co-directory" id="company-directory">
        <div className="fl-co-directory-head">
          <div>
            <p className="fl-eyebrow fl-reveal">The companies behind the momentum</p>
            <h2 className="fl-reveal">
              Different businesses. <span className="is-green">A closer look.</span>
            </h2>
          </div>
          <span className="fl-co-count fl-reveal">{countLabel}</span>
        </div>
        <div className="fl-co-tools">
          <label className="fl-co-search fl-reveal">
            <span className="fl-co-search-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20">
                <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M13 13l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search companies or locations"
              aria-label="Search companies or locations"
              type="search"
            />
          </label>
          <p className="fl-co-range fl-reveal">{rangeLabel}</p>
        </div>
        {visible.length ? (
          <ul className="fl-co-grid">
            {visible.map(card => (
              <li key={card.token} className="fl-reveal is-up">
                <article className="fl-co-card">
                  <button type="button" className="fl-co-card-hit" onClick={() => onOpenStory(card.token)}>
                    <span className="fl-co-card-top">
                      <CompanyLogo src={card.logo} name={card.name} />
                      <span className="fl-co-open" aria-hidden="true">
                        <svg viewBox="0 0 20 20">
                          <path d="M6 14 14 6M8 6h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </span>
                    <span className="fl-co-name">{card.name}</span>
                    {card.location ? <span className="fl-co-location">{card.location}</span> : null}
                    {card.tagline ? <span className="fl-co-tagline">{card.tagline}</span> : null}
                    <span className="fl-co-rule" aria-hidden="true" />
                    {factsLine(card) ? <span className="fl-co-facts">{factsLine(card)}</span> : null}
                    <span className="fl-co-read">Read company profile</span>
                  </button>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fl-co-empty fl-reveal">
            {cards.length
              ? "No companies match that search."
              : "No company stories are published yet. When a company publishes from Blog, the story shows up here."}
          </p>
        )}
      </section>

      <section className="fl-co-pillars">
        {PILLARS.map(pillar => (
          <article key={pillar.title} className="fl-reveal">
            <span className="fl-co-pillar-icon">
              <PillarIcon name={pillar.icon} />
            </span>
            <h3>{pillar.title}</h3>
            <p>{pillar.body}</p>
          </article>
        ))}
      </section>

      <section className="fl-co-cta">
        <div>
          <p className="fl-eyebrow is-mint fl-reveal">A clearer view of what comes next</p>
          <h2 className="fl-reveal">
            <span className="is-white">Company intelligence.</span>
            <span className="is-gold">Built for moving forward.</span>
          </h2>
        </div>
        <button type="button" className="fl-nav-login fl-reveal" onClick={() => onSection("platform")}>
          <span>Explore the Fuel platform</span>
          <span aria-hidden="true">↗</span>
        </button>
      </section>

      <LandingFooter onHome={onHome} onOpenLegal={onOpenLegal} />
    </main>
  );
}
