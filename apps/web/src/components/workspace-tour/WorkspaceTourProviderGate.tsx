"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceTourProvider } from "./WorkspaceTourContext";

/**
 * Mounts workspace tour state only on company pages. Keeps tour code (and its
 * useSearchParams Suspense boundary) off other authenticated routes.
 */
export function WorkspaceTourProviderGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onCompanyPage = (pathname ?? "").startsWith("/company/");

  if (!onCompanyPage) {
    return <>{children}</>;
  }

  return <WorkspaceTourProvider>{children}</WorkspaceTourProvider>;
}
