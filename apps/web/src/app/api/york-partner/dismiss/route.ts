import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";
import {
  dismissYorkPartnerOffer,
  getYorkPartnerDismissMap,
  mergeYorkPartnerDismissMap,
} from "@/lib/user-preferences";
import { isYorkOfferId } from "@/lib/york-partner/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveEmail(): Promise<string | NextResponse> {
  const session = await getSession();
  const email =
    session?.email ??
    (process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie");
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return email;
}

export async function GET(): Promise<Response> {
  const email = await resolveEmail();
  if (email instanceof NextResponse) return email;

  try {
    const map = await getYorkPartnerDismissMap(email);
    return NextResponse.json(map);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}

/**
 * Persist dismiss. Body is either
 * `{ offerId, mode: "hide" | "forever" }` or `{ merge: { [offerId]: entry } }`.
 */
export async function PATCH(req: NextRequest): Promise<Response> {
  const email = await resolveEmail();
  if (email instanceof NextResponse) return email;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof body !== "object" || body == null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;

  try {
    if ("merge" in record) {
      const map = await mergeYorkPartnerDismissMap(email, record.merge);
      return NextResponse.json(map);
    }

    const offerId =
      typeof record.offerId === "string" ? record.offerId.trim() : "";
    const mode = record.mode;
    if (!isYorkOfferId(offerId) || (mode !== "hide" && mode !== "forever")) {
      return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
    }

    const map = await dismissYorkPartnerOffer({ userEmail: email, offerId, mode });
    return NextResponse.json(map);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
