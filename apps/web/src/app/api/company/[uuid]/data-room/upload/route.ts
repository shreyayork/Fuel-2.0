import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import {
  assertCompanyDataRoomAccess,
  DataRoomAccessError,
} from "@/lib/data-room/access";
import {
  uploadDataRoomDocument,
  resolveUploadType,
  listDataRoomSnapshot,
} from "@/lib/data-room/queries";
import { DATA_ROOM_MAX_BYTES } from "@/lib/data-room/constants";
import { findDuplicateDocumentType } from "@/lib/data-room/format";
import {
  DocumentParseError,
  generateIntelligenceFromDocument,
  InsufficientCreditsError,
} from "@/lib/intelligence/generate";
import { resolveCompanyName } from "@/lib/intelligence/resolve-company";
import {
  contentTypeForExtension,
  extensionFromFilename,
  parseUploadSource,
  sanitizeFilename,
  validateDataRoomBuffer,
  validateDataRoomFile,
} from "@/lib/data-room/validate-file";
import {
  deleteUploadObject,
  putDataRoomObject,
  UploadsNotConfiguredError,
} from "@/lib/storage/s3";
import { captureIntegrationException } from "@/lib/sentry/capture";
import { CreditGateError, requireCreditAction } from "@/lib/credits/server";
import { getActionCost } from "@/lib/credits/queries";
import { enqueueDocumentInitiativeGeneration } from "@/lib/initiatives/from-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function accessErrorResponse(error: DataRoomAccessError) {
  return NextResponse.json(
    { error: error.code },
    { status: error.code === "not_found" ? 404 : 403 },
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  const { uuid } = await ctx.params;

  const session = await getSession();
  const email =
    session?.email ??
    (process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie");
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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const typeId = String(formData.get("typeId") ?? "").trim();
  const typeLabel = String(formData.get("typeLabel") ?? "").trim();
  const source = parseUploadSource(String(formData.get("source") ?? ""));
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  const resolvedType = resolveUploadType(typeId, typeLabel);
  if (!resolvedType) {
    return NextResponse.json(
      { error: "invalid_document_type" },
      { status: 400 },
    );
  }

  if (resolvedType.typeId.startsWith("custom:")) {
    const duplicate = findDuplicateDocumentType(resolvedType.typeLabel);
    if (duplicate) {
      return NextResponse.json(
        { error: "duplicate_document_type" },
        { status: 400 },
      );
    }
  }

  const clientValidationError = validateDataRoomFile(file);
  if (clientValidationError) {
    const status = clientValidationError === "file_too_large" ? 413 : 400;
    return NextResponse.json(
      {
        error: clientValidationError,
        maxBytes:
          clientValidationError === "file_too_large"
            ? DATA_ROOM_MAX_BYTES
            : undefined,
      },
      { status },
    );
  }

  const ext = extensionFromFilename(file.name);
  const contentType = ext ? contentTypeForExtension(ext) : null;
  if (!contentType) {
    return NextResponse.json(
      { error: "unsupported_file_type" },
      { status: 400 },
    );
  }

  const ab = await file.arrayBuffer();
  const buf = Buffer.from(ab);
  const contentError = ext
    ? validateDataRoomBuffer(buf, ext)
    : "unsupported_file_type";
  if (contentError) {
    return NextResponse.json(
      {
        error: contentError,
        message:
          contentError === "invalid_file_content"
            ? "File content does not match the selected type."
            : undefined,
      },
      { status: 400 },
    );
  }

  const safeFilename = sanitizeFilename(file.name);

  let creditSnapshot;
  try {
    creditSnapshot = await requireCreditAction(account.id, "docUpload", {
      userEmail: email,
    });
  } catch (e) {
    if (e instanceof CreditGateError) {
      const required = await getActionCost("docUpload", e.snapshot.catalogFlow);
      return NextResponse.json(
        {
          error: "insufficient_credits",
          reason: e.reason,
          creditSnapshot: e.snapshot,
          balance:
            e.reason === "insufficient"
              ? Math.max(
                  0,
                  e.snapshot.monthlyLimit +
                    e.snapshot.topUpBalance -
                    e.snapshot.monthlyUsed,
                )
              : undefined,
          required,
        },
        { status: 402 },
      );
    }
    throw e;
  }

  let storageKey: string | undefined;

  try {
    const res = await putDataRoomObject({
      accountId: account.id,
      body: buf,
      filename: safeFilename,
      contentType,
    });
    storageKey = res.storageKey;

    const uploadResult = await uploadDataRoomDocument({
      accountId: account.id,
      companyUuid: uuid,
      typeId: resolvedType.typeId,
      typeLabel: resolvedType.typeLabel,
      filename: safeFilename,
      contentType,
      byteSize: res.byteSize,
      storageKey: res.storageKey,
      uploadedByEmail: email,
      source,
    });

    let snapshot = uploadResult.snapshot;
    let intelligenceIds: string[] = [];
    let initiativesGenerating = false;

    if (source === "data_room") {
      try {
        const companyName = await resolveCompanyName(uuid);
        const generation = await generateIntelligenceFromDocument({
          accountId: account.id,
          companyUuid: uuid,
          companyName,
          authorEmail: email,
          documentVersionId: uploadResult.versionId,
          contextItemId: uploadResult.contextItemId,
          typeId: resolvedType.typeId,
          typeLabel: resolvedType.typeLabel,
          filename: safeFilename,
          storageKey: res.storageKey,
          generationPath: "data_room",
          skipCreditCharge: true,
        });
        intelligenceIds = generation.intelligenceIds;
        snapshot = await listDataRoomSnapshot({
          accountId: account.id,
          companyUuid: uuid,
        });

        if (intelligenceIds.length > 0) {
          try {
            const { generating } = await enqueueDocumentInitiativeGeneration({
              accountId: account.id,
              companyUuid: uuid,
              userEmail: email,
              documentVersionId: uploadResult.versionId,
            });
            initiativesGenerating = generating;
          } catch (initError) {
            captureIntegrationException(initError, {
              integration: "bedrock",
              operation: "enqueue_document_initiatives_after_upload",
              context: { companyUuid: uuid, versionId: uploadResult.versionId },
            });
          }
        }
      } catch (genError) {
        if (genError instanceof InsufficientCreditsError) {
          return NextResponse.json(
            {
              error: "insufficient_credits",
              balance: genError.balance,
              required: genError.required,
              creditSnapshot,
              ...snapshot,
            },
            { status: 402 },
          );
        }
        if (genError instanceof DocumentParseError) {
          return NextResponse.json(
            {
              error: genError.message,
              snapshot,
            },
            { status: 422 },
          );
        }
        captureIntegrationException(genError, {
          integration: "bedrock",
          operation: "data_room_intelligence_generation",
          context: { companyUuid: uuid, versionId: uploadResult.versionId },
        });
        return NextResponse.json(
          {
            error: "intelligence_generation_failed",
            snapshot,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ...snapshot,
      intelligenceIds,
      creditSnapshot,
      initiativesGenerating,
      contextItemId: uploadResult.contextItemId,
      attachmentId: uploadResult.attachmentId,
    });
  } catch (e) {
    if (storageKey) {
      await deleteUploadObject(storageKey);
    }
    if (e instanceof UploadsNotConfiguredError) {
      return NextResponse.json(
        { error: "uploads_not_configured" },
        { status: 503 },
      );
    }
    captureIntegrationException(e, {
      integration: e instanceof UploadsNotConfiguredError ? "s3" : "database",
      operation: "data_room_upload",
      context: { companyUuid: uuid, typeId: resolvedType.typeId, source },
    });
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
