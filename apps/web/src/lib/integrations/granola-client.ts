import "server-only";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface GranolaMeetingSummary {
  id: string;
  title: string | null;
  date: string | null;
  attendees: Array<{ name?: string | null; email?: string | null }>;
  // `enhanced_notes` / summary markdown (paid plan field).
  summary: string | null;
  privateNotes: string | null;
}

export interface GranolaMeetingRef {
  id: string;
  title: string | null;
  date: string | null;
  attendees: Array<{ name?: string | null; email?: string | null }>;
}

/**
 * Connect to Granola's MCP server using the stored bearer token and hand back
 * a short-lived client. Callers are responsible for `close()`ing it.
 */
async function connectClient(accessToken: string): Promise<Client> {
  const url = new URL("https://mcp.granola.ai/mcp");
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  });
  const client = new Client({ name: "fuel-2.0", version: "0.1.0" }, {});
  await client.connect(transport);
  return client;
}

function extractText(toolResult: unknown): string {
  const r = toolResult as { content?: Array<{ type?: string; text?: string }> };
  if (!Array.isArray(r?.content)) return "";
  return r.content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("\n");
}

function tryJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * List the most-recent meetings in the user's Granola account. Granola's MCP
 * tools return text-content blocks; we parse the JSON embedded in them into
 * structured rows. Shape may evolve — be defensive about unknown keys.
 */
export async function listGranolaMeetings(opts: {
  accessToken: string;
  /**
   * Granola's `list_meetings` takes an enum time_range, not a numeric limit.
   * Defaults to "last_30_days" which is the most useful forward cadence.
   */
  timeRange?: "this_week" | "last_week" | "last_30_days" | "custom";
  customStart?: string;
  customEnd?: string;
}): Promise<GranolaMeetingRef[]> {
  const client = await connectClient(opts.accessToken);
  try {
    const args: Record<string, unknown> = { time_range: opts.timeRange ?? "last_30_days" };
    if (args.time_range === "custom") {
      if (opts.customStart) args.custom_start = opts.customStart;
      if (opts.customEnd) args.custom_end = opts.customEnd;
    }
    const res = await client.callTool({
      name: "list_meetings",
      arguments: args,
    });
    const text = extractText(res);
    console.log(
      "[granola-client] list_meetings raw result keys:",
      Object.keys(res as object).join(","),
      "text length:",
      text.length,
      "text preview:",
      text.slice(0, 2000),
    );
    const parsed = tryJson(text);
    const rows = coerceMeetingList(parsed ?? text);
    console.log("[granola-client] list_meetings parsed rows:", rows.length);
    return rows;
  } finally {
    await client.close();
  }
}

export async function getGranolaMeeting(opts: {
  accessToken: string;
  meetingId: string;
}): Promise<GranolaMeetingSummary | null> {
  const batch = await getGranolaMeetings({ accessToken: opts.accessToken, meetingIds: [opts.meetingId] });
  return batch.get(opts.meetingId) ?? null;
}

/**
 * Batched `get_meetings` — Granola accepts up to 10 ids per call and rate
 * limits aggressively, so this is the right default for bulk syncs.
 */
export async function getGranolaMeetings(opts: {
  accessToken: string;
  meetingIds: string[];
}): Promise<Map<string, GranolaMeetingSummary>> {
  const out = new Map<string, GranolaMeetingSummary>();
  if (opts.meetingIds.length === 0) return out;
  const client = await connectClient(opts.accessToken);
  try {
    for (let i = 0; i < opts.meetingIds.length; i += 10) {
      const chunk = opts.meetingIds.slice(i, i + 10);
      const res = await client.callTool({
        name: "get_meetings",
        arguments: { meeting_ids: chunk },
      });
      const text = extractText(res);
      console.log(
        "[granola-client] get_meetings batch",
        chunk.length,
        "text length:",
        text.length,
        "preview:",
        text.slice(0, 400),
      );
      if (/rate limit/i.test(text)) {
        await new Promise((r) => setTimeout(r, 5_000));
        // One retry on rate-limit; skip the batch if it fails again.
        const retry = await client.callTool({
          name: "get_meetings",
          arguments: { meeting_ids: chunk },
        });
        const retryText = extractText(retry);
        if (/rate limit/i.test(retryText)) {
          console.warn("[granola-client] batch still rate-limited, skipping", chunk.length, "meetings");
          continue;
        }
        parseBatchInto(retryText, chunk, out);
      } else {
        parseBatchInto(text, chunk, out);
      }
      // Small gap between batches to stay under Granola's limiter.
      if (i + 10 < opts.meetingIds.length) await new Promise((r) => setTimeout(r, 500));
    }
  } finally {
    await client.close();
  }
  return out;
}

