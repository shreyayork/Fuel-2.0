// ─── Fuel AI — Ask Fuel chat drawer (composer, playbooks, brief) ───────────────
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "./a11y/useDialogA11y";
import type { BenchmarkFormValues } from "./UnifiedBenchmarkDrawer";
import {
  generateBrief, PLAYBOOKS, PLAYBOOK_COUNT,
  type Brief, type BriefFlag, type Playbook,
} from "./fuelBrief";

import { briefFlagToColor } from "./statusSystem";
import { FuelIcon } from "./icons";
import { consumeAskFuelFreshStart } from "./workspaceSession";

const FLAG_COLOUR: Record<BriefFlag, string> = {
  good: briefFlagToColor("good"),
  warn: briefFlagToColor("warn"),
  crit: briefFlagToColor("crit"),
  neutral: briefFlagToColor("neutral"),
};

const PITCH_DECK_ACCEPT = ".pdf,.ppt,.pptx,.key,.PDF,.PPT,.PPTX";

export type AskFuelPitchDeckInfo = {
  id: string;
  name: string;
  format: string;
  uploadedAt: string;
  downloadUrl?: string;
} | null;

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
        <span className="fb-card-label"><FuelIcon name="sparkles" size={11} strokeWidth={2} /> Fuel AI · Advisor</span>
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
  | { id: string; role: "ai"; kind: "brief"; brief: Brief }
  | { id: string; role: "ai"; kind: "benchmark-flow" }
  | { id: string; role: "ai"; kind: "pitch-deck-flow" }
  | { id: string; role: "ai"; kind: "pitch-deck-eval"; deckName: string; evaluation: PitchDeckEvaluation };

let _mid = 0;
const mid = () => `m${++_mid}`;

const BENCHMARK_PREVIEW_KEYS: { key: keyof BenchmarkFormValues; label: string }[] = [
  { key: "arr", label: "ARR" },
  { key: "arrGrowth", label: "ARR growth" },
  { key: "nrr", label: "NRR" },
  { key: "logoRetention", label: "Logo retention" },
  { key: "grossMargin", label: "Gross margin" },
  { key: "burnMultiple", label: "Burn multiple" },
];

function hasBenchmarkMetrics(form: BenchmarkFormValues): boolean {
  return BENCHMARK_PREVIEW_KEYS.some(({ key }) => String(form[key] ?? "").trim().length > 0);
}

