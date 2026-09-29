import "server-only";
import { sendEmail } from "@/lib/email";
import { firstNameFrom } from "@/lib/email/light-layout";
import { renderFounderWelcomeEmail } from "@/lib/email/welcome-founder";
import { renderInvestorWelcomeEmail } from "@/lib/email/welcome-investor";
import { captureIntegrationException } from "@/lib/sentry/capture";
import {
  getUserPreference,
  setUserPreference,
} from "@/lib/user-preferences";

export const PREF_WELCOME_EMAIL_SENT = "email_welcome_sent";

export type WelcomeFlowType = "operating" | "investor";

/**
 * Best-effort welcome email after onboard claim. Idempotent per account via
 * user_preferences key scoped by account id.
 */
export async function sendWelcomeEmailBestEffort(opts: {
  to: string;
  accountId: string;
  companyUuid: string;
  flowType: WelcomeFlowType;
  givenName?: string | null;
}): Promise<{ sent: boolean; skipped?: string }> {
  const prefKey = `${PREF_WELCOME_EMAIL_SENT}:${opts.accountId}`;
  try {
    const already = await getUserPreference({
      userEmail: opts.to,
      key: prefKey,
    });
    if (already) return { sent: false, skipped: "already_sent" };

    const firstName = firstNameFrom({
      givenName: opts.givenName,
      email: opts.to,
    });

    const rendered =
      opts.flowType === "investor"
        ? renderInvestorWelcomeEmail({ firstName })
        : renderFounderWelcomeEmail({
            firstName,
            companyUuid: opts.companyUuid,
          });

    const subject =
      opts.flowType === "investor"
        ? "Get started on Fuel"
        : "You're in. Let's get to work on Fuel";

    await sendEmail({
      to: opts.to,
      subject,
      html: rendered.html,
      text: rendered.text,
    });

    await setUserPreference({
      userEmail: opts.to,
      key: prefKey,
      value: new Date().toISOString(),
    });
    return { sent: true };
  } catch (error) {
    captureIntegrationException(error, {
      integration: "ses",
      operation: "welcome_email",
      context: { accountId: opts.accountId, flowType: opts.flowType },
    });
    return { sent: false, skipped: "error" };
  }
}
