import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMail } from "./mail";

const mail = {
  to: ["team@example.com"],
  subject: "New inquiry from Ada\r\nBcc: x@y.z",
  text: "Hi",
  replyTo: "ada@example.com",
};

const fakeFetch = (status: number, body: object) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

afterEach(() => vi.unstubAllEnvs());

describe("sendMail", () => {
  it("says so when email isn't set up, and sends nothing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const f = fakeFetch(200, { id: "x" });
    expect(await sendMail(mail, f)).toMatchObject({ ok: false, configured: false });
    expect(f).not.toHaveBeenCalled();
  });

  it("posts plain text to Resend with reply-to, keeping the subject on one line", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const f = fakeFetch(200, { id: "email_1" });
    expect(await sendMail(mail, f)).toEqual({ ok: true, id: "email_1" });
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body);
    expect(body.subject).toBe("New inquiry from Ada Bcc: x@y.z");
    expect(body.reply_to).toBe("ada@example.com");
    expect(body.text).toBe("Hi");
    expect(body.html).toBeUndefined();
    expect(body.from).toBe("1880 Consulting <notifications@1880.io>");
  });

  it("sends replies to MAIL_REPLY_TO when the email has no reply-to of its own", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_REPLY_TO", "inquiries@1880consulting.com");
    const f = fakeFetch(200, { id: "email_2" });
    await sendMail({ to: ["c@example.com"], subject: "Invite", text: "Hi" }, f);
    const body = JSON.parse((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.reply_to).toBe("inquiries@1880consulting.com");
  });

  it("reports Resend errors", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const r = await sendMail(mail, fakeFetch(422, { message: "Invalid from" }));
    expect(r).toEqual({ ok: false, configured: true, error: "Resend 422: Invalid from" });
  });
});
