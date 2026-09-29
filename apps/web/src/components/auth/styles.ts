import type { CSSProperties } from "react";

/** Shared auth form column — Sign In, Sign Up, Forgot Password. */
export const AUTH_FORM_MAX_WIDTH = 400;

/** Card chrome used by AuthSurface and ForgotPasswordSurface. */
export const authCardStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(23,38,50,0.85) 0%, rgba(15,26,36,0.85) 100%)",
  border: "1px solid rgba(38,57,71,0.95)",
  borderRadius: 16,
  padding: 36,
  boxShadow:
    "0 30px 80px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.05) inset",
};
