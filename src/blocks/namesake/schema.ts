import { z } from "zod";

/** The story band: the giant "1880." mark, a lead statement, and a short close. */
export const namesakeSchema = z.object({
  type: z.literal("namesake"),
  lead: z.string().min(1).max(200),
  detail: z.string().max(200).optional(),
  close: z.string().max(80).optional(),
});

export type NamesakeBlock = z.infer<typeof namesakeSchema>;
