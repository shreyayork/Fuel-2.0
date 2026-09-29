import { isYorkClientEmail } from "@/lib/onboard/york-domains";

export function checkIsYorkClient(email: string): boolean {
  return isYorkClientEmail(email);
}

/** Result from the future third-party York IE services / projects integration. */
export type YorkIeServicesStatus = {
  hasActiveProjects: boolean;
};

/**
 * Third-party York IE services API — not wired yet.
 * When ready, return whether the account has active York IE projects/services.
 */
export async function fetchYorkIeServicesStatus(
  _email: string,
): Promise<YorkIeServicesStatus | null> {
  return null;
}

/** Gate the "Your York IE projects" onboarding step until the services API is live. */
export function shouldShowYorkProjectsStep(opts: {
  isYorkClient: boolean;
  servicesStatus: YorkIeServicesStatus | null;
}): boolean {
  if (!opts.isYorkClient || !opts.servicesStatus) return false;
  return opts.servicesStatus.hasActiveProjects;
}
