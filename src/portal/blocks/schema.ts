import { z } from "zod";
import { defineBlock, type ContentType } from "@/cms/content/types";

/**
 * The portal's document blocks (PLAN §3.5, format 1): what a CMS-built
 * report or proposal is assembled from. Studio's editor builds its forms from
 * these schemas, like the public site's blocks.
 */

export const textSchema = z.object({
  type: z.literal("text"),
  heading: z.string().max(120).optional().meta({ title: "Heading" }),
  body: z.string().min(1).max(8000).meta({
    title: "Text",
    description:
      "Leave a blank line between paragraphs. Start lines with “- ” for a bulleted list.",
    multiline: true,
  }),
});

export const statsSchema = z.object({
  type: z.literal("stats"),
  heading: z.string().max(120).optional().meta({ title: "Heading" }),
  stats: z
    .array(
      z.object({
        value: z
          .string()
          .min(1)
          .max(16)
          .meta({ title: "Number", description: "e.g. 42%, $1.2M, 3×" }),
        label: z.string().min(1).max(80).meta({ title: "What it means" }),
      }),
    )
    .min(1)
    .max(4)
    .meta({ title: "Stats", itemLabel: "Stat" }),
});

export const imageSchema = z.object({
  type: z.literal("image"),
  image: z.string().min(1).max(36).meta({
    title: "Image",
    media: true,
    description:
      "From the media library. Anyone with an image's address can open it, so keep confidential material in a file instead.",
  }),
  caption: z.string().max(200).optional().meta({ title: "Caption" }),
});

/** YouTube or Vimeo links. Embedded through YouTube's privacy-enhanced (no-cookie) player. */
export const VIDEO_PATTERN =
  /^https:\/\/(?:(?:www\.)?youtube\.com\/watch\?v=[\w-]{6,20}|youtu\.be\/[\w-]{6,20}|(?:www\.)?vimeo\.com\/\d{4,12})(?:[?&#].*)?$/;

export const videoSchema = z.object({
  type: z.literal("video"),
  url: z.string().min(1).max(300).regex(VIDEO_PATTERN, "Use a YouTube or Vimeo link.").meta({
    title: "Video link",
    description: "A YouTube or Vimeo address, like https://youtu.be/… or https://vimeo.com/….",
  }),
  caption: z.string().max(200).optional().meta({ title: "Caption" }),
});

export const filesSchema = z.object({
  type: z.literal("files"),
  heading: z.string().max(120).optional().meta({ title: "Heading" }),
  files: z.array(z.string()).min(1).max(30).meta({
    title: "Files",
    description: "Upload files under “Attachments” first; they appear here to choose.",
    ref: "attachments",
  }),
});

export const timelineSchema = z.object({
  type: z.literal("timeline"),
  heading: z.string().max(120).optional().meta({ title: "Heading" }),
  items: z
    .array(
      z.object({
        when: z
          .string()
          .min(1)
          .max(40)
          .meta({ title: "When", description: "e.g. March 2026, Week 3" }),
        title: z.string().min(1).max(120).meta({ title: "Milestone" }),
        detail: z.string().max(300).optional().meta({ title: "Detail" }),
        done: z.boolean().optional().meta({ title: "Done" }),
      }),
    )
    .min(1)
    .max(30)
    .meta({ title: "Milestones", itemLabel: "Milestone" }),
});

export const portalBlockSchema = z.discriminatedUnion("type", [
  textSchema,
  statsSchema,
  imageSchema,
  videoSchema,
  filesSchema,
  timelineSchema,
]);
export type PortalBlock = z.infer<typeof portalBlockSchema>;

export const PORTAL_BLOCKS = [
  defineBlock({
    type: "text",
    label: "Text",
    description: "A heading and paragraphs, with simple bulleted lists.",
    schema: textSchema,
    defaults: { body: "" },
  }),
  defineBlock({
    type: "stats",
    label: "Stats",
    description: "Up to four big numbers with a line each.",
    schema: statsSchema,
    defaults: { stats: [{ value: "", label: "" }] },
  }),
  defineBlock({
    type: "image",
    label: "Image",
    description: "A chart, photo or graphic from the media library, with a caption.",
    schema: imageSchema,
    defaults: { image: "" },
  }),
  defineBlock({
    type: "video",
    label: "Video",
    description: "A YouTube or Vimeo video, played in the page.",
    schema: videoSchema,
    defaults: { url: "" },
  }),
  defineBlock({
    type: "files",
    label: "Files",
    description: "Downloads: decks, spreadsheets, PDFs attached to this document.",
    schema: filesSchema,
    defaults: { files: [] },
  }),
  defineBlock({
    type: "timeline",
    label: "Timeline",
    description: "Milestones with dates, marked done as you go.",
    schema: timelineSchema,
    defaults: { items: [{ when: "", title: "" }] },
  }),
];

/** A document's own fields, above its sections. */
export const documentFields = z.object({
  summary: z.string().max(240).optional().meta({
    title: "Summary",
    description: "One or two sentences, shown in the client's list of documents.",
    multiline: true,
  }),
});

/** Documents as a content type, so the shared editor and publish checks work for them. */
export const documentType: ContentType = {
  id: "document",
  label: "document",
  plural: "Documents",
  path: () => "",
  reservedSlugs: [],
  blocks: PORTAL_BLOCKS,
  fields: documentFields,
  fieldDefaults: {},
};

/** The embeddable player address for a YouTube or Vimeo link. */
export function videoEmbedUrl(url: string): string | null {
  if (!VIDEO_PATTERN.test(url)) return null;
  const u = new URL(url);
  if (u.hostname.endsWith("vimeo.com")) {
    const id = u.pathname.split("/")[1];
    return `https://player.vimeo.com/video/${id}?dnt=1`;
  }
  const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

/** Visible blocks that fit their schema, ready for <PortalBlocks>. */
export function visiblePortalBlocks(doc: {
  blocks: { hidden?: boolean; type: string }[];
}): PortalBlock[] {
  return doc.blocks.flatMap((b) => {
    if (b.hidden) return [];
    const parsed = portalBlockSchema.safeParse(b);
    return parsed.success ? [parsed.data] : [];
  });
}
