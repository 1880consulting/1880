import "server-only";

/**
 * Sends email through Resend's HTTP API (PLAN §2.4). Plain text only, so
 * nothing a visitor types can turn into HTML in someone's inbox.
 *
 * Settings: RESEND_API_KEY, and MAIL_FROM (default "1880 Consulting
 * <notifications@1880.io>", PLAN D51), and MAIL_REPLY_TO for replies. Without a key nothing is
 * sent and the result says why.
 */

export interface Mail {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
}

export type MailResult =
  { ok: true; id: string } | { ok: false; error: string; configured: boolean };

const DEFAULT_FROM = "1880 Consulting <notifications@1880.io>";

/** Keeps a header value on one line. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

const replyTo = (v?: string) => (v?.trim() ? oneLine(v) : undefined);

export async function sendMail(mail: Mail, fetchImpl: typeof fetch = fetch): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      ok: false,
      configured: false,
      error: "Email isn't set up yet (RESEND_API_KEY is missing).",
    };
  }
  if (mail.to.length === 0) {
    return { ok: false, configured: true, error: "No recipients." };
  }

  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || DEFAULT_FROM,
        to: mail.to,
        subject: oneLine(mail.subject).slice(0, 200),
        text: mail.text,
        // Where replies go: the email's own (an inquiry alert replies to the
        // visitor), else MAIL_REPLY_TO, since the sending address has no mailbox.
        reply_to: replyTo(mail.replyTo ?? process.env.MAIL_REPLY_TO),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) {
      return {
        ok: false,
        configured: true,
        error: `Resend ${res.status}: ${body.message ?? "no details"}`,
      };
    }
    return { ok: true, id: body.id };
  } catch (err) {
    return { ok: false, configured: true, error: err instanceof Error ? err.message : String(err) };
  }
}
