import { NextResponse } from "next/server";
import { registerClient, type RegisterClientInput } from "@/lib/mcp-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RFC 7591 Dynamic Client Registration. Open registration — any caller can
 * create a client. PKCE protects the actual auth flow against interception,
 * and the issued client_id/secret only help that specific client back to
 * us via /token (still gated by the user-facing /authorize consent).
 */
export async function POST(req: Request) {
  let body: RegisterClientInput;
  try {
    body = (await req.json()) as RegisterClientInput;
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }
  try {
    const reg = await registerClient(body);
    return NextResponse.json(reg, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: (e as Error).message?.slice(0, 200) },
      { status: 400 },
    );
  }
}
