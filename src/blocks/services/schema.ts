import { z } from "zod";
import { defineBlock } from "@/cms/content/types";
import { anchorSchema, linkSchema } from "../shared";

/** A labeled list of services in large type, hairlines between. */
export const servicesSchema = z.object({
  type: z.literal("services"),
  anchor: anchorSchema,
  eyebrow: z
    .string()
    .max(40)
    .optional()
    .meta({ title: "Small label", description: "Shown above the title, e.g. // What we do." }),
  title: z.string().min(1).max(80).meta({ title: "Title" }),
  items: z
    .array(z.string().min(1).max(60))
    .min(1)
    .max(12)
    .meta({ title: "Services", description: "One per line in the list." }),
  button: linkSchema.optional().meta({ title: "Button" }),
});

export type ServicesBlock = z.infer<typeof servicesSchema>;

export const servicesBlock = defineBlock({
  type: "services",
  label: "Services list",
  description: "A title and a list of services in large type, with hairlines between.",
  schema: servicesSchema,
  defaults: { title: "What we do", items: ["First service"] },
});
