"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FuelMark } from "./FuelMark";
import { useTheme } from "./ThemeContext";
import { BREAKPOINTS, useMobileNav } from "@/lib/responsive";
import { useCreditsOptional } from "./credits/CreditProvider";
import { CreditSeeCostsControl } from "./credits/ActionCostList";
import { useToast } from "./toast/ToastProvider";
import { syncCreditsAfterAction } from "@/lib/credits/client";
import {
  canAfford,
  formatActionInsufficientCreditsMessage,
} from "@/lib/credits/logic";
import type { CreditActionType, CreditSnapshot } from "@/lib/credits/types";
import { accentGradient, onAccentText, type Theme } from "@/lib/theme";
import {
  MISSING_PITCH_DECK_MESSAGE,
  buildExtractDeckPromptBlock,
  pitchDeckIdsFromSnapshot,
  type PitchDeckIds,
} from "@/lib/playbooks/pitch-deck-evaluation";
import {
  buildKpiRunAnywayPromptBlock,
  emptyChatBenchmarkValues,
  kpiBenchmarkGateMessage,
  kpiChatFieldDefs,
} from "@/lib/playbooks/kpi-benchmark";
import { withSuggestedInitiativesFormat } from "@/lib/playbooks/suggested-initiatives-format";
import { postDataRoomUpload } from "@/lib/data-room/upload-client";
import {
  DATA_ROOM_ACCEPT_EXTENSIONS,
  DATA_ROOM_DOCUMENT_TYPES,
} from "@/lib/data-room/constants";
import { notifyOverviewDataChanged, patchBenchmarkDrawer } from "@/lib/overview/client";
import type { BenchmarkDrawerValues } from "@/lib/overview/benchmark-drawer-fields";
import { sanitizeBenchmarkNumericInput } from "@/lib/onboard/benchmark-fields";

// --- Types emitted by /api/agent/runs (mirrors lib/agent/runtime.AgentEvent) ---
type AgentEvent =
  | { type: "start"; runId: string; model: string }
  | { type: "text-delta"; delta: string }
  | { type: "tool-call-start"; id: string; name: string; input?: unknown }
  | { type: "tool-call-end"; id: string; output?: unknown; error?: string; latencyMs: number }
  | {
      type: "artifact";
      id: string;
      kind: string;
      title: string;
      content: string;
      authorEmail: string;
      createdAt: string;
      subjectCompanyUuid?: string;
    }
  | { type: "artifact-error"; message: string }
  | { type: "error"; message: string }
  | { type: "done"; inputTokens?: number; outputTokens?: number; latencyMs: number };

/** Dispatched when a run persists a Research artifact — company pages merge into Briefs. */
export const FUEL_ARTIFACT_CREATED_EVENT = "fuel:artifact-created";

export type FuelArtifactCreatedDetail = {
  id: string;
  kind: string;
  title: string;
  content: string;
  authorEmail: string;
  createdAt: string;
  subjectCompanyUuid?: string;
};

interface ToolCall {
  id: string;
  name: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  latencyMs?: number;
  status: "running" | "ok" | "error";
}

interface Turn {
  prompt: string;
  /** What we actually show in the chat bubble. Often equal to `prompt` but
   *  callers can pass a markdown-friendly alternative (e.g. replacing raw
   *  UUIDs with `[Company](/company/uuid)` links). */
  displayPrompt: string;
  text: string;
  toolCalls: ToolCall[];
  done: boolean;
  error?: string;
  runId?: string;
  artifact?: { id: string; kind: string; title: string };
  /** Run OK but createArtifact failed — shown distinct from run `error`. */
  artifactError?: string;
  /** Per-turn uuid → name map. Seeded from OpenOptions.companyNameByUuid and
   *  grown opportunistically as tool-call outputs reveal {companyUuid, name}
   *  pairs. Consumed by ToolCallCard to render human-readable inputs. */
  nameByUuid: Record<string, string>;
  /** Epoch millis of the most recent event on this turn. The drawer watches
   *  this value to decide when to surface a "still thinking" indicator during
   *  silent Bedrock TTFT gaps between tool batches. */
  lastActivityAt: number;
  /** Local gate: pitch-deck evaluation needs a PDF before any agent run. */
  pitchDeckUpload?: PitchDeckUploadGate;
  /** Local gate: KPI Benchmark needs numbers (or an explicit run-anyway). */
  kpiBenchmarkFill?: KpiBenchmarkFillGate;
  /** Transient: checking Data Room / saved benchmark before the agent run. */
  playbookPrepLookup?: boolean;
}

export type PitchDeckUploadGate = {
  companyUuid: string;
  companyName: string;
  playbook: { slug: string; title: string; content: string };
  /** Once upload succeeds and the evaluation run starts, hide the uploader. */
  resolved?: boolean;
};

interface OpenOptions {
  prompt: string;
  displayPrompt?: string;
  kind?: string;
  subjectCompanyUuid?: string;
  subjectCompanyName?: string;
  /** Portfolio/watchlist display name when the subject is a list. Used by the
   *  server to title the persisted artifact. */
  subjectPortfolioName?: string;
  /** Portfolio/watchlist id — persisted as a portfolio artifact subject. */
  subjectPortfolioId?: string;
  /** Playbook title (e.g. "Value Creation Report") when this run is driven by
   *  a picker selection. Also used in the artifact title. */
  playbookTitle?: string;
  systemPrompt?: string;
  /** If set, the server persists the final output as an Artifact of this kind. */
  artifactKind?: string;
  /** Optional uuid → display-name map used to pretty-print tool-call inputs in
   *  the drawer (e.g. portfolio runs pass the full member list up front so we
   *  don't render bare UUIDs for every getCompanyObservations call). */
  companyNameByUuid?: Record<string, string>;
}

export type PitchDeckUploadRequest = {
  companyUuid: string;
  companyName: string;
  playbook: { slug: string; title: string; content: string };
  /** Shown while we check Data Room / saved metrics. */
  lookingFor?: string;
  /** Metrics already on file — kept so a save doesn't null out hidden fields. */
  savedValues?: BenchmarkDrawerValues;
};

export type KpiBenchmarkFillGate = {
  companyUuid: string;
  companyName: string;
  playbook: { slug: string; title: string; content: string };
  savedValues?: BenchmarkDrawerValues;
  resolved?: boolean;
};

type RunResult =
  | { ok: true }
  | { ok: false; kind: "credit_limit"; restorePrompt: string }
  | { ok: false; kind: "error" };