function parseBatchInto(text: string, ids: string[], out: Map<string, GranolaMeetingSummary>): void {
  // The batch response wraps multiple <meeting>…</meeting> blocks in a single
  // <meetings_data>. Walk them and coerce each.
  const re = /<meeting\s+[^>]*id="([^"]+)"[\s\S]*?<\/meeting>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const id = m[1];
    const detail = coerceMeetingDetail(m[0], id);
    if (detail) out.set(id, detail);
  }
  // If the regex missed any (e.g. title contains `>`), fall back to whole-text
  // parse for each id so we still return something.
  for (const id of ids) {
    if (!out.has(id)) {
      const detail = coerceMeetingDetail(text, id);
      if (detail) out.set(id, detail);
    }
  }
}

/**
 * Ad-hoc: call `tools/list` on the MCP so we can inspect what's available and
 * the argument schemas. Handy when the server's tool set / param names drift.
 */
export async function listGranolaTools(accessToken: string): Promise<unknown> {
  const client = await connectClient(accessToken);
  try {
    const res = await client.listTools();
    return res;
  } finally {
    await client.close();
  }
}

function coerceMeetingList(input: unknown): GranolaMeetingRef[] {
  // Granola's MCP returns an XML-ish envelope:
  //   <meetings_data from="..." to="..." count="N">
  //     <meeting id="..." title="..." date="Apr 20, 2026 1:00 PM">
  //       <known_participants>
  //         Name (note creator) from York <mike@york.ie>, Other Name from Co <other@co.com>
  //       </known_participants>
  //     </meeting>
  //     ...
  //   </meetings_data>
  // Parse with targeted regex — well-scoped and tolerant to extra attrs.
  if (typeof input === "string") return parseXmlMeetingList(input);
  // If the server ever switches to JSON, keep a passthrough.
  if (Array.isArray(input)) {
    return input
      .map((r) => (r && typeof r === "object" ? coerceJsonMeetingRef(r as Record<string, unknown>) : null))
      .filter((m): m is GranolaMeetingRef => m !== null);
  }
  return [];
}

function parseXmlMeetingList(xml: string): GranolaMeetingRef[] {
  const out: GranolaMeetingRef[] = [];
  const re = /<meeting\s+([^>]+)>([\s\S]*?)<\/meeting>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = parseAttrs(m[1]);
    const id = attrs.id;
    if (!id) continue;
    const participantsMatch = /<known_participants>([\s\S]*?)<\/known_participants>/.exec(m[2]);
    const attendees = participantsMatch ? parseParticipantsText(participantsMatch[1]) : [];
    out.push({
      id,
      title: attrs.title ?? null,
      date: attrs.date ?? null,
      attendees,
    });
  }
  return out;
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) out[m[1]] = m[2];
  return out;
}

/**
 * Granola encodes participants as a comma-separated string like:
 *   "Mike (note creator) from York <mike@york.ie>, Harshad from York <harshad@york.ie>"
 * MCP may HTML-escape the brackets (`&lt;email&gt;`). Decode before split/match.
 * Emails are always in `<…>`. Name is everything before the " from " or "(…)".
 */
