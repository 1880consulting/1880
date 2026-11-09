import { cacheTag } from "next/cache";
import { findRedirect, getPublishedBySlug } from "@/cms/content/store";
import type { EntryDoc } from "@/cms/content/types";
import { mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import type { MediaInfo } from "@/cms/media/types";
import { pageType } from "./cms";

/**
 * The public site's view of published pages. Cached like a static page; the
 * Publish button refreshes a page's cache tag so changes appear at once.
 */

export const pageTag = (slug: string) => `page:${slug || "home"}`;
export const REDIRECTS_TAG = "redirects";
/** On every page that shows an image, so editing the image (alt text, focal point, file) refreshes them. */
export const mediaTag = (id: string) => `media:${id}`;

export interface PublishedPage {
  doc: EntryDoc;
  media: Record<string, MediaInfo>;
}

export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  "use cache";
  cacheTag(pageTag(slug));
  const doc = await getPublishedBySlug("page", slug);
  if (!doc) return null;
  const ids = mediaRefs(pageType, doc).map((r) => r.id);
  for (const id of new Set(ids)) cacheTag(mediaTag(id));
  return { doc, media: await getMediaMany(ids) };
}

export async function getRedirect(path: string): Promise<{ toPath: string; code: number } | null> {
  "use cache";
  cacheTag(REDIRECTS_TAG);
  return findRedirect(path);
}

export { visibleBlocks } from "@/blocks";
