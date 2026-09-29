"use client";

import { useState } from "react";
import { OnboardCard, OnboardHeading, OnboardBody } from "./layout";

interface InviteSummary {
  accountId: string;
  accountName: string;
  role: string;
  invitedByEmail: string;
  expiresAt: string;
}

/**
 * Rendered when the founder lands on /onboard but already has one or more
 * pending invites to existing accounts (e.g. a co-founder invited them last
 * week). We don't auto-accept — let them choose between accepting the
 * existing invite and creating a fresh company account at their domain.
 */
export function PendingInviteInterstitial({
  invites,
  cta,
}: {
  invites: InviteSummary[];
  cta: "benchmark" | "pitch-deck" | "explore";
}) {
  const [continuing, setContinuing] = useState(false);

  return (
    <OnboardCard>
      <OnboardHeading eyebrow="Heads up">
        You&apos;ve got {invites.length === 1 ? "an invite" : "invites"} waiting.
      </OnboardHeading>
      <OnboardBody>
        <p>
          Someone&apos;s already invited you to Fuel. You can accept and join
          their workspace, or keep going and set up a new company account at
          your domain.
        </p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {invites.map((invite) => (
            <li
              key={invite.accountId}
              style={{
                background: "#0F1A24",
                border: "1px solid #263947",
                borderRadius: 10,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: "#F4F6F8" }}>
                  {invite.accountName}
                </div>
                <div style={{ fontSize: 12, color: "#8A99A6", marginTop: 4 }}>
                  Invited by {invite.invitedByEmail} · role {invite.role}
                </div>
              </div>
              {/* Accept-invite link goes through the existing /invite/[token]
                  flow. We don't surface the raw token here (we only have its
                  hash); instead we point at a dedicated "find pending"
                  endpoint that will look it up by email. For v1 we just point
                  at the account inbox — the user can paste their invite link
                  from the email they received. */}
              <span style={{ fontSize: 12, color: "#8A99A6" }}>
                Check your inbox for the invite link
              </span>
            </li>
          ))}
        </ul>

        <div
          style={{
            marginTop: 28,
            paddingTop: 24,
            borderTop: "1px solid #263947",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setContinuing(true);
              // Use a query flag so the orchestrator skips the interstitial
              // on next render. The check happens server-side; the flag is
              // a hint for the orchestrator.
              window.location.href = `/onboard?cta=${cta}&continueAnyway=1`;
            }}
            disabled={continuing}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: "#00B48A",
              color: "#0F1A24",
              fontWeight: 600,
              border: "none",
              cursor: continuing ? "wait" : "pointer",
            }}
          >
            {continuing ? "Continuing…" : "Continue creating a new company account"}
          </button>
        </div>
      </OnboardBody>
    </OnboardCard>
  );
}