function decodeBasicHtmlEntities(raw: string): string {
  return raw
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function parseParticipantsText(raw: string): Array<{ name?: string | null; email?: string | null }> {
  const text = decodeBasicHtmlEntities(raw).replace(/\s+/g, " ").trim();
  if (!text) return [];
  // Split on commas that are not inside <…>.
  const tokens: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of text) {
    if (ch === "<") depth++;
    else if (ch === ">") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      tokens.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) tokens.push(buf.trim());

  return tokens
    .map((tok) => {
      const emailMatch = /<([^<>\s]+@[^<>\s]+)>/.exec(tok);
      const email = emailMatch ? emailMatch[1] : null;
      let name = tok;
      if (emailMatch) name = tok.replace(emailMatch[0], "").trim();
      // Drop " from Company" suffix and "(note creator)" annotation.
      name = name.replace(/\s+\(note creator\)/i, "");
      name = name.replace(/\s+from\s+[^<,]+$/i, "").trim();
      if (!email && !name) return null;
      return { name: name || null, email };
    })
    .filter((p): p is { name: string | null; email: string | null } => p !== null);
}

function coerceJsonMeetingRef(r: Record<string, unknown>): GranolaMeetingRef | null {
  const id = (r.id ?? r.meeting_id ?? r.uuid) as string | undefined;
  if (!id) return null;
  return {
    id,
    title: (r.title ?? r.name ?? null) as string | null,
    date: (r.date ?? r.started_at ?? r.start_time ?? null) as string | null,
    attendees: normalizeAttendees(r.attendees ?? r.participants),
  };
}

function coerceMeetingDetail(input: unknown, fallbackId: string): GranolaMeetingSummary | null {
  if (!input) return null;
  if (typeof input === "string") {
    return parseXmlMeetingDetail(input, fallbackId);
  }
  if (typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const body = (r.meeting && typeof r.meeting === "object" ? (r.meeting as Record<string, unknown>) : r);
  const id = (body.id ?? body.meeting_id ?? fallbackId) as string;
  return {
    id,
    title: (body.title ?? body.name ?? null) as string | null,
    date: (body.date ?? body.started_at ?? body.start_time ?? null) as string | null,
    attendees: normalizeAttendees(body.attendees ?? body.participants),
    summary:
      (body.enhanced_notes ?? body.summary ?? body.notes ?? null) as string | null,
    privateNotes: (body.private_notes ?? null) as string | null,
  };
}

/**
 * get_meetings returns the XML envelope with richer child tags. Extract title,
 * date, attendees, and the enhanced-notes / summary / transcript blocks if
 * present. Keep it tolerant — we don't know every tag yet so we capture
 * broadly and clean up at render time.
 */
function parseXmlMeetingDetail(xml: string, fallbackId: string): GranolaMeetingSummary {
  const m = /<meeting\s+([^>]+)>([\s\S]*?)<\/meeting>/.exec(xml);
  const attrs = m ? parseAttrs(m[1]) : {};
  const inner = m ? m[2] : xml;
  const participantsMatch = /<known_participants>([\s\S]*?)<\/known_participants>/.exec(inner);
  const attendees = participantsMatch ? parseParticipantsText(participantsMatch[1]) : [];
  // Sum any text-heavy child tags that look like notes. Common candidates:
  // <enhanced_notes>, <notes>, <summary>, <ai_notes>.
  const textBlocks: string[] = [];
  const blockRe = /<(enhanced_notes|ai_notes|notes|summary|content)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let bm: RegExpExecArray | null;
  while ((bm = blockRe.exec(inner)) !== null) {
    const stripped = bm[2].replace(/<[^>]+>/g, "").trim();
    if (stripped) textBlocks.push(`## ${bm[1].replace(/_/g, " ")}\n\n${stripped}`);
  }
  const summary = textBlocks.length > 0 ? textBlocks.join("\n\n") : null;
  return {
    id: attrs.id ?? fallbackId,
    title: attrs.title ?? null,
    date: attrs.date ?? null,
    attendees,
    summary,
    privateNotes: null,
  };
}

function normalizeAttendees(
  raw: unknown,
): Array<{ name?: string | null; email?: string | null }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ name?: string | null; email?: string | null }> = [];
  for (const p of raw) {
    if (typeof p === "string") {
      out.push({ email: p });
      continue;
    }
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    out.push({
      name: (o.name ?? o.displayName ?? null) as string | null,
      email: (o.email ?? null) as string | null,
    });
  }
  return out;
}
