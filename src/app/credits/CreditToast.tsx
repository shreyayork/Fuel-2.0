import React from "react";
import { useCredits } from "./CreditProvider";

export function CreditToastHost() {
  const { toast, dismissToast } = useCredits();
  if (!toast) return null;

  return (
    <div className="credit-toast" role="status" onClick={dismissToast}>
      {toast.message}
    </div>
  );
}
