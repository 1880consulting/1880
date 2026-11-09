import { z } from "zod";
import { linkSchema } from "../shared";

/** Dark full-screen opener: headline, subhead, one button, the big 1880 mark behind. */
export const heroSchema = z.object({
  type: z.literal("hero"),
  title: z.string().min(1).max(120),
  subtitle: z.string().max(300).optional(),
  button: linkSchema.optional(),
});

export type HeroBlock = z.infer<typeof heroSchema>;
