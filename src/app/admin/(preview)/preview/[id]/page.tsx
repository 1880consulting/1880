import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { getEntry, listPublished } from "@/cms/content/store";
import { mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import type { WorkFields } from "@/site/collections";
import { CONTENT_TYPES, type ContentTypeId } from "@/site/cms";
import { site } from "@/site/content";
import { PreviewBlocks } from "@/site/PreviewBlocks";

export const metadata = { title: "Preview" };

export default function PreviewPage({ params }: PageProps<"/admin/preview/[id]">) {
  return (
    <Suspense>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: Pick<PageProps<"/admin/preview/[id]">, "params">) {
  await requireStaff();
  const { id } = await params;
  const found = z.uuid().safeParse(id).success ? await getEntry(id) : null;
  if (!found || !(found.entry.type in CONTENT_TYPES)) notFound();
  const typeId = found.entry.type as ContentTypeId;
  const type = CONTENT_TYPES[typeId];

  // What the public page would show alongside: the services (names and links)
  // and, for a service, the case studies that use it.
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

  return (
    <PreviewBlocks
      type={typeId}
      initial={found.draft}
      initialMedia={await getMediaMany(mediaIds)}
      email={site.email}
      services={listed(services, "service")}
      relatedWork={related}
    />
  );
}
