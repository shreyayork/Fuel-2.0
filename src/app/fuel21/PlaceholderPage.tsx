import { breadcrumbFor, type NavId } from "./demoData.ts";

export function PlaceholderPage({ page }: { page: NavId }) {
  const title = breadcrumbFor(page);
  return (
    <div className="f21-page f21-placeholder">
      <div className="f21-page-head">
        <div>
          <h1>{title}</h1>
          <p className="f21-lede">
            This section uses the shared Fuel shell. Full layout ships with the next mockup set.
          </p>
        </div>
      </div>
      <section className="f21-panel f21-placeholder-card">
        <div className="f21-eyebrow">Coming soon</div>
        <p>
          Navigate with the sidebar to Dashboard, Context Engine, or R&amp;D for the complete Fuel 2.1.0
          screens.
        </p>
      </section>
    </div>
  );
}
