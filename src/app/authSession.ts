const AUTH_EMAIL_KEY = "fuel-auth-email";

export function setAuthEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AUTH_EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    /* ignore */
  }
}

export function getAuthEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(AUTH_EMAIL_KEY)?.trim().toLowerCase() ?? "";
  } catch {
    return "";
  }
}
