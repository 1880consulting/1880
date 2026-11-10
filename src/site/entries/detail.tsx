import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { listPublishedSlugs } from "@/cms/content/store";
import type { WorkFields } from "../collections";
import { CONTENT_TYPES } from "../cms";
import { site } from "../content";
import { getPublishedEntry, getPublishedList, getRedirect } from "../pages";
import { caseStudyJsonLd, entryMetadata, JsonLd, serviceJsonLd } from "../seo";
import { EntryView } from "./EntryView";

/** Shared by /work/[slug] and /services/[slug]. */

const PLACEHOLDER = "__none";

export async function staticParams(type: "work" | "service") {
  try {
    const slugs = (await listPublishedSlugs(type)).filter(Boolean);
    return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: PLACEHOLDER }];
  } catch {
    return [{ slug: PLACEHOLDER }];
  }
}

export async function entryPageMetadata(type: "work" | "service", slug: string): Promise<Metadata> {
  if (slug === PLACEHOLDER) return {};
  const page = await getPublishedEntry(type, slug);
  if (!page) return {};
  const f = (page.doc.fields ?? {}) as { summary?: string; cover?: string };
  return entryMetadata({
    doc: page.doc,
    path: CONTENT_TYPES[type].path(slug),
    media: page.media,
    fallbackDescription: f.summary,
    fallbackImage: f.cover,
    type: type === "work" ? "article" : "website",
  });
}

export async function EntryPage({ type, slug }: { type: "work" | "service"; slug: string }) {
  if (slug === PLACEHOLDER) notFound();
  const page = await getPublishedEntry(type, slug);
  if (!page) {
    const moved = await getRedirect(CONTENT_TYPES[type].path(slug));
    if (moved) permanentRedirect(moved.toPath);
    notFound();
  }
  const [services, work] = await Promise.all([
    getPublishedList("service"),
    type === "service" ? getPublishedList("work") : null,
  ]);
  const me = services.entries.find((sv) => sv.slug === slug);
  const relatedWork =
    type === "service" && work && me
      ? work.entries.filter((w) => (w.doc.fields as Partial<WorkFields>)?.services?.includes(me.id))
      : undefined;
  const path = CONTENT_TYPES[type].path(slug);
  const fields = (page.doc.fields ?? {}) as { client?: string; cover?: string };
  const ld =
    type === "work"
      ? caseStudyJsonLd(
          page.doc,
          path,
          fields.client,
          fields.cover ? page.media[fields.cover] : undefined,
        )
      : serviceJsonLd(page.doc, path);
  return (
    <>
      <JsonLd data={ld} />
      <EntryView
        type={type}
        doc={page.doc}
        media={{ ...services.media, ...(work?.media ?? {}), ...page.media }}
        services={services.entries}
        relatedWork={relatedWork}
        email={site.email}
      />
    </>
  );
}
