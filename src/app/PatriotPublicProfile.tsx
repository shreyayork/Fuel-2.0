import { buildPatriotPublicPaperHtml } from "./patriotPublicStory";
import "./publicProfileCompanyPage.css";

/** Legacy standalone page — renders the same HTML as About company / public brief. */
export function PatriotPublicProfile() {
  const html = buildPatriotPublicPaperHtml();
  return (
    <div
      className="brief-doc-canvas is-public-blog profile-about-company-canvas"
      dangerouslySetInnerHTML={{ __html: `<div class="brief-paper is-public-blog">${html}</div>` }}
    />
  );
}
