import { formatActionInsufficientCreditsMessage } from "@/lib/credits/logic";
import type { CreditSnapshot } from "@/lib/credits/types";

export const DATA_ROOM_UNSUPPORTED_MESSAGE =
  "Unsupported file type. Use PDF, PowerPoint, Word, Excel, CSV, or plain text.";

export function formatDataRoomUploadError(
  error: string,
  opts?: {
    creditSnapshot?: CreditSnapshot;
    required?: number;
  },
): string {
  switch (error) {
    case "unsupported_file_type":
    case "invalid_file_content":
      return DATA_ROOM_UNSUPPORTED_MESSAGE;
    case "file_too_large":
      return "File is too large. Maximum size is 25 MB.";
    case "invalid_form":
      return "This file could not be uploaded. It may be too large or an unsupported format (e.g. .dmg, .xip).";
    case "uploads_not_configured":
      return "Uploads are not configured in this environment.";
    case "file_required":
      return "Please choose a file to upload.";
    case "invalid_document_type":
      return "Invalid document type. Please try again.";
    case "duplicate_document_type":
      return "Document type already exists. Choose it from the list.";
    case "forbidden":
      return "You do not have permission to upload documents for this company.";
    case "not_found":
      return "Company not found.";
    case "no_insights_extracted":
      return "Could not extract intelligence from this document. Try a different file or add more context.";
    case "insights_shape_invalid":
      return "The model returned insights in an unexpected format. Please try again.";
    case "document_too_short":
      return "This document has too little readable text to generate intelligence.";
    case "insufficient_credits": {
      const snapshot = opts?.creditSnapshot;
      const required = opts?.required;
      if (snapshot && typeof required === "number" && required > 0) {
        return formatActionInsufficientCreditsMessage(snapshot, required);
      }
      return "Not enough credits to upload and generate intelligence from this document.";
    }
    case "intelligence_generation_failed":
      return "Document uploaded, but intelligence generation failed. Try generating from Sources.";
    default:
      return "Upload failed. Please try again.";
  }
}
