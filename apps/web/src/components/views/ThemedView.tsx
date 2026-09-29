"use client";

import type { ReactNode } from "react";
import type { Theme } from "@/lib/theme";
import { useTheme } from "../ThemeContext";

/** Lets server components pass render-prop children into a client boundary
 *  that already has the Theme in context. Avoids serializing the render prop
 *  across the RSC wire. */
export function ThemedView({ children }: { children: (t: Theme) => ReactNode }) {
  const t = useTheme();
  return <>{children(t)}</>;
}
