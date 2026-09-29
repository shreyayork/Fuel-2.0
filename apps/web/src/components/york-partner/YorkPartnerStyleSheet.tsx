"use client";

import { useMemo } from "react";
import type { Theme } from "@/lib/theme";
import { yorkPartnerCss } from "./yorkPartnerCss";

export function YorkPartnerStyleSheet({ t }: { t: Theme }) {
  const css = useMemo(() => yorkPartnerCss(t), [t]);
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