interface AgentDrawerApi {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  run: (opts: OpenOptions) => Promise<RunResult>;
  /** Immediate feedback while Data Room / saved metrics are checked. */
  beginPitchDeckLookup: (opts: PitchDeckUploadRequest) => void;
  /** Drop the transient lookup turn (prep found → real agent run follows). */
  dismissPitchDeckLookup: () => void;
  /** Show a local Fuel AI turn asking for a pitch deck + inline upload. */
  requestPitchDeckUpload: (opts: PitchDeckUploadRequest) => void;
  /** Show a local Fuel AI turn to fill KPI numbers, with run-anyway. */
  requestKpiBenchmarkFill: (opts: PitchDeckUploadRequest) => void;
  /**
   * Credit gate for playbook launchers. Returns false (and toasts) when the
   * run can't be afforded, so pre-run prep UI never opens on a blocked
   * account. Server still enforces.
   */
  canStartPlaybookRun: () => boolean;
  runs: Turn[];
  busy: boolean;
}

type CreditGateBody = {
  error?: string;
  reason?: "blocked" | "insufficient";
  snapshot?: CreditSnapshot;
};

function isCreditGateResponse(body: unknown): body is CreditGateBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    (body as CreditGateBody).error === "insufficient_credits"
  );
}

function creditActionForRun(kind: string | undefined): CreditActionType {
  return kind === "playbook_run" ? "playbookRun" : "aiChat";
}

const AgentDrawerContext = createContext<AgentDrawerApi | null>(null);

export function useAgentDrawer(): AgentDrawerApi {
  const ctx = useContext(AgentDrawerContext);
  if (!ctx) throw new Error("useAgentDrawer must be used inside <AgentDrawerProvider>");
  return ctx;
}

/** Null when outside AppShell (e.g. Super Admin) — callers no-op safely. */
export function useAgentDrawerOptional(): AgentDrawerApi | null {
  return useContext(AgentDrawerContext);
}

export function AgentDrawerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const credits = useCreditsOptional();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  // Ref mirrors `turns` so the async `run()` reads the committed state without
  // racing React's state scheduler. setTurns with an updater callback defers
  // execution — if we captured history inside that updater, it'd populate
  // after fetch() had already fired with an empty array.
  const turnsRef = useRef<Turn[]>([]);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);

  const beginPitchDeckLookup = useCallback((opts: PitchDeckUploadRequest) => {
    setOpen(true);
    const displayPrompt = `Run [${opts.playbook.title}](/playbooks/${opts.playbook.slug}) against [${opts.companyName}](/company/${opts.companyUuid}).`;
    setTurns((t) => [
      ...t,
      {
        prompt: displayPrompt,
        displayPrompt,
        text: opts.lookingFor ?? "Looking for a pitch deck in Data Room…",
        toolCalls: [],
        nameByUuid: { [opts.companyUuid]: opts.companyName },
        lastActivityAt: Date.now(),
        done: false,
        playbookPrepLookup: true,
      },
    ]);
  }, []);

  const dismissPitchDeckLookup = useCallback(() => {
    setTurns((t) => {
      const last = t[t.length - 1];
      if (last?.playbookPrepLookup) return t.slice(0, -1);
      return t;
    });
  }, []);

  const requestPitchDeckUpload = useCallback((opts: PitchDeckUploadRequest) => {
    setOpen(true);
    const displayPrompt = `Run [${opts.playbook.title}](/playbooks/${opts.playbook.slug}) against [${opts.companyName}](/company/${opts.companyUuid}).`;
    const nextTurn: Turn = {
      prompt: displayPrompt,
      displayPrompt,
      text: MISSING_PITCH_DECK_MESSAGE,
      toolCalls: [],
      nameByUuid: { [opts.companyUuid]: opts.companyName },
      lastActivityAt: Date.now(),
      done: true,
      pitchDeckUpload: {
        companyUuid: opts.companyUuid,
        companyName: opts.companyName,
        playbook: opts.playbook,
      },
    };
    setTurns((t) => {
      const last = t[t.length - 1];
      if (last?.playbookPrepLookup) return [...t.slice(0, -1), nextTurn];
      return [...t, nextTurn];
    });
  }, []);

  const requestKpiBenchmarkFill = useCallback((opts: PitchDeckUploadRequest) => {
    setOpen(true);
    const displayPrompt = `Run [${opts.playbook.title}](/playbooks/${opts.playbook.slug}) against [${opts.companyName}](/company/${opts.companyUuid}).`;
    const nextTurn: Turn = {
      prompt: displayPrompt,
      displayPrompt,
      text: kpiBenchmarkGateMessage(opts.savedValues),
      toolCalls: [],
      nameByUuid: { [opts.companyUuid]: opts.companyName },
      lastActivityAt: Date.now(),
      done: true,
      kpiBenchmarkFill: {
        companyUuid: opts.companyUuid,
        companyName: opts.companyName,
        playbook: opts.playbook,
        savedValues: opts.savedValues,
      },
    };
    setTurns((t) => {
      const last = t[t.length - 1];
      if (last?.playbookPrepLookup) return [...t.slice(0, -1), nextTurn];
      return [...t, nextTurn];
    });
  }, []);

  const notifyInsufficientCredits = useCallback(
    (snapshot: CreditSnapshot, required: number | undefined) => {
      const message =
        required != null && required > 0
          ? formatActionInsufficientCreditsMessage(snapshot, required)
          : "Insufficient credits. Upgrade or purchase more credits to continue.";
      showToast({ message, variant: "error" });
    },
    [showToast],
  );

  const canStartPlaybookRun = useCallback((): boolean => {
    const creditAction = creditActionForRun("playbook_run");
    const actionCost = credits?.actionCosts.find((row) => row.action === creditAction)?.cost;
    const snapshot = credits?.snapshot ?? null;
    const blocked =
      credits?.generationBlocked ||
      (snapshot != null && actionCost != null && !canAfford(snapshot, actionCost));
    if (!blocked) return true;
    if (snapshot) {
      notifyInsufficientCredits(snapshot, actionCost);
    } else {
      showToast({
        message: "Insufficient credits. Upgrade or purchase more credits to continue.",
        variant: "error",
      });
    }
    return false;
  }, [
    credits?.actionCosts,
    credits?.generationBlocked,
    credits?.snapshot,
    notifyInsufficientCredits,
    showToast,
  ]);

  const run = useCallback(async (opts: OpenOptions): Promise<RunResult> => {
    const creditAction = creditActionForRun(opts.kind);
    const actionCost = credits?.actionCosts.find((row) => row.action === creditAction)?.cost;
    const snapshot = credits?.snapshot ?? null;

    // Client gate: hard block or cannot afford this action's live cost.
    // Skip request + empty turn; toast only (upgrade/top-up stays user-initiated).
    // Server still enforces.
    if (
      credits?.generationBlocked ||
      (snapshot != null && actionCost != null && !canAfford(snapshot, actionCost))
    ) {
      if (snapshot) {
        notifyInsufficientCredits(snapshot, actionCost);
      } else {
        showToast({
          message: "Insufficient credits. Upgrade or purchase more credits to continue.",
          variant: "error",
        });
      }
      return { ok: false, kind: "credit_limit", restorePrompt: opts.prompt };
    }

    setOpen(true);
    setBusy(true);

    // Capture prior turns as history before appending the new one. Only
    // user prompts + final assistant text replay — intermediate tool_use
    // blocks are dropped (the model can re-invoke tools as needed).
    const history: Array<{ role: "user" | "assistant"; text: string }> =
      turnsRef.current.flatMap((turn) => {
        const out: Array<{ role: "user" | "assistant"; text: string }> = [
          { role: "user", text: turn.prompt },
        ];
        if (turn.text.trim()) out.push({ role: "assistant", text: turn.text });
        return out;
      });

    setTurns((t) => [
      ...t,
      {
        prompt: opts.prompt,
        displayPrompt: opts.displayPrompt ?? opts.prompt,
        text: "",
        toolCalls: [],
        nameByUuid: { ...(opts.companyNameByUuid ?? {}) },
        lastActivityAt: Date.now(),
        done: false,
      },
    ]);

    let result: RunResult = { ok: true };
    try {
      const res = await fetch("/api/agent/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...opts, history }),
      });
      if (!res.ok || !res.body) {
        let body: unknown = null;
        try {
          body = await res.json();
        } catch {
          // Non-JSON error body — fall through to generic handling.
        }
        if (isCreditGateResponse(body)) {
          syncCreditsAfterAction(body.snapshot);
          // Drop the empty failed turn; restore prompt to the composer.
          setTurns((t) => t.slice(0, -1));
          if (body.snapshot) {
            notifyInsufficientCredits(body.snapshot, actionCost);
          }
          result = { ok: false, kind: "credit_limit", restorePrompt: opts.prompt };
          return result;
        }
        setTurns((t) => {
          const next = [...t];
          const last = next[next.length - 1];
          if (last) {
            last.error = "Something went wrong. Please try again.";
            last.done = true;
          }
          return next;
        });
        result = { ok: false, kind: "error" };
        return result;
      }
      // Credits already deducted server-side — refresh Usage tab immediately.
      window.dispatchEvent(new Event("fuel:credits-refresh"));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as AgentEvent;
            setTurns((t) => applyEvent(t, event));
            if (event.type === "artifact") {
              // Primary Research update path — company page merges without
              // waiting on soft refresh timing.
              window.dispatchEvent(
                new CustomEvent<FuelArtifactCreatedDetail>(FUEL_ARTIFACT_CREATED_EVENT, {
                  detail: {
                    id: event.id,
                    kind: event.kind,
                    title: event.title,
                    content: event.content,
                    authorEmail: event.authorEmail,
                    createdAt: event.createdAt,
                    subjectCompanyUuid:
                      event.subjectCompanyUuid ?? opts.subjectCompanyUuid,
                  },
                }),
              );
            }
          } catch {
            // partial JSON — ignore
          }
        }
      }
    } catch (e) {
      const msg = (e as Error).message;
      setTurns((t) => {
        const next = [...t];
        const last = next[next.length - 1];
        if (last) {
          last.error = msg;
          last.done = true;
        }
        return next;
      });
      result = { ok: false, kind: "error" };
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event("fuel:credits-refresh"));
      // Backstop for Research / badge counts after local artifact merge.
      try {
        await Promise.resolve(router.refresh());
      } catch {
        // Soft refresh is best-effort; merge event is the primary path.
      }
    }
    return result;
  }, [
    credits?.actionCosts,
    credits?.generationBlocked,
    credits?.snapshot,
    notifyInsufficientCredits,
    router,
    showToast,
  ]);

  return (
    <AgentDrawerContext.Provider
      value={{
        open,
        openDrawer,
        closeDrawer,
        run,
        beginPitchDeckLookup,
        dismissPitchDeckLookup,
        requestPitchDeckUpload,
        requestKpiBenchmarkFill,
        canStartPlaybookRun,
        runs: turns,
        busy,
      }}
    >
      {children}
      <AgentDrawer />
    </AgentDrawerContext.Provider>
  );
}

