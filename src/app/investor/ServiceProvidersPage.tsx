import React, { useMemo, useState } from "react";

type ServiceProvider = {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  website?: string;
  linkedin?: string;
};

const CATEGORIES = ["All categories", "Legal", "Finance", "Recruiting", "Security"] as const;

const SEED_PROVIDERS: ServiceProvider[] = [
  {
    id: "sp-h",
    name: "H Service provider",
    category: "Legal",
    description:
      "Corporate counsel for financings, commercial contracts, and portfolio company legal work across the York IE network.",
    tags: ["York", "Test", "Harmish"],
    website: "https://example.com",
    linkedin: "https://www.linkedin.com",
  },
];

function FuelMark() {
  return (
    <svg className="investor-sp-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 3.5 27 9.5v13L16 28.5 5 22.5v-13L16 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M16 3.5v25M5 9.5l11 6 11-6M5 22.5l11-6 11 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ServiceProvidersPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All categories");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEED_PROVIDERS.filter(provider => {
      if (category !== "All categories" && provider.category !== category) return false;
      if (!q) return true;
      return (
        provider.name.toLowerCase().includes(q)
        || provider.category.toLowerCase().includes(q)
        || provider.description.toLowerCase().includes(q)
        || provider.tags.some(tag => tag.toLowerCase().includes(q))
      );
    });
  }, [category, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceProvider[]>();
    for (const provider of filtered) {
      const list = map.get(provider.category) ?? [];
      list.push(provider);
      map.set(provider.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <section className="investor-sp-page">
      <header className="investor-sp-head">
        <div className="investor-sp-head-copy">
          <span className="investor-net-eyebrow">Network</span>
          <h1>Service providers</h1>
          <p>Hand-curated directory of vendors, service firms, and partners York IE works with.</p>
        </div>
        <button type="button" className="investor-sp-manage">
          Manage (super admin)
        </button>
      </header>

      <div className="investor-sp-toolbar">
        <label className="investor-sp-search">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M8.5 3a5.5 5.5 0 0 1 4.33 8.84l3.38 3.38a.75.75 0 1 1-1.06 1.06l-3.38-3.38A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
              fill="currentColor"
            />
          </svg>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search providers..."
            aria-label="Search providers"
          />
        </label>
        <label className="investor-sp-category">
          <span className="sr-only">Category</span>
          <select
            value={category}
            onChange={event => setCategory(event.target.value as (typeof CATEGORIES)[number])}
            aria-label="Filter by category"
          >
            {CATEGORIES.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {grouped.length === 0 ? (
        <div className="investor-sp-empty">
          <div className="investor-net-empty-icon" aria-hidden="true">
            <FuelMark />
          </div>
          <strong>No providers match</strong>
          <p>Try a different search or category filter.</p>
        </div>
      ) : (
        grouped.map(([groupName, providers]) => (
          <section key={groupName} className="investor-sp-group">
            <div className="investor-sp-group-label">
              <span>{groupName}</span>
              <em>{providers.length}</em>
            </div>
            <div className="investor-sp-grid">
              {providers.map(provider => (
                <article key={provider.id} className="investor-sp-card investor-net-card">
                  <div className="investor-sp-card-top">
                    <div className="investor-sp-logo" aria-hidden="true">
                      <FuelMark />
                    </div>
                    <div className="investor-sp-card-meta">
                      <strong>{provider.name}</strong>
                      <span className="investor-sp-category-pill">{provider.category}</span>
                    </div>
                  </div>
                  <p>{provider.description}</p>
                  <div className="investor-sp-tags">
                    {provider.tags.map(tag => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="investor-sp-card-foot">
                    <div className="investor-sp-links">
                      {provider.website ? (
                        <a href={provider.website} target="_blank" rel="noreferrer">
                          Website
                        </a>
                      ) : null}
                      {provider.linkedin ? (
                        <a href={provider.linkedin} target="_blank" rel="noreferrer">
                          LinkedIn
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
