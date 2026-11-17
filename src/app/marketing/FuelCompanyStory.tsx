import { useEffect, useMemo, useState } from "react";
import { loadPublishedBriefByToken } from "../briefDocStorage";
import { isCurrentPatriotPublicHtml } from "../patriotPublicStory";
import type { LegalDocId } from "../legal/legalContent";
import "../briefDocEditor.css";
import "../publicProfileCompanyPage.css";
import { LandingFooter, LandingNav, type LandingSectionId } from "./landingNav";
import "./landing.css";

export default function FuelCompanyStory({
  token,
  onSignIn,
  onOpenLegal,
  onCompanies,
  onHome,
  onSection,
}: {
  token: string;
  onSignIn: () => void;
  onOpenLegal?: (doc: LegalDocId) => void;
  onCompanies: () => void;
  onHome: () => void;
  onSection: (id: LandingSectionId) => void;
}) {
  const record = useMemo(() => loadPublishedBriefByToken(token), [token]);
  const publicBlog = Boolean(record?.html && isCurrentPatriotPublicHtml(record.html));
  const [floatingNav, setFloatingNav] = useState(false);

  useEffect(() => {
    const onScroll = () => setFloatingNav(window.scrollY > 72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = record ? `${record.companyName} · Company story` : "Company story";
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, [record]);

  const navProps = {
    active: "companies" as const,
    onSignIn,
    onHome,
    onCompanies,
    onSection,
  };

  if (!record || record.audience !== "public") {
    return (
      <main className="fl-root is-story">
        <div className={`fl-float-nav${floatingNav ? " is-visible" : ""}`} aria-hidden={!floatingNav}>
          <LandingNav variant="float" interactive={floatingNav} {...navProps} />
        </div>
        <header className="fl-story-nav">
          <LandingNav variant="top" {...navProps} />
        </header>
        <section className="fl-co-missing">
          <h1>This company story is not available</h1>
          <p>It was unpublished, or the link no longer matches a published blog.</p>
          <button type="button" className="fl-nav-login" onClick={onCompanies}>
            <span>All companies</span>
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="fl-root is-story">
      <div className={`fl-float-nav${floatingNav ? " is-visible" : ""}`} aria-hidden={!floatingNav}>
        <LandingNav variant="float" interactive={floatingNav} {...navProps} />
      </div>
      <header className="fl-story-nav">
        <LandingNav variant="top" {...navProps} />
      </header>
      <div className="brief-share-public-main">
        <div className={`brief-doc-canvas profile-about-company-canvas brief-share-public-canvas${publicBlog ? " is-public-blog" : ""}`}>
          <div
            className={`brief-paper${publicBlog ? " is-public-blog" : ""}`}
            dangerouslySetInnerHTML={{ __html: record.html }}
          />
        </div>
      </div>
      <LandingFooter onHome={onHome} onOpenLegal={onOpenLegal} />
    </main>
  );
}
