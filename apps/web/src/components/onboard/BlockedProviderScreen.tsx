import Link from "next/link";
import { OnboardCard, OnboardHeading, OnboardBody } from "./layout";
import { onboardGhostButton, onboardPrimaryButton } from "./styles";

/**
 * Rendered when the signed-in user's email is from Gmail / Outlook / a
 * disposable provider. We can't verify a company domain from a personal
 * webmail address, so the only path forward is to sign in again with a
 * work email.
 */
export function BlockedProviderScreen({ email }: { email: string }) {
  return (
    <OnboardCard>
      <OnboardHeading eyebrow="Sign-up paused">
        Use your work email so your numbers count.
      </OnboardHeading>
      <OnboardBody>
        <p>
          You signed in as <strong>{email}</strong>. Fuel can only verify a
          company-domain email — generic providers like gmail.com, outlook.com,
          and yahoo.com can&apos;t be tied to a specific company.
        </p>
        <p style={{ marginTop: 16 }}>
          We use verified domains for two things: (1) confirming a real founder
          claimed the company, and (2) deciding whose KPI submissions count
          toward our global benchmark dataset. Verified-domain submissions
          improve benchmarks for everyone.
        </p>
        <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href="/sign-out?next=/"
            style={{
              ...onboardPrimaryButton(),
              padding: "10px 18px",
              borderRadius: 8,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Sign in with my work email
          </a>
          <Link
            href="/"
            style={{
              ...onboardGhostButton(),
              padding: "10px 18px",
              borderRadius: 8,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Back to the home page
          </Link>
        </div>
      </OnboardBody>
    </OnboardCard>
  );
}
