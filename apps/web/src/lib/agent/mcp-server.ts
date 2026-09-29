import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/db/client";
import { agentSkillInvocations } from "@/db/schema";
import { listSkills } from "./skills";
import { DEFAULT_SKILL_COST_TOKENS } from "./types";
import type { Skill, SkillContext } from "./types";

/**
 * Build a fresh MCP server instance bound to a specific caller. We construct
 * one per request so the SkillContext stays scoped to the bearer token that
 * authenticated the call (rather than leaking across concurrent requests).
 *
 * `ctx.runId` must be set by the caller (the MCP route creates an `agent_runs`
 * row per HTTP request) — every skill invocation is recorded against it in
 * `agent_skill_invocations` for audit/billing.
 */
export function buildMcpServer(ctx: SkillContext): McpServer {
  const server = new McpServer(
    { name: "fuel-2.0", version: "0.1.0" },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  for (const skill of listSkills()) {
    const shape =
      skill.inputSchema instanceof z.ZodObject
        ? (skill.inputSchema.shape as Record<string, z.ZodTypeAny>)
        : undefined;

    server.registerTool(
      skill.name,
      {
        title: skill.title,
        description: skill.description,
        inputSchema: shape,
        annotations: {
          readOnlyHint: skill.readOnly,
        },
      },
      async (args: unknown) => {
        const parsed = skill.inputSchema.parse(args ?? {});
        const result = await recordInvocation(skill, parsed, ctx);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      },
    );
  }

  return server;
}

/**
 * Executes the skill while writing a row to `agent_skill_invocations`.
 * Records latency, status, and error message. The invocation only rolls up
 * cost on success — failed calls still land a row for auditability but
 * don't bill tokens (matches the runtime.ts convention).
 */
async function recordInvocation<I, O>(
  skill: Skill<I, O>,
  input: I,
  ctx: SkillContext,
): Promise<O> {
  const started = Date.now();
  try {
    const output = await skill.execute(input, ctx);
    if (ctx.runId) {
      void writeInvocation({
        runId: ctx.runId,
        skillName: skill.name,
        input,
        output,
        status: "ok",
        costTokens: skill.costTokens ?? DEFAULT_SKILL_COST_TOKENS,
        latencyMs: Date.now() - started,
      });
    }
    return output;
  } catch (err) {
    if (ctx.runId) {
      void writeInvocation({
        runId: ctx.runId,
        skillName: skill.name,
        input,
        status: "error",
        costTokens: 0,
        latencyMs: Date.now() - started,
        errorMessage: (err as Error).message?.slice(0, 500),
      });
    }
    throw err;
  }
}

async function writeInvocation(opts: {
  runId: string;
  skillName: string;
  input: unknown;
  output?: unknown;
  status: string;
  costTokens: number;
  latencyMs: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(agentSkillInvocations).values({
      id: randomUUID(),
      runId: opts.runId,
      skillName: opts.skillName,
      input: (opts.input ?? {}) as Record<string, unknown>,
      output: (opts.output ?? null) as Record<string, unknown> | null,
      status: opts.status,
      costTokens: opts.costTokens,
      latencyMs: opts.latencyMs,
      errorMessage: opts.errorMessage,
    });
  } catch {
    // Audit write is best-effort — never fail the skill call because we
    // couldn't log it.
  }
}
