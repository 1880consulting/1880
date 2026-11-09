import { z } from "zod";
import { anchorSchema, linkSchema } from "../shared";

/** A labeled list of services in large type, hairlines between. */
export const servicesSchema = z.object({
  type: z.literal("services"),
  anchor: anchorSchema,
  eyebrow: z.string().max(40).optional(),
  title: z.string().min(1).max(80),
  items: z.array(z.string().min(1).max(60)).min(1).max(12),
  button: linkSchema.optional(),
});

export type ServicesBlock = z.infer<typeof servicesSchema>;
