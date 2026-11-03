import { breadcrumbFor, type NavId } from "./demoData.ts";

export function PlaceholderPage({ page }: { page: NavId }) {
  const title = breadcrumbFor(page);
  return (
    <div className="f21-page f21-placeholder">
      <div className="f21-page-head">
        <div>
          <h1>{title}</h1>
          <p className="f21-lede">Placeholder until this screen has its own mockup.</p>
        </div>
      </div>
      <section className="f21-panel f21-placeholder-card">
        <div className="f21-eyebrow">Coming soon</div>
        <p>Use the sidebar for Dashboard, Context Engine, or R&amp;D — those screens match the provided mockups.</p>
      </section>
    </div>
  );
}
