import "server-only";
import { NextResponse } from "next/server";
import { getActiveAccountForUser } from "@/lib/accounts";
import { resolveAuthedEmail } from "@/lib/auth/resolve-authed-email";
import { assertCompanyDataRoomAccess, DataRoomAccessError } from "@/lib/data-room/access";
import { getContextFeedAttachment } from "@/lib/data-room/queries";
import { getSignedUploadObjectUrl, UploadsNotConfiguredError } from "@/lib/storage/s3";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function accessErrorResponse(error: DataRoomAccessError) {
  return NextResponse.json(
    { error: error.code },
    { status: error.code === "not_found" ? 404 : 403 },
  );
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ uuid: string; contextItemId: string; attachmentId: string }> },
): Promise<Response> {
  const { uuid, contextItemId, attachmentId } = await ctx.params;

  const email = await resolveAuthedEmail();
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const account = await getActiveAccountForUser(email);
  if (!account) {
    return NextResponse.json({ error: "no_account" }, { status: 403 });
  }

  try {
    await assertCompanyDataRoomAccess(account, uuid);
  } catch (e) {
    if (e instanceof DataRoomAccessError) return accessErrorResponse(e);
    throw e;
  }

  const match = await getContextFeedAttachment({
    accountId: account.id,
    companyUuid: uuid,
    contextItemId,
    attachmentId,
  });
  if (!match) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const url = await getSignedUploadObjectUrl(match.attachment.storageKey);
    if (req.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ url, filename: match.attachment.filename });
    }
    return NextResponse.redirect(url);
  } catch (e) {
    if (e instanceof UploadsNotConfiguredError) {
      return NextResponse.json({ error: "uploads_not_configured" }, { status: 503 });
    }
    captureIntegrationException(e, {
      integration: "s3",
      operation: "data_room_context_download",
      context: { companyUuid: uuid, contextItemId, attachmentId },
    });
    return NextResponse.json({ error: "download_failed" }, { status: 500 });
  }
}
