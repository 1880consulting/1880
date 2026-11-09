import { z } from "zod";
import { defineBlock } from "@/cms/content/types";

/** A large heading with a supporting paragraph set off to the right under a rule. */
export const featureSchema = z.object({
  type: z.literal("feature"),
  heading: z.string().min(1).max(160).meta({ title: "Heading", multiline: true }),
  detail: z.string().max(400).optional().meta({ title: "Supporting text", multiline: true }),
});

export type FeatureBlock = z.infer<typeof featureSchema>;

export const featureBlock = defineBlock({
  type: "feature",
  label: "Heading and text",
  description: "A large heading with a paragraph set off to the right under a rule.",
  schema: featureSchema,
  defaults: { heading: "A clear point, in a sentence or two." },
});
