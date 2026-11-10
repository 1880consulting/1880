import { cacheTag } from "next/cache";
import { listPublished } from "@/cms/content/store";
import type { EntryDoc } from "@/cms/content/types";
import { CONTENT_TYPES, type ContentTypeId } from "./cms";
import { listTag } from "./pages";

export interface SiteEntry {
  type: ContentTypeId;
  path: string;
  title: string;
  summary?: string;
  publishedAt: Date | null;
}

/** Every live, indexable page of the site (for sitemap.xml and llms.txt). */
export async function siteEntries(): Promise<SiteEntry[]> {
  "use cache";
  for (const t of Object.keys(CONTENT_TYPES)) cacheTag(listTag(t));
  const out: SiteEntry[] = [];
  for (const t of Object.keys(CONTENT_TYPES) as ContentTypeId[]) {
    let rows: { slug: string; publishedAt: Date | null; doc: EntryDoc }[] = [];
    try {
      rows = await listPublished(t);
    } catch {
      rows = []; // no database (e.g. a build without one): list the fixed pages only
    }
    for (const r of rows) {
      if (r.doc.seo.noindex) continue;
      out.push({
        type: t,
        path: CONTENT_TYPES[t].path(r.slug),
        title: r.doc.seo.title || r.doc.title,
        summary: r.doc.seo.description || (r.doc.fields?.summary as string | undefined),
        publishedAt: r.publishedAt,
      });
    }
  }
  return out;
}

/** Pages written in code rather than in Studio. */
export const FIXED_PAGES = [
  {
    path: "/work",
    title: "Case studies",
    summary: "How 1880 helps growth-stage government contractors tell their stories and grow.",
  },
  {
    path: "/services",
    title: "Services",
    summary: "Strategic marketing and communications for growth-stage government contractors.",
  },
  { path: "/contact", title: "Contact", summary: "Send 1880 a message." },
];
