import "server-only";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { extensionFromFilename } from "@/lib/data-room/validate-file";

export class DocumentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentParseError";
  }
}

const MAX_EXTRACT_CHARS = 50_000;

async function extractPptxText(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => name.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort();
  const parts: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name]?.async("string");
    if (!xml) continue;
    const text = xml
      .replace(/<a:t[^>]*>/g, "\n")
      .replace(/<\/a:t>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) parts.push(text);
  }
  return parts.join("\n\n");
}

export async function parseDocumentBuffer(
  buf: Buffer,
  filename: string,
): Promise<string> {
  const ext = extensionFromFilename(filename);
  if (!ext) throw new DocumentParseError("unsupported_file_type");

  let text = "";

  switch (ext) {
    case "pdf": {
      const result = await extractText(new Uint8Array(buf), { mergePages: true });
      text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
      break;
    }
    case "txt":
    case "md":
    case "csv":
      text = buf.toString("utf8");
      break;
    case "docx":
    case "doc": {
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
      break;
    }
    case "xlsx":
    case "xls": {
      const workbook = XLSX.read(buf, { type: "buffer" });
      const sheets = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        if (!sheet) return "";
        return `## ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`;
      });
      text = sheets.join("\n\n");
      break;
    }
    case "pptx":
    case "ppt":
      text = await extractPptxText(buf);
      break;
    default:
      throw new DocumentParseError("unsupported_file_type");
  }

  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (trimmed.length < 40) {
    throw new DocumentParseError("document_too_short");
  }
  return trimmed.length > MAX_EXTRACT_CHARS
    ? trimmed.slice(0, MAX_EXTRACT_CHARS)
    : trimmed;
}
