import React, { useMemo, useState } from "react";

type CoInvestor = {
  id: string;
  name: string;
  initials: string;
  logoTone: 1 | 2 | 3 | 4 | 5;
  companies: string[];
  bookmarked: boolean;
};

const SEED_INVESTORS: CoInvestor[] = [
  { id: "i-1", name: "360 ONE Asset", initials: "36", logoTone: 1, companies: ["Swiggy"], bookmarked: false },
  { id: "i-2", name: "Accel", initials: "A", logoTone: 2, companies: ["Swiggy"], bookmarked: true },
  { id: "i-3", name: "Alphawave Global", initials: "AG", logoTone: 3, companies: ["Swiggy"], bookmarked: false },
  { id: "i-4", name: "Amansa Capital", initials: "AC", logoTone: 4, companies: ["Swiggy"], bookmarked: false },
  { id: "i-5", name: "Amitabh Bachchan", initials: "AB", logoTone: 5, companies: ["Swiggy"], bookmarked: false },
  { id: "i-6", name: "Apoletto Asia Ltd", initials: "AA", logoTone: 1, companies: ["Swiggy"], bookmarked: false },
  { id: "i-7", name: "Asper Investment Management", initials: "AI", logoTone: 2, companies: ["Swiggy"], bookmarked: false },
  { id: "i-8", name: "Baron Capital Group", initials: "BC", logoTone: 3, companies: ["Swiggy"], bookmarked: true },
  { id: "i-9", name: "BlackRock", initials: "BR", logoTone: 4, companies: ["Swiggy"], bookmarked: false },
  { id: "i-10", name: "Coatue", initials: "C", logoTone: 5, companies: ["Swiggy"], bookmarked: true },
  { id: "i-11", name: "DST Global", initials: "DST", logoTone: 1, companies: ["Swiggy"], bookmarked: false },
  { id: "i-12", name: "Fiona Partners", initials: "FP", logoTone: 2, companies: ["Swiggy"], bookmarked: true },
  { id: "i-13", name: "Invesco", initials: "IN", logoTone: 3, companies: ["Swiggy"], bookmarked: false },
  { id: "i-14", name: "Life is Good Capital", initials: "LG", logoTone: 4, companies: ["Swiggy"], bookmarked: false },
  { id: "i-15", name: "MIH Internet SEA Pte. Ltd.", initials: "MI", logoTone: 5, companies: ["Swiggy"], bookmarked: false },
  { id: "i-16", name: "Naspers", initials: "N", logoTone: 1, companies: ["Swiggy"], bookmarked: true },
  { id: "i-17", name: "Norwest Venture Partners", initials: "NV", logoTone: 2, companies: ["Swiggy"], bookmarked: false },
  { id: "i-18", name: "Prosus Ventures", initials: "PV", logoTone: 3, companies: ["Swiggy"], bookmarked: true },
  { id: "i-19", name: "Qatar Investment Authority", initials: "QI", logoTone: 4, companies: ["Swiggy"], bookmarked: false },
  { id: "i-20", name: "Think Investments", initials: "TI", logoTone: 5, companies: ["Swiggy"], bookmarked: false },
];

type ViewTab = "network" | "bookmarked";

function companyLabel(count: number): string {
  return count === 1
    ? "Co-invested in 1 portfolio company"
    : `Co-invested in ${count} portfolio companies`;
}

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<CoInvestor[]>(() => [...SEED_INVESTORS]);
  const [tab, setTab] = useState<ViewTab>("network");
  const [query, setQuery] = useState("");

  const bookmarkedCount = useMemo(
    () => investors.filter(investor => investor.bookmarked).length,
    [investors],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return investors.filter(investor => {
      if (tab === "bookmarked" && !investor.bookmarked) return false;
      if (!q) return true;
      return (
        investor.name.toLowerCase().includes(q)
        || investor.companies.some(company => company.toLowerCase().includes(q))
      );
    });
  }, [investors, query, tab]);

  function toggleBookmark(id: string) {
    setInvestors(previous =>
      previous.map(investor =>
        investor.id === id ? { ...investor, bookmarked: !investor.bookmarked } : investor,
      ),
    );
  }

  return (
    <section className="inv-coinvest-page">
      <header className="inv-coinvest-head">
        <h1>Investors</h1>
        <p>Co-investors in your portfolio companies, auto-curated from fuel-data</p>
      </header>

      <div className="inv-coinvest-tabs" role="tablist" aria-label="Investor views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "network"}
          className={tab === "network" ? "is-active" : undefined}
          onClick={() => setTab("network")}
        >
          Network
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "bookmarked"}
          className={tab === "bookmarked" ? "is-active" : undefined}
          onClick={() => setTab("bookmarked")}
        >
          Bookmarked · {bookmarkedCount}
        </button>
      </div>

      <label className="inv-coinvest-filter">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M8.5 3a5.5 5.5 0 0 1 4.33 8.84l3.38 3.38a.75.75 0 1 1-1.06 1.06l-3.38-3.38A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
            fill="currentColor"
          />
        </svg>
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Filter by investor or portfolio company name..."
          aria-label="Filter investors"
        />
      </label>

      <div className="inv-coinvest-meta">
        <span>
          {filtered.length} OF {tab === "bookmarked" ? bookmarkedCount : investors.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="inv-coinvest-empty">
          <strong>{tab === "bookmarked" ? "No bookmarked investors" : "No investors match"}</strong>
          <p>
            {tab === "bookmarked"
              ? "Bookmark co-investors from the Network tab to keep them here."
              : "Try a different investor or portfolio company name."}
          </p>
        </div>
      ) : (
        <div className="inv-coinvest-grid">
          {filtered.map(investor => (
            <article
              key={investor.id}
              className={`inv-coinvest-card${investor.bookmarked ? " is-bookmarked" : ""}`}
            >
              <div className="inv-coinvest-card-top">
                <div
                  className={`inv-coinvest-logo is-tone-${investor.logoTone}`}
                  aria-hidden="true"
                >
                  {investor.initials}
                </div>
                <div className="inv-coinvest-card-copy">
                  <strong>{investor.name}</strong>
                  <span>{companyLabel(investor.companies.length)}</span>
                </div>
              </div>

              <div className="inv-coinvest-tags">
                {investor.companies.map(company => (
                  <span key={company}>{company}</span>
                ))}
              </div>

              <div className="inv-coinvest-card-foot">
                <span className={`inv-coinvest-status${investor.bookmarked ? " is-on" : ""}`}>
                  {investor.bookmarked ? "Bookmarked" : "Not bookmarked"}
                </span>
                <button
                  type="button"
                  className={`inv-coinvest-action${investor.bookmarked ? " is-remove" : " is-bookmark"}`}
                  onClick={() => toggleBookmark(investor.id)}
                >
                  {investor.bookmarked ? "Remove" : "Bookmark"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
