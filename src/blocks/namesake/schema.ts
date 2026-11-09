import { z } from "zod";
import { defineBlock } from "@/cms/content/types";

/** The story band: the giant "1880." mark, a lead statement, and a short close. */
export const namesakeSchema = z.object({
  type: z.literal("namesake"),
  lead: z.string().min(1).max(200).meta({ title: "Story", multiline: true }),
  detail: z.string().max(200).optional().meta({ title: "Detail", multiline: true }),
  close: z.string().max(80).optional().meta({ title: "Closing line" }),
});

export type NamesakeBlock = z.infer<typeof namesakeSchema>;

export const namesakeBlock = defineBlock({
  type: "namesake",
  label: "1880 story",
  description: "The giant 1880. mark on gray, with a short story beneath.",
  schema: namesakeSchema,
  defaults: { lead: "1880 is named for the year…" },
});
