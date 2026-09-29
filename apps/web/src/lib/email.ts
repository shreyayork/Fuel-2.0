import "server-only";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { renderEmail, type EmailRenderSpec } from "./email/template";

const ses = new SESv2Client({});

/** Default sender + reply-to. `york.ie` is a verified SES domain identity
 *  in us-east-2 with DKIM signing on. Both override-able via env so the
 *  team can swap addresses without a code change. */
const DEFAULT_FROM = process.env.FUEL_EMAIL_FROM ?? "Fuel <no-reply@york.ie>";
const DEFAULT_REPLY_TO = process.env.FUEL_EMAIL_REPLY_TO ?? "support@york.ie";

export interface EmailAttachment {
  filename: string;
  contentType: string;
  /** Raw bytes — never log. */
  content: Buffer;
}

export interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  /** Optional ReplyTo — defaults to support@york.ie. */
  replyTo?: string[];
  /** Optional file attachments (uses SES Raw MIME). */
  attachments?: EmailAttachment[];
}

function encodeSubject(subject: string): string {
  // RFC 2047 encoded-word for non-ASCII subjects.
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function buildRawMimeEmail(opts: SendEmailOpts & { attachments: EmailAttachment[] }): string {
  const from = opts.from ?? DEFAULT_FROM;
  const replyTo = (opts.replyTo ?? [DEFAULT_REPLY_TO]).join(", ");
  const boundary = `fuel_mixed_${Date.now().toString(36)}`;
  const altBoundary = `fuel_alt_${Date.now().toString(36)}`;

  const parts: string[] = [
    `From: ${from}`,
    `To: ${opts.to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeSubject(opts.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(opts.text, "utf8").toString("base64"),
    "",
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(opts.html, "utf8").toString("base64"),
    "",
    `--${altBoundary}--`,
  ];

  for (const attachment of opts.attachments) {
    const safeName = attachment.filename.replace(/["\r\n]/g, "_");
    parts.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${safeName}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${safeName}"`,
      "",
      attachment.content.toString("base64"),
      "",
    );
  }
  parts.push(`--${boundary}--`, "");
  return parts.join("\r\n");
}

/**
 * Send a transactional email via SES v2. Throws on SES errors; callers that
 * want best-effort should wrap in try/catch.
 *
 * Prefer `sendBrandedEmail` for any new caller — it renders through the
 * shared template so every Fuel email looks like Fuel. This raw entry is
 * here for emails that need custom HTML for some reason.
 */
export async function sendEmail(opts: SendEmailOpts): Promise<{ messageId: string }> {
  const attachments = opts.attachments ?? [];
  if (attachments.length > 0) {
    const res = await ses.send(
      new SendEmailCommand({
        FromEmailAddress: opts.from ?? DEFAULT_FROM,
        Destination: { ToAddresses: [opts.to] },
        ReplyToAddresses: opts.replyTo ?? [DEFAULT_REPLY_TO],
        Content: {
          Raw: {
            Data: Buffer.from(
              buildRawMimeEmail({ ...opts, attachments }),
              "utf8",
            ),
          },
        },
      }),
    );
    return { messageId: res.MessageId ?? "" };
  }

  const res = await ses.send(
    new SendEmailCommand({
      FromEmailAddress: opts.from ?? DEFAULT_FROM,
      Destination: { ToAddresses: [opts.to] },
      ReplyToAddresses: opts.replyTo ?? [DEFAULT_REPLY_TO],
      Content: {
        Simple: {
          Subject: { Data: opts.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: opts.html, Charset: "UTF-8" },
            Text: { Data: opts.text, Charset: "UTF-8" },
          },
        },
      },
    }),
  );
  return { messageId: res.MessageId ?? "" };
}

export interface BrandedEmailSpec extends EmailRenderSpec {
  to: string;
  subject: string;
  from?: string;
  replyTo?: string[];
  attachments?: EmailAttachment[];
}

/**
 * Render through the branded template + send. The single entry point every
 * runtime-rendered Fuel email should use — change the look in one place
 * (`lib/email/template.ts`) and every email follows.
 */
export async function sendBrandedEmail(
  spec: BrandedEmailSpec,
): Promise<{ messageId: string }> {
  const { to, subject, from, replyTo, attachments, ...renderSpec } = spec;
  const { html, text } = renderEmail(renderSpec);
  return sendEmail({ to, subject, html, text, from, replyTo, attachments });
}
