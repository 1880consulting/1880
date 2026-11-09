import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("./mail", () => ({ sendMail: send }));

import { closeDb, db, schema } from "@/lib/db";
import {
  alertText,
  countInquiries,
  createInquiry,
  getInquiry,
  listInquiries,
  markRead,
  MAX_ALERT_ATTEMPTS,
  retryAlerts,
  sendAlert,
  setInquiryStatus,
} from "./inquiries";
import { setSetting } from "./settings";

/*
 * Runs against the local MySQL (`npm run db:up && npm run db:migrate`) or the
 * CI database. Each test starts from empty tables.
 */
let reachable = true;
beforeAll(async () => {
  try {
    await db().select().from(schema.settings).limit(1);
  } catch {
    reachable = false;
  }
});
afterAll(async () => {
  await closeDb();
});
beforeEach(async (ctx) => {
  if (!reachable) ctx.skip();
  await db().delete(schema.inquiries);
  await db().delete(schema.settings);
  send.mockReset();
});

const ada = { name: "Ada Lovelace", email: "ada@example.com", message: "Can we talk positioning?" };

describe("inquiries", () => {
  it("saves a message as new, with an alert pending", async () => {
    const id = await createInquiry(ada);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const row = await getInquiry(id);
    expect(row).toMatchObject({ ...ada, status: "new", alertStatus: "pending", alertAttempts: 0 });
  });

  it("skips the alert when no one is set to receive it", async () => {
    const id = await createInquiry(ada);
    expect(await sendAlert(id)).toBe("skipped");
    expect(send).not.toHaveBeenCalled();
    expect((await getInquiry(id))?.alertError).toMatch(/No alert recipients/);
  });

  it("emails the recipients, with reply-to set to the sender", async () => {
    await setSetting("inquiries.alertRecipients", ["team@1880consulting.com"]);
    send.mockResolvedValue({ ok: true, id: "e1" });
    const id = await createInquiry(ada);
    expect(await sendAlert(id)).toBe("sent");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["team@1880consulting.com"],
        replyTo: ada.email,
        subject: "New inquiry from Ada Lovelace",
      }),
    );
    const row = await getInquiry(id);
    expect(row).toMatchObject({ alertStatus: "sent", alertAttempts: 1, alertError: null });
    expect(row?.alertedAt).toBeInstanceOf(Date);

    // Already sent: a second call sends nothing.
    expect(await sendAlert(id)).toBe("sent");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("never sends the same alert twice when two runs race", async () => {
    await setSetting("inquiries.alertRecipients", ["team@1880consulting.com"]);
    send.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { ok: true, id: "e1" };
    });
    const id = await createInquiry(ada);
    await Promise.all([sendAlert(id), sendAlert(id), sendAlert(id)]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("retries failed alerts until they go through, up to the limit", async () => {
    await setSetting("inquiries.alertRecipients", ["team@1880consulting.com"]);
    send.mockResolvedValue({ ok: false, configured: true, error: "Resend 500: down" });
    const id = await createInquiry(ada);
    expect(await sendAlert(id)).toBe("failed");

    send.mockResolvedValue({ ok: true, id: "e2" });
    expect(await retryAlerts()).toBe(1);
    expect((await getInquiry(id))?.alertStatus).toBe("sent");

    // A message that has used up its tries waits for someone to press Retry.
    const stuck = await createInquiry({ ...ada, name: "Stuck" });
    await db()
      .update(schema.inquiries)
      .set({ alertStatus: "failed", alertAttempts: MAX_ALERT_ATTEMPTS })
      .where(eq(schema.inquiries.id, stuck));
    expect(await retryAlerts()).toBe(0);
  });

  it("lists by view and counts by status", async () => {
    const a = await createInquiry(ada);
    const b = await createInquiry({ ...ada, name: "Grace" });
    const c = await createInquiry({ ...ada, name: "Mary" });
    await markRead(b);
    await setInquiryStatus(c, "archived");

    expect((await listInquiries("new")).map((r) => r.id)).toEqual([a]);
    expect((await listInquiries("all")).map((r) => r.id).sort()).toEqual([a, b].sort());
    expect((await listInquiries("archived")).map((r) => r.id)).toEqual([c]);
    expect(await countInquiries()).toEqual({ new: 1, read: 1, archived: 1 });

    // Mark as new again clears the read time.
    await setInquiryStatus(b, "new");
    expect((await getInquiry(b))?.readAt).toBeNull();
  });

  it("writes an alert email the team can act on", () => {
    const text = alertText({ id: "abc", ...ada });
    expect(text).toContain("Email: ada@example.com");
    expect(text).toContain(ada.message);
    expect(text).toContain("https://1880.io/admin/inquiries/abc");
  });
});
