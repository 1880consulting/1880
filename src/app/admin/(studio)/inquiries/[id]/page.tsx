import {
  IconArchive,
  IconBan,
  IconInbox,
  IconMail,
  IconMailOpened,
  IconRefresh,
} from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { longDate } from "@/cms/format";
import { getInquiry, markRead, MAX_ALERT_ATTEMPTS } from "@/cms/inquiries";
import { Button, buttonClass, controls as c, PageHeader, Panel, Skeleton } from "@/cms/ui";
import { changeStatus, retryAlert } from "../actions";
import { AlertBadge, StatusBadge } from "../AlertBadge";

export const metadata = { title: "Inquiry" };

export default function InquiryPage({ params }: PageProps<"/admin/inquiries/[id]">) {
  return (
    <Suspense
      fallback={
        <Panel>
          <Skeleton lines={6} />
        </Panel>
      }
    >
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/admin/inquiries/[id]">, "params">) {
  await requireStaff();
  const { id } = await params;
  const row = z.uuid().safeParse(id).success ? await getInquiry(id) : undefined;
  if (!row) notFound();

  // Opening a new inquiry marks it read (after the page is sent).
  if (row.status === "new") after(() => markRead(row.id));
  const status = row.status === "new" ? "read" : row.status;

  const reply = replyLink(row);
  const canRetry = row.alertStatus !== "sent";

  return (
    <>
      <PageHeader
        pretitle={<Link href="/admin/inquiries">Inquiries</Link>}
        title={row.name}
        description={`Received ${longDate(row.createdAt)}`}
        actions={
          <div className={c.actions}>
            <a className={buttonClass("primary")} href={reply}>
              <IconMail size={18} stroke={2} aria-hidden />
              Reply by email
            </a>
            {status === "spam" ? (
              <form action={changeStatus.bind(null, row.id, "read")}>
                <Button type="submit">
                  <IconInbox size={18} stroke={2} aria-hidden />
                  Not spam
                </Button>
              </form>
            ) : status === "archived" ? (
              <form action={changeStatus.bind(null, row.id, "read")}>
                <Button type="submit">
                  <IconInbox size={18} stroke={2} aria-hidden />
                  Move to inbox
                </Button>
              </form>
            ) : (
              <>
                <form action={changeStatus.bind(null, row.id, "new")}>
                  <Button type="submit" variant="ghost">
                    <IconMailOpened size={18} stroke={2} aria-hidden />
                    Mark as new
                  </Button>
                </form>
                <form action={changeStatus.bind(null, row.id, "spam")}>
                  <Button type="submit" variant="ghost">
                    <IconBan size={18} stroke={2} aria-hidden />
                    Spam
                  </Button>
                </form>
                <form action={changeStatus.bind(null, row.id, "archived")}>
                  <Button type="submit">
                    <IconArchive size={18} stroke={2} aria-hidden />
                    Archive
                  </Button>
                </form>
              </>
            )}
          </div>
        }
      />
      <div className={c.split}>
        <Panel title="Message">
          <p className={c.message}>{row.message}</p>
        </Panel>
        <Panel title="Details">
          <dl className={c.dl}>
            <dt>Name</dt>
            <dd>{row.name}</dd>
            <dt>Email</dt>
            <dd>
              <a href={reply}>{row.email}</a>
            </dd>
            <dt>Status</dt>
            <dd>
              <StatusBadge status={status} />
            </dd>
            <dt>Email alert</dt>
            <dd>
              <AlertBadge status={row.alertStatus} />
              {row.alertedAt && <div className={c.meta}>Sent {longDate(row.alertedAt)}</div>}
              {row.alertError && <div className={c.meta}>{row.alertError}</div>}
              {row.alertStatus === "failed" && row.alertAttempts >= MAX_ALERT_ATTEMPTS && (
                <div className={c.meta}>
                  Tried {row.alertAttempts} times. Retry when email is working again.
                </div>
              )}
            </dd>
          </dl>
          {canRetry && (
            <form action={retryAlert.bind(null, row.id)} style={{ marginTop: 16 }}>
              <Button type="submit" size="sm">
                <IconRefresh size={16} stroke={2} aria-hidden />
                Send alert again
              </Button>
            </form>
          )}
        </Panel>
      </div>
    </>
  );
}

/**
 * Opens the email app with a reply ready: to the sender, a subject, and their
 * message quoted below. Long messages are cut (mail apps cap link length).
 */
function replyLink(row: { name: string; email: string; message: string; createdAt: Date }) {
  const first = row.name.trim().split(/\s+/)[0] || "there";
  const quoted = row.message
    .slice(0, 1500)
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  const body = `Hi ${first},\n\n\n\nOn ${longDate(row.createdAt)}, you wrote:\n${quoted}${row.message.length > 1500 ? "\n> [...]" : ""}`;
  return `mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent("Re: your message to 1880")}&body=${encodeURIComponent(body)}`;
}
