import "server-only";
import type { ComponentProps } from "react";
import { getEntry, listPublished } from "@/cms/content/store";
import { mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import type { WorkFields } from "@/site/collections";
import { CONTENT_TYPES, type ContentTypeId } from "@/site/cms";
import { site } from "@/site/content";
import type { PreviewBlocks } from "@/site/PreviewBlocks";

/**
 * Everything a draft preview needs, for Studio's live preview and for shared
 * preview links: the entry's current draft, its images, and what the public
 * page would show alongside (services; for a service, the case studies using it).
 */
export async function loadEntryPreview(
  id: string,
): Promise<{ props: ComponentProps<typeof PreviewBlocks>; title: string; live: boolean } | null> {
  const found = await getEntry(id);
  if (!found || !(found.entry.type in CONTENT_TYPES)) return null;
  const typeId = found.entry.type as ContentTypeId;
  const type = CONTENT_TYPES[typeId];

  const isCollection = typeId === "work" || typeId === "service";
  const [services, work] = isCollection
    ? await Promise.all([
        listPublished("service"),
        typeId === "service" ? listPublished("work") : [],
      ])
    : [[], []];
  const listed = (rows: Awaited<ReturnType<typeof listPublished>>, t: ContentTypeId) =>
    rows.map((r) => ({ id: r.id, path: CONTENT_TYPES[t].path(r.slug), doc: r.doc }));
  const related =
    typeId === "service"
      ? listed(work, "work").filter((w) =>
          (w.doc.fields as Partial<WorkFields>)?.services?.includes(found.entry.id),
        )
      : undefined;
  const mediaIds = [
    ...mediaRefs(type, found.draft).map((r) => r.id),
    ...(related ?? []).flatMap((w) => mediaRefs(CONTENT_TYPES.work, w.doc).map((r) => r.id)),
  ];

  return {
    title: found.draft.title || "Untitled",
    live: found.entry.status === "published",
    props: {
      type: typeId,
      initial: found.draft,
      initialMedia: await getMediaMany(mediaIds),
      email: site.email,
      services: listed(services, "service"),
      relatedWork: related,
    },
  };
}
