// Outbound email — gated behind AUTH_EMAIL_ENABLED (Session 3c deferral gate).
//
// This is the single switch Sessions 8 & 13 flip on. Until the domain is live
// (Session 13), AUTH_EMAIL_ENABLED is unset/false: NO external mail is sent. In
// development we log the message so verify/reset links are still reachable locally.
// When the flag is eventually turned on, the verified-domain sender (Resend) is
// wired in at the marked spot.

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

function emailEnabled(): boolean {
  return process.env.AUTH_EMAIL_ENABLED === "true";
}

/** Absolute origin for links embedded in emails. */
export function appBaseUrl(): string {
  const url =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export async function sendEmail({
  to,
  subject,
  body,
}: SendEmailInput): Promise<void> {
  if (!emailEnabled()) {
    // Deferral gate: no external mail before the domain is live. Dev convenience:
    // log so the link in `body` is reachable without a mail provider.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:disabled] to=${to}\nsubject: ${subject}\n${body}`);
    }
    return;
  }

  // Session 13: wire the verified-domain sender (Resend) here. The flag is on but
  // no provider exists yet — fail loud rather than silently drop mail in prod.
  throw new Error(
    "AUTH_EMAIL_ENABLED is on but no email provider is configured (Session 13).",
  );
}
