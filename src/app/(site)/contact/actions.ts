"use server";

import { after } from "next/server";
import { createInquiry, retryAlerts, sendAlert } from "@/cms/inquiries";
import { inquirySchema, type InquiryField, type InquiryState } from "@/lib/inquiry";

export async function sendInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  const raw = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    message: String(form.get("message") ?? ""),
    website: String(form.get("website") ?? ""),
  };

  // Bots fill the hidden field. Look successful so they move on.
  if (raw.website) return { status: "sent" };

  const parsed = inquirySchema.safeParse(raw);
  const values = { name: raw.name, email: raw.email, message: raw.message };
  if (!parsed.success) {
    const errors: InquiryState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as InquiryField;
      errors[field] ??= issue.message;
    }
    return { status: "invalid", errors, values };
  }

  // Save first: once it's in the inbox, the lead is safe even if email fails.
  let id: string;
  try {
    id = await createInquiry(parsed.data);
  } catch (err) {
    console.error("[contact] could not save inquiry", err);
    return { status: "unavailable", values };
  }

  // Email the team after the response is sent, then retry any earlier alerts
  // that failed. Errors here never reach the visitor: the inquiry is saved.
  after(async () => {
    try {
      await sendAlert(id);
      await retryAlerts();
    } catch (err) {
      console.error("[contact] alert email", err);
    }
  });

  return { status: "sent" };
}
