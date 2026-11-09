"use server";

import { deliverInquiry, inquirySchema, type InquiryField, type InquiryState } from "@/lib/inquiry";

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

  const result = await deliverInquiry(parsed.data);
  return result === "sent" ? { status: "sent" } : { status: "unavailable", values };
}
