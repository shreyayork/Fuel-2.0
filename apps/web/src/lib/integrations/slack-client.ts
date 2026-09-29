import "server-only";
import { getIntegration } from "../integrations";

interface SlackOk {
  ok: true;
  [k: string]: unknown;
}

interface SlackErr {
  ok: false;
  error: string;
  [k: string]: unknown;
}

type SlackResponse<T> = (SlackOk & T) | SlackErr;

export class SlackClient {
  constructor(private accessToken: string) {}

  static async forAccount(accountId: string): Promise<SlackClient | null> {
    const conn = await getIntegration({ accountId, provider: "slack" });
    if (!conn) return null;
    const token = (conn.credentials as { accessToken?: string } | null)?.accessToken;
    if (!token) return null;
    return new SlackClient(token);
  }

  async call<T extends Record<string, unknown>>(
    method: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const body = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) body.set(k, String(v));
      }
    }
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) throw new Error(`slack ${method} http ${res.status}`);
    const json = (await res.json()) as SlackResponse<T>;
    if (!json.ok) throw new Error(`slack ${method}: ${json.error}`);
    return json as unknown as T;
  }
}

export interface SlackConversation {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_member: boolean;
  num_members?: number;
}

/**
 * List conversations visible to the bot. Public channels are always visible;
 * private channels require the bot to have been invited. Paginated — we
 * page through until `next_cursor` is empty (bounded to 10 pages to avoid
 * runaway).
 */
export async function listConversations(
  client: SlackClient,
  opts?: { types?: string },
): Promise<SlackConversation[]> {
  const out: SlackConversation[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 10; i++) {
    const page = await client.call<{
      channels: SlackConversation[];
      response_metadata?: { next_cursor?: string };
    }>("conversations.list", {
      types: opts?.types ?? "public_channel,private_channel",
      exclude_archived: true,
      limit: 200,
      cursor,
    });
    out.push(...page.channels);
    cursor = page.response_metadata?.next_cursor;
    if (!cursor) break;
  }
  return out;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    email?: string;
    display_name?: string;
    real_name?: string;
  };
}

export async function getUser(client: SlackClient, userId: string): Promise<SlackUser | null> {
  try {
    const res = await client.call<{ user: SlackUser }>("users.info", { user: userId });
    return res.user;
  } catch {
    return null;
  }
}
