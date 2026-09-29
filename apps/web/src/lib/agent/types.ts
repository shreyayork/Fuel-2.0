import "server-only";
import { z } from "zod";

/**
 * A Skill is a typed function that agents or MCP clients can invoke. Each
 * skill has a stable name, a Zod input schema (converted to JSON Schema for
 * Anthropic tool-use and MCP tool listings), and an async execute().
 *
 * Skills run server-side with the caller's identity available in SkillContext.
 * They must not mutate data they don't own (writes that affect another
 * account's data are a bug — ALWAYS filter by ctx.accountId).
 */
export interface SkillContext {
  userEmail: string;
  accountId: string;
  // Cognito groups snapshotted on the token or read from the session.
  // Used for authorization checks in skill guards (e.g. super-admin).
  groups?: string[];
  // Optional agent-run id so skills can attach audit trails.
  runId?: string;
}

export interface Skill<I = unknown, O = unknown> {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodType<I, z.ZodTypeDef, unknown>;
  // `readOnly` lets the MCP server advertise which tools are safe to expose
  // without elevated permissions.
  readOnly: boolean;
  // Billable unit cost per successful invocation — same unit as model
  // tokens. Tiering guide:
  //   1_000   internal read  (Postgres / OpenSearch query)
  //   2_000   internal write | free external API (GitHub, SEC, USPTO)
  //   5_000   paid bulk scrape (Bright Data LinkedIn/Crunchbase)
  //  15_000   expensive multi-page or JS-rendered scrape
  //  50_000+  premium synthesis or bulk enrichment
  // This charges the *account* regardless of cache hit — the actual provider
  // cost is separately recorded on enrichment_cache.cost_tokens (only on miss).
  costTokens?: number;
  execute: (input: I, ctx: SkillContext) => Promise<O>;
}

/** Fallback cost when a skill doesn't declare its own. Middle-of-the-road
 *  default encourages skill authors to set an explicit value. */
export const DEFAULT_SKILL_COST_TOKENS = 2_000;

export type SkillRegistry = Record<string, Skill>;
