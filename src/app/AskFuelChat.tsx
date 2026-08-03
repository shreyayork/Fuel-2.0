// ─── Fuel AI — Ask Fuel chat drawer (composer, playbooks, brief) ───────────────
import React, { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "./a11y/useDialogA11y";
import type { BenchmarkFormValues } from "./PatriotPayJourney";
import {
  generateBrief, PLAYBOOKS, PLAYBOOK_COUNT,
  type Brief, type BriefFlag, type Playbook,
} from "./fuelBrief";

const FLAG_COLOUR: Record<BriefFlag, string> = {
  good: "#3FD68C",
  warn: "#E0B341",
  crit: "#CF8A8A",
  neutral: "#7B8997",
};
const FLAG_DOT: Record<BriefFlag, string> = { good: "✅", warn: "🟡", crit: "🔴", neutral: "·" };

// ─── Full brief document (used in chat + "view in details") ────────────────────
export function BriefDoc({ brief, companyName }: { brief: Brief; companyName: string }) {
  return (
    <div className="fb-doc">
      <div className="fb-doc-head">
        <div className="fb-doc-title">{companyName} — Signal-Driven Intelligence Brief</div>
        <div className="fb-doc-meta">{brief.metaLine}</div>
      </div>

      <section className="fb-sec">
        <h4 className="fb-sec-title">State of the Business</h4>
        <p className="fb-p">{brief.stateOfBusiness}</p>
        {brief.dataQualityFlag ? (
          <div className="fb-flag"><span>⚠ Data quality flag</span>{brief.dataQualityFlag}</div>
        ) : null}
      </section>

      <section className="fb-sec">
        <h4 className="fb-sec-title">Traction <span className="fb-sig">[signal: growth]</span></h4>
        <BriefTable rows={brief.traction.rows} />
        <BriefList bullets={brief.traction.bullets.map(b => b.text)} />
      </section>

      <section className="fb-sec">
        <h4 className="fb-sec-title">Efficiency &amp; Finance <span className="fb-sig">[signal: efficiency, finance]</span></h4>
        <BriefTable rows={brief.finance.rows} />
        <BriefList bullets={brief.finance.bullets.map(b => b.text)} />
      </section>

      <section className="fb-sec">
        <h4 className="fb-sec-title">Fundraising <span className="fb-sig">[signal: fundraising]</span></h4>
        <BriefList bullets={brief.fundraising.map(b => b.text)} />
      </section>

      <section className="fb-sec">
        <h4 className="fb-sec-title">Risks</h4>
        <div className="fb-risks">
          {brief.risks.map((r, i) => (
            <div key={i} className="fb-risk">
              <span className="fb-risk-dot" style={{ background: FLAG_COLOUR[r.flag] }} />
              <div>
                <span className="fb-risk-title">{r.title}</span>
                <span className="fb-risk-sig"> [signal: {r.signal}]</span>
                <p className="fb-p">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="fb-sec">
        <h4 className="fb-sec-title">Opportunities</h4>
        <div className="fb-risks">
          {brief.opportunities.map((r, i) => (
            <div key={i} className="fb-risk">
              <span className="fb-risk-dot" style={{ background: FLAG_COLOUR[r.flag] }} />
              <div>
                <span className="fb-risk-title">{r.title}</span>
                <span className="fb-risk-sig"> [signal: {r.signal}]</span>
                <p className="fb-p">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="fb-sec">
        <h4 className="fb-sec-title">Suggested Initiatives</h4>
        <div className="fb-inits">
          {brief.initiatives.map((it, i) => (
            <div key={i} className="fb-init">
              <span className={`fb-init-pri ${it.priority}`}>{it.priority === "high" ? "🔴" : it.priority === "med" ? "🟠" : "🟡"}</span>
              <div className="fb-init-body">
                <div className="fb-init-title">{it.title}</div>
                <p className="fb-p">{it.text}</p>
                <div className="fb-init-meta">Kind: {it.kind} · Duration: {it.duration} · <span>[signal: {it.signals}]</span></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function BriefTable({ rows }: { rows: { metric: string; value: string; note: string; flag: BriefFlag }[] }) {
  return (
    <div className="fb-table">
      {rows.map((r, i) => (
        <div key={i} className="fb-tr">
          <span className="fb-td-metric">{r.metric}</span>
          <span className="fb-td-value">{r.value}</span>
          <span className="fb-td-note" style={{ color: FLAG_COLOUR[r.flag] }}>{r.note}</span>
        </div>
      ))}
    </div>
  );
}
function BriefList({ bullets }: { bullets: string[] }) {
  if (!bullets.length) return null;
  return (
    <ul className="fb-ul">
      {bullets.map((b, i) => <li key={i}>{b}</li>)}
    </ul>
  );
}

// ─── Condensed brief card for the advisor (overview) ───────────────────────────
export function BriefAdvisorCard({ brief, onViewDetails }: { brief: Brief; onViewDetails: () => void }) {
  return (
    <div className="fb-card">
      <div className="fb-card-head">
        <span className="fb-card-label">✦ Fuel AI · Advisor</span>
        <span className="fb-card-date">{brief.generatedAtLabel}</span>
      </div>
      <p className="fb-card-headline">{brief.summary.headline}</p>
      <div className="fb-card-points">
        {brief.summary.points.map((p, i) => (
          <div key={i} className="fb-card-point">
            <span className="fb-card-dot" style={{ background: FLAG_COLOUR[p.flag] }} />
            <span>{p.text}</span>
          </div>
        ))}
      </div>
      <button type="button" className="fb-card-cta" onClick={onViewDetails}>View in details →</button>
    </div>
  );
}

type ChatMsg =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "ai"; kind: "text"; text: string }
  | { id: string; role: "ai"; kind: "thinking"; label: string }
  | { id: string; role: "ai"; kind: "brief"; brief: Brief };

let _mid = 0;
const mid = () => `m${++_mid}`;

// ─── Chat drawer ───────────────────────────────────────────────────────────────
export function AskFuelChatDrawer({
  open, onClose, companyName, benchmark, onBriefGenerated, onViewInitiatives, focusBriefSignal, focusPlaybook, focusPlaybookSignal,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
  benchmark: BenchmarkFormValues;
  onBriefGenerated: (brief: Brief) => void;
  onViewInitiatives: () => void;
  focusBriefSignal: number; // bump to force-show a fresh brief when opened from "View in details"
  focusPlaybook?: Playbook | null;
  focusPlaybookSignal?: number;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [playbooksOpen, setPlaybooksOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const lastFocus = useRef(0);
  const lastPbFocus = useRef(0);

  useDialogA11y(open, dialogRef, onClose);

  // scroll thread to bottom on new messages
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // when opened via "View in details", drop a fresh brief into the thread
  useEffect(() => {
    if (open && focusBriefSignal && focusBriefSignal !== lastFocus.current) {
      lastFocus.current = focusBriefSignal;
      const brief = generateBrief(benchmark, companyName);
      setMessages([
        { id: mid(), role: "user", text: "Generate intelligence brief" },
        { id: mid(), role: "ai", kind: "brief", brief },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focusBriefSignal]);

  // when opened via a playbook menu click, drop the playbook output into the thread
  useEffect(() => {
    if (open && focusPlaybookSignal && focusPlaybook && focusPlaybookSignal !== lastPbFocus.current) {
      lastPbFocus.current = focusPlaybookSignal;
      const pb = focusPlaybook;
      if (pb.marquee) {
        const brief = generateBrief(benchmark, companyName);
        setMessages([
          { id: mid(), role: "user", text: `Run \u201c${pb.name}\u201d` },
          { id: mid(), role: "ai", kind: "brief", brief },
        ]);
        onBriefGenerated(brief);
      } else {
        const userMsg: ChatMsg = { id: mid(), role: "user", text: `Run \u201c${pb.name}\u201d against ${companyName}` };
        const thinkId = mid();
        setMessages([userMsg, { id: thinkId, role: "ai", kind: "thinking", label: `Running ${pb.name}\u2026` }]);
        window.setTimeout(() => {
          setMessages(prev => prev.map(m => m.id === thinkId
            ? { id: thinkId, role: "ai", kind: "text", text: playbookResponse(pb, companyName) }
            : m));
        }, 1400);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focusPlaybookSignal]);

  if (!open) return null;

  const runBrief = () => {
    if (busy) return;
    setPlaybooksOpen(false);
    setBusy(true);
    const userMsg: ChatMsg = { id: mid(), role: "user", text: "Generate intelligence brief" };
    const thinkId = mid();
    setMessages(prev => [...prev, userMsg, { id: thinkId, role: "ai", kind: "thinking", label: "Pulling signals & running benchmark comparisons…" }]);
    window.setTimeout(() => {
      const brief = generateBrief(benchmark, companyName);
      setMessages(prev => prev.map(m => m.id === thinkId ? { id: thinkId, role: "ai", kind: "brief", brief } : m));
      onBriefGenerated(brief);
      setBusy(false);
    }, 1700);
  };

  const runPlaybook = (pb: Playbook) => {
    setPlaybooksOpen(false);
    setSearch("");
    if (pb.marquee) { runBrief(); return; }
    if (busy) return;
    setBusy(true);
    const userMsg: ChatMsg = { id: mid(), role: "user", text: `Run “${pb.name}” against ${companyName}` };
    const thinkId = mid();
    setMessages(prev => [...prev, userMsg, { id: thinkId, role: "ai", kind: "thinking", label: `Running ${pb.name}…` }]);
    window.setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === thinkId
        ? { id: thinkId, role: "ai", kind: "text", text: playbookResponse(pb, companyName) }
        : m));
      setBusy(false);
    }, 1400);
  };

  const sendCustom = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    const thinkId = mid();
    setMessages(prev => [...prev, { id: mid(), role: "user", text }, { id: thinkId, role: "ai", kind: "thinking", label: "Thinking…" }]);
    window.setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === thinkId
        ? { id: thinkId, role: "ai", kind: "text", text: `Here's what I can pull on “${text}” for ${companyName}. For a full structured read, run the Generate brief action or pick a playbook below — those run against the live benchmark and signal data.` }
        : m));
      setBusy(false);
    }, 1200);
  };

  const filtered = PLAYBOOKS.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );
  const grouped: Record<string, Playbook[]> = {};
  filtered.forEach(p => { (grouped[p.category] ||= []).push(p); });

  const empty = messages.length === 0;

  return (
    <>
      <button
        type="button"
        className="afc-scrim a11y-scrim"
        aria-label="Close Ask Fuel AI"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside
        ref={dialogRef}
        className="afc"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Ask Fuel AI about ${companyName}`}
      >
        <header className="afc-head">
          <div>
            <span className="afc-eyebrow">✦ Fuel AI</span>
            <strong className="afc-co">{companyName}</strong>
          </div>
          <button type="button" className="afc-x" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="afc-thread" ref={threadRef} aria-live="polite" aria-relevant="additions text">
          {empty ? (
            <div className="afc-empty">
              <div className="afc-empty-mark">✦</div>
              <div className="afc-empty-title">Ask Fuel AI about {companyName}</div>
              <p className="afc-empty-sub">Generate a full intelligence brief, run a playbook, or ask anything. Everything runs against {companyName}'s live benchmark and signal data.</p>
              <div className="afc-suggest">
                <button type="button" className="afc-suggest-btn" onClick={runBrief}>Generate intelligence brief</button>
                <button type="button" className="afc-suggest-btn" onClick={() => setPlaybooksOpen(true)}>Browse playbooks</button>
              </div>
            </div>
          ) : messages.map(m => {
            if (m.role === "user") return <div key={m.id} className="afc-msg user">{m.text}</div>;
            if (m.kind === "thinking") return (
              <div key={m.id} className="afc-msg ai thinking">
                <span className="afc-dots"><i></i><i></i><i></i></span>{m.label}
              </div>
            );
            if (m.kind === "brief") return (
              <div key={m.id} className="afc-msg ai brief-wrap">
                <BriefDoc brief={m.brief} companyName={companyName} />
                <div className="afc-brief-actions">
                  <button type="button" className="afc-brief-btn primary" onClick={onViewInitiatives}>Open initiatives →</button>
                  <button type="button" className="afc-brief-btn" onClick={runBrief}>Regenerate</button>
                </div>
              </div>
            );
            return <div key={m.id} className="afc-msg ai">{m.text}</div>;
          })}
        </div>

        <div className="afc-composer-wrap">
          {playbooksOpen ? (
            <>
              <div className="afc-pb-backdrop" onClick={() => setPlaybooksOpen(false)} />
              <div className="afc-pb">
                <input
                  className="afc-pb-search"
                  autoFocus
                  placeholder={`Search ${PLAYBOOK_COUNT} playbooks…`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <div className="afc-pb-list">
                  {Object.keys(grouped).length === 0 ? (
                    <div className="afc-pb-none">No playbooks match “{search}”.</div>
                  ) : Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat} className="afc-pb-group">
                      <div className="afc-pb-cat">{cat.toUpperCase()}</div>
                      {items.map(pb => (
                        <button key={pb.id} type="button" className="afc-pb-item" onClick={() => runPlaybook(pb)}>
                          <div className="afc-pb-item-head">
                            <span className="afc-pb-name">{pb.name}</span>
                            <span className="afc-pb-kind"> · {pb.kind}</span>
                          </div>
                          <div className="afc-pb-desc">{pb.description}</div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="afc-pb-foot">
                  <span>Click to run against {companyName}</span>
                  <span className="afc-pb-catalog">Full catalog →</span>
                </div>
              </div>
            </>
          ) : null}

          <div className="afc-composer">
            <textarea
              className="afc-input"
              placeholder={`Ask Fuel AI about ${companyName}…`}
              value={input}
              rows={1}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCustom(); } }}
            />
            <div className="afc-composer-row">
              <div className="afc-composer-actions">
                <button type="button" className={`afc-chip${playbooksOpen ? " active" : ""}`} onClick={() => setPlaybooksOpen(o => !o)}>
                  <span className="afc-chip-ic">▤</span> Playbooks <span className="afc-chip-caret">▾</span>
                </button>
                <button type="button" className="afc-chip accent" onClick={runBrief} disabled={busy}>
                  <span className="afc-chip-ic">≡</span> Generate brief
                </button>
              </div>
              <button type="button" className="afc-send" onClick={sendCustom} disabled={!input.trim() || busy} aria-label="Send">↑</button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function playbookResponse(pb: Playbook, company: string): string {
  const map: Record<string, string> = {
    "kpi-benchmark": `KPI Benchmark for ${company}: headline metrics confirmed against the seed/early-growth cohort. The two areas most off-pace are ARR growth (bottom decile vs p25 of 22%) and retention (logo + NRR well below the 90%/100% healthy floor). Run Generate brief for the full breakdown and suggested initiatives.`,
    "pitch-deck-eval": `Pitch Deck Evaluation for ${company}: no deck is attached yet. Upload a deck in the Data Room and I'll score it against the rubric — problem, market, traction, team, ask, and narrative quality — and flag the slides that will draw investor questions.`,
    "finance-assessment": `Finance Assessment for ${company}: capital efficiency is the headline risk — burn multiple and CAC payback are both far outside healthy ranges, and several finance inputs look like they're missing $K/$M scale. Priority initiatives: metrics audit, then a GTM economics reset. See Generate brief for the full finance section.`,
    "marketing-assessment": `Marketing Assessment for ${company}: with growth in the bottom decile, top-of-funnel and lifecycle are the levers. Channel mix and retention need the most attention. I'd propose a lower-CAC acquisition redesign and an expansion-revenue motion across the existing base.`,
    "product-eng-assessment": `Product & Engineering Assessment for ${company}: add the Development details (ship cadence, team shape, architecture maturity) in the overview to sharpen this read. On current signals, roadmap discipline and throughput are the areas to instrument first.`,
    "revops-assessment": `RevOps Assessment for ${company}: forecast confidence and pipeline hygiene are the gaps. Stand up CAC/LTV/NRR reporting and a clean billing motion before the next board cycle.`,
    "retention-deep-dive": `Retention Deep Dive for ${company}: logo and net revenue retention are both critically low — this points to near-total churn or a PMF gap. Recommend an emergency cohort analysis and a structured save/renewal playbook.`,
    "gtm-economics": `GTM Economics Review for ${company}: CAC payback is multiples beyond a healthy window. Audit channel spend, ICP fit, and sales-cycle length to redesign a lower-CAC path.`,
    "fundraise-readiness": `Fundraising Readiness for ${company}: stress-test cash and burn first — runway looks tight at face value. Model bridge scenarios and decide whether to open investor intros now while leverage remains.`,
    "competitor-scan": `Competitive Landscape Scan for ${company}: a niche category with real defensibility. Sharpen positioning against the nearest substitutes and use the differentiation angle to open enterprise channels.`,
    "board-update": `Board Update Draft for ${company}: leading with the data-quality flag and runway risk, followed by the two retention/growth risks and the metrics-audit initiative, would give the board an honest, action-led read.`,
  };
  return map[pb.id] || `${pb.name} for ${company}: queued. Run Generate brief for the full structured read.`;
}
