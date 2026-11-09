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
    const doc = await getPublishedPage("");
    if (doc)
      return {
        title: doc.seo.title || doc.title,
        description: doc.seo.description,
        blocks: visibleBlocks(doc),
      };
  } catch (err) {
    console.error(
      "[home] could not read the CMS, showing built-in content:",
      err instanceof Error ? err.message : err,
    );
  }
  return home;
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
  return <RenderBlocks blocks={page.blocks} context={{ email: site.email }} />;
}
