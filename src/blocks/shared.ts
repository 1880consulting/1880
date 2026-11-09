import { z } from "zod";

/** A link with a label, e.g. a button. `href` may be "/contact" or "/#what-we-do". */
export const linkSchema = z.object({
  label: z.string().min(1).max(40),
  href: z.string().min(1),
});

/** Optional in-page anchor (lowercase, hyphens), e.g. "what-we-do". */
export const anchorSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/)
  .optional();
