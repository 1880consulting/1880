import type { Metadata } from "next";
import type { EntryDoc } from "@/cms/content/types";
import { SHARE_SIZE } from "@/cms/media/process";
import { shareImageUrl, type MediaInfo } from "@/cms/media/types";
import { site } from "./content";

/** Where the site lives, for absolute links in sitemaps, share tags and structured data. */
export const SITE_URL = (process.env.SITE_URL || "https://1880.io").replace(/\/$/, "");
export const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;

/**
 * Search and share tags for a published entry (PLAN §3.2 point 8): title,
 * description, canonical address, share image (1200×630 JPEG cropped at the
 * focal point), and "noindex" when the editor hid the page from search.
 */
export function entryMetadata({
  doc,
  path,
  media,
  absoluteTitle,
  fallbackDescription,
  fallbackImage,
  type = "website",
}: {
  doc: EntryDoc;
  path: string;
  media: Record<string, MediaInfo>;
  /** Use the title as is (the home page), instead of "Title | 1880 Consulting". */
  absoluteTitle?: boolean;
  fallbackDescription?: string;
  fallbackImage?: string;
  type?: "website" | "article";
}): Metadata {
  const title = doc.seo.title || doc.title;
  const description = doc.seo.description || fallbackDescription || summarize(doc.blocks);
  const imageId = doc.seo.image || fallbackImage;
  const image = imageId ? media[imageId] : undefined;
  const images = image
    ? [
        {
          url: absolute(shareImageUrl(image)),
          width: SHARE_SIZE.width,
          height: SHARE_SIZE.height,
          alt: image.alt,
        },
      ]
    : undefined;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: absolute(path), type, siteName: site.name, images },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: images?.map((i) => i.url),
    },
    robots: doc.seo.noindex ? { index: false, follow: true } : undefined,
  };
}

/**
 * Structured data for search engines. JSON is escaped so text an editor typed
 * can never close the script tag: this is the one sanctioned use of
 * dangerouslySetInnerHTML (see CLAUDE.md), and browsers never run it.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/[\u2028\u2029]/g, "");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function organizationJsonLd(sameAs: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: SITE_URL,
    email: site.email,
    logo: absolute("/icon.png"),
    sameAs,
    description:
      "1880 is a storytelling company. We help founders and executive teams at growth-stage government contractors tell their stories and grow.",
  };
}

export function caseStudyJsonLd(doc: EntryDoc, path: string, client?: string, image?: MediaInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: doc.title,
    description: doc.seo.description || (doc.fields?.summary as string | undefined),
    url: absolute(path),
    about: client ? { "@type": "Organization", name: client } : undefined,
    image: image ? absolute(shareImageUrl(image)) : undefined,
    publisher: { "@type": "Organization", name: site.name, url: SITE_URL },
  };
}

export function serviceJsonLd(doc: EntryDoc, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: doc.title,
    description: doc.seo.description || (doc.fields?.summary as string | undefined),
    url: absolute(path),
    provider: { "@type": "Organization", name: site.name, url: SITE_URL },
    audience: { "@type": "BusinessAudience", name: "Growth-stage government contractors" },
  };
}

/**
 * A description for pages without one: the first real sentence or two of the
 * page's text, cut at a word near 160 characters (what search results show).
 */
export function summarize(value: unknown): string | undefined {
  const texts: string[] = [];
  const walk = (v: unknown, key = "") => {
    if (texts.join(" ").length > 200) return;
    if (typeof v === "string") {
      if (key !== "id" && key !== "type" && /\s/.test(v.trim())) texts.push(v.trim());
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, k);
  };
  walk(value);
  const text = texts.join(" ").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "") + "…";
}
