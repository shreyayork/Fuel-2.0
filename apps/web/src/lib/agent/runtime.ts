import "server-only";
import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
  type ContentBlock,
  type Message,
  type Tool,
  type ToolResultBlock,
  type ToolUseBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/db/client";
import { agentRuns, agentSkillInvocations } from "@/db/schema";
import { createArtifact, type ArtifactSubject } from "@/lib/artifacts";
import { listSkills, getSkill } from "./skills";
import type { Skill, SkillContext } from "./types";
import { DEFAULT_SKILL_COST_TOKENS } from "./types";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { refundCreditAction } from "@/lib/credits/queries";
import { looksLikePitchDeckClarification } from "@/lib/playbooks/pitch-deck-evaluation";
import { looksLikeKpiClarification } from "@/lib/playbooks/kpi-benchmark";

const MODEL_ID =
  process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-sonnet-4-6";
// Bedrock turns the agent can take in a single run. A "turn" is one
// Converse call — it ends with either a tool_use stop (we execute the tools
// and loop) or a max_tokens stop (we auto-continue, see MAX_AUTO_CONTINUES).
// 16 is sized for portfolio-scope playbook runs that fan out parallel reads
// across 60–100 companies in 4–6 batches before synthesizing — the prior
// cap of 8 cut off mid-fetch on the Five Elms VCR run.
const MAX_TOOL_TURNS = 16;
// When the model hits the per-response output cap mid-generation
// (stopReason === "max_tokens"), automatically prompt it to resume instead
// of stopping the run. 6 × 16k = up to ~96k tokens of continuous synthesis
// for long structured artifacts (multi-section portfolio reports). Without
// this, the user had to manually type "continue" repeatedly, and each
// retry re-ran every tool call because the drawer strips tool_use/result
// blocks from replay history.
const MAX_AUTO_CONTINUES = 6;

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

/**
 * Shape emitted to the UI via the streaming response. The drawer consumes
 * these as NDJSON lines — each line is one event.
 */
export type AgentEvent =
  | { type: "start"; runId: string; model: string }
  | { type: "text-delta"; delta: string }
  | { type: "tool-call-start"; id: string; name: string; input?: unknown }
  | {
      type: "tool-call-end";
      id: string;
      output?: unknown;
      error?: string;
      latencyMs: number;
    }
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
  /** Persistence failed after a successful run — distinct from run `error`. */
  | { type: "artifact-error"; message: string }
  | { type: "error"; message: string }
  | {
      type: "done";
      inputTokens?: number;
      outputTokens?: number;
      latencyMs: number;
    };

/**
 * Converts a Zod object schema into the JSON Schema shape Bedrock expects for
 * tool definitions (matching the Anthropic tool-use spec).
 */
/**
 * Normalize an input object for tool-call memoization so variants like
 * `eulerapp` vs `euler-app` on a Crunchbase slug, or `https://Acme.io/`
 * vs `acme.io`, collapse to the same cache key. Applied to every string
 * field — safe because the scrapers themselves normalize their inputs
 * before hitting the wire, so treating these as equivalent at the cache
 * layer matches reality.
 */
function canonicalizeInput(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return canonicalizeStringish(input);
  if (Array.isArray(input)) return input.map(canonicalizeInput);
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = canonicalizeInput(v);
    }
    return out;
  }
  return input;
}

