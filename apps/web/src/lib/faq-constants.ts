/** Client-safe FAQ types (no server-only imports). */

export type FaqPointInput = {
  label: string;
  body: string;
};

export const FUEL_SUPPORT_EMAIL = "support@york.ie";

/** Parse Super Admin "label — body" lines (one point per line). */
export function parseFaqPointsText(raw: string): FaqPointInput[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.indexOf(" — ");
      if (sep === -1) {
        const dash = line.indexOf(" - ");
        if (dash === -1) return { label: line, body: "" };
        return {
          label: line.slice(0, dash).trim(),
          body: line.slice(dash + 3).trim(),
        };
      }
      return {
        label: line.slice(0, sep).trim(),
        body: line.slice(sep + 3).trim(),
      };
    })
    .filter((p) => p.label.length > 0);
}

export function formatFaqPointsText(points: FaqPointInput[] | null | undefined): string {
  if (!points?.length) return "";
  return points
    .map((p) => (p.body ? `${p.label} — ${p.body}` : p.label))
    .join("\n");
}
