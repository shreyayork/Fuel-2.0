import type { DataRoomSnapshot } from "./types";
import { formatDataRoomUploadError } from "./upload-errors";
import type { DataRoomUploadSource } from "./validate-file";
import { validateDataRoomFile } from "./validate-file";
import type { CreditSnapshot } from "@/lib/credits/types";
import { syncCreditsAfterAction } from "@/lib/credits/client";

type UploadResponsePayload = DataRoomSnapshot & {
  error?: string;
  balance?: number;
  required?: number;
  intelligenceIds?: string[];
  creditBalance?: number;
  creditSnapshot?: CreditSnapshot;
  reason?: string;
  initiativesGenerating?: boolean;
  contextItemId?: string;
  attachmentId?: string;
};

export type DataRoomUploadResult =
  | {
      ok: true;
      snapshot: DataRoomSnapshot;
      intelligenceIds?: string[];
      creditBalance?: number;
      creditSnapshot?: CreditSnapshot;
      initiativesGenerating?: boolean;
      contextItemId?: string;
      attachmentId?: string;
    }
  | {
      ok: false;
      message: string;
      snapshot?: DataRoomSnapshot;
      balance?: number;
      required?: number;
      creditSnapshot?: CreditSnapshot;
    };

export function validateDataRoomUploadFile(file: File): string | null {
  const error = validateDataRoomFile(file);
  return error ? formatDataRoomUploadError(error) : null;
}

function snapshotFromPayload(
  json: UploadResponsePayload,
): DataRoomSnapshot | undefined {
  return "slots" in json ? json : undefined;
}

export async function postDataRoomUpload(opts: {
  companyUuid: string;
  typeId: string;
  typeLabel: string;
  file: File;
  source: DataRoomUploadSource;
}): Promise<DataRoomUploadResult> {
  const clientError = validateDataRoomUploadFile(opts.file);
  if (clientError) {
    return { ok: false, message: clientError };
  }

  const formData = new FormData();
  formData.set("typeId", opts.typeId);
  formData.set("typeLabel", opts.typeLabel);
  formData.set("source", opts.source);
  formData.set("file", opts.file);

  try {
    const res = await fetch(
      `/api/company/${opts.companyUuid}/data-room/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    let json: UploadResponsePayload;
    try {
      json = (await res.json()) as UploadResponsePayload;
    } catch {
      return {
        ok: false,
        message: formatDataRoomUploadError(res.ok ? "unknown" : "invalid_form"),
      };
    }

    const snapshot = snapshotFromPayload(json);

    if (!res.ok) {
      const code = json.error ?? "unknown";
      const creditSnapshot = json.creditSnapshot;
      if (creditSnapshot) {
        syncCreditsAfterAction(creditSnapshot);
      }
      return {
        ok: false,
        message: formatDataRoomUploadError(code, {
          creditSnapshot,
          required: json.required,
        }),
        snapshot,
        balance: json.balance,
        required: json.required,
        creditSnapshot,
      };
    }

    const creditSnapshot = json.creditSnapshot;
    syncCreditsAfterAction(creditSnapshot);

    if (snapshot) {
      return {
        ok: true,
        snapshot,
        intelligenceIds: json.intelligenceIds,
        creditBalance: json.creditBalance,
        creditSnapshot,
        initiativesGenerating: json.initiativesGenerating === true,
        contextItemId: json.contextItemId,
        attachmentId: json.attachmentId,
      };
    }
    if ("slots" in json) {
      return { ok: true, snapshot: json, creditSnapshot };
    }

    return { ok: false, message: formatDataRoomUploadError("unknown") };
  } catch {
    return { ok: false, message: formatDataRoomUploadError("unknown") };
  }
}
