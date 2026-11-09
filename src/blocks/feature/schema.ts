import { z } from "zod";

/** A large heading with a supporting paragraph set off to the right under a rule. */
export const featureSchema = z.object({
  type: z.literal("feature"),
  heading: z.string().min(1).max(160),
  detail: z.string().max(400).optional(),
});

export type FeatureBlock = z.infer<typeof featureSchema>;
