import { cacheTag } from "next/cache";
import { findRedirect, getPublishedBySlug, listPublished } from "@/cms/content/store";
import type { EntryDoc } from "@/cms/content/types";
import { mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import type { MediaInfo } from "@/cms/media/types";
import { CONTENT_TYPES, type ContentTypeId } from "./cms";

/**
 * The public site's view of published content. Cached like static pages;
 * Publish refreshes the right cache tags so changes appear at once.
 */

/** One entry's page. Pages keep their original "page:<slug>" tags. */
export const entryTag = (type: string, slug: string) => `${type}:${slug || "home"}`;
export const pageTag = (slug: string) => entryTag("page", slug);
/** Every listing of a type (e.g. /work), and pages that show other entries' titles. */
export const listTag = (type: string) => `list:${type}`;
export const REDIRECTS_TAG = "redirects";
/** On every page that shows an image, so editing the image (alt text, focal point, file) refreshes them. */
export const mediaTag = (id: string) => `media:${id}`;

export interface PublishedPage {
  doc: EntryDoc;
  media: Record<string, MediaInfo>;
}

export async function getPublishedEntry(
  type: ContentTypeId,
  slug: string,
): Promise<PublishedPage | null> {
  "use cache";
  cacheTag(entryTag(type, slug));
  const doc = await getPublishedBySlug(type, slug);
  if (!doc) return null;
  const ids = mediaRefs(CONTENT_TYPES[type], doc).map((r) => r.id);
  for (const id of new Set(ids)) cacheTag(mediaTag(id));
  return { doc, media: await getMediaMany(ids) };
}

export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  return getPublishedEntry("page", slug);
}

export interface ListedEntry {
  id: string;
  slug: string;
  path: string;
  doc: EntryDoc;
}

/**
 * Every live entry of a type, in display order: services by their Order
 * field, then title; case studies newest first. Plus the images they use.
 */
export async function getPublishedList(
  type: ContentTypeId,
): Promise<{ entries: ListedEntry[]; media: Record<string, MediaInfo> }> {
  "use cache";
  cacheTag(listTag(type));
  const rows = await listPublished(type);
  const order = (d: EntryDoc) => Number((d.fields as { order?: number } | undefined)?.order ?? 100);
  rows.sort((a, b) =>
    type === "service"
      ? order(a.doc) - order(b.doc) || a.doc.title.localeCompare(b.doc.title)
      : (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );
  const ids = rows.flatMap((r) => mediaRefs(CONTENT_TYPES[type], r.doc).map((m) => m.id));
  for (const id of new Set(ids)) cacheTag(mediaTag(id));
  return {
    entries: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      path: CONTENT_TYPES[type].path(r.slug),
      doc: r.doc,
    })),
    media: await getMediaMany(ids),
  };
}

export async function getRedirect(path: string): Promise<{ toPath: string; code: number } | null> {
  "use cache";
  cacheTag(REDIRECTS_TAG);
  return findRedirect(path);
}

export { visibleBlocks } from "@/blocks";
