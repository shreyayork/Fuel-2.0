/** Shared Fuel UI theme helpers — preview localStorage only (no backend). */

export type FuelTheme = "dark" | "light";

export const FUEL_THEME_STORAGE_KEY = "fuel-ui-theme";

export function applyFuelTheme(theme: FuelTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(FUEL_THEME_STORAGE_KEY, theme);
  } catch {
    /* preview: ignore quota / private mode */
  }
}

export function readFuelTheme(): FuelTheme {
  try {
    const stored = localStorage.getItem(FUEL_THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function toggleFuelTheme(current: FuelTheme): FuelTheme {
  return current === "dark" ? "light" : "dark";
}
