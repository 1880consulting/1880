import { z } from "zod";
import { anchorSchema, linkSchema } from "../shared";

/** Dark call to action: heading, a line of copy, a button, and a copyable email. */
export const contactBandSchema = z.object({
  type: z.literal("contact-band"),
  anchor: anchorSchema,
  title: z.string().min(1).max(60),
  body: z.string().max(300).optional(),
  button: linkSchema.optional(),
  /** Show the site's email address with a Copy button. */
  showEmail: z.boolean().default(true),
});

export type ContactBandBlock = z.infer<typeof contactBandSchema>;
