import { IconDownload, IconInbox } from "@tabler/icons-react";
import { Suspense } from "react";
import { requireStaff } from "@/cms/auth";
import { shortDate } from "@/cms/format";
import { countInquiries, listInquiries, type InquiryView } from "@/cms/inquiries";
import {
  buttonClass,
  controls as c,
  EmptyState,
  PageHeader,
  Panel,
  Segments,
  Skeleton,
} from "@/cms/ui";
import { AlertBadge } from "./AlertBadge";
import { SetupNotice } from "./SetupNotice";

export const metadata = { title: "Inquiries" };

const VIEWS: { id: InquiryView; label: string }[] = [
  { id: "new", label: "New" },
  { id: "all", label: "All" },
  { id: "archived", label: "Archived" },
  { id: "spam", label: "Spam" },
];

const EMPTY: Record<InquiryView, { title: string; text: string }> = {
  new: {
    title: "You're all caught up",
    text: "New messages from the contact form on 1880.io land here.",
  },
  all: { title: "No inquiries yet", text: "Messages from the contact form on 1880.io land here." },
  archived: {
    title: "Nothing archived",
    text: "Archive an inquiry once it's handled to clear it from the inbox.",
  },
  spam: {
    title: "No spam",
    text: "Mark junk as spam from its page; it stays here, out of the inbox and the counts.",
  },
};

export default function InquiriesPage({ searchParams }: PageProps<"/admin/inquiries">) {
  return (
    <>
      <PageHeader
        pretitle="1880 Studio"
        title="Inquiries"
        description="Messages from the contact form on 1880.io."
        actions={
          // A file download, not a page: a plain link, so the browser saves it.
          <a
            className={buttonClass("secondary")}
            href="/admin/inquiries/export?view=everything"
            download
          >
            <IconDownload size={18} stroke={2} aria-hidden />
            Export spreadsheet
          </a>
        }
      />
      <Suspense
        fallback={
          <Panel>
            <Skeleton />
          </Panel>
        }
      >
        <Inbox searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Inbox({ searchParams }: Pick<PageProps<"/admin/inquiries">, "searchParams">) {
  await requireStaff();
  const raw = (await searchParams).view;
  const view: InquiryView = VIEWS.some((v) => v.id === raw) ? (raw as InquiryView) : "new";
  const [counts, rows] = await Promise.all([countInquiries(), listInquiries(view)]);

  return (
    <>
      <SetupNotice />
      <Segments
        label="Inquiry views"
        items={VIEWS.map((v) => ({
          label: v.label,
          href: v.id === "new" ? "/admin/inquiries" : `/admin/inquiries?view=${v.id}`,
          count:
            v.id === "new"
              ? counts.new
              : v.id === "all"
                ? counts.new + counts.read
                : v.id === "archived"
                  ? counts.archived
                  : counts.spam,
          current: v.id === view,
        }))}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<IconInbox size={24} stroke={2} aria-hidden />} {...EMPTY[view]} />
      ) : (
        <Panel flush>
          <table className={c.table}>
            <thead>
              <tr>
                <th scope="col">From</th>
                <th scope="col" className={c.hideSm}>
                  Message
                </th>
                <th scope="col">Received</th>
                <th scope="col" className={c.hideSm}>
                  Email alert
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.status === "new" && <span className={c.unread} aria-label="New" />}
                    <a className={c.rowLink} href={`/admin/inquiries/${r.id}`}>
                      {r.name}
                    </a>
                    <div className={c.meta}>{r.email}</div>
                  </td>
                  <td className={c.hideSm}>
                    <span className={c.preview}>{r.message}</span>
                  </td>
                  <td className={`${c.meta} ${c.num}`}>{shortDate(r.createdAt)}</td>
                  <td className={c.hideSm}>
                    <AlertBadge status={r.alertStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
