import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/session";
import {
  getWorkspaceTourPrefs,
  updateWorkspaceTourPrefs,
} from "@/lib/user-preferences";
import type { WorkspaceTourPrefs } from "@/lib/workspace-tour/tour-prefs";

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

function parsePatchField(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (value === null) return 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("invalid_field");
  }
  return Math.floor(value);
}

export async function GET(): Promise<Response> {
  const email = await resolveEmail();
  if (email instanceof NextResponse) return email;

  try {
    const prefs = await getWorkspaceTourPrefs(email);
    return NextResponse.json(prefs);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}

/**
 * Partial update of workspace tour prefs. Body:
 * `{ takenAt?: number | null, snoozedUntil?: number | null }`
 * (`null` clears the field to 0). Idempotent upsert.
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
  const patch: Partial<WorkspaceTourPrefs> = {};
  try {
    if ("takenAt" in record) {
      patch.takenAt = parsePatchField(record.takenAt);
    }
    if ("snoozedUntil" in record) {
      patch.snoozedUntil = parsePatchField(record.snoozedUntil);
    }
  } catch {
    return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  }

  if (patch.takenAt === undefined && patch.snoozedUntil === undefined) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }

  try {
    const prefs = await updateWorkspaceTourPrefs(email, patch);
    return NextResponse.json(prefs);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
