import { z } from "zod";
import { defineBlock } from "@/cms/content/types";

/** One image from the media library: framed in the text column, or the full width of the screen. */
export const imageSchema = z.object({
  type: z.literal("image"),
  image: z.string().min(1).max(36).meta({ title: "Image", media: true }),
  layout: z.enum(["framed", "full"]).default("framed").meta({
    title: "Layout",
    description: "framed: within the page's margins. full: edge to edge.",
  }),
  caption: z.string().max(200).optional().meta({ title: "Caption" }),
});

export type ImageBlock = z.infer<typeof imageSchema>;

export const imageBlock = defineBlock({
  type: "image",
  label: "Image",
  description:
    "A photo or graphic from the media library, framed or full width, with an optional caption.",
  schema: imageSchema,
  defaults: { image: "", layout: "framed" },
});