function applyEvent(turns: Turn[], event: AgentEvent): Turn[] {
  const next = [...turns];
  const last = next[next.length - 1];
  if (!last) return turns;
  // Any incoming event counts as activity for the thinking-indicator timer.
  last.lastActivityAt = Date.now();
  switch (event.type) {
    case "start":
      last.runId = event.runId;
      break;
    case "text-delta":
      last.text += event.delta;
      break;
    case "tool-call-start":
      // Bedrock can replay the same tool_use id (strict-mode / resume). Skip
      // duplicates so React keys stay unique.
      if (last.toolCalls.some((tc) => tc.id === event.id)) break;
      last.toolCalls = [
        ...last.toolCalls,
        { id: event.id, name: event.name, input: event.input, status: "running" },
      ];
      break;
    case "tool-call-end": {
      last.toolCalls = last.toolCalls.map((tc) =>
        tc.id === event.id
          ? {
              ...tc,
              status: event.error ? "error" : "ok",
              output: event.output,
              error: event.error,
              latencyMs: event.latencyMs,
            }
          : tc,
      );
      // Harvest {uuid, name} pairs from the output so subsequent tool-call
      // cards can render names instead of UUIDs. Covers the common shapes we
      // emit (getCompany, getCompanyObservations, listWatchlists, etc.).
      const harvested = harvestNames(event.output);
      if (harvested) {
        last.nameByUuid = { ...last.nameByUuid, ...harvested };
      }
      break;
    }
    case "artifact":
      last.artifact = { id: event.id, kind: event.kind, title: event.title };
      break;
    case "artifact-error":
      last.artifactError = event.message;
      break;
    case "error":
      last.error = event.message;
      break;
    case "done":
      last.done = true;
      break;
  }
  return next;
}

// --- Drawer UI ---------------------------------------------------------------

const DRAWER_MIN = 360;
const DRAWER_MAX = 720;
const DRAWER_DEFAULT = 440;
const DRAWER_STORAGE_KEY = "fuel:drawerWidth";
/** Distance from bottom (px) at which we treat the user as "at bottom" for stick-to-bottom. */
const SCROLL_BOTTOM_THRESHOLD_PX = 64;

