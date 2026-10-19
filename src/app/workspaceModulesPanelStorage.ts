const STORAGE_PREFIX = "fuel-workspace-modules-panel-skipped:v1:";

function storageKey(companyKey: string) {
  return `${STORAGE_PREFIX}${companyKey.trim().toLowerCase() || "default"}`;
}

export function isWorkspaceModulesPanelSkipped(companyKey = "default"): boolean {
  try {
    return window.localStorage.getItem(storageKey(companyKey)) === "1";
  } catch {
    return false;
  }
}

export function markWorkspaceModulesPanelSkipped(companyKey = "default") {
  try {
    window.localStorage.setItem(storageKey(companyKey), "1");
  } catch {
    /* ignore */
  }
}

export function clearWorkspaceModulesPanelSkipped(companyKey = "default") {
  try {
    window.localStorage.removeItem(storageKey(companyKey));
  } catch {
    /* ignore */
  }
}
