import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { RenderBlocks } from "@/blocks";
import { listPublishedSlugs } from "@/cms/content/store";
import { site } from "@/site/content";
import { getPublishedPage, getRedirect, visibleBlocks } from "@/site/pages";

/** Pages made in 1880 Studio, at 1880.io/<address>. */

// The first visit to an address waits for the whole page instead of streaming
// a frame first, so a missing page answers with a real 404 (and a moved one
// with a real redirect). Both lookups are cached, so this stays static.
export const ensureStatic = "navigation";

// Published pages are built ahead of time; new ones on their first visit.
// Cache Components needs at least one value, so an empty site gets a placeholder that 404s.
const PLACEHOLDER = "__none";
export async function generateStaticParams() {
  try {
    const slugs = (await listPublishedSlugs("page")).filter(Boolean);
    return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: PLACEHOLDER }];
  } catch {
    return [{ slug: PLACEHOLDER }];
  }
}

async function load(slug: string) {
  return slug === PLACEHOLDER ? null : getPublishedPage(slug);
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) return {};
  return {
    title: page.doc.seo.title || page.doc.title,
    description: page.doc.seo.description,
    alternates: { canonical: `/${slug}` },
  };
}

export default async function CmsPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  if (slug === PLACEHOLDER) notFound();
  const page = await load(slug);
  if (!page) {
    // A page that moved: send visitors (and search engines) to its new address.
    const moved = await getRedirect(`/${slug}`);
    if (moved) permanentRedirect(moved.toPath);
    notFound();
  }
  return (
    <RenderBlocks
      blocks={visibleBlocks(page.doc)}
      context={{ email: site.email, media: page.media }}
    />
  );
}
