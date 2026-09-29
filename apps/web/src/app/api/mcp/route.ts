import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { randomUUID } from "node:crypto";
import { buildMcpServer } from "@/lib/agent/mcp-server";
import { resolveMcpToken } from "@/lib/mcp-tokens";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getDb } from "@/db/client";
import { agentRuns } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(reason: string): Response {
  // Advertise the RFC 9728 resource-metadata URL so OAuth-aware MCP clients
  // (claude.ai's Custom Connector) can auto-discover the auth flow.
  const base = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  const resourceMetadata = `${base}/.well-known/oauth-protected-resource/api/mcp`;
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      error: { code: -32001, message: `unauthorized: ${reason}` },
      id: null,
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer realm="fuel-mcp", resource_metadata="${resourceMetadata}"`,
      },
    },
  );
}

async function handle(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization") ?? "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return unauthorized("missing bearer token");

  const token = await resolveMcpToken(m[1].trim());
  if (!token) return unauthorized("invalid token");

  // Resolve the active account for the user. We trust the token's stored
  // accountId, but verify the user is still a member.
  const account = await getActiveAccountForUser(token.userEmail);
  if (!account || account.id !== token.accountId) {
    return unauthorized("account membership changed");
  }

  // One agent_runs row per HTTP request hosts every skill invocation in this
  // request as an audit trail. Best-effort — if the insert fails we fall back
  // to no runId, skipping audit logging rather than failing the call.
  const runId = await openAgentRun(token.accountId, token.userEmail);

  const server = buildMcpServer({
    userEmail: token.userEmail,
    accountId: token.accountId,
    groups: token.groups ?? [],
    runId,
  });

  // Stateless mode — each request gets its own transport. Suitable for Lambda.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

async function openAgentRun(accountId: string, userEmail: string): Promise<string | undefined> {
  try {
    const db = await getDb();
    const id = randomUUID();
    await db.insert(agentRuns).values({
      id,
      accountId,
      userEmail,
      kind: "mcp",
      status: "ok",
    });
    return id;
  } catch {
    return undefined;
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

export async function DELETE(req: Request) {
  return handle(req);
}
