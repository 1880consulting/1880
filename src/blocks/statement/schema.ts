import { z } from "zod";

/** One large sentence on its own band. Words light up as you scroll past. */
export const statementSchema = z.object({
  type: z.literal("statement"),
  text: z.string().min(1).max(160),
});

export type StatementBlock = z.infer<typeof statementSchema>;
