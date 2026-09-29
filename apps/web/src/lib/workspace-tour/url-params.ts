const ONBOARDING_QUERY_KEYS = ["tour", "first", "cta"] as const;

/** Remove first-session / tour deep-link params without a Next.js navigation. */
export function stripOnboardingParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of ONBOARDING_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState(window.history.state, "", url.toString());
  }
}
