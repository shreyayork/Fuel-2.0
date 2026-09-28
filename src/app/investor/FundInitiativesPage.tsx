import React, { useMemo, useState } from "react";
import { INVESTOR_PORTFOLIO } from "./investorData.ts";

type InitiativeRow = {
  id: string;
  company: string;
  title: string;
  owner: string;
  status: "On track" | "At risk" | "Proposed";
  track: string;
};

const FUND_INITIATIVES: InitiativeRow[] = [
  {
    id: "fi-1",
    company: INVESTOR_PORTFOLIO[0]?.displayName ?? "Portfolio co.",
    title: "Tighten CAC payback before next board",
    owner: "Growth lead",
    status: "At risk",
    track: "GTM",
  },
  {
    id: "fi-2",
    company: INVESTOR_PORTFOLIO[1]?.displayName ?? "Portfolio co.",
    title: "Ship usage-based pricing experiment",
    owner: "Product",
    status: "On track",
    track: "R&D",
  },
  {
    id: "fi-3",
    company: INVESTOR_PORTFOLIO[2]?.displayName ?? "Portfolio co.",
    title: "Close Q2 cash forecast gap",
    owner: "Finance",
    status: "Proposed",
    track: "G&A",
  },
];

export default function FundInitiativesPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FUND_INITIATIVES;
    return FUND_INITIATIVES.filter(row =>
      row.company.toLowerCase().includes(q)
      || row.title.toLowerCase().includes(q)
      || row.owner.toLowerCase().includes(q)
      || row.track.toLowerCase().includes(q)
      || row.status.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <section className="investor-network-page">
      <header className="investor-network-head">
        <h1>Initiatives</h1>
        <p>
          {FUND_INITIATIVES.length} open initiatives across the portfolio — work Fuel surfaces from
          company signals and scorecard gaps.
        </p>
      </header>

      <div className="investor-network-panel">
        <label className="investor-network-search">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M8.5 3a5.5 5.5 0 0 1 4.33 8.84l3.38 3.38a.75.75 0 1 1-1.06 1.06l-3.38-3.38A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
              fill="currentColor"
            />
          </svg>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search initiatives by company, title, or track…"
            aria-label="Search initiatives"
          />
        </label>

        <div className="investor-network-list">
          {filtered.length === 0 ? (
            <p className="investor-network-empty">No initiatives match this search.</p>
          ) : (
            filtered.map(row => (
              <article key={row.id} className="investor-network-card">
                <div className="investor-network-card-body is-full">
                  <div className="investor-network-card-head">
                    <strong>{row.title}</strong>
                    <span className={`investor-initiative-status is-${row.status === "On track" ? "good" : row.status === "At risk" ? "watch" : "muted"}`}>
                      {row.status}
                    </span>
                  </div>
                  <p>
                    {row.company} · {row.track} · Owner {row.owner}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