function AgentDrawer() {
  const t = useTheme();
  const { open, closeDrawer, runs, busy, run } = useAgentDrawer();
  const credits = useCreditsOptional();
  const [draft, setDraft] = useState("");
  const [width, setWidth] = useState<number>(DRAWER_DEFAULT);
  const [resizing, setResizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  /** When false, streaming updates must not force scroll — user is reading earlier content. */
  const stickToBottomRef = useRef(true);
  const prevRunsLenRef = useRef(0);
  const narrowDrawer = useMobileNav();

  const creditLocked = Boolean(credits?.generationBlocked);
  const creditLimitKind: "daily" | "monthly" | null =
    credits?.popoverState === "dailyBlocked"
      ? "daily"
      : credits?.popoverState === "monthlyEmpty"
        ? "monthly"
        : creditLocked
          ? "daily"
          : null;

  // Load persisted width once on mount.
  useEffect(() => {
    const stored = window.localStorage.getItem(DRAWER_STORAGE_KEY);
    if (stored) {
      const n = Number(stored);
      if (Number.isFinite(n)) {
        setWidth(Math.min(DRAWER_MAX, Math.max(DRAWER_MIN, n)));
      }
    }
  }, []);

  // Auto-scroll only while the user is (or was last) at the bottom. Pausing on
  // manual scroll-away stops the mid-stream flicker described in F20A-128.
  useEffect(() => {
    if (runs.length > prevRunsLenRef.current) {
      stickToBottomRef.current = true;
    }
    prevRunsLenRef.current = runs.length;

    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [runs, busy]);

  const onScrollPane = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD_PX;
  };

  // ESC to close — skip when a modal overlay (e.g. Edit Benchmark) is on top.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeDrawer]);

  // Push main content — Shell reads --drawer-width to inset its right edge.
  // Skip on narrow viewports where the drawer would eat the whole screen.
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const wide = window.innerWidth >= BREAKPOINTS.nav;
      const w = open && wide ? `${width}px` : "0px";
      root.style.setProperty("--drawer-width", w);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.style.setProperty("--drawer-width", "0px");
    };
  }, [open, width]);

  // Drag-to-resize: the drawer's left edge is the handle. We also disable
  // the transition while resizing so the drawer tracks the cursor 1:1.
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const next = Math.min(
        DRAWER_MAX,
        Math.max(DRAWER_MIN, window.innerWidth - e.clientX),
      );
      setWidth(next);
    };
    const onUp = () => {
      setResizing(false);
      // Persist on release so every drag doesn't spam storage.
      window.localStorage.setItem(DRAWER_STORAGE_KEY, String(width));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizing, width]);

  const submit = async () => {
    const prompt = draft.trim();
    if (!prompt || busy || creditLocked) return;
    setDraft("");
    const result = await run({ prompt, kind: "chat" });
    if (!result.ok && result.kind === "credit_limit") {
      setDraft(result.restorePrompt);
    }
  };

  return (
    <>
      {/* keyframes + gradient styles live here so the drawer is self-contained */}
      <style jsx global>{`
        @keyframes fuel-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes fuel-pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 180, 138, 0.35); }
          50% { box-shadow: 0 0 0 4px rgba(0, 180, 138, 0.0); }
        }
        @keyframes fuel-caret {
          0%, 60% { opacity: 1; }
          61%, 100% { opacity: 0; }
        }
        @keyframes fuel-fade-up {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fuel-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>

      {/* No backdrop — the drawer pushes content rather than overlaying it, so
          the main page stays fully readable and usable while the agent is
          open. On narrow viewports where there's no room to push, clicking
          outside still closes via the drawer's own click handlers. */}

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-label="Fuel AI"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: narrowDrawer ? "100%" : `min(${width}px, 92vw)`,
          maxWidth: "100%",
          paddingTop: "var(--fuel-safe-top, 0px)",
          paddingBottom: "var(--fuel-safe-bottom, 0px)",
          background: t.bg,
          borderLeft: narrowDrawer ? "none" : `1px solid ${t.rule}`,
          boxShadow: narrowDrawer ? "none" : "-24px 0 60px rgba(0,0,0,0.25)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          visibility: open ? "visible" : "hidden",
          pointerEvents: open ? "auto" : "none",
          transition: resizing
            ? "none"
            : "transform 260ms cubic-bezier(0.22, 0.61, 0.36, 1), width 160ms ease",
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
          // Keep off-screen closed drawer from expanding document scrollWidth.
          contain: "layout style",
        }}
      >
        {/* Resize handle — invisible strip on the left edge (desktop only). */}
        {!narrowDrawer ? (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setResizing(true);
            }}
            onDoubleClick={() => {
              setWidth(DRAWER_DEFAULT);
              window.localStorage.setItem(
                DRAWER_STORAGE_KEY,
                String(DRAWER_DEFAULT),
              );
            }}
            title="Drag to resize · double-click to reset"
            style={{
              position: "absolute",
              top: 0,
              left: -3,
              bottom: 0,
              width: 7,
              cursor: "col-resize",
              zIndex: 1,
            }}
          />
        ) : null}
        <DrawerHeader t={t} busy={busy} onClose={closeDrawer} />

        <div
          ref={scrollRef}
          onScroll={onScrollPane}
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 18px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {runs.length === 0 ? <EmptyState t={t} /> : null}
          {runs.map((turn, i) => (
            <TurnView key={i} t={t} turn={turn} isLast={i === runs.length - 1} busy={busy} />
          ))}
        </div>

        {creditLimitKind ? <ChatCreditLimitBanner t={t} kind={creditLimitKind} /> : null}

        <Composer
          t={t}
          draft={draft}
          setDraft={setDraft}
          onSubmit={submit}
          busy={busy}
          locked={creditLocked}
          lockKind={creditLimitKind}
        />
      </div>
    </>
  );
}

function DrawerHeader({
  t,
  busy,
  onClose,
}: {
  t: Theme;
  busy: boolean;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderBottom: `1px solid ${t.rule}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gradient shimmer line under the title, visible while busy */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -1,
          height: 2,
          background:
            "linear-gradient(90deg, #00B48A 0%, #ECD67F 25%, #284256 50%, #00B48A 75%, #ECD67F 100%)",
          backgroundSize: "200% 100%",
          opacity: busy ? 1 : 0,
          transition: "opacity 200ms ease",
          animation: busy ? "fuel-shimmer 2.8s linear infinite" : "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <FuelMark size={26} busy={busy} />
        <div>
          <div
            style={{
              fontFamily: t.sans,
              fontSize: 14,
              fontWeight: 600,
              color: t.ink,
              letterSpacing: "-0.01em",
            }}
          >
            Fuel AI
          </div>
          <div style={{ fontFamily: t.sans, fontSize: 11, color: t.muted }}>
            {busy ? "Thinking…" : "Ready"}
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          background: "transparent",
          border: `1px solid ${t.rule}`,
          borderRadius: 6,
          padding: "4px 8px",
          color: t.muted,
          fontFamily: t.sans,
          fontSize: 11,
          cursor: "pointer",
        }}
      >
        ESC
      </button>
    </div>
  );
}

