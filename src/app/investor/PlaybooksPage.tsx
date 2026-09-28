import React, { useMemo, useState } from "react";
import { PLAYBOOKS, PLAYBOOK_COUNT, type Playbook, type PlaybookTrack } from "../fuelBrief.ts";

type TrackFilter = "all" | PlaybookTrack;

const TRACK_TABS: { id: TrackFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "rd", label: "R&D" },
  { id: "gtm", label: "GTM" },
  { id: "ga", label: "G&A" },
  { id: "investing", label: "Investing" },
  { id: "founder", label: "Founder" },
  { id: "other", label: "Other" },
];

function PlaybookCard({
  playbook,
  onSelect,
}: {
  playbook: Playbook;
  onSelect?: (playbook: Playbook) => void;
}) {
  return (
    <button
      type="button"
      className="investor-playbooks-card"
      onClick={() => onSelect?.(playbook)}
    >
      <div className="investor-playbooks-card-head">
        <strong>{playbook.name}</strong>
        <span className="investor-playbooks-scope">{playbook.scope ?? "global"}</span>
      </div>
      <p>{playbook.description}</p>
      <div className="investor-playbooks-tags">
        {playbook.tags.map(tag => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </button>
  );
}

export default function PlaybooksPage({
  onSelectPlaybook,
}: {
  onSelectPlaybook?: (playbook: Playbook) => void;
} = {}) {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<TrackFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLAYBOOKS.filter(playbook => {
      if (track !== "all" && playbook.track !== track) return false;
      if (!q) return true;
      return (
        playbook.name.toLowerCase().includes(q)
        || playbook.description.toLowerCase().includes(q)
        || playbook.category.toLowerCase().includes(q)
        || playbook.kind.toLowerCase().includes(q)
        || playbook.tags.some(tag => tag.toLowerCase().includes(q))
      );
    });
  }, [query, track]);

  const grouped = useMemo(() => {
    const sections: { category: string; kind: string; items: Playbook[] }[] = [];
    const indexByKey = new Map<string, number>();

    filtered.forEach(playbook => {
      const key = `${playbook.category}::${playbook.kind}`;
      const existing = indexByKey.get(key);
      if (existing != null) {
        sections[existing]!.items.push(playbook);
        return;
      }
      indexByKey.set(key, sections.length);
      sections.push({
        category: playbook.category,
        kind: playbook.kind,
        items: [playbook],
      });
    });

    return sections;
  }, [filtered]);

  return (
    <section className="investor-playbooks-page">
      <header className="investor-playbooks-head">
        <h1>Playbooks</h1>
        <p>
          {PLAYBOOK_COUNT} playbooks · runbooks Fuel AI executes against a company using its signal
          context — diligence, pricing reviews, audits, planning frameworks, and more.
        </p>
      </header>

      <div className="investor-playbooks-toolbar">
        <label className="investor-playbooks-search">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M8.5 3a5.5 5.5 0 0 1 4.33 8.84l3.38 3.38a.75.75 0 1 1-1.06 1.06l-3.38-3.38A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
              fill="currentColor"
            />
          </svg>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search playbooks by title, description, or tag…"
            aria-label="Search playbooks"
          />
        </label>

        <div className="investor-playbooks-tabs" role="tablist" aria-label="Playbook tracks">
          {TRACK_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={track === tab.id}
              className={track === tab.id ? "is-active" : undefined}
              onClick={() => setTrack(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="investor-playbooks-body">
        {grouped.length === 0 ? (
          <p className="investor-playbooks-empty">
            No playbooks match{query.trim() ? ` “${query.trim()}”` : " this filter"}.
          </p>
        ) : (
          grouped.map(section => (
            <section key={`${section.category}-${section.kind}`} className="investor-playbooks-section">
              <div className="investor-playbooks-section-label">
                <span>{section.category}</span>
                {section.kind && section.kind !== section.category ? (
                  <>
                    <i aria-hidden="true">›</i>
                    <em>{section.kind}</em>
                  </>
                ) : null}
              </div>
              <div className="investor-playbooks-grid">
                {section.items.map(playbook => (
                  <PlaybookCard
                    key={playbook.id}
                    playbook={playbook}
                    onSelect={onSelectPlaybook}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}
