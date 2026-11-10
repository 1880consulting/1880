import "server-only";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { InquiryRow } from "@/lib/db/schema";
import type { Inquiry } from "@/lib/inquiry";
import { sendMail } from "./mail";
import { getSetting } from "./settings";

/** How many times an alert email is tried before it waits for someone to press Retry. */
export const MAX_ALERT_ATTEMPTS = 5;

export type InquiryView = "new" | "all" | "archived";

const { inquiries } = schema;

/** Saves a contact-form message. Returns its id. */
export async function createInquiry(
  input: Pick<Inquiry, "name" | "email" | "message">,
): Promise<string> {
  const id = randomUUID();
  await db()
    .insert(inquiries)
    .values({ id, name: input.name, email: input.email, message: input.message });
  return id;
}

export async function listInquiries(view: InquiryView, limit = 200): Promise<InquiryRow[]> {
  const where =
    view === "new"
      ? eq(inquiries.status, "new")
      : view === "archived"
        ? eq(inquiries.status, "archived")
        : ne(inquiries.status, "archived");
  return db().select().from(inquiries).where(where).orderBy(desc(inquiries.createdAt)).limit(limit);
}

export async function countInquiries(): Promise<Record<InquiryRow["status"], number>> {
  const rows = await db()
    .select({ status: inquiries.status, n: count() })
    .from(inquiries)
    .groupBy(inquiries.status);
  const out = { new: 0, read: 0, archived: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}

export async function getInquiry(id: string): Promise<InquiryRow | undefined> {
  const [row] = await db().select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
  return row;
}

export async function setInquiryStatus(id: string, status: InquiryRow["status"]): Promise<void> {
  await db()
    .update(inquiries)
    .set({ status, readAt: status === "new" ? null : sql`coalesce(${inquiries.readAt}, now())` })
    .where(eq(inquiries.id, id));
}

/** Opening a new inquiry marks it read. */
export async function markRead(id: string): Promise<void> {
  await db()
    .update(inquiries)
    .set({ status: "read", readAt: sql`now()` })
    .where(and(eq(inquiries.id, id), eq(inquiries.status, "new")));
}

export function studioUrl(id: string): string {
  const base = (process.env.SITE_URL || "https://1880.io").replace(/\/$/, "");
  return `${base}/admin/inquiries/${id}`;
}

export function alertText(row: Pick<InquiryRow, "id" | "name" | "email" | "message">): string {
  return [
    `${row.name} sent a message through the contact form on 1880.io.`,
    "",
    `Name: ${row.name}`,
    `Email: ${row.email}`,
    "",
    row.message,
    "",
    "---",
    `Reply to this email to answer ${row.name} directly.`,
    `Open it in 1880 Studio: ${studioUrl(row.id)}`,
  ].join("\n");
}

/** A send that hasn't finished after this long is treated as crashed and may be retried. */
const CLAIM_TIMEOUT = sql`now() - interval 5 minute`;

/**
 * Emails the team about one inquiry. Claims it in the database first (one
 * atomic update), so two runs at once never send the same alert twice.
 */
export async function sendAlert(id: string): Promise<InquiryRow["alertStatus"]> {
  const [claim] = await db()
    .update(inquiries)
    .set({
      alertAttempts: sql`${inquiries.alertAttempts} + 1`,
      alertStatus: "pending",
      alertClaimedAt: sql`now()`,
    })
    .where(
      and(
        eq(inquiries.id, id),
        ne(inquiries.alertStatus, "sent"),
        or(isNull(inquiries.alertClaimedAt), lt(inquiries.alertClaimedAt, CLAIM_TIMEOUT)),
      ),
    );
  const row = await getInquiry(id);
  if (!row) return "skipped";
  if (claim.affectedRows === 0) return row.alertStatus; // already sent, or another run is sending it

  const recipients = await getSetting("inquiries.alertRecipients");
  if (recipients.length === 0) {
    await finish(id, "skipped", "No alert recipients. Add them in Studio settings.");
    return "skipped";
  }

  const result = await sendMail({
    to: recipients,
    subject: `New inquiry from ${row.name}`,
    text: alertText(row),
    replyTo: row.email,
  });
  if (result.ok) {
    await finish(id, "sent", null);
    return "sent";
  }
  const status = result.configured ? "failed" : "skipped";
  await finish(id, status, result.error);
  return status;
}

async function finish(id: string, alertStatus: InquiryRow["alertStatus"], error: string | null) {
  await db()
    .update(inquiries)
    .set({
      alertStatus,
      alertError: error?.slice(0, 500) ?? null,
      alertClaimedAt: null,
      alertedAt: alertStatus === "sent" ? sql`now()` : undefined,
    })
    .where(eq(inquiries.id, id));
}

/**
 * Tries again for alerts that failed, and ones whose send never finished
 * (e.g. the server restarted mid-send). Runs after each new inquiry, so a
 * temporary email outage heals itself. Alerts that were skipped (no
 * recipients, email not set up) wait for someone to press Retry.
 */
export async function retryAlerts(limit = 10): Promise<number> {
  const rows = await db()
    .select({ id: inquiries.id })
    .from(inquiries)
    .where(
      and(
        lt(inquiries.alertAttempts, MAX_ALERT_ATTEMPTS),
        or(isNull(inquiries.alertClaimedAt), lt(inquiries.alertClaimedAt, CLAIM_TIMEOUT)),
        or(
          eq(inquiries.alertStatus, "failed"),
          and(eq(inquiries.alertStatus, "pending"), lt(inquiries.createdAt, CLAIM_TIMEOUT)),
        ),
      ),
    )
    .orderBy(inquiries.createdAt)
    .limit(limit);
  for (const r of rows) await sendAlert(r.id);
  return rows.length;
}
