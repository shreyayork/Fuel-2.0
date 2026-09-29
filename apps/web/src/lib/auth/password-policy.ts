/**
 * Cognito pool password policy (see packages/infrastructure/lib/auth.ts):
 * minLength 12, upper, lower, digit, symbol. Client validation mirrors that
 * so signup / forgot-reset / change-password share one source of truth.
 */

export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_REQUIREMENTS = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters long`,
  },
  {
    id: "case",
    label: "Contains uppercase and lowercase letters",
  },
  {
    id: "digitSymbol",
    label: "Contains a number and special character",
  },
] as const;

export type PasswordRequirementId = (typeof PASSWORD_REQUIREMENTS)[number]["id"];

export type PasswordRequirementState = Record<PasswordRequirementId, boolean>;

export function checkPasswordRequirements(
  password: string,
): PasswordRequirementState {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    case: /[a-z]/.test(password) && /[A-Z]/.test(password),
    digitSymbol: /\d/.test(password) && /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordStrong(password: string): boolean {
  const r = checkPasswordRequirements(password);
  return r.length && r.case && r.digitSymbol;
}

/** 0 = empty; 1–3 = how many of the three Cognito requirement groups are met. */
export type PasswordStrengthLevel = 0 | 1 | 2 | 3;

export function passwordStrength(password: string): {
  level: PasswordStrengthLevel;
  label: string;
} {
  if (!password) return { level: 0, label: "" };
  const r = checkPasswordRequirements(password);
  const met = ([r.length, r.case, r.digitSymbol] as const).filter(Boolean)
    .length as PasswordStrengthLevel;
  if (met <= 1) return { level: met === 0 ? 1 : met, label: "Weak" };
  if (met === 2) return { level: 2, label: "Almost there" };
  return { level: 3, label: "Strong & secure" };
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}
