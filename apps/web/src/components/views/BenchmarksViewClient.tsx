"use client";

import type { FuelDataset } from "@/lib/types";
import { useTheme } from "../ThemeContext";
import { BenchmarksView } from "./BenchmarksView";

export function BenchmarksViewClient({ data }: { data: FuelDataset }) {
  const t = useTheme();
  return <BenchmarksView t={t} data={data} />;
}
