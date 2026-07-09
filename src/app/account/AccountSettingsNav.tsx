import React, { createContext, useContext } from "react";

export type AccountSettingsTab =
  | "overview"
  | "users"
  | "teams"
  | "settings"
  | "integrations"
  | "usage"
  | "developer"
  | "billing";

type AccountSettingsNavContextValue = {
  openAccountSettings: (tab?: AccountSettingsTab) => void;
};

const AccountSettingsNavContext = createContext<AccountSettingsNavContextValue | null>(null);

export function AccountSettingsNavProvider({
  children,
  openAccountSettings,
}: {
  children: React.ReactNode;
  openAccountSettings: (tab?: AccountSettingsTab) => void;
}) {
  return (
    <AccountSettingsNavContext.Provider value={{ openAccountSettings }}>
      {children}
    </AccountSettingsNavContext.Provider>
  );
}

export function useAccountSettingsNav() {
  const ctx = useContext(AccountSettingsNavContext);
  if (!ctx) throw new Error("useAccountSettingsNav must be used within AccountSettingsNavProvider");
  return ctx;
}

export function useAccountSettingsNavOptional() {
  return useContext(AccountSettingsNavContext);
}

export const ACCOUNT_SETTINGS_TABS: { id: AccountSettingsTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "teams", label: "Teams" },
  { id: "settings", label: "Settings" },
  { id: "integrations", label: "Integrations" },
  { id: "usage", label: "Usage" },
  { id: "developer", label: "Developer" },
  { id: "billing", label: "Billing" },
];

export function accountTabLabel(tab: AccountSettingsTab): string {
  return ACCOUNT_SETTINGS_TABS.find(t => t.id === tab)?.label ?? "Account";
}