function canonicalizeStringish(s: string): string {
  // Trim + lowercase + strip protocol + strip www. + strip trailing
  // slash. Also strip hyphens on slug-shaped strings so `euler-app`
  // and `eulerapp` cache-collide. Leave spaces inside free-text
  // queries intact (we only strip hyphens from single-token slugs).
  let out = s.trim().toLowerCase();
  if (!out) return out;
  out = out.replace(/^https?:\/\//, "").replace(/^www\./, "");
  out = out.replace(/\/+$/, "");
  // Single-token slug (no spaces, no dots, no slashes) → drop hyphens
  // so `euler-app` ≡ `eulerapp`. Leave hyphens in URLs / paths /
  // multi-word text alone.
  if (!/[\s./]/.test(out)) {
    out = out.replace(/-/g, "");
  }
  return out;
}

function skillToToolSpec(skill: Skill): Tool {
  const shape =
    skill.inputSchema instanceof z.ZodObject
      ? (skill.inputSchema.shape as Record<string, z.ZodTypeAny>)
      : {};

  const properties: Record<string, { type: string; description?: string }> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    const unwrap = (v: z.ZodTypeAny): z.ZodTypeAny =>
      v instanceof z.ZodOptional || v instanceof z.ZodDefault
        ? unwrap(v._def.innerType)
        : v;
    const base = unwrap(value);
    let type = "string";
    if (base instanceof z.ZodNumber) type = "number";
    else if (base instanceof z.ZodBoolean) type = "boolean";
    else if (base instanceof z.ZodArray) type = "array";
    properties[key] = { type, description: value.description };
    if (!(value instanceof z.ZodOptional || value instanceof z.ZodDefault)) {
      required.push(key);
    }
  }

  const jsonSchema: Record<string, unknown> = {
    type: "object",
    properties,
  };
  if (required.length > 0) jsonSchema.required = required;
  return {
    toolSpec: {
      name: skill.name,
      description: `${skill.title}. ${skill.description}`,
      inputSchema: {
        json: jsonSchema as never,
      },
    },
  };
}

export interface AgentRunInput {
  userEmail: string;
  accountId: string;
  kind: string;
  /**
   * Stable id minted by the HTTP route before credit charge so the debit
   * `referenceId` matches `agent_runs.id` (and any refund). Optional for
   * non-HTTP callers — falls back to a fresh UUID.
   */
  runId?: string;
  subjectCompanyUuid?: string;
  subjectCompanyName?: string;
  /** Portfolio / watchlist name when the run's subject is a list, not a
   *  single company. Surfaces in the artifact title. */
  subjectPortfolioName?: string;
  /** Portfolio / watchlist id — persisted as a `portfolio` artifact subject.
   *  Company Research lists only `company` subjects; portfolio runs stay
   *  portfolio-scoped on purpose (no per-member fan-out). */
  subjectPortfolioId?: string;
  /** Display title of the playbook that initiated this run, if any. Used to
   *  title the persisted artifact with something meaningful ("Value Creation
   *  Report — Seed Fund — Apr 24") instead of the generic "Playbook Run". */
  playbookTitle?: string;
  systemPrompt: string;
  userPrompt: string;
  /**
   * Prior conversation, alternating user/assistant. We strip intermediate
   * tool_use/tool_result blocks for continuity — the assistant keeps only its
   * final synthesized text per prior turn. The model can re-invoke tools as
   * needed on the follow-up.
   */
  history?: Array<{ role: "user" | "assistant"; text: string }>;
  /**
   * If set, persist the final output as an artifact of this kind tied to the
   * run's subject(s). One of the registered kinds in `ARTIFACT_KINDS`.
   */
  artifactKind?: string;
}