function EmptyState({ t }: { t: Theme }) {
  const suggestions = [
    "Generate an intelligence brief on a company in my pipeline",
    "Find companies similar to ones I've recently viewed",
    "Summarize this week's HubSpot activity on my pipeline",
  ];
  return (
    <div style={{ animation: "fuel-fade-up 260ms ease both" }}>
      <div style={{ fontFamily: t.sans, fontSize: 13, color: t.ink, marginBottom: 6 }}>
        Ask Fuel AI
      </div>
      <div style={{ fontFamily: t.sans, fontSize: 12, color: t.muted, marginBottom: 14 }}>
        Start with a question or pick a suggestion.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {suggestions.map((s) => (
          <div
            key={s}
            style={{
              background: t.panel,
              border: `1px solid ${t.rule}`,
              borderRadius: 8,
              padding: "10px 12px",
              fontFamily: t.sans,
              fontSize: 12.5,
              color: t.inkSoft,
            }}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function TurnView({
  t,
  turn,
  isLast,
  busy,
}: {
  t: Theme;
  turn: Turn;
  isLast: boolean;
  busy: boolean;
}) {
  const streaming = isLast && busy && !turn.done;
  return (
    <div style={{ animation: "fuel-fade-up 260ms ease both", minWidth: 0 }}>
      {/* User message */}
      <div
        className="fuel-md"
        style={{
          display: "inline-block",
          background: t.panelAlt,
          border: `1px solid ${t.rule}`,
          borderRadius: 10,
          padding: "8px 12px 2px",
          color: t.ink,
          marginBottom: 10,
          maxWidth: "90%",
        }}
      >
        <Markdown t={t} text={turn.displayPrompt} />
      </div>

      {turn.toolCalls.length > 0 ? (
        <SkillExecutionDrawer t={t} toolCalls={turn.toolCalls} nameByUuid={turn.nameByUuid} />
      ) : null}

      {turn.text ? (
        <div className="fuel-md" style={{ color: t.ink }}>
          <Markdown t={t} text={turn.text} />
          {streaming ? (
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 2,
                height: "1em",
                marginLeft: 2,
                verticalAlign: "-0.12em",
                background: t.accent,
                animation: "fuel-caret 900ms steps(1) infinite",
              }}
            />
          ) : null}
        </div>
      ) : null}

      {turn.pitchDeckUpload && !turn.pitchDeckUpload.resolved ? (
        <PitchDeckInlineUpload t={t} gate={turn.pitchDeckUpload} />
      ) : null}

      {turn.kpiBenchmarkFill && !turn.kpiBenchmarkFill.resolved ? (
        <KpiBenchmarkInlineFill t={t} gate={turn.kpiBenchmarkFill} />
      ) : null}

      {turn.playbookPrepLookup && !turn.done ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            padding: "6px 10px",
            background: t.panelAlt,
            border: `1px solid ${t.rule}`,
            borderRadius: 16,
            fontFamily: t.sans,
            fontSize: 11.5,
            color: t.muted,
          }}
        >
          <ThinkingDots t={t} small />
          <span>Working…</span>
        </div>
      ) : null}

      {/* Persistent "still thinking" indicator. Bedrock TTFT on a portfolio
       * playbook run can be 30–90s between turns; the caret on the prior
       * text is too subtle to reassure the user that work is in progress.
       * This surfaces after ~2s of silence and disappears the instant the
       * next event lands. */}
      {streaming && turn.toolCalls.every((c) => c.status !== "running") ? (
        <ThinkingPulse t={t} lastActivityAt={turn.lastActivityAt} />
      ) : null}

      {turn.artifact ? (
        <a
          href={`/artifacts/${turn.artifact.id}`}
          target="_blank"
          rel="noopener"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 12,
            padding: "6px 10px",
            background: t.panelAlt,
            border: `1px solid ${t.rule}`,
            borderRadius: 6,
            fontFamily: t.sans,
            fontSize: 12,
            fontWeight: 500,
            color: t.ink,
            textDecoration: "none",
          }}
        >
          Open full page ↗
          <span style={{ color: t.mutedSoft, fontWeight: 400, fontSize: 11 }}>
            · Print / Save as PDF
          </span>
        </a>
      ) : null}

      {turn.artifactError ? (
        <div
          style={{
            marginTop: 12,
            padding: "8px 10px",
            borderRadius: 6,
            border: `1px solid ${t.rule}`,
            background: t.panelAlt,
            fontFamily: t.sans,
            fontSize: 12,
            color: "#b34141",
            lineHeight: 1.45,
          }}
        >
          {turn.artifactError}
        </div>
      ) : null}

      {turn.error ? (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            background: t.panelAlt,
            border: `1px solid ${t.negative}`,
            borderRadius: 8,
            fontFamily: t.sans,
            fontSize: 12,
            color: t.ink,
          }}
        >
          {turn.error}
        </div>
      ) : null}
    </div>
  );
}

