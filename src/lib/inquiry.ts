import { z } from "zod";

/** What the contact form sends (PLAN D27). `website` is a honeypot: people never see it. */
export const inquirySchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(200, "Use 200 characters or fewer."),
  email: z
    .string()
    .trim()
    .max(320, "Use 320 characters or fewer.")
    .pipe(z.email("Enter a full email address, like name@company.com.")),
  message: z
    .string()
    .trim()
    .min(1, "Enter a message.")
    .max(5000, "Keep your message under 5,000 characters."),
  website: z.string().max(0).optional(),
});

export type Inquiry = z.infer<typeof inquirySchema>;

export type InquiryField = "name" | "email" | "message";

export interface InquiryState {
  status: "idle" | "sent" | "invalid" | "unavailable";
  errors?: Partial<Record<InquiryField, string>>;
  values?: Partial<Record<InquiryField, string>>;
}
