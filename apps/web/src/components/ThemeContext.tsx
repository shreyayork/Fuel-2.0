"use client";

import { createContext, useContext } from "react";
import { SIGNAL, type Theme } from "@/lib/theme";

export const ThemeContext = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  if (!t) throw new Error("useTheme called outside of ThemeContext.Provider");
  return t;
}

/** Theme from AppShell when present; dark SIGNAL fallback for full-bleed flows. */
export function useThemeOrSignal(): Theme {
  return useContext(ThemeContext) ?? SIGNAL;
}
