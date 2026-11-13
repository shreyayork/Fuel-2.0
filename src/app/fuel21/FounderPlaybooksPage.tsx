import { useMemo, useState } from "react";
import { PLAYBOOKS, type Playbook } from "../fuelBrief.ts";
import "./founder-playbooks.css";

type FounderPlaybooksPageProps = {
  onRun: (playbook: Playbook) => void;
};

export function FounderPlaybooksPage({ onRun }: FounderPlaybooksPageProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "runs">("all");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const grouped: { category: string; items: Playbook[] }[] = [];
    PLAYBOOKS.forEach(playbook => {
      if (needle && !`${playbook.name} ${playbook.description} ${playbook.category}`.toLowerCase().includes(needle)) return;
      const existing = grouped.find(group => group.category === playbook.category);
      if (existing) existing.items.push(playbook);
      else grouped.push({ category: playbook.category, items: [playbook] });
    });
    return grouped;
  }, [query]);

  const shownCount = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <section className="f21-playbooks" aria-label="Playbooks">
      <header className="f21-playbooks-head">
        <h1>Playbooks</h1>
        <p>Run a playbook in Ask Fuel to generate intelligence for your company. Each run uses your benchmarks, signals, and profile.</p>
      </header>

      <div className="f21-playbooks-tabs" role="tablist" aria-label="Playbook lists">
        <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "is-active" : ""} onClick={() => setTab("all")}>
          All playbooks
        </button>
        <button type="button" role="tab" aria-selected={tab === "runs"} className={tab === "runs" ? "is-active" : ""} onClick={() => setTab("runs")}>
          Runs
        </button>
      </div>

      {tab === "runs" ? (
        <p className="f21-playbooks-empty">Runs you start in Ask Fuel show up in the chat.</p>
      ) : (
        <>
          <label className="f21-playbooks-filter">
            <span className="f21-playbooks-sr">Filter by playbook name</span>
            <input
              type="search"
              value={query}
              placeholder="Filter by playbook name..."
              onChange={event => setQuery(event.target.value)}
            />
          </label>
          <p className="f21-playbooks-count">{shownCount} of {PLAYBOOKS.length}</p>
          {groups.length === 0 ? (
            <p className="f21-playbooks-empty">No playbooks match that name.</p>
          ) : groups.map(group => (
            <section key={group.category} className="f21-playbooks-group" aria-label={group.category}>
              <h2>{group.category}</h2>
              <div className="f21-playbooks-grid">
                {group.items.map(playbook => (
                  <article key={playbook.id} className="f21-playbooks-card">
                    <div>
                      <strong>{playbook.name}</strong>
                      <p>{playbook.description}</p>
                    </div>
                    <button type="button" onClick={() => onRun(playbook)}>Run in Ask Fuel</button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </section>
  );
}
