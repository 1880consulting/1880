import { z } from "zod";
import { defineBlock } from "@/cms/content/types";
import { anchorSchema, linkSchema } from "../shared";

/** Dark call to action: heading, a line of copy, a button, and a copyable email. */
export const contactBandSchema = z.object({
  type: z.literal("contact-band"),
  anchor: anchorSchema,
  title: z.string().min(1).max(60).meta({ title: "Title" }),
  body: z.string().max(300).optional().meta({ title: "Text", multiline: true }),
  button: linkSchema.optional().meta({ title: "Button" }),
  showEmail: z.boolean().default(true).meta({ title: "Show the email address with a Copy button" }),
});

export type ContactBandBlock = z.infer<typeof contactBandSchema>;

export const contactBandBlock = defineBlock({
  type: "contact-band",
  label: "Contact band",
  description: "Dark call to action with a button and the email address.",
  schema: contactBandSchema,
  defaults: { title: "Contact Us", showEmail: true },
});
