import { z } from "zod";

/** Same syntactic rule as auth forms (`z.string().email()`). */
const emailSchema = z.string().trim().email();

export const INVALID_EMAIL_MESSAGE = "Please enter a valid email address.";

export function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value).success;
}
