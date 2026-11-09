import type { Metadata } from "next";
import { RenderBlocks } from "@/blocks";
import { home, site } from "@/site/content";
import { getPublishedPage, visibleBlocks } from "@/site/pages";

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
      };
  } catch (err) {
    console.error(
      "[home] could not read the CMS, showing built-in content:",
      err instanceof Error ? err.message : err,
    );
  }
  return { ...home, media: {} };
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await homeContent();
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const page = await homeContent();
  return <RenderBlocks blocks={page.blocks} context={{ email: site.email, media: page.media }} />;
}
