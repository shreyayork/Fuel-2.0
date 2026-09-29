import "server-only";
import {
  DEFAULT_AGENT_DEFAULT_SYSTEM_PROMPT,
} from "@/lib/system-playbooks/defaults";
import { loadSystemPlaybookTemplate } from "@/lib/system-playbooks/load";
import { AGENT_DEFAULT_SYSTEM_SLUG } from "@/lib/system-playbooks/slugs";

const PLAYBOOK_RUN_EXTRAS = `

Playbook-run execution discipline (this run is a structured playbook):
- When you need data, EMIT THE TOOL CALL in the same turn — do NOT write a paragraph saying "Now I'll fetch X" and then stop. Narration without a follow-up tool_use wastes a turn and the user sees the run end mid-thought.
- Batch parallel reads aggressively. For portfolio-scope runs, fan out one call per company in a single turn rather than serializing.
- Lead the final report with a markdown heading (the platform strips any preamble before the first heading when persisting the artifact). Do not pad with "Here is the report" intros.
- The runtime auto-continues if you hit the per-response output cap. Do not write "[truncated]" or "continued in next message" — keep writing as if there is no cap.`;

/** Default agent system prompt from System Playbooks, with optional playbook-run extras. */
export async function loadAgentDefaultSystemPrompt(opts?: {
  kind?: string;
}): Promise<string> {
  const { template } = await loadSystemPlaybookTemplate(
    AGENT_DEFAULT_SYSTEM_SLUG,
    DEFAULT_AGENT_DEFAULT_SYSTEM_PROMPT,
  );
  const extras = opts?.kind === "playbook_run" ? PLAYBOOK_RUN_EXTRAS : "";
  return `${template}${extras}`;
}