function PitchDeckInlineUpload({
  t,
  gate,
}: {
  t: Theme;
  gate: PitchDeckUploadGate;
}) {
  const { run } = useAgentDrawer();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  if (started) return null;

  const pitchType =
    DATA_ROOM_DOCUMENT_TYPES.find((row) => row.id === "pitch_deck") ?? {
      id: "pitch_deck",
      label: "Pitch deck",
    };

  const startEvaluation = async (ids: PitchDeckIds) => {
    const subjectLine = `Run the selected playbook against ${gate.companyName} (catalog uuid: ${gate.companyUuid}).`;
    const prompt = withSuggestedInitiativesFormat(`${subjectLine}

Follow the playbook's prescribed skill order and output format verbatim. Do NOT ask the user which subject this is for — it is ${gate.companyName}.

${buildExtractDeckPromptBlock(ids)}

---
${gate.playbook.content}
---`);
    const displayPrompt = `Run [${gate.playbook.title}](/playbooks/${gate.playbook.slug}) against [${gate.companyName}](/company/${gate.companyUuid}).`;
    setStarted(true);
    await run({
      prompt,
      displayPrompt,
      kind: "playbook_run",
      artifactKind: "playbook_run",
      playbookTitle: gate.playbook.title,
      subjectCompanyUuid: gate.companyUuid,
      subjectCompanyName: gate.companyName,
      companyNameByUuid: { [gate.companyUuid]: gate.companyName },
    });
  };

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const result = await postDataRoomUpload({
        companyUuid: gate.companyUuid,
        typeId: pitchType.id,
        typeLabel: pitchType.label,
        file,
        source: "data_room",
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const ids: PitchDeckIds | null =
        result.contextItemId
          ? {
              contextItemId: result.contextItemId,
              attachmentId: result.attachmentId,
            }
          : pitchDeckIdsFromSnapshot(result.snapshot);
      if (!ids) {
        setError("Upload succeeded, but the pitch deck could not be linked. Try again.");
        return;
      }
      await startEvaluation(ids);
    } catch (e) {
      setError((e as Error).message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${t.rule}`,
        background: t.panelAlt,
        fontFamily: t.sans,
        boxSizing: "border-box",
        maxWidth: "100%",
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, color: t.ink, marginBottom: 6 }}>
        Upload pitch deck
      </div>
      <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5, marginBottom: 12 }}>
        Same formats as Data Room ({DATA_ROOM_ACCEPT_EXTENSIONS.replace(/\./g, "").replace(/,/g, ", ")}
        ). File saves to Data Room, then evaluation starts automatically.
      </div>
      {error ? (
        <div
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            borderRadius: 8,
            border: `1px solid ${t.negative}`,
            color: t.ink,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        style={{
          padding: "9px 14px",
          borderRadius: 8,
          border: "none",
          background: accentGradient(t),
          color: onAccentText(t),
          fontWeight: 600,
          fontSize: 12.5,
          cursor: busy ? "wait" : "pointer",
          fontFamily: t.sans,
          opacity: busy ? 0.85 : 1,
          boxShadow: busy ? `inset 0 0 0 1px ${t.accent}` : undefined,
        }}
      >
        {busy ? "Uploading…" : "Choose file"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={DATA_ROOM_ACCEPT_EXTENSIONS}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function fireCompanyPlaybookFromGate(
  run: AgentDrawerApi["run"],
  gate: { companyUuid: string; companyName: string; playbook: { slug: string; title: string; content: string } },
  extraPromptBlock: string,
) {
  const subjectLine = `Run the selected playbook against ${gate.companyName} (catalog uuid: ${gate.companyUuid}).`;
  const extra = extraPromptBlock.trim() ? `\n${extraPromptBlock}\n` : "\n";
  const prompt = withSuggestedInitiativesFormat(`${subjectLine}

Follow the playbook's prescribed skill order and output format verbatim. Do NOT ask the user which subject this is for — it is ${gate.companyName}.
${extra}---
${gate.playbook.content}
---`);
  const displayPrompt = `Run [${gate.playbook.title}](/playbooks/${gate.playbook.slug}) against [${gate.companyName}](/company/${gate.companyUuid}).`;
  return run({
    prompt,
    displayPrompt,
    kind: "playbook_run",
    artifactKind: "playbook_run",
    playbookTitle: gate.playbook.title,
    subjectCompanyUuid: gate.companyUuid,
    subjectCompanyName: gate.companyName,
    companyNameByUuid: { [gate.companyUuid]: gate.companyName },
  });
}

function KpiBenchmarkInlineFill({
  t,
  gate,
}: {
  t: Theme;
  gate: KpiBenchmarkFillGate;
}) {
  const { run } = useAgentDrawer();
  const [values, setValues] = useState<BenchmarkDrawerValues>(() => ({
    ...emptyChatBenchmarkValues(),
    ...(gate.savedValues ?? {}),
  }));
  const [busy, setBusy] = useState<"save" | "anyway" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const fields = kpiChatFieldDefs();
  const prefilled = fields.some((field) => gate.savedValues?.[field.key]?.trim());

  if (started) return null;

  const startRun = async (extra: string) => {
    setStarted(true);
    await fireCompanyPlaybookFromGate(run, gate, extra);
  };

  const saveAndRun = async () => {
    setError(null);
    setBusy("save");
    try {
      await patchBenchmarkDrawer(gate.companyUuid, values, true, {
        includeOverview: true,
      });
      notifyOverviewDataChanged(gate.companyUuid);
      await startRun("");
    } catch {
      setError("Could not save numbers. Try again, or run anyway.");
    } finally {
      setBusy(null);
    }
  };

  const runAnyway = async () => {
    setError(null);
    setBusy("anyway");
    try {
      await startRun(buildKpiRunAnywayPromptBlock());
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${t.rule}`,
        background: t.panelAlt,
        fontFamily: t.sans,
        boxSizing: "border-box",
        maxWidth: "100%",
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, color: t.ink, marginBottom: 6 }}>
        {prefilled ? "Fill the missing numbers" : "Add your numbers"}
      </div>
      <div style={{ fontSize: 12, color: t.muted, lineHeight: 1.5, marginBottom: 12 }}>
        Optional. Derived metrics like Rule of 40 are skipped here — Fuel computes those after save.
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 12,
        }}
      >
        {fields.map((field) => (
          <label
            key={field.key}
            style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: t.inkSoft }}>
              {field.label}
            </span>
            <input
              value={values[field.key]}
              disabled={busy != null}
              placeholder={field.placeholder}
              inputMode="decimal"
              onChange={(e) => {
                const next = sanitizeBenchmarkNumericInput(e.target.value);
                if (next == null) return;
                setValues((prev) => ({ ...prev, [field.key]: next }));
              }}
              style={{
                height: 34,
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                padding: "0 10px",
                borderRadius: 8,
                border: `1px solid ${t.rule}`,
                background: t.panel,
                color: t.ink,
                fontFamily: t.sans,
                fontSize: 12.5,
              }}
            />
          </label>
        ))}
      </div>
      {error ? (
        <div
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            borderRadius: 8,
            border: `1px solid ${t.negative}`,
            color: t.ink,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={busy != null}
          onClick={() => void saveAndRun()}
          style={{
            padding: "9px 14px",
            borderRadius: 8,
            border: "none",
            background: accentGradient(t),
            color: onAccentText(t),
            fontWeight: 600,
            fontSize: 12.5,
            cursor: busy ? "wait" : "pointer",
            fontFamily: t.sans,
            opacity: busy === "save" ? 0.85 : 1,
          }}
        >
          {busy === "save" ? "Saving…" : "Save and run"}
        </button>
        <button
          type="button"
          disabled={busy != null}
          onClick={() => void runAnyway()}
          style={{
            padding: "9px 14px",
            borderRadius: 8,
            border: `1px solid ${t.rule}`,
            background: t.panel,
            color: t.ink,
            fontWeight: 600,
            fontSize: 12.5,
            cursor: busy ? "wait" : "pointer",
            fontFamily: t.sans,
          }}
        >
          {busy === "anyway" ? "Starting…" : "Run anyway"}
        </button>
      </div>
    </div>
  );
}

/**
 * Collapsible group for a turn's skill/tool calls — Cursor/Claude-style.
 * Default collapsed; expand state is local to this turn instance so past
 * runs keep independent toggles. Summary updates live while skills stream in.
 */
