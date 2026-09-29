import "server-only";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Tool,
  type ToolUseBlock,
  type Message,
} from "@aws-sdk/client-bedrock-runtime";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  agentRuns,
  catalogCompanies,
  contextItems,
  signalObservations,
  signals,
  watchlistCompanies,
  type ContextItem,
  type Signal,
} from "@/db/schema";
import {
  DEFAULT_CONTEXT_SIGNAL_EXTRACTION_RULES,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { CONTEXT_SIGNAL_EXTRACTION_SLUG } from "@/lib/system-playbooks/slugs";

const EXTRACTOR_MODEL_ID =
  process.env.BEDROCK_EXTRACTOR_MODEL_ID ??
  "us.anthropic.claude-haiku-4-5-20251001-v1:0";

/** Max chars of context content to send to Claude. Attachments/transcripts that
 *  exceed this are truncated — flagged in observation.metadata. */
const MAX_CONTENT_CHARS = 30_000;

const bedrock = new BedrockRuntimeClient({});

export interface ExtractionResult {
  runId: string | null;
  observations: number;
  truncated: boolean;
  error?: string;
}

/**
 * Fire-and-check hook called after a context_item is inserted. Reads the
 * account's signal selections (falling back to the global catalog), asks
 * Claude for structured observations, and appends them to signal_observations.
 *
 * Non-fatal: caller awaits the promise but any thrown error is swallowed and
 * reported in the returned ExtractionResult so ingest never rolls back.
 */
export async function onContextItemCreated(
  item: ContextItem,
): Promise<ExtractionResult> {
  // stampExtracted marks the item as "we tried" so retroExtract's
  // onlyMissing filter skips it next pass. Any return path that
  // represents a settled decision (extracted successfully, content
  // permanently too short, signal catalog empty) stamps; only thrown
  // errors are left un-stamped so the next run retries.
  const stampExtracted = async () => {
    try {
      await (await getDb())
        .update(contextItems)
        .set({ lastExtractedAt: new Date() })
        .where(eq(contextItems.id, item.id));
    } catch {
      /* best-effort — the observation insert already landed or not */
    }
  };

  try {
    // Skip items with no company — extraction without a subject produces
    // orphan observations. Don't stamp: a later manual company link
    // should let the next retro pass catch this.
    if (!item.companyUuid) {
      return { runId: null, observations: 0, truncated: false, error: "no_company" };
    }
    if (!item.content || item.content.trim().length < 40) {
      await stampExtracted();
      return { runId: null, observations: 0, truncated: false, error: "too_short" };
    }

    const defs = await loadSignalDefsForAccount(item.accountId);
    if (defs.length === 0) {
      // Don't stamp: the catalog is just empty for this account right
      // now. Once signals are seeded or selected, the next pass should
      // pick this item up.
      return { runId: null, observations: 0, truncated: false, error: "no_signals" };
    }

    // Idempotent: re-extraction marks prior observations as superseded rather
    // than deleting them, so the audit-trail UI can show the history of a
    // value. Matters for Granola re-syncs and the retro-extract script.
    const db0 = await getDb();
    const priorRows = await db0
      .select({ id: signalObservations.id })
      .from(signalObservations)
      .where(
        and(
          eq(signalObservations.contextItemId, item.id),
          isNull(signalObservations.supersededAt),
        ),
      );

    const truncated = item.content.length > MAX_CONTENT_CHARS;
    const content = truncated ? item.content.slice(0, MAX_CONTENT_CHARS) : item.content;

    const subjectCompanyName = await lookupSubjectCompanyName(item.companyUuid);

    const { observations: extracted, inputTokens, outputTokens } =
      await callExtractor({ item, content, defs, subjectCompanyName });

    const runId = `arun_${randomUUID()}`;
    const costTokens = (inputTokens ?? 0) + (outputTokens ?? 0);
    const now = new Date();

    await (
      await getDb()
    )
      .insert(agentRuns)
      .values({
        id: runId,
        accountId: item.accountId,
        userEmail: item.authorEmail ?? "system",
        kind: "signal_extraction",
        subjectCompanyUuid: item.companyUuid,
        prompt: content.slice(0, 4000),
        output: JSON.stringify({ count: extracted.length }),
        model: EXTRACTOR_MODEL_ID,
        inputTokens: inputTokens ?? null,
        outputTokens: outputTokens ?? null,
        costTokens,
        status: "ok",
        completedAt: now,
      });

    // Best-effort: filter to signals we actually know (Claude occasionally
    // hallucinates an id). Drop anything with no value at all.
    const defIds = new Set(defs.map((d) => d.id));
    const rows = extracted
      .filter((o) => defIds.has(o.signal_id))
      .filter(
        (o) =>
          o.value_numeric != null || (o.value_text && o.value_text.length > 0) || o.value_bool != null,
      )
      .map((o) => ({
        id: `sobs_${randomUUID()}`,
        accountId: item.accountId,
        companyUuid: item.companyUuid!,
        signalId: o.signal_id,
        period: o.period ?? inferPeriod(item.occurredAt),
        asOf: o.as_of ?? null,
        valueNumeric: o.value_numeric ?? null,
        valueText: o.value_text ?? null,
        valueBool: o.value_bool ?? null,
        sentiment: o.sentiment ?? null,
        source: item.source,
        contextItemId: item.id,
        agentRunId: runId,
        confidence: o.confidence ?? null,
        rawSnippet: o.raw_snippet ?? null,
        authorEmail: item.authorEmail ?? null,
        metadata: truncated ? { truncated: true } : null,
      }));

    if (rows.length > 0) {
      await (await getDb()).insert(signalObservations).values(rows);
    }

    // Supersede prior observations for this context item. We don't pair them
    // 1:1 with the new rows by (signal, period) — the extractor output is
    // the new source of truth, so every prior row is retired as of now.
    // supersededById is left NULL when no direct successor is chosen; the
    // audit view surfaces the whole set by contextItemId anyway.
    if (priorRows.length > 0) {
      await (await getDb())
        .update(signalObservations)
        .set({ supersededAt: now })
        .where(
          inArray(
            signalObservations.id,
            priorRows.map((r) => r.id),
          ),
        );
    }

    // Stamp on the happy path whether or not Claude returned anything.
    // Crucially this covers the "LLM confirmed there's nothing to
    // extract" case — those items don't need to be re-asked.
    await stampExtracted();
    return { runId, observations: rows.length, truncated };
  } catch (e) {
    const msg = (e as Error).message?.slice(0, 400) ?? "unknown";
    console.warn(`[signal-extract] item=${item.id} error: ${msg}`);
    // Deliberately no stamp — a thrown error (Bedrock hiccup, DB blip,
    // truncation bug) should let the next retro pass try again.
    return { runId: null, observations: 0, truncated: false, error: msg };
  }
}

/**
 * Resolve the set of signal definitions the extractor should target for an
 * account. For now: all global signals + any account-scoped ones. A future
 * pass can narrow this to account_signal_selections when the UI ships.
 */
async function loadSignalDefsForAccount(accountId: string): Promise<Signal[]> {
  const db = await getDb();
  return db
    .select()
    .from(signals)
    .where(
      or(
        and(eq(signals.scope, "global"), isNull(signals.accountId)),
        and(eq(signals.scope, "account"), eq(signals.accountId, accountId)),
      ),
    )
    .orderBy(asc(signals.category), asc(signals.displayOrder));
}

/**
 * Best-effort name lookup for the subject company so the extractor prompt can
 * scope observations correctly. Tries catalog_companies first (fast, account-
 * local), then watchlist_companies (may have a stored name for Neptune UUIDs).
 * Returns null if unknown — the prompt degrades gracefully.
 */
async function lookupSubjectCompanyName(companyUuid: string): Promise<string | null> {
  const db = await getDb();
  if (companyUuid.startsWith("cat_")) {
    const [row] = await db
      .select({ name: catalogCompanies.name })
      .from(catalogCompanies)
      .where(eq(catalogCompanies.id, companyUuid))
      .limit(1);
    if (row?.name) return row.name;
  }
  const [wlRow] = await db
    .select({ name: watchlistCompanies.name })
    .from(watchlistCompanies)
    .where(eq(watchlistCompanies.companyUuid, companyUuid))
    .limit(1);
  if (wlRow?.name) return wlRow.name;
  // Last-resort fallback to fuel-data so the extractor always gets a real
  // name for the SCOPE RULE. Without this a uuid with no watchlist row
  // would drop Claude into generic "focus on primary company" mode, which
  // is weaker scoping. Swallow any Neptune/OpenSearch failures.
  try {
    const { getCompany } = await import("@/lib/fuel-data");
    const hit = await getCompany(companyUuid);
    return hit?.name ?? null;
  } catch {
    return null;
  }
}

/** Default period when the extractor can't infer one: calendar quarter of
 *  the item's occurrence timestamp. */
function inferPeriod(at: Date): string {
  const y = at.getUTCFullYear();
  const q = Math.floor(at.getUTCMonth() / 3) + 1;
  return `${y}-q${q}`;
}

type ExtractedObservation = {
  signal_id: string;
  value_numeric?: number | null;
  value_text?: string | null;
  value_bool?: boolean | null;
  period?: string | null;
  as_of?: string | null;
  sentiment?: number | null;
  confidence?: number | null;
  raw_snippet?: string | null;
};

interface CallResult {
  observations: ExtractedObservation[];
  inputTokens?: number;
  outputTokens?: number;
}

async function callExtractor(opts: {
  item: ContextItem;
  content: string;
  defs: Signal[];
  subjectCompanyName: string | null;
}): Promise<CallResult> {
  const { template: rulesTemplate } = await loadSystemPlaybookTemplate(
    CONTEXT_SIGNAL_EXTRACTION_SLUG,
    DEFAULT_CONTEXT_SIGNAL_EXTRACTION_RULES,
  );
  const tool = buildRecordObservationsTool(opts.defs);
  const system = buildSystemPrompt(opts.defs, opts.subjectCompanyName, rulesTemplate);

  const userText =
    (opts.subjectCompanyName
      ? `Subject company: ${opts.subjectCompanyName}\n`
      : "") +
    `Context item kind: ${opts.item.kind}\n` +
    `Occurred at: ${opts.item.occurredAt.toISOString()}\n` +
    (opts.item.title ? `Title: ${opts.item.title}\n` : "") +
    `Source: ${opts.item.source}\n\n` +
    `CONTENT:\n${opts.content}`;

  const messages: Message[] = [
    {
      role: "user",
      content: [{ text: userText }],
    },
  ];

  const res = await bedrock.send(
    new ConverseCommand({
      modelId: EXTRACTOR_MODEL_ID,
      system: [{ text: system }],
      messages,
      toolConfig: {
        tools: [tool],
        toolChoice: { tool: { name: "record_observations" } },
      },
      inferenceConfig: { maxTokens: 2000, temperature: 0 },
    }),
  );

  const usage = res.usage;
  const inputTokens = usage?.inputTokens ?? undefined;
  const outputTokens = usage?.outputTokens ?? undefined;

  const blocks = res.output?.message?.content ?? [];
  for (const block of blocks) {
    const tu = (block as { toolUse?: ToolUseBlock }).toolUse;
    if (tu?.name === "record_observations") {
      const parsed = tu.input as { observations?: ExtractedObservation[] } | undefined;
      return {
        observations: parsed?.observations ?? [],
        inputTokens,
        outputTokens,
      };
    }
  }
  return { observations: [], inputTokens, outputTokens };
}

function buildSystemPrompt(
  defs: Signal[],
  subjectCompanyName: string | null,
  rulesTemplate: string,
): string {
  return [
    "You extract structured signal observations from a piece of portfolio-company context (Slack messages, meeting transcripts, notes, attached documents).",
    "",
    subjectCompanyName
      ? `CRITICAL SCOPE RULE: The subject company is "${subjectCompanyName}". ONLY emit observations that describe ${subjectCompanyName} itself. IGNORE facts about other parties mentioned in the content — the investor / advisor firm (e.g. York IE), service providers, customers of the subject company, competitors, or third-party tools. If you cannot tell which company a number refers to, omit it rather than guess.`
      : "Focus observations on the primary company that is the subject of the content. Omit facts about service providers, investors, or third parties.",
    "",
    rulesTemplate,
    "",
    "Signal catalog:",
    ...defs.map((d) => {
      const parts = [`- ${d.id}  [${d.kind}${d.unit ? ` ${d.unit}` : ""}]  ${d.label}`];
      if (d.description) parts.push(`    ${d.description}`);
      if (d.extractionHint) parts.push(`    HINT: ${d.extractionHint}`);
      return parts.join("\n");
    }),
  ].join("\n");
}

function buildRecordObservationsTool(_defs: Signal[]): Tool {
  // One generic tool; the system prompt carries the catalog. Bedrock tool
  // schemas are JSON Schema — we keep this permissive and validate at insert.
  return {
    toolSpec: {
      name: "record_observations",
      description:
        "Record every signal observation you found in the content. Emit one entry per distinct signal-period pair.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            observations: {
              type: "array",
              description: "List of observations.",
              items: {
                type: "object",
                properties: {
                  signal_id: { type: "string", description: "Signal id from the catalog." },
                  value_numeric: { type: "number" },
                  value_text: { type: "string" },
                  value_bool: { type: "boolean" },
                  period: { type: "string", description: "YYYY-qN, e.g. 2026-q1" },
                  as_of: { type: "string", description: "ISO date the value applies to" },
                  sentiment: { type: "number", description: "-1, 0, or 1 (qualitative only)" },
                  confidence: { type: "number", description: "0..1" },
                  raw_snippet: {
                    type: "string",
                    description: "Exact substring of the source supporting the observation.",
                  },
                },
                required: ["signal_id"],
              },
            },
          },
          required: ["observations"],
        } as never,
      },
    },
  };
}
