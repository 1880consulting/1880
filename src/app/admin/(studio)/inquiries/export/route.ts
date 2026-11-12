import { connection } from "next/server";
import { audit } from "@/cms/audit";
import { currentStaff } from "@/cms/auth";
import { toCsv } from "@/cms/csv";
import { exportInquiries, type InquiryView } from "@/cms/inquiries";

const VIEWS = ["new", "all", "archived", "spam", "everything"] as const;
const STATUS_LABEL = { new: "New", read: "Read", archived: "Archived", spam: "Spam" };

/** The inquiries in one view (or all of them) as a spreadsheet: /admin/inquiries/export?view=all */
export async function GET(request: Request) {
  await connection();
  const staff = await currentStaff();
  if (!staff) return new Response("Not found", { status: 404 });
  const raw = new URL(request.url).searchParams.get("view") ?? "everything";
  const view = (VIEWS as readonly string[]).includes(raw)
    ? (raw as InquiryView | "everything")
    : "everything";
  const rows = await exportInquiries(view);
  await audit({
    actor: { type: "staff", id: staff.id },
    action: "inquiries.exported",
    detail: { view, rows: rows.length },
  });
  const csv = toCsv(
    ["Received", "Name", "Email", "Message", "Status"],
    rows.map((r) => [r.createdAt, r.name, r.email, r.message, STATUS_LABEL[r.status]]),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="1880-inquiries-${view}-${date}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
