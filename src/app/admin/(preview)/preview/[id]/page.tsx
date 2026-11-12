import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireStaff } from "@/cms/auth";
import { PreviewBlocks } from "@/site/PreviewBlocks";
import { loadEntryPreview } from "@/site/preview-data";

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
  const preview = z.uuid().safeParse(id).success ? await loadEntryPreview(id) : null;
  if (!preview) notFound();
  return <PreviewBlocks {...preview.props} />;
}
