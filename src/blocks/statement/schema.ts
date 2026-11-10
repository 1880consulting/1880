import { z } from "zod";
import { defineBlock } from "@/cms/content/types";

/** One large sentence on its own band. Words light up as you scroll past. */
export const statementSchema = z.object({
  type: z.literal("statement"),
  text: z.string().min(1).max(160).meta({ title: "Statement", multiline: true }),
});

export type StatementBlock = z.infer<typeof statementSchema>;

export const statementBlock = defineBlock({
  type: "statement",
  label: "Statement",
  description: "One large sentence that lights up word by word as you scroll.",
  schema: statementSchema,
  defaults: { text: "One sentence worth stopping for." },
});
