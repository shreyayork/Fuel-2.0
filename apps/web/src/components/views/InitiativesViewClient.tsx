"use client";

import type { FuelDataset } from "@/lib/types";
import { useTheme } from "../ThemeContext";
import { InitiativesView } from "./InitiativesView";

export function InitiativesViewClient({ data }: { data: FuelDataset }) {
  const t = useTheme();
  return <InitiativesView t={t} data={data} onOpenCo={() => {}} />;
}
