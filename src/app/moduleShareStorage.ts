/** Module-level share lists for company Data Room / Initiatives. */

export type CompanyShareModule = "data-room" | "initiatives";

const STORAGE_KEY = "fuel-company-module-share:v1";
const CHANGE_EVENT = "fuel-company-module-share-changed";

type ShareStore = Record<string, Partial<Record<CompanyShareModule, string[]>>>;

function readStore(): ShareStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ShareStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: ShareStore) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* Demo environments may block storage. */
  }
}

function companyKey(companyId: string) {
  return companyId.trim().toLowerCase() || "company";
}

export function getModuleShareAccess(
  companyId: string,
  module: CompanyShareModule,
): string[] {
  const entry = readStore()[companyKey(companyId)];
  const ids = entry?.[module];
  return Array.isArray(ids) ? ids : [];
}

export function setModuleShareAccess(
  companyId: string,
  module: CompanyShareModule,
  sharedWithInvestorIds: string[],
) {
  const key = companyKey(companyId);
  const store = readStore();
  store[key] = {
    ...store[key],
    [module]: [...sharedWithInvestorIds],
  };
  writeStore(store);
}

export function subscribeModuleShareAccess(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