export async function* runAgentStream(
  input: AgentRunInput,
): AsyncGenerator<AgentEvent, void, unknown> {
  const runId = input.runId ?? randomUUID();
  const startedAt = Date.now();
  const db = await getDb();

  await db.insert(agentRuns).values({
    id: runId,
    accountId: input.accountId,
    userEmail: input.userEmail,
    kind: input.kind,
    subjectCompanyUuid: input.subjectCompanyUuid ?? null,
    prompt: input.userPrompt,
    model: MODEL_ID,
    status: "running",
  });

  yield { type: "start", runId, model: MODEL_ID };

  const ctx: SkillContext = {
    userEmail: input.userEmail,
    accountId: input.accountId,
    runId,
  };
  const tools: Tool[] = listSkills().map(skillToToolSpec);

  const messages: Message[] = [];
  if (input.history) {
    for (const turn of input.history) {
      if (!turn.text.trim()) continue;
      messages.push({
        role: turn.role,
        content: [{ text: turn.text }],
      });
    }
  }
  messages.push({ role: "user", content: [{ text: input.userPrompt }] });

  let turn = 0;
  let autoContinues = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let aggregatedOutput = "";
  let toolCostTokens = 0;
  let lastError: string | undefined;

  // Within-run tool-call memoization. The agent under a playbook can
  // ask the same skill with the same (or near-same) inputs multiple
  // times — observed on a Thesis Fit Screen run where Claude called
  // scrapeCrunchbaseCompany twice (`eulerapp` + `euler-app`) and
  // scrapeLinkedInCompany twice (`eulerapp` + `euler-app`) for the
  // same subject. That's slot wastage + real dollars per paid scrape.
  //
  // Key: the skill name + a canonicalized input blob. Canonicalization
  // strips hyphens / case / trailing slashes on URL-shaped inputs so
  // slug variants collapse into the same cache entry. Skills that need
  // finer-grained caching keys can override this later via a custom
  // canonicalizer — for now the URL-shaped heuristic handles the
  // paid-scrape skills which are the only real cost leak.
  const callCache = new Map<string, unknown>();
  const cacheKeyFor = (skillName: string, input: unknown): string => {
    const canonical = canonicalizeInput(input);
    return `${skillName}|${JSON.stringify(canonical, Object.keys(canonical ?? {}).sort())}`;
  };

  try {
    while (turn < MAX_TOOL_TURNS) {
      turn += 1;

      // Playbook runs emit long structured artifacts (portfolio roll-ups, deep
      // diligence reports) that routinely blow past the default 4096-token
      // cap — the last page of the April 2026 Seed Fund VCR got clipped
      // mid-sentence. 16k is well within Claude 4's output ceiling and Bedrock
      // charges per output token anyway, so allocating more here is free when
      // unused.
      const maxTokens = input.kind === "playbook_run" ? 16_000 : 4_096;
      const stream = await bedrock.send(
        new ConverseStreamCommand({
          modelId: MODEL_ID,
          system: [{ text: input.systemPrompt }],
          messages,
          toolConfig: { tools },
          inferenceConfig: { maxTokens },
        }),
      );

      // Reassemble assistant message while streaming to the client. Each
      // contentBlockStart opens a new index; each contentBlockDelta accretes
      // into that index; contentBlockStop finalizes it.
      interface OpenBlock {
        kind: "text" | "toolUse";
        text?: string;
        toolUseId?: string;
        toolName?: string;
        toolInputJson?: string;
      }
      const openBlocks = new Map<number, OpenBlock>();
      const assistantContent: ContentBlock[] = [];
      let stopReason: string | undefined;

      for await (const chunk of stream.stream ?? []) {
        if (chunk.contentBlockStart?.start) {
          const idx = chunk.contentBlockStart.contentBlockIndex ?? 0;
          const start = chunk.contentBlockStart.start;
          if ("toolUse" in start && start.toolUse) {
            openBlocks.set(idx, {
              kind: "toolUse",
              toolUseId: start.toolUse.toolUseId,
              toolName: start.toolUse.name,
              toolInputJson: "",
            });
          }
        } else if (chunk.contentBlockDelta?.delta) {
          const idx = chunk.contentBlockDelta.contentBlockIndex ?? 0;
          const delta = chunk.contentBlockDelta.delta;
          let b = openBlocks.get(idx);
          if (!b) {
            b = { kind: "text", text: "" };
            openBlocks.set(idx, b);
          }
          if ("text" in delta && delta.text) {
            b.kind = "text";
            b.text = (b.text ?? "") + delta.text;
            aggregatedOutput += delta.text;
            yield { type: "text-delta", delta: delta.text };
          } else if ("toolUse" in delta && delta.toolUse?.input) {
            b.toolInputJson = (b.toolInputJson ?? "") + delta.toolUse.input;
          }
        } else if (chunk.contentBlockStop) {
          const idx = chunk.contentBlockStop.contentBlockIndex ?? 0;
          const b = openBlocks.get(idx);
          if (!b) continue;
          if (b.kind === "text" && b.text) {
            assistantContent.push({ text: b.text });
          } else if (b.kind === "toolUse" && b.toolUseId && b.toolName) {
            let parsedInput: unknown = {};
            try {
              parsedInput = b.toolInputJson ? JSON.parse(b.toolInputJson) : {};
            } catch {
              parsedInput = {};
            }
            assistantContent.push({
              toolUse: {
                toolUseId: b.toolUseId,
                name: b.toolName,
                input: parsedInput as never,
              },
            });
          }
          openBlocks.delete(idx);
        } else if (chunk.messageStop) {
          stopReason = chunk.messageStop.stopReason;
        } else if (chunk.metadata?.usage) {
          totalInput += chunk.metadata.usage.inputTokens ?? 0;
          totalOutput += chunk.metadata.usage.outputTokens ?? 0;
        }
      }

      // Append the assistant turn to the conversation.
      messages.push({ role: "assistant", content: assistantContent });

      // Auto-continue on max_tokens: the model hit the per-response output
      // cap mid-synthesis. Push a "resume" user message and loop so the
      // single run keeps streaming until the model's own end_turn or our
      // MAX_AUTO_CONTINUES cap. Without this branch the run terminates
      // mid-sentence and forces the user to manually type "continue",
      // which the drawer replays as a new run that drops tool_use/result
      // blocks — so every tool call gets re-executed for nothing.
      if (stopReason === "max_tokens") {
        if (autoContinues >= MAX_AUTO_CONTINUES) break;
        autoContinues += 1;
        messages.push({
          role: "user",
          content: [
            {
              text:
                "You hit the per-response output cap mid-generation. " +
                "Continue from exactly where you stopped — do NOT repeat " +
                "any heading, bullet, table row, or sentence you already " +
                "wrote. Pick up mid-token if needed.",
            },
          ],
        });
        // Don't burn a tool turn — auto-continues don't count against
        // MAX_TOOL_TURNS. Decrement to keep the tool budget intact.
        turn -= 1;
        continue;
      }

      if (stopReason !== "tool_use") break;

      // Execute every tool call in this turn, append results, loop.
      const toolUses = assistantContent
        .filter(
          (b): b is ContentBlock & { toolUse: ToolUseBlock } =>
            "toolUse" in b && !!b.toolUse,
        )
        .map((b) => b.toolUse);
      const resultBlocks: ContentBlock[] = [];

      for (const use of toolUses) {
        yield {
          type: "tool-call-start",
          id: use.toolUseId!,
          name: use.name!,
          input: use.input,
        };
        const skill = getSkill(use.name!);
        const started = Date.now();
        if (!skill) {
          const err = `unknown skill: ${use.name}`;
          yield {
            type: "tool-call-end",
            id: use.toolUseId!,
            error: err,
            latencyMs: 0,
          };
          resultBlocks.push({
            toolResult: {
              toolUseId: use.toolUseId!,
              content: [{ text: err }],
              status: "error",
            } as ToolResultBlock,
          });
          continue;
        }
        try {
          const parsed = skill.inputSchema.parse(use.input ?? {});
          const cacheKey = cacheKeyFor(skill.name, parsed);
          const cachedOutput = callCache.get(cacheKey);
          let output: unknown;
          let latency: number;
          let fromCache = false;
          if (cachedOutput !== undefined) {
            // Tool-call dedupe: same skill + canonicalized input already
            // ran this turn. Return the prior result without re-executing
            // and without re-charging cost tokens. The agent still sees
            // a normal tool_result so it can proceed.
            output = cachedOutput;
            latency = 0;
            fromCache = true;
          } else {
            output = await skill.execute(parsed, ctx);
            latency = Date.now() - started;
            callCache.set(cacheKey, output);
            const cost = skill.costTokens ?? DEFAULT_SKILL_COST_TOKENS;
            toolCostTokens += cost;
            await db.insert(agentSkillInvocations).values({
              id: randomUUID(),
              runId,
              skillName: skill.name,
              input: (use.input as Record<string, unknown>) ?? null,
              output: output as Record<string, unknown>,
              status: "ok",
              costTokens: cost,
              latencyMs: latency,
            });
          }
          yield {
            type: "tool-call-end",
            id: use.toolUseId!,
            output: fromCache
              ? { ...(output as object), _cached: true }
              : output,
            latencyMs: latency,
          };
          resultBlocks.push({
            toolResult: {
              toolUseId: use.toolUseId!,
              content: [
                {
                  text: fromCache
                    ? `(cached from prior call this turn — same canonical inputs)\n${JSON.stringify(output)}`
                    : JSON.stringify(output),
                },
              ],
            } as ToolResultBlock,
          });
        } catch (e) {
          const latency = Date.now() - started;
          const msg = (e as Error).message?.slice(0, 500) ?? "tool failed";
          captureIntegrationException(e, {
            integration: "agent",
            operation: "skill_invoke",
            level: "warning",
            context: { runId, skillName: skill.name },
          });
          await db.insert(agentSkillInvocations).values({
            id: randomUUID(),
            runId,
            skillName: skill.name,
            input: (use.input as Record<string, unknown>) ?? null,
            status: "error",
            errorMessage: msg,
            latencyMs: latency,
          });
          yield {
            type: "tool-call-end",
            id: use.toolUseId!,
            error: msg,
            latencyMs: latency,
          };
          resultBlocks.push({
            toolResult: {
              toolUseId: use.toolUseId!,
              content: [{ text: msg }],
              status: "error",
            } as ToolResultBlock,
          });
        }
      }

      messages.push({ role: "user", content: resultBlocks });
    }
  } catch (e) {
    captureIntegrationException(e, {
      integration: "agent",
      operation: "agent_run",
      context: { runId },
    });
    lastError = (e as Error).message;
    yield { type: "error", message: lastError };
  }

  const latencyMs = Date.now() - startedAt;
  const runCostTokens = totalInput + totalOutput + toolCostTokens;
  await db
    .update(agentRuns)
    .set({
      output: aggregatedOutput,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      costTokens: runCostTokens,
      latencyMs,
      status: lastError ? "error" : "ok",
      errorMessage: lastError ?? null,
      completedAt: sql`now()`,
    })
    .where(eq(agentRuns.id, runId));

  // Failed playbook runs refund the pre-charge (F20A-231). aiChat unchanged.
  if (lastError && input.kind === "playbook_run") {
    try {
      await refundCreditAction({
        accountId: input.accountId,
        referenceId: runId,
        action: "playbookRun",
        userEmail: input.userEmail,
      });
    } catch (e) {
      captureIntegrationException(e, {
        integration: "credits",
        operation: "refund_playbook_run",
        context: { runId, accountId: input.accountId },
      });
    }
  }

  // If this run is meant to produce a persisted artifact (e.g. intelligence
  // brief) and finished successfully, save the final markdown with a proper
  // title + typed subjects for later retrieval on the company page.
  // Intentional skips (do not treat as bugs):
  //   - Clarification / gate replies (pitch-deck / KPI) → skipIncompleteArtifact
  //   - Failed runs (`lastError`) → no artifact; credits refunded separately
  //   - Empty output → no artifact
  const skipIncompleteArtifact =
    input.kind === "playbook_run" &&
    (looksLikePitchDeckClarification(aggregatedOutput) ||
      looksLikeKpiClarification(aggregatedOutput));

  if (
    input.artifactKind &&
    aggregatedOutput.trim().length > 0 &&
    !lastError &&
    !skipIncompleteArtifact
  ) {
    const subjects: ArtifactSubject[] = [];
    if (input.subjectCompanyUuid) {
      subjects.push({
        type: "company",
        uuid: input.subjectCompanyUuid,
        name: input.subjectCompanyName,
      });
    }
    // Portfolio runs: tag portfolio subject only — do NOT fan out to every
    // member company. `listArtifactsForCompany` matches company subjects, so
    // portfolio artifacts intentionally stay off single-company Research;
    // the drawer still links to `/artifacts/:id`.
    if (input.subjectPortfolioId) {
      subjects.push({
        type: "portfolio",
        id: input.subjectPortfolioId,
        name: input.subjectPortfolioName,
      });
    }
    const title = composeArtifactTitle(input);
    // Strip the drawer-only preamble ("Now I'll fetch…") from the persisted
    // body so the stored artifact reads like a clean report. Only applied to
    // playbook runs; chat briefs / quick comparisons don't have a consistent
    // "lead with a heading" convention.
    const persistedContent =
      input.kind === "playbook_run"
        ? trimPreamble(aggregatedOutput)
        : aggregatedOutput;
    try {
      const created = await createArtifact({
        accountId: input.accountId,
        kind: input.artifactKind,
        title,
        content: persistedContent,
        subjects,
        agentRunId: runId,
        authorEmail: input.userEmail,
      });
      yield {
        type: "artifact",
        id: created.id,
        kind: created.kind,
        title: created.title,
        content: persistedContent,
        authorEmail: input.userEmail,
        createdAt: created.createdAt.toISOString(),
        subjectCompanyUuid: input.subjectCompanyUuid,
      };
    } catch (error) {
      captureIntegrationException(error, {
        integration: "agent",
        operation: "create_artifact",
        context: {
          runId,
          accountId: input.accountId,
          artifactKind: input.artifactKind,
          subjectCompanyUuid: input.subjectCompanyUuid ?? null,
          subjectPortfolioId: input.subjectPortfolioId ?? null,
          playbookTitle: input.playbookTitle ?? null,
        },
      });
      yield {
        type: "artifact-error",
        message:
          "Run finished, but the Research artifact could not be saved. Try running again.",
      };
    }
  }

  yield {
    type: "done",
    inputTokens: totalInput,
    outputTokens: totalOutput,
    latencyMs,
  };
}

