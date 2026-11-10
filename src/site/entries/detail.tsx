import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { listPublishedSlugs } from "@/cms/content/store";
import type { WorkFields } from "../collections";
import { CONTENT_TYPES } from "../cms";
import { site } from "../content";
import { getPublishedEntry, getPublishedList, getRedirect } from "../pages";
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

export async function entryMetadata(type: "work" | "service", slug: string): Promise<Metadata> {
  if (slug === PLACEHOLDER) return {};
  const page = await getPublishedEntry(type, slug);
  if (!page) return {};
  const summary = (page.doc.fields as { summary?: string } | undefined)?.summary;
  return {
    title: page.doc.seo.title || page.doc.title,
    description: page.doc.seo.description || summary,
    alternates: { canonical: CONTENT_TYPES[type].path(slug) },
  };
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
  return (
    <EntryView
      type={type}
      doc={page.doc}
      media={{ ...services.media, ...(work?.media ?? {}), ...page.media }}
      services={services.entries}
      relatedWork={relatedWork}
      email={site.email}
    />
  );
}
