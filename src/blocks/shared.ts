import { z } from "zod";

/** A link with a label, e.g. a button. `href` may be "/contact" or "/#what-we-do". */
export const linkSchema = z.object({
  label: z.string().min(1).max(40).meta({ title: "Button text" }),
  href: z.string().min(1).max(300).meta({
    title: "Goes to",
    description: "A page like /contact, a section like /#contact, or a full web address.",
  }),
});

/** Optional in-page anchor (lowercase, hyphens), e.g. "what-we-do". */
export const anchorSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "Use lowercase letters and hyphens, like what-we-do.")
  .max(40)
  .optional()
  .meta({
    title: "Section link name",
    description: "Lets links jump here, e.g. what-we-do for /#what-we-do. Optional.",
  });
