import { useEffect, useMemo, useState } from "react";
import { FUEL_INVESTORS, INVESTOR_PAGE_SIZE, investorLogoUrl, type FuelInvestor } from "./founderInvestors.ts";
import "./founder-investors.css";

const BOOKMARKS_KEY = "fuel-founder-investor-bookmarks";

function readBookmarks(): string[] {
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function InvestorMark({ investor }: { investor: FuelInvestor }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="f21-investors-mark is-fallback" aria-hidden="true">{investor.name.slice(0, 1)}</span>;
  }
  return (
    <img
      className="f21-investors-mark"
      src={investorLogoUrl(investor.domain)}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

export function FounderInvestorsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "saved">("all");
  const [layout, setLayout] = useState<"card" | "list">("card");
  const [visible, setVisible] = useState(INVESTOR_PAGE_SIZE);
  const [saved, setSaved] = useState<string[]>(readBookmarks);

  useEffect(() => {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(saved));
  }, [saved]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return FUEL_INVESTORS.filter(investor => {
      if (tab === "saved" && !saved.includes(investor.id)) return false;
      if (!needle) return true;
      return investor.name.toLowerCase().includes(needle) || investor.domain.toLowerCase().includes(needle);
    });
  }, [query, tab, saved]);

  const shown = filtered.slice(0, visible);
  const bookmarkCount = saved.length;

  const toggleSaved = (id: string) => {
    setSaved(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  };

  return (
    <section className="f21-investors" aria-label="Investors">
      <header className="f21-investors-head">
        <h1>Investors</h1>
        <p>All Fuel investors — your company first, then most active.</p>
      </header>

      <div className="f21-investors-tabs" role="tablist" aria-label="Investor lists">
        <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "is-active" : ""} onClick={() => { setTab("all"); setVisible(INVESTOR_PAGE_SIZE); }}>
          All investors
        </button>
        <button type="button" role="tab" aria-selected={tab === "saved"} className={tab === "saved" ? "is-active" : ""} onClick={() => { setTab("saved"); setVisible(INVESTOR_PAGE_SIZE); }}>
          Bookmarked · {bookmarkCount}
        </button>
      </div>

      <div className="f21-investors-toolbar">
        <label className="f21-investors-filter">
          <span className="f21-investors-sr">Filter by investor name</span>
          <input
            type="search"
            value={query}
            placeholder="Filter by investor name..."
            onChange={event => {
              setQuery(event.target.value);
              setVisible(INVESTOR_PAGE_SIZE);
            }}
          />
        </label>
        <div className="f21-investors-layout" role="group" aria-label="Layout">
          <button type="button" className={layout === "card" ? "is-active" : ""} onClick={() => setLayout("card")}>Card</button>
          <button type="button" className={layout === "list" ? "is-active" : ""} onClick={() => setLayout("list")}>List</button>
        </div>
      </div>

      <p className="f21-investors-count">{shown.length} of {filtered.length}</p>

      {shown.length === 0 ? (
        <p className="f21-investors-empty">
          {tab === "saved" ? "No bookmarked investors yet." : "No investors match that name."}
        </p>
      ) : (
        <div className={`f21-investors-grid${layout === "list" ? " is-list" : ""}`}>
          {shown.map(investor => {
            const bookmarked = saved.includes(investor.id);
            return (
              <article key={investor.id} className="f21-investors-card">
                <div className="f21-investors-card-main">
                  <InvestorMark investor={investor} />
                  <div className="f21-investors-card-copy">
                    <strong>{investor.name}</strong>
                    <span>{investor.domain}</span>
                  </div>
                </div>
                <div className="f21-investors-card-foot">
                  <span>{bookmarked ? "Bookmarked" : "Not bookmarked"}</span>
                  <button
                    type="button"
                    className={`f21-investors-bookmark${bookmarked ? " is-on" : ""}`}
                    aria-pressed={bookmarked}
                    onClick={() => toggleSaved(investor.id)}
                  >
                    Bookmark
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {shown.length < filtered.length ? (
        <div className="f21-investors-more">
          <button type="button" onClick={() => setVisible(count => count + INVESTOR_PAGE_SIZE)}>
            Load more
          </button>
        </div>
      ) : null}
    </section>
  );
}
