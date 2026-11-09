import { cacheTag } from "next/cache";
import { findRedirect, getPublishedBySlug } from "@/cms/content/store";
import type { EntryDoc } from "@/cms/content/types";

/**
 * The public site's view of published pages. Cached like a static page; the
 * Publish button refreshes a page's cache tag so changes appear at once.
 */

export const pageTag = (slug: string) => `page:${slug || "home"}`;
export const REDIRECTS_TAG = "redirects";

export async function getPublishedPage(slug: string): Promise<EntryDoc | null> {
  "use cache";
  cacheTag(pageTag(slug));
  return getPublishedBySlug("page", slug);
}

export async function getRedirect(path: string): Promise<{ toPath: string; code: number } | null> {
  "use cache";
  cacheTag(REDIRECTS_TAG);
  return findRedirect(path);
}

export { visibleBlocks } from "@/blocks";
