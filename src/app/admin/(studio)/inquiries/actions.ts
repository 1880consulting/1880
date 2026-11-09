"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { sendAlert, setInquiryStatus } from "@/cms/inquiries";

// Server actions are public endpoints: check who's calling and what they sent.
const id = z.uuid();
const status = z.enum(["new", "read", "archived"]);

export async function changeStatus(inquiryId: string, next: string): Promise<void> {
  await requireStaff();
  const s = status.parse(next);
  await setInquiryStatus(id.parse(inquiryId), s);
  // Back to the inbox after "Mark as new": staying on the page would mark it read again.
  if (s === "new") redirect("/admin/inquiries");
  refresh();
}

export async function retryAlert(inquiryId: string): Promise<void> {
  await requireStaff();
  await sendAlert(id.parse(inquiryId));
  refresh();
}
