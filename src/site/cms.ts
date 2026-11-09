import { contactBandBlock } from "@/blocks/contact-band/schema";
import { featureBlock } from "@/blocks/feature/schema";
import { heroBlock } from "@/blocks/hero/schema";
import { imageBlock } from "@/blocks/image/schema";
import { namesakeBlock } from "@/blocks/namesake/schema";
import { servicesBlock } from "@/blocks/services/schema";
import { statementBlock } from "@/blocks/statement/schema";
import type { ContentType } from "@/cms/content/types";

/**
 * 1880's content types for the CMS engine (src/cms/content). Pages now;
 * case studies and services (PLAN D23) get added here.
 */
export const pageType: ContentType = {
  id: "page",
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

export const CONTENT_TYPES = { page: pageType } as const;