function SkillExecutionDrawer({
  t,
  toolCalls,
  nameByUuid,
}: {
  t: Theme;
  toolCalls: ToolCall[];
  nameByUuid: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const count = toolCalls.length;
  if (count === 0) return null;

  const running = toolCalls.some((tc) => tc.status === "running");
  const errorCount = toolCalls.filter((tc) => tc.status === "error").length;
  const noun = count === 1 ? "skill" : "skills";
  const label = running ? `Running ${count} ${noun}` : `Ran ${count} ${noun}`;
  const accent =
    errorCount > 0 ? t.negative : running ? t.accent : t.muted;

  return (
    <div
      style={{
        margin: "0 0 10px",
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
        fontFamily: t.sans,
        fontSize: 12,
        color: t.ink,
        animation: running ? "fuel-pulse-border 1.6s ease-in-out infinite" : "none",
        transition: "border-color 300ms ease",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 12px",
          margin: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "inherit",
          color: "inherit",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              fontSize: 10,
              color: t.muted,
              transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 160ms ease",
              flexShrink: 0,
            }}
          >
            ▾
          </span>
          <span style={{ fontWeight: 600 }}>{label}</span>
          {errorCount > 0 ? (
            <span style={{ color: t.negative, fontSize: 11, fontWeight: 500 }}>
              {errorCount === 1 ? "1 failed" : `${errorCount} failed`}
            </span>
          ) : null}
        </span>
        <span
          style={{
            fontSize: 11,
            color: t.muted,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          {running ? (
            <ThinkingDots t={t} small />
          ) : errorCount > 0 ? (
            <span style={{ color: t.negative }}>✕</span>
          ) : (
            <span style={{ color: t.accent }}>✓</span>
          )}
        </span>
      </button>

      {expanded ? (
        <div
          id={panelId}
          role="region"
          aria-label="Skill execution details"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "0 8px 8px",
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {toolCalls.map((tc, i) => (
            <ToolCallCard key={`${tc.id}:${i}`} t={t} tc={tc} nameByUuid={nameByUuid} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToolCallCard({
  t,
  tc,
  nameByUuid,
}: {
  t: Theme;
  tc: ToolCall;
  nameByUuid: Record<string, string>;
}) {
  const running = tc.status === "running";
  const tone =
    tc.status === "error" ? "#b34141" : tc.status === "ok" ? t.accent : t.muted;
  return (
    <div
      style={{
        background: t.panel,
        border: `1px solid ${t.rule}`,
        borderLeft: `3px solid ${tone}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontFamily: t.sans,
        fontSize: 12,
        color: t.ink,
        animation: running ? "fuel-pulse-border 1.6s ease-in-out infinite" : "none",
        transition: "border-color 300ms ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontWeight: 600 }}>{verbFor(tc.name)}</span>
          <span style={{ color: t.muted, marginLeft: 6, fontFamily: t.mono, fontSize: 11 }}>
            {tc.name}
          </span>
        </div>
        <div style={{ fontSize: 11, color: t.muted, display: "flex", alignItems: "center", gap: 6 }}>
          {running ? (
            <ThinkingDots t={t} small />
          ) : tc.status === "ok" ? (
            <span style={{ color: t.accent }}>✓</span>
          ) : tc.status === "error" ? (
            <span style={{ color: "#b34141" }}>✕</span>
          ) : null}
          {tc.latencyMs != null ? <span>{tc.latencyMs}ms</span> : null}
        </div>
      </div>
      {tc.input ? (
        <div
          style={{
            fontFamily: t.mono,
            fontSize: 10.5,
            color: t.muted,
            marginTop: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {summarizeInput(tc.input, nameByUuid)}
        </div>
      ) : null}
      {tc.error ? (
        <div style={{ fontFamily: t.mono, fontSize: 10.5, color: "#b34141", marginTop: 4 }}>
          {tc.error}
        </div>
      ) : null}
    </div>
  );
}

function verbFor(skillName: string): string {
  switch (skillName) {
    case "searchCompanies":
      return "Searching companies";
    case "getCompany":
      return "Loading company";
    case "getCompanyContext":
      return "Reading context";
    case "addCompanyNote":
      return "Writing note";
    case "compareToBenchmark":
      return "Comparing benchmark";
    default:
      return skillName;
  }
}

/**
 * Keys on a tool-call input that are likely to hold company UUIDs. When we see
 * one whose value matches an entry in the nameByUuid map, render the name.
 */
const UUID_KEYS = new Set([
  "companyUuid",
  "uuid",
  "subjectCompanyUuid",
  "companyId",
]);

function summarizeInput(
  input: unknown,
  nameByUuid: Record<string, string> = {},
): string {
  try {
    if (input == null) return "";
    if (typeof input === "string") return input;
    const obj = input as Record<string, unknown>;
    const parts: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v == null || v === "") continue;
      const isUuidKey = UUID_KEYS.has(k);
      const name = isUuidKey && typeof v === "string" ? nameByUuid[v] : undefined;
      const display = name
        ? name
        : typeof v === "string"
          ? v
          : JSON.stringify(v);
      const shown = display.length > 40 ? display.slice(0, 40) + "…" : display;
      parts.push(`${k}=${shown}`);
    }
    return parts.join(" · ");
  } catch {
    return "";
  }
}

/**
 * Shallow walk of a tool-call output looking for {uuid, name}-ish pairs we
 * can cache. Handles the shapes emitted by our skills: a bare {companyUuid,
 * name} object, a wrapped {company: {...}}, or an array of {companies: [...]}.
 */
function harvestNames(output: unknown): Record<string, string> | null {
  if (!output || typeof output !== "object") return null;
  const out: Record<string, string> = {};
  const walk = (v: unknown, depth: number) => {
    if (!v || depth > 3) return;
    if (Array.isArray(v)) {
      for (const item of v) walk(item, depth + 1);
      return;
    }
    if (typeof v !== "object") return;
    const obj = v as Record<string, unknown>;
    const uuid =
      typeof obj.uuid === "string"
        ? obj.uuid
        : typeof obj.companyUuid === "string"
          ? obj.companyUuid
          : undefined;
    const name = typeof obj.name === "string" ? obj.name : undefined;
    if (uuid && name) out[uuid] = name;
    for (const val of Object.values(obj)) {
      if (val && typeof val === "object") walk(val, depth + 1);
    }
  };
  walk(output, 0);
  return Object.keys(out).length > 0 ? out : null;
}

function Markdown({ t, text }: { t: Theme; text: string }) {
  return (
    <>
      <style jsx global>{`
        .fuel-md {
          font-family: ${t.sans};
          font-size: 13.5px;
          line-height: 1.6;
          min-width: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .fuel-md > *:first-child { margin-top: 0 !important; }
        .fuel-md > *:last-child { margin-bottom: 0 !important; }
        .fuel-md p { margin: 0 0 10px; }
        .fuel-md h1, .fuel-md h2, .fuel-md h3, .fuel-md h4 {
          font-family: ${t.sans};
          letter-spacing: -0.01em;
          margin: 16px 0 6px;
          font-weight: 600;
          color: ${t.ink};
        }
        .fuel-md h1 { font-size: 16px; }
        .fuel-md h2 { font-size: 14.5px; }
        .fuel-md h3 { font-size: 13.5px; color: ${t.accent}; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
        .fuel-md h4 { font-size: 13px; }
        .fuel-md ul, .fuel-md ol { margin: 0 0 10px; padding-left: 18px; }
        .fuel-md li { margin: 2px 0; }
        .fuel-md li > p { margin: 0; }
        .fuel-md strong { font-weight: 600; color: ${t.ink}; }
        .fuel-md em { font-style: italic; }
        .fuel-md a { color: ${t.accent}; text-decoration: none; border-bottom: 1px solid ${t.accent}44; }
        .fuel-md a:hover { border-bottom-color: ${t.accent}; }
        .fuel-md code {
          font-family: ${t.mono};
          font-size: 12px;
          background: ${t.panelAlt};
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid ${t.ruleSoft};
        }
        .fuel-md pre {
          background: ${t.panelAlt};
          border: 1px solid ${t.rule};
          border-radius: 6px;
          padding: 10px 12px;
          margin: 10px 0;
          overflow-x: auto;
          font-family: ${t.mono};
          font-size: 12px;
        }
        .fuel-md pre code {
          background: transparent;
          border: none;
          padding: 0;
        }
        .fuel-md blockquote {
          margin: 10px 0;
          padding: 4px 12px;
          border-left: 3px solid ${t.accent};
          color: ${t.inkSoft};
          font-style: italic;
        }
        .fuel-md hr {
          border: none;
          border-top: 1px solid ${t.ruleSoft};
          margin: 14px 0;
        }
        .fuel-md table {
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 12.5px;
          display: block;
          width: max-content;
          max-width: 100%;
          overflow-x: auto;
        }
        .fuel-md th, .fuel-md td {
          border: 1px solid ${t.ruleSoft};
          padding: 6px 10px;
          text-align: left;
        }
        .fuel-md th { background: ${t.panelAlt}; font-weight: 600; }
      `}</style>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </>
  );
}

function ThinkingDots({ t, small = false }: { t: Theme; small?: boolean }) {
  const size = small ? 4 : 5;
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center", height: size * 2 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: size,
            height: size,
            borderRadius: "50%",
            background: t.accent,
            animation: "fuel-dot 1.1s ease-in-out infinite",
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Shown between tool batches while the drawer waits on Bedrock to start
 * streaming the next turn. Stays invisible for the first 2 seconds so fast
 * turns don't flicker it, then fades in with a running elapsed-time count.
 */
function ThinkingPulse({
  t,
  lastActivityAt,
}: {
  t: Theme;
  lastActivityAt: number;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);
  const elapsedMs = Date.now() - lastActivityAt;
  // `tick` only exists to keep React re-rendering every 500ms so elapsedMs
  // stays fresh; it's not read directly.
  void tick;
  if (elapsedMs < 2000) return null;
  const seconds = Math.floor(elapsedMs / 1000);
  const label = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
        padding: "6px 10px",
        background: t.panelAlt,
        border: `1px solid ${t.rule}`,
        borderRadius: 16,
        fontFamily: t.sans,
        fontSize: 11.5,
        color: t.muted,
        animation: "fuel-fade-up 200ms ease both",
      }}
    >
      <ThinkingDots t={t} small />
      <span>Thinking · {label}</span>
    </div>
  );
}

function ChatCreditLimitBanner({
  t,
  kind,
}: {
  t: Theme;
  kind: "daily" | "monthly";
}) {
  const credits = useCreditsOptional();
  const aiCost = credits?.actionCosts.find((row) => row.action === "aiChat")?.cost;
  const title =
    kind === "daily" ? "Daily AI credit limit reached" : "Monthly AI credits exhausted";
  const body =
    kind === "daily"
      ? "You've used all of today's AI credits. Your credits will automatically refresh tomorrow. Until then, you can continue browsing Fuel, but new AI messages are temporarily unavailable."
      : "You've used all AI credits for this billing period. Browse Fuel as usual — new AI messages unlock when credits reset or you upgrade.";

  return (
    <div
      role="status"
      style={{
        margin: "0 12px 10px",
        padding: "12px 14px",
        background: `${t.warn}14`,
        border: `1px solid ${t.warn}44`,
        borderRadius: 8,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <svg
        width={15}
        height={15}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        style={{ flexShrink: 0, marginTop: 2 }}
      >
        <path
          d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          stroke={t.warn}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 12.5,
            fontWeight: 600,
            color: t.ink,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: t.sans,
            fontSize: 12,
            lineHeight: 1.5,
            color: t.inkSoft,
          }}
        >
          {body}
          {typeof aiCost === "number" && aiCost > 0 ? (
            <span>
              {" "}
              AI messages cost {aiCost} cr each.
            </span>
          ) : null}
          {credits ? <CreditSeeCostsControl t={t} /> : null}
        </div>
      </div>
    </div>
  );
}

function Composer({
  t,
  draft,
  setDraft,
  onSubmit,
  busy,
  locked,
  lockKind,
}: {
  t: Theme;
  draft: string;
  setDraft: (s: string) => void;
  onSubmit: () => void;
  busy: boolean;
  locked: boolean;
  lockKind: "daily" | "monthly" | null;
}) {
  const disabled = busy || locked;
  const placeholder = locked
    ? lockKind === "monthly"
      ? "Monthly AI credits exhausted"
      : "Daily AI limit reached · credits refresh tomorrow"
    : busy
      ? "Fuel AI is responding…"
      : "Ask Fuel AI…";
  const canSend = !disabled && Boolean(draft.trim());

  return (
    <div
      style={{
        borderTop: `1px solid ${t.rule}`,
        padding: 12,
        background: t.bg,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
          background: t.panel,
          border: `1px solid ${t.rule}`,
          borderRadius: 10,
          padding: 8,
          opacity: locked ? 0.85 : 1,
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => {
            if (locked) return;
            setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (locked) return;
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          rows={2}
          disabled={disabled}
          readOnly={locked}
          aria-disabled={disabled}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: t.sans,
            fontSize: 13,
            color: locked ? t.muted : t.ink,
            padding: "4px 6px",
            lineHeight: 1.5,
            cursor: locked ? "not-allowed" : undefined,
          }}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSend}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            fontFamily: t.sans,
            fontSize: 12,
            fontWeight: 600,
            color: canSend ? onAccentText(t) : t.muted,
            cursor: canSend ? "pointer" : "default",
            background: canSend ? accentGradient(t) : t.panelAlt,
            opacity: canSend ? 1 : 0.5,
            transition: "opacity 180ms ease",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
