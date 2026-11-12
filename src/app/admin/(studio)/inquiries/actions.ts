"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/cms/audit";
import { requireStaff } from "@/cms/auth";
import { sendAlert, setInquiryStatus } from "@/cms/inquiries";

// Server actions are public endpoints: check who's calling and what they sent.
const id = z.uuid();
const status = z.enum(["new", "read", "archived", "spam"]);

export async function changeStatus(inquiryId: string, next: string): Promise<void> {
  const staff = await requireStaff();
  const s = status.parse(next);
  const target = id.parse(inquiryId);
  await setInquiryStatus(target, s);
  if (s === "spam" || s === "archived")
    await audit({ actor: { type: "staff", id: staff.id }, action: `inquiry.${s}`, target });
  // Back to the inbox after "Mark as new": staying on the page would mark it read again.
  if (s === "new") redirect("/admin/inquiries");
  refresh();
}

export async function retryAlert(inquiryId: string): Promise<void> {
  await requireStaff();
  await sendAlert(id.parse(inquiryId));
  refresh();
}
