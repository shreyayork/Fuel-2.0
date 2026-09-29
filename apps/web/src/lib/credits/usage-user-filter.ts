/**
 * Undo form-urlencoded `+` → space (CloudFront → Lambda Function URL → OpenNext)
 * and a single percent-decode hop (client may pre-encode so `+` survives).
 */
export function decodePlusAddressedQueryParam(raw: string): string {
  let value = raw.trim();
  if (/%[0-9A-Fa-f]{2}/.test(value)) {
    try {
      value = decodeURIComponent(value);
    } catch {
      // Keep the trimmed value if decoding fails.
    }
  }
  return value.replace(/ /g, "+");
}

/**
 * Normalize the Usage tab `user` query param for credit activity filtering.
 *
 * Plus-addressed emails (`local+tag@domain`) break when intermediaries apply
 * application/x-www-form-urlencoded rules (`+` → space) — common with
 * CloudFront → Lambda Function URL → OpenNext. Real emails never contain
 * spaces, so restoring `+` is lossless for this filter.
 *
 * Also accepts a single percent-encoded value (client may pre-encode so `+`
 * survives a decode hop) and lowercases for case-insensitive DB match.
 */
export function normalizeUsageUserFilter(
  raw: string | null | undefined,
): string {
  if (raw == null) return "all";
  const value = decodePlusAddressedQueryParam(raw);
  if (!value || value === "all") return "all";
  return value.toLowerCase();
}
