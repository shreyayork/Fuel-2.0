/** Input class for placeholder CSS — see `companySearchPlaceholderCss`. */
export const COMPANY_SEARCH_INPUT_CLASS = "fuel-company-search-input";
export const COMPANY_SEARCH_PLACEHOLDER = "Search companies…";

/**
 * Explicit ::placeholder color. Tailwind preflight uses
 * `color-mix(…, currentcolor 50%, transparent)`, which can keep a light
 * (body / signal-theme) currentcolor after editorial hydrate until focus —
 * so the placeholder vanishes on a white panel until the input is focused.
 */
export function companySearchPlaceholderCss(mutedColor: string): string {
  return `.${COMPANY_SEARCH_INPUT_CLASS}::placeholder{color:${mutedColor};opacity:1}`;
}
