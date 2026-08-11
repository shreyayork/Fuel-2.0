const STORAGE_PREFIX = "fuel-crunchbase-profile-notice-dismissed:v1:";

function storageKey(companyKey: string) {
  return `${STORAGE_PREFIX}${companyKey.trim().toLowerCase() || "default"}`;
}

export function isCrunchbaseProfileNoticeDismissed(companyKey: string): boolean {
  try {
    return localStorage.getItem(storageKey(companyKey)) === "1";
  } catch {
    return false;
  }
}

export function dismissCrunchbaseProfileNotice(companyKey: string) {
  try {
    localStorage.setItem(storageKey(companyKey), "1");
  } catch {
    // Ignore quota / private-mode failures — notice can reappear.
  }
}
