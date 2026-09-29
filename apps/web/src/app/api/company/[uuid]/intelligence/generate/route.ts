import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { assertCompanyDataRoomAccess, DataRoomAccessError } from "@/lib/data-room/access";
import {
  DATA_ROOM_MAX_BYTES,
} from "@/lib/data-room/constants";
import {
  uploadDataRoomDocument,
  resolveUploadType,
  listDataRoomSnapshot,
} from "@/lib/data-room/queries";
import { findDuplicateDocumentType } from "@/lib/data-room/format";
import {
  contentTypeForExtension,
  extensionFromFilename,
  sanitizeFilename,
  validateDataRoomBuffer,
  validateDataRoomFile,
} from "@/lib/data-room/validate-file";
import {
  deleteUploadObject,
  putDataRoomObject,
  UploadsNotConfiguredError,
} from "@/lib/storage/s3";
import {
  DocumentParseError,
  generateIntelligenceFromSource,
  InsufficientCreditsError,
} from "@/lib/intelligence/generate";
import { resolveCompanyName } from "@/lib/intelligence/resolve-company";
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

  const notes = String(formData.get("notes") ?? "").trim();
  const typeId = String(formData.get("typeId") ?? "custom").trim();
  const typeLabel = String(formData.get("typeLabel") ?? "").trim();
  const file = formData.get("file");
  const hasFile = file instanceof File;

  let title = String(formData.get("title") ?? "").trim();
  if (!title && hasFile) {
    title = file.name.replace(/\.[^.]+$/, "") || file.name;
  }

  if (!title) {
    return NextResponse.json({ error: "title_required" }, { status: 400 });
  }
  // Document path: notes optional. Notes-only path: description required.
  if (!notes && !hasFile) {
    return NextResponse.json({ error: "notes_or_file_required" }, { status: 400 });
  }

  const companyName = await resolveCompanyName(uuid);

  let creditSnapshot;
  try {
    creditSnapshot = await requireCreditAction(account.id, "generateSource", {
      userEmail: email,
    });
  } catch (e) {
    if (e instanceof CreditGateError) {
      const required = await getActionCost("generateSource", e.snapshot.catalogFlow);
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

  let documentVersionId: string | undefined;
  let contextItemId: string | undefined;
  let storageKey: string | undefined;
  let filename: string | undefined;

  try {
    if (file instanceof File) {
      const clientValidationError = validateDataRoomFile(file);
      if (clientValidationError) {
        const status = clientValidationError === "file_too_large" ? 413 : 400;
        return NextResponse.json({ error: clientValidationError }, { status });
      }

      const ext = extensionFromFilename(file.name);
      const contentType = ext ? contentTypeForExtension(ext) : null;
      if (!contentType) {
        return NextResponse.json({ error: "unsupported_file_type" }, { status: 400 });
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const contentError = ext ? validateDataRoomBuffer(buf, ext) : "unsupported_file_type";
      if (contentError) {
        return NextResponse.json({ error: contentError }, { status: 400 });
      }

      const resolvedType = resolveUploadType(typeId, typeLabel);
      if (!resolvedType) {
        return NextResponse.json({ error: "invalid_document_type" }, { status: 400 });
      }

      if (resolvedType.typeId.startsWith("custom:")) {
        const duplicate = findDuplicateDocumentType(resolvedType.typeLabel);
        if (duplicate) {
          return NextResponse.json({ error: "duplicate_document_type" }, { status: 400 });
        }
      }

      const safeFilename = sanitizeFilename(file.name);
      const res = await putDataRoomObject({
        accountId: account.id,
        body: buf,
        filename: safeFilename,
        contentType,
      });
      storageKey = res.storageKey;
      filename = safeFilename;

      const uploadResult = await uploadDataRoomDocument({
        accountId: account.id,
        companyUuid: uuid,
        typeId: resolvedType.typeId,
        typeLabel: resolvedType.typeLabel,
        title,
        filename: safeFilename,
        contentType,
        byteSize: res.byteSize,
        storageKey: res.storageKey,
        uploadedByEmail: email,
        source: "intelligence",
      });

      documentVersionId = uploadResult.versionId;
      contextItemId = uploadResult.contextItemId;
    }

    const generation = await generateIntelligenceFromSource({
      accountId: account.id,
      companyUuid: uuid,
      companyName,
      authorEmail: email,
      title,
      notes,
      documentVersionId,
      contextItemId,
      typeId: typeId.startsWith("custom") ? typeId : typeId,
      typeLabel: typeLabel || title,
      filename,
      storageKey,
      skipCreditCharge: true,
    });

    const dataRoom = documentVersionId
      ? await listDataRoomSnapshot({ accountId: account.id, companyUuid: uuid })
      : undefined;

    let initiativesGenerating = false;
    if (generation.intelligenceIds.length > 0 && documentVersionId) {
      try {
        const { generating } = await enqueueDocumentInitiativeGeneration({
          accountId: account.id,
          companyUuid: uuid,
          userEmail: email,
          documentVersionId,
        });
        initiativesGenerating = generating;
      } catch (initError) {
        captureIntegrationException(initError, {
          integration: "bedrock",
          operation: "enqueue_document_initiatives_after_generate",
          context: {
            companyUuid: uuid,
            documentVersionId: documentVersionId ?? null,
          },
        });
      }
    }

    return NextResponse.json({
      intelligenceIds: generation.intelligenceIds,
      creditsCharged: generation.creditsCharged,
      creditSnapshot,
      dataRoom,
      initiativesGenerating,
    });
  } catch (e) {
    if (storageKey) {
      await deleteUploadObject(storageKey);
    }
    if (e instanceof CreditGateError) {
      const required = await getActionCost("generateSource", e.snapshot.catalogFlow);
      return NextResponse.json(
        {
          error: "insufficient_credits",
          reason: e.reason,
          creditSnapshot: e.snapshot,
          required,
        },
        { status: 402 },
      );
    }
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          balance: e.balance,
          required: e.required,
        },
        { status: 402 },
      );
    }
    if (e instanceof DocumentParseError) {
      return NextResponse.json({ error: e.message }, { status: 422 });
    }
    if (e instanceof UploadsNotConfiguredError) {
      return NextResponse.json({ error: "uploads_not_configured" }, { status: 503 });
    }
    captureIntegrationException(e, {
      integration: "bedrock",
      operation: "intelligence_generate_source",
      context: { companyUuid: uuid },
    });
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
