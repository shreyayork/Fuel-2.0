import React, { createContext, useContext } from "react";
import type { LegalDocId } from "./legalContent";

type LegalNavContextValue = {
  openLegal: (doc: LegalDocId) => void;
};

const LegalNavContext = createContext<LegalNavContextValue | null>(null);

export function LegalNavProvider({
  openLegal,
  children,
}: {
  openLegal: (doc: LegalDocId) => void;
  children: React.ReactNode;
}) {
  return (
    <LegalNavContext.Provider value={{ openLegal }}>
      {children}
    </LegalNavContext.Provider>
  );
}

export function useLegalNav() {
  const ctx = useContext(LegalNavContext);
  if (!ctx) throw new Error("useLegalNav must be used within LegalNavProvider");
  return ctx;
}

export function useLegalNavOptional() {
  return useContext(LegalNavContext);
}

export function LegalDocLink({
  doc,
  children,
  className,
}: {
  doc: LegalDocId;
  children: React.ReactNode;
  className?: string;
}) {
  const nav = useLegalNavOptional();
  if (!nav) {
    return <span className={className}>{children}</span>;
  }
  return (
    <button type="button" className={className ?? "fuel-legal-inline-link"} onClick={() => nav.openLegal(doc)}>
      {children}
    </button>
  );
}
