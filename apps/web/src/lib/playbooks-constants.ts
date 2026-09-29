export const PLAYBOOK_CATEGORIES = [
  "R&D",
  "GTM",
  "G&A",
  "Investing",
  "Founder",
  "Other",
] as const;

export type PlaybookCategory = (typeof PLAYBOOK_CATEGORIES)[number];

/** Seeded catalog extras that the user-facing picker does not offer. */
export const ADMIN_PLAYBOOK_CATEGORIES = [
  ...PLAYBOOK_CATEGORIES,
  "System",
  "Portfolio",
] as const;

export type AdminPlaybookCategory = (typeof ADMIN_PLAYBOOK_CATEGORIES)[number];

export const PLAYBOOK_MODES = ["chat", "guided"] as const;

export type PlaybookMode = (typeof PLAYBOOK_MODES)[number];

export const PLAYBOOK_TARGET_KINDS = ["company", "deal", "pipeline"] as const;

export type PlaybookTargetKind = (typeof PLAYBOOK_TARGET_KINDS)[number];

/** Kebab-case slug for global playbook URLs (`/playbooks/[slug]`). */
export const PLAYBOOK_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isPlaybookCategory(value: string): value is PlaybookCategory {
  return (PLAYBOOK_CATEGORIES as readonly string[]).includes(value);
}

export function isAdminPlaybookCategory(
  value: string,
): value is AdminPlaybookCategory {
  return (ADMIN_PLAYBOOK_CATEGORIES as readonly string[]).includes(value);
}

export function isPlaybookMode(value: string): value is PlaybookMode {
  return (PLAYBOOK_MODES as readonly string[]).includes(value);
}

export function isPlaybookTargetKind(value: string): value is PlaybookTargetKind {
  return (PLAYBOOK_TARGET_KINDS as readonly string[]).includes(value);
}
