import React, { useMemo, useState } from "react";

export type NetworkDirectoryKind = "advisors" | "service-providers" | "investors";

type DirectoryPerson = {
  id: string;
  name: string;
  role: string;
  focus: string;
  tags: string[];
};

const DIRECTORY: Record<NetworkDirectoryKind, {
  title: string;
  lede: string;
  empty: string;
  searchPlaceholder: string;
  people: DirectoryPerson[];
}> = {
  advisors: {
    title: "Advisors",
    lede: "Operators and specialists you can loop into portfolio company work — diligence reviews, GTM pushes, and board prep.",
    empty: "No advisors match this search.",
    searchPlaceholder: "Search advisors by name, focus, or tag…",
    people: [],
  },
  "service-providers": {
    title: "Service providers",
    lede: "Vetted firms for legal, finance, recruiting, and security work across your portfolio.",
    empty: "No service providers match this search.",
    searchPlaceholder: "Search providers by name, focus, or tag…",
    people: [
      { id: "sp-1", name: "Northline Legal", role: "Corporate counsel", focus: "Financings · commercial contracts", tags: ["legal", "finance"] },
    ],
  },
  investors: {
    title: "Investors",
    lede: "Co-investors and syndicate partners you can introduce into deals or portfolio rounds.",
    empty: "No investors match this search.",
    searchPlaceholder: "Search investors by name, focus, or tag…",
    people: [],
  },
};

export default function NetworkDirectoryPage({ kind }: { kind: NetworkDirectoryKind }) {
  const config = DIRECTORY[kind];
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return config.people;
    return config.people.filter(person =>
      person.name.toLowerCase().includes(q)
      || person.role.toLowerCase().includes(q)
      || person.focus.toLowerCase().includes(q)
      || person.tags.some(tag => tag.toLowerCase().includes(q)),
    );
  }, [config.people, query]);

  return (
    <section className="investor-network-page">
      <header className="investor-network-head">
        <h1>{config.title}</h1>
        <p>
          {config.people.length} {config.title.toLowerCase()} · {config.lede}
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
            placeholder={config.searchPlaceholder}
            aria-label={`Search ${config.title.toLowerCase()}`}
          />
        </label>

        <div className="investor-network-list">
          {filtered.length === 0 ? (
            <p className="investor-network-empty">{config.empty}</p>
          ) : (
            filtered.map(person => (
              <article key={person.id} className="investor-network-card">
                <div className="investor-network-card-avatar" aria-hidden="true">
                  {person.name.slice(0, 1)}
                </div>
                <div className="investor-network-card-body">
                  <div className="investor-network-card-head">
                    <strong>{person.name}</strong>
                    <span>{person.role}</span>
                  </div>
                  <p>{person.focus}</p>
                  <div className="investor-network-tags">
                    {person.tags.map(tag => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
