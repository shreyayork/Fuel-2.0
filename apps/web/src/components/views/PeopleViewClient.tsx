"use client";

import type { FuelDataset } from "@/lib/types";
import { useTheme } from "../ThemeContext";
import { PeopleView } from "./PeopleView";

export function PeopleViewClient({ data }: { data: FuelDataset }) {
  const t = useTheme();
  return <PeopleView t={t} data={data} />;
}
