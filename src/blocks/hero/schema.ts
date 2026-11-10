import { z } from "zod";
import { defineBlock } from "@/cms/content/types";
import { linkSchema } from "../shared";

/** Dark full-screen opener: headline, subhead, one button, the big 1880 mark behind. */
export const heroSchema = z.object({
  type: z.literal("hero"),
  title: z.string().min(1).max(120).meta({ title: "Headline" }),
  subtitle: z.string().max(300).optional().meta({ title: "Subhead", multiline: true }),
  button: linkSchema.optional().meta({ title: "Button" }),
});

export type HeroBlock = z.infer<typeof heroSchema>;

export const heroBlock = defineBlock({
  type: "hero",
  label: "Hero",
  description: "Dark opener with a big headline and the 1880 mark. Use once, at the top.",
  schema: heroSchema,
  defaults: { title: "A headline that says what 1880 does." },
});
