import type { Metadata } from "next";
import { RenderBlocks } from "@/blocks";
import { home, site } from "@/site/content";
import { getMenus } from "@/site/menus";
import { getPublishedPage, visibleBlocks } from "@/site/pages";
import { entryMetadata, JsonLd, organizationJsonLd } from "@/site/seo";

/**
 * The home page comes from 1880 Studio. Until it's been published there (a
 * fresh database), the built-in copy in src/site/content.ts shows instead.
 */
async function homeContent() {
  try {
    const page = await getPublishedPage("");
    if (page)
      return {
        title: page.doc.seo.title || page.doc.title,
        description: page.doc.seo.description,
        blocks: visibleBlocks(page.doc),
        media: page.media,
        doc: page.doc,
      };
  } catch (err) {
    console.error(
      "[home] could not read the CMS, showing built-in content:",
      err instanceof Error ? err.message : err,
    );
  }
  return { ...home, media: {}, doc: null };
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await homeContent();
  if (page.doc)
    return entryMetadata({ doc: page.doc, path: "/", media: page.media, absoluteTitle: true });
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [page, menus] = await Promise.all([homeContent(), getMenus()]);
  const social = menus.footer.map((l) => l.href).filter((h) => h.startsWith("https://"));
  return (
    <>
      <JsonLd data={organizationJsonLd(social)} />
      <RenderBlocks blocks={page.blocks} context={{ email: site.email, media: page.media }} />
    </>
  );
}
