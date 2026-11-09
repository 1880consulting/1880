import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { getEntry } from "@/cms/content/store";
import { mediaRefs } from "@/cms/media/refs";
import { getMediaMany } from "@/cms/media/store";
import { pageType } from "@/site/cms";
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
  if (!found) notFound();
  const media = await getMediaMany(mediaRefs(pageType, found.draft).map((r) => r.id));
  return <PreviewBlocks initial={found.draft} initialMedia={media} email={site.email} />;
}
