"use client";

import type { ReactNode } from "react";
import type { Theme } from "@/lib/theme";
import { creditButtonInner, creditButtonSpinner } from "./styles";

type CreditButtonLabelProps = {
  t: Theme;
  loading: boolean;
  variant?: "primary" | "ghost";
  children: ReactNode;
};

export function CreditButtonLabel({
  t,
  loading,
  variant = "primary",
  children,
}: CreditButtonLabelProps) {
  return (
    <span style={creditButtonInner()}>
      {loading ? <span aria-hidden style={creditButtonSpinner(t, variant)} /> : null}
      <span>{children}</span>
    </span>
  );
}