function composeArtifactTitle(input: AgentRunInput): string {
  const subject =
    input.subjectPortfolioName ?? input.subjectCompanyName ?? "Untitled";
  // Prefer the actual playbook title over the generic "Playbook Run" label
  // when we know which playbook ran. Falls back to the kind label for chat
  // briefs / diligence / comparisons that weren't started from the picker.
  const label =
    input.playbookTitle?.trim() ||
    titleForKind(input.artifactKind ?? "artifact");
  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${label} — ${subject} — ${date}`;
}

/**
 * Trim the model's conversational preamble before persisting the artifact.
 * Playbook runs are instructed to lead with a markdown heading; anything the
 * model emits before that first heading is narration intended for the drawer
 * only ("I'll run this in portfolio mode. Now fetching…") and shouldn't
 * pollute the stored report. If no heading is found (chat brief, short
 * comparisons), leave the content untouched.
 */
function trimPreamble(content: string): string {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    if (/^#{1,6}\s+\S/.test(lines[i])) {
      return lines.slice(i).join("\n");
    }
  }
  return content;
}

function titleForKind(kind: string): string {
  switch (kind) {
    case "intelligence_brief":
      return "Intelligence Brief";
    case "diligence_report":
      return "Diligence Report";
    case "meeting_summary":
      return "Meeting Summary";
    case "comparison":
      return "Comparison";
    case "playbook_run":
      return "Playbook Run";
    default:
      return kind;
  }
}
