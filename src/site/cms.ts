import { contactBandBlock } from "@/blocks/contact-band/schema";
import { featureBlock } from "@/blocks/feature/schema";
import { heroBlock } from "@/blocks/hero/schema";
import { imageBlock } from "@/blocks/image/schema";
import { namesakeBlock } from "@/blocks/namesake/schema";
import { servicesBlock } from "@/blocks/services/schema";
import { statementBlock } from "@/blocks/statement/schema";
import type { ContentType } from "@/cms/content/types";
import { serviceFields, workFields } from "./collections";

/**
 * 1880's content types for the CMS engine (src/cms/content). Pages now;
 * case studies and services (PLAN D23) get added here.
 */
export const pageType: ContentType = {
  id: "page",
  allowHome: true,
  label: "Page",
  plural: "Pages",
  path: (slug) => (slug ? `/${slug}` : "/"),
  // Addresses the app already uses, or keeps for later.
  reservedSlugs: [
    "admin",
    "api",
    "contact",
    "portal",
    "login",
    "logout",
    "auth",
    "account",
    "settings",
    "studio",
    "preview",
    "assets",
    "static",
    "images",
    "files",
    "media",
    "health",
    "search",
    "work",
    "services",
    "feed",
    "rss",
    "sitemap",
    "robots",
    "llms",
    "favicon",
  ],
  blocks: [
    heroBlock,
    statementBlock,
    featureBlock,
    imageBlock,
    namesakeBlock,
    servicesBlock,
    contactBandBlock,
  ],
};

/** The sections a case study or service page can use (its header comes from its fields). */
const collectionBlocks = [
  featureBlock,
  imageBlock,
  statementBlock,
  servicesBlock,
  contactBandBlock,
];

/** Case studies at /work/<address>, listed on /work. */
export const workType: ContentType = {
  id: "work",
  label: "Case study",
  plural: "Case studies",
  path: (slug) => `/work/${slug}`,
  reservedSlugs: [],
  blocks: collectionBlocks,
  fields: workFields,
  fieldDefaults: { services: [] },
  requiresBlocks: false,
};

/** Services at /services/<address>, listed on /services. */
export const serviceType: ContentType = {
  id: "service",
  label: "Service",
  plural: "Services",
  path: (slug) => `/services/${slug}`,
  reservedSlugs: [],
  blocks: collectionBlocks,
  fields: serviceFields,
  fieldDefaults: { order: 100 },
  requiresBlocks: false,
};

export const CONTENT_TYPES = { page: pageType, work: workType, service: serviceType } as const;
export type ContentTypeId = keyof typeof CONTENT_TYPES;
