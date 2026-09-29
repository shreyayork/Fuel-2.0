import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAccount } from "@/lib/accounts";
import { acceptInvite, getActiveInviteByToken } from "@/lib/invites";

export const dynamic = "force-dynamic";

const panelStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: "80px auto",
  padding: 32,
  background: "#FFFFFF",
  border: "1px solid #E4E8EC",
  borderRadius: 8,
  fontFamily: '-apple-system, "Helvetica Neue", sans-serif',
  color: "#284256",
  lineHeight: 1.55,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#00B48A",
  color: "#FFFFFF",
  textDecoration: "none",
  padding: "10px 18px",
  borderRadius: 4,
  fontSize: 14,
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
};

export default async function InviteAcceptPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accept?: string }>;
}) {
  const { token } = await params;
  const { accept } = await searchParams;

  const invite = await getActiveInviteByToken(decodeURIComponent(token));
  if (!invite) {
    return (
      <main style={panelStyle}>
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20, fontWeight: 600 }}>
          Invite not valid
        </h1>
        <p style={{ margin: 0, color: "#7A8A97" }}>
          This invite link has expired, been revoked, or was already used. Ask
          your admin for a fresh invite.
        </p>
      </main>
    );
  }

  const account = await getAccount(invite.accountId);
  const accountName = account?.name ?? "a Fuel account";

  const session = await getSession();
  const signedInEmail = session?.email?.toLowerCase() ?? null;

  // Unauthenticated: send new invitees to signup (or Google on that surface)
  // with `next` pointing back here. Invite tokens do not create Cognito users,
  // so password sign-in alone is a dead end for first-time members.
  if (!signedInEmail) {
    const back = `/invite/${token}`;
    const authParams = new URLSearchParams({
      next: back,
      mode: "signup",
      email: invite.email,
    });
    return (
      <main style={panelStyle}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#7A8A97",
            marginBottom: 6,
          }}
        >
          Invite
        </div>
        <h1 style={{ margin: 0, marginBottom: 10, fontSize: 20, fontWeight: 600 }}>
          Join {accountName} on Fuel
        </h1>
        <p style={{ margin: "0 0 18px 0", color: "#3E5668" }}>
          {invite.invitedByEmail} invited <strong>{invite.email}</strong> as a{" "}
          <strong>{invite.role}</strong>. Create an account (or sign in) with
          this email to accept.
        </p>
        <Link href={`/sign-in?${authParams.toString()}`} style={primaryButtonStyle}>
          Create account to accept
        </Link>
      </main>
    );
  }

  // Signed in with the wrong email — dead end with a clear message.
  if (signedInEmail !== invite.email) {
    return (
      <main style={panelStyle}>
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20, fontWeight: 600 }}>
          Wrong account
        </h1>
        <p style={{ margin: "0 0 18px 0", color: "#3E5668" }}>
          {"This invite was sent to "}
          <strong>{invite.email}</strong>
          {" but you're signed in as "}
          <strong>{signedInEmail}</strong>
          {". Sign out and sign back in with the invited email to continue."}
        </p>
        <Link href="/sign-out" style={primaryButtonStyle}>
          Sign out
        </Link>
      </main>
    );
  }

  // Signed in + matching email + ?accept=1 → consume. Otherwise show a
  // confirm screen. One-click acceptance is fine here because the user is
  // already authenticated as the invited identity.
  if (accept === "1") {
    const result = await acceptInvite({
      rawToken: decodeURIComponent(token),
      authenticatedEmail: signedInEmail,
    });
    if ("error" in result) {
      return (
        <main style={panelStyle}>
          <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20, fontWeight: 600 }}>
            {"Couldn't accept invite"}
          </h1>
          <p style={{ margin: 0, color: "#7A8A97" }}>
            {result.error === "email_mismatch"
              ? "The signed-in account doesn't match the invited email."
              : "This invite is no longer valid."}
          </p>
        </main>
      );
    }
    redirect("/");
  }

  return (
    <main style={panelStyle}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#7A8A97",
          marginBottom: 6,
        }}
      >
        Invite
      </div>
      <h1 style={{ margin: 0, marginBottom: 10, fontSize: 20, fontWeight: 600 }}>
        Join {accountName}
      </h1>
      <p style={{ margin: "0 0 18px 0", color: "#3E5668" }}>
        Invited by <strong>{invite.invitedByEmail}</strong> as a{" "}
        <strong>{invite.role}</strong>.
      </p>
      <Link href={`/invite/${token}?accept=1`} style={primaryButtonStyle}>
        Accept invite
      </Link>
    </main>
  );
}