function BenchmarkFlowCard({
  companyName,
  benchmark,
  hasBenchmark,
  onOpenBenchmark,
  onRunBenchmark,
}: {
  companyName: string;
  benchmark: BenchmarkFormValues;
  hasBenchmark: boolean;
  onOpenBenchmark?: () => void;
  onRunBenchmark?: () => void;
}) {
  const preview = useMemo(
    () => BENCHMARK_PREVIEW_KEYS
      .map(({ key, label }) => ({ label, value: String(benchmark[key] ?? "").trim() }))
      .filter(row => row.value),
    [benchmark],
  );

  if (!hasBenchmark) {
    return (
      <div className="afc-flow-card">
        <div className="afc-flow-eyebrow">KPI Benchmark</div>
        <strong className="afc-flow-title">No benchmark information available</strong>
        <p className="afc-flow-copy">
          Fuel needs {companyName}’s core metrics before it can run a cohort comparison.
          {" "}
          <button type="button" className="afc-flow-link" onClick={() => onOpenBenchmark?.()}>
            Add your benchmark metrics to get started
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="afc-flow-card is-ready">
      <div className="afc-flow-eyebrow">KPI Benchmark</div>
      <strong className="afc-flow-title">{companyName} benchmark is live</strong>
      <p className="afc-flow-copy">
        Headline metrics are confirmed against the seed/early-growth cohort. Re-launch anytime to update inputs and regenerate the comparison.
      </p>
      {preview.length ? (
        <div className="afc-flow-metrics">
          {preview.slice(0, 6).map(row => (
            <div key={row.label} className="afc-flow-metric">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      <div className="afc-flow-actions">
        <button type="button" className="afc-brief-btn primary" onClick={() => onRunBenchmark?.()}>
          Generate cohort comparison
        </button>
        <button type="button" className="afc-brief-btn" onClick={() => onOpenBenchmark?.()}>
          Edit metrics
        </button>
      </div>
    </div>
  );
}

type PitchDeckRubricFlag = "good" | "warn" | "crit";

type PitchDeckRubricRow = {
  label: string;
  score: number;
  note: string;
  flag: PitchDeckRubricFlag;
};

type PitchDeckEvaluation = {
  overall: number;
  summary: string;
  rows: PitchDeckRubricRow[];
  investorQuestions: string[];
};

function buildPitchDeckEvaluation(companyName: string, deckName: string): PitchDeckEvaluation {
  return {
    overall: 74,
    summary: `${companyName}’s deck reads clearly on problem, team, and traction. Market sizing and the ask are where investors are most likely to push — tighten those slides before the next meeting.`,
    rows: [
      { label: "Problem", score: 82, note: "Pain and urgency land quickly", flag: "good" },
      { label: "Market", score: 61, note: "Needs sharper bottom-up TAM math", flag: "warn" },
      { label: "Traction", score: 78, note: "Pipeline and logos feel credible", flag: "good" },
      { label: "Team", score: 80, note: "Relevant operator depth", flag: "good" },
      { label: "Ask", score: 58, note: "Use of funds and milestones thin", flag: "warn" },
      { label: "Narrative", score: 76, note: "Story flows; ending can be tighter", flag: "good" },
    ],
    investorQuestions: [
      "Slide 4 · What’s the bottom-up math behind the TAM?",
      "Slide 9 · How durable is retention after the first two renewals?",
      "Slide 14 · Which milestones does this raise specifically fund?",
    ],
  };
}

function PitchDeckEvalCard({
  companyName,
  deckName,
  evaluation,
  onOpenDataRoom,
}: {
  companyName: string;
  deckName: string;
  evaluation: PitchDeckEvaluation;
  onOpenDataRoom?: () => void;
}) {
  return (
    <div className="afc-flow-card is-ready is-eval">
      <div className="afc-flow-eyebrow">Pitch Deck Evaluation</div>
      <strong className="afc-flow-title">
        Investor-ready score: {evaluation.overall}/100
      </strong>
      <p className="afc-flow-copy">{evaluation.summary}</p>
      <div className="afc-deck-file">
        <div className="afc-deck-file-icon" aria-hidden="true"><FuelIcon name="file" size={18} /></div>
        <div className="afc-deck-file-copy">
          <strong>{deckName}</strong>
          <span>Reviewed on problem · market · traction · team · ask · narrative</span>
        </div>
      </div>
      <div className="afc-flow-metrics afc-eval-rubric">
        {evaluation.rows.map(row => (
          <div key={row.label} className={`afc-flow-metric is-${row.flag}`}>
            <span>{row.label}</span>
            <strong>{row.score}</strong>
            <em>{row.note}</em>
          </div>
        ))}
      </div>
      <div className="afc-eval-questions">
        <span className="afc-eval-questions-label">Questions investors may ask first</span>
        <ul>
          {evaluation.investorQuestions.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="afc-flow-actions">
        {onOpenDataRoom ? (
          <button type="button" className="afc-brief-btn primary" onClick={onOpenDataRoom}>
            View in Data Room →
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PitchDeckFlowCard({
  companyName,
  pitchDeck,
  uploading,
  onUploadPitchDeck,
  onDiscardPitchDeck,
  onSubmitPitchDeck,
}: {
  companyName: string;
  pitchDeck: AskFuelPitchDeckInfo;
  uploading: boolean;
  onUploadPitchDeck?: (file: File) => void;
  onDiscardPitchDeck?: () => void;
  onSubmitPitchDeck?: (deck: NonNullable<AskFuelPitchDeckInfo>) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitted(false);
  }, [pitchDeck?.id]);

  const takeFile = (file: File | undefined | null) => {
    if (!file || uploading) return;
    onUploadPitchDeck?.(file);
  };

  if (pitchDeck) {
    return (
      <div className={`afc-flow-card is-ready${submitted ? " is-submitted" : ""}`}>
        <div className="afc-flow-eyebrow">Pitch Deck Evaluation</div>
        <strong className="afc-flow-title">
          {submitted ? "Reviewing your deck…" : "Deck uploaded — ready to review"}
        </strong>
        <p className="afc-flow-copy">
          {submitted
            ? `Fuel is reading ${pitchDeck.name} and scoring how clearly ${companyName} communicates problem, market, traction, team, ask, and story.`
            : `${pitchDeck.name} is saved to your Data Room. Generate intelligence to see where the narrative is strong — and where investors may push back.`}
        </p>
        <div className="afc-deck-file">
          <div className="afc-deck-file-icon" aria-hidden="true"><FuelIcon name="file" size={18} /></div>
          <div className="afc-deck-file-copy">
            <strong>{pitchDeck.name}</strong>
            <span>{pitchDeck.format} · uploaded {pitchDeck.uploadedAt}</span>
          </div>
          <button
            type="button"
            className="afc-deck-remove"
            aria-label="Remove pitch deck"
            title="Remove pitch deck"
            disabled={submitted}
            onClick={() => onDiscardPitchDeck?.()}
          >
            <FuelIcon name="close" size={14} />
          </button>
        </div>
        <div className="afc-flow-actions">
          <button
            type="button"
            className="afc-brief-btn primary"
            disabled={submitted}
            onClick={() => {
              if (submitted) return;
              setSubmitted(true);
              onSubmitPitchDeck?.(pitchDeck);
            }}
          >
            {submitted ? "Reviewing…" : "Generate intelligence"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="afc-flow-card">
      <div className="afc-flow-eyebrow">Pitch Deck Evaluation</div>
      <strong className="afc-flow-title">No pitch deck uploaded yet</strong>
      <p className="afc-flow-copy">
        There’s nothing in {companyName}’s Data Room for Fuel to review. Upload the latest investor deck and we’ll score story clarity, traction proof, and the ask — then flag slides investors are likely to question.
      </p>
      <div
        className={`afc-deck-drop${dragging ? " is-dragging" : ""}${uploading ? " is-busy" : ""}`}
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          takeFile(e.dataTransfer.files?.[0]);
        }}
      >
        <strong>
          {uploading
            ? "Uploading your deck…"
            : dragging
              ? "Drop to upload"
              : "Upload a pitch deck to get started"}
        </strong>
        <span>PDF or PowerPoint · saved to Data Room · one file</span>
        <button
          type="button"
          className="afc-brief-btn primary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Choose file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={PITCH_DECK_ACCEPT}
          hidden
          onChange={e => {
            takeFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

// ─── Chat drawer ───────────────────────────────────────────────────────────────
export function AskFuelChatDrawer({
  open,
  onClose,
  companyName,
  benchmark,
  hasBenchmark = false,
  onOpenBenchmark,
  pitchDeck = null,
  pitchDeckUploading = false,
  onUploadPitchDeck,
  onDiscardPitchDeck,
  onOpenDataRoom,
  onGeneratePitchDeckIntelligence,
  onBriefGenerated,
  onViewInitiatives,
  focusBriefSignal,
  focusPlaybook,
  focusPlaybookSignal,
  benchmarkSubmitSignal = 0,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
  benchmark: BenchmarkFormValues;
  hasBenchmark?: boolean;
  onOpenBenchmark?: () => void;
  pitchDeck?: AskFuelPitchDeckInfo;
  pitchDeckUploading?: boolean;
  onUploadPitchDeck?: (file: File) => void;
  onDiscardPitchDeck?: () => void;
  onOpenDataRoom?: () => void;
  /** Same Data Room / sources path — extract intelligence from the linked pitch deck. */
  onGeneratePitchDeckIntelligence?: () => void;
  onBriefGenerated: (brief: Brief) => void;
  onViewInitiatives: () => void;
  focusBriefSignal: number;
  focusPlaybook?: Playbook | null;
  focusPlaybookSignal?: number;
  /** Bumped after benchmark metrics are submitted while Ask Fuel is open. */
  benchmarkSubmitSignal?: number;
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
  const lastBenchSubmit = useRef(0);
  const busyRef = useRef(false);
  const benchmarkReady = hasBenchmark || hasBenchmarkMetrics(benchmark);
  busyRef.current = busy;

  useDialogA11y(open, dialogRef, onClose);

  useEffect(() => {
    if (!open) return;
    if (!consumeAskFuelFreshStart()) return;
    setMessages([]);
    setInput("");
    setPlaybooksOpen(false);
    setSearch("");
    setBusy(false);
  }, [open]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pitchDeck, pitchDeckUploading, benchmarkReady]);

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

  useEffect(() => {
    if (open && focusPlaybookSignal && focusPlaybook && focusPlaybookSignal !== lastPbFocus.current) {
      lastPbFocus.current = focusPlaybookSignal;
      const pb = focusPlaybook;
      if (pb.marquee) {
        const brief = generateBrief(benchmark, companyName);
        setMessages([
          { id: mid(), role: "user", text: `Generate intelligence · ${pb.name}` },
          { id: mid(), role: "ai", kind: "brief", brief },
        ]);
        onBriefGenerated(brief);
      } else {
        const userMsg: ChatMsg = { id: mid(), role: "user", text: `Generate intelligence · ${pb.name}` };
        const thinkId = mid();
        setMessages([userMsg, { id: thinkId, role: "ai", kind: "thinking", label: `Running ${pb.name}\u2026` }]);
        window.setTimeout(() => {
          setMessages(prev => prev.map(m => m.id === thinkId
            ? resolvePlaybookMessage(thinkId, pb)
            : m));
        }, 1400);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focusPlaybookSignal]);

  useEffect(() => {
    if (!open || !benchmarkSubmitSignal || benchmarkSubmitSignal === lastBenchSubmit.current) return;
    if (busyRef.current) return;
    lastBenchSubmit.current = benchmarkSubmitSignal;
    busyRef.current = true;
    setBusy(true);
    const thinkId = mid();
    setMessages(prev => [
      ...prev,
      { id: mid(), role: "user", text: "Submitted KPI benchmark" },
      { id: thinkId, role: "ai", kind: "thinking", label: "Comparing metrics to the cohort…" },
    ]);
    window.setTimeout(() => {
      const brief = generateBrief(benchmark, companyName);
      setMessages(prev => prev.map(m => (
        m.id === thinkId ? { id: thinkId, role: "ai", kind: "brief", brief } : m
      )));
      onBriefGenerated(brief);
      busyRef.current = false;
      setBusy(false);
    }, 1600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, benchmarkSubmitSignal]);

  if (!open) return null;

  const runBenchmarkAnalysis = () => {
    if (busy || !benchmarkReady) return;
    setPlaybooksOpen(false);
    setBusy(true);
    const thinkId = mid();
    setMessages(prev => [
      ...prev,
      { id: mid(), role: "user", text: "Generate cohort comparison" },
      { id: thinkId, role: "ai", kind: "thinking", label: "Comparing metrics to the cohort…" },
    ]);
    window.setTimeout(() => {
      const brief = generateBrief(benchmark, companyName);
      setMessages(prev => prev.map(m => (
        m.id === thinkId ? { id: thinkId, role: "ai", kind: "brief", brief } : m
      )));
      onBriefGenerated(brief);
      setBusy(false);
    }, 1600);
  };

  const runPitchDeckEvaluation = (deck: NonNullable<AskFuelPitchDeckInfo>) => {
    if (busy) return;
    setBusy(true);
    onGeneratePitchDeckIntelligence?.();
    const thinkId = mid();
    setMessages(prev => [
      ...prev,
      { id: mid(), role: "user", text: `Generate intelligence from “${deck.name}”` },
      { id: thinkId, role: "ai", kind: "thinking", label: "Reviewing your deck for investor clarity…" },
    ]);
    window.setTimeout(() => {
      const evaluation = buildPitchDeckEvaluation(companyName, deck.name);
      setMessages(prev => prev.map(m => (
        m.id === thinkId
          ? { id: thinkId, role: "ai", kind: "pitch-deck-eval", deckName: deck.name, evaluation }
          : m
      )));
      setBusy(false);
    }, 1600);
  };

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
    const userMsg: ChatMsg = { id: mid(), role: "user", text: `Generate intelligence · ${pb.name}` };
    const thinkId = mid();
    setMessages(prev => [...prev, userMsg, { id: thinkId, role: "ai", kind: "thinking", label: `Running ${pb.name}…` }]);
    window.setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === thinkId
        ? resolvePlaybookMessage(thinkId, pb)
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
            <span className="afc-eyebrow"><FuelIcon name="sparkles" size={12} strokeWidth={2} /> Fuel AI</span>
            <strong className="afc-co">{companyName}</strong>
          </div>
          <button type="button" className="afc-x" onClick={onClose} aria-label="Close">
            <FuelIcon name="close" size={14} />
          </button>
        </header>

        <div className="afc-thread" ref={threadRef} aria-live="polite" aria-relevant="additions text">
          {empty ? (
            <div className="afc-empty">
              <div className="afc-empty-mark" aria-hidden="true"><FuelIcon name="sparkles" size={28} strokeWidth={1.5} /></div>
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
            if (m.kind === "benchmark-flow") return (
              <div key={m.id} className="afc-msg ai brief-wrap">
                <BenchmarkFlowCard
                  companyName={companyName}
                  benchmark={benchmark}
                  hasBenchmark={benchmarkReady}
                  onOpenBenchmark={onOpenBenchmark}
                  onRunBenchmark={runBenchmarkAnalysis}
                />
              </div>
            );
            if (m.kind === "pitch-deck-flow") return (
              <div key={m.id} className="afc-msg ai brief-wrap">
                <PitchDeckFlowCard
                  companyName={companyName}
                  pitchDeck={pitchDeck}
                  uploading={pitchDeckUploading}
                  onUploadPitchDeck={onUploadPitchDeck}
                  onDiscardPitchDeck={onDiscardPitchDeck}
                  onSubmitPitchDeck={runPitchDeckEvaluation}
                />
              </div>
            );
            if (m.kind === "pitch-deck-eval") return (
              <div key={m.id} className="afc-msg ai brief-wrap">
                <PitchDeckEvalCard
                  companyName={companyName}
                  deckName={m.deckName}
                  evaluation={m.evaluation}
                  onOpenDataRoom={onOpenDataRoom}
                />
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
                <div className="afc-pb-search-wrap">
                  <FuelIcon name="search" size={14} className="afc-pb-search-ic" />
                  <input
                    className="afc-pb-search"
                    autoFocus
                    placeholder={`Search ${PLAYBOOK_COUNT} playbooks…`}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
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
                            <span className="afc-pb-kind">{pb.kind}</span>
                          </div>
                          <div className="afc-pb-desc">{pb.description}</div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="afc-pb-foot">
                  <span>Click to generate intelligence for {companyName}</span>
                  <button type="button" className="afc-pb-catalog">Full catalog →</button>
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
                  <FuelIcon name="layoutGrid" size={14} className="afc-chip-ic" /> Playbooks <FuelIcon name="chevronDown" size={12} className="afc-chip-caret" />
                </button>
                <button type="button" className="afc-chip accent" onClick={runBrief} disabled={busy}>
                  <FuelIcon name="wand" size={14} className="afc-chip-ic" /> Generate brief
                </button>
              </div>
              <button type="button" className="afc-send" onClick={sendCustom} disabled={!input.trim() || busy} aria-label="Send">
                <FuelIcon name="send" size={16} strokeWidth={2.25} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function resolvePlaybookMessage(id: string, pb: Playbook): ChatMsg {
  if (pb.id === "kpi-benchmark") return { id, role: "ai", kind: "benchmark-flow" };
  if (pb.id === "pitch-deck-eval") return { id, role: "ai", kind: "pitch-deck-flow" };
  return { id, role: "ai", kind: "text", text: playbookResponse(pb) };
}

function playbookResponse(pb: Playbook): string {
  const map: Record<string, string> = {
    "finance-assessment": `Finance Assessment: capital efficiency is the headline risk — burn multiple and CAC payback are both far outside healthy ranges, and several finance inputs look like they're missing $K/$M scale. Priority initiatives: metrics audit, then a GTM economics reset. See Generate brief for the full finance section.`,
    "marketing-assessment": `Marketing Assessment: with growth in the bottom decile, top-of-funnel and lifecycle are the levers. Channel mix and retention need the most attention. I'd propose a lower-CAC acquisition redesign and an expansion-revenue motion across the existing base.`,
    "product-eng-assessment": `Product & Engineering Assessment: add the Development details (ship cadence, team shape, architecture maturity) in the overview to sharpen this read. On current signals, roadmap discipline and throughput are the areas to instrument first.`,
    "revops-assessment": `RevOps Assessment: forecast confidence and pipeline hygiene are the gaps. Stand up CAC/LTV/NRR reporting and a clean billing motion before the next board cycle.`,
    "retention-deep-dive": `Retention Deep Dive: logo and net revenue retention are both critically low — this points to near-total churn or a PMF gap. Recommend an emergency cohort analysis and a structured save/renewal playbook.`,
    "gtm-economics": `GTM Economics Review: CAC payback is multiples beyond a healthy window. Audit channel spend, ICP fit, and sales-cycle length to redesign a lower-CAC path.`,
    "fundraise-readiness": `Fundraising Readiness: stress-test cash and burn first — runway looks tight at face value. Model bridge scenarios and decide whether to open investor intros now while leverage remains.`,
    "competitor-scan": `Competitive Landscape Scan: a niche category with real defensibility. Sharpen positioning against the nearest substitutes and use the differentiation angle to open enterprise channels.`,
    "board-update": `Board Update Draft: leading with the data-quality flag and runway risk, followed by the two retention/growth risks and the metrics-audit initiative, would give the board an honest, action-led read.`,
  };
  return map[pb.id] || `${pb.name}: queued. Run Generate brief for the full structured read.`;
}
