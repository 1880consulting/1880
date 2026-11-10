import type { MetadataRoute } from "next";
import { absolute } from "@/site/seo";
import { FIXED_PAGES, siteEntries } from "@/site/sitemap-data";

/** /sitemap.xml: every live, indexable page. Refreshes when anything is published. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await siteEntries();
  const paths = new Set(entries.map((e) => e.path));
  return [
    ...entries.map((e) => ({
      url: absolute(e.path),
      lastModified: e.publishedAt ?? undefined,
      priority: e.path === "/" ? 1 : e.type === "page" ? 0.8 : 0.6,
    })),
    ...(paths.has("/") ? [] : [{ url: absolute("/"), priority: 1 }]),
    ...FIXED_PAGES.map((p) => ({ url: absolute(p.path), priority: 0.7 })),
  ];
}
