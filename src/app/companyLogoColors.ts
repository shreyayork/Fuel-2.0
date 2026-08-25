/** Distinct, letter-keyed avatar colors — same letter → same shade everywhere. */
const LETTER_PALETTE: Record<string, { bg: string; fg: string }> = {
  A: { bg: "#B45309", fg: "#FFFFFF" },
  B: { bg: "#1D4ED8", fg: "#FFFFFF" },
  C: { bg: "#0E7490", fg: "#FFFFFF" },
  D: { bg: "#7C3AED", fg: "#FFFFFF" },
  E: { bg: "#047857", fg: "#FFFFFF" },
  F: { bg: "#C2410C", fg: "#FFFFFF" },
  G: { bg: "#4338CA", fg: "#FFFFFF" },
  H: { bg: "#0F766E", fg: "#FFFFFF" },
  I: { bg: "#BE185D", fg: "#FFFFFF" },
  J: { bg: "#0369A1", fg: "#FFFFFF" },
  K: { bg: "#A21CAF", fg: "#FFFFFF" },
  L: { bg: "#15803D", fg: "#FFFFFF" },
  M: { bg: "#B91C1C", fg: "#FFFFFF" },
  N: { bg: "#0284C7", fg: "#FFFFFF" },
  O: { bg: "#EA580C", fg: "#FFFFFF" },
  P: { bg: "#7E22CE", fg: "#FFFFFF" },
  Q: { bg: "#312E81", fg: "#FFFFFF" },
  R: { bg: "#BE123C", fg: "#FFFFFF" },
  S: { bg: "#0D9488", fg: "#FFFFFF" },
  T: { bg: "#92400E", fg: "#FFFFFF" },
  U: { bg: "#1E3A8A", fg: "#FFFFFF" },
  V: { bg: "#6D28D9", fg: "#FFFFFF" },
  W: { bg: "#166534", fg: "#FFFFFF" },
  X: { bg: "#475569", fg: "#FFFFFF" },
  Y: { bg: "#9F1239", fg: "#FFFFFF" },
  Z: { bg: "#5B21B6", fg: "#FFFFFF" },
};

const FALLBACK = { bg: "#475569", fg: "#FFFFFF" };

export function getCompanyLogoLetter(nameOrLetter?: string | null): string {
  const source = (nameOrLetter ?? "").trim();
  if (!source) return "?";
  const first = source[0]?.toUpperCase();
  if (first && /[A-Z]/.test(first)) return first;
  return "?";
}

export function getCompanyLogoColors(nameOrLetter?: string | null): {
  letter: string;
  bg: string;
  fg: string;
} {
  const letter = getCompanyLogoLetter(nameOrLetter);
  const palette = LETTER_PALETTE[letter] ?? FALLBACK;
  return { letter, bg: palette.bg, fg: palette.fg };
}

export function companyLogoInlineStyle(nameOrLetter?: string | null): {
  background: string;
  color: string;
} {
  const { bg, fg } = getCompanyLogoColors(nameOrLetter);
  return { background: bg, color: fg };
}
