import "server-only";

export type OutgoingEmail = { to: string; subject: string; text: string; html: string };

/** Sends through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
 * Needs RESEND_API_KEY and EMAIL_FROM (an address on a domain verified in Resend).
 *
 * Unconfigured outside production, the email is printed to the server console instead so
 * flows like password reset can be tested locally. In production it throws — emails can carry
 * one-time links, which must never end up in logs. */
export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email is not configured: set RESEND_API_KEY and EMAIL_FROM.");
    }
    console.info(
      `[email: not configured — dev only] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Email provider rejected the message (HTTP ${response.status}).`);
  }
}
