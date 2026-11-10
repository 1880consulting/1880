import { z } from "zod";

/**
 * The own fields of 1880's collections (PLAN D23). Labels and help come from
 * `.meta()`; Studio builds the form from these.
 */

export const workFields = z.object({
  client: z.string().max(80).optional().meta({
    title: "Client",
    description: "Shown above the title. Leave blank to keep the client private.",
  }),
  summary: z.string().min(1).max(300).meta({
    title: "Summary",
    description: "One or two sentences, for the work page and the top of this one.",
    multiline: true,
  }),
  cover: z.string().max(36).optional().meta({ title: "Cover image", media: true }),
  services: z.array(z.uuid()).max(6).default([]).meta({
    title: "Services",
    ref: "service",
    description: "Which services this work shows. The work page can be filtered by them.",
  }),
  results: z.array(z.string().min(1).max(120)).max(6).optional().meta({
    title: "Results",
    description: "Key outcomes, one per line, e.g. “Won a $40M recompete”.",
  }),
});
export type WorkFields = z.infer<typeof workFields>;

export const serviceFields = z.object({
  summary: z.string().min(1).max(300).meta({
    title: "Summary",
    description: "One or two sentences, for the services page and the top of this one.",
    multiline: true,
  }),
  cover: z.string().max(36).optional().meta({ title: "Cover image", media: true }),
  order: z
    .number()
    .int()
    .min(0)
    .max(999)
    .default(100)
    .meta({ title: "Order", description: "Lower numbers show first on the services page." }),
});
export type ServiceFields = z.infer<typeof serviceFields>;
