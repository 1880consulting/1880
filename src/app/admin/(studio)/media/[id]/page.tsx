import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { MediaDetail } from "@/cms/media/MediaDetail";
import { getMedia, mediaUsage } from "@/cms/media/store";
import { PageHeader, Panel, Skeleton } from "@/cms/ui";
import { mediaFileReplaced, removeMedia, saveMediaDetails } from "../actions";

export const metadata = { title: "Image" };

export default function MediaItemPage({ params }: PageProps<"/admin/media/[id]">) {
  return (
    <Suspense
      fallback={
        <Panel>
          <Skeleton lines={6} />
        </Panel>
      }
    >
      <Item params={params} />
    </Suspense>
  );
}

async function Item({ params }: Pick<PageProps<"/admin/media/[id]">, "params">) {
  await requireStaff();
  const { id } = await params;
  const media = z.uuid().safeParse(id).success ? await getMedia(id) : null;
  if (!media) notFound();
  const usage = await mediaUsage(id);
  return (
    <>
      <PageHeader pretitle={<Link href="/admin/media">Media</Link>} title={media.filename} />
      <MediaDetail
        key={media.id}
        media={media}
        usage={usage.map((u) => ({
          id: u.id,
          title: u.title,
          live: u.live,
          href: `/admin/pages/${u.id}`,
        }))}
        actions={{
          save: saveMediaDetails.bind(null, media.id),
          replaced: mediaFileReplaced.bind(null, media.id),
          remove: removeMedia.bind(null, media.id),
        }}
      />
    </>
  );
}
