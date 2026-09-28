import React, { useMemo, useState } from "react";

type AdvisorScope = "Platform" | "Workspace" | "Personal";

type Advisor = {
  id: string;
  name: string;
  initials: string;
  scope: AdvisorScope;
  focus: string;
  linkedCompanies: number;
  active: boolean;
};

const SEED_ADVISORS: Advisor[] = [
  {
    id: "adv-xv",
    name: "xv",
    initials: "X",
    scope: "Platform",
    focus: "Operator available for portfolio company work",
    linkedCompanies: 0,
    active: true,
  },
];

function NetworkMark({ kind }: { kind: "person" | "empty" }) {
  if (kind === "empty") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="18" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M10 38c2.5-7 8-11 14-11s11.5 4 14 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return null;
}

export default function AdvisorsPage() {
  const [advisors, setAdvisors] = useState<Advisor[]>(() => [...SEED_ADVISORS]);
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");

  const activeCount = useMemo(
    () => advisors.filter(advisor => advisor.active).length,
    [advisors],
  );

  function addAdvisor() {
    const name = draftName.trim();
    if (!name) return;
    const initials = name.slice(0, 1).toUpperCase();
    setAdvisors(previous => [
      {
        id: `adv-${Date.now()}`,
        name,
        initials,
        scope: "Workspace",
        focus: "Newly added advisor",
        linkedCompanies: 0,
        active: true,
      },
      ...previous,
    ]);
    setDraftName("");
    setAdding(false);
  }

  return (
    <section className="investor-advisors-page">
      <header className="investor-advisors-head">
        <div className="investor-advisors-head-copy">
          <span className="investor-net-eyebrow">Network</span>
          <h1>Advisors</h1>
          <p>
            Operators and specialists you can loop into portfolio work — diligence, GTM pushes, and board prep.
            <span className="investor-advisors-active-count"> · {activeCount} active</span>
          </p>
        </div>
        <div className="investor-advisors-actions">
          <button type="button" className="investor-advisors-btn is-secondary">
            Enhance all (LinkedIn)
          </button>
          <button
            type="button"
            className="investor-advisors-btn is-primary"
            onClick={() => setAdding(open => !open)}
          >
            {adding ? "Cancel" : "+ Add advisor"}
          </button>
        </div>
      </header>

      {adding ? (
        <div className="investor-advisors-create" role="form" aria-label="Add advisor">
          <input
            value={draftName}
            onChange={event => setDraftName(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                addAdvisor();
              }
            }}
            placeholder="Advisor name"
            aria-label="Advisor name"
            autoFocus
          />
          <button
            type="button"
            className="investor-advisors-btn is-primary"
            onClick={addAdvisor}
            disabled={!draftName.trim()}
          >
            Save
          </button>
        </div>
      ) : null}

      {advisors.length === 0 ? (
        <div className="investor-advisors-empty">
          <div className="investor-net-empty-icon" aria-hidden="true">
            <NetworkMark kind="empty" />
          </div>
          <strong>No advisors yet</strong>
          <p>Add operators and specialists you can loop into portfolio company work.</p>
          <button
            type="button"
            className="investor-advisors-btn is-primary"
            onClick={() => setAdding(true)}
          >
            + Add advisor
          </button>
        </div>
      ) : (
        <div className="investor-advisors-grid">
          {advisors.map(advisor => (
            <article key={advisor.id} className="investor-advisors-card investor-net-card">
              <div className="investor-advisors-card-top">
                <div
                  className={`investor-advisors-avatar is-tone-${(advisor.name.charCodeAt(0) % 4) + 1}`}
                  aria-hidden="true"
                >
                  {advisor.initials}
                </div>
                <div className="investor-advisors-card-meta">
                  <div className="investor-advisors-name-row">
                    <strong>{advisor.name}</strong>
                    <span className={`investor-advisors-scope is-${advisor.scope.toLowerCase()}`}>
                      {advisor.scope}
                    </span>
                  </div>
                  <p className="investor-advisors-focus">{advisor.focus}</p>
                </div>
              </div>
              <div className="investor-advisors-card-foot">
                <span className="investor-advisors-linked">
                  {advisor.linkedCompanies === 1
                    ? "1 linked company"
                    : `${advisor.linkedCompanies} linked companies`}
                </span>
                <span className="investor-net-card-action">Open</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
